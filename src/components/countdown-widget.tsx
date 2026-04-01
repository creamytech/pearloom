'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/countdown-widget.tsx
// Animated countdown to the wedding day — appears on the hero
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import { parseLocalDate } from '@/lib/date';

interface CountdownWidgetProps {
  targetDate: string; // ISO date string
  coupledNames?: [string, string];
  onPhoto?: boolean; // true = white text mode (on hero photo)
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: string): TimeLeft | null {
  const now = new Date().getTime();
  const then = parseLocalDate(target).getTime();
  const diff = then - now;
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export function CountdownWidget({ targetDate, onPhoto = false }: CountdownWidgetProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTimer = () => setTimeLeft(getTimeLeft(targetDate));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Don't render on server or if already past
  if (!mounted) return null;
  if (!timeLeft) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2 }}
        style={{
          textAlign: 'center',
          color: onPhoto ? 'rgba(255,255,255,0.85)' : 'var(--eg-accent)',
          fontSize: '0.9rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: '2rem',
        }}
      >
        Today is the day!
      </motion.div>
    );
  }

  const textColor = onPhoto ? 'rgba(255,255,255,0.97)' : 'var(--eg-fg)';
  const mutedColor = onPhoto ? 'rgba(255,255,255,0.52)' : 'var(--eg-muted)';
  const cardBg = onPhoto ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)';
  const cardBorder = onPhoto ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.07)';
  const cardShadow = onPhoto
    ? '0 4px 20px rgba(0,0,0,0.15)'
    : '0 4px 20px rgba(43,43,43,0.07), 0 1px 4px rgba(43,43,43,0.04)';

  const segments = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Sec', isTick: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 2 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        marginTop: '2.75rem',
      }}
    >
      {/* Section icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <CalendarHeartIcon size={14} color={onPhoto ? 'rgba(255,255,255,0.6)' : 'var(--eg-accent)'} />
        <span style={{
          fontSize: '0.58rem',
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          color: mutedColor,
          fontWeight: 700,
        }}>
          Counting Down
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Unit card */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: '1.25rem',
              padding: '1.1rem 1.6rem',
              minWidth: '68px',
              boxShadow: cardShadow,
              backdropFilter: onPhoto ? 'blur(12px)' : 'none',
            }}>
              <motion.span
                key={seg.value}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 600,
                  color: textColor,
                  lineHeight: 1,
                  fontFamily: 'var(--eg-font-heading)',
                  fontVariantNumeric: 'tabular-nums',
                  // CSS tick animation on seconds
                  ...(seg.isTick ? {
                    animation: 'countdown-tick 1s steps(1) infinite',
                  } : {}),
                }}
              >
                {String(seg.value).padStart(2, '0')}
              </motion.span>
              <span style={{
                fontSize: '0.52rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: mutedColor,
                marginTop: '0.4rem',
                fontWeight: 700,
              }}>
                {seg.label}
              </span>
            </div>

            {/* Blinking colon separator (not after last) */}
            {i < 3 && (
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ color: mutedColor, fontSize: '1.4rem', fontWeight: 300, marginBottom: '14px' }}
              >
                :
              </motion.span>
            )}
          </div>
        ))}
      </div>

      {/* Inline CSS for tick animation */}
      <style>{`
        @keyframes countdown-tick {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.6; }
        }
      `}</style>
    </motion.div>
  );
}
