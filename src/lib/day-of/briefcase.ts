// ─────────────────────────────────────────────────────────────
// Pearloom / lib/day-of/briefcase.ts
//
// THE PRINTABLE BRIEFCASE — for the guest who will not use a phone.
//
// Every surface Pearloom has built assumes a device: the passport,
// the QR, the live schedule, the concierge. For a large share of
// real guests at real weddings — grandparents, great-aunts, the
// friend who still has a flip phone — that entire product is
// invisible. Their host ends up hand-writing directions on an index
// card the night before.
//
// This composes one sheet the host can print and hand over: where
// to be, when, how to get there, where they're sitting, and who to
// call if something goes wrong. Paper, large type, no scanning
// required.
//
// PRIVACY, deliberately tight. This sheet leaves the host's hands
// and goes into someone's coat pocket, so:
//   • It carries THIS guest's own details and nothing about anyone
//     else's arrangements.
//   • Table-mates are FIRST NAMES only — enough to find your seat,
//     never a roster of who's attending.
//   • It carries no email addresses, no phone numbers of other
//     guests, and no money.
//   • The day-of contact is the host's chosen day-of number, never
//     their account email.
//
// Pure + testable: no I/O, no clock. The route supplies the data.
// ─────────────────────────────────────────────────────────────

export interface BriefcaseGuest {
  name: string;
  /** Their table, if seated. */
  tableName?: string | null;
  /** First names only — enough to find the table. */
  tableMates?: string[];
  /** Their own dietary note, so they can check it's right. */
  dietary?: string | null;
}

export interface BriefcaseEvent {
  name: string;
  /** Human time, already formatted by the caller. */
  time?: string | null;
  place?: string | null;
}

export interface BriefcaseInput {
  eventTitle: string;
  /** Already formatted for humans ("Saturday, 12 September 2027"). */
  dateLine?: string | null;
  venueName?: string | null;
  /** Written out in full — this replaces a phone map. */
  venueAddress?: string | null;
  dressCode?: string | null;
  /** The run of show, in order. */
  schedule?: BriefcaseEvent[];
  /** Who to call on the day. The host's chosen day-of number. */
  dayOfContactName?: string | null;
  dayOfContactPhone?: string | null;
  /** Parking / transport in plain sentences. */
  gettingThere?: string | null;
  guest: BriefcaseGuest;
}

export interface BriefcaseSection {
  heading: string;
  /** Plain lines. The renderer decides type size, not this module. */
  lines: string[];
}

export interface Briefcase {
  title: string;
  subtitle: string | null;
  sections: BriefcaseSection[];
  /** Present only when something essential is missing, so the HOST
   *  can fix it before printing rather than a guest discovering it. */
  missing: string[];
}

function clean(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s.length > 0 ? s : null;
}

/**
 * Compose the sheet. Sections appear only when they have content —
 * an empty "Getting there" heading is worse than no heading, because
 * it reads as information that was lost.
 */
export function buildBriefcase(input: BriefcaseInput): Briefcase {
  const sections: BriefcaseSection[] = [];
  const missing: string[] = [];

  // ── Where and when ──────────────────────────────────────────
  const whereLines: string[] = [];
  const date = clean(input.dateLine);
  if (date) whereLines.push(date);
  else missing.push('the date');

  const venue = clean(input.venueName);
  if (venue) whereLines.push(venue);
  const address = clean(input.venueAddress);
  if (address) whereLines.push(address);
  else missing.push('the full address');

  if (whereLines.length > 0) {
    sections.push({ heading: 'Where and when', lines: whereLines });
  }

  // ── Getting there ───────────────────────────────────────────
  const getting = clean(input.gettingThere);
  if (getting) {
    sections.push({ heading: 'Getting there', lines: [getting] });
  }

  // ── The day, in order ───────────────────────────────────────
  const schedule = (input.schedule ?? []).filter((e) => clean(e.name));
  if (schedule.length > 0) {
    sections.push({
      heading: 'The day, in order',
      lines: schedule.map((e) => {
        const time = clean(e.time);
        const place = clean(e.place);
        const parts = [time, clean(e.name), place].filter(Boolean);
        return parts.join(' · ');
      }),
    });
  }

  // ── Your seat ───────────────────────────────────────────────
  // First names only: enough to find the table, never a roster.
  const seatLines: string[] = [];
  const table = clean(input.guest.tableName);
  if (table) {
    seatLines.push(`You're at ${table}.`);
    const mates = (input.guest.tableMates ?? [])
      .map((m) => clean(m))
      .filter((m): m is string => !!m)
      .map((m) => m.split(/\s+/)[0]) // first name only, always
      .slice(0, 12);
    if (mates.length > 0) {
      seatLines.push(`With ${mates.join(', ')}.`);
    }
  }
  const dietary = clean(input.guest.dietary);
  if (dietary) seatLines.push(`Your note to the kitchen: ${dietary}`);
  if (seatLines.length > 0) {
    sections.push({ heading: 'Your seat', lines: seatLines });
  }

  // ── What to wear ────────────────────────────────────────────
  const dress = clean(input.dressCode);
  if (dress) sections.push({ heading: 'What to wear', lines: [dress] });

  // ── If you need anything ────────────────────────────────────
  const contactName = clean(input.dayOfContactName);
  const contactPhone = clean(input.dayOfContactPhone);
  if (contactPhone) {
    sections.push({
      heading: 'If you need anything',
      lines: [contactName ? `${contactName} — ${contactPhone}` : contactPhone],
    });
  } else {
    missing.push('a day-of phone number');
  }

  const guestName = clean(input.guest.name);

  return {
    title: clean(input.eventTitle) ?? 'Your day',
    subtitle: guestName ? `For ${guestName}` : null,
    sections,
    missing,
  };
}

/** Escape for the print HTML. Guest names and venue notes are
 *  host-authored free text; they are never injected raw. */
export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A print-first HTML sheet. Large type, high contrast, black on
 * white — this is read by someone who may not see well, under
 * whatever light the venue has, without a device to zoom.
 */
export function renderBriefcaseHtml(sheet: Briefcase): string {
  const sections = sheet.sections
    .map(
      (s) => `
      <section>
        <h2>${escapeHtml(s.heading)}</h2>
        ${s.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('\n')}
      </section>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(sheet.title)}${sheet.subtitle ? ` — ${escapeHtml(sheet.subtitle)}` : ''}</title>
<style>
  /* Print-first. 13pt body is deliberately large: this sheet is for
     someone reading without a device to zoom. */
  @page { size: auto; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 13pt;
    line-height: 1.55;
    color: #000;
    background: #fff;
    max-width: 640px;
    margin: 0 auto;
    padding: 24px;
  }
  h1 { font-size: 22pt; margin: 0 0 2px; font-weight: 600; }
  .sub { font-size: 12pt; color: #333; margin: 0 0 20px; }
  section { margin: 0 0 20px; page-break-inside: avoid; }
  h2 {
    font-size: 10pt; text-transform: uppercase; letter-spacing: 0.14em;
    color: #444; margin: 0 0 6px; font-weight: 700;
    border-bottom: 1px solid #999; padding-bottom: 3px;
  }
  p { margin: 0 0 5px; }
  .print-hint { margin-top: 28px; font-size: 10pt; color: #555; }
  @media print { .print-hint { display: none; } }
</style>
</head><body>
  <h1>${escapeHtml(sheet.title)}</h1>
  ${sheet.subtitle ? `<p class="sub">${escapeHtml(sheet.subtitle)}</p>` : ''}
  ${sections}
  <p class="print-hint">Print this page (⌘P / Ctrl+P) and hand it over.</p>
</body></html>`;
}
