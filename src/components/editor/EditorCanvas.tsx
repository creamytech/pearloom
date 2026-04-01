'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Handles iframe preview, split view with PreviewPane, device framing
// Redesigned: dot-grid bg, device chrome bezels, increased split scale
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { PreviewPane } from './PreviewPane';
import { MobilePreviewPane } from './MobilePreviewPane';
import { MobileChapterActionSheet } from './MobileChapterActionSheet';
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
  const { isMobile, device, splitView, iframeReady, previewSlow, canvasDragId, activeId, chapters, previewZoom } = state;

  // ── Listen for edit messages from the iframe ──────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'pearloom-edit-commit') {
        const { chapterId, field, value } = event.data;
        if (chapterId && field !== undefined && field !== null) {
          const chapter = chapters.find(c => c.id === chapterId);
          if (chapter) {
            actions.updateChapter(chapterId, { [field]: value });
          }
        }
      }
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
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [chapters, actions, dispatch]);

  // ── Send edit-mode activation to iframe after load ────────
  useEffect(() => {
    if (iframeReady && iframeRef.current && !isMobile) {
      try {
        iframeRef.current.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
      } catch {}
    }
  }, [iframeReady, iframeRef, isMobile]);

  // ── Mobile Visual Edit Mode ─────────────────────────────────
  if (isMobile) {
    const actionChapter = state.mobileActionChapterId
      ? chapters.find(c => c.id === state.mobileActionChapterId) || null
      : null;
    const actionIndex = actionChapter
      ? chapters.findIndex(c => c.id === actionChapter.id)
      : -1;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MobilePreviewPane
          manifest={{ ...manifest, chapters: chapters.map((ch, i) => ({ ...ch, order: i })) }}
          coupleNames={coupleNames}
          vibeSkin={manifest.vibeSkin}
          selectedChapterId={state.mobileActionChapterId}
          onChapterTap={(id) => {
            dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: id });
          }}
          onHeroTap={() => {
            // Open story tab for hero editing
            dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
            dispatch({ type: 'SET_MOBILE_SHEET', open: true });
          }}
        />
        <MobileChapterActionSheet
          chapter={actionChapter}
          chapterIndex={actionIndex}
          chapterCount={chapters.length}
          isRewriting={state.rewritingId === actionChapter?.id}
          onClose={() => dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: null })}
          onUpdate={actions.updateChapter}
          onDelete={(id) => { actions.deleteChapter(id); dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: null }); }}
          onDuplicate={(id) => {
            const original = chapters.find(c => c.id === id);
            if (!original) return;
            const copyId = `ch-${Date.now()}`;
            const copy = { ...original, id: copyId, title: `${original.title} (copy)`, order: chapters.length };
            const next = [...chapters, copy];
            dispatch({ type: 'SET_CHAPTERS', chapters: next });
            actions.syncManifest(next);
            dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: copyId });
          }}
          onMove={(id, direction) => {
            const idx = chapters.findIndex(c => c.id === id);
            if (idx < 0) return;
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= chapters.length) return;
            const next = [...chapters];
            [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
            actions.handleReorder(next);
          }}
          onAIRewrite={actions.handleAIRewrite}
        />
      </div>
    );
  }

  // ── Desktop: iframe live preview ────────────────────────────
  return (
    <div style={{
      flex: 1,
      background: '#1a1916',
      backgroundImage: 'radial-gradient(circle, rgba(214,198,168,0.055) 1px, transparent 0)',
      backgroundSize: '22px 22px',
      display: 'flex', flexDirection: 'column',
      overflow: 'auto',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{
        width: '100%', height: '100%',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {!iframeReady && <SkeletonLoading slow={previewSlow} />}
        <iframe
          ref={iframeRef}
          src={`/preview?key=${previewKey}`}
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
            // Re-activate edit mode on iframe reload
            iframeRef.current?.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
          }}
        />
      </div>
    </div>
  );
}
