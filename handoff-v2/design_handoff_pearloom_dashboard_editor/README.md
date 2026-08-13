# Handoff: Pearloom Host Dashboard, App & Mobile Site Editor

## Overview
Two sessions of design work on **Pearloom** — a craft-house product for AI-drafted, hand-edited event websites (weddings, birthdays, anniversaries, memorials, etc.). This package covers three connected surfaces:

1. **The host dashboard** (desktop web) — the cockpit a host uses to run their event: Home, My sites, Guests, Studio, The Reel, Registry, Analytics, plus a ⌘K command palette, plan/billing modal, and a guest's-eye-view drawer.
2. **The Pearloom app** (mobile) — a static showcase of the consumer phone app: guest invitation/RSVP, the day, the host pocket dashboard, and the site editor in a browser frame.
3. **The mobile site editor** (interactive prototype) — the desktop editor reimagined for a phone: full-bleed canvas, tap-to-select sections, inline section-layout switching, and a "Dress the page." decor panel driven by the **real published-site theme contract**.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — prototypes showing intended look and behavior, **not production code to copy directly**. They load a compiled design-system bundle (`_ds_bundle.js`) and global token CSS (`styles.css`) from the Pearloom design-system project.

The task is to **recreate these designs in the target codebase's existing environment** (the real Pearloom product is Next.js + React) using its established components and patterns. Treat the HTML as the source of truth for layout, content, tokens, and interaction — not as shippable code. Where these mocks reference real product modules (`themes.ts`, `DashShell`, `EditorRedesign`, the `--pl-*` / `--t-*` token layers), prefer the actual product source.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, and interactions. Recreate pixel-faithfully using the codebase's existing component library and the canonical token layers. The mobile editor and command palette are functionally interactive (state, reorder, theming) — the others are visual mocks with light interactivity (tweaks, tab switching, sheet open/close).

---

## Surface 1 — Host Dashboard (`ui_kits/dashboard/index.html`)

A persistent shell + routed body. Built on the **product-chrome token layer** (`--cream / --card / --ink / --line`, plus the named accents **sage** = saved/positive, **peach** = active/working, **lavender** = editorial italic, **gold** = shared punctuation).

### Shell (`DashShell.jsx`)
- **Sidebar** (264px, `var(--cream)`, right border `--line-soft`, sticky `100dvh`): `PearloomLogo`; an interactive **celebration switcher** (crest tile + name + date, popover to switch sites); grouped nav with an **ink active pill** (no transition — see Gotchas) and **per-tab hover SVG animations**; a compact plan strip ("The full bolt · plan" + View); a user-menu popover.
- **Nav groups & routes**: (top) Home · YOUR LOOM: My sites · THIS EVENT: Guests (badge 5), Studio, The Reel (badge 3), Registry · THE HOUSE: Analytics.
- **Utility bar** (sticky, glass): Pear command-search pill (⌘K), notification bell with popover, avatar.
- **PageHead** (`DashTopbar` analog): mono eyebrow (peach), letterpress display `<h1>` (upright + one lavender italic word) knotted with a gold pearl SVG, subtitle, right-aligned actions.

### Routes (`Screens*.jsx`)
- **Home** (`ScreensHome.jsx`) — the cockpit. Dark hero countdown ("84 days", co-host avatars + presence), 4 count-up stat tiles (Coming / Budget-used with expandable category breakdown / Gifts / Days), a **phase-aware "Needs you now"** decision list (Planning → Final stretch → The day), a this-week checklist, a "The day" run-of-show + emergency-broadcast card, a Pear budget nudge, recent activity, and a "weave continues" memory-thread timeline.
- **My sites** (`ScreensSite.jsx`) — site cards (cover, live/draft pill, RSVPs/visits, co-host avatars + invite, custom-domain status, next-action nudge, ⋯ menu), a new-site **occasion picker**, and an Archived section.
- **Guests** (`ScreensGuests.jsx`) — tabbed **Roster · Messages · Seating**. Roster: filter chips, search, party/kids/meal/dietary/allergy chips, table links, headcount + "for the caterer" dietary rollup, RSVP-deadline cadence timeline, reply-form rules (+1/kids toggles), per-guest "view as" → guest drawer, "Resend link"; empty state. Messages: broadcast w/ templates + audience targeting + reach ("seen by 41 of 64") + channel chips, scheduled indicator, DM accordions. Seating: round-table tokens (filled seats, head table, allergy legend), Pear auto-seat, unseated chips.
- **Studio** (`ScreensStudio.jsx`) — invitation studio: live preview across **channels** (site card / email / text), occasion chips, Pear draft + **voice sliders** (warm↔formal rewrites copy live), palette picker, matching-suite (menu/table/thank-you/program; "Printed & mailed · atelier" lock), send.
- **The Reel** (`ScreensStudio.jsx` → `Gallery`) — contribution-loop strip (Guests add → Your nod → Live on the wall), inline **submission approval queue** (approve/hide), guest-upload QR + moderation card, album filters, masonry wall with cover marker.
- **Registry** (`ScreensExtra.jsx`) — paste-any-store import row, gift/cash-fund cards (group gifting "3 chipping in"), and a **thank-you composer** (Sent / Drafted / Not yet; expands to a Pear-written note).
- **Analytics** (`ScreensExtra.jsx`) — KPIs, **RSVP funnel** (sent→opened→started→replied with drop-off), "still quiet → see in Guests" jump, traffic-source bars, section engagement, Pear reading.

### Cross-cutting (`Enhance.jsx`, `Premium.jsx`, `GuestLink.jsx`, `Icons.jsx`)
- **⌘K command palette** (`Enhance.jsx` → `CommandPalette`) — search, ↑↓/↵, jump-to + actions; glass overlay.
- **CountUp** (`Enhance.jsx`) — eases display numbers from 0 on mount; honors reduced-motion.
- **Plan & billing modal** (`Premium.jsx` → `PlanModal`) — three letterpress tiers (*A single thread* free · *The full bolt* current, gold-ringed · *The atelier*) + live usage meters. Opened via `window.dispatchEvent(new CustomEvent('pl-open-plan'))` from the sidebar "View" and user-menu "Plan & billing".
- **LockChip** (`Premium.jsx`) — gold "On the full bolt / atelier" chip, opens the plan modal. Seeded on My sites (domain), Studio (printed suite), The Reel (printed book).
- **Guest's-eye view drawer** (`GuestLink.jsx` → `GuestView`) — right slide-in rendering the live published site personalized to one guest (greeting, RSVP state, party/meal/table, the day, links). Opened via `window.openGuestView(guest)`.
- **Icons** (`Icons.jsx`) — in-house line set (24×24, 1.75 round-cap), `<Icon name … />` reading a path map; `data-icon` stamped for the nav hover animations.
- **Tweaks** (tweaks-panel.jsx + inline app): editorial-midnight dark, paper texture, working-accent (peach/sage/lavender/gold), density (compact/comfortable/spacious), and occasion (wedding/birthday/memorial → auto-accent + drops the pearl for memorial).

## Surface 2 — Pearloom App (`ui_kits/dashboard/Pearloom App.html`)
Four labeled frames on a warm canvas, real iPhone shells (notch, status bar, home indicator): **Guest · invitation** (cover, monogram, RSVP), **Guest · the day** (seat card Table/Meal/Party + run-of-show + links), **Host · pocket dashboard** (countdown, stat tiles, needs-you-now, bottom tab bar), **Host · the site editor** (browser-window four-zone shell: mode pills, save dot, Publish, section rail, canvas with selected block, theme rail). Visual mock.

## Surface 3 — Mobile Site Editor (`ui_kits/dashboard/Mobile Editor Prototype.html`)
**Interactive.** A single phone. The canvas is the **real published-site renderer**, themed live by spreading `themeRootStyle(theme, density)` so every `var(--t-*)` re-skins.

- **Top bar**: back · Edit/Preview pills · "Saved" sage dot · gradient **Publish**.
- **Canvas**: sections render the renderer's `look` contract — `card` (frame/wash/soft/flat), `photo` (arch/polaroid/tape/clean/deckle), `divider` (sprig/bloom/dot/rule/brush/deckle), `button` shape, `heroAlign`, `motifDensity`. Tap a section → outline + floating toolbar (edit · move up/down · duplicate · delete) + **inline section-layout chips** (Opening: Centered/Left/Full-bleed; Story: photo right/left/stacked; Schedule: list/split; Gallery: grid/row).
- **Dock**: Sections · Add · Decor · Pear → bottom sheets.
- **Sections sheet**: the desktop editor's nine sections (Opening, Our story, Details, Schedule, Travel, Registry, Gallery, RSVP, FAQ) with descriptions + req(⚿)/attn(•) flags, reorder/hide, plus Tools (Guests, Share, Day-of).
- **Add sheet**: the nine section kits.
- **Decor sheet** ("Dress the page.", mirrors the desktop **ThemeRail** as grouped scroll): **Palette** (4 core themes) · **Type** (Fraunces/Cormorant/Geist, overrides `--t-display`) · **Paper texture** (None/Grain/Linen, texture overlay) · **Decor** (the full `look` panel for the active kit) · **Spacing** (cozy/comfortable/spacious density) · **Theme Shop** (the other 6 premium themes + ornament kit, gold-locked).
- **Block sheet**: section-layout chips + editable title + schedule moments / Pear "draft in your voice".
- **Pear sheet**: design asks.

---

## Design Tokens
Authoritative source = the Pearloom design system (`styles.css` → `tokens/*.css`). Key layers:

**Editorial brand (`--pl-*`)** — cream `#FDFAF0`, ink `#18181B`, olive `#5C6B3F`, gold `#C19A4B` (punctuation only, never a fill), plum `#C6563D` (destructive), terra `#C6703D` (warm). Fonts: Fraunces (display, axes opsz/SOFT/WONK; italic SOFT 80 WONK 1 is the signature), Geist (body), Geist Mono (labels), Caveat (script).

**Product chrome (`--cream/--card/--ink/--line/--paper`)** + accents: **sage** `#8B9C5A`, **peach** `#F0C9A8` / ink `#C6703D`, **lavender** `#C4B5D9` / ink `#6B5A8C`. Radii 8–36px; warm ink-tinted shadows `rgba(40,28,12,…)`.

**Published-site theme contract (`--t-*`)** — see `ui_kits/renderer/themes.js`: 10 themes, each with `swatches`, `texture`, `motif`, a `look` object, and a full `vars` map (`--t-paper/section/card/ink/ink-soft/ink-muted/accent/accent-2/accent-bg/accent-ink/gold/line/line-soft/rsvp/rsvp-ink/display/body/script/radius/radius-lg/display-wght/hero-scale/eyebrow-ls/shadow`). `themeRootStyle(theme, density)` emits `--t-*` plus base-token aliases; density scale `cozy 0.74 / comfortable 1 / spacious 1.32`. **The renderer canvas binds to `--t-*` ONLY.**

Motion: `--pl-ease-out` (chrome), `--pl-ease-spring` (taps), `--pl-ease-emphasis` (signature settle). Loaders = WeaveLoader (thread, never a spinner). Always honor `prefers-reduced-motion`.

## Design System Components (from `_ds_bundle.js`, namespace `window.PearloomDesignSystem_55118c`)
`Button` (variants ink/olive/paper/terra/ghost/pearl; sizes sm/md/lg), `Badge` (tone olive/gold/plum/neutral/ink; label/pill; dot), `Card` (interactive, padding), `Field`, `Eyebrow` (gold rule), `Thread`, `WeaveLoader`, `PearloomGlyph`, `PearloomWordmark`, `PearloomLogo`, `Pearl`, `Monogram` (left/right/frame/ink/accent/paper), `Motif` (14 named ornaments + `MOTIF_NAMES`), `Divider`, `Folio`. Recreate against the real product equivalents.

## Gotchas (learned the hard way)
- **Nav active pill has NO CSS transition.** A `background-color` transition on the just-deactivated item froze mid-tween in the preview, leaving an ink-on-ink invisible label. Set active/idle colors instantly (or guard the transition). Use the `backgroundColor` longhand, React-controlled — do not mutate `style.background` from hover handlers (it desyncs React's style diff).
- **Media-query brace discipline.** A dropped `}` once let the `max-width:760px` "collapse sidebar to bottom bar" rules leak to all widths. Keep the mobile rules fully inside their query.
- **Babel multi-file scope.** Each `<script type="text/babel">` shares the global lexical scope — don't re-declare the same top-level `const` (e.g. `useTweaks`) in two scripts; alias inside a function instead.
- **JSX text ≠ string escapes.** `\u2019` in JSX *text* renders literally; use the real character or a `{string}` expression.
- The renderer canvas must spread `themeRootStyle()`; the editor chrome around it stays on `--pl-chrome-*` so it never repaints when the edited theme changes.

## Assets
Warm still-life imagery in `assets/imagery/` (`vase-linen-still.png`, `coffee-mug.png`, `pear-photo.png`). Logos: `assets/logo-pear-mark.svg`, `assets/logo-wordmark.svg`. No emoji anywhere. Use the real product's asset pipeline.

## Files in this bundle
- `index.html` + `DashShell.jsx`, `Icons.jsx`, `Enhance.jsx`, `Premium.jsx`, `GuestLink.jsx`, `ScreensHome.jsx`, `ScreensSite.jsx`, `ScreensGuests.jsx`, `ScreensStudio.jsx`, `ScreensExtra.jsx`, `tweaks-panel.jsx` — the host dashboard.
- `Pearloom App.html` — the four-frame mobile app showcase.
- `Mobile Editor Prototype.html` — the interactive mobile site editor.
- `themes.js` — the published-site theme catalogue + `themeRootStyle()` (the `--t-*` contract the editor canvas and renderer both bind to).

> These reference `../../styles.css` and `../../_ds_bundle.js` from the design-system project root. In the bundle they're flattened; rewire paths or (better) wire to the real product's token CSS + component library.
