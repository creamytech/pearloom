// ─────────────────────────────────────────────────────────────
// Pearloom / api/announcements/route.ts
//
// GET  ?siteId=... (public token OR owner) — list announcements
// POST { siteId, body, kind?, targetAudience?, scheduledFor? }
//      (owner only) — create or schedule an announcement
//
// Announcements surface in the Guest Companion + /g/{token}.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { listAnnouncements, postAnnouncement, getGuestByToken } from '@/lib/event-os/db';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  const guestToken = req.nextUrl.searchParams.get('token');
  let resolvedSiteId = siteId;

  // Guest-token path: look up site via token
  if (guestToken && !siteId) {
    const guest = await getGuestByToken(guestToken);
    if (!guest) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    resolvedSiteId = guest.site_id;
  } else if (siteId) {
    // Owner path: session must match
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: site } = await sb()
      .from('sites')
      .select('site_config')
      .eq('id', siteId)
      .maybeSingle();
    const ownerEmail = (site?.site_config as Record<string, unknown> | null)?.creator_email;
    if (ownerEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: 'siteId or token required' }, { status: 400 });
  }

  try {
    const list = await listAnnouncements(resolvedSiteId!, 50);
    // Guests see only sent announcements
    const filtered = guestToken ? list.filter((a) => a.sent_at) : list;
    return NextResponse.json({ announcements: filtered });
  } catch (err) {
    return NextResponse.json(
      { error: 'List failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: {
    siteId?: string;
    eventId?: string | null;
    body?: string;
    kind?: string;
    targetAudience?: string;
    scheduledFor?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { siteId, body: text, kind = 'info', targetAudience = 'all', scheduledFor = null, eventId = null } = body;
  if (!siteId || !text) {
    return NextResponse.json({ error: 'siteId and body required' }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'Announcement too long (max 1000 chars)' }, { status: 400 });
  }

  const { data: site } = await sb()
    .from('sites')
    .select('site_config')
    .eq('id', siteId)
    .maybeSingle();
  const ownerEmail = (site?.site_config as Record<string, unknown> | null)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const a = await postAnnouncement({
      site_id: siteId,
      event_id: eventId,
      author_email: session.user.email,
      body: text,
      kind,
      target_audience: targetAudience,
      scheduled_for: scheduledFor,
    });
    return NextResponse.json({ announcement: a });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to post', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
