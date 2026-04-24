/* ========================================================================
   Preview manifest seeder — hands SiteV8Renderer a plausible manifest so
   the marketplace modal shows what the real editor will render.

   Pulls theme colours + motifs + poetry from the matched SITE_TEMPLATE
   (if we have one) or the bespoke marketplace design spec otherwise.
   Sample chapters + events + FAQs + registry give the renderer enough
   structured data that every block inside the v8 stack has real copy
   to draw from — not placeholder shimmer.
   ======================================================================== */

import type { StoryManifest } from '@/types';
import type { Template } from './templates-data';
import { findMatchingSiteTemplate } from './template-matcher';
import { resolveTemplateDesign } from './template-themes';

export interface PreviewManifestBuild {
  manifest: StoryManifest;
  names: [string, string];
  slug: string;
  prettyUrl: string;
}

// Sample content libraries per occasion. Each preview manifest
// pulls the set that matches the template's declared occasion so
// a bachelor-party tile isn't staffed with "ceremony / reception"
// and a memorial tile isn't staffed with "dance floor opens at 9".

type SampleKey =
  | 'wedding'
  | 'birthday'
  | 'milestone-birthday'
  | 'retirement'
  | 'graduation'
  | 'anniversary'
  | 'engagement'
  | 'baby-shower'
  | 'bridal-shower'
  | 'rehearsal-dinner'
  | 'bachelor-party'
  | 'bachelorette-party'
  | 'reunion'
  | 'memorial'
  | 'funeral'
  | 'quinceanera'
  | 'bar-mitzvah'
  | 'bat-mitzvah'
  | 'baptism'
  | 'housewarming'
  | 'story';

const SAMPLE_CHAPTERS: Partial<Record<SampleKey, Array<{
  id: string; title: string; subtitle: string; description: string; date: string; mood: string; images: unknown[];
}>>> = {
  wedding: [
    { id: 'ch-1', title: 'The beginning', subtitle: 'A coffee that lasted hours', description: 'She ordered the same thing he did, twice in a row, before either of them said a word. Later they\'d call it the first sign.', date: '2019-04-08', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The middle, slowly', subtitle: 'Weekends, keys, then a dog', description: 'Two apartments became one. A garden that almost grew. A small rescue named Mabel who chose them both.', date: '2021-08-14', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'The yes that felt inevitable', subtitle: 'On the same hike they took the week they met', description: 'No speech. Just the ring in the wrong pocket, the right view, and a dog who barked at exactly the wrong moment.', date: '2024-10-03', mood: 'joyful', images: [] },
  ],
  birthday: [
    { id: 'ch-1', title: 'Year one', subtitle: 'A scream, then a grin', description: 'Arrived sideways. Screamed through the first haircut, laughed through the second. A curious, fierce little person from the start.', date: '1995-03-14', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The middle years', subtitle: 'Everything, all at once', description: 'Discovered the ocean at 6, the saxophone at 11, strong espresso at 17. Failed beautifully at many things that turned into favourites.', date: '2008-06-02', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'Now', subtitle: 'Still becoming', description: 'Still curious, still a little early to everything, still the person everyone texts for the good restaurant recommendation.', date: '2024-10-03', mood: 'joyful', images: [] },
  ],
  'milestone-birthday': [
    { id: 'ch-1', title: 'At twenty', subtitle: 'Loud, certain, wrong about most things', description: 'Bought a guitar, joined a band, broke up with the band, kept the guitar. Moved for a person, stayed for the city.', date: '1985-01-01', mood: 'playful', images: [] },
    { id: 'ch-2', title: 'At forty', subtitle: 'Quieter, kinder, funnier', description: 'Built the kind of life that doesn\'t make for good stories and makes for a good life. Stopped apologising for the small things.', date: '2005-01-01', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'Now', subtitle: 'Somehow still curious', description: 'Reading more. Running slower. Loving the people who stayed louder.', date: '2025-01-01', mood: 'joyful', images: [] },
  ],
  retirement: [
    { id: 'ch-1', title: 'Day one', subtitle: 'A nervous twenty-two', description: 'Showed up in a suit two sizes too big. Stayed late the first week — then every week for thirty-eight years.', date: '1986-05-12', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The middle', subtitle: 'Mentor, builder, friend', description: 'Hired, mentored, championed. Built teams that outlasted projects. Never missed a birthday or a deadline.', date: '2005-11-03', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'The send-off', subtitle: 'Still answering the phone', description: 'Leaving, finally. Already got a cabin, a kayak, and a long list of books.', date: '2024-12-20', mood: 'joyful', images: [] },
  ],
  graduation: [
    { id: 'ch-1', title: 'The first week', subtitle: 'Lost in the library', description: 'Couldn\'t find Building 4. Found a best friend instead. Decided to major in the thing that felt the scariest.', date: '2020-08-20', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The middle', subtitle: 'Caffeine, projects, quiet wins', description: 'All-nighters, group projects that somehow worked, professors who said the right thing at the right time.', date: '2022-05-10', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'The walk', subtitle: 'A degree, a dog, a next step', description: 'Walked the stage in shoes that hurt, holding flowers from a grandmother in the sixth row.', date: '2025-05-18', mood: 'joyful', images: [] },
  ],
  anniversary: [
    { id: 'ch-1', title: 'Year one', subtitle: 'Learning each other\'s coffee', description: 'Too many blankets, not enough closet. Still the best year until the next one.', date: '2015-08-14', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The middle', subtitle: 'A house, a garden, a dog', description: 'Moved three times, argued about one kitchen, kept every birthday card.', date: '2019-08-14', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'Ten, somehow', subtitle: 'Still us, still choosing', description: 'Ten years of picking each other again every morning.', date: '2025-08-14', mood: 'joyful', images: [] },
  ],
  engagement: [
    { id: 'ch-1', title: 'The night we met', subtitle: 'A friend\'s rooftop', description: 'Met in passing, talked for four hours, left with only a first name.', date: '2022-06-11', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The long middle', subtitle: 'Two cities, one rhythm', description: 'Weekly flights, weekend coffees, eventually just one mailbox.', date: '2023-11-02', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'The question', subtitle: 'At the lake, right before sunset', description: 'No speech, just the ring and the view. She said yes before he finished asking.', date: '2025-04-20', mood: 'joyful', images: [] },
  ],
  'baby-shower': [
    { id: 'ch-1', title: 'The news', subtitle: 'Two lines on a Tuesday', description: 'Called our parents, then each other\'s parents, then just stared at the sonogram for a full week.', date: '2025-02-10', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The waiting', subtitle: 'Nursery, names, new routines', description: 'Painted a room, picked a short list of names, read every book we were told to.', date: '2025-06-05', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'Almost here', subtitle: 'Packing the hospital bag', description: 'Any day now. Come shower us in all the things we will not remember to buy.', date: '2025-10-03', mood: 'joyful', images: [] },
  ],
  memorial: [
    { id: 'ch-1', title: 'The early years', subtitle: 'Mountains, music, a loud laugh', description: 'Grew up in a small town, left with a suitcase and a clarinet, came back every summer until she couldn\'t.', date: '1952-05-04', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The middle', subtitle: 'Teacher, friend, mother', description: 'Taught for thirty-four years. Knew every student\'s middle name. Made a tomato sauce that could fix most things.', date: '1984-09-01', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'The last chapter', subtitle: 'Surrounded by the people she made', description: 'Fierce to the end, still making us laugh the last Sunday. We\'ll carry her the way she carried us.', date: '2024-11-12', mood: 'reflective', images: [] },
  ],
  reunion: [
    { id: 'ch-1', title: 'The first class', subtitle: 'Nervous, loud, kind of dramatic', description: 'Freshman year. Someone sang in the hallway. Someone cried in the cafeteria. We all pretended we knew what we were doing.', date: '2010-08-26', mood: 'playful', images: [] },
    { id: 'ch-2', title: 'The middle', subtitle: 'Inside jokes, everyone-knows-everyone', description: 'Prom, senior trip, the teacher everyone loved. Photos that still make us laugh.', date: '2013-05-08', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'Now, fifteen years later', subtitle: 'Kids, cities, grey hairs', description: 'Back in the same room, most of us with partners, some of us with kids. Same people. A little softer.', date: '2025-06-07', mood: 'joyful', images: [] },
  ],
  story: [
    { id: 'ch-1', title: 'The first photo', subtitle: 'A lighthouse, a red coat', description: 'The photo I keep coming back to — taken by someone I don\'t know, somehow always on my desk.', date: '2018-10-12', mood: 'tender', images: [] },
    { id: 'ch-2', title: 'The one I almost lost', subtitle: 'A long train ride, a quiet window', description: 'I wrote the first line of this on the back of a napkin in Kyoto. Somewhere in here is everything after that.', date: '2021-03-20', mood: 'warm', images: [] },
    { id: 'ch-3', title: 'The now', subtitle: 'Still writing', description: 'Still writing. Still revising. Still keeping the napkins.', date: '2025-01-01', mood: 'joyful', images: [] },
  ],
};
SAMPLE_CHAPTERS.quinceanera = SAMPLE_CHAPTERS['milestone-birthday'];
SAMPLE_CHAPTERS['bar-mitzvah'] = SAMPLE_CHAPTERS['milestone-birthday'];
SAMPLE_CHAPTERS['bat-mitzvah'] = SAMPLE_CHAPTERS['milestone-birthday'];
SAMPLE_CHAPTERS.baptism = SAMPLE_CHAPTERS['milestone-birthday'];
SAMPLE_CHAPTERS.housewarming = SAMPLE_CHAPTERS.story;
SAMPLE_CHAPTERS.funeral = SAMPLE_CHAPTERS.memorial;
SAMPLE_CHAPTERS['bridal-shower'] = SAMPLE_CHAPTERS.wedding;
SAMPLE_CHAPTERS['rehearsal-dinner'] = SAMPLE_CHAPTERS.wedding;
SAMPLE_CHAPTERS['bachelor-party'] = SAMPLE_CHAPTERS.wedding;
SAMPLE_CHAPTERS['bachelorette-party'] = SAMPLE_CHAPTERS.wedding;

const SAMPLE_EVENTS: Partial<Record<SampleKey, Array<{
  id: string; name: string; type: 'ceremony' | 'reception' | 'rehearsal' | 'brunch' | 'welcome-party' | 'other'; date: string; time: string; venue: string; address: string; description: string; order: number;
}>>> = {
  wedding: [
    { id: 'ceremony', name: 'Ceremony', type: 'ceremony', date: '', time: '4:00pm', venue: 'The Old Orchard', address: '', description: 'Short and unhurried. Stay close, we want you in every photo.', order: 0 },
    { id: 'reception', name: 'Reception', type: 'reception', date: '', time: '6:30pm', venue: 'The Stone Barn', address: '', description: 'Family-style dinner, too many toasts, the dance floor opens at 9.', order: 1 },
    { id: 'brunch', name: 'Morning-after brunch', type: 'brunch', date: '', time: '10:00am', venue: 'The Old Orchard', address: '', description: 'Coffee, soft eggs, one last round of goodbyes.', order: 2 },
  ],
  birthday: [
    { id: 'dinner', name: 'Dinner', type: 'other', date: '', time: '7:00pm', venue: 'Il Buco', address: '', description: 'Long table in the back room. Bring a story, not a gift.', order: 0 },
    { id: 'drinks', name: 'Drinks after', type: 'other', date: '', time: '9:30pm', venue: 'The Quiet Bar', address: '', description: 'Reservation under the name. Stay as late as you want.', order: 1 },
  ],
  memorial: [
    { id: 'service', name: 'Service', type: 'ceremony', date: '', time: '11:00am', venue: 'St. Mary\'s Chapel', address: '', description: 'A short service with readings from family. Music by the quartet she taught.', order: 0 },
    { id: 'reception', name: 'Gathering', type: 'reception', date: '', time: '1:00pm', venue: 'The Community Hall', address: '', description: 'Coffee, stories, her recipe book on the table. Come when you can, stay as long as you like.', order: 1 },
  ],
  retirement: [
    { id: 'dinner', name: 'Toasts & dinner', type: 'reception', date: '', time: '6:30pm', venue: 'The Oaks Club', address: '', description: 'A few toasts, a lot of stories, dinner in the garden room.', order: 0 },
  ],
  graduation: [
    { id: 'ceremony', name: 'Ceremony', type: 'ceremony', date: '', time: '10:00am', venue: 'Main Quad', address: '', description: 'The walk across the stage, diploma, hug from Mom. Easy part.', order: 0 },
    { id: 'party', name: 'Open house', type: 'other', date: '', time: '2:00pm', venue: 'Home', address: '', description: 'Drop by anytime between 2–7. Hot dogs, cake, a surprise.', order: 1 },
  ],
  anniversary: [
    { id: 'dinner', name: 'Dinner', type: 'reception', date: '', time: '7:00pm', venue: 'The Garden Room', address: '', description: 'Small, loud, full of the people who\'ve been with us the whole time.', order: 0 },
  ],
  'baby-shower': [
    { id: 'brunch', name: 'Brunch', type: 'brunch', date: '', time: '11:00am', venue: 'Mom\'s Garden', address: '', description: 'Quiches, fruit, a cake we probably won\'t eat. Games if you want them.', order: 0 },
  ],
  reunion: [
    { id: 'open-house', name: 'Friday mixer', type: 'welcome-party', date: '', time: '7:00pm', venue: 'The Old Gym', address: '', description: 'Name tags, drinks, yearbook slideshow on loop.', order: 0 },
    { id: 'dinner', name: 'Saturday dinner', type: 'reception', date: '', time: '6:30pm', venue: 'The Old Gym', address: '', description: 'Plated dinner, live music, the reunion-committee speech nobody will remember.', order: 1 },
  ],
};
SAMPLE_EVENTS['milestone-birthday'] = SAMPLE_EVENTS.birthday;
SAMPLE_EVENTS.quinceanera = SAMPLE_EVENTS.birthday;
SAMPLE_EVENTS['bar-mitzvah'] = SAMPLE_EVENTS.birthday;
SAMPLE_EVENTS['bat-mitzvah'] = SAMPLE_EVENTS.birthday;
SAMPLE_EVENTS.baptism = SAMPLE_EVENTS.memorial;
SAMPLE_EVENTS.funeral = SAMPLE_EVENTS.memorial;
SAMPLE_EVENTS.housewarming = SAMPLE_EVENTS.birthday;
SAMPLE_EVENTS.engagement = SAMPLE_EVENTS.anniversary;
SAMPLE_EVENTS['bridal-shower'] = SAMPLE_EVENTS['baby-shower'];
SAMPLE_EVENTS['rehearsal-dinner'] = SAMPLE_EVENTS.anniversary;

const SAMPLE_FAQS: Partial<Record<SampleKey, Array<{ id: string; question: string; answer: string; order: number }>>> = {
  wedding: [
    { id: 'faq-1', question: 'What should I wear?', answer: 'Cocktail attire in garden-friendly shoes. The ceremony is outdoors on soft grass.', order: 0 },
    { id: 'faq-2', question: 'Are kids invited?', answer: 'We love your kids — we asked only a small few to come. Please ask us first so we can plan for them.', order: 1 },
  ],
  birthday: [
    { id: 'faq-1', question: 'What should I bring?', answer: 'Just yourself. If you absolutely must bring something — a memory, written on a card.', order: 0 },
    { id: 'faq-2', question: 'Where do I park?', answer: 'Valet at the restaurant, or the lot two blocks south is free after 6.', order: 1 },
  ],
  memorial: [
    { id: 'faq-1', question: 'Dress code?', answer: 'Wear what feels right. She loved colour.', order: 0 },
    { id: 'faq-2', question: 'Can I bring my kids?', answer: 'Yes. She always loved the little ones in the room.', order: 1 },
    { id: 'faq-3', question: 'Flowers or donations?', answer: 'In lieu of flowers, the family is collecting for the Clarinet Scholarship she started.', order: 2 },
  ],
};
SAMPLE_FAQS['milestone-birthday'] = SAMPLE_FAQS.birthday;
SAMPLE_FAQS.anniversary = SAMPLE_FAQS.birthday;
SAMPLE_FAQS.engagement = SAMPLE_FAQS.wedding;
SAMPLE_FAQS['bridal-shower'] = SAMPLE_FAQS.wedding;
SAMPLE_FAQS['rehearsal-dinner'] = SAMPLE_FAQS.wedding;
SAMPLE_FAQS.retirement = SAMPLE_FAQS.birthday;
SAMPLE_FAQS.graduation = SAMPLE_FAQS.birthday;
SAMPLE_FAQS.reunion = SAMPLE_FAQS.birthday;
SAMPLE_FAQS.funeral = SAMPLE_FAQS.memorial;

function pickSample<K extends SampleKey, T>(
  source: Partial<Record<SampleKey, T>>,
  occasion: string,
  fallback: SampleKey,
): T {
  const key = (occasion ?? '').toLowerCase() as SampleKey;
  return source[key] ?? source[fallback] ?? source.wedding ?? (undefined as unknown as T);
}

const SAMPLE_NAMES: Record<SampleKey, [string, string]> = {
  wedding: ['Alex', 'Jamie'],
  engagement: ['Alex', 'Jamie'],
  anniversary: ['Alex', 'Jamie'],
  birthday: ['Mira', ''],
  'milestone-birthday': ['Mira', ''],
  retirement: ['Richard', ''],
  graduation: ['Sam', ''],
  'baby-shower': ['Baby', 'Alex & Jamie'],
  'bridal-shower': ['Alex', 'Jamie'],
  'rehearsal-dinner': ['Alex', 'Jamie'],
  'bachelor-party': ['Jamie', ''],
  'bachelorette-party': ['Alex', ''],
  reunion: ['Class of', '2010'],
  memorial: ['Ruth', 'Ellen'],
  funeral: ['Ruth', 'Ellen'],
  quinceanera: ['Sofia', ''],
  'bar-mitzvah': ['Daniel', ''],
  'bat-mitzvah': ['Maya', ''],
  baptism: ['Baby', ''],
  housewarming: ['The Park', 'Family'],
  story: ['A', 'Story'],
};

export function seedPreviewManifest(template: Template): PreviewManifestBuild {
  const site = findMatchingSiteTemplate(template);
  const design = resolveTemplateDesign(template.id);

  // Theme colors — prefer the rich SITE_TEMPLATE when we have it,
  // otherwise fall back to the bespoke marketplace design spec so
  // every tile still renders with its specific palette.
  const theme = site
    ? {
        colors: site.theme.colors,
        fonts: site.theme.fonts,
      }
    : {
        colors: {
          background: design.theme.background,
          foreground: design.theme.foreground,
          accent: design.theme.accent,
          accentLight: design.theme.accentLight,
          muted: design.theme.muted,
          cardBg: design.theme.cardBg ?? design.theme.background,
        },
        fonts: { heading: design.fonts.heading, body: design.fonts.body },
      };

  const poetry = site?.poetry ?? {
    heroTagline: template.heroScript ?? template.tagline ?? 'a day worth keeping',
    closingLine: 'with love · made on Pearloom',
    rsvpIntro: 'Let us know if you can make it.',
    welcomeStatement: template.description,
  };

  const motifs = site?.motifs ?? {
    stamp: { text: (template.heroWord ?? template.name).toUpperCase(), tone: 'peach', rotation: -3 },
    sparkle: true,
  };

  const occasion = (template.occasion ?? 'wedding').toLowerCase();
  const chaptersSample = pickSample(SAMPLE_CHAPTERS, occasion, 'wedding');
  const eventsSample = pickSample(SAMPLE_EVENTS, occasion, 'wedding');
  const faqsSample = pickSample(SAMPLE_FAQS, occasion, 'wedding');
  const names = (SAMPLE_NAMES[occasion as SampleKey] ?? SAMPLE_NAMES.wedding) as [string, string];

  const manifest = {
    // Minimal content that lets every v8 block render meaningfully.
    chapters: chaptersSample,
    events: eventsSample,
    faqs: faqsSample,
    faq: faqsSample,
    logistics: {
      date: '2026-09-12',
      venue: 'The Old Orchard',
      venueAddress: '12 Orchard Lane · Hudson Valley, NY',
      dresscode: 'Garden cocktail',
      rsvpDeadline: '2026-08-15',
    },
    registry: {
      enabled: true,
      message: 'Your presence is the gift. If you\'d like to mark the day, here\'s where to find us.',
      entries: [
        { name: 'Crate & Barrel', url: 'https://crateandbarrel.com', note: 'Home things, mostly ceramic' },
        { name: 'Zola', url: 'https://zola.com', note: 'A few honeymoon pieces' },
      ],
    },
    travelInfo: {
      airports: ['JFK · 2hr drive', 'Stewart (SWF) · 40min drive'],
      hotels: [
        { name: 'The Orchard Inn', address: '2 Orchard Lane', groupRate: 'Pearloom block · $180/night' },
        { name: 'Kingston Springs Hotel', address: '18 Main St', groupRate: '10% off with code ALEXJAMIE' },
      ],
    },
    // Template identity
    templateId: site?.id ?? template.id,
    vibeString: site?.vibeString ?? template.description,
    theme,
    motifs,
    poetry,
    rendererVersion: 'v2',
    themeFamily: 'v8',
    // Template-declared structural overrides
    blockOrder: site?.blockOrder,
    hiddenBlocks: site?.hiddenBlocks,
    blocks: site?.blocks,
    occasion,
  } as unknown as StoryManifest;

  return {
    manifest,
    names,
    slug: 'preview',
    prettyUrl: 'pearloom.com/preview',
  };
}
