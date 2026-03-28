'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/WeddingDayBanner.tsx
// Shows a contextual banner around the wedding date:
//   • 7 days before  → countdown
//   • On the day     → live "Today's the day!" + CSS confetti
//   • 30 days after  → "Just married!" celebration
// ─────────────────────────────────────────────────────────────

import type { VibeSkin } from '@/lib/vibe-engine';

interface WeddingDayBannerProps {
  weddingDate: string;        // ISO date string e.g. "2026-09-14"
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
}

/** Parse an ISO date string as a local-midnight Date (no TZ shift). */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Return today at local midnight for clean day-level comparison. */
function todayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Difference in whole days: positive = future, negative = past. */
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// 20 confetti pieces with randomised colours, x positions and durations
const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF922B', '#CC5DE8', '#F06595', '#74C0FC'];
const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${(i * 5.2 + 1.5) % 100}%`,
  animationDuration: `${2.8 + (i % 5) * 0.4}s`,
  animationDelay: `${(i % 7) * 0.3}s`,
  size: i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 5,
  rotation: i % 2 === 0 ? 45 : 0,
}));

export function WeddingDayBanner({ weddingDate, coupleNames, vibeSkin }: WeddingDayBannerProps) {
  const wedding = parseLocalDate(weddingDate);
  const today = todayMidnight();
  const diff = dayDiff(wedding, today); // positive = days until wedding, negative = days since

  // Determine which message (if any) to show
  let message = '';
  let isToday = false;

  if (diff === 0) {
    isToday = true;
    message = "Today's the day! 🎉";
  } else if (diff > 0 && diff <= 7) {
    message = `${diff} day${diff === 1 ? '' : 's'} to go ✨`;
  } else if (diff < 0 && diff >= -30) {
    message = 'Just married! 💍';
  } else {
    return null; // Outside the window — render nothing
  }

  const { accent, foreground, background } = vibeSkin.palette;
  const { heading } = vibeSkin.fonts;

  return (
    <section
      style={{
        width: '100%',
        background: `linear-gradient(90deg, ${accent}dd 0%, ${accent}aa 50%, ${accent}dd 100%)`,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="Wedding day status banner"
    >
      {/* CSS-only confetti (only on the actual wedding day) */}
      {isToday && (
        <>
          <style>{`
            @keyframes confettiFall {
              0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              80%  { opacity: 0.9; }
              100% { transform: translateY(80px) rotate(360deg); opacity: 0; }
            }
          `}</style>
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              aria-hidden="true"
              style={{
                position: 'fixed',
                top: 0,
                left: p.left,
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.rotation === 45 ? 0 : '50%',
                transform: `rotate(${p.rotation}deg)`,
                pointerEvents: 'none',
                zIndex: 9999,
                animation: `confettiFall ${p.animationDuration} ${p.animationDelay} ease-in infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* Banner text */}
      <p
        style={{
          fontFamily: `"${heading}", serif`,
          fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
          fontWeight: 600,
          color: background,
          margin: 0,
          letterSpacing: '0.02em',
          textAlign: 'center',
          padding: '0 1rem',
          zIndex: 1,
          position: 'relative',
        }}
      >
        {coupleNames[0]} &amp; {coupleNames[1]} — {message}
      </p>
    </section>
  );
}
