'use client';

// ─────────────────────────────────────────────────────────────
// DashEmpty — single primitive every dashboard panel uses for
// "this section has no data yet" states. Replaces the old
// thin "Nothing yet." placeholder strings with an intentional
// composition: editorial title + body + an example chip row
// the host can scan to see what the panel WILL look like once
// they fill it, plus one or two actions.
//
// Three sizes: 'panel' (inline inside a Section card), 'card'
// (free-standing), 'page' (centered hero used when the entire
// dashboard tab has no data — e.g. a brand-new site).
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, Pear, Sparkle } from '../motifs';

export interface DashEmptyAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  icon?: string;
}

export interface DashEmptyProps {
  /** Eyebrow over the title. Optional editorial label. */
  eyebrow?: string;
  /** Display title — 1-3 words, sentence case. Required. */
  title: string;
  /** One short paragraph explaining what shows up here. */
  body: string;
  /** Up to ~5 example chips that hint at the kind of content
   *  this panel will hold. Renders as faded mock pills so the
   *  host can read "ah, this is where my X will appear." */
  examples?: string[];
  /** Up to 2 actions. First gets the pearl-accent CTA. */
  actions?: DashEmptyAction[];
  /** Mascot tone — picks a Pear/Heart/Sparkle as the icon. */
  tone?: 'pear' | 'sparkle' | 'heart';
  /** Density preset. Default 'panel'. */
  size?: 'panel' | 'card' | 'page';
  /** Extra style overrides for unusual layouts. */
  style?: CSSProperties;
}

export function DashEmpty({
  eyebrow,
  title,
  body,
  examples,
  actions,
  tone = 'pear',
  size = 'panel',
  style,
}: DashEmptyProps) {
  const padding =
    size === 'page' ? 'clamp(48px, 6vw, 72px) 32px' :
    size === 'card' ? '32px 28px' :
    '24px 22px';
  const titleSize =
    size === 'page' ? 'clamp(28px, 3.4vw, 38px)' :
    size === 'card' ? 22 :
    18;
  const bodySize = size === 'page' ? 14.5 : 13;

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--cream-2)',
        border: '1px dashed var(--line)',
        borderRadius: 14,
        padding,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        ...style,
      }}
    >
      {/* Faint Pear mascot mark on the left edge — quietly
          reinforces brand without dominating the empty state. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 14,
          top: 16,
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      >
        {tone === 'sparkle'
          ? <Sparkle size={18} />
          : tone === 'heart'
            ? <Icon name="heart-icon" size={20} color="var(--peach-ink)" />
            : <Pear size={22} tone="sage" shadow={false} />}
      </span>

      {eyebrow && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          }}
        >
          {eyebrow}
        </div>
      )}

      <h3
        className="display"
        style={{
          fontSize: titleSize,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: bodySize,
          color: 'var(--ink-soft)',
          lineHeight: 1.55,
          margin: 0,
          maxWidth: size === 'page' ? 480 : 360,
        }}
      >
        {body}
      </p>

      {examples && examples.length > 0 && (
        <div
          aria-hidden
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            justifyContent: 'center',
            opacity: 0.62,
            marginTop: 4,
            maxWidth: 420,
          }}
        >
          {examples.slice(0, 6).map((e, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'var(--card)',
                color: 'var(--ink-soft)',
                border: '1px solid var(--line-soft)',
                borderRadius: 999,
                fontFamily: 'var(--font-ui)',
                fontStyle: 'italic',
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}

      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actions.map((a, i) => {
            const cls = i === 0 && a.primary !== false ? 'pl-pearl-accent' : '';
            const baseStyle: CSSProperties = {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              textDecoration: 'none',
              border: cls ? 'none' : '1px solid var(--line)',
              background: cls ? undefined : 'var(--card)',
              color: cls ? undefined : 'var(--ink)',
            };
            const inner: ReactNode = (
              <>
                {a.icon && <Icon name={a.icon} size={12} />}
                {a.label}
              </>
            );
            if (a.href) {
              return (
                <Link key={a.label} href={a.href} className={cls} style={baseStyle}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={cls}
                style={baseStyle}
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
