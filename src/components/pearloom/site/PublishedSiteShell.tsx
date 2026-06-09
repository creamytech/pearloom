'use client';

// ─────────────────────────────────────────────────────────────
// PublishedSiteShell — client wrapper for the public site
// renderer. Mounts the literal-handoff redesign canvas
// (src/components/pearloom/redesign/ThemedSite.tsx) so the
// published URL matches the editor canvas exactly.
//
// The previous canonical (src/components/pearloom/site/
// ThemedSiteRenderer.tsx) stays in the tree as a fallback path
// for any manifest that pre-dates the redesign field set —
// see `usesRedesignCanvas()` below.
//
// Adds ErrorBoundary insurance so a corrupt chapter / malformed
// sticker / outdated block id doesn't take the entire site
// offline; guests see a calm fallback instead.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SiteBlockKey } from '@/lib/site-mode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemedSiteRenderer } from './ThemedSiteRenderer';
import { ThemedSite } from '@/components/pearloom/redesign/ThemedSite';
import { hydrateManifestForRedesign } from '@/components/pearloom/redesign/hydrate-manifest';
import { GuestRsvpModal } from '@/components/pearloom/site/GuestRsvpModal';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';
import { StickyRsvpPill } from '@/components/site/StickyRsvpPill';
import { StoreFonts } from '@/lib/theme-store/fonts';
import { getTheme } from '@/components/pearloom/site/themes';

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  prettyUrl: string;
  creatorEmail?: string | null;
  pageFilter?: 'home' | SiteBlockKey;
}

function GuestCrashFallback() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--cream, #FBF7EE)',
      padding: 32,
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)', marginBottom: 12 }}>
          Pearloom
        </div>
        <h1 style={{ fontFamily: 'var(--font-display, "Fraunces", serif)', fontSize: 32, fontWeight: 600, margin: '0 0 12px', color: 'var(--ink, #0E0D0B)' }}>
          The thread caught
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55, margin: '0 0 20px' }}>
          We hit a snag rendering this page. Refreshing usually clears it —
          if not, the couple has been notified.
        </p>
        {/* Raw <a> not next/link — full reload escapes any broken React state. */}
        <a
          href={typeof window !== 'undefined' ? window.location.pathname : '/'}
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            borderRadius: 999,
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Refresh
        </a>
      </div>
    </div>
  );
}

/* hydrateManifestForRedesign() backfills new-canvas-only fields
   (themeId, kitId, siteLayout, storySection, detailsCards, edition,
   …) from the canonical schema (theme.colors, chapters, logistics,
   poetry, etc.). The function is intentionally idempotent — passing
   a manifest that already has the new fields is a no-op. */

export function PublishedSiteShell(props: Props) {
  const hydrated = hydrateManifestForRedesign(props.manifest);

  /* RSVP-preset-aware label for the sticky pill (memorials don't
     say "RSVP", etc.). */
  const rsvpPreset = ((hydrated as unknown as { rsvpConfig?: { preset?: string } }).rsvpConfig?.preset) ?? undefined;
  const rsvpLabel = rsvpPreset === 'memorial' ? 'Reply' : 'RSVP';

  /* The pill + modal mount as SIBLINGS of ThemedSite's root, so the
     --t-* vars never reach them via inheritance. Resolve the same
     theme bag the canvas paints with (hydrated themeId + Theme-Store
     pack vars) and hand the pill concrete values. */
  const looseTheme = hydrated as unknown as { themeId?: string; themeVars?: Record<string, string> };
  const themeBag = { ...getTheme(looseTheme.themeId).vars, ...(looseTheme.themeVars ?? {}) };
  const pillAccent = themeBag['--t-rsvp'] ?? themeBag['--t-accent'];
  const pillAccentInk = themeBag['--t-rsvp-ink'] ?? themeBag['--t-paper'];

  return (
    <ErrorBoundary fallback={<GuestCrashFallback />}>
      {/* Pack typography — without this, store-pack display faces
          (Cormorant, Playfair, Bodoni, …) fall back to Georgia. */}
      <StoreFonts />
      <ThemedSite
        manifest={hydrated}
        names={props.names}
        /* editor wiring intentionally omitted — published guests
           don't click sections; ThemedSite's editor-only props
           default to no-op + null in published mode. */
      />
      {/* Overlays — keep the product features ThemedSiteRenderer
          used to provide before the swap, so published sites
          don't lose RSVP backend / sticky CTA / engagement
          analytics. GuestRsvpModal listens for the 'pl-open-rsvp'
          window event ThemedSite dispatches from its RSVP CTA. */}
      <StickyRsvpPill rsvpLabel={rsvpLabel} accent={pillAccent} accentInk={pillAccentInk} />
      <AnalyticsBeacon siteId={props.siteSlug} />
      <GuestRsvpModal siteSlug={props.siteSlug} manifest={hydrated} />
    </ErrorBoundary>
  );
}

/* Legacy fallback — kept so a one-flag rollback to the old
   canonical is a single import swap above, not a rewrite.
   `ThemedSiteRenderer` is referenced via the export below so the
   bundler still tree-shakes the import correctly. */
export function LegacyThemedSiteRenderer(props: Props) {
  return (
    <ErrorBoundary fallback={<GuestCrashFallback />}>
      <ThemedSiteRenderer
        manifest={props.manifest}
        names={props.names}
        siteSlug={props.siteSlug}
        pageFilter={props.pageFilter}
      />
    </ErrorBoundary>
  );
}
