// ─────────────────────────────────────────────────────────────
// welcome-home-copy — the dashboard Home's derived-copy pipeline,
// extracted pure so the forbidden-strings test can hold it to the
// AFTERGLOW-PLAN §2 test: read every card aloud 11 days after the
// day — it should sound like someone who was there.
//
// Everything here takes the cockpit PHASE (cockpit-phase.ts), never
// a clamped day count of its own. The legacy `stage` survives only
// inside the planning/final branches for pacing granularity.
// ─────────────────────────────────────────────────────────────

import { getEventType } from '@/lib/event-os/event-types';
import { formatDaysAgo } from '@/lib/date-utils';
import { type CockpitPhase, isPostEventPhase } from '@/lib/event-os/cockpit-phase';
import type { ChecklistItem } from '@/components/pearloom/dash/cockpit';

export type Stage = 'early' | 'mid' | 'late';

export function stageFromDaysUntil(daysUntil: number | null): Stage {
  if (daysUntil == null) return 'early';
  if (daysUntil <= 30) return 'late';
  if (daysUntil >= 180) return 'early';
  return 'mid';
}

export interface GuestCountsLite {
  invited: number;
  yes: number;
  no: number;
  maybe: number;
  pending: number;
}

/** The slice of /api/cadence's MergedPhase the milestones read. */
export interface CadencePhaseLite {
  label: string;
  scheduledAt: string;
  status: 'preset' | 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
  sentCount?: number;
}

// ─────────────────────────────────────────────────────────────
// buildMilestones — the vertical roadmap ladder (feeds RoadCard +
// the planning-progress counts). Post-event the SAME rail becomes
// the StoryCard: what happened, past tense, every dot filled
// (AFTERGLOW-PLAN §4.3).
// ─────────────────────────────────────────────────────────────
export type MilestoneStatus = 'done' | 'urgent' | 'next' | 'upcoming' | 'distant';
export interface Milestone {
  date: string;
  label: string;
  sub: string;
  status: MilestoneStatus;
  urgency: 'urgent' | 'soon' | 'on-track';
}

/* Which planning ladder an occasion walks. The wedding pacing
   ("save-the-dates ~10 mo", caterer counts, seating) only fits
   couple-arc events — trips plan a group weekend, parties send
   invitations weeks (not months) ahead, cultural ceremonies add a
   service to confirm, and solemn occasions keep the quiet ladder. */
type MilestoneFamily = 'couple' | 'trip' | 'party' | 'cultural' | 'solemn';

/** Group-trip occasions — no vendors/caterer/seating; the work is
 *  the group itself (cost shares, sizes, travel). */
const TRIP_OCCASIONS: ReadonlySet<string> = new Set([
  'bachelor-party',
  'bachelorette-party',
  'reunion',
]);

function milestoneFamilyFor(occasion: string): MilestoneFamily {
  if (occasion === 'memorial' || occasion === 'funeral') return 'solemn';
  if (TRIP_OCCASIONS.has(occasion)) return 'trip';
  if (occasion === 'wedding' || occasion === 'vow-renewal') return 'couple';
  if (getEventType(occasion)?.category === 'cultural') return 'cultural';
  return 'party';
}

function shortDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function buildMilestones({
  phase, stage, eventDate, eventDateShort, daysUntil, rawDaysUntil = null,
  guestCounts, cadence, occasion, createdAt = null, publishedAt = null, published = false,
}: {
  phase: CockpitPhase;
  stage: Stage;
  eventDate: Date | null;
  eventDateShort: string | null;
  daysUntil: number | null;
  /** Unclamped — negative once past; drives the story rail's "N days ago". */
  rawDaysUntil?: number | null;
  guestCounts: GuestCountsLite | null;
  cadence?: CadencePhaseLite[] | null;
  /** Drives the milestone family — see milestoneFamilyFor. */
  occasion: string;
  /** Real stamps for the post-event story rail (ISO strings). */
  createdAt?: string | null;
  publishedAt?: string | null;
  published?: boolean;
}): Milestone[] {
  const family = milestoneFamilyFor(occasion);
  const dayLabel =
    family === 'couple' ? 'The big day'
    : family === 'trip' ? 'The weekend itself'
    : family === 'solemn' ? 'The gathering'
    : 'The day itself';

  // ── The story rail — past tense, all done, real stamps. The
  //    thread is tied off: the final rung keeps the gold heart
  //    ('distant' maps to the RoadCard 'end' state). ──────────
  if (isPostEventPhase(phase)) {
    const out: Milestone[] = [];
    out.push({
      date: shortDate(createdAt) ?? 'Done',
      label: 'Site pressed',
      sub: 'where the thread began',
      status: 'done',
      urgency: 'on-track',
    });
    if (publishedAt || published) {
      out.push({
        date: shortDate(publishedAt) ?? 'Done',
        label: 'Shared with your people',
        sub: '',
        status: 'done',
        urgency: 'on-track',
      });
    }
    if (guestCounts && guestCounts.yes > 0) {
      out.push({
        date: 'Done',
        label: `${guestCounts.yes} said yes`,
        sub: guestCounts.invited > guestCounts.yes ? `of ${guestCounts.invited} invited` : '',
        status: 'done',
        urgency: 'on-track',
      });
    }
    out.push({
      date: eventDateShort ?? 'The day',
      label: dayLabel,
      sub: rawDaysUntil != null && rawDaysUntil < 0 ? formatDaysAgo(-rawDaysUntil) : '',
      status: 'distant',
      urgency: 'on-track',
    });
    return out;
  }

  const out: Milestone[] = [];
  out.push({ date: 'Done', label: 'Site claimed', sub: '', status: 'done', urgency: 'on-track' });
  if (eventDate) {
    out.push({ date: 'Done', label: 'Date locked', sub: eventDateShort ?? '', status: 'done', urgency: 'on-track' });
  } else {
    out.push({ date: 'Now', label: 'Lock the date', sub: 'Anchors every milestone', status: 'next', urgency: 'soon' });
  }

  // ── Real roadmap — the host's Smart Send Cadence. Sent phases are
  //    genuinely done; scheduled phases carry real dates; presets are
  //    Pear's date-derived suggestions. This replaces the previous
  //    stage-hardcoded ladder ("Book vendors · ~4 mo") whose progress
  //    bar measured fiction. The synthetic ladder below survives only
  //    as the fallback when there's no event date / cadence data. */
  const phases = (cadence ?? [])
    .filter((ph) => ph.status !== 'cancelled' && ph.status !== 'failed' && ph.scheduledAt)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  if (eventDate && phases.length > 0) {
    let nextAssigned = false;
    for (const ph of phases.slice(0, 5)) {
      const due = new Date(ph.scheduledAt);
      const dateLabel = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (ph.status === 'sent') {
        out.push({ date: 'Done', label: ph.label, sub: ph.sentCount ? `${ph.sentCount} sent` : 'sent', status: 'done', urgency: 'on-track' });
        continue;
      }
      const daysToDue = Math.round((due.getTime() - Date.now()) / 86_400_000);
      const isFirstOpen = !nextAssigned;
      nextAssigned = true;
      const urgent = ph.status === 'scheduled' && daysToDue <= 7;
      out.push({
        date: daysToDue <= 0 ? 'Now' : dateLabel,
        label: ph.label,
        sub: ph.status === 'scheduled'
          ? (daysToDue <= 0 ? 'sending today' : `sends in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`)
          : ph.status === 'draft' ? 'drafted — approve to schedule' : 'suggested by Pear',
        status: urgent ? 'urgent' : isFirstOpen ? 'next' : 'upcoming',
        urgency: urgent ? 'urgent' : isFirstOpen ? 'soon' : 'on-track',
      });
    }
    if (eventDateShort) {
      out.push({
        date: eventDateShort,
        label: dayLabel,
        sub: daysUntil != null ? `${daysUntil} days out` : '',
        status: 'distant',
        urgency: 'on-track',
      });
    }
    return out;
  }

  if (family === 'solemn') {
    // Quiet ladder — no vendors / seating / menu-count rows on a
    // memorial or funeral site.
    out.push({ date: 'This week', label: 'Share the site', sub: 'family & close friends first', status: 'next', urgency: 'soon' });
    out.push({ date: 'Soon', label: 'Gather photos & words', sub: 'for the tribute wall', status: 'upcoming', urgency: 'on-track' });
    if (guestCounts && guestCounts.pending > 0) {
      out.push({ date: 'Soon', label: 'Replies', sub: `${guestCounts.pending} still to reply`, status: 'upcoming', urgency: 'on-track' });
    }
  } else if (family === 'trip') {
    // Trip ladder — bachelor/ette weekends and reunions have no
    // vendors, caterer, or seating chart; the work is the group.
    if (stage === 'early') {
      out.push({ date: 'This week', label: 'Share the site', sub: 'get it in the group chat', status: 'next', urgency: 'soon' });
      out.push({ date: 'Soon',  label: 'Lock the guest list', sub: 'who’s in for the weekend', status: 'upcoming', urgency: 'on-track' });
      out.push({ date: 'Later', label: 'Collect cost shares & sizes', sub: 'splits, shirts, beds', status: 'upcoming', urgency: 'on-track' });
      out.push({ date: 'Later', label: 'Book the travel window', sub: 'rooms & rides together', status: 'upcoming', urgency: 'on-track' });
    } else {
      if (guestCounts && guestCounts.invited > 0) {
        out.push({ date: 'Done', label: 'Site shared', sub: `${guestCounts.invited} in the loop`, status: 'done', urgency: 'on-track' });
      } else {
        out.push({ date: 'Now', label: 'Share the site', sub: 'get it in the group chat', status: 'next', urgency: 'soon' });
      }
      if (guestCounts && guestCounts.pending > 0) {
        out.push({
          date: stage === 'late' ? 'Now' : 'Soon',
          label: 'Lock the guest list',
          sub: `${guestCounts.pending} still to confirm`,
          status: stage === 'late' ? 'urgent' : 'next',
          urgency: stage === 'late' ? 'urgent' : 'soon',
        });
      } else {
        out.push({ date: 'Done', label: 'Guest list locked', sub: 'everyone has answered', status: 'done', urgency: 'on-track' });
      }
      out.push({ date: 'Soon', label: 'Collect cost shares & sizes', sub: 'splits, shirts, beds', status: stage === 'late' ? 'next' : 'upcoming', urgency: stage === 'late' ? 'soon' : 'on-track' });
      out.push({ date: 'Soon', label: 'Book the travel window', sub: 'rooms & rides together', status: 'upcoming', urgency: 'on-track' });
    }
  } else if (family === 'party' || family === 'cultural') {
    // Party ladder — showers, birthdays, graduations, dinners.
    // Shorter lead times than a wedding: invitations go out weeks
    // ahead, not months, and there's no vendor/caterer/seating run.
    if (stage === 'early') {
      out.push({ date: 'This week', label: 'Share the site', sub: 'let people save the day', status: 'next', urgency: 'soon' });
      out.push({ date: '~6 wk', label: 'Send invitations', sub: 'a few weeks ahead is plenty', status: 'upcoming', urgency: 'on-track' });
      out.push({ date: '~2 wk', label: 'Replies in', sub: 'close the list', status: 'upcoming', urgency: 'on-track' });
    } else if (stage === 'mid') {
      const invited = !!guestCounts && guestCounts.invited > 0;
      if (invited) {
        out.push({ date: 'Done', label: 'Invitations sent', sub: `${guestCounts!.invited} invited`, status: 'done', urgency: 'on-track' });
      } else {
        out.push({ date: 'Now', label: 'Send invitations', sub: 'a few weeks ahead is plenty', status: 'next', urgency: 'soon' });
      }
      out.push({
        date: 'Soon',
        label: 'Replies in',
        sub: guestCounts && guestCounts.pending > 0 ? `${guestCounts.pending} still to reply` : 'close the list',
        status: invited ? 'next' : 'upcoming',
        urgency: invited ? 'soon' : 'on-track',
      });
      out.push({ date: 'Later', label: 'Final headcount', sub: 'lock the numbers', status: 'upcoming', urgency: 'on-track' });
    } else if (stage === 'late') {
      if (guestCounts && guestCounts.invited > 0) {
        out.push({ date: 'Done', label: 'Invitations sent', sub: `${guestCounts.invited} invited`, status: 'done', urgency: 'on-track' });
      }
      if (guestCounts && guestCounts.pending > 0) {
        out.push({
          date: 'Now',
          label: 'Replies in',
          sub: `${guestCounts.pending} pending · ${daysUntil ?? 0} days out`,
          status: 'urgent',
          urgency: 'urgent',
        });
      } else {
        out.push({ date: 'Done', label: 'Replies in', sub: 'all replies in', status: 'done', urgency: 'on-track' });
      }
      out.push({ date: 'Soon', label: 'Final headcount', sub: 'lock the numbers', status: 'next', urgency: 'soon' });
    }
    if (family === 'cultural') {
      // Ceremony rung — quinceañeras, mitzvahs, baptisms and their
      // kin have a service to confirm alongside the party.
      out.push({
        date: stage === 'late' ? 'Soon' : 'Later',
        label: 'Confirm the service details',
        sub: 'ceremony order & who takes part',
        status: 'upcoming',
        urgency: 'on-track',
      });
    }
  } else if (stage === 'early') {
    out.push({ date: 'This week', label: 'Send save-the-dates', sub: 'recommended now', status: 'next', urgency: 'soon' });
    out.push({ date: '~4 mo',     label: 'Book vendors',         sub: 'in roughly four months', status: 'upcoming', urgency: 'on-track' });
    out.push({ date: '~10 mo',    label: 'Send invitations',     sub: 'with the guest list', status: 'upcoming', urgency: 'on-track' });
  } else if (stage === 'mid') {
    if (guestCounts && guestCounts.invited > 0) {
      out.push({ date: 'Done', label: 'Save-the-dates sent', sub: `${guestCounts.invited} invited`, status: 'done', urgency: 'on-track' });
    }
    out.push({ date: 'Soon',  label: 'RSVP cutoff',        sub: daysUntil ? `~${Math.max(30, Math.round(daysUntil / 4))} days out` : '~30 days', status: 'next', urgency: 'soon' });
    out.push({ date: 'Later', label: 'Final menu count',   sub: 'caterer needs the headcount', status: 'upcoming', urgency: 'on-track' });
    out.push({ date: 'Later', label: 'Seating chart',      sub: 'after RSVPs close', status: 'upcoming', urgency: 'on-track' });
  } else if (stage === 'late') {
    if (guestCounts && guestCounts.invited > 0) {
      out.push({ date: 'Done', label: 'Invitations sent',  sub: `${guestCounts.invited} invited`, status: 'done', urgency: 'on-track' });
    }
    if (guestCounts && guestCounts.pending > 0) {
      out.push({
        date: 'Now',
        label: 'RSVP cutoff',
        sub: `${guestCounts.pending} pending · ${daysUntil ?? 0} days out`,
        status: 'urgent',
        urgency: 'urgent',
      });
    } else {
      out.push({ date: 'Done', label: 'RSVP cutoff', sub: 'all replies in', status: 'done', urgency: 'on-track' });
    }
    out.push({ date: 'Soon', label: 'Final count to caterer', sub: 'lock the headcount', status: 'next', urgency: 'soon' });
    out.push({ date: 'Soon', label: 'Seating finalized',     sub: 'place every name',    status: 'upcoming', urgency: 'on-track' });
  }

  if (eventDateShort) {
    out.push({
      date: eventDateShort,
      label: dayLabel,
      sub: daysUntil != null ? `${daysUntil} days out` : '',
      status: 'distant',
      urgency: 'on-track',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// buildChecklist — the light prep aid, phase-correct. Before the
// day it's the day-of prep list; in the afterglow it's what
// actually remains (thank-yous, photos, the keepsake); once kept,
// nothing — the bell carries stragglers.
// ─────────────────────────────────────────────────────────────
export function buildChecklist(
  phase: CockpitPhase,
  solemn: boolean,
  opts?: {
    /** True when the Vendor Book has booked vendors with open
     *  balances — gates the "settle balances" row on real data. */
    vendorBalancesOpen?: boolean;
  },
): ChecklistItem[] {
  if (phase === 'kept') return [];
  if (phase === 'afterglow') {
    if (solemn) {
      return [
        { t: 'Share the tribute wall with family', p: 'High' },
        { t: 'Gather the photos into the memory book', p: 'Medium' },
        { t: 'Print the keepsake', p: 'Medium' },
      ];
    }
    return [
      { t: 'Send the thank-yous', p: 'High' },
      { t: 'Approve guest photos for the reel', p: 'High' },
      { t: 'Print the keepsake book', p: 'Medium' },
      ...(opts?.vendorBalancesOpen ? [{ t: 'Settle vendor balances', p: 'Medium' as const }] : []),
    ];
  }
  return solemn
    ? [
        { t: 'Confirm the order of service', p: 'High' },
        { t: 'Share arrival details with family', p: 'High' },
        { t: 'Gather readings & tributes', p: 'Medium' },
        { t: 'Coordinate with the venue', p: 'Medium' },
      ]
    : [
        { t: 'Confirm vendor arrival times', p: 'High' },
        { t: 'Share the final timeline', p: 'High' },
        { t: 'Check seating & place cards', p: 'Medium' },
        { t: 'Pack welcome gifts', p: 'Medium' },
        { t: 'Print menus & signage', p: 'Low' },
      ];
}
