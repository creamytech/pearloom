'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasInlineFormatBar.tsx
// Floating inline text-format toolbar.
// Appears above any [data-pe-editable] element when it gains focus.
// Controls: Bold · Italic · Size (S/M/L/XL) · Color swatches
// Changes are saved to manifest.textFormats via __format: prefix.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Bold, Italic, Type } from 'lucide-react';

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

interface CanvasInlineFormatBarProps {
  /** Bounding rect of the focused element, relative to viewport */
  elementRect: DOMRect;
  /** Bounding rect of the canvas wrapper */
  canvasRect: DOMRect;
  /** Path for the manifest field being edited */
  path: string;
  /** Current format state for this field */
  format: TextFormat;
  /** Called when any format option changes */
  onChange: (path: string, format: TextFormat) => void;
}

const SIZE_OPTIONS: Array<{ id: TextFormat['size']; label: string }> = [
  { id: 'sm',  label: 'S'  },
  { id: 'md',  label: 'M'  },
  { id: 'lg',  label: 'L'  },
  { id: 'xl',  label: 'XL' },
];

const COLOR_SWATCHES = [
  { value: '#18181B', label: 'Ink'     },
  { value: '#ffffff', label: 'White'   },
  { value: '#F5F1E8', label: 'Cream'   },
  { value: '#A3B18A', label: 'Olive'   },
  { value: '#C4A96A', label: 'Gold'    },
  { value: '#8B7355', label: 'Warm'    },
  { value: '#6B7280', label: 'Gray'    },
];

const BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', borderRadius: '5px', cursor: 'pointer',
  fontFamily: 'inherit', transition: 'all 0.1s',
};

export function CanvasInlineFormatBar({
  elementRect,
  canvasRect,
  path,
  format,
  onChange,
}: CanvasInlineFormatBarProps) {
  const barWidth = 360;
  const barHeight = 38;
  const gap = 6; // px above element

  // Position: just above the focused element, horizontally centered on it
  let top = elementRect.top - canvasRect.top - barHeight - gap;
  let left = elementRect.left - canvasRect.left + elementRect.width / 2 - barWidth / 2;

  // Clamp within canvas
  if (top < 8) top = elementRect.bottom - canvasRect.top + gap; // flip below if no room above
  left = Math.max(8, Math.min(left, canvasRect.width - barWidth - 8));

  const set = (patch: Partial<TextFormat>) => onChange(path, { ...format, ...patch });

  const activeSize = format.size ?? 'md';
  const activeColor = format.color ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      // Keep pointer events off the bar when not interacting
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top,
        left,
        width: `${barWidth}px`,
        height: `${barHeight}px`,
        zIndex: 180,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '0 8px',
        borderRadius: '10px',
        background: 'rgba(24,24,27,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
      } as React.CSSProperties}
    >
      {/* ── Bold ── */}
      <button
        onMouseDown={(e) => { e.preventDefault(); set({ bold: !format.bold }); }}
        title="Bold"
        style={{
          ...BTN,
          width: '26px', height: '26px',
          background: format.bold ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: format.bold ? '#fff' : 'rgba(255,255,255,0.55)',
          fontWeight: 700,
        }}
      >
        <Bold size={12} />
      </button>

      {/* ── Italic ── */}
      <button
        onMouseDown={(e) => { e.preventDefault(); set({ italic: !format.italic }); }}
        title="Italic"
        style={{
          ...BTN,
          width: '26px', height: '26px',
          background: format.italic ? 'rgba(255,255,255,0.2)' : 'transparent',
          color: format.italic ? '#fff' : 'rgba(255,255,255,0.55)',
        }}
      >
        <Italic size={12} />
      </button>

      {/* ── Divider ── */}
      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', margin: '0 3px', flexShrink: 0 }} />

      {/* ── Size ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Type size={10} color="rgba(255,255,255,0.4)" />
        {SIZE_OPTIONS.map(s => (
          <button
            key={s.id}
            onMouseDown={(e) => { e.preventDefault(); set({ size: s.id }); }}
            title={`Size: ${s.label}`}
            style={{
              ...BTN,
              padding: '3px 6px', height: '22px',
              fontSize: '11px', fontWeight: 600,
              background: activeSize === s.id ? 'rgba(163,177,138,0.3)' : 'transparent',
              color: activeSize === s.id ? '#A3B18A' : 'rgba(255,255,255,0.5)',
              border: activeSize === s.id ? '1px solid rgba(163,177,138,0.4)' : '1px solid transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', margin: '0 3px', flexShrink: 0 }} />

      {/* ── Color swatches ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {COLOR_SWATCHES.map(c => (
          <button
            key={c.value}
            onMouseDown={(e) => { e.preventDefault(); set({ color: activeColor === c.value ? '' : c.value }); }}
            title={c.label}
            style={{
              ...BTN,
              width: '16px', height: '16px', borderRadius: '50%', padding: 0,
              background: c.value,
              border: activeColor === c.value
                ? '2px solid #A3B18A'
                : c.value === '#ffffff' ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(255,255,255,0.1)',
              boxShadow: activeColor === c.value ? '0 0 0 1px rgba(163,177,138,0.5)' : 'none',
            }}
          />
        ))}
        {/* Clear color button */}
        {activeColor && (
          <button
            onMouseDown={(e) => { e.preventDefault(); set({ color: '' }); }}
            title="Clear color"
            style={{
              ...BTN, padding: '2px 5px', height: '20px',
              fontSize: '10px', fontWeight: 600,
              color: 'rgba(255,255,255,0.35)', background: 'transparent',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}
