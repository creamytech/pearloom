import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { saveSiteDraft } from '@/lib/db';
import { mirrorManifestPhotos, stripProxyUrls } from '@/lib/mirror-photos';

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

    // Match on site_config->>creator_email. saveSiteDraft +
    // publishSite + adoptSite all normalise to lowercase + trim on
    // write, so a plain `.eq()` against the lowercased session email
    // catches every site the user owns. The follow-up ilike pass
    // backstops legacy rows from before the normalisation landed —
    // if the eq query returns 0 rows we widen to a case-insensitive
    // match so an old "Foo@Bar.com" row still resolves.
    const sessionEmail = session.user.email.toLowerCase().trim();
    let { data, error } = await supabase
      .from('sites')
      .select('id, subdomain, ai_manifest, site_config, created_at, updated_at, published')
      .eq('site_config->>creator_email', sessionEmail)
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (!error && (!data || data.length === 0)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('sites')
        .select('id, subdomain, ai_manifest, site_config, created_at, updated_at, published')
        .ilike('site_config->>creator_email', sessionEmail)
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (!legacyError) {
        data = legacyData;
      }
    }

    // Log a one-line summary so production logs answer "did the query
    // find the user's sites?" without needing to attach a debugger.
    // Cheap and grep-able: `grep "[api/sites] list"`.
    console.log(`[api/sites] list email=${sessionEmail} count=${data?.length ?? 0}`);

    // Diagnostic safety net: if both queries returned 0 rows but the
    // service-role client can see ANY rows where the JSON extraction
    // matches a substring of the user's email, surface that in the
    // log so we can tell missing-data from broken-filter at a glance.
    if (!data || data.length === 0) {
      try {
        const { data: probe } = await supabase
          .from('sites')
          .select('id, subdomain, site_config')
          .limit(8);
        const probeRows = (probe ?? []) as Array<{ id: string; subdomain: string; site_config: Record<string, unknown> | null }>;
        const matches = probeRows
          .map((r) => ({
            id: r.id,
            subdomain: r.subdomain,
            owner: String((r.site_config as Record<string, unknown> | null)?.creator_email ?? ''),
          }))
          .filter((r) => r.owner.toLowerCase() === sessionEmail);
        if (matches.length > 0) {
          console.warn(
            `[api/sites] FILTER MISMATCH — ${matches.length} site(s) match in JS but not in SQL. Subdomains:`,
            matches.map((m) => m.subdomain).join(','),
          );
          // Fall back to the JS-side filter so the user gets their
          // sites even if the JSONB filter syntax isn't matching.
          const { data: allRows } = await supabase
            .from('sites')
            .select('id, subdomain, ai_manifest, site_config, created_at, updated_at, published')
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(200);
          const filtered = (allRows ?? []).filter((r) => {
            const owner = String((r.site_config as Record<string, unknown> | null)?.creator_email ?? '').toLowerCase().trim();
            return owner === sessionEmail;
          });
          if (filtered.length > 0) {
            data = filtered;
          }
        }
      } catch (probeErr) {
        console.warn('[api/sites] probe failed (non-fatal):', probeErr);
      }
    }

    if (error) {
      console.error('Database error fetching sites:', error);
      // Return empty list instead of 500 so the dashboard still renders
      return NextResponse.json({ sites: [], _error: error.message }, { status: 200 });
    }

    const mappedSites = data?.map(site => {
      const manifest = site.ai_manifest as Record<string, unknown> | null;
      const config = site.site_config as Record<string, unknown> | null;
      // Surface occasion at the top level so consumers don't have to
      // dig into manifest. Read order: manifest.occasion (canonical) →
      // site_config.occasion (legacy fallback for sites generated
      // before occasion landed on the manifest). Without this the
      // dashboard fell back to /sites/{slug} URLs whenever the
      // streaming generation failed to write the field.
      const occasion = (manifest?.occasion as string | undefined)
        ?? (config?.occasion as string | undefined)
        ?? null;
      return {
        id: site.id,
        domain: site.subdomain,
        occasion,
        manifest,
        created_at: site.created_at,
        updated_at: (site as Record<string, unknown>).updated_at as string | undefined,
        published: Boolean((site as Record<string, unknown>).published),
        // Ensure names is always an array
        names: Array.isArray(config?.names) ? config.names : ['', ''],
      };
    }) || [];

    return NextResponse.json({ sites: mappedSites }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sites:', error);
    // Return empty list so the UI degrades gracefully
    return NextResponse.json({ sites: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subdomain, manifest, names } = await req.json();
    if (!subdomain || !manifest) {
      return NextResponse.json({ error: 'Missing subdomain or manifest' }, { status: 400 });
    }

    // If the manifest carries a templateId, layer the rich template
    // (motifs, blockOrder, hiddenBlocks, theme fallback, poetry fallback)
    // so quick-start wizards get the signature feel, not just a palette.
    const templateId = typeof (manifest as { templateId?: unknown }).templateId === 'string'
      ? (manifest as { templateId: string }).templateId
      : null;
    if (templateId) {
      const { applyTemplateToManifest } = await import('@/lib/templates/apply-template');
      Object.assign(manifest, applyTemplateToManifest(manifest, templateId));
    }

    // Mirror every photo field (chapter images, coverPhoto,
    // heroSlideshow) to permanent storage so nothing in the saved
    // draft points at an expiring Google Picker baseUrl. Also
    // transparently unwraps any `/api/photos/proxy?url=…` wrappers
    // that were kept during the editing session. Failures fall back
    // to the stripped URL — never block the save.
    let manifestToSave = manifest;
    if (session.accessToken) {
      try {
        manifestToSave = await mirrorManifestPhotos(
          manifest,
          session.accessToken as string,
          subdomain,
        );
      } catch (err) {
        console.warn('[api/sites] Draft photo mirror failed (non-fatal):', err);
        manifestToSave = stripProxyUrls(manifest);
      }
    } else {
      // No OAuth session — still unwrap proxy wrappers so the DB
      // never holds a pointer at the editing session's ephemeral
      // photo proxy.
      manifestToSave = stripProxyUrls(manifest);
    }

    const result = await saveSiteDraft(
      session.user.email,
      subdomain,
      manifestToSave,
      names || ['', '']
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error saving site draft:', error);
    return NextResponse.json({ error: 'Failed to save site' }, { status: 500 });
  }
}
