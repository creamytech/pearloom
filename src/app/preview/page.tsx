'use client';

// ─────────────────────────────────────────────────────────────
// everglow / app/preview/page.tsx
// Real-time preview of the generated site from manifest data
// ─────────────────────────────────────────────────────────────

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { ComingSoon } from '@/components/coming-soon';
import { ThemeProvider } from '@/components/theme-provider';
import { defaultTheme } from '@/lib/theme';
import type { StoryManifest } from '@/types';

function PreviewContent() {
  const searchParams = useSearchParams();

  const { manifest, names } = useMemo(() => {
    try {
      const raw = searchParams.get('data');
      if (!raw) return { manifest: null, names: ['', ''] as [string, string] };
      const parsed = JSON.parse(decodeURIComponent(raw));
      return {
        manifest: parsed.manifest as StoryManifest,
        names: parsed.names as [string, string],
      };
    } catch {
      return { manifest: null, names: ['', ''] as [string, string] };
    }
  }, [searchParams]);

  if (!manifest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--eg-bg)]">
        <div className="text-center">
          <h1
            className="text-4xl font-semibold mb-3 tracking-tight"
            style={{ fontFamily: 'var(--eg-font-heading)' }}
          >
            preview
          </h1>
          <p className="text-[var(--eg-muted)]">
            no story data provided. generate your story from the dashboard first.
          </p>
        </div>
      </div>
    );
  }

  const theme = manifest.theme || defaultTheme;

  return (
    <ThemeProvider theme={theme}>
      <main>
        <Hero
          names={names}
          anniversaryLabel={manifest.vibeString}
          subtitle={`${manifest.chapters.length} chapters of your love story`}
          coverPhoto={manifest.chapters[0]?.images?.[0]?.url}
        />
        <Timeline chapters={manifest.chapters} />
        {manifest.comingSoon && <ComingSoon config={manifest.comingSoon} />}
      </main>
    </ThemeProvider>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[var(--eg-muted)]">loading preview...</p>
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
