'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/ProgramBlock.tsx
//
// Ordered ceremony program — Bar/Bat Mitzvah, Quinceañera,
// Baptism, First Communion, memorial service, cultural
// wedding ceremonies. Each program item has an order number,
// title, description, and optional participant.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export interface ProgramItem {
  title: string;
  description?: string;
  /** "Rabbi Cohen", "The candle-lighters", "The father of the bride". */
  participant?: string;
}

interface ProgramBlockProps {
  title?: string;
  subtitle?: string;
  items: ProgramItem[];
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function ProgramBlock({
  title = 'The program',
  subtitle,
  items,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: ProgramBlockProps) {
  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="program"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontStyle: 'italic',
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: foreground,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '10px auto 0', maxWidth: '52ch', color: muted, fontSize: '0.96rem', lineHeight: 1.55 }}>
              {subtitle}
            </p>
          )}
        </header>

        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid var(--pl-divider-soft)',
          }}
        >
          {items.length === 0 ? (
            <li style={{ padding: '20px 0', color: muted, fontStyle: 'italic', textAlign: 'center' }}>
              Nothing yet. Begin a thread.
            </li>
          ) : (
            items.map((item, i) => (
              <li
                key={`${item.title}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr',
                  gap: 20,
                  padding: '20px 0',
                  borderBottom: '1px solid var(--pl-divider-soft)',
                }}
              >
                <span
                  style={{
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    fontSize: '1.8rem',
                    color: accent,
                    lineHeight: 1,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: headingFont,
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      color: foreground,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {item.title}
                  </div>
                  {item.participant && (
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: 'var(--pl-font-mono, ui-monospace)',
                        fontSize: '0.62rem',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: accent,
                      }}
                    >
                      {item.participant}
                    </div>
                  )}
                  {item.description && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: '0.92rem',
                        color: 'var(--pl-ink-soft)',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.description}
                    </div>
                  )}
                </div>
              </li>
            ))
          )}
        </ol>
      </div>
    </section>
  );
}
