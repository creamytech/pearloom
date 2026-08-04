// ─────────────────────────────────────────────────────────────
// Pearloom / lib/planner/client-book.ts
//
// PLANNER v1 — the professional's view.
//
// The merged synthesis ranks planners the #2 distribution channel
// and the only remaining item that changes acquisition MATH rather
// than funnel polish: a planner running fifteen weddings a year is
// worth fifteen individually-acquired couples, and they arrive
// already trusted by the client.
//
// NO NEW TABLE. A planner is already expressible: they're a co-host
// (`editor`) on their clients' sites. `ListedSite.coHostRole`
// carries that today. What was missing is the *framing* — a book of
// clients ordered by what needs attention, rather than a flat list
// of sites that happens to include other people's.
//
// THE DISTINCTION THAT MATTERS: a planner does not own their
// clients' celebrations, and this module never pretends otherwise.
// Owned sites and client sites are separated, roles are surfaced,
// and nothing here grants access — it only organises access that
// already exists. If a client removes the planner as co-host, the
// site leaves the book on the next read. That is the correct
// behaviour and needs no revocation logic of our own.
//
// Pure + client-safe: sorting and grouping only, no I/O, no clock
// (the caller passes `today`).
// ─────────────────────────────────────────────────────────────

import { cockpitPhaseFor, type CockpitPhase } from '@/lib/event-os/cockpit-phase';
import { containerNoun } from '@/lib/celebration-naming';

/** The subset of a listed site this module needs. Structural so it
 *  accepts `ListedSite` or any projection of it. */
export interface BookSite {
  id: string;
  domain: string;
  occasion?: string | null;
  published?: boolean;
  /** Absent/owner = the planner's own; anything else = a client's. */
  coHostRole?: string;
  /** ISO yyyy-mm-dd. */
  eventDate?: string | null;
  /** Display name for the celebration. */
  title?: string | null;
}

export interface BookEntry {
  site: BookSite;
  /** Whole days until the event; null when no date is set. */
  daysUntil: number | null;
  phase: CockpitPhase;
  /** What the planner should notice, in plain words. Null when the
   *  entry is simply fine — an invented "action" on every row trains
   *  people to ignore the column. */
  attention: string | null;
  /** Occasion-aware noun so a memorial is never a "celebration". */
  noun: string;
}

export interface ClientBook {
  /** Sites the planner owns outright (their own drafts, templates). */
  mine: BookEntry[];
  /** Sites they co-host for a client. */
  clients: BookEntry[];
  counts: {
    clients: number;
    /** Client events happening within the final stretch. */
    soon: number;
    /** Client events still unpublished — the planner's most common
     *  real job. */
    unpublished: number;
  };
}

function daysBetween(todayIso: string, eventIso: string): number | null {
  const t = /^(\d{4})-(\d{2})-(\d{2})/.exec(todayIso);
  const e = /^(\d{4})-(\d{2})-(\d{2})/.exec(eventIso);
  if (!t || !e) return null;
  const a = Date.UTC(+t[1], +t[2] - 1, +t[3]);
  const b = Date.UTC(+e[1], +e[2] - 1, +e[3]);
  return Math.round((b - a) / 86_400_000);
}

/**
 * What the planner should notice about this entry, or null.
 *
 * Deliberately sparse: an "action" on every row is noise, and a
 * planner scanning fifteen clients needs the three that matter to
 * stand out. Solemn occasions get no urgency language at all.
 */
function attentionFor(site: BookSite, daysUntil: number | null, noun: string): string | null {
  const solemn = noun === 'remembrance';
  if (site.published === false) {
    if (daysUntil != null && daysUntil <= 30 && daysUntil >= 0) {
      return solemn
        ? 'Not published yet.'
        : `Not published yet — ${daysUntil === 0 ? 'today' : `${daysUntil} days out`}.`;
    }
    return 'Still a draft.';
  }
  if (daysUntil == null) return 'No date set.';
  if (solemn) return null;                 // never hurry a memorial
  if (daysUntil === 0) return 'Today.';
  if (daysUntil > 0 && daysUntil <= 7) return `${daysUntil} days out.`;
  return null;
}

/**
 * Build the book. Client sites sort by urgency (soonest real date
 * first, undated last); the planner's own sites keep a simple
 * recency-free alphabetical order since they're usually templates.
 */
export function buildClientBook(sites: readonly BookSite[], todayIso: string): ClientBook {
  const mine: BookEntry[] = [];
  const clients: BookEntry[] = [];

  for (const site of sites ?? []) {
    const noun = containerNoun(site.occasion);
    const daysUntil = site.eventDate ? daysBetween(todayIso, site.eventDate) : null;
    const entry: BookEntry = {
      site,
      daysUntil,
      phase: cockpitPhaseFor(daysUntil),
      attention: attentionFor(site, daysUntil, noun),
      noun,
    };
    // A co-host role means someone else owns it — that's a client.
    const role = (site.coHostRole ?? '').trim().toLowerCase();
    if (role && role !== 'owner') clients.push(entry);
    else mine.push(entry);
  }

  // Soonest first; past events after upcoming ones; undated last.
  clients.sort((a, b) => {
    const rank = (d: number | null) => (d == null ? 2 : d < 0 ? 1 : 0);
    const ra = rank(a.daysUntil);
    const rb = rank(b.daysUntil);
    if (ra !== rb) return ra - rb;
    if (a.daysUntil == null || b.daysUntil == null) {
      return (a.site.title ?? a.site.domain).localeCompare(b.site.title ?? b.site.domain);
    }
    // Within past events, most recent first.
    if (ra === 1) return b.daysUntil - a.daysUntil;
    return a.daysUntil - b.daysUntil;
  });

  mine.sort((a, b) =>
    (a.site.title ?? a.site.domain).localeCompare(b.site.title ?? b.site.domain));

  return {
    mine,
    clients,
    counts: {
      clients: clients.length,
      soon: clients.filter((e) => e.daysUntil != null && e.daysUntil >= 0 && e.daysUntil <= 30).length,
      unpublished: clients.filter((e) => e.site.published === false).length,
    },
  };
}
