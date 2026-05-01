// ──────────────────────────────────────────────────────────────
// Venue motifs — heuristic dictionary that derives 3-5 illustrated
// motifs from a venue string. Used by DecorLibraryPanel to surface
// "Pear suggests" chips for the AI decor library.
//
// Keyword-based on purpose: instant, no network call, no LLM
// roundtrip. The match is keyword-OR — every keyword that hits
// contributes its motifs, deduped + capped. If nothing matches,
// returns null and the UI falls back to a generic prompt.
//
// To add a new venue archetype: pick keywords + 4-6 motifs that
// would look beautiful as hand-drawn ornaments. Keep prompts
// short, concrete, no adjectives like "elegant" or "romantic".
// ──────────────────────────────────────────────────────────────

export interface VenueMotif {
  id: string;
  /** UI chip label — what the user sees. */
  label: string;
  /** The exact prompt string used for the AI library when this
   *  motif is applied. Should describe the *subject* only — the
   *  prompt builder layers in palette + style. */
  prompt: string;
}

interface VenueArchetype {
  keywords: string[];
  motifs: VenueMotif[];
}

const ARCHETYPES: VenueArchetype[] = [
  {
    keywords: ['joshua tree', 'desert', 'mojave', 'sonoran', 'sedona', 'palm springs'],
    motifs: [
      { id: 'jtree', label: 'Joshua tree', prompt: 'a single Joshua tree silhouette, hand-drawn, in the palette accent' },
      { id: 'cactus', label: 'Cactus cluster', prompt: 'a cluster of three saguaro and barrel cacti, hand-drawn' },
      { id: 'low-sun', label: 'Low desert sun', prompt: 'a low desert sun with simple ray lines, hand-drawn' },
      { id: 'sage-sprig', label: 'Sage sprig', prompt: 'a sage sprig with three leaves, hand-drawn, fine line' },
      { id: 'agave', label: 'Agave', prompt: 'an agave plant, hand-drawn, geometric leaves' },
    ],
  },
  {
    keywords: ['vineyard', 'tuscany', 'napa', 'sonoma', 'cypress', 'tuscan', 'olive grove', 'winery'],
    motifs: [
      { id: 'cypress', label: 'Cypress trees', prompt: 'three slender cypress trees, hand-drawn, in profile' },
      { id: 'olive-sprig', label: 'Olive sprig', prompt: 'an olive sprig with five leaves and two olives, hand-drawn' },
      { id: 'grapes', label: 'Grape cluster', prompt: 'a small grape cluster on a single stem, hand-drawn' },
      { id: 'amphora', label: 'Terracotta amphora', prompt: 'a terracotta amphora silhouette, hand-drawn' },
      { id: 'lavender', label: 'Lavender', prompt: 'a lavender stalk, hand-drawn, fine line' },
    ],
  },
  {
    keywords: ['beach', 'coastal', 'oceanfront', 'seaside', 'malibu', 'big sur', 'cape', 'shore', 'island', 'marfa'],
    motifs: [
      { id: 'wave', label: 'Cresting wave', prompt: 'a cresting wave with a single curl, hand-drawn, fine line' },
      { id: 'seashell', label: 'Seashell', prompt: 'a single scallop seashell, hand-drawn' },
      { id: 'palm-frond', label: 'Palm frond', prompt: 'a single palm frond, hand-drawn, in profile' },
      { id: 'driftwood', label: 'Driftwood', prompt: 'a piece of driftwood, hand-drawn, weathered grain' },
      { id: 'sea-bird', label: 'Sea bird', prompt: 'a sea bird in flight silhouette, hand-drawn' },
    ],
  },
  {
    keywords: ['mountain', 'alpine', 'peak', 'aspen', 'telluride', 'banff', 'rockies', 'ski', 'cabin', 'lodge'],
    motifs: [
      { id: 'pine', label: 'Pine trees', prompt: 'three slender pine trees, hand-drawn, in profile' },
      { id: 'peak', label: 'Mountain peak', prompt: 'a single mountain peak silhouette, hand-drawn' },
      { id: 'pinecone', label: 'Pine cone', prompt: 'a single pinecone, hand-drawn, fine line' },
      { id: 'snow-flurry', label: 'Snow flurry', prompt: 'a small snow flurry of three flakes, hand-drawn' },
      { id: 'antler', label: 'Antler sprig', prompt: 'a single antler branch, hand-drawn, fine line' },
    ],
  },
  {
    keywords: ['barn', 'farm', 'ranch', 'meadow', 'pasture', 'hayloft', 'wildflower', 'countryside'],
    motifs: [
      { id: 'wildflower', label: 'Wildflowers', prompt: 'a small bouquet of three wildflowers, hand-drawn' },
      { id: 'wheat', label: 'Wheat sheaf', prompt: 'a small wheat sheaf, hand-drawn, fine line' },
      { id: 'horseshoe', label: 'Horseshoe', prompt: 'a single horseshoe, hand-drawn' },
      { id: 'fern', label: 'Fern frond', prompt: 'a single fern frond, hand-drawn' },
      { id: 'thistle', label: 'Thistle', prompt: 'a single thistle stem, hand-drawn' },
    ],
  },
  {
    keywords: ['garden', 'rose garden', 'botanical', 'conservatory', 'arboretum', 'estate'],
    motifs: [
      { id: 'rose', label: 'Single rose', prompt: 'a single rose with two leaves, hand-drawn' },
      { id: 'fern-curl', label: 'Fern curl', prompt: 'a curling fern frond, hand-drawn' },
      { id: 'peony', label: 'Peony bloom', prompt: 'a single peony bloom, hand-drawn' },
      { id: 'bee', label: 'Bee silhouette', prompt: 'a small bee silhouette, hand-drawn, fine line' },
      { id: 'climbing-vine', label: 'Climbing vine', prompt: 'a short climbing vine with three leaves, hand-drawn' },
    ],
  },
  {
    keywords: ['ballroom', 'hotel', 'manor', 'mansion', 'estate', 'chateau', 'historic'],
    motifs: [
      { id: 'chandelier', label: 'Chandelier', prompt: 'a small chandelier silhouette, hand-drawn' },
      { id: 'ribbon', label: 'Ribbon flourish', prompt: 'a thin ribbon flourish, hand-drawn' },
      { id: 'crest', label: 'Family crest', prompt: 'a small heraldic crest, hand-drawn, fine line' },
      { id: 'champagne-coupe', label: 'Champagne coupe', prompt: 'a single champagne coupe, hand-drawn' },
      { id: 'laurel', label: 'Laurel wreath', prompt: 'a small laurel wreath, hand-drawn' },
    ],
  },
  {
    keywords: ['lake', 'lakeside', 'tahoe', 'finger lakes', 'reservoir', 'dock', 'pier'],
    motifs: [
      { id: 'rowboat', label: 'Rowboat', prompt: 'a small rowboat silhouette, hand-drawn' },
      { id: 'reed', label: 'Reeds', prompt: 'a few lakeside reeds, hand-drawn, fine line' },
      { id: 'lily-pad', label: 'Lily pad', prompt: 'a single lily pad with a bud, hand-drawn' },
      { id: 'fish', label: 'Fish', prompt: 'a small fish silhouette, hand-drawn' },
      { id: 'pine', label: 'Pine reflections', prompt: 'three pine trees with a small wave line, hand-drawn' },
    ],
  },
  {
    keywords: ['rooftop', 'loft', 'industrial', 'warehouse', 'studio', 'gallery', 'urban', 'downtown', 'brooklyn'],
    motifs: [
      { id: 'skyline', label: 'Skyline', prompt: 'a small city skyline silhouette, hand-drawn' },
      { id: 'string-lights', label: 'String lights', prompt: 'a swag of string lights, hand-drawn, fine line' },
      { id: 'martini', label: 'Martini glass', prompt: 'a single martini glass, hand-drawn' },
      { id: 'window-frame', label: 'Window frame', prompt: 'a small industrial window pane, hand-drawn' },
      { id: 'rose-stem', label: 'Long-stem rose', prompt: 'a single long-stem rose, hand-drawn' },
    ],
  },
  {
    keywords: ['church', 'cathedral', 'chapel', 'temple', 'monastery', 'abbey'],
    motifs: [
      { id: 'arch', label: 'Stone arch', prompt: 'a small stone arch silhouette, hand-drawn' },
      { id: 'dove', label: 'Dove', prompt: 'a dove in flight silhouette, hand-drawn' },
      { id: 'rosette', label: 'Stone rosette', prompt: 'a small carved rosette, hand-drawn' },
      { id: 'candle', label: 'Candle', prompt: 'a single tall candle with flame, hand-drawn' },
      { id: 'ivy', label: 'Stone ivy', prompt: 'a small ivy vine, hand-drawn' },
    ],
  },
  {
    keywords: ['tropical', 'hawaii', 'maui', 'kauai', 'caribbean', 'tulum', 'jungle'],
    motifs: [
      { id: 'monstera', label: 'Monstera leaf', prompt: 'a single monstera leaf, hand-drawn' },
      { id: 'hibiscus', label: 'Hibiscus', prompt: 'a single hibiscus bloom, hand-drawn' },
      { id: 'pineapple', label: 'Pineapple', prompt: 'a small pineapple silhouette, hand-drawn' },
      { id: 'palm-arch', label: 'Palm arch', prompt: 'two palms forming an arch, hand-drawn, fine line' },
      { id: 'plumeria', label: 'Plumeria sprig', prompt: 'a sprig of three plumeria blossoms, hand-drawn' },
    ],
  },
  {
    keywords: ['forest', 'woods', 'redwood', 'evergreen', 'glen'],
    motifs: [
      { id: 'fern', label: 'Fern', prompt: 'a single fern frond, hand-drawn' },
      { id: 'mushroom', label: 'Mushroom', prompt: 'a small toadstool, hand-drawn' },
      { id: 'tree-trunk', label: 'Old tree', prompt: 'a single old tree trunk silhouette, hand-drawn' },
      { id: 'moss', label: 'Moss', prompt: 'a small moss tuft, hand-drawn, fine line' },
      { id: 'mushroom-cluster', label: 'Toadstool cluster', prompt: 'three toadstools in a cluster, hand-drawn' },
    ],
  },
];

/**
 * Match a venue string against the archetype dictionary. Returns
 * up to `cap` motifs (default 5), or null when nothing matches.
 *
 * Matching is keyword-OR — each archetype whose keywords appear in
 * the venue contributes its motifs. The final list is deduped by id
 * so the same motif from two archetypes (e.g. "pine" in mountain +
 * forest) only shows once.
 */
export function getVenueMotifs(venue: string | undefined | null, cap = 5): VenueMotif[] | null {
  if (!venue) return null;
  const v = venue.toLowerCase();
  const seen = new Set<string>();
  const out: VenueMotif[] = [];
  for (const a of ARCHETYPES) {
    if (a.keywords.some((k) => v.includes(k))) {
      for (const m of a.motifs) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m);
        if (out.length >= cap) return out;
      }
    }
  }
  return out.length ? out : null;
}

/** Returns a one-line summary of why we picked these motifs — used
 *  to prefix the suggestion strip in the UI ("Joshua tree desert"
 *  → "Pear sees: desert venue"). */
export function describeVenueMatch(venue: string | undefined | null): string | null {
  if (!venue) return null;
  const v = venue.toLowerCase();
  const labels: Record<string, string> = {
    'joshua tree': 'Joshua Tree desert',
    desert: 'desert venue',
    vineyard: 'vineyard',
    tuscan: 'Tuscan villa',
    tuscany: 'Tuscan villa',
    beach: 'beach venue',
    coastal: 'coastal venue',
    mountain: 'mountain venue',
    cabin: 'cabin venue',
    barn: 'barn venue',
    farm: 'farm venue',
    garden: 'garden venue',
    botanical: 'botanical garden',
    ballroom: 'ballroom venue',
    chateau: 'château',
    manor: 'manor house',
    lake: 'lakeside venue',
    rooftop: 'rooftop venue',
    loft: 'urban loft',
    chapel: 'chapel',
    church: 'church',
    cathedral: 'cathedral',
    tropical: 'tropical venue',
    forest: 'forest venue',
    redwood: 'redwood forest',
  };
  for (const k of Object.keys(labels)) {
    if (v.includes(k)) return labels[k];
  }
  return null;
}
