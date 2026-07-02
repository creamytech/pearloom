// ─────────────────────────────────────────────────────────────
// Pearloom / companion/[token]/_context.tsx
//
// Shared companion data context. One /api/companion/{token}
// fetch fuels every tab, so the tabs stay instant and the
// invariants (site colors, guest first name) stay consistent.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://pearloom.com';

export interface CompanionData {
  guest: {
    id: string;
    displayName: string;
    firstName: string;
    homeCity: string | null;
    dietary: string[] | null;
  };
  site: {
    id: string;
    subdomain: string;
    coupleNames: [string, string];
    venue: string | null;
    venueAddress: string | null;
    date: string | null;
    themeColors: Record<string, string> | null;
  };
  timeline: Array<{
    id: string;
    name: string;
    kind: string;
    startAt: string | null;
    endAt: string | null;
    dressCode: string | null;
    description: string | null;
  }>;
  seat: { seatLabel: string | null; tableLabel: string | null } | null;
  announcements: Array<{ id: string; body: string; kind: string; createdAt: string }>;
  photoFeed: Array<{ url: string; caption: string | null; createdAt: string }>;
  personalization: {
    hero_copy: string;
    seat_summary: string;
    travel_tips: {
      nearestAirport?: string;
      driveTime?: string;
      recommendedHotels?: Array<{ name: string; url?: string; note?: string }>;
    };
  } | null;
}

interface CompanionContextValue {
  token: string;
  data: CompanionData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion must be used inside CompanionProvider');
  return ctx;
}

export function CompanionProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<CompanionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/companion/${token}`);
      if (!res.ok) {
        setError(`Unable to load (${res.status})`);
        return;
      }
      const json = (await res.json()) as CompanionData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <CompanionContext.Provider value={{ token, data, loading, refreshing, error, refresh }}>
      {children}
    </CompanionContext.Provider>
  );
}

export { API_BASE };
