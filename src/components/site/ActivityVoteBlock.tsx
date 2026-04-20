'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/ActivityVoteBlock.tsx
//
// Multi-choice poll for group trips — "Which activity Saturday?"
// MVP is client-side voting via localStorage; the host sees the
// leader bar, guests only see their own pick. Proper server-side
// voting lands with an /api/vote route later.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from 'react';

export interface ActivityOption {
  id: string;
  label: string;
  note?: string;
  /** Optional seed count the host enters manually (e.g., existing votes). */
  initialVotes?: number;
}

interface ActivityVoteBlockProps {
  title?: string;
  subtitle?: string;
  question?: string;
  /** Storage namespace — usually the site slug. */
  storageKey?: string;
  options: ActivityOption[];
  /** If true, shows vote bars. Host-only in later iterations; open now. */
  showResults?: boolean;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function ActivityVoteBlock({
  title = 'What should we do?',
  subtitle,
  question,
  storageKey = 'default',
  options,
  showResults = true,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: ActivityVoteBlockProps) {
  const storeKey = `pearloom:vote:${storageKey}`;
  const [myVote, setMyVote] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storeKey);
      if (raw) setMyVote(raw);
    } catch { /* ignore */ }
  }, [storeKey]);

  const castVote = (id: string) => {
    const next = myVote === id ? null : id;
    setMyVote(next);
    if (typeof window !== 'undefined') {
      try {
        if (next) window.localStorage.setItem(storeKey, next);
        else window.localStorage.removeItem(storeKey);
      } catch { /* ignore */ }
    }
  };

  const totalVotes = options.reduce((sum, o) => {
    const base = o.initialVotes ?? 0;
    return sum + base + (myVote === o.id ? 1 : 0);
  }, 0);

  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="activityVote"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: foreground,
              fontStyle: 'italic',
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
          {question && (
            <p
              style={{
                marginTop: 18,
                fontFamily: headingFont,
                fontStyle: 'italic',
                fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
                color: foreground,
              }}
            >
              {question}
            </p>
          )}
        </header>

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((option) => {
            const base = option.initialVotes ?? 0;
            const votes = base + (myVote === option.id ? 1 : 0);
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const on = myVote === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => castVote(option.id)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: 'var(--pl-radius-lg)',
                    border: `1px solid ${on ? accent : 'var(--pl-divider)'}`,
                    background: 'var(--pl-cream-card)',
                    color: foreground,
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out)',
                  }}
                >
                  {/* Vote bar behind content */}
                  {showResults && totalVotes > 0 && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: `${pct}%`,
                        background: `color-mix(in oklab, ${accent} ${on ? 14 : 8}%, transparent)`,
                        transition: 'width var(--pl-dur-base) var(--pl-ease-out)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <span style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <span>
                      <span
                        style={{
                          fontFamily: headingFont,
                          fontSize: '1.05rem',
                          fontWeight: 500,
                          color: foreground,
                        }}
                      >
                        {option.label}
                        {on && (
                          <span
                            style={{
                              marginLeft: 10,
                              fontFamily: 'var(--pl-font-mono, ui-monospace)',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: accent,
                            }}
                          >
                            Your pick
                          </span>
                        )}
                      </span>
                      {option.note && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: '0.85rem', color: muted, lineHeight: 1.5 }}>
                          {option.note}
                        </span>
                      )}
                    </span>
                    {showResults && totalVotes > 0 && (
                      <span
                        style={{
                          fontFamily: 'var(--pl-font-mono, ui-monospace)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: accent,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {pct}%
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p
          style={{
            marginTop: 14,
            textAlign: 'center',
            fontSize: '0.78rem',
            color: muted,
            fontStyle: 'italic',
          }}
        >
          Your vote is saved in your browser. Live tallies across guests are coming soon.
        </p>
      </div>
    </section>
  );
}
