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
import { ownerEmailOf } from '@/lib/cohost-access';

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

// Creator verifies ownership of the site (by id OR subdomain).
// Returns site row or null. Ownership reads the top-level column
// with the site_config JSON fallback (ownerEmailOf) — the column
// is NULL on sites created after the 20260415 backfill, so the
// column-only check 403'd every legitimate owner of a newer site.
async function ownedSite(
  supabase: ReturnType<typeof getSupabase>,
  by: { siteId?: string | null; subdomain?: string | null },
  email: string,
) {
  if (!by.siteId && !by.subdomain) return null;
  const { data } = await supabase
    .from('sites')
    .select('id, creator_email, site_config')
    .eq(by.siteId ? 'id' : 'subdomain', (by.siteId || by.subdomain) as string)
    .maybeSingle();
  // Case-insensitive owner check — IdP casing variance otherwise
  // 403s the legitimate owner. Matches /api/sites/[domain].
  const owner = ownerEmailOf(data);
  const caller = email.toLowerCase().trim();
  if (!data || !owner || owner !== caller) return null;
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
    siteSlug?: string;
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
    const acceptedEmail = email.toLowerCase().trim();
    await supabase
      .from('cohost_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_email: acceptedEmail })
      .eq('token', body.acceptToken);
    await supabase.from('cohosts').upsert(
      {
        site_id: inv.site_id,
        email: acceptedEmail,
        role: inv.role,
        invited_by: inv.invited_by,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,email' },
    );

    // Tell the owner their invite landed — instant by default
    // (collaboration events are rare + high-signal). Fire-and-forget.
    // In the same pass, welcome the accepting co-host to their seat.
    void (async () => {
      try {
        const { data: site } = await supabase
          .from('sites')
          .select('id, subdomain, creator_email, site_config')
          .eq('id', inv.site_id)
          .maybeSingle();
        const cfg = (site as { site_config?: { creator_email?: string; names?: [string, string] } } | null)?.site_config;
        const ownerEmail = String((site as { creator_email?: string } | null)?.creator_email ?? cfg?.creator_email ?? '');
        const names = (cfg?.names ?? []).filter(Boolean);
        const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : ((site as { subdomain?: string } | null)?.subdomain ?? 'your site');
        const roleLabel = inv.role === 'guest-manager' ? 'guest manager' : inv.role === 'viewer' ? 'viewer' : 'co-editor';

        if (ownerEmail && ownerEmail.toLowerCase() !== acceptedEmail) {
          const { notifyHost } = await import('@/lib/notifications/notify');
          await notifyHost(supabase, {
            siteId: String(inv.site_id),
            siteLabel,
            ownerEmail,
            category: 'cohost',
            title: `${acceptedEmail} joined as ${roleLabel}`,
            href: '/dashboard',
            dedupeKey: `cohost-accept:${body.acceptToken}`,
          });
        }

        // Welcome the co-host themselves — fire-and-forget, key-gated.
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
          const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
          const { buildCoHostWelcomeEmail } = await import('@/lib/email/brand-emails');
          const { subject, html } = buildCoHostWelcomeEmail({
            name: null,
            coupleDisplay: siteLabel,
            role: inv.role,
            dashboardUrl: `${baseUrl}/dashboard`,
          });
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromEmail, to: [acceptedEmail], subject, html }),
          }).catch((e) => console.warn('[co-host accept] welcome email failed (non-fatal):', e));
        }
      } catch (err) {
        console.warn('[co-host accept] owner notify failed (non-fatal):', err);
      }
    })();

    return NextResponse.json({ ok: true, siteId: inv.site_id, role: inv.role });
  }

  // ── Mint path ──────────────────────────────────────────────
  if (!body.siteId && !body.siteSlug) {
    return NextResponse.json({ error: 'siteId or siteSlug required' }, { status: 400 });
  }
  const role: CoHostRole = body.role ?? 'editor';
  if (!['editor', 'guest-manager', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const supabase = getSupabase();
  const site = await ownedSite(supabase, { siteId: body.siteId, subdomain: body.siteSlug }, email);
  if (!site) return NextResponse.json({ error: 'Not your site' }, { status: 403 });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  const { error } = await supabase.from('cohost_invites').insert({
    token,
    site_id: site.id,
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
  const subdomain = req.nextUrl.searchParams.get('subdomain');
  if (!siteId && !subdomain) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = getSupabase();
  const site = await ownedSite(supabase, { siteId, subdomain }, session.user.email);
  if (!site) return NextResponse.json({ error: 'Not your site' }, { status: 403 });

  const [active, pending] = await Promise.all([
    supabase
      .from('cohosts')
      .select('email, role, joined_at')
      .eq('site_id', site.id)
      .order('joined_at', { ascending: false }),
    supabase
      .from('cohost_invites')
      .select('token, role, note, created_at, expires_at, accepted_at, invited_email')
      .eq('site_id', site.id)
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
    siteSlug?: string;
    email?: string;
    token?: string;
  };
  if (!body.siteId && !body.siteSlug) {
    return NextResponse.json({ error: 'siteId or siteSlug required' }, { status: 400 });
  }
  const supabase = getSupabase();
  const site = await ownedSite(supabase, { siteId: body.siteId, subdomain: body.siteSlug }, session.user.email);
  if (!site) return NextResponse.json({ error: 'Not your site' }, { status: 403 });

  if (body.email) {
    await supabase
      .from('cohosts')
      .delete()
      .eq('site_id', site.id)
      .eq('email', body.email.toLowerCase().trim());
  }
  if (body.token) {
    await supabase.from('cohost_invites').delete().eq('token', body.token);
  }
  return NextResponse.json({ ok: true });
}
