'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/PrivacyGateBlock.tsx
//
// Client-side privacy callout for private events (bachelor/ette,
// private memorials). Declares the site is invite-only and shows
// the host's access policy. Actual access enforcement happens at
// the site-publish layer (PasswordGate component); this block
// makes the policy visible on the site itself so guests know
// the rules.
//
// Kept simple: title + body + rules list + contact.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

interface PrivacyGateBlockProps {
  title?: string;
  subtitle?: string;
  /** Host-authored policy body. */
  body?: string;
  /** Explicit rules list. */
  rules?: string[];
  /** Host contact for access questions. */
  contact?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function PrivacyGateBlock({
  title = 'Private event',
  subtitle = 'This site is shared only with the people going.',
  body,
  rules = [
    'Don\u2019t share the link publicly.',
    'No social posts until the host says it\u2019s OK.',
    'Photos stay in the group chat unless otherwise agreed.',
  ],
  contact,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: PrivacyGateBlockProps) {
  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="privacyGate"
    >
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '28px clamp(24px, 4vw, 40px)',
          border: `1px dashed ${accent}`,
          borderRadius: 'var(--pl-radius-lg)',
          background: `color-mix(in oklab, ${accent} 5%, transparent)`,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace)',
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 12,
          }}
        >
          Invite only
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: headingFont,
            fontStyle: 'italic',
            fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
            color: foreground,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '10px 0 0', color: muted, fontSize: '0.96rem', lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
        {body && (
          <p
            style={{
              margin: '16px 0 0',
              fontSize: '0.98rem',
              lineHeight: 1.6,
              color: 'var(--pl-ink-soft)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {body}
          </p>
        )}
        {rules.length > 0 && (
          <ul
            style={{
              margin: '18px 0 0',
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {rules.map((rule, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: '0.9rem',
                  color: foreground,
                }}
              >
                <span aria-hidden style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>·</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        )}
        {contact && (
          <p
            style={{
              margin: '20px 0 0',
              paddingTop: 14,
              borderTop: '1px solid var(--pl-divider)',
              fontSize: '0.82rem',
              color: muted,
              lineHeight: 1.5,
            }}
          >
            Questions about access? {contact}
          </p>
        )}
      </div>
    </section>
  );
}
