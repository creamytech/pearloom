// ─────────────────────────────────────────────────────────────
// Pearloom / api/film/route.ts
//
// POST  { siteId, eventId? } — create + advance a film job
//   (gathers sources, writes the Claude script, flips to
//   'rendering' so a background worker can pick it up)
// GET   ?siteId=...          — list film jobs for a site
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createFilmJob, listFilmJobs, advanceFilmJob } from '@/lib/event-os/film';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

async function requireOwnership(siteId: string): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const { data } = await sb().from('sites').select('site_config').eq('id', siteId).maybeSingle();
  const owner = (data?.site_config as Record<string, unknown> | null)?.creator_email;
  return owner === session.user.email ? session.user.email : null;
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const owner = await requireOwnership(siteId);
  if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const jobs = await listFilmJobs(siteId);
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to list films', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { siteId?: string; eventId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const siteId = body.siteId;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const owner = await requireOwnership(siteId);
  if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const job = await createFilmJob({
      siteId,
      eventId: body.eventId ?? null,
      ownerEmail: owner,
    });
    // Kick off gather + script inline (runs in < 60s for manifests we produce).
    // The worker will take over at 'rendering'.
    await advanceFilmJob(job.id);
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error('[film] failed to start', err);
    return NextResponse.json(
      { error: 'Failed to start film', detail: String(err).slice(0, 300) },
      { status: 500 }
    );
  }
}
