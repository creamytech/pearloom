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

**The next sprints are already written:** `docs/PERSONA-PLAN.md`'s
nine sprints (S1–S9) are all SHIPPED (2026-07-08) — nothing left to
arm there. The live queue is now `docs/GRAND-PLAN-2.md` (2026-07-08):
one card system for the dashboard, a lightweight Weekend Builder
rethink, and Circle rebuilt as a real (simple) social network — ten
ready-to-paste sprint blocks (A.1–A.2, B.1–B.2, C.1–C.6, ranked) at
§7. Paste a block over this heading to arm one; §8 gives the
recommended order.
