'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ResponsiveControls.tsx
// Inline wrapper that makes any editor input responsive-aware.
// Shows device toggles next to the input, with a "Same for all" link/unlink toggle.
// Glass styling matching the Pearloom design system.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Link2, Unlink2 } from 'lucide-react';
import { useEditor, type DeviceMode } from '@/lib/editor-state';
import { BREAKPOINTS, type ResponsiveValue } from '@/lib/breakpoint-utils';

const DEVICE_LIST: { mode: DeviceMode; Icon: React.ElementType; label: string }[] = [
  { mode: 'desktop', Icon: Monitor, label: 'Desktop' },
  { mode: 'tablet', Icon: Tablet, label: 'Tablet' },
  { mode: 'mobile', Icon: Smartphone, label: 'Mobile' },
];

interface ResponsiveControlsProps<T> {
  /** The current responsive (or uniform) value */
  value: ResponsiveValue<T> | T;
  /** Called when the value changes for a specific breakpoint or uniformly */
  onChange: (next: ResponsiveValue<T> | T) => void;
  /** Fallback value when no breakpoint override exists */
  fallback: T;
  /** Render the actual input control, receiving the current value and an onChange for it */
  children: (props: {
    currentValue: T;
    onValueChange: (v: T) => void;
    activeDevice: DeviceMode;
  }) => ReactNode;
  /** Optional label shown above the controls */
  label?: string;
}

export function ResponsiveControls<T>({
  value,
  onChange,
  fallback,
  children,
  label,
}: ResponsiveControlsProps<T>) {
  const { state } = useEditor();

  // Whether values are linked across all breakpoints ("same for all")
  const isLinked = typeof value !== 'object' || value === null || !isResponsiveObj(value);

  // The device currently being edited in this control
  const [editingDevice, setEditingDevice] = useState<DeviceMode>(state.device);

  // Resolve the current value for the editing device
  const resolveForDevice = useCallback(
    (device: DeviceMode): T => {
      if (isLinked) return value as T;
      const rv = value as ResponsiveValue<T>;
      if (device === 'mobile') return rv.mobile ?? rv.tablet ?? rv.desktop ?? fallback;
      if (device === 'tablet') return rv.tablet ?? rv.desktop ?? fallback;
      return rv.desktop ?? fallback;
    },
    [value, isLinked, fallback],
  );

  const currentValue = isLinked ? (value as T) : resolveForDevice(editingDevice);

  // Handle value change for the current device
  const handleValueChange = useCallback(
    (v: T) => {
      if (isLinked) {
        onChange(v);
      } else {
        const rv = (value as ResponsiveValue<T>) || {};
        onChange({ ...rv, [editingDevice]: v });
      }
    },
    [isLinked, value, editingDevice, onChange],
  );

  // Toggle linked/unlinked
  const handleToggleLinked = useCallback(() => {
    if (isLinked) {
      // Unlink: create a responsive object with the current value for all breakpoints
      const v = value as T;
      onChange({ desktop: v, tablet: v, mobile: v });
    } else {
      // Link: collapse to the desktop value
      const rv = value as ResponsiveValue<T>;
      onChange(rv.desktop ?? fallback);
    }
  }, [isLinked, value, fallback, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Header row: label + device toggles + link button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        minHeight: '28px',
      }}>
        {label && (
          <span style={{
            fontSize: 'var(--pl-text-sm)', fontWeight: 700,
            color: 'var(--pl-ink-soft)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginRight: 'auto',
          }}>
            {label}
          </span>
        )}

        {/* Device toggles */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1px',
          padding: '2px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--pl-black-4)',
        } as React.CSSProperties}>
          {DEVICE_LIST.map(({ mode, Icon, label: deviceLabel }) => {
            const isActive = editingDevice === mode && !isLinked;
            const hasOverride = !isLinked && (value as ResponsiveValue<T>)?.[mode] !== undefined;
            return (
              <motion.button
                key={mode}
                onClick={() => {
                  if (!isLinked) setEditingDevice(mode);
                }}
                title={isLinked ? `Linked - ${deviceLabel}` : `Edit ${deviceLabel} value`}
                aria-label={`Edit ${deviceLabel} breakpoint`}
                whileHover={!isLinked ? { scale: 1.08 } : {}}
                whileTap={!isLinked ? { scale: 0.9 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{
                  width: '24px', height: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '6px', border: 'none',
                  background: isActive ? 'var(--pl-olive)' : 'transparent',
                  color: isActive
                    ? 'white'
                    : isLinked
                      ? 'var(--pl-muted)'
                      : hasOverride
                        ? 'var(--pl-olive-deep)'
                        : 'var(--pl-muted)',
                  cursor: isLinked ? 'default' : 'pointer',
                  opacity: isLinked ? 0.45 : 1,
                  transition: 'background 0.15s, color 0.15s, opacity 0.15s',
                  position: 'relative',
                }}
              >
                <Icon size={12} />
                {/* Dot indicator for overrides */}
                {hasOverride && !isActive && (
                  <div style={{
                    position: 'absolute', bottom: '1px', right: '1px',
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: 'var(--pl-olive)',
                  }} />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Link/Unlink toggle */}
        <motion.button
          onClick={handleToggleLinked}
          title={isLinked ? 'Unlink: set different values per breakpoint' : 'Link: same value for all breakpoints'}
          aria-label={isLinked ? 'Unlink breakpoints' : 'Link breakpoints'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            width: '26px', height: '26px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '6px', border: '1px solid var(--pl-black-6)',
            background: isLinked ? 'var(--pl-olive-15)' : 'var(--pl-white-20)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: isLinked ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          } as React.CSSProperties}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isLinked ? 'linked' : 'unlinked'}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex' }}
            >
              {isLinked ? <Link2 size={12} /> : <Unlink2 size={12} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Active device indicator when unlinked */}
      <AnimatePresence>
        {!isLinked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px',
              borderRadius: '100px',
              background: 'var(--pl-olive-mist)',
              fontSize: 'var(--pl-text-2xs)', fontWeight: 700,
              color: 'var(--pl-olive-deep)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }}>
              {DEVICE_LIST.find(d => d.mode === editingDevice)?.Icon &&
                (() => {
                  const DevIcon = DEVICE_LIST.find(d => d.mode === editingDevice)!.Icon;
                  return <DevIcon size={10} />;
                })()
              }
              {editingDevice} &middot; {BREAKPOINTS[editingDevice]}px
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The actual input control */}
      {children({
        currentValue,
        onValueChange: handleValueChange,
        activeDevice: isLinked ? state.device : editingDevice,
      })}
    </div>
  );
}

/** Type guard for responsive objects */
function isResponsiveObj<T>(value: unknown): value is ResponsiveValue<T> {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value as Record<string, unknown>);
  const responsiveKeys = ['desktop', 'tablet', 'mobile'];
  return keys.length > 0 && keys.every(k => responsiveKeys.includes(k));
}
