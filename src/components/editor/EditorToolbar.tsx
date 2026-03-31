'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Top bar with navigation, actions, device switcher
// Redesigned: 3-zone layout, collapsed viewport popover, plum/gold hierarchy
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Columns2, Settings2, Activity } from 'lucide-react';
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

// ── Viewport Popover (Device + Zoom collapsed) ────────────────
function ViewportPopover({
  device,
  zoom,
  onDeviceChange,
  onZoomChange,
}: {
  device: DeviceMode;
  zoom: number;
  onDeviceChange: (d: DeviceMode) => void;
  onZoomChange: (z: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const ActiveIcon = DEVICE_ICONS[device];

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <motion.button
        onClick={() => setOpen(!open)}
        title="Device & Zoom" aria-label="Device and zoom settings"
        whileHover={{ scale: 1.04, borderColor: 'rgba(214,198,168,0.2)' }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 10px', borderRadius: '6px',
          border: '1px solid rgba(214,198,168,0.12)',
          background: open ? 'rgba(109,89,122,0.18)' : 'transparent',
          color: open ? '#F5F1E8' : 'rgba(255,255,255,0.55)',
          cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
        }}
      >
        <ActiveIcon size={13} />
        <span style={{ letterSpacing: '0.03em' }}>
          {zoom === 1 ? DEVICE_DIMS[device].label : `${Math.round(zoom * 100)}%`}
        </span>
        <Settings2 size={10} style={{ opacity: 0.5 }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '6px',
              width: '200px', padding: '8px',
              background: 'rgba(36,30,26,0.98)',
              border: '1px solid rgba(214,198,168,0.12)',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              zIndex: 100,
            }}
          >
            {/* Device icons */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
              {(Object.keys(DEVICE_DIMS) as DeviceMode[]).map((mode) => {
                const Icon = DEVICE_ICONS[mode];
                const isActive = device === mode;
                return (
                  <motion.button
                    key={mode}
                    aria-label={`Switch to ${DEVICE_DIMS[mode].label} view`}
                    onClick={() => onDeviceChange(mode)}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '4px',
                      background: isActive ? 'rgba(109,89,122,0.22)' : 'transparent',
                      color: isActive ? '#F5F1E8' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Icon size={14} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                      {DEVICE_DIMS[mode].label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(214,198,168,0.08)', margin: '4px 0 8px' }} />
            {/* Zoom */}
            <ZoomControls zoom={zoom} onZoomChange={onZoomChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────
interface EditorToolbarProps {
  onExit: () => void;
}

export function EditorToolbar({ onExit }: EditorToolbarProps) {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const {
    isMobile, device, canUndo, canRedo, saveState, splitView,
    activeId, cmdPaletteOpen, previewZoom,
  } = state;

  return (
    <div style={{
      height: '56px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(36,30,26,0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '0 1rem', gap: '0',
      zIndex: 10,
      boxShadow: 'inset 0 1px 0 rgba(214,198,168,0.08), 0 2px 12px rgba(0,0,0,0.2)',
    } as React.CSSProperties}>

      {/* ═══ LEFT ZONE: Exit + Site Name ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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

        {/* Site name — editorial italic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {manifest.occasion !== 'birthday' && (
            <ElegantHeartIcon size={12} color="var(--eg-gold, #D6C6A8)" />
          )}
          <span style={{
            fontSize: '1rem', fontWeight: 400, color: '#fff',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
            fontStyle: 'italic',
          }}>
            {manifest.occasion === 'birthday'
              ? `${coupleNames[0]}'s Birthday`
              : `${coupleNames[0]} & ${coupleNames[1]}`}
          </span>
        </div>
      </div>

      {/* ═══ ZONE DIVIDER ═══ */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)', margin: '0 12px', flexShrink: 0 }} />

      {/* ═══ CENTER ZONE: Breadcrumb + Cmd Palette ═══ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
        <EditorBreadcrumb />
        <motion.button
          onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })}
          title="Command Palette (Cmd+K)" aria-label="Open command palette"
          whileHover={{ scale: 1.05, borderColor: 'rgba(214,198,168,0.25)', color: 'rgba(255,255,255,0.75)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{
            display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 9px', borderRadius: '6px',
            border: '1px solid rgba(214,198,168,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.04em', minHeight: '32px',
          }}
        >
          <CommandIcon size={10} />
          <kbd style={{ fontFamily: 'inherit', fontWeight: 700 }}>⌘K</kbd>
        </motion.button>
      </div>

      {/* ═══ ZONE DIVIDER ═══ */}
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)', margin: '0 12px', flexShrink: 0 }} />

      {/* ═══ RIGHT ZONE ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

        {/* Undo/Redo — desktop + compact mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <motion.button
            onClick={actions.undo} disabled={!canUndo} title="Undo (Cmd+Z)" aria-label="Undo"
            whileHover={canUndo ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            whileTap={canUndo ? { scale: 0.88 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              padding: isMobile ? '4px 6px' : '5px 8px', borderRadius: '6px', border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: canUndo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)',
              cursor: canUndo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center',
              justifyContent: 'center', minHeight: '36px', minWidth: '36px',
            }}
          ><UndoIcon size={isMobile ? 11 : 13} /></motion.button>
          <motion.button
            onClick={actions.redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" aria-label="Redo"
            whileHover={canRedo ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
            whileTap={canRedo ? { scale: 0.88 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              padding: isMobile ? '4px 6px' : '5px 8px', borderRadius: '6px', border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: canRedo ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)',
              cursor: canRedo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center',
              justifyContent: 'center', minHeight: '36px', minWidth: '36px',
            }}
          ><RedoIcon size={isMobile ? 11 : 13} /></motion.button>
        </div>

        {/* Save status pill — desktop: full, mobile: dot only */}
        <AnimatePresence mode="wait">
          <motion.div
            key={saveState}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: isMobile ? '4px 6px' : '4px 9px', borderRadius: '100px',
              background: saveState === 'saved' ? 'rgba(163,177,138,0.14)' : 'rgba(251,146,60,0.12)',
            }}
          >
            {isMobile ? (
              /* Mobile: status dot only */
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: saveState === 'saved' ? '#A3B18A' : '#fb923c',
              }} />
            ) : (
              /* Desktop: icon + text */
              saveState === 'saved'
                ? <><SavedIcon size={10} color="#A3B18A" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A3B18A', letterSpacing: '0.04em' }}>Saved</span></>
                : <><UnsavedIcon size={10} color="#fb923c" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.04em' }}>Unsaved</span></>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Viewport popover (device + zoom) — desktop only */}
        {!isMobile && (
          <ViewportPopover
            device={device}
            zoom={previewZoom}
            onDeviceChange={(d) => dispatch({ type: 'SET_DEVICE', device: d })}
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
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(214,198,168,0.12)',
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

        {/* Preview button — mobile: icon only */}
        {isMobile && (
          <motion.button
            onClick={actions.storePreviewForOpen}
            title="Preview" aria-label="Preview site"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            style={{
              padding: '5px 7px', borderRadius: '6px', border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', minHeight: '44px', minWidth: '44px',
            }}
          >
            <PreviewIcon size={13} />
          </motion.button>
        )}

        {/* Split + Preview + Publish — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {/* Site Health — AI completeness check */}
            <motion.button
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'blocks' })}
              title="AI Site Health Check"
              whileHover={{ scale: 1.04, backgroundColor: 'rgba(163,177,138,0.12)' }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px',
                border: '1px solid rgba(163,177,138,0.2)',
                background: 'transparent', color: 'rgba(163,177,138,0.9)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
              }}
            >
              <Activity size={12} /> Health
            </motion.button>
            {/* Visual editor / iframe toggle */}
            <motion.button
              onClick={() => dispatch({ type: 'TOGGLE_SPLIT_VIEW' })}
              title={splitView ? 'Switch to production preview' : 'Switch to visual editor'}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px',
                border: `1px solid ${splitView ? 'rgba(163,177,138,0.3)' : 'rgba(214,198,168,0.12)'}`,
                background: splitView ? 'rgba(163,177,138,0.12)' : 'transparent',
                color: splitView ? '#A3B18A' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
              }}
            >
              <Columns2 size={13} /> {splitView ? 'Editor' : 'Iframe'}
            </motion.button>
            {/* Preview — ghost style */}
            <motion.button
              onClick={actions.storePreviewForOpen}
              title="Preview site (Cmd+P)"
              whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.07)' }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 13px', borderRadius: '6px',
                border: '1px solid rgba(214,198,168,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
              }}
            >
              <PreviewIcon size={13} /> Preview
            </motion.button>
            {/* Publish — gradient with plum shadow */}
            <motion.button
              onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
              title="Publish your site"
              whileHover={{ scale: 1.06, boxShadow: '0 6px 24px rgba(109,89,122,0.45)' }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 16px', borderRadius: '7px', border: 'none',
                background: 'linear-gradient(135deg, #A3B18A 0%, #7A917A 50%, #6D597A 100%)',
                color: 'var(--eg-bg, #F5F1E8)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                boxShadow: '0 2px 12px rgba(109,89,122,0.35)',
              }}
            >
              <PublishIcon size={13} /> Publish
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
