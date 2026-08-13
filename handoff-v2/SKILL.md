---
name: pearloom-design
description: Use this skill to generate well-branded interfaces and assets for Pearloom, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation
- **Brand in one line:** "A craft house for memory." Editorial modernism on warm paper — Fraunces letterpress display, Geist body, olive + gold thread, a real paper grain under everything. Never reads "AI startup".
- **Tokens:** link `styles.css` (it `@import`s everything). All custom properties are `--pl-*`; semantic aliases like `--surface-card`, `--text-body`, `--accent-primary` also exist. Light + `[data-theme='dark']` (editorial midnight).
- **Fonts:** Fraunces (display/heading, italic = voice), Geist (body), Geist Mono (uppercase tracked labels), Caveat (script) — all via Google Fonts in `tokens/fonts.css`.
- **Components:** load the runtime bundle, then read components off `window.PearloomDesignSystem_55118c` (e.g. `Button`, `Thread`, `WeaveLoader`, `Folio`, `PearloomLogo`, `Card`, `Badge`, `Field`, `Eyebrow`, `Pearl`). See each component's `.prompt.md`.
- **Voice:** verbs live in the loom metaphor (woven / threading / pressed / set). Never "AI-powered", "Loading…", or emoji. Buttons are verb-first, sentence case. See README → CONTENT FUNDAMENTALS.

## The non-negotiables
1. Paper grain under everything · 2. Thread as the visual atom · 3. Fraunces letterpress display. A surface missing two of these is off-brand.
4. Gold is punctuation only (1px rules / single glyphs), never a fill.
5. Glass = floating chrome only; everything else is paper.
6. Say "Threading…", never "Loading…". Pear is a person.
