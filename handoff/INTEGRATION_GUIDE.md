# Pearloom — Production Build & Integration Guide

**Read this first. It is the single source of truth for turning this prototype into the
production app.** The prototype is a high-fidelity, fully-interactive HTML/React (via
in-browser Babel) build of Pearloom: an **AI-native event-site platform** (weddings,
birthdays, memorials, showers, galas — 30+ event types). Your job is to port the
*concepts, data shapes, visual system, and interactions* into a real stack — **not** to
ship in-browser Babel or copy files verbatim.

> ⚠️ Inspect the target repo first and adapt to its framework, styling system, DB, auth,
> payments and LLM endpoint. Where this guide and the repo disagree, follow the repo's
> conventions but preserve the **visual system and UX** described here exactly.

---

## 0. The one rule for "visually spot-on"

Everything in Pearloom is driven by a **design-token system**. Get this in first and
every screen falls into place. Two token layers:

1. **App chrome tokens** — `shared/pearloom.css` `:root` (cream/olive/ink palette,
   Fraunces/Inter/Caveat type, radii, shadows). Used by the dashboard, editor, landing,
   marketing. **Port these as your global design tokens verbatim** (CSS vars, Tailwind
   theme, or design-token JSON — your call, same values).
2. **Generated-site theme tokens** — the `--t-*` custom properties emitted per theme pack
   by `themeRootStyle()` in `shared/themes.jsx`. These skin the couple's published site
   and every live preview. **Port the THEMES catalog + the `--t-*` contract intact.**

If you reproduce both token layers faithfully, the look is correct by construction. Do
**not** hand-pick new colors/fonts — pull from these.

### Brand palette (pearloom.css `:root`)
- Cream `#F8F1E4` / cream-2 / cream-3 (backgrounds), ink `#2E3320`-ish (text),
  olive/sage greens (primary), lavender + peach + gold accents.
- Type: **Fraunces** (display serif), **Inter** (UI/body), **Caveat** (handwritten
  script accent), **Cormorant Garamond** (generated-site serif).
- Soft, warm, editorial, "calm". Generous radii (10–18px), low-contrast hairline borders
  (`--line-soft`), soft shadows. **No harsh drop-shadows, no pure-white, no neon.**

### Mascot discipline (important — we just fixed this)
**Pear** (the mascot) must be used **sparingly** — logo, the assistant's own voice, and a
couple of brand moments only. Everywhere else use varied flair: a **gold four-point
sparkle** for AI actions, and **botanical motifs** (olive sprig, etc.) for decoration.
Do not stamp the Pear on every card/button.

---

## 1. The product model (the heart)

A couple's site look is composed from **four independent dials**, each live-editable:

| Dial | What it controls | Source |
|---|---|---|
| **Event** | section set, copy, subject (couple vs single), CTA, mood | `shared/events.jsx` |
| **Theme pack** | palette + material **texture** + type + component "looks" + motifs | `shared/themes.jsx`, `shared/store-packs.jsx` |
| **Layout** | per-section arrangement (~48 variants) | `shared/site-config.jsx` (`LAYOUTS`) + `pages/themed-site.jsx` |
| **Component kit** | coordinated component design language (9 kits) | `shared/kits.jsx` |

Plus: **tone-of-voice** copy (3 voices), **density**, **texture-intensity**,
**palette-from-photo**, **photo drop-slots**, **generate-from-story**, **Decor Library**
overrides, per-event coherent defaults, and a legibility/contrast guard.

### Data model to build first
```ts
type SiteLook = {
  eventId: string;                 // 'wedding' | 'birthday' | 'memorial' | …
  themeId: string;                 // 'santorini' | 'tuscan' | … (and store packs)
  kitId: string;                   // 'classic' | 'plate' | 'scrapbook' | 'arch' | …
  layout: 'stacked' | 'boxed' | 'split';
  variants: Record<SectionKind, string>;  // per-section layout variant id
  voice: 'classic' | 'playful' | 'poetic';
  density: 'cozy' | 'comfortable' | 'spacious';
  textureIntensity: number;        // 0–1.5
  motifsOn: boolean;
  paletteOverride?: Partial<ThemeVars>;    // extracted from a photo
  decor?: { motif?; divider?; pattern?; color?; density? };
};
```
The renderer is a **section-registry**: `event.sections.map(kind => RENDERER[kind])`.
Section kinds: `hero, story, details, schedule, travel, registry, gallery, rsvp, faq`.
Adding event #31 should be **data**, not new components.

---

## 2. File map → what each thing becomes in production

### Shared engine (port these to real modules/components)
| Prototype file | Role | Production target |
|---|---|---|
| `shared/pearloom.css` | app design tokens + base components | global tokens + base CSS/Tailwind theme |
| `shared/responsive.css` | mobile overrides (attribute-selector shim) | **rebuild natively** with real responsive components — do not ship the shim |
| `shared/themes.jsx` | THEMES catalog, `themeRootStyle()`, textures (linen/watercolor/paper/cotton/velvet/kraft/canvas/marble/gilded), PatternLayer, motifs, `--t-*` contract, in-editor theme picker | theme engine + theme registry |
| `shared/kits.jsx` | 9 component kits (classic/ticket/plate/scrapbook/index/minimal/arch/stamp/deco) + per-kit section arrangements | component-kit strategy layer |
| `shared/site-config.jsx` | `LAYOUTS` map, `generateFromStory()`, copy voices | layout registry + generation prompt builder |
| `shared/events.jsx` | events catalog, `eventDefaults()`, per-event data | events config + seed data |
| `shared/store-packs.jsx` | ~67 purchasable theme packs across 11 collections | theme-store catalog (DB-backed) |
| `shared/motifs.jsx` | `Pear`, `Icon`, motif SVGs, `PearloomLogo` | icon/illustration library |
| `shared/dash-nav.jsx` | **canonical** dashboard sidebar (`PLSidebar`) + `PLAtmosphere/PLTabs/PLHead/PLCard` | dashboard shell/layout |
| `shared/dash-shell.jsx` | older `DashLayout` used by Home Redesign (nav now realigned to canonical 7 tabs) | fold into the one dashboard shell |
| `shared/image-slot.js` | drag-drop photo placeholder web component | real uploader component |
| `shared/tweaks-panel.jsx` | in-prototype tweak controls (A/B etc.) | **prototype-only**, drop in prod |
| `shared/motion.jsx` | scroll-reveal helpers | your animation lib |

### Pages (each `.jsx` mounts in the matching `.html` host)
| Screen | Host file | Logic file |
|---|---|---|
| Marketing landing (signup hook) | `Pearloom Landing.html` | `pages/landing.jsx` |
| Dashboard home | `Pearloom Home Redesign.html` | `pages/home-redesign.jsx` |
| Sign in | `Pearloom Signin.html` | `pages/signin.jsx` |
| Onboarding wizard | `Pearloom Wizard.html` | `pages/wizard.jsx` |
| **Site editor** (4 dials + Decor + Shop + ⌘K) | `Pearloom Editor Redesign.html` | `pages/editor-redesign.jsx` (+ `themed-site`, `section-fields`, `decor-library`, `theme-shop`, `command-palette`, `publish-flow`, `user-settings`, `builder-shared`) |
| Published site / full preview | `Pearloom Live Preview.html` | `pages/live-preview.jsx` → `pages/themed-site.jsx` |
| Guests | `Pearloom Guests.html` | `pages/guests-redesign.jsx` |
| Day-of room | `Pearloom Day.html` | `pages/day-redesign.jsx` |
| Studio (stationery designer) | `Pearloom Studio Redesign.html` | `pages/studio-redesign.jsx` |
| Keepsakes / Memory | `Pearloom Memory.html` | `pages/memory-redesign.jsx` |
| Settings | `Pearloom Settings.html` | `pages/settings-redesign.jsx` |
| Theme Store (full page) | `Pearloom Theme Store.html` | `pages/store.jsx` |
| Templates gallery | `Pearloom Templates.html` | `pages/templates.jsx` |
| Stationery (print suite) | `Pearloom Stationery.html` | `pages/stationery.jsx` |

> **Naming note:** the `-redesign`/`Redesign` suffixes are prototype lineage, not product
> names. In production name routes by function: `/`, `/dashboard`, `/signin`, `/onboarding`,
> `/editor`, `/site/:slug` (published), `/guests`, `/day`, `/studio`, `/keepsakes`,
> `/settings`, `/store`, `/templates`. The mapping above is the authority for which
> prototype file feeds which route.

### Canonical navigation (every dashboard page MUST share this)
`Home · Site · Guests · Day · Studio · Memory · Settings` — defined in
`shared/dash-nav.jsx` (`PL_NAV`). All dashboard pages now use these 7 tabs; keep them
identical and only change the active item. (We removed the old divergent nav.)

---

## 3. Flagship interactions to preserve exactly

- **Generate-from-story** (landing hero + wizard + editor): free text → full `SiteLook` +
  a one-line rationale, with a "designing…" beat. Prototype uses a keyword heuristic
  (`generateFromStory`); **wire to a real LLM with structured/JSON output, keep the
  heuristic as fallback.**
- **Editor = live canvas + right rail.** Click any section → rich card-based editor
  (`section-fields.jsx`). Inline text editing on the canvas (`themed-site.jsx`). Flagship:
  **Travel** has a Google-Places-style venue/hotel search (mock) with ratings, amenities,
  price, distance, blurb, room-block codes — **wire real Places data in prod.**
- **Theme Shop bottom-sheet** (`theme-shop.jsx`): tap a pack → the live canvas re-skins
  **behind** the sheet; inline **Unlock** (spinner→owned→apply); a gentle
  "Included with Bloom / unlock once" upgrade nudge for premium packs. **Mock commerce →
  real payments + entitlements; "Apply owned pack" must register into the theme list.**
- **Decor Library drawer** (`decor-library.jsx`): live-apply motifs (+recolor/density),
  dividers, background patterns, a monogram generator, and a text/preset decor generator.
- **⌘K command palette** (`command-palette.jsx`): fuzzy jump to sections/themes/kits/events
  and open any flow. Keep as the connective tissue.
- **RSVP flow** (`rsvp-flow.jsx`): guest finds invite → per-guest meal/dietary/+1/song/note
  → confetti confirm. Persists + broadcasts; the **Guests** dashboard reads it live. **Build
  the real guest model + RSVP API behind this UX.**
- **Publish flow** (`publish-flow.jsx`): claim slug, visibility, "going live" → themed OG
  share card. **Wire real publishing + custom domains.**
- **Stationery** (`stationery.jsx` / Studio): Save-the-Date + envelope generated from the
  same theme; extend into a full matched suite (invite/menu/program/thank-you).

---

## 4. Visual integration checklist (use this to self-verify)

- [ ] Global tokens match `pearloom.css` `:root` (palette, the 4 fonts, radii, shadows).
- [ ] Generated-site renderer emits the full `--t-*` set via a `themeRootStyle()` equivalent.
- [ ] All THEMES (incl. textures + motifs + patterns) render as live previews, not images.
- [ ] 9 component kits change **arrangement**, not just color.
- [ ] ~48 layout variants selectable per section, each theme/kit/decor-aware.
- [ ] Dashboard pages share the canonical 7-tab sidebar; active state only differs.
- [ ] Pear used sparingly; sparkle for AI, botanicals for decor.
- [ ] Mobile: sidebar → top bar; editor 3 rails → stacked; grids reflow; no h-scroll.
- [ ] Entrance animations: **visible end-state is the base**, animate *from* hidden, with
      `prefers-reduced-motion` fallback (a prototype bug came from relying on
      `animation-fill-mode` to reach the visible state — don't).
- [ ] Legibility/contrast guard on ink-over-texture and palette overrides.

---

## 5. Still mocked → make real
Payments + entitlements; RSVP/guest DB + dashboard wiring; Google Places venues;
publishing + custom domains; LLM for generate + copy/voice + thank-you drafts (UX is in);
auth/account/usage-billing; true responsive + full a11y (alt text on photo slots, focus
states, semantic landmarks); "Apply owned pack" registering into the theme list;
server-side palette extraction.

## 6. Suggested build order
1. Token system + section-renderer registry + `SiteLook` model.
2. Events catalog + `eventDefaults` + copy builder.
3. Textures + PatternLayer + motifs + 9 kits + 48 layout variants.
4. Editor (4 dials + section editors + legibility) + Decor Library + ⌘K.
5. Theme Store + entitlements + purchase/upgrade sheets.
6. RSVP + guest model + dashboards (canonical nav) + Day-of.
7. Publish + domains; Studio/stationery suite.
8. LLM generate/copy; mobile + a11y native pass.

## 7. Watch-outs
- Don't ship in-browser Babel or the `responsive.css` attribute-selector shim.
- Keep `--t-*` direct in fresh code; the prototype shadows base vars for legacy markup.
- Texture/pattern layers are `pointer-events:none`; verify print + contrast.
- One renderer set serves all events — resist per-event component forks.
- `screenshots/` is reference imagery; `uploads/` is user test assets — neither ships.
