# EDITOR-CALM-PLAN — The Calm Editor (Sprint E)

> Owner brief (2026-08-13): "simplify our editor and panels and not
> use paywalls for themes and stuff — a massive revamp of the editor
> and panels."
>
> This plan is built from a three-way audit run the same day: a live
> browser walk of the editor (screenshots + control counts), a
> panel-by-panel code inventory, and a complete map of every design
> paywall touchpoint. Everything below cites what the code does
> today.

---

## §1 · The audit — what the editor actually is today

### 1a. The numbers

| Measured | Value |
|---|---|
| Panel components (dispatched) | **43** (CLAUDE-DESIGN §7 claims 24; the whole `panels/blocks/` dir — 17 panels, 2,098 LOC — is undocumented) |
| Panel-system code | **15,980 LOC** under `editor/panels/` alone |
| Design tab, first open (desktop) | **~103 interactive controls** in ONE scroll (121 with "Show all 24 styles"); live-measured rail height **5,328px** vs a 748px viewport — seven screens of scrolling |
| Design tab structure | 9 rungs, but only **6 jump chips** — Background, Motion, and Fine-tune are unreachable by chip, buried below ~85 controls |
| Deepest field | **4–5 clicks** (hotel booking URL: tab → panel → card → nested `<details>` → field); **5–6 gestures** on a phone |
| Places to hide a section | **3** · reorder a section: **4** · set a section layout: **3** |
| Theme surfaces | **3 competing** (ThemePackPicker's 10 themes · EditorThemeShop's 86-pack sheet · `/store`) — and ThemePackPicker's `pick()` nulls every field a pack writes, so two of them **actively undo each other** |

### 1b. The seventeen duplications (each a pair of homes for one decision)

Nav variants ×3 (NavPanel ≡ ThemePickerBody's NavPick ≡ canvas chip) ·
footer ×3 · per-section layout ×2 (rail row + canvas chip, deliberate
but doubled) · guestbook toggle ×2 (GuestbookPanel ≡ SharePanel) ·
section hide ×3 · reorder ×4 · weekend data ×2 (BachelorPanel ≡ 5
block panels, with `ToolPointerCard` shipped in 9 panels purely to
apologise for it) · memorial data ×2 (MemorialPanel ≡ 3 block
panels) · dress code ×2 (DetailsPanel ≡ DressCodePanel) · theme/pack
×3 · texture ×3 · **`kitId` written by two different pickers** (the
24 card styles AND the 8 motion kits silently overwrite each other)
· palette ×3 · motifs ×2 · eyebrow ×2 (9 hidden panel fields ≡
canvas inline-edit) · SharePanel mounted under two rail rows ·
SiteModeSection referencing a component deleted in June.

### 1c. The design paywalls (all of it, mapped)

- **The catalog**: 75 packs — 8 free, 47 "premium" ($16–18), 20
  "signature" ($20–24). The tier is DERIVED FROM PRICE in one place
  (`theme-store/packs.ts:351-353`).
- **The publish wall**: two copies of a 402 gate
  (`api/sites/route.ts:254-287`, `api/sites/publish/route.ts:89-111`)
  — "This site is wearing {pack}. Unlock it to publish." Plus the
  client mirror: PublishModal's "**Make it yours to go live** ·
  Unlock {name} · $N" banner.
- **The editor shop**: tier pills, $ pills, "Try it" vs "Apply"
  two-class CTAs, a whole try-on snapshot/restore machine whose sole
  purpose is preventing unpaid persistence, and the "Take it off /
  Wear it for now / Unlock · $N" decision bar.
- **The Studio shelf**: locked packs render at 0.72 opacity under
  "In the store" with an "Unlock" tag.
- **"Unlock Atelier, $19"** (MotionKitPick): a documented
  pre-checkout STUB — the button toggles a boolean; no money path
  exists. Fake-paywall theatre live in the Design tab.
- **A parallel priced decor catalog** (`theme-store/decor-items.ts`:
  motifs $6–8, dividers $5–6, monograms $6–8, kits $8–10) — its
  storefront only mounts in a dev harness; dead-but-loaded prices.
- **Priced wallpapers** (`site-look/wallpapers.ts`: $12–14 metadata,
  "wire through checkout when wallpapers get sold").
- **A second entitlement system** (`lib/marketplace.ts`) selling
  themes/icon-packs/font-pairings via `marketplace_purchases`.
- **The live bug the paywall causes**: the client ownership ledger
  (`pl-store-owned` localStorage) is written by exactly one surface
  and only for $0 packs; `/store/success` never writes it. So **paid
  Pass/Keepsake holders see their plan-granted packs as LOCKED** in
  the editor shop and PublishModal. Removing design paywalls deletes
  this bug wholesale.
- **Clean already**: fonts, paper stocks, the base 10 themes, plan
  limits (`plan-gate.ts` has zero pack logic — capacity only).

### 1d. What's already right (don't break it)

The Content side is calm (Opening panel: 10 visible controls). The
mobile bottom bar (Sections · Theme · Preview · Publish) is good.
**The phone's DesignDoorDeck — 9 focused doors, one decision per
door — is the best design surface in the product.** The canvas
Layout chip, InlineEdit, the paper skeleton, the publish checklist,
and the weave cut all stay.

---

## §2 · The laws

1. **Design is free.** Every theme, pack, kit, font, texture, motif,
   divider, monogram, wallpaper, and motion finish is free for
   everyone, forever. Money buys CAPACITY — sites, guests, photos,
   Pear's drafting, co-hosts — never the look. No tier badges, no $
   pills, no "Try it" vs "Apply", no unlock bars, no publish walls.
2. **One home per decision.** Every design/content decision has
   exactly one panel home (the canvas may offer the same edit in
   place — canvas + one home, never two rails).
3. **Doors, not warehouses.** A rail shows a MENU of short doors;
   each door opens one focused surface. No 5,000px scrolls. The
   desktop learns this from the phone.
4. **Depth ≤ 2.** Any field is at most two clicks from its section
   (three gestures on a phone). No `<details>` inside `<details>`.
5. **The doc is the registry.** CLAUDE-DESIGN §7 lists every panel;
   a fence pins the count so the map can't rot again.

---

## §3 · The blocks

### E.1 · FREE DESIGN (the paywall removal — first, one change-set)

The cheapest correct first move, per the audit: collapse the tier
system at its origin, then delete the dead machinery.

- `packs.ts:351-353`: every pack `priceCents = 0`, `tier = 'free'`;
  `FREE_PACK_IDS` becomes all 75; delete `EXCLUSIVE_*` gating
  rationale (exclusive materials stay as pack CONTENT, not bait).
- `entitlements.ts`: `planGrantedPackIds()` returns the whole
  catalog unconditionally; `userOwnsPack()` → true; stop writing
  purchases (keep `theme_pack_purchases` rows as history).
- Delete BOTH publish 402 blocks + their PublishModal client mirror
  ("Make it yours to go live"). `appliedPackId` stays as provenance.
- EditorThemeShop: tier pills, $ pills, decision bar, unlock(), the
  try-on snapshot/restore machine, and the "Free / My themes" chips
  all go — every card is **Apply**, applying is just applying.
- Studio PackShelf: one flat list of 75; the locked "/store" rows go.
- MotionKitPick: the "$19 Atelier" stub dies; the 8 motion finishes
  become plainly free (their `kitId` collision is fixed in E.3).
- Strip prices from `decor-items.ts` + `wallpapers.ts`; retire
  `lib/marketplace.ts`'s design item types (template/theme selling);
  the dev DecorShop loses its buy button.
- **The store becomes the Theme Gallery**: `/store` keeps its great
  browsing UI but sells nothing — cart, CartProvider, CartDrawer,
  `/api/store/checkout`, the webhook's `theme_pack_purchase` branch,
  `/store/success`, and `apply-free` all retire. Every card:
  Preview / Apply to your site. Nav label "Theme Store" → "Themes".
  The admin grant-pack desk retires with it.
- **Copy + docs + fences in the SAME change-set** (they fail
  otherwise): DesignPricing drops "The signature theme shelf,
  included" from the Pass; the Stripe receipt description drops the
  shelf; both settings surfaces' plan cards; MONETIZATION.md's
  ladder row and §3 restated ("design is free — all of it");
  pricing-agreement.test.ts inverts (and its "never sells an
  un-gated feature" regex GROWS `theme|shelf|pack` — the new fence);
  entitlements-grants tests become "every plan grants every pack";
  packs.test.ts's exclusives test dies with the policy; the publish
  route's 3 pack-gate cases die with the gate.
- **New fence**: `src/lib/free-design.test.ts` — every pack
  priceCents === 0; no `Unlock`/`priceCents > 0`/tier-badge strings
  render from editor/store/studio components; the Pass/Keepsake
  cards make no design claim.

### E.2 · ONE HOME PER DECISION (the duplication cull)

- **Delete**: NavPanel + FooterPanel (the Design tab's rung is the
  home; the canvas chip stays) · RailLayoutRow (canvas Layout chip
  is the home) · GuestbookPanel (SharePanel owns it) · the 9
  eyebrow fields (canvas inline-edit is the home) ·
  SectionVisibilityFooter from all 28 panels (the rail row's eye +
  options popover are the home) · EventTypeChip (a button that
  `void`s its own onChange) · the `cohost` rail row (SharePanel
  deep-link keeps working via `?jump=share`).
- **Sections own their data**: the 9 shadow block panels
  (rooms/costs/votes/packing/chat · obituary/program/tributes ·
  dress code) become the ONE home for their fields. BachelorPanel
  and MemorialPanel slim to orchestration launchpads (progress +
  doors to their sections); `ToolPointerCard` and its 9 apologies
  retire. DetailsPanel's dress-code field moves out (the dressCode
  section owns it).
- **Reorder ×4 → ×2**: rail drag + Alt+↑/↓ stay; the options-popover
  Move rows and the mobile arrows fold into the drag/dots pattern.
- ~3,900 LOC leaves the tree. Autosave/undo/manifest writes are
  untouched — this is homes, not data.

### E.3 · THE CALM DESIGN TAB (doors on desktop too)

The desktop Design tab becomes what the phone already is — a short
menu of doors, each opening ONE focused surface (bottom-anchored
panel on desktop, the existing sheet on phone; ThemePickerBody's
`door` prop already renders every door body):

1. **Theme** — the 10 base themes + "Browse all 75 →" (the gallery
   sheet, ex-shop) + Match-my-photos + Generate-from-story fold in
   here (they're theme-making, not a separate rung).
2. **Colors** · 3. **Fonts** · 4. **Paper** (texture + grain).
5. **Cards & motion** — the 24 card styles AND the 8 motion finishes
   in one door. (Mechanism corrected during E.3 against the CSS
   truth: each motion kit's pearloom.css is a COMPLETE kit — full
   static card treatment plus a motion layer gated on
   `manifest.atelier` — so card styles and motion finishes are one
   axis, `kitId`, by construction. The "collision" was two pickers
   on one dial pretending to be two dials; the fix is ONE unified
   picker in one door, not a second manifest field. Existing sites
   keep their exact look — no field migration.)
6. **Background** (wallpapers, free) · 7. **Menu & footer** (the one
   home, ex-NavPanel/FooterPanel) · 8. **Decor** — the
   DecorLibraryPanel's catalog becomes this door's full-height
   surface (a catalog, not a drawer bottom-CTA) · 9. **Fine-tune**
   (voice, spacing, decorations toggle; the legibility note inlines
   into Colors where it belongs).

Design tab first paint: **≤25 controls, no scroll wall, every door
reachable in one click.** Jump chips retire (doors ARE the
navigation). The topbar's Design/Decor buttons collapse to one
"Design" (opens the tab); ⌘K keeps every deep destination.

### E.4 · CONTENT DEPTH ≤ 2 (flatten the panels)

- The universal "More…" `<details>` pattern is retired panel by
  panel: fields it hides either PROMOTE to the visible group (hero
  CTAs, RSVP meal options, travel booking fields — flattening the
  codebase's only 4-5-click chains) or DIE (eyebrows, per E.2).
- TravelPanel's nested per-hotel `<details>` flattens to one level.
- On phones, `<details>` inside deck cards is banned (it
  reintroduces the interior scroll the deck exists to remove):
  each disclosure's content becomes its own deck card. PanelDeckDots
  counts from a stable child structure, fixing the wrong-dot bug.
- Tool panels on phones get their header back (tabs + section
  actions were unmounted wholesale at `PropertyRail.tsx:617`).
- SectionRail rows become real `<button>`s (they're `div onClick`
  today — a keyboard/SR gap the A-sprint missed).

### E.5 · THE REGISTRY & THE FENCES

- CLAUDE-DESIGN §7 rewritten from the new truth: every panel listed
  (including blocks/), the door model, the phantom components
  removed (DesignAdvisor / PatchProposalCard / FloatingPearBubble —
  none exist), stale §4/§6 counts fixed.
- Fences: `free-design.test.ts` (E.1) ·
  `panel-registry.test.ts` — the PropertyRail dispatch map's case
  count equals the §7 registry count, so the doc can't drift ·
  a door-count pin (ThemePickerBody renders ≤9 doors at first
  paint, no >40-control scroll) · the editor e2e smoke re-recorded
  against the door model · `one-home` documented as law in §7 with
  the deleted duplicate homes named (resurrection = a failed review,
  same pattern as the deleted-architecture ledger).

### Order & size

E.1 first (one change-set, ~1 session — it's mostly deletion and
the tests/docs that must flip with it). Then E.2 (1 session) →
E.3 (1–2 sessions, the visible transformation) → E.4 (1 session) →
E.5 (0.5). Every block ships green on the standard loop (tsc /
eslint / vitest / build / the editor e2e + a live walk).

---

## §4 · Decisions made in this plan (flag if wrong)

1. **The store survives as a free Theme Gallery** (best browsing
   surface; nav says "Themes") — commerce, cart, checkout, success,
   and the admin grant desk retire. The in-editor sheet stays for
   try-in-context; the two stop fighting because applying is free.
2. **Sections own their data; workspaces become launchpads**
   (BachelorPanel/MemorialPanel slim down rather than the block
   panels dying) — a host thinks "edit this section", not "find the
   workspace that shadows it".
3. **Motion finishes stay on `kitId`** — the CSS truth (found in
   E.3) is that motion kits ARE complete kits; the fix is one
   unified Cards & motion picker, and no existing site changes
   appearance because nothing about the field changes.
4. **Capacity paywalls are untouched**: sites 2/10/∞, guests,
   photos, Pear drafting, co-hosts — the Pass still sells the whole
   weekend; it just stops selling the look.

## §5 · Status

- E.1 — **SHIPPED 2026-08-13.** The tier system collapsed at its
  origin (packs.ts forces priceCents=0/tier='free'; entitlements
  grant the whole catalog to everyone; userOwnsPack → true). Both
  publish 402 gates deleted (+ their tests replaced by the
  publishes-any-pack case); PublishModal's "Make it yours to go
  live" wall gone; EditorThemeShop is the free "All themes" sheet
  (try-on stays as a preview contract; tier pills, $ pills, the
  decision bar, unlock(), and the checkout resume stash are gone);
  EditorRedesign's stashed-pack ownership branch gone; the Studio
  shelf is one flat list; the "$19 Atelier" stub is a plain motion
  on/off; decor items + wallpapers stripped of prices; marketplace
  isItemFree → true; the webhook pack branch is a legacy
  acknowledgment; the admin grant desk retired. The store is the
  free Theme Gallery (cart/CartProvider/CartDrawer/checkout/
  apply-free/success deleted; nav says "Themes"; metadata says
  gallery). Copy flipped on DesignPricing (no design claim on paid
  cards), the Stripe receipt, and both settings surfaces;
  MONETIZATION.md restated (§1/§2 ladder row deleted/§3/§5/§7);
  pricing-agreement's shelf test inverted and its un-gated-claims
  regex grew the design ban; entitlements-grants/packs/marketplace
  tests rewritten. Fence: `src/lib/free-design.test.ts` (11 tests:
  no prices anywhere, grants universal, commerce surfaces stay
  deleted, no unlock language renders). Live-verified: the Design
  tab, the All-themes sheet, and /store render zero pay language;
  vitest 1852/1853 (the one failure is the pre-existing weekend
  baseline); tsc/eslint/build clean.
- E.2 — **SHIPPED 2026-08-13** (one home per decision).
  What landed: NavPanel/FooterPanel/GuestbookPanel deleted — the
  nav/navMobile/footer dispatch cases render a door card
  (DesignHomeDoorCard in PropertyRail: one line of orientation +
  "Open Menu & footer", dispatched via the same
  pearloom:open-theme-rail event the topbar uses, with a
  best-effort scroll to #pl-dz-menu); 'guestbook' renders
  `SharePanel focus="guestbook"` (the focus prop grew a
  'guestbook' arm mirroring 'cohost'; the toggle group gained the
  moderation door the deleted panel carried). The rail layout row
  died (canvas Layout chip is the home); the options-popover Move
  rows died (reorder ×4→×3: rail drag + Alt+↑/↓ + mobile arrows);
  the 'cohost' rail row died (SharePanel covers it; the dispatch
  case + a DELISTED_TOOLS label entry keep ?jump=share/topbar/⌘K
  deep links whole). The 9 core-panel eyebrow fields died (canvas
  inline-edit is the home; Travel + Gallery lost their now-empty
  "More" disclosures entirely; heroLeadSuggestions retired with
  its only consumer). The per-panel visibility footer died from
  _section-atoms AND all 28 call sites (+ the panels' orphaned
  useSectionHidden hooks; the rail's eye + popover are the home).
  The Design tab's do-nothing Event-type chip died. Sections own
  their data: BachelorPanel + MemorialPanel rewrote as launchpads
  (glance state + SectionDoorRow doors firing design-jump into
  costSplitter/activityVote/packingList/rooms/groupChat and
  obituary/program/tributeWall); the pointer-card apology left
  blocks/_shared with its 9 call sites (isBachelorOccasion retired
  with it); DetailsPanel's dress-code field removed
  (blocks/DressCodePanel is the home; the detailsCards row stays
  editable as an ordinary good-to-know card). Net −921 LOC across
  50 files. Validated: tsc clean · eslint clean on every touched
  file · vitest src/components/pearloom 203/203 · build passes ·
  grep zero references to the seven deleted homes. Independently
  re-verified (separate context): tsc/eslint clean · FULL vitest
  1852/1853 (the one failure is the pre-existing weekend
  baseline) · the zero-reference greps again · an 11-assertion
  live editor walk on the local stack (nav + footer render the
  door card and the door opens the Design surface; guestbook is
  SharePanel's focused group with the moderation door; ?jump=cohost
  still works while the rail shows no Co-hosts row; the open hero
  panel contains no Eyebrow field; the options popover has no Move
  rows; the story panel has no visibility footer). One accepted
  deviation from the block text: reorder is ×4→×3, not ×2 — the
  mobile arrows stay because touch has no Alt+↑/↓ and rail drag is
  hostile at 390px; the popover Move rows died as planned.
- E.3 —
- E.4 —
- E.5 —
