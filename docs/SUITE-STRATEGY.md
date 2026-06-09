# The Suite — themed guest touchpoints strategy (2026-06-09)

> How save-the-dates, invites, sharing, and RSVP become one themed
> system that beats Zola's paper business. Companion to
> MONETIZATION.md and AUDIT-2026-06-09-AI.md.

---

## 0 · The thesis

Zola's moat is *matching stationery*: pick a site theme, get
coordinating printed save-the-dates and invites. But their matching
is **template-deep** — a stock illustration family recolored, your
names typeset into someone else's design, photos dropped into a
fixed slot. Every couple with the "Eucalyptus" theme has the same
eucalyptus.

Pearloom's structural advantage: **the theme is a live design
system, not a template.** A pack carries palette + display face +
kit + motif + texture + monogram; the renderer composes them. That
means every guest touchpoint can be *generated* in the couple's
look — including AI art made from THEIR photos — rather than
selected from a catalog. Zola can't follow without rebuilding their
paper pipeline.

**The product promise: "One look, every surface."** Site, digital
save-the-date, invite, the iMessage link preview, the email, the
RSVP moment, the QR poster on the welcome table, the thank-you
card — all visibly the same made object.

## 1 · What already exists (the islands)

| Piece | State |
|---|---|
| Studio (`/dashboard/invite`, `pearloom/studio/`) | 5 card layouts + motif overlay, print preview, send overlay, 41/41 e2e. Inherits Site Look via `studio-defaults-from-look` (edition→layout, kit→motif, accent→palette, voice→tone). |
| Photo stylize (`/api/photos/stylize`) | gpt-image-2, face-preserving prompts, 4 styles (paper-craft, watercolor, embroidery, botanical). |
| InviteReveal (`invite/InviteReveal.tsx`) | Envelope-opening reveal animation (reduced-motion aware). |
| OG cards (`/api/og`) | Edition-aware, 28 occasion labels, dynamic Google-font loading. |
| Email theming (`lib/email-sequences.ts`) | Heading/body font + email-safe palette derivation. |
| Branded QR (SharePanel) | Monogram-overlaid QR, tone/shape options. |
| Print (`/api/print/checkout`, Lob) | Physical mail rail, payment-gated as of 2026-06-09: retail pricing + legacy credit + Stripe Checkout before any Lob submission. |
| Guest passport (`/g/[token]`) | Per-guest identity, personalized greeting, contributions. |
| Catalog | 70 packs · 10 kits · 36 motifs · 20 monogram frames · 19 faces. |

The gap is **not capability — it's unification.** Studio has its own
palette/tone vocabulary bridged from the Look; OG cards know
editions but not packs; emails derive their own theme; the RSVP
modal inherits site vars but the confirmation moment is generic;
the digital save-the-date sends as plain-ish email instead of as a
reveal experience.

## 2 · The architecture: one Suite contract

Create `src/lib/suite/` — a single **SuiteTheme contract** derived
once from the manifest:

```
suiteThemeFromManifest(manifest) → {
  palette (incl. email-safe + print-safe CMYK-ish variants),
  displayFont + bodyFont (+ Google Fonts href + embeddable buffers),
  motif, monogram (initials + frame), kit, texture, edition,
  occasion voice, photo set (cover + favorites),
  stylizedArt?: { url, style }   // the AI hero artwork, once made
}
```

Every artifact renderer consumes ONLY this: Studio cards, OG route,
email templates, RSVP confirmation, QR poster, print PDFs, the
reveal page. One derivation, no drift. (This is the same move that
fixed the editor-chrome tokens: a contract plus consumers.)

## 3 · AI-designed save-the-dates & invites (the killer feature)

**"Pear sets your table."** From gallery photos + event info, Pear
drafts a *suite* of 4–6 complete designs — not fills a template:

1. **Hero art**: photo-stylize the couple's chosen photo, with the
   style *derived from their pack* — Gilded Coupe → gilded deco
   illustration; Sakura Drift → watercolor wash; Noël Press →
   letterpress paper-craft. (Extend the 4 stylize prompts to ~10,
   keyed `pack.texture × pack.collection`; the face-preservation
   prompt engineering already works.)
2. **Composition**: a Claude pass (cheap, structured tool_use)
   reads event info + chapter mood and picks layout, motif
   placement, monogram frame, copy ("Save the evening of June 22"
   in the site's voice — solemn occasions get "Join us in
   remembering"). Composition uses the EXISTING Studio layout
   system + the SVG catalog — AI arranges real components, it does
   not hallucinate pixels. That keeps every output on-brand,
   editable, and print-crisp (SVG/typography stays vector).
3. **The pick moment**: Studio opens with "Pear pressed six
   proofs" — a proof sheet, tap to pick, fine-tune dials after.
   This is the screenshot moment for marketing.

Why this beats Zola: their designs are someone else's art with your
names. Ours are *your photos, made into art, arranged in your
site's exact design language* — and they can't be replicated by a
template catalog at any size.

## 4 · The digital save-the-date is an experience, not a JPEG

Send → guest receives a themed email (already-themed templates) →
taps → **the reveal page**: InviteReveal's envelope opens with
their wax-seal monogram, the loom thread draws across, the
stylized-art card settles in, "Dear Maya" (passport token), date +
add-to-calendar, all in the pack's palette/type. Per-guest links
already exist (`?g=` tokens). Pieces: InviteReveal + GuestPassport
+ SuiteTheme. New work is mostly composition + the seal animation.

Bonus: the same page IS the shareable unit for group chats — the
OG card for that URL is the stylized art (not the generic site
card), so the iMessage bubble is beautiful before anyone taps.

## 5 · RSVP as a themed moment

The form already inherits site vars. What's missing is the
*ceremony of the moment*:

- **Confirmation flourish**: on submit, the section's motif draws
  in (stroke animation), monogram stamps, "You're woven in." /
  preset-aware equivalents (memorial: "We'll hold a seat for
  you."). Themed add-to-calendar + "see who else is coming" if
  enabled.
- **Themed RSVP emails**: confirmation + reminder emails through
  the SuiteTheme (email-sequences already supports fonts/palette —
  wire the pack values, include the stylized art header).
- **The guest passport** (`/g/[token]`) inherits the full pack
  (today it's close but chrome-y): a guest's personal page should
  feel like a place setting at the couple's table.

## 6 · Sharing surfaces

- **OG cards: edition-aware → pack-aware.** `/api/og` already loads
  fonts dynamically; pass pack palette/face/motif so the link
  preview in iMessage/WhatsApp wears the theme. Highest
  leverage-per-line in this whole program — every shared link is
  marketing.
- **QR poster**: already monogrammed; route through SuiteTheme and
  offer table-tent / welcome-sign sizes from the same artwork
  (print-ready PDFs).
- **Share kit**: SharePanel grows a "share kit" — pre-sized themed
  images (story 9:16, square, banner) generated from the suite for
  hosts to post. Zero marginal design effort once the Suite
  renderer exists.

## 7 · Print: where the money is

Zola's paper is the business; ours can be too, with a structural
cost advantage (no design catalog to license — the suite renderer
emits print PDFs from the same contract):

- Studio already has print preview; Lob rail exists for mailing.
- **SKUs**: printed save-the-dates, invites + RSVP cards, day-of
  set (programs/menus/place cards — the Tasting Menu kit IS a menu
  design system already), thank-you cards using the stylized art.
- **Plan hooks** (extends MONETIZATION.md): digital suite included
  with Atelier; Legacy includes a print credit; à-la-carte print
  for everyone. "Matching paper, pressed from your site, mailed
  for you" — one tap from the editor.

## 8 · Build order (each phase ships value alone)

| Phase | What | Size |
|---|---|---|
| 1 | `lib/suite` SuiteTheme contract + wire OG cards pack-aware + themed save-the-date/RSVP emails | 1–2 sessions |
| 2 | Reveal experience: envelope + seal + per-guest reveal page; share OG = stylized art | 1–2 sessions |
| 3 | Pear's proof sheet: stylize-style expansion (pack-keyed prompts) + composition pass + Studio "six proofs" entry | 2–3 sessions |
| 4 | RSVP confirmation flourish + passport theming | 1 session |
| 5 | Share kit (pre-sized themed images) + QR poster sizes | 1 session |
| 6 | Print SKUs: Lob checkout + retail pricing + legacy credit — **✅ shipped 2026-06-09** (`/api/print/checkout` + `print_order_intents` + Stripe webhook fulfillment; prices in MONETIZATION.md §6). PDF suite renderer still pending. | 2–3 sessions |

## 9 · Why this wins

1. **Personal at a depth templates can't reach** — their photos as
   art, their site's exact design system, their guest's name on the
   envelope.
2. **Coherence as the brand** — one look across site, message
   bubble, inbox, RSVP, table signage. Nobody else's stack is
   unified enough to promise this.
3. **Speed** — Zola: browse 500 templates. Pearloom: "Pear pressed
   six proofs from your photos" in 30 seconds.
4. **A real margin business** at the end (print) that the digital
   coherence funnels into naturally.
