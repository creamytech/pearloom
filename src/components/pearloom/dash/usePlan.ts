'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/dash/usePlan.ts
//
// The signed-in host's plan, for chrome (sidebar plan strip,
// settings badge). Reads /api/store/entitlements — the same
// endpoint useEntitlements consumes — which now also returns
// `plan` (canonical free/pro/premium) + `planLabel` (marketed
// Journal/Atelier/Legacy).
//
// Module-level cache: the strip renders in two sidebars + the
// settings page; one fetch per session is plenty. Silent
// fallback to Journal on 401/network so the strip never flashes
// an error.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export interface PlanInfo {
  plan: 'free' | 'pro' | 'premium';
  label: 'Journal' | 'Atelier' | 'Legacy';
  hydrated: boolean;
}

const FALLBACK: PlanInfo = { plan: 'free', label: 'Journal', hydrated: false };

let cached: PlanInfo | null = null;
let inflight: Promise<PlanInfo> | null = null;

async function fetchPlan(): Promise<PlanInfo> {
  try {
    const res = await fetch('/api/store/entitlements', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ...FALLBACK, hydrated: true };
    const json = (await res.json()) as { plan?: string; planLabel?: string };
    const plan = json.plan === 'pro' || json.plan === 'premium' ? json.plan : 'free';
    const label =
      json.planLabel === 'Atelier' || json.planLabel === 'Legacy' ? json.planLabel : 'Journal';
    return { plan, label, hydrated: true };
  } catch {
    return { ...FALLBACK, hydrated: true };
  }
}

export function usePlan(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>(cached ?? FALLBACK);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    inflight ??= fetchPlan().then((p) => {
      cached = p;
      return p;
    });
    void inflight.then((p) => {
      if (!cancelled) setInfo(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
