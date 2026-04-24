import { NextRequest, NextResponse } from 'next/server';
import { publishSite } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
import { generateVibeSkin } from '@/lib/vibe-engine';
import { mirrorManifestPhotos } from '@/lib/mirror-photos';
import { buildSiteUrl } from '@/lib/site-urls';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subdomain, manifest, names } = body;

    console.log('[Publish API] Request:', { 
      subdomain, 
      hasManifest: !!manifest,
      hasNames: !!names,
      email: session.user.email 
    });

    if (!subdomain || !manifest) {
      return NextResponse.json({
        error: `Missing required fields: subdomain=${!!subdomain}, manifest=${!!manifest}`
      }, { status: 400 });
    }

    // Format subdomain purely to be safe (no spaces, lowercase, etc)
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Co-host role gate — only the site owner can publish.
    // If the subdomain doesn't exist yet, anyone logged in can claim it.
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const sb = createClient(url, key);
        const { data: existing } = await sb
          .from('sites')
          .select('creator_email')
          .eq('subdomain', cleanSubdomain)
          .maybeSingle();
        if (existing && existing.creator_email && existing.creator_email !== session.user.email) {
          return NextResponse.json(
            { error: 'Only the site owner can publish. Ask the owner to do it.' },
            { status: 403 },
          );
        }
      }
    } catch (err) {
      console.warn('[Publish API] Role check skipped:', err);
    }

    if (cleanSubdomain.length < 3) {
      return NextResponse.json({ error: 'Subdomain must be at least 3 characters' }, { status: 400 });
    }
    if (cleanSubdomain.length > 63) {
      return NextResponse.json({ error: 'Subdomain too long (max 63 characters)' }, { status: 400 });
    }
    if (/^-|-$/.test(cleanSubdomain)) {
      return NextResponse.json({ error: 'Subdomain cannot start or end with a hyphen' }, { status: 400 });
    }
    const RESERVED = new Set(['api', 'admin', 'www', 'mail', 'ftp', 'support', 'billing', 'app', 'dashboard', 'editor', 'preview', 'sites', 'status', 'health']);
    if (RESERVED.has(cleanSubdomain)) {
      return NextResponse.json({ error: 'That subdomain is reserved. Please choose another.' }, { status: 400 });
    }

    // Mirror every photo field (chapters, coverPhoto, heroSlideshow)
    // to permanent storage before persisting. `mirrorManifestPhotos`
    // also transparently unwraps any `/api/photos/proxy?url=…`
    // wrappers that were kept in the draft during the editing session.
    let persistManifest: StoryManifest = manifest;
    if (session.accessToken) {
      console.log('[Publish API] Mirroring photos to permanent storage...');
      persistManifest = await mirrorManifestPhotos(
        manifest,
        session.accessToken as string,
        cleanSubdomain,
      );
    }

    // Generate AI vibe skin (unless already cached)
    if (!persistManifest.vibeSkin || !persistManifest.vibeSkin.aiGenerated) {
      console.log('[Publish API] Generating AI vibe skin...');
      const vibeSkin = await generateVibeSkin(
        persistManifest.vibeString,
        process.env.GEMINI_API_KEY,
        names as [string, string],
        undefined,
        persistManifest.occasion
      );
      persistManifest = { ...persistManifest, vibeSkin };
      console.log(`[Publish API] Vibe skin generated: ${vibeSkin.tone} / ${vibeSkin.curve} / aiGenerated=${vibeSkin.aiGenerated}`);
    }

    // Pass the tuple of names to the DB upsert
    const { success, error } = await publishSite(
      session.user.email, 
      cleanSubdomain, 
      persistManifest, 
      names || ['', '']
    );

    if (!success) {
      return NextResponse.json({ error: error || 'Failed to publish' }, { status: 400 });
    }

    // Build the canonical published URL using the centralized helper.
    // This always produces path-based URLs (pearloom.com/sites/<slug>)
    // regardless of how the API request arrived.
    const host = req.headers.get('host') || 'localhost:3000';
    const origin = process.env.NEXT_PUBLIC_SITE_URL
      || (host.includes('localhost') ? `http://${host}` : `https://${host}`);
    // Always emit an occasion-prefixed URL. Default to 'wedding' so
    // pre-v2026 manifests (no occasion field) still land at
    // /wedding/<slug> rather than the legacy /sites/<slug>.
    const { normalizeOccasion } = await import('@/lib/site-urls');
    const resolvedOccasion = normalizeOccasion(
      (persistManifest as { occasion?: string } | null)?.occasion,
    );
    const finalUrl = buildSiteUrl(cleanSubdomain, '', origin, resolvedOccasion);

    // Generate a preview token and store it alongside the published site
    let previewToken: string | null = null;
    try {
      const token = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        const previewSupabase = createClient(supabaseUrl, serviceKey);
        const { error: tokenError } = await previewSupabase
          .from('preview_tokens')
          .insert({
            token,
            site_id: cleanSubdomain,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            manifest: persistManifest,
          });

        if (!tokenError) {
          previewToken = token;
        } else {
          console.warn('[Publish API] Preview token insert skipped:', tokenError.message);
        }

        // Store vibe tags in the sites table if the column exists
        if (persistManifest.vibeTags?.length) {
          await previewSupabase
            .from('sites')
            .update({ vibe_tags: persistManifest.vibeTags })
            .eq('subdomain', cleanSubdomain)
            .then(({ error: tagsError }) => {
              if (tagsError) {
                console.warn('[Publish API] Vibe tags update skipped:', tagsError.message);
              }
            });
        }
      }
    } catch (tokenErr) {
      console.warn('[Publish API] Preview token generation error (non-fatal):', tokenErr);
    }

    const protocol = host.includes('localhost') ? 'http' : 'https';
    const previewUrl = previewToken ? `${protocol}://${host}/preview/${previewToken}` : null;

    return NextResponse.json({ success: true, url: finalUrl, previewToken, previewUrl });

  } catch (err: unknown) {
    console.error('Publishing API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
