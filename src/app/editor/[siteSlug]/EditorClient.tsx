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
 * Strip `/api/photos/proxy?url=…` wrappers from every photo field on
 * the manifest before we POST it to `/api/sites`. Proxy URLs only
 * work during the editing session (they carry the OAuth token), so
 * the saved DB record must hold the raw underlying URL instead.
 *
 * The server-side mirror pass (`mirrorManifestPhotos` inside the
 * `/api/sites` POST) will then upload those raw Google URLs to
 * permanent R2 storage. This client-side strip is a belt-and-braces
 * backup so the wire payload is always clean.
 */
function unwrapProxy(url: string | undefined): string | undefined {
  if (!url || !url.includes('/api/photos/proxy')) return url;
  try {
    const params = new URL(url, 'http://localhost').searchParams;
    const inner = params.get('url');
    return inner || url;
  } catch {
    return url;
  }
}

function unproxyImageUrls(manifest: StoryManifest): StoryManifest {
  const chapters = (manifest.chapters || []).map(chapter => {
    if (!chapter.images?.length) return chapter;
    const images: ChapterImage[] = chapter.images.map(img => ({
      ...img,
      url: unwrapProxy(img.url) || img.url,
    }));
    return { ...chapter, images };
  });
  return {
    ...manifest,
    chapters,
    coverPhoto: unwrapProxy(manifest.coverPhoto),
    heroSlideshow: manifest.heroSlideshow
      ? manifest.heroSlideshow.map(u => unwrapProxy(u) || u)
      : manifest.heroSlideshow,
  };
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
            color: '#fff',
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
