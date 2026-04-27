// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/co-host/route.ts
//
// Invite + accept flow for co-host roles. Today every site has
// one creator; this adds scoped collaborators who can suggest
// edits but can't publish.
//
// POST  /api/sites/co-host         — creator mints an invite link
// POST  /api/sites/co-host/accept  — invitee accepts (logged in)
// GET   /api/sites/co-host?siteId  — list collaborators (creator)
// DELETE /api/sites/co-host        — creator revokes a collaborator
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type CoHostRole = 'editor' | 'guest-manager' | 'viewer';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

function generateToken(): string {
  return (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(
    /-/g,
    '',
  );
}

// Creator verifies ownership of the site. Returns site row or null.
async function ownedSite(
  supabase: ReturnType<typeof getSupabase>,
  siteId: string,
  email: string,
) {
  const { data } = await supabase
    .from('sites')
    .select('id, creator_email, site_config')
    .eq('id', siteId)
    .maybeSingle();
  if (!data || data.creator_email !== email) return null;
  return data;
}

// ── POST — mint invite link OR accept invite ────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = session.user.email;

  // Rate-limit invite creation so nobody mints hundreds of tokens.
  const rateCheck = checkRateLimit(`cohost-invite:${email}`, {
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    siteId?: string;
    role?: CoHostRole;
    note?: string;
    acceptToken?: string;
  };

  // ── Accept path ────────────────────────────────────────────
  if (body.acceptToken) {
    const supabase = getSupabase();
    const { data: inv } = await supabase
      .from('cohost_invites')
      .select('*')
      .eq('token', body.acceptToken)
      .maybeSingle();
    if (!inv) return NextResponse.json({ error: 'invalid_invite' }, { status: 404 });
    if (inv.accepted_at) return NextResponse.json({ ok: true, already: true });
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 410 });
    }
    await supabase
      .from('cohost_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_email: email })
      .eq('token', body.acceptToken);
    await supabase.from('cohosts').upsert(
      {
        site_id: inv.site_id,
        email,
        role: inv.role,
        invited_by: inv.invited_by,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,email' },
    );
    return NextResponse.json({ ok: true, siteId: inv.site_id, role: inv.role });
  }

  // ── Mint path ──────────────────────────────────────────────
  if (!body.siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }
  const role: CoHostRole = body.role ?? 'editor';
  if (!['editor', 'guest-manager', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const supabase = getSupabase();
  const site = await ownedSite(supabase, body.siteId, email);
  if (!site) return NextResponse.json({ error: 'Not your site' }, { status: 403 });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  const { error } = await supabase.from('cohost_invites').insert({
    token,
    site_id: body.siteId,
    role,
    invited_by: email,
    note: body.note ?? null,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.error('[cohost] mint error:', error);
    return NextResponse.json({ error: 'mint_failed' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const inviteUrl = `${baseUrl}/co-host/${token}`;
  return NextResponse.json({ token, inviteUrl, role, expiresAt });
}

// ── GET — list collaborators ────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = getSupabase();
  const site = await ownedSite(supabase, siteId, session.user.email);
  if (!site) return NextResponse.json({ error: 'Not your site' }, { status: 403 });

  const [active, pending] = await Promise.all([
    supabase
      .from('cohosts')
      .select('email, role, joined_at')
      .eq('site_id', siteId)
      .order('joined_at', { ascending: false }),
    supabase
      .from('cohost_invites')
      .select('token, role, note, created_at, expires_at, accepted_at')
      .eq('site_id', siteId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    active: active.data || [],
    pending: pending.data || [],
  });
}

// ── DELETE — revoke collaborator or invite ──────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    siteId?: string;
    email?: string;
    token?: string;
  };
  if (!body.siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }
  const supabase = getSupabase();
  const site = await ownedSite(supabase, body.siteId, session.user.email);
  if (!site) return NextResponse.json({ error: 'Not your site' }, { status: 403 });

  if (body.email) {
    await supabase
      .from('cohosts')
      .delete()
      .eq('site_id', body.siteId)
      .eq('email', body.email);
  }
  if (body.token) {
    await supabase.from('cohost_invites').delete().eq('token', body.token);
  }
  return NextResponse.json({ ok: true });
}
