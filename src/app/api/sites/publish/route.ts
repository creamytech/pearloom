import { NextRequest, NextResponse } from 'next/server';
import { publishSite } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ownerEmailOf } from '@/lib/cohost-access';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
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
          .select('creator_email, site_config')
          .eq('subdomain', cleanSubdomain)
          .maybeSingle();
        // Compare normalised — saveSiteDraft / publishSite store
        // creator_email lowercased + trimmed; the session email comes
        // back in whatever case the IdP supplied. Without
        // normalisation the owner gets 403'd whenever Google returns
        // their email with different casing than was stored.
        // ownerEmailOf reads the top-level column with the
        // site_config JSON fallback — the column-only read was
        // empty on post-backfill sites, which made this gate
        // FAIL-OPEN (any logged-in user could publish them).
        const storedOwner = ownerEmailOf(existing);
        const requestUser = session.user.email.toLowerCase().trim();
        if (storedOwner && storedOwner !== requestUser) {
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
    // ── Pack paywall — try-before-you-buy's other half. Unowned
    //    paid packs may be worn on drafts; PUBLISH is the gate.
    //    Fails open on lookup errors (publishing is never lost to
    //    a flaky gate query; the client gate still stands).
    try {
      const packId = (manifest as { appliedPackId?: string }).appliedPackId ?? null;
      if (packId) {
        const { getPackById } = await import('@/lib/theme-store/packs');
        const pack = getPackById(packId);
        if (pack && pack.priceCents > 0) {
          const { userOwnsPack } = await import('@/lib/theme-store/entitlements');
          const owns = await userOwnsPack(session.user.email, packId);
          if (!owns) {
            return NextResponse.json({
              error: `This site is wearing ${pack.name} — unlock it to publish, or switch to a free look in the Theme panel.`,
              packGate: { id: pack.id, name: pack.name, priceCents: pack.priceCents },
            }, { status: 402 });
          }
        }
      }
    } catch (packGateErr) {
      console.warn('[publish] pack gate check failed (failing open):', packGateErr);
    }

        let persistManifest: StoryManifest = manifest;
    if (session.accessToken) {
      console.log('[Publish API] Mirroring photos to permanent storage...');
      persistManifest = await mirrorManifestPhotos(
        manifest,
        session.accessToken as string,
        cleanSubdomain,
      );
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

    /* "It's pressed." — the FIRST publish earns a confirmation
       email (email audit 2026-07-08: the moment previously passed
       in silence). First-ness is judged by published_at being
       unset before this request; re-publishes stay quiet. Themed
       through the site's own suite; fire-and-forget. */
    void (async () => {
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;
        const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl2 || !serviceKey2) return;
        const sb2 = createClient(supabaseUrl2, serviceKey2);
        const { data: row } = await sb2
          .from('sites')
          .select('published_at, created_at')
          .eq('subdomain', cleanSubdomain)
          .maybeSingle();
        const publishedAt = (row as { published_at?: string | null } | null)?.published_at;
        const createdAt = (row as { created_at?: string | null } | null)?.created_at;
        // First publish: the stamp was just written (within this
        // minute) or never diverged from creation. A prior stamp
        // older than 2 minutes = a re-publish; stay quiet.
        if (publishedAt && Date.now() - new Date(publishedAt).getTime() > 2 * 60 * 1000) return;
        void createdAt;
        const displayNames = (names ?? []).filter(Boolean).join(' & ') || cleanSubdomain;
        const { emailLayout, button, emailThemeFromSuite } = await import('@/lib/email-sequences');
        const { suiteThemeFromManifest } = await import('@/lib/suite/theme');
        let theme;
        try {
          theme = emailThemeFromSuite(suiteThemeFromManifest(persistManifest, [names?.[0] ?? '', names?.[1] ?? '']));
        } catch { /* brand default */ }
        const escT = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = emailLayout(`
          <tr><td style="padding:44px 36px 0;text-align:center">
            <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;opacity:0.75">Hot off the press</p>
            <h1 style="font-size:32px;font-weight:400;font-style:italic;margin:0 0 10px;line-height:1.2">It&rsquo;s pressed.</h1>
            <p style="font-size:15px;line-height:1.7;margin:0 0 6px">
              ${escT(displayNames)} is live. Every guest link now opens the
              real thing — sealed envelope, your look, your words.
            </p>
            <p style="font-size:13px;margin:0;opacity:0.8">${escT(finalUrl)}</p>
          </td></tr>
          <tr><td style="padding:22px 36px 12px;text-align:center">
            ${button('Open the site', finalUrl, theme)}
          </td></tr>
          <tr><td style="padding:0 36px 40px;text-align:center">
            <p style="font-size:13.5px;margin:0;opacity:0.8">
              Next thread: <a href="${origin}/dashboard/rsvp" style="text-decoration:underline;color:inherit">invite your guests</a> —
              each one gets an envelope with their name on it.
            </p>
          </td></tr>
        `, theme);
        const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail,
            to: [session?.user?.email ?? ''].filter(Boolean),
            subject: `It’s pressed — ${displayNames} is live`,
            html,
          }),
        }).catch((e) => console.warn('[publish] confirmation email failed (non-fatal):', e));
      } catch (err) {
        console.warn('[publish] confirmation email failed (non-fatal):', err);
      }
    })();

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
