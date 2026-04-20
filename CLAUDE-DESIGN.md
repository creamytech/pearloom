# CLAUDE-DESIGN.md — Pearloom implementation reference

> **BRAND.md is the constitution. This file is the blueprint.**
> BRAND.md declares what Pearloom *stands for*. This file maps what actually lives in the code so future sessions can navigate without re-auditing.
>
> Last full audit: **2026-04-20**. Re-audit before any large refactor.

---

## 0 · How to use this file

- **Read BRAND.md first.** If a rule here contradicts BRAND.md, BRAND.md wins — flag the drift and update this file.
- **Every section is concrete.** Token values, file paths, class names, and durations are pasted verbatim. If the code disagrees, the code has drifted.
- **Section 17 (Known drift) is the active tech-debt list.** Fix from the top.
- **When making new components, read §9 (Brand primitives) and §6 (Pearshell) first** — extend, don't fork.
- **Every CTA that matters uses `.pl-pearl-accent`** (see §6). Every primary affordance in the conversion funnel already does.

---

## 1 · Source-of-truth map

| Concern | Canonical file | Notes |
|---|---|---|
| CSS variables, keyframes, utilities | `src/app/globals.css` | Primary. All runtime styling descends from here. |
| Numeric token mirror (light-mode hex, easing arrays, etc.) | `src/lib/design-tokens.ts` | Perfectly aligned with globals.css as of 2026-04-20. Import via `import { colors, text, radius, shadow, ease, sectionPadding, card, layout } from '@/lib/design-tokens'`. |
| Tailwind CSS var mapping | `tailwind.config.ts` | Thin layer — maps utility classes to CSS vars, no duplicate values. |
| Theme generation | `src/lib/theme.ts` | `themeToCssBlocks`, `deriveDarkPalette`, `themeToCssVars`. |
| Theme runtime | `src/components/theme-provider.tsx` | `[data-pl-site-root][data-theme=light\|dark]` scope + localStorage. |
| Editor state | `src/lib/editor-state.ts` | `useEditor`, `EditorProvider`, 49 `EditorAction` variants, `SaveState`. |
| URL construction | `src/lib/site-urls.ts` | `buildSiteUrl`, `buildSitePath`, `formatSiteDisplayUrl`. |
| Gemini client | `src/lib/memory-engine/gemini-client.ts` | Pro / Flash / Lite / Image endpoints. |
| Claude client | `src/lib/claude/client.ts` | Opus / Sonnet / Haiku with `withRetry` and `cached`. |
| Rate limit | `src/lib/rate-limit.ts` | `checkRateLimit(key, { max, windowMs })`, `getClientIp`. |
| R2 / storage | `src/lib/r2.ts` | `uploadToR2(key, body, contentType)`, `uploadSvg`, `getR2Url`. |

---

## 2 · Color tokens

All tokens have paired light/dark values unless noted. No orphaned tokens as of last audit.

### 2.1 Surfaces & ink

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--pl-cream` | `#F5EFE2` | `#0D0B07` | Warm paper base |
| `--pl-cream-deep` | `#EBE3D2` | `#15110A` | Alternating sections |
| `--pl-cream-card` | `#FBF7EE` | `#1A1610` | Elevated cards |
| `--pl-ink` | `#0E0D0B` | `#F1EBDC` | Primary text |
| `--pl-ink-soft` | `#3A332C` | `#D4CDBC` | Secondary text |
| `--pl-muted` | `#6F6557` | `#8A8275` | Tertiary text (WCAG AA on cream) |
| `--pl-divider` | `#D8CFB8` | `#2A241A` | Borders, rules |
| `--pl-divider-soft` | `#E5DCC4` | `#1F1A12` | Near-invisible separators |

### 2.2 Brand

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--pl-olive` | `#5C6B3F` | `#A4B57A` | Primary brand — the editorial olive |
| `--pl-olive-hover` | `#4A5731` | `#B8C98F` | Hover state |
| `--pl-olive-deep` | `#363F22` | `#8A9A60` | Darker variant |
| `--pl-olive-mist` | `#E0DDC9` | `#1F2014` | Wash / background tint |
| `--pl-gold` | `#B8935A` | `#D4B373` | Accent — **punctuation only, per BRAND.md §5** |
| `--pl-gold-mist` | `rgba(184,147,90,0.10)` | `rgba(212,179,115,0.10)` | Wash |
| `--pl-plum` | `#7A2D2D` | `#C46A6A` | Destructive only |
| `--pl-plum-mist` | `rgba(122,45,45,0.10)` | `rgba(196,106,106,0.10)` | Wash |

**Rule (BRAND.md §5):** Gold is never a background. 1px hairlines or a single glyph. If you're tempted to `background: var(--pl-gold)` you're doing it wrong.

### 2.3 Semantic

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--pl-warning` | `#A14A2C` | `#D67852` | Burnt orange — editorial warning |
| `--pl-warning-mist` | `rgba(161,74,44,0.10)` | `rgba(214,120,82,0.12)` | Warning wash |
| `--pl-success` | `#5C6B3F` | `#A4B57A` | Reuses olive — calm success |
| `--pl-success-mist` | `rgba(92,107,63,0.10)` | `rgba(164,181,122,0.12)` | Success wash |

### 2.4 Opacity scales

- Olive: `--pl-olive-{5,8,10,12,15,20,30,40,50}` (paired light/dark)
- Neutral black: `--pl-black-{4,6,7,10}` (inverts polarity light↔dark)
- White: `--pl-white-{20,30,50,70,90}` (inverts polarity light↔dark)

### 2.5 Glass / blur

- `--pl-glass` light `rgba(251,247,238,0.92)` / dark `rgba(26,22,16,0.86)`
- `--pl-glass-light`, `--pl-glass-heavy`, `--pl-glass-dark` variants
- `--pl-glass-border`, `--pl-glass-light-border`, `--pl-glass-dark-border`
- `--pl-glass-blur` = `14px`, `--pl-glass-blur-sm` = `8px`, `--pl-glass-blur-lg` = `20px`
- `--pl-glass-shadow`, `--pl-glass-shadow-lg` for floating chrome

**Rule (BRAND.md §9):** Glass is reserved for floating chrome (toasts, modals, ambient nav). Dashboards and editor panels stay paper.

### 2.6 Editor chrome (isolated namespace)

The editor has its own palette (`--pl-chrome-*`) that is **deliberately insulated** from the user's site theme. Panels always look the same no matter what theme the edited site is on.

Tokens: `--pl-chrome-bg`, `--pl-chrome-surface`, `--pl-chrome-surface-2`, `--pl-chrome-border`, `--pl-chrome-border-strong`, `--pl-chrome-text`, `--pl-chrome-text-soft`, `--pl-chrome-text-muted`, `--pl-chrome-text-faint`, `--pl-chrome-accent`, `--pl-chrome-accent-soft`, `--pl-chrome-accent-ink`, `--pl-chrome-danger`, `--pl-chrome-success`, `--pl-chrome-focus`, `--pl-chrome-shadow`, `--pl-chrome-rail*` (rail is the dark icon column on the editor's left edge).

**Rule:** Panels should only bind to `--pl-chrome-*` tokens. Not `--pl-cream`, not `--pl-ink`.

### 2.7 P3 wide-gamut boost

`@media (color-gamut: p3)` in `globals.css` promotes olive/gold/plum to `oklch()` values on capable displays. sRGB hex stays as the fallback. Nothing to change in components — the media query rewrites the token at runtime.

### 2.8 Legacy `--eg-*` aliases (DEBT)

The `--eg-*` namespace (roughly 30 tokens: `--eg-bg`, `--eg-fg`, `--eg-accent`, `--eg-gold`, `--eg-plum`, etc.) exists for backward compatibility with pre-v6 editor components. **Do not add new `--eg-*` references.** Migrate usages to `--pl-*` when touching nearby code.

### 2.9 shadcn/ui standard tokens

These are aliased through to `--pl-*` in `globals.css`:

`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--radius`.

Consumers via Tailwind `bg-background`, `text-foreground`, etc., get themed values automatically.

---

## 3 · Typography

### 3.1 Font families

| Token | Family | Notes |
|---|---|---|
| `--pl-font-display` | Fraunces (italic preferred) | Next.js font var `--font-fraunces` |
| `--pl-font-heading` | Fraunces (upright OK) | |
| `--pl-font-body` | Geist | Next.js font var `--font-geist` |
| `--pl-font-mono` | Geist Mono | Editorial labels — **always uppercase, 0.18–0.28em tracking, 9–11px** |

**Rule (BRAND.md §4):** Sans-serif display headings are out of scope. Fraunces is not optional for display.

### 3.2 Variation axes (Fraunces)

| Role | `opsz` | `SOFT` | `WONK` | `font-style` |
|---|---|---|---|---|
| Display | 144 | 50–80 | 0 (upright) / 1 (italic) | as needed |
| Display italic (signature) | 144 | 80 | 1 | italic |
| Heading | 96 | 50 | 0 | upright |
| Body emphasis | 14 | 0 | 0 | upright |

Apply via `font-variation-settings: '"opsz" 144, "SOFT" 80, "WONK" 1'`. The utility classes below wrap these combinations.

### 3.3 Size scale (`--pl-text-*`)

| Token | Value | Use |
|---|---|---|
| `--pl-text-2xs` | `0.66rem` | Micro labels |
| `--pl-text-xs` | `0.74rem` | Tiny hints |
| `--pl-text-sm` | `0.82rem` | Small labels |
| `--pl-text-base` | `0.92rem` | Body |
| `--pl-text-md` | `1rem` | Card titles |
| `--pl-text-lg` | `1.13rem` | Section headers |
| `--pl-text-xl` | `1.32rem` | Panel titles |
| `--pl-text-2xl` | `1.6rem` | Page titles |
| `--pl-text-3xl` | `clamp(2rem, 4vw, 2.6rem)` | Responsive heading |
| `--pl-text-display` | `clamp(2.8rem, 6vw, 4.6rem)` | Hero display |
| `--pl-text-marquee` | `clamp(4rem, 12vw, 9rem)` | Large editorial marquee |

### 3.4 Utility classes

- `.pl-display` — Fraunces, opsz 144, SOFT 50, letter-spacing -0.02em, line-height 0.96
- `.pl-display-italic` — Fraunces italic, opsz 144, SOFT 80, WONK 1
- `.pl-overline` — uppercase, `--pl-text-2xs`, 600 weight, 0.22em tracking
- `.pl-letterpress` — **signature** — Fraunces display with inset shadow that makes glyphs feel pressed into the paper
- `.pl-dropcap::first-letter` — 4.6em Fraunces italic drop cap
- `.pl-text-soft` / `.pl-text-crisp` / `.pl-text-display` — font-variation-settings presets
- `.pl-label` — uppercase muted bold label
- `.pl-heading` / `.pl-body` / `.pl-muted-text`

**Rule:** Display copy on cream surfaces almost always wears `.pl-letterpress`.

### 3.5 Icon sizes

`--pl-icon-xs 12px` / `sm 14px` / `md 16px` / `lg 20px` / `xl 24px`.

---

## 4 · Motion system

### 4.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--pl-dur-instant` | `100ms` | Near-instant tap feedback |
| `--pl-dur-fast` | `180ms` | Standard hover/focus |
| `--pl-dur-base` | `280ms` | Panel transitions |
| `--pl-dur-slow` | `480ms` | Modal, reveal |
| `--pl-dur-glacial` | `800ms` | Hero moments |
| `--pl-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for chrome |
| `--pl-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric motion |
| `--pl-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Buttons, primary CTAs, tap |

### 4.2 Signature keyframes

Full catalog is in `globals.css` — below are the ones worth knowing by name:

- **`pl-weave-travel`** — loom shuttle, stroke-dashoffset travel. The brand's literal motion. Used by `<Thread />`, `<WeaveLoader />`, `<WovenDivider />`, `HeroAtmosphere`.
- **`pl-pearl-drift`** — 24s pearl phase rotation. See §6.
- **`pl-pearl-scroll`** — scroll-timeline coupled pearl phase. See §6.
- **`pl-conic-spin`** — generic 360° rotation for conic gradients (Showroom card hover overlay uses this).
- **`pl-letterpress`** — inset-shadow lift on display copy.
- **`pl-dot-pulse`** — notification / save-state dot.
- **`pl-enter-up`**, **`pl-enter-scale-in`**, **`pl-enter-fade-in`** — entrance primitives.
- **`.pl-rise`** + `.pl-rise-d1`…`.pl-rise-d6` — staggered entrance, delay steps.
- **`pl-reveal-frame`** — scroll-timeline reveal (fade + translate + blur).
- **`pl-pear-breathe`** — mascot breathing.
- **`pl-cta-pulse`** — subtle CTA pulse (superseded by `.pl-pearl-accent` for primary CTAs).

### 4.3 Reduced motion

Every keyframe that actually moves respects `@media (prefers-reduced-motion: reduce)`. Eight such blocks live in `globals.css`. Do not bypass; reuse `.pl-pearl-accent` and the `.pl-enter-*` system which already honour it.

### 4.4 Framer Motion conventions

- `initial / animate / exit` states use arrays from `ease` in `design-tokens.ts` (`[0.22, 1, 0.36, 1]`).
- `whileHover={{ y: -1 }}` + `whileTap={{ scale: 0.97 }}` is the default micro-interaction pair.
- Route entrances use `pl-enter` + `pl-rise-dN` classes instead of framer where possible.

---

## 5 · Shadows, radius, z-index, spacing, glass

### 5.1 Shadows (`--pl-shadow-*`)

| Token | Light | Dark |
|---|---|---|
| `xs` | `0 1px 2px rgba(40,28,12,0.05)` | `0 1px 2px rgba(0,0,0,0.40)` |
| `sm` | `0 1px 3px ..., 0 1px 2px ...` | same structure, darker RGBA |
| `md` | `0 4px 16px rgba(40,28,12,0.08), 0 2px 6px ...` | |
| `lg` | `0 8px 32px ..., 0 4px 12px ...` | |
| `xl` | `0 16px 48px ..., 0 8px 20px ...` | |
| `focus` | `0 0 0 3px rgba(92,107,63,0.22)` | `0 0 0 3px rgba(164,181,122,0.32)` |

### 5.2 Border radius (`--pl-radius-*`)

`xs 0.25rem` · `sm 0.375rem` · `md 0.5rem` · `lg 0.75rem` · `xl 1rem` · `2xl 1.5rem` · `full 100px`.

### 5.3 Z-index (`--z-*`)

`dropdown 50` · `sticky 100` · `overlay 200` · `modal 300` · `toast 400` · `max 500`.

**Drift note:** preview/editor chrome sometimes uses raw 9000+ z-indexes intentionally (e.g., `VignetteOverlay`). For consumer-facing pages, always reach for the `--z-*` vars.

### 5.4 Spacing

`--space-{1,2,3,4,5,6,8,10,12,16,20,24}` in 4px increments (4 → 96).

### 5.5 Section / layout constants (`design-tokens.ts`)

- `layout.maxWidth` = `1180px`
- `layout.narrowWidth` = `720px`
- `layout.wideWidth` = `1320px`
- `layout.rail` = `64px`
- `sectionPadding.y` = `clamp(4rem, 8vw, 8rem)`
- `sectionPadding.x` = `clamp(1.25rem, 4vw, 2.5rem)`

---

## 6 · Pearshell — the iridescent accent layer (v7.2, 2026)

**The screenshot hook.** Pearl is the brand signal that appears on every primary affordance in the conversion funnel. It is a conic tri-stop gradient whose phase is a *registered CSS custom property*, animated on idle and coupled to page scroll on supporting browsers so every pearl on screen drifts in unison.

### 6.1 Tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--pl-pearl-a` | `#F8F1E6` | `#2A2722` | Cool stop |
| `--pl-pearl-b` | `#D9E0DD` | `#3C3E3D` | Neutral stop |
| `--pl-pearl-c` | `#EAD4D6` | `#4A3A3C` | Warm stop |
| `--pl-pearl-ink` | `#2C1E12` | `#F1EBDC` | Text on pearl |
| `--pl-rind` | `#E9D9A8` | `#5C4F2E` | Pearl outline / warm |
| `--pl-bruise` | `#9C6C43` | `#C49A6F` | Pearl shadow / deep |

Designed so the three stops read as **luminance**, not rainbow. It's a sheen, not a holograph.

### 6.2 Registered property

```css
@property --pl-pearl-phase {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}
```

Registered (not just `--var`) so CSS can interpolate the angle smoothly instead of snapping between keyframe stops.

### 6.3 Utility classes

| Class | Purpose |
|---|---|
| `.pl-pearl-accent` | Filled pearl surface. Primary CTAs. `background` / `color` / `border` use `!important` so Tailwind utility overrides don't silently shadow it. |
| `.pl-pearl-border` | 1px pearl edge on a neutral surface. Selected pills, focus states. |
| `.pl-block-selected` | Soft pearl glow outline for selected canvas blocks (editor). |

### 6.4 Animation

- Base: `pl-pearl-drift 24s linear infinite` (advances `--pl-pearl-phase` 0° → 360°).
- Scroll-coupled (@supports `animation-timeline: scroll()`): adds `pl-pearl-scroll linear` with `animation-timeline: scroll(root block)` so scroll position nudges the phase.
- Reduced motion: all pearl animations off; phase pinned at `48deg` so the palette still reads correctly.

### 6.5 Where it's wired (current production usage)

| Surface | File:line (approx) |
|---|---|
| Marketing nav "Start free" CTA (desktop + mobile) | `src/components/marketing/MarketingNav.tsx:153`, mobile drawer CTA |
| Marketing hero "Start weaving — free" | `src/components/marketing/EditorialHero.tsx` primary button |
| Landing footer CTA | `src/components/landing-page.tsx` gold-variant Button |
| Pricing highlighted tier (Atelier only) | `src/components/marketing/PricingPreview.tsx` tier CTA |
| Save-the-Date primary Send CTA + selected Photo Style pill | `src/components/editor/SaveTheDatePanel.tsx` |
| Login "Continue with Google" | `src/app/login/LoginClient.tsx` |
| Editor "Publish" | `src/components/editor/EditorToolbar.tsx` |
| Wizard "Next step" + "Set the Layout" | `src/components/wizard/PearSpotlight.tsx` |
| Showroom card "Open the site" (on hover) | `src/components/marketing/SiteShowroom.tsx` |
| Testimonial quote medallion (on hover) | `src/components/marketing/Testimonials.tsx` |
| Selected canvas block outline | `src/components/editor/SiteRenderer.tsx` applies `.pl-block-selected` |

### 6.6 Rules

- Pearl is **only** on interactive affordances. Never on body text, never on flat surfaces, never larger than a CTA pill or card edge.
- One brand, one phase — all pearl across a page drifts in sync because they all read the same inherited `--pl-pearl-phase`.
- Tailwind will shadow `.pl-pearl-accent` without `!important`. The class uses `!important` for bg/color/border on purpose.
- If you compose `.pl-pearl-accent` onto a Button variant, prefer the `gold` variant as the semantic fallback (so removing the class leaves a coherent button).

---

## 7 · Theme architecture

### 7.1 Scope

The theme attribute lives on `[data-pl-site-root][data-theme="light" | "dark"]` (see `src/components/theme-provider.tsx:198–200`). **Not on `html`.** This is intentional: published sites never collide with editor chrome's theme state.

### 7.2 Switching

- `<ThemeProvider>` wraps site renders; `<SiteThemeToggle />` is the visitor-facing toggle.
- Initial mode resolved by `readInitialMode()` (`src/components/theme-provider.tsx:60–70`): localStorage → `prefers-color-scheme: dark` → light.
- Persistence key: **`pl-site-theme`**.
- Transition: 700ms `cubic-bezier(0.22, 1, 0.36, 1)` applied site-wide to colour/fill/stroke with explicit exclusions for input:focus, textarea:focus, button:active (so typing and clicking feel instant).

### 7.3 Theme generation

- `themeToCssBlocks(theme)` (`src/lib/theme.ts:178–185`) emits two CSS declaration blocks scoped by `[data-theme=...]`. Injected into `<style>` so the browser variable swap is atomic — no React re-render.
- `deriveDarkPalette(light)` (lines 90–105) auto-derives a dark palette: preserves hue with `vivify()` saturation boost (0.08), darkens surfaces, flips text contrast.
- `themeToCssVars(theme, mode?)` flattens to a record — used for wizard + non-switching chrome.

### 7.4 Dark mode character

BRAND.md §10: dark mode is "editorial midnight", not OLED black. The cream family stays warm (`#0D0B07` base, `#1A1610` cards), the olive brightens to read on dark, gold warms slightly. Don't introduce pure black.

---

## 8 · Effects library

All in `src/components/effects/`. Use them; don't roll your own.

| Component | File | Purpose |
|---|---|---|
| `GradientMesh` | `GradientMesh.tsx` | Paper Design WebGL mesh shader. Presets: `aurora`, `sunset`, `ocean`, `forest`, `rose`, `champagne`, `twilight`, `custom`. Speed: `still`, `slow`, `medium`, `fast`. Fixed-position underlay. |
| `GrainOverlay` | `GrainOverlay.tsx` | SVG feTurbulence noise overlay. Paired with `.pl-grain` utility. |
| `VignetteOverlay` | `VignetteOverlay.tsx` | Edge darkening. z-index 9989 intentional. |
| `TextureOverlay` | `TextureOverlay.tsx` | Paper / linen / concrete / velvet / bokeh patterns. |
| `ColorTemperature` | `ColorTemperature.tsx` | Warm/cool filter — applies sepia + hue-rotate. |
| `ScrollReveal` | `ScrollReveal.tsx` | On-view reveal wrapper. Prefer CSS scroll-timeline via `.pl-scroll-*` when possible. |
| `SectionDivider` | `SectionDivider.tsx` | SVG divider with animation. |
| `CustomCursor` | `CustomCursor.tsx` | Cursor shape override. Sparingly. |

**Bespoke hero atmosphere:** `src/components/marketing/HeroAtmosphere.tsx` — layered shader mesh + woven threads + cursor-tracked pearl halo + top/bottom feather. Mounted inside `EditorialHero`. Honours reduced motion.

**Woven divider:** `src/components/marketing/WovenDivider.tsx` — 96px band with 9 strands and alternating warp gradients, used between hero and Showroom. Uses the same `pl-weave-travel` keyframe as `<Thread />` and `<WeaveLoader />` so the loom motion is continuous down the page.

**Rule (BRAND.md §3):** paper texture under everything. Apply `.pl-grain` on the section wrapper, not on individual cards.

---

## 9 · Brand primitives (canonical)

Under `src/components/brand/`. **Use them. If a surface needs something close, extend — don't fork.** (BRAND.md §8.)

| Primitive | Replaces | Signature props |
|---|---|---|
| `<Thread />` | `<hr>`, divider lines | `variant` (`weave`, `straight`, `single`, `bullet`), `animated`, `color`, `color2`, `weight`, `glyph`, `width`, `height` |
| `<WeaveLoader />` | Every spinner, `Loader2`, `animate-spin` | size, colour defaults to olive+gold |
| `<Pull />` | Blockquotes | `variant` (`plate`, `inline`), `cite`, `italic`, `color`, `glyphColor`, `size` |
| `<Folio />` | Page numbers, chapter marks, "Edition 01" | `kicker`, `no`, `label`, `direction`, `ruleColor`, `color`, `rules`, `size` |
| `<EmptyState />` | "No data" / "Empty list" panels | (see `src/components/shell/EmptyState.tsx`) |
| `<GooeyText />` | Rotating word UIs | `words[]`, `interval`, `fontSize`, `italic`, `color`, `fontFamily`, `letterSpacing`, `intensity` |
| `<KineticHeading />` | Scroll-linked display headings | — |
| `<AmbientNav />` | Marketing + dashboard top chrome | — |
| `<PearloomMark />` | Logo glyph | `size`, `color`, `color2`, `animated` |

**Drift flag:** `EditorialHero.tsx` currently uses its own `AnimatePresence` + `motion.em` for the rotating occasion word instead of `<GooeyText />`. Restore the primitive when touching that section next.

**Rule:** "Loading…" → `<WeaveLoader />`. "AI-powered" → never write that phrase. See BRAND.md §7 for microcopy rules.

---

## 10 · Component inventory

**368 components across 27 subdirectories** as of last audit. Detailed file lists below.

### 10.1 UI primitives — `src/components/ui/*` (32 files)

Built on shadcn/ui + Radix, styled via `--pl-*` tokens. All barrel-exported from `src/components/ui/index.ts`.

- **`button.tsx`** — `Button`, `buttonVariants`
  - Variants: `primary`, `accent`, `secondary`, `ghost`, `gold`, `warning`, `danger`, `darkGhost`, `ink`
  - Sizes: `xs`, `sm`, `md`, `lg`, `xl`, `icon`, `iconLg`
  - **Drift flag:** `primary` and `accent` variants are currently identical (`bg-[#18181B]`). Collapse or differentiate.
  - Variants hardcode `bg-[#18181B]` instead of `bg-ink`. See §17.
- **`card.tsx`** — `Card`, `CardHeader/Title/Description/Content/Footer`
  - Variants: `elevated` (glass default), `flat` (cream), `outlined`, `glass` (frosted), `dark`, `bento`
  - Padding: `none`, `xs`, `sm`, `md`, `lg`, `xl`
- **Form & input:** `input.tsx`, `textarea.tsx`, `form.tsx` (FormField, FormSection, Select, DateInput, TimeInput), `switch.tsx`, `date-picker.tsx`, `color-picker.tsx`, `file-upload.tsx`, `range-slider.tsx`, `custom-select.tsx`
- **Feedback:** `badge.tsx`, `Pill.tsx`, `IconCircle.tsx`, `skeleton.tsx` (Skeleton / SkeletonText / SkeletonCircle), `empty-state.tsx`, `animated-number.tsx`, `progress-arc.tsx`, `progress-steps.tsx`
- **Overlay:** `modal.tsx` (Dialog family), `dropdown.tsx`, `tooltip.tsx`, `confirm-dialog.tsx`
- **Layout:** `tabs.tsx`, `accordion.tsx`, `separator.tsx`, `marquee.tsx`, `avatar.tsx`, `UpgradeGate.tsx`

### 10.2 Shell — `src/components/shell/*` (11 files, barrel-exported)

App-shell patterns. Consumers import via `@/components/shell` only.

`AppShell`, `ThemeProvider`, `ThemeToggle`, `PageCard`, `EmptyState`, `LoadingSkeleton` (Skeleton / SkeletonStack / SkeletonCard), `SiteSelector` (+ `SiteOption` type), `ResponsiveTable` (+ `Column` type), `Button` (shell-scoped wrapper), `StatTile`.

### 10.3 Brand — `src/components/brand/*` (8)

Covered in §9 above.

### 10.4 Effects — `src/components/effects/*` (8)

Covered in §8 above.

### 10.5 Marketing — `src/components/marketing/*` (20 files)

After this session's cleanup (MarketingHero + EventOSShowcase deleted; HeroAtmosphere + WovenDivider added):

| File | Role |
|---|---|
| `EditorialHero.tsx` | Landing hero with editorial grid + product card mock |
| `HeroAtmosphere.tsx` | Shader mesh + loom threads + cursor halo behind the hero |
| `WovenDivider.tsx` | Section divider band between hero and showroom |
| `MarketingNav.tsx` | Top navigation (sticky, scroll-aware, theme toggle) |
| `MarketingFooter.tsx` | Footer (columns + wired newsletter form + socials) |
| `SiteShowroom.tsx` | Six real template cards with hover previews in own accent |
| `EventOSPillars.tsx` | Three pillars (Compose / Conduct / Remember) with active-plate halo |
| `PricingPreview.tsx` | 3-tier cards (Journal / Atelier / Legacy), highlighted tier gets pearl |
| `FAQSection.tsx` | Radix Accordion on 10 FAQs |
| `Testimonials.tsx` | 3 quote cards with pearl medallion on hover |
| `SocialProofBar.tsx` | 4 animated counters + testimonial marquee |
| `TheLoomShowcase.tsx` | AI passes pill display + rind palette swatches |
| `EditorShowcase.tsx` | Typing demo of the editor with animated cursor |
| `GuestExperience.tsx` | 4 feature groups (Site / Guests / Comms / After) |
| `HowItWorks.tsx` | Step-by-step |
| `TrustSignals.tsx` | GDPR / security / CDN / uptime badges |
| `BlockTypesGrid.tsx` | Feature grid of editor block types |
| `SiteMockup.tsx` | Device frame mockup |
| `SectionHeader.tsx` | Reusable section title primitive |
| `colors.ts` | Marketing-specific palette re-exports |

### 10.6 Dashboard — `src/components/dashboard/*` (31 files)

Top-level:

- Home: `EventHQ.tsx`, `UserSites.tsx`, `DashboardShell.tsx`
- Navigation: `sidebar.tsx`, `user-nav.tsx`, `MobileBottomNav.tsx`
- Panels: `RsvpDashboard.tsx`, `TemplateGallery.tsx`, `SiteCompletenessPanel.tsx`, `SiteAnalytics.tsx`, `SiteSharePanel.tsx`, `AnnouncementsPanel.tsx`, `MessagingPanel.tsx`, `CoordinatorPanel.tsx`, `ReferralPanel.tsx`, `VendorBookingsPanel.tsx`, `PhotoModerationPanel.tsx`, `HeirloomArchive.tsx`, `VoiceToastsPanel.tsx`, `CuratorAICard.tsx`, `UpgradePrompt.tsx`, `FontPicker.tsx`
- Editors: `site-editor.tsx`, `block-editor.tsx`, `guest-manager.tsx`, `photo-browser.tsx`, `local-uploader.tsx`, `cluster-review.tsx`, `generation-progress.tsx`, `vibe-input.tsx`

### 10.7 Editor — `src/components/editor/*` (138 files, hotspot)

**50+ panels:** `DetailsPanel`, `DesignPanel`, `BlockPresetsPanel`, `BlockLibraryDrawer`, `ColorPalettePanel`, `CustomizationPanel`, `SaveTheDatePanel`, `ChapterPanel`, `EventsPanel`, `StoryPanel`, `VendorPanel`, `GuestMessagingPanel`, `ThankYouPanel`, `TimeCapsulePanel`, `VersionHistoryPanel`, `TranslationPanel`, `ThemeSwitcher`, `BlockConfigEditor`, `BlockStyleEditor`, `ArtManager`, `SpotifyPanel`, `AnalyticsDashboardPanel`, `AccessibilityAuditPanel`, `BulkInvitePanel`, `CoordinatorSetup`, `AnniversaryNudgePanel`, `AIBlocksPanel`, `AICommandBar`, `WelcomeOverlay`, `EditorTour`, `DesignAdvisor`, `CommunityMemoryModerate`, `VisualEffectsPanel`, `VoiceTrainerPanel`, `CanvasContextMenu`, `BlockDropZone`, `FloatingToolbar`, `BlockPresetPicker`, `AlternatesCarousel`, `GalleryPicker`, `ConfirmDialog`, `GettingStartedChecklist`, `ComponentLibrary`.

**Frame:** `FullscreenEditor`, `EditorCanvas`, `CanvasEditor`, `EditorToolbar`, `EditorStatusBar`, `EditorSidebar`, `EditorRail`, `EditorBreadcrumb`, `EditorWing`, `DraftBanner`.

**Canvas overlays (`editor/preview/`):** `CanvasHeroEditBar`, `CanvasChapterToolbar`, `CanvasInlineFormatBar`, `BlockConfigPopover`, `AIRewriteButton`, `InlineColorCustomButton`, plus 8 canvas-specific overlays (photo, FAQ, event, registry, section, focal point, context menu, hover bar).

**Panel primitives (`editor/panel/`):** `PanelSection` (+ `PanelRoot`), `PanelField`, `PanelInput`, `PanelTextarea`, `PanelChip` (+ `PanelChipGroup`), `PanelSelect`, `PanelColorPicker`, `PanelDatePicker`, `PanelEmptyState`, `SaveIndicator`, `panel-tokens.ts`.

**Utilities:** `block-presets.ts`, `editor-utils.tsx`, `inline-toolbar-bus.ts`, `EditorIcons.tsx`, `useDragSort`, `useEditorHistory`, `useEditorKeyboard`.

**Refactor candidates (size):**
- `src/components/wizard/PearSpotlight.tsx` — **144KB single file**. Split into step-specific modules.
- `src/components/blocks/StoryLayouts.tsx` — **76KB**. Extract per-layout files.

### 10.8 Wizard — `src/components/wizard/*` (14 files)

`PearSpotlight` (main), `PhotoFirstWizard`, `LivingCanvas`, `WizardCards`, `WizardCardsB`, `PearCalendar`, `LocationAutocomplete`, `PhotoDropZone`, `WizardLivePreview`, `WizardBreadcrumb`, `DashboardStep`.

Hooks: `useConfetti`, `useGenerationTicker`, `useSpeechRecognition`, `useTypewriter`.

### 10.9 Site rendering — `src/components/site/*` (31 files) + root-level

Guest-facing components. Highlights: `WeddingDayTimeline`, `WeddingDayPhotoFeed`, `WeddingCoordinator`, `GuestbookSection`, `GuestPhotoWall`, `CoupleQuiz`, `LanguageSwitcher`, `SpotifySection`, `RelationshipGraph`, `LiveUpdatesFeed`, `AnniversaryRecap`, `CommunityMemorySection`, `CountdownBlock`, `RegistrySection`, `LeafletMap`, `VideoChapterPlayer`, `WeddingPartySection`, `SeatFinder`, `PageTransition`, `ThemedLoader`, `StickyRsvpPill`, `ShareBar`, `AmbientSpotifyPlayer`.

Root-level: `landing-page.tsx`, `hero.tsx`, `timeline.tsx`, `event-logistics.tsx`, `photo-gallery.tsx`, `registry-showcase.tsx`, `travel-guide.tsx`, `faq-section.tsx`, `countdown-widget.tsx`, `public-rsvp-section.tsx`, `rsvp-form.tsx`, `guest-dashboard.tsx`, `guestbook.tsx`, `mascot.tsx`, `mood-decorator.tsx`, `ask-couple-chat.tsx`, `coming-soon.tsx`, `ErrorBoundary.tsx`, `VisitTracker.tsx`, `AnalyticsBeacon.tsx`.

### 10.10 Specialized

- `invite/` (4): `InviteReveal`, `GuestPassport`, `InviteRsvpForm`, `InvitePage`
- `asset-library/` (4): `AssetPicker`, `SvgDividers`, `SvgAccents`, `SvgIllustrations`
- `co-host/` (1): `CoHostAccept`
- `icons/` (4): `EditorIcons`, `PearloomIcons`, `PearMascot`, `PearShapes`
- `seating/` (4): `SeatingCanvas`, `SeatingPanel`, `TableObject`, `GuestChip`
- `venue/` (2): `VenueProfile`, `VenueSearch`
- `registry/` (2): `RegistryManager`, `RegistryCard`
- `live/` (2): `LivePhotoWall`, `LiveQROverlay`
- `vibe/` (2): `CelebrationOverlay`, `WaveDivider`
- `shared/` (3): `PublishModal`, `OfflineIndicator`, `ConfettiBurst`
- `blocks/` (1): `StoryLayouts.tsx` (76KB)

---

## 11 · URL system

Canonical URLs are **path-based, occasion-prefixed** — `pearloom.com/{occasion}/{slug}`. Subdomains were rejected deliberately (one cookie jar, one analytics property, cleaner previews, no wildcard DNS).

### 11.1 Supported occasions

`'wedding'` · `'anniversary'` · `'engagement'` · `'birthday'` · `'story'`.

Source: `src/lib/site-urls.ts:26–31`.

### 11.2 API

| Function | Signature | Output example |
|---|---|---|
| `buildSiteUrl` | `(slug, path?, origin?, occasion?)` | `https://pearloom.com/wedding/scott/rsvp` |
| `buildSitePath` | `(slug, path?, occasion?)` | `/wedding/scott/rsvp` |
| `formatSiteDisplayUrl` | `(slug, path?, occasion?)` | `pearloom.com/wedding/scott` (no scheme, for UI copy) |
| `normalizeOccasion` | `(unknown) => SiteOccasion` | Defaults to `'wedding'` |
| `getAppOrigin` | `() => string` | `window.location.origin` (client) or `NEXT_PUBLIC_SITE_URL` env (server) |

### 11.3 Fallback form

`/sites/{slug}` remains supported for legacy shared links. Internal rewrite in `src/proxy.ts`.

### 11.4 Rule

**Never construct URLs with string concatenation.** If you catch `"${slug}.pearloom.com"` in a diff, reject it — route through `buildSiteUrl` / `formatSiteDisplayUrl`.

---

## 12 · Editor state architecture

Source: `src/lib/editor-state.ts`.

### 12.1 Shape

- **`SaveState`** — `'saved' | 'unsaved'` (binary). Publishing + errors tracked separately.
- **`EditorState`** — ~40 top-level keys, grouped:
  - Content: `chapters`, `activeId`
  - UI: `activeTab`, `device`, `sidebarWidth`, `sidebarCollapsed`, `splitView`, `mobileSheetOpen`, `cmdPaletteOpen`, `showWelcome`, `showHint`
  - Status: `saveState`, `isDirty`, `iframeReady`, `previewSlow`, `canUndo`, `canRedo`
  - Rewrite: `rewritingId`, `rewriteError`, `streamingText`, `streamingChapterId`
  - Publish: `showPublish`, `subdomain`, `isPublishing`, `publishError`, `publishedUrl`
  - Drag: `canvasDragId`, `canvasDragLabel`
  - Draft: `draftBanner`
  - Overrides: `sectionOverridesMap`
  - Preview: `previewZoom`, `previewPage`
  - Mobile: `isMobile`, `mobileVisualEdit`, `mobileActionChapterId`
  - Alternates: `chapterAlternates`, `alternatesLoadingId`
  - Selection: `selectedBlockIds`
  - Focus: `contextSection`, `fieldFocus`
  - History: `undoHistory`, `undoIndex`, `undoTruncated`
  - Canvas: `canvasWidth`

### 12.2 Actions (49 `type` literals)

`SET_CHAPTERS`, `SET_ACTIVE_ID`, `SET_ACTIVE_TAB`, `SET_DEVICE`, `SET_SIDEBAR_WIDTH`, `SET_SIDEBAR_COLLAPSED`, `TOGGLE_SIDEBAR_COLLAPSED`, `SET_SPLIT_VIEW`, `TOGGLE_SPLIT_VIEW`, `SET_MOBILE_SHEET`, `SET_CMD_PALETTE`, `TOGGLE_CMD_PALETTE`, `SET_WELCOME`, `SET_HINT`, `SET_SAVE_STATE`, `SET_DIRTY`, `SET_IFRAME_READY`, `SET_PREVIEW_SLOW`, `SET_CAN_UNDO`, `SET_CAN_REDO`, `SET_REWRITING`, `SET_REWRITE_ERROR`, `SET_STREAMING_TEXT`, `SET_SHOW_PUBLISH`, `SET_SUBDOMAIN`, `SET_PUBLISHING`, `SET_PUBLISH_ERROR`, `SET_PUBLISHED_URL`, `SET_CANVAS_DRAG`, `SET_DRAFT_BANNER`, `SET_SECTION_OVERRIDES`, `SET_MOBILE`, `SET_MOBILE_VISUAL_EDIT`, `SET_MOBILE_ACTION_SHEET`, `SET_PREVIEW_ZOOM`, `SET_PREVIEW_PAGE`, `MARK_PUBLISHED`, `OPEN_PUBLISH`, `SET_CHAPTER_ALTERNATES`, `SET_ALTERNATES_LOADING`, `SET_SELECTED_BLOCKS`, `TOGGLE_BLOCK_SELECTION`, `SET_CONTEXT_SECTION`, `SET_FIELD_FOCUS`, `CLEAR_FIELD_FOCUS`, `PUSH_UNDO_ENTRY`, `SET_UNDO_INDEX`, `CLEAR_UNDO_HISTORY`, `CLEAR_REWRITE_ERROR`, `CLEAR_PUBLISH_ERROR`, `SET_CANVAS_WIDTH`.

### 12.3 Undo coalescing

`PUSH_UNDO_ENTRY` accepts an optional `coalesceKey`. Rapid repeats of the same target (slider drags, colour-picker hue changes) collapse into one undo entry within `DESIGN_COALESCE_MS` = **400ms**.

### 12.4 `stripArtForStorage(manifest)`

Strips base64 DataURLs from `vibeSkin` (heroArtDataUrl, ambientArtDataUrl, artStripDataUrl) before sessionStorage / API serialization. Preserves permanent CDN/R2 URLs. Fallback: if quota exceeded, strips chapter image base64 too.

### 12.5 Save safety

- `EditorClient` (`src/app/editor/[siteSlug]/EditorClient.tsx`) debounces to 2s after last change.
- `beforeunload` handler issues `navigator.sendBeacon('/api/sites', …)` AND sets `e.returnValue = ''` so the browser shows its native "you have unsaved changes" dialog when a save is in-flight.
- Local draft backup written to `localStorage` key `pearloom:draft:${siteSlug}` on every change. Cleared on successful network save.

### 12.6 Save indicator

`EditorStatusBar.tsx` shows:
- `Saved` (neutral grey dot)
- `Saving…` (pulsing gold dot via `pl-dot-pulse`)

Keep semantics binary. If you add `error` or `idle` states, update the `SaveState` type first.

### 12.7 Editor loading screen

`DashboardClient.tsx` wraps `FullscreenEditor` dynamic import with a pearl-accent loading screen so the first click on a site tile never produces a silent gap.

---

## 13 · API conventions

All routes under `src/app/api/**/route.ts`. Next 16 App Router — each handler exports `GET`, `POST`, etc.

### 13.1 Shared helpers

| Import | File | Purpose |
|---|---|---|
| `getServerSession(authOptions)` | `next-auth` + `@/lib/auth` | Standard auth check |
| `checkRateLimit(key, { max, windowMs })` | `@/lib/rate-limit` | Sliding-window in-memory rate limit |
| `getClientIp(req)` | `@/lib/rate-limit` | Extracts X-Forwarded-For / X-Real-IP |
| `uploadToR2(key, body, contentType)` | `@/lib/r2` | Cloudflare R2 put (S3-compat) |

### 13.2 Status-code conventions

- `200` success
- `400` validation error
- `401` unauthenticated
- `403` forbidden
- `429` rate limit — returns `{ error }` with human-readable message
- `500` server error — log + return generic message; never leak stacks
- `502` upstream model failure (Gemini/Claude down)

### 13.3 Representative routes

| Route | Auth | Rate limit | Notes |
|---|---|---|---|
| `POST /api/newsletter/subscribe` | None | 5 / 10min per IP | Degrades gracefully if Supabase not configured. Dedupes by `lower(email)`. |
| `POST /api/photos/upload` | Session | — | Base64 payload, max 25 photos, max 12MB each. |
| `POST /api/photos/stylize` | Session | 12 / 5min per user+IP | Calls `geminiGenerateImage` (Nano Banana), uploads result to R2. |
| `GET /api/sites` | Session | — | Graceful empty list if DB unreachable. |
| `POST /api/sites` | Session | — | Called by editor autosave + sendBeacon on unload. |
| `POST /api/invite` | Session | 10 / hour per user | Mints co-host / viewer access token. |
| `POST /api/rsvp` | Public (site guest) | Per-IP | Surfaces Postgres error codes for duplicate-email UX. |
| `POST /api/preview` | Session | — | Mints a 24h-expiry preview token + URL. |

### 13.4 Patterns

1. **Parse body in a try/catch** — invalid JSON → 400.
2. **Validate early** — cheap field checks before any DB / model call.
3. **Rate limit before external calls** — saves on cost exhaustion.
4. **Return `{ ok: boolean, ... }` for public endpoints** — easy to branch on in UI.
5. **Don't leak membership** — newsletter duplicate signup returns 200, not "already subscribed" error.
6. **Log with route prefix** — `console.error('[newsletter] insert failed:', err)` — makes production logs grep-able.

---

## 14 · Supabase schema

Migrations live in `supabase/migrations/YYYYMMDD_name.sql`. Apply via `npm run db:migrate` (`scripts/db-migrate.ts`).

### 14.1 Migration history (as of 2026-04-21)

- `20260328_wedding_os.sql` — core schema (venues, venue_spaces, seating_tables, seats, seating_constraints, …)
- `20260416_event_os.sql` — event OS extensions
- `20260417_legacy_bootstrap.sql` — backfill
- `20260418_cohost.sql` — co-host roles + tokens
- `20260419_recap_sent.sql` — recap sent-state tracking
- `20260420_section_comments.sql` — per-block collaborator comments
- `20260421_newsletter_subscribers.sql` — marketing footer signups (unique lower(email), deny-anon RLS)

### 14.2 Key tables

| Table | Purpose | RLS pattern |
|---|---|---|
| `sites` | Published sites | owner-only via `user_id = auth.uid()` |
| `guests` | RSVP records | site-owner-only |
| `venues` / `venue_spaces` / `seating_tables` / `seats` | Seating stack | owner-only |
| `seating_constraints` | must_sit_together / avoid_table rules | owner-only |
| `section_comments` | Co-host collab | belt-and-braces restrictive deny-anon + service-role API |
| `newsletter_subscribers` | Footer signups | **restrictive deny-anon** + service-role insert |

### 14.3 RLS pattern

Two layers. The API route uses a service-role Supabase client (so it can insert), and the table has a restrictive `deny-anon` policy so bare anon keys (leaked or misused) cannot read or write. This is belt-and-braces: even if the API route is misconfigured, the table is safe.

```sql
alter table public.<table> enable row level security;

drop policy if exists "<table>_deny_anon" on public.<table>;
create policy "<table>_deny_anon"
  on public.<table>
  as restrictive
  for all
  to anon
  using (false);
```

---

## 15 · AI model routing

### 15.1 Gemini — `src/lib/memory-engine/gemini-client.ts`

| Constant | Endpoint | Use cases |
|---|---|---|
| `GEMINI_PRO` | `gemini-3.1-pro-preview` | Creative passes (story chapters, SVG art, poetry) |
| `GEMINI_FLASH` | `gemini-3.1-flash-lite-preview` | Analytical passes (critique, scoring, judgment) |
| `GEMINI_LITE` | `gemini-3.1-flash-lite-preview` | Lightweight extraction (couple DNA, metadata) |
| `GEMINI_IMAGE` | `gemini-3.1-flash-image-preview` | Image editing / photo-to-style ("Nano Banana") |

`geminiRetryFetch(url, init, maxAttempts=3)` — retries on `503` (UNAVAILABLE) or `429`, honours `Retry-After` header, exponential backoff `2s → 4s → 8s`.

`geminiGenerateImage({ apiKey, prompt, inputImage? })` — photo-to-style helper. Used by `/api/photos/stylize`.

### 15.2 Claude — `src/lib/claude/client.ts`

| Tier | Model ID | Use |
|---|---|---|
| `opus` | `claude-opus-4-7` | Top-quality creative, agent loops |
| `sonnet` | `claude-sonnet-4-6` | Structured planning + critique |
| `haiku` | `claude-haiku-4-5-20251001` | Fast micro-edits (captions, thank-yous, chat) |

`withRetry(fn)` — 3 attempts, exponential backoff on `429 / 503 / 529 / ≥500`. Anthropic SDK auto-retries 2× on top.

`cached(text, ttl?)` — returns a `TextBlockParam` with `cache_control: { type: 'ephemeral', ttl }` for prompt caching. `ttl` defaults to `'5m'` or `'1h'`.

### 15.3 Picking a model

- Anything user-perceived creative (story, art, tone): **Gemini Pro** or **Claude Opus**.
- Scoring / judging / extraction / analysis: **Gemini Flash-Lite** or **Claude Haiku**.
- Image editing / style transfer: **Gemini Image** (no Claude equivalent).
- If the prompt is >10k tokens and repeated, wrap the system prompt in `cached()`.

---

## 16 · File, naming, and prefix conventions

### 16.1 File naming

| Pattern | Applies to | Examples |
|---|---|---|
| kebab-case `.ts` / `.tsx` | Utilities, libs, root-level site components | `site-urls.ts`, `editor-state.ts`, `add-to-calendar.tsx`, `coming-soon.tsx` |
| PascalCase `.tsx` | React components | `FullscreenEditor.tsx`, `ErrorBoundary.tsx`, `AuthModal.tsx`, `SiteRenderer.tsx` |
| `route.ts` | Next App Router API handler | 48+ in `src/app/api/**/route.ts` |
| `page.tsx` / `layout.tsx` | Next 16 App Router | Standard |
| `*Client.tsx` | Explicit `'use client'` shells | `DashboardClient.tsx`, `EditorClient.tsx`, `LoginClient.tsx`, `EventPageClient.tsx`, `AnalyticsClient.tsx`, `DirectorClient.tsx` |
| `*.test.ts` / `*.test.tsx` | Vitest tests | Co-located in `src/lib/**` (10 files) |

**Next.js 16 caveat (AGENTS.md):** this is *not* the Next.js you know. App Router, Turbopack, React 19. When in doubt, read `node_modules/next/dist/docs/`.

### 16.2 CSS class prefix

All custom utility classes use **`pl-`**. `--eg-*` legacy aliases are deprecated; do not add new references.

### 16.3 Data attribute prefixes

| Prefix | Scope | Examples |
|---|---|---|
| `data-pl-*` | Published site roots, structural markers | `data-pl-site-root` (theme anchor), `data-pl-editor` |
| `data-pe-*` | Preview / editor editable markers | `data-pe-section="hero"`, `data-pe-label="Hero"`, `data-pe-editable="true"`, `data-pe-field="content"` |

### 16.4 Custom events

All use the **`pearloom:*`** namespace, dispatched via `window.dispatchEvent(new CustomEvent('pearloom:xxx', { detail }))`.

Known events:
- `pearloom:inline-toolbar-activated` — `src/components/editor/inline-toolbar-bus.ts`. Carries `detail: 'rewrite' | 'style' | 'section' | 'multi-select' | 'art'` to enforce mutual exclusion of five canvas-overlay toolbars.
- `pearloom:send-save-the-date` — dispatched from `SaveTheDatePanel` → consumed by Guests panel to open bulk-send modal with `{ variant, message }`.

### 16.5 Import alias

`@/*` resolves to `src/*` (configured in `tsconfig.json`). Always use it. Never use relative-up traversals (`../../`).

---

## 17 · Known drift (design debt)

Catalogued as of 2026-04-20. Fix top-down when you're in the neighbourhood.

### 17.1 Hardcoded hex colours — **347 instances / 45+ files**

Hotspots:
- `src/components/timeline.tsx` — 72 inline hex values (`#111`, `#ffffff`, `#A3B18A`, etc.)
- `src/components/rsvp-insights.tsx:225` — meal palette uses legacy colours: `['#A3B18A', '#C4A265', '#8B6F8E', '#6B9BD2', '#D4836D', '#7DB8A5', '#B5A0D1']`
- `src/components/blocks/StoryLayouts.tsx:2330–2520` — 40+ hex
- `src/components/dashboard/vibe-input.tsx` — mixed preset palettes

**Critical:** `#A3B18A` is used in **114** light-mode contexts — this is the *dark-theme* value of `--pl-olive`. Smells like pre-v6 palette bleed; audit and replace with `var(--pl-olive)`.

**Ink drift:** `--pl-ink` canonical is `#0E0D0B`. Code uses `#18181B`, `#1A1A1A`, `#2B2B2B` inconsistently.
**Gold drift:** `--pl-gold` canonical is `#B8935A`. Code uses `#C4A96A`, `#B8860B`, `#DAA520`.
**Divider drift:** `--pl-divider` canonical is `#D8CFB8`. Code uses `#E4E4E7`, `#E6DFD2`.

### 17.2 Raw transitions / motion — **664 instances**

85% bypass the `--pl-dur-*` + `--pl-ease-*` system. Worst offenders:
- 141× `'0.2s ease'` → should be `var(--pl-dur-fast) var(--pl-ease-out)` (180ms)
- 87× `'0.25s ease'` → no matching token
- 56× `'0.3s ease'` → no 300ms token
- 43× `'0.15s ease'` → below system minimum

Fix: migrate to the 5 canonical durations (`instant 100`, `fast 180`, `base 280`, `slow 480`, `glacial 800`).

### 17.3 Raw border radius — **127 instances**

Raw `'100px'`, `'16px'`, `'12px'`, `'6px'`, `'4px'`, `'2px'`, `'1px'`, `'20px'`, `'10px'`, `'3px'` in use. System defines 7. Map to `var(--pl-radius-*)`.

### 17.4 Raw z-index — **352 instances**

Preview/editor chrome (9000+) is intentional. Consumer-facing drift:
- `src/components/rsvp-form.tsx:109` — `zIndex: 9999`
- `src/components/site-nav.tsx:646,655` — `zIndex: 9999`
- `src/components/photo-gallery.tsx:309` — `zIndex: 100` (should reference `--z-sticky`)
- `src/components/timeline.tsx:664` — `zIndex: 10` (below system minimum)

### 17.5 Raw font sizes — **42 outliers**

E.g., `0.72rem`, `0.88rem`, `0.65rem` — between scale steps or below the `0.66rem` (`--pl-text-2xs`) floor. Map to the nearest `--pl-text-*` token.

### 17.6 Tailwind arbitrary values — 21 instances

- `src/components/ui/button.tsx:29–81` — 12 classes with `bg-[#18181B]`, `hover:bg-[#27272A]`, `border-[#E4E4E7]`. Should reference Tailwind tokens that already map to `var(--pl-ink)` etc.
- `src/components/editor/preview/ChapterHoverBar.tsx:117` — `bg-[#F4F4F5] text-[#18181B]`
- `src/components/dashboard/generation-progress.tsx:214–216` — macOS traffic-light colours (intentional, leave alone)
- `src/components/shared/PublishModal.tsx:219` — WhatsApp brand green (intentional, leave alone)

### 17.7 Dark-mode gaps

- `src/components/blocks/StoryLayouts.tsx:2330` — `{ light = '#F5F1E8', dark = '#1A1A1A' }` defaults outside system
- `src/components/timeline.tsx:502` — hardcoded dark gradient
- `src/components/coming-soon.tsx:593` — `linear-gradient(135deg, #10b981, #34d399)` (unthemeable green)
- `src/components/venue/VenueSearch.tsx:208` — inconsistent dark fallback

### 17.8 Button.tsx `primary` === `accent`

Two variants are currently identical (`bg-[#18181B] text-white …`). Probably a merge mistake. Collapse to one, or differentiate (e.g., `primary` → pearl, `accent` → ink).

### 17.9 EditorialHero regression from BRAND primitives

BRAND.md §8 lists `<GooeyText />` as canonical for rotating word UIs. Current `EditorialHero.tsx` rolled its own `AnimatePresence` + `motion.em`. Restore `<GooeyText />` when touching the hero next.

### 17.10 Newsletter visual

Wired end-to-end as of this session; server validates + dedupes + deny-anon RLS. Visual still austere — consider a subtle success animation next time.

### 17.11 File-size hotspots

- `src/components/wizard/PearSpotlight.tsx` — **144KB** monolith. Step-per-file refactor.
- `src/components/blocks/StoryLayouts.tsx` — **76KB**. Layout-per-file extraction.

---

## 18 · Cleanup priorities (ranked)

| # | Task | Effort | Payoff |
|---|---|---|---|
| 1 | Replace 114× `#A3B18A` with `var(--pl-olive)` across `rsvp-insights.tsx`, `vibe-input.tsx`, `DesignPanel.tsx` | S | Fixes dark-mode contrast bugs |
| 2 | Collapse `Button` `primary` / `accent` duplicate variant, migrate hardcoded `#18181B` to token references | S | Unblocks further Button composition with `.pl-pearl-accent` |
| 3 | Codemod raw transitions `'0.2s ease'` → `var(--pl-dur-fast) var(--pl-ease-out)` | M | 141 instances, mostly one-liners |
| 4 | Restore `<GooeyText />` on `EditorialHero` rotating noun | S | Brand consistency |
| 5 | Extract `PearSpotlight.tsx` step modules into `src/components/wizard/spotlight/<step>.tsx` | L | Unlocks parallel editing + review |
| 6 | Migrate Tailwind arbitrary `bg-[#...]` in `button.tsx` to token utilities | S | Keeps variant system coherent |
| 7 | Sweep raw `borderRadius: 'N px'` to `var(--pl-radius-*)` | M | Visual cohesion |
| 8 | Migrate consumer-facing `zIndex` to `var(--z-*)` | S | Predictable layering |
| 9 | Wire `StoryLayouts.tsx` light/dark defaults to `--pl-ink` / `--pl-cream` instead of hardcoded | S | Dark-mode fidelity |
| 10 | Audit and delete unused keyframes (73+ exist, some are legacy) | M | Bundle size + mental load |

---

## 19 · Changelog

### 2026-04-20 — Pearshell v7.2 + retention polish + comprehensive audit

- **Pearshell v7.2** introduced. New tokens (`--pl-pearl-{a,b,c}`, `--pl-pearl-ink`, `--pl-rind`, `--pl-bruise`), registered `@property --pl-pearl-phase`, utility classes `.pl-pearl-accent` / `.pl-pearl-border` / `.pl-block-selected`. Scroll-timeline coupling via `@supports (animation-timeline: scroll())`.
- **Pearshell wired into 11 primary CTAs** across marketing nav (desktop + mobile), hero, footer, pricing highlighted tier, Save-the-Date send + photo-style, login Google, editor Publish, wizard Next + Layout, showroom card CTAs, testimonial medallions, selected canvas blocks.
- **Marketing hero upgrade** — `HeroAtmosphere.tsx` (shader mesh + loom threads + cursor halo + feather), `WovenDivider.tsx` between hero and showroom.
- **Save-the-Date stylize** — `/api/photos/stylize` route + Gemini image helper; 4 preset styles (paper-craft / watercolor / embroidery / botanical).
- **URL sweep** — subdomain-format strings replaced with `buildSiteUrl` / `formatSiteDisplayUrl` across dashboard (EventHQ, EventPageClient, HelpClient FAQ, SaveTheDate footer).
- **Retention fixes** — EditorStatusBar `Saving…` pulsing dot, `beforeunload` native confirm on unsaved changes, `EditorLoadingScreen` with pearl avatar between dashboard click and editor mount.
- **Newsletter wired end-to-end** — migration `20260421_newsletter_subscribers.sql` (unique lower(email) + deny-anon RLS), `POST /api/newsletter/subscribe` (rate-limited, graceful degrade), MarketingFooter form controlled state.
- **Dead code removal** — `MarketingHero.tsx`, `EventOSShowcase.tsx` deleted (duplicate `#event-os` anchor resolved).
- **`.pl-pearl-accent` `!important`** added on bg/color/border so Tailwind utility composition doesn't silently shadow the class.
- **Initial comprehensive design-system audit** that produced this file.

---

## 20 · When in doubt — cheatsheet

### Add a primary CTA
```tsx
<button
  onClick={...}
  className="pl-pearl-accent"
  style={{ padding: '11px 18px', borderRadius: 'var(--pl-radius-full)',
           fontWeight: 600, cursor: 'pointer' }}
>
  Start weaving — free
</button>
```

### Add a colour token
1. Add light + dark values to both `[data-theme='light']` and `[data-theme='dark']` blocks in `src/app/globals.css`.
2. Mirror the light value in `src/lib/design-tokens.ts` if other components will import it.
3. If it's a brand colour, add the Tailwind mapping in `tailwind.config.ts` so `bg-foo` / `text-foo` work.

### Add a page (Next 16 App Router)
```
src/app/<route>/
  page.tsx      (server component by default)
  layout.tsx    (optional)
  <Name>Client.tsx  (if 'use client' needed)
```

### Add an API route
```
src/app/api/<route>/route.ts
```
Inside: `getServerSession` → `checkRateLimit` → JSON parse (try/catch → 400) → validate → do work → return `NextResponse.json({ ok: true, ... })`.

### Add a Supabase table
1. `supabase/migrations/YYYYMMDD_name.sql` with `create table`, indexes, RLS enable, restrictive `deny-anon` policy.
2. Service-role client in the API route for writes.
3. `npm run db:migrate`.

### Add a motion
1. Use existing keyframe if possible (`pl-weave-travel`, `pl-rise`, `pl-dot-pulse`).
2. New keyframe → define in `src/app/globals.css` under the motion block, not inline.
3. `prefers-reduced-motion` block to turn it off.
4. Never write `transition: '0.2s ease'`. Use `var(--pl-dur-fast) var(--pl-ease-out)`.

### Add a brand-fit loader
`<WeaveLoader />` — never `<Loader2 className="animate-spin" />`, never a raw spinner.

### Add an empty state
`<EmptyState />`. Copy verb-first lowercase-first. "Nothing yet. Begin a thread."

### Tracking the microcopy rules (from BRAND.md §7)
- "Loading…" → "Threading…"
- "Generated" → "drafted"
- "AI-powered" → never
- "No data" → "Nothing yet. Begin a thread."

---

*End of CLAUDE-DESIGN.md. If you're reading this mid-session and something looks wrong, re-audit. The code is the final authority.*
