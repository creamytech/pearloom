// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/export/backup/route.ts
// GDPR data export — complete backup of all user data
// GET /api/export/backup
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // Rate limit by user email
    const rateCheck = checkRateLimit(`export-backup:${userEmail}`, RATE_LIMITS.dataExport);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const supabase = getSupabase();

    // Fetch all sites owned by the user
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, subdomain, ai_manifest, site_config, theme_override, created_at, updated_at')
      .contains('site_config', { creator_email: userEmail })
      .order('created_at', { ascending: false });

    if (sitesError) {
      console.error('[export/backup] Sites query error:', sitesError);
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
    }

    const siteRecords = sites || [];
    const siteIds = siteRecords.map((s: Record<string, unknown>) => s.id as string);

    // Fetch all related data across all user sites in parallel
    let allGuests: Record<string, unknown>[] = [];
    let allRsvps: Record<string, unknown>[] = [];
    let allVenues: Record<string, unknown>[] = [];
    let allRegistrySources: Record<string, unknown>[] = [];
    let allGuestPhotos: Record<string, unknown>[] = [];

    if (siteIds.length > 0) {
      const [
        { data: guests },
        { data: rsvps },
        { data: venues },
        { data: registrySources },
        { data: guestPhotos },
      ] = await Promise.all([
        supabase.from('guests').select('*').in('site_id', siteIds),
        supabase.from('rsvps').select('*').in('site_id', siteIds),
        supabase.from('venues').select('*').in('site_id', siteIds),
        supabase.from('registry_sources').select('*').in('site_id', siteIds),
        supabase.from('guest_photos').select('*').in('site_id', siteIds),
      ]);

      allGuests = guests || [];
      allRsvps = rsvps || [];
      allVenues = venues || [];
      allRegistrySources = registrySources || [];
      allGuestPhotos = guestPhotos || [];
    }

    // Fetch registry items for all sources
    const sourceIds = allRegistrySources.map((s: Record<string, unknown>) => s.id as string);
    let allRegistryItems: Record<string, unknown>[] = [];
    if (sourceIds.length > 0) {
      const { data } = await supabase
        .from('registry_items')
        .select('*')
        .in('source_id', sourceIds);
      allRegistryItems = data || [];
    }

    // Fetch user plan info
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('plan, stripe_customer_id, stripe_subscription_id, updated_at')
      .eq('user_email', userEmail)
      .maybeSingle();

    // Group related data by site for readability
    const sitesWithData = siteRecords.map((site: Record<string, unknown>) => {
      const id = site.id as string;
      return {
        id,
        subdomain: site.subdomain,
        manifest: site.ai_manifest,
        siteConfig: site.site_config,
        themeOverride: site.theme_override,
        createdAt: site.created_at,
        updatedAt: site.updated_at,
        guests: allGuests.filter((g: Record<string, unknown>) => g.site_id === id),
        rsvps: allRsvps.filter((r: Record<string, unknown>) => r.site_id === id),
        venues: allVenues.filter((v: Record<string, unknown>) => v.site_id === id),
        registry: {
          sources: allRegistrySources.filter((s: Record<string, unknown>) => s.site_id === id),
          items: allRegistryItems.filter((item: Record<string, unknown>) => {
            const itemSourceId = item.source_id as string;
            return allRegistrySources.some(
              (s: Record<string, unknown>) => s.id === itemSourceId && s.site_id === id,
            );
          }),
        },
        guestPhotos: allGuestPhotos.filter((p: Record<string, unknown>) => p.site_id === id),
      };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        email: userEmail,
        name: session.user.name || null,
        plan: userPlan || null,
      },
      sites: sitesWithData,
      totalSites: sitesWithData.length,
      totalGuests: allGuests.length,
      totalRsvps: allRsvps.length,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pearloom-backup-${dateStr}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[export/backup] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
