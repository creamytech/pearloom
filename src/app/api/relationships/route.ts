// ─────────────────────────────────────────────────────────────
// Pearloom / api/relationships/route.ts
//
// CRUD for the relationship graph — who is close to whom,
// and what story connects them. Used by the seating optimizer,
// personalization writer, and toast prompts.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { listRelationships, upsertRelationship } from '@/lib/event-os/db';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

async function requireOwnerEmailForSite(siteId: string): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const { data } = await sb()
    .from('sites')
    .select('site_config')
    .eq('id', siteId)
    .maybeSingle();
  const ownerEmail = (data?.site_config as Record<string, unknown> | null)?.creator_email;
  return ownerEmail === session.user.email ? session.user.email : null;
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const owner = await requireOwnerEmailForSite(siteId);
  if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const edges = await listRelationships(siteId);
    return NextResponse.json({ edges });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to list relationships', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: {
    siteId?: string;
    id?: string;
    from_guest_id?: string;
    to_guest_id?: string;
    kind?: string;
    closeness?: number;
    story?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { siteId, id, from_guest_id, to_guest_id, kind, closeness, story, metadata } = body;
  if (!siteId || !kind) {
    return NextResponse.json({ error: 'siteId and kind required' }, { status: 400 });
  }
  const owner = await requireOwnerEmailForSite(siteId);
  if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const edge = await upsertRelationship({
      ...(id ? { id } : {}),
      site_id: siteId,
      from_guest_id: from_guest_id ?? null,
      to_guest_id: to_guest_id ?? null,
      kind,
      closeness: typeof closeness === 'number' ? closeness : null,
      story: story ?? null,
      metadata: metadata ?? {},
    });
    return NextResponse.json({ edge });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to save relationship', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
