import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { readSiteMode } from '@/lib/site-mode';

// ─────────────────────────────────────────────────────────────
// [domain]/[page] — Sub-page router (v8)
//
// In multi-page mode (manifest.siteMode === 'multi-page'), each
// non-home block renders here as a focused single-block view —
// nav and footer included, hero replaced with an editorial sub-
// page header. Same v8 renderer, just filtered.
//
// Routes:
//   /story    → Story block
//   /schedule → Schedule block
//   /travel   → Travel block
//   /registry → Registry block
//   /gallery  → Gallery block
//   /faq      → FAQ block
//   /rsvp     → RSVP block
//
// Legacy:
//   /venue → redirected to /travel (v8 merges venue into travel)
//   custom slugs → 404. The customPages renderer was deleted
//   2026-06-12 after a production check found zero rows carrying
//   customPages — nothing can author them anymore either.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';


const V8_PAGE_KEYS = ['story', 'schedule', 'travel', 'registry', 'gallery', 'faq', 'rsvp'] as const;
type V8PageKey = typeof V8_PAGE_KEYS[number];

const PAGE_META: Record<V8PageKey, { title: string; description: string }> = {
  story:    { title: 'Our Story',     description: 'How we got here, chapter by chapter.' },
  schedule: { title: 'Schedule',      description: 'Our day — every moment that brings us together.' },
  travel:   { title: 'Travel',        description: 'Hotels, airports, and directions.' },
  registry: { title: 'Registry',      description: 'Your presence is the gift, but if you\'d like to celebrate us with something more.' },
  gallery:  { title: 'Gallery',       description: 'A few of our favourite frames.' },
  faq:      { title: 'FAQ',           description: 'Frequently asked questions about our celebration.' },
  rsvp:     { title: 'RSVP',          description: 'Please let us know if you can make it.' },
};

function isV8PageKey(value: string): value is V8PageKey {
  return (V8_PAGE_KEYS as readonly string[]).includes(value);
}

export async function generateMetadata(
  { params }: { params: Promise<{ domain: string; page: string }> }
): Promise<Metadata> {
  const { domain, page } = await params;
  const siteConfig = await getSiteConfig(domain);
  if (!siteConfig) return { title: 'Pearloom' };

  const names = Array.isArray(siteConfig.names) ? siteConfig.names : ['Together', 'Forever'];
  const coupleTitle = names.map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');
  const meta = isV8PageKey(page) ? PAGE_META[page] : null;
  if (!meta) return {};

  const manifest = siteConfig.manifest;
  const accent = manifest?.theme?.colors?.accent || '#C6703D';
  const bg = manifest?.theme?.colors?.background || '#F5EFE2';
  const coverPhoto = manifest?.chapters?.[0]?.images?.[0]?.url || '';
  const eventDate = manifest?.logistics?.date || '';
  const tagline = siteConfig.tagline || manifest?.poetry?.heroTagline || manifest?.vibeString || '';
  const [n1, n2] = names;

  const ogUrl = `/api/og?n1=${encodeURIComponent(n1)}&n2=${encodeURIComponent(n2)}&tag=${encodeURIComponent(tagline)}&accent=${encodeURIComponent(accent)}&bg=${encodeURIComponent(bg)}&date=${encodeURIComponent(eventDate)}&photo=${encodeURIComponent(coverPhoto)}`;

  const pageTitle = `${coupleTitle} · ${meta.title}`;
  const fullTitle = `${pageTitle} | Pearloom`;
  const siteUrl = buildSiteUrl(domain, `/${page}`, undefined, manifest?.occasion);

  return {
    metadataBase: new URL('https://pearloom.com'),
    title: fullTitle,
    description: meta.description,
    alternates: { canonical: siteUrl },
    icons: { icon: '/favicon.ico' },
    openGraph: {
      title: pageTitle,
      description: meta.description,
      url: siteUrl,
      siteName: 'Pearloom',
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${coupleTitle} — ${meta.title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: meta.description,
      images: [ogUrl],
    },
    other: {
      robots: 'noindex, nofollow',
    },
  };
}

export default async function SiteSubPage(
  { params, searchParams }: {
    params: Promise<{ domain: string; page: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const { domain, page } = await params;
  const sp = await searchParams;

  const siteConfig = await getSiteConfig(domain);
  if (!siteConfig || !siteConfig.manifest) return notFound();

  const requestedLocale = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? siteConfig.manifest.activeLocale;
  const { applyLocale } = await import('@/lib/i18n/apply-locale');
  const manifest = applyLocale(siteConfig.manifest, requestedLocale ?? null);

  // ── Legacy redirect: /venue → /travel ──
  // v8 doesn't have a separate venue block — venue info lives in
  // the travel block. Preserve old shared links.
  if (page === 'venue') {
    const target = buildSiteUrl(domain, '/travel', undefined, manifest.occasion);
    redirect(target);
  }

  // ── v8 sub-page ──
  if (!isV8PageKey(page)) return notFound();

  // Scroll-mode hosts may have shared an old multi-page link
  // (/wedding/site/story) before flipping their site to single-
  // scroll. Redirect to the home anchor so guests land on the
  // long page they're expecting instead of a thin sub-page that
  // doesn't match the rest of the site's nav behavior.
  if (readSiteMode(manifest) === 'scroll') {
    const ANCHOR_BY_PAGE: Record<V8PageKey, string> = {
      story: 'our-story',
      schedule: 'schedule',
      travel: 'travel',
      registry: 'registry',
      gallery: 'gallery',
      faq: 'faq',
      rsvp: 'rsvp',
    };
    const target = buildSiteUrl(domain, '', undefined, manifest.occasion);
    redirect(`${target}#${ANCHOR_BY_PAGE[page]}`);
  }

  const names: [string, string] = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
    ? [siteConfig.names[0], siteConfig.names[1]]
    : ['Our', 'Story'];

  const prettyUrl = formatSiteDisplayUrl(domain, '', normalizeOccasion(manifest.occasion));
  const creatorEmail = ((siteConfig as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;

  // Route through PublishedSiteShell so sub-pages mount the same
  // ThemedSiteRenderer as the home page (with pageFilter narrowing
  // the visible block).
  return (
    <PublishedSiteShell
      manifest={manifest}
      names={names}
      siteSlug={domain}
      prettyUrl={prettyUrl}
      creatorEmail={creatorEmail}
      pageFilter={page}
    />
  );
}
