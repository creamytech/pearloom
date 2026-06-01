'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/EditableText.tsx
//
// The core inline-edit primitive. Renders a plain tag
// (<span>, <h1>, <p>, etc.) by default. When the enclosing
// ThemedSiteRenderer is in edit mode, hover reveals a subtle
// outline + a 'click to edit' affordance; click makes it
// contentEditable; Enter (single-line) / Esc / blur commits
// the change back to the editor via onSave.
//
// Works in BOTH modes with zero conditional branches at the
// call site. If not in edit mode, behaves like a plain
// wrapper with an `as` tag.
//
// Design rules:
//   - Never steal focus on load.
//   - Never render ghost placeholders in static mode.
//   - Commit on blur, Escape reverts, Enter commits (unless
//     multiline in which case Shift+Enter inserts a newline
//     and Cmd/Ctrl+Enter commits).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useIsEditMode } from './EditorCanvasContext';

export interface EditableTextProps {
  /** Current value. */
  value: string;
  /** Commit handler. Parent is responsible for integrating the
   *  new value into the manifest. */
  onSave: (next: string) => void;
  /** Element tag to render as. Defaults to span. */
  as?: ElementType;
  /** If true, Enter inserts a newline and Cmd+Enter commits. */
  multiline?: boolean;
  /** Placeholder shown in edit mode when empty. Never rendered
   *  when not editing (so static surfaces don't accidentally
   *  show placeholder text to guests). */
  placeholder?: string;
  /** Pass-through inline styles. */
  style?: CSSProperties;
  /** Pass-through className. */
  className?: string;
  /** Children let you render additional spans inside (useful
   *  for decorated headings like "Name and Other"). If provided,
   *  children render INSIDE the editable and the edit box uses
   *  `value` only when the user clicks in. */
  children?: ReactNode;
  /** Max length for safety (emails, names). Defaults to 400. */
  maxLength?: number;
  /** Aria label for accessibility — describe what this field is
   *  when in edit mode. */
  ariaLabel?: string;
  /** Disable the edit affordance for this instance (e.g. if a
   *  computed/derived field). */
  readOnly?: boolean;
}

export function EditableText({
  value,
  onSave,
  as: Tag = 'span',
  multiline = false,
  placeholder,
  style,
  className,
  children,
  maxLength = 400,
  ariaLabel,
  readOnly,
}: EditableTextProps) {
  const editMode = useIsEditMode();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const ref = useRef<HTMLElement | null>(null);

  // React's "store derived state during render" pattern (better
  // than setState-in-effect for sync-with-prop). Updates flush
  // before paint, no extra render. The if-guard prevents
  // infinite loops — setLocal is a no-op when value matches.
  if (value !== prevValue && !editing) {
    setPrevValue(value);
    setLocal(value);
  }

  const commit = useCallback(() => {
    const trimmed = local.trim();
    if (trimmed !== value) onSave(trimmed);
    setEditing(false);
  }, [local, onSave, value]);

  const cancel = useCallback(() => {
    setLocal(value);
    setEditing(false);
  }, [value]);

  // When edit state flips to true, focus the element and select
  // its text so the user types over the existing value. Every
  // window/document call is guarded so we don't throw in iframes
  // with restricted same-origin or older browsers that nulled
  // getSelection() under certain conditions.
  useEffect(() => {
    if (!editing || !ref.current) return;
    const el = ref.current;
    try {
      el.focus();
    } catch {}
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const sel = window.getSelection?.();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {}
  }, [editing]);

  // ── Static mode (published site, read-only) ──────────────
  if (!editMode || readOnly) {
    if (children) {
      return (
        <Tag style={style} className={className}>
          {children}
        </Tag>
      );
    }
    return (
      <Tag style={style} className={className}>
        {value}
      </Tag>
    );
  }

  // ── Edit mode — render with hover + click-to-edit ────────
  const editingStyle: CSSProperties = editing
    ? {
        outline: '2px solid var(--sage-deep, #5C6B3F)',
        outlineOffset: 2,
        borderRadius: 2,
        cursor: 'text',
      }
    : {
        cursor: 'text',
        outline: '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline-color var(--pl-dur-fast) var(--pl-ease-out), background var(--pl-dur-fast) var(--pl-ease-out)',
        borderRadius: 2,
      };

  // Merge styles so the site's original typography stays intact.
  const mergedStyle: CSSProperties = { ...style, ...editingStyle };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key === 'Enter') {
      if (multiline && !(e.metaKey || e.ctrlKey)) {
        // Allow newline — don't prevent default
        return;
      }
      e.preventDefault();
      commit();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const text = e.currentTarget.textContent ?? '';
    if (text.length > maxLength) {
      e.currentTarget.textContent = text.slice(0, maxLength);
      return;
    }
    setLocal(text);
  };

  // Paste handling — strip rich formatting on paste so what lands
  // matches the rest of the field (no random Word styles, no
  // pasted images, no inline span colours fighting the theme). The
  // user's plain text comes through; manual formatting via the
  // floating toolbar still works after paste.
  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const cd = e.clipboardData;
    if (!cd) return;
    // Prefer plain text. If only HTML is on the clipboard, parse
    // textContent from a sandbox node so we still get readable
    // text without scripts / external styles.
    let text = cd.getData('text/plain');
    if (!text) {
      const html = cd.getData('text/html');
      if (html) {
        const sandbox = document.createElement('div');
        sandbox.innerHTML = html;
        text = sandbox.textContent ?? '';
      }
    }
    if (!text) return;
    // Collapse whitespace runs that Word + Docs leak in. Preserve
    // intentional newlines in multi-line fields.
    text = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
    if (!multiline) text = text.replace(/\n+/g, ' ');
    // Use insertText so the browser handles caret positioning +
    // undo stack correctly — better than direct DOM mutation.
    document.execCommand('insertText', false, text);
  };

  const onMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (editing) return;
    e.currentTarget.style.outlineColor = 'rgba(92,107,63,0.35)';
    e.currentTarget.style.background = 'rgba(92,107,63,0.04)';
  };
  const onMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (editing) return;
    e.currentTarget.style.outlineColor = 'transparent';
    e.currentTarget.style.background = '';
  };
  // Keyboard parity for click-to-edit. The element is tabbable when
  // not editing; Enter / Space enter edit mode (caret-placed by the
  // existing useEffect). Sage outline mirrors hover so screen-reader
  // and keyboard users see the same affordance.
  const onFocusOutline = (e: React.FocusEvent<HTMLElement>) => {
    if (editing) return;
    e.currentTarget.style.outlineColor = 'rgba(92,107,63,0.35)';
    e.currentTarget.style.background = 'rgba(92,107,63,0.04)';
  };
  const onStaticBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (editing) return;
    e.currentTarget.style.outlineColor = 'transparent';
    e.currentTarget.style.background = '';
  };
  const onStaticKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (editing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setEditing(true);
    }
  };

  // When not editing and children are provided, render children
  // so decorated JSX (italic spans, stamps) still shows.
  const displayContent = editing || !children ? local || placeholder || '' : children;

  return (
    <Tag
      ref={ref as unknown as React.Ref<HTMLElement>}
      style={mergedStyle}
      className={className}
      contentEditable={editing}
      suppressContentEditableWarning
      role={editing ? 'textbox' : 'button'}
      tabIndex={editing ? undefined : 0}
      aria-label={ariaLabel}
      aria-multiline={multiline}
      data-pl-editable
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={editing ? undefined : onFocusOutline}
      onClick={(e: React.MouseEvent) => {
        if (editing) return;
        e.stopPropagation();
        setEditing(true);
      }}
      onBlur={editing ? commit : onStaticBlur}
      onInput={editing ? handleInput : undefined}
      onKeyDown={editing ? handleKeyDown : onStaticKeyDown}
      onPaste={editing ? handlePaste : undefined}
    >
      {displayContent}
    </Tag>
  );
}
