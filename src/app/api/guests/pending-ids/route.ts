// ─────────────────────────────────────────────────────────────
// /api/guests/pending-ids
//
// GET ?siteSlug=… → { guestIds: [uuid…] }
//   Owner-only. Returns the IDs of every guest who hasn't yet
//   RSVP'd (responded_at IS NULL) and has an email on file.
//
// Used by Pear's "send the nudge" action card so the chat
// surface can fan a single approval into a real bulk send via
// /api/guests/nudge — without the host having to leave the
// conversation.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get('siteSlug')?.trim();
  if (!slug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ guestIds: [] });

  // Resolve slug or UUID → site row + creator_email.
  const siteQuery = UUID_RX.test(slug)
    ? sb.from('sites').select('id, creator_email, site_config').eq('id', slug)
    : sb.from('sites').select('id, creator_email, site_config').eq('subdomain', slug);
  const { data: site } = await siteQuery.maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (
    (site as { creator_email?: string }).creator_email
    ?? (site as { site_config?: { creator_email?: string } }).site_config?.creator_email
    ?? ''
  ).toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rows } = await sb
    .from('guests')
    .select('id, email')
    .eq('site_id', (site as { id: string }).id)
    .is('responded_at', null)
    .not('email', 'is', null);

  const guestIds = ((rows ?? []) as Array<{ id: string; email: string | null }>)
    .filter((r) => r.email)
    .map((r) => r.id);

  return NextResponse.json({ guestIds });
}
