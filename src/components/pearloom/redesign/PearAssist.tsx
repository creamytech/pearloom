'use client';

/* eslint-disable no-restricted-syntax */
/* PearAssist — shared AI primitives across the editor.

   Round S consolidated four ad-hoc spinner/chip patterns into:
     - PearThinking — the canonical "Pear is thinking…" pulse used
       anywhere a Claude call is in flight.
     - PearAiChip — the canonical AI-action chip (✨ + label + busy
       state). Use this anywhere you'd previously written a bespoke
       <button> with sparkles icon + manual busy dot.
     - PearInlineRewrite — a floating "✨ polish" button that
       attaches to a focused InlineEdit on the canvas. Hits
       /api/inline-rewrite with the focused text + optional tone
       context, then writes the rewritten value back via onCommit.

   All three share the same visual language: peach accent, gold
   sparkle, pulsing dot when busy. Reuse these instead of forking
   the styles. */

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../motifs';

/* ─── PearThinking — inline busy indicator ─────────────────── */

export function PearThinking({
  label = 'Pear is thinking…',
  inline = true,
}: {
  label?: string;
  /** When true (default), renders inline as a span. When false,
   *  renders as a block with vertical padding — useful for empty-
   *  state cards while AI fills them. */
  inline?: boolean;
}) {
  const Tag = inline ? ('span' as const) : ('div' as const);
  return (
    <Tag
      style={{
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--peach-ink)',
        ...(inline ? {} : { padding: '10px 14px', justifyContent: 'center' }),
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--peach-ink)',
          animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
        }}
      />
      {label}
    </Tag>
  );
}

/* ─── PearAiChip — sparkles-prefixed AI action button ─────── */

export function PearAiChip({
  label,
  onClick,
  busy = false,
  disabled = false,
  variant = 'soft',
  style,
  children,
}: {
  label?: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** 'soft' = cream-2 bg + ink-soft text (default). 'accent' =
   *  peach-bg + peach-ink, more visually present. */
  variant?: 'soft' | 'accent';
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const isAccent = variant === 'accent' || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 10px',
        borderRadius: 999,
        background: isAccent ? 'var(--peach-bg)' : 'var(--cream-2)',
        color: isAccent ? 'var(--peach-ink)' : 'var(--ink-soft)',
        border: `1px solid ${isAccent ? 'var(--peach-ink)' : 'var(--line)'}`,
        cursor: busy ? 'wait' : disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        ...style,
      }}
    >
      {busy ? (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--peach-ink)',
            animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
          }}
        />
      ) : (
        <Icon name="sparkles" size={10} color={isAccent ? 'var(--peach-ink)' : 'var(--gold)'} />
      )}
      {children ?? label}
    </button>
  );
}

/* ─── PearInlineRewrite — focused-field AI rewrite button ─── */

/**
 * Tone presets the inline rewriter offers — each becomes a chip.
 * Adding a new tone here surfaces it automatically across every
 * field that mounts PearInlineRewrite.
 */
export type RewriteTone = 'shorten' | 'warmer' | 'funnier' | 'poetic';
const TONE_LABEL: Record<RewriteTone, string> = {
  shorten: 'Shorten',
  warmer:  'Warmer',
  funnier: 'Funnier',
  poetic:  'More poetic',
};

export interface PearInlineRewriteProps {
  /** Current text to rewrite. */
  value: string;
  /** Called with the rewritten text on success. */
  onCommit: (next: string) => void;
  /** Free-form context tag passed to /api/inline-rewrite —
   *  identifies the field so Claude knows the register. E.g.
   *  'hero tagline', 'story body', 'details value — dress code'. */
  context: string;
  /** Tone presets to show. Defaults to all four. */
  tones?: RewriteTone[];
  /** Optional inline error renderer override. */
  onError?: (msg: string) => void;
}

export function PearInlineRewrite({
  value,
  onCommit,
  context,
  tones = ['shorten', 'warmer', 'funnier', 'poetic'],
  onError,
}: PearInlineRewriteProps) {
  const [busy, setBusy] = useState<RewriteTone | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function rewrite(tone: RewriteTone) {
    if (!value.trim() || value.trim().length < 2) {
      const msg = 'Write something first, then Pear can polish it.';
      setErr(msg);
      onError?.(msg);
      return;
    }
    setBusy(tone); setErr(null);
    try {
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          context: `${context} — make it ${TONE_LABEL[tone].toLowerCase()}`,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const { rewritten } = await res.json() as { rewritten: string };
      if (rewritten && rewritten !== value) onCommit(rewritten);
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg);
      onError?.(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tones.map((t) => (
          <PearAiChip
            key={t}
            label={busy === t ? `${TONE_LABEL[t]}…` : TONE_LABEL[t]}
            onClick={() => rewrite(t)}
            busy={busy === t}
            disabled={!!busy && busy !== t}
          />
        ))}
      </div>
      {err && (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 7,
            background: 'rgba(122,45,45,0.08)',
            fontSize: 11,
            color: '#7A2D2D',
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

/* ─── AISource — "Drafted by Pear" stamp ────────────────────── */

export function AISource({ when, model = 'Haiku' }: { when?: Date | string | null; model?: 'Haiku' | 'Sonnet' | 'Opus' }) {
  const ts = when
    ? (typeof when === 'string' ? when : when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    : null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10.5,
        color: 'var(--ink-muted)',
        fontStyle: 'italic',
      }}
    >
      <Icon name="sparkles" size={9} color="var(--gold)" />
      Drafted by Pear · {model}{ts ? ` · ${ts}` : ''}
    </span>
  );
}
