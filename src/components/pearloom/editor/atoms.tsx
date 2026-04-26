'use client';

/* ========================================================================
   PEARLOOM EDITOR — v8 form atoms
   Shared form primitives used by every block panel:
     Field, TextInput, TextArea, DateInput, TimeInput, Select,
     ColorSwatchRow, Toggle, NumberInput, PhotoSlot, ListRow, etc.
   ======================================================================== */

import {
  forwardRef,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '../motifs';

/* ---------- Section heading inside a panel ----------
 *  Collapsible so users can scan the Inspector by section headers
 *  and expand only what they need. The first section in any panel
 *  defaults to open (defaultOpen=true on the first instance via
 *  prop). Set `collapsible={false}` for sections that should never
 *  collapse (e.g. the always-visible style picker at the top).
 *  Open/closed state is local to each panel mount — switching blocks
 *  resets to defaults so users always start in a known place.
 *  Persists through re-renders via useState. */
export function PanelSection({
  label,
  hint,
  action,
  children,
  style,
  collapsible = true,
  defaultOpen = true,
}: {
  label?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;

  // Header is a button when collapsible so keyboard + screen-reader
  // users can toggle. Otherwise it's a passive div.
  const Header = collapsible ? 'button' : 'div';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: expanded ? 10 : 0, marginBottom: 16, ...style }}>
      {(label || action) && (
        <Header
          {...(collapsible
            ? {
                type: 'button',
                onClick: () => setOpen((o) => !o),
                'aria-expanded': expanded,
              }
            : {})}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 8,
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: collapsible ? 'pointer' : 'default',
            color: 'var(--ink)',
            font: 'inherit',
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {label && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--peach-ink)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {collapsible && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 10,
                      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    ▸
                  </span>
                )}
                {label}
              </div>
            )}
            {hint && expanded && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
                {hint}
              </div>
            )}
          </div>
          {action}
        </Header>
      )}
      {expanded && children}
    </div>
  );
}

/* ---------- PanelSmartActions ----------
 *  A horizontal scrolling row of 2-4 quick-action chips that sit at
 *  the top of an inspector panel body. The primary affordance gets
 *  the pearl accent; the rest are ghost.
 *
 *  Use this to surface the most-likely thing the user wants to do
 *  *next* on the panel they just landed on — without making them
 *  scan every collapsible section first. */
export interface PanelSmartAction {
  label: string;
  icon?: string;
  onClick: () => void;
  primary?: boolean;
  /** Disabled state — chip stays visible but ghosted. */
  disabled?: boolean;
}

export function PanelSmartActions({ actions }: { actions: PanelSmartAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Quick actions"
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        marginBottom: 14,
        paddingBottom: 4,
        // Firefox + WebKit hide scrollbars except when interacting,
        // so the row stays clean visually.
        scrollbarWidth: 'thin',
      }}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          className={a.primary ? 'pl-pearl-accent' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            background: a.primary ? undefined : 'var(--cream-2)',
            color: a.primary ? undefined : 'var(--ink)',
            border: a.primary ? undefined : '1px solid var(--line-soft)',
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: a.disabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: a.disabled ? 0.4 : 1,
            transition: 'background 160ms ease, color 160ms ease',
          }}
        >
          {a.icon && <Icon name={a.icon} size={11} />}
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Field wrapper (label + help text + error slot) ---------- */
export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
  right,
}: {
  label: string;
  help?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  right?: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: htmlFor ? 'default' : 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.01em' }}>{label}</span>
        {right}
      </div>
      {children}
      {help && !error && (
        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{help}</span>
      )}
      {error && (
        <span style={{ fontSize: 11.5, color: '#7A2D2D' }}>{error}</span>
      )}
    </label>
  );
}

const sharedInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--paper)',
  border: '1.5px solid var(--line)',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
};

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`pl8-input ${props.className ?? ''}`.trim()}
        style={{ ...sharedInputStyle, ...props.style }}
      />
    );
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea(props, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={`pl8-input ${props.className ?? ''}`.trim()}
        rows={props.rows ?? 4}
        style={{ ...sharedInputStyle, minHeight: 88, resize: 'vertical', ...props.style }}
      />
    );
  }
);

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  id?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...sharedInputStyle,
          appearance: 'none',
          WebkitAppearance: 'none',
          paddingRight: 36,
          cursor: 'pointer',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chev-down"
        size={14}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        color="var(--ink-muted)"
      />
    </div>
  );
}

/* ---------- Toggle pill (2-state segmented) ---------- */
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        padding: 3,
        background: 'var(--cream-2)',
        borderRadius: 10,
        gap: 2,
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 8,
              border: 0,
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--cream)' : 'var(--ink)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Checkbox toggle ---------- */
export function Toggle({
  on,
  onChange,
  label,
  help,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 14px',
        background: on ? 'var(--sage-tint)' : 'var(--paper)',
        border: `1.5px solid ${on ? 'var(--sage-deep)' : 'var(--line)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 34,
          height: 20,
          borderRadius: 999,
          background: on ? 'var(--sage-deep)' : 'var(--line)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 180ms ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 180ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {help && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{help}</div>}
      </div>
    </button>
  );
}

/* ---------- Photo slot ---------- */
// Lazy-loaded so the editor bundle doesn't ship the library UI
// on every page, and so we don't create a top-level circular
// import (PhotoPicker -> useGooglePhotosPicker -> ... -> atoms).
const LazyPhotoPicker = dynamic(
  () => import('./PhotoPicker').then((m) => ({ default: m.PhotoPicker })),
  { ssr: false },
);

export function PhotoSlot({
  src,
  onChange,
  label,
  aspect = '4/3',
  accept = 'image/*',
}: {
  src?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
  aspect?: string;
  accept?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Fire a one-off upload so the photo also lands in the library.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const dataUrl = reader.result;
      onChange(dataUrl); // instant preview
      // Best-effort upload to R2 + library; replace the slot with
      // the permanent URL when it comes back.
      void fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [
            {
              id: `p-${Date.now()}`,
              filename: file.name,
              mimeType: file.type || 'image/jpeg',
              base64: dataUrl,
              capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
            },
          ],
          source: 'editor',
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { photos?: Array<{ baseUrl: string }> } | null) => {
          const permanent = data?.photos?.[0]?.baseUrl;
          if (permanent) onChange(permanent);
        })
        .catch(() => {});
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input ref={inputRef} id={id} type="file" accept={accept} onChange={onFile} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspect,
          background: src ? `#e8e4d5 url(${src}) center/cover no-repeat` : 'var(--cream-2)',
          border: `1.5px dashed ${src ? 'transparent' : 'var(--line)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        {!src && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink-muted)',
            }}
          >
            <Icon name="image" size={22} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{label ?? 'Upload photo'}</span>
          </div>
        )}
        {src && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(61,74,31,0.45)',
              color: 'var(--cream)',
              fontSize: 12,
              fontWeight: 600,
              transition: 'opacity 180ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.opacity = '0';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="image" size={14} color="var(--cream)" /> Replace
            </div>
          </div>
        )}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            fontSize: 11,
            color: 'var(--ink-soft)',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-ui)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Upload new
        </button>
        {src && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            style={{
              fontSize: 11,
              color: '#7A2D2D',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-ui)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Remove
          </button>
        )}
      </div>
      <LazyPhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(urls) => {
          const next = Array.isArray(urls) ? urls[0] : urls;
          if (next) onChange(next);
        }}
        title={label ?? 'Choose a photo'}
      />
    </div>
  );
}

/* ---------- List row container (story chapters, schedule rows, etc.) ---------- */
export function ListRow({
  children,
  onMoveUp,
  onMoveDown,
  onDelete,
  dragHandle = true,
  style,
}: {
  children: ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  dragHandle?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: dragHandle ? '28px 1fr auto' : '1fr auto',
        gap: 12,
        padding: 16,
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14,
        alignItems: 'start',
        ...style,
      }}
    >
      {dragHandle && (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-muted)',
            cursor: 'grab',
            marginTop: 4,
          }}
          aria-label="Drag to reorder"
        >
          <Icon name="drag" size={16} />
        </div>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--ink-muted)' }}>
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            aria-label="Move up"
            style={iconButtonStyle}
          >
            <Icon name="chev-up" size={14} />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            aria-label="Move down"
            style={iconButtonStyle}
          >
            <Icon name="chev-down" size={14} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            style={{ ...iconButtonStyle, color: '#7A2D2D' }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

const iconButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  background: 'transparent',
  border: '1px solid var(--line)',
  borderRadius: 8,
  cursor: 'pointer',
  color: 'inherit',
};

/* ---------- Color swatch row ---------- */
export function ColorSwatchRow({ colors, onSwap }: { colors: string[]; onSwap?: (idx: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {colors.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSwap?.(i)}
          aria-label={`Color swatch ${i + 1}: ${c}`}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: c,
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 6px rgba(61,74,31,0.1)',
            cursor: onSwap ? 'pointer' : 'default',
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyBlockState({
  icon = 'sparkles',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: 32,
        background: 'var(--cream-2)',
        border: '1.5px dashed var(--line)',
        borderRadius: 16,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--lavender-bg)',
          color: 'var(--lavender-ink)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <div className="display" style={{ fontSize: 20, lineHeight: 1.15 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 320 }}>{body}</div>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

/* ---------- Add-row button ---------- */
export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        background: 'transparent',
        border: '1.5px dashed var(--line)',
        borderRadius: 12,
        color: 'var(--ink-soft)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <Icon name="plus" size={14} /> {label}
    </button>
  );
}
