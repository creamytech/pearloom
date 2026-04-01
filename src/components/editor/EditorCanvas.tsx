'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Handles iframe preview, split view with PreviewPane, device framing
// Redesigned: dot-grid bg, device chrome bezels, increased split scale
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { PreviewPane } from './PreviewPane';
import { useEditor, DEVICE_DIMS, stripArtForStorage } from '@/lib/editor-state';

// ── Skeleton Loading Screen ──────────────────────────────────
const skeletonBg = 'rgba(214,198,168,0.08)';
const skeletonShimmer = 'linear-gradient(90deg, rgba(214,198,168,0.08) 0%, rgba(214,198,168,0.15) 50%, rgba(214,198,168,0.08) 100%)';
const skeletonBarStyle = (width: string, height: string, delay: number): React.CSSProperties => ({
  width, height, borderRadius: '6px',
  background: skeletonShimmer,
  backgroundSize: '200% 100%',
  animation: `shimmer 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${delay}s`,
});

function SkeletonLoading({ slow }: { slow: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      background: '#1a1916', pointerEvents: 'none', zIndex: 1, padding: '2rem',
      gap: '1.25rem',
    }}>
      {/* Header bar skeleton */}
      <div style={skeletonBarStyle('60%', '18px', 0)} />

      {/* Hero image placeholder */}
      <div style={{
        width: '100%', height: '200px', borderRadius: '8px',
        background: skeletonShimmer, backgroundSize: '200% 100%',
        animation: 'shimmer 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
      }} />

      {/* Content line skeletons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={skeletonBarStyle('90%', '12px', 0.25)} />
        <div style={skeletonBarStyle('75%', '12px', 0.35)} />
        <div style={skeletonBarStyle('60%', '12px', 0.45)} />
      </div>

      {/* Status text */}
      <div style={{
        marginTop: 'auto', textAlign: 'center',
        color: 'rgba(214,198,168,0.35)', fontSize: '0.8rem',
      }}>
        {slow ? 'Taking longer than usual\u2026 still loading' : 'Loading preview\u2026'}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

// ── Device Chrome Bezel ───────────────────────────────────────
function DeviceBezel() {
  return (
    <div style={{
      height: '12px', flexShrink: 0,
      background: 'linear-gradient(180deg, #2a2622, #242018)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Center notch pill */}
      <div style={{
        width: '36px', height: '4px', borderRadius: '100px',
        background: 'rgba(255,255,255,0.08)',
      }} />
      {/* Reflective sheen */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 70%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, actions, previewKey, iframeRef } = useEditor();
  const { isMobile, device, splitView, iframeReady, previewSlow, canvasDragId, activeId, chapters, previewZoom, previewPage } = state;

  // ── Listen for edit messages from the iframe ──────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Text field edits
      if (event.data?.type === 'pearloom-edit-commit') {
        const { chapterId, field, value } = event.data;
        if (chapterId && field !== undefined && field !== null) {
          const chapter = chapters.find(c => c.id === chapterId);
          if (chapter) actions.updateChapter(chapterId, { [field]: value });
        }
      }

      // Section click → open sidebar panel
      if (event.data?.type === 'pearloom-section-click') {
        const { chapterId, sectionId } = event.data;
        if (chapterId) {
          dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
        } else if (sectionId === 'hero') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
        } else if (sectionId === 'events') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'events' });
        } else if (sectionId === 'faq' || sectionId === 'travel' || sectionId === 'registry') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
        } else {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
        }
      }

      // Photo replace — new URL uploaded from within the iframe
      if (event.data?.type === 'pearloom-photo-replace') {
        const { chapterId, photoIndex, newUrl, newAlt } = event.data;
        if (!chapterId || !newUrl) return;
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        const imgs = [...(chapter.images || [])];
        const newImage = { id: `img-${Date.now()}`, url: newUrl, alt: newAlt || '', width: 0, height: 0 };
        if (photoIndex >= 0 && photoIndex < imgs.length) {
          imgs[photoIndex] = newImage;
        } else {
          imgs.push(newImage);
        }
        actions.updateChapter(chapterId, { images: imgs });
        dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
      }

      // Photo remove
      if (event.data?.type === 'pearloom-photo-remove') {
        const { chapterId, photoIndex } = event.data;
        if (!chapterId) return;
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        const imgs = (chapter.images || []).filter((_, i) => i !== photoIndex);
        actions.updateChapter(chapterId, { images: imgs });
      }

      // AI regen → open design panel
      if (event.data?.type === 'pearloom-photo-ai-regen') {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [chapters, actions, dispatch, isMobile]);

  // ── Send edit-mode activation to iframe after load ────────
  useEffect(() => {
    if (iframeReady && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
      } catch {}
    }
  }, [iframeReady, iframeRef]);

  // ── Iframe preview (desktop + mobile) ──────────────────────
  // Mobile: full-bleed iframe, bottom padding reserves space for tab bar
  // Desktop: dot-grid chrome, device bezel framing
  const mobileBottomBar = 'calc(56px + env(safe-area-inset-bottom, 0px))';

  return (
    <div style={{
      flex: 1,
      background: isMobile ? 'transparent' : '#1a1916',
      backgroundImage: isMobile ? undefined : 'radial-gradient(circle, rgba(214,198,168,0.055) 1px, transparent 0)',
      backgroundSize: '22px 22px',
      display: 'flex', flexDirection: 'column',
      overflow: isMobile ? 'hidden' : 'auto',
      paddingBottom: isMobile ? mobileBottomBar : undefined,
    }}>
      <div style={{
        width: '100%', height: '100%',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {!iframeReady && <SkeletonLoading slow={previewSlow} />}
        <iframe
          ref={iframeRef}
          src={`/preview?key=${previewKey}${previewPage ? `&page=${encodeURIComponent(previewPage)}` : ''}`}
          style={{ flex: 1, border: 'none', width: '100%', minHeight: '100%' }}
          title="Live Preview"
          onLoad={() => {
            dispatch({ type: 'SET_IFRAME_READY', ready: true });
            dispatch({ type: 'SET_PREVIEW_SLOW', slow: false });
            try {
              iframeRef.current?.contentWindow?.postMessage({
                type: 'pearloom-preview-update',
                manifest: stripArtForStorage(manifest),
                names: coupleNames,
              }, '*');
            } catch {}
            iframeRef.current?.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
          }}
        />
      </div>
    </div>
  );
}
