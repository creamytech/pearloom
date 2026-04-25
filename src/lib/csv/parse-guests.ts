// ──────────────────────────────────────────────────────────────
// CSV parser for guest list import.
//
// Accepts a wide range of header formats and maps them to our
// canonical guest schema. Designed for the messy real-world CSVs
// people export from Google Sheets / Notion / The Knot / Excel.
//
// Standalone (no papaparse dep) — does the right thing for the
// 95% case (commas, quoted commas, escaped quotes, CRLF/LF).
// ──────────────────────────────────────────────────────────────

export interface ParsedGuest {
  name: string;
  email: string | null;
  phone: string | null;
  party_label: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  plus_one_count: number;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  meal_preference: string | null;
  dietary_restrictions: string | null;
  /** Row number in the original CSV (1-indexed, header is row 1). */
  rowIndex: number;
  /** Errors found during parsing — non-fatal; row is still returned. */
  warnings: string[];
}

export interface ParseResult {
  guests: ParsedGuest[];
  /** Detected header → canonical-field mapping, for UI preview. */
  headerMap: Record<string, keyof ParsedGuest | 'ignored'>;
  /** Rows that couldn't be parsed (e.g. fewer columns than headers). */
  rejected: { rowIndex: number; reason: string }[];
}

// ── Header normalisation ──────────────────────────────────────

const HEADER_ALIASES: Record<string, keyof ParsedGuest> = {
  // name
  'name': 'name', 'full name': 'name', 'guest name': 'name', 'guest': 'name',
  'first and last': 'name', 'first/last': 'name',

  // email
  'email': 'email', 'email address': 'email', 'e-mail': 'email', 'mail': 'email',

  // phone
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'cell': 'phone',
  'tel': 'phone', 'telephone': 'phone',

  // party / household
  'party': 'party_label', 'household': 'party_label', 'group': 'party_label',
  'family': 'party_label', 'side': 'party_label', 'table': 'party_label',

  // plus one
  'plus one': 'plus_one', '+1': 'plus_one', 'plus-one': 'plus_one', 'plusone': 'plus_one',
  'has plus one': 'plus_one', 'guest of': 'plus_one',
  'plus one name': 'plus_one_name', 'partner name': 'plus_one_name', '+1 name': 'plus_one_name',
  'plus one count': 'plus_one_count', 'extras': 'plus_one_count',

  // address
  'address': 'mailing_address_line1', 'street': 'mailing_address_line1',
  'address 1': 'mailing_address_line1', 'address line 1': 'mailing_address_line1',
  'addr1': 'mailing_address_line1', 'street address': 'mailing_address_line1',
  'mailing address': 'mailing_address_line1',
  'address 2': 'mailing_address_line2', 'address line 2': 'mailing_address_line2',
  'addr2': 'mailing_address_line2', 'apt': 'mailing_address_line2', 'unit': 'mailing_address_line2',

  'city': 'city',
  'state': 'state', 'province': 'state', 'region': 'state',
  'zip': 'postal_code', 'zip code': 'postal_code', 'postal': 'postal_code',
  'postal code': 'postal_code', 'postcode': 'postal_code',
  'country': 'country',

  // RSVP / meal
  'meal': 'meal_preference', 'meal choice': 'meal_preference', 'entree': 'meal_preference',
  'meal preference': 'meal_preference',
  'dietary': 'dietary_restrictions', 'dietary restrictions': 'dietary_restrictions',
  'allergies': 'dietary_restrictions', 'restrictions': 'dietary_restrictions',
};

function normaliseHeader(h: string): keyof ParsedGuest | 'ignored' {
  const clean = h.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return HEADER_ALIASES[clean] ?? 'ignored';
}

// ── CSV tokeniser ─────────────────────────────────────────────

function tokenise(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(cell); cell = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') {
      row.push(cell);
      // Skip blank rows
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
  }
  return rows;
}

// ── Helpers ───────────────────────────────────────────────────

function parseBoolean(s: string): boolean {
  const v = s.trim().toLowerCase();
  return v === 'yes' || v === 'y' || v === 'true' || v === '1' || v === 'x';
}

function parseInt0(s: string): number {
  const n = parseInt(s.trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

// Some CSVs have "First Name" / "Last Name" instead of "Name". We
// detect the pair on the second pass and synthesise a `name` field.
function pickFirstLastName(
  row: string[],
  headers: string[],
): string | null {
  const firstIdx = headers.findIndex((h) => /^first\s*name$/i.test(h.trim()));
  const lastIdx = headers.findIndex((h) => /^last\s*name$/i.test(h.trim()));
  if (firstIdx === -1 || lastIdx === -1) return null;
  const first = (row[firstIdx] || '').trim();
  const last = (row[lastIdx] || '').trim();
  if (!first && !last) return null;
  return [first, last].filter(Boolean).join(' ');
}

// ── Public API ────────────────────────────────────────────────

export function parseGuestCsv(text: string): ParseResult {
  const rows = tokenise(text);
  if (rows.length === 0) {
    return { guests: [], headerMap: {}, rejected: [] };
  }

  const rawHeaders = rows[0]!;
  const headerMap: Record<string, keyof ParsedGuest | 'ignored'> = {};
  const headerToField: (keyof ParsedGuest | 'ignored' | 'name-firstlast')[] = [];

  // Detect First Name / Last Name pair
  const hasFirstLast = rawHeaders.some((h) => /^first\s*name$/i.test(h.trim()))
    && rawHeaders.some((h) => /^last\s*name$/i.test(h.trim()));

  for (const h of rawHeaders) {
    const field = normaliseHeader(h);
    headerMap[h] = field;
    headerToField.push(field);
  }

  const guests: ParsedGuest[] = [];
  const rejected: { rowIndex: number; reason: string }[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.length === 0 || row.every((v) => v === '')) continue;

    const guest: ParsedGuest = {
      name: '',
      email: null, phone: null, party_label: null,
      plus_one: false, plus_one_name: null, plus_one_count: 0,
      mailing_address_line1: null, mailing_address_line2: null,
      city: null, state: null, postal_code: null, country: null,
      meal_preference: null, dietary_restrictions: null,
      rowIndex: r + 1,
      warnings: [],
    };

    // First/Last Name fallback
    if (hasFirstLast) {
      const synth = pickFirstLastName(row, rawHeaders);
      if (synth) guest.name = synth;
    }

    for (let c = 0; c < row.length; c++) {
      const field = headerToField[c];
      if (!field || field === 'ignored') continue;
      const raw = (row[c] ?? '').trim();
      if (!raw) continue;

      switch (field) {
        case 'name':
          guest.name = raw;
          break;
        case 'plus_one':
          guest.plus_one = parseBoolean(raw);
          break;
        case 'plus_one_count': {
          const n = parseInt0(raw);
          guest.plus_one_count = Math.max(0, Math.min(10, n));
          if (n > 0) guest.plus_one = true;
          break;
        }
        default:
          (guest as unknown as Record<string, string | null>)[field] = raw;
      }
    }

    if (!guest.name) {
      rejected.push({ rowIndex: r + 1, reason: 'No name column matched / row has no name.' });
      continue;
    }

    // Light validation warnings
    if (guest.email && !/.+@.+\..+/.test(guest.email)) {
      guest.warnings.push(`Email "${guest.email}" looks invalid`);
    }

    guests.push(guest);
  }

  return { guests, headerMap, rejected };
}

// ── Dedupe ────────────────────────────────────────────────────

export interface DedupeOptions {
  existingEmails?: Set<string>;
  existingNames?: Set<string>;
}

export interface DedupedGuest extends ParsedGuest {
  duplicateOf?: 'email' | 'name';
}

/** Mark which incoming guests are duplicates of existing ones,
 *  keyed by lowercased email or normalised name. The caller decides
 *  whether to skip duplicates or upsert them. */
export function dedupeAgainst(
  guests: ParsedGuest[],
  opts: DedupeOptions,
): DedupedGuest[] {
  const emails = opts.existingEmails ?? new Set();
  const names = opts.existingNames ?? new Set();
  return guests.map((g) => {
    const out: DedupedGuest = { ...g };
    if (g.email && emails.has(g.email.toLowerCase())) {
      out.duplicateOf = 'email';
      return out;
    }
    const normName = g.name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normName && names.has(normName)) {
      out.duplicateOf = 'name';
      return out;
    }
    return out;
  });
}
