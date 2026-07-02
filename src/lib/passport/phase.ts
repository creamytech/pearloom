// ─────────────────────────────────────────────────────────────
// Pearloom / lib/passport/phase.ts
//
// Compute the current "phase" of a guest's relationship with an
// event so the personalized passport can adapt its content over
// time. Lifecycle:
//
//   • upcoming-far    — months out, RSVP not yet pressing
//   • upcoming-soon   — final weeks, day-before nudges
//   • day-of-pre      — same calendar day, ceremony hasn't started
//   • live            — within ~12h of the event, "happening now"
//   • day-of-post     — same day, after the event
//   • fresh-memory    — within 30 days after, gallery + memories
//   • year-ago        — anniversary windows resurface
//   • archived        — distant past, memory-vault-only access
//
// All phase-aware UI reads from this function so we change the
// definitions in one place. The phase strip in GuestCompanion
// uses this to swap copy + CTAs.
// ─────────────────────────────────────────────────────────────

export type PassportPhase =
  | 'no-date'
  | 'upcoming-far'
  | 'upcoming-soon'
  | 'day-of-pre'
  | 'live'
  | 'day-of-post'
  | 'fresh-memory'
  | 'year-ago'
  | 'archived';

const DAY = 24 * 60 * 60 * 1000;

export function computePassportPhase(
  eventDateIso?: string | null,
  now: Date = new Date(),
): PassportPhase {
  if (!eventDateIso) return 'no-date';
  const event = new Date(eventDateIso);
  if (Number.isNaN(event.getTime())) return 'no-date';

  const ms = event.getTime() - now.getTime();
  const days = Math.round(ms / DAY);
  const isSameDay =
    event.getFullYear() === now.getFullYear() &&
    event.getMonth() === now.getMonth() &&
    event.getDate() === now.getDate();

  if (isSameDay) {
    if (now.getTime() < event.getTime() - 12 * 60 * 60 * 1000) return 'day-of-pre';
    if (now.getTime() <= event.getTime() + 12 * 60 * 60 * 1000) return 'live';
    return 'day-of-post';
  }

  if (days > 0) {
    if (days <= 14) return 'upcoming-soon';
    return 'upcoming-far';
  }

  // Past event.
  const daysSince = -days;
  if (daysSince <= 30) return 'fresh-memory';

  // Year-ago window — flag if within ±3 days of any anniversary.
  const yearsPassed = Math.floor((now.getTime() - event.getTime()) / (365.25 * DAY));
  if (yearsPassed > 0) {
    const anniversary = new Date(event);
    anniversary.setFullYear(event.getFullYear() + yearsPassed);
    const distance = Math.abs(now.getTime() - anniversary.getTime());
    if (distance <= 3 * DAY) return 'year-ago';
  }

  return 'archived';
}

export interface PhaseCopy {
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

/** Per-phase copy block. Names are interpolated by the consumer. */
export function phaseCopy(
  phase: PassportPhase,
  ctx: { firstName: string; coupleNames: string; venue?: string; sitePath: string; rsvpHref: string; eventDateLabel: string; daysUntil?: number; yearsPassed?: number },
): PhaseCopy {
  const { firstName, coupleNames, venue, sitePath, rsvpHref, eventDateLabel, daysUntil, yearsPassed } = ctx;
  switch (phase) {
    case 'no-date':
      return {
        eyebrow: 'Pearloom companion',
        headline: `${firstName}, you're on the list`,
        body: `${coupleNames} are still finalising the date. Pear will tell you the moment it's set.`,
        primaryCta: { label: 'See the site', href: sitePath },
      };
    case 'upcoming-far':
      return {
        eyebrow: `${daysUntil ?? '—'} days until`,
        headline: `${eventDateLabel}${venue ? ` · ${venue}` : ''}`,
        body: `Plenty of time to plan. Save the date and we'll ping you when the invitation lands.`,
        primaryCta: { label: 'RSVP early', href: rsvpHref },
        secondaryCta: { label: 'See the site', href: sitePath },
      };
    case 'upcoming-soon':
      return {
        eyebrow: `${daysUntil ?? 'soon'} days until`,
        headline: `Almost time, ${firstName}`,
        body: `Final logistics will land here — venue, parking, dress code. Confirm your RSVP so the hosts can plan dinner.`,
        primaryCta: { label: 'Confirm RSVP', href: rsvpHref },
        secondaryCta: { label: 'See the site', href: sitePath },
      };
    case 'day-of-pre':
      return {
        eyebrow: 'Today',
        headline: `${firstName} — see you in a few hours`,
        body: `${venue ? `${venue}.` : ''} Your seat, dress code, and arrival notes are pinned below.`,
        primaryCta: { label: 'Open in maps', href: '#' },
        secondaryCta: { label: 'See the timeline', href: '#timeline' },
      };
    case 'live':
      return {
        eyebrow: 'Live now',
        headline: 'Happening now',
        body: 'Photos go straight to the live wall. Voice toasts queue for the host. Your seat, dietary, and accessibility info are loaded.',
        primaryCta: { label: 'Add a photo', href: '#photo-upload' },
        secondaryCta: { label: 'Record a toast', href: '#voice-toast' },
      };
    case 'day-of-post':
      return {
        eyebrow: 'Tonight',
        headline: 'Thank you for being there',
        body: 'Photos uploaded today are syncing now. Add anything you missed — the gallery is live for the hosts to see.',
        primaryCta: { label: 'Add more photos', href: '#photo-upload' },
        secondaryCta: { label: 'Leave a memory', href: '#guestbook' },
      };
    case 'fresh-memory':
      return {
        eyebrow: 'A few weeks ago',
        headline: 'How was the day, from your side?',
        body: 'The hosts are stitching memories — a sentence, a favourite frame, anything you want to add lives forever in this passport.',
        primaryCta: { label: 'Leave a memory', href: '#guestbook' },
        secondaryCta: { label: 'See the gallery', href: `${sitePath}#gallery` },
      };
    case 'year-ago':
      return {
        eyebrow: yearsPassed === 1 ? 'One year ago today' : `${yearsPassed} years ago today`,
        headline: 'A small rewind',
        body: `On this day in ${eventDateLabel.slice(-4)}. The hosts pinned a few memories — and your contributions are still here too.`,
        primaryCta: { label: 'Revisit the day', href: sitePath },
      };
    case 'archived':
    default:
      return {
        eyebrow: 'Memory vault',
        headline: 'A passport you can keep',
        body: 'Photos, voice notes, and the toast you recorded. Stays here as long as the hosts keep the site live.',
        primaryCta: { label: 'Open the vault', href: sitePath },
      };
  }
}
