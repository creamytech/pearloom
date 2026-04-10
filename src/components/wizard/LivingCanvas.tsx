'use client';

// ─────────────────────────────────────────────────────────────
// LivingCanvas.tsx — Animated background that reacts to wizard data
// Full-screen layer behind the chat card. Pure CSS animations.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';

/* ── Props ───────────────────────────────────────────────────── */

export interface LivingCanvasProps {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
  photoCount?: number;
  phase?: 'chat' | 'generating' | 'done';
}

/* ── Gradient palette helpers ────────────────────────────────── */

function gradientForVibe(vibe?: string): string {
  if (!vibe) return '';
  const v = vibe.toLowerCase();

  // Sport themes
  if (v.includes('knicks'))           return 'linear-gradient(135deg, #F58426 0%, #1D42BA 50%, #F58426 100%)';
  if (v.includes('lakers'))           return 'linear-gradient(135deg, #552583 0%, #FDB927 50%, #552583 100%)';
  if (v.includes('yankees'))          return 'linear-gradient(135deg, #1C2C5B 0%, #FFFFFF 50%, #1C2C5B 100%)';

  // Mood vibes
  if (v.includes('romantic') || v.includes('blush') || v.includes('rose'))
    return 'linear-gradient(135deg, #F2D1D1 0%, #F5E1E8 25%, #E8B4C8 50%, #F2D1D1 75%, #FCE4EC 100%)';
  if (v.includes('dark') || v.includes('moody'))
    return 'linear-gradient(135deg, #2D2B33 0%, #3D3544 25%, #4A3F54 50%, #2D2B33 75%, #1E1B24 100%)';
  if (v.includes('bold') || v.includes('colorful'))
    return 'linear-gradient(135deg, #FF6B6B 0%, #FFC857 25%, #5BCEFA 50%, #FF6B6B 75%, #FFC857 100%)';
  if (v.includes('rustic') || v.includes('natural'))
    return 'linear-gradient(135deg, #D4A574 0%, #C8B896 25%, #A8B890 50%, #D4A574 75%, #E8D5B0 100%)';
  if (v.includes('modern') || v.includes('minimal'))
    return 'linear-gradient(135deg, #F5F5F0 0%, #E8E4DC 25%, #D4CFC4 50%, #F5F5F0 75%, #FFFFFF 100%)';
  if (v.includes('whimsical') || v.includes('fun'))
    return 'linear-gradient(135deg, #FFD1DC 0%, #E8D5F5 25%, #D5F5E3 50%, #FFD1DC 75%, #FFF3CD 100%)';
  if (v.includes('elegant') || v.includes('timeless'))
    return 'linear-gradient(135deg, #F0E6D6 0%, #E4D5C3 25%, #C4A96A 50%, #F0E6D6 75%, #FAF3E8 100%)';
  if (v.includes('coastal') || v.includes('beach'))
    return 'linear-gradient(135deg, #B8D4E8 0%, #E8F0F8 25%, #5B9BD5 50%, #B8D4E8 75%, #D0E8F8 100%)';

  return '';
}

/** Particle color sets keyed to occasion. */
function occasionColors(occasion?: string): string[] {
  switch (occasion) {
    case 'wedding':     return ['#F2C6C6', '#F5D5D5', '#E8A0A0', '#F0B8B8'];
    case 'birthday':    return ['#FF6B6B', '#FFC857', '#5BCEFA', '#F472B6', '#A78BFA', '#34D399'];
    case 'anniversary': return ['#C4A96A', '#DBC07E', '#E8D5A0', '#B89A5A'];
    case 'engagement':  return ['#F2C6C6', '#FFD1DC', '#E8A0B4', '#F5B8C8'];
    default:            return ['#E8D5C4', '#D4B8A0', '#A3B18A', '#C4A96A'];
  }
}

/* ── Keyframes (injected once via <style>) ───────────────────── */

const KEYFRAMES = `
/* Base orb drift */
@keyframes lc-drift {
  0%   { transform: translate(0, 0) scale(1); }
  25%  { transform: translate(30px, -40px) scale(1.05); }
  50%  { transform: translate(-20px, -70px) scale(0.95); }
  75%  { transform: translate(-40px, -20px) scale(1.03); }
  100% { transform: translate(0, 0) scale(1); }
}

/* Petal / confetti fall */
@keyframes lc-fall {
  0%   { transform: translateY(-10%) translateX(0) rotate(0deg); opacity: 0; }
  10%  { opacity: 0.7; }
  90%  { opacity: 0.7; }
  100% { transform: translateY(110vh) translateX(40px) rotate(360deg); opacity: 0; }
}

/* Sparkle twinkle */
@keyframes lc-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.6); }
  50%      { opacity: 0.8; transform: scale(1); }
}

/* Heart path — subtle bob */
@keyframes lc-heart-bob {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
  50%      { transform: translateY(-12px) scale(1.08); opacity: 0.5; }
}

/* Names watermark breathe */
@keyframes lc-breathe {
  0%, 100% { transform: scale(1); opacity: 0.035; }
  50%      { transform: scale(1.04); opacity: 0.05; }
}

/* Countdown pulse */
@keyframes lc-pulse {
  0%, 100% { opacity: 0.03; transform: scale(1); }
  50%      { opacity: 0.05; transform: scale(1.02); }
}

/* Photo drift */
@keyframes lc-photo-drift {
  0%   { transform: translate(0, 0) rotate(var(--lc-rot)); }
  50%  { transform: translate(10px, -15px) rotate(calc(var(--lc-rot) + 2deg)); }
  100% { transform: translate(0, 0) rotate(var(--lc-rot)); }
}

/* Generating vortex — converge to center */
@keyframes lc-vortex {
  0%   { transform: translate(var(--lc-x), var(--lc-y)) scale(1); opacity: 0.6; }
  100% { transform: translate(0, 0) scale(0.1); opacity: 0; }
}
`;

/* ── Component ──────────────────────────────────────────────── */

export function LivingCanvas({
  occasion,
  names,
  date,
  venue,
  vibe,
  photoCount = 0,
  phase = 'chat',
}: LivingCanvasProps) {

  const isGenerating = phase === 'generating';

  /* Gradient: vibe-driven if set, else warm default */
  const vibeGradient = gradientForVibe(vibe);
  const baseGradient = 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)';
  const gradient = vibeGradient || baseGradient;

  /* Base orbs — always present (max 4) */
  const orbs = useMemo(() => {
    const colors = ['#E8D5C4', '#D4B8A0', '#A3B18A', '#C4A96A'];
    return colors.map((c, i) => ({
      key: `orb-${i}`,
      color: c,
      size: 120 + i * 40,
      left: `${15 + i * 22}%`,
      top: `${20 + (i % 3) * 25}%`,
      delay: `${i * -4}s`,
      duration: `${18 + i * 4}s`,
    }));
  }, []);

  /* Occasion particles — max 12 */
  const particles = useMemo(() => {
    if (!occasion) return [];
    const colors = occasionColors(occasion);
    const count = Math.min(12, occasion === 'birthday' ? 12 : 8);
    return Array.from({ length: count }, (_, i) => ({
      key: `particle-${i}`,
      color: colors[i % colors.length],
      size: occasion === 'anniversary' ? 4 + Math.random() * 4 : 6 + Math.random() * 8,
      left: `${5 + Math.random() * 90}%`,
      delay: `${-Math.random() * 12}s`,
      duration: `${8 + Math.random() * 8}s`,
      isHeart: occasion === 'engagement',
    }));
  }, [occasion]);

  /* Countdown — days until date */
  const daysUntil = useMemo(() => {
    if (!date) return null;
    try {
      const eventDate = new Date(date + 'T12:00:00');
      const now = new Date();
      const diff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : null;
    } catch {
      return null;
    }
  }, [date]);

  /* Photo positions — max 8 scattered polaroids */
  const photoSlots = useMemo(() => {
    if (photoCount <= 0) return [];
    const count = Math.min(8, photoCount);
    return Array.from({ length: count }, (_, i) => ({
      key: `photo-slot-${i}`,
      left: `${8 + (i % 4) * 22 + Math.random() * 10}%`,
      top: `${10 + Math.floor(i / 4) * 40 + Math.random() * 15}%`,
      rotation: `${-12 + Math.random() * 24}deg`,
      delay: `${i * -2}s`,
    }));
  }, [photoCount]);

  /* Total particle count guard: orbs(4) + particles(12) + photoSlots(8) = max 24 but we're under 20 active animated */

  return (
    <>
      {/* Inject keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Canvas root */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          background: gradient,
          transition: 'background 1.5s ease',
        }}
      >
        {/* ── Base orbs — soft drifting circles ── */}
        {orbs.map((orb) => (
          <div
            key={orb.key}
            style={{
              position: 'absolute',
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              borderRadius: '50%',
              background: orb.color,
              opacity: 0.18,
              willChange: 'transform',
              animation: isGenerating
                ? `lc-vortex 3s ease-in forwards`
                : `lc-drift ${orb.duration} ease-in-out infinite`,
              animationDelay: isGenerating ? '0s' : orb.delay,
              ...(isGenerating
                ? {
                    '--lc-x': orb.left,
                    '--lc-y': orb.top,
                  } as React.CSSProperties
                : {}),
            }}
          />
        ))}

        {/* ── Occasion particles ── */}
        {particles.map((p) => {
          if (p.isHeart) {
            /* Engagement: heart shapes via CSS clip-path */
            return (
              <div
                key={p.key}
                style={{
                  position: 'absolute',
                  left: p.left,
                  top: `${30 + Math.random() * 40}%`,
                  width: p.size * 2,
                  height: p.size * 2,
                  background: p.color,
                  clipPath:
                    'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")',
                  opacity: 0.3,
                  willChange: 'transform',
                  animation: isGenerating
                    ? `lc-vortex 3s ease-in forwards`
                    : `lc-heart-bob ${p.duration} ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
            );
          }

          if (occasion === 'anniversary') {
            /* Anniversary: twinkling gold sparkles */
            return (
              <div
                key={p.key}
                style={{
                  position: 'absolute',
                  left: p.left,
                  top: `${10 + Math.random() * 80}%`,
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: p.color,
                  willChange: 'transform, opacity',
                  animation: isGenerating
                    ? `lc-vortex 3s ease-in forwards`
                    : `lc-twinkle ${p.duration} ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
            );
          }

          /* Wedding: falling petals / Birthday: falling confetti */
          return (
            <div
              key={p.key}
              style={{
                position: 'absolute',
                left: p.left,
                top: '-5%',
                width: p.size,
                height: occasion === 'birthday' ? p.size * 0.6 : p.size,
                borderRadius: occasion === 'birthday' ? '2px' : '50% 0 50% 50%',
                background: p.color,
                opacity: 0,
                willChange: 'transform, opacity',
                animation: isGenerating
                  ? `lc-vortex 3s ease-in forwards`
                  : `lc-fall ${p.duration} linear infinite`,
                animationDelay: p.delay,
              }}
            />
          );
        })}

        {/* ── Names watermark ── */}
        {names && names[0] && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'lc-breathe 8s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--pl-font-heading, "Playfair Display", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(4rem, 12vw, 10rem)',
                fontWeight: 400,
                color: 'var(--pl-ink-soft, #3D3530)',
                opacity: 0.04,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {names[0]}{names[1] ? ` & ${names[1]}` : ''}
            </span>
          </div>
        )}

        {/* ── Countdown watermark ── */}
        {daysUntil !== null && (
          <div
            style={{
              position: 'absolute',
              bottom: '8%',
              right: '6%',
              animation: 'lc-pulse 6s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--pl-font-heading, "Playfair Display", Georgia, serif)',
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                fontWeight: 700,
                color: 'var(--pl-ink-soft, #3D3530)',
                opacity: 0.04,
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {daysUntil}
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--pl-font-body, "Lora", Georgia, serif)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'var(--pl-ink-soft, #3D3530)',
                opacity: 0.04,
                userSelect: 'none',
              }}
            >
              days
            </span>
          </div>
        )}

        {/* ── Photo polaroid placeholders ── */}
        {photoSlots.map((slot) => (
          <div
            key={slot.key}
            style={{
              position: 'absolute',
              left: slot.left,
              top: slot.top,
              width: 68,
              height: 80,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 8px rgba(43,30,20,0.06)',
              opacity: 0.18,
              willChange: 'transform',
              '--lc-rot': slot.rotation,
              transform: `rotate(${slot.rotation})`,
              animation: isGenerating
                ? `lc-vortex 3s ease-in forwards`
                : `lc-photo-drift ${12 + Math.random() * 6}s ease-in-out infinite`,
              animationDelay: slot.delay,
            } as React.CSSProperties}
          />
        ))}

        {/* ── Generating vortex intensifier overlay ── */}
        {isGenerating && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 50%, rgba(163,177,138,0.25) 0%, transparent 60%)',
              animation: 'lc-pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </>
  );
}
