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
import type { BlockType } from '@/types';

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, actions } = useEditor();
  const { device, previewZoom } = state;
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoom = previewZoom || 1;

  const isPhone = device === 'mobile';
  const isTablet = device === 'tablet';
  const isFramed = isPhone || isTablet;
  const frameWidth = isPhone ? 390 : isTablet ? 768 : undefined;

  // ── Section click → open matching panel ──────────────────
  const handleSectionClick = useCallback((sectionId: string, chapterId?: string) => {
    if (chapterId) {
      dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
    } else if (sectionId === 'hero' || sectionId === 'story') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
    } else if (sectionId === 'events' || sectionId === 'schedule' || sectionId === 'rsvp' || sectionId === 'countdown') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'events' });
    } else if (sectionId === 'design' || sectionId === 'theme') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
    } else {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
      // Auto-select the matching block
      const blockType = sectionId === 'gallery' ? 'photos' : sectionId;
      window.dispatchEvent(new CustomEvent('pearloom-select-block', { detail: { blockType } }));
    }
  }, [dispatch]);

  // ── Inline text edit → update manifest ──────────────────
  const handleTextEdit = useCallback((path: string, value: string) => {
    if (path.startsWith('chapter:')) {
      const [, chapterId, field] = path.split(':');
      const chapter = manifest.chapters?.find(c => c.id === chapterId);
      if (chapter) actions.updateChapter(chapterId, { [field]: value });
    } else {
      // Manifest path edit (e.g., "events.0.name", "poetry.heroTagline")
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(manifest));
      let target: Record<string, unknown> = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i]) : parts[i];
        if (target[key as string] === undefined) return;
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
      {/* ── Device switcher ── */}
      <div style={{
        position: 'absolute', top: '56px', left: '0', right: '0',
        display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '2px', padding: '4px',
          borderRadius: '100px', pointerEvents: 'auto',
          background: 'rgba(250,247,242,0.78)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.5)',
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
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: 'none',
                background: device === mode ? 'var(--pl-ink)' : 'transparent',
                color: device === mode ? 'white' : 'var(--pl-muted)',
                cursor: 'pointer', position: 'relative', zIndex: 1,
              }}
            >
              <Icon size={14} />
            </motion.button>
          ))}
        </div>
      </div>

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
              onBlockAction={handleBlockAction}
              selectedBlockId={state.activeId}
              editMode
            />
          </motion.div>
        ) : (
          /* Desktop — full bleed with zoom support */
          <div style={{
            width: '100%', height: '100%', overflow: 'auto',
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: 'center top',
            transition: 'transform 0.2s ease',
          }}>
            <SiteRenderer
              manifest={manifest}
              names={coupleNames}
              onTextEdit={handleTextEdit}
              onSectionClick={handleSectionClick}
              onBlockDrop={handleBlockDrop}
              onBlockAction={handleBlockAction}
              selectedBlockId={state.activeId}
              editMode
            />
          </div>
        )}
      </div>
    </div>
  );
}
