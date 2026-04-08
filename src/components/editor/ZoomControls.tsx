'use client';

// -----------------------------------------------------------------
// Pearloom / ZoomControls.tsx --- Enhanced glassmorphic zoom panel
// Floating pill with preset zoom levels, plus/minus, fit-to-screen,
// and keyboard shortcuts. Spring animations between zoom levels.
// -----------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize, ChevronDown } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** Ref to the canvas container -- used by "Fit" to auto-calculate zoom */
  canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const STEP = 0.1;

const PRESETS = [
  { label: 'Fit', value: 'fit' as const },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
] as const;

export function ZoomControls({
  zoom,
  onZoomChange,
  canvasContainerRef,
  className,
}: ZoomControlsProps) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ---- Handlers ------------------------------------------------

  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(MAX_ZOOM, Math.round((zoom + STEP) * 10) / 10));
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(MIN_ZOOM, Math.round((zoom - STEP) * 10) / 10));
  }, [zoom, onZoomChange]);

  const handleFit = useCallback(() => {
    if (!canvasContainerRef?.current) {
      onZoomChange(1);
      return;
    }
    const container = canvasContainerRef.current;
    const cw = container.clientWidth - 40; // subtract padding
    const ch = container.clientHeight - 80;
    // The desktop preview card is max 1120px wide, ~100% tall
    const fitW = cw / 1120;
    const fitH = ch / 800; // approximate viewport height
    const fit = Math.min(fitW, fitH, 1.5);
    onZoomChange(Math.round(Math.max(MIN_ZOOM, fit) * 100) / 100);
  }, [canvasContainerRef, onZoomChange]);

  const handlePresetClick = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      if (preset.value === 'fit') {
        handleFit();
      } else {
        onZoomChange(preset.value);
      }
      setPresetsOpen(false);
    },
    [handleFit, onZoomChange],
  );

  // ---- Keyboard shortcuts (Cmd+= / Cmd+- / Cmd+0) -------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        onZoomChange(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleZoomIn, handleZoomOut, onZoomChange]);

  // ---- Click outside to dismiss presets dropdown ----------------

  useEffect(() => {
    if (!presetsOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPresetsOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [presetsOpen]);

  const pct = Math.round(zoom * 100);

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px',
        borderRadius: '100px',
        background: 'var(--pl-glass-light)',
        backdropFilter: 'var(--pl-glass-blur)',
        WebkitBackdropFilter: 'var(--pl-glass-blur)',
        border: '1px solid var(--pl-glass-light-border)',
        boxShadow:
          'var(--pl-glass-shadow)',
      } as React.CSSProperties}
    >
      {/* Zoom out */}
      <motion.button
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        whileHover={{ scale: 1.12, backgroundColor: 'var(--pl-black-6)' }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        title="Zoom out (Cmd+-)"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color:
            zoom <= MIN_ZOOM ? 'rgba(0,0,0,0.12)' : 'var(--pl-ink-soft)',
          cursor: zoom <= MIN_ZOOM ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ZoomOut size={14} />
      </motion.button>

      {/* Percentage display / preset dropdown toggle */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <motion.button
          onClick={() => setPresetsOpen((v) => !v)}
          whileHover={{ backgroundColor: 'var(--pl-black-6)' }}
          whileTap={{ scale: 0.95 }}
          title="Zoom presets"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            padding: '4px 10px',
            borderRadius: '100px',
            border: 'none',
            background: presetsOpen ? 'var(--pl-black-6)' : 'transparent',
            color: zoom === 1 ? 'var(--pl-muted)' : 'var(--pl-olive, #A3B18A)',
            cursor: 'pointer',
            fontSize: 'var(--pl-text-sm)',
            fontWeight: 700,
            letterSpacing: '0.02em',
            minWidth: '52px',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <motion.span
            key={pct}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {pct}%
          </motion.span>
          <ChevronDown
            size={10}
            style={{
              transition: 'transform 0.2s',
              transform: presetsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </motion.button>

        {/* Presets dropdown */}
        <AnimatePresence>
          {presetsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                minWidth: '120px',
                padding: '4px',
                borderRadius: '12px',
                background: 'var(--pl-glass-heavy)',
                backdropFilter: 'var(--pl-glass-blur)',
                WebkitBackdropFilter: 'var(--pl-glass-blur)',
                border: '1px solid var(--pl-glass-light-border)',
                boxShadow:
                  'var(--pl-glass-shadow-lg)',
                zIndex: 60,
              } as React.CSSProperties}
            >
              {PRESETS.map((preset) => {
                const isActive =
                  preset.value !== 'fit' && zoom === preset.value;
                return (
                  <motion.button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    whileHover={{
                      backgroundColor: 'var(--pl-olive-12)',
                    }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive
                        ? 'var(--pl-olive-10)'
                        : 'transparent',
                      cursor: 'pointer',
                      color: isActive
                        ? 'var(--pl-olive-deep)'
                        : 'var(--pl-ink-soft)',
                      fontSize: 'var(--pl-text-sm)',
                      fontWeight: isActive ? 700 : 600,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {preset.value === 'fit' && <Maximize size={11} />}
                      {preset.label}
                    </span>
                    {isActive && (
                      <div
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: 'var(--pl-olive)',
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zoom in */}
      <motion.button
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        whileHover={{ scale: 1.12, backgroundColor: 'var(--pl-black-6)' }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        title="Zoom in (Cmd+=)"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color:
            zoom >= MAX_ZOOM ? 'rgba(0,0,0,0.12)' : 'var(--pl-ink-soft)',
          cursor: zoom >= MAX_ZOOM ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ZoomIn size={14} />
      </motion.button>

      {/* Fit button */}
      <div
        style={{
          width: '1px',
          height: '18px',
          background: 'var(--pl-black-7)',
          margin: '0 2px',
        }}
      />
      <motion.button
        onClick={handleFit}
        whileHover={{ scale: 1.12, backgroundColor: 'var(--pl-black-6)' }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        title="Fit to screen"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--pl-ink-soft)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Maximize size={14} />
      </motion.button>
    </motion.div>
  );
}
