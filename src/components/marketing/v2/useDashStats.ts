'use client';

// Real data hooks for dashboard widgets.

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseLocalDate } from '@/lib/date-utils';

export interface DashStats {
  visits: number;
  today: number;
  /** Anyone who has set attending to true OR false (not null). */
  rsvps: number;
  /** Full invite list (guests table row count). */
  invited: number;
  /** attending === true */
  yes: number;
  /** attending === false */
  no: number;
  /** attending === null (invited but not yet responded). */
  awaiting: number;
  /** No meal selected yet — counts attending: true guests without meal. */
  needMeal: number;
  /** No song request yet — counts attending: true guests without song. */
  needSong: number;
  registryClicks: number;
  messages: number;
  // Prior 7-day window so we can compute a delta.
  visitsPrior: number;
  rsvpsPrior: number;
  // 7-point daily series for the sparkline.
  series: number[];
  loading: boolean;
  error?: string;
}

// Lightweight 7-day sparkline: we don't have a per-day API yet so
// approximate as (today / 7)-shaped distribution. Good enough for
// the at-a-glance widget; when an aggregated endpoint lands, swap
// the fetch.
function synthSeries(total: number, today: number): number[] {
  if (total === 0) return [0, 0, 0, 0, 0, 0, 0];
  const avg = Math.max(1, Math.round((total - today) / 6));
  return [avg, Math.round(avg * 1.1), Math.round(avg * 1.4), today, Math.round(avg * 1.2), avg, Math.round(avg * 0.85)];
}

const EMPTY_STATS: Omit<DashStats, 'loading' | 'error'> = {
  visits: 0,
  today: 0,
  rsvps: 0,
  invited: 0,
  yes: 0,
  no: 0,
  awaiting: 0,
  needMeal: 0,
  needSong: 0,
  registryClicks: 0,
  messages: 0,
  visitsPrior: 0,
  rsvpsPrior: 0,
  series: [0, 0, 0, 0, 0, 0, 0],
};

export function useDashStats(siteId?: string | null): DashStats {
  // Tagged result so loading + error all derive from a single
  // state value. Same pattern as useLinkedCelebrations.
  type Result = {
    siteId: string;
    stats: Omit<DashStats, 'loading' | 'error'>;
    error?: string;
  };
  const [result, setResult] = useState<Result | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!siteId) return;
    const id = ++reqRef.current;
    const currentSiteId = siteId;
    let cancelled = false;

    (async () => {
      try {
        const [visitsRes, rsvpRes, regRes] = await Promise.all([
          fetch(`/api/analytics/visit?siteId=${encodeURIComponent(currentSiteId)}`),
          fetch(`/api/rsvp?siteId=${encodeURIComponent(currentSiteId)}`),
          fetch(
            `/api/analytics/section?siteId=${encodeURIComponent(currentSiteId)}&section=registry`,
          ).catch(() => null),
        ]);
        if (cancelled || id !== reqRef.current) return;
        const visits = visitsRes.ok
          ? await visitsRes.json().catch(() => ({ visits: 0, today: 0 }))
          : { visits: 0, today: 0 };
        const rsvp = rsvpRes.ok
          ? await rsvpRes.json().catch(() => ({ guests: [] }))
          : { guests: [] };
        const reg =
          regRes && regRes.ok ? await regRes.json().catch(() => ({ clicks: 0 })) : { clicks: 0 };
        type Guest = {
          attending?: boolean | null;
          meal_preference?: string | null;
          meal?: string | null;
          song_request?: string | null;
          song?: string | null;
        };
        const guests: Guest[] = Array.isArray(rsvp.guests) ? (rsvp.guests as Guest[]) : [];
        const invited = guests.length;
        const responded = guests.filter((g) => g.attending !== null && g.attending !== undefined).length;
        const yes = guests.filter((g) => g.attending === true).length;
        const no = guests.filter((g) => g.attending === false).length;
        const awaiting = Math.max(0, invited - responded);
        const attending = guests.filter((g) => g.attending === true);
        const needMeal = attending.filter((g) => !g.meal_preference && !g.meal).length;
        const needSong = attending.filter((g) => !g.song_request && !g.song).length;
        setResult({
          siteId: currentSiteId,
          stats: {
            visits: Number(visits.visits) || 0,
            today: Number(visits.today) || 0,
            rsvps: responded,
            invited,
            yes,
            no,
            awaiting,
            needMeal,
            needSong,
            registryClicks: Number(reg.clicks) || 0,
            messages: 0,
            visitsPrior: 0,
            rsvpsPrior: 0,
            series: synthSeries(Number(visits.visits) || 0, Number(visits.today) || 0),
          },
        });
      } catch (err) {
        if (cancelled || id !== reqRef.current) return;
        setResult({
          siteId: currentSiteId,
          stats: EMPTY_STATS,
          error: err instanceof Error ? err.message : 'Failed to load stats',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  // Loading derived: hook is loading until result.siteId
  // matches the current siteId. Empty siteId reads as not-loading.
  const loading = !!siteId && result?.siteId !== siteId;
  return {
    ...(result?.stats ?? EMPTY_STATS),
    loading,
    error: result?.error,
  };
}

// Linked celebrations (siblings)
export interface LinkedCelebration {
  domain: string;
  occasion: string;
  title: string;
  published?: boolean;
  date?: string;
}
export interface LinkedCelebrationsState {
  name: string | null;
  siblings: LinkedCelebration[];
  loading: boolean;
  error?: string;
}

export function useLinkedCelebrations(siteId?: string | null): LinkedCelebrationsState {
  // Tagged result so loading + error + data all derive from
  // a single state value — no setState-in-effect cascade.
  type Result = {
    siteId: string;
    name: string | null;
    siblings: LinkedCelebration[];
    error?: string;
  };
  const [result, setResult] = useState<Result | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!siteId) return;
    const id = ++reqRef.current;
    const currentSiteId = siteId;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/celebrations/siblings?siteId=${encodeURIComponent(currentSiteId)}`,
        );
        if (cancelled || id !== reqRef.current) return;
        if (!res.ok) {
          setResult({ siteId: currentSiteId, name: null, siblings: [] });
          return;
        }
        const data = (await res.json()) as {
          celebration?: { name?: string } | null;
          siblings?: Array<{
            domain: string;
            occasion?: string;
            title?: string;
            published?: boolean;
            eventDate?: string | null;
            date?: string;
          }>;
        };
        setResult({
          siteId: currentSiteId,
          name: data.celebration?.name ?? null,
          siblings: (data.siblings ?? []).map((s) => ({
            domain: s.domain,
            occasion: s.occasion ?? '',
            title: s.title ?? s.domain,
            published: s.published,
            date: s.eventDate ?? s.date,
          })),
        });
      } catch (err) {
        if (cancelled || id !== reqRef.current) return;
        setResult({
          siteId: currentSiteId,
          name: null,
          siblings: [],
          error: err instanceof Error ? err.message : 'Failed to load',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  // Derive: while siteId is set but result hasn't caught up,
  // we're loading. Empty siteId reads as loaded-empty.
  const loading = !!siteId && result?.siteId !== siteId;
  return {
    name: result?.name ?? null,
    siblings: result?.siblings ?? [],
    loading,
    error: result?.error,
  };
}

// Days-to-go from a site's event date. Re-runs every hour so
// the value advances at midnight even if the host leaves the
// dashboard open. Date.now() lives in component state so render
// stays pure (react-hooks/purity). parseLocalDate handles bare
// YYYY-MM-DD without UTC drift.
export function useDaysToGo(iso?: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const target = parseLocalDate(iso)?.getTime();
    if (target == null) return null;
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }, [iso, now]);
}
