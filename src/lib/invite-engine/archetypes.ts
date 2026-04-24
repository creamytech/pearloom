// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/archetypes.ts
//
// Invite archetypes — hand-tuned prompt recipes that turn the
// couple's event + palette + photo into a bespoke invitation.
//
// Each archetype is a self-contained world (Italian film poster,
// Kyoto winter, Tulum beach at dusk, etc). The recipe holds:
//   - a dense base prompt
//   - palette injection slots (colors pulled from vibeSkin)
//   - aspect & size recommendations
//   - whether it accepts a couple portrait for edits, or is
//     generation-only
//
// Adding a new archetype here instantly surfaces it in the
// InviteDesignerPanel grid. No UI code changes required.
// ─────────────────────────────────────────────────────────────

import type { ImageSize } from '@/lib/memory-engine/openai-image';

export type ArchetypeId =
  | 'art-deco'
  | 'italian-poster'
  | 'bookshop'
  | 'garden-table'
  | 'kyoto-winter'
  | 'tulum-dusk'
  | 'parisian-salon'
  | 'desert-heirloom'
  | 'highlands-manor'
  | 'riviera-noon'
  | 'midnight-observatory'
  | 'letterpress-classical';

export interface InviteArchetype {
  id: ArchetypeId;
  label: string;
  blurb: string;
  /** Whether this archetype supports the /v1/images/edits flow
   *  with a couple portrait input. Generation-only archetypes
   *  don't accept a photo. */
  supportsPortrait: boolean;
  /** Preferred output size (gpt-image-2 accepts all sizes in
   *  `ImageSize`). Portrait invites default to 1024×1536. */
  size: ImageSize;
  /** Base prompt. Accepts `{palette}`, `{names}`, `{date}`,
   *  `{venue}`, `{city}`, `{occasionLabel}` slots. Optional
   *  `{photoInstruction}` when supportsPortrait is true. */
  prompt: string;
  /** Which event types this archetype looks right on. Empty
   *  array = available everywhere. */
  fitsOccasions?: string[];
  /** Voice fit — matches EVENT_TYPES.voice. Used by the layout
   *  engine to rank archetypes for a given event. */
  fitsVoices?: Array<'celebratory' | 'intimate' | 'ceremonial' | 'playful' | 'solemn'>;
}

export const ARCHETYPES: InviteArchetype[] = [
  {
    id: 'art-deco',
    label: 'Art Deco',
    blurb: '1920s Manhattan, gold inlay, sunburst symmetry.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A 1920s Art Deco wedding invitation in portrait orientation. Strict bilateral symmetry. Geometric sunburst frame, stepped chevron borders, delicate gold line-work on a rich {palette.background} ground with {palette.accent} accents. Painted illustration (not photography). {photoInstruction} A slim serif title reads "{names}" in pressed gold foil at the centre, with "{date}" and "{venue}" in small capitals below on separate lines. Hairline rules flank the title. No exclamation marks. High detail on the ornamental borders. Grainy paper texture throughout. No modern typography, no sans-serif.`,
    fitsVoices: ['ceremonial', 'celebratory'],
  },
  {
    id: 'italian-poster',
    label: '1960s Italian Poster',
    blurb: 'Saturated riviera colour, hand-lettered, sun-drenched.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A hand-painted 1960s Italian film-poster style wedding invitation, portrait orientation. Sun-bleached saturated palette drawn from {palette}. Bold hand-lettered title reads "{names}" in a chunky italic display serif. "{date}" and "{venue}, {city}" in small elegant capitals underneath. {photoInstruction} Warm Mediterranean light, visible brushstrokes, minor paint-stain imperfections for character. Painted, not photographic. No modern UI, no grid.`,
    fitsVoices: ['celebratory', 'playful'],
  },
  {
    id: 'bookshop',
    label: 'The Bookshop',
    blurb: 'Warm lamplight, shelves behind, hand-bound feel.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A warm hand-illustrated scene of a cozy independent bookshop at dusk, portrait orientation. Deep honey-amber lamplight, walnut shelves lined with worn books, a small reading table with two chairs pulled close. {photoInstruction} The title "{names}" is painted above the scene in a gentle italic serif like a shop sign; "{date} · {venue}" runs along the bottom edge. Palette drawn from {palette} but leaning toward warm browns and candlelight amber. Painted illustration — visible brushwork, cozy rather than slick.`,
    fitsVoices: ['intimate', 'celebratory'],
  },
  {
    id: 'garden-table',
    label: 'Garden Table',
    blurb: 'Long dinner table under string lights, olive leaves, candles.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A painted overhead view of a long wooden dinner table set for an outdoor garden celebration at golden hour. Lush olive branches, taper candles in brass holders, vintage wine glasses, hand-written place cards. {photoInstruction} String lights catch the low sun above. Title "{names}" hand-lettered across the top in a flowing italic; "{date}" centred below in small capitals; "{venue}" at the base. Palette rooted in {palette}, leaning sage, terracotta, and warm cream. Painted illustration style, soft painterly edges, gentle grain.`,
    fitsVoices: ['celebratory', 'intimate'],
  },
  {
    id: 'kyoto-winter',
    label: 'Kyoto Winter',
    blurb: 'Snow, plum blossom, ink-brush restraint.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A minimal Japanese ink-wash wedding invitation in portrait orientation. Snow falling on a single plum-blossom branch, rendered in a few confident ink-brush strokes with subtle {palette.accent} wash. {photoInstruction} Generous negative space — 60% of the composition is quiet white paper. Title "{names}" set in a slender modern serif with precise kerning; "{date}" and "{venue}" in tiny restrained small-caps below. Rice-paper grain. Absolutely no clutter, no gradients, no decorative flourishes beyond the single branch.`,
    fitsVoices: ['ceremonial', 'intimate'],
  },
  {
    id: 'tulum-dusk',
    label: 'Tulum Dusk',
    blurb: 'Beach, low sun, palm silhouettes, pink-gold sky.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A painted beach-ceremony wedding invitation at dusk. Soft pink-gold sky fading to deep lavender, palm silhouettes on either side, a subtle driftwood arbor on a quiet sandy shore. {photoInstruction} The title "{names}" painted in a flowing modern italic script across the sky; "{date}" in small capitals below; "{venue}, {city}" at the base. Palette drawn from {palette} but emphasizing coral, plum, and sand. Painted illustration with visible brush texture, romantic without being saccharine.`,
    fitsOccasions: ['wedding', 'engagement', 'vow-renewal', 'welcome-party'],
    fitsVoices: ['celebratory', 'intimate'],
  },
  {
    id: 'parisian-salon',
    label: 'Parisian Salon',
    blurb: 'Hand-drawn interior, bouquet on a side table, tall windows.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A delicate hand-drawn ink-and-wash illustration of a Parisian salon interior — tall windows, an ornate mantel, a single bouquet of garden roses on a marble side table, sheer curtains lifting in light wind. {photoInstruction} Gold-leaf accents on the mantel and picture frames. Title "{names}" in a flowing copperplate-style script across the top; "{date} · {venue}" in small capitals beneath. Palette drawn from {palette}. Painted illustration, not photographic. Grainy warm cream paper.`,
    fitsVoices: ['ceremonial', 'intimate'],
  },
  {
    id: 'desert-heirloom',
    label: 'Desert Heirloom',
    blurb: 'Sedona palette, dried florals, aged vellum.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A sun-bleached heirloom wedding invitation inspired by Sedona and the Sonoran desert. Aged vellum-paper ground with deckle edges. Dried pampas, desert palms, and a single sprig of sage painted in soft dusty watercolor. {photoInstruction} Title "{names}" in a serif pressed into the paper — slight letterpress indentation. "{date}" and "{venue}" in small capitals below. Palette drawn from {palette} leaning terracotta, bone, rust, sage. Painted, visible deckle fibres, sunlit warmth.`,
    fitsOccasions: ['wedding', 'vow-renewal', 'anniversary'],
    fitsVoices: ['intimate', 'celebratory'],
  },
  {
    id: 'highlands-manor',
    label: 'Highlands Manor',
    blurb: 'Tartan whisper, thistle, stone manor at dusk.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A painted illustration of a Scottish highlands manor at dusk, stone facade softened by heather and thistle in the foreground. Low mist over rolling hills behind. {photoInstruction} Warm lamplight in one of the manor windows. Title "{names}" set in a bold carved-stone serif across the top; "{date}" centred; "{venue}" at the base. Palette drawn from {palette} leaning heather, moss, peat. Painted illustration, atmospheric, not slick.`,
    fitsVoices: ['ceremonial', 'intimate'],
  },
  {
    id: 'riviera-noon',
    label: 'Riviera Noon',
    blurb: 'Côte d’Azur blue, lemon trees, crisp stripes.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A bright hand-painted French Riviera wedding invitation at midday. Deep Mediterranean blue sea, pale cream stone terrace, lemon trees in terracotta pots, crisp navy-and-cream awning stripes along one edge. {photoInstruction} Title "{names}" set in an elegant italic serif with tight kerning; "{date} · {venue}" in small-caps below. Palette drawn from {palette} leaning Côte d'Azur blue, cream, citron yellow. Painted illustration with sun-bleached saturation. No umbrellas, no cliché beach props.`,
    fitsVoices: ['celebratory', 'playful'],
  },
  {
    id: 'midnight-observatory',
    label: 'Midnight Observatory',
    blurb: 'Ink-navy sky, gold constellations, vintage star chart.',
    supportsPortrait: true,
    size: '1024x1536',
    prompt: `A vintage celestial-observatory invitation in portrait orientation. Ink-navy background, gold-foil constellation map with delicately drawn star positions and fine rule grids. {photoInstruction} A compass rose in a lower corner. Title "{names}" in a slim modern serif like a star-chart label, rendered in cream ink across the upper third; "{date}" and "{venue}" small-caps below. Palette drawn from {palette} leaning midnight blue, cream, and antique gold. Painted star-chart style, slightly worn at the edges.`,
    fitsVoices: ['ceremonial', 'celebratory'],
  },
  {
    id: 'letterpress-classical',
    label: 'Letterpress Classical',
    blurb: 'Hand-pressed serif type, deckled cotton paper, no art.',
    supportsPortrait: false,
    size: '1024x1536',
    prompt: `A classical letterpress wedding invitation: cream-white deckle-edged cotton paper, a single pressed bouquet of tiny botanical line-drawings at the top, hand-pressed serif type throughout with visible debossed indentation on each glyph. No photography. Title "{names}" set in generous tracking at the centre in a classic romantic serif. "{date}" above; "{venue}, {city}" below in small capitals. Palette drawn from {palette} but deliberately quiet — ink on cream, with a single {palette.accent} detail. Razor-sharp type, subtle paper grain, nothing ornamental beyond the botanical sprig.`,
    fitsVoices: ['ceremonial', 'solemn', 'celebratory'],
  },
];

/** Filter archetypes that fit a given occasion + voice. */
export function archetypesFor(occasion?: string, voice?: string): InviteArchetype[] {
  return ARCHETYPES.filter((a) => {
    if (a.fitsOccasions && a.fitsOccasions.length && occasion && !a.fitsOccasions.includes(occasion)) {
      return false;
    }
    if (a.fitsVoices && a.fitsVoices.length && voice && !a.fitsVoices.includes(voice as never)) {
      return false;
    }
    return true;
  });
}

export function getArchetype(id: string): InviteArchetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}
