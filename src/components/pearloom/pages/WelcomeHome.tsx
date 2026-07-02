'use client';

// ─────────────────────────────────────────────────────────────
// WelcomeHome — the dashboard "Welcome back" home (cockpit).
//
// Top to bottom:
//
//   1. CountdownHero — the dark "N days" hero (design-system v2):
//                      greeting · venue/occasion eyebrow · countdown ·
//                      decisions/tasks status · honoree marks · actions
//                      (src/components/pearloom/dash/cockpit.tsx)
//   2. StatTiles     — quick-glance count-ups (Coming / Awaiting /
//                      Replied / Days), all backed by real data
//   3. NeedsYouNow   — Pear's phase-aware decision queue,
//                      derived from /api/guests/intelligence
//   4. Lately        — recent RSVPs, compact feed
//   5. GuestPulse    — % responded + stacked yes/no/maybe/pending bar
//   6. Milestones    — vertical roadmap to the date
//   + edge cards (co-host invites, remembering/anniversary, siblings)
//
// Data flow:
//   - useSelectedSite() drives the active site
//   - GET /api/guests?site= drives the tiles + GuestPulse + Lately
//   - GET /api/guests/intelligence drives Pear's recommendations
//   - GET /api/cadence?site= drives the milestone roadmap
//   - Stage (early | mid | late) derives from daysUntil — under 30
//     days is "late", over 180 "early", in between "mid".
//
// The cockpit pieces are prop-driven (cockpit.tsx) and verified in
// the /dev/dashboard harness; this file feeds them real data only —
// no invented numbers (budget/gifts have no backing store yet).
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashLayout } from '../dash/DashShell';
import { DashSkeleton } from '../dash/DashSkeleton';
import { Icon } from '../motifs';
import { useIsMobile } from '../redesign/use-nav-hooks';
import { useSelectedSite, patchSiteManifestInCache } from '@/components/marketing/design/dash/hooks';
import { parseLocalDate } from '@/lib/date-utils';
import { buildSiteUrl } from '@/lib/site-urls';
import { nextStepFor, rsvpMomentumFor, isManifestPublished, type RsvpMomentum } from '@/lib/next-step';
import { FirstThreadCard } from '../dash/FirstThreadCard';
import { WEEKEND_ANCHORS } from '@/lib/event-os/weekend-arcs';
import { getEventType } from '@/lib/event-os/event-types';
import { isDashSurfaceApplicable } from '@/lib/event-os/dashboard-applicability';
import type { StoryManifest } from '@/types';
import { CountdownHero, NeedsYouNow, Lately, TheLongView, HomeSitePreview, QuickJumps, BudgetBreakdown, type LatelyItem, type QuickJump, type BudgetLine } from '@/components/pearloom/dash/cockpit';
import { PageIntro, StatStrip, type StatStripItem } from '@/components/pearloom/dash/QuietDash';
import { getTheme, themeRootStyle } from '@/components/pearloom/site/themes';
import type { GuestInsight } from '@/app/api/guests/intelligence/route';

interface Guest {
  id: string;
  name: string;
  status: 'pending' | 'yes' | 'no' | 'maybe' | string;
  respondedAt?: string | null;
  message?: string | null;
  plusOneName?: string | null;
}

/** The slice of /api/cadence's MergedPhase the milestones read. */
interface CadencePhaseLite {
  label: string;
  scheduledAt: string;
  status: 'preset' | 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
  sentCount?: number;
}

type Stage = 'early' | 'mid' | 'late';

function stageFromDaysUntil(daysUntil: number | null): Stage {
  if (daysUntil == null) return 'early';
  if (daysUntil <= 30) return 'late';
  if (daysUntil >= 180) return 'early';
  return 'mid';
}

// ─────────────────────────────────────────────────────────────
// WelcomeHome
// ─────────────────────────────────────────────────────────────
export function WelcomeHome() {
  const { site, sites } = useSelectedSite();
  const { data: session } = useSession();
  const [insights, setInsights] = useState<GuestInsight[] | null>(null);
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [cadence, setCadence] = useState<CadencePhaseLite[] | null>(null);

  useEffect(() => {
    if (!site?.domain) return;
    let cancelled = false;
    fetch(`/api/guests/intelligence?siteId=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { insights?: GuestInsight[] } | null) => {
        if (!cancelled && data?.insights) setInsights(data.insights);
      })
      .catch(() => {});
    fetch(`/api/cadence?site=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { phases?: CadencePhaseLite[] } | null) => {
        if (!cancelled) setCadence(data?.phases ?? null);
      })
      .catch(() => { if (!cancelled) setCadence(null); });
    fetch(`/api/guests?site=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { guests?: Guest[] } | null) => {
        if (!cancelled) setGuests(data?.guests ?? []);
      })
      .catch(() => {
        // Keyless deploy / API error — resolve to empty so the
        // Guests card shows its real empty state instead of an
        // eternal 'Threading…' strip.
        if (!cancelled) setGuests([]);
      });
    return () => { cancelled = true; };
  }, [site?.domain]);

  // ── Derived: dates, stage, names ────────────────────────────
  const eventDate = parseLocalDate(site?.eventDate);
  // `now` ticks hourly so the days-until count advances at
  // midnight without a page reload. Lazy init keeps render pure.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  /* rawDaysUntil goes negative after the event — the post-event
     cards key off it. (The old `daysUntil < 0` checks could never
     fire because of the Math.max clamp; the RememberingCard had
     been dead code since it shipped.) `daysUntil` stays clamped
     for the countdown/stage math that expects ≥ 0. */
  const rawDaysUntil = eventDate
    ? Math.round((eventDate.getTime() - now) / 86_400_000)
    : null;
  const daysUntil = rawDaysUntil != null ? Math.max(0, rawDaysUntil) : null;
  const eventDateLabel = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const eventDateShort = eventDate
    ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const stage = stageFromDaysUntil(daysUntil);
  const namesArr = (site?.names ?? []).filter(Boolean) as string[];
  // Greet by the celebration's honoree name; before a site exists,
  // fall back to the signed-in user's first name, then 'friend'.
  const sessionFirstName = (session?.user?.name ?? '').trim().split(/\s+/)[0] || null;
  // Greet the signed-in HOST (Scott), not the couple's first name —
  // a co-host or solo planner isn't "Shaun". Fall back to the
  // event name only when we don't know the user's name.
  const firstName = sessionFirstName ?? namesArr[0] ?? 'friend';
  /* Time-of-day greeting — set after mount (client local time) so
     SSR can't hydration-mismatch against the server's clock. */
  const [greeting, setGreeting] = useState('Welcome back');
  useEffect(() => {
    /* rAF, not a direct set — the compiler lint flags synchronous
       setState in effects (cascading-render risk). */
    const id = requestAnimationFrame(() => {
      const h = new Date().getHours();
      setGreeting(h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const occasion = site?.occasion ?? 'wedding';
  /* Work-zone breakpoint — inline (see the grid comment below). */
  const workZoneNarrow = useIsMobile(920);
  /* Sticky rail (plan-2 §1-A #4) — but only while the rail actually
     FITS the viewport: a pinned rail taller than the window traps
     its bottom cards off-screen (sticky stops scrolling them into
     view). Measured, not assumed. Callback-ref state so the
     observer re-attaches across conditional mounts. */
  const [railEl, setRailEl] = useState<HTMLDivElement | null>(null);
  const [railFits, setRailFits] = useState(false);
  useEffect(() => {
    if (railEl == null) return;
    const update = () => setRailFits(railEl.offsetHeight <= window.innerHeight - 32);
    const raf = requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    ro.observe(railEl);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [railEl]);
  const editorHref = site?.domain ? `/editor/${site.domain}` : '/dashboard/event';
  const liveHref = site?.domain ? buildSiteUrl(site.domain, '', undefined, occasion) : '#';

  // ── Guest counts ────────────────────────────────────────────
  const guestCounts = useMemo(() => {
    if (!guests) return null;
    let yes = 0, no = 0, maybe = 0, pending = 0;
    for (const g of guests) {
      if (g.status === 'yes' || g.status === 'attending') yes++;
      else if (g.status === 'no' || g.status === 'declined') no++;
      else if (g.status === 'maybe') maybe++;
      else pending++;
    }
    return { invited: guests.length, yes, no, maybe, pending };
  }, [guests]);

  // ── Recent activity (RSVPs ordered by respondedAt desc) ────
  const recentActivity = useMemo(() => {
    if (!guests) return [];
    return guests
      .filter((g) => g.respondedAt && (g.status === 'yes' || g.status === 'no' || g.status === 'maybe'))
      .sort((a, b) => new Date(b.respondedAt!).getTime() - new Date(a.respondedAt!).getTime())
      .slice(0, 7);
  }, [guests]);

  // ── Golden thread — the ONE next-best-action ────────────────
  // Shares src/lib/next-step.ts with the editor's topbar chip so
  // the dashboard and the editor always name the same step.
  // Counts come from the /api/guests fetch this page already does.
  const manifest = (site?.manifest ?? null) as StoryManifest | null;
  // Host-entered budget (manifest.budget) — drives the cockpit
  // BudgetBreakdown. Optimistic local state synced to the saved
  // manifest; saves scope to one key via PATCH /api/sites/budget.
  const savedBudget = useMemo<BudgetLine[]>(() => {
    const raw = (manifest as { budget?: unknown } | null)?.budget;
    return Array.isArray(raw) ? (raw as BudgetLine[]) : [];
  }, [manifest]);
  const [budget, setBudget] = useState<BudgetLine[]>(savedBudget);
  // Render-time adjustment (not a setState-in-effect): resync the
  // optimistic copy when the saved manifest changes underneath us
  // (site switch / refetch).
  const [prevSavedBudget, setPrevSavedBudget] = useState(savedBudget);
  if (prevSavedBudget !== savedBudget) {
    setPrevSavedBudget(savedBudget);
    setBudget(savedBudget);
  }
  // Throws on failure so BudgetBreakdown keeps the editor open and
  // shows the error — a swallowed failure here read as "saved" while
  // the numbers silently reverted on reload.
  const saveBudget = async (next: BudgetLine[]) => {
    if (!site?.id) throw new Error('No site selected');
    const prev = budget;
    setBudget(next); // optimistic — reverted below if the save fails
    try {
      const res = await fetch('/api/sites/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id, budget: next }),
      });
      if (!res.ok) throw new Error(`Budget save failed (${res.status})`);
      // Sync the cached manifest — otherwise navigating away and back
      // within the sites-cache TTL re-syncs `budget` from the stale
      // cached copy and the just-saved lines visually disappear.
      patchSiteManifestInCache(site.id, { budget: next });
    } catch (err) {
      setBudget(prev);
      throw err;
    }
  };
  const nextStep = useMemo(
    () => (manifest
      ? nextStepFor(
          manifest,
          guestCounts ? { guests: guestCounts.invited, pendingRsvps: guestCounts.pending } : undefined,
          new Date(now),
        )
      : null),
    [manifest, guestCounts, now],
  );

  // ── Pear recommendations — after the golden thread so the same
  //    urgent task never renders twice (suppressNudge dedupe). ──
  const pearTodos = usePearTodos({ stage, insights, guestCounts, daysUntil, suppressNudge: nextStep?.id === 'nudge' });

  // ── RSVP momentum — pending replies + reply-by inside 7 days ─
  const rsvpMomentum = useMemo(
    () => (manifest && guestCounts
      ? rsvpMomentumFor(manifest, guestCounts.pending, new Date(now))
      : null),
    [manifest, guestCounts, now],
  );

  // ── The first thread — self-checking guided path for brand-new
  //    hosts (≤ 1 site). Step-done booleans derive from data this
  //    page already holds; the card itself stays presentational.
  //    'pl-first-thread-done' is the woven-state Dismiss persist. ─
  const [firstThreadDismissed, setFirstThreadDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('pl-first-thread-done') === '1'; } catch { return false; }
  });
  const dismissFirstThread = () => {
    setFirstThreadDismissed(true);
    try { window.localStorage.setItem('pl-first-thread-done', '1'); } catch { /* best-effort */ }
  };
  const firstThreadDone = useMemo(() => {
    const chapters = manifest && Array.isArray(manifest.chapters) ? manifest.chapters : [];
    return {
      site: Boolean(site),
      madeYours: Boolean(
        (manifest?.coverPhoto ?? '').trim()
        || chapters.some((c) => (c?.description ?? '').trim()),
      ),
      invited: (guestCounts?.invited ?? 0) > 0,
      published: Boolean(site?.published) || (manifest ? isManifestPublished(manifest) : false),
      dayArrived: rawDaysUntil != null && rawDaysUntil <= 0,
    };
  }, [site, manifest, guestCounts, rawDaysUntil]);
  // `sites != null` also keeps SSR + first client paint in
  // agreement (server snapshot is null), so the lazy localStorage
  // read above can't hydration-mismatch.
  const showFirstThread = !firstThreadDismissed && sites != null && sites.length <= 1;

  // ── Next milestone (drives the hero callout) ────────────────
  const milestones = useMemo(
    () => buildMilestones({
      stage, eventDate, eventDateShort, daysUntil, guestCounts, cadence, occasion,
    }),
    [stage, eventDate, eventDateShort, daysUntil, guestCounts, cadence, occasion],
  );

  // ── Cockpit-derived values (design-system v2 home) ──────────
  // All real data: the eyebrow is the venue (or occasion), counts
  // come from pearTodos / milestones / guestCounts. No invented
  // numbers (budget/gifts have no backing store — omitted).
  const heroEyebrow = (site?.venue ?? '').trim() || occasion.replace(/-/g, ' ');
  const decisionsCount = pearTodos.length;
  const tasksLeft = milestones.filter(
    (m) => m.status === 'urgent' || m.status === 'next' || m.status === 'upcoming',
  ).length;
  const repliedCount = guestCounts ? guestCounts.yes + guestCounts.no + guestCounts.maybe : 0;
  // Quiet StatStrip (plan rule 3) — replaces the four 100px+ KPI
  // tiles. Zeros collapse into one muted trailing chip; the days
  // chip only renders while there's a countdown to speak of (the
  // hero already owns "Today").
  const statItems: StatStripItem[] = [
    { label: 'Coming', value: guestCounts?.yes ?? 0, tone: 'sage', href: '/dashboard/rsvp' },
    { label: 'Awaiting reply', value: guestCounts?.pending ?? 0, tone: 'peach', href: '/dashboard/rsvp' },
    { label: 'Replied', value: repliedCount, tone: 'gold', href: '/dashboard/rsvp' },
    ...(daysUntil != null && daysUntil > 0 ? [{ label: 'Days to go', value: daysUntil }] : []),
  ];
  const phaseLabel = stage === 'late' ? 'Final stretch' : stage === 'early' ? 'Planning' : 'Mid-planning';
  const phaseNote = daysUntil != null ? (daysUntil === 0 ? 'today' : `${daysUntil} days out`) : undefined;
  const latelyItems: LatelyItem[] = recentActivity.map((g) => {
    const tone: LatelyItem['tone'] = g.status === 'no' || g.status === 'declined' ? 'no' : g.status === 'maybe' ? 'maybe' : 'yes';
    const action = tone === 'no' ? 'declined' : tone === 'maybe' ? 'said maybe' : g.plusOneName ? `said yes — +1 ${g.plusOneName}` : 'said yes';
    return { name: g.name, action, when: relativeTime(g.respondedAt), tone };
  });

  // Themed mini-preview of the live site — resolve the site's own
  // --t-* bag (the same chain ThemedSite uses) so the card paints in
  // the couple's theme, not the dashboard chrome.
  const sitePreview = useMemo(() => {
    const m = (site?.manifest ?? null) as { themeId?: string; themeVars?: Record<string, string> } | null;
    const theme = getTheme(m?.themeId);
    return { name: theme.name, rootStyle: themeRootStyle(theme, 'comfortable', m?.themeVars ?? null) };
  }, [site?.manifest]);
  const venueLabel = ((site?.manifest as { logistics?: { venue?: string } } | null)?.logistics?.venue) ?? null;
  const previewEyebrow = occasion === 'memorial' || occasion === 'funeral' ? 'In loving memory' : 'Save the date';

  // Stage-contextual quick jumps — real routes, glow on the moment's
  // primary, dim what isn't open yet.
  const quickJumps: QuickJump[] = useMemo(() => {
    const editor: QuickJump = { label: 'Open the editor', sub: 'Shape your site', icon: 'brush', href: editorHref };
    const studio: QuickJump = { label: 'Studio', sub: 'Save-the-dates & invites', icon: 'mail', href: '/dashboard/invite' };
    if (stage === 'early') {
      return [
        editor,
        { label: 'Build the guest list', sub: 'Add or import guests', icon: 'users', href: '/dashboard/rsvp' },
        studio,
        { label: 'Day-of room', sub: 'Opens closer to the day', icon: 'clock', href: '/dashboard/day-of', dim: true },
      ];
    }
    if (stage === 'late') {
      return [
        { label: 'Day-of room', sub: 'Open now — timeline & vendors', icon: 'clock', href: '/dashboard/day-of', glow: true },
        { label: 'Guests', sub: guestCounts ? `${guestCounts.pending} still pending` : 'Track replies', icon: 'users', href: '/dashboard/rsvp' },
        editor,
        studio,
      ];
    }
    return [
      editor,
      { label: 'Guests', sub: guestCounts ? `${guestCounts.yes} coming · ${guestCounts.pending} pending` : 'Track replies', icon: 'users', href: '/dashboard/rsvp' },
      studio,
      { label: 'View live site', sub: 'See what guests see', icon: 'eye', href: liveHref },
    ];
  }, [stage, editorHref, liveHref, guestCounts]);

  return (
    <DashLayout active="home" hideTopbar>
      <div style={{ padding: '20px clamp(20px, 4vw, 40px) 4px', maxWidth: 1240, margin: '0 auto' }}>
        {/* Quiet header (plan rule 1): greeting is one mono line +
            the date; the stage blurb paragraph is gone — the hero
            and the decision queue carry the state. */}
        <PageIntro
          eyebrow={`${greeting}, ${firstName}`}
          title="Your loom, at a glance."
          meta={eventDateShort ? (
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{eventDateShort}{daysUntil != null && daysUntil > 0 ? ` · ${daysUntil} days out` : ''}</span>
          ) : undefined}
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Pending co-host invitations addressed to this signed-in
          user — accept right here, no inbox dig required. */}
      <CoHostInviteBanner />

      <div
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 32px',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <CountdownHero
          names={namesArr}
          eyebrow={heroEyebrow}
          daysUntil={daysUntil}
          dateLabel={eventDateLabel}
          decisions={decisionsCount}
          tasksLeft={tasksLeft}
          liveHref={liveHref}
          editorHref={editorHref}
          // Memorials aren't pitched budget/vendor planning — omit
          // the "Ask Pear to plan" action when the Director doesn't
          // apply to the occasion (cockpit handles a missing askHref).
          askHref={isDashSurfaceApplicable('director', occasion) ? '/dashboard/director' : undefined}
          coverPhoto={(manifest?.coverPhoto ?? '').trim() || site?.coverPhoto || null}
          occasion={occasion}
        />

        <StatStrip items={statItems} />

        {/* Two-column work zone — same shape as the design.
            Stacks below 920px so phones get a single column.
            INLINE grid, not styled-jsx: the runtime style injection
            occasionally raced inside ShellPersistentLayout and the
            class resolved to nothing — every card stacked. Inline
            styles can't race; responsiveness rides useIsMobile, the
            same pattern HeroBand documents above. */}
        <div
          style={{
            display: 'grid',
            // Plan rule 7: content column + quiet ~320px rail. On
            // phones the rail column simply stacks BELOW the main
            // column — never above.
            gridTemplateColumns: workZoneNarrow ? '1fr' : 'minmax(0, 1fr) 320px',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* The first thread — brand-new hosts only. Steps check
                themselves off from the same data the cockpit reads. */}
            {showFirstThread && (
              <FirstThreadCard
                done={firstThreadDone}
                siteSlug={site?.domain ?? null}
                solemn={getEventType(occasion)?.voice === 'solemn'}
                onDismiss={dismissFirstThread}
              />
            )}
            {/* Sparse activity (<3 items) folds into the decision
                queue as a footer list — a full-width Lately card
                holding one line was dead paper (plan-2 §2 home). */}
            <NeedsYouNow
              rows={pearTodos}
              phaseLabel={phaseLabel}
              phaseNote={phaseNote}
              lately={latelyItems.length > 0 && latelyItems.length < 3 ? latelyItems : undefined}
            />
            {/* Quick jumps ride BELOW the decision queue (plan-2 §1-G)
                so the first decision card lands inside viewport 1 on
                phones instead of a wall of nav tiles. */}
            <QuickJumps jumps={quickJumps} />
            {latelyItems.length >= 3 && <Lately items={latelyItems} />}
            {/* Plan-2 §1-A: the roadmap + sibling suggestions live in
                the MAIN column (they're list-heavy), and the long-view
                timeline closes the column at content width — the rail
                keeps only the glanceable cards, so the two columns
                bottom out together instead of leaving ~950px of empty
                paper beside the rail. */}
            <Milestones milestones={milestones} dateShort={eventDateShort} />
            <SiblingEventsCard occasion={occasion} sites={sites ?? []} origin={site ?? null} />
          </div>
          <div
            ref={setRailEl}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              // Sticky rail (plan-2 §1-A #4) — a short rail rides along
              // instead of leaving dead paper as the main column grows.
              ...(workZoneNarrow || !railFits ? {} : { position: 'sticky' as const, top: 16 }),
            }}
          >
            {site?.domain && (
              <HomeSitePreview
                names={namesArr}
                dateLabel={eventDateShort}
                locationLabel={venueLabel}
                themeName={sitePreview.name}
                rootStyle={sitePreview.rootStyle}
                eyebrow={previewEyebrow}
                liveHref={liveHref}
                editorHref={editorHref}
                themeHref="/store"
              />
            )}
            <ResumeDraftCard />
            {/* Budget — host-entered, planning surface. Hidden for
                solemn occasions and after the event has passed. */}
            {occasion !== 'memorial' && occasion !== 'funeral' && !(rawDaysUntil != null && rawDaysUntil < 0) && site?.id && (
              <BudgetBreakdown lines={budget} onSave={saveBudget} />
            )}
            {rawDaysUntil != null && rawDaysUntil < 0 && site?.domain && (
              <RememberingCard domain={site.domain} occasion={occasion} daysSince={-rawDaysUntil} />
            )}
            {/* The anniversary window — roughly 320–430 days after a
                couple-arc event, offer the anniversary edition: a new
                sibling site woven into the same celebration, carrying
                the rebroadcast + a year of photographs. */}
            {rawDaysUntil != null
              && rawDaysUntil <= -320
              && rawDaysUntil >= -430
              && (occasion === 'wedding' || occasion === 'vow-renewal' || occasion === 'anniversary')
              && !(sites ?? []).some((s) => s.occasion === 'anniversary' && s.domain !== site?.domain)
              && site?.domain && (
              <AnniversaryCard daysSince={-rawDaysUntil} origin={site} />
            )}
            {/* One urgent task could shout four times (hero NEXT UP,
                this card, a Pear todo, a milestone row). When the
                golden thread already names the nudge, the momentum
                card stands down. */}
            {rsvpMomentum && nextStep?.id !== 'nudge' && <RsvpMomentumCard momentum={rsvpMomentum} />}
            <GuestPulse counts={guestCounts} domain={site?.domain ?? null} loading={guests === null} />
          </div>
          {/* The long view closes the page at CONTENT width — a grid
              child pinned to column 1 (plan-2 §1-A #2: "gridColumn: 1
              width, not full-bleed"), so it rides below whichever
              column runs longer instead of stretching under the rail. */}
          <div style={workZoneNarrow ? undefined : { gridColumn: 1 }}>
            <TheLongView dateShort={eventDateShort} solemn={occasion === 'memorial' || occasion === 'funeral'} />
          </div>
        </div>
      </div>

    </DashLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// RsvpMomentumCard — pending replies + reply-by inside 7 days.
// The CTA deep-links to /dashboard/rsvp, where the existing
// NudgeStrip opens the Pear-drafted NudgeComposer — we never
// rebuild the composer here.
// ─────────────────────────────────────────────────────────────
function RsvpMomentumCard({ momentum }: { momentum: RsvpMomentum }) {
  const dateLabel = momentum.replyBy.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const windowLine = momentum.daysLeft === 0 ? 'Reply-by is today.'
    : momentum.daysLeft === 1 ? 'Reply-by lands tomorrow.'
    : `Reply-by lands in ${momentum.daysLeft} days.`;
  return (
    <div
      className="card"
      style={{
        padding: 20,
        borderRadius: 16,
        background: 'var(--peach-bg)',
        border: '1px solid color-mix(in oklab, var(--peach-ink, #C6703D) 28%, transparent)',
      }}
    >
      <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)' }} className="pulse-dot" />
        RSVP MOMENTUM
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--peach-ink)',
          lineHeight: 1.15,
        }}
      >
        {momentum.pending} still pending — reply-by {dateLabel}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--peach-ink)', opacity: 0.85, marginTop: 4 }}>
        {windowLine} Pear has a gentle reminder drafted.
      </div>
      <Link
        href="/dashboard/rsvp"
        className="btn btn-primary btn-sm"
        style={{ textDecoration: 'none', marginTop: 12, display: 'inline-flex' }}
      >
        Nudge them with Pear <Icon name="sparkles" size={11} color="var(--cream)" />
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PearRecommendations — Pear's 3 "worth your minute" todos
// ─────────────────────────────────────────────────────────────
interface PearTodo {
  title: string;
  sub: string;
  cta: string;
  href: string;
  urgency: 'now' | 'soon' | 'later';
}

function usePearTodos({
  stage, insights, guestCounts, daysUntil, suppressNudge = false,
}: {
  stage: Stage;
  insights: GuestInsight[] | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  daysUntil: number | null;
  /** The hero's golden-thread card already names the pending-RSVP
   *  nudge — skip the todo that would repeat it. */
  suppressNudge?: boolean;
}): PearTodo[] {
  return useMemo(() => {
    const out: PearTodo[] = [];

    // 1) Insight-driven todos take precedence — Pear flagged these.
    const ordered = insights ? [...insights].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)) : [];
    for (const ins of ordered.slice(0, 2)) {
      out.push({
        title: ins.title,
        sub: ins.detail,
        cta: ins.action?.label ?? 'Review',
        href: '/dashboard/guest-review',
        urgency: ins.severity === 'urgent' ? 'now' : ins.severity === 'attention' ? 'soon' : 'later',
      });
    }

    // 2) Stage-specific suggestions to fill the rest.
    if (stage === 'early') {
      if (out.length < 3) out.push({
        title: 'Build your guest list',
        sub: 'Pear can suggest one from your story, or import contacts.',
        cta: 'Start with Pear',
        href: '/dashboard/rsvp',
        urgency: 'now',
      });
      if (out.length < 3) out.push({
        title: 'Pick a save-the-date',
        sub: 'Three styles ready to try in the studio.',
        cta: 'Preview',
        href: '/dashboard/invite',
        urgency: 'soon',
      });
    } else if (stage === 'late') {
      if (out.length < 3 && !suppressNudge && guestCounts && guestCounts.pending > 0) out.push({
        title: `Chase ${guestCounts.pending} pending RSVP${guestCounts.pending === 1 ? '' : 's'}`,
        sub: daysUntil != null
          ? `${daysUntil} days until the date. Pear has a final-reminder draft.`
          : 'Pear has a final-reminder draft ready.',
        cta: 'Send for me',
        href: '/dashboard/cadence',
        urgency: 'now',
      });
      if (out.length < 3) out.push({
        title: 'Day-of timeline',
        sub: 'Vendors, run-of-show, and a single source of truth.',
        cta: 'Open Day-of',
        href: '/dashboard/day-of',
        urgency: 'soon',
      });
    } else {
      if (out.length < 3 && !suppressNudge && guestCounts && guestCounts.pending > 0) out.push({
        title: `Send a reminder cadence`,
        sub: `${guestCounts.pending} guest${guestCounts.pending === 1 ? '' : 's'} haven't replied yet.`,
        cta: 'Review draft',
        href: '/dashboard/cadence',
        urgency: 'soon',
      });
      if (out.length < 3) out.push({
        title: 'Confirm the schedule',
        sub: 'Welcome dinner, ceremony, reception — all on one page.',
        cta: 'Open Schedule',
        href: '/editor',
        urgency: 'soon',
      });
    }
    return out.slice(0, 3);
  }, [stage, insights, guestCounts, daysUntil, suppressNudge]);
}

function severityRank(s: GuestInsight['severity']): number {
  return s === 'urgent' ? 0 : s === 'attention' ? 1 : 2;
}

// ─────────────────────────────────────────────────────────────
// GuestPulse — % responded + stacked yes/no/maybe/pending bar
// ─────────────────────────────────────────────────────────────
function GuestPulse({
  counts, domain, loading,
}: {
  counts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  domain: string | null;
  loading: boolean;
}) {
  void domain;
  // Legend columns follow the CARD's width, not the window's — the
  // card lives in the 320px rail at desktop where a 4-up legend
  // squeezed "PENDING" past its column (plan-2 §1-B). @container
  // rules in pearloom.css (.pl8-home-pulse / .pl8-pulse-legend).
  if (loading) {
    return (
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <SectionHeader icon="users">Guests</SectionHeader>
        <div style={{ paddingTop: 14 }}>
          <DashSkeleton kind="list" count={2} label="Threading your guest counts" />
        </div>
      </div>
    );
  }
  if (!counts || counts.invited === 0) {
    return (
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <SectionHeader icon="users">Guests</SectionHeader>
        <div
          style={{
            padding: '20px 8px',
            background: 'var(--cream-2)',
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>Nothing yet. Begin a thread.</div>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--ink-soft)',
              marginBottom: 14,
              maxWidth: 240,
              marginInline: 'auto',
            }}
          >
            Pear can draft a list from your story, or import from your contacts.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/rsvp" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Start with Pear <Icon name="sparkles" size={11} color="var(--cream)" />
            </Link>
            <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
              Import contacts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { invited, yes, no, maybe, pending } = counts;
  const respondedPct = invited === 0 ? 0 : Math.round(((yes + no + maybe) / invited) * 100);
  const segs: { val: number; color: string; label: string }[] = [
    { val: yes,     color: 'var(--sage)',       label: 'Yes' },
    { val: no,      color: 'var(--ink-muted)',  label: 'No' },
    { val: maybe,   color: 'var(--lavender-2)', label: 'Maybe' },
    { val: pending, color: 'var(--cream-3)',    label: 'Pending' },
  ];

  return (
    <div className="card pl8-home-pulse" style={{ padding: 20, borderRadius: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="users" size={15} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Guests</span>
        </div>
        <Link
          href="/dashboard/rsvp"
          style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}
        >
          Open Guests
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, lineHeight: 1 }}>
          {respondedPct}<span style={{ fontSize: 18, color: 'var(--ink-muted)' }}>%</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          responded · {yes + no + maybe} of {invited}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          marginTop: 12,
          marginBottom: 12,
          background: 'var(--cream-2)',
        }}
      >
        {segs.map((s) => s.val > 0 && (
          <div
            key={s.label}
            style={{ flex: s.val, background: s.color, transition: 'flex var(--pl-dur-base) var(--pl-ease-out)' }}
            title={`${s.label}: ${s.val}`}
          />
        ))}
      </div>

      <div className="pl8-pulse-legend">
        {segs.map((s) => (
          <div key={s.label} style={{ padding: '8px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
              <span
                style={{
                  fontSize: 10.5, color: 'var(--ink-muted)',
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {s.label}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Milestones — vertical roadmap
// ─────────────────────────────────────────────────────────────
type MilestoneStatus = 'done' | 'urgent' | 'next' | 'upcoming' | 'distant';
interface Milestone {
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

function buildMilestones({
  stage, eventDate, eventDateShort, daysUntil, guestCounts, cadence, occasion,
}: {
  stage: Stage;
  eventDate: Date | null;
  eventDateShort: string | null;
  daysUntil: number | null;
  guestCounts: { invited: number; yes: number; no: number; maybe: number; pending: number } | null;
  cadence?: CadencePhaseLite[] | null;
  /** Drives the milestone family — see milestoneFamilyFor. */
  occasion: string;
}): Milestone[] {
  const family = milestoneFamilyFor(occasion);
  const dayLabel =
    family === 'couple' ? 'The big day'
    : family === 'trip' ? 'The weekend itself'
    : 'The day itself';
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

function Milestones({ milestones, dateShort }: { milestones: Milestone[]; dateShort: string | null }) {
  // Container-sized rows (plan-2 §1-B): the card renders the wide
  // 4-column row (annotation in a trailing column) only when the
  // CARD itself has room — not when the window does. In a narrow
  // container (the 320px rail, a phone column) the annotation drops
  // onto its own muted line under the title and the date gutter
  // tightens. CSS @container rules live in pearloom.css
  // (.pl8-home-milestones / .pl8-milestone-row).
  return (
    <div className="card pl8-home-milestones" style={{ padding: 20, borderRadius: 20 }}>
      <SectionHeader icon="calendar">
        {dateShort ? <>The road to {dateShort}</> : 'Your timeline'}
      </SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1;
          const dot = milestoneDotStyle(m.status);
          return (
            <div
              key={i}
              className="pl8-milestone-row"
              style={{
                padding: '12px 0',
                borderBottom: !isLast ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color:
                    m.status === 'urgent' ? 'var(--peach-ink)' :
                    m.status === 'done' ? 'var(--sage-deep)' : 'var(--ink-muted)',
                  textTransform: m.status === 'done' || m.status === 'urgent' ? 'uppercase' : 'none',
                  letterSpacing: m.status === 'done' || m.status === 'urgent' ? '0.05em' : 0,
                }}
              >
                {m.date}
              </div>
              <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 22 }}>
                <span
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: dot.bg, border: `2px solid ${dot.border}`,
                    display: 'grid', placeItems: 'center',
                  }}
                  className={dot.pulse ? 'pulse-dot' : ''}
                >
                  {dot.check && <Icon name="check" size={8} color="var(--card, #FBF7EE)" strokeWidth={3} />}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--ink)',
                    fontWeight: m.status === 'urgent' || m.status === 'next' ? 600 : 500,
                    textDecoration: m.status === 'done' ? 'line-through' : 'none',
                    opacity: m.status === 'done' ? 0.7 : 1,
                  }}
                >
                  {m.label}
                </div>
                {m.sub && (
                  <div className="pl8-milestone-sub-inline" style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{m.sub}</div>
                )}
              </div>
              <div className="pl8-milestone-sub-col" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{m.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function milestoneDotStyle(status: MilestoneStatus): { bg: string; border: string; check: boolean; pulse: boolean } {
  if (status === 'done')    return { bg: 'var(--sage)',       border: 'var(--sage)',       check: true,  pulse: false };
  if (status === 'urgent')  return { bg: 'var(--peach-ink)',  border: 'var(--peach-ink)',  check: false, pulse: true  };
  if (status === 'next')    return { bg: 'var(--card)',       border: 'var(--ink)',        check: false, pulse: false };
  if (status === 'distant') return { bg: 'var(--ink)',        border: 'var(--ink)',        check: false, pulse: false };
  return                          { bg: 'var(--card)',       border: 'var(--ink-muted)',  check: false, pulse: false };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ResumeDraftCard — the way back into a half-finished wizard run.
//
// The wizard auto-persists its state to localStorage on every
// change ('Save draft' was already honest), but nothing on the
// dashboard ever said so — a host who stepped away had to KNOW
// /wizard/new resumes. This card reads the draft client-side and
// names what's in it. Renders nothing without a meaningful draft.
// ─────────────────────────────────────────────────────────────
function ResumeDraftCard() {
  /* Read after mount via a 0ms timer — SSR + first client paint
     agree (no card), then the draft pops in. The timer keeps the
     compiler's setState-in-effect rule happy and avoids the
     hydration mismatch a lazy localStorage initializer causes. */
  const [draft, setDraft] = useState<{ occasion?: string; names?: [string, string] } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('pl-wizard-state-v1');
        if (!raw) return;
        const parsed = JSON.parse(raw) as { occasion?: string; names?: [string, string] };
        if (parsed && (parsed.occasion || parsed.names?.[0])) setDraft(parsed);
      } catch { /* no draft is fine */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  if (!draft) return null;
  const who = (draft.names ?? []).filter(Boolean).join(' & ');
  const what = draft.occasion ? draft.occasion.replace(/-/g, ' ') : 'celebration';
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px dashed var(--pl-olive, #5C6B3F)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '16px 18px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)', marginBottom: 6 }}>
        A thread in progress
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
        Your {what}{who ? ` for ${who}` : ''} is saved right where you left it.
      </div>
      <Link
        href="/wizard/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 999, textDecoration: 'none',
          background: 'var(--pl-olive, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
          fontSize: 12.5, fontWeight: 700,
        }}
      >
        Pick the thread back up →
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// RememberingCard — the third act, surfaced.
//
// The Remember loop already runs server-side (day-after recap
// email, anniversary rebroadcast cron, /sites/{slug}/recap built
// from guest photos + guestbook + RSVP notes) — but the dashboard
// never told the host any of it existed. Once the date passes,
// this card leads the right column. Every link is a real surface.
// ─────────────────────────────────────────────────────────────
function RememberingCard({ domain, occasion, daysSince }: { domain: string; occasion: string; daysSince: number }) {
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  const recapHref = `/sites/${domain}/recap`;
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--gold-line, #D0B070)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '18px 18px 14px',
      }}
    >
      <SectionHeader icon="bookmark">{solemn ? 'The remembering' : 'The remembering begins'}</SectionHeader>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '-6px 0 12px' }}>
        {daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`} — and the memory book is already weaving
        itself from your guests&rsquo; photos, signatures, and notes. It grows as more arrives.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href={recapHref}
          style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '9px 12px', borderRadius: 12,
            border: '1px solid var(--gold-line, #D0B070)', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Open the memory book</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>share it with everyone who was there</span>
          <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--gold, #C19A4B)', fontSize: 13 }}>→</span>
        </Link>
        <Link
          href="/dashboard/memory-book"
          style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '9px 12px', borderRadius: 12,
            border: '1px dashed var(--line)', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Print the keepsake</span>
          <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--pl-olive, #5C6B3F)', fontSize: 13 }}>→</span>
        </Link>
        {!solemn && (
          <Link
            href="/dashboard/rsvp"
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '9px 12px', borderRadius: 12,
              border: '1px dashed var(--line)', textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Send the thank-yous</span>
            <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--pl-olive, #5C6B3F)', fontSize: 13 }}>→</span>
          </Link>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// AnniversaryCard — one year, woven.
//
// The anniversary occasion + the rebroadcast existed, but nothing
// ever NUDGED a host toward them — a feature with no entry point.
// Around the first anniversary this card offers to begin the
// anniversary edition as a sibling site (same celebration id via
// the wizard's ?from= linkage), so both sites cross-reference.
// ─────────────────────────────────────────────────────────────
function AnniversaryCard({
  daysSince,
  origin,
}: {
  daysSince: number;
  origin: { domain?: string; names?: [string, string] | null; manifest?: unknown };
}) {
  const daysToAnniversary = 365 - daysSince;
  const when =
    daysToAnniversary > 1 ? `${daysToAnniversary} days from now`
    : daysToAnniversary === 1 ? 'tomorrow'
    : daysToAnniversary === 0 ? 'today'
    : `${-daysToAnniversary} days ago`;
  const originCeleb = (origin.manifest as { celebration?: { id?: string; name?: string } } | undefined)?.celebration;
  const celebName = originCeleb?.name
    ?? (origin.names ?? []).filter(Boolean).join(' & ')
    ?? '';
  const linkParams = origin.domain
    ? `&from=${encodeURIComponent(origin.domain)}`
      + (originCeleb?.id ? `&cid=${encodeURIComponent(originCeleb.id)}` : '')
      + (celebName ? `&cname=${encodeURIComponent(celebName)}` : '')
    : '';
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--gold-line, #D0B070)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '18px 18px 14px',
      }}
    >
      <SectionHeader icon="sparkles">One year, woven</SectionHeader>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '-6px 0 12px' }}>
        Your first anniversary is {when}. Pear can weave an anniversary edition —
        the rebroadcast, a year of photographs, the story one chapter longer.
      </p>
      <Link
        href={`/wizard/new?occasion=anniversary${linkParams}`}
        style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '9px 12px', borderRadius: 12,
          border: '1px solid var(--gold-line, #D0B070)', textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Begin the anniversary edition</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>woven into the same celebration</span>
        <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--gold, #C19A4B)', fontSize: 13 }}>→</span>
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SiblingEventsCard — the rest of the weekend.
//
// A wedding is 3-4 Pearloom sites, not one (rehearsal dinner,
// bachelor/ette, welcome party, brunch) — each often hosted by a
// different person. manifest.celebration + the siblings API have
// existed for a while, but nothing SUGGESTED the adjacent events,
// so the multi-site funnel sat unwired. This card offers the
// sibling occasions the host doesn't have a site for yet; each
// deep-links the wizard with ?occasion= prefilled.
// ─────────────────────────────────────────────────────────────
/* Weekend-anchor occasions (wedding, quinceañera, bar/bat mitzvah,
   big birthdays, reunions…) derive their suggestions from the same
   arc catalog the Weekend Builder uses — one source, every
   occasion. This hand list only covers occasions that AREN'T
   anchors but still have obvious next threads. */
const SIBLING_EVENTS: Record<string, Array<{ occasion: string; label: string; blurb: string }>> = {
  engagement: [
    { occasion: 'wedding', label: 'The wedding itself', blurb: 'When you’re ready — same names, new thread.' },
    { occasion: 'bridal-shower', label: 'Bridal shower', blurb: 'Often someone else hosts — send them here.' },
  ],
};

function SiblingEventsCard({
  occasion,
  sites,
  origin,
}: {
  occasion: string;
  sites: Array<{ occasion?: string }>;
  origin: { domain?: string; names?: [string, string] | null; manifest?: unknown } | null;
}) {
  const have = new Set(sites.map((s) => s.occasion).filter(Boolean));
  const arc = WEEKEND_ANCHORS.find((a) => a.id === occasion);
  const suggestions = arc
    ? arc.events
        .filter((e) => e.sluffix !== '' && !have.has(e.kind))
        .sort((a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false))
        .map((e) => ({ occasion: e.kind, label: e.label, blurb: e.description }))
        .slice(0, 3)
    : (SIBLING_EVENTS[occasion] ?? []).filter((e) => !have.has(e.occasion)).slice(0, 3);
  /* Celebration linkage — the new site should arrive already woven
     into THIS celebration: same celebration id (reuse the origin's
     if it has one), shared name, and the LinkedEventsStrip lights
     up on both sites the moment the sibling presses. */
  const originCeleb = (origin?.manifest as { celebration?: { id?: string; name?: string } } | undefined)?.celebration;
  const celebName = originCeleb?.name
    ?? (origin?.names ?? []).filter(Boolean).join(' & ')
    ?? '';
  const linkParams = origin?.domain
    ? `&from=${encodeURIComponent(origin.domain)}`
      + (originCeleb?.id ? `&cid=${encodeURIComponent(originCeleb.id)}` : '')
      + (celebName ? `&cname=${encodeURIComponent(celebName)}` : '')
    : '';
  if (suggestions.length === 0) return null;
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--r-md, 20px)',
        padding: '18px 18px 14px',
      }}
    >
      <SectionHeader icon="sparkles">Around your day</SectionHeader>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '-6px 0 12px' }}>
        Most celebrations are a weekend, not a day. Each of these can be its own site —
        woven to match, with its own guest list.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((e) => (
          <Link
            key={e.occasion}
            href={`/wizard/new?occasion=${encodeURIComponent(e.occasion)}${linkParams}`}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '9px 12px', borderRadius: 12,
              border: '1px dashed var(--line)', textDecoration: 'none',
            }}
          >
            {/* Label may wrap; the blurb owns the leftover width and
                ellipsizes — nowrap-on-both overprinted in narrow
                columns (plan-2 §1-B). */}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', flexShrink: 0, maxWidth: '60%' }}>{e.label}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.blurb}</span>
            <span aria-hidden style={{ color: 'var(--pl-olive, #5C6B3F)', fontSize: 13 }}>→</span>
          </Link>
        ))}
      </div>
      {/* Belt-and-braces: /dashboard/weekend advertises itself only
          where isDashSurfaceApplicable('weekend') agrees — never
          route a host to a page that would turn them away. */}
      {arc && isDashSurfaceApplicable('weekend', occasion) && (
        <Link
          href="/dashboard/weekend"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
            fontSize: 12, fontWeight: 600, color: 'var(--peach-ink)', textDecoration: 'none',
          }}
        >
          Planning several at once? Open the Weekend builder <span aria-hidden>→</span>
        </Link>
      )}
    </section>
  );
}

function SectionHeader({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--gold)" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{children}</span>
      </div>
    </div>
  );
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// CoHostInviteBanner — the invitee side of co-hosting. When the
// signed-in user has pending co-host invitations addressed to
// their email, a warm banner offers one-tap accept (no inbox dig).
// Reads /api/co-host/invitations; accepts via POST /api/sites/
// co-host { acceptToken }; on success routes into the editor.
// Renders nothing when there are no invitations.
// ─────────────────────────────────────────────────────────────
interface PendingInvite {
  token: string;
  role: string;
  roleLabel: string;
  invitedBy: string;
  note: string | null;
  siteName: string;
  siteSlug: string | null;
  occasion: string | null;
}

function CoHostInviteBanner() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/co-host/invitations', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { invitations?: PendingInvite[] } | null) => {
        if (!cancelled && d?.invitations) setInvites(d.invitations);
      })
      .catch(() => { /* banner is best-effort */ });
    return () => { cancelled = true; };
  }, []);

  async function accept(inv: PendingInvite) {
    if (busyToken) return;
    setBusyToken(inv.token);
    setError(null);
    try {
      const res = await fetch('/api/sites/co-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptToken: inv.token }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || d.ok === false) throw new Error(d.error ?? `Failed (${res.status})`);
      // Into the site they just joined — or the dashboard if no slug.
      if (inv.siteSlug) router.push(`/editor/${encodeURIComponent(inv.siteSlug)}`);
      else setInvites((xs) => xs.filter((x) => x.token !== inv.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept the invite.');
    } finally {
      setBusyToken(null);
    }
  }

  const visible = invites.filter((i) => !dismissed.has(i.token));
  if (visible.length === 0) return null;

  return (
    <div style={{ padding: '6px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
      {visible.map((inv) => {
        const inviter = inv.invitedBy ? inv.invitedBy.split('@')[0] : 'A host';
        const busy = busyToken === inv.token;
        return (
          <div
            key={inv.token}
            role="status"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              padding: '14px 18px',
              marginBottom: 12,
              borderRadius: 16,
              overflow: 'hidden',
              background: 'linear-gradient(120deg, var(--peach-bg, #FBE8D6) 0%, var(--lavender-bg, rgba(232,224,240,0.7)) 100%)',
              border: '1px solid rgba(198,112,61,0.30)',
              animation: 'pl-enter-fade-in 260ms ease both',
            }}
          >
            {/* two-strand thread along the leading edge — the brand atom */}
            <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(var(--sage-deep, #5C6B3F), var(--gold, #C19A4B))' }} />
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 38, height: 38, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                background: 'var(--peach-ink, #C6703D)', color: '#fff',
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 18,
              }}
            >
              ✦
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)' }}>
                You&rsquo;re invited to co-host
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink, #0E0D0B)', marginTop: 2, lineHeight: 1.4 }}>
                <strong style={{ fontWeight: 700 }}>{inviter}</strong> invited you to{' '}
                <span style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic' }}>{inv.siteName}</span>{' '}
                as <strong style={{ fontWeight: 700 }}>{inv.roleLabel}</strong>.
              </div>
              {error && busyToken === null && (
                <div role="alert" style={{ fontSize: 11.5, color: 'var(--pl-plum, #7A2D2D)', marginTop: 4 }}>{error}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setDismissed((s) => new Set(s).add(inv.token))}
                style={{
                  padding: '8px 12px', borderRadius: 999, border: 'none', background: 'transparent',
                  color: 'var(--ink-soft, #3A332C)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => accept(inv)}
                disabled={busy}
                style={{
                  padding: '8px 18px', borderRadius: 999, border: 'none',
                  background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #F5EFE2)',
                  fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? 'Joining…' : 'Accept & open'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
