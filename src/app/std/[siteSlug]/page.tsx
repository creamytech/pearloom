// ─────────────────────────────────────────────────────────────
// Pearloom / app/std/[siteSlug]/page.tsx
//
// Suite Phase 2 (docs/SUITE-STRATEGY.md §4) — the save-the-date
// reveal page. Guests land here from the save-the-date email:
//
//   /std/{siteSlug}            — generic reveal
//   /std/{siteSlug}?g={token}  — personalized ("Dear Maya") via
//                                the guest-passport token, the
//                                same pearloom_guests.guest_token
//                                that powers /g/[token].
//
// Server component: resolves the site by slug (same `sites`
// lookup the published-site + invite pages use), derives the
// SuiteTheme from the manifest, optionally resolves the guest,
// and mounts the client reveal. generateMetadata points OG at
// /api/og with the suite params (paper/ink/accent/gold/font/
// motif) so the link preview wears the couple's look.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
import { suiteThemeFromManifest, type SuiteTheme } from '@/lib/suite/theme';
import { getGuestByToken } from '@/lib/event-os/db';
import { buildSitePath, getAppOrigin } from '@/lib/site-urls';
import { SaveTheDateReveal } from '@/components/invite/SaveTheDateReveal';
import { buildIcsDataHref } from '@/components/invite/ics';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

interface SiteData {
  id: string;
  manifest: StoryManifest;
  names: [string, string];
  occasion: string | undefined;
  suite: SuiteTheme;
}

/** Site lookup, deduped between generateMetadata and the page. */
const loadSite = cache(async (siteSlug: string): Promise<SiteData | null> => {
  const supabase = getSupabase();
  const { data: siteRow } = await supabase
    .from('sites')
    .select('id, subdomain, site_config, ai_manifest')
    .eq('subdomain', siteSlug)
    .maybeSingle();
  if (!siteRow) return null;

  const siteConfig = siteRow.site_config as Record<string, unknown> | null;
  const manifest = (siteRow.ai_manifest ?? {}) as StoryManifest;
  const names: [string, string] =
    Array.isArray(siteConfig?.names) && siteConfig.names.length >= 1
      ? [String(siteConfig.names[0] ?? ''), String(siteConfig.names[1] ?? '')]
      : ((manifest.names as [string, string] | undefined) ?? ['', '']);
  const occasion =
    (siteConfig?.occasion as string | undefined) ??
    ((manifest as unknown as { occasion?: string }).occasion ?? undefined);

  return {
    id: siteRow.id as string,
    manifest,
    names,
    occasion,
    suite: suiteThemeFromManifest(manifest, names),
  };
});

/* Manifest.saveTheDate — same loose shape SaveTheDatePanel writes. */
interface SaveTheDateConfig {
  message?: string;
  photoUrl?: string;
  dateOverride?: string;
}

const stripHash = (hex: string) => hex.replace(/^#/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  const site = await loadSite(siteSlug);
  if (!site) return { title: 'Save the date · Pearloom' };

  const { suite } = site;
  const displayNames = suite.names.filter(Boolean).join(' & ') || 'A celebration';
  const solemn = suite.occasion === 'memorial' || suite.occasion === 'funeral';
  const title = `${solemn ? 'Hold the date' : 'Save the date'} — ${displayNames}`;
  const std = (site.manifest as unknown as { saveTheDate?: SaveTheDateConfig }).saveTheDate ?? {};
  const dateDisplay = std.dateOverride || suite.eventDate || '';

  // Themed OG card — suite params (paper/ink/accent/gold/font/
  // motif) land on /api/og via the parallel Suite OG work; hex
  // values go over without their '#'. When stylized art exists,
  // it IS the share image (strategy §4 bonus).
  const og = new URL('/api/og', getAppOrigin());
  og.searchParams.set('names', suite.names.filter(Boolean).join(',') || displayNames);
  if (dateDisplay) og.searchParams.set('date', dateDisplay);
  og.searchParams.set('occasion', suite.occasion);
  if (suite.edition) og.searchParams.set('edition', suite.edition);
  og.searchParams.set('paper', stripHash(suite.palette.paper));
  og.searchParams.set('ink', stripHash(suite.palette.ink));
  og.searchParams.set('accent', stripHash(suite.palette.accent));
  og.searchParams.set('gold', stripHash(suite.palette.gold));
  og.searchParams.set('font', suite.fonts.displayFamily);
  if (suite.motif) og.searchParams.set('motif', suite.motif);
  const sharePhoto = suite.stylizedArt?.url ?? null;
  if (sharePhoto) og.searchParams.set('photo', sharePhoto);

  const description = dateDisplay
    ? `${displayNames} — ${solemn ? 'hold' : 'save'} the date for ${dateDisplay}.`
    : `A note from ${displayNames}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: og.toString(), width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: false },
  };
}

export default async function SaveTheDatePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteSlug: string }>;
  searchParams: Promise<{ g?: string }>;
}) {
  const { siteSlug } = await params;
  const { g } = await searchParams;
  const site = await loadSite(siteSlug);

  if (!site) {
    // On-brand dead-link state (mirrors /i/[token]'s fallback voice).
    return (
      <div
        style={{
          minHeight: '100vh', background: '#F5EFE2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--pl-font-body, system-ui, -apple-system, sans-serif)',
          color: '#3A332C', textAlign: 'center', padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.62rem', letterSpacing: '0.28em',
              textTransform: 'uppercase', color: '#6F6557', margin: '0 0 14px',
            }}
          >
            Save the date
          </p>
          <h1
            style={{
              fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
              fontStyle: 'italic', fontWeight: 400,
              fontSize: 'clamp(1.6rem, 4vw, 2.1rem)',
              color: '#0E0D0B', margin: '0 0 14px', lineHeight: 1.2,
            }}
          >
            This link isn&rsquo;t ready.
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7, color: '#6F6557' }}>
            The page is invalid or hasn&rsquo;t been woven yet.
            <br />
            Reach out to your hosts for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  const { suite, manifest, occasion } = site;

  // ── Personalization — optional guest-passport token ────────
  let guestName: string | null = null;
  if (g) {
    try {
      const guest = await getGuestByToken(g);
      if (guest && guest.site_id === site.id) {
        guestName = guest.display_name || null;
      }
    } catch {
      // Personalization is best-effort — the reveal still works
      // for an unrecognized token.
    }
  }

  // ── Card content ────────────────────────────────────────────
  const std = (manifest as unknown as { saveTheDate?: SaveTheDateConfig }).saveTheDate ?? {};
  const coupleDisplay = suite.names.filter(Boolean).join(' & ') || 'Your hosts';
  const solemn = suite.occasion === 'memorial' || suite.occasion === 'funeral';
  const kicker = solemn ? 'Hold the date' : 'Save the date';
  const dateDisplay = std.dateOverride || suite.eventDate || null;
  const message =
    std.message?.trim() ||
    (suite.occasion === 'wedding'
      ? `${coupleDisplay} are getting married! Save the date${dateDisplay ? ` for ${dateDisplay}` : ''}.`
      : `${coupleDisplay} would love you to ${solemn ? 'hold' : 'save'} the date${dateDisplay ? ` — ${dateDisplay}` : ''}.`);

  // Stylized art > host-picked save-the-date photo > site cover.
  const photoUrl =
    suite.stylizedArt?.url || std.photoUrl || suite.photos.cover || null;

  // .ics built from the real ISO logistics date (a free-text
  // "Summer 2027" override displays but can't calendar).
  const logistics = (manifest as unknown as {
    logistics?: { date?: string; time?: string; venue?: string; venueAddress?: string };
  }).logistics ?? {};
  const icsHref = logistics.date
    ? buildIcsDataHref({
        date: logistics.date,
        time: logistics.time,
        title: `${coupleDisplay} — ${kicker}`,
        venue: suite.venue,
        address: logistics.venueAddress,
        descriptionLines: [
          `${kicker} for ${coupleDisplay}`,
          suite.venue ? `Venue: ${suite.venue}` : '',
        ].filter(Boolean),
        uid: `std-${siteSlug}@pearloom.com`,
      })
    : null;

  const siteHref = buildSitePath(siteSlug, '', occasion);

  return (
    <>
      {/* Suite display + body faces — React hoists these to <head>. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={suite.fonts.googleHref} />
      <SaveTheDateReveal
        suite={suite}
        guestName={guestName}
        siteHref={siteHref}
        message={message}
        dateDisplay={dateDisplay}
        venue={suite.venue}
        photoUrl={photoUrl}
        icsHref={icsHref}
        kicker={kicker}
      />
    </>
  );
}
