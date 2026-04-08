'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/EditorClient.tsx
// Client shell for the deep-linked editor route.
// Receives server-loaded manifest, auto-saves on change.
// Strips base64 art before saving to prevent payload bloat.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PublishModal } from '@/components/shared/PublishModal';
import { stripArtForStorage } from '@/lib/editor-state';
import type { StoryManifest, ChapterImage } from '@/types';

const FullscreenEditor = dynamic(
  () => import('@/components/editor/FullscreenEditor').then(m => m.FullscreenEditor),
  { ssr: false },
);

interface EditorClientProps {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
}

/**
 * Convert Google Photos proxy URLs back to direct Google URLs for storage.
 * Proxy URLs (/api/photos/proxy?url=...) only work during the editing session.
 * Direct Google URLs also expire (~1h), but the publish flow mirrors them to R2.
 * For draft saves, we keep the direct URL so the image at least works for a while.
 */
function unproxyImageUrls(manifest: StoryManifest): StoryManifest {
  if (!manifest.chapters) return manifest;
  const chapters = manifest.chapters.map(chapter => {
    if (!chapter.images?.length) return chapter;
    const images: ChapterImage[] = chapter.images.map(img => {
      if (img.url?.includes('/api/photos/proxy?url=')) {
        try {
          const params = new URL(img.url, 'http://localhost').searchParams;
          const originalUrl = params.get('url');
          if (originalUrl) {
            return { ...img, url: originalUrl };
          }
        } catch { /* keep original */ }
      }
      return img;
    });
    return { ...chapter, images };
  });
  return { ...manifest, chapters };
}

export default function EditorClient({ manifest: initialManifest, siteSlug, names }: EditorClientProps) {
  const router = useRouter();
  const [manifest, setManifest] = useState<StoryManifest>(initialManifest);
  const [showPublish, setShowPublish] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManifestRef = useRef<StoryManifest>(initialManifest);
  const hasPendingSave = useRef(false);

  // Flush pending save on page unload using sendBeacon (survives tab close)
  useEffect(() => {
    const handleUnload = () => {
      if (hasPendingSave.current) {
        const saveable = unproxyImageUrls(stripArtForStorage(lastManifestRef.current));
        const payload = JSON.stringify({ subdomain: siteSlug, manifest: saveable, names });
        navigator.sendBeacon('/api/sites', new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [siteSlug, names]);

  const handleChange = useCallback((m: StoryManifest) => {
    setManifest(m);
    lastManifestRef.current = m;
    hasPendingSave.current = true;
    setSaveStatus('saving');

    // Debounced auto-save — 2s after last change
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Strip base64 art (too large for DB) and unproxy Google Photos URLs
      const saveable = unproxyImageUrls(stripArtForStorage(m));

      fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug, manifest: saveable, names }),
      })
        .then(res => {
          if (res.ok) {
            hasPendingSave.current = false;
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          } else {
            console.error('[EditorClient] Auto-save failed:', res.status);
            setSaveStatus('error');
          }
        })
        .catch(err => {
          console.error('[EditorClient] Auto-save network error:', err);
          setSaveStatus('error');
        });
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

      {/* Save status indicator */}
      {saveStatus !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            borderRadius: '100px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            zIndex: 9998,
            pointerEvents: 'none',
            background: saveStatus === 'error' ? 'rgba(220,60,60,0.9)' : 'rgba(0,0,0,0.75)',
            color: 'white',
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.3s',
            opacity: 1,
          }}
        >
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Save failed — check connection'}
        </div>
      )}

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
