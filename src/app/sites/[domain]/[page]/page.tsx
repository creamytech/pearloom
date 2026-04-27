import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/db';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { SiteV8Renderer } from '@/components/pearloom/site/SiteV8Renderer';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { SiteClientSections } from '@/components/site/SiteClientSections';

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
//   custom slugs → preserved through manifest.customPages
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('lh3.google')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

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

  // ── Custom pages (user-created) ──
  // Render through the legacy custom-page path so existing custom
  // page URLs continue to work.
  const customPage = manifest.customPages?.find((p) => p.slug === page && p.visible !== false);
  if (customPage) {
    return renderCustomPage({ manifest, customPage, domain, names: siteConfig.names });
  }

  // ── v8 sub-page ──
  if (!isV8PageKey(page)) return notFound();

  const names: [string, string] = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
    ? [siteConfig.names[0], siteConfig.names[1]]
    : ['Our', 'Story'];

  const prettyUrl = formatSiteDisplayUrl(domain, '', normalizeOccasion(manifest.occasion));
  const creatorEmail = ((siteConfig as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;

  return (
    <SiteV8Renderer
      manifest={manifest}
      names={names}
      siteSlug={domain}
      prettyUrl={prettyUrl}
      creatorEmail={creatorEmail}
      pageFilter={page}
    />
  );
}

// ── Legacy custom-page renderer ──
// Kept for backward compatibility with user-authored customPages.
// Lifted from the previous version of this file; uses legacy site
// chrome (SiteNav + manual cards) since v8 doesn't model these.
function renderCustomPage({
  manifest,
  customPage,
  domain,
  names,
}: {
  manifest: import('@/types').StoryManifest;
  customPage: NonNullable<import('@/types').StoryManifest['customPages']>[number];
  domain: string;
  names: unknown;
}) {
  const safeNames: [string, string] = Array.isArray(names) && names.length >= 2
    ? [names[0] as string, names[1] as string]
    : ['Our', 'Story'];
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const bgColor = manifest.theme?.colors?.background || '#F5EFE2';
  const cardBg = manifest.theme?.colors?.cardBg || '#FBF7EE';

  const hiddenPages = new Set(manifest.hiddenPages || []);
  const sitePages = [
    { id: 'home',     slug: '',         label: 'Home',     enabled: true,                                                                               order: 0 },
    { id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: !!(manifest.events?.length) && !hiddenPages.has('schedule'),                       order: 1 },
    { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',     enabled: !!(manifest.events?.length) && !hiddenPages.has('rsvp'),                            order: 2 },
    { id: 'travel',   slug: 'travel',   label: 'Travel',   enabled: !!(manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) && !hiddenPages.has('travel'), order: 3 },
    { id: 'registry', slug: 'registry', label: 'Registry', enabled: !!(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) && !hiddenPages.has('registry'),       order: 4 },
    { id: 'faq',      slug: 'faq',      label: 'FAQ',      enabled: !!(manifest.faqs?.length) && !hiddenPages.has('faq'),                              order: 5 },
  ].filter(p => p.enabled) as import('@/types').SitePage[];

  const basePath = manifest.occasion
    ? `/${manifest.occasion}/${domain}`
    : `/sites/${domain}`;

  return (
    <ThemeProvider theme={manifest.theme || undefined}>
      <SiteNav names={safeNames} pages={sitePages} currentPage={customPage.slug} logoIcon={manifest.logoIcon} logoSvg={manifest.logoSvg} />
      <main style={{ minHeight: '100dvh', paddingBottom: '5rem', background: bgColor }}>
        <div style={{ padding: '5rem 2rem 3rem', background: bgColor, textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem' }}>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                <li>
                  <Link href={basePath} style={{ color: 'var(--pl-olive)', textDecoration: 'none', fontWeight: 600 }}>
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" style={{ color: 'var(--pl-muted)', opacity: 0.5 }}>&gt;</li>
                <li aria-current="page" style={{ color: 'var(--pl-muted)' }}>{customPage.title}</li>
              </ol>
            </nav>
            <h1 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 400, letterSpacing: '-0.025em',
              color: 'var(--pl-ink)', margin: '0 0 1rem',
            }}>{customPage.title}</h1>
          </div>
        </div>
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={50} />
        <section style={{ padding: '3rem 2rem', background: cardBg }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {customPage.blocks?.map(block => (
              <div key={block.id} style={{ padding: '2rem 0' }}>
                {block.type === 'text' && (
                  <div style={{ fontFamily: 'var(--pl-font-body)', color: 'var(--pl-ink)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                    {(block.config?.content as string) || 'Content coming soon...'}
                  </div>
                )}
                {block.type === 'quote' && (
                  <blockquote style={{
                    fontFamily: 'var(--pl-font-heading)', fontSize: '1.6rem', fontStyle: 'italic',
                    color: 'var(--pl-ink)', textAlign: 'center', padding: '2rem',
                    borderLeft: '3px solid var(--pl-olive)', opacity: 0.9,
                  }}>
                    {(block.config?.text as string) || '"..."'}
                  </blockquote>
                )}
                {block.type === 'photos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {((block.config?.urls as string[]) || []).map((url: string, i: number) => (
                      <div key={i} style={{ borderRadius: '1rem', overflow: 'hidden', aspectRatio: '4/3' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={proxyUrl(url, 800, 600)} alt={'Photo from ' + customPage.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
                {block.type === 'video' && (block.config?.embedUrl as string) && (
                  <div style={{ borderRadius: '1rem', overflow: 'hidden', aspectRatio: '16/9' }}>
                    <iframe src={block.config?.embedUrl as string} width="100%" height="100%" style={{ border: 0 }} allowFullScreen title="Video" />
                  </div>
                )}
                {block.type === 'divider' && (
                  <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={cardBg} height={50} />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteClientSections siteId={domain} coupleNames={safeNames} vibeSkin={vibeSkin} />
    </ThemeProvider>
  );
}
