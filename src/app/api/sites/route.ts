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

    // Match on site_config->>creator_email. Two reasons not to
    // tighten this further:
    //   - ILIKE is case-insensitive, which fixes the "Foo@bar.com"
    //     vs "foo@bar.com" sign-in casing variance.
    //   - The stored value is normalised on every editor open (see
    //     adoptSite in lib/db.ts) and on every save (saveSiteDraft),
    //     so trim/case mismatches self-heal the next time the user
    //     edits or saves.
    const sessionEmail = session.user.email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('sites')
      .select('id, subdomain, ai_manifest, site_config, created_at, updated_at, published')
      .filter('site_config->>creator_email', 'ilike', sessionEmail)
      .order('updated_at', { ascending: false, nullsFirst: false });

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
