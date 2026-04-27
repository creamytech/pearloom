import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await params;
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Resolve as either UUID or subdomain. The dashboard routes
    // per-site pages by UUID (because the slug is mutable) but the
    // editor + share links use the slug — both must hit the same row.
    const SELECT = 'id, subdomain, ai_manifest, site_config, created_at, updated_at';
    const lookupColumn = UUID_RE.test(domain) ? 'id' : 'subdomain';
    const { data: site, error } = await supabase
      .from('sites')
      .select(SELECT)
      .eq(lookupColumn, domain)
      .maybeSingle();

    if (error) {
      console.error('[api/sites/[domain]] GET error:', error);
      return NextResponse.json({ error: 'Could not load site' }, { status: 500 });
    }
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Owner-only — every consumer of this endpoint is a host
    // dashboard that needs ownership-confirmed data. Normalise both
    // sides before compare to dodge the IdP casing variance that
    // already bit publish/delete.
    const config = (site as { site_config?: Record<string, unknown> | null }).site_config ?? null;
    const sessionEmail = session.user.email.toLowerCase().trim();
    const owner = String(config?.creator_email ?? '').toLowerCase().trim();
    if (owner && owner !== sessionEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const manifest = (site as { ai_manifest?: Record<string, unknown> | null }).ai_manifest ?? null;
    return NextResponse.json({
      id: (site as { id: string }).id,
      domain: (site as { subdomain: string }).subdomain,
      occasion: (manifest?.occasion as string | undefined)
        ?? (config?.occasion as string | undefined)
        ?? null,
      names: Array.isArray(config?.names) ? config.names : ['', ''],
      eventDate: (manifest as { logistics?: { date?: string } } | null)?.logistics?.date ?? null,
      published: Boolean(manifest?.published),
      manifest,
      created_at: (site as { created_at?: string }).created_at,
      updated_at: (site as { updated_at?: string }).updated_at,
    });
  } catch (err) {
    console.error('[api/sites/[domain]] GET unexpected:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await params;
    // Normalize: stored creator_email is always lowercased + trimmed
    // by saveSiteDraft / publishSite / adoptSite. The session email
    // comes back from NextAuth in whatever case the IdP returned —
    // for Google that's the user's casing at signup. Comparing raw
    // strings rejected the owner whenever those differed (e.g.
    // "Foo@Gmail.com" session vs "foo@gmail.com" stored), which is
    // exactly the symptom the user just reported.
    const userEmail = session.user.email.toLowerCase().trim();
    const supabase = getSupabase();

    if (!supabase) {
      console.error('[Delete] Supabase not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    console.log('[Delete] Attempting delete:', { domain, userEmail });

    // Fetch the row — use service role so RLS doesn't block the read.
    // Accept either UUID or subdomain so the dashboard's UUID-keyed
    // routes (/dashboard/event/[id]) can call DELETE without an
    // extra lookup hop.
    const lookupColumn = UUID_RE.test(domain) ? 'id' : 'subdomain';
    const { data: site, error: fetchErr } = await supabase
      .from('sites')
      .select('id, subdomain, site_config')
      .eq(lookupColumn, domain)
      .maybeSingle();

    if (fetchErr) {
      console.error('[Delete] Fetch error:', fetchErr);
      return NextResponse.json({ error: 'Could not verify site ownership' }, { status: 500 });
    }

    if (!site) {
      // Already gone — treat as success so UI stays in sync
      console.log('[Delete] Site not found, treating as already deleted');
      return NextResponse.json({ success: true });
    }

    // Ownership check — only block if a creator_email is set AND it doesn't match
    const rawOwner = (site.site_config as Record<string, unknown>)?.creator_email as string | undefined;
    const ownerEmail = rawOwner?.toLowerCase().trim();
    if (ownerEmail && ownerEmail !== userEmail) {
      console.warn('[Delete] Ownership mismatch:', { ownerEmail, userEmail });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete by primary key so we never accidentally drop multiple
    // rows if two ever shared a subdomain (shouldn't happen but the
    // service-role client doesn't care about uniqueness constraints
    // until they're actually defined).
    const { error: deleteErr } = await supabase
      .from('sites')
      .delete()
      .eq('id', site.id);

    if (deleteErr) {
      console.error('[Delete] Delete error:', deleteErr);
      return NextResponse.json({ error: `Delete failed: ${deleteErr.message}` }, { status: 500 });
    }

    console.log('[Delete] ✓ Deleted:', site.subdomain);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Delete] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
