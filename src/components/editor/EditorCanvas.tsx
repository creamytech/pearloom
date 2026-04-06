'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Center preview area
// Warm cream canvas with rounded iframe card, full-bleed desktop,
// floating glass overlays for contextual editing.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useEditor, stripArtForStorage, type DeviceMode } from '@/lib/editor-state';
import { StickerOverlay } from './StickerOverlay';
import { SectionHoverToolbar } from './SectionHoverToolbar';
import { CanvasCursors } from './CanvasCursors';
import { INLINE_EDIT_SCRIPT } from '@/lib/block-engine/inline-edit';

// ── Skeleton Loading Screen ───────────────────────────────────
function SkeletonLoading({ slow }: { slow: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--pl-cream)', pointerEvents: 'none', zIndex: 1, padding: '2.5rem',
      gap: '1.25rem',
    }}>
      <div className="skeleton" style={{ width: '55%', height: '16px', borderRadius: '6px' }} />
      <div className="skeleton" style={{ width: '100%', height: '240px', borderRadius: '10px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: '85%', height: '11px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ width: '70%', height: '11px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ width: '55%', height: '11px', borderRadius: '6px' }} />
      </div>
      <div style={{
        marginTop: 'auto', textAlign: 'center',
        color: 'var(--pl-muted)', fontSize: '0.8rem',
      }}>
        {slow ? 'Taking a moment\u2026 almost there' : 'Loading preview\u2026'}
      </div>
    </div>
  );
}

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, actions, previewKey, iframeRef } = useEditor();
  const { device, iframeReady, previewSlow, activeId, chapters, previewPage, previewZoom } = state;
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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
        } else if (sectionId === 'events' || sectionId === 'schedule') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'events' });
        } else if (sectionId === 'rsvp') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'events' });
        } else if (sectionId === 'faq' || sectionId === 'travel' || sectionId === 'registry') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
        } else if (sectionId === 'photos' || sectionId === 'gallery') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
        } else if (sectionId === 'guestbook') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
        } else if (sectionId === 'design' || sectionId === 'theme') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
        } else if (sectionId === 'countdown') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'events' });
        } else if (sectionId === 'spotify' || sectionId === 'music') {
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'spotify' });
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

      // ── Inline text editing ──────────────────────────────────
      if (event.data?.type === 'pearloom-inline-edit-commit') {
        const { elementId, newText } = event.data;
        if (!elementId || !newText) return;
        // Parse inline edit element ID (format: "chapterId:field" or "block:blockId:field")
        let parsed: { type: 'chapter' | 'block'; id: string; field: string } | null = null;
        if (elementId.startsWith('block:')) {
          const parts = elementId.split(':');
          if (parts.length >= 3) parsed = { type: 'block', id: parts[1], field: parts.slice(2).join(':') };
        } else {
          const colonIdx = elementId.indexOf(':');
          if (colonIdx > 0) parsed = { type: 'chapter', id: elementId.slice(0, colonIdx), field: elementId.slice(colonIdx + 1) };
        }
        if (!parsed) return;

        if (parsed.type === 'chapter') {
          const chapter = chapters.find(c => c.id === parsed.id);
          if (chapter) {
            actions.updateChapter(parsed.id, { [parsed.field]: newText });
          }
        }
        // Block inline edits update block config
        if (parsed.type === 'block') {
          dispatch({ type: 'SET_ACTIVE_ID', id: parsed.id });
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [chapters, actions, dispatch]);

  useEffect(() => {
    if (iframeReady && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
        // Inject inline editing script into iframe
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc) {
          const script = iframeDoc.createElement('script');
          script.textContent = INLINE_EDIT_SCRIPT;
          iframeDoc.body.appendChild(script);
        }
      } catch {}
    }
  }, [iframeReady, iframeRef]);

  const isPhone = device === 'mobile';
  const isTablet = device === 'tablet';
  const isFramed = isPhone || isTablet;
  const frameWidth = isPhone ? 390 : isTablet ? 768 : undefined;

  const iframeSrc = `/preview?key=${previewKey}${previewPage ? `&page=${encodeURIComponent(previewPage)}` : ''}`;
  const handleIframeLoad = () => {
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
  };

  return (
    <div style={{
      flex: 1,
      background: 'var(--pl-cream-deep)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── Contextual editing label ── */}
      {state.activeTab && (
        <motion.div
          key={state.activeTab}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
          position: 'absolute', top: '8px',
          left: '0', right: '0',
          display: 'flex', justifyContent: 'center',
          zIndex: 41,
          pointerEvents: 'none',
        }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: '100px',
            background: 'var(--pl-olive-deep)',
            color: 'white',
            fontSize: '0.55rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
          }}>
          Editing: {state.activeTab === 'story' ? 'Story' : state.activeTab === 'design' ? 'Theme' : state.activeTab === 'canvas' ? 'Sections' : state.activeTab === 'events' ? 'Events' : state.activeTab === 'details' ? 'Settings' : state.activeTab.charAt(0).toUpperCase() + state.activeTab.slice(1)}
          </span>
        </motion.div>
      )}

      {/* ── Floating device switcher ── */}
      <div style={{
        position: 'absolute', top: '32px',
        left: '0', right: '0',
        display: 'flex', justifyContent: 'center',
        zIndex: 40,
        pointerEvents: 'none',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '4px',
        borderRadius: '100px',
        pointerEvents: 'auto',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 12px rgba(43,30,20,0.08)',
      } as React.CSSProperties}>
        {([
          { mode: 'desktop' as DeviceMode, Icon: Monitor },
          { mode: 'tablet' as DeviceMode, Icon: Tablet },
          { mode: 'mobile' as DeviceMode, Icon: Smartphone },
        ]).map(({ mode, Icon }) => (
          <motion.button
            key={mode}
            onClick={() => dispatch({ type: 'SET_DEVICE', device: mode })}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', border: 'none',
              background: 'transparent',
              color: device === mode ? 'white' : 'var(--pl-muted)',
              cursor: 'pointer',
              transition: 'color 0.15s',
              position: 'relative', zIndex: 1,
            }}
          >
            {device === mode && (
              <motion.div
                layoutId="device-active"
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'var(--pl-ink)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <Icon size={14} />
          </motion.button>
        ))}
      </div>
      </div>

      {/* ── Main canvas area ── */}
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          justifyContent: isFramed ? 'center' : undefined,
          padding: isFramed ? '60px 20px 20px' : '56px 8px 8px',
          zIndex: 1,
          overflow: 'auto',
        }}
      >
        {/* ── Device frame (tablet/phone) ── */}
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
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 12px 48px rgba(43,30,20,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              flexShrink: 0,
              minHeight: isPhone ? 780 : 600,
              background: 'var(--pl-cream)',
            }}
          >
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              {!iframeReady && <SkeletonLoading slow={previewSlow} />}
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: isPhone ? 780 : 600 }}
                title="Live Preview"
                onLoad={handleIframeLoad}
              />
            </div>
          </motion.div>
        ) : (
          /* ── Full-bleed desktop — rounded card with soft shadow ── */
          <div style={{
            width: previewZoom !== 1 ? `${100 / previewZoom}%` : '100%',
            maxWidth: previewZoom !== 1 ? `${1120 / previewZoom}px` : '1120px',
            flex: 1,
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(43,30,20,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
            position: 'relative',
            background: 'white',
            minHeight: 0,
            transform: previewZoom !== 1 ? `scale(${previewZoom})` : undefined,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}>
            {!iframeReady && <SkeletonLoading slow={previewSlow} />}
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Live Preview"
              onLoad={handleIframeLoad}
            />
          </div>
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

        {/* Section hover toolbar */}
        <SectionHoverToolbar />

        {/* Collaborative cursors */}
        <CanvasCursors
          currentUserId={state.activeId || 'local'}
          siteId={state.previewPage || 'editor'}
          containerRef={canvasContainerRef}
        />
      </div>
    </div>
  );
}
