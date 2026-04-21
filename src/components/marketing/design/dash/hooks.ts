'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/dash/hooks.ts
//
// Shared client-side hooks for the new dashboard design.
//
//   useUserSites()       — fetches the current user's sites
//   useSelectedSite()    — reads ?site= or localStorage, returns
//                          the active site's id, domain, manifest
//   useUserPrefs()       — Pear voice + autonomy + quiet hours
//                          (persisted via /api/user/preferences)
//
// Every page in /marketing/design/dash/ uses these. The shell's
// sidebar reads session + useUserSites() to render the avatar
// and loom label; per-site pages read useSelectedSite() and
// thread the id through their data fetches.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface SiteSummary {
  id: string;
  domain: string;
  names?: [string, string] | null;
  occasion?: string;
  manifest?: unknown;
  coverPhoto?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  published?: boolean;
  updated_at?: string;
  created_at?: string;
}

export interface UserSitesState {
  sites: SiteSummary[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Shared cache so multiple hooks mounted simultaneously don't
// each fire their own /api/sites call. Simple module-level
// memoisation — enough for dashboard navigation.
let sitesCache: SiteSummary[] | null = null;
const sitesSubscribers: Set<() => void> = new Set();

interface ApiSitesResponse {
  sites: Array<{
    id: string;
    domain: string;
    names?: [string, string] | null;
    manifest?: {
      occasion?: string;
      coverPhoto?: string;
      logistics?: { date?: string; venue?: string };
    } | null;
    published?: boolean;
    updated_at?: string;
    created_at?: string;
  }>;
}

function notifySitesSubscribers() {
  sitesSubscribers.forEach((fn) => fn());
}

export function useUserSites(): UserSitesState {
  const [, tick] = useState(0);
  const [loading, setLoading] = useState(sitesCache === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sites', { cache: 'no-store' });
      if (!res.ok) throw new Error(`sites ${res.status}`);
      const data = (await res.json()) as ApiSitesResponse;
      const shaped: SiteSummary[] = (data.sites ?? []).map((s) => {
        const m = s.manifest as {
          occasion?: string;
          coverPhoto?: string;
          logistics?: { date?: string; venue?: string };
          names?: [string, string];
        } | null;
        return {
          id: s.id,
          domain: s.domain,
          names: (s.names ?? m?.names ?? null) as [string, string] | null,
          occasion: m?.occasion,
          manifest: s.manifest,
          coverPhoto: m?.coverPhoto ?? null,
          eventDate: m?.logistics?.date ?? null,
          venue: m?.logistics?.venue ?? null,
          published: s.published,
          updated_at: s.updated_at,
          created_at: s.created_at,
        };
      });
      sitesCache = shaped;
      notifySitesSubscribers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sub = () => tick((t) => t + 1);
    sitesSubscribers.add(sub);
    if (sitesCache === null) void refresh();
    else setLoading(false);
    return () => {
      sitesSubscribers.delete(sub);
    };
  }, [refresh]);

  return { sites: sitesCache, loading, error, refresh };
}

// ── useSelectedSite ───────────────────────────────────────────
// Resolves the active site from (in order):
//   1. ?site= query param  (single source of truth for page)
//   2. localStorage('pl-dash-site')  (sticky across routes)
//   3. sites[0]  (fallback for first-time users)
//
// Returns null when user has no sites at all.

const SITE_KEY = 'pl-dash-site';

export function useSelectedSite() {
  const router = useRouter();
  const params = useSearchParams();
  const { sites, loading } = useUserSites();

  const queryId = params?.get('site') ?? null;

  const selected = useMemo(() => {
    if (!sites || sites.length === 0) return null;
    if (queryId) {
      const byId = sites.find((s) => s.id === queryId || s.domain === queryId);
      if (byId) return byId;
    }
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(SITE_KEY);
      if (stored) {
        const match = sites.find((s) => s.id === stored || s.domain === stored);
        if (match) return match;
      }
    }
    return sites[0];
  }, [sites, queryId]);

  useEffect(() => {
    if (!selected) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SITE_KEY, selected.id);
    }
  }, [selected]);

  const selectSite = useCallback(
    (id: string) => {
      if (typeof window !== 'undefined') window.localStorage.setItem(SITE_KEY, id);
      const sp = new URLSearchParams(params?.toString() ?? '');
      sp.set('site', id);
      router.push(`?${sp.toString()}`);
    },
    [params, router],
  );

  return { site: selected, sites, loading, selectSite };
}

// ── useUserPrefs ──────────────────────────────────────────────
// Persists Pear voice, autonomy, quiet hours. Backed by
// /api/user/preferences (GET + PATCH). Falls back to sensible
// defaults when the user has no prefs row yet.

export type PearVoice = 'gentle' | 'candid' | 'witty' | 'minimal';
export type AutonomyKey =
  | 'draft_emails'
  | 'call_vendors'
  | 'update_site'
  | 'respond_guest'
  | 'adjust_schedule';

export interface UserPrefs {
  voice: PearVoice;
  quiet_hours: boolean;
  autonomy: Record<AutonomyKey, 1 | 2 | 3>;
  display_name?: string | null;
  pronouns?: string | null;
  timezone?: string | null;
}

const PREF_DEFAULTS: UserPrefs = {
  voice: 'gentle',
  quiet_hours: true,
  autonomy: {
    draft_emails: 2,
    call_vendors: 1,
    update_site: 3,
    respond_guest: 2,
    adjust_schedule: 1,
  },
  display_name: null,
  pronouns: null,
  timezone: null,
};

export function useUserPrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(PREF_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/user/preferences', { cache: 'no-store' });
        if (!r.ok) throw new Error(`prefs ${r.status}`);
        const data = (await r.json()) as Partial<UserPrefs>;
        if (cancelled) return;
        setPrefs({ ...PREF_DEFAULTS, ...data, autonomy: { ...PREF_DEFAULTS.autonomy, ...(data.autonomy ?? {}) } });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (patch: Partial<UserPrefs>) => {
    // Optimistic local update — server writes return the full row.
    setPrefs((prev) => ({
      ...prev,
      ...patch,
      autonomy: { ...prev.autonomy, ...(patch.autonomy ?? {}) },
    }));
    try {
      const r = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`prefs save ${r.status}`);
      const data = (await r.json()) as Partial<UserPrefs>;
      setPrefs((prev) => ({ ...prev, ...data, autonomy: { ...prev.autonomy, ...(data.autonomy ?? {}) } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { prefs, save, loading, error };
}

// ── Helper: format names from a site ──────────────────────────
export function siteDisplayName(site: SiteSummary | null | undefined): string {
  if (!site) return '';
  const [a, b] = site.names ?? [null, null];
  if (a && b) return `${a} & ${b}`;
  if (a) return a;
  return site.domain;
}
