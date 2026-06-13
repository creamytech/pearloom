// ─────────────────────────────────────────────────────────────
// Reference manifest for Theme-Store visual regression.
//
// Frozen content scaffold used by both the dev visual-test route
// (src/app/dev/theme-pack/[id]/page.tsx) AND any unit test
// that wants to stamp a pack onto a "realistic" manifest. The
// shape mirrors the rich seed mounted at /dev/site, but every
// pack-coloured axis (theme.colors, themeId, kitId, motif,
// pattern, texture) is intentionally bare so applyPackToManifest
// owns the entire visual outcome — the diff isolates the pack.
//
// Keep this stable. If you need a different fixture for a new
// test, add a sibling export — never mutate this one. The
// screenshot baselines under tests/e2e/__screenshots__/ depend
// on this exact content.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export const REFERENCE_NAMES: [string, string] = ['Alex', 'Jamie'];

export const REFERENCE_MANIFEST = {
  coupleId: '__test_reference__',
  generatedAt: '2026-06-01T00:00:00.000Z',
  vibeString: 'warm, considered, garden',
  occasion: 'wedding',
  /* Empty theme bag — applyPackToManifest fills theme.colors +
     theme.fonts from the pack's --t-* var bag so the diff per
     pack is driven entirely by the pack itself. */
  theme: {
    colors: {
      background: '#F5EFE2',
      foreground: '#0E0D0B',
      accent: '#5C6B3F',
      accentLight: '#E5DCC4',
      muted: '#6F6557',
      cardBg: '#FBF7EE',
    },
    fonts: { heading: 'Fraunces', body: 'Inter' },
  },
  poetry: {
    heroTagline:
      "After seven summers, one big move, and more road trips than we can count — we're finally doing the thing. We'd love you there.",
  },
  logistics: {
    date: '2027-04-26',
    time: '4:00 PM',
    venue: 'Casa Chorro',
    venueAddress: 'Santorini, Greece',
    rsvpDeadline: '2027-03-20',
    dresscode: 'Garden formal',
    notes: 'Soft colors. Block heels — it is grass.',
  },
  chapters: [
    {
      id: 'c1',
      order: 0,
      date: '2018-05-04',
      title: 'The spring we met',
      subtitle: 'Pearl District · Portland',
      description:
        "A friend's birthday, a crowded kitchen, and the worst dad joke that somehow worked. We closed the bar down talking about dumb stuff that mattered.",
      mood: 'warm',
      location: { lat: 0, lng: 0, label: 'Pearl District · Portland' },
      images: [],
    },
    {
      id: 'c2',
      order: 1,
      date: '2023-10-22',
      title: 'The ring at Cannon Beach',
      subtitle: 'Oregon Coast',
      description: 'Jamie knelt down on the wrong knee. Alex said yes before the question finished.',
      mood: 'lavender',
      location: { lat: 0, lng: 0, label: 'Cannon Beach, OR' },
      images: [],
    },
  ],
  events: [
    { id: 'e1', time: '3:00 PM', name: 'Arrive & settle', description: 'Park, find your seat, breathe in the meadow.' },
    { id: 'e2', time: '4:00 PM', name: 'Ceremony', description: 'Under the wildflower arch.' },
    { id: 'e3', time: '5:00 PM', name: 'Cocktails & golden hour', description: 'Photos, hors d’oeuvres, the band warms up.' },
    { id: 'e4', time: '6:30 PM', name: 'Dinner', description: 'Family-style. Short rib, halibut, garden plate.' },
    { id: 'e5', time: '8:30 PM', name: 'Dancing under string lights', description: 'Until they kick us out.' },
  ],
  travelInfo: {
    hotels: [
      { name: 'The Allison Inn & Spa', address: '2525 Allison Ln, Newberg, OR', bookingUrl: 'https://example.com/allison', distance: '12 min drive', groupRate: 'Wildflower group rate · $185/night' },
      { name: 'Atticus Hotel', address: '375 NE Ford St, McMinnville, OR', bookingUrl: 'https://example.com/atticus', distance: '20 min drive', groupRate: 'Mention "Alex & Jamie"' },
    ],
  },
  registry: {
    enabled: true,
    message: "Your presence is the gift. If you'd like to give more, these are the things we're building toward.",
    entries: [
      { name: 'Honeymoon fund', url: 'https://example.com/honeymoon', note: "We are going somewhere with no Wi-Fi." },
      { name: 'Our kitchen', url: 'https://example.com/kitchen', note: 'The dream Le Creuset list.' },
      { name: 'Zola registry', url: 'https://zola.com/alex-jamie', note: 'Everything else.' },
    ],
  },
  faqs: [
    { id: 'f1', question: 'What should I wear?', answer: 'Garden formal. Soft colors, block heels.' },
    { id: 'f2', question: 'Are kids welcome?', answer: 'Of course. There is a kid corner with quiet activities by the dance floor.' },
    { id: 'f3', question: 'Can I bring a plus-one?', answer: 'Check your invite — if it says +1 you are welcome to bring someone.' },
    { id: 'f4', question: 'Will dinner accommodate dietary needs?', answer: 'Yes. Vegetarian, vegan, and gluten-free options.' },
  ],
  comingSoon: { enabled: false, message: '' },
} as unknown as StoryManifest;
