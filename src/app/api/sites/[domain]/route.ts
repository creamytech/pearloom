import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
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
    const userEmail = session.user.email;
    const supabase = getSupabase();

    console.log('[Delete] Attempting delete:', { domain, userEmail });

    // Fetch the row — use service role so RLS doesn't block the read
    const { data: site, error: fetchErr } = await supabase
      .from('sites')
      .select('id, site_config')
      .eq('subdomain', domain)
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
    const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email as string | undefined;
    if (ownerEmail && ownerEmail !== userEmail) {
      console.warn('[Delete] Ownership mismatch:', { ownerEmail, userEmail });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the site
    const { error: deleteErr } = await supabase
      .from('sites')
      .delete()
      .eq('subdomain', domain);

    if (deleteErr) {
      console.error('[Delete] Delete error:', deleteErr);
      return NextResponse.json({ error: `Delete failed: ${deleteErr.message}` }, { status: 500 });
    }

    console.log('[Delete] ✓ Deleted:', domain);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
