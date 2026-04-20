'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/CanvasInlineFormatBar.tsx
// Floating inline text-format toolbar.
// Appears above any [data-pe-editable] element when it gains focus.
// Controls: Bold · Italic · Size (S/M/L/XL) · Color swatches
// Changes are saved to manifest.textFormats via __format: prefix.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bold, Italic, Type } from 'lucide-react';
import { InlineColorCustomButton } from './InlineColorCustomButton';

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  fontFamily?: string;
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
  { value: '#5C6B3F', label: 'Olive'   },
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
  const barWidth = 384;
  const barHeight = 38;
  const gap = 6; // px above element

  // Position: just above the focused element, horizontally centered on it
  let top = elementRect.top - canvasRect.top - barHeight - gap;
  let left = elementRect.left - canvasRect.left + elementRect.width / 2 - barWidth / 2;

  // Clamp within canvas — horizontal.
  left = Math.max(8, Math.min(left, canvasRect.width - barWidth - 8));

  // Item 43/44: figure out whether the bar (when placed above) would overlap
  // the element itself — it shouldn't, since we already subtract barHeight+gap,
  // but if the element starts near the canvas top we need to flip below. And
  // when we flip below, check that the bar doesn't exit the viewport; if so,
  // pin it back above with clamping.
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportTopOfBar = elementRect.top - barHeight - gap;
  const viewportBottomOfFlipped = elementRect.bottom + gap + barHeight;

  const overlapsAbove = top < 8; // not enough room above
  const flippedOverflowsViewport = viewportBottomOfFlipped > viewportH - 8;

  if (overlapsAbove) {
    if (!flippedOverflowsViewport) {
      top = elementRect.bottom - canvasRect.top + gap; // flip below
    } else {
      // Item 44: both above and below overflow — clamp into viewport at the top.
      top = Math.max(8, top);
    }
  } else if (viewportTopOfBar < 8 && !flippedOverflowsViewport) {
    // Element's top is near the viewport top — safer to flip below.
    top = elementRect.bottom - canvasRect.top + gap;
  }

  const set = (patch: Partial<TextFormat>) => onChange(path, { ...format, ...patch });

  const activeSize = format.size ?? 'md';
  const activeColor = format.color ?? '';

  // Item 45: Cmd/Ctrl+B for bold, Cmd/Ctrl+I for italic while the bar is up.
  // We listen at the window level because the focused element may be a
  // contenteditable inside the canvas (the bar itself is not focused).
  const formatRef = useRef(format);
  useEffect(() => { formatRef.current = format; }, [format]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        onChange(path, { ...formatRef.current, bold: !formatRef.current.bold });
      } else if (k === 'i') {
        e.preventDefault();
        onChange(path, { ...formatRef.current, italic: !formatRef.current.italic });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [path, onChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      data-pearloom-format-bar=""
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
        borderRadius: 'var(--pl-radius-lg)',
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
              color: activeSize === s.id ? 'var(--pl-olive)' : 'rgba(255,255,255,0.5)',
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
            aria-label={`Select color ${c.label} (${c.value})`}
            aria-pressed={activeColor === c.value}
            style={{
              ...BTN,
              width: '16px', height: '16px', borderRadius: '50%', padding: 0,
              background: c.value,
              border: activeColor === c.value
                ? '2px solid var(--pl-olive)'
                : c.value === '#ffffff' ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(255,255,255,0.1)',
              boxShadow: activeColor === c.value ? '0 0 0 1px rgba(163,177,138,0.5)' : 'none',
            }}
          />
        ))}
        {/* Custom-color picker — opens a popover with hue/sat/light + hex. */}
        <InlineColorCustomButton
          value={activeColor}
          onChange={(hex) => set({ color: hex })}
          size={16}
          presetActive={!!activeColor && COLOR_SWATCHES.some(s => s.value.toLowerCase() === activeColor.toLowerCase())}
          title="Custom color"
        />
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
