'use client';

// ─────────────────────────────────────────────────────────────
// AISource — small "drafted by Pear" badge.
//
// Sits on AI-generated content (hero copy, chapter drafts,
// suggested FAQs, generated registry message, etc.) so the
// host always knows what Pear wrote vs what they typed
// themselves. Hover reveals a tooltip with the model + tier.
//
// Variants:
//   • inline  → small italic peach text next to a Pear dot.
//                Sits at the end of a card's body.
//   • chip    → 4-6px peach pill with sparkle icon. Sits in a
//                card header next to the title.
//   • corner  → absolute-positioned top-right Pear glyph for
//                photo-replaceable areas.
//
// Pure presentational. Consumers pass `tier` to surface which
// model wrote the draft (opus / sonnet / haiku / gemini-pro
// etc.) in the tooltip — useful in admin debug, optional for
// real users.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';
import { Pear, Icon } from './motifs';

interface Props {
  /** Display variant. Default `inline`. */
  variant?: 'inline' | 'chip' | 'corner';
  /** Display label. Defaults to "drafted by Pear". Override
   *  for surface-specific wording ("Pear's first pass", "Pear
   *  suggested", etc.). */
  label?: string;
  /** Surface-specific tier for the tooltip. Optional. */
  tier?: 'opus' | 'sonnet' | 'haiku' | 'gemini-pro' | 'gemini-flash';
  style?: CSSProperties;
  /** Hide the visible label and show just the icon. */
  iconOnly?: boolean;
}

const PEACH_INK = 'var(--peach-ink, #C6703D)';
const PEACH_BG = 'var(--peach-bg, rgba(198,112,61,0.10))';

export function AISource({ variant = 'inline', label = 'drafted by Pear', tier, style, iconOnly = false }: Props) {
  const title = tier ? `${label} · ${tier}` : label;
  if (variant === 'corner') {
    return (
      <span
        title={title}
        aria-label={label}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: 5,
          background: PEACH_BG,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <Pear size={12} tone="sage" shadow={false} />
      </span>
    );
  }
  if (variant === 'chip') {
    return (
      <span
        title={title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px 3px 5px',
          background: PEACH_BG,
          color: PEACH_INK,
          border: `1px solid ${PEACH_INK}`,
          borderColor: 'color-mix(in oklab, var(--peach-ink, #C6703D) 30%, transparent)',
          borderRadius: 999,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-ui, Inter, sans-serif)',
          ...style,
        }}
      >
        <Icon name="sparkles" size={10} color={PEACH_INK} />
        {!iconOnly && <span>Pear</span>}
      </span>
    );
  }
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: PEACH_INK,
        fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
        fontStyle: 'italic',
        fontSize: 12,
        fontWeight: 400,
        ...style,
      }}
    >
      <Pear size={11} tone="sage" shadow={false} />
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}
