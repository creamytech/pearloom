# `pearloom.css` dead-selector audit

> CLAUDE-DESIGN §16 item 1. Compiled 2026-08-04.
>
> **Status: audited, NOT executed.** The list below is verified;
> the deletion is deliberately left for a session with a browser.
> §4 explains why, and it is not a formality.

---

## 1 · The method

`src/app/pearloom.css` is **9,407 lines** declaring **227** distinct
`.pl-*` / `.pl8-*` class selectors. Each was checked for a consumer:

1. Every `.tsx` / `.ts` file under `src/`.
2. `src/app/globals.css` (cross-file references).
3. `public/*.js` — the standalone engines (`wallpaper-engine.js`,
   `pearloom-motion.js`, both service workers).
4. `e2e/` and `tests/` — a selector used only by a Playwright spec is
   still live.

**Dynamic construction was ruled out first**, because a grep-based
audit is worthless if class names are assembled at runtime. A sweep
for `` `pl8-${…}` `` / `'pl-' +` / `classNames(...)` patterns found
only element **ids** (`pl-weave-${id}`, `pl-thread-${id}`,
`pl-${motifName}` in the decor picker) and one literal-prefix
passthrough (`pl8-input ${props.className}`). No CSS class name in
this codebase is built from a variable, so a literal search is sound.

**Result: 81 of 227 classes (36%) have no consumer anywhere**,
spanning **163 rule occurrences**.

## 2 · What's dead, by surface

Grouping matters more than the raw list — most of these are sediment
from surfaces in the deleted-architecture ledger (CLAUDE-DESIGN §15),
which is corroboration that they're genuinely dead rather than
merely unused today.

| Surface | Classes | Read |
|---|---|---|
| **Sign-in / auth** | `pl8-signin-root`, `-form`, `-collage`, `-logo`, `-meta`, `pl8-split-auth` | The pre-redesign sign-in. `SigninV8` replaced it. |
| **Marketing (V1)** | `pl8-marketing`, `pl8-mkt-tile`, `pl8-design-page`, `pl8-mascot` | The V1 marketing tree, deleted 2026-04-30. |
| **Dashboard layout** | `pl8-dash-main`, `-threecol`, `-threecol-b`, `pl8-cols-2`, `pl8-cols-4`, `pl8-bento-tile`, `pl8-layout-grid` | Superseded by DashShell/DashLayout. |
| **Cockpit / home** | `pl8-cockpit-hero`, `-hero-slot`, `-stats`, `pl8-home-greet`, `-milestones`, `-pulse`, `pl8-milestone-row`, `-sub-col`, `-sub-inline` | Pre-AFTERGLOW cockpit. Replaced by `HeroPlate` + the phase spine. |
| **Day-of** | `pl8-dayof-header`, `-main`, `-pulse`, `pl8-day-of-broadcast`, `pl8-pulse-layout`, `-legend`, `-stats` | Pre-redesign day-of room. |
| **Site sections** | `pl8-gallery-grid`, `-header`, `-wall`, `-strip-arrow`, `pl8-hero-postcard`, `-photo-first`, `-strip`, `pl8-site-nav`, `-nav-links`, `pl8-themed-nav`, `pl8-site-footer-grid`, `pl8-sticky-rsvp` | The V1 site tree / `ThemedSiteRenderer`, both deleted. The redesign's `section-variants/` own these now. |
| **Textures** | `pl-tx-dotwork`, `-herringbone`, `-lattice`, `-scallop`, `-starfield`, `-vignette`, `-waveline` | A 9-texture library where only `pl-tx-linen` and `pl-tx-laid` are mounted. **Judgment call — see §3.** |
| **Misc** | `pl8-editor-canvas`, `pl8-canvas-device-frame`, `pl8-broadcast-bar`, `pl8-ambient-audio`, `pl8-spotify-player`, `pl8-music-card`, `pl8-hotel-card`, `pl8-timeline-row`, `-thread`, `pl8-lang-switcher`, `pl8-language-switcher`, `pl8-reading-progress`, `pl8-living-atmosphere`, `pl8-confetti-burst`, `pl8-owner-edit-pill`, `pl8-photo-action-wrap`, `pl8-faq-cta-chip`, `pl8-decor-divider`, `pl8-divider`, `pl8-card-2`, `pl8-tile`, `pl8-tile-lift`, `pl8-btn-press`, `pl8-stat-rise`, `pl8-hide-mobile`, `pl8-kickoff`, `pl8-split-dash`, `pl8-split-wizard`, `pl-pearl-rotate` | Assorted. Two duplicate pairs worth noting: `pl8-lang-switcher` / `pl8-language-switcher` and `pl8-divider` / `pl8-decor-divider`. |

The full machine-readable list is reproducible with the method in §1.

## 3 · The one genuine judgment call

The **texture library** is not sediment — it's a coherent set of nine
paper textures where two are mounted and seven are not. That reads as
a library built slightly ahead of its consumers rather than a
leftover, and BRAND §3 makes texture load-bearing.

Recommendation: **keep the textures, delete the rest.** They are ~40
lines total, they're on-brand, and the Studio's paper-stock work is
the obvious future consumer. Everything else in §2 belongs to a
surface that is provably gone.

## 4 · Why this wasn't executed here

Not caution for its own sake — three specific reasons:

1. **The blast radius is silent and visual.** A wrongly-deleted rule
   doesn't fail a test or break a build; it makes something subtly
   ugly on a surface nobody looks at until a host does. The repo's
   visual-regression coverage is the **theme-pack sweep only**, which
   touches none of these.
2. **163 occurrences sit across nested `@media` / `@supports`
   blocks.** Scripted removal by class name would need real brace
   matching to avoid orphaning a declaration or an empty media query.
   A CSS parser (postcss) is the right tool, not `sed`.
3. **This container has no browser to verify with.** Playwright's
   Chromium runs here, but there are no baselines for these surfaces,
   so "it still renders" would be an assertion I couldn't actually
   make.

The honest sequencing is: **audit now, execute with a browser and a
postcss pass.** The audit is the hard part and it's done.

## 5 · How to execute it safely

1. Use **postcss** to walk rules and drop any whose selector list is
   entirely dead classes (per the §1 method, re-run fresh — the code
   moves).
2. Drop `@media` / `@supports` blocks left empty by step 1.
3. Keep the textures (§3).
4. Screenshot the dashboard, editor, day-of room, a published site,
   and the passport before/after at desktop + 390px.
5. Expect roughly **1,000–1,400 lines** removed (163 occurrences,
   most multi-line), taking the file to ~8k.

## 6 · Related debt found while here

- `pl8-lang-switcher` **and** `pl8-language-switcher` both exist and
  both are dead — a rename that never finished.
- `pl8-divider` and `pl8-decor-divider` likewise.
- `.pl-tx-*` textures are declared in `pearloom.css` while the
  `data-pl-texture` variants live around line 4043 — two texture
  mechanisms in one file, worth unifying whenever the file is opened
  for §5.
