'use client';

// ─────────────────────────────────────────────────────────────
// PublishedSiteShell — client wrapper for the public site
// renderer. Adds ErrorBoundary insurance: a render-time throw
// from any reachable child of SiteV8Renderer (a corrupt
// chapter, a malformed sticker, an outdated block id) shouldn't
// take the entire wedding site offline. Guests see a calm
// fallback that points them at the dashboard for hosts (a
// no-op for guests without auth).
//
// Server pages mount this instead of SiteV8Renderer directly.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SiteBlockKey } from '@/lib/site-mode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SiteV8Renderer } from './SiteV8Renderer';
import { ThemedSiteRenderer } from './ThemedSiteRenderer';

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

export function PublishedSiteShell(props: Props) {
  /* Dispatch — manifest.renderer === 'themed' picks the parallel
     ThemedSiteRenderer (direct port of prototype's themed-site.jsx).
     Anything else falls through to SiteV8Renderer (the rich v8
     renderer). Default behavior unchanged for every existing site. */
  const renderer = (props.manifest as unknown as { renderer?: 'themed' | 'v8' }).renderer;
  const useThemed = renderer === 'themed';
  return (
    <ErrorBoundary fallback={<GuestCrashFallback />}>
      {useThemed ? (
        <ThemedSiteRenderer
          manifest={props.manifest}
          names={props.names}
          siteSlug={props.siteSlug}
        />
      ) : (
        <SiteV8Renderer {...props} />
      )}
    </ErrorBoundary>
  );
}
