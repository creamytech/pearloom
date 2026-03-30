'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Handles iframe preview, split view with PreviewPane, device framing
// ─────────────────────────────────────────────────────────────

import { PreviewPane } from './PreviewPane';
import { useEditor, DEVICE_DIMS, stripArtForStorage } from '@/lib/editor-state';

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, previewKey, iframeRef } = useEditor();
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
          scale={0.55}
          draggingId={canvasDragId}
          selectedChapterId={activeId}
          onSectionClick={(chapterId) => {
            dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
            dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, background: '#1a1916',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', overflow: 'auto',
      padding: isMobile ? '0' : device === 'desktop' ? '0' : '2rem 2rem 4rem',
      paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined,
    }}>
      <div style={{
        width: isMobile ? '100%' : DEVICE_DIMS[device].width,
        height: previewZoom !== 1 && !isMobile ? `${100 / previewZoom}%` : '100%',
        flexShrink: 0,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        boxShadow: !isMobile && device !== 'desktop' ? '0 20px 80px rgba(0,0,0,0.5)' : 'none',
        borderRadius: !isMobile && device !== 'desktop' ? '12px' : 0,
        overflow: 'hidden',
        border: !isMobile && device !== 'desktop' ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: previewZoom !== 1 && !isMobile ? `scale(${previewZoom})` : undefined,
        transformOrigin: 'top center',
      }}>
        {!iframeReady && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1916', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', pointerEvents: 'none',
          }}>
            {previewSlow ? 'Taking longer than usual… still loading' : 'Loading preview…'}
          </div>
        )}
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
      </div>
    </div>
  );
}
