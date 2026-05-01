'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/EditorClient.tsx
//
// Editor mode router. Two modes:
//   1. ?view=studio   → BuilderV8 (the 3-pane design studio — shell
//                        only, reads theme/palette/motif). Good for
//                        quick re-skinning.
//   2. (default)      → EditorV8 — the v8 block editor: left outline,
//                        live preview in the middle, per-block field
//                        panel on the right.
//
// The legacy `?view=legacy` FullscreenEditor mode was sunset
// 2026-04-26 along with its supporting v2 components.
// ─────────────────────────────────────────────────────────────

import { useSearchParams } from 'next/navigation';
import { EditorV8 } from '@/components/pearloom/editor/EditorV8';
import { BuilderV8 } from '@/components/pearloom/pages/BuilderV8';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { StoryManifest } from '@/types';

interface EditorClientProps {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
}

// Editor crash fallback — points the host at the dashboard so they
// don't get stuck on a hard-refresh loop. Inline (not DashEmpty)
// because the editor isn't inside a DashLayout shell.
function EditorCrashFallback({ siteSlug }: { siteSlug: string }) {
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
          Editor
        </div>
        <h1 style={{ fontFamily: 'var(--font-display, "Fraunces", serif)', fontSize: 32, fontWeight: 600, margin: '0 0 12px', color: 'var(--ink, #0E0D0B)' }}>
          Pear lost the thread
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55, margin: '0 0 20px' }}>
          Something in the editor render path threw. Refresh to retry, or open
          the dashboard to manage the site from outside the editor.
        </p>
        <div style={{ display: 'inline-flex', gap: 10 }}>
          {/* Use raw <a> here, not next/link — the editor just
              crashed, so we want a full page reload to escape any
              broken React state, not client-side navigation. */}
          {/* eslint-disable @next/next/no-html-link-for-pages */}
          <a
            href={typeof window !== 'undefined' ? window.location.pathname : `/editor/${siteSlug}`}
            style={{ padding: '10px 18px', borderRadius: 999, background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #FBF7EE)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
          >
            Refresh
          </a>
          <a
            href="/dashboard/event"
            style={{ padding: '10px 18px', borderRadius: 999, background: 'var(--card, #FBF7EE)', color: 'var(--ink, #0E0D0B)', textDecoration: 'none', fontSize: 13, fontWeight: 600, border: '1px solid var(--line, rgba(61,74,31,0.16))' }}
          >
            Open dashboard
          </a>
          {/* eslint-enable @next/next/no-html-link-for-pages */}
        </div>
      </div>
    </div>
  );
}

export default function EditorClient({ manifest, siteSlug, names }: EditorClientProps) {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  return (
    <ErrorBoundary fallback={<EditorCrashFallback siteSlug={siteSlug} />}>
      {view === 'studio'
        ? <BuilderV8 manifest={manifest} siteSlug={siteSlug} names={names} />
        : <EditorV8 manifest={manifest} siteSlug={siteSlug} names={names} />}
    </ErrorBoundary>
  );
}
