'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Top bar with navigation, actions, device switcher
// Extracted from FullscreenEditor lines ~1172-1430
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Columns2 } from 'lucide-react';
import {
  ExitIcon, PreviewIcon, PublishIcon, UndoIcon, RedoIcon, CommandIcon,
  SavedIcon, UnsavedIcon,
} from '@/components/icons/EditorIcons';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type DeviceMode, DEVICE_DIMS } from '@/lib/editor-state';
import { EditorBreadcrumb } from './EditorBreadcrumb';
import { ZoomControls } from './ZoomControls';
import type { Chapter } from '@/types';

const DEVICE_ICONS: Record<DeviceMode, React.ElementType> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

interface EditorToolbarProps {
  onExit: () => void;
}

export function EditorToolbar({ onExit }: EditorToolbarProps) {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const {
    isMobile, device, canUndo, canRedo, saveState, splitView,
    activeId, cmdPaletteOpen,
  } = state;
  const { chapters } = state;

  return (
    <div style={{
      height: '52px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(36,30,26,0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '0 1rem', gap: '0.75rem',
      zIndex: 10,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 2px 12px rgba(0,0,0,0.2)',
    } as React.CSSProperties}>
      {/* Exit */}
      <motion.button
        onClick={onExit}
        title="Exit editor"
        whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.11)' }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '6px 10px', borderRadius: '6px', border: 'none',
          background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)',
          cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0,
        }}
      >
        <ExitIcon size={14} /> Exit
      </motion.button>

      {/* Site name + breadcrumb — centered */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {manifest.occasion !== 'birthday' && (
            <ElegantHeartIcon size={12} color="var(--eg-gold, #D6C6A8)" />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {manifest.occasion === 'birthday'
              ? `${coupleNames[0]}'s Birthday`
              : `${coupleNames[0]} & ${coupleNames[1]}`}
          </span>
          <motion.button
            onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })}
            title="Command Palette (Cmd+K)"
            whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 9px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            <CommandIcon size={10} />
            <kbd style={{ fontFamily: 'inherit', fontWeight: 700 }}>⌘K</kbd>
          </motion.button>
        </div>
        <EditorBreadcrumb />

        {/* Contextual chapter actions */}
        <AnimatePresence>
          {activeId && !isMobile && (
            <motion.div
              key="ctx-actions"
              initial={{ opacity: 0, scale: 0.88, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}
            >
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', marginRight: '4px' }} />
              {/* Duplicate */}
              <motion.button
                title="Duplicate chapter (⌘D)"
                onClick={() => {
                  const original = chapters.find(c => c.id === activeId);
                  if (!original) return;
                  const copyId = `ch-${Date.now()}`;
                  const copy: Chapter = { ...original, id: copyId, title: `${original.title} (copy)`, order: (original.order ?? 0) + 0.5 };
                  const next = [...chapters, copy].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                  dispatch({ type: 'SET_CHAPTERS', chapters: next });
                  dispatch({ type: 'SET_ACTIVE_ID', id: copyId });
                  actions.syncManifest(next);
                }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}
              >
                ⌘D Duplicate
              </motion.button>
              {/* Delete */}
              <motion.button
                title="Delete chapter"
                onClick={() => actions.deleteChapter(activeId)}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(248,113,113,0.14)', color: '#f87171' }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}
              >
                Delete
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save status + Undo/Redo — desktop only */}
      <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <motion.button
          onClick={actions.undo} disabled={!canUndo} title="Undo (Cmd+Z)"
          whileHover={canUndo ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
          whileTap={canUndo ? { scale: 0.88 } : {}}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: canUndo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', cursor: canUndo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}
        ><UndoIcon size={13} /></motion.button>
        <motion.button
          onClick={actions.redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)"
          whileHover={canRedo ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
          whileTap={canRedo ? { scale: 0.88 } : {}}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: canRedo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', cursor: canRedo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}
        ><RedoIcon size={13} /></motion.button>
        {/* Save status pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={saveState}
            initial={{ opacity: 0, scale: 0.85, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 9px', borderRadius: '100px',
              background: saveState === 'saved' ? 'rgba(163,177,138,0.14)' : 'rgba(251,146,60,0.12)',
            }}
          >
            {saveState === 'saved'
              ? <><SavedIcon size={10} color="#A3B18A" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A3B18A', letterSpacing: '0.04em' }}>Saved</span></>
              : <><UnsavedIcon size={10} color="#fb923c" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.04em' }}>Unsaved</span></>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Device switcher — desktop only */}
      <div style={{ display: isMobile ? 'none' : 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', flexShrink: 0, position: 'relative' }}>
        {(Object.keys(DEVICE_DIMS) as DeviceMode[]).map((mode) => {
          const Icon = DEVICE_ICONS[mode];
          return (
            <motion.button
              key={mode}
              onClick={() => dispatch({ type: 'SET_DEVICE', device: mode })}
              title={DEVICE_DIMS[mode].label}
              whileHover={{ color: device === mode ? '#fff' : 'rgba(255,255,255,0.75)' }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                padding: '5px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: device === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                display: 'flex', position: 'relative', zIndex: 1,
              }}
            >
              {device === mode && (
                <motion.div
                  layoutId="device-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '6px',
                    background: 'rgba(255,255,255,0.14)',
                    zIndex: -1,
                  }}
                />
              )}
              <Icon size={14} />
            </motion.button>
          );
        })}
      </div>

      {/* Zoom controls — desktop only */}
      {!isMobile && (
        <ZoomControls
          zoom={state.previewZoom}
          onZoomChange={(z) => dispatch({ type: 'SET_PREVIEW_ZOOM', zoom: z })}
        />
      )}

      {/* Language picker — desktop only, shown only when translations exist */}
      {!isMobile && manifest.translations && Object.keys(manifest.translations).length > 0 && (
        <select
          value={manifest.activeLocale || 'en'}
          onChange={(e) => {
            const next = { ...manifest, activeLocale: e.target.value };
            actions.handleDesignChange(next);
          }}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', borderRadius: '0.5rem', padding: '0.3rem 0.5rem',
            fontSize: '0.75rem', cursor: 'pointer',
          }}
        >
          <option value="en">🌐 EN</option>
          {Object.keys(manifest.translations).map(locale => (
            <option key={locale} value={locale}>{locale.toUpperCase()}</option>
          ))}
        </select>
      )}

      {/* Preview + Publish — desktop only */}
      <div style={{ display: isMobile ? 'none' : 'flex', gap: '6px', flexShrink: 0 }}>
        {/* Split view toggle */}
        <motion.button
          onClick={() => dispatch({ type: 'TOGGLE_SPLIT_VIEW' })}
          title="Toggle split-pane preview"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', borderRadius: '6px',
            border: `1px solid ${splitView ? 'rgba(163,177,138,0.5)' : 'rgba(255,255,255,0.12)'}`,
            background: splitView ? 'rgba(163,177,138,0.15)' : 'transparent',
            color: splitView ? 'var(--eg-accent, #A3B18A)' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
          }}
        >
          <Columns2 size={13} /> Split
        </motion.button>
        <motion.button
          onClick={actions.storePreviewForOpen}
          title="Preview site (Cmd+P)"
          whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.07)' }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 13px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
          }}
        >
          <PreviewIcon size={13} /> Preview
        </motion.button>
        <motion.button
          onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
          title="Publish your site"
          whileHover={{ scale: 1.06, boxShadow: '0 6px 24px rgba(163,177,138,0.55)' }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 16px', borderRadius: '7px', border: 'none',
            background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
            color: 'var(--eg-bg, #F5F1E8)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
            boxShadow: '0 2px 12px rgba(163,177,138,0.35)',
          }}
        >
          <PublishIcon size={13} /> Publish
        </motion.button>
      </div>
    </div>
  );
}
