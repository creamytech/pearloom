import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { buildSiteUrl } from '@/lib/site-urls';
import { isSoloOccasion } from '@/lib/event-os/event-types';
import { resolveThemeFamily } from '@/lib/event-os/theme-family';
import { suiteThemeFromManifest } from '@/lib/suite/theme';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ domain: string }> }
): Promise<Metadata> {
  const { domain } = await params;
  const siteConfig = await getSiteConfig(domain);

  if (!siteConfig) return { title: 'Pearloom' };

  const names = Array.isArray(siteConfig.names) ? siteConfig.names : ['Together', 'Forever'];
  const displayNames = names.map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).filter(Boolean).join(' & ');

  const manifest = siteConfig.manifest;

  // Build title with names + date
  const eventDate = manifest?.logistics?.date;
  const venue = manifest?.logistics?.venue || manifest?.events?.[0]?.venue;
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const occasion = manifest?.occasion || 'wedding';
  const occasionLabel: Record<string, string> = {
    wedding: 'Wedding', anniversary: 'Anniversary',
    birthday: 'Birthday', engagement: 'Engagement', story: 'Story',
  };
  const shortTitle = `${displayNames} — ${occasionLabel[occasion] || 'Celebration'}`;
  const fullTitle = `${shortTitle} · Pearloom`;

  // Build description — prefer heroTagline, then first chapter description, then vibeString
  const vibeString = manifest?.vibeString || '';
  const heroTagline = manifest?.poetry?.heroTagline || '';
  const firstChapterDesc = manifest?.chapters?.[0]?.description || '';
  const chapterCount = manifest?.chapters?.length || 0;
  const occasionDescLabel: Record<string, string> = {
    wedding: 'wedding website', anniversary: 'anniversary celebration',
    birthday: 'birthday celebration', engagement: 'engagement celebration', story: 'personal story site',
  };
  const description = heroTagline
    ? `${displayNames} — ${heroTagline.slice(0, 150)}${heroTagline.length > 150 ? '...' : ''}`
    : firstChapterDesc
    ? `${displayNames}'s story — ${firstChapterDesc.slice(0, 140)}${firstChapterDesc.length > 140 ? '...' : ''}`
    : vibeString
    ? `${displayNames}'s love story — ${vibeString.slice(0, 120)}${vibeString.length > 120 ? '...' : ''}`
    : `${displayNames}'s ${occasionDescLabel[occasion] || 'wedding website'}. ${chapterCount} chapters of their story.`;

  // House-default OG colors. Sites with real theme data get their
  // exact look from the suite-contract block below; this fallback
  // only fires for manifests with no theme at all. (vibeSkin —
  // the old AI design layer — was deleted 2026-06-12; a prod
  // check found zero rows carrying it.)
  const ogFallback = {
    background: '#F5EFE2', foreground: '#0E0D0B', accent: '#5C6B3F',
    heading: 'Fraunces', symbol: '✦',
  };
  const tagline = manifest?.poetry?.heroTagline || siteConfig.tagline || vibeString || '';

  const siteUrl = buildSiteUrl(domain, '', undefined, manifest?.occasion);

  // Build themed OG image URL with full palette & font info.
  // Solo occasions (birthday, memorial, graduation, etc.) pass
  // only the first honoree — the OG route centres a single name
  // without the "&" glyph. Canonical list: lib/event-os/solo-occasions.ts.
  const ogIsSolo = isSoloOccasion(occasion);
  const ogUrl = new URL('/api/og', siteUrl);
  ogUrl.searchParams.set(
    'names',
    ogIsSolo ? names[0] : `${names[0]},${names[1]}`,
  );
  ogUrl.searchParams.set('occasion', occasion);
  // Theme family drives the OG card layout (warm blob + radial
  // for groove, double frame + corner flourishes for editorial).
  ogUrl.searchParams.set('family', resolveThemeFamily(manifest));
  // Site Edition — adds Edition-specific chrome on top of the
  // family (Cinema: letterbox bars; Linen Folder: gold hairlines;
  // others: editorial frame). See /api/og/route.tsx.
  if (manifest?.edition) {
    ogUrl.searchParams.set('edition', manifest.edition);
  }
  ogUrl.searchParams.set('date', eventDate || '');
  ogUrl.searchParams.set('tagline', tagline);
  ogUrl.searchParams.set('bg', ogFallback.background.replace('#', ''));
  ogUrl.searchParams.set('fg', ogFallback.foreground.replace('#', ''));
  ogUrl.searchParams.set('accent', ogFallback.accent.replace('#', ''));
  ogUrl.searchParams.set('heading', ogFallback.heading);
  ogUrl.searchParams.set('symbol', ogFallback.symbol);
  // Include the couple's cover photo so social shares show their face,
  // not just a card. Only forward absolute https URLs (Satori restriction).
  const ogPhotoCandidate = manifest?.coverPhoto || manifest?.chapters?.[0]?.images?.[0]?.url || '';
  if (ogPhotoCandidate.startsWith('https://')) {
    ogUrl.searchParams.set('photo', ogPhotoCandidate);
  }

  // ── Suite contract (docs/SUITE-STRATEGY.md §6) ──────────────────
  // When the manifest carries real theme data (a Theme-Store pack's
  // --t-* var bag or wizard/editor theme.colors / theme.fonts), the
  // share card wears the couple's exact look: paper / ink / accent /
  // gold + display face. Sites without that data keep the legacy
  // vibeSkin params untouched — zero regression on existing cards.
  if (manifest) {
    const suite = suiteThemeFromManifest(manifest, [names[0] ?? '', names[1] ?? '']);
    const manifestTheme = (manifest as unknown as Record<string, unknown>).theme as
      | { colors?: unknown; fonts?: unknown }
      | undefined;
    const hasSuiteTheme = Boolean(
      (manifest.themeVars && Object.keys(manifest.themeVars).length > 0) ||
        manifestTheme?.colors ||
        manifestTheme?.fonts,
    );
    if (hasSuiteTheme) {
      const hx = (h: string) => h.replace('#', '');
      ogUrl.searchParams.set('paper', hx(suite.palette.paper));
      ogUrl.searchParams.set('ink', hx(suite.palette.ink));
      ogUrl.searchParams.set('accent', hx(suite.palette.accent));
      ogUrl.searchParams.set('gold', hx(suite.palette.gold));
      ogUrl.searchParams.set('font', suite.fonts.displayFamily.slice(0, 60));
    }
    // Motif glyph forwards independently — it only renders when the
    // OG route recognizes the id, so it's safe on legacy cards too.
    if (suite.motif && suite.motif !== 'none') {
      ogUrl.searchParams.set('motif', suite.motif);
    }
  }

  return {
    metadataBase: new URL('https://pearloom.com'),
    title: fullTitle,
    description,
    alternates: {
      canonical: siteUrl,
    },
    // Per-site PWA manifest — installs to home screen as the couple's
    // site, not Pearloom. The route is at /sites/<domain>/manifest.webmanifest.
    manifest: `/sites/${domain}/manifest.webmanifest`,
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title: shortTitle,
      description,
      url: siteUrl,
      siteName: 'Pearloom',
      type: 'website',
      images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: `${displayNames}${dateStr ? ` — ${dateStr}` : ''}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shortTitle,
      description,
      images: [ogUrl.toString()],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}



// ── Helpers ───────────────────────────────────────────────────

/** Proxy Google Photos URLs through /api/photos/proxy so they load publicly */
function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('lh3.google')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

function getVideoEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&showinfo=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`;
  return null;
}

export default async function SubdomainSite({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Wait for params as standard in NextJS App Router
  const { domain } = await params;
  const sp = await searchParams;

  // Query Supabase via our DB layer bypassing RLS securely because this is a Server Component!
  const siteConfig = await getSiteConfig(domain);

  // If no subdomain matches in the SaaS database, render 404
  if (!siteConfig || !siteConfig.manifest) {
    return notFound();
  }

  // Apply per-locale translations from manifest.translations[locale]
  // when ?lang=xx is set. Browser-language fallback is intentionally
  // NOT applied server-side — guests on a French Mac viewing a couple's
  // English wedding site should still see English unless the host
  // explicitly chose a default locale (manifest.activeLocale).
  const requestedLocale = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? siteConfig.manifest.activeLocale;
  const { applyLocale } = await import('@/lib/i18n/apply-locale');
  const manifest = applyLocale(siteConfig.manifest, requestedLocale ?? null);

  // v8 is the only renderer now. Every published Pearloom site —
  // whether generated by the wizard, created in the editor, or
  // migrated from older drafts — renders through ThemedSiteRenderer so
  // what you publish matches what you built in the canvas.
  // (Older manifests may carry rendererVersion='v2' / 'classic';
  // we ignore it and render v8 regardless.)
  {
    const { PublishedSiteShell } = await import('@/components/pearloom/site/PublishedSiteShell');
    const { formatSiteDisplayUrl, normalizeOccasion } = await import('@/lib/site-urls');
    const names = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
      ? ([siteConfig.names[0], siteConfig.names[1]] as [string, string])
      : (['Our', 'Story'] as [string, string]);
    const prettyUrl = formatSiteDisplayUrl(domain, '', normalizeOccasion(manifest.occasion));
    // Read the site owner's email from the raw site_config JSON so
    // the OwnerEditPill can compare it against the visitor's session
    // and surface the "Edit" affordance only to the host. Field isn't
    // typed on SiteConfig, so coerce through Record<string, unknown>.
    const creatorEmail = ((siteConfig as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
    // Multi-page mode: home page should only render homePageBlocks
    // (default: story + gallery). All other sections live on their
    // own routes at /{occasion}/{slug}/{block}. ThemedSiteRenderer
    // honours pageFilter='home' to filter blockOrder accordingly.
    const { readSiteMode } = await import('@/lib/site-mode');
    const siteMode = readSiteMode(manifest);

    /* ── "Who's going" social proof — REAL guests only ──────────
       The RSVP section's avatar pile never invents names; without
       this stamp it simply didn't render on published sites. When
       the pile is enabled (occasion default or explicit
       rsvpShowGoing), pull attending first names (≤8) + the true
       count and ride them on the manifest as goingPreview /
       goingCount. One indexed read, only when enabled. */
    {
      const loose = manifest as unknown as { occasion?: string; rsvpShowGoing?: boolean; goingPreview?: string[]; goingCount?: number };
      const PUBLIC_RSVP_OCCASIONS = new Set([
        'bachelor-party', 'bachelorette-party', 'bridal-shower', 'baby-shower',
        'reunion', 'milestone-birthday', 'birthday', 'sweet-sixteen',
        'engagement', 'housewarming', 'gender-reveal', 'sip-and-see',
      ]);
      const pileEnabled = loose.rsvpShowGoing ?? PUBLIC_RSVP_OCCASIONS.has(loose.occasion ?? 'wedding');
      if (pileEnabled) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const siteId = (siteConfig as unknown as Record<string, unknown>).id ?? (siteConfig as unknown as Record<string, unknown>).site_id;
          if (url && key && siteId) {
            const sb = createClient(url, key);
            const { data: going, count } = await sb
              .from('guests')
              .select('name', { count: 'exact' })
              .eq('site_id', String(siteId))
              .eq('status', 'attending')
              .order('responded_at', { ascending: false })
              .limit(8);
            const names8 = (going ?? [])
              .map((g) => String(g.name ?? '').trim().split(/\s+/)[0])
              .filter(Boolean);
            if (names8.length > 0) {
              loose.goingPreview = names8;
              loose.goingCount = count ?? names8.length;
            }
          }
        } catch { /* the pile just stays hidden */ }
      }
    }
    // ── LCP preload ──────────────────────────────────────────────
    // The hero/cover photo is the largest contentful paint on most
    // sites. Emitting <link rel="preload"> in the initial HTML lets
    // the browser's preload scanner kick the fetch off before it has
    // even parsed the CSS that references the URL via background-
    // image. Drops first-meaningful-paint on cold loads measurably.
    // Only inserted when we have a usable absolute URL — preloading
    // a relative /api/ proxy would just race with the renderer's own
    // fetch and waste bandwidth.
    const heroPreloadUrl = (() => {
      const cover = (manifest as unknown as { coverPhoto?: string }).coverPhoto;
      if (cover && /^https?:\/\//i.test(cover)) return cover;
      const firstChapter = manifest?.chapters?.[0]?.images?.[0]?.url;
      if (firstChapter && /^https?:\/\//i.test(firstChapter)) return firstChapter;
      return null;
    })();
    /* Event structured data (SEO pass 2026-07-08) — names, date,
       and venue are already at hand; the schema makes published
       sites eligible for event rich results. Only emitted when a
       real date exists; solemn occasions (memorial/funeral) stay
       plain out of respect for what a "rich result" implies. */
    const eventJsonLd = (() => {
      const loose = manifest as unknown as {
        occasion?: string;
        coverPhoto?: string;
        logistics?: { date?: string; venue?: string; venueAddress?: string };
      };
      const occ = loose.occasion ?? 'wedding';
      if (occ === 'memorial' || occ === 'funeral') return null;
      const date = loose.logistics?.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const displayNames = names.filter(Boolean).join(' & ');
      if (!displayNames) return null;
      const occLabel = occ.replace(/-/g, ' ');
      return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: `${displayNames} — ${occLabel}`,
        startDate: date,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        ...(loose.logistics?.venue
          ? {
              location: {
                '@type': 'Place',
                name: loose.logistics.venue,
                ...(loose.logistics.venueAddress ? { address: loose.logistics.venueAddress } : {}),
              },
            }
          : {}),
        ...(loose.coverPhoto && /^https?:/i.test(loose.coverPhoto) ? { image: [loose.coverPhoto] } : {}),
        organizer: { '@type': 'Person', name: displayNames },
        url: prettyUrl.startsWith('http') ? prettyUrl : `https://${prettyUrl}`,
      };
    })();

    return (
      <>
        {eventJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
          />
        )}
        {heroPreloadUrl && (
          <link
            rel="preload"
            as="image"
            href={heroPreloadUrl}
            fetchPriority="high"
          />
        )}
        <PublishedSiteShell
          manifest={manifest}
          names={names}
          siteSlug={domain}
          prettyUrl={prettyUrl}
          creatorEmail={creatorEmail}
          pageFilter={siteMode === 'multi-page' ? 'home' : undefined}
        />
      </>
    );
  }
}

