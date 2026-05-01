'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteFaq.tsx
// FAQ section for groove-family sites. Each Q is a bubble
// card with accent ring; click to expand the answer. Radix-
// light (plain details/summary) so no new deps.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface GrooveSiteFaqProps {
  items: FaqItem[];
  title?: string;
  accent: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
  bodyFont: string;
}

export function GrooveSiteFaq({
  items,
  title = 'Good questions',
  accent,
  foreground,
  background,
  muted,
  headingFont,
  bodyFont,
}: GrooveSiteFaqProps) {
  const [openId, setOpenId] = useState<number | null>(0);
  if (!items?.length) return null;

  return (
    <section
      id="faq"
      style={{
        padding: 'clamp(72px, 12vw, 140px) clamp(20px, 5vw, 64px)',
        background,
      }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 16,
            }}
          >
            FAQ
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: `"${headingFont}", Georgia, serif`,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: foreground,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
        </header>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, i) => {
            const open = openId === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : i)}
                  aria-expanded={open}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'clamp(20px, 3vw, 28px)',
                    background: open
                      ? `color-mix(in oklab, ${accent} 14%, ${background})`
                      : `color-mix(in oklab, ${accent} 6%, ${background})`,
                    border: `1px solid color-mix(in oklab, ${accent} ${open ? 40 : 18}%, transparent)`,
                    borderRadius: open ? '28px 28px 4px 4px' : '28px',
                    color: foreground,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    fontFamily: `"${bodyFont}", system-ui, sans-serif`,
                    fontSize: '1.02rem',
                    fontWeight: 600,
                    transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out), border-radius var(--pl-dur-fast) var(--pl-ease-out)',
                  }}
                >
                  <span>{item.question}</span>
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: accent,
                      color: background,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      transition: 'transform var(--pl-dur-fast) var(--pl-groove-ease-bloom)',
                      transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    +
                  </span>
                </button>
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: open ? 600 : 0,
                    transition: 'max-height var(--pl-dur-slow) var(--pl-ease-out)',
                  }}
                >
                  <div
                    style={{
                      padding: 'clamp(16px, 2.5vw, 24px) clamp(20px, 3vw, 28px) clamp(20px, 3vw, 28px)',
                      background: `color-mix(in oklab, ${accent} 6%, ${background})`,
                      borderRadius: '4px 4px 28px 28px',
                      border: `1px solid color-mix(in oklab, ${accent} 22%, transparent)`,
                      borderTop: 'none',
                      color: muted ?? foreground,
                      fontFamily: `"${bodyFont}", system-ui, sans-serif`,
                      fontSize: '0.98rem',
                      lineHeight: 1.6,
                      opacity: 0.92,
                    }}
                  >
                    {item.answer}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
