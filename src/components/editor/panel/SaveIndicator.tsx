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
import { panelText, panelWeight, panelTracking } from './panel-tokens';

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
              border: '1.5px solid #A1A1AA',
              borderTopColor: 'transparent',
              display: 'inline-block',
              animation: 'pl-save-spin 720ms linear infinite',
            }}
          />
        ),
        label: 'Saving…',
        color: '#71717A',
      };
    }
    if (state === 'error') {
      return {
        dot: (
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#DC2626',
              display: 'inline-block',
            }}
          />
        ),
        label: errorLabel,
        color: '#B91C1C',
      };
    }
    return {
      dot: (
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#16A34A',
            display: 'inline-block',
          }}
        />
      ),
      label: 'Saved',
      color: '#4D7C0F',
    };
  })();

  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: panelText.meta,
        fontWeight: panelWeight.semibold,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color,
        transition: 'opacity 160ms ease',
      }}
    >
      {dot}
      <span>{label}</span>
      <style>{`@keyframes pl-save-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
