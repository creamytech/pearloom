// ─────────────────────────────────────────────────────────────
// Pearloom / lib/doorway/extract.ts
//
// THE DOORWAY: "give us what you already have."
//
// The wizard is nine thoughtful steps, and it stays — but it is a
// door that asks nine questions before showing anything. Most
// hosts arriving at Pearloom already HAVE their details somewhere:
// a Zola/Knot/Joy page, a save-the-date, a planner's email, a note
// in their phone. The doorway takes that artifact and presses a
// real preview immediately.
//
// This module is the pure half: text (already fetched, however it
// arrived) → a structured prefill the wizard can open on. The
// route owns fetching, auth posture, and AI; keeping the parsing
// pure means it is testable without a network or a model.
//
// TWO PASSES, deliberately:
//   1. `extractDeterministic` — regex/structured parsing. Free,
//      instant, no AI spend, and it alone handles the common cases
//      (a page with JSON-LD, an obvious date, two names in a
//      title). This is what makes the doorway feel instant.
//   2. The route may then ask a model to fill what's still blank.
//      Strictly additive — the deterministic result is never
//      overwritten by a guess.
//
// HONESTY RULE (CLAUDE-DESIGN §7): everything here is a
// SUGGESTION. Extracted fields land in the wizard as editable
// prefill the host confirms; nothing extracted is ever published
// without the host seeing it. A wrong guess must cost a keystroke,
// never a surprise on a live site.
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';

/** What a doorway artifact can yield. Every field optional — the
 *  doorway's job is to fill what it can and leave the rest. */
export interface DoorwayPrefill {
  names?: [string, string];
  /** ISO yyyy-mm-dd. Only set when unambiguous. */
  eventDate?: string;
  venueName?: string;
  location?: string;
  occasion?: SiteOccasion;
  /** Free-text lines that looked like schedule entries. */
  scheduleHints?: string[];
  /** The page/document title, for the host to recognize the source. */
  sourceTitle?: string;
}

export interface ExtractionResult {
  prefill: DoorwayPrefill;
  /** Which fields the deterministic pass filled — the route uses
   *  this to ask a model ONLY for what's missing. */
  filled: (keyof DoorwayPrefill)[];
  /** True when nothing usable was found; the caller should fall
   *  back to the ordinary wizard rather than show an empty press. */
  empty: boolean;
}

// ─── Small parsers ───────────────────────────────────────────

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** A plausible event year: this decade-ish, never the past by more
 *  than a year (an old page's copyright date is not an event date). */
function plausibleYear(y: number, nowYear: number): boolean {
  return y >= nowYear - 1 && y <= nowYear + 10;
}

/**
 * Find an unambiguous event date. Returns ISO yyyy-mm-dd, or
 * undefined when nothing is confident.
 *
 * Deliberately conservative: `03/04/2027` is skipped entirely
 * because it means March 4 in the US and April 3 almost everywhere
 * else, and a silently wrong wedding date is far worse than a
 * blank field the host fills in.
 */
export function extractDate(text: string, nowYear: number): string | undefined {
  // "September 12, 2027" / "12 September 2027" / "Sept 12 2027"
  const monthNames = Object.keys(MONTHS).join('|');
  const mdY = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'i');
  const dMY = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames}),?\\s+(\\d{4})\\b`, 'i');

  const a = text.match(mdY);
  if (a) {
    const month = MONTHS[a[1].toLowerCase()];
    const day = Number(a[2]);
    const year = Number(a[3]);
    if (month && day >= 1 && day <= 31 && plausibleYear(year, nowYear)) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  const b = text.match(dMY);
  if (b) {
    const day = Number(b[1]);
    const month = MONTHS[b[2].toLowerCase()];
    const year = Number(b[3]);
    if (month && day >= 1 && day <= 31 && plausibleYear(year, nowYear)) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  // ISO — unambiguous by definition.
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (plausibleYear(year, nowYear) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  // Numeric slash dates are AMBIGUOUS across locales — never guess.
  return undefined;
}

const NAME_SEPARATORS = /\s+(?:&|\+|and)\s+/i;

/** Strip the decoration wedding-site titles wear. */
function cleanNameFragment(raw: string): string {
  return raw
    .replace(/\b(the\s+)?wedding(\s+of)?\b/gi, ' ')
    .replace(/\bsave the date\b/gi, ' ')
    .replace(/\bwe(?:'|’)?re getting married\b/gi, ' ')
    .replace(/[|·—–-]+\s*$/g, ' ')
    .replace(/^\s*[|·—–-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* Words that mark a fragment as a PLACE or an organization rather
   than a person. Without this, "The Grand Hotel and Spa Resort"
   splits into two capitalized halves that both look like names —
   and the host's preview opens addressed to a hotel. */
const NOT_A_PERSON =
  /\b(hotel|resort|inn|lodge|club|manor|estate|barn|hall|gardens?|vineyards?|winery|farm|house|chapel|church|cathedral|center|centre|venue|collection|spa|room|suites?|ballroom|terrace|pavilion|company|co|llc|inc)\b/i;

/** Looks like a person's given name (not a venue, not a sentence). */
function looksLikeName(s: string): boolean {
  if (!s || s.length > 40) return false;
  const words = s.split(/\s+/);
  if (words.length > 3) return false;
  if (/\d/.test(s)) return false;
  // A person is not "The ..." — that's a place or a title.
  if (/^the\s/i.test(s)) return false;
  if (NOT_A_PERSON.test(s)) return false;
  // At least one capitalized word.
  return words.some((w) => /^[A-ZÀ-Þ][a-zß-ÿ'’-]+$/.test(w));
}

/**
 * Pull a couple's names from a title-ish line: "Emma & James",
 * "Emma and James — Our Wedding", "The Wedding of Emma & James".
 */
export function extractNames(title: string): [string, string] | undefined {
  const cleaned = cleanNameFragment(title);
  if (!cleaned) return undefined;
  const parts = cleaned.split(NAME_SEPARATORS);
  if (parts.length !== 2) return undefined;
  const a = cleanNameFragment(parts[0]);
  // The second half often carries a trailing tagline after a dash.
  const b = cleanNameFragment(parts[1].split(/[|·—–]|(?:\s+-\s+)/)[0]);
  if (looksLikeName(a) && looksLikeName(b)) return [a, b];
  return undefined;
}

/** Occasion keywords, most specific first — a page saying
 *  "bachelorette" must not match on the word "wedding" elsewhere. */
const OCCASION_HINTS: ReadonlyArray<[RegExp, SiteOccasion]> = [
  [/\bbachelorette\b/i, 'bachelorette-party'],
  [/\bbachelor party\b/i, 'bachelor-party'],
  [/\bbridal shower\b/i, 'bridal-shower'],
  [/\bbaby shower\b/i, 'baby-shower'],
  [/\brehearsal dinner\b/i, 'rehearsal-dinner'],
  [/\bvow renewal\b/i, 'vow-renewal'],
  [/\bquincea(?:n|ñ)era\b/i, 'quinceanera'],
  [/\bbar mitzvah\b/i, 'bar-mitzvah'],
  [/\bbat mitzvah\b/i, 'bat-mitzvah'],
  [/\bcelebration of life\b|\bin loving memory\b|\bmemorial\b/i, 'memorial'],
  [/\bfuneral\b/i, 'funeral'],
  [/\bgraduation\b/i, 'graduation'],
  [/\bretirement\b/i, 'retirement'],
  [/\breunion\b/i, 'reunion'],
  [/\bengagement party\b/i, 'engagement'],
  [/\banniversary\b/i, 'anniversary'],
  [/\bhousewarming\b/i, 'housewarming'],
  [/\bbirthday\b/i, 'birthday'],
  [/\bwedding\b|\bgetting married\b|\bsave the date\b/i, 'wedding'],
];

export function extractOccasion(text: string): SiteOccasion | undefined {
  for (const [rx, occasion] of OCCASION_HINTS) {
    if (rx.test(text)) return occasion;
  }
  return undefined;
}

/** Lines that read like a run of show ("4:00 PM — Ceremony"). */
export function extractScheduleHints(text: string, limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const lineRx = /^\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)\b.{0,80})$/gim;
  let m: RegExpExecArray | null;
  while ((m = lineRx.exec(text)) !== null && out.length < limit) {
    const line = m[1].replace(/\s{2,}/g, ' ').trim();
    const key = line.toLowerCase();
    if (line.length > 3 && !seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }
  return out;
}

// ─── The deterministic pass ──────────────────────────────────

export interface DeterministicInput {
  /** Visible text — HTML already stripped, or a pasted note. */
  text: string;
  /** A title if one is known (page <title>, OG title, filename). */
  title?: string;
  /** Injected so the parser is pure + testable across time. */
  nowYear: number;
}

/**
 * Parse everything obtainable without a model. Fast, free, and
 * enough on its own for a well-formed wedding page.
 */
export function extractDeterministic(input: DeterministicInput): ExtractionResult {
  const text = (input.text ?? '').slice(0, 200_000);
  const title = (input.title ?? '').trim();
  const prefill: DoorwayPrefill = {};

  if (title) prefill.sourceTitle = title.slice(0, 200);

  // Names come from the title first (highest signal), then the
  // opening lines of the body — a pasted save-the-date often reads
  // "Save the Date" / "Emma & James" / "September 12", so line 1 is
  // not always the one. Only the first few lines are considered: a
  // name found deep in body copy is far more likely to be a guest,
  // a vendor, or a sentence than the host.
  let names = title ? extractNames(title) : undefined;
  if (!names) {
    const openingLines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 5);
    for (const line of openingLines) {
      names = extractNames(line);
      if (names) break;
    }
  }
  if (names) prefill.names = names;

  const haystack = `${title}\n${text}`;

  const date = extractDate(haystack, input.nowYear);
  if (date) prefill.eventDate = date;

  const occasion = extractOccasion(haystack);
  if (occasion) prefill.occasion = occasion;

  const schedule = extractScheduleHints(text);
  if (schedule.length > 0) prefill.scheduleHints = schedule;

  const filled = (Object.keys(prefill) as (keyof DoorwayPrefill)[]).filter(
    (k) => k !== 'sourceTitle',
  );

  return { prefill, filled, empty: filled.length === 0 };
}

/**
 * Merge a model's suggestions UNDER the deterministic result —
 * a parsed fact always beats a guess, and the model can only fill
 * blanks. Unknown keys are dropped.
 */
export function mergeModelSuggestions(
  base: ExtractionResult,
  suggestion: Partial<DoorwayPrefill> | null | undefined,
): ExtractionResult {
  if (!suggestion) return base;
  const prefill: DoorwayPrefill = { ...base.prefill };
  const allowed: (keyof DoorwayPrefill)[] = [
    'names', 'eventDate', 'venueName', 'location', 'occasion', 'scheduleHints',
  ];
  for (const key of allowed) {
    if (prefill[key] != null) continue; // never overwrite a parsed fact
    const v = suggestion[key];
    if (v == null) continue;
    if (key === 'names') {
      if (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'string' && n.trim())) {
        prefill.names = [String(v[0]).trim(), String(v[1]).trim()];
      }
      continue;
    }
    if (key === 'scheduleHints') {
      if (Array.isArray(v)) {
        const lines = v.filter((l): l is string => typeof l === 'string' && !!l.trim()).slice(0, 8);
        if (lines.length) prefill.scheduleHints = lines;
      }
      continue;
    }
    if (key === 'eventDate') {
      // Only accept a well-formed ISO date from the model.
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) prefill.eventDate = v;
      continue;
    }
    if (typeof v === 'string' && v.trim()) {
      (prefill as Record<string, unknown>)[key] = v.trim().slice(0, 200);
    }
  }
  const filled = (Object.keys(prefill) as (keyof DoorwayPrefill)[]).filter(
    (k) => k !== 'sourceTitle',
  );
  return { prefill, filled, empty: filled.length === 0 };
}

// ─── HTML → text ─────────────────────────────────────────────

/** Strip tags, scripts, and styles to visible-ish text. Cheap and
 *  good enough to feed the parsers; not a DOM. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Pull a page title from <title> or og:title. */
export function htmlTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t?.[1]) return htmlToText(t[1]).trim();
  return undefined;
}
