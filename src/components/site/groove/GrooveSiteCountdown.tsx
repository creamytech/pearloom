'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/groove/GrooveSiteCountdown.tsx
// Countdown strip for groove-family sites. Big italic numbers,
// morphing blob behind, mono labels.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface GrooveSiteCountdownProps {
  targetDate: string;
  label?: string;
  accent: string;
  foreground: string;
  background: string;
  muted?: string;
  headingFont: string;
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((ms / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((ms / (1000 * 60)) % 60));
  return { days, hours, minutes, isPast: ms <= 0 };
}

export function GrooveSiteCountdown({
  targetDate,
  label,
  accent,
  foreground,
  background,
  muted,
  headingFont,
}: GrooveSiteCountdownProps) {
  const target = new Date(targetDate);
  const valid = !isNaN(target.getTime());
  const [d, setD] = useState(() => (valid ? diff(target) : { days: 0, hours: 0, minutes: 0, isPast: false }));

  useEffect(() => {
    if (!valid) return;
    const id = window.setInterval(() => setD(diff(target)), 60000);
    return () => window.clearInterval(id);
  }, [targetDate, valid]);

  if (!valid) return null;

  const displayLabel = label || (d.isPast ? 'The day has come.' : 'Counting down');

  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(56px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        textAlign: 'center',
        background: `color-mix(in oklab, ${accent} 5%, ${background})`,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          height: 520,
          borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
          background: accent,
          opacity: 0.1,
          filter: 'blur(70px)',
          animation: 'pl-groove-blob-morph 20s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 24,
          }}
        >
          {displayLabel}
        </div>

        {!d.isPast && (
          <div
            style={{
              display: 'inline-flex',
              gap: 'clamp(24px, 5vw, 56px)',
              alignItems: 'baseline',
            }}
          >
            {[
              { n: d.days, label: d.days === 1 ? 'day' : 'days' },
              { n: d.hours, label: 'hrs' },
              { n: d.minutes, label: 'min' },
            ].map(({ n, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: `"${headingFont}", Georgia, serif`,
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(3rem, 8vw, 6rem)',
                    lineHeight: 0.9,
                    color: foreground,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {String(n).padStart(2, '0')}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: muted ?? foreground,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
