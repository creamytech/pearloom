'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/useEntitlements.ts
//
// Theme Store ownership hook. Fetches the signed-in user's
// owned-pack ids from /api/store/entitlements (to be wired in
// the next phase) and folds in the catalog's free-tier packs
// so callers always see implicit free ownership even before
// the API exists.
//
// Contract:
//   - returns `{ owned: Set<string>, hydrated: boolean }`
//   - `owned` always includes every free pack id
//   - real Stripe purchases are merged in once the API responds
//   - silent failure on 401/404/network — falls back to free-only
//
// This is the only surface that talks to the entitlements API,
// so when the route lands next phase the rest of the store
// just gets ownership "for free".
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { FREE_PACK_IDS } from '@/lib/theme-store/packs';

interface EntitlementsResponse {
  ok?: boolean;
  packIds?: string[];
}

export function useEntitlements(): { owned: ReadonlySet<string>; hydrated: boolean } {
  const [purchased, setPurchased] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/store/entitlements', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          // 401 (not signed in), 404 (route not yet wired) — fall
          // back to free-only ownership without throwing.
          if (!cancelled) setHydrated(true);
          return;
        }
        const json = (await res.json()) as EntitlementsResponse;
        if (cancelled) return;
        if (Array.isArray(json.packIds)) {
          setPurchased(json.packIds.filter((x): x is string => typeof x === 'string'));
        }
        setHydrated(true);
      } catch {
        if (!cancelled) setHydrated(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const owned = useMemo(() => {
    const set = new Set<string>(FREE_PACK_IDS);
    for (const id of purchased) set.add(id);
    return set;
  }, [purchased]);

  return { owned, hydrated };
}
