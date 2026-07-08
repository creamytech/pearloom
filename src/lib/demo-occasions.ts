// ─────────────────────────────────────────────────────────────
// demo-occasions — the demo orchard (PERSONA-PLAN S9).
//
// One seeded, published-quality world per persona occasion,
// served at /demo/{occasion} for testers, investors, and the
// landing's occasion doors. Each manifest is dressed by the SAME
// look pipeline the wizard uses (applyWizardLook stamps the
// occasion's kit/texture/motif defaults), so these stay true to
// what a real press produces — never a hand-forked style.
//
// The wedding demo stays at /demo (Elena & Theo, demo-manifest.ts);
// /demo/wedding redirects there.
//
// THE MEMORIAL IS THE TONE BENCHMARK. It is written with the care
// of a real one: no party vocabulary, donations in lieu of
// flowers, a life told gently. If an edit here makes you wince,
// it would make Denise wince.
//
// KEEP EVENT DATES IN THE FUTURE (buildCopy flips to post-event
// mode the day after logistics.date).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { applyWizardLook } from '@/lib/site-look/wizard-look';

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export interface OccasionDemo {
  slug: string;            // /demo/{slug}
  occasion: string;        // EVENT_TYPES id
  names: [string, string];
  title: string;           // moderator-kit label
  manifest: StoryManifest;
}

/* Shared assembly — content fields + the occasion's own look. */
function press(
  occasion: string,
  palette: string[],
  content: Record<string, unknown>,
): StoryManifest {
  const base = { occasion, ...content } as unknown as StoryManifest;
  return applyWizardLook(base, { occasion, selectedPaletteColors: palette }) as StoryManifest;
}

const DEMOS: OccasionDemo[] = [
  {
    slug: 'birthday',
    occasion: 'birthday',
    names: ['Tyler', ''],
    title: "Tyler's 21st (rooftop birthday)",
    manifest: press('birthday', ['#F0C9A8', '#8B9C5A', '#CBD29E', '#3D4A1F'], {
      logistics: { date: '2027-03-20', venue: 'The Roosevelt Rooftop', place: 'Austin, TX', dresscode: 'Festive attire' },
      coverPhoto: u('photo-1530103862676-de8c9debad1d'),
      galleryImages: [u('photo-1533174072545-7a4b6ad7a6c3'), u('photo-1496337589254-7e19d01cec44'), u('photo-1470229722913-7c0e2dbbafd3')],
      chapters: [
        { title: 'Twenty-one, finally', body: 'One rooftop, one long golden hour, and everyone Tyler would actually cross town for. No speeches over ninety seconds — he timed last year’s.' },
      ],
      events: [
        { id: 'e-1', name: 'Doors & first round', time: '7:00 pm', type: 'other', date: '', venue: 'The rooftop', address: '' },
        { id: 'e-2', name: 'Tacos land', time: '8:00 pm', type: 'other', date: '', venue: '', address: '' },
        { id: 'e-3', name: 'Cake, briefly', time: '9:30 pm', type: 'other', date: '', venue: '', address: '' },
        { id: 'e-4', name: 'Dancing till close', time: '10:00 pm', type: 'other', date: '', venue: '', address: '' },
      ],
      faqs: [
        { id: 'f-1', question: 'What should I wear?', answer: 'Festive. It’s a rooftop in March — bring a layer for after dark.', order: 0 },
        { id: 'f-2', question: 'Can I bring someone?', answer: 'Yes — the RSVP has a spot for your plus-one.', order: 1 },
        { id: 'f-3', question: 'Gifts?', answer: 'Your presence and your best playlist addition. That’s it.', order: 2 },
      ],
    }),
  },
  {
    slug: 'anniversary',
    occasion: 'anniversary',
    names: ['Linda', 'Robert'],
    title: 'Linda & Robert (40th anniversary)',
    manifest: press('anniversary', ['#F3E9D4', '#EAB286', '#F0C9A8', '#8B4720'], {
      logistics: { date: '2027-06-12', venue: 'The Morton Arboretum', place: 'Naperville, IL', dresscode: 'Garden party' },
      coverPhoto: u('photo-1519741497674-611481863552'),
      galleryImages: [u('photo-1522673607200-164d1b6ce486'), u('photo-1464366400600-7168b8af9bc3'), u('photo-1520854221256-17451cc331bf')],
      chapters: [
        { title: 'Forty years since Maple Street', body: 'They married in a church with a leaky roof and honeymooned two towns over. Forty years, three kids, and one very opinionated garden later, they would love your company under the oaks.' },
        { title: 'Still writing chapters', body: 'Come for the stories — bring one of your own. There will be a microphone, cake from the same bakery as 1987, and dancing to the songs that were already old then.' },
      ],
      events: [
        { id: 'e-1', name: 'Guests arrive', time: '4:00 pm', type: 'other', date: '', venue: 'The pavilion', address: '' },
        { id: 'e-2', name: 'A toast to forty years', time: '5:00 pm', type: 'other', date: '', venue: '', address: '' },
        { id: 'e-3', name: 'Dinner under the oaks', time: '6:00 pm', type: 'other', date: '', venue: '', address: '' },
        { id: 'e-4', name: 'The first dance, again', time: '8:00 pm', type: 'other', date: '', venue: '', address: '' },
      ],
      faqs: [
        { id: 'f-1', question: 'Are kids welcome?', answer: 'All ages — the grandkids are the co-hosts.', order: 0 },
        { id: 'f-2', question: 'Gifts?', answer: 'None, truly. If you’d like, bring a written memory for the book.', order: 1 },
        { id: 'f-3', question: 'Where do I park?', answer: 'The arboretum’s Lot B — follow the paper lanterns.', order: 2 },
      ],
    }),
  },
  {
    slug: 'bachelorette',
    occasion: 'bachelorette-party',
    names: ['Sophia', ''],
    title: "Sophia's last ride (Nashville bachelorette)",
    manifest: press('bachelorette-party', ['#C4B5D9', '#B7A4D0', '#CBD29E', '#6B5A8C'], {
      logistics: { date: '2027-05-07', venue: 'The Gulch', place: 'Nashville, TN', dresscode: 'Themed (see invite)' },
      coverPhoto: u('photo-1514525253161-7a46d19cd819'),
      galleryImages: [u('photo-1470225620780-dba8ba36b745'), u('photo-1529333166437-7750a6dd5a70')],
      chapters: [
        { title: 'Three days, nine girls, one bride', body: 'Sophia gets married in June. First, Nashville. The itinerary is planned, the matching shirts are (regrettably) ordered, and the group chat has already peaked.' },
      ],
      events: [
        { id: 'e-1', name: 'Check-in & rooftop welcome', time: '4:00 pm', type: 'other', date: '', venue: 'The house', address: '', day: 1 },
        { id: 'e-2', name: 'Group dinner', time: '7:30 pm', type: 'other', date: '', venue: 'Adele’s', address: '', day: 1 },
        { id: 'e-3', name: 'Boots & Broadway', time: '11:00 am', type: 'other', date: '', venue: '', address: '', day: 2 },
        { id: 'e-4', name: 'Send-off brunch', time: '10:00 am', type: 'other', date: '', venue: '', address: '', day: 3 },
      ],
      faqs: [
        { id: 'f-1', question: 'What do I owe?', answer: 'The cost split is in the group thread — settle up any time before the trip.', order: 0 },
        { id: 'f-2', question: 'What are we wearing?', answer: 'Friday: anything. Saturday: the shirts. You know the shirts.', order: 1 },
      ],
    }),
  },
  {
    slug: 'memorial',
    occasion: 'memorial',
    names: ['Eleanor Whitfield', ''],
    title: 'For Eleanor (celebration of life) — THE TONE BENCHMARK',
    manifest: press('memorial', ['#F3E9D4', '#EAB286', '#F0C9A8', '#8B4720'], {
      logistics: { date: '2027-04-10', venue: 'Wesley Gardens', place: 'Savannah, GA', dresscode: 'No black requested — Eleanor loved color' },
      coverPhoto: u('photo-1470509037663-253afd7f0f51'),
      galleryImages: [u('photo-1490750967868-88aa4486c946'), u('photo-1416879595882-3373a0480b5b')],
      chapters: [
        { title: 'A life in the garden', body: 'Eleanor Rose Whitfield, 1948–2026. She taught third grade for thirty-one years, grew roses that won ribbons she never displayed, and never once let a grandchild leave without a sandwich. We will gather where she was happiest — among the flowers — to tell her stories and hold each other.' },
      ],
      events: [
        { id: 'e-1', name: 'Gathering', time: '10:00 am', type: 'other', date: '', venue: 'The garden chapel', address: '' },
        { id: 'e-2', name: 'Service', time: '11:00 am', type: 'other', date: '', venue: '', address: '' },
        { id: 'e-3', name: 'Sharing memories', time: '12:00 pm', type: 'other', date: '', venue: 'The rose garden', address: '' },
        { id: 'e-4', name: 'Reception', time: '12:45 pm', type: 'other', date: '', venue: 'Food & stories', address: '' },
      ],
      faqs: [
        { id: 'f-1', question: 'What should I wear?', answer: 'Whatever feels right. The family asks: no black, if you can — Eleanor loved color.', order: 0 },
        { id: 'f-2', question: 'May I send flowers?', answer: 'In lieu of flowers, the family suggests a gift to the Savannah Children’s Book Fund, where Eleanor read on Tuesdays.', order: 1 },
        { id: 'f-3', question: 'May I share a memory?', answer: 'Please. There will be an open microphone, and the site has a place to write one — the family reads every word.', order: 2 },
      ],
    }),
  },
  {
    slug: 'quinceanera',
    occasion: 'quinceanera',
    names: ['Isabella', ''],
    title: "Isabella's quince años",
    manifest: press('quinceanera', ['#6d7d3f', '#D4A95D', '#F3E9D4', '#3D4A1F'], {
      logistics: { date: '2027-08-14', venue: 'Mission Concepción Hall', place: 'San Antonio, TX', dresscode: 'Cocktail attire' },
      coverPhoto: u('photo-1519225421980-715cb0215aed'),
      galleryImages: [u('photo-1464047736614-af63643285bf'), u('photo-1511795409834-ef04bbd61622')],
      chapters: [
        { title: 'Mis quince años', body: 'Fifteen years of Isabella — the dancer, the big sister, the girl who organizes the cousins like a general. The mass is at four; the party is until your feet give out. La familia entera is coming. So should you.' },
      ],
      events: [
        { id: 'e-1', name: 'Misa', time: '4:00 pm', type: 'other', date: '', venue: 'Mission Concepción', address: '' },
        { id: 'e-2', name: 'Reception & photos', time: '5:30 pm', type: 'other', date: '', venue: 'The hall', address: '' },
        { id: 'e-3', name: 'El vals', time: '7:00 pm', type: 'other', date: '', venue: '', address: '' },
        { id: 'e-4', name: 'Baile', time: '8:00 pm', type: 'other', date: '', venue: 'Hasta que se acabe', address: '' },
      ],
      faqs: [
        { id: 'f-1', question: '¿Puedo traer a los niños? / Are kids welcome?', answer: 'Claro que sí — all ages, all night.', order: 0 },
        { id: 'f-2', question: 'What should I wear?', answer: 'Cocktail attire. Isabella’s color is sage — wear it if you’d like, just not head-to-toe gold (that’s the court).', order: 1 },
        { id: 'f-3', question: 'Gifts?', answer: 'Your presence first. There is a small registry on the site for those who insist.', order: 2 },
      ],
    }),
  },
];

const BY_SLUG = new Map(DEMOS.map((d) => [d.slug, d]));

export function occasionDemoFor(slug: string): OccasionDemo | null {
  return BY_SLUG.get(slug) ?? null;
}

export const OCCASION_DEMO_SLUGS = DEMOS.map((d) => d.slug);
