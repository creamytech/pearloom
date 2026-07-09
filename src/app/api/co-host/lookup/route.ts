// ─────────────────────────────────────────────────────────────
// GET /api/co-host/lookup?email=&siteSlug=
//
// When a host types an invitee email while minting a co-host key,
// tell them whether that email already belongs to a Pearloom
// account — so they can invite a known user directly (who'll get
// an in-app notification + dashboard banner) instead of an
// email-to-create-an-account flow.
//
// Owner-gated: only the owner of the named site may probe, and
// only ever gets back { exists, displayName, avatar } for the one
// email they typed — never a list, never a search. This is the
// same disclosure the shipped "A familiar face" guest recognition
// already makes: a yes/no on an address the host already knows.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { ownerEmailOf } from '@/lib/cohost-access';
import { normalizePersonEmail } from '@/lib/people';

export const dynamic = 'force-dynamic';

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

  const email = normalizePersonEmail(req.nextUrl.searchParams.get('email') ?? '');
  const siteSlug = (req.nextUrl.searchParams.get('siteSlug') ?? '').trim();
  if (!email) return NextResponse.json({ exists: false });
  if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ exists: false });

  // Owner gate — the caller must own the site they're inviting to.
  const { data: site } = await supabase
    .from('sites')
    .select('creator_email, site_config')
    .eq('subdomain', siteSlug)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = ownerEmailOf(site as { creator_email?: string | null; site_config?: unknown });
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Inviting yourself is a no-op — don't claim "found".
  if (email === ownerEmail) {
    return NextResponse.json({ exists: false, self: true });
  }

  // An account exists if it has credentials OR a preferences row
  // (Google-OAuth accounts may only have the latter). Pull the
  // friendliest display name + avatar we have.
  const [{ data: cred }, { data: prefs }] = await Promise.all([
    supabase.from('account_credentials').select('display_name').eq('email', email).maybeSingle(),
    supabase.from('user_preferences').select('display_name, avatar').eq('email', email).maybeSingle(),
  ]);

  if (!cred && !prefs) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    displayName: (prefs?.display_name as string | null) ?? (cred?.display_name as string | null) ?? null,
    avatar: (prefs?.avatar as string | null) ?? null,
  });
}
