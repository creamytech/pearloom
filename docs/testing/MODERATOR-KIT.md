# The moderator kit — Pearloom mass user testing

> Companion to `docs/PERSONA-PLAN.md` §5 (the readiness gate and
> protocol live there; this is the in-session material). One page
> per persona. Authored 2026-07-08 (S9).

## Before every session

- Staging environment, never prod. The tester signs up fresh —
  **the wizard is the seed script**: task 1 builds their world in
  ~20 seconds, which is itself the first measurement.
- Reset between sessions = delete the tester's site(s) from the
  dashboard (and the account if reusing the email).
- Open `whispers_feed` and `first_session_funnel` (Supabase) in a
  tab — the whisper pill and funnel events are live during the
  session.
- Seeded worlds for warm-up or comparison: `/demo` (wedding),
  `/demo/birthday`, `/demo/anniversary`, `/demo/bachelorette`,
  `/demo/memorial`, `/demo/quinceanera`.
- Their device, not yours. Phone personas stay on the phone.

## The screener (recruit 5–6 per archetype)

Ask: (1) Have you planned — or are you planning — a real event of
this kind in the last/next 18 months? (2) What did/would you use?
(3) Comfort rating 1–5 with "making things on the internet."
Recruit across the comfort range, not just 4–5s.
**Memorial archetype: recruit someone who has PREVIOUSLY organized
a memorial (≥1 year past), never someone currently grieving.
Compensate above standard. Offer breaks. The moderator may end the
session at any sign of distress.**

## The five tasks (every persona, in their occasion)

1. **Make it.** "Make a site for your ‹event› from nothing." —
   measure time-to-Review, drop-off step, whether they read the
   proof.
2. **Make it yours.** "Change it until it feels like yours." —
   watch for the first five minutes stall; note what they try to
   change first and whether they find the knob.
3. **Send it.** "Publish it and get the link to your people." —
   measure press→copied-link time; note whether the share moment
   reads as done.
4. **Reply to it.** On a second device (or the moderator's), open
   the shared link and RSVP as a guest. — count taps; note any
   hesitation at the name step.
5. **Who's coming?** Back as the host: "Find out who has replied."
   — note the path they take (dashboard vs editor vs guessing).

Always end with: *"Would you send this link to your people today?
If not, what's missing?"* — write the answer verbatim.

## The observation sheet (one per task)

| Field | Note |
|---|---|
| Task # + start/stop time | |
| Completed? (full / partial / abandoned) | |
| Stall points (>10s silence — quote what they said after) | |
| Words they used for things (their noun vs ours) | |
| Tone incidents (anything that made them wince) | |
| Whisper pill used? (they found it unprompted = signal) | |

## Per-persona notes

- **Maya & Jordan (wedding, desktop+phone):** watch the Review
  proof — do they scroll it? Do they trust it? Task 2 goes deep:
  they will try fonts/colors/layouts; note the first dead end.
- **Tyler (21st, phone only):** speed is the whole test. If any
  single screen holds him >30s, that screen failed. Watch the
  claim moment if he balks at the account sheet.
- **Linda & Robert (40th, iPad, text bumped):** read-aloud
  encouraged. Watch for fear ("did I break it?"), the saved-state
  question, and whether "Nothing is public until you publish"
  lands. Task 5 is her real life — she'll do it weekly.
- **Priya (bachelorette, laptop):** she compares against her
  spreadsheet. Note every time she says "can it also…" — that's
  the S-backlog. Multi-day schedule and cost expectations matter.
- **Denise (memorial, laptop, evenings):** the moderator reads the
  care note above FIRST. Tone incidents are P0 bugs. Watch the
  wizard's "Tell me about it" step — is writing about her mother
  in a form bearable? Does the proof read gently?
- **Marcus (quinceañera, Android):** bilingual reading — hand the
  published site to a Spanish-preferring family member if present
  (the guest language switcher exists; watch if anyone finds it).

## Exit bar (from PERSONA-PLAN §5)

≥80% task completion across personas · wizard→publish ≥60%
in-session · zero tone incidents on solemn flows · the verbatim
answers to the closing question reviewed as a set.
