// ─────────────────────────────────────────────────────────────
// GET /api/co-host/invitations
//
// The invitee side of co-hosting. Returns the pending co-host
// invitations addressed to the logged-in user's email — so a host
// who's already on Pearloom sees a dashboard banner + notification
// to accept, instead of having to dig the email out of their inbox.
//
// Matches on invited_email (the address the inviter typed), still
// pending (accepted_at IS NULL) and unexpired. Joins each invite to
// its site's display name. Session-scoped — a user only ever sees
// invitations addressed to their own email.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  editor: 'co-editor',
  'guest-manager': 'guest manager',
  viewer: 'viewer',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ invitations: [] });
  }
  const email = session.user.email.toLowerCase().trim();

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ invitations: [] });

  const nowIso = new Date().toISOString();
  const { data: invites, error } = await supabase
    .from('cohost_invites')
    .select('token, site_id, role, invited_by, note, created_at, expires_at')
    .ilike('invited_email', email)
    .is('accepted_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !invites || invites.length === 0) {
    return NextResponse.json({ invitations: [] });
  }

  // Resolve site display names in one query.
  const siteIds = [...new Set(invites.map((i) => String(i.site_id)))];
  const { data: sites } = await supabase
    .from('sites')
    .select('id, subdomain, site_config, ai_manifest')
    .in('id', siteIds);
  const siteById = new Map<string, { subdomain: string; names: string[]; occasion: string | null }>();
  for (const s of sites ?? []) {
    const cfg = s.site_config as { names?: unknown; occasion?: string } | null;
    const manifest = s.ai_manifest as { occasion?: string } | null;
    siteById.set(String(s.id), {
      subdomain: String(s.subdomain),
      names: Array.isArray(cfg?.names) ? (cfg!.names as string[]).filter(Boolean) : [],
      occasion: manifest?.occasion ?? cfg?.occasion ?? null,
    });
  }

  const invitations = invites.map((i) => {
    const site = siteById.get(String(i.site_id));
    const siteName = site && site.names.length > 0 ? site.names.join(' & ') : site?.subdomain ?? 'a celebration';
    return {
      token: String(i.token),
      role: String(i.role),
      roleLabel: ROLE_LABELS[String(i.role)] ?? String(i.role),
      invitedBy: String(i.invited_by ?? ''),
      note: (i.note as string | null) ?? null,
      siteName,
      siteSlug: site?.subdomain ?? null,
      occasion: site?.occasion ?? null,
      expiresAt: String(i.expires_at),
    };
  });

  return NextResponse.json({ invitations });
}
