'use client';

// Real data hooks for dashboard widgets.

import { useEffect, useMemo, useRef, useState } from 'react';

export interface DashStats {
  visits: number;
  today: number;
  rsvps: number;
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

export function useDashStats(siteId?: string | null): DashStats {
  const [state, setState] = useState<DashStats>({
    visits: 0,
    today: 0,
    rsvps: 0,
    registryClicks: 0,
    messages: 0,
    visitsPrior: 0,
    rsvpsPrior: 0,
    series: [0, 0, 0, 0, 0, 0, 0],
    loading: true,
  });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!siteId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const id = ++reqRef.current;
    let cancelled = false;

    (async () => {
      try {
        const [visitsRes, rsvpRes, regRes] = await Promise.all([
          fetch(`/api/analytics/visit?siteId=${encodeURIComponent(siteId)}`),
          fetch(`/api/rsvp?siteId=${encodeURIComponent(siteId)}`),
          fetch(
            `/api/analytics/section?siteId=${encodeURIComponent(siteId)}&section=registry`,
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
        const rsvpCount = Array.isArray(rsvp.guests)
          ? rsvp.guests.filter((g: { attending?: boolean | null }) => g.attending !== null).length
          : 0;
        setState({
          visits: Number(visits.visits) || 0,
          today: Number(visits.today) || 0,
          rsvps: rsvpCount,
          registryClicks: Number(reg.clicks) || 0,
          messages: 0,
          visitsPrior: 0,
          rsvpsPrior: 0,
          series: synthSeries(Number(visits.visits) || 0, Number(visits.today) || 0),
          loading: false,
        });
      } catch (err) {
        if (cancelled || id !== reqRef.current) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load stats',
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return state;
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
  const [state, setState] = useState<LinkedCelebrationsState>({
    name: null,
    siblings: [],
    loading: true,
  });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!siteId) {
      setState({ name: null, siblings: [], loading: false });
      return;
    }
    const id = ++reqRef.current;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/celebrations/siblings?siteId=${encodeURIComponent(siteId)}`,
        );
        if (cancelled || id !== reqRef.current) return;
        if (!res.ok) {
          setState({ name: null, siblings: [], loading: false });
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
        setState({
          name: data.celebration?.name ?? null,
          siblings: (data.siblings ?? []).map((s) => ({
            domain: s.domain,
            occasion: s.occasion ?? '',
            title: s.title ?? s.domain,
            published: s.published,
            date: s.eventDate ?? s.date,
          })),
          loading: false,
        });
      } catch (err) {
        if (cancelled || id !== reqRef.current) return;
        setState({
          name: null,
          siblings: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return state;
}

// Days-to-go from a site's event date.
export function useDaysToGo(iso?: string | null): number | null {
  return useMemo(() => {
    if (!iso) return null;
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return null;
    return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
  }, [iso]);
}
