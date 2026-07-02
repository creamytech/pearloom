'use client';

 
/* InlineEdit — click-to-edit text primitive used inside the canvas.

   Round R wired this into ThemedSite so hosts can edit the
   tagline / names / story headline / story body / details values /
   schedule labels DIRECTLY on the rendered canvas — no rail
   round-trip required. Edits write through to the same manifest
   the PropertyRail panels read, so changes appear in the rail
   inputs simultaneously (and vice-versa).

   When editable=false (PublishedSiteShell mounts it that way for
   real guests), the component renders plain text with no chrome
   and no click handlers. Identical visual + zero JS interaction
   cost on the live site.

   Implementation notes:
     - Uses contentEditable=plaintext-only when supported so paste
       drops formatted HTML. Falls back to contentEditable=true on
       browsers that don't grok plaintext-only.
     - Writes onBlur — committing on every keystroke would thrash
       the manifest + bridge save debounce.
     - Enter commits + blurs (single-line); Shift+Enter inserts a
       newline for multi-line fields (controlled via the `multiline`
       prop).
     - Esc reverts to the last-committed value.
     - Empty values fall back to the placeholder so the canvas
       never has a literally-empty clickable region. */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface InlineEditProps {
  /** Current value from the manifest. */
  value: string;
  /** Setter — called onBlur and on Enter (single-line). */
  onChange?: (next: string) => void;
  /** Disables click-to-edit entirely. Used by published mode. */
  editable?: boolean;
  /** Placeholder shown when value is empty AND not focused. */
  placeholder?: string;
  /** Allow newlines (Shift+Enter inserts \n, Enter commits). When
   *  false, Enter commits + blurs. Default false. */
  multiline?: boolean;
  /** Render as this HTML element when not editing. Defaults span. */
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3';
  /** Inline style applied to BOTH the read + editable forms so
   *  click-to-edit doesn't reflow the layout. */
  style?: CSSProperties;
  /** Extra className applied for kit-CSS / hook targeting. */
  className?: string;
  /** Children — fallback content when value is empty and the
   *  field isn't being edited. Lets a caller show e.g. a special
   *  multi-line headline rendering when there's nothing typed. */
  children?: ReactNode;
}

export function InlineEdit({
  value,
  onChange,
  editable = false,
  placeholder = 'Click to edit',
  multiline = false,
  as: As = 'span',
  style,
  className,
  children,
}: InlineEditProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [focused, setFocused] = useState(false);
  /* Mirror the prop into local state so the contentEditable
     element doesn't fight controlled-input semantics. We sync
     down from props when the value changes externally (e.g. a
     panel input write) and not currently being typed in. */
  const lastCommittedRef = useRef(value);

  useEffect(() => {
    /* When the manifest value changes from outside (panel edit,
       undo, AI rewrite) AND the user isn't currently typing, sync
       the DOM. Without this, an undo on the manifest doesn't
       visually revert the contentEditable. */
    if (!focused && ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
      lastCommittedRef.current = value;
    }
  }, [value, focused]);

  /* ── Keyboard-aware focus (phones) ───────────────────────────
     On mobile the software keyboard shrinks the VISUAL viewport;
     a field near the bottom of the screen can end up focused but
     buried under the keyboard. After the keyboard settles (rAF +
     ~300ms — iOS animates it in), check the node against
     visualViewport and center it if covered. Guards: SSR +
     browsers without visualViewport no-op; the timer is cleared
     on blur/unmount so a quick tap-away never scrolls late. */
  const keyboardScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearKeyboardScroll = () => {
    if (keyboardScrollTimer.current) {
      clearTimeout(keyboardScrollTimer.current);
      keyboardScrollTimer.current = null;
    }
  };
  useEffect(() => clearKeyboardScroll, []);
  const scheduleKeyboardScroll = () => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    clearKeyboardScroll();
    requestAnimationFrame(() => {
      keyboardScrollTimer.current = setTimeout(() => {
        keyboardScrollTimer.current = null;
        const el = ref.current;
        const vv = window.visualViewport;
        if (!el || !vv || document.activeElement !== el) return;
        const rect = el.getBoundingClientRect();
        /* Covered when the node sits below the visual viewport's
           bottom (under the keyboard / raised sheet) or above its
           top. 12px of breathing room. */
        const visibleTop = vv.offsetTop;
        const visibleBottom = vv.offsetTop + vv.height;
        if (rect.bottom > visibleBottom - 12 || rect.top < visibleTop) {
          const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        }
      }, 300);
    });
  };

  if (!editable) {
    /* Read mode — plain text, no chrome, no interactivity. */
    const display = value || (typeof children === 'string' ? children : '');
    return <As style={style} className={className}>{children ?? display}</As>;
  }

  const commit = () => {
    if (!ref.current) return;
    const next = (ref.current.textContent ?? '').trim();
    if (next !== lastCommittedRef.current) {
      lastCommittedRef.current = next;
      onChange?.(next);
    }
  };

  return (
    <As
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      /* plaintext-only strips pasted formatting (bold, font, etc).
         Chrome/Edge support it; Firefox falls through to 'true'
         which still works, just keeps formatting on paste. */
      {...({ contentEditable: 'plaintext-only' as unknown as boolean } as Record<string, unknown>)}
      className={className}
      role="textbox"
      aria-label={placeholder}
      onFocus={() => { setFocused(true); scheduleKeyboardScroll(); }}
      onBlur={() => { setFocused(false); clearKeyboardScroll(); commit(); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (ref.current) ref.current.textContent = lastCommittedRef.current;
          (e.currentTarget as HTMLElement).blur();
          return;
        }
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
          return;
        }
        /* Stop propagation so clicks on parent containers (e.g.
           setActive(null) on the canvas paper-grid backdrop)
           don't fire from a keystroke. */
        e.stopPropagation();
      }}
      onClick={(e) => {
        /* The canvas's outer div has onClick={() => setActive(null)}
           which would deselect the section when the host clicks
           text. Stop that so editing stays focused on this field. */
        e.stopPropagation();
      }}
      style={{
        ...style,
        cursor: 'text',
        outline: focused ? '2px solid var(--peach-ink, #C6703D)' : 'none',
        outlineOffset: 2,
        borderRadius: 3,
        /* Show placeholder via ::before pseudo isn't easy on a
           contentEditable element — instead, when empty + focused,
           the DOM shows the caret on an empty area. When empty +
           unfocused, we render the placeholder via the value
           fallback (the .textContent stays empty so the user can
           start typing). */
        minHeight: '1em',
        minWidth: 8,
        transition: 'outline var(--pl-dur-subtle)',
      }}
      /* Initial DOM content — uncontrolled. The effect above syncs
         on prop changes when not focused. */
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  );
}
