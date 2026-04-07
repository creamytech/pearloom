'use client';

// -----------------------------------------------------------------
// Pearloom / FloatingToolbar.tsx --- Enhanced glassmorphic floating
// action bar at the bottom-center of the canvas.
// Includes: Move, Style, Add, Undo/Redo, device switcher mini
// pills, and zoom shortcut. Keyboard shortcut tooltips on hover.
// -----------------------------------------------------------------

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical,
  Paintbrush,
  Plus,
  Undo2,
  Redo2,
  Blend,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
} from 'lucide-react';
import { useEditor, type DeviceMode } from '@/lib/editor-state';

// ── Spring presets ────────────────────────────────────────────
const SPRING_MOUNT = { type: 'spring' as const, stiffness: 340, damping: 24 };
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 400, damping: 26 };
const SPRING_TAP = { type: 'spring' as const, stiffness: 500, damping: 30 };

const TOOLS = [
  { id: 'move',  Icon: GripVertical, label: 'Move',  shortcut: null, tab: 'canvas' as const },
  { id: 'style', Icon: Paintbrush,   label: 'Style', shortcut: '\u23183', tab: 'design' as const },
  { id: 'add',   Icon: Plus,         label: 'Add',   shortcut: null, tab: 'canvas' as const, primary: true },
  { id: 'undo',  Icon: Undo2,        label: 'Undo',  shortcut: '\u2318Z', tab: null },
  { id: 'redo',  Icon: Redo2,        label: 'Redo',  shortcut: '\u2318\u21E7Z', tab: null },
  { id: 'fade',  Icon: Blend,        label: 'Fade',  shortcut: null, tab: 'design' as const },
] as const;

const DEVICES: { mode: DeviceMode; Icon: typeof Monitor; label: string }[] = [
  { mode: 'desktop', Icon: Monitor,    label: 'Desktop' },
  { mode: 'tablet',  Icon: Tablet,     label: 'Tablet' },
  { mode: 'mobile',  Icon: Smartphone, label: 'Mobile' },
];

export function FloatingToolbar() {
  const { state, dispatch, actions } = useEditor();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleClick = (tool: typeof TOOLS[number]) => {
    if (tool.id === 'undo') {
      actions.undo();
      return;
    }
    if (tool.id === 'redo') {
      actions.redo();
      return;
    }
    if (tool.tab) {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: tool.tab });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING_MOUNT, delay: 0.25 }}
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '0',
        right: '0',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      } as React.CSSProperties}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 8px',
          borderRadius: '100px',
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow:
            '0 4px 24px rgba(43,30,20,0.1), 0 1px 4px rgba(43,30,20,0.06)',
          position: 'relative',
        } as React.CSSProperties}
      >
        {/* ---- Main tools ---- */}
        {TOOLS.map((tool) => {
          const Icon = tool.Icon;
          const isPrimary = 'primary' in tool && tool.primary;
          const isActive = tool.tab && state.activeTab === tool.tab;
          const isUndo = tool.id === 'undo';
          const isRedo = tool.id === 'redo';
          const isDisabled =
            (isUndo && !state.canUndo) || (isRedo && !state.canRedo);

          const tooltipText = tool.shortcut
            ? `${tool.label} (${tool.shortcut})`
            : tool.label;

          return (
            <div key={tool.id} style={{ position: 'relative' }}>
              <motion.button
                onClick={() => handleClick(tool)}
                disabled={isDisabled}
                whileHover={!isDisabled ? {
                  scale: 1.08,
                  y: isPrimary ? -3 : -2,
                  boxShadow: isPrimary
                    ? '0 6px 20px rgba(110,140,92,0.4)'
                    : '0 4px 12px rgba(43,30,20,0.1)',
                } : {}}
                whileTap={!isDisabled ? { scale: 0.9 } : {}}
                transition={SPRING_TAP}
                onMouseEnter={() => setTooltip(tooltipText)}
                onMouseLeave={() => setTooltip(null)}
                title={tooltipText}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  border: 'none',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  borderRadius: isPrimary ? '50%' : '12px',
                  padding: isPrimary ? '0' : '8px 14px',
                  width: isPrimary ? '44px' : 'auto',
                  height: isPrimary ? '44px' : 'auto',
                  background: isPrimary
                    ? 'var(--pl-olive-deep)'
                    : 'transparent',
                  color: isPrimary
                    ? '#fff'
                    : isActive
                      ? 'var(--pl-olive-deep)'
                      : 'var(--pl-muted)',
                  opacity: isDisabled ? 0.35 : 1,
                  position: 'relative',
                }}
              >
                {/* Shared layout olive background slides to active tool */}
                {isActive && !isPrimary && (
                  <motion.div
                    layoutId="floating-toolbar-active"
                    style={{
                      position: 'absolute', inset: 0,
                      borderRadius: '12px',
                      background: 'rgba(163,177,138,0.12)',
                      zIndex: -1,
                    }}
                    transition={SPRING_SNAPPY}
                  />
                )}
                <Icon
                  size={isPrimary ? 20 : 16}
                  strokeWidth={isPrimary ? 2.5 : 2}
                />
                {!isPrimary && (
                  <span
                    style={{
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}
                  >
                    {tool.label}
                  </span>
                )}
              </motion.button>
            </div>
          );
        })}

        {/* ---- Divider ---- */}
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'rgba(0,0,0,0.08)',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        {/* ---- Device switcher mini pills ---- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px',
            borderRadius: '100px',
            background: 'rgba(0,0,0,0.03)',
          }}
        >
          {DEVICES.map(({ mode, Icon, label }) => {
            const isDeviceActive = state.device === mode;
            return (
              <motion.button
                key={mode}
                onClick={() => dispatch({ type: 'SET_DEVICE', device: mode })}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.85 }}
                onMouseEnter={() => setTooltip(label)}
                onMouseLeave={() => setTooltip(null)}
                transition={SPRING_SNAPPY}
                title={label}
                style={{
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  color: isDeviceActive ? 'white' : 'var(--pl-muted)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Shared layout sliding active pill */}
                {isDeviceActive && (
                  <motion.div
                    layoutId="floating-device-active"
                    style={{
                      position: 'absolute', inset: 0,
                      borderRadius: '50%',
                      background: 'var(--pl-ink)',
                      zIndex: -1,
                    }}
                    transition={SPRING_SNAPPY}
                  />
                )}
                <Icon size={11} />
              </motion.button>
            );
          })}
        </div>

        {/* ---- Divider ---- */}
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'rgba(0,0,0,0.08)',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        {/* ---- Zoom shortcut indicator ---- */}
        <motion.button
          onClick={() => {
            // Quick zoom toggle: if zoomed, reset; else zoom to 75%
            const newZoom = state.previewZoom !== 1 ? 1 : 0.75;
            dispatch({ type: 'SET_PREVIEW_ZOOM', zoom: newZoom });
          }}
          whileHover={{ scale: 1.08, y: -2, backgroundColor: 'rgba(0,0,0,0.04)' }}
          whileTap={{ scale: 0.9 }}
          transition={SPRING_TAP}
          onMouseEnter={() => setTooltip('Zoom (\u2318+/\u2318-)')}
          onMouseLeave={() => setTooltip(null)}
          title="Zoom (\u2318+/\u2318-)"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '8px 10px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color:
              state.previewZoom !== 1
                ? 'var(--pl-olive, #A3B18A)'
                : 'var(--pl-muted)',
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          <ZoomIn size={14} />
          <span
            style={{
              fontSize: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(state.previewZoom * 100)}%
          </span>
        </motion.button>

        {/* ---- Tooltip ---- */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              key={tooltip}
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={SPRING_SNAPPY}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(30,25,20,0.92)',
                color: 'white',
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {tooltip}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
