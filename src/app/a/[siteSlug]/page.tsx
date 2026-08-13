// ─────────────────────────────────────────────────────────────
// Pearloom / app/a/[siteSlug]/page.tsx
//
// ADDRESS COLLECTION — "Share your address". The host drops
// /a/{siteSlug} into a group chat or an email; each guest fills
// in their own mailing address and it lands directly on their
// guest row (mailing_address_line1/2, city, state, postal_code,
// country) — the same columns the print-mail checkout reads.
//
// Pattern mirror of /std/[siteSlug]: server component, cached
// site lookup with graceful fail-soft (a dead link shows the
// branded dead-link state, never a 500), SuiteTheme derivation,
// themed OG via /api/og suite params, noindex.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
import { suiteThemeFromManifest, type SuiteTheme } from '@/lib/suite/theme';
import { isSoloOccasion } from '@/lib/event-os/solo-occasions';
import { buildSitePath, getAppOrigin } from '@/lib/site-urls';
import { getTheme } from '@/components/pearloom/site/themes';
import { ShareAddressForm } from './ShareAddressForm';

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
  /* Fail soft on any infrastructure error — a guest opening an
     address link should see the branded dead-link state, never
     a 500 (e.g. Supabase unconfigured in dev). */
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch {
    return null;
  }
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

const stripHash = (hex: string) => hex.replace(/^#/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  const site = await loadSite(siteSlug);
  if (!site) return { title: 'Share your address · Pearloom', robots: { index: false } };

  const { suite } = site;
  const displayNames = suite.names.filter(Boolean).join(' & ') || 'your hosts';
  const title = `Share your address, ${displayNames}`;
  const solemn = suite.occasion === 'memorial' || suite.occasion === 'funeral';
  const description = solemn
    ? 'Share your mailing address so the family can reach you.'
    : `Share your mailing address so ${displayNames} can reach your mailbox.`;

  // Themed OG card — same suite params the save-the-date reveal
  // sends so the link preview wears the couple's look.
  const og = new URL('/api/og', getAppOrigin());
  og.searchParams.set('names', suite.names.filter(Boolean).join(',') || displayNames);
  og.searchParams.set('occasion', suite.occasion);
  if (suite.edition) og.searchParams.set('edition', suite.edition);
  og.searchParams.set('paper', stripHash(suite.palette.paper));
  og.searchParams.set('ink', stripHash(suite.palette.ink));
  og.searchParams.set('accent', stripHash(suite.palette.accent));
  og.searchParams.set('gold', stripHash(suite.palette.gold));
  og.searchParams.set('font', suite.fonts.displayFamily);
  if (suite.motif) og.searchParams.set('motif', suite.motif);

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

export default async function ShareAddressPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await loadSite(siteSlug);

  if (!site) {
    // On-brand dead-link state (mirrors /std/[siteSlug]'s fallback voice).
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
            Share your address
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

  // ── Copy — occasion-aware (BRAND.md §7 voice) ───────────────
  const solemn = suite.occasion === 'memorial' || suite.occasion === 'funeral';
  const solo = isSoloOccasion(suite.occasion);
  const displayNames = suite.names.filter(Boolean);
  const namesLine = solo
    ? displayNames[0] || 'your hosts'
    : displayNames.join(' & ') || 'your hosts';
  const firstName = displayNames[0] || (solemn ? 'the family' : 'your hosts');

  const headline = solemn
    ? 'Help the family reach you'
    : `Help ${namesLine} reach your mailbox`;
  const lede = solemn
    ? 'Leave your mailing address below so anything sent by post finds you. Only the family ever sees it.'
    : 'A real envelope may be headed your way. Leave your address below, only your hosts ever see it.';
  const successHeadline = solemn
    ? 'Done, the family can find you now.'
    : `Done, ${firstName} can find you now.`;
  const successBody = solemn
    ? 'Your address is set. There is nothing more to do.'
    : 'Your address is set. Nothing more to do, keep an eye on the mailbox.';

  /* Motif — explicit host pick wins; theme-catalog motif is the
     fallback (same derivation RsvpCeremony uses). */
  const loose = manifest as unknown as Record<string, unknown>;
  const themeId =
    (loose.themeId as string | undefined) ??
    (loose.theme as { id?: string } | undefined)?.id;
  const motifKind = suite.motif ?? getTheme(themeId).motif ?? 'none';

  const siteHref = buildSitePath(siteSlug, '', occasion);

  return (
    <>
      {/* Suite display + body faces — React hoists these to <head>. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={suite.fonts.googleHref} />
      <ShareAddressForm
        suite={suite}
        siteSlug={siteSlug}
        siteHref={siteHref}
        motifKind={motifKind}
        headline={headline}
        lede={lede}
        successHeadline={successHeadline}
        successBody={successBody}
      />
    </>
  );
}
