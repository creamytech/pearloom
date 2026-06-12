/* eslint-disable no-restricted-syntax */
/* Curated suggestion sets for the FSuggest atom across the section
   panels. Each suggestion is a string the host can tap to one-shot
   their input. All inputs still allow free typing — these are
   accelerators, not constraints.

   Occasion-aware: weddings, bachelor parties, memorials, etc all
   surface different sets. Falls back to the generic list when
   the occasion is unknown. */

export type OccasionKey = string; // narrow form would be the SiteOccasion union

export interface SuggestionSet {
  /** Default ordered list shown as chips. */
  options: string[];
  /** Optional short hint above the chip row. */
  hint?: string;
}

/* Occasion routing — the wedding sets used to be the catch-all
   fallback for EVERY unmapped occasion, so reunions saw "Bouquet
   toss" chips and graduations saw "Honeymoon fund" registries.
   Wedding-shaped sets now only fire for genuinely wedding-shaped
   events; everything else routes to a category set or a generic
   gathering set. */
const WEDDING_SHAPED = new Set(['wedding', 'vow-renewal']);
const COUPLE_SHAPED = new Set(['wedding', 'vow-renewal', 'engagement', 'anniversary']);
const CEREMONY_SHAPED = new Set([
  'bar-mitzvah', 'bat-mitzvah', 'quinceanera',
  'baptism', 'first-communion', 'confirmation',
]);

/* ─── Dress code (Details panel) ─────────────────────────────── */

const DRESS_CODE_WEDDING = [
  'Cocktail attire',
  'Black tie',
  'Black tie optional',
  'Garden formal',
  'Beach formal',
  'Festive attire',
  'Smart casual',
  'White tie',
];

const DRESS_CODE_PLAYFUL = [
  'Smart casual',
  'Festive attire',
  'Pool / beach attire',
  'Themed (see invite)',
  'Wear what makes you happy',
  'Bring your dancing shoes',
];

const DRESS_CODE_SOLEMN = [
  'Smart casual',
  'Business casual',
  'Dark colors',
  'Respectful attire',
  'No black requested',
];

const DRESS_CODE_GENERIC = [
  'Smart casual',
  'Cocktail attire',
  'Festive attire',
  'Come as you are',
  'Garden party',
  'Black tie optional',
];

export function dressCodeSuggestions(occasion: OccasionKey | undefined): SuggestionSet {
  const occ = (occasion ?? '').toLowerCase();
  if (occ === 'memorial' || occ === 'funeral') return { options: DRESS_CODE_SOLEMN };
  if (
    occ === 'bachelor-party' || occ === 'bachelorette-party' ||
    occ === 'birthday' || occ === 'milestone-birthday' || occ === 'sweet-sixteen' ||
    occ === 'baby-shower' || occ === 'bridal-shower' ||
    occ === 'gender-reveal' || occ === 'first-birthday'
  ) {
    return { options: DRESS_CODE_PLAYFUL };
  }
  /* Formal list (black tie, garden formal…) only for events that
     actually run formal: weddings + cultural ceremonies. */
  if (WEDDING_SHAPED.has(occ) || CEREMONY_SHAPED.has(occ) || occ === 'rehearsal-dinner' || occ === 'engagement') {
    return { options: DRESS_CODE_WEDDING };
  }
  return { options: DRESS_CODE_GENERIC };
}

/* ─── Good-to-know card labels (Details panel) ───────────────── */

const DETAILS_CARD_LABELS_COMMON = [
  'Parking',
  'Accessibility',
  'Kids',
  'Plus-ones',
  'Gifts',
  'Hashtag',
  'Photography',
  'Wifi',
  'Allergies',
  'Smoking',
  'Pets',
];

export function detailsCardLabelSuggestions(_occasion: OccasionKey | undefined): SuggestionSet {
  return { options: DETAILS_CARD_LABELS_COMMON };
}

/* ─── Schedule event names ───────────────────────────────────── */

const SCHEDULE_WEDDING = [
  'Welcome drinks',
  'Ceremony',
  'Cocktail hour',
  'Dinner',
  'Toasts',
  'First dance',
  'Cake',
  'Dancing',
  'Bouquet toss',
  'Send-off',
  'Brunch (next morning)',
];

const SCHEDULE_BACHELOR = [
  'Hotel check-in',
  'Group dinner',
  'Bar crawl',
  'Late-night snack',
  'Pool / beach day',
  'Activity',
  'Send-off brunch',
  'Travel home',
];

const SCHEDULE_MEMORIAL = [
  'Gathering',
  'Service',
  'Reception',
  'Sharing memories',
  'Music',
  'Closing prayer',
];

const SCHEDULE_BIRTHDAY = [
  'Arrivals',
  'Dinner',
  'Speeches',
  'Cake',
  'Dancing',
  'Final round',
];

const SCHEDULE_SHOWER = [
  'Arrivals',
  'Games',
  'Brunch',
  'Gifts',
  'Advice circle',
  'Send-off',
];

const SCHEDULE_CEREMONY = [
  'Guests arrive',
  'Ceremony',
  'Photos',
  'Reception',
  'Toasts',
  'Cake',
  'Dancing',
  'Send-off',
];

const SCHEDULE_GATHERING = [
  'Guests arrive',
  'Welcome toast',
  'Dinner',
  'Toasts',
  'Cake',
  'Dancing',
  'Send-off',
];

export function scheduleEventSuggestions(occasion: OccasionKey | undefined): SuggestionSet {
  const occ = (occasion ?? '').toLowerCase();
  if (occ.startsWith('bachelor') || occ.startsWith('bachelorette')) {
    return { options: SCHEDULE_BACHELOR };
  }
  if (occ === 'memorial' || occ === 'funeral') return { options: SCHEDULE_MEMORIAL };
  if (
    occ === 'birthday' || occ === 'milestone-birthday' || occ === 'sweet-sixteen' ||
    occ === 'first-birthday' || occ === 'retirement' || occ === 'graduation'
  ) {
    return { options: SCHEDULE_BIRTHDAY };
  }
  if (occ === 'bridal-shower' || occ === 'baby-shower' || occ === 'sip-and-see' || occ === 'gender-reveal') {
    return { options: SCHEDULE_SHOWER };
  }
  if (CEREMONY_SHAPED.has(occ)) return { options: SCHEDULE_CEREMONY };
  if (WEDDING_SHAPED.has(occ)) return { options: SCHEDULE_WEDDING };
  /* Anniversaries, reunions, engagements, rehearsal dinners,
     housewarmings, welcome parties… — a dinner-party arc, not a
     wedding ceremony arc. */
  return { options: SCHEDULE_GATHERING };
}

/* ─── Registry store names ───────────────────────────────────── */

const REGISTRY_WEDDING = [
  'Honeymoon fund',
  'Zola',
  'Crate & Barrel',
  'Williams Sonoma',
  'West Elm',
  'Target',
  'Amazon',
  'Pottery Barn',
  'REI',
  'Anthropologie',
];

const REGISTRY_BABY = [
  'Babylist',
  'Target',
  'Amazon',
  'Buy Buy Baby',
  'Pottery Barn Kids',
  'Crate & Kids',
  'Diaper fund',
  'College fund',
];

const REGISTRY_HOUSEWARMING = [
  'Crate & Barrel',
  'West Elm',
  'IKEA',
  'Target',
  'Williams Sonoma',
  'Home Depot',
  'Anthropologie',
];

const REGISTRY_MEMORIAL = [
  'Donation in memory',
  'GoFundMe',
  'Local charity',
  'Children’s hospital',
  'Animal rescue',
];

const REGISTRY_GENERIC = [
  'Gift fund',
  'Experience fund',
  'Amazon',
  'Target',
  'Donation to a cause',
  'No gifts — just come',
];

export function registryStoreSuggestions(occasion: OccasionKey | undefined): SuggestionSet {
  const occ = (occasion ?? '').toLowerCase();
  if (occ === 'baby-shower' || occ === 'sip-and-see' || occ === 'first-birthday' || occ === 'gender-reveal') {
    return { options: REGISTRY_BABY };
  }
  if (occ === 'housewarming') return { options: REGISTRY_HOUSEWARMING };
  if (occ === 'memorial' || occ === 'funeral') return { options: REGISTRY_MEMORIAL };
  /* Honeymoon fund + wedding registries only where they make
     sense: weddings, engagements, vow renewals. */
  if (WEDDING_SHAPED.has(occ) || occ === 'engagement' || occ === 'bridal-shower') {
    return { options: REGISTRY_WEDDING };
  }
  return { options: REGISTRY_GENERIC };
}

/* ─── FAQ question prompts ───────────────────────────────────── */

const FAQ_WEDDING = [
  'What’s the dress code?',
  'Can I bring a plus-one?',
  'Are kids welcome?',
  'Where should I stay?',
  'Is there parking?',
  'What time should I arrive?',
  'Will there be transportation?',
  'Is the ceremony outdoors?',
  'Are gifts expected?',
  'What’s the menu?',
  'Is there a hashtag?',
  'Will it be live-streamed?',
];

const FAQ_BACHELOR = [
  'How much should I budget?',
  'What should I pack?',
  'When do we arrive / leave?',
  'How are we splitting costs?',
  'What’s the dress code each night?',
  'Where are we staying?',
];

const FAQ_MEMORIAL = [
  'Where is the service?',
  'Is there a reception after?',
  'Are donations preferred over flowers?',
  'Will it be live-streamed?',
  'How can I share a memory?',
];

const FAQ_GENERIC = [
  'What’s the dress code?',
  'Is there parking?',
  'Are kids welcome?',
  'What time should I arrive?',
  'Can I bring someone?',
  'Are gifts expected?',
  'Will food be served?',
  'Is there a hashtag?',
];

export function faqQuestionSuggestions(occasion: OccasionKey | undefined): SuggestionSet {
  const occ = (occasion ?? '').toLowerCase();
  if (occ.startsWith('bachelor') || occ.startsWith('bachelorette')) {
    return { options: FAQ_BACHELOR };
  }
  if (occ === 'memorial' || occ === 'funeral') return { options: FAQ_MEMORIAL };
  /* Plus-ones, ceremony-outdoors, live-stream questions are
     couple-event questions — keep them off birthdays + reunions. */
  if (COUPLE_SHAPED.has(occ) || CEREMONY_SHAPED.has(occ)) {
    return { options: FAQ_WEDDING };
  }
  return { options: FAQ_GENERIC };
}

/* ─── RSVP meal options ──────────────────────────────────────── */

const MEAL_CLASSIC = ['Beef', 'Fish', 'Chicken', 'Vegetarian', 'Vegan'];
const MEAL_SHORT   = ['Chicken', 'Vegetarian', 'Vegan'];
const MEAL_FAMILY  = ['Family-style', 'Vegetarian', 'Kid’s plate'];
const MEAL_BUFFET  = ['No selection — buffet', 'Vegetarian (notify staff)', 'Vegan (notify staff)'];

export function mealOptionSuggestions(_occasion: OccasionKey | undefined): SuggestionSet {
  return {
    options: [...MEAL_CLASSIC, ...MEAL_SHORT, ...MEAL_FAMILY, ...MEAL_BUFFET]
      .filter((v, i, arr) => arr.indexOf(v) === i),
    hint: 'Tap to add a common option. You can mix individual entrées with buffet notes.',
  };
}

/* ─── Kids policy (Details panel) ────────────────────────────── */

export const KIDS_POLICY_OPTIONS = [
  'All ages welcome',
  'Children of immediate family welcome',
  'Adult-only ceremony, kids welcome at reception',
  'Adults only (16+)',
  'Adults only (18+)',
  'Adults only (21+)',
];

/* ── Smart context — venue/date/name-aware suggestions ─────────
   smartContext(manifest) pulls the fields suggestion sets can
   interpolate so options read like they were written for THIS
   event ("Casa Chorro is a short taxi from the airport"), not a
   generic template. Every set below degrades cleanly when a field
   is missing. */

export interface SmartContext {
  occasion?: string;
  venue: string;
  place: string;
  firstName: string;
}

export function smartContext(manifest: unknown): SmartContext {
  const loose = manifest as {
    occasion?: string;
    logistics?: { venue?: string; place?: string };
    names?: [string, string];
  } | null;
  return {
    occasion: loose?.occasion,
    venue: (loose?.logistics?.venue ?? '').trim(),
    place: (loose?.logistics?.place ?? '').trim(),
    firstName: ((loose?.names?.[0] ?? '').trim().split(/\s+/)[0]) || '',
  };
}

/** Hero kicker / lead lines — the tiny editorial line above the
 *  names. Occasion-keyed with a couple of venue-aware entries. */
export function heroLeadSuggestions(ctx: SmartContext): SuggestionSet {
  const occ = (ctx.occasion ?? '').toLowerCase();
  const at = ctx.place || ctx.venue;
  const base: string[] = [];
  if (occ === 'memorial' || occ === 'funeral') {
    base.push('In loving memory', 'A life well loved', 'Gathering to remember');
  } else if (occ.includes('birthday') || occ === 'sweet-sixteen' || occ === 'quinceanera') {
    base.push('Save the date', 'A milestone worth a party', `${ctx.firstName ? `${ctx.firstName}’s big day` : 'The big day'}`);
  } else if (occ === 'baby-shower' || occ === 'gender-reveal' || occ === 'sip-and-see') {
    base.push('Someone small is on the way', 'Save the date', 'A shower of love');
  } else if (occ.includes('bachelor')) {
    base.push('One last fling', 'The send-off weekend', 'Pack your bags');
  } else if (occ === 'wedding' || occ === 'engagement' || occ === 'vow-renewal') {
    base.push('Save the date', 'Together, at last', 'We’re getting married');
  } else {
    base.push('Save the date', 'Together, at last', 'A day worth gathering for');
  }
  if (at) base.push(`Meet us in ${at}`);
  return { hint: 'The small line above the names — tap one or write your own.', options: base.slice(0, 5) };
}

/** Travel “getting there” intro lines, interpolated with the
 *  saved venue + place so the draft reads specific. */
export function travelDirectionsSuggestions(ctx: SmartContext): SuggestionSet {
  const v = ctx.venue || 'the venue';
  const p = ctx.place;
  const options = [
    `${v} is easiest by taxi or rideshare — parking nearby is limited.`,
    p
      ? `Fly into the nearest airport to ${p}; ${v} is a short ride from there. Say our names when you book the hotels below.`
      : `${v} is a short ride from the airport. Say our names when you book the hotels below.`,
    `We’ve held room blocks at the hotels below — mention us for the group rate.`,
    `A shuttle will loop between the hotels and ${v} — times to follow.`,
  ];
  return { hint: 'A line guests read before the hotel list.', options };
}

/** Typical start time for a picked schedule event name — used to
 *  pre-fill an EMPTY time field when the host picks a suggestion.
 *  Loose keyword match so "Welcome dinner" hits "dinner". */
export function typicalTimeFor(eventName: string): string | null {
  const n = eventName.toLowerCase();
  const TABLE: Array<[RegExp, string]> = [
    [/brunch/, '11:00 am'],
    [/lunch|luncheon/, '12:30 pm'],
    [/ceremony|vows|service/, '4:30 pm'],
    [/cocktail|golden hour|aperitif/, '5:30 pm'],
    [/welcome|rehearsal/, '7:00 pm'],
    [/dinner|feast|reception/, '7:00 pm'],
    [/toast|speech|cake/, '8:30 pm'],
    [/danc|party|dj|band/, '9:00 pm'],
    [/photo/, '5:00 pm'],
    [/game/, '2:00 pm'],
    [/gift/, '3:00 pm'],
    [/advice/, '3:30 pm'],
    [/afterparty|late/, '11:00 pm'],
    [/arriv|doors|seated/, '4:00 pm'],
    [/send.?off|farewell|sparkler/, '10:30 pm'],
  ];
  for (const [re, t] of TABLE) if (re.test(n)) return t;
  return null;
}

/** Venue-aware draft ANSWER for a picked FAQ question — fills an
 *  empty answer field so the host edits a sentence instead of
 *  facing a blank box. Returns null for questions we can't draft
 *  honestly from manifest data. */
export function faqAnswerDraftFor(question: string, ctx: SmartContext, manifest?: unknown): string | null {
  const q = question.toLowerCase();
  const loose = manifest as { logistics?: { dresscode?: string; dressCode?: string } } | null;
  const dress = (loose?.logistics?.dresscode ?? loose?.logistics?.dressCode ?? '').trim();
  const v = ctx.venue || 'the venue';
  if (/dress|wear/.test(q)) {
    return dress
      ? `${dress}. When in doubt, dress up a notch — you can never be too celebratory.`
      : 'Dress to celebrate — we\u2019ll post the dress code here once it\u2019s settled.';
  }
  if (/plus.?one|bring a guest|bring someone|\+1/.test(q)) {
    return 'Check your invitation — if it includes a guest, the RSVP form will offer a spot for them.';
  }
  if (/kids|children/.test(q)) {
    return 'We love your little ones — check your invitation for whether this one\u2019s adults-only.';
  }
  if (/park|get there|directions|airport|travel/.test(q)) {
    return ctx.place
      ? `${v} is in ${ctx.place} — see the Travel section for hotels, directions and the shuttle.`
      : `See the Travel section for hotels, directions and parking near ${v}.`;
  }
  if (/photo|phone|unplugged|camera/.test(q)) {
    return 'Take all the photos you like at the reception — we just ask for screens away during the ceremony.';
  }
  if (/gift|registry/.test(q)) {
    return 'Your presence is the gift. If you\u2019d like to do more, the Registry section has a few ideas.';
  }
  if (/outdoor|outside|weather|rain/.test(q)) {
    return `Parts of the day are outdoors at ${v} — bring a light layer for after dark.`;
  }
  return null;
}
