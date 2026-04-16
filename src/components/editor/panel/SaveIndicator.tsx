'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/SaveIndicator.tsx
// Tiny status pill that reflects an autosave lifecycle. Four states:
//   idle     — invisible (nothing has changed yet).
//   saving   — spinner + "Saving…"
//   saved    — filled dot + "Saved".
//   error    — red dot + message.
// Designed to live inline with a section heading or at the foot of
// a panel; it doesn't own its own layout.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { panelFont, panelText, panelWeight, panelTracking } from './panel-tokens';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveIndicatorProps {
  state: SaveState;
  /** Custom error label; defaults to "Save failed". */
  errorLabel?: string;
  /**
   * When state flips to `saved`, auto-fade out after this many ms.
   * Pass 0 to keep the indicator visible until state changes again.
   */
  fadeAfterMs?: number;
}

export function SaveIndicator({
  state,
  errorLabel = 'Save failed',
  fadeAfterMs = 1800,
}: SaveIndicatorProps) {
  const [visible, setVisible] = useState(state !== 'idle');

  useEffect(() => {
    if (state === 'idle') { setVisible(false); return; }
    setVisible(true);
    if (state !== 'saved' || fadeAfterMs <= 0) return;
    const t = window.setTimeout(() => setVisible(false), fadeAfterMs);
    return () => window.clearTimeout(t);
  }, [state, fadeAfterMs]);

  if (!visible || state === 'idle') return null;

  const { dot, label, color } = (() => {
    if (state === 'saving') {
      return {
        dot: (
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '1.5px solid var(--pl-chrome-text-muted)',
              borderTopColor: 'transparent',
              display: 'inline-block',
              animation: 'pl-save-spin 820ms linear infinite',
            }}
          />
        ),
        label: 'Saving',
        color: 'var(--pl-chrome-text-muted)',
      };
    }
    if (state === 'error') {
      return {
        dot: (
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--pl-chrome-danger)',
              display: 'inline-block',
            }}
          />
        ),
        label: errorLabel,
        color: 'var(--pl-chrome-danger)',
      };
    }
    return {
      dot: (
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--pl-chrome-accent)',
            display: 'inline-block',
          }}
        />
      ),
      label: 'Saved',
      color: 'var(--pl-chrome-accent)',
    };
  })();

  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: panelFont.mono,
        fontSize: panelText.meta,
        fontWeight: panelWeight.bold,
        letterSpacing: panelTracking.widest,
        textTransform: 'uppercase',
        color,
        transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {dot}
      <span>{label}</span>
      <style>{`@keyframes pl-save-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
