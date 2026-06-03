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
  return { options: DRESS_CODE_WEDDING };
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
  if (occ === 'bridal-shower' || occ === 'baby-shower' || occ === 'sip-and-see') {
    return { options: SCHEDULE_SHOWER };
  }
  return { options: SCHEDULE_WEDDING };
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

export function registryStoreSuggestions(occasion: OccasionKey | undefined): SuggestionSet {
  const occ = (occasion ?? '').toLowerCase();
  if (occ === 'baby-shower' || occ === 'sip-and-see' || occ === 'first-birthday') {
    return { options: REGISTRY_BABY };
  }
  if (occ === 'housewarming') return { options: REGISTRY_HOUSEWARMING };
  if (occ === 'memorial' || occ === 'funeral') return { options: REGISTRY_MEMORIAL };
  return { options: REGISTRY_WEDDING };
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

export function faqQuestionSuggestions(occasion: OccasionKey | undefined): SuggestionSet {
  const occ = (occasion ?? '').toLowerCase();
  if (occ.startsWith('bachelor') || occ.startsWith('bachelorette')) {
    return { options: FAQ_BACHELOR };
  }
  if (occ === 'memorial' || occ === 'funeral') return { options: FAQ_MEMORIAL };
  return { options: FAQ_WEDDING };
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
