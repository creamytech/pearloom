'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/BlockConfigPopover.tsx
// Floating popover anchored to a selected block on the canvas.
// Auto-generates form controls from BLOCK_SCHEMAS[blockType].props,
// writes updates through onTextEdit('block-config:blockId:key', value).
// Positioning mirrors CanvasHeroEditBar (absolute inside canvas).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { BLOCK_SCHEMAS, type PropSchema } from '@/lib/block-engine/schema';
import type { PageBlock } from '@/types';

interface BlockConfigPopoverProps {
  block: PageBlock;
  rect: DOMRect;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onTextEdit: (path: string, value: string) => void;
  onClose: () => void;
}

const SUPPORTED_TYPES = new Set(['text', 'textarea', 'number', 'select', 'boolean', 'url', 'color', 'date']);

export function BlockConfigPopover({
  block,
  rect,
  canvasRef,
  onTextEdit,
  onClose,
}: BlockConfigPopoverProps) {
  const schema = BLOCK_SCHEMAS[block.type];
  const popoverRef = useRef<HTMLDivElement>(null);

  // Outside-click & Escape dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    // Delay outside-click listener so the opening click doesn't immediately dismiss
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  const canvasRect = canvasRef.current?.getBoundingClientRect();
  if (!canvasRect || !schema) return null;

  // Filter to schema props we know how to render
  const entries = Object.entries(schema.props).filter(([, p]) => SUPPORTED_TYPES.has(p.type));
  if (entries.length === 0) return null;

  // Position: below the block, horizontally centered. Flip above if overflow.
  const popWidth = 320;
  const popHeight = Math.min(520, 80 + entries.length * 72);
  const centerX = rect.left - canvasRect.left + rect.width / 2 - popWidth / 2;
  const clampedX = Math.max(8, Math.min(centerX, canvasRect.width - popWidth - 8));
  const relTop = rect.bottom - canvasRect.top + 12;
  const overflowsBelow = relTop + popHeight > canvasRect.height - 16;
  const relAbove = rect.top - canvasRect.top - popHeight - 12;
  const top = overflowsBelow && relAbove > 0 ? relAbove : relTop;

  const currentValue = (key: string) => {
    const v = (block.config as Record<string, unknown> | undefined)?.[key];
    if (v === undefined || v === null) return undefined;
    return v;
  };

  const commit = (key: string, value: string) => {
    onTextEdit(`block-config:${block.id}:${key}`, value);
  };

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      style={{
        position: 'absolute',
        top,
        left: clampedX,
        width: `${popWidth}px`,
        maxHeight: '70vh',
        overflowY: 'auto',
        zIndex: 160,
        borderRadius: '14px',
        background: 'rgba(24,24,27,0.92)',
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
        color: 'rgba(255,255,255,0.92)',
        padding: '12px 14px 14px',
        fontFamily: 'var(--pl-font-body, inherit)',
      } as React.CSSProperties}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
            Block · {schema.label}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            {schema.description}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.55)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([key, prop]) => (
          <Field
            key={key}
            propKey={key}
            prop={prop}
            value={currentValue(key)}
            onCommit={(v) => commit(key, v)}
          />
        ))}
      </div>
    </motion.div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.92)',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.55)',
  marginBottom: 4,
};

interface FieldProps {
  propKey: string;
  prop: PropSchema;
  value: unknown;
  onCommit: (value: string) => void;
}

function Field({ prop, value, onCommit }: FieldProps) {
  const strValue = value === undefined || value === null ? '' : String(value);

  if (prop.type === 'boolean') {
    const checked = value === true || value === 'true';
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCommit(String(e.target.checked))}
          style={{ margin: 0 }}
        />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{prop.label}</span>
      </label>
    );
  }

  if (prop.type === 'select') {
    return (
      <div>
        <label style={LABEL_STYLE}>{prop.label}</label>
        <select
          value={strValue || (prop.defaultValue as string) || ''}
          onChange={(e) => onCommit(e.target.value)}
          style={INPUT_STYLE}
        >
          {(prop.options || []).map((o) => (
            <option key={o.value} value={o.value} style={{ color: '#111' }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (prop.type === 'textarea') {
    return (
      <div>
        <label style={LABEL_STYLE}>{prop.label}</label>
        <textarea
          defaultValue={strValue}
          placeholder={prop.placeholder}
          onBlur={(e) => {
            if (e.target.value !== strValue) onCommit(e.target.value);
          }}
          rows={3}
          style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
        />
      </div>
    );
  }

  // text | number | url | color | date
  const inputType =
    prop.type === 'number'
      ? 'number'
      : prop.type === 'url'
      ? 'url'
      : prop.type === 'color'
      ? 'color'
      : prop.type === 'date'
      ? 'date'
      : 'text';

  return (
    <div>
      <label style={LABEL_STYLE}>{prop.label}</label>
      <input
        type={inputType}
        defaultValue={strValue}
        placeholder={prop.placeholder}
        onBlur={(e) => {
          if (e.target.value !== strValue) onCommit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputType !== 'text') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          ...INPUT_STYLE,
          ...(prop.type === 'color' ? { padding: 2, height: 32 } : {}),
        }}
      />
      {prop.description && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{prop.description}</div>
      )}
    </div>
  );
}
