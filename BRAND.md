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

- **Never** say "AI-powered". Pear is a person, not a product.
- **Never** say "Loading…". Say "Threading…".
- **Never** say "No data" or "Empty". Say "Nothing yet. Begin a
  thread." (or context-specific equivalent in the same key).
- **Never** say "Generated". Say "drafted" or "basted in".
- **Never** say "AI-generated". Say "drafted by Pear".
- Buttons name the action verb-first, lowercase except first letter.
  ("Begin a thread", not "Get Started Now!").

## 8 · The brand primitives

These live under `src/components/brand/`. Use them. If a surface needs
something close to them, extend them — don't fork.

| Primitive         | Replaces                                       |
|-------------------|------------------------------------------------|
| `<Thread />`      | `<hr>`, divider lines, rule strokes            |
| `<WeaveLoader />` | Every spinner / `Loader2` / `animate-spin`     |
| `<Pull />`        | Hand-styled blockquotes                        |
| `<Folio />`       | Page numbers, chapter marks, "Edition 01"       |
| `<EmptyState />`  | "No data" / "Empty list" panels                |
| `<GooeyText />`   | Rotating word UIs                              |
| `<KineticHeading/>`| Scroll-linked display headings                |
| `<AmbientNav />`  | Marketing + dashboard top chrome               |
| `<PearloomMark />`| Logo glyph                                     |

## 9 · The layered chrome rule

Every screen is composed of exactly three layers, top-down:

1. **The grain** (`.pl-grain` or the global underlay) — fixed, warm,
   never animated.
2. **The paper** — surface color from the cream / ink token family.
3. **The ink** — type, dividers, controls.

Glass / blur surfaces are reserved for floating chrome (toasts,
modals, ambient nav). Dashboards and editor panels stay paper.

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
