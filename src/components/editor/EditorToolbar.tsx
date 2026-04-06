'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorToolbar.tsx — Top bar with navigation, actions, device switcher
// Redesigned: 3-zone layout, collapsed viewport popover, plum/gold hierarchy
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Settings2, Activity } from 'lucide-react';
import {
  ExitIcon, PreviewIcon, PublishIcon, UndoIcon, RedoIcon, CommandIcon,
  SavedIcon, UnsavedIcon,
} from '@/components/icons/EditorIcons';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type DeviceMode, DEVICE_DIMS } from '@/lib/editor-state';
import { EditorBreadcrumb } from './EditorBreadcrumb';
import { ZoomControls } from './ZoomControls';
import { CollabPresence } from './CollabPresence';
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
          border: '1px solid var(--pl-divider)',
          background: open ? 'var(--pl-olive-mist)' : 'transparent',
          color: open ? 'var(--pl-ink)' : 'var(--pl-muted)',
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
              background: 'var(--pl-cream-card)',
              border: '1px solid var(--pl-divider)',
              borderRadius: '16px',
              boxShadow: 'var(--pl-shadow-md)',
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
                    whileHover={{ backgroundColor: 'rgba(163,177,138,0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '4px',
                      background: isActive ? 'var(--pl-olive-mist)' : 'transparent',
                      color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
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
            <div style={{ height: '1px', background: 'var(--pl-divider)', margin: '4px 0 8px' }} />
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
  const { data: session } = useSession();
  const {
    isMobile, device, canUndo, canRedo, saveState, splitView,
    activeId, cmdPaletteOpen, previewZoom,
  } = state;

  return (
    <div style={{
      height: '44px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid var(--pl-divider)',
      background: 'var(--pl-cream-card)',
      padding: '0 1rem', gap: '0',
      zIndex: 10,
      boxShadow: 'var(--pl-shadow-xs)',
    } as React.CSSProperties}>

      {/* ═══ LEFT ZONE: Heirloom Builder branding ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <motion.button
          onClick={onExit}
          title="Back to dashboard"
          whileHover={{ opacity: 0.7 }}
          whileTap={{ scale: 0.96 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0',
            padding: '0', border: 'none',
            background: 'transparent', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <span style={{
            fontSize: '1.05rem', fontWeight: 600, color: 'var(--pl-ink-soft)',
            fontFamily: 'var(--pl-font-heading)',
            letterSpacing: '-0.02em',
          }}>
            Heirloom Builder
          </span>
        </motion.button>

        {/* Save status indicator */}
        {!isMobile && (
          <span style={{
            fontSize: '0.68rem', fontWeight: 600,
            color: saveState === 'saved' ? 'var(--pl-muted)' : 'var(--pl-warning)',
            letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            {saveState === 'saved' ? '' : '|'}
            {saveState === 'saved' ? '' : ` STATUS: ${saveState === 'unsaved' ? 'UNSAVED' : 'SAVING...'}`}
          </span>
        )}
      </div>

      {/* ═══ CENTER TABS: Drafts / Archive / Shared ═══ */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginLeft: '20px' }}>
          {['Drafts', 'Archive', 'Shared'].map((tab, i) => (
            <button
              key={tab}
              style={{
                padding: '6px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: i === 0 ? 700 : 500,
                letterSpacing: '0.04em',
                color: i === 0 ? 'var(--pl-ink)' : 'var(--pl-muted)',
                borderBottom: i === 0 ? '2px solid var(--pl-ink)' : '2px solid transparent',
                textTransform: 'uppercase',
                transition: 'color 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ═══ ZONE DIVIDER (desktop only) ═══ */}
      {!isMobile && <div style={{ width: '1px', height: '24px', background: 'var(--pl-divider)', margin: '0 12px', flexShrink: 0 }} />}

      {/* ═══ CENTER ZONE: Breadcrumb + Cmd Palette (desktop only) ═══ */}
      <div style={{ flex: 1, display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
        <EditorBreadcrumb />
        <motion.button
          onClick={() => dispatch({ type: 'SET_CMD_PALETTE', open: true })}
          title="Command Palette (Cmd+K)" aria-label="Open command palette"
          whileHover={{ scale: 1.05, borderColor: 'var(--pl-olive)', color: 'var(--pl-olive)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{
            display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 9px', borderRadius: '6px',
            border: '1px solid var(--pl-divider)',
            background: 'var(--pl-cream-deep)', color: 'var(--pl-muted)',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.04em', minHeight: '32px',
          }}
        >
          <CommandIcon size={10} />
          <kbd style={{ fontFamily: 'inherit', fontWeight: 700 }}>⌘K</kbd>
        </motion.button>
      </div>

      {/* ═══ ZONE DIVIDER (desktop only) ═══ */}
      {!isMobile && <div style={{ width: '1px', height: '24px', background: 'var(--pl-divider)', margin: '0 12px', flexShrink: 0 }} />}

      {/* ═══ RIGHT ZONE ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

        {/* Undo/Redo — desktop only */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <motion.button
            onClick={actions.undo} disabled={!canUndo} title="Undo (Cmd+Z)" aria-label="Undo"
            whileHover={canUndo ? { scale: 1.1, backgroundColor: 'rgba(0,0,0,0.06)' } : {}}
            whileTap={canUndo ? { scale: 0.88 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              padding: isMobile ? '4px 6px' : '5px 8px', borderRadius: '6px', border: 'none',
              background: 'var(--pl-cream-deep)',
              color: canUndo ? 'var(--pl-ink-soft)' : 'var(--pl-muted)',
              cursor: canUndo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center',
              justifyContent: 'center', minHeight: '36px', minWidth: '36px',
              filter: canUndo ? 'none' : 'grayscale(1)',
              transition: 'color 0.15s, filter 0.15s',
            }}
          ><UndoIcon size={isMobile ? 11 : 13} /></motion.button>
          <motion.button
            onClick={actions.redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)" aria-label="Redo"
            whileHover={canRedo ? { scale: 1.1, backgroundColor: 'rgba(0,0,0,0.06)' } : {}}
            whileTap={canRedo ? { scale: 0.88 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              padding: isMobile ? '4px 6px' : '5px 8px', borderRadius: '6px', border: 'none',
              background: 'var(--pl-cream-deep)',
              color: canRedo ? 'var(--pl-ink-soft)' : 'var(--pl-muted)',
              cursor: canRedo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center',
              justifyContent: 'center', minHeight: '36px', minWidth: '36px',
              filter: canRedo ? 'none' : 'grayscale(1)',
              transition: 'color 0.15s, filter 0.15s',
            }}
          ><RedoIcon size={isMobile ? 11 : 13} /></motion.button>
        </div>

        {/* Save status pill — desktop: full, mobile: dot only */}
        <AnimatePresence mode="wait">
          <motion.div
            key={saveState}
            initial={{ opacity: 0, scale: 0.75, y: 4 }}
            animate={saveState === 'saved'
              ? { opacity: 1, scale: [0.75, 1.14, 1], y: 0 }
              : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -3 }}
            transition={saveState === 'saved'
              ? { duration: 0.5, times: [0, 0.5, 1], ease: 'easeOut' }
              : { type: 'spring', stiffness: 380, damping: 24 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: isMobile ? '4px 6px' : '4px 9px', borderRadius: '100px',
              background: saveState === 'saved' ? 'rgba(163,177,138,0.14)' : 'rgba(251,146,60,0.12)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Shimmer sweep on save */}
            {saveState === 'saved' && !isMobile && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 0%, rgba(163,177,138,0.3) 50%, transparent 100%)',
                animation: 'pl-shimmer-sweep 0.7s ease-out forwards',
                borderRadius: 'inherit',
              }} />
            )}
            {isMobile ? (
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: saveState === 'saved' ? '#A3B18A' : '#fb923c',
                animation: saveState === 'unsaved' ? 'pl-heartbeat 1.2s ease-in-out infinite' : 'none',
              }} />
            ) : (
              saveState === 'saved'
                ? <><SavedIcon size={10} color="#A3B18A" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A3B18A', letterSpacing: '0.04em' }}>Saved</span></>
                : <><UnsavedIcon size={10} color="#fb923c" style={{ animation: 'pl-heartbeat 1.2s ease-in-out infinite' }} /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.04em' }}>Unsaved</span></>
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
              background: 'var(--pl-cream-deep)', border: '1px solid var(--pl-divider)',
              color: 'var(--pl-ink-soft)', borderRadius: '0.5rem', padding: '0.3rem 0.5rem',
              fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            <option value="en">🌐 EN</option>
            {Object.keys(manifest.translations).map(locale => (
              <option key={locale} value={locale}>{locale.toUpperCase()}</option>
            ))}
          </select>
        )}

        {/* Publish — mobile only, pill style */}
        {isMobile && (
          <motion.button
            onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
            title="Publish your site" aria-label="Publish"
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '100px', border: 'none',
              background: 'var(--pl-olive-deep)',
              color: '#fff', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              boxShadow: '0 2px 12px rgba(110,140,92,0.3)',
              minHeight: '38px',
            }}
          >
            <PublishIcon size={13} />
            Publish
          </motion.button>
        )}

        {/* Preview + Share + Publish — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {/* Preview — opens production rendering in new tab */}
            <motion.button
              onClick={actions.storePreviewForOpen}
              title="Preview site (Cmd+P)"
              whileHover={{ scale: 1.04, backgroundColor: 'var(--pl-cream-deep)' }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 13px', borderRadius: '6px',
                border: '1px solid var(--pl-divider)',
                background: 'transparent', color: 'var(--pl-ink-soft)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
              }}
            >
              <PreviewIcon size={13} /> Preview
            </motion.button>
            {/* Collab presence avatars */}
            {session?.user && state.subdomain && (
              <CollabPresence
                siteId={state.subdomain}
                currentUser={{
                  id: session.user.email || 'anon',
                  name: session.user.name || session.user.email || 'Editor',
                }}
                cursor={state.activeTab}
              />
            )}

            {/* Publish — prominent primary CTA */}
            <motion.button
              onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
              title="Publish your site"
              whileHover={{ scale: 1.06, boxShadow: '0 8px 28px rgba(163,177,138,0.5)' }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 22px', borderRadius: '100px', border: 'none',
                background: 'var(--pl-olive-deep)',
                color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                boxShadow: '0 2px 12px rgba(110,140,92,0.3)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
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
