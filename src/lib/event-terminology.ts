// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-terminology.ts
//
// Per-occasion language + time-format dictionary. Wedding sites
// have always rendered "4:00 PM" / "September 14, 2026" — bland
// digital-clock formatting that ignores the way people actually
// speak about formal events. A traditional wedding invitation
// reads "Saturday, the fourteenth of September · half past four
// in the afternoon"; a memorial reads "service to be held at
// four o'clock"; a baby shower reads casual.
//
// One source of truth keyed by SiteOccasion. Renderer call sites
// pull labels + a formatTime / formatLongDate helper from here so
// "Ceremony" becomes "Service" on a memorial site without an if-
// chain at every render path.
//
// Tone tiers:
//   formal  — wedding / vow-renewal / quinceañera / bar+bat
//             mitzvah / first communion / confirmation / baptism
//   solemn  — memorial / funeral
//   modern  — engagement / anniversary / sweet-sixteen / housewarming
//             / milestone-birthday / retirement / graduation /
//             bridal-shower / bridal-luncheon / welcome-party / brunch
//   casual  — bachelor / bachelorette / baby-shower / gender-reveal
//             / sip-and-see / first-birthday / birthday / reunion /
//             story
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from './site-urls';

export type EventTone = 'formal' | 'solemn' | 'modern' | 'casual';

export interface OccasionTerminology {
  tone: EventTone;
  /** Headline for the program section ("Schedule" / "Order of
   *  service" / "Itinerary"). */
  scheduleLabel: string;
  /** What the centre-piece event is called. Wedding → "Ceremony",
   *  Memorial → "Service", Birthday → "Celebration". */
  ceremonyLabel: string;
  /** What follows the ceremony. */
  receptionLabel: string;
  /** The "guests arrive at" event label. */
  arrivalLabel: string;
  /** RSVP CTA copy. Wedding → "Kindly reply", casual → "Let us know". */
  rsvpCtaLabel: string;
  /** Casual events skip the ornate time format; formal weddings
   *  use "half past four in the afternoon" (or numeric upon
   *  request — the host's `dateFormat` still wins when set). */
  formatTime(time: string): string;
  /** Long-form date — "Saturday, the fourteenth of September,
   *  two thousand twenty-six" for formal events; "Saturday,
   *  September 14, 2026" for modern/casual. */
  formatLongDate(date: Date): string;
}

// ── Helpers ─────────────────────────────────────────────────

const HOUR_WORDS = [
  'twelve', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
];

const MINUTE_WORDS = [
  'oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];

const TENS = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty'];

function spellMinute(m: number): string {
  if (m === 0) return '';
  if (m < 20) return MINUTE_WORDS[m];
  const tens = Math.floor(m / 10);
  const ones = m % 10;
  if (ones === 0) return TENS[tens];
  return `${TENS[tens]}-${MINUTE_WORDS[ones]}`;
}

function partOfDay(hour24: number): string {
  if (hour24 < 12) return 'in the morning';
  if (hour24 < 17) return 'in the afternoon';
  if (hour24 < 21) return 'in the evening';
  return 'at night';
}

function parseHHMM(time: string): [number, number] | null {
  // Accepts "HH:MM" 24h, "h:mm AM/PM", "h pm", "HHMM", or empty.
  const trimmed = time.trim().toLowerCase();
  if (!trimmed) return null;
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(trimmed);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    if (ampm[3] === 'pm' && h < 12) h += 12;
    if (ampm[3] === 'am' && h === 12) h = 0;
    return [h, m];
  }
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (hhmm) return [parseInt(hhmm[1], 10), parseInt(hhmm[2], 10)];
  return null;
}

/** Formal time: "half past four in the afternoon",
 *  "a quarter past nine in the morning", "five o'clock in the
 *  evening", or "four-thirty-seven in the afternoon" for off
 *  minutes. Falls back to the input string when unparseable. */
function formalTime(time: string): string {
  const parsed = parseHHMM(time);
  if (!parsed) return time;
  const [h24, m] = parsed;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hourWord = HOUR_WORDS[h12 % 12];
  const part = partOfDay(h24);
  if (m === 0) return `${hourWord} o'clock ${part}`;
  if (m === 15) return `a quarter past ${hourWord} ${part}`;
  if (m === 30) return `half past ${hourWord} ${part}`;
  if (m === 45) {
    const nextH = (h12 % 12) + 1;
    return `a quarter to ${HOUR_WORDS[nextH % 12]} ${part}`;
  }
  return `${hourWord}-${spellMinute(m)} ${part}`;
}

/** Modern time: "4:30 PM in the afternoon" → "4:30 PM" with a
 *  soft "in the afternoon" suffix when the slot reads naturally
 *  with one (e.g. evening reception). */
function modernTime(time: string, withPart = false): string {
  const parsed = parseHHMM(time);
  if (!parsed) return time;
  const [h24, m] = parsed;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const base = m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  return withPart ? `${base} ${partOfDay(h24)}` : base;
}

/** Casual time: "7 PM" or "7:30 PM" — no part-of-day, no spelled
 *  numerals. Used by birthdays / bachelor parties / brunches. */
function casualTime(time: string): string {
  const parsed = parseHHMM(time);
  if (!parsed) return time;
  const [h24, m] = parsed;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'am' : 'pm';
  return m === 0 ? `${h12}${ampm}` : `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
}

const NUMBER_WORDS_BELOW_HUNDRED = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two',
  'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven',
  'twenty-eight', 'twenty-nine', 'thirty', 'thirty-one',
];

function spellOrdinalDay(day: number): string {
  // The 1st → "first", 14th → "fourteenth". Ordinal forms below 32.
  const ordinals: Record<number, string> = {
    1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth',
    6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth',
    11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth',
    15: 'fifteenth', 16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth',
    19: 'nineteenth', 20: 'twentieth', 21: 'twenty-first', 22: 'twenty-second',
    23: 'twenty-third', 24: 'twenty-fourth', 25: 'twenty-fifth',
    26: 'twenty-sixth', 27: 'twenty-seventh', 28: 'twenty-eighth',
    29: 'twenty-ninth', 30: 'thirtieth', 31: 'thirty-first',
  };
  return ordinals[day] ?? String(day);
}

function spellYear(year: number): string {
  // 2026 → "two thousand twenty-six". Handles 2000-2099 cleanly.
  if (year >= 2000 && year < 2100) {
    const last = year - 2000;
    if (last === 0) return 'two thousand';
    if (last < 32) return `two thousand ${NUMBER_WORDS_BELOW_HUNDRED[last]}`;
    const tens = Math.floor(last / 10);
    const ones = last % 10;
    const tensWord = TENS[tens];
    return ones === 0 ? `two thousand ${tensWord}` : `two thousand ${tensWord}-${NUMBER_WORDS_BELOW_HUNDRED[ones]}`;
  }
  // Pre-2000 / post-2100: numeric.
  return String(year);
}

/** "Saturday, the fourteenth of September, two thousand twenty-six" */
function formalLongDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday}, the ${spellOrdinalDay(day)} of ${month}, ${spellYear(year)}`;
}

/** "Saturday, September 14, 2026" — the modern default. */
function modernLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Tone profiles ───────────────────────────────────────────

const FORMAL: OccasionTerminology = {
  tone: 'formal',
  scheduleLabel: 'Order of service',
  ceremonyLabel: 'Ceremony',
  receptionLabel: 'Reception to follow',
  arrivalLabel: 'Arrival',
  rsvpCtaLabel: 'Kindly reply',
  formatTime: (t) => formalTime(t),
  formatLongDate: formalLongDate,
};

const SOLEMN: OccasionTerminology = {
  tone: 'solemn',
  scheduleLabel: 'Order of service',
  ceremonyLabel: 'Service',
  receptionLabel: 'Gathering to follow',
  arrivalLabel: 'Doors open',
  rsvpCtaLabel: 'Let us know you’ll be there',
  formatTime: (t) => formalTime(t),
  formatLongDate: formalLongDate,
};

const MODERN: OccasionTerminology = {
  tone: 'modern',
  scheduleLabel: 'Schedule',
  ceremonyLabel: 'Celebration',
  receptionLabel: 'Reception',
  arrivalLabel: 'Doors open',
  rsvpCtaLabel: 'RSVP',
  formatTime: (t) => modernTime(t),
  formatLongDate: modernLongDate,
};

const CASUAL: OccasionTerminology = {
  tone: 'casual',
  scheduleLabel: 'The plan',
  ceremonyLabel: 'Main event',
  receptionLabel: 'Hangout',
  arrivalLabel: 'Doors open',
  rsvpCtaLabel: 'Let us know',
  formatTime: (t) => casualTime(t),
  formatLongDate: modernLongDate,
};

// ── Per-occasion overrides ───────────────────────────────────

const TERMINOLOGY: Record<SiteOccasion, OccasionTerminology> = {
  // Formal — full traditional treatment.
  wedding:        { ...FORMAL },
  'vow-renewal':  { ...FORMAL, ceremonyLabel: 'Renewal of vows' },
  quinceanera:    { ...FORMAL, scheduleLabel: 'Programa', ceremonyLabel: 'Misa de Quince Años' },
  'bar-mitzvah':  { ...FORMAL, ceremonyLabel: 'Bar Mitzvah ceremony' },
  'bat-mitzvah':  { ...FORMAL, ceremonyLabel: 'Bat Mitzvah ceremony' },
  baptism:        { ...FORMAL, ceremonyLabel: 'Baptism' },
  'first-communion': { ...FORMAL, ceremonyLabel: 'First Holy Communion' },
  confirmation:   { ...FORMAL, ceremonyLabel: 'Confirmation' },

  // Solemn.
  memorial:       { ...SOLEMN, ceremonyLabel: 'Memorial service', receptionLabel: 'Reception immediately following' },
  funeral:        { ...SOLEMN, ceremonyLabel: 'Funeral service', receptionLabel: 'Reception immediately following' },

  // Modern — clean digital format, lighter language.
  anniversary:    { ...MODERN, ceremonyLabel: 'Toast' },
  engagement:     { ...MODERN, ceremonyLabel: 'Engagement party' },
  'sweet-sixteen': { ...MODERN },
  'milestone-birthday': { ...MODERN, ceremonyLabel: 'Toast' },
  retirement:     { ...MODERN, ceremonyLabel: 'Tribute' },
  graduation:     { ...MODERN, ceremonyLabel: 'Toast' },
  housewarming:   { ...MODERN, ceremonyLabel: 'Tour', receptionLabel: 'Drinks + dinner' },
  'bridal-shower': { ...MODERN, ceremonyLabel: 'Shower', receptionLabel: 'Brunch + games' },
  'bridal-luncheon': { ...MODERN, ceremonyLabel: 'Luncheon' },
  'welcome-party': { ...MODERN, ceremonyLabel: 'Welcome' },
  brunch:         { ...MODERN, ceremonyLabel: 'Brunch' },
  'rehearsal-dinner': { ...MODERN, ceremonyLabel: 'Toast', receptionLabel: 'Dinner' },

  // Casual — abbreviated time format, breezy section labels.
  'bachelor-party':     { ...CASUAL, scheduleLabel: 'The weekend', receptionLabel: 'Hangout' },
  'bachelorette-party': { ...CASUAL, scheduleLabel: 'The weekend', receptionLabel: 'Hangout' },
  'baby-shower':        { ...CASUAL, ceremonyLabel: 'Shower', receptionLabel: 'Cake + games' },
  'gender-reveal':      { ...CASUAL, ceremonyLabel: 'Reveal' },
  'sip-and-see':        { ...CASUAL, ceremonyLabel: 'Meet the baby' },
  'first-birthday':     { ...CASUAL, ceremonyLabel: 'Cake' },
  birthday:             { ...CASUAL, ceremonyLabel: 'Toast' },
  reunion:              { ...CASUAL, scheduleLabel: 'The plan' },
  story:                { ...CASUAL, scheduleLabel: 'Timeline', ceremonyLabel: 'Highlight' },
};

export function terminologyFor(occasion: SiteOccasion | string | undefined | null): OccasionTerminology {
  if (!occasion) return TERMINOLOGY.wedding;
  return TERMINOLOGY[occasion as SiteOccasion] ?? TERMINOLOGY.wedding;
}

/** Pure helper that mirrors `formatTime` for callers that want to
 *  work with raw HH:MM strings without a full terminology object. */
export function formatEventTime(occasion: string | undefined, time: string): string {
  return terminologyFor(occasion).formatTime(time);
}

/** Pure helper for raw Date objects. */
export function formatEventLongDate(occasion: string | undefined, date: Date): string {
  return terminologyFor(occasion).formatLongDate(date);
}
