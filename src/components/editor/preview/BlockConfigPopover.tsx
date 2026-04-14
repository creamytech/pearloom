'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/preview/BlockConfigPopover.tsx
// Floating popover anchored to a selected block on the canvas.
// Auto-generates form controls from BLOCK_SCHEMAS[blockType].props,
// writes updates through onTextEdit('block-config:blockId:key', value).
// Positioning mirrors CanvasHeroEditBar (absolute inside canvas).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { BLOCK_SCHEMAS, type PropSchema } from '@/lib/block-engine/schema';
import { useEditor } from '@/lib/editor-state';
import type { PageBlock } from '@/types';

const UNSUPPORTED_HINT =
  'Image, rich text, and binding fields are edited in the side panel for better control.';

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
  const firstFieldRef = useRef<HTMLElement | null>(null);
  const { dispatch } = useEditor();

  // Outside-click & Escape dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      // Ignore right/middle clicks — only primary button dismisses (item 41).
      if (e.button !== 0) return;
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    // Delay outside-click listener ~150ms so an accidental double-click on the
    // opening element doesn't immediately dismiss the popover (item 41).
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 150);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  // Focus the first field on open (item 42). React's autoFocus can be flaky
  // inside motion divs, so we schedule an explicit focus() after mount.
  useEffect(() => {
    const t = setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, []);

  const canvasRect = canvasRef.current?.getBoundingClientRect();
  if (!canvasRect) return null;

  // Filter to schema props we know how to render. When we have no schema
  // at all OR no renderable fields, we still surface a minimal popover
  // so the user gets acknowledgement + a way to reach advanced settings.
  const allEntries = schema ? Object.entries(schema.props) : [];
  const entries = allEntries.filter(([, p]) => SUPPORTED_TYPES.has(p.type));
  const unsupportedLabels = allEntries
    .filter(([, p]) => !SUPPORTED_TYPES.has(p.type))
    .map(([, p]) => p.label);
  const isEmpty = entries.length === 0;

  const openCanvasPanel = () => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
    onClose();
  };

  // Position: below the block, horizontally centered. Flip above if overflow.
  // Item 36: both `rect` and `canvasRect` come from getBoundingClientRect() so
  // they are already viewport-relative. Subtracting `canvasRect.top` gives a
  // coordinate relative to the canvas element — correct regardless of window
  // scroll. If the canvas itself has internal scroll, we also add
  // `canvasRef.current.scrollTop` because the popover is positioned absolute
  // inside the canvas, whose children scroll with that offset.
  const popWidth = 320;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Item 37: clamp popover height to the viewport too, not just a fixed cap.
  const rawHeight = isEmpty ? 120 : Math.min(520, 80 + entries.length * 72);
  const popHeight = Math.min(rawHeight, viewportH - 32);
  const centerX = rect.left - canvasRect.left + rect.width / 2 - popWidth / 2;
  const clampedX = Math.max(8, Math.min(centerX, canvasRect.width - popWidth - 8));
  const scrollTop = canvasRef.current?.scrollTop ?? 0;
  const relTop = rect.bottom - canvasRect.top + 12 + scrollTop;
  const relAbove = rect.top - canvasRect.top - popHeight - 12 + scrollTop;
  // Item 37/44: flip above if bottom of popover would exit the viewport.
  const viewportBottomOfRelTop = rect.bottom + 12 + popHeight; // viewport coord
  const overflowsViewport = viewportBottomOfRelTop > viewportH - 8;
  const overflowsCanvas = relTop - scrollTop + popHeight > canvasRect.height - 16;
  const shouldFlip = (overflowsViewport || overflowsCanvas) && relAbove > 0;
  const top = shouldFlip ? relAbove : relTop;

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
        maxHeight: `${popHeight}px`,
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
            Block · {schema?.label ?? block.type}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            {schema?.description ?? 'No schema registered for this block type.'}
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

      {isEmpty ? (
        /* Empty state — no schema or no editable fields. Give the user an
           acknowledgement + a way to reach advanced settings. */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>
            No quick settings for this block. Use the right panel for advanced options.
          </div>
          <button
            type="button"
            onClick={openCanvasPanel}
            style={{
              alignSelf: 'flex-start',
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer',
            }}
          >
            Open panel
          </button>
        </div>
      ) : (
        /* Fields */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(([key, prop], idx) => (
            <Field
              key={key}
              propKey={key}
              prop={prop}
              value={currentValue(key)}
              onCommit={(v) => commit(key, v)}
              firstFieldRef={idx === 0 ? firstFieldRef : undefined}
            />
          ))}
          {unsupportedLabels.length > 0 && (
            <div
              style={{
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>
                  {unsupportedLabels.length === 1
                    ? `"${unsupportedLabels[0]}" needs the full panel.`
                    : `${unsupportedLabels.length} advanced fields need the full panel.`}
                </span>
                {/* Item 38: explain why these fields are deferred to the panel. */}
                <span
                  role="img"
                  aria-label={UNSUPPORTED_HINT}
                  title={UNSUPPORTED_HINT}
                  style={{ display: 'inline-flex', color: 'rgba(255,255,255,0.45)', cursor: 'help' }}
                >
                  <HelpCircle size={12} />
                </span>
              </div>
              <button
                type="button"
                onClick={openCanvasPanel}
                style={{
                  flexShrink: 0,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Open panel
              </button>
            </div>
          )}
        </div>
      )}
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
  firstFieldRef?: React.MutableRefObject<HTMLElement | null>;
}

// Item 40: URL validation helper. Accepts empty strings (user cleared).
function isValidUrl(raw: string): boolean {
  if (!raw) return true;
  if (!/^https?:\/\//i.test(raw)) {
    // Still allow a valid absolute URL according to the WHATWG parser.
    try {
      new URL(raw);
      return true;
    } catch {
      return false;
    }
  }
  try {
    new URL(raw);
    return true;
  } catch {
    return false;
  }
}

function Field({ prop, value, onCommit, firstFieldRef }: FieldProps) {
  const strValue = value === undefined || value === null ? '' : String(value);
  const [localValue, setLocalValue] = useState(strValue);
  const [error, setError] = useState<string | null>(null);

  // Keep local state in sync if the upstream value changes (e.g. after commit).
  useEffect(() => {
    setLocalValue(strValue);
  }, [strValue]);

  if (prop.type === 'boolean') {
    const checked = value === true || value === 'true';
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          ref={(el) => { if (firstFieldRef) firstFieldRef.current = el; }}
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
          ref={(el) => { if (firstFieldRef) firstFieldRef.current = el; }}
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
          ref={(el) => { if (firstFieldRef) firstFieldRef.current = el; }}
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

  // Item 40: validation logic used on change + blur.
  const validate = (v: string): string | null => {
    if (prop.type === 'url' && v.trim() && !isValidUrl(v.trim())) {
      return 'Invalid URL';
    }
    if (prop.type === 'number' && v !== '') {
      const n = Number(v);
      if (Number.isNaN(n)) return 'Invalid number';
      if (prop.min !== undefined && n < prop.min) return `Must be ≥ ${prop.min}`;
      if (prop.max !== undefined && n > prop.max) return `Must be ≤ ${prop.max}`;
    }
    return null;
  };

  const hasError = error !== null;

  return (
    <div>
      <label style={LABEL_STYLE}>{prop.label}</label>
      <input
        ref={(el) => { if (firstFieldRef) firstFieldRef.current = el; }}
        type={inputType}
        value={localValue}
        placeholder={prop.placeholder}
        min={prop.type === 'number' ? prop.min : undefined}
        max={prop.type === 'number' ? prop.max : undefined}
        aria-invalid={hasError || undefined}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setError(validate(e.target.value));
        }}
        onBlur={(e) => {
          const v = e.target.value;
          const err = validate(v);
          setError(err);
          if (err) return; // Don't commit invalid values (item 40).
          // Item 40: enforce number min/max by clamping on commit as a safety net.
          let finalV = v;
          if (prop.type === 'number' && v !== '') {
            let n = Number(v);
            if (prop.min !== undefined) n = Math.max(prop.min, n);
            if (prop.max !== undefined) n = Math.min(prop.max, n);
            finalV = String(n);
            if (finalV !== v) setLocalValue(finalV);
          }
          if (finalV !== strValue) onCommit(finalV);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputType !== 'text') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          ...INPUT_STYLE,
          ...(prop.type === 'color' ? { padding: 2, height: 32 } : {}),
          ...(hasError ? { borderColor: '#ef4444' } : {}),
        }}
      />
      {hasError && (
        <div style={{ fontSize: 10, color: '#f87171', marginTop: 3 }}>{error}</div>
      )}
      {!hasError && prop.description && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{prop.description}</div>
      )}
    </div>
  );
}
