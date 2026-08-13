# MIGRATION.md — Pulling the new Pearloom design system into production

> Hand this file to Claude Code (or any engineer) working in the `creamytech/pearloom`
> repo. It maps the **finalized design system** in this project onto the live app:
> the new logo + wordmark, the color/token layers, the motion system, themes,
> and the brand components. It is written as an **executable plan**, ordered by
> risk — ship the safe, high-leverage layers first, behind a flag.

---

## 0 · The golden rule

**Production is the source of truth for behavior; this design system is the source
of truth for *look + motion*.** Port tokens, styles, marks, and motion onto the
existing components — never replace working components, data wiring, auth, RSVP
logic, Stripe, or the generate pipeline. The unit of transfer is **CSS variables,
SVG assets, and animation utilities** — not screens.

Everything below lives in the design-system project (this repo). Paths are relative
to its root. The compiled runtime is `_ds_bundle.js`; the linkable stylesheet entry
is `styles.css`.

---

## 1 · Tokens & color (lowest risk, highest leverage — do first)

The whole visual change is ~70% just re-pointing CSS variables. Link order matters:
`styles.css` `@import`s, in order: `fonts → colors → typography → spacing → motion
→ chrome → textures → animation → base`.

### 1a · Reconcile, don't overwrite
The product already styles off CSS variables (these were reverse-engineered from
`src/app/globals.css` + `src/app/pearloom.css`). Treat the token files here as a
**proposed diff**:

- **`tokens/colors.css`** — the editorial brand palette (`--pl-*`): cream paper,
  ink, **olive** (`#5C6B3F`, the voice), **gold** (`#C19A4B`, punctuation only),
  plum/terra, the olive opacity wash, glass, gradients, semantic aliases. Light +
  `[data-theme='dark']` ("editorial midnight", warm `#0D0B07` — never OLED black).
- **`tokens/chrome.css`** — the **product-UI layer** = the `.pl8` aliases the app
  already uses (`--cream`, `--card`, `--ink`, `--line`, `--paper`) **plus three
  named accent families the brand layer doesn't expose**: **sage** (`#8B9C5A`,
  saved/success), **peach** (`#F0C9A8` / ink `#C6703D`, active/working/CTAs/
  selection), **lavender** (`#C4B5D9` / ink `#6B5A8C` — *italic display in chrome
  defaults to lavender-ink*). Plus the `--pl-chrome-*` editor-insulation tokens
  (groove terracotta `#B8754A`, near-black rail `#18181B`).

**Procedure:** diff each `--pl-*` / `--*` against the live `globals.css` / `pearloom.css`.
Where they conflict, **keep production's value unless you are intentionally
changing it** (the values here are mostly faithful, but a few — chrome terracotta,
some dark-mode accent tunings — were author's-choice; they're flagged in the file
comments). Land the reconciled set behind a `data-theme` / feature flag so you can
A/B it.

### 1b · Typography & spacing (drop-in)
- **`tokens/typography.css`** — Fraunces (display, italic = the voice), Geist (body),
  Geist Mono (labels), Caveat (script); size scale, Fraunces axis presets, `.pl-display`,
  `.pl-letterpress`, `.pl-eyebrow`. Confirm the product's `next/font` families match
  (they do: Fraunces / Geist / Geist Mono / Caveat).
- **`tokens/spacing.css`** — spacing scale, restrained radii, **warm ink-tinted
  shadows** (never gray), z-index, the `.pl-card` / `.pl-grain` / `.pl-glass-surface`
  recipes.
- **`tokens/textures.css`** — eight pure-CSS tiling grounds (`.pl-tx-laid/-linen/
  -dotwork/-lattice/-scallop/-herringbone/-starfield/-waveline`), theme-aware via
  `--tx-ink` / `--tx-ink-2`. Map to the marketplace `background-pack` item type.

---

## 2 · The logo + wordmark (the headline change)

The mark is **final**. Replace the old marks everywhere.

- **Assets:** `assets/logo-pear-mark.svg` (solid pear, carved spiral, stem + leaf,
  flat `#5C6B3F`) and `assets/logo-wordmark.svg` (vectorized "pearloom" lettering).
- **Components** (in `_ds_bundle.js` under `window.PearloomDesignSystem_…`, source in
  `components/brand/PearloomGlyph.jsx`):
  - `PearloomGlyph` — the solid pear. One `color` prop paints the whole mark (the
    spiral is true negative space), so it reverses to a cream knockout on olive/ink
    and re-skins per theme. Reads from 16px favicon to hero.
  - `PearloomWordmark` — the vectorized lettering; `color` + `size` (cap height).
  - `PearloomLogo` — the lockup.

**In the repo:** the live mark is `src/components/brand/PearloomMark.tsx` +
`PearloomWordmark` in `src/components/pearloom/motifs.tsx`. Replace their SVG paths
with the new ones (copy the `PEAR_BODY` + `PEAR_LEAF` path data and the wordmark
path array from `components/brand/PearloomGlyph.jsx`). Keep the existing prop API
(`size`, `animated`, etc.) and the draw-in animation hook if present — just swap the
geometry + flatten to a single `color`. Regenerate the favicon (`src/app/icon.svg`,
`favicon.ico`) and `public/email-logo.png` from `logo-pear-mark.svg`.
The old woven-pear and Fraunces type-set wordmark were **removed** here — don't
reintroduce them.

---

## 3 · The motion system (the "experience" layer)

Two files, dependency-free, reduced-motion aware:

- **`tokens/animation.css`** — utilities + keyframes: scroll reveals
  (`data-reveal="up·down·left·right·fade·scale·thread·press·rise"` + auto-stagger),
  the letterpress `.pl-press-in`, the `.pl-rule-draw` divider draw, micro-interactions
  (`.pl-lift`, `.pl-tap`, `.pl-link` gold-thread underline, `.pl-kenburns`), the pearl
  pop, ambient `.pl-float`/`.pl-drift`, and the **weave page-transition** classes.
  Ships a **progressive-enhancement gate**: content is visible unless
  `html.pl-motion-ready` is set, so a JS failure never blanks the page.
- **`assets/pearloom-motion.js`** — the runtime. Auto-inits on DOMContentLoaded:
  IntersectionObserver flips `[data-revealed]` on scroll; `PearloomMotion.weave(onPeak)`
  / `.navigate(href)` plays the two-strand transition (paper panels close, olive+gold
  threads draw the seam, content swaps at the covered peak).

**In the repo (Next.js App Router):**
1. Add `assets/pearloom-motion.js` to the app (e.g. `src/lib/motion/pearloom-motion.js`)
   and load it once in the root `layout.tsx` via `next/script` (`strategy="afterInteractive"`).
   For client components, call `PearloomMotion.init(el)` after mount when injecting markup.
2. `@import "tokens/animation.css"` into the global stylesheet (already covered if you
   port `styles.css`'s import chain).
3. Sprinkle `data-reveal` on section roots; use `PearloomMotion.navigate()` on route
   pushes for the weave transition between pages. The brand rule: **things thread in,
   they don't just fade.** Replace ad-hoc fade-ins with these utilities.
4. Honor `prefers-reduced-motion` — the system already does; don't add motion that bypasses it.

---

## 4 · Themes (one source of truth)

The published-site theme system is **`ui_kits/renderer/themes.js`** — a verbatim-shaped
port of `src/components/pearloom/site/themes.ts` with the real **`--t-*` token contract**
and `themeRootStyle()`. It now carries **ten themes**: the six production looks
(Santorini, Tuscan, Pressed Garden, Editorial, Midnight Velvet, Coastal) **plus four
reconciled new packs** — **Amalfi Citrus, First Light, Deco Gilt, Tide & Coast**.

**In the repo:** add the four new theme objects to `src/components/pearloom/site/themes.ts`'s
`THEMES` array (copy from `renderer/themes.js` — they already use the exact `--t-*` vars,
`look`, `texture`, `motif`, `swatches` shape that `themeRootStyle` + `ThemedSiteRenderer`
read). No renderer changes needed; they'll show up in the Theme Store and re-skin every
block. (Ignore any earlier `--site-*` shaped packs — that naming was a pre-reconcile guess
and has been deleted here.)

---

## 5 · Brand components (lift the styling, keep the wiring)

New reusable primitives in `_ds_bundle.js` (source in `components/`):
`Monogram` (couple monogram, six frames), `Motif` (14 line ornaments + `MOTIF_NAMES`),
`Divider` (ornamental rules), plus `Thread`, `WeaveLoader`, `Folio`, `Pearl`, `Eyebrow`,
`Button`, `Badge`, `Card`, `Field`.

**Decoration vocabulary changed:** the brand now decorates with the `Motif` line set,
`Divider` fleurons, and the CSS textures — **not** the old botanical raster illustrations
(those were removed). If the repo still references `public/assets/.../flower-*.png` decor,
replace with `Motif`/`Divider` or the decor system's generated ornaments.

**Procedure:** for each, lift the *visual* (markup + the inline styles that bind to
`--pl-*` / `--t-*`) onto the existing production component, preserving its props, state,
and data. Port `Monogram` as a new component (it's net-new — wedding save-the-dates,
wax-seal favicons, footer sign-offs).

---

## 6 · Reference implementations (target look — do NOT copy wholesale)

These kits show the intended look; they cut functional corners (canned data, no auth).
Use them as the **visual target** while restyling the real screens:
- `ui_kits/renderer/` — published guest site on the real `--t-*` contract (the faithful target).
- `ui_kits/wizard/` — the upgraded create flow (woven progress, weave transitions, live
  preview, threading finale). Restyle the real `WizardV8.tsx` toward this; keep its 8-step
  state machine, photo upload, generate pipeline.
- `ui_kits/editor/` — the four-zone editor on the chrome tokens (insulated `--pl-chrome-*`).
- `ui_kits/auth/` — sign-in; restyle the real `SigninV8.tsx` (keep NextAuth wiring).
- `ui_kits/dashboard/` — the 10 dashboard routes (warm glow ground, sage/peach/lavender).
- `ui_kits/marketing/` — the v2 landing (canonical direction).
- `ui_kits/wallpapers/` — the WebGL "Living Backgrounds" feature (genuinely new: needs
  Stripe wiring + a per-site `background` field before it ships).

---

## 7 · Suggested rollout order (all behind a `theme=v2` / feature flag)

1. **Tokens + color** reconcile (§1) — re-skins the whole app at once, lowest risk.
2. **Logo + wordmark + favicon** (§2) — the headline change, self-contained.
3. **Motion system** (§3) — load the script, port `tokens/animation.css`, add `data-reveal`.
4. **Themes** (§4) — append the four new packs.
5. **Marketing landing** first (most self-contained), then **dashboard**, then **wizard**,
   then **editor** (most functionally complex — the bottom-sheet mobile pattern is the prize).
6. **Wallpapers** as a new paid feature when product is ready.

---

## 8 · Honest caveats

- This system was reverse-engineered from the repo at commit `a5efff7` + author's design
  choices. **Diff before overwrite**; production values win on conflict unless intentional.
- The kit JSX is **not production code** (canned Pear replies, fake RSVP/auth). Never merge as-is.
- Fonts are Google-hosted here; production uses `next/font` — keep the production loader.
- Verify dark mode (`[data-theme='dark']`) after the token port — every token here ships a dark value.
- `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` are **generated** — don't port them.

---

*Source of truth for the look: this design-system project. Read `readme.md` for the full
brand guide (content fundamentals, visual foundations, iconography) and `SKILL.md` to use
this project as a brand authority in Claude Code.*
