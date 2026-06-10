// ─────────────────────────────────────────────────────────────
// demo-manifest — the canonical showcase site (Elena & Theo's
// Santorini wedding). Served in PRODUCTION at /demo so the
// marketing page's "Read a real site" CTAs open something real,
// and reused by /dev/site (which adds query-param look knobs for
// visual QA).
//
// This is the product's shop window: it deliberately exercises
// EVERY core section of the redesign canvas (hero / countdown /
// story / schedule / details / travel / map / gallery / registry
// / music / faq / rsvp) with real photography, the `santorini`
// theme, and a curated layout variant per section — so a visitor
// sees the full range of what a woven site can be, not a text
// skeleton.
//
// Photos are Unsplash CDN URLs (stable, immutable IDs — same
// pattern as marketing/v2/LandingProof.tsx). If one ever 404s,
// FadeInImage degrades to the tonal paper base, never a broken
// glyph.
//
// KEEP THE EVENT DATE IN THE FUTURE. buildCopy flips the site
// into post-event mode ("Thank you for joining us") the day
// after `logistics.date` — a stale date quietly turns the demo
// into a thank-you page (this happened once already).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export const DEMO_NAMES: [string, string] = ['Elena', 'Theo'];

/* Unsplash helper — crop + quality params on a stable photo id. */
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const DEMO_MANIFEST = {
    occasion: 'wedding',
    themeFamily: 'v8',
    subject: { kind: 'couple' },
    vibeString: 'sun-washed, editorial, Aegean',

    // ── Look — the santorini theme leads; everything else stays
    //    on the theme's own texture (linen) + motif (olive).
    themeId: 'santorini',
    siteLayout: 'stacked',
    kitId: 'classic',
    density: 'comfortable',
    textureIntensity: 1,
    motifsEnabled: true,

    // ── Section order + per-section layout variants. Optional
    //    sections (countdown / map / music) only render when they
    //    appear in blockOrder — all three are on so the demo shows
    //    the full catalog. Hero stays pinned first by the renderer.
    blockOrder: [
      'countdown', 'story', 'schedule', 'details', 'travel', 'map',
      'gallery', 'registry', 'music', 'faq', 'rsvp',
    ],
    layouts: {
      hero: 'fullbleed',      // caldera photo behind a dark scrim
      story: 'zigzag',        // alternating photo chapters
      details: 'bento',       // hero card + tiles
      schedule: 'cards',      // default — has the Day 1 / Day 2 grouping
      travel: 'rows',         // photo cards per hotel
      registry: 'progress',   // honeymoon-fund bar
      gallery: 'masonry',     // varied row heights
      faq: 'twocol',
      rsvp: 'centered',
      countdown: 'flip',      // split-flap digits
      map: 'postcard',        // tilted frame + faux stamp
      music: 'card',
      nav: 'centered',
    },

    // ── Hero ─────────────────────────────────────────────────
    coverPhoto: u('photo-1570077188670-e3a8d69ac5ff', 1600),
    tagline:
      "Two summers ago, Theo asked at the edge of the caldera. This June we're going back — and we're bringing everyone we love.",
    poetry: {
      heroTagline:
        "Two summers ago, Theo asked at the edge of the caldera. This June we're going back — and we're bringing everyone we love.",
    },
    copy: {
      heroLead: 'A wedding on the caldera',
      scheduleEyebrow: 'The weekend',
      scheduleTitle: 'Two days in the Aegean',
      galleryEyebrow: 'The island',
      galleryTitle: 'Postcards from Santorini',
      travelEyebrow: 'Getting to Oia',
      countdownEyebrow: 'The big day',
      mapEyebrow: 'Where it’s happening',
      musicEyebrow: 'The soundtrack',
    },

    logistics: {
      date: '2027-06-26',
      time: '5:00 PM',
      venue: 'The Caldera House',
      place: 'Oia, Santorini',
      venueAddress: 'Main Marble Street, Oia 847 02, Greece',
      rsvpDeadline: '2027-05-15',
      dresscode: 'Summer formal — linen & light colors',
      notes: 'Marble and cobblestone underfoot. Block heels or flats.',
    },

    countdown: { label: 'Until we say yes in Oia' },
    mapBlock: { showDirections: true },
    music: {
      provider: 'spotify',
      /* "Greek Summer 2026" — Minos EMI's (Universal Greece) own
         editorial playlist, so it stays maintained. Verified
         public, 128 songs (2026-06-10). */
      url: 'https://open.spotify.com/playlist/61UhFOPck9ZN6G3c1GrbiH',
      title: 'Songs for a Greek summer',
      description:
        'What we’ll be playing on the terrace — bouzouki at dinner, disco after dark. Add your requests in the RSVP.',
    },

    // ── Story — three photo chapters (zigzag reads chapters[0..2]).
    storySection: {
      headline: 'From Athens, to forever',
      body:
        'We met on a rooftop in Athens, kept choosing each other across eight island summers, and got engaged where the cliff meets the sky. Now we get to tell you the whole story in person.',
      chips: ['Athens, 2019', 'Eight island summers', 'Yes — at the edge of the world'],
    },
    chapters: [
      {
        id: 'c1',
        order: 0,
        date: '2019-06-14',
        title: 'A rooftop in Athens',
        subtitle: 'Koukaki, under the Acropolis',
        description:
          "A friend's name-day dinner, one chair short. Theo gave up his, then spent the night standing next to it. We watched the Parthenon lights come on and forgot to rejoin the table.",
        mood: 'warm',
        location: { lat: 0, lng: 0, label: 'Athens, Greece' },
        images: [{ url: u('photo-1555993539-1732b0258235') }],
      },
      {
        id: 'c2',
        order: 1,
        date: '2022-08-02',
        title: 'Eight island summers',
        subtitle: 'Naxos · Milos · Folegandros',
        description:
          'Every August, a ferry to somewhere new. We learned each other on deck chairs and in port tavernas — and learned that Elena will swim in any water, any month, any hour.',
        mood: 'field',
        location: { lat: 0, lng: 0, label: 'The Cyclades' },
        images: [{ url: u('photo-1507525428034-b723cf961d3e') }],
      },
      {
        id: 'c3',
        order: 2,
        date: '2025-06-21',
        title: 'The question, at the edge of the world',
        subtitle: 'Oia, Santorini',
        description:
          'Sunset on the caldera rim, a ring Theo had carried through three airports, and a yes before he finished the sentence. We booked the venue the next morning, still in yesterday’s clothes.',
        mood: 'peach',
        location: { lat: 0, lng: 0, label: 'Oia, Santorini' },
        images: [{ url: u('photo-1613395877344-13d4a8e0d49e') }],
      },
    ],

    // ── Schedule — a real two-day destination weekend. `day`
    //    values trigger the Day 1 / Day 2 grouped rendering.
    events: [
      { id: 'e1', day: 1, time: '7:00 PM', name: 'Welcome dinner', venue: 'Ammoudi Bay', description: 'Fresh fish tavernas at the bottom of the 300 steps. We’ll help you back up.' },
      { id: 'e2', day: 1, time: '9:30 PM', name: 'Sunset raki', venue: 'The harbour rocks', description: 'One toast as the sun drops behind Thirasia.' },
      { id: 'e3', day: 2, time: '5:00 PM', name: 'Ceremony', venue: 'The Caldera House terrace', description: 'Short, sweet, and three hundred meters above the sea.' },
      { id: 'e4', day: 2, time: '6:00 PM', name: 'Cocktails at golden hour', venue: 'The cliff bar', description: 'Assyrtiko, mezze, and the best view in the Cyclades.' },
      { id: 'e5', day: 2, time: '8:00 PM', name: 'Dinner under the vines', venue: 'Long table, upper terrace', description: 'Family-style Greek feast — come hungry, leave slowly.' },
      { id: 'e6', day: 2, time: '10:30 PM', name: 'Dancing till the stars give up', venue: 'The courtyard', description: 'Starts with a zeibekiko. Ends when it ends.' },
    ],

    // ── Details — bento variant reads these three cards.
    detailsCards: [
      ['Dress code', 'Summer formal in linen and light colors — the terrace is marble, so block heels or flats'],
      ['Adults-only evening', 'We love your little ones, but this one’s past their bedtime'],
      ['Gifts', 'Your presence — and your dance moves — are more than enough'],
    ],
    adultsOnly: true,

    // ── Travel — three real-feeling hotels with photos. The
    //    `rows` variant renders photoUrl, rating, price, amenities.
    travelInfo: {
      directions:
        'Fly into Santorini (JTR) — Oia is 25 minutes by taxi. Ferries run daily from Athens (Piraeus) if you’d rather arrive by sea. Say “Elena & Theo” when you book; all three hotels are holding rooms for us.',
      shuttle: {
        enabled: true,
        note: 'A shuttle loops between Fira hotels and the venue from 4 PM on the day — last run back at 2 AM.',
      },
      hotels: [
        {
          name: 'Canaves Oia Suites',
          address: 'Main Street, Oia',
          distance: '5-min walk',
          priceLevel: '$$$$',
          rating: 4.9,
          ratingCount: 612,
          amenities: 'Caldera view · Infinity pool · Breakfast',
          description: 'Carved-into-the-cliff suites a few marble steps from the venue. The splurge.',
          photoUrl: u('photo-1566073771259-6a8506099945'),
          bookingUrl: 'https://example.com/canaves',
        },
        {
          name: 'Hotel Atlantis',
          address: 'Fira town',
          distance: '20-min shuttle',
          priceLevel: '$$$',
          rating: 4.7,
          ratingCount: 894,
          amenities: 'Sea view · Pool · Family rooms',
          description: 'The grand dame of Fira — easy tavernas, easy buses, easier prices.',
          photoUrl: u('photo-1582719478250-c89cae4dc85b'),
          bookingUrl: 'https://example.com/atlantis',
        },
        {
          name: 'Finikia Memories',
          address: 'Finikia, behind Oia',
          distance: '12-min walk',
          priceLevel: '$$',
          rating: 4.6,
          ratingCount: 451,
          amenities: 'Quiet village · Terrace · Breakfast',
          description: 'Whitewashed rooms in the sleepy village just over the hill from the venue.',
          photoUrl: u('photo-1571896349842-33c89424de2d'),
          bookingUrl: 'https://example.com/finikia',
        },
      ],
    },

    // ── Gallery — masonry with real photos + a few captions
    //    (galleryCaptions is an index-keyed sidecar record).
    galleryImages: [
      u('photo-1533105079780-92b9be482077'),
      u('photo-1519741497674-611481863552'),
      u('photo-1465495976277-4387d4b0b4c6'),
      u('photo-1511285560929-80b456fea0bc'),
      u('photo-1522673607200-164d1b6ce486'),
      u('photo-1519225421980-715cb0215aed'),
      u('photo-1529636798458-92182e662485'),
      u('photo-1606800052052-a08af7148866'),
    ],
    galleryCaptions: {
      '0': 'Oia, the morning after the yes',
      '1': 'Practice round',
      '4': 'Stin iyia mas — to our health',
      '6': 'The zeibekiko lesson',
    },

    // ── Registry — progress variant shows the fund bar.
    registryIntro:
      'You’re crossing an ocean for us — that is the gift. If you’d like to add to something anyway, this is what we’re building toward.',
    registryStores: [
      { name: 'Honeymoon fund — Aegean island hopping', url: 'https://example.com/honeymoon' },
      { name: 'Our first kitchen', url: 'https://example.com/kitchen' },
      { name: 'Zola', url: 'https://zola.com/elena-theo' },
    ],
    fundPct: 64,
    fundSub: '64% of the sailboat charter funded',

    // ── RSVP ─────────────────────────────────────────────────
    mealOptions: [
      { id: 'm1', name: 'Slow lamb kleftiko', dietaryTags: [] },
      { id: 'm2', name: 'Grilled sea bass', dietaryTags: [] },
      { id: 'm3', name: 'Garden moussaka', dietaryTags: ['vegetarian'] },
    ],

    // ── FAQ — twocol variant, six questions with answers.
    faqs: [
      { id: 'f1', question: 'What should I wear?', answer: 'Summer formal in linen and light colors. The terrace is marble and cobblestone — block heels or flats will save your evening.' },
      { id: 'f2', question: 'How do I get to Oia from the airport?', answer: 'A taxi takes about 25 minutes (€35–40). On the wedding day our shuttle covers all Fira hotels — see Travel above.' },
      { id: 'f3', question: 'Can I bring a plus-one?', answer: 'If your invite says +1, absolutely — add their name to your RSVP so we can set a plate.' },
      { id: 'f4', question: 'Is the ceremony outdoors?', answer: 'Yes — on the caldera terrace. June evenings are warm with a sea breeze; bring a light layer for after dark.' },
      { id: 'f5', question: 'Will there be vegetarian food?', answer: 'Plenty — the feast is half garden anyway. Note anything else in your RSVP and the kitchen will take care of you.' },
      { id: 'f6', question: 'What’s a zeibekiko?', answer: 'You’ll find out around 10:30 on Saturday. Your only job is to kneel in a circle and clap.' },
    ],

    hashtags: ['ElenaAndTheoInOia'],
  } as unknown as StoryManifest;
