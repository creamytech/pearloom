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

function getAmbientGlow(days: number | null): { bg: string; glow: string; textAccent: string } {
  if (days === null || days === 0) return {
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(255,248,220,0.95) 0%, rgba(255,240,180,0.7) 40%, transparent 70%)',
    glow: 'rgba(255,240,140,0.6)',
    textAccent: '#B8860B',
  };
  if (days <= 7) return {
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(255,230,100,0.55) 0%, rgba(230,190,80,0.3) 50%, transparent 75%)',
    glow: 'rgba(220,180,60,0.4)',
    textAccent: '#C4A020',
  };
  if (days <= 30) return {
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(210,165,80,0.45) 0%, rgba(190,145,60,0.25) 50%, transparent 75%)',
    glow: 'rgba(196,169,106,0.35)',
    textAccent: '#C4A96A',
  };
  if (days <= 90) return {
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(180,140,100,0.38) 0%, rgba(160,120,80,0.2) 50%, transparent 75%)',
    glow: 'rgba(163,120,80,0.3)',
    textAccent: '#A3784F',
  };
  if (days <= 180) return {
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(130,130,180,0.32) 0%, rgba(100,100,160,0.18) 50%, transparent 75%)',
    glow: 'rgba(110,100,160,0.25)',
    textAccent: '#7B7AB8',
  };
  // far away (> 180 days)
  return {
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(80,100,150,0.28) 0%, rgba(60,80,130,0.15) 50%, transparent 75%)',
    glow: 'rgba(70,90,140,0.2)',
    textAccent: '#6070A0',
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

  const daysLeft = timeLeft ? timeLeft.days : 0;
  const ambient = getAmbientGlow(timeLeft ? daysLeft : null);

  if (!timeLeft) {
    return (
      <div style={{ position: 'relative' }}>
        {!onPhoto && (
          <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 2 }}
            style={{
              position: 'absolute',
              inset: '-40px',
              background: ambient.bg,
              pointerEvents: 'none',
              borderRadius: '50%',
              filter: 'blur(30px)',
              zIndex: 0,
            }}
          />
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2 }}
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            color: onPhoto ? 'rgba(255,255,255,0.85)' : ambient.textAccent,
            fontSize: '1.4rem',
            fontStyle: 'italic',
            fontFamily: 'var(--eg-font-heading)',
            fontWeight: 400,
            letterSpacing: '0.04em',
            marginTop: '2rem',
          }}
        >
          Today is the day.
        </motion.div>
      </div>
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
    <div style={{ position: 'relative' }}>
      {/* Ambient light layer — behind all content */}
      {!onPhoto && (
        <motion.div
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 2 }}
          style={{
            position: 'absolute',
            inset: '-40px',
            background: ambient.bg,
            pointerEvents: 'none',
            borderRadius: '50%',
            filter: 'blur(30px)',
            zIndex: 0,
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2 }}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          marginTop: '2.75rem',
        }}
      >
        {/* Section icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <CalendarHeartIcon size={14} color={onPhoto ? 'rgba(255,255,255,0.6)' : ambient.textAccent} />
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

        {/* Floating orb — pulses once per second in sync with the seconds tick */}
        {!onPhoto && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: ambient.glow,
              filter: 'blur(12px)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Inline CSS for tick animation */}
        <style>{`
          @keyframes countdown-tick {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0.6; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
