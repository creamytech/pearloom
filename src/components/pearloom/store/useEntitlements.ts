'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/useEntitlements.ts
//
// Theme ownership hook. Design is free (EDITOR-CALM-PLAN E.1):
// every pack in the catalog belongs to everyone, so ownership is
// derived locally from PACKS — no fetch, no entitlements API
// round-trip. The `{ owned, hydrated }` shape is kept verbatim
// so existing consumers don't change.
// ─────────────────────────────────────────────────────────────

import { PACKS } from '@/lib/theme-store/packs';

const ALL_PACK_IDS: ReadonlySet<string> = new Set(PACKS.map((p) => p.id));

export function useEntitlements(): { owned: ReadonlySet<string>; hydrated: boolean } {
  return { owned: ALL_PACK_IDS, hydrated: true };
}
