// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sms/site-facts.ts
//
// The ONLY thing the SMS concierge is allowed to know.
//
// This is an ALLOWLIST of public, guest-facing logistics, built
// fresh rather than reusing the web concierge's summary. That
// summary grew over time and now carries host-side context; the
// audit already caught one route handing the vendor ledger to an
// anonymous caller, and an inbound text is anonymous by
// construction — anyone can dial a number.
//
// So: nothing about money, no other guests, no vendors, no
// internal notes. If a field could embarrass a host when read
// aloud by a stranger, it doesn't belong in here.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

function clean(v: unknown, max = 200): string | null {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return s ? s.slice(0, max) : null;
}

/**
 * A compact, plain-text fact sheet for one celebration.
 *
 * Returns '' when the site holds nothing a guest could be told —
 * the caller escalates rather than sending a model an empty brief
 * and hoping.
 */
export function smsSiteFacts(
  manifest: StoryManifest | Record<string, unknown> | null | undefined,
  siteLabel: string,
): string {
  const m = (manifest ?? {}) as Record<string, unknown>;
  const l = (m.logistics ?? {}) as Record<string, unknown>;
  const travel = (m.travelInfo ?? {}) as Record<string, unknown>;
  const details = (m.details ?? {}) as Record<string, unknown>;

  const lines: string[] = [];
  const add = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  add('Celebration', clean(siteLabel, 80));
  add('Date', clean(l.date, 40));
  add('Start time', clean(l.time, 40));
  add('Venue', clean(l.venue, 120));
  add('Address', clean(l.venueAddress, 160));
  add('What to wear', clean(l.dresscode, 120));
  add('RSVP by', clean(l.rsvpDeadline, 40));
  add('Parking', clean(travel.parkingInfo ?? details.parking, 240));
  add('Directions', clean(travel.directions, 240));
  add('Accessibility', clean(details.accessibility, 240));

  // The run of show — times and places only. Descriptions can
  // carry inside jokes and host notes; a guest asking "what time"
  // needs the time.
  const events = Array.isArray(m.events) ? m.events : [];
  const schedule = events.slice(0, 8).map((e) => {
    const ev = (e ?? {}) as Record<string, unknown>;
    const name = clean(ev.name, 60);
    if (!name) return null;
    const time = clean(ev.time, 30);
    const loc = clean(ev.location, 80);
    return `  - ${name}${time ? ` at ${time}` : ''}${loc ? `, ${loc}` : ''}`;
  }).filter(Boolean);
  if (schedule.length) lines.push(`Schedule:\n${schedule.join('\n')}`);

  // FAQs are written BY the host FOR guests — the safest content
  // on the whole site, and usually the actual answer.
  const faqs = Array.isArray(m.faqs) ? m.faqs : [];
  const faqLines = faqs.slice(0, 8).map((f) => {
    const fq = (f ?? {}) as Record<string, unknown>;
    const q = clean(fq.question, 100);
    const a = clean(fq.answer, 220);
    return q && a ? `  - ${q} → ${a}` : null;
  }).filter(Boolean);
  if (faqLines.length) lines.push(`They already answered:\n${faqLines.join('\n')}`);

  // A fact sheet that is nothing but the label tells a guest
  // nothing; treat it as empty so the caller escalates.
  return lines.length <= 1 ? '' : lines.join('\n');
}
