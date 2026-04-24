'use client';

// Legacy block editor — FullscreenEditor with every specialist panel.
// Kept reachable via /editor/[siteSlug]?view=legacy so users can fall
// back to it when the v8 editor doesn't cover a specific case.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PublishModal } from '@/components/shared/PublishModal';
import { EditorTabBar } from '@/components/marketing/v2/EditorTabBar';
import { stripArtForStorage } from '@/lib/editor-state';
import type { StoryManifest, ChapterImage } from '@/types';

const FullscreenEditor = dynamic(
  () => import('@/components/editor/FullscreenEditor').then((m) => m.FullscreenEditor),
  { ssr: false }
);

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
  const chapters = (manifest.chapters || []).map((chapter) => {
    if (!chapter.images?.length) return chapter;
    const images: ChapterImage[] = chapter.images.map((img) => ({
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
      ? manifest.heroSlideshow.map((u) => unwrapProxy(u) || u)
      : manifest.heroSlideshow,
  };
}

const DRAFT_STORAGE_PREFIX = 'pearloom:draft:';

export function LegacyFullEditor({
  manifest: initialManifest,
  siteSlug,
  names,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
}) {
  const router = useRouter();
  const draftKey = `${DRAFT_STORAGE_PREFIX}${siteSlug}`;

  const [manifest, setManifest] = useState<StoryManifest>(() => {
    if (typeof window === 'undefined') return initialManifest;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return initialManifest;
      const parsed = JSON.parse(raw) as { savedAt: number; manifest: StoryManifest };
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

  useEffect(() => {
    const handleUnload = (e: BeforeUnloadEvent) => {
      if (!hasPendingSave.current) return;
      const saveable = unproxyImageUrls(stripArtForStorage(lastManifestRef.current));
      const payload = JSON.stringify({ subdomain: siteSlug, manifest: saveable, names });
      navigator.sendBeacon('/api/sites', new Blob([payload], { type: 'application/json' }));
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [siteSlug, names]);

  const handleChange = useCallback(
    (m: StoryManifest) => {
      setManifest(m);
      lastManifestRef.current = m;
      hasPendingSave.current = true;
      setSaveStatus('saving');

      try {
        const saveable = unproxyImageUrls(stripArtForStorage(m));
        window.localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), manifest: saveable }));
      } catch {}

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const saveable = unproxyImageUrls(stripArtForStorage(m));
        fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: siteSlug, manifest: saveable, names }),
        })
          .then((res) => {
            if (res.ok) {
              hasPendingSave.current = false;
              setSaveStatus('saved');
              try {
                window.localStorage.removeItem(draftKey);
              } catch {}
              setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
              setSaveStatus('error');
            }
          })
          .catch(() => setSaveStatus('error'));
      }, 2000);
    },
    [siteSlug, names, draftKey]
  );

  return (
    <>
      <EditorTabBar
        manifest={manifest}
        names={names}
        subdomain={siteSlug}
        onManifestChange={handleChange}
        onBack={() => router.push('/dashboard')}
        onPreview={() => window.open(`/sites/${siteSlug}/v2`, '_blank')}
        onShare={() => {
          if (typeof navigator === 'undefined') return;
          const nav = navigator as Navigator & {
            share?: (d: { title?: string; url?: string }) => Promise<void>;
            clipboard?: { writeText: (t: string) => Promise<void> };
          };
          if (nav.share) {
            nav.share({ title: 'My Pearloom site', url: `/sites/${siteSlug}` }).catch(() => {});
          } else if (nav.clipboard) {
            nav.clipboard.writeText(`${window.location.origin}/sites/${siteSlug}`).catch(() => {});
          }
        }}
      />
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

      {saveStatus !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '7px 16px',
            borderRadius: 999,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            zIndex: 99999,
            pointerEvents: 'none',
            background: saveStatus === 'error' ? '#7A2D2D' : 'var(--ink)',
            color: 'var(--cream)',
            boxShadow: '0 8px 24px rgba(14,13,11,0.18)',
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
