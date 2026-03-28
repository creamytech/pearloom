'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/CountdownBlock.tsx
// Live countdown block for the site renderer.
// Provides a themed countdown experience with the AI palette.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

interface CountdownBlockProps {
  targetDate: string;        // ISO date string
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  bgColor?: string;
  fgColor?: string;
  mutedColor?: string;
  label?: string;            // e.g. "Until the wedding" or "Until the party!"
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: string): TimeLeft | null {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function CountdownBlock({
  targetDate,
  accentColor = '#b8926a',
  headingFont = 'Playfair Display',
  bodyFont = 'Inter',
  bgColor = '#ffffff',
  fgColor = '#1a1a1a',
  mutedColor = '#8c8c8c',
  label = 'Counting Down',
}: CountdownBlockProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  const update = useCallback(() => setTimeLeft(calcTimeLeft(targetDate)), [targetDate]);

  useEffect(() => {
    setMounted(true);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [update]);

  if (!mounted) return null;

  // Past event
  if (!timeLeft) {
    return (
      <section
        id="countdown"
        style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          background: bgColor,
        }}
      >
        <div
          style={{
            fontFamily: `"${headingFont}", serif`,
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 400,
            color: accentColor,
          }}
        >
          🎉 The day has arrived!
        </div>
      </section>
    );
  }

  const segments = [
    { value: timeLeft.days, unit: 'Days' },
    { value: timeLeft.hours, unit: 'Hours' },
    { value: timeLeft.minutes, unit: 'Minutes' },
    { value: timeLeft.seconds, unit: 'Seconds' },
  ];

  return (
    <section
      id="countdown"
      style={{
        padding: '5rem 2rem',
        textAlign: 'center',
        background: bgColor,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: '0.65rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: mutedColor,
          fontWeight: 700,
          fontFamily: `"${bodyFont}", sans-serif`,
          marginBottom: '2rem',
        }}
      >
        {label}
      </div>

      {/* Timer grid */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'clamp(0.5rem, 2vw, 1.5rem)',
          flexWrap: 'wrap',
        }}
      >
        {segments.map((seg, i) => (
          <div key={seg.unit} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.3rem, 1vw, 0.8rem)' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: `${accentColor}0a`,
                border: `1px solid ${accentColor}20`,
                borderRadius: '0.75rem',
                padding: 'clamp(0.8rem, 2vw, 1.2rem) clamp(1rem, 2.5vw, 1.8rem)',
                minWidth: 'clamp(58px, 10vw, 90px)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                style={{
                  fontFamily: `"${headingFont}", serif`,
                  fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                  fontWeight: 700,
                  color: fgColor,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'transform 0.3s ease',
                }}
              >
                {String(seg.value).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: mutedColor,
                  marginTop: '0.35rem',
                  fontWeight: 700,
                  fontFamily: `"${bodyFont}", sans-serif`,
                }}
              >
                {seg.unit}
              </span>
            </div>

            {/* Colon separator */}
            {i < 3 && (
              <span
                style={{
                  color: accentColor,
                  fontSize: 'clamp(1rem, 3vw, 1.8rem)',
                  fontWeight: 300,
                  opacity: 0.4,
                  marginBottom: '1rem',
                }}
              >
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
