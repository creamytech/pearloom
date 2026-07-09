# Pearloom Design System

> *A craft house for memory.*

Pearloom weaves bespoke artifacts for the days that matter — AI-drafted,
hand-edited, letterpress-finished event sites (weddings, milestones,
memorials, and 25 other occasions). A Pearloom site is a single, made
object, not a slot in a template gallery. Its nearest cultural references
are Hermès, Penguin Classics editions, master letterpress shops, and
Linear; its furthest are template marketplaces, Canva, and anything that
puts "AI-powered" above the fold.

This project is the **design system** distilled from the Pearloom product:
its tokens, fonts, brand primitives, reusable components, and a recreated
marketing UI kit — everything needed to design new Pearloom surfaces or
on-brand artifacts.

### The metaphor
*Pear* — warm, organic, alive. *Loom* — woven, patient, made by hand.
Every verb sits inside it: sites are **woven** (not built), loaders are
**threading** (not spinning), saves are **set** (like type), publishes are
**pressed** (like a print run), drafts are **basted in** (not generated).

### The three things you notice in two seconds
1. **Paper texture under everything** — a real warm grain, quiet enough to
   read through, loud enough to feel. A fixed underlay on every surface.
2. **Thread as the visual atom** — a two-strand olive + gold thread shows
   up as dividers, loaders, hover rails, focus accents. See it three
   times and you know you're in a Pearloom product.
3. **Letterpress display type** — variable Fraunces with a soft inset
   shadow so glyphs feel pressed *into* the paper, not floating on top.

---

## Sources

This system was reverse-engineered from the Pearloom product codebase.
Explore these to design with higher fidelity:

- **GitHub — `creamytech/pearloom`** (https://github.com/creamytech/pearloom)
  The Next.js product. Most relevant files:
  - `BRAND.md` — the brand bible (the constitution; this README defers to it).
  - `CLAUDE-DESIGN.md` — implementation reference (token layers, surfaces, renderer).
  - `src/app/globals.css` — the canonical `--pl-*` token source (ported here).
  - `src/components/brand/` — Thread, WeaveLoader, Folio, PearloomMark (ported here).
  - `src/components/pearloom/motifs.tsx` — PearloomGlyph + the icon set + motif language.
  - `src/components/marketing/design/` — the live landing (basis for the Marketing UI kit).

Nothing from the repo is bundled into this project beyond what's listed
under **Index** below — read the source for anything deeper.

---

## CONTENT FUNDAMENTALS — how Pearloom writes

The writing is the contract. Voice is **warm, literary, confident, calm** —
an attentive craftsperson, never a hype-y SaaS.

- **Verbs live inside the loom metaphor**, but never at the cost of clarity:
  *woven*, *threading*, *pressed*, *set*, *basted in*, *leafed*, *kept*.
- **Pear is a person, not a product.** Pear is the in-house planner who
  drafts in your voice and stays with you. Never "the AI", never "our model".
- **Banned phrases** (replace, always): "AI-powered" / "AI-generated" →
  *"drafted by Pear"*; "Loading…" → *"Threading…"*; "Generated" →
  *"drafted"* or *"basted in"*; "No data" / "Empty" → *"Nothing yet.
  Begin a thread."*
- **Buttons are verb-first, sentence case** — only the first letter caps,
  no exclamation marks: *"Begin a thread"*, *"Press publish"*, *"Set the
  type"* — never *"Get Started Now!"*.
- **Control labels are plain words** a first-timer already knows: *Colors,
  Menu, Spacing, Paper, Opening, Pages* — never *Palette, Nav variant,
  Density, Hero, Kit*. The craft vocabulary lives in prose and moments,
  not in the nouns a host must decode to find a knob.
- **Mono labels** (eyebrows, kickers, folios) are **always uppercase**,
  tracked 0.18–0.28em, 9–11px, paired with a 1px gold rule.
- **Casing:** display + body in sentence case; headlines often mix an
  upright clause with one italic word for emphasis ("The days that
  *matter*, woven in an afternoon").
- **You / your**, addressed to the host. Warm second person.
- **Tone examples:** "A bright Saturday in Point Reyes, two families, one
  very long table." · "Tea, her records, her people. Come as you are." ·
  "Your first site, forever." · "Kindly reply by Aug 10."
- **No emoji.** Ever. No confetti, no toast-bombs, no peppered icons.

---

## VISUAL FOUNDATIONS

**Color — two palettes, both correct.** Pearloom runs two related color
layers, and using the right one is the difference between on- and off-brand:

1. **The editorial brand** (`tokens/colors.css`) — the marketing site and the
   published guest site. Cream paper ground (`--pl-cream` `#FDFAF0`), ink
   (`#18181B`) for type, **olive** (`#5C6B3F`) as the brand voice, **gold**
   (`#C19A4B`) as *punctuation* (never a background — a 1px hairline or a
   single glyph/pearl), **plum** (`#C6563D`) destructive, **terra**
   (`#C6703D`) warm accent.
2. **The product chrome** (`tokens/chrome.css`) — the dashboard and the site
   editor. Friendlier aliases (`--cream`, `--card`, `--ink`, `--line`,
   `--paper`) plus **three named accent families** the brand layer doesn't
   expose: **sage** (`#8B9C5A`, calm/saved/success/"yes"), **peach** (`#F0C9A8`
   / ink `#C6703D`, the warm *active/working* accent — saving, CTAs,
   selection, drop-lines), and **lavender** (`#C4B5D9` / ink `#6B5A8C`, the
   editorial accent — **italic display in the chrome defaults to lavender-ink,
   not olive**). Gold stays the shared punctuation across both.

The **site editor** further insulates its panels with the `--pl-chrome-*`
family: warm cream panels, a calibrated **groove-terracotta accent**
(`#B8754A`), and a near-black icon **rail** (`#18181B`) — so the editor's
chrome never repaints when the edited site's theme changes (BRAND/CLAUDE-DESIGN
§3.5). Imagery skews **warm** — sun-through-linen, golden, soft; never cold,
neon, or high-contrast b&w. P3 displays get wide-gamut oklch accents in the
product.

**Dark mode is *editorial midnight*** — a warm `#0D0B07` family, brightened
olive/sage + gold, peach/lavender re-tuned to read on midnight; **never** OLED
black and never dropping the warmth. Every token (brand + chrome) ships a
`[data-theme='dark']` value, so flipping `data-theme` on the root re-skins
marketing, dashboard, and editor together. All three UI kits carry a
light/dark toggle.

**Type.** Display + heading = **Fraunces** (variable, axes opsz/SOFT/WONK).
Display italic (SOFT 80, WONK 1) is the brand's signature voice. Body =
**Geist**. Mono/labels = **Geist Mono**. Script (captions, notes) =
**Caveat**. Display copy wears `.pl-letterpress` (soft inset text-shadow)
on light surfaces. Scale is a perfect fourth (1.25); 12px is the
age-inclusive floor.

**Spacing & layout.** 4px base scale. Restrained, editorial radii — 12px
is the standard card, pills (`--pl-radius-full`) for buttons; **never
blobby**. Layouts are calm and gridded with generous whitespace; the nav
is a sticky glass pill; sections alternate cream / cream-deep grounds.

**Backgrounds.** The fixed **paper grain** underlay (layer 1) beneath
everything. Sections use warm cream gradients and quiet radial washes,
plus the pure-CSS paper/cloth **textures** (`tokens/textures.css`) and the
line **`Motif`** ornaments for light decoration. No gradient blobs, no
AI-startup meshes.

**The layered-chrome rule.** Every screen is exactly three layers,
top-down: **the grain** (fixed, warm, never animated) → **the paper**
(surface color from the cream/ink family) → **the ink** (type, dividers,
controls).

**Glass** is the material of **floating chrome ONLY** — toasts, command
palettes, bottom sheets, popovers, sticky headers riding over content.
Frosted warm cream (light) / editorial midnight (dark) via
`.pl-glass-surface`. Glass never becomes a *surface*: dashboards, panels,
and cards stay paper.

**Borders, shadows, corners.** Hairline 1px tan borders (`--pl-divider`).
Shadows are **warm and ink-tinted** (`rgba(40,28,12,…)`), soft and
paper-like — never gray box-shadows. Cards = cream-card fill + hairline
border + 12px radius + `--pl-shadow-sm`, lifting to `-md` on hover.

**Motion** is **weaving**. Things don't fade — they *thread* in: two
strands grow from a center, content settles between them. Easing:
`--pl-ease-out` (chrome), `--pl-ease-spring` (taps/primary CTA),
`--pl-ease-emphasis` (signature expo-out). **Hover** = subtle lift
(translateY -1/-2px) + warmer fill / shadow bloom; **press** = spring
scale 0.96. The `WeaveLoader` replaces every spinner. Always honour
`prefers-reduced-motion`.

**Dark mode** is *editorial midnight* — a warm `#0D0B07` family, brightened
olive + gold, never OLED black and never dropping the warmth.

### Out of scope (BRAND §10)
Neon · holograms · glassmorphism gradient blobs · sans-serif display
headings (Fraunces is not optional) · symmetrical full-bleed photos
without a hairline frame · confetti · emoji in copy · OLED-black dark mode.

---

## ICONOGRAPHY

Pearloom uses **no icon font and no third-party icon library.** Icons are a
single in-house set of **inline editorial SVGs** drawn at a 24×24 viewBox,
`fill="none"`, 1.75px round-cap / round-join strokes (the `Icon` component
in `motifs.tsx`). The look is fine-lined and quiet — a calmer cousin of
Lucide/Feather, hand-tuned to the brand. Names are kebab-case
(`arrow-right`, `calendar-check`, `mic`, `sparkles`, `pin`, `map`,
`ticket`, `users`, `gallery`…).

- **Brand glyphs are SVG, not icons:** the `PearloomGlyph` (the woven
  pear — one olive thread, a gold weft, a pearl at the crossing), the
  `Pearl` bead, `Thread`, plus the motif family (Sprig, Filigree,
  Asterism, Fleuron, Wash). These are the decorative vocabulary.
- **Substitute / recreate, don't reach for a CDN.** If you need a glyph not
  in the set, draw it at the same 1.75px stroke weight and round caps so it
  reads as part of the family. If you must use a library temporarily, pick
  **Lucide** (closest match) and flag the substitution.
- **No emoji, no unicode-as-icon.** The gold `Pearl` is the brand's
  inline punctuation mark where another product might use a bullet or ✦.
- **Logos** live in `assets/`: `logo-pear-mark.svg` (the final solid-pear mark)
  and `logo-wordmark.svg` (the vectorized “pearloom” lettering), both in brand
  olive. The preferred in-app mark is the React `PearloomLogo` / `PearloomGlyph`
  / `PearloomWordmark` (themeable, crisp at any size, reverse to a cream knockout).
- **Decoration** is the line **`Motif`** set (14 ornaments), **`Divider`**
  fleurons, and the CSS **textures** — not raster illustrations. `assets/imagery/`
  holds warm still-life photos for covers/chapters.

> ⚠️ **Substitution flag:** Pearloom's fonts (Fraunces, Geist, Geist Mono,
> Caveat) are all genuine families served here from **Google Fonts** via
> `@import` in `tokens/fonts.css` — these match the product exactly (the
> product loads the same families through next/font). No substitution was
> needed. If you want self-hosted binaries for offline use, drop them in
> `assets/fonts/` and swap the `@import` for `@font-face` rules.

---

## Index — what's in this project

**Global CSS (link `styles.css`)**
- `styles.css` — the entry point (an `@import` manifest; link this one file).
- `tokens/fonts.css` — the Google-Fonts webfont imports.
- `tokens/colors.css` — `--pl-*` color tokens, light + dark, plus semantic aliases.
- `tokens/typography.css` — families, size scale, Fraunces axis presets, display/label utilities.
- `tokens/spacing.css` — spacing, radii, warm shadows, z-index, card + grain + glass recipes.
- `tokens/motion.css` — easing, durations, weave/press/lift/enter utilities.
- `tokens/chrome.css` — the product-UI layer: `.pl8` aliases (`--cream`, `--card`,
  `--ink`, `--line`, `--paper`), the **sage / lavender / peach** accent families,
  and the `--pl-chrome-*` editor-insulation tokens. Dashboard + editor build on these.
- `tokens/textures.css` — eight pure-CSS tiling grounds (`.pl-tx-laid`, `-linen`,
  `-dotwork`, `-lattice`, `-scallop`, `-herringbone`, `-starfield`, `-waveline`),
  theme-aware via `--tx-ink` / `--tx-ink-2`. Map to the marketplace `background-pack`.
- `tokens/base.css` — warm reset, branded controls, focus rings.

**Components** (`window.PearloomDesignSystem_55118c.<Name>`)
- `components/brand/` — `PearloomGlyph`, `PearloomWordmark`, `PearloomLogo`,
  `Thread`, `WeaveLoader`, `Folio`, `Pearl`, `Monogram` (couple monogram, six frames).
- `components/motifs/` — `Motif` (14 line ornaments + `MOTIF_NAMES`), `Divider`
  (ornamental section rules / fleurons).
- `components/core/` — `Button`, `Badge`, `Card`, `Field`, `Eyebrow`.

Each component has a `.d.ts` (props), a `.prompt.md` (what & when), and its
directory carries a `@dsCard` HTML thumbnail.

**UI kits**
- `ui_kits/renderer/` — the **published-site renderer** (`index.html` +
  `themes.js`): a guest site built entirely on the real `--t-*` theme contract
  (ported from `site/themes.ts`), with `themeRootStyle()` and the six production
  themes (Santorini, Tuscan, Pressed Garden, Editorial, Midnight Velvet, Coastal).
  Each theme's `look` (card / button / divider / photo / heroAlign / motifDensity)
  re-skins every block live. The faithful target for editor + renderer work, and
  the single source of truth for theme packs — the **ten** themes are the six
  production looks plus four reconciled new ones (Amalfi Citrus, First Light,
  Deco Gilt, Tide & Coast).
- `ui_kits/auth/` — the **sign-in page** (`index.html`): a faithful recreation of
  the production `SigninV8` on the `.pl8` chrome — split form (Google +
  email/password) and the floating collage (save-the-date polaroid using the new
  Monogram, wax-seal stamps, Pear chat bubble).
- `ui_kits/wallpapers/` — the “Living Backgrounds” store: five interactive WebGL
  shader wallpapers (`wallpaper-engine.js`), pointer + tap reactive.
- `ui_kits/marketing/` — the Pearloom marketing landing (`index.html` — the warm
  v2 direction, now canonical) + `Nav.jsx`, `Hero.jsx`, `Sections.jsx`, and
  `Mobile.html` (all surfaces in phone frames).
- `ui_kits/editor/` — the site editor recreated (`index.html` + `Editor.jsx`).
  The four-zone shell (topbar · section rail · canvas · property/theme/Pear
  rail) on the real chrome tokens: ink mode-pills, **sage** save-dot, golden
  thread chip, **peach** selection + active states, **lavender** italic panel
  titles, the cream-3 dotted canvas with a device frame, and an editable mini
  guest site. Edit / Preview / Mobile modes; Theme rail with palette + type.

**Dark mode** — every kit reads `data-theme` from a light/dark toggle and flips
to editorial midnight.

**Foundations** (`guidelines/*.card.html`) — specimen cards for the Design
System tab: color (voice, surfaces, semantic, wash), type (display,
headings, body/mono/script), spacing (radii, shadows, scale), brand (grain,
glass, logo & illustration).

**Assets** — `assets/logo-pear-mark.svg`, `assets/logo-wordmark.svg`, `assets/imagery/*`.

**`SKILL.md`** — makes this folder usable as a downloadable Agent Skill.
