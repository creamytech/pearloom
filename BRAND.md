# Pearloom — Brand Bible v1

*The writing here is the contract. Components, copy, motion, and color
all defer to this document. If a surface contradicts the bible, the
surface is wrong.*

---

## 1 · What Pearloom is

A craft house for memory.

We do not sell wedding-site templates. We weave bespoke artifacts for
the days that matter — AI-drafted, hand-edited, letterpress-finished.
A Pearloom site is a single, made object, not a slot in a gallery.

Our nearest cultural references are Hermès, Penguin Classics editions,
master letterpress shops, and Linear. Our furthest are template
marketplaces, Canva, and any product that puts "AI-powered" above the
fold.

## 2 · The metaphor

*Pear* — warm, organic, alive.
*Loom* — woven, patient, made by hand.

Every Pearloom verb sits inside this metaphor:

- Sites are **woven**, not built.
- Loaders are **threading**, not spinning.
- Pages are **leafed**, not scrolled.
- Drafts are **basted in**, not generated.
- Saves are **set**, like type.
- Publishes are **pressed**, like a print run.

Use the verb that fits the metaphor unless it makes the sentence
worse. Never sacrifice clarity for theme.

## 3 · The three things you should notice in two seconds

1. **Paper texture under everything.** A real warm grain — quiet
   enough to read through, loud enough to feel. Applied as a fixed
   underlay across every surface.
2. **Thread as the visual atom.** A two-strand olive + gold thread
   shows up as dividers, loaders, hover rails, focus accents,
   transition flourishes. Once a reader sees it three times, they
   know they're in a Pearloom product.
3. **Letterpress display type.** Variable Fraunces with a soft inset
   shadow on display sizes so the glyphs feel pressed *into* the
   paper, not floating on top.

If a surface ships without at least two of these, it isn't on-brand.

## 4 · Type voice

| Role     | Family                           | Axes (Fraunces)                       |
|----------|----------------------------------|---------------------------------------|
| Display  | Fraunces (italic preferred)      | opsz 144, SOFT 80, WONK 1             |
| Heading  | Fraunces (upright OK)            | opsz 96,  SOFT 50, WONK 0             |
| Body     | Geist                            | —                                     |
| Mono     | Geist Mono                       | — (used for editorial labels)         |

Mono labels are **always** uppercase, tracking 0.18–0.28em, 9–11px.
Pair with a 1px gold rule on the leading or trailing edge.

Display copy almost always wears the `.pl-letterpress` utility on
light surfaces.

## 5 · Color

Cream paper ground (`--pl-cream`). Ink (`--pl-ink`) for type. Olive
(`--pl-olive`) is the brand voice. Gold (`--pl-gold`) is the
punctuation — never a background, almost always a 1px hairline or a
single glyph. Plum (`--pl-plum`) is destructive only.

P3-capable displays get the wide-gamut `oklch()` versions of olive,
gold and plum automatically. SRGB hex fallbacks are kept for SVG and
data consumers.

## 6 · Motion

The motion language is **weaving**. Things don't fade in — they thread
in. Two threads grow from a center point, then content settles
between them.

| Token              | Use                                              |
|--------------------|--------------------------------------------------|
| `--pl-ease-out`    | Defaults for chrome                              |
| `--pl-ease-spring` | Buttons, tap states, primary CTA                 |
| `pl-weave` keyframe| Loaders, dividers entering, signature reveals    |
| GooeyText filter   | Rotating editorial words (rare; one per surface) |
| KineticHeading     | Display headings linked to scroll progress       |

Always honour `prefers-reduced-motion`.

## 7 · Microcopy

**The governing rule: clarity first.** A first-time host — including
someone older or not technical, planning an anniversary or a
memorial — must never decode a word to do a task. When the craft
verb and the plain word compete, the plain word wins. (Updated
2026-07-08: the craft metaphor is a *flourish*, not the working
language. It earns its place in the marketing hero, the footer
signature, and a few designed brand moments — never in the buttons,
forms, empty states, errors, or instructions a host uses to get
something done.)

**The positioning line is plain:** "Beautiful websites for weddings
and life's big days — plus everything to run them." Never
"operating system", "the OS for events", or any tech-founder
framing. Warm phrases like *the days that matter* are fine; product
jargon is not.

- **Say what the button does, in words everyone knows.** "Create
  your site", "Get started", "Add a guest", "Publish", "Save",
  "Send invitations" — not "Begin a thread", "Weave a site", or
  "Press it". Verb-first, sentence case.
- **Empty states name the gap and the next step, plainly.** "Nothing
  here yet — add your first guest." Not "Nothing yet. Begin a
  thread." (The old `<EmptyState/>` key is retired.)
- **Loaders may keep one small flourish** ("Threading…") *only* where
  a spinner blocks nothing and the word is a wink, never where a
  host is waiting on a result they need — there "One moment…" /
  "Saving…" / "Publishing…" is clearer. When in doubt, plain.
- **Never** say "AI-powered" or "AI-generated". Pear is a person:
  "drafted by Pear", "Pear's draft". **Retire "basted in"** — say
  "added" or "drafted".
- **Control labels are plain words.** Pickers, rails, tabs, and
  field labels name the thing a first-time host already has a word
  for: *Colors*, *Menu*, *Spacing*, *Paper*, *Opening*, *Pages* —
  never *Palette*, *Nav variant*, *Density*, *Hero*, *Kit*,
  *Edition* as labels. (Internal ids and manifest fields keep the
  precise names; only the label simplifies.)
- **Where craft language still lives:** the landing hero headline,
  the email "Woven with care by Pearloom" signature, the sealed-
  envelope arrival, the press/publish *moment* — designed places a
  host lingers, not the controls they operate. One woven word in a
  headline is a signature; a woven word on a button is a barrier.

## 8 · The brand primitives

These live under `src/components/brand/` (and the shared chrome
atoms under `src/components/shell/`). Use them. If a surface needs
something close to them, extend them — don't fork.

| Primitive         | Lives at        | Replaces                                   |
|-------------------|-----------------|--------------------------------------------|
| `<Thread />`      | brand/          | `<hr>`, divider lines, rule strokes        |
| `<WeaveLoader />` | brand/          | Every spinner / `Loader2` / `animate-spin` |
| `<Folio />`       | brand/          | Page numbers, chapter marks, "Edition 01"   |
| `<GooeyText />`   | brand/          | Rotating word UIs                          |
| `<PearloomMark />`| brand/          | Logo glyph                                 |
| `<EmptyState />`  | shell/          | "No data" / "Empty list" panels            |
| Pear glyph set    | pearloom/motifs | Mascot, sparkles, sprigs, pearl dots       |

## 9 · The layered chrome rule

Every screen is composed of exactly three layers, top-down:

1. **The grain** (`.pl-grain` or the global underlay) — fixed, warm,
   never animated.
2. **The paper** — surface color from the cream / ink token family.
3. **The ink** — type, dividers, controls.

Glass is the material of floating chrome — and ONLY floating
chrome: toasts, command palettes, bottom sheets, popovers, docks
riding over a live site, the wizard's sticky header. One recipe,
everywhere: the `--pl-glass*` tokens + `.pl-glass-surface`
utilities (globals.css), which frost warm cream in light mode and
editorial midnight in dark. Glass never becomes a SURFACE —
dashboards, editor panels, and cards stay paper. If a glass
element stops floating over content, it has stopped being chrome
and must go back to paper.

## 10 · Out of scope

- Neon. Holograms. Glassmorphism gradients. Floating gradient blobs.
  Anything that reads "AI startup".
- Sans-serif display headings. Fraunces is not optional.
- Symmetrical full-bleed photographs without a hairline frame.
- Confetti. Emoji peppered through copy. Toast bombs.
- Dark mode that drops the warmth — our dark mode is *editorial
  midnight*, not OLED black.

## 11 · How to extend the bible

Add a section. Keep it specific. If a rule needs more than one
sentence to justify, it isn't a rule yet.
