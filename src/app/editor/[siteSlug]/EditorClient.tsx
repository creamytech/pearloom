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

const DRAFT_STORAGE_PREFIX = 'pearloom:draft:';

export default function EditorClient({ manifest: initialManifest, siteSlug, names }: EditorClientProps) {
  const router = useRouter();
  const draftKey = `${DRAFT_STORAGE_PREFIX}${siteSlug}`;

  // If a local draft exists with newer content than what the server returned, prefer it
  const [manifest, setManifest] = useState<StoryManifest>(() => {
    if (typeof window === 'undefined') return initialManifest;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return initialManifest;
      const parsed = JSON.parse(raw) as { savedAt: number; manifest: StoryManifest };
      // Only use draft if recent (<24h) — anything older is stale
      if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000 && parsed.manifest) {
        return parsed.manifest;
      }
    } catch {}
    return initialManifest;
  });
  const [showPublish, setShowPublish] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManifestRef = useRef<StoryManifest>(initialManifest);
  const hasPendingSave = useRef(false);

  // Flush pending save on page unload using sendBeacon (survives tab
  // close) AND warn the user if there are unsaved changes — the
  // beacon is best-effort, so the browser's native confirm dialog
  // is the last safety net preventing silent data loss.
  useEffect(() => {
    const handleUnload = (e: BeforeUnloadEvent) => {
      if (!hasPendingSave.current) return;
      const saveable = unproxyImageUrls(stripArtForStorage(lastManifestRef.current));
      const payload = JSON.stringify({ subdomain: siteSlug, manifest: saveable, names });
      navigator.sendBeacon('/api/sites', new Blob([payload], { type: 'application/json' }));
      // Modern browsers require setting returnValue for the confirm
      // dialog; the message shown is browser-controlled.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [siteSlug, names]);

  const handleChange = useCallback((m: StoryManifest) => {
    setManifest(m);
    lastManifestRef.current = m;
    hasPendingSave.current = true;
    setSaveStatus('saving');

    // Write a local draft immediately on every change so nothing is lost on
    // crash, tab close before debounce fires, or network failure.
    try {
      const saveable = unproxyImageUrls(stripArtForStorage(m));
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ savedAt: Date.now(), manifest: saveable }),
      );
    } catch {
      // localStorage quota or unavailable — ignore, network save is authoritative
    }

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
            // Network save succeeded — clear the local draft backup
            try { window.localStorage.removeItem(draftKey); } catch {}
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
  }, [siteSlug, names, draftKey]);

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
            padding: '7px 16px',
            borderRadius: 'var(--pl-radius-full)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            zIndex: 'var(--z-max)',
            pointerEvents: 'none',
            background:
              saveStatus === 'error'
                ? 'color-mix(in oklab, var(--pl-plum) 92%, transparent)'
                : 'color-mix(in oklab, var(--pl-ink) 88%, transparent)',
            color: 'var(--pl-cream)',
            backdropFilter: 'saturate(140%) blur(10px)',
            WebkitBackdropFilter: 'saturate(140%) blur(10px)',
            transition: 'opacity var(--pl-dur-base)',
            opacity: 1,
            boxShadow: '0 8px 24px color-mix(in oklab, var(--pl-ink) 18%, transparent)',
          }}
        >
          {saveStatus === 'saving' && 'Saving…'}
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
