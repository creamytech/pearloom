# CLAUDE-DESIGN.md — Pearloom implementation reference

> **BRAND.md is the constitution. This file is the blueprint.**
> BRAND.md declares what Pearloom *stands for*. This file maps what actually lives in the code so future sessions can navigate without re-auditing.
>
> Last full audit: **2026-06-12**, immediately after the great deletion (see §15). Re-audit before any large refactor.

---

## 0 · How to use this file

- **Read BRAND.md first.** If a rule here contradicts BRAND.md, BRAND.md wins — flag the drift and update this file.
- **Every section is concrete.** File paths and class names are pasted verbatim. If the code disagrees, the code has drifted — the code is the final authority.
- **§15 is the deleted-architecture ledger.** If you're hunting for something this doc used to describe (vibeSkin, SiteV8Renderer, ThemedSiteRenderer, the memory-engine story pipeline, the V1 site tree), check §15 before grepping — it's gone on purpose.
- **§16 is the active debt list.** Fix from the top.

---

## 1 · Source-of-truth map

| Concern | Canonical file | Notes |
|---|---|---|
| Published-site + editor-canvas renderer | `src/components/pearloom/redesign/ThemedSite.tsx` | **THE renderer.** One component for both surfaces; `editable` prop is the only difference. |
| Published-site shell | `src/components/pearloom/site/PublishedSiteShell.tsx` | Mounts ThemedSite + overlays (ArrivalReveal, GuestRsvpModal, StickyRsvpPill, AnalyticsBeacon, SiteGate password gate). |
| Editor | `src/components/pearloom/redesign/EditorRedesign.tsx` | Mounted by `/editor/[siteSlug]/EditorClient.tsx`. SectionRail + canvas + PropertyRail. |
| Editor↔server bridge | `src/components/pearloom/redesign/bridge.ts` | Autosave (2s debounce → `POST /api/sites`), undo/redo, publish, `beforeunload` sendBeacon flush, base64 strip. |
| Manifest backfill | `src/components/pearloom/redesign/hydrate-manifest.ts` | Backfills redesign fields (themeId via nearest-accent match, edition recommendation, themeVars) onto pre-redesign manifests. Idempotent, never mutates input. |
| Wizard | `src/components/pearloom/pages/WizardV8.tsx` | 8 steps → instant local manifest (~1s, no AI at finish). See §8. |
| Theme catalog (`--t-*` bag) | `src/components/pearloom/site/themes.ts` | 6 named themes; `getTheme(id)`. See §3.3. |
| Theme packs / store | `src/lib/theme-store/packs.ts` + `apply.ts`, `src/components/pearloom/store/` | Purchasable packs; `applyPackToManifest`; entitlements via `useEntitlements` (localStorage `pl-store-owned`). |
| Look fields (kit/texture/density/motifs) | `src/lib/site-look/` | `wizard-look.ts` (applyWizardLook + themeVarsFromPalette), `look-recipes.ts` (wizard's 3 looks), `motif-layouts.ts`. |
| Site Editions (read-time defaults) | `src/lib/site-editions/` | `recommendEdition` by occasion/voice. Never written to the manifest by the resolver. |
| Event OS registry | `src/lib/event-os/event-types.ts` | 28 occasions: blocks, voice, RSVP preset, templates, look defaults. Plus `name-mode.ts`, `rsvp-presets.ts`, `wizard-questions.ts`, `solo-occasions.ts`. |
| Suggestion chips | `src/components/pearloom/editor/panels/_suggestions.ts` | Occasion-shape routed (wedding sets only for wedding-shaped events — de-wedding'd 2026-06-12). |
| CSS tokens + utilities | `src/app/globals.css` (2.4k lines) + `src/app/pearloom.css` (8.4k lines) | See §3. |
| Editor state helpers | `src/lib/editor-state.ts` | `stripArtForStorage` (chapter-image base64 strip). |
| URL construction | `src/lib/site-urls.ts` | `buildSiteUrl`, `buildSitePath`, `formatSiteDisplayUrl`, `normalizeOccasion`. **Never concatenate site URLs.** |
| Claude client | `src/lib/claude/client.ts` | Opus 4.8 / Sonnet 4.6 / Haiku 4.5 with `withRetry` + `cached`. `structured.ts` forces tool_choice. |
| Gemini client | `src/lib/memory-engine/gemini-client.ts` | `GEMINI_PRO` (3.1-pro-preview), `GEMINI_FLASH` (3.5-flash) + image gen. |
| Image routing | `src/lib/memory-engine/image-router.ts` | `openai \| gemini \| auto` per use-case (stylize, decor, QR posters). |
| Guest identity / event graph | `src/lib/people.ts` | Persistent guest identity, token resolution, opt-in connections. Privacy contract in module header. |
| Rate limit | `src/lib/rate-limit.ts` (+ `rate-limit-redis.ts`) | `checkRateLimit(key, { max, windowMs })`, `getClientIp`. |
| R2 / storage | `src/lib/r2.ts` | `uploadToR2`, `getR2Url`. |
| Auth | `src/lib/auth.ts` + `src/lib/password.ts` | Google OAuth + DB-backed credentials (scrypt `s2$` format), `/welcome` onboarding gate. |

---

## 2 · Surfaces — what mounts what

```
/                       → LandingPageWrapper → marketing/design/* (DesignNav, DesignHero, ThreeActsStage, …)
/login /signup /forgot  → SigninV8 + auth/ManualAuthPages
/welcome                → WelcomeFlowClient (first-run onboarding; gate passes onboarded + site-owning accounts to /dashboard)
/wizard/new             → WizardV8
/editor/[siteSlug]      → EditorRedesign (?view=studio → BuilderV8 quick re-skin)
/dashboard/**           → DashShell + pearloom/dash/* + per-route pages (pearloom/pages/*)
/dashboard/invite       → Studio (stationery: save-the-date / invitations / thank-you) — pearloom/studio/*
/{occasion}/{slug}      → sites/[domain]/page.tsx → PublishedSiteShell → ThemedSite
/{occasion}/{slug}/{pg} → sites/[domain]/[page]/page.tsx → PublishedSiteShell (pageFilter)
/g/[token]              → guest passport (RsvpCeremony, GuestThreadCard, YourCelebrationsCard, …)
/a/[siteSlug]           → address-collection form
/store                  → ThemeStore (packs, cart, entitlements)
```

**The renderer rule:** every site pixel — editor canvas and published — comes from `redesign/ThemedSite.tsx`. There is no dispatch, no fallback, no legacy path. PublishedSiteShell wraps it in an ErrorBoundary with a calm guest fallback.

---

## 3 · Token system — three layers

### 3.1 `--pl-*` (globals.css) — the brand layer

Canonical brand tokens declared under `[data-theme='light']` / `[data-theme='dark']`. The theme attribute lives on `<html>` — set by an inline script in `src/app/layout.tsx` (localStorage `pl-theme` → `prefers-color-scheme`) and toggled by `src/components/shell/ThemeProvider.tsx`.

Families: `--pl-cream{,-deep,-card}`, `--pl-ink{,-soft}`, `--pl-muted`, `--pl-divider{,-soft}`, `--pl-olive*`, `--pl-gold*`, `--pl-plum*`, semantic warn/success, shadows, radii, z-index, spacing, `--pl-text-*`, `--pl-dur-*` + `--pl-ease-*`, glass. Dark mode is *editorial midnight* (`#0D0B07` base), never OLED black (BRAND §10).

**Pearshell** still lives here: `--pl-pearl-{a,b,c}`, `--pl-rind`, `--pl-bruise`, registered `@property --pl-pearl-phase`, and `.pl-pearl-accent` / `.pl-pearl-border` / `.pl-block-selected` (with `!important` on bg/color/border by design). ~20 call sites; primary CTAs only.

### 3.2 `.pl8` handoff layer (pearloom.css) — the product chrome

`:root` aliases with friendlier names, all pointing at `--pl-*` so theme switching flows through: `--cream`, `--cream-2/3`, `--ink`, `--ink-soft/muted`, `--paper`, `--card`, `--line`, `--line-soft`, `--gold`, plus the accent families `--sage*`, `--peach*`, `--lavender*` (these have their own `[data-theme='dark']` midnight values at pearloom.css:102). Dashboard, editor chrome, wizard, marketing all live in the `.pl8` scope.

Typography classes: `.pl8 .display` (Fraunces), `.display-italic`, `.script` (Caveat), `.eyebrow`. **Mobile caveat:** the ≤640px clamp `font-size: clamp(32px, 9vw, 56px)` applies to `h1/h2/h3.display` on the chrome side only — small `.display` divs/spans keep their inline sizes (fixed 2026-06-12 after it inflated the wizard's phase word).

### 3.3 `--t-*` theme bag — the per-site theme

`src/components/pearloom/site/themes.ts` defines **6 themes** (`santorini`, `tuscan`, `garden`, `editorial`, `midnight`, `coastal`), each a complete `--t-*` var bag: `--t-paper/section/card`, `--t-ink{,-soft,-muted}`, `--t-accent{,-2,-bg,-ink}`, `--t-gold`, `--t-line{,-soft}`, `--t-rsvp{,-ink}`, `--t-display/body/script` font stacks, `--t-radius{,-lg}`, `--t-display-wght`, `--t-hero-scale`, `--t-eyebrow-ls`, `--t-shadow`.

ThemedSite emits the full bag on the `.pl8-guest` root's style attribute, so every `var(--t-*)` inside the site resolves per-site. Resolution chain: `manifest.themeVars` (theme-pack or custom override) → `manifest.themeId` → nearest-accent match from legacy `theme.colors` (hydrate-manifest) → first theme.

### 3.4 Site root data attributes

On `.pl8-guest`: `data-pl-texture` (paper grain variant), `data-pl-kit` (`classic | ticket | plate | scrapbook | index | minimal` — per-kit card/row CSS in pearloom.css), `data-pl-density`, plus `--pl-texture-intensity` / `--pl-density-scale` vars.

### 3.5 Editor chrome insulation

Editor panels bind to `--pl-chrome-*` tokens only (never site-theme vars) so panels don't re-paint when the edited site's theme changes. Enforced by the `no-restricted-syntax` ESLint rule in `eslint.config.mjs` for `pearloom/editor/**`. `atoms.tsx` carries 55 chrome-token references. Known violator: `CommandPalette.tsx` (pre-existing errors — see §16).

---

## 4 · The look system

A site's look = **theme** (§3.3 palette/type bag) + **kit** + **texture** (+ intensity) + **motifs/ornament layout** + **density**, all fields on StoryManifest:

| Field | Values | Reader |
|---|---|---|
| `themeId` / `themeVars` | themes.ts ids / `--t-*` record | ThemedSite root |
| `kitId` | classic, ticket, plate, scrapbook, index, minimal | `[data-pl-kit]` CSS |
| `texture` + `textureIntensity` | pearloom.css texture set, 0–1.5 | `[data-pl-texture]` + `::before` opacity |
| `motifLayout` | `src/lib/site-look/motif-layouts.ts` ids | `redesign/MotifLayer.tsx` |
| `density` | cozy / comfortable / spacious | `--pl-density-scale` |
| `edition` | `src/lib/site-editions/editions.ts` | read-time defaults only — `recommendEdition(occasion, voice)`; the resolver never writes back |

- **Wizard**: `applyWizardLook` stamps occasion defaults (`lookDefaultsFor` in event-types.ts) — the `'match'` recipe from `lookRecipesFor(occasion)` dresses the live pressing (and the "room wears the look" underlay on Palette/Review). Explicit kit/texture/motif/density picks come from the **fitting room** (`wizard-fitting-room.tsx`) and beat the defaults at generation. (The old three-look card picker — `wizard-looks.tsx` — was unreachable inside the dead-coded Layout step and was deleted 2026-07-01; the fitting room is its successor.)
- **Editor**: ThemePickerBody / ThemeRail / ThemePackPicker + EditorThemeShop (in-canvas pack preview/unlock, shares `pl-store-owned` localStorage with `/store`).
- **Studio inheritance**: `studio-defaults-from-look.ts` — first Studio open inherits the site look.
- **From photos**: `src/lib/look-engine/palette-from-photo.ts` (client-side quantize) feeds the wizard's "From your photos" palette + `/api/wizard/smart-palette`.

---

## 5 · Brand primitives (actual)

Under `src/components/brand/`: **`<Thread />`** (dividers), **`<WeaveLoader />`** (every spinner — `Loader2`/`animate-spin` are banned), **`<Folio />`** (edition marks), **`<GooeyText />`** (rotating words), **`<PearloomMark />`** (logo), plus a `groove/` accent set. Shared chrome atoms live in `src/components/shell/` (EmptyState, PageCard, ThemeToggle…). Effects under `src/components/effects/` (GradientMesh, GrainOverlay, TextureOverlay, VignetteOverlay, ScrollReveal, ColorTemperature, CustomCursor).

The motifs/glyph language for product surfaces lives in `src/components/pearloom/motifs.tsx` (Pear, Sparkle, AmbientSprig, PearlDot, PearloomLogo…) and `pearloom/avatars.tsx` (the 12 orchard account marks).

BRAND.md §7 microcopy rules apply everywhere: "Threading…" not "Loading…", "drafted by Pear" not "AI-generated", `<EmptyState />` copy in the "Nothing yet. Begin a thread." key.

---

## 6 · Component inventory (2026-06-12)

~340 TS/TSX files in `src/components`. The map:

| Dir | Files | What |
|---|---|---|
| `pearloom/redesign/` | 33 | **The editor + renderer.** ThemedSite, EditorRedesign, SectionRail, PropertyRail, ThemeRail/ThemePickerBody, EditorTopbar, EditorDrawers, MobileSheet, InlineEdit, MotifLayer, PearAssist/FloatingPearBubble, PublishChecklist, UndoToast, FittingRoom, FirstPressing, bridge/hydrate/taste/layouts/bastings, `section-variants/` (per-section variant components: nav, story, schedule, details, travel, registry, gallery, rsvp, faq + `blocks/`). |
| `pearloom/editor/` | 55 | Panels (24: Hero, Story, Schedule, Details, Travel, Registry, Gallery, Rsvp, Faq, Music, Map, Countdown, Share, Privacy, DayOf, Guests, SaveTheDate, DecorLibrary, ThemePackPicker, Bachelor/Memorial/Toasts occasion panels, SiteModeSection…), `_form-atoms` / `_section-atoms` / `_suggestions`, CommandPalette (⌘K), EditorThemeShop, DesignAdvisor, PhotoPicker, `pear/` (PatchProposalCard, PearActionCard, patch.ts), atoms.tsx (chrome tokens). |
| `pearloom/pages/` | 19 | Route-level clients: WizardV8 (+ wizard-looks, WizardLookPreviews), WelcomeHome, SigninV8, BuilderV8, DayOfV8, SpeechComposerPage, MemoryBookPage, SeatingArrangerPage, QrPosterPage, PassportCardsPage, KeepsakesPage, WeekendBuilderPage, VendorsPage, LibraryPage, BridgePage, EventIndexPage, LegalPage. |
| `pearloom/studio/` | 16 | Stationery studio: StudioApp, StudioCard (+ BrandedQR), StudioRails, StudioSendOverlay, StudioProofSheet, StudioPrintPreview, StudioMailFlow, useStudioState, studio-defaults-from-look. |
| `pearloom/dash/` | 16 | DashShell (SiteCrest switcher), PLChrome, DashSubNav, DashCommandPalette, NotificationBell, UserSettingsModal, BroadcastComposer, TwoTapThanks, ThankYouGenerator, ShellPersistentLayout. |
| `pearloom/site/` | 13 | Published-site shell + overlays: PublishedSiteShell, ArrivalReveal, GuestRsvpModal, RsvpCeremony, GuestPearChat, DayOfBanner, BroadcastBar, Monogram, MotifScatter, TextureFilters, themes.ts. |
| `pearloom/wizard/` | 7 | GeneratingScreen (press stages), WizardDatePicker, WizardLocationAutocomplete, StoryListen, BackgroundCookPill, useBackgroundCook (decor pre-cook), usePhotoPalette. |
| `pearloom/store/` | 8 | ThemeStore, CartProvider/CartDrawer, PackCard/PackPreview/QuickLookModal, useEntitlements. |
| `marketing/` | 19 | `design/*` is the live landing (DesignNav, DesignHero, WovenDivider, ThreeActsStage, DesignOccasions, DesignPricing, DesignFAQ, DesignTestimonials, DesignCTAFooter) + `design/dash/*` dashboard pages (DashDirector et al). |
| `brand/`, `shell/`, `effects/` | 24/9/7 | §5. |
| `guest-experience/`, `invite/`, `passport/` | 6/6/2 | Guest passport cards (GuestCircleCards, YourCelebrationsCard, …), invite reveal. |
| `seating/`, `registry/`, `venue/`, `live/`, `co-host/` | 4/3/2/2/1 | Feature modules. |
| `auth/` | 2 | ManualAuthPages (signup/forgot/reset). |
| root | 3 | ErrorBoundary, auth-provider, theme-provider. |

---

## 7 · Editor architecture

```
EditorRedesign
├── EditorTopbar          (save state, publish, device, undo/redo)
├── SectionRail           (left; tabs: Sections | Pages | Theme)
│     Pages tab lists real pages in magazine mode → canvasPage filter
├── canvas: ThemedSite    (editable; InlineEdit text, jump/scroll sync)
├── PropertyRail          (right; per-section panel dispatch via SECTIONS map,
│                          live section descriptions — no fake counts)
├── EditorDrawers / MobileSheet (mobile: props sheet)
├── CommandPalette (⌘K)   + EditorThemeShop (bottom sheet)
└── PearAssist / FloatingPearBubble / DesignAdvisor (Pear copilot;
    pearloom:patch envelopes → PatchProposalCard / PearActionCard)
```

- **Save**: `bridge.ts` — 2s debounce → `POST /api/sites`; `beforeunload` flushes via sendBeacon; `stripArtForStorage` keeps payloads under request limits. SaveState is binary (`saved | unsaved`).
- **Deep links**: `/editor/[slug]?jump=<section>` validated against `JUMPABLE_SECTIONS`; on phones the props sheet opens automatically.
- **Roles**: `viewerRole` (`owner | editor | guest-manager | viewer`) gates publish + locks viewers to preview; `useEditorCollab` drives presence.
- **Honesty rule (2026-06-12)**: editor canvas previews demo content via `buildCopy(…, { editable })` — `editable === true` is the ONLY gate for demo fallbacks. Published sites render exclusively host-authored content. Never add a fallback string without routing it through this gate.

---

## 8 · Wizard

`WizardV8.tsx` — steps `Occasion → Basics → Details → Day → Photos → Vibe → Palette → Review`, presented as 4 phases (Story / Photos / Look / Review) in the PhaseHeader.

- **Generation is instant and local for everyone** (2026-06-12). No AI call at finish. The manifest is assembled client-side: names/logistics/factSheet/eventDetails + palette → `theme.colors` + `applyWizardLook` + explicit look-recipe stamp + `seedSectionsFromWizard` (schedule picks, dress code, RSVP deadline, occasion-correct FAQ seeds) → `POST /api/sites { create: true }` (server guarantees a free slug) → `/editor/{slug}`.
- **Photos are content, not story inputs**: they upload to R2 during the Photos step (`/api/photos/upload`); at finish the first becomes `manifest.coverPhoto`, the rest `manifest.galleryImages` (+ index-keyed `galleryCaptions`). Story drafting happens later, in the editor, on demand.
- **Choreography**: `pressScript` labels + `GeneratingScreen` press stages (photo runs get a "Placing your photographs" beat); minimum press duration so the moment doesn't flash.
- **Background decor cook** (`useBackgroundCook`): pre-generates the decor library from occasion + palette while the host finishes the steps; folded into the manifest at finish. The BackgroundCookPill narrates it.
- **Occasion-aware everything**: `nameModeFor` (couple/solo/group name fields), `questionsFor` (per-occasion fact-sheet prompts, all 28 occasions), `vibesForOccasion` (voice-routed vibe chips), suggestion sets (§1 `_suggestions.ts`), onboarding intent prefill ("★ For you" badge on the matching occasion).

---

## 9 · Studio (stationery)

`/dashboard/invite` — save-the-date / invitations / thank-you cards. `useStudioState` persists to `manifest.studio`; first open inherits the site look. Design rail offers palettes + custom colors, paper textures (`STUDIO_TEXTURES`), and the site's decor library; `StudioCard` renders the `pl8-guest`-scoped card with `BrandedQR` (real QR to the site URL). Send: `StudioSendOverlay` → `/api/invite/guest` (per-cardType email tags, no-email counts, 3/60s host rate limit) → `email_sent_at` stamps.

---

## 10 · URL system

Path-based, occasion-prefixed: `pearloom.com/{occasion}/{slug}` — 28 occasions via the Event OS registry. `/sites/{slug}` legacy fallback rewrites in `src/proxy.ts`. **Never construct site URLs by string concatenation** — `buildSiteUrl` / `buildSitePath` / `formatSiteDisplayUrl` only.

---

## 11 · AI model routing (current)

| Need | Use |
|---|---|
| Editor copy passes (rewrite, FAQ drafts, thank-yous, speeches, Pear chat) | Claude — `src/lib/claude/client.ts`; tiers `opus = claude-opus-4-8`, `sonnet = claude-sonnet-4-6`, `haiku = claude-haiku-4-5-20251001`. `generateJson` in `structured.ts` always forces `tool_choice`. |
| Analysis / extraction | `GEMINI_FLASH` (gemini-3.5-flash) or Haiku |
| Creative long-form | `GEMINI_PRO` (gemini-3.1-pro-preview) or Opus |
| Image generation / restyle (photo stylize, decor, stickers, QR posters) | `image-router.ts` — `openai \| gemini \| auto` (OpenAI preferred when keyed) |

AI lives in **on-demand routes** (`/api/pear-chat`, `/api/rewrite-text`, `/api/ai-*`, `/api/decor/*`, `/api/photos/stylize`, `/api/look/from-story`, `/api/wizard/smart-palette`, cadence drafts…), never in the wizard's critical path and never at publish. `src/lib/ai-usage.ts` meters spend. ~199 API routes total under `src/app/api/`.

---

## 12 · API + Supabase conventions

Unchanged contract: `getServerSession` → `checkRateLimit` → JSON parse in try/catch (400) → validate early → work → `NextResponse.json({ ok, … })`. Status codes 200/400/401/403/429/500/502. Log with a `[route]` prefix. Don't leak membership.

Supabase: migrations in `supabase/migrations/` AND applied to prod (project `vpwnpxowqflajvqpgvyb`) via MCP, tracked in `_pearloom_migrations`. RLS pattern is belt-and-braces restrictive `deny-anon` + service-role client in routes. Key recent tables: `people` (guest identity, lowercase-email keyed), `site_messages` (party thread + host↔guest DMs), `account_credentials` (scrypt), `user_preferences` (avatar, onboarding, intent). Realtime: content-free pings on `pl-msg-${siteId}` broadcast channels (`src/lib/messages-realtime.ts`); refetches stay token-authed.

---

## 13 · Naming + conventions

- `pl-` prefix for utility classes; `pl8-` for product-chrome scoped classes; `.pl8-guest` is the site scope.
- `data-pl-*` for site-root attributes. Custom events in the `pearloom:*` namespace (`pearloom:patch`, `pearloom:send-save-the-date`, `pl-open-rsvp`).
- `@/*` → `src/*`. No relative-up traversals.
- `*Client.tsx` for `'use client'` route shells; `route.ts(x)` handlers; co-located `*.test.ts` (vitest; `src/test/setup.ts` is wired via vitest.config.ts strings — never "orphan-delete" it).
- Editor chrome → `--pl-chrome-*` only (ESLint-enforced).
- React Compiler lint is on: no `Date.now()` in render, no synchronous setState-in-effect (use render-time adjustment or rAF).

---

## 14 · Validation loop

`npx tsc --noEmit` → `npx eslint <touched files>` → `npx vitest run` (667 tests green as of 2026-06-12) → `npm run build`. Full-repo eslint carries ~106 pre-existing errors (CommandPalette chrome tokens, PLChrome render rule) — your touched files must be clean; the backlog is §16.

---

## 15 · Deleted-architecture ledger

If an old doc, comment, or memory references these: **they're gone, on purpose.** Deleted 2026-06-12 (~90k lines) after a production check found zero rows carrying vibeSkin/customPages and the import graph confirmed zero live consumers:

- **vibeSkin** — the AI-generated design layer. Field removed from StoryManifest; nothing generates or reads it. OG cards read the suite theme contract (`src/lib/suite/theme.ts`) with house-default fallbacks.
- **`ThemedSiteRenderer.tsx`** (pearloom/site, 7.7k lines) — the pre-redesign renderer — and **`SiteV8Renderer`** before it (deleted 2026-06-01). Also the old V8 editor canvas (`editor/canvas/CanvasStage` + the EditableText/HoverToolbar canvas-overlay family) and **EditorV8** itself.
- **The memory-engine story pipeline** — `pipeline.ts`, `claude-passes`, `prompts`, `passes`, `grounding`, `photo-vision`, `image-fetcher`, `motif-picker`, `typography-picker` — and its routes `/api/generate`, `/api/generate/stream`, `/api/generate/art`. (`gemini-client`, `image-router`, `openai-image` survive — live AI routes use them.)
- **vibe-engine** entirely; the publish route's per-publish Gemini vibeSkin call.
- **The V1 site component tree** — hero, site-nav, StoryLayouts, guestbook, PasswordGate, wedding-events, the `site/groove/*` set, `site/*Block.tsx` Event-OS blocks, effects/SectionDivider, vibe/WaveDivider… (the published page carried ~46 dead imports keeping these "alive").
- **The `/preview` + `/preview/[token]` surface** + `/api/preview` + EditBridge (nothing minted tokens; the token pages rendered the V1 tree — a different site than published).
- **`customPages`** legacy renderer (no writer, zero rows; unknown sub-page slugs now 404).
- **The shadcn `ui/` kit remainder**, `lib/block-engine`, `lib/intelligence`, `lib/marketplace` (module dir), `lib/design-tokens.ts`, `lib/snapshots`, `manifest-migrations`, and ~40 other zero-importer lib modules.
- Earlier rounds (see git history): PearSpotlight wizard, HomeV8/DashHomeV8/TemplatesV8, AuthModal, the QuickEditModal family, the MarketingNav/EditorialHero-era marketing tree.

Before resurrecting anything from git history, ask whether the redesign equivalent already exists — it usually does.

---

## 16 · Active debt (2026-06-12)

1. **CommandPalette chrome-token violations** — ~90 pre-existing `no-restricted-syntax` errors (site-theme vars in editor chrome). Migrate to `--pl-chrome-*`.
2. **PLChrome.tsx** — "Cannot create components during render" lint error.
3. **Unused eslint-disable directives** — ~40 warnings repo-wide, mostly stale `no-restricted-syntax` file-top disables; remove when touching those files.
4. **`pearloom.css` is 8.4k lines** — carries per-kit/texture/edition CSS plus sediment from deleted surfaces. Worth a dead-selector audit now that the V1/V8 trees are gone.
5. **Story drafting in the editor** — the wizard no longer drafts story content; the editor's "draft my story from these photos/facts" flow is the named successor (the factSheet + eventDetails already ride the manifest for it).
6. **`user_preferences.intent`** (onboarding) prefills the wizard occasion, but nothing else reads it yet.

---

## 17 · Changelog (condensed)

Older entries live in this file's previous revision (git history). The renderer's full lineage: V1 tree → SiteV8Renderer → ThemedSiteRenderer → **redesign/ThemedSite** (current, sole).

### 2026-06-12 — The great deletion + doc rewrite
~90k lines removed (§15). Wizard generation made instant for photo runs (photos = content; story drafting moved to the editor; manifest pre-warm deleted). Suggestion fallbacks de-wedding'd. Wizard mobile/dark fixes (`.display` clamp scoped to headings; theme-aware header glass; safe-area cook pill). `/welcome` gate grandfathers site-owning accounts → `/dashboard`. This document rewritten from a fresh audit.

### 2026-06-11 — Welcome flow, orchard avatars, event graph
First-run onboarding at `/welcome`; 12 SVG account marks + SiteCrest switcher; persistent guest identity (`people`), event-scoped messaging (`site_messages`) with Realtime pings, opt-in connections; Sealed Arrival envelope (`ArrivalReveal`); manual accounts (scrypt credentials, verify/reset flows).

### 2026-06-01 → 06-10 — Redesign consolidation
`redesign/ThemedSite` + `EditorRedesign` became the only renderer/editor; section-variant registry; theme packs + store; look fields (kit/texture/density/motifs); Editions as read-time defaults; honesty sweep (every demo gated by `editable`, every panel control wired).

---

*End of CLAUDE-DESIGN.md. If you're reading this mid-session and something looks wrong, re-audit. The code is the final authority.*
