'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/HoverToolbar.tsx
//
// The floating toolbar that appears over a block on hover in
// edit mode. Shows AI-powered quick actions — Rewrite, Make
// Shorter, Make Warmer — using the existing /api/rewrite-text
// endpoint we wired earlier.
//
// Renders only when its EditorCanvasContext is in edit mode.
// In static mode it's a no-op wrapper that passes children
// through.
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useIsEditMode } from './EditorCanvasContext';

export interface HoverToolbarAction {
  id: string;
  label: string;
  /** Returns the new value; toolbar commits via onResult. */
  run: (current: string) => Promise<string>;
  icon?: ReactNode;
}

interface HoverToolbarProps {
  /** Current value the toolbar's actions operate on. */
  value: string;
  /** Commit handler — toolbar calls this after an action returns. */
  onResult: (next: string) => void;
  /** Action set. Falls back to the default AI-rewrite bundle if omitted. */
  actions?: HoverToolbarAction[];
  /** Inline content (the block this toolbar hangs over). */
  children: ReactNode;
  /** Optional label for accessibility, e.g. "Hero tagline". */
  context?: string;
}

/** Default AI rewrite actions — they all hit /api/rewrite-text
 *  with an instruction that describes the transformation. */
function defaultActions(context?: string): HoverToolbarAction[] {
  const subject = context ? `the ${context}` : 'this text';
  const call = async (instruction: string, current: string) => {
    const res = await fetch('/api/rewrite-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `${instruction} Current text: "${current}"`,
        tone: 'warm',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const text = (data.text ?? data.rewritten ?? data.result ?? data.rewrite ?? '').trim().replace(/^"|"$/g, '');
    return text || current;
  };
  return [
    {
      id: 'rewrite',
      label: 'Rewrite',
      run: (cur) => call(`Rewrite ${subject} so it's more specific, unexpected, and warm. Keep the length.`, cur),
    },
    {
      id: 'shorter',
      label: 'Shorter',
      run: (cur) => call(`Rewrite ${subject} to be about half as long. Keep the core meaning.`, cur),
    },
    {
      id: 'warmer',
      label: 'Warmer',
      run: (cur) => call(`Rewrite ${subject} so it feels warmer, more human, and less brand-y.`, cur),
    },
  ];
}

export function HoverToolbar({ value, onResult, actions, children, context }: HoverToolbarProps) {
  const editMode = useIsEditMode();
  const [hovered, setHovered] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!editMode) return <>{children}</>;

  const acts = actions ?? defaultActions(context);

  const run = async (action: HoverToolbarAction) => {
    setBusyId(action.id);
    try {
      const next = await action.run(value);
      onResult(next);
    } catch {
      /* swallow — a toast layer could surface errors later */
    } finally {
      setBusyId(null);
    }
  };

  const barStyle: CSSProperties = {
    position: 'absolute',
    top: -14,
    right: 8,
    // Above canvas content but below editor modals + toasts
    // (design-advisor = 1200, publish banner = 9999).
    zIndex: 50,
    display: 'flex',
    gap: 6,
    padding: '6px 8px',
    borderRadius: 999,
    background: 'var(--ink, #18181B)',
    color: 'var(--cream, #FDFAF0)',
    boxShadow: '0 10px 24px rgba(14,13,11,0.22)',
    fontSize: 11.5,
    letterSpacing: '0.04em',
    opacity: hovered ? 1 : 0,
    transform: hovered ? 'translateY(0)' : 'translateY(-4px)',
    transition: 'opacity 160ms ease, transform 160ms ease',
    pointerEvents: hovered ? 'auto' : 'none',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {children}
      <div role="toolbar" aria-label={`${context ?? 'Block'} actions`} style={barStyle}>
        {acts.map((a) => {
          const busy = busyId === a.id;
          const anyBusy = busyId !== null;
          return (
            <button
              key={a.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void run(a);
              }}
              disabled={anyBusy}
              style={{
                all: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                cursor: anyBusy ? 'wait' : 'pointer',
                color: 'inherit',
                background: busy ? 'rgba(255,255,255,0.12)' : 'transparent',
                opacity: anyBusy && !busy ? 0.5 : 1,
                transition: 'background 140ms ease',
              }}
              onMouseEnter={(e) => {
                if (anyBusy) return;
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                if (busy) return;
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {a.icon}
              {busy ? `${a.label}…` : a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
