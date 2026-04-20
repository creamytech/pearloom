import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig } from '@/lib/db';
import { buildSiteUrl } from '@/lib/site-urls';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { TravelSection } from '@/components/travel-section';
import { FaqSection } from '@/components/faq-section';
import { RegistryShowcase } from '@/components/registry-showcase';
import { WeddingEvents } from '@/components/wedding-events';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import { getEventType } from '@/lib/event-os/event-types';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { SiteClientSections } from '@/components/site/SiteClientSections';

// ─────────────────────────────────────────────────────────────
// [domain]/[page] — Sub-page router
// Each wedding site can have dedicated full pages in addition
// to the main scrolling homepage. This route handles:
//   /travel   → Hotels, airports, directions
//   /venue    → Ceremony & reception venue details
//   /schedule → Full event schedule with maps
//   /rsvp     → Standalone RSVP form
//   /registry → Gift registry page
//   /faq      → Questions & answers
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('lh3.google')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

const PAGE_META: Record<string, { title: string; description: string }> = {
  travel:   { title: 'Travel & Hotels',  description: 'Hotels, airports, and directions for our wedding' },
  venue:    { title: 'Venue',            description: 'Ceremony and reception venue details' },
  schedule: { title: 'Schedule',         description: 'Our wedding day timeline and events' },
  rsvp:     { title: 'RSVP',            description: 'Please RSVP for our wedding celebration' },
  registry: { title: 'Registry',        description: 'Our wedding gift registry' },
  faq:      { title: 'FAQ',             description: 'Frequently asked questions about our wedding' },
};

const VALID_PAGES = Object.keys(PAGE_META);

export async function generateMetadata(
  { params }: { params: Promise<{ domain: string; page: string }> }
): Promise<Metadata> {
  const { domain, page } = await params;
  const siteConfig = await getSiteConfig(domain);
  if (!siteConfig) return { title: 'Pearloom' };

  const names = Array.isArray(siteConfig.names) ? siteConfig.names : ['Together', 'Forever'];
  const coupleTitle = names.map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');
  const pageMeta = PAGE_META[page];
  if (!pageMeta) return {};

  const manifest = siteConfig.manifest;

  // OG image: same AI-generated route as the main page
  const accent = manifest?.theme?.colors?.accent || '#5C6B3F';
  const bg = manifest?.theme?.colors?.background || '#2B2B2B';
  const coverPhoto = manifest?.chapters?.[0]?.images?.[0]?.url || '';
  const weddingDate = manifest?.logistics?.date || '';
  const tagline = siteConfig.tagline || manifest?.vibeString || 'A love story beautifully told.';
  const [n1, n2] = names;

  const ogUrl = `/api/og?n1=${encodeURIComponent(n1)}&n2=${encodeURIComponent(n2)}&tag=${encodeURIComponent(tagline)}&accent=${encodeURIComponent(accent)}&bg=${encodeURIComponent(bg)}&date=${encodeURIComponent(weddingDate)}&photo=${encodeURIComponent(coverPhoto)}`;

  const pageTitle = `${coupleTitle} · ${pageMeta.title}`;
  const fullTitle = `${pageTitle} | Pearloom`;
  const siteUrl = buildSiteUrl(domain, `/${page}`, undefined, manifest?.occasion);

  return {
    metadataBase: new URL('https://pearloom.com'),
    title: fullTitle,
    description: pageMeta.description,
    alternates: {
      canonical: siteUrl,
    },
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title: pageTitle,
      description: pageMeta.description,
      url: siteUrl,
      siteName: 'Pearloom',
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${coupleTitle} — ${pageMeta.title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageMeta.description,
      images: [ogUrl],
    },
    other: {
      // Prevent search engine indexing of private wedding sites
      robots: 'noindex, nofollow',
    },
  };
}

export default async function SiteSubPage(
  { params }: { params: Promise<{ domain: string; page: string }> }
) {
  const { domain, page } = await params;

  const siteConfig = await getSiteConfig(domain);
  if (!siteConfig || !siteConfig.manifest) return notFound();

  // Allow built-in pages + any user-created custom page slugs
  const customSlugs = (siteConfig.manifest.customPages || [])
    .filter((p: { visible?: boolean }) => p.visible !== false)
    .map((p: { slug: string }) => p.slug);
  if (!VALID_PAGES.includes(page) && !customSlugs.includes(page)) return notFound();

  const manifest = siteConfig.manifest;
  const safeNames: [string, string] = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
    ? [siteConfig.names[0], siteConfig.names[1]]
    : ['Our', 'Story'];

  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const bgColor = manifest.theme?.colors?.background || '#F5F1E8';
  const cardBg  = manifest.theme?.colors?.cardBg     || '#ffffff';

  // Build nav pages — same as main page
  const hiddenPages = new Set(manifest.hiddenPages || []);
  const sitePages = [
    { id: 'home',     slug: '',         label: 'Home',     enabled: true, order: 0 },
    { id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: !!(manifest.events?.length) && !hiddenPages.has('schedule'),            order: 1 },
    { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',     enabled: !!(manifest.events?.length) && !hiddenPages.has('rsvp'),            order: 2 },
    { id: 'travel',   slug: 'travel',   label: 'Travel',   enabled: !!(manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) && !hiddenPages.has('travel'),                order: 3 },
    { id: 'venue',    slug: 'venue',    label: 'Venue',    enabled: !!(manifest.logistics?.venue) && !hiddenPages.has('venue'),          order: 4 },
    { id: 'registry', slug: 'registry', label: 'Registry', enabled: !!(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) && !hiddenPages.has('registry'), order: 5 },
    { id: 'faq',      slug: 'faq',      label: 'FAQ',      enabled: !!(manifest.faqs?.length) && !hiddenPages.has('faq'),              order: 6 },
  ].filter(p => p.enabled) as import('@/types').SitePage[];

  // Use the occasion-prefixed canonical path when available so in-site
  // nav links match the URL in the browser bar.
  const basePath = manifest.occasion
    ? `/${manifest.occasion}/${domain}`
    : `/sites/${domain}`;

  // Page header shared across sub-pages
  const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div style={{
      padding: '5rem 2rem 3rem',
      background: bgColor,
      textAlign: 'center',
      borderBottom: `1px solid rgba(0,0,0,0.06)`,
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Breadcrumb navigation */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem' }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <li>
              <Link href={basePath} style={{ color: 'var(--pl-olive)', textDecoration: 'none', fontWeight: 600 }}>
                Home
              </Link>
            </li>
            <li aria-hidden="true" style={{ color: 'var(--pl-muted)', opacity: 0.5 }}>&gt;</li>
            <li aria-current="page" style={{ color: 'var(--pl-muted)' }}>{title}</li>
          </ol>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, maxWidth: '60px', height: '1px', background: 'var(--pl-olive)', opacity: 0.3 }} />
          <span style={{ fontSize: '1rem', color: 'var(--pl-olive)', opacity: 0.6 }}>{vibeSkin.decorIcons[0] || '✦'}</span>
          <div style={{ flex: 1, maxWidth: '60px', height: '1px', background: 'var(--pl-olive)', opacity: 0.3 }} />
        </div>
        <h1 style={{
          fontFamily: 'var(--pl-font-heading)',
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 400, letterSpacing: '-0.025em',
          color: 'var(--pl-ink)', margin: '0 0 1rem',
        }}>{title}</h1>
        {subtitle && (
          <p style={{ color: 'var(--pl-muted)', fontSize: '1.05rem', fontStyle: 'italic' }}>{subtitle}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ flex: 1, maxWidth: '60px', height: '1px', background: 'var(--pl-olive)', opacity: 0.3 }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-olive)', opacity: 0.5 }}>
            {safeNames.join(' & ')}
          </span>
          <div style={{ flex: 1, maxWidth: '60px', height: '1px', background: 'var(--pl-olive)', opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );

  // ── Render page by slug ──────────────────────────────────────
  let content: React.ReactNode = null;

  if (page === 'travel') {
    if (!manifest.travelInfo) return notFound();
    content = (
      <>
        <PageHeader
          title="Travel & Hotels"
          subtitle="Everything you need to plan your trip — places to stay, how to get here, and more."
        />
        <TravelSection info={manifest.travelInfo} />
      </>
    );
  }

  if (page === 'venue') {
    const venue = manifest.logistics?.venue;
    content = (
      <>
        <PageHeader
          title="The Venue"
          subtitle={venue || 'Venue details coming soon'}
        />
        <section style={{ padding: '5rem 2rem', background: cardBg }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {venue && (
              <div style={{
                background: '#fff', borderRadius: '1.5rem', padding: '2.5rem',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.04)',
              }}>
                <h2 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '2rem', fontWeight: 400, color: 'var(--pl-ink)', marginBottom: '1rem' }}>
                  {venue}
                </h2>
                {manifest.logistics?.date && (
                  <p style={{ color: 'var(--pl-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    {new Date(manifest.logistics.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
                {manifest.logistics?.time && (
                  <p style={{ color: 'var(--pl-muted)', fontSize: '1rem' }}>
                    {manifest.logistics.time}
                  </p>
                )}
                <a
                  href={`https://maps.google.com?q=${encodeURIComponent(venue)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    marginTop: '1.5rem', padding: '0.65rem 1.5rem',
                    background: 'var(--pl-ink)', color: '#fff',
                    borderRadius: 'var(--pl-radius-full)', fontSize: '0.8rem', fontWeight: 700,
                    textDecoration: 'none', letterSpacing: '0.05em',
                  }}
                >
                  Open in Google Maps
                </a>
              </div>
            )}
            {/* Embedded map iframe */}
            {venue && (
              <div style={{ borderRadius: '1.25rem', overflow: 'hidden', height: '360px', border: '1px solid rgba(0,0,0,0.08)' }}>
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`}
                  width="100%" height="360"
                  style={{ border: 0 }}
                  loading="lazy"
                  title={`Map of ${venue}`}
                />
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  if (page === 'schedule') {
    if (!manifest.events?.length) return notFound();
    content = (
      <>
        <PageHeader
          title="The Schedule"
          subtitle="Our wedding day — every moment that brings us together."
        />
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
        <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
      </>
    );
  }

  if (page === 'rsvp') {
    if (!manifest.events?.length) return notFound();
    content = (
      <>
        <PageHeader
          title="RSVP"
          subtitle={manifest.logistics?.rsvpDeadline
            ? `Please respond by ${new Date(manifest.logistics.rsvpDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            : 'We hope to celebrate with you — please let us know if you can make it.'}
        />
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
        <PublicRsvpSection
          siteId={domain}
          events={manifest.events}
          deadline={manifest.logistics?.rsvpDeadline}
          rsvpPreset={getEventType(manifest.occasion)?.rsvpPreset}
        />
      </>
    );
  }

  if (page === 'registry') {
    if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) return notFound();
    content = (
      <>
        <PageHeader
          title="Registry"
          subtitle="Your presence is the greatest gift — but if you'd like to celebrate us with something more, here are a few ideas."
        />
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
        <RegistryShowcase
          registries={manifest.registry!.entries || []}
          cashFundUrl={manifest.registry?.cashFundUrl}
          cashFundMessage={manifest.registry?.cashFundMessage}
          title={vibeSkin.sectionLabels.registry}
        />
      </>
    );
  }

  if (page === 'faq') {
    if (!manifest.faqs?.length) return notFound();
    content = (
      <>
        <PageHeader
          title="Questions & Answers"
          subtitle="Everything you need to know — and a few things you didn't think to ask."
        />
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
        <FaqSection faqs={manifest.faqs} />
      </>
    );
  }

  // ── Check custom pages if no built-in page matched ──
  if (!content && manifest.customPages?.length) {
    const customPage = manifest.customPages.find(cp => cp.slug === page && cp.visible !== false);
    if (customPage) {
      content = (
        <>
          <PageHeader
            title={customPage.title}
          />
          <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
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
        </>
      );
    }
  }

  if (!content) return notFound();

  return (
    <ThemeProvider theme={manifest.theme || undefined}>
      <SiteNav names={safeNames} pages={sitePages} currentPage={page} logoIcon={manifest.logoIcon} logoSvg={manifest.logoSvg} />
      <main style={{ minHeight: '100dvh', paddingBottom: '5rem', background: bgColor }}>
        {content}
      </main>
      <SiteClientSections siteId={domain} coupleNames={safeNames} vibeSkin={vibeSkin} />
    </ThemeProvider>
  );
}
