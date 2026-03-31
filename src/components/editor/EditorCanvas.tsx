'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Handles iframe preview, split view with PreviewPane, device framing
// Redesigned: dot-grid bg, device chrome bezels, increased split scale
// ─────────────────────────────────────────────────────────────

import { PreviewPane } from './PreviewPane';
import { useEditor, DEVICE_DIMS, stripArtForStorage } from '@/lib/editor-state';

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
          scale={0.7}
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
      <div style={{
        width: isMobile ? '100%' : DEVICE_DIMS[device].width,
        height: previewZoom !== 1 && !isMobile ? `${100 / previewZoom}%` : '100%',
        flexShrink: 0,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        boxShadow: showDeviceChrome ? '0 20px 80px rgba(0,0,0,0.5)' : 'none',
        borderRadius: showDeviceChrome ? '12px' : 0,
        overflow: 'hidden',
        border: showDeviceChrome ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: previewZoom !== 1 && !isMobile ? `scale(${previewZoom})` : undefined,
        transformOrigin: 'top center',
      }}>
        {/* Device chrome bezel for tablet/mobile frames */}
        {showDeviceChrome && <DeviceBezel />}

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
