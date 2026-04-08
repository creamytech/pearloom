// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/export/site/route.ts
// GDPR data export — download complete site manifest as JSON
// GET /api/export/site?siteId=xxx
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by user email
    const rateCheck = checkRateLimit(`export-site:${session.user.email}`, RATE_LIMITS.dataExport);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId query parameter required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch site and verify ownership
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, subdomain, ai_manifest, site_config, theme_override, created_at, updated_at')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
    if (ownerEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch related data for a complete export
    const [
      { data: guests },
      { data: rsvps },
      { data: venues },
      { data: registrySources },
      { data: guestPhotos },
    ] = await Promise.all([
      supabase.from('guests').select('*').eq('site_id', siteId),
      supabase.from('rsvps').select('*').eq('site_id', siteId),
      supabase.from('venues').select('*').eq('site_id', siteId),
      supabase.from('registry_sources').select('*').eq('site_id', siteId),
      supabase.from('guest_photos').select('*').eq('site_id', siteId),
    ]);

    // Fetch registry items for each source
    const sourceIds = (registrySources || []).map((s: Record<string, unknown>) => s.id as string);
    let registryItems: Record<string, unknown>[] = [];
    if (sourceIds.length > 0) {
      const { data } = await supabase
        .from('registry_items')
        .select('*')
        .in('source_id', sourceIds);
      registryItems = data || [];
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      site: {
        id: site.id,
        subdomain: site.subdomain,
        manifest: site.ai_manifest,
        siteConfig: site.site_config,
        themeOverride: site.theme_override,
        createdAt: site.created_at,
        updatedAt: site.updated_at,
      },
      guests: guests || [],
      rsvps: rsvps || [],
      venues: venues || [],
      registry: {
        sources: registrySources || [],
        items: registryItems,
      },
      guestPhotos: guestPhotos || [],
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pearloom-site-${site.subdomain}-${dateStr}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[export/site] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
