'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/countdown-widget.tsx
// Animated countdown to the wedding day — appears on the hero
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
  const then = new Date(target).getTime();
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

  const textColor = onPhoto ? 'rgba(255,255,255,0.95)' : 'var(--eg-fg)';
  const mutedColor = onPhoto ? 'rgba(255,255,255,0.5)' : 'var(--eg-muted)';
  const borderColor = onPhoto ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const bgColor = onPhoto ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  const segments = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Sec' },
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
        gap: '1rem',
        marginTop: '2.5rem',
      }}
    >
      <div style={{
        fontSize: '0.6rem',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        color: mutedColor,
        fontWeight: 700,
      }}>
        Counting Down
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '0.6rem',
              padding: '0.6rem 0.9rem',
              minWidth: '52px',
            }}>
              <motion.span
                key={seg.value}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  color: textColor,
                  lineHeight: 1,
                  fontFamily: 'var(--eg-font-body)',
                  // monospace-style number to prevent layout shift
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(seg.value).padStart(2, '0')}
              </motion.span>
              <span style={{
                fontSize: '0.55rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: mutedColor,
                marginTop: '0.25rem',
                fontWeight: 700,
              }}>
                {seg.label}
              </span>
            </div>
            {/* Colon separator (not after last) */}
            {i < 3 && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ color: mutedColor, fontSize: '1.2rem', fontWeight: 300, marginBottom: '14px' }}
              >
                :
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
