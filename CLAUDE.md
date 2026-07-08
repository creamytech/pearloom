@AGENTS.md
@BRAND.md
@CLAUDE-DESIGN.md
@CLAUDE-PRODUCT.md

## Sprint paused — awaiting user direction

> The Stop hook in `.claude/settings.json` greps for the literal
> heading that names the sprint focus; renaming this heading
> here pauses the autoloop without touching settings. Restore
> the sprint heading (and a goal / threads / done-criteria
> block) to resume.

**Last sprint (Studio / stationery editor at `/dashboard/invite`)
landed 2026-05-31:**
- All three open threads green: smoke flow across stationery
  types/views/drafts, AI generation paths mocked + asserted,
  Send overlay → `/api/invite/guest` → `email_sent_at` stamp.
- Studio e2e suite 41/41 passing locally. Type-check clean.
- Last commits on `main`: `bf2c3eb3` (EditionPicker prototype
  theme-pack card), `ad77fbb0` (Studio: skip the spurious
  mount-time autosave — closed the flaky AI-asset round-trip
  test). User push pending.

**To start the next sprint:** rename the heading on line 6 back
to the literal sprint-focus heading that the Stop hook greps
for, and fill in goal / direction / open threads /
counts-as-done / what-to-skip in the same shape as before.

**Both prior sprint queues are fully executed** (2026-07-08):
`docs/PERSONA-PLAN.md` S1–S9 and `docs/GRAND-PLAN-2.md` A.1–A.2 /
B.1–B.2 / C.1–C.6 are all stamped SHIPPED — nothing left to arm in
either. All four 2026-07-08 migrations (person_threads, avatar_url,
circle_invites, crew_threads) are applied to prod and recorded;
advisors clean.

**The next plan is written and ready:** `docs/AFTERGLOW-PLAN.md`
(2026-07-08) — the post-event dashboard revamp. Five phone
screenshots of a wedding 11 days past showed every cockpit card
still in planning mode ("FINAL STRETCH", "The big day · 0 days
out", prep checklists, "SAVE THE DATE"); the root cause is that no
shared phase model exists — each card does ad-hoc clamped date
math. The plan carries the evidence table (§1), the
`cockpit-phase.ts` phase spine design (§3: planning / final /
the-day / afterglow / kept), the per-card behavior matrix (§3.1),
the afterglow richness upgrades (§4), guardrails (§5), and FOUR
ready-to-paste sprint blocks at §6 (AG.1 phase spine → AG.2
afterglow home → AG.3 hero + memory → AG.4 long view; recommended
order at §7). Paste a block from §6 over this heading to arm one.
Open decisions live in §8 (afterglow→kept window, memorial tone).
