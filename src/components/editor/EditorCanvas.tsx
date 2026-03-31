'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Handles iframe preview, split view with PreviewPane, device framing
// Redesigned: dot-grid bg, device chrome bezels, increased split scale
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
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
  const { isMobile, device, splitView, iframeReady, previewSlow, canvasDragId, activeId, chapters, previewZoom } = state;

  if (splitView && !isMobile) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        transition: 'flex 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}>
        <PreviewPane
          manifest={{ ...manifest, chapters: chapters.map((ch, i) => ({ ...ch, order: i })) }}
          coupleNames={coupleNames}
          vibeSkin={manifest.vibeSkin}
          scale={0.7}
          draggingId={canvasDragId}
          selectedChapterId={activeId}
          onSectionClick={(chapterId) => {
            dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
            dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
          }}
          onUpdateChapter={actions.updateChapter}
          onDeleteChapter={actions.deleteChapter}
          onDuplicateChapter={(id) => {
            const original = chapters.find(c => c.id === id);
            if (!original) return;
            const copyId = `ch-${Date.now()}`;
            const copy = { ...original, id: copyId, title: `${original.title} (copy)`, order: chapters.length };
            const next = [...chapters, copy];
            dispatch({ type: 'SET_CHAPTERS', chapters: next });
            dispatch({ type: 'SET_ACTIVE_ID', id: copyId });
            actions.syncManifest(next);
          }}
          onMoveChapter={(id, direction) => {
            const idx = chapters.findIndex(c => c.id === id);
            if (idx < 0) return;
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= chapters.length) return;
            const next = [...chapters];
            [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
            actions.handleReorder(next);
          }}
          onAIRewrite={actions.handleAIRewrite}
          onUpdateHeroTagline={(tagline) => {
            const existing = manifest.poetry || { heroTagline: '', closingLine: '', rsvpIntro: '' };
            actions.handleChatManifestUpdate({
              poetry: { ...existing, heroTagline: tagline },
            });
          }}
        />
      </div>
    );
  }

  const showDeviceChrome = !isMobile && device !== 'desktop';

  return (
    <div style={{
      flex: 1,
      background: '#1a1916',
      backgroundImage: 'radial-gradient(rgba(214,198,168,0.04) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', overflow: 'auto',
      padding: isMobile ? '0' : device === 'desktop' ? '0' : '2rem 2rem 4rem',
      paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined,
    }}>
      <motion.div
        layout
        layoutId="editor-preview"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: isMobile ? '100%' : DEVICE_DIMS[device].width,
          height: previewZoom !== 1 && !isMobile ? `${100 / previewZoom}%` : '100%',
          flexShrink: 0,
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          boxShadow: showDeviceChrome ? '0 20px 80px rgba(0,0,0,0.5)' : 'none',
          borderRadius: showDeviceChrome ? '12px' : 0,
          overflow: 'hidden',
          border: showDeviceChrome ? '1px solid rgba(255,255,255,0.08)' : 'none',
          transform: previewZoom !== 1 && !isMobile ? `scale(${previewZoom})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {/* Device chrome bezel for tablet/mobile frames */}
        {showDeviceChrome && <DeviceBezel />}

        {!iframeReady && <SkeletonLoading slow={previewSlow} />}
        <iframe
          ref={iframeRef}
          src={`/preview?key=${previewKey}`}
          style={{ flex: 1, border: 'none', width: '100%', minHeight: isMobile ? '100%' : '600px' }}
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
          }}
        />
      </motion.div>
    </div>
  );
}
