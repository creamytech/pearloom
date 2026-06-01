'use client';

/* ========================================================================
   AISuggestButton + useAICall — shared AI invocation affordance for block
   panels. Renders a small Pear-marked button with loading / success /
   error states and handles rate-limit / gate responses uniformly.
   ======================================================================== */

import { useState, type ReactNode } from 'react';
import { Icon, Pear, Sparkle } from '../motifs';

export type AIState = 'idle' | 'running' | 'done' | 'error' | 'gated';

export function AISuggestButton({
  label,
  // Default runningLabel matches BRAND.md §7 + the new
  // PearThinking voice: 'drafting…' (Pear is *a person*, never
  // 'generating'; verb-first, not 'AI is thinking').
  runningLabel = 'drafting…',
  state,
  onClick,
  error,
  size = 'md',
}: {
  label: string;
  runningLabel?: string;
  state: AIState;
  onClick: () => void;
  error?: string;
  size?: 'md' | 'sm';
}) {
  const sm = size === 'sm';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={state === 'running'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: sm ? '7px 12px' : '10px 16px',
          borderRadius: 999,
          background: state === 'done' ? 'var(--sage-tint)' : 'var(--lavender-bg)',
          color: 'var(--ink)',
          border: `1px solid ${state === 'done' ? 'var(--sage-deep)' : 'rgba(107,90,140,0.25)'}`,
          fontSize: sm ? 12 : 13,
          fontWeight: 600,
          cursor: state === 'running' ? 'wait' : 'pointer',
          opacity: state === 'running' ? 0.7 : 1,
          fontFamily: 'var(--font-ui)',
          transition: 'background 180ms, border-color 180ms',
          alignSelf: 'flex-start',
        }}
      >
        {state === 'running' ? (
          /* Three peach dots pulsing in sequence — unified
             with the rest of the AI surface vocabulary
             (PearThinking, GuestPearChat empty bubble, etc.). */
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              marginRight: 2,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--peach-ink, #C6703D)',
                  opacity: 0.4,
                  animation: `pl-ai-button-dot 1.4s ease-in-out ${i * 0.18}s infinite`,
                }}
              />
            ))}
            <style jsx>{`
              @keyframes pl-ai-button-dot {
                0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
                40%           { opacity: 1;    transform: translateY(-1px); }
              }
              @media (prefers-reduced-motion: reduce) {
                span { animation: none !important; opacity: 0.7 !important; }
              }
            `}</style>
          </span>
        ) : state === 'done' ? (
          <Icon name="check" size={12} color="var(--sage-deep)" />
        ) : (
          <Pear size={14} tone="sage" shadow={false} />
        )}
        {state === 'running' ? runningLabel : state === 'done' ? 'Done' : label}
        {state === 'idle' && <Sparkle size={10} />}
      </button>
      {state === 'error' && error && (
        <span role="alert" style={{ fontSize: 11.5, color: 'var(--plum-ink, #7A2D2D)' }}>{error}</span>
      )}
      {state === 'gated' && (
        <span role="status" style={{ fontSize: 11.5, color: 'var(--peach-ink)' }}>
          You've used this month's Pear credits — upgrade in settings to keep going.
        </span>
      )}
    </div>
  );
}

export function AIHint({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: 10,
        background: 'var(--lavender-bg)',
        border: '1px solid rgba(107,90,140,0.2)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--lavender-2)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: 'var(--cream)',
        }}
      >
        <Icon name="sparkles" size={14} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

/* ---------- useAICall ---------- */
export function useAICall<T>(
  fn: () => Promise<T>,
): {
  state: AIState;
  error: string | null;
  run: () => Promise<T | null>;
  reset: () => void;
} {
  const [state, setState] = useState<AIState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function run(): Promise<T | null> {
    setState('running');
    setError(null);
    try {
      const result = await fn();
      setState('done');
      setTimeout(() => setState('idle'), 1500);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/gated|credits|429|upgrade/i.test(msg)) setState('gated');
      else setState('error');
      setError(msg.slice(0, 140));
      return null;
    }
  }

  function reset() {
    setState('idle');
    setError(null);
  }

  return { state, error, run, reset };
}

/* Spinner keyframes — injected via globals css. Honours
 * prefers-reduced-motion by stopping the rotation; the lavender
 * arc still reads as "in progress" (its differentiated colour vs.
 * the idle state is the cue), just without the loop. */
if (typeof document !== 'undefined' && !document.getElementById('pl8-spin-style')) {
  const style = document.createElement('style');
  style.id = 'pl8-spin-style';
  style.textContent = `
    @keyframes pl8-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      [data-pl-spin] { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}
