'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Dark studio canvas with dot-grid, ambient glow, device chrome,
// device framing with centered preview for tablet/mobile modes.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { PreviewPane } from './PreviewPane';
import { useEditor, DEVICE_DIMS, stripArtForStorage } from '@/lib/editor-state';
import { StickerOverlay } from './StickerOverlay';
import { SectionHoverToolbar } from './SectionHoverToolbar';

// ── Skeleton Loading Screen ───────────────────────────────────
const skeletonShimmer = 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)';
const skeletonBarStyle = (width: string, height: string, delay: number): React.CSSProperties => ({
  width, height, borderRadius: '6px',
  background: skeletonShimmer,
  backgroundSize: '200% 100%',
  animation: `shimmer 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite ${delay}s`,
});

function SkeletonLoading({ slow }: { slow: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.02)', pointerEvents: 'none', zIndex: 1, padding: '2.5rem',
      gap: '1.25rem',
    }}>
      <div style={skeletonBarStyle('55%', '16px', 0)} />
      <div style={{
        width: '100%', height: '240px', borderRadius: '10px',
        background: skeletonShimmer, backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={skeletonBarStyle('85%', '11px', 0.25)} />
        <div style={skeletonBarStyle('70%', '11px', 0.35)} />
        <div style={skeletonBarStyle('55%', '11px', 0.45)} />
      </div>
      <div style={{
        marginTop: 'auto', textAlign: 'center',
        color: 'rgba(214,198,168,0.35)', fontSize: '0.8rem',
      }}>
        {slow ? 'Taking a moment\u2026 almost there' : 'Loading preview\u2026'}
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

// ── Device Chrome: Phone notch bar ────────────────────────────
function PhoneChrome() {
  return (
    <div style={{
      height: '28px', flexShrink: 0,
      background: 'rgba(26,23,32,0.96)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '28px 28px 0 0',
      position: 'relative',
    }}>
      <div style={{
        width: '80px', height: '6px', borderRadius: '100px',
        background: 'rgba(255,255,255,0.15)',
      }} />
    </div>
  );
}

function PhoneBottom() {
  return (
    <div style={{
      height: '20px', flexShrink: 0,
      background: 'rgba(26,23,32,0.96)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '0 0 28px 28px',
    }}>
      <div style={{
        width: '48px', height: '4px', borderRadius: '100px',
        background: 'rgba(255,255,255,0.2)',
      }} />
    </div>
  );
}

function TabletChrome() {
  return (
    <div style={{
      height: '16px', flexShrink: 0,
      background: 'rgba(26,23,32,0.96)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
      }} />
    </div>
  );
}

// Quick-add blocks for mobile long-press
const QUICK_BLOCKS = [
  { type: 'story',    label: 'Story'    },
  { type: 'event',    label: 'Event'    },
  { type: 'photos',   label: 'Photos'   },
  { type: 'registry', label: 'Registry' },
] as const;

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, actions, previewKey, iframeRef } = useEditor();
  const { isMobile, device, splitView, iframeReady, previewSlow, canvasDragId, activeId, chapters, previewZoom, previewPage, mobileSheetOpen } = state;
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deviceKey, setDeviceKey] = useState(device);

  // Pulse ambient glow on device change
  useEffect(() => {
    setDeviceKey(device);
  }, [device]);

  // ── Listen for edit messages from iframe ──────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'pearloom-edit-commit') {
        const { chapterId, field, value } = event.data;
        if (chapterId && field !== undefined && field !== null) {
          const chapter = chapters.find(c => c.id === chapterId);
          if (chapter) actions.updateChapter(chapterId, { [field]: value });
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

      if (event.data?.type === 'pearloom-photo-remove') {
        const { chapterId, photoIndex } = event.data;
        if (!chapterId) return;
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        const imgs = (chapter.images || []).filter((_, i) => i !== photoIndex);
        actions.updateChapter(chapterId, { images: imgs });
      }

      if (event.data?.type === 'pearloom-photo-ai-regen') {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [chapters, actions, dispatch, isMobile]);

  useEffect(() => {
    if (iframeReady && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
      } catch {}
    }
  }, [iframeReady, iframeRef]);

  const mobileBottomBar = 'calc(56px + env(safe-area-inset-bottom, 0px))';
  const isPhone = device === 'mobile';
  const isTablet = device === 'tablet';
  const isFramed = !isMobile && (isPhone || isTablet);

  // Device frame dimensions
  const frameWidth = isPhone ? 390 : isTablet ? 768 : undefined;
  const frameRadius = isPhone ? 28 : isTablet ? 12 : 0;

  return (
    <div style={{
      flex: 1,
      background: isMobile ? 'transparent' : '#1A1720',
      backgroundImage: isMobile ? undefined : 'radial-gradient(circle, rgba(163,177,138,0.11) 1px, transparent 0)',
      backgroundSize: '24px 24px',
      display: 'flex', flexDirection: 'column',
      overflow: isMobile ? 'hidden' : 'auto',
      paddingBottom: isMobile ? mobileBottomBar : undefined,
      position: 'relative',
    }}>

      {/* Ambient center glow — reacts to device change */}
      {!isMobile && (
        <motion.div
          key={deviceKey}
          initial={{ opacity: 0.3, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(ellipse 50% 55% at 50% 46%, rgba(163,177,138,0.07) 0%, rgba(163,177,138,0.02) 55%, transparent 80%)',
          }}
        />
      )}

      {/* ── Main canvas area ── */}
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          alignItems: isFramed ? 'center' : undefined,
          justifyContent: isFramed ? 'center' : undefined,
          padding: isFramed ? '24px 20px' : undefined,
          zIndex: 1,
          overflow: isFramed ? 'auto' : undefined,
        }}
      >
        {/* ── Device frame wrapper (tablet/phone on desktop) ── */}
        {isFramed ? (
          <motion.div
            key={device}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{
              width: frameWidth,
              maxWidth: '100%',
              display: 'flex', flexDirection: 'column',
              borderRadius: frameRadius,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px rgba(163,177,138,0.04)',
              flexShrink: 0,
              minHeight: isPhone ? 780 : 600,
            }}
          >
            {/* Chrome top */}
            {isPhone ? <PhoneChrome /> : <TabletChrome />}

            {/* Preview area */}
            <div style={{ flex: 1, position: 'relative', background: 'var(--pl-cream)', minHeight: 0 }}>
              {!iframeReady && <SkeletonLoading slow={previewSlow} />}
              <iframe
                ref={iframeRef}
                src={`/preview?key=${previewKey}${previewPage ? `&page=${encodeURIComponent(previewPage)}` : ''}`}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: isPhone ? 780 : 600 }}
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

            {/* Chrome bottom */}
            {isPhone && <PhoneBottom />}
          </motion.div>
        ) : (
          /* ── Full-width desktop or mobile preview ── */
          <>
            {!iframeReady && <SkeletonLoading slow={previewSlow} />}
            <iframe
              ref={iframeRef}
              src={`/preview?key=${previewKey}${previewPage ? `&page=${encodeURIComponent(previewPage)}` : ''}`}
              style={{
                flex: 1, border: 'none', width: '100%', minHeight: '100%',
                boxShadow: !isMobile ? '0 0 0 1px rgba(255,255,255,0.04)' : undefined,
              }}
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
          </>
        )}

        {/* Sticker overlay */}
        {manifest && manifest.stickers && manifest.stickers.length > 0 && (
          <StickerOverlay
            stickers={manifest.stickers}
            onChange={(stickers) => {
              const updated = { ...manifest, stickers };
              actions.handleDesignChange(updated);
            }}
            containerRef={canvasContainerRef}
          />
        )}

        {/* Section hover toolbar — desktop only, positioned absolutely over canvas */}
        {!isMobile && <SectionHoverToolbar />}

        {/* Mobile long-press overlay */}
        {isMobile && !mobileSheetOpen && !showQuickAdd && (
          <div
            onPointerDown={() => {
              longPressTimer.current = setTimeout(() => setShowQuickAdd(true), 350);
            }}
            onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            onPointerCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            style={{
              position: 'absolute', inset: 0, zIndex: 2,
              background: 'transparent', pointerEvents: 'auto',
            }}
          />
        )}

        {/* Quick-add tray (mobile long-press) */}
        <AnimatePresence>
          {showQuickAdd && (
            <>
              <motion.div
                key="quickadd-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowQuickAdd(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 1100,
                  background: 'rgba(0,0,0,0.35)',
                }}
              />
              <motion.div
                key="quickadd-tray"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                style={{
                  position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
                  left: 0, right: 0, zIndex: 1101,
                  background: 'rgba(22,17,13,0.98)',
                  backdropFilter: 'blur(32px)',
                  WebkitBackdropFilter: 'blur(32px)',
                  borderRadius: '20px 20px 0 0',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  padding: '16px 16px 20px',
                } as React.CSSProperties}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(214,198,168,0.45)' }}>
                    Add Section
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setShowQuickAdd(false)}
                    style={{
                      background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                      width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'rgba(214,198,168,0.5)',
                    }}
                  >
                    <X size={12} />
                  </motion.button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {QUICK_BLOCKS.map(({ type, label }) => (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setShowQuickAdd(false);
                        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
                        dispatch({ type: 'SET_MOBILE_SHEET', open: true });
                      }}
                      style={{
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 10, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 6, padding: '12px 6px',
                        color: 'rgba(214,198,168,0.75)',
                      }}
                    >
                      <Plus size={16} color="rgba(163,177,138,0.8)" />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </div>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowQuickAdd(false);
                      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
                      dispatch({ type: 'SET_MOBILE_SHEET', open: true });
                    }}
                    style={{
                      border: '1px solid rgba(163,177,138,0.25)',
                      background: 'rgba(163,177,138,0.08)',
                      borderRadius: 100, cursor: 'pointer',
                      padding: '8px 20px',
                      color: 'rgba(163,177,138,0.8)',
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}
                  >
                    Browse all sections
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
