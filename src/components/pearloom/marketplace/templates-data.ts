// ─────────────────────────────────────────────────────────────
// Pearloom / marketplace — template registry
//
// A curated template library that covers every occasion Pearloom
// supports. Each template is a starting manifest: palette, motif,
// layout, tone, vibes + seeded content hints. Used by /marketplace
// and /templates to render tiles and seed the wizard.
//
// Template IDs are stable — the wizard consumes them via ?template=<id>.
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';

export type TemplatePalette = 'groovy-garden' | 'dusk-meadow' | 'warm-linen' | 'olive-gold' | 'lavender-ink' | 'cream-sage' | 'peach-cream';
export type TemplateLayout = 'timeline' | 'magazine' | 'filmstrip' | 'bento' | 'parallax' | 'kenburns' | 'mosaic';
export type TemplateVibe =
  | 'Warm'
  | 'Editorial'
  | 'Playful'
  | 'Quiet'
  | 'Groovy'
  | 'Black tie'
  | 'Outdoorsy'
  | 'Intimate'
  | 'Romantic'
  | 'Modern'
  | 'Handwritten';

export interface OccasionGroup {
  id: string;
  label: string;
  description: string;
  occasions: SiteOccasion[];
}

export const OCCASION_GROUPS: OccasionGroup[] = [
  {
    id: 'weddings',
    label: 'Weddings',
    description: 'Ceremonies, vows, and the weekends around them.',
    occasions: [
      'wedding',
      'engagement',
      'rehearsal-dinner',
      'welcome-party',
      'brunch',
      'vow-renewal',
      'bachelor-party',
      'bachelorette-party',
      'bridal-shower',
      'bridal-luncheon',
    ],
  },
  {
    id: 'milestones',
    label: 'Milestones',
    description: 'Birthdays, graduations, retirements, anniversaries.',
    occasions: ['anniversary', 'birthday', 'first-birthday', 'sweet-sixteen', 'milestone-birthday', 'retirement', 'graduation'],
  },
  {
    id: 'family',
    label: 'Family & home',
    description: 'New arrivals, new addresses, new chapters at home.',
    occasions: ['baby-shower', 'gender-reveal', 'sip-and-see', 'housewarming'],
  },
  {
    id: 'cultural',
    label: 'Ceremonies & faith',
    description: 'Bar and bat mitzvahs, quinceañeras, baptisms.',
    occasions: ['bar-mitzvah', 'bat-mitzvah', 'quinceanera', 'baptism', 'first-communion', 'confirmation'],
  },
  {
    id: 'commemoration',
    label: 'Memorials & reunions',
    description: 'Lives remembered and people who come back together.',
    occasions: ['memorial', 'funeral', 'reunion'],
  },
  {
    id: 'story',
    label: 'Your story',
    description: 'A timeline of you — no single event required.',
    occasions: ['story'],
  },
];

export const OCCASION_LABELS: Record<string, string> = {
  wedding: 'Wedding',
  anniversary: 'Anniversary',
  engagement: 'Engagement',
  birthday: 'Birthday',
  story: 'Story',
  'bachelor-party': 'Bachelor party',
  'bachelorette-party': 'Bachelorette party',
  'bridal-shower': 'Bridal shower',
  'bridal-luncheon': 'Bridal luncheon',
  'rehearsal-dinner': 'Rehearsal dinner',
  'welcome-party': 'Welcome party',
  brunch: 'Wedding brunch',
  'vow-renewal': 'Vow renewal',
  'baby-shower': 'Baby shower',
  'gender-reveal': 'Gender reveal',
  'sip-and-see': 'Sip & see',
  housewarming: 'Housewarming',
  'first-birthday': 'First birthday',
  'sweet-sixteen': 'Sweet sixteen',
  'milestone-birthday': 'Milestone birthday',
  retirement: 'Retirement',
  graduation: 'Graduation',
  'bar-mitzvah': 'Bar mitzvah',
  'bat-mitzvah': 'Bat mitzvah',
  quinceanera: 'Quinceañera',
  baptism: 'Baptism',
  'first-communion': 'First communion',
  confirmation: 'Confirmation',
  memorial: 'Memorial',
  funeral: 'Funeral',
  reunion: 'Reunion',
};

export const PALETTE_SWATCHES: Record<TemplatePalette, string[]> = {
  'groovy-garden': ['#3D4A1F', '#8B9C5A', '#C4B5D9', '#F3E9D4', '#EAB286'],
  'dusk-meadow': ['#6B5A8C', '#B7A4D0', '#CBD29E', '#F3E9D4', '#4A3F6B'],
  'warm-linen': ['#8B4720', '#EAB286', '#F7DDC2', '#F3E9D4', '#C6703D'],
  'olive-gold': ['#3D4A1F', '#6d7d3f', '#D4A95D', '#F3E9D4', '#B89244'],
  'lavender-ink': ['#6B5A8C', '#B7A4D0', '#D7CCE5', '#EDE0C5', '#3D4A1F'],
  'cream-sage': ['#EDE0C5', '#F3E9D4', '#CBD29E', '#8B9C5A', '#3D4A1F'],
  'peach-cream': ['#C6703D', '#EAB286', '#F0C9A8', '#F7DDC2', '#F3E9D4'],
};

export interface Template {
  id: string;
  name: string;
  occasion: SiteOccasion;
  description: string;
  vibes: TemplateVibe[];
  palette: TemplatePalette;
  layout: TemplateLayout;
  /** Optional hero headline override for the tile preview. */
  heroWord?: string;
  /** Optional script-font sub-hero ("& their day"). */
  heroScript?: string;
  featured?: boolean;
  /** Optional tagline seeded into manifest.poetry.heroTagline on new sites. */
  tagline?: string;
}

export const TEMPLATES: Template[] = [
  // ───────── WEDDINGS ─────────
  {
    id: 'wildflower-barn',
    name: 'Wildflower Barn',
    occasion: 'wedding',
    description: 'Garden-party wedding with a handwritten throughline.',
    vibes: ['Warm', 'Outdoorsy', 'Romantic'],
    palette: 'groovy-garden',
    layout: 'timeline',
    heroWord: 'Alex & Jamie',
    heroScript: 'together, at last',
    featured: true,
    tagline:
      "Seven summers, one very patient golden retriever, and a meadow full of the people we love. We'd love you there.",
  },
  {
    id: 'pearl-district',
    name: 'Pearl District',
    occasion: 'wedding',
    description: 'A magazine spread for a city-hall-to-rooftop day.',
    vibes: ['Editorial', 'Black tie', 'Modern'],
    palette: 'lavender-ink',
    layout: 'magazine',
    heroWord: 'Noor & Milo',
    heroScript: 'in type & city',
    featured: true,
    tagline: 'Short ceremony, long reception, quiet toasts at midnight. Come dressed to mean it.',
  },
  {
    id: 'cannon-beach',
    name: 'Cannon Beach',
    occasion: 'wedding',
    description: "For a coast wedding where the tide keeps time.",
    vibes: ['Warm', 'Outdoorsy', 'Quiet'],
    palette: 'warm-linen',
    layout: 'filmstrip',
    heroWord: 'Sam & Jules',
    heroScript: 'on the coast',
    featured: true,
    tagline: 'Low tide at 4, ceremony at 5, bonfire after. Bring a sweater.',
  },
  {
    id: 'ceremony-70s',
    name: 'Ceremony, 70s',
    occasion: 'wedding',
    description: 'Loopy type, warm tones, plenty of daisies.',
    vibes: ['Groovy', 'Playful', 'Warm'],
    palette: 'peach-cream',
    layout: 'kenburns',
    heroScript: 'far out',
    tagline: "It's our day and we're making it groovy. Wear what makes you dance.",
  },
  {
    id: 'finnish-cottage',
    name: 'The Finnish Cottage',
    occasion: 'wedding',
    description: 'Quiet, intimate, twenty of your favorite people.',
    vibes: ['Quiet', 'Intimate', 'Handwritten'],
    palette: 'cream-sage',
    layout: 'parallax',
    heroScript: 'us and ours',
    tagline: 'Twenty seats, one long table, candles that outlast dinner.',
  },
  {
    id: 'olive-gold-wedding',
    name: 'Olive & Gold',
    occasion: 'wedding',
    description: 'Classic editorial — olive linen, brass candlesticks, a little gold leaf.',
    vibes: ['Editorial', 'Romantic'],
    palette: 'olive-gold',
    layout: 'magazine',
  },

  // ───────── ENGAGEMENT ─────────
  {
    id: 'the-yes',
    name: 'The Yes',
    occasion: 'engagement',
    description: 'An invitation to the engagement party with room for the proposal story.',
    vibes: ['Warm', 'Romantic'],
    palette: 'peach-cream',
    layout: 'bento',
    heroScript: 'she said yes',
    tagline: 'We said yes in October. We’d love to celebrate with you in spring.',
  },
  {
    id: 'springtime-engagement',
    name: 'Springtime',
    occasion: 'engagement',
    description: 'Garden toast for the newly engaged.',
    vibes: ['Warm', 'Outdoorsy', 'Playful'],
    palette: 'groovy-garden',
    layout: 'filmstrip',
  },

  // ───────── REHEARSAL / WELCOME / BRUNCH / VOW RENEWAL / BACH ─────────
  {
    id: 'the-rehearsal',
    name: 'The Rehearsal',
    occasion: 'rehearsal-dinner',
    description: 'Editorial dinner the night before. Ordered, warm, brief.',
    vibes: ['Editorial', 'Intimate'],
    palette: 'lavender-ink',
    layout: 'magazine',
  },
  {
    id: 'night-before',
    name: 'Night Before',
    occasion: 'rehearsal-dinner',
    description: 'Soft porch lights, low tables, family only.',
    vibes: ['Warm', 'Handwritten'],
    palette: 'warm-linen',
    layout: 'filmstrip',
  },
  {
    id: 'welcome-weekend',
    name: 'Welcome Weekend',
    occasion: 'welcome-party',
    description: 'A Friday night drink before the big day — for out-of-towners especially.',
    vibes: ['Warm', 'Playful'],
    palette: 'peach-cream',
    layout: 'bento',
  },
  {
    id: 'morning-after',
    name: 'Morning After',
    occasion: 'brunch',
    description: 'A slow Sunday brunch for the people who stayed up late.',
    vibes: ['Quiet', 'Warm'],
    palette: 'cream-sage',
    layout: 'filmstrip',
  },
  {
    id: 'still-us',
    name: 'Still Us',
    occasion: 'vow-renewal',
    description: 'A second ceremony — shorter vows, louder toasts.',
    vibes: ['Warm', 'Romantic', 'Editorial'],
    palette: 'olive-gold',
    layout: 'timeline',
    tagline: 'Ten years in. Same vows, newer everything.',
  },
  {
    id: 'big-sur-bach',
    name: 'Big Sur Bach',
    occasion: 'bachelor-party',
    description: 'A weekend in the redwoods, two vans, a lot of snacks.',
    vibes: ['Outdoorsy', 'Playful'],
    palette: 'cream-sage',
    layout: 'filmstrip',
  },
  {
    id: 'nashville-bach',
    name: 'Bachelorette, Nashville',
    occasion: 'bachelorette-party',
    description: 'Honky-tonks, matching jackets, one loud itinerary.',
    vibes: ['Groovy', 'Playful'],
    palette: 'peach-cream',
    layout: 'kenburns',
  },
  {
    id: 'garden-shower',
    name: 'Garden Shower',
    occasion: 'bridal-shower',
    description: 'Afternoon tea and hydrangeas in the backyard.',
    vibes: ['Warm', 'Romantic'],
    palette: 'groovy-garden',
    layout: 'filmstrip',
  },
  {
    id: 'linen-and-lace',
    name: 'Linen & Lace',
    occasion: 'bridal-shower',
    description: 'An editorial shower at home — cream florals, slow toasts.',
    vibes: ['Editorial', 'Quiet'],
    palette: 'lavender-ink',
    layout: 'magazine',
  },
  {
    id: 'luncheon',
    name: 'The Luncheon',
    occasion: 'bridal-luncheon',
    description: 'Just the bridal party — long lunch, longer laughs.',
    vibes: ['Quiet', 'Editorial'],
    palette: 'cream-sage',
    layout: 'magazine',
  },

  // ───────── ANNIVERSARIES ─────────
  {
    id: 'silver-still',
    name: 'Silver, Still',
    occasion: 'anniversary',
    description: '25 years, set in type. Editorial without the formal.',
    vibes: ['Editorial', 'Quiet', 'Handwritten'],
    palette: 'olive-gold',
    layout: 'magazine',
    heroScript: 'twenty-five',
    featured: true,
  },
  {
    id: 'golden-thread',
    name: 'Golden Thread',
    occasion: 'anniversary',
    description: 'A golden-anniversary site that reads like a keepsake.',
    vibes: ['Warm', 'Romantic'],
    palette: 'warm-linen',
    layout: 'filmstrip',
    heroScript: 'fifty years',
  },
  {
    id: 'after-all-these-years',
    name: 'After all these years',
    occasion: 'anniversary',
    description: 'Handwritten notes, soft lavender, love letters tucked in.',
    vibes: ['Handwritten', 'Quiet', 'Romantic'],
    palette: 'dusk-meadow',
    layout: 'parallax',
  },

  // ───────── BIRTHDAYS ─────────
  {
    id: 'eighty-candles',
    name: 'Eighty Candles',
    occasion: 'birthday',
    description: 'A milestone birthday site with room for everyone’s stories.',
    vibes: ['Warm', 'Playful', 'Handwritten'],
    palette: 'peach-cream',
    layout: 'bento',
    featured: true,
  },
  {
    id: 'quiet-fifty',
    name: 'Quiet Fifty',
    occasion: 'birthday',
    description: 'An editorial fiftieth — intimate dinner, quiet toasts.',
    vibes: ['Editorial', 'Quiet'],
    palette: 'lavender-ink',
    layout: 'magazine',
  },
  {
    id: 'double-digits',
    name: 'The Double Digits',
    occasion: 'birthday',
    description: 'A kid’s tenth — playful, loud, confetti-heavy.',
    vibes: ['Playful', 'Warm'],
    palette: 'peach-cream',
    layout: 'kenburns',
  },
  {
    id: 'one-little-wonder',
    name: 'One Little Wonder',
    occasion: 'first-birthday',
    description: 'A first birthday — tiny cake, tinier hands.',
    vibes: ['Playful', 'Warm'],
    palette: 'cream-sage',
    layout: 'bento',
    heroScript: 'one!',
  },
  {
    id: 'sweet-sixteen-template',
    name: 'Sweet Sixteen',
    occasion: 'sweet-sixteen',
    description: 'Big type, daisies, a disco.',
    vibes: ['Groovy', 'Playful'],
    palette: 'peach-cream',
    layout: 'kenburns',
  },
  {
    id: 'half-a-century',
    name: 'Half a Century',
    occasion: 'milestone-birthday',
    description: 'An editorial milestone — 50 years, set like a book.',
    vibes: ['Editorial', 'Warm'],
    palette: 'olive-gold',
    layout: 'magazine',
  },

  // ───────── RETIREMENT / GRADUATION ─────────
  {
    id: 'new-chapters',
    name: 'New Chapters',
    occasion: 'retirement',
    description: "Thirty-five years, a soft send-off, and what's next.",
    vibes: ['Warm', 'Quiet'],
    palette: 'cream-sage',
    layout: 'filmstrip',
    heroScript: 'what’s next',
  },
  {
    id: 'the-graduate',
    name: 'The Graduate',
    occasion: 'graduation',
    description: 'Cap-and-gown, set in magazine type.',
    vibes: ['Editorial', 'Modern'],
    palette: 'olive-gold',
    layout: 'magazine',
  },
  {
    id: 'diploma-day',
    name: 'Diploma Day',
    occasion: 'graduation',
    description: 'A warm graduation site with room for everyone’s toasts.',
    vibes: ['Warm', 'Playful'],
    palette: 'groovy-garden',
    layout: 'bento',
  },

  // ───────── FAMILY ─────────
  {
    id: 'little-pear',
    name: 'Little Pear',
    occasion: 'baby-shower',
    description: 'A sweet shower site — pears, cream, a little peach.',
    vibes: ['Warm', 'Playful'],
    palette: 'cream-sage',
    layout: 'bento',
    heroScript: 'welcome, little one',
  },
  {
    id: 'sprinkle',
    name: 'Sprinkle',
    occasion: 'baby-shower',
    description: 'A second-baby sprinkle — lighter than a shower.',
    vibes: ['Playful', 'Warm'],
    palette: 'peach-cream',
    layout: 'kenburns',
  },
  {
    id: 'reveal',
    name: 'Reveal',
    occasion: 'gender-reveal',
    description: 'A gender-reveal invite without the cake smash.',
    vibes: ['Playful', 'Warm'],
    palette: 'peach-cream',
    layout: 'kenburns',
  },
  {
    id: 'sip-and-see-template',
    name: 'Sip & See',
    occasion: 'sip-and-see',
    description: 'Low-key afternoon — come meet the baby, stay for cake.',
    vibes: ['Quiet', 'Warm'],
    palette: 'cream-sage',
    layout: 'filmstrip',
  },
  {
    id: 'the-new-apartment',
    name: 'The New Apartment',
    occasion: 'housewarming',
    description: 'Housewarming invite with a proper welcome.',
    vibes: ['Playful', 'Warm'],
    palette: 'dusk-meadow',
    layout: 'bento',
  },
  {
    id: 'home-at-last',
    name: 'Home, at last',
    occasion: 'housewarming',
    description: 'A warm housewarming — paint swatches and pizza.',
    vibes: ['Warm', 'Handwritten'],
    palette: 'cream-sage',
    layout: 'filmstrip',
  },

  // ───────── CULTURAL ─────────
  {
    id: 'thirteen-mitzvah',
    name: 'Thirteen',
    occasion: 'bar-mitzvah',
    description: 'A bar-mitzvah site with room for the big-ticket moments.',
    vibes: ['Editorial', 'Modern'],
    palette: 'lavender-ink',
    layout: 'magazine',
  },
  {
    id: 'mitzvah-day',
    name: 'Mitzvah Day',
    occasion: 'bat-mitzvah',
    description: 'A warm bat-mitzvah site — photos, speeches, a party.',
    vibes: ['Warm', 'Editorial'],
    palette: 'cream-sage',
    layout: 'timeline',
  },
  {
    id: 'quince',
    name: 'Quince',
    occasion: 'quinceanera',
    description: 'A quinceañera site — music, dance, family.',
    vibes: ['Groovy', 'Warm', 'Playful'],
    palette: 'peach-cream',
    layout: 'kenburns',
  },
  {
    id: 'sacrament',
    name: 'Sacrament',
    occasion: 'baptism',
    description: 'A quiet baptism site — soft cream, soft script.',
    vibes: ['Quiet', 'Handwritten'],
    palette: 'cream-sage',
    layout: 'parallax',
  },
  {
    id: 'first-communion-template',
    name: 'First Communion',
    occasion: 'first-communion',
    description: 'A warm first-communion site — the ceremony and the lunch after.',
    vibes: ['Warm', 'Quiet'],
    palette: 'cream-sage',
    layout: 'filmstrip',
  },
  {
    id: 'confirmation-template',
    name: 'Confirmation',
    occasion: 'confirmation',
    description: 'A thoughtful confirmation site with space for each young person’s story.',
    vibes: ['Editorial', 'Quiet'],
    palette: 'lavender-ink',
    layout: 'magazine',
  },

  // ───────── COMMEMORATION ─────────
  {
    id: 'in-memory-arthur',
    name: 'In Memory, Arthur',
    occasion: 'memorial',
    description: 'A soft, slow place to gather around a life well-lived.',
    vibes: ['Quiet', 'Handwritten'],
    palette: 'cream-sage',
    layout: 'parallax',
    featured: true,
    tagline: "We're gathering Saturday. Bring a story — we'll bring the tea.",
  },
  {
    id: 'life-remembered',
    name: 'A Life, Remembered',
    occasion: 'memorial',
    description: 'Soft lavender, shared guestbook, his favorite songs.',
    vibes: ['Quiet'],
    palette: 'dusk-meadow',
    layout: 'parallax',
  },
  {
    id: 'celebration-of-life',
    name: 'Celebration of Life',
    occasion: 'funeral',
    description: 'A warm celebration-of-life site — photos, memories, laughter.',
    vibes: ['Warm', 'Quiet'],
    palette: 'warm-linen',
    layout: 'filmstrip',
  },
  {
    id: 'together-again',
    name: 'Together Again',
    occasion: 'reunion',
    description: 'A family reunion — long table, long stories.',
    vibes: ['Warm', 'Handwritten'],
    palette: 'cream-sage',
    layout: 'filmstrip',
  },
  {
    id: 'class-of',
    name: 'Class Of',
    occasion: 'reunion',
    description: 'A 20th-reunion site — yearbook photos, now-and-then.',
    vibes: ['Groovy', 'Playful'],
    palette: 'peach-cream',
    layout: 'kenburns',
    featured: true,
  },
  {
    id: 'family-reunion',
    name: 'Family Reunion',
    occasion: 'reunion',
    description: 'Three generations, one cabin, a weekend that holds them.',
    vibes: ['Warm', 'Editorial'],
    palette: 'olive-gold',
    layout: 'timeline',
  },

  // ───────── STORY ─────────
  {
    id: 'story-timeline',
    name: 'Your Story, Timeline',
    occasion: 'story',
    description: 'No event — just a life, chaptered.',
    vibes: ['Warm', 'Handwritten'],
    palette: 'cream-sage',
    layout: 'timeline',
  },
  {
    id: 'story-mosaic',
    name: 'Your Story, Mosaic',
    occasion: 'story',
    description: 'A gallery-first version for the photo-heavy.',
    vibes: ['Editorial', 'Modern'],
    palette: 'olive-gold',
    layout: 'mosaic',
  },
];

/* ────────────────────────────────────────────────────────────────────
   The /templates page surfaces TWO registries combined:
     • the curated TEMPLATES list above (handcrafted marketplace cards)
     • the full SITE_TEMPLATES library in src/lib/templates/wedding-
       templates.ts (74 ready-to-apply templates)
   These had drifted out of sync — sites in SITE_TEMPLATES never
   showed up on /templates. The adapter below projects each
   SITE_TEMPLATE into the lightweight Template shape the marketplace
   tile expects.
   ──────────────────────────────────────────────────────────────────── */

import { SITE_TEMPLATES, type SiteTemplate } from '@/lib/templates/wedding-templates';

/** Lightweight palette pick for the marketplace tile. The full
 *  custom palette ships when the template is applied — this is just
 *  an approximation for the tile colour swatches. */
function nearestNamedPalette(t: SiteTemplate): TemplatePalette {
  const tags = (t.tags ?? []).join(' ').toLowerCase();
  const vibe = (t.vibeString ?? '').toLowerCase();
  const all = `${tags} ${vibe}`;
  if (/lavender|purple|dusk|amethyst|plum/.test(all)) return 'lavender-ink';
  if (/dusk|meadow/.test(all)) return 'dusk-meadow';
  if (/peach|terracotta|warm|orange|coral|amber/.test(all)) return 'peach-cream';
  if (/linen|cream|bone|paper|chalk/.test(all)) return 'warm-linen';
  if (/olive|gold|brass|chianti|loire|tuscan/.test(all)) return 'olive-gold';
  if (/sage|forest|cedar|moss|pacific|garden|botanical/.test(all)) return 'cream-sage';
  return 'groovy-garden';
}

function nearestLayout(t: SiteTemplate): TemplateLayout {
  const lf = (t.layoutFormat ?? '').toLowerCase();
  if (lf === 'magazine') return 'magazine';
  if (lf === 'filmstrip') return 'filmstrip';
  if (lf === 'cascade') return 'timeline';
  if (lf === 'chapters') return 'parallax';
  if (lf === 'scrapbook') return 'kenburns';
  if (lf === 'starmap') return 'mosaic';
  return 'timeline';
}

const VIBE_CANDIDATES: TemplateVibe[] = [
  'Warm', 'Editorial', 'Playful', 'Quiet', 'Groovy',
  'Black tie', 'Outdoorsy', 'Intimate', 'Romantic', 'Modern', 'Handwritten',
];

function deriveVibes(t: SiteTemplate): TemplateVibe[] {
  const text = `${t.tags?.join(' ') ?? ''} ${t.vibeString ?? ''} ${t.tagline ?? ''}`.toLowerCase();
  const hits: TemplateVibe[] = [];
  // Heuristic vibe detection — picks 2-3 best matches.
  const map: Array<[TemplateVibe, RegExp]> = [
    ['Warm',        /warm|terracotta|peach|gold|amber|cream/],
    ['Editorial',   /editorial|magazine|slim-aarons|hudson|brooklyn|loft/],
    ['Playful',     /playful|y2k|fun|colour|circus|disco|maximalist/],
    ['Quiet',       /quiet|wabi-sabi|minimal|calm|kyoto|cedar/],
    ['Groovy',      /groovy|70s|retro|disco|y2k/],
    ['Black tie',   /black-tie|formal|chateau|loire|hotel|gala|costes|midnight/],
    ['Outdoorsy',   /outdoor|garden|forest|desert|coast|alpine|barn|mountain|cliff|joshua/],
    ['Intimate',    /intimate|small|elopement|tea-ceremony|private/],
    ['Romantic',    /romantic|tuscan|provence|chianti|love|chateau/],
    ['Modern',      /modern|brooklyn|tokyo|industrial|loft|minimal|edition/],
    ['Handwritten', /handwritten|script|signature|cursive/],
  ];
  for (const [v, re] of map) if (re.test(text) && hits.length < 3) hits.push(v);
  if (hits.length === 0) hits.push('Romantic');
  return hits;
}

/** Project a full SiteTemplate into the marketplace tile shape. */
function siteTemplateToMarketplace(t: SiteTemplate): Template {
  const occasion = (Array.isArray(t.occasions) && t.occasions[0]
    ? t.occasions[0]
    : 'wedding') as SiteOccasion;
  return {
    id: t.id,
    name: t.name,
    occasion,
    description: t.description ?? t.tagline ?? '',
    vibes: deriveVibes(t),
    palette: nearestNamedPalette(t),
    layout: nearestLayout(t),
    heroScript: t.poetry?.heroTagline,
    featured: t.featured,
    tagline: t.tagline,
  };
}

/** Curated marketplace TEMPLATES (above) come first — they're the
 *  hand-tuned cards. The 74 SITE_TEMPLATES follow, deduplicated by
 *  id so we don't ship duplicates if a curated card has the same
 *  id as a SITE_TEMPLATE. */
const CURATED_IDS = new Set(TEMPLATES.map((t) => t.id));
const PROJECTED_FROM_SITE: Template[] = SITE_TEMPLATES
  .filter((t) => !CURATED_IDS.has(t.id))
  .map(siteTemplateToMarketplace);

export const ALL_TEMPLATES: Template[] = [...TEMPLATES, ...PROJECTED_FROM_SITE];

export const TEMPLATES_BY_ID: Record<string, Template> = ALL_TEMPLATES.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<string, Template>,
);
