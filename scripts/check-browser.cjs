// Browser checks for the site. Run from the parent directory of learn/ with a static server up:
//   (cd .. && python3 -m http.server 8000) ; node learn/scripts/check-browser.cjs http://127.0.0.1:8000/learn/ [screenshot-dir]
// Uses installed Google Chrome and Node's built-in WebSocket; no dependencies.
'use strict';
const fs = require('node:fs'); const path = require('node:path'); const { spawn } = require('node:child_process'); const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:8000/learn/'; const shots = process.argv[3] || '';
(async () => {
  const profile = fs.mkdtempSync('/tmp/learn-browser-');
  const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  try {
    const endpoint = await new Promise((resolve, reject) => { let data = ''; const t = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000); chrome.stderr.on('data', c => { data += c; const m = data.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(t); resolve(m[1]); } }); chrome.on('error', reject); });
    ws = new WebSocket(endpoint); await new Promise(r => ws.addEventListener('open', r, { once: true }));
    let id = 0; const pending = new Map(); const errors = []; const failedLoads = [];
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || '')); if (m.method === 'Network.loadingFailed') failedLoads.push(m.params.errorText); if (m.method === 'Network.responseReceived' && m.params.response.status >= 400 && !/favicon\.ico$/.test(m.params.response.url)) failedLoads.push(m.params.response.status + ' ' + m.params.response.url); });
    const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' }); const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
    const c = (m, p) => call(m, p, sessionId); await c('Runtime.enable'); await c('Page.enable'); await c('Network.enable');
    const ev = async expr => { const r = await c('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const nav = async rel => { await c('Page.navigate', { url: base + rel }); for (let i = 0; i < 200; i++) { await new Promise(r => setTimeout(r, 30)); if (await ev(`document.readyState === 'complete' && location.href.endsWith(${JSON.stringify(rel)})`)) return; } throw Error('Page load timed out ' + rel); };
    const shot = async file => { if (!shots) return; const r = await c('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(shots, file), Buffer.from(r.data, 'base64')); };
    const pages = ['', 'weijen/', 'examples/interactive-study-guide/'];
    for (const [w, h, mobile] of [[1440, 1000, false], [390, 844, true]]) {
      await c('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
      for (const p of pages) {
        await nav(p);
        assert.equal(await ev('document.querySelectorAll("h1").length'), 1, p + ' has one h1');
        assert.equal(await ev('getComputedStyle(document.body).backgroundColor'), 'rgb(247, 248, 242)', p + ' shared stylesheet applied');
        assert.equal(await ev('document.documentElement.scrollWidth <= innerWidth'), true, `${p} no horizontal overflow at ${w}px`);
        assert.equal(await ev('!!document.querySelector("a.skip[href=\'#main\']") && !!document.getElementById("main")'), true, p + ' skip link');
        assert.equal(await ev('[...document.querySelectorAll("a,button,input,summary")].every(el => el.tabIndex >= 0)'), true, p + ' interactive controls focusable');
        await shot(`${mobile ? 'mobile' : 'desktop'}-${p.replace(/[^a-z]+/g, '-') || 'home'}.png`);
      }
    }
    await c('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await nav('examples/interactive-study-guide/');
    assert.ok(await ev('document.querySelectorAll(".katex").length') >= 4, 'KaTeX rendered formulas');
    assert.equal(await ev('document.querySelectorAll(".katex-error").length'), 0, 'no KaTeX parse errors');
    assert.equal(await ev('[...document.querySelectorAll(".flashcard")].filter(c => !c.hidden).length'), 1, 'deck shows one card');
    await ev('document.querySelector(".deck-nav button:last-child").click()');
    assert.equal(await ev('[...document.querySelectorAll(".flashcard")].findIndex(c => !c.hidden)'), 1, 'Next shows second card');
    assert.match(await ev('document.querySelector(".deck-nav output").textContent'), /Card 2 of 3/);
    await ev('document.querySelector(".flashcard:not([hidden]) summary").click()');
    assert.equal(await ev('document.querySelector(".flashcard:not([hidden]) details").open'), true, 'reveal answer works');
    const pick = (q, v) => ev(`{const i=document.querySelector('input[name=${q}][value=${v}]'); i.checked=true; i.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await pick('q1', 'b'); assert.match(await ev('document.querySelector("[data-answer=b] .quiz-feedback").textContent'), /Correct/);
    await pick('q2', 'a'); assert.match(await ev('document.querySelectorAll(".quiz-item")[1].querySelector(".quiz-feedback").textContent'), /Not quite/);
    assert.match(await ev('document.querySelector(".quiz-score").textContent'), /1 \/ 3/);
    await pick('q3', 'a'); assert.match(await ev('document.querySelector(".quiz-score").textContent'), /2 \/ 3$/);
    await ev('document.querySelector("form.quiz button[type=reset]").click()'); await new Promise(r => setTimeout(r, 50));
    assert.equal(await ev('document.querySelector(".quiz-score").textContent'), '', 'reset clears score');
    await ev('document.querySelector("form.quiz").scrollIntoView({behavior:"instant"})'); await shot('desktop-quiz.png');
    assert.deepEqual(errors, [], 'no JavaScript exceptions'); assert.deepEqual(failedLoads, [], 'no failed resource loads');
    console.log('PASS: 3 pages at 1440px and 390px; stylesheet, skip link, focusability, KaTeX, flashcard deck, quiz feedback/score/reset; no JS errors or failed loads.');
  } finally { ws?.close(); chrome.kill('SIGTERM'); await new Promise(r => chrome.once('exit', r)); fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(e => { console.error('FAIL:', e.message); process.exitCode = 1; });
