'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/PearRegenerateButton.tsx
//
// Small inline "regen with Pear" pill used beside AI-generated
// copy fields (poetry: heroTagline, closingLine, rsvpIntro,
// welcomeStatement). Posts to /api/rewrite-text with the current
// value + a style, streams back a single replacement, and lets
// the caller commit it into the manifest.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { PearIcon } from '@/components/icons/PearloomIcons';

type RewriteStyle = 'poetic' | 'casual' | 'shorter';

interface Props {
  /** Current text to reimagine. */
  value: string;
  /** Commit a new value. */
  onApply: (next: string) => void;
  /** Style hint sent to the API. Defaults to 'poetic' for editorial copy. */
  style?: RewriteStyle;
  /** Optional short label shown inside the pill. Defaults to "Pear". */
  label?: string;
  /** Forwarded for layout — inline with the label row or below. */
  compact?: boolean;
  /** Short context string sent to the API so Pear knows what it's rewriting. */
  context?: string;
}

export function PearRegenerateButton({
  value,
  onApply,
  style = 'poetic',
  label = 'Pear',
  compact = false,
  context = 'An editorial wedding/life-event site. Keep it warm, human, and brief.',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || !value?.trim();

  async function run() {
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value.trim(), style, context }),
      });
      if (!res.ok) {
        throw new Error('Rewrite failed');
      }
      const data = await res.json();
      const next =
        typeof data?.rewrite === 'string'
          ? data.rewrite.trim()
          : typeof data?.rewritten === 'string'
            ? data.rewritten.trim()
            : typeof data?.text === 'string'
              ? data.text.trim()
              : null;
      if (!next) throw new Error('No rewrite returned');
      // Label the next undo entry so the user can see that Pear
      // made the edit (audit finding #50).
      window.dispatchEvent(
        new CustomEvent<string>('pearloom:next-edit-label', {
          detail: `Pear: ${label.toLowerCase()}`,
        }),
      );
      onApply(next);
    } catch (err) {
      setError((err as Error).message || 'Couldn\u2019t rewrite');
      setTimeout(() => setError(null), 2800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <motion.button
        type="button"
        onClick={run}
        disabled={disabled}
        whileHover={!disabled ? { y: -1, scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.96 } : undefined}
        aria-label="Rewrite with Pear"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: compact ? '3px 8px' : '4px 10px',
          borderRadius: 'var(--pl-radius-full)',
          border: '1px solid color-mix(in oklab, var(--pl-olive, #5C6B3F) 28%, transparent)',
          background: 'color-mix(in oklab, var(--pl-olive, #5C6B3F) 10%, transparent)',
          color: 'var(--pl-olive, #5C6B3F)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: compact ? '0.52rem' : '0.56rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 700,
          cursor: disabled ? 'wait' : 'pointer',
          opacity: disabled && !busy ? 0.5 : 1,
          transition: 'background 0.15s, transform 0.15s',
        }}
      >
        {busy ? (
          <Loader2 size={10} style={{ animation: 'pl-spin 0.8s linear infinite' }} />
        ) : (
          <PearIcon size={10} color="currentColor" />
        )}
        {label}
        {!busy && <Sparkles size={9} />}
      </motion.button>
      {error && (
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.56rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--pl-plum, #7A2D2D)',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
