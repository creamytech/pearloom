# Building with Pearloom

Pearloom is "a craft house for memory" — editorial modernism on warm paper.
Three things must be true on every surface or it reads off-brand: a warm
**paper** ground (never flat white/black), **thread** as the visual atom
(the olive + gold `Thread` / `Divider` / `WeaveLoader`), and **Fraunces
letterpress** display type. Gold is punctuation only — a 1px hairline or a
single `Pearl`, never a fill. Say "Threading…", never "Loading…".

## Setup — no provider needed

Every component is self-contained and reads its color, type, and motion from
CSS custom properties defined in `styles.css`. There is **no ThemeProvider,
no wrapper, no context** to mount. Two steps:

1. Link `styles.css` once at the app root. It `@import`s every token
   (`_ds_bundle.css`) and the four webfonts (Fraunces, Geist, Geist Mono,
   Caveat) from Google Fonts — zero extra font setup.
2. Load the runtime bundle and read components off `window.Pearloom`
   (e.g. `window.Pearloom.Button`).

Light and dark (editorial midnight — warm, never OLED black) switch on a
`data-theme="light" | "dark"` attribute on a root element. All tokens
re-resolve automatically; you never hard-code a hex.

## The styling idiom — props + CSS variables, no utility classes

Pearloom ships **no class-name system** (no Tailwind, no BEM). You style two
ways, and only these two:

- **Component appearance → props.** Each component owns its looks through a
  small enum prop: `Button variant` (`ink · olive · paper · terra · ghost ·
  pearl`) + `size`; `Badge tone` (`olive · gold · plum · neutral · ink`) +
  `variant` (`label · pill`); `Monogram frame` (`plain · ring · crest ·
  wreath · diamond · interlock`); `Divider ornament`, `Motif name`,
  `Thread variant`. Read the component's `.prompt.md` / `.d.ts` for its axis.
- **Your own layout glue → `var(--pl-*)` custom properties**, never invented
  hexes. The vocabulary you'll reach for:

  | Need | Tokens |
  |---|---|
  | Paper surfaces | `--pl-cream`, `--pl-cream-card`, `--pl-cream-deep` |
  | Ink / type | `--pl-ink`, `--pl-ink-soft`, `--pl-muted` |
  | Brand voice | `--pl-olive` (+ `-deep`, `-hover`), `--pl-terra` |
  | Punctuation | `--pl-gold` (1px rules / single glyphs only), `--pl-plum` (destructive) |
  | Hairlines | `--pl-divider`, `--pl-divider-soft` |
  | Type families | `--pl-font-display` (Fraunces), `--pl-font-body` (Geist), `--pl-font-mono` (Geist Mono, uppercase tracked labels), `--pl-font-script` (Caveat) |
  | Shape | `--pl-radius-sm…2xl`, `--pl-radius-full` |
  | Depth | `--pl-shadow-xs…xl`, `--pl-shadow-focus` |
  | Motion | `--pl-dur-quick…slow`, `--pl-ease-out`, `--pl-ease-spring` |

  Friendlier semantic aliases also resolve: `--surface-card`,
  `--surface-page`, `--text-body`, `--text-heading`, `--text-muted`,
  `--accent-primary`, `--accent-punct`, `--accent-danger`.

Display headings are Fraunces, italic for the brand's voice; body is Geist;
editorial labels are **uppercase Geist Mono, tracked 0.16–0.28em**, usually
paired with a 1px gold rule (that's what `Eyebrow` and `Folio` already do).

## Where the truth lives

- `styles.css` and its one import, `_ds_bundle.css` — read these for the
  full token set with exact names and both light/dark values.
- `components/<group>/<Name>/<Name>.prompt.md` + `.d.ts` — per-component API
  and usage, the contract to code against.

## One idiomatic composition

```jsx
const { Card, Eyebrow, Button, Thread } = window.Pearloom;

<Card style={{ maxWidth: 360 }}>
  <Eyebrow>The ceremony</Eyebrow>
  <h3 style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic',
               fontSize: 28, color: 'var(--pl-ink)', margin: '10px 0 6px' }}>
    An evening woven by hand
  </h3>
  <p style={{ fontFamily: 'var(--pl-font-body)', color: 'var(--pl-ink-soft)',
              lineHeight: 1.6, margin: 0 }}>
    Join us beneath the olive trees to set the type on the day.
  </p>
  <Thread variant="single" style={{ margin: '16px 0' }} />
  <Button variant="olive" size="sm">Read the invitation</Button>
</Card>
```

Library components carry the design language; your own wrappers use
`var(--pl-*)` for every color, font, radius, and gap. If a surface has no
paper ground, no thread, or no Fraunces, it isn't Pearloom yet.
