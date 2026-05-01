// ─────────────────────────────────────────────────────────────
// Pearloom / lib/supabase-realtime.ts
// Browser-side Supabase singleton used only for Realtime channels
// (guest photo wall, wedding-day feed). Falls back to null when the
// publishable env keys aren't configured — callers should poll instead.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 4 } },
  });
  return cached;
}
