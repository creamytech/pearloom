'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Direct-DOM canvas
// Renders the site directly in the editor DOM (no iframe).
// Enables native drag-drop, direct click-to-edit, and real
// glass blur transparency.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useEditor, type DeviceMode } from '@/lib/editor-state';
import { SiteRenderer } from './SiteRenderer';
import type { BlockType, PageBlock } from '@/types';

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, actions } = useEditor();
  const { device, previewZoom } = state;
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const zoom = previewZoom || 1;
  const [isPanning, setIsPanning] = useState(false);
  const [undoToast, setUndoToast] = useState<string | null>(null);

  // ── Spacebar to pan ─────────────────────────────────────
  useEffect(() => {
    let panStartX = 0, panStartY = 0, scrollStartX = 0, scrollStartY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('[contenteditable]')) {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsPanning(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!isPanning || !scrollContainerRef.current) return;
      panStartX = e.clientX;
      panStartY = e.clientY;
      scrollStartX = scrollContainerRef.current.scrollLeft;
      scrollStartY = scrollContainerRef.current.scrollTop;
      document.body.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning || !scrollContainerRef.current || !panStartX) return;
      scrollContainerRef.current.scrollLeft = scrollStartX - (e.clientX - panStartX);
      scrollContainerRef.current.scrollTop = scrollStartY - (e.clientY - panStartY);
    };
    const onMouseUp = () => {
      panStartX = 0;
      document.body.style.cursor = '';
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning]);

  const isPhone = device === 'mobile';
  const isTablet = device === 'tablet';
  const isFramed = isPhone || isTablet;
  const frameWidth = isPhone ? 390 : isTablet ? 768 : undefined;

  // ── Section click → open matching panel contextually ──────
  const handleSectionClick = useCallback((sectionId: string, chapterId?: string) => {
    // Chapter-specific: open story tab with chapter selected
    if (chapterId) {
      dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
      return;
    }

    // Map every section type to the exact panel + sub-section
    const sectionToTab: Record<string, { tab: string; selectBlock?: boolean; contextSection?: string }> = {
      // Nav bar → design panel → navigation section
      'nav': { tab: 'design', contextSection: 'navigation' },
      'navigation': { tab: 'design', contextSection: 'navigation' },
      // Hero → story (auto-select first chapter)
      'hero': { tab: 'story' },
      // Story chapters → story tab
      'story': { tab: 'story' },
      'chapter': { tab: 'story' },
      // Events & schedule → events tab
      'events': { tab: 'events' },
      'schedule': { tab: 'events' },
      'event': { tab: 'events' },
      // RSVP → details → rsvp section
      'rsvp': { tab: 'details', contextSection: 'rsvp' },
      // Countdown → events tab
      'countdown': { tab: 'events' },
      // Registry → details → registry section
      'registry': { tab: 'details', contextSection: 'registry' },
      // Travel → details → travel section
      'travel': { tab: 'details', contextSection: 'travel' },
      // FAQ → details → faq section
      'faq': { tab: 'details', contextSection: 'faq' },
      // Design/theme → design tab → theme section
      'design': { tab: 'design', contextSection: 'theme' },
      'theme': { tab: 'design', contextSection: 'theme' },
      // Footer → details → couple section (footer settings)
      'footer': { tab: 'details', contextSection: 'seo' },
      // Guestbook → canvas with block selected
      'guestbook': { tab: 'canvas', selectBlock: true },
      // Spotify → spotify tab
      'spotify': { tab: 'spotify' },
      // Photos/gallery → canvas with block selected
      'photos': { tab: 'canvas', selectBlock: true },
      'photoWall': { tab: 'canvas', selectBlock: true },
      'gallery': { tab: 'canvas', selectBlock: true },
      // Map → canvas with block selected
      'map': { tab: 'canvas', selectBlock: true },
      // Video → canvas with block selected
      'video': { tab: 'canvas', selectBlock: true },
      // Text/quote → canvas with block selected
      'text': { tab: 'canvas', selectBlock: true },
      'quote': { tab: 'canvas', selectBlock: true },
      // Wedding party → story tab
      'weddingParty': { tab: 'story' },
      // Quiz → canvas
      'quiz': { tab: 'canvas', selectBlock: true },
      // Hashtag → canvas
      'hashtag': { tab: 'canvas', selectBlock: true },
    };

    // Hero special case: auto-select first chapter
    if (sectionId === 'hero' && manifest.chapters?.length) {
      dispatch({ type: 'SET_ACTIVE_ID', id: manifest.chapters[0].id });
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: null });
      return;
    }

    const mapping = sectionToTab[sectionId];
    if (mapping) {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: mapping.tab as import('@/lib/editor-state').EditorTab });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: mapping.contextSection || null });
      if (mapping.selectBlock) {
        const blockType = sectionId === 'gallery' ? 'photos' : sectionId;
        window.dispatchEvent(new CustomEvent('pearloom-select-block', { detail: { blockType } }));
      }
    } else {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: null });
      window.dispatchEvent(new CustomEvent('pearloom-select-block', { detail: { blockType: sectionId } }));
    }
  }, [dispatch]);

  // ── Inline text edit → update manifest ──────────────────
  const handleTextEdit = useCallback((path: string, value: string) => {
    if (path.startsWith('chapter:')) {
      const [, chapterId, field] = path.split(':');
      const chapter = manifest.chapters?.find(c => c.id === chapterId);
      if (chapter) actions.updateChapter(chapterId, { [field]: value });
    } else {
      // Manifest path edit (e.g., "events.0.name", "poetry.heroTagline", "vibeSkin.accentSymbol")
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(manifest));
      let target: Record<string, unknown> = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i]) : parts[i];
        // Create intermediate objects if they don't exist
        if (target[key as string] === undefined || target[key as string] === null) {
          target[key as string] = {};
        }
        target = target[key as string] as Record<string, unknown>;
      }
      const lastKey = /^\d+$/.test(parts[parts.length - 1]) ? parseInt(parts[parts.length - 1]) : parts[parts.length - 1];
      (target as Record<string | number, unknown>)[lastKey] = value;
      actions.handleDesignChange(updated);
    }
  }, [manifest, actions]);

  // ── Block actions from inline toolbar ─────────────────────
  const handleBlockAction = useCallback((action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete' | 'toggleVisibility', blockId: string) => {
    const blocks = manifest.blocks || [];
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;

    let updated = [...blocks];
    switch (action) {
      case 'moveUp':
        if (idx > 0) [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
        break;
      case 'moveDown':
        if (idx < updated.length - 1) [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
        break;
      case 'duplicate': {
        const dup = { ...blocks[idx], id: `${blocks[idx].type}-dup-${Date.now()}` };
        updated.splice(idx + 1, 0, dup);
        break;
      }
      case 'delete':
        updated = updated.filter(b => b.id !== blockId);
        break;
      case 'toggleVisibility':
        updated = updated.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b);
        break;
    }
    actions.handleDesignChange({ ...manifest, blocks: updated.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions]);

  // ── Canvas drag-to-reorder ──────────────────────────────
  const handleBlockReorder = useCallback((fromIdx: number, toIdx: number) => {
    const blocks = [...(manifest.blocks || [])].filter(b => b.visible).sort((a, b) => a.order - b.order);
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const [moved] = blocks.splice(fromIdx, 1);
    blocks.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, moved);
    actions.handleDesignChange({ ...manifest, blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions]);

  // ── Copy/Paste ──────────────────────────────────────────
  const [clipboardBlock, setClipboardBlock] = useState<PageBlock | null>(null);

  const handleBlockCopy = useCallback((blockId: string) => {
    const block = manifest.blocks?.find(b => b.id === blockId);
    if (block) {
      setClipboardBlock({ ...block });
      setUndoToast('Copied: ' + (block.type || 'section'));
      setTimeout(() => setUndoToast(null), 2000);
    }
  }, [manifest]);

  const handleBlockPaste = useCallback((position: number) => {
    if (!clipboardBlock) return;
    const blocks = [...(manifest.blocks || [])];
    const clampedPos = Math.max(0, Math.min(position, blocks.length));
    const pasted = { ...clipboardBlock, id: `${clipboardBlock.type}-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, config: clipboardBlock.config ? { ...clipboardBlock.config } : undefined };
    blocks.splice(clampedPos, 0, pasted);
    actions.handleDesignChange({ ...manifest, blocks: blocks.map((b, i) => ({ ...b, order: i })) });
    setUndoToast('Pasted: ' + (clipboardBlock.type || 'section'));
    setTimeout(() => setUndoToast(null), 2000);
  }, [manifest, clipboardBlock, actions]);

  // ── Block drop → insert at position ──────────────────────
  const handleBlockDrop = useCallback((blockType: string, position: number) => {
    const blocks = manifest.blocks || [];
    const newBlock = {
      id: `block-${blockType}-${Date.now()}`,
      type: blockType as BlockType,
      order: position,
      visible: true,
    };
    const updated = [...blocks];
    updated.splice(position, 0, newBlock);
    const sorted = updated.map((b, i) => ({ ...b, order: i }));
    actions.handleDesignChange({ ...manifest, blocks: sorted });
  }, [manifest, actions]);

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--pl-cream-deep)',
      }}
    >
      {/* Device switcher moved to toolbar */}

      {/* ── Canvas content — direct DOM rendering ── */}
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isFramed ? 'center' : undefined,
        padding: isFramed ? '80px 20px 20px' : '0',
        overflow: 'auto',
      }}>
        {isFramed ? (
          /* Device frame (tablet/phone) */
          <motion.div
            key={device}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{
              width: frameWidth, maxWidth: '100%',
              borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 12px 48px rgba(43,30,20,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              minHeight: isPhone ? 780 : 600,
              background: 'var(--pl-cream)',
            }}
          >
            <SiteRenderer
              manifest={manifest}
              names={coupleNames}
              onTextEdit={handleTextEdit}
              onSectionClick={handleSectionClick}
              onBlockDrop={handleBlockDrop}
              onBlockReorder={handleBlockReorder}
              onBlockCopy={handleBlockCopy}
              onBlockPaste={handleBlockPaste}
              onBlockAction={handleBlockAction}
              selectedBlockId={state.activeId}
              hasClipboard={!!clipboardBlock}
              editMode
            />
          </motion.div>
        ) : (
          /* Desktop — full bleed with zoom support, padded for toolbar */
          <div ref={scrollContainerRef} style={{
            width: '100%', height: '100%', overflow: 'auto',
            paddingTop: '40px',
            cursor: isPanning ? 'grab' : 'default',
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }}>
            <SiteRenderer
              manifest={manifest}
              names={coupleNames}
              onTextEdit={handleTextEdit}
              onSectionClick={handleSectionClick}
              onBlockDrop={handleBlockDrop}
              onBlockReorder={handleBlockReorder}
              onBlockCopy={handleBlockCopy}
              onBlockPaste={handleBlockPaste}
              onBlockAction={handleBlockAction}
              selectedBlockId={state.activeId}
              hasClipboard={!!clipboardBlock}
              editMode
            />
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, pointerEvents: 'none',
            padding: '6px 16px', borderRadius: '100px',
            background: 'rgba(250,247,242,0.92)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 16px rgba(43,30,20,0.1)',
            fontSize: '0.72rem', fontWeight: 600, color: 'var(--pl-ink)',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {undoToast}
        </motion.div>
      )}

      {/* Pan mode indicator */}
      {isPanning && (
        <div style={{
          position: 'absolute', top: '56px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, padding: '4px 12px', borderRadius: '100px',
          background: 'var(--pl-olive)', color: 'white',
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Panning — release Space to stop
        </div>
      )}
    </div>
  );
}
