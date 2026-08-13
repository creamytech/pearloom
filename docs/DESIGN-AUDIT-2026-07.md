# DESIGN-AUDIT-2026-07.md — full-route visual pass (for Fable 5)

> A screenshot audit of every route, desktop (1440) + mobile (390),
> looking for what to improve layout/design-wise. Drafted 2026-07-08.
>
> **Read the method note first — it changes how to weigh the findings.**

---

## 0 · Method + honest caveats

Captured all 35 distinct surfaces via the public routes + the `/dev/*`
harnesses (which mount the real dashboard/editor/wizard clients without
auth), desktop and mobile, full-page.

Two things distorted the first scan; both are tooling, not product, and
the findings below are written **after** correcting for them:

1. **Framer `<Reveal>` freezing.** My first capture injected
   `transition: none` to settle animations. That froze every
   framer-`<Reveal>`-wrapped subtree at `opacity:0` (ThemeProvider keeps
   opacity animations even under reduced-motion). Result: the login,
   signup, forgot, and wizard screens looked **blank/empty** when they
   are in fact fully designed and working. Verified at full resolution
   with a plain load — the login page ("Welcome back to the loom") and
   the wizard occasion picker are polished and complete. **Do not chase
   these as bugs.**
2. **Contact-sheet cropping.** Short one-viewport pages scaled small
   inside tall montage tiles read as "huge empty void below." At full
   resolution the empty-state pages are a single viewport with a
   centered card — no giant scroll void, no cream→white seam. Those were
   montage artifacts.

**What I genuinely could NOT assess:** the **published guest site**,
gallery, hero photos, and the memory-book preview. All external demo
imagery (Unsplash) is blocked in this sandbox, so those surfaces render
as flat gray/color boxes here. Judge them on a real deploy — see §3.

**Headline:** after correction, the product is in **strong, consistent
shape**. The design system (Fraunces letterpress display, cream paper +
olive/gold, mono-caps eyebrows, two-column editorial dashboards) is
applied coherently everywhere. There is **no surface that is
"massively" broken.** The real opportunities are incremental and
first-impression-weighted. Ranked below.

---

## 1 · What's already strong (preserve — don't "fix" these)

- **Dashboard home (with data)** — countdown hero, planning-progress,
  timeline, day-of checklist, "3 things only you can decide," budget
  with over-budget flagged red, RSVP donut, weekend, "the long view."
  Genuinely excellent; the bar the rest of the product should meet.
- **Marketing** — landing, partners, privacy, terms, store are all
  polished and on-brand.
- **Auth** — login/signup/forgot: split layout, collage vignette, Pear
  helper. Strong.
- **Wizard** — occasion picker + live phone preview. Strong.
- **Editor** — SectionRail / canvas / PropertyRail, dense but coherent;
  mobile editor with bottom-tab chrome is good.
- **Content-rich dashboards** — weekend, memory, studio, day-of, music,
  settings, speeches, director, help, passport, print all fill their
  space and read well.
- **Mobile** — bottom tab bar, centered cards, responsive editor. Solid
  across the board.

---

## 2 · Genuine opportunities, ranked

### P1 — Elevate the empty / first-run states
The single consistent weak spot. On every "no site / no celebration
yet" tab (Guests, My sites, Registry, Analytics, Vendors, Payments,
Director, Reel) the empty state is a **plain dashed card** with a pear +
one line + a button, floating in a large calm-but-blank content area.
It's *fine* — but it's the **first thing a brand-new user sees on each
tab**, and it's the lowest-craft surface in a product whose data-rich
screens are beautiful. Opportunity:
- Give empty states the same craft as the home dashboard: a real
  composition, on-brand motif/illustration, a sentence of *what this
  becomes*, and a primary action that reads as invitation not error.
- Consider a consistent "empty-state" component so all ~8 read as one
  intentional family, not eight one-off dashed boxes.
- Fix the minor composition mismatch: the section heading is
  top-left-aligned while the card is centered — pick one axis.

### P2 — Graceful image loading on the published site
The renderer uses raw `<img>` in ~13 section-variant files (only
`gallery.tsx` uses `next/image`). With no blur-up / textured
placeholder, a slow or missing image is a **flat gap** — which reads as
"broken," exactly what the sandbox showed. On real connections this is
brief, but hero/gallery are the guest-facing money surface. Opportunity:
- A single shared image primitive with a paper-textured / blur-up
  placeholder and a graceful missing/error state (an on-brand motif, not
  a gray rectangle). Applies to hero, gallery, story, travel, memory
  book preview, and the dashboard "Your site" card.

### P3 — Review the published guest site on a real deploy
I was blind to it here. It's the most-seen surface (every guest lands on
it) and the one I have the least signal on. Fable should do a dedicated
pass on `/{occasion}/{slug}` with real photos: hero variants, gallery
layouts, section rhythm, mobile.

### P4 — Minor polish (low effort, do while nearby)
- **Desktop width use:** several dashboard screens hold content in a
  fixed central column; on ≥1440 there's room for two-column or wider
  compositions on the data-rich screens (home already does this well —
  extend the pattern to Guests/Registry/Vendors when populated).
- **Editor / store / decor density:** dense but acceptable; a breathing
  pass (spacing, grouping) wouldn't hurt.
- **`/faq`** renders as a demo-site preview ("Elena and Theo"), not an
  obvious FAQ page — confirm that route's intent.
- **Memory-book preview** shows solid color blocks pre-photos; fold into
  the P2 placeholder work.

---

## 3 · What to verify on a real deploy (blocked here)
- Published `/{occasion}/{slug}` with real hero + gallery imagery.
- The memory book with real guest photos.
- OG/share cards (`/api/og`) rendered by a real crawler.
- Any surface that depends on remote images loading.

---

## 4 · Bottom line for Fable 5
Don't rebuild — the foundation is strong and the brand system is
consistent. The highest-leverage design work is **making the
empty/first-run states as crafted as the populated ones** (P1) and
**making imagery degrade gracefully** (P2), then a **dedicated
published-site pass on a real deploy** (P3). Everything else is polish.

*Screenshots for this audit: parent session scratchpad
`audit/shots/*` (per-route) + `audit/*-sheet*.png` (contact sheets).
Regenerate with `audit/capture.mjs` — but capture with a plain load +
wait, NOT a transition-killing settle (see §0).*
