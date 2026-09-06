# Learning with AI

A public, static library of interactive study guides, organised **per learner**. Guides are AI-assisted
summaries, explanations, flashcards, and quizzes written from a learner's own materials (notes,
photographed pages, PDFs). The site is plain HTML, CSS, and JavaScript: no build step, no backend,
no accounts, no analytics, no external requests at runtime.

Live site: <https://weijen-ai.github.io/learn/>

## Preview locally

The site is published under the project path `/learn/`, so preview it from the **parent** directory
to catch path mistakes:

```bash
cd ..                      # the directory that contains learn/
python3 -m http.server 8000
# open http://localhost:8000/learn/
```

All links and assets are relative (`assets/...`, `../assets/...`), never root-absolute (`/assets/...`).

## Structure and URL conventions

```text
/
├── index.html                      learner directory (home)
├── assets/
│   ├── css/site.css                shared styles: typography, cards, buttons, badges, breadcrumbs, quiz UI
│   ├── js/site.js                  shared behaviour: flashcard deck, quiz feedback, KaTeX auto-render
│   └── vendor/katex/               KaTeX (MIT), self-hosted: css, js, auto-render, woff2 fonts
├── examples/interactive-study-guide/index.html   template guide with demo content
└── <learner-slug>/
    ├── index.html                  that learner's dashboard
    └── <topic-slug>/<course-or-source-slug>/<unit-slug>/index.html
```

Examples of guide URLs:

```text
/weijen/mathematics/mathematics-for-machine-learning/chapter-2/
/vienna/english/ielts/reading-practice-01/
/jiang-anan/korean/sejong-korean/lesson-03/
```

Slugs are stable, lowercase ASCII, URL-safe (`a-z`, `0-9`, `-`). Never use a display name as a
directory name; the display name lives in the learner's `index.html`.

## Adding a learner

1. Pick a slug (for example `vienna`) and create `vienna/index.html` by copying `weijen/index.html`.
2. Set the title to `<Display name>'s Learning Space`, keep the breadcrumb back to `../`, and replace
   the subject cards with an empty-state card until the first guide exists.
3. Add a learner card to the root `index.html`.

## Adding a study guide

1. Create `<learner>/<topic>/<course-or-source>/<unit>/index.html`. Start from
   `examples/interactive-study-guide/index.html` and fix the relative prefix (four levels deep means
   `../../../../assets/...`).
2. A guide has: learning objectives, a progressive explanation (`<details class="step">`), formulas in
   `$…$` / `$$…$$` (rendered by the bundled KaTeX; include its css/js only on pages that need it),
   flashcards (`.flashcard-deck` of `<details>` cards), a quiz (`form.quiz` with
   `fieldset.quiz-item[data-answer][data-explain]`), and a **Source and provenance** section with a
   copyright note.
3. Add the guide to the learner's subject cards and "Recently added" list, and update the learner's
   card on the root page if a new subject appeared.
4. Preview from the parent directory and check on a narrow viewport; every control must work with the
   keyboard alone (Tab, Space/Enter, arrow keys inside radio groups).

Optional browser check (needs Google Chrome and Node 22+; no packages): with the server above running,
`node learn/scripts/check-browser.cjs http://localhost:8000/learn/` loads every page at desktop and phone
widths and exercises the flashcards, quiz, and formula rendering.

Everything must keep working without JavaScript: steps and flashcards are native `<details>`, and
quiz questions remain readable.

## Content and copyright policy

This is a **public** repository and website.

- Publish original explanations, summaries, and exercises. Cite the source (book, chapter, pages, or
  "learner's own notes") and say where added explanation begins.
- Do **not** upload scans, photographs of pages, PDFs of books, or substantial verbatim textbook text.
  Short quotations only when necessary.
- Do not publish personal identifiers beyond a learner's chosen display name.
- Learner folders are organisation, not access control: everything here is visible to everyone.

## GitHub Pages

- Published from the `main` branch, repository root (`/`). `.nojekyll` disables Jekyll processing.
- Project-site URL: `https://weijen-ai.github.io/learn/`. Pushing to `main` redeploys automatically;
  confirm with the Pages API (`repos/weijen-ai/learn/pages` → `status: built`) and by loading the
  live URL, not just by a successful push.
- Formula rendering does not depend on a CDN: KaTeX is vendored under `assets/vendor/katex/`
  (version 0.18.6, MIT licence in that folder).

## Related

- Earlier site with the first published unit: <https://weijen.github.io/Learning-with-ai/> (kept as is).
- Planning and automation live in the `hermes-azure` repository (issues #8 and #9).
