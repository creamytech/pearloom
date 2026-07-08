# ONBOARDING-PLAN.md — "The First Pressing of You"

> **The signup → first-session experience, designed as one continuous
> craft moment.** Companion to `SOCIAL-PLAN.md` (the circle feeds it
> and is fed by it) and the 2026-07-08 auth redesign (the login is the
> pressed invitation; `ThreadingDoor` is the threshold). Drafted
> 2026-07-08, owner-requested: "a beautiful onboarding experience
> where they pick their profile picture — an amazing system for
> getting started with Pearloom."

---

## 0 · The thesis

Onboarding is not a form before the product. **It is the first thing
Pearloom presses — and the thing it presses is you.** The same craft
sequence a site gets (paper → type → mark → seal), applied to the
person: your name set in letterpress, your mark chosen or pressed for
you, your people waiting, your first thread begun.

What exists today (`/welcome`, 2026-06-11): five movements — arrival,
name, orchard-mark picker, occasion intent, the agreement. The bones
are right (one sheet of paper, Enter-to-advance, everything skippable
except the agreement). What's missing: the **pressed vocabulary** the
rest of the product now speaks, a real **profile picture** (photo, not
only the 12 SVG marks), the **circle** (S1 shipped — people can now be
waiting for you when you arrive), and a **personalized arrival** for
the most common future path in: *you were invited*.

The journey it must complete, end to end with no seams:

```
invitation (login page, midnight + pressed card)
  → ThreadingDoor ("Threading you in.")
    → THE FIRST PRESSING (this plan)
      → ThreadingDoor ("Warping your loom.")
        → wizard (intent pre-filled) · or dashboard (explorers)
```

## 1 · The design laws (inherited, plus two)

All of BRAND §7 and the wizard's rules apply (skippable ≠ ignorable,
minimum-press timing, reduced-motion honored). Two laws specific here:

1. **Collect only what the first hour needs.** Name, mark, agreement.
   Everything else is *earned in context* (dietary at first RSVP, voice
   at first draft, city when travel matters). Onboarding that asks for
   ten fields is a form; three is a welcome.
2. **Nobody leaves blank.** Every skippable step has a beautiful
   default already made from what we know: skip the mark and you carry
   a letterpress **monogram seal** pressed from your name — not a gray
   silhouette.

## 2 · The movements

Each movement is one title-page-scale question on the pressed sheet
(the wizard's Fraunces `pl-type-press` scale), weave-wipe transitions,
Enter-to-advance.

### M1 — The arrival (personalized when possible)
- Cold signup: the sheet arrives under the two threads with a postmark
  carrying today's date. Copy: "A place at the loom, kept for you."
- **Invited arrival** (guest claim-link or an S1 circle invite — the
  email-keyed `people` row resolves on first sign-in): the sheet is
  *addressed*: "Maya — **Shaun & Scott** are keeping you a seat." The
  inviter's first name comes from `pendingIncoming` / the guest row;
  first-names-only contract holds.

### M2 — Your name
"What should Pear call you?" — the input IS the artifact: the name
letterpresses into the sheet as they type (live `pl-type-press` on the
preview line, the wizard's live-pressing pattern). Writes
`user_preferences.display_name` (existing).

### M3 — Your mark  *(the profile-picture system — the heart of this plan)*
One frame, three ways to fill it, shown as a wax-seal-sized roundel:
- **A photograph** — upload → circular frame → **the Reframe drag**
  (shipped 2026-07-08; same focal-point mechanics, round mask) to seat
  the face. Stored via a new `POST /api/user/avatar` (R2, downscale to
  512px, EXIF stripped) → new `user_preferences.avatar_url`.
- **An orchard mark** — the existing 12 tinted SVG marks (kept; they're
  loved and they're private-by-design for people who won't upload a
  face).
- **The monogram seal** — the zero-effort default, already pressed
  from M2's name before they touch anything: the initial(s) in
  letterpress Fraunces inside a `DEBOSS_SEAL` roundel in their chosen
  tint. Skipping M3 means keeping this, and it looks *made*, not
  missing.

**Fallback chain (product-wide, replaces mark → photo → initials):**
`avatar_url` → orchard mark → monogram seal. The mark propagates
everywhere a person appears: topbar, sidebar, settings, co-edit
presence, circle chips (mutual-only), message threads, guest passport.

### M4 — Your people  *(new — the S1 payoff)*
- If `pendingIncoming > 0`: the requests render as **sealed envelopes**
  ("Scott would keep you in his circle") — accept/decline right here,
  the ArrivalReveal's seal-break in miniature. This is the moment the
  invite funnel (SOCIAL-PLAN S5) lands: arriving because someone wove
  you in should *feel* like being awaited.
- Else: one quiet line — "Your circle grows as you celebrate. Nothing
  to do yet." — auto-advances. Never a hollow step.

### M5 — Your first thread
The intent step, upgraded from chips-only: picking an occasion presses
a **live miniature** of a site in that key beside the chips (the
wizard's `WizardStructureSection` pressing at postcard scale, seeded by
occasion defaults) — "this is what we'll make together." Keeps the
"just looking" door → `/demo`. Writes `user_preferences.intent`
(existing; the wizard already pre-fills from it).

### M6 — The agreement (the only gate — unchanged in substance)
Restyled as **signing the colophon**: the Terms/Privacy line and the
three product promises set as a printer's colophon at the sheet's
foot; the checkbox becomes pressing a small wax seal (the wizard
Review's seal, quarter scale). Consent stamps stay server-side
(`onboarded_at`, `terms_accepted_at` — untouched).

### M7 — The handoff
"The loom is yours." → `ThreadingDoor` with label "Warping your loom."
→ `/wizard/new` (intent pre-filled) or `/dashboard` for explorers.

## 3 · Build phases

| Phase | Scope | Est. |
|---|---|---|
| **O1 — the mark system** — **SHIPPED 2026-07-08** (code; prod migration pending an authed session) | Migration `20260708_avatar_url.sql` (⚠ NOT yet applied to prod — Supabase MCP was unauthenticated; apply + record before the feature is live); `POST/DELETE /api/user/avatar` (sharp rotate+resize 512², metadata dropped, R2 under hashed-email keys, 10/hr cap); `MonogramSeal` + `AccountMark` (the chain: photo → mark → sign-in image → seal) in avatars.tsx; `useUserAvatar` carries `avatarUrl` (picking a mark retires the photo); Settings → Account grew "Upload a photograph" with `AvatarCropModal` (circular drag-to-seat, client-side canvas crop strips EXIF before upload); chrome swapped to AccountMark (dash topbar, sidebar menu, editor topbar, settings header). The preferences GET now merges sparse rows over defaults so a minimal avatar-first row can't null out voice/autonomy. | 1 session |
| **O2 — the flow re-pressed** — **SHIPPED 2026-07-08** | WelcomeFlowClient re-pressed: M2 the input IS the artifact (the name letterpresses live at display scale over a gold hairline); M3 the three-way mark frame (photograph via AvatarCropModal → /api/user/avatar immediate save + chrome-cache sync, orchard marks, and the monogram seal shown ALREADY PRESSED — "Keep my seal" is the default CTA; photo↔mark retire each other, same rule as Settings); M5 the live miniature pressing beside the intent chips (7 per-intent pressings — eyebrow/pre-line/ghost/accent — re-pressing on every pick, so "Pear sets the table differently" is shown, not claimed); M6 the colophon ("Set & pressed by Pearloom · Edition of one", gold-ruled) signed by PRESSING YOUR SEAL — a real role=checkbox, the wax fills with your monogram; M7 both exits leave through ThreadingDoor ("Warping your loom."). Done-step face renders AccountMark. `/dev/welcome` harness added; walked end-to-end via Playwright. | 1–2 sessions |
| **O3 — the awaited arrival** | M1 addressed sheet + M4 sealed-envelope requests (reads `pendingIncoming`; S1 is shipped so this is UI only); claim-context from guest rows. | 1 session |

Sequencing: **O1 → O2 → O3.** O1 first because the mark chain touches
the whole product and everything else composes on it.

**Blocker to flag:** the O1 migration needs prod apply via the
Supabase MCP, which is unauthenticated in the current session — apply
`avatar_url` when building O1 from an authed session (and record in
`_pearloom_migrations`).

## 4 · What this deliberately does NOT do

- No bio, pronouns-at-signup, location, birthday, interests — context
  earns those later (law 1). Settings already holds pronouns/timezone
  for those who want them.
- No contact import at onboarding (SOCIAL-PLAN S5 handles it later,
  consent-first).
- No "complete your profile 60%" meter — completion anxiety is
  engagement-bait (SOCIAL design law 7).
- No forced tour of the dashboard. The product teaches in place (Pear
  suggests, the golden-thread chip, the checklist).

---

*Living doc — stamp phase status as each ships, like SOCIAL-PLAN.md.*
