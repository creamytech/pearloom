# DESIGN-SYSTEM-REFERENCE.md — what Pearloom's design system *actually is* in production

> **Read this before designing a new system.** BRAND.md says what Pearloom
> *should* stand for; CLAUDE-DESIGN.md maps the *code architecture*. This file
> is narrower and more literal: it is a **grounded inventory of the tokens,
> classes, primitives, and conventions that ship in the production build and
> are actually referenced** — with real values and real usage counts, and with
> the dead weight flagged so a new system doesn't inherit it.
>
> Every value below was read straight out of the source on **2026-07-04**. Where
> this file disagrees with BRAND.md / CLAUDE-DESIGN.md, **the code is the
> authority** and the disagreement is called out as *drift*. Re-audit before
> trusting any count — the codebase moves.
>
> Source files:
> - `src/app/globals.css` (~2.7k lines) — the `--pl-*` brand tokens + platform utilities
> - `src/app/pearloom.css` (~9k lines) — the `.pl8-guest`-scoped site kit/edition/texture system
> - `src/components/pearloom/site/themes.ts` — the per-site `--t-*` theme bag
> - `src/app/layout.tsx` — the fonts actually loaded
> - `src/lib/site-look/*`, `src/lib/site-editions/types.ts`, `src/types.ts` — the manifest look fields

---

## 0 · TL;DR — the load-bearing spine

If a new design system keeps only what is genuinely used, it keeps these:

| Layer | What's real | Where |
|---|---|---|
| **Brand color** | `--pl-*` tokens under `[data-theme='light']` / `[data-theme='dark']` on `<html>`. Cream / ink / olive / gold / plum. | globals.css |
| **Chrome color** | `.pl8` aliases (`--cream`, `--ink`, `--gold`, `--sage*`, `--peach*`, `--lavender*`) → forward to `--pl-*` OR hardcoded accents. | pearloom.css `:root` |
| **Per-site color** | `--t-*` bag (24 vars), 10 named themes, emitted on `.pl8-guest`. **This is the single hottest color contract** (`--t-accent` ~502 refs, `--cream` ~681). | themes.ts |
| **Type** | Fraunces (display/heading), Geist (body), Geist Mono (labels) — all loaded via `next/font`. `.display` / `.eyebrow` classes. | layout.tsx + pearloom.css |
| **Motion** | 4 easings + 7 durations (`--pl-ease-*`, `--pl-dur-*`). Loom-shuttle keyframe `pl-weave-travel`. | globals.css |
| **Material** | `.pl-grain` (paper), `.pl-letterpress` (pressed type), `.pl-glass-surface` (floating chrome only), `.pl-pearl-accent` (iridescent CTA). | globals.css |
| **Look axes** | manifest fields: `themeId` + `themeVars`, `kitId`, `texture` + `textureIntensity`, `edition`, `density`, `motifLayout`. | types.ts |
| **Primitives** | `WeaveLoader` (the only spinner), `Thread`, `Divider`, `Pearl`, plus the `Icon` glyph system (111 importers). | components/brand, components/pearloom/motifs.tsx |

Everything else is either niche or dead — see §11.

---

## 1 · How the color system is layered (three real layers)

```
<html data-theme="light|dark">          ← globals.css declares --pl-* here
  .pl8  (dashboard / editor / marketing chrome)
        └─ uses --cream / --ink / --gold / --sage / --peach / --lavender
           (pearloom.css :root aliases → --pl-* or hardcoded)
  .pl8-guest  (a rendered site — editor canvas or published)
        └─ style="--t-paper:…; --t-accent:…; …"  (the --t-* bag, per site)
           and shadows --cream/--ink/--gold to the theme's values so
           un-migrated markup re-skins for free
```

The theme mode (`data-theme`) lives on `<html>`, set by an inline script in
`layout.tsx` (localStorage `pl-theme` → `prefers-color-scheme`). Dark mode is
**editorial midnight** (`#0D0B07` base), never OLED black.

**Important scoping fact:** the `.pl8` accent aliases only flip to dark values
inside a published-site root (`[data-pl-site-root][data-theme="dark"]`). Editor
chrome sits outside that scope and keeps the light `:root` accent values by
design.

---

## 2 · `--pl-*` brand tokens (globals.css) — real values

Declared under `:root, [data-theme='light']` and overridden under
`[data-theme='dark']`. (File header still says "v7"; the surface tokens are
annotated "v8" — a partial migration, cosmetic.)

### Surfaces — cream / paper
| Token | Light | Dark |
|---|---|---|
| `--pl-cream` | `#FDFAF0` | `#0D0B07` |
| `--pl-cream-deep` | `#F7F0E0` | `#15110A` |
| `--pl-cream-card` | `#FBF7EE` | `#1A1610` |

### Ink / text
| Token | Light | Dark |
|---|---|---|
| `--pl-ink` | `#18181B` | `#F1EBDC` |
| `--pl-ink-soft` | `#4A5642` | `#D4CDBC` |
| `--pl-muted` | `#6F6557` | `#8A8275` |

### Dividers
| Token | Light | Dark |
|---|---|---|
| `--pl-divider` | `#E2D9C3` | `#2A241A` |
| `--pl-divider-soft` | `#ECE4CF` | `#1F1A12` |

### Olive — the brand voice (most-referenced `--pl-*` family, ~256 refs)
| Token | Light | Dark |
|---|---|---|
| `--pl-olive` | `#5C6B3F` | `#A4B57A` |
| `--pl-olive-hover` | `#4A5731` | `#B8C98F` |
| `--pl-olive-deep` | `#363F22` | `#8A9A60` |
| `--pl-olive-mist` | `#E0DDC9` | `#1F2014` |

Plus an opacity ladder `--pl-olive-5 … --pl-olive-50` (`rgba(92,107,63,α)` light /
`rgba(164,181,122,α)` dark) at `.05 .08 .10 .12 .15 .20 .30 .40 .50`.

### Gold — the punctuation (hairlines + single glyphs, never a fill)
| Token | Light | Dark |
|---|---|---|
| `--pl-gold` | `#C19A4B` | `#D4B373` |
| `--pl-gold-mist` | `rgba(193,154,75,0.10)` | `rgba(212,179,115,0.10)` |
| `--pl-gold-soft` | `rgba(193,154,75,0.40)` | `rgba(212,179,115,0.40)` |

### Plum — destructive only (least-used major family, ~43 refs)
| Token | Light | Dark |
|---|---|---|
| `--pl-plum` | `#C6563D` | `#C46A6A` |
| `--pl-plum-mist` | `rgba(198,86,61,0.10)` | `rgba(196,106,106,0.10)` |

### Warm accents + semantic states
`--pl-terra` `#C6703D`→`#D67852` · `--pl-rose` `#D9A89E`→`#C08A7E` ·
`--pl-stone` `#C8BFA5`→`#6E6553`.
`--pl-warning` `#A14A2C`→`#D67852` · `--pl-success` = olive
(`#5C6B3F`→`#A4B57A`), each with a `-mist` companion.

### Neutral opacity scales
`--pl-black-4/-6/-7/-10` (`rgba(14,13,11,α)` light / `rgba(241,235,220,α)` dark)
and `--pl-white-20/-30/-50/-70/-90`.

### Editor-chrome tokens (isolated — do NOT flip with the site theme)
`--pl-chrome-bg/-surface/-surface-2/-border/-border-strong/-text/-text-soft/
-text-muted/-text-faint/-accent/-accent-soft/-accent-ink/-danger/-success/
-focus/-shadow/-rail*`. Chrome accent is a warm clay `#B8754A` (light) /
`#E08A5C` (dark) — deliberately *different* from the site olive/gold so panels
read as "the tool," not "the site." **ESLint forbids editor panels from binding
to any non-`--pl-chrome-*` token.** A new system should preserve this
tool-vs-content separation.

---

## 3 · Shadows / radii / motion / glass — real values

### Shadows (warm paper-tint in light, true-black in dark)
```
--pl-shadow-xs  0 1px 2px  rgba(40,28,12,0.05)
--pl-shadow-sm  0 1px 3px  rgba(40,28,12,0.06), 0 1px 2px rgba(40,28,12,0.04)
--pl-shadow-md  0 4px 16px rgba(40,28,12,0.08), 0 2px 6px  rgba(40,28,12,0.05)
--pl-shadow-lg  0 8px 32px rgba(40,28,12,0.10), 0 4px 12px rgba(40,28,12,0.06)
--pl-shadow-xl  0 16px 48px rgba(40,28,12,0.12), 0 8px 20px rgba(40,28,12,0.08)
--pl-shadow-focus  0 0 0 3px rgba(92,107,63,0.22)   /* olive ring */
```

### Radii
```
--pl-radius-xs .25rem · -sm .375rem · -md .5rem · -lg .75rem
--pl-radius-xl 1rem · -2xl 1.5rem · -full 100px
--pl-card-radius = var(--pl-radius-lg)
```
(Not overridden in dark.) The `.pl8` layer keeps a *second, larger* radius scale
in px: `--r-xs 8 · -sm 10 · --r 14 · -md 20 · -lg 28 · -xl 36`.

### Motion — one source of truth
```
--pl-ease-out      cubic-bezier(0.22, 1,    0.36, 1)   /* chrome defaults */
--pl-ease-in-out   cubic-bezier(0.65, 0,    0.35, 1)
--pl-ease-spring   cubic-bezier(0.34, 1.56, 0.64, 1)   /* buttons, CTA */
--pl-ease-emphasis cubic-bezier(0.16, 1,    0.3,  1)   /* NOT interchangeable with ease-out */

--pl-dur-instant 100ms · -subtle 120 · -quick 140 · -fast 180
--pl-dur-base 280 · -slow 480 · -glacial 800
```
`--pl-ease-out` (~196 refs) and `--pl-dur-fast` (~121) are the workhorses.

The signature "weaving" keyframe is literally named **`pl-weave-travel`** (a
loom-shuttle dash travel used by `Thread` + `WeaveLoader`), *not* `pl-weave`:
```css
@keyframes pl-weave-travel { 0% { stroke-dashoffset: 1 } 100% { stroke-dashoffset: -0.32 } }
```
The icon plumbing keyframe is `pl-thread-dash` (`stroke-dashoffset: -40`). There
is no `.pl-thread` utility class — "thread" is the `<Thread/>` component + SVG
animation, not a CSS class family.

### Glass — floating chrome ONLY
`.pl-glass-surface` (+ `-heavy` for docks/palettes/sheets, `-light` for hover
rails). One recipe:
```css
.pl-glass-surface {
  background-color: var(--pl-glass);
  background-image: var(--pl-glass-sheen);            /* diagonal sheen gradient */
  backdrop-filter:  var(--pl-glass-blur, blur(18px) saturate(1.4));
  border: 1px solid var(--pl-glass-border);
  box-shadow: var(--pl-glass-shadow);
}
```
Light frosts warm cream (`--pl-glass rgba(252,248,238,0.62)`); dark frosts
editorial midnight (`rgba(24,20,14,0.55)`). **Rule enforced in code comments and
BRAND §9:** glass never becomes a surface — dashboards, editor panels, and cards
stay paper; only chrome that floats *over* live content wears glass.

> ⚠️ **Known bug to fix, not copy:** `--pl-glass-blur` is declared twice in the
> light `:root` — first as the intended filter `blur(16px) saturate(1.7)
> brightness(1.04)`, then overwritten by a bare `14px`. The `14px` wins, so
> light-mode glass silently loses its saturation/brightness boost. A new system
> should declare it once.

---

## 4 · `.pl8` handoff layer — the chrome color aliases (pearloom.css `:root`)

Friendlier names used by dashboard / editor / wizard / marketing. Two groups:

**Group A — forward to `--pl-*` (so they flip with theme):**
`--cream` → `--pl-cream` · `--cream-2` → `--pl-cream-card` · `--cream-3` →
`--pl-cream-deep` · `--ink` → `--pl-ink` · `--ink-soft` → `--pl-ink-soft` ·
`--ink-2`/`--ink-muted` → `--pl-muted` · `--paper` → `--pl-cream` · `--card` →
`--pl-cream-card` · `--line` → `--pl-divider` · `--line-soft` →
`--pl-divider-soft` · `--gold` → `--pl-gold` · `--font-display` →
`--pl-font-display` · `--font-ui` → `--pl-font-body`.

**Group B — hardcoded accent families (own dark override, do NOT trace to `--pl-*`):**
| | Light | Dark |
|---|---|---|
| `--sage` | `#8B9C5A` | `#97A968` |
| `--sage-deep` | `#6D7D3F` | `#B8C98F` |
| `--sage-bg` / `--sage-tint` | `#CBD29E` / `#E3E6C8` | `#2A301B` / `#20251A` |
| `--peach` | `#F0C9A8` | `#D9A172` |
| `--peach-ink` | `#C6703D` | `#E29B62` |
| `--peach-bg` | `#FBE8D6` | `#2B2014` |
| `--lavender` | `#C4B5D9` | `#9D8BB8` |
| `--lavender-ink` | `#6B5A8C` | `#C5B5DD` |
| `--lavender-bg` | `#E8E0F0` | `#221E2D` |
| `--heart` | `#E8A07A` | `#ECAB85` |

**Reality check the new system should absorb:** site/guest markup references the
handoff aliases `--peach` (~479) and `--sage` (~392) *far* more than the canonical
`--pl-plum` (~43) / `--pl-olive` (~256). `--cream` (~681) is the single hottest
color string in the whole repo. In other words the "friendly" alias layer is
not a convenience skin — **it is the primary color vocabulary the product is
written in.** `--lavender` (~131) is a full 5-variant family but comparatively
light.

Also in `.pl8 :root`: `--font-script: 'Caveat', cursive` (see the font caveat in
§5), the px radius scale, olive-tinted shadows, layout constants (`--maxw
1280px`, `--nav-h 76px`, `--sidebar-w 260px`), and `--pl-dash-glow` (a peach+sage
radial bloom).

---

## 5 · Typography — what's actually loaded

Loaded via `next/font/google` in `layout.tsx`, exposed as CSS vars, then wired
into tokens:

| Role | Family | `next/font` var | Token | Class |
|---|---|---|---|---|
| Display / Heading | **Fraunces** | `--font-fraunces` | `--pl-font-display` / `--pl-font-heading` | `.display`, `.display-italic` |
| Body | **Geist** | `--font-geist` | `--pl-font-body` | `font-body` on `<body>` (229 `display` class uses vs. body as default) |
| Mono / labels | **Geist Mono** | `--font-geist-mono` | `--pl-font-mono` | editorial uppercase labels |
| Editorial eyebrow | (Geist Mono) | — | — | `.eyebrow` (~55 uses) |

Type scale (perfect-fourth) is `--pl-text-2xs .75rem … --pl-text-marquee
clamp(4rem,12vw,9rem)`; display sizes wear `.pl-letterpress` on light surfaces.

> ⚠️ **Caveat is requested but never loaded.** `--font-script: 'Caveat',
> cursive` and every theme's `--t-script` name Caveat, but there is **no
> `next/font` import and no `@font-face`** for it anywhere. The `.script` class,
> `PostIt`, `Polaroid`, and `PhotoPlaceholder` render Caveat only if the
> viewer's OS happens to have it, else fall back to generic `cursive`. A new
> system must either **actually load a script face** or **drop the script role**
> — today it is a silent, inconsistent fallback.

---

## 6 · `--t-*` per-site theme system — the real color contract of a rendered site

`src/components/pearloom/site/themes.ts` — **10 themes** (not the 6 the older docs
claim — *drift, code wins*). `DEFAULT_THEME_ID = 'garden'`.

**Theme ids:** `santorini`, `tuscan`, `garden`, `editorial`, `midnight`,
`coastal`, `amalfi`, `first-light`, `deco-gilt`, `tide-coast`.
(`midnight` and `deco-gilt` carry `dark: true, foil: true`.)

Each theme is a full `--t-*` bag (24 keys) emitted on the `.pl8-guest` root's
`style` attribute, so every `var(--t-*)` inside the site resolves per-site:

```
--t-paper --t-section --t-card
--t-ink --t-ink-soft --t-ink-muted
--t-accent --t-accent-2 --t-accent-bg --t-accent-ink
--t-gold --t-line --t-line-soft
--t-rsvp --t-rsvp-ink
--t-display --t-body --t-script            (font stacks)
--t-radius --t-radius-lg
--t-display-wght --t-hero-scale --t-eyebrow-ls --t-shadow
```

A theme also carries non-color *look* fields: `texture`
(`linen|watercolor|paper|velvet|cotton|none`), `motif`
(`olive|bloom|pressed|none`), and a `look` object —
`card` (`frame|wash|soft|flat`), `button` (`square|pill|sharp`),
`divider` (`sprig|brush|dot|rule|deckle`), `photo`
(`arch|tape|polaroid|clean|deckle`), `heroAlign` (`left|center`),
`motifDensity` (`sparse|generous|none`).

**The default theme in full (cite this as the canonical shape):**
```
garden — "Pressed Garden"
swatches ['#B7A4D0','#8B9C5A','#EAB286','#F3E9D4']  texture paper  motif pressed
look { card:soft, button:pill, divider:dot, photo:polaroid, heroAlign:center, motifDensity:generous }
  --t-paper #FDFAF0   --t-section #F3E9D4   --t-card #FFFEF7
  --t-ink #3D4A1F     --t-ink-soft #566438  --t-ink-muted #8A8671
  --t-accent #B7A4D0  --t-accent-2 #C4B5D9  --t-accent-bg #E8E0F0  --t-accent-ink #6B5A8C
  --t-gold #C19A4B    --t-line rgba(61,74,31,.14)   --t-line-soft rgba(61,74,31,.08)
  --t-rsvp #3D4A1F    --t-rsvp-ink #F8F1E4
  --t-display "'Fraunces',Georgia,serif"  --t-body "'Inter',sans-serif"  --t-script "'Caveat',cursive"
  --t-radius 14px  --t-radius-lg 22px  --t-display-wght 600  --t-hero-scale 1
  --t-eyebrow-ls .14em  --t-shadow 0 8px 22px rgba(61,74,31,.08)
```
(Note `--t-body` requests **Inter** here even though the app loads Geist — another
place a new system should reconcile the intended vs. loaded body face.)

`themeRootStyle(theme, density, override)` spreads `theme.vars` **and also
shadows the base tokens** (`--paper`, `--card`, `--ink`, `--cream`, `--gold`,
`--font-display`, …) to the theme's values, plus a density pad `--t-pad`
(cozy `0.74` / comfortable `1` / spacious `1.32`). This is why dropping a theme
onto a site re-skins even markup that never migrated to `--t-*`.

Concrete `themeId` values in the wild come from the **theme-store pack registry**
(`src/lib/theme-store/packs.ts`): glasshouse, pressed-garden, english-rose,
eucalyptus-press, wildflower-meadow, botanical-ink, midnight-velvet,
celestial-night, magnolia-porch, sakura-drift, first-light, deco-gilt, … The
`themeVars` field (`Record<string,string>`) produced by `themeVarsFromPalette()`
is the renderer's **single color source** — resolution chain is `themeVars` →
`themeId` → nearest-accent match → first theme.

---

## 7 · Material utilities actually applied

Counts are `className` occurrences in `src/**/*.tsx` (not var references).

| Class | Uses | What it is |
|---|---|---|
| `display` | 229 | Fraunces display type |
| `eyebrow` | 55 | mono-uppercase editorial label |
| `pl8-btnfx` | 38 | button press/hover effect |
| `pl-hit44` | 28 | 44px min tap target |
| `pl-pearl-accent` | 25 | iridescent conic-gradient CTA fill (Pearshell) |
| `pl-olive` | 16 | olive text/fill |
| `pl-letterpress` | 16 | pressed-into-paper text-shadow |
| `pl8-inline-ghost` | 15 | ghost inline button |
| `pl8-guest` | 15 | **the site-root namespace** (applied once per rendered site) |
| `pl8-dash-stagger` | 14 | dashboard entrance stagger |
| `pl8-texture-layer` | 9 | paper-texture underlay layer |
| `pl8-hero-display` | 8 | hero display type |
| `pl-display` | 7 | display type (brand-layer variant) |
| `pl-grain` | 4 | fixed paper-grain `::before` overlay |
| `pl-glass-surface` | 3 | floating-chrome glass |

Key definitions to preserve verbatim in spirit:

- **`.pl-grain`** — `::before` with `background-image: var(--pl-grain)` (an inline
  SVG `feTurbulence` fractal-noise data-URI), `opacity .35`,
  `mix-blend-mode: multiply` (light) / `screen` at `.12` (dark). This is BRAND's
  "paper texture under everything," implemented as a fixed underlay.
- **`.pl-letterpress`** — layered `text-shadow` (a light top highlight + two dark
  insets) so glyphs read as pressed into the paper. Has its own dark variant and
  is re-scoped inside guest sites.
- **`.pl-pearl-accent`** — the "Pearshell" iridescent layer: a tri-stop
  `conic-gradient` whose angle is a registered `@property --pl-pearl-phase`
  animated by `pl-pearl-drift` (24s) and, where supported, coupled to scroll via
  `animation-timeline: scroll()`. Uses `!important` on bg/color/border by design.
  Reserved for primary CTAs (~25 sites). Pearl stops are theme-paired.

---

## 8 · The look system — real manifest fields & their enumerations

A site's look is a set of fields on `StoryManifest` (`src/types.ts`), each read by
the renderer. **These enums are larger than the older docs claim — code wins.**

| Field | Real values (from `src/types.ts`) | Reader |
|---|---|---|
| `themeId` | open `string`; default `'garden'`; concrete ids from pack registry | `.pl8-guest` `--t-*` |
| `themeVars` | `Record<string,string>` — the `--t-*` bag | renderer (single color source) |
| `kitId` | **37 ids** (see below) | `[data-pl-kit]` CSS |
| `texture` | none · linen · watercolor · paper · cotton · velvet · smooth · letterpress · vellum · newsprint · kraft · canvas · marble · gilded | `[data-pl-texture]` |
| `textureIntensity` | number (recipes seed 0.6–1.3) | `::before` opacity |
| `edition` | almanac · cinema · postcard-box · linen-folder · quiet · coastal | `[data-pl-edition]` (read-time defaults) |
| `density` | cozy · comfortable · spacious | `[data-pl-density]` + `--pl-density-scale` |
| `motifLayout` | scattered · corners · margins · dividers · crest · none | `MotifLayer.tsx` |
| `atelier` | `boolean` → `data-pl-premium="on"` (gates motion kits) | root attr |
| `motifAnimation` | none · float · drift → `data-pl-motif-anim` | root attr |

**`kitId` — the 37 kits that actually have CSS** (`.pl8-guest[data-pl-kit="…"]`):
classic · ticket · plate · scrapbook · index · minimal · arch · stamp · deco ·
gallery · menu · glass · gilt · atelier · cabinet · scallop · noir ·
boarding-pass · marquee · chalkboard · nursery · kraft · memoriam · certificate ·
luggage-tag · linen-press · wax-seal · pennant · embossed · neon · marquee-live ·
aurora-glass · gold-foil · confetti · candlelight · pressed-bloom · vinyl.
(The `LookRecipe.kitId` *authoring* type is a narrower subset —
classic/ticket/plate/scrapbook/index/minimal/glass — but the renderer supports
all 37.)

**Edition sub-styles** (`site-editions/types.ts`): `SectionOpenerStyle`
(chapter-mark/slug-line/stamp/mono-label/overline), `DividerStyle`
(thread/sprocket/stitch/gold-hairline/whitespace), `CtaShape`
(pearl/pill/hairline/tag), `TypeScale` (compact/standard/generous).

**Density is not a token scale.** There is **no `--pl-space-*` scale**. Spacing is
hard-coded px plus the density system: `margin-block` deltas on `section[id]`
(cozy `-14px`, spacious `+24px`, comfortable no-op) and a `--pl-density-scale`
multiplier read via inline style. A new system that wants a real spacing scale
would be *adding* one, not documenting one.

---

## 9 · Brand primitives & components — with usage reality

Import counts = **distinct files** with a real `import … from` (substring greps
over-count; these are parsed).

### `src/components/brand/` (imported by direct path, no barrel)
| Primitive | Importers | Status | What it renders |
|---|---|---|---|
| `WeaveLoader` | **10** | ✅ core | the *only* sanctioned spinner — two threads weaving |
| `Pearl` | 4 | ✅ | gold pearl bead punctuation / status marker |
| `Divider` | 4 | ✅ | ornamental section break (fleuron + hairlines) |
| `Thread` | 3 | ✅ | two-strand olive+gold rule; replaces `<hr>` |
| `Motif` | 3 | ✅ | single-stroke editorial line ornaments |
| `PearloomMark` | 2 | ✅ | logo mark (pear + carved spiral) |
| `Folio` | **1** | ⚠️ near-dead | edition corner-mark; only importer is `EmptyState` |
| `GooeyText` | **1** | ⚠️ near-dead | SVG text-morph; only importer is `InviteReveal` |
| `Monogram` | **1** | ⚠️ near-dead | host monogram; only importer is `WizardV8` |

### `src/components/shell/` (barrel `index.ts`)
`Button`, `Badge`, `StatTile`, `PageCard`, `PageEnter`, `EmptyState`,
`LoadingSkeleton` (`Skeleton`/`SkeletonStack`/`SkeletonCard`), `ThemeProvider` +
`useTheme`, `ThemeToggle`. Note `EmptyState` — the sanctioned "Nothing yet.
Begin a thread." primitive — is imported by only **3** files; modest adoption.

### `src/components/effects/` (7)
`GradientMesh`, `GrainOverlay`, `TextureOverlay`, `VignetteOverlay`,
`ColorTemperature`, `CustomCursor`, `ScrollReveal`.

### Glyph system — `src/components/pearloom/motifs.tsx` (the real workhorse)
| Glyph | Importers |
|---|---|
| `Icon` | **111** — the single most-imported design symbol in the app |
| `Pear` | 47 |
| `Sparkle` | 17 |
| `Squiggle` | 8 · `Blob` 6 · `PearloomLogo`/`PearloomWordmark`/`Sprig`/`Stamp` 5 · `Heart` 4 |
| **0 importers** | `PearMascot`, `Filigree`, `Asterism`, `Fleuron`, `HairlineRule`, `Bookmark`, `Polaroid` |

(`AmbientSprig` lives in `pearloom/ambient.tsx`, not motifs.tsx — 4 importers.)

### `src/components/brand/groove/` — the marketing/chrome bouncy-motion set
19 files behind a barrel. Live: `Bloom` (9), `Swirl` (4), `Sparkle` (3), and a
handful of 1-importer pieces. **Dead exports (0 named imports):** `Ripple`,
`GrooveBento`, `TracingThread`, `AnimatedList`, `CurvedText`, `MagneticHover`,
`useMagneticPointer`, `useScrollProgress`, `PearScene`, `Worm`. Roughly half the
groove surface is carried but unused.

---

## 10 · Microcopy — the rules that are actually being followed

BRAND §7 bans certain words; production largely complies (raw grep):

- **"Threading"** — 109 occurrences (the sanctioned "Loading…" replacement is
  heavily used).
- **"Loading"** — 16, and most are *not* violations: skeleton internals, the Next
  reserved `loading.tsx` filename, and the LLM prompt rules that *enforce* the
  ban. Genuine user-facing leftovers to fix: `RegistryManager.tsx:507`,
  `SeatingCanvas.tsx:623`, `seating/page.tsx:201`, `sites/[domain]/loading.tsx`.
- **"drafted by Pear" / "drafted"** — 7 (the sanctioned attribution; prompts
  enforce "Generated" → "drafted").
- **"Begin a thread"** — 27 (the sanctioned CTA, widely used).

The bans are also encoded into the AI route prompts (`api/pear-chat`,
`api/wizard/draft`), so copy generated at runtime inherits them. A new system
should keep enforcing microcopy at the *prompt* layer, not just in static
strings.

---

## 11 · What to drop, reconcile, or fix — do NOT carry this forward

A new design system is a chance to shed accumulated cruft. Flagged from this
audit:

**Dead / near-dead — safe to drop or fold in:**
- Brand primitives with ≤1 importer: `Folio`, `GooeyText`, `Monogram`.
- Motif exports with 0 importers: `PearMascot`, `Filigree`, `Asterism`,
  `Fleuron`, `HairlineRule`, `Bookmark`, `Polaroid`.
- groove exports with 0 importers: `Ripple`, `GrooveBento`, `TracingThread`,
  `AnimatedList`, `CurvedText`, `MagneticHover`, `useMagneticPointer`,
  `useScrollProgress`, `PearScene`, `Worm`.
- Low-use color families relative to their size: `--pl-plum` (destructive-only,
  fine), `--lavender` (5 variants, ~131 refs), `--pl-terra`/`--pl-rose`/
  `--pl-stone`/`--heart` (single-purpose accents).

**Bugs to fix, not replicate:**
- `--pl-glass-blur` declared twice in light `:root` (bare `14px` clobbers the
  intended saturated filter).
- **Caveat font requested but never loaded** (no `next/font`, no `@font-face`) —
  the `--t-script` / `.script` role is a silent OS-dependent fallback.
- `--t-body` names **Inter** in themes while the app loads **Geist** — intended
  vs. loaded body face disagree.

**Drift between docs and code (code is authority):**
- Themes: docs say **6**, code has **10** (`themes.ts`).
- Kits: docs say **6**, renderer supports **37** (`[data-pl-kit]` CSS).
- Textures: docs list a short set; type union carries **14** + CSS styles more.
- Keyframe: docs reference `pl-weave`; the real one is `pl-weave-travel`.
- "thread" is a component (`<Thread/>`) + SVG animation, **not** a CSS class
  family (no `.pl-thread`).
- There is no `--pl-space-*` spacing scale (density + fixed px instead).

**Structural conventions worth *keeping*:**
- Three-layer color cascade (`--pl-*` → `.pl8` aliases → `--t-*` per site).
- Editor chrome isolated to `--pl-chrome-*` (ESLint-enforced); chrome accent is
  intentionally a different hue from site accents.
- Glass = floating chrome only; paper is the surface material everywhere else.
- Theme mode on `<html data-theme>`, look axes as `data-pl-*` on `.pl8-guest`.
- `Icon` + `Pear` glyphs as the primary symbol vocabulary (158 combined
  importers).

---

*Grounded from source on 2026-07-04. Counts and values drift — re-run the audit
(grep `--pl-`, `--t-`, `data-pl-`, and `import … from '@/components/brand'`)
before treating any number here as current. The code is the final authority.*
