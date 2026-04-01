'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/EditorClient.tsx
// Client shell for the deep-linked editor route.
// Receives server-loaded manifest, auto-saves on change.
// ─────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PublishModal } from '@/components/shared/PublishModal';
import type { StoryManifest } from '@/types';

const FullscreenEditor = dynamic(
  () => import('@/components/editor/FullscreenEditor').then(m => m.FullscreenEditor),
  { ssr: false },
);

interface EditorClientProps {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
}

export default function EditorClient({ manifest: initialManifest, siteSlug, names }: EditorClientProps) {
  const router = useRouter();
  const [manifest, setManifest] = useState<StoryManifest>(initialManifest);
  const [showPublish, setShowPublish] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((m: StoryManifest) => {
    setManifest(m);
    // Debounced auto-save — 2s after last change
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug, manifest: m, names }),
      }).catch(() => {/* silent — editor still works offline */});
    }, 2000);
  }, [siteSlug, names]);

  return (
    <>
      <ErrorBoundary>
        <FullscreenEditor
          manifest={manifest}
          coupleNames={names}
          subdomain={siteSlug}
          onChange={handleChange}
          onPublish={() => setShowPublish(true)}
          onExit={() => router.push('/dashboard')}
        />
      </ErrorBoundary>

      <PublishModal
        open={showPublish}
        onClose={() => setShowPublish(false)}
        manifest={manifest}
        coupleNames={names}
        initialSubdomain={siteSlug}
      />
    </>
  );
}
