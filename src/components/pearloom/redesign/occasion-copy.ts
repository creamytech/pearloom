/* ─────────────────────────────────────────────────────────────
   Occasion copy packs — the renderer's fallback + demo copy,
   routed by occasion.

   THE BUG THIS FIXES: buildCopy's voice registry was pure
   wedding copy ("How we met", "together, at last", Ceremony /
   Cocktails schedule, Honeymoon-fund registry) applied to every
   occasion — a solo birthday site published with "Our story /
   How we met" and a fabricated couple anecdote.

   Every field here is either CHROME (eyebrows, section titles,
   nav labels — safe on published sites) or DEMO content (marked
   *Demo — buildCopy must gate those behind the editable/demoCopy
   flag so fabricated content never reaches guests).

   Leaf module: pure data + one lookup, no imports — ThemedSite,
   the editor, and the wizard preview all read the same packs.
   Copy follows BRAND.md §7: lowercase taglines, no exclamation
   marks, warm not cheesy.
   ───────────────────────────────────────────────────────────── */

export interface OccasionCopy {
  /** Hero eyebrow ("Save the date"). */
  lead: string;
  /** Hero italic tagline fallback. */
  tagline: string;
  storyEyebrow: string;
  storyTitle: string;
  storyItalic: string;
  /** Editor/demo-only story body — NEVER rendered on published sites. */
  storyBodyDemo: string;
  /** Nav link label for the story section. */
  navStory: string;
  /** Nav link + section-eyebrow label for the registry section —
   *  "Registry" everywhere except the solemn occasions, whose
   *  registry is a donations surface ("In lieu of flowers"). */
  navRegistry: string;
  /** Hero primary CTA label. */
  cta: string;
  rsvpTitle: string;
  rsvpBody: string;
  /** Editor/demo-only Details cards: the dress-code value and the
   *  gifts card ([label, value]). The kids card stays with
   *  buildCopy (it responds to the panel's toggles). */
  detailsDressDemo: string;
  detailsGiftsCard: [string, string];
  registryTitleHead: string;
  registryTitleItalic: string;
  registryBody: string;
  /** Editor/demo-only store chips. */
  registryDemoStores: string[];
  /** Editor/demo-only schedule rows. */
  scheduleDemo: Array<{ t: string; l: string; s: string }>;
  /** Editor/demo-only FAQ questions (also the first-touch seed). */
  faqDemo: string[];
  /** Tribute wall composer prompt (chrome — safe when published). */
  tributePrompt: string;
  /** Tribute wall post-submit line. Must say the words wait for
   *  host approval before they appear on the wall. */
  tributeConfirm: string;
  /** Story-timeline milestone chips — the rail's fallback eyebrows
   *  when the host authored no chips (chrome — safe published, but
   *  must read right per occasion: never "We met" on a memorial). */
  storyChips: [string, string, string];
  /** Countdown section eyebrow + label (chrome). */
  countdownEyebrow: string;
  countdownLabel: string;
  /** Music section eyebrow + default title (chrome). */
  musicEyebrow: string;
  musicTitle: string;
  /** Guest-playlist composer subline ("The dance floor takes
   *  requests." is wedding-party voice — chrome). */
  musicComposerHint: string;
  /** Map section eyebrow (chrome). */
  mapEyebrow: string;
}

const BASE: OccasionCopy = {
  lead: 'Save the date',
  tagline: 'a day worth celebrating',
  storyEyebrow: 'The story',
  storyTitle: 'The story',
  storyItalic: 'so far',
  storyBodyDemo:
    'Every celebration has a story behind it. Write yours here, how this day came to be, and why the people you love should be part of it.',
  navStory: 'The story',
  navRegistry: 'Registry',
  cta: 'RSVP',
  rsvpTitle: 'Save your seat',
  rsvpBody: 'Twenty seconds and you’re done, no account needed.',
  detailsDressDemo: 'Cocktail attire',
  detailsGiftsCard: ['Gifts', 'Your presence is enough'],
  registryTitleHead: 'Your presence is',
  registryTitleItalic: 'the gift',
  registryBody: "If you'd like to celebrate further, we've put a few things together.",
  registryDemoStores: ['A wishlist'],
  scheduleDemo: [
    { t: '5:00 pm', l: 'Welcome drinks', s: 'On arrival' },
    { t: '6:30 pm', l: 'Dinner', s: 'Long table' },
    { t: '8:00 pm', l: 'Toasts', s: 'Raise a glass' },
    { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
  ],
  faqDemo: [
    "What's the dress code, really?",
    'Can I bring a plus-one?',
    'Are kids welcome?',
    'Where should I park?',
  ],
  tributePrompt: 'Leave a few words',
  tributeConfirm: 'Woven in, the hosts will read it before it joins the wall.',
  storyChips: ['The beginning', 'Along the way', 'This day'],
  countdownEyebrow: 'The big day',
  countdownLabel: 'Until we celebrate',
  musicEyebrow: 'The soundtrack',
  musicTitle: 'Songs for the night',
  musicComposerHint: 'The playlist takes requests.',
  mapEyebrow: 'Where it’s happening',
};

/* Wedding voices — the host's Pear-voice pick (classic / playful /
   poetic) modulates the wedding-arc couple copy. Other occasions
   read their pack directly; extending voices beyond weddings is a
   named follow-up. */
export const WEDDING_VOICES = {
  classic: {
    lead: 'Save the date',
    tagline: 'together, at last',
    storyEyebrow: 'Our story',
    storyTitle: 'How we',
    storyItalic: 'met',
    rsvpTitle: 'Save your seat',
  },
  playful: {
    lead: "It's happening",
    tagline: 'finally putting a ring on it',
    storyEyebrow: 'How we got here',
    storyTitle: 'The (long)',
    storyItalic: 'short of it',
    rsvpTitle: 'Get in here',
  },
  poetic: {
    lead: 'A small forever',
    tagline: 'of all the days, this one',
    storyEyebrow: 'Two threads, one weave',
    storyTitle: 'Where we',
    storyItalic: 'began',
    rsvpTitle: 'Hold this day with us',
  },
} as const;

export type WeddingVoice = keyof typeof WEDDING_VOICES;

const WEDDING: OccasionCopy = {
  ...BASE,
  ...WEDDING_VOICES.classic,
  storyBodyDemo:
    'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry, there is no story we would rather tell, and no one we would rather tell it to.',
  navStory: 'Our story',
  detailsDressDemo: 'Garden formal',
  registryDemoStores: ['Honeymoon fund', 'Crate & Barrel', 'Zola'],
  scheduleDemo: [
    { t: '4:30 pm', l: 'Ceremony', s: 'Olive grove' },
    { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
    { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
    { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
  ],
  faqDemo: [
    "What's the dress code, really?",
    'Can I bring a plus-one?',
    'Are kids welcome at the ceremony?',
    'Where should we stay?',
  ],
  storyChips: ['We met', 'We fell', 'We knew'],
  musicTitle: 'Songs for the dance floor',
  musicComposerHint: 'The dance floor takes requests.',
};

const CEREMONIAL_FAQ = [
  'What should I wear to the service?',
  'Can I take photos during the service?',
  'Are kids welcome?',
  'Where should I park?',
];

const SOLEMN: OccasionCopy = {
  ...BASE,
  lead: 'In loving memory',
  tagline: 'a life, well loved',
  storyEyebrow: 'Their story',
  storyTitle: 'A life',
  storyItalic: 'remembered',
  storyBodyDemo:
    'A place for their story, the years, the people they loved, the moments that keep coming up in every phone call. Written in your words, at your pace.',
  navStory: 'Their story',
  navRegistry: 'In lieu of flowers',
  cta: 'Reply',
  rsvpTitle: "Let us know you'll be there",
  rsvpBody: 'A quick reply helps the family plan the day.',
  detailsDressDemo: 'Dark colors, if you wish',
  detailsGiftsCard: ['In lieu of flowers', 'Donations welcome'],
  registryTitleHead: 'In their',
  registryTitleItalic: 'memory',
  registryBody: 'In lieu of flowers, the family suggests a gift in their memory.',
  registryDemoStores: ['In lieu of flowers'],
  scheduleDemo: [
    { t: '10:00 am', l: 'Visitation', s: 'Arrive quietly' },
    { t: '11:00 am', l: 'Service', s: 'Main hall' },
    { t: '12:30 pm', l: 'Reception', s: 'Food & stories' },
  ],
  faqDemo: [
    'What should I wear?',
    'May I send flowers or a gift?',
    'Are children welcome?',
    'Where should I park?',
  ],
  tributePrompt: 'Share a memory',
  tributeConfirm: 'Woven in, the family will see it soon. It appears here once they’ve read it.',
  storyChips: ['The early years', 'A life in full', 'Remembered'],
  countdownEyebrow: 'The day',
  countdownLabel: 'Until we gather',
  musicEyebrow: 'The music',
  musicTitle: 'Songs they loved',
  musicComposerHint: 'Share a song that brings them back.',
  mapEyebrow: 'Where we gather',
};

const PACKS: Record<string, OccasionCopy> = {
  /* ── Wedding arc ─────────────────────────────────────────── */
  wedding: WEDDING,
  'vow-renewal': {
    ...WEDDING,
    tagline: 'we still do',
    storyTitle: 'Why we',
    storyItalic: 'still do',
    storyBodyDemo:
      "The first time, we promised. This time, we know. Write about the years that proved the vows, and why you're saying them again.",
    registryDemoStores: ['A trip fund'],
  },
  engagement: {
    ...WEDDING,
    tagline: 'we said yes',
    storyBodyDemo:
      "We met on an ordinary Tuesday and knew by Thursday. Now there's a ring, a date to find, and a party to throw, and we'd love for you to be there as it all begins.",
    registryDemoStores: ['Zola'],
    scheduleDemo: [
      { t: '6:00 pm', l: 'Cocktails', s: 'Garden bar' },
      { t: '7:30 pm', l: 'Toasts', s: 'A few words' },
      { t: '8:30 pm', l: 'Dancing', s: 'Until late' },
    ],
    faqDemo: BASE.faqDemo,
  },
  anniversary: {
    ...BASE,
    tagline: 'still, after all these years',
    storyEyebrow: 'Our story',
    storyTitle: 'The years',
    storyItalic: 'between',
    storyBodyDemo:
      'Ten years, two cities, one very opinionated dog. Tell the story of the years between the vows and now, the chapters your guests were there for, and the ones they missed.',
    navStory: 'Our story',
    registryDemoStores: ['A trip fund'],
    scheduleDemo: [
      { t: '6:00 pm', l: 'Drinks', s: 'On arrival' },
      { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
      { t: '8:30 pm', l: 'Toasts', s: 'To the years' },
      { t: '9:30 pm', l: 'Dancing', s: 'Until late' },
    ],
    storyChips: ['Where it began', 'The years between', 'Today'],
  },
  'bachelor-party': {
    ...BASE,
    tagline: 'one last round',
    storyEyebrow: 'The plan',
    storyTitle: 'The last',
    storyItalic: 'hurrah',
    storyBodyDemo:
      'One groom, one weekend, zero sleep planned. Lay out the plan, and what everyone needs to know before they book.',
    navStory: 'The plan',
    cta: "I'm in",
    rsvpTitle: 'Lock it in',
    detailsDressDemo: 'Pack for the weekend',
    scheduleDemo: [
      { t: 'Fri 6:00 pm', l: 'Arrivals', s: 'Check in' },
      { t: 'Fri 8:00 pm', l: 'Dinner', s: "First round's on us" },
      { t: 'Sat 11:00 am', l: 'The main event', s: 'Details in the chat' },
      { t: 'Sun 10:00 am', l: 'Recovery brunch', s: 'Then home' },
    ],
    faqDemo: [
      "What's this going to cost?",
      'What should I pack?',
      'When should I book travel?',
      'Where are we staying?',
    ],
    countdownLabel: 'Until the weekend',
  },
  get 'bachelorette-party'() {
    return {
      ...this['bachelor-party'],
      tagline: 'one last fling',
      storyBodyDemo:
        'One bride, one weekend, a group chat already out of control. Lay out the plan, and what everyone needs to know before they book.',
    };
  },
  'bridal-shower': {
    ...BASE,
    tagline: 'for the bride-to-be',
    storyEyebrow: 'The occasion',
    storyTitle: 'Before the',
    storyItalic: 'big day',
    storyBodyDemo:
      'Before the aisle, an afternoon just for her. Share how you know the bride, and what the gathering will look like.',
    detailsGiftsCard: ['Gifts', 'Registry linked below'],
    registryDemoStores: ['Zola', 'Crate & Barrel'],
    scheduleDemo: [
      { t: '11:00 am', l: 'Brunch', s: 'Welcome' },
      { t: '12:00 pm', l: 'Games', s: 'Prizes included' },
      { t: '1:00 pm', l: 'Presents', s: 'On the couch' },
      { t: '2:00 pm', l: 'Cake', s: 'And toasts' },
    ],
    faqDemo: [
      'What should I bring?',
      "What's the dress code?",
      'Are kids welcome?',
      'Where should I park?',
    ],
  },
  get 'bridal-luncheon'() {
    return {
      ...this['bridal-shower'],
      tagline: 'for the bride',
      scheduleDemo: [
        { t: '12:00 pm', l: 'Luncheon', s: 'Seated' },
        { t: '1:30 pm', l: 'Toasts', s: 'To the bride' },
      ],
    };
  },
  'rehearsal-dinner': {
    ...BASE,
    tagline: 'the night before',
    storyEyebrow: 'The occasion',
    storyTitle: 'The night',
    storyItalic: 'before',
    storyBodyDemo:
      "Before the big day, a smaller table. A few words about tonight, who's hosting, who's toasting, and how the evening runs.",
    scheduleDemo: [
      { t: '5:00 pm', l: 'Rehearsal', s: 'At the venue' },
      { t: '6:30 pm', l: 'Dinner', s: 'Seated' },
      { t: '8:00 pm', l: 'Toasts', s: 'Sign up early' },
    ],
    faqDemo: [
      'Who gives a toast?',
      "What's the dress code?",
      'Are kids welcome?',
      'Where should I park?',
    ],
  },
  'welcome-party': {
    ...BASE,
    tagline: 'you made it',
    storyEyebrow: 'The occasion',
    storyTitle: 'The weekend',
    storyItalic: 'begins',
    storyBodyDemo:
      "Everyone's in town, start the weekend easy. Note where to land, what's on ice, and who to find for a welcome bag.",
    scheduleDemo: [
      { t: '7:00 pm', l: 'Drinks', s: 'Casual' },
      { t: '8:00 pm', l: 'Light bites', s: 'Passed' },
      { t: '9:00 pm', l: 'Icebreakers', s: 'Meet the families' },
    ],
  },
  brunch: {
    ...BASE,
    tagline: 'one more morning',
    storyEyebrow: 'The occasion',
    storyTitle: 'One more',
    storyItalic: 'morning',
    storyBodyDemo:
      'The morning after, for the long goodbyes. Where the coffee is, when the bagels land, and how long everyone can linger.',
    detailsDressDemo: 'Come as you are',
    scheduleDemo: [
      { t: '10:00 am', l: 'Brunch', s: 'Help yourself' },
      { t: '12:00 pm', l: 'Farewells', s: 'Safe travels' },
    ],
  },

  /* ── Birthdays & milestones ──────────────────────────────── */
  birthday: {
    ...BASE,
    tagline: 'a year worth toasting',
    storyBodyDemo:
      'Every year adds a chapter. Use this space for the highlights (the moves, the milestones, the running jokes) or hand the pen to someone who tells them better.',
    scheduleDemo: [
      { t: '6:00 pm', l: 'Drinks', s: 'On arrival' },
      { t: '7:00 pm', l: 'Dinner', s: 'Family style' },
      { t: '8:30 pm', l: 'Cake & toasts', s: 'Bring a story' },
      { t: '9:30 pm', l: 'Dancing', s: 'Until late' },
    ],
  },
  get 'milestone-birthday'() { return this.birthday; },
  'first-birthday': {
    ...BASE,
    tagline: 'one whole year',
    storyTitle: 'A year of',
    storyItalic: 'firsts',
    storyBodyDemo:
      "First smile, first steps, first cake. Jot the year's little milestones here, the ones the baby book almost kept up with.",
    detailsDressDemo: 'Casual & comfy',
    registryDemoStores: ['A little wishlist'],
    scheduleDemo: [
      { t: '11:00 am', l: 'Welcome', s: 'Snacks out' },
      { t: '12:00 pm', l: 'Lunch', s: 'Kid-friendly' },
      { t: '1:00 pm', l: 'Cake smash', s: 'Cameras ready' },
      { t: '1:45 pm', l: 'Presents', s: 'On the rug' },
    ],
    faqDemo: [
      'Are siblings welcome?',
      'Is there a quiet room for naps?',
      'What should we bring?',
      'Where should I park?',
    ],
  },
  'sweet-sixteen': {
    ...BASE,
    tagline: 'sixteen candles',
    storyTitle: 'Sixteen years',
    storyItalic: 'in the making',
    storyBodyDemo:
      'Sixteen years of stories, the phases, the playlists, the friends who stayed. Write the short version here.',
    scheduleDemo: [
      { t: '7:00 pm', l: 'Doors', s: 'Photo wall open' },
      { t: '8:00 pm', l: 'Dinner', s: 'Buffet' },
      { t: '9:00 pm', l: 'Cake', s: 'Sixteen candles' },
      { t: '9:30 pm', l: 'Dancing', s: 'DJ set' },
    ],
  },
  retirement: {
    ...BASE,
    tributePrompt: 'Leave a story',
    tagline: 'a career, well spent',
    storyTitle: 'A career',
    storyItalic: 'well spent',
    storyBodyDemo:
      "Decades of early mornings, deadlines met, and colleagues turned friends. Write the career's greatest hits here, or collect them from the people who were there.",
    scheduleDemo: [
      { t: '5:30 pm', l: 'Drinks', s: 'On arrival' },
      { t: '6:30 pm', l: 'Dinner', s: 'Long table' },
      { t: '8:00 pm', l: 'Toasts & stories', s: 'Open mic' },
      { t: '9:00 pm', l: 'Send-off', s: 'One last round' },
    ],
    storyChips: ['The first day', 'The career', 'What comes next'],
  },
  graduation: {
    ...BASE,
    tagline: 'the next chapter',
    storyTitle: 'The road',
    storyItalic: 'here',
    storyBodyDemo:
      "Four years, a few all-nighters, one diploma. Tell the story of the road here, and a line about what's next.",
    scheduleDemo: [
      { t: '10:00 am', l: 'Ceremony', s: 'Arrive early' },
      { t: '12:30 pm', l: 'Photos', s: 'On the quad' },
      { t: '5:00 pm', l: 'Open house', s: 'Drop by anytime' },
      { t: '7:00 pm', l: 'Toasts', s: 'A few words' },
    ],
    faqDemo: [
      'Where should I park for the ceremony?',
      'Can I bring the kids?',
      'What time should I arrive?',
      'Any gift ideas?',
    ],
  },

  /* ── Family ──────────────────────────────────────────────── */
  'baby-shower': {
    ...BASE,
    tagline: 'almost time',
    storyEyebrow: 'The occasion',
    storyTitle: 'Before the',
    storyItalic: 'arrival',
    storyBodyDemo:
      "The nursery's half-painted and the names are down to a shortlist. Share the story so far, and what you're most excited for.",
    detailsDressDemo: 'Casual & comfy',
    detailsGiftsCard: ['Gifts', 'Registry linked below'],
    registryDemoStores: ['Babylist', 'Target'],
    scheduleDemo: [
      { t: '11:00 am', l: 'Brunch', s: 'Mimosas & juice' },
      { t: '12:00 pm', l: 'Games', s: 'Gentle ones' },
      { t: '1:00 pm', l: 'Presents', s: 'On the couch' },
      { t: '2:00 pm', l: 'Cake', s: 'And wishes' },
    ],
    faqDemo: [
      'What should I bring?',
      'Are kids welcome?',
      'Is there a theme?',
      'Where should I park?',
    ],
  },
  'gender-reveal': {
    ...BASE,
    tagline: 'the big reveal',
    storyEyebrow: 'The occasion',
    storyTitle: 'Before we',
    storyItalic: 'know',
    storyBodyDemo:
      "Team pink, team blue, team just-here-for-the-cake. Write how you'll reveal it, and take your guests' guesses at the door.",
    registryDemoStores: ['A little wishlist'],
    scheduleDemo: [
      { t: '3:00 pm', l: 'Snacks', s: 'And guesses' },
      { t: '4:00 pm', l: 'The reveal', s: 'All eyes up' },
      { t: '4:15 pm', l: 'Photos', s: 'Cameras ready' },
    ],
  },
  'sip-and-see': {
    ...BASE,
    tagline: 'come meet the baby',
    storyEyebrow: 'The occasion',
    storyTitle: 'The newest',
    storyItalic: 'arrival',
    storyBodyDemo:
      'Name, weight, and the first-week stories. Introduce the newest arrival, and the visiting hours that work around naps.',
    registryDemoStores: ['A little wishlist'],
    scheduleDemo: [
      { t: '10:00 am', l: 'Open house', s: 'Come and go' },
      { t: '12:00 pm', l: 'Quiet hour', s: 'Baby naps' },
    ],
    faqDemo: [
      'Should we bring anything?',
      'Are kids welcome?',
      'What if the baby is asleep?',
      'Where should I park?',
    ],
  },
  housewarming: {
    ...BASE,
    tagline: "we're home",
    storyEyebrow: 'The occasion',
    storyTitle: 'The new',
    storyItalic: 'place',
    storyBodyDemo:
      'New keys, new zip code, same open door. Tell the story of the move, and what you love most about the place.',
    detailsDressDemo: 'Come as you are',
    registryDemoStores: ['Home goods', 'A house fund'],
    scheduleDemo: [
      { t: '4:00 pm', l: 'Open house', s: 'Come and go' },
      { t: '5:00 pm', l: 'Tours', s: 'Mind the paint' },
      { t: '7:00 pm', l: 'Toasts', s: 'To the new place' },
    ],
  },

  /* ── Cultural & religious ────────────────────────────────── */
  quinceanera: {
    ...BASE,
    tagline: 'mis quince años',
    storyTitle: 'Quince',
    storyItalic: 'años',
    storyBodyDemo:
      'Fifteen years, one unforgettable night. Share the story of the quinceañera, the family, the traditions, the court of honor beside her.',
    detailsDressDemo: 'Formal attire',
    scheduleDemo: [
      { t: '2:00 pm', l: 'Mass', s: 'With family' },
      { t: '6:00 pm', l: 'Reception', s: 'Doors open' },
      { t: '7:30 pm', l: 'The waltz', s: 'Court of honor' },
      { t: '9:00 pm', l: 'Dancing', s: 'Everyone' },
    ],
    faqDemo: [
      "What's the dress code?",
      'Where is the mass held?',
      'Are kids welcome?',
      'Where should I park?',
    ],
  },
  'bar-mitzvah': {
    ...BASE,
    tagline: 'a day of blessing',
    storyTitle: 'Thirteen years',
    storyItalic: 'in the making',
    storyBodyDemo:
      'Thirteen years to this Torah portion. Write about the road here, the study, the family, and what this day means.',
    detailsDressDemo: 'Dress for the service',
    scheduleDemo: [
      { t: '10:00 am', l: 'Service', s: 'At the synagogue' },
      { t: '12:00 pm', l: 'Kiddush', s: 'Luncheon' },
      { t: '6:00 pm', l: 'Reception', s: 'Doors open' },
      { t: '8:00 pm', l: 'Dancing', s: 'Hora first' },
    ],
    faqDemo: CEREMONIAL_FAQ,
  },
  get 'bat-mitzvah'() { return this['bar-mitzvah']; },
  baptism: {
    ...BASE,
    tagline: 'a day of blessing',
    storyEyebrow: 'The occasion',
    storyTitle: 'A day of',
    storyItalic: 'blessing',
    storyBodyDemo:
      'A name, a blessing, and the people gathered around it. Share a few words about this day and what it means to your family.',
    detailsDressDemo: 'Dress for the service',
    scheduleDemo: [
      { t: '10:00 am', l: 'Service', s: 'At the church' },
      { t: '11:30 am', l: 'Reception', s: 'Brunch to follow' },
    ],
    faqDemo: CEREMONIAL_FAQ,
  },
  get 'first-communion'() {
    return { ...this.baptism, storyTitle: 'A day of', storyItalic: 'faith' };
  },
  get confirmation() {
    return { ...this.baptism, storyTitle: 'A day of', storyItalic: 'faith' };
  },

  /* ── Commemoration & community ───────────────────────────── */
  memorial: SOLEMN,
  funeral: SOLEMN,
  reunion: {
    ...BASE,
    tagline: 'the years between',
    storyTitle: 'The years',
    storyItalic: 'between',
    storyBodyDemo:
      "It's been too long, catch everyone up. Where everyone's landed, who's new since last time, and what the weekend holds.",
    detailsDressDemo: 'Come as you are',
    scheduleDemo: [
      { t: 'Fri 5:00 pm', l: 'Arrivals', s: 'Check in' },
      { t: 'Sat 12:00 pm', l: 'Cookout', s: 'Bring a side' },
      { t: 'Sat 4:00 pm', l: 'Group photo', s: 'Everyone' },
      { t: 'Sun 10:00 am', l: 'Farewell brunch', s: 'Until next time' },
    ],
    faqDemo: [
      'Where should we stay?',
      'What should I bring?',
      'Are kids welcome?',
      "What's the T-shirt situation?",
    ],
    storyChips: ['Back then', 'The years between', 'Now'],
    countdownLabel: 'Until we’re all together',
  },
};

/** The copy pack for an occasion. Wedding-arc couple occasions
 *  respond to the host's Pear-voice pick (classic / playful /
 *  poetic); every other occasion reads its pack directly. Unknown
 *  occasions get the generic celebration pack — never wedding
 *  copy. */
export function occasionCopyFor(occasion?: string | null, voice?: string | null): OccasionCopy {
  const pack = (occasion && PACKS[occasion]) || (occasion === undefined || occasion === null ? PACKS.wedding : BASE);
  /* Voice modulation. The wedding-arc couple occasions swap in the
     full voice pack (written for couple romance). Every other
     celebration gets a light, occasion-safe overlay so the Voice
     knob still visibly does something — except the solemn
     occasions, which ignore it entirely (a playful memorial is
     not a thing we ship). */
  if (pack === WEDDING || occasion === 'vow-renewal' || occasion === 'engagement') {
    const v = WEDDING_VOICES[(voice ?? 'classic') as WeddingVoice];
    if (v && voice && voice !== 'classic') return { ...pack, ...v };
    return pack;
  }
  if (pack === SOLEMN) return pack;
  if (voice === 'poetic') return { ...pack, tagline: 'of all the days, this one' };
  if (voice === 'playful') return { ...pack, rsvpTitle: 'Get in here' };
  return pack;
}
