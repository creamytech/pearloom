'use client';

// ─────────────────────────────────────────────────────────────
// WelcomeHome — the dashboard home (the editorial "cockpit").
//
// Top to bottom (the cockpit pieces all live in cockpit.tsx):
//
//   1. CockpitGreeting — letterpress greeting header
//   2. HeroBanner      — photographic countdown banner (live d/h/m/s,
//                        real coverPhoto or a warm gradient placeholder)
//   3. ProgressCard + QuickActions
//   4. RoadCard (milestone timeline) + ChecklistCard + HomeSitePreview
//   *  NeedsYouNow decision queue + the conditional planning rail
//      (budget, RSVP momentum, remembering / anniversary)
//   5. GuestSummaryCard (RSVP donut) + MemoryCard
//   6. WeekendCard (real sibling events + occasions to weave)
//   7. TheLongView + CockpitBlessing
//   + edge cards (co-host invites, resume-draft)
//
// Data flow (unchanged — only the layout was restructured):
//   - useSelectedSite() drives the active site + sibling sites
//   - GET /api/guests?site= drives the counts + donut + lately
//   - GET /api/guests/intelligence drives Pear's decision queue
//   - GET /api/cadence?site= drives the milestone roadmap
//   - Stage (early | mid | late) derives from daysUntil — under 30
//     days is "late", over 180 "early", in between "mid".
//
// The cockpit pieces are prop-driven (cockpit.tsx) and verified in
// the /dev/dashboard harness; this file feeds them real data only —
// no invented numbers. Absent data renders a graceful empty state.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashLayout } from '../dash/DashShell';
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
import {
  CockpitGreeting, HeroBanner, ProgressCard, QuickActions, RoadCard, ChecklistCard,
  GuestSummaryCard, MemoryCard, WeekendCard, NeedsYouNow, Lately, TheLongView,
  HomeSitePreview, BudgetBreakdown, CockpitBlessing,
  type LatelyItem, type BudgetLine, type QuickActionItem, type RoadMilestone,
  type ChecklistItem, type WeekendEventItem, type WeekendAdd,
} from '@/components/pearloom/dash/cockpit';
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
  /* Hero stacks to one column below 760px (matches the design's
     collapse point). Inline grid + useIsMobile, never a media query
     — the runtime style injection can race inside the persistent
     shell, so the grid decisions ride JS like the work zone. */
  const heroNarrow = useIsMobile(760);
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

  // ── Cockpit-derived values (editorial cockpit home) ─────────
  // Every figure is real: progress + road come from the milestone
  // ladder, quick actions are real routes, guest numbers from the
  // /api/guests fetch, memory tiles from the manifest gallery. No
  // invented counts on the real Home.
  const solemn = occasion === 'memorial' || occasion === 'funeral';

  // Planning progress — done / in-progress / to-do off the ladder.
  const progress = useMemo(() => {
    const total = milestones.length || 1;
    const done = milestones.filter((m) => m.status === 'done').length;
    const prog = milestones.filter((m) => m.status === 'urgent' || m.status === 'next').length;
    const todo = milestones.filter((m) => m.status === 'upcoming' || m.status === 'distant').length;
    return { done, prog, todo, pct: Math.round((done / total) * 100) };
  }, [milestones]);

  // The road — map the ladder onto the RoadCard's done/now/next/end.
  // The first still-open actionable rung becomes the "now" highlight.
  const roadMilestones = useMemo<RoadMilestone[]>(() => {
    let nowUsed = false;
    return milestones.map((m) => {
      let state: RoadMilestone['state'];
      if (m.status === 'done') state = 'done';
      else if (m.status === 'distant') state = 'end';
      else if (!nowUsed && (m.status === 'urgent' || m.status === 'next')) { state = 'now'; nowUsed = true; }
      else state = 'next';
      const concrete = state === 'now' && !!m.date && !['Now', 'Soon', 'Later', 'This week', 'Done'].includes(m.date);
      return { date: m.date, label: m.label, sub: m.sub, state, tag: concrete ? m.date : undefined };
    });
  }, [milestones]);

  const phaseLabel = stage === 'late' ? 'Final stretch' : stage === 'early' ? 'Planning' : 'Mid-planning';
  const phaseNote = daysUntil != null ? (daysUntil === 0 ? 'today' : `${daysUntil} days out`) : undefined;
  const latelyItems: LatelyItem[] = recentActivity.map((g) => {
    const tone: LatelyItem['tone'] = g.status === 'no' || g.status === 'declined' ? 'no' : g.status === 'maybe' ? 'maybe' : 'yes';
    const action = tone === 'no' ? 'declined' : tone === 'maybe' ? 'said maybe' : g.plusOneName ? `said yes — +1 ${g.plusOneName}` : 'said yes';
    return { name: g.name, action, when: relativeTime(g.respondedAt), tone };
  });

  // Quick actions — four real routes.
  const quickActions: QuickActionItem[] = [
    { icon: 'check', label: 'Add a task', color: 'var(--sage-deep)', href: '/dashboard/day-of' },
    { icon: 'users', label: 'Invite guests', color: 'var(--peach-ink)', href: '/dashboard/rsvp' },
    { icon: 'layout', label: 'Edit site', color: 'var(--lavender-ink)', href: editorHref },
    { icon: 'sparkles', label: 'Studio', color: 'var(--pl-gold)', href: '/dashboard/invite' },
  ];

  // Day-of checklist — a light, occasion-aware prep aid (local check
  // state only; the same "suggested" register as the milestone ladder).
  const checklistItems = useMemo<ChecklistItem[]>(() => (solemn
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
      ]), [solemn]);

  // Memory tiles — the manifest's real gallery (cover as fallback);
  // missing slots become warm gradient tiles inside the card.
  const memoryImages = useMemo<string[]>(() => {
    const m = manifest as { galleryImages?: unknown; coverPhoto?: unknown } | null;
    const gallery = Array.isArray(m?.galleryImages)
      ? (m!.galleryImages as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const cover = typeof m?.coverPhoto === 'string' && m.coverPhoto.trim() ? [m.coverPhoto] : [];
    return [...gallery, ...cover].slice(0, 3);
  }, [manifest]);

  // Themed mini-preview of the live site — resolve the site's own
  // --t-* bag (the same chain ThemedSite uses) so the card paints in
  // the couple's theme, not the dashboard chrome.
  const sitePreview = useMemo(() => {
    const m = (site?.manifest ?? null) as { themeId?: string; themeVars?: Record<string, string> } | null;
    const theme = getTheme(m?.themeId);
    return { name: theme.name, rootStyle: themeRootStyle(theme, 'comfortable', m?.themeVars ?? null) };
  }, [site?.manifest]);
  const venueLabel = ((site?.manifest as { logistics?: { venue?: string } } | null)?.logistics?.venue) ?? null;
  const previewEyebrow = solemn ? 'In loving memory' : 'Save the date';

  // ── The weekend — the host's real sibling sites as event cards,
  //    plus occasion suggestions to weave (deep-linked into the
  //    wizard, celebration-linked). Keeps the old SiblingEvents
  //    multi-site funnel intact inside the new WeekendCard. ──────
  const weekendEvents = useMemo<WeekendEventItem[]>(() => {
    const others = (sites ?? []).filter((s) => s.domain && s.domain !== site?.domain);
    return others.slice(0, 3).map((s) => {
      const label = getEventType(s.occasion ?? '')?.label ?? (s.occasion ?? 'Event').replace(/-/g, ' ');
      const d = parseLocalDate(s.eventDate);
      const day = d
        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
        : label.toUpperCase();
      const who = (s.names ?? []).filter(Boolean).join(' & ');
      const meta = [d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null, s.venue]
        .filter(Boolean).join(' · ') || undefined;
      return { day, title: who || label, meta, color: weekendAccent(s.occasion), href: `/editor/${s.domain}` };
    });
  }, [sites, site?.domain]);

  const weekendAdds = useMemo<WeekendAdd[]>(() => {
    const have = new Set((sites ?? []).map((s) => s.occasion).filter(Boolean));
    const arc = WEEKEND_ANCHORS.find((a) => a.id === occasion);
    const originCeleb = (manifest as { celebration?: { id?: string; name?: string } } | null)?.celebration;
    const celebName = originCeleb?.name ?? namesArr.filter(Boolean).join(' & ') ?? '';
    const linkParams = site?.domain
      ? `&from=${encodeURIComponent(site.domain)}`
        + (originCeleb?.id ? `&cid=${encodeURIComponent(originCeleb.id)}` : '')
        + (celebName ? `&cname=${encodeURIComponent(celebName)}` : '')
      : '';
    const raw = arc
      ? arc.events
          .filter((e) => e.sluffix !== '' && !have.has(e.kind))
          .sort((a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false))
          .map((e) => ({ occasion: e.kind, label: e.label, blurb: e.description }))
          .slice(0, 3)
      : (SIBLING_EVENTS[occasion] ?? []).filter((e) => !have.has(e.occasion)).slice(0, 3);
    return raw.map((e) => ({ label: e.label, blurb: e.blurb, href: `/wizard/new?occasion=${encodeURIComponent(e.occasion)}${linkParams}` }));
  }, [sites, occasion, manifest, namesArr, site?.domain]);

  const weekendApplicable = isDashSurfaceApplicable('weekend', occasion);
  const weekendAddHref = weekendApplicable ? '/dashboard/weekend' : '/wizard/new';
  const weekendManageHref = weekendApplicable && weekendEvents.length > 0 ? '/dashboard/weekend' : undefined;

  // ── Header + footer copy (occasion-aware) ───────────────────
  const factLine = [eventDateShort, (site?.venue ?? '').trim() || null].filter(Boolean).join(' · ');
  const headerSubtitle = (factLine ? `${factLine}. ` : '')
    + 'Everything Pear is holding for you, and the few things that want a moment this week.';
  const headerTitle = solemn ? "You're gathering" : "You're building";
  const headerItalic = solemn ? 'something to remember.' : 'something beautiful.';
  const blessingText = solemn ? 'Held with love and care.' : "You're doing something wonderful.";

  // ── Which conditional cards show (the work-zone rail) ────────
  const postEvent = rawDaysUntil != null && rawDaysUntil < 0;
  const budgetVisible = !solemn && !postEvent && Boolean(site?.id);
  const showMomentum = Boolean(rsvpMomentum) && nextStep?.id !== 'nudge';
  const showRemembering = postEvent && Boolean(site?.domain);
  const showAnniversary = rawDaysUntil != null
    && rawDaysUntil <= -320
    && rawDaysUntil >= -430
    && (occasion === 'wedding' || occasion === 'vow-renewal' || occasion === 'anniversary')
    && !(sites ?? []).some((s) => s.occasion === 'anniversary' && s.domain !== site?.domain)
    && Boolean(site?.domain);
  const railHasContent = budgetVisible || showMomentum || showRemembering || showAnniversary;
  const queueEmpty = pearTodos.length === 0 && latelyItems.length < 3;
  const showWorkZone = !queueEmpty || railHasContent;

  return (
    <DashLayout active="home" hideTopbar>
      {/* 1 · The letterpress greeting header. */}
      <div style={{ padding: '20px clamp(20px, 4vw, 40px) 4px', maxWidth: 1240, margin: '0 auto' }}>
        <CockpitGreeting
          eyebrow={`${greeting}, ${firstName}`}
          title={headerTitle}
          titleItalic={headerItalic}
          subtitle={headerSubtitle}
        />
      </div>

      {/* Pending co-host invitations addressed to this signed-in
          user — accept right here, no inbox dig required. */}
      <CoHostInviteBanner />

      {/* The cockpit — a simple top-to-bottom flow; the 2-col rows
          collapse to one column below 920px via useIsMobile (inline
          grid, never a media query, so the persistent-shell style
          injection can't race it and stack the cards). */}
      <main
        style={{
          padding: '12px clamp(20px, 4vw, 40px) 40px',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* The first thread — brand-new hosts only. Steps check
            themselves off from the same data the cockpit reads. */}
        {showFirstThread && (
          <FirstThreadCard
            done={firstThreadDone}
            siteSlug={site?.domain ?? null}
            solemn={solemn || getEventType(occasion)?.voice === 'solemn'}
            onDismiss={dismissFirstThread}
          />
        )}

        {/* 2 · The photographic countdown banner — real cover photo
            (or a warm gradient placeholder) + a live countdown. */}
        <HeroBanner
          names={namesArr}
          occasion={occasion}
          eventDate={eventDate}
          dateLabel={eventDateLabel}
          venueLabel={(site?.venue ?? '').trim() || null}
          coverPhoto={(manifest?.coverPhoto ?? '').trim() || site?.coverPhoto || null}
          liveHref={liveHref}
          editorHref={editorHref}
          narrow={heroNarrow}
        />

        {/* Resume a half-finished wizard run (self-hides). */}
        <ResumeDraftCard />

        {/* 3 · Planning progress + quick actions. */}
        <div style={{ display: 'grid', gridTemplateColumns: workZoneNarrow ? '1fr' : '1.1fr 1fr', gap: 18, alignItems: 'start' }}>
          <ProgressCard pct={progress.pct} done={progress.done} prog={progress.prog} todo={progress.todo} />
          <QuickActions actions={quickActions} />
        </div>

        {/* 4 · The road (milestone timeline) + a right stack of the
            day-of checklist and the themed site preview. */}
        <div style={{ display: 'grid', gridTemplateColumns: workZoneNarrow ? '1fr' : '1fr 1fr', gap: 18, alignItems: 'start' }}>
          <RoadCard milestones={roadMilestones} dateShort={eventDateShort} href="/dashboard/cadence" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ChecklistCard items={checklistItems} href="/dashboard/day-of" />
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
          </div>
        </div>

        {/* Pear's decision queue + the conditional planning rail
            (budget, RSVP momentum, and the post-event / anniversary
            cards). All still data-wired; the row hides entirely when
            there's nothing to say. */}
        {showWorkZone && (
          <div style={{ display: 'grid', gridTemplateColumns: (workZoneNarrow || queueEmpty) ? '1fr' : '1.25fr 1fr', gap: 18, alignItems: 'start' }}>
            {!queueEmpty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Sparse activity (<3 items) folds into the queue as
                    a footer list; a fuller feed gets its own card. */}
                <NeedsYouNow
                  rows={pearTodos}
                  phaseLabel={phaseLabel}
                  phaseNote={phaseNote}
                  lately={latelyItems.length > 0 && latelyItems.length < 3 ? latelyItems : undefined}
                />
                {latelyItems.length >= 3 && <Lately items={latelyItems} />}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Budget — host-entered, planning surface. Hidden for
                  solemn occasions and after the event has passed. */}
              {budgetVisible && <BudgetBreakdown lines={budget} onSave={saveBudget} />}
              {/* One urgent task could shout twice — when the golden
                  thread already names the nudge, momentum stands down. */}
              {showMomentum && rsvpMomentum && <RsvpMomentumCard momentum={rsvpMomentum} />}
              {showRemembering && site?.domain && (
                <RememberingCard domain={site.domain} occasion={occasion} daysSince={-rawDaysUntil!} />
              )}
              {/* The anniversary window — ~320–430 days after a couple-
                  arc event, offer the anniversary edition as a sibling. */}
              {showAnniversary && site?.domain && (
                <AnniversaryCard daysSince={-rawDaysUntil!} origin={site} />
              )}
            </div>
          </div>
        )}

        {/* 5 · Guest summary (donut) + the memory book. */}
        <div style={{ display: 'grid', gridTemplateColumns: workZoneNarrow ? '1fr' : '1fr 1fr', gap: 18, alignItems: 'start' }}>
          <GuestSummaryCard counts={guestCounts} href="/dashboard/rsvp" />
          <MemoryCard images={memoryImages} href="/dashboard/keepsakes" />
        </div>

        {/* 6 · The weekend — real sibling events + occasions to weave. */}
        <WeekendCard events={weekendEvents} adds={weekendAdds} addHref={weekendAddHref} manageHref={weekendManageHref} />

        {/* 7 · The long view. */}
        <TheLongView dateShort={eventDateShort} solemn={solemn} />

        {/* 8 · The footer blessing. */}
        <CockpitBlessing text={blessingText} />
      </main>
    </DashLayout>
  );
}

// ── weekendAccent — occasion → a card accent color (WeekendCard). ─
function weekendAccent(occasion?: string): string {
  if (occasion === 'memorial' || occasion === 'funeral') return 'var(--lavender-ink)';
  const cat = getEventType(occasion ?? '')?.category;
  if (cat === 'wedding-arc') return 'var(--peach-ink)';
  if (cat === 'milestone') return 'var(--pl-gold)';
  if (cat === 'cultural') return 'var(--lavender-ink)';
  return 'var(--sage-deep)';
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
// buildMilestones — the vertical roadmap ladder (feeds RoadCard +
// the planning-progress counts on the cockpit home)
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
// SIBLING_EVENTS — non-anchor occasions that still have an obvious
// next thread. Weekend-anchor occasions (wedding, quinceañera,
// mitzvahs, big birthdays, reunions…) derive their suggestions from
// the WEEKEND_ANCHORS arc catalog instead — one source. Read by
// WelcomeHome's weekendAdds → the WeekendCard's "weave in" tiles.
// ─────────────────────────────────────────────────────────────
const SIBLING_EVENTS: Record<string, Array<{ occasion: string; label: string; blurb: string }>> = {
  engagement: [
    { occasion: 'wedding', label: 'The wedding itself', blurb: 'When you’re ready — same names, new thread.' },
    { occasion: 'bridal-shower', label: 'Bridal shower', blurb: 'Often someone else hosts — send them here.' },
  ],
};

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
