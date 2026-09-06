/* Learning with AI — shared behaviour. Progressive enhancement only:
   every page stays readable and usable without this file. */
'use strict';
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* Formulas: render $...$ / $$...$$ when the vendored KaTeX auto-render is present. */
  function renderMath() {
    if (typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        throwOnError: false
      });
    } catch (e) { /* leave the raw LaTeX readable */ }
  }

  /* Flashcard deck: cards are <details> (keyboard-accessible without JS);
     JS shows one card at a time and adds Previous / Next controls. */
  function initDecks() {
    $$('.flashcard-deck').forEach(deck => {
      const cards = $$('.flashcard', deck);
      if (cards.length < 2) return;
      let i = 0;
      const nav = document.createElement('div');
      nav.className = 'deck-nav';
      const prev = document.createElement('button'); prev.type = 'button'; prev.className = 'button secondary'; prev.textContent = '← Previous';
      const next = document.createElement('button'); next.type = 'button'; next.className = 'button secondary'; next.textContent = 'Next →';
      const out = document.createElement('output'); out.setAttribute('aria-live', 'polite');
      nav.append(prev, out, next);
      deck.append(nav);
      function show(n) {
        i = (n + cards.length) % cards.length;
        cards.forEach((c, k) => {
          c.hidden = k !== i;
          const d = $('details', c); if (d && k !== i) d.open = false;
        });
        out.textContent = 'Card ' + (i + 1) + ' of ' + cards.length;
      }
      prev.addEventListener('click', () => show(i - 1));
      next.addEventListener('click', () => show(i + 1));
      show(0);
    });
  }

  /* Quiz: <form class="quiz"> with <fieldset class="quiz-item" data-answer="b" data-explain="...">
     and radio inputs whose value is the option key. Feedback is immediate on selection. */
  function initQuizzes() {
    $$('form.quiz').forEach(form => {
      const items = $$('.quiz-item', form);
      const score = $('.quiz-score', form);
      function feedbackBox(item) {
        let box = $('.quiz-feedback', item);
        if (!box) { box = document.createElement('div'); box.className = 'quiz-feedback'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); item.append(box); }
        return box;
      }
      function grade(item) {
        const chosen = $('input[type=radio]:checked', item);
        const box = feedbackBox(item);
        if (!chosen) { box.textContent = ''; box.className = 'quiz-feedback'; return null; }
        const ok = chosen.value === item.dataset.answer;
        const explain = item.dataset.explain ? ' ' + item.dataset.explain : '';
        box.className = 'quiz-feedback ' + (ok ? 'correct' : 'incorrect');
        box.textContent = (ok ? '✔ Correct.' : '✘ Not quite.') + explain;
        return ok;
      }
      function updateScore() {
        if (!score) return;
        const results = items.map(grade).filter(r => r !== null);
        score.textContent = results.length ? 'Score: ' + results.filter(Boolean).length + ' / ' + items.length + (results.length < items.length ? ' (answer every question to finish)' : '') : '';
      }
      form.addEventListener('change', e => { if (e.target.matches('input[type=radio]')) { grade(e.target.closest('.quiz-item')); updateScore(); } });
      form.addEventListener('submit', e => { e.preventDefault(); updateScore(); });
      form.addEventListener('reset', () => setTimeout(() => { items.forEach(it => { const b = $('.quiz-feedback', it); if (b) { b.textContent = ''; b.className = 'quiz-feedback'; } }); if (score) score.textContent = ''; }, 0));
    });
  }

  renderMath();
  initDecks();
  initQuizzes();
})();
