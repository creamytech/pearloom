'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/InlineArtHoverToolbar.tsx
//
// Wraps a decorative SVG surface with a hover-reveal mini toolbar
// that lets the user remove or regenerate that single piece of AI
// art from right where it lives on the canvas. Used for:
//   - sectionBorderSvg (between chapters)
//   - medallionSvg     (top of story)
//   - chapterIcons[i]  (above each chapter)
//   - heroBlobSvg      (hero overlay)
//   - cornerFlourishSvg
//   - accentBlobSvg
//
// Positioning contract: the wrapper inherits positioning from the
// `style` prop (callers pass the same absolute/relative geometry
// the raw SVG used to have). The inner artwork keeps its original
// pointer-events: none so clicks over the art fall through to the
// content behind it. Only the tiny corner chip captures pointer
// events, so no critical UI (hero CTA, chapter title) gets hijacked.
//
// On action the component dispatches `pearloom-art-edit` with the
// slot name + action. EditorCanvas picks up the event and applies
// the change to the manifest (or calls the regenerate API).
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';

export type ArtSlotKey =
  | 'heroBlobSvg'
  | 'cornerFlourishSvg'
  | 'accentBlobSvg'
  | 'sectionBorderSvg'
  | 'medallionSvg'
  | 'heroPatternSvg'
  | 'chapterIcon';

export interface ArtEditDetail {
  slot: ArtSlotKey;
  action: 'remove' | 'regenerate';
  /** Index into chapterIcons[] when slot === 'chapterIcon'. */
  index?: number;
}

interface Props {
  children: React.ReactNode;
  slot: ArtSlotKey;
  /** Array index for chapterIcon only. */
  index?: number;
  /** Label for the hover tooltip (e.g. "Chapter divider"). */
  label: string;
  /** Inline style for the outer wrapper (positioning inherited from parent). */
  style?: React.CSSProperties;
  /** Pass through className — used by callers that rely on CSS classes. */
  className?: string;
  /** When false, render children unchanged with no hover UI (public site). */
  editable?: boolean;
}

export function InlineArtHoverToolbar({
  children, slot, index, label, style, className, editable,
}: Props) {
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState<null | 'remove' | 'regenerate'>(null);
  // Live ref so async handlers don't re-trigger in-flight calls.
  const busyRef = useRef<null | 'remove' | 'regenerate'>(null);

  if (!editable) {
    // Public site / non-edit preview: no-op wrapper that doesn't change
    // layout or interaction.
    return <div style={{ pointerEvents: 'none', ...style }} className={className}>{children}</div>;
  }

  const dispatch = (action: 'remove' | 'regenerate') => {
    if (busyRef.current) return;
    busyRef.current = action;
    setBusy(action);
    const detail: ArtEditDetail = { slot, action, index };
    window.dispatchEvent(new CustomEvent('pearloom-art-edit', { detail }));
    const doneHandler = (e: Event) => {
      const d = (e as CustomEvent).detail as ArtEditDetail & { ok?: boolean };
      if (d?.slot === slot && d?.action === action && d?.index === index) {
        busyRef.current = null;
        setBusy(null);
        window.removeEventListener('pearloom-art-edit-done', doneHandler);
      }
    };
    window.addEventListener('pearloom-art-edit-done', doneHandler);
    // Safety timeout — release busy even if no done event comes back.
    setTimeout(() => {
      if (busyRef.current === action) {
        busyRef.current = null;
        setBusy(null);
        window.removeEventListener('pearloom-art-edit-done', doneHandler);
      }
    }, 15000);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        // Wrapper itself doesn't capture pointer events — we rely on the
        // child art (pointer-events:none still) and the tiny corner chip
        // (pointer-events:auto). This keeps hero CTAs / chapter text
        // beneath the decorative SVG fully clickable in edit mode.
        pointerEvents: 'none',
        ...style,
      }}
      className={className}
    >
      {children}

      {/* Always-visible corner chip — small enough to not block anything,
          but large enough to invite a click. Gets highlighted when the
          wrapper is hovered (via the mouseenter handler above, which
          does trigger on pointer-events:none parents when pointer is
          over a child with pointer-events:auto — our chip itself). */}
      <div
        role="toolbar"
        aria-label={`${label} actions`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          zIndex: 20,
          display: 'flex',
          gap: 2,
          padding: 3,
          borderRadius: 8,
          background: 'rgba(24,24,27,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
          pointerEvents: 'auto',
          opacity: hover || busy ? 1 : 0.55,
          transform: hover || busy ? 'scale(1)' : 'scale(0.92)',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        <ArtBtn
          title={`Regenerate ${label.toLowerCase()}`}
          onClick={() => dispatch('regenerate')}
          disabled={!!busy}
          loading={busy === 'regenerate'}
          Icon={Sparkles}
        />
        <ArtBtn
          title={`Remove ${label.toLowerCase()}`}
          onClick={() => dispatch('remove')}
          disabled={!!busy}
          loading={busy === 'remove'}
          Icon={Trash2}
          danger
        />
      </div>
    </div>
  );
}

function ArtBtn({
  title, onClick, disabled, loading, Icon, danger,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  Icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        border: 'none',
        background: 'transparent',
        color: danger ? '#ff8a8a' : '#fff',
        cursor: disabled ? 'wait' : 'pointer',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? 'rgba(248,113,113,0.22)'
          : 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {loading ? (
        <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <Icon size={11} />
      )}
    </button>
  );
}
