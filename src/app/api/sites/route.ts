import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Force this route to always be server-rendered (never statically collected)
export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role for RLS bypass; fall back to public key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      // Missing env vars — return empty list rather than crashing the dashboard
      console.warn('[api/sites] Supabase not configured — returning empty sites list');
      return NextResponse.json({ sites: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('sites')
      .select('id, subdomain, ai_manifest, site_config, created_at')
      .contains('site_config', { creator_email: session.user.email })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching sites:', error);
      // Return empty list instead of 500 so the dashboard still renders
      return NextResponse.json({ sites: [], _error: error.message }, { status: 200 });
    }

    const mappedSites = data?.map(site => ({
      id: site.id,
      domain: site.subdomain,
      manifest: site.ai_manifest,
      created_at: site.created_at,
      // Ensure names is always an array
      names: Array.isArray((site.site_config as Record<string, unknown>)?.names)
        ? (site.site_config as Record<string, unknown>).names
        : ['', ''],
    })) || [];

    return NextResponse.json({ sites: mappedSites }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sites:', error);
    // Return empty list so the UI degrades gracefully
    return NextResponse.json({ sites: [] }, { status: 200 });
  }
}
