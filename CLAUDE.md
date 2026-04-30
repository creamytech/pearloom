@AGENTS.md
@BRAND.md
@CLAUDE-DESIGN.md
@CLAUDE-PRODUCT.md

## Active focus

> The Stop hook in `.claude/settings.json` reads this section to
> decide whether to auto-continue. Edit or delete the heading to
> pause the loop without touching settings.

**Goal — current sprint:** finish the Studio (stationery editor)
that replaced `InviteDesigner` at `/dashboard/invite`. Wire the
remaining loose ends, exercise it with Playwright, ship.

**Direction:**
- Default to action over planning. Auto mode is on.
- After UI changes, run `npm run test:e2e` before reporting done.
- Type-check (`npx tsc --noEmit -p .`) must pass before commit.
- Don't push to `main` without explicit user approval.

**Open Studio threads:**
- Smoke test that flips through all three stationery types,
  Front/Back/Envelope, picks one of Pear's drafts, and verifies
  the canvas updates.
- Test the AI generation paths (`/api/studio/draft` and
  `/api/studio/asset`) with mocked Gemini responses.
- Confirm Send overlay reaches `/api/invite/guest` and stamps
  `email_sent_at` in the DB.

**Counts as done:**
- All Studio tests pass locally (`npm run test:e2e`).
- Type-check clean.
- Tests + commit on main; user pushes.

**What to skip:**
- Style polish on legacy components.
- Dashboard pages not in the Studio flow.
- Anything outside `/dashboard/invite` for this sprint.
