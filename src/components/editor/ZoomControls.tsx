'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ZoomControls.tsx — Preview zoom slider
// Adds CSS transform scale to the preview pane for inspecting layouts
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.5;
const STEP = 0.1;

export function ZoomControls({ zoom, onZoomChange, className }: ZoomControlsProps) {
  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(MAX_ZOOM, Math.round((zoom + STEP) * 10) / 10));
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(MIN_ZOOM, Math.round((zoom - STEP) * 10) / 10));
  }, [zoom, onZoomChange]);

  const handleReset = useCallback(() => {
    onZoomChange(1);
  }, [onZoomChange]);

  const pct = Math.round(zoom * 100);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(0,0,0,0.04)',
        borderRadius: 'var(--pl-radius-md)',
        padding: '3px',
      }}
    >
      <motion.button
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.06)' }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        title="Zoom out"
        style={{
          padding: '4px 6px',
          borderRadius: 'var(--pl-radius-sm)',
          border: 'none',
          background: 'transparent',
          color: zoom <= MIN_ZOOM ? 'rgba(0,0,0,0.08)' : '#3F3F46',
          cursor: zoom <= MIN_ZOOM ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ZoomOut size={12} />
      </motion.button>

      <motion.button
        onClick={handleReset}
        whileHover={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
        whileTap={{ scale: 0.95 }}
        title="Reset zoom to 100%"
        style={{
          padding: '3px 8px',
          borderRadius: 'var(--pl-radius-xs)',
          border: 'none',
          background: 'transparent',
          color: zoom === 1 ? '#71717A' : '#18181B',
          cursor: 'pointer',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
          minWidth: '42px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
        }}
      >
        {zoom === 1 ? <Maximize2 size={10} /> : `${pct}%`}
      </motion.button>

      <motion.button
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.06)' }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        title="Zoom in"
        style={{
          padding: '4px 6px',
          borderRadius: 'var(--pl-radius-sm)',
          border: 'none',
          background: 'transparent',
          color: zoom >= MAX_ZOOM ? 'rgba(0,0,0,0.08)' : '#3F3F46',
          cursor: zoom >= MAX_ZOOM ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ZoomIn size={12} />
      </motion.button>
    </div>
  );
}
