// ─────────────────────────────────────────────────────────────
// Pearloom / lib/render-jobs.ts
//
// Server-side helpers for the `render_jobs` table. Used by every
// painter route that takes longer than the request gateway will
// hold (gpt-image-2 'high' quality at 1024×1536 routinely runs
// 60–120s — Vercel's gateway times out the held response well
// before that).
//
// Flow:
//   1. createJob() — writes a `pending` row, returns jobId
//   2. (caller schedules `runJob` via Next.js `after()`)
//   3. markRunning / markComplete / markFailed update the row
//   4. getJob() reads it (auth-gated by the API route).
//
// The service-role client is used for writes; the API route is
// the only thing that calls these helpers, and it verifies the
// session before doing so. Never expose these from a route that
// hasn't checked auth.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function admin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key);
  return _admin;
}

export type RenderJobStatus = 'pending' | 'running' | 'complete' | 'failed';
export type RenderJobSurface = 'invite' | 'qr-poster' | 'decor-recolor' | 'other';

export interface RenderJobRow {
  id: string;
  owner_email: string;
  site_slug: string | null;
  surface: RenderJobSurface;
  payload: Record<string, unknown> | null;
  status: RenderJobStatus;
  status_detail: string | null;
  result_url: string | null;
  result_mime: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

/** Strip large or sensitive fields out of a payload before we
 *  persist it. We keep the request shape so debugging is easy
 *  but never write portrait/inspiration base64 (could be 1+ MB
 *  per row, and they're not useful in a job-state row). */
export function sanitizeJobPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'portrait' || k === 'inspiration') {
      // Replace with a small marker so we know there *was* one.
      const ref = v as { mimeType?: string; base64?: string } | undefined;
      if (ref?.base64) {
        next[k] = { mimeType: ref.mimeType ?? 'image/jpeg', present: true };
      }
    } else {
      next[k] = v;
    }
  }
  return next;
}

export async function createJob(input: {
  ownerEmail: string;
  siteSlug?: string | null;
  surface: RenderJobSurface;
  payload?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  const a = admin();
  if (!a) return null;
  const { data, error } = await a
    .from('render_jobs')
    .insert({
      owner_email: input.ownerEmail,
      site_slug: input.siteSlug ?? null,
      surface: input.surface,
      payload: input.payload ? sanitizeJobPayload(input.payload) : null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) {
    console.error('[render-jobs] createJob failed:', error.message);
    return null;
  }
  return { id: data.id as string };
}

export async function markRunning(id: string): Promise<void> {
  const a = admin();
  if (!a) return;
  await a
    .from('render_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markComplete(id: string, result: { url: string; mime: string }): Promise<void> {
  const a = admin();
  if (!a) return;
  await a
    .from('render_jobs')
    .update({
      status: 'complete',
      result_url: result.url,
      result_mime: result.mime,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function markFailed(id: string, detail: string): Promise<void> {
  const a = admin();
  if (!a) return;
  await a
    .from('render_jobs')
    .update({
      status: 'failed',
      status_detail: detail.slice(0, 500),
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function getJob(id: string, ownerEmail: string): Promise<RenderJobRow | null> {
  const a = admin();
  if (!a) return null;
  const { data, error } = await a
    .from('render_jobs')
    .select('*')
    .eq('id', id)
    .eq('owner_email', ownerEmail) // owner-scoped read
    .maybeSingle();
  if (error) {
    console.error('[render-jobs] getJob failed:', error.message);
    return null;
  }
  return (data as RenderJobRow) ?? null;
}

/** Returns true when the render-jobs table is reachable. The
 *  painter routes use this to decide whether to fall back to
 *  the legacy hold-the-connection flow (still works for short
 *  jobs and local dev without Supabase wired up). */
export function renderJobsAvailable(): boolean {
  return admin() !== null;
}
