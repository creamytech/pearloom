// ─────────────────────────────────────────────────────────────
// Pearloom / api/cadence — list + manage scheduled communications.
//
// GET  /api/cadence?site=slug
//   Returns the merged view: every preset phase for the event's
//   occasion, plus any scheduled_communications row that overrides
//   it (with the host's edited copy / scheduled_at / status).
//
// POST /api/cadence
//   { siteSlug, phaseId, scheduledAt?, subject?, body?, status? }
//   Upserts the row. Used by the host's "Schedule" / "Save draft" /
//   "Cancel" actions in the timeline UI.
//
// PATCH /api/cadence/seed
//   { siteSlug }
//   Seeds every phase from the preset for an event that doesn't
//   have any rows yet. Idempotent — safe to call repeatedly.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getSiteConfig } from '@/lib/db';
import { getCadencePreset, scheduledAtFor, type CadencePhase } from '@/lib/cadence/cadence-presets';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SchedRow {
  id: string;
  site_id: string;
  owner_email: string;
  phase_id: string;
  label: string;
  product: string;
  channels: string[];
  audience: string | null;
  scheduled_at: string;
  status: string;
  status_detail: string | null;
  subject: string | null;
  body: string | null;
  draft_voice: string | null;
  sent_at: string | null;
  sent_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

interface MergedPhase extends CadencePhase {
  /** Override row id when the host has touched this phase. */
  rowId?: string;
  scheduledAt: string;
  status: 'preset' | 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
  subject?: string;
  body?: string;
  sentAt?: string;
  sentCount?: number;
  failureCount?: number;
  hasOverride: boolean;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const siteSlug = req.nextUrl.searchParams.get('site');
  if (!siteSlug) return NextResponse.json({ error: 'site is required.' }, { status: 400 });

  const cfg = await getSiteConfig(siteSlug);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const eventDate = cfg.manifest.logistics?.date ?? null;
  const occasion = (cfg.manifest as unknown as { occasion?: string }).occasion;
  const preset = getCadencePreset(occasion);

  // Pull existing override rows.
  const sb = getServiceClient();
  let rows: SchedRow[] = [];
  if (sb) {
    const { data } = await sb
      .from('scheduled_communications')
      .select('*')
      .eq('site_id', siteSlug)
      .order('scheduled_at', { ascending: true });
    rows = (data as SchedRow[] | null) ?? [];
  }
  const byPhase = new Map(rows.map((r) => [r.phase_id, r]));

  const merged: MergedPhase[] = preset.map((phase) => {
    const row = byPhase.get(phase.id);
    const fallbackScheduledAt = eventDate ? scheduledAtFor(eventDate, phase.daysBefore) : '';
    if (!row) {
      return {
        ...phase,
        scheduledAt: fallbackScheduledAt,
        status: 'preset',
        hasOverride: false,
      };
    }
    return {
      ...phase,
      rowId: row.id,
      scheduledAt: row.scheduled_at,
      status: row.status as MergedPhase['status'],
      subject: row.subject ?? undefined,
      body: row.body ?? undefined,
      sentAt: row.sent_at ?? undefined,
      sentCount: row.sent_count ?? undefined,
      failureCount: row.failure_count ?? undefined,
      hasOverride: true,
    };
  });

  return NextResponse.json({
    ok: true,
    eventDate,
    occasion,
    phases: merged,
  });
}

interface PostBody {
  siteSlug: string;
  phaseId: string;
  scheduledAt?: string;
  subject?: string;
  body?: string;
  status?: 'draft' | 'scheduled' | 'cancelled';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!body.siteSlug || !body.phaseId) {
    return NextResponse.json({ error: 'siteSlug + phaseId required.' }, { status: 400 });
  }

  const cfg = await getSiteConfig(body.siteSlug);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

  const occasion = (cfg.manifest as unknown as { occasion?: string }).occasion;
  const preset = getCadencePreset(occasion);
  const phase = preset.find((p) => p.id === body.phaseId);
  if (!phase) return NextResponse.json({ error: 'Unknown phase id.' }, { status: 400 });

  const eventDate = cfg.manifest.logistics?.date ?? null;
  const fallbackScheduledAt = eventDate ? scheduledAtFor(eventDate, phase.daysBefore) : new Date().toISOString();

  // Upsert by (site_id, phase_id) — the table has a UNIQUE constraint
  // so this is naturally idempotent.
  const { data, error } = await sb
    .from('scheduled_communications')
    .upsert({
      site_id: body.siteSlug,
      owner_email: session.user.email,
      phase_id: phase.id,
      label: phase.label,
      product: phase.product,
      channels: phase.channels,
      audience: phase.audience ?? 'all',
      scheduled_at: body.scheduledAt ?? fallbackScheduledAt,
      status: body.status ?? 'scheduled',
      subject: body.subject ?? null,
      body: body.body ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'site_id,phase_id' })
    .select()
    .single();

  if (error) {
    console.error('[cadence] upsert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const siteSlug = req.nextUrl.searchParams.get('site');
  const phaseId = req.nextUrl.searchParams.get('phaseId');
  if (!siteSlug || !phaseId) {
    return NextResponse.json({ error: 'site + phaseId required.' }, { status: 400 });
  }
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'Storage not configured.' }, { status: 503 });

  const { error } = await sb
    .from('scheduled_communications')
    .delete()
    .eq('site_id', siteSlug)
    .eq('owner_email', session.user.email)
    .eq('phase_id', phaseId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
