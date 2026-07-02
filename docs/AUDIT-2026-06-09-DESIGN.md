# Design / visual / motion / layout audit — 2026-06-09

Full-stack audit of every user-facing surface: live walkthrough of the
running app (desktop 1440×900 + mobile 390×844, authenticated via the
e2e credentials provider) plus four parallel code audits (marketing,
published-site renderer, editor/dashboard chrome, quantitative drift
scan vs. the 2026-06-01 baseline).

Branch: `claude/site-design-audit-jq1npa`. No code changed — this is
the findings document. Screenshots referenced below were taken from a
local dev boot with no Supabase/AI keys (all degradations graceful,
as designed).

---

## 0 · The headline

**Pearloom is now two design systems wearing one trench coat.**

1. **The bible system** (BRAND.md / CLAUDE-DESIGN.md): olive + gold,
   Fraunces letterpress, paper grain, thread motion, `--pl-*` tokens,
   reduced-motion guards. Mature, documented, enforced by an ESLint
   guard and a token catalog.
2. **The prototype system** (everything that landed since ~2026-06-01:
   `src/components/marketing/design/`, `src/components/pearloom/redesign/`,
   `WizardV8`, the 404 page, login): peach/coral + lavender pastels,
   inline `style={{}}` JSX, hardcoded `140ms`/`120ms` transitions,
   raw hex, zero `--pl-dur-*` adoption, zero reduced-motion guards
   on the landing surface.

The prototype system is *charming* — the landing hero, wizard, and
dashboard genuinely read like a craft product. But it shipped verbatim
from the prototype canvas without production hardening, and it now
contradicts the constitution in measurable ways. BRAND.md §0 rule:
"If a surface contradicts the bible, the surface is wrong" — either
fix the surfaces or amend the bible to bless the peach/lavender
direction. Right now neither has happened, and the drift compounds
with every commit.

What held up beautifully everywhere: **microcopy** (zero "Loading…",
zero "AI-powered", verb-first buttons, "Threading…" everywhere) and
**spinner discipline** (zero Loader2/animate-spin). The brand *voice*
survived the redesign; the brand *visuals* only partially did.

---

## 1 · Bugs found live in the browser (fix these first)

| # | Severity | Finding |
|---|---|---|
| 1 | **HIGH** | **Mobile nav pill is broken on every page.** At 390px, "Begin a thread" wraps to three lines and "Sign in" to two inside the sticky pill — it becomes a tall blob that overlaps content while scrolling (seen over the occasion cards). Nav links are simply `display:none` under 900px with no hamburger/drawer (`DesignNav.tsx:122–127`). |
| 2 | **HIGH** | **28 dead `href="#"` links on the landing page.** The entire footer — About, Manifesto, Careers, Press kit, Contact, Help, Host playbook, Privacy, Terms, Cookies, all four social glyphs, every Occasions column link — goes nowhere. `/privacy` and `/terms` exist as real routes and still aren't linked. For a product selling trust ("GDPR", "Pear's promise") a dead Privacy link is a conversion wound. |
| 3 | **HIGH** | **Theme-pack visual-regression harness is dead on arrival.** `src/app/_test/theme-pack/[id]` can never route: underscore-prefixed folders are *private folders* in the App Router (excluded from routing — confirmed against `node_modules/next/dist/docs`). Every one of the 58 pack snapshots 404s; `npm run test:visual` cannot pass. Rename to `(test)/theme-pack` route-group + dev gate, or drop the underscore. (Also: `packs.ts:344` comment says "Packs (67)" — there are 58; the spec's sanity check is right, the comment is stale.) |
| 4 | **MED** | **`/store` throws a hydration error** — nested `<button>` inside `<button>` (visible in console: "In HTML, button cannot be a descendant of button… Hydration failed"), forcing a full client re-render of the page. Likely the pack-card quick-look/cart affordance. Also a "script tag inside React component" warning on the same page. |
| 5 | **MED** | **`/login` fires a React "setState during render" error** (`Cannot update a component while rendering a different component`). Works, but it's a real defect and a perf smell. |
| 6 | **MED** | **Sticky nav collides with content.** Mid-scroll, the "See every occasion →" CTA sits half-hidden behind the nav pill; the final "Begin a thread / Read a real site" CTAs do the same at the footer boundary. Anchor jumps (`#pricing` etc.) need `scroll-margin-top`; sections need breathing room under the fixed pill. |
| 7 | **LOW** | `/wizard` (bare) 404s — the flow only exists at `/wizard/new`. Anyone typing or linking the obvious URL gets the 404 page. Add a redirect. |
| 8 | **LOW** | Wizard copy hardcodes "31 event types" / "Search 31 events…" (`WizardV8.tsx:758`) — will silently go stale; derive from `EVENT_TYPES.length`. |

---

## 2 · Brand-bible compliance, surface by surface

### 2.1 Landing (`marketing/design/*`) — voice 10/10, atoms 1.5/3

BRAND.md §3 demands three things noticeable in two seconds: paper
grain, thread, letterpress. The landing ships **one and a half**:

- **Paper grain: absent.** No `.pl-grain`, no `<GrainOverlay />`
  anywhere in `marketing/design/`. The cream reads as flat hex, not
  paper. (The *published demo site* has visible grain — guests get
  texture, prospects don't.)
- **Thread: nearly absent.** No `<Thread />` / `<WovenDivider />`
  between sections; only `ThreadStrand` in the CTA footer. The loom
  motion (`pl-weave-travel`) — "the brand's literal motion" — never
  appears above the fold.
- **Letterpress: one instance** (hero). "Every Pearloom celebration
  lives inside three verbs", "Your first site is free forever",
  "Questions, answered" — all bare Fraunces, no `.pl-letterpress`.
- **Pearl: not the real pearl.** CTAs use a static `<Pearl />` dot
  glyph instead of `.pl-pearl-accent` — the registered
  `--pl-pearl-phase` iridescent drift (the documented "screenshot
  hook") is absent from the marketing funnel it was built for.
- **Gold as a fill:** the highlighted Atelier tier's "Choose Atelier"
  is a gold-filled button; the 404 page's "Back home →" is an
  orange-filled pill. BRAND.md §5: gold is punctuation, never a
  background. (If peach-filled CTAs are the new direction, the bible
  needs the amendment — see §0.)
- **Dark mode: none.** The landing is hardcoded light; `PD` palette
  has no dark values. Editorial-midnight stops at the dashboard door.
- **Dead vertical zones:** ~300px of empty cream between the
  occasions CTA and pricing; the section rhythm is otherwise strong
  (good `clamp()` discipline), which makes the gaps stand out more.

### 2.2 Login — off-palette

"Welcome back, beautiful soul" + lavender/purple book collage +
purple Pear chat bubble. Lavender isn't in the palette (olive, gold,
plum-destructive, peach-warning); the tone is sweeter than the bible's
restraint ("Hermès, Penguin Classics, Linear"). It's pretty — it's
just a different product's pretty.

### 2.3 Wizard + 404 + dashboard — the peach/lavender system

Wizard ("What are we *celebrating?*") uses a plum-italic display
accent, coral links, pastel-tinted occasion icons (peach/lavender/
mint), squiggle margin decorations. The 404 uses peach mono-label +
orange filled button. The dashboard home is genuinely good IA (Next
up / From Pear / Activity / Timeline) with on-brand "Threading…" and
"Nothing yet" states. As a *system* these three are internally
coherent — they're just a second system.

### 2.4 Published-site renderer — the strongest surface (7.5/10)

`ThemedSiteRenderer` + variants + kits + editions is in good shape:

- **Excellent:** reduced-motion honored in `ScrollReveal` and
  filigree draws; transform/opacity-only animations; `:focus-visible`
  outlines everywhere; `aria-hidden` on decorative art; photo-hero
  scrim guarantees contrast; unknown-block default case warns +
  edit-mode placeholder; empty states on-brand.
- **Weak:** variant-picker preview SVGs hardcode the Almanac palette
  (18 previews are theme-deaf — you pick "Midnight Velvet" and the
  picker still shows olive/terracotta); `--pl-density-scale` is wired
  at section level but **not inside variants** (story `48px 40px`
  padding, gallery 18px gaps are fixed — the density dial half-works);
  ~15 distinct `maxWidth` values (1240/1280/1160/1080/980/960/940/920/
  880/820/760/680/640/620/600…) where 3–4 semantic widths would give
  the "single made object" feel; Scrapbook kit renders as a light
  cream island inside dark themes (by design, but reads as a bug).

### 2.5 Editor + dashboard chrome — guard defeated (C+)

- **24 of 48 editor panel files start with
  `/* eslint-disable no-restricted-syntax */`** — the chrome-token
  guard added 2026-06-01 is being bypassed wholesale; panels bind to
  `var(--cream-2)` / `var(--ink)` / `var(--line)` instead of
  `--pl-chrome-*`. The protection that was the headline of the last
  audit is currently decorative.
- `src/components/pearloom/dash/**` has **no guard at all** and leaks
  site tokens freely (`DashSubNav`, `DashCommandPalette`,
  `UserSettingsModal`, …).
- Error/danger states hardcode `#7A2D2D` / `#b4543a` / `#A14A2C` in
  six redesign files — there is no `--pl-chrome-danger` token to
  reach for, so people inline it.
- Glass/blur usage is **fully compliant** (floating chrome only).
- `ThemePanel.tsx` is 1,880 lines; `LibraryPanelV2` 1,770;
  `DecorLibraryPanel` 1,422 — the panel-extraction debt is back.

---

## 3 · Motion audit

- **Token adoption in post-6/1 code: 0%.** 18+ raw transition strings
  in `redesign/` (`'background 140ms'`, `'grid-template-columns 360ms
  cubic-bezier(0.16,1,0.3,1)'`, `'width 600ms'`…). Notably the
  prototype consistently wants **140ms** and **120ms** — durations the
  scale doesn't have. The scale is fighting real usage; add
  `--pl-dur-quick: 140ms` (or re-point 140→fast) rather than expecting
  hand-edits to round to 180.
- **Landing reduced-motion: zero guards.** Blob morphs (14s/18s),
  pear ripen (12s), swirl (80s), float-y, sparkles — none disabled
  under `prefers-reduced-motion`. The hero runs **10+ concurrent
  infinite animations** in one viewport with no coordination. This is
  both an accessibility failure (BRAND.md §6: "Always honour
  prefers-reduced-motion") and a feel problem — the bible's motion is
  one loom, not ten screensavers.
- **Global keyframe coverage: ~40 of ~86 moving keyframes** are
  guarded (47%). Uncovered: `pearloom-drift`, `pearloom-bob`,
  `pearloom-reveal`, `pl8-hero-kenburns`, `pl-icon-sway`, and the
  pl8 page/stat/tab entrance family — most of these run on
  **guest-facing published sites**.
- The renderer's `ScrollReveal` path is the model citizen — gate the
  rest the same way.

## 4 · Quantitative drift since 2026-06-01

50 commits, ~818 file changes. Hotspots: `redesign/ThemedSite.tsx`
(35 commits), `EditorRedesign.tsx`, `PropertyRail.tsx`, `HeroPanel`,
`RegistryPanel`, `pearloom.css` (now 8,146 lines, 48 keyframes;
globals.css 2,268 lines, 77 keyframes — no orphans detected).

| Scan | Result in new code |
|---|---|
| Motion tokens | 0% adoption; 18+ raw strings |
| Colors | ~55% raw hex/rgba vs 45% tokens |
| Z-index | 21 raw values, zero `--z-*` |
| Border radius | ~99% raw (pills/circles intentional) |
| Inline styles | ~70% `style={{}}` vs 30% classes |
| Spinners | **0 violations** ✓ |
| Microcopy | **0 violations** ✓ |

Verdict: the drift is *systematic*, not sloppy — the prototype was
ported verbatim and its styling model came with it. Decide explicitly:
either (a) the redesign surface adopts `--pl-*`, or (b) document the
exception ("published-site theming is inline-by-design; editor chrome
is not") and enforce the boundary with lint. The current half-state
makes every future audit noisier.

---

## 5 · Ranked fix list

**P0 — broken things (≤1 session total)**
1. Mobile nav: hamburger/drawer under 900px; stop the CTA pill wrap
   (`white-space: nowrap` + real mobile layout).
2. Footer links: wire Privacy/Terms (routes exist), point the rest at
   real anchors or delete the columns until pages exist. 28 × `#` is
   worse than a shorter footer.
3. `_test` → route group rename so the 58-pack visual suite actually
   runs; fix the "(67)" comment.
4. Store nested-button hydration bug; login setState-in-render.
5. `scroll-margin-top` on anchored sections; `/wizard` → `/wizard/new`
   redirect.

**P1 — brand atoms on the funnel (1–2 sessions)**
6. Landing: `.pl-grain` underlay, `<WovenDivider />` between the major
   sections, `.pl-letterpress` on the five display headings,
   `.pl-pearl-accent` on nav + hero + pricing CTAs. This is the
   cheapest possible "mind-blowing" upgrade — the components already
   exist and are wired nowhere on the page that sells the product.
7. Reduced-motion guards on every landing keyframe + the ~30 uncovered
   pl8/pearloom keyframes; thin the hero to 2–3 coordinated loops.

**P2 — system reconciliation (decide, then 2–3 sessions)**
8. The constitutional question: bless the peach/lavender prototype
   palette into BRAND.md (as wizard/system-page accents?) or retire it.
   Then: add `--pl-dur-quick` + `--pl-chrome-danger`, migrate the 18
   transition strings, remove the 24 eslint-disables, extend the
   chrome guard to `dash/**`.
9. Variant previews: recolor from active theme (or go monochrome);
   density-scale variant internals; collapse renderer max-widths to
   3–4 semantic tokens.

**P3 — polish**
10. Landing dark mode; login palette pass; ThemePanel extraction;
    Scrapbook-on-dark decision.

---

## 6 · Scorecard

| Surface | Craft | Brand | Motion | Layout | Bugs |
|---|---|---|---|---|---|
| Landing (desktop) | 8 | 4 | 4 | 7 | dead links, nav collision |
| Landing (mobile) | 5 | 4 | 4 | 4 | broken nav pill |
| Login | 7 | 4 | 6 | 8 | setState error |
| Wizard | 8 | 6 | 7 | 8 | stale "31" copy |
| Dashboard | 8 | 7 | 7 | 8 | — |
| Editor | 7 | 6* | 5 | 8 | *guard bypassed |
| Published sites | 8 | 8 | 8 | 7 | — |
| Store | 7 | 7 | 7 | 6 | hydration error |
| 404 / system pages | 7 | 5 | 8 | 8 | — |

The product's best-designed surface is the one guests see — which is
the right priority order. The biggest gap is that the surface that
*sells* the craft (landing, mobile) is the least crafted under its
makeup: missing the brand's three signature atoms, broken on phones,
and ringed with dead links.
