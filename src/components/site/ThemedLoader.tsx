'use client';

import React from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / ThemedLoader
// Per-theme loading animation. Each tone gets its own unique
// CSS @keyframes animation using the theme's accent symbol and
// colors. Zero JS animation, zero Framer Motion.
// ─────────────────────────────────────────────────────────────

interface ThemedLoaderProps {
  theme?: {
    accentSymbol?: string;
    accentColor?: string;
    backgroundColor?: string;
    fontHeading?: string;
    tone?: 'dreamy' | 'luxurious' | 'rustic' | 'cosmic' | 'intimate' | 'playful' | 'wild';
  };
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { symbol: '2rem', ring: 56, message: '0.75rem', gap: '0.75rem' },
  md: { symbol: '3.5rem', ring: 88, message: '0.9rem', gap: '1.25rem' },
  lg: { symbol: '5rem', ring: 120, message: '1.1rem', gap: '1.75rem' },
} as const;

/* ── Build keyframes per tone ────────────────────────────── */

function buildKeyframes(tone: string): string {
  const id = `pl-loader-${tone}`;

  switch (tone) {
    case 'dreamy':
    case 'intimate':
      return `
        @keyframes ${id}-symbol {
          0%, 100% { transform: scale(0.9); opacity: 0.4; }
          50%      { transform: scale(1.1); opacity: 1.0; }
        }
        @keyframes ${id}-glow {
          0%, 100% { opacity: 0.15; filter: blur(12px); transform: scale(0.85); }
          50%      { opacity: 0.35; filter: blur(18px); transform: scale(1.15); }
        }
        @keyframes ${id}-ring {
          0%, 100% { transform: scale(0.92); opacity: 0.08; }
          50%      { transform: scale(1.08); opacity: 0.18; }
        }
      `;

    case 'luxurious':
      return `
        @keyframes ${id}-symbol {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ${id}-shimmer {
          0%, 100% { opacity: 0.4; filter: brightness(1); }
          50%      { opacity: 1;   filter: brightness(1.3); }
        }
        @keyframes ${id}-ring {
          0%, 100% { transform: scale(0.95); opacity: 0.08; }
          50%      { transform: scale(1.05); opacity: 0.2; }
        }
      `;

    case 'rustic':
    case 'wild':
      return `
        @keyframes ${id}-symbol {
          0%, 100% { transform: translateX(-5px) rotate(-5deg); }
          50%      { transform: translateX(5px) rotate(5deg); }
        }
        @keyframes ${id}-ring {
          0%, 100% { transform: scale(0.94) rotate(-3deg); opacity: 0.08; }
          50%      { transform: scale(1.06) rotate(3deg); opacity: 0.18; }
        }
      `;

    case 'cosmic':
      return `
        @keyframes ${id}-symbol {
          0%, 100% { transform: scale(0.7); opacity: 0.3; }
          50%      { transform: scale(1.2); opacity: 1.0; }
        }
        @keyframes ${id}-ring {
          0%, 100% { transform: scale(0.85); opacity: 0.06; }
          50%      { transform: scale(1.15); opacity: 0.2; }
        }
        @keyframes ${id}-dot1 {
          0%   { transform: translate(0, -20px) scale(0); opacity: 0; }
          50%  { transform: translate(14px, -14px) scale(1); opacity: 0.8; }
          100% { transform: translate(20px, 0) scale(0); opacity: 0; }
        }
        @keyframes ${id}-dot2 {
          0%   { transform: translate(0, 20px) scale(0); opacity: 0; }
          50%  { transform: translate(-14px, 14px) scale(1); opacity: 0.7; }
          100% { transform: translate(-20px, 0) scale(0); opacity: 0; }
        }
        @keyframes ${id}-dot3 {
          0%   { transform: translate(20px, 0) scale(0); opacity: 0; }
          50%  { transform: translate(14px, 14px) scale(1); opacity: 0.6; }
          100% { transform: translate(0, 20px) scale(0); opacity: 0; }
        }
        @keyframes ${id}-dot4 {
          0%   { transform: translate(-20px, 0) scale(0); opacity: 0; }
          50%  { transform: translate(-14px, -14px) scale(1); opacity: 0.7; }
          100% { transform: translate(0, -20px) scale(0); opacity: 0; }
        }
      `;

    case 'playful':
      return `
        @keyframes ${id}-symbol {
          0%, 100% { transform: translateY(0)    scaleX(1)   scaleY(1);   }
          25%      { transform: translateY(-15px) scaleX(0.9) scaleY(1.1); }
          50%      { transform: translateY(0)     scaleX(1.1) scaleY(0.9); }
          75%      { transform: translateY(-8px)  scaleX(0.95) scaleY(1.05); }
        }
        @keyframes ${id}-ring {
          0%, 100% { transform: scale(1);    opacity: 0.1; }
          25%      { transform: scale(1.08); opacity: 0.18; }
          50%      { transform: scale(0.95); opacity: 0.12; }
          75%      { transform: scale(1.04); opacity: 0.15; }
        }
      `;

    default:
      // fallback — gentle pulse
      return `
        @keyframes pl-loader-default-symbol {
          0%, 100% { transform: scale(0.9); opacity: 0.5; }
          50%      { transform: scale(1.1); opacity: 1.0; }
        }
        @keyframes pl-loader-default-ring {
          0%, 100% { transform: scale(0.92); opacity: 0.08; }
          50%      { transform: scale(1.08); opacity: 0.18; }
        }
      `;
  }
}

/* ── Timing per tone ─────────────────────────────────────── */

function animationTiming(tone: string): { symbol: string; ring: string } {
  const id = `pl-loader-${tone}`;

  switch (tone) {
    case 'dreamy':
    case 'intimate':
      return {
        symbol: `${id}-symbol 2s ease-in-out infinite`,
        ring: `${id}-ring 2s ease-in-out infinite`,
      };
    case 'luxurious':
      return {
        symbol: `${id}-symbol 3s linear infinite`,
        ring: `${id}-ring 3s ease-in-out infinite`,
      };
    case 'rustic':
    case 'wild':
      return {
        symbol: `${id}-symbol 2.5s ease-in-out infinite`,
        ring: `${id}-ring 2.5s ease-in-out infinite`,
      };
    case 'cosmic':
      return {
        symbol: `${id}-symbol 1.5s ease-in-out infinite`,
        ring: `${id}-ring 1.5s ease-in-out infinite`,
      };
    case 'playful':
      return {
        symbol: `${id}-symbol 1.8s ease-in-out infinite`,
        ring: `${id}-ring 1.8s ease-in-out infinite`,
      };
    default:
      return {
        symbol: `pl-loader-default-symbol 2s ease-in-out infinite`,
        ring: `pl-loader-default-ring 2s ease-in-out infinite`,
      };
  }
}

/* ── Component ───────────────────────────────────────────── */

export function ThemedLoader({
  theme,
  message = 'Loading your site\u2026',
  size = 'md',
}: ThemedLoaderProps) {
  const accentSymbol = theme?.accentSymbol || '\u2726';
  const accentColor = theme?.accentColor || '#5C6B3F';
  const backgroundColor = theme?.backgroundColor || '#FAF8F4';
  const fontHeading = theme?.fontHeading || 'Cormorant Garamond, serif';
  const tone = theme?.tone || 'dreamy';

  const dims = SIZE_MAP[size];
  const keyframes = buildKeyframes(tone);
  const timing = animationTiming(tone);
  const toneId = `pl-loader-${tone}`;

  const isCosmic = tone === 'cosmic';
  const isLuxurious = tone === 'luxurious';
  const isDreamyLike = tone === 'dreamy' || tone === 'intimate';

  return (
    <div
      role="status"
      aria-label={message}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: backgroundColor,
        zIndex: 9999,
      }}
    >
      {/* Scoped keyframes */}
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />

      {/* Symbol + ring container */}
      <div
        style={{
          position: 'relative',
          width: `${dims.ring}px`,
          height: `${dims.ring}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pulsing ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${accentColor}`,
            opacity: 0.15,
            animation: timing.ring,
          }}
        />

        {/* Soft glow for dreamy / intimate */}
        {isDreamyLike && (
          <div
            style={{
              position: 'absolute',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background: accentColor,
              opacity: 0.15,
              filter: 'blur(14px)',
              animation: `${toneId}-glow 2s ease-in-out infinite`,
            }}
          />
        )}

        {/* Shimmer overlay for luxurious */}
        {isLuxurious && (
          <span
            style={{
              position: 'absolute',
              fontSize: dims.symbol,
              color: accentColor,
              animation: `${toneId}-shimmer 3s ease-in-out infinite`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            aria-hidden="true"
          >
            {accentSymbol}
          </span>
        )}

        {/* Main symbol */}
        <span
          style={{
            fontSize: dims.symbol,
            color: accentColor,
            lineHeight: 1,
            animation: timing.symbol,
            userSelect: 'none',
            position: 'relative',
            zIndex: 1,
          }}
          aria-hidden="true"
        >
          {accentSymbol}
        </span>

        {/* Cosmic tiny dots */}
        {isCosmic && (
          <>
            <span
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: accentColor,
                animation: `${toneId}-dot1 1.5s ease-in-out infinite`,
              }}
              aria-hidden="true"
            />
            <span
              style={{
                position: 'absolute',
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: accentColor,
                animation: `${toneId}-dot2 1.5s ease-in-out 0.4s infinite`,
              }}
              aria-hidden="true"
            />
            <span
              style={{
                position: 'absolute',
                width: 3.5,
                height: 3.5,
                borderRadius: '50%',
                background: accentColor,
                animation: `${toneId}-dot3 1.5s ease-in-out 0.8s infinite`,
              }}
              aria-hidden="true"
            />
            <span
              style={{
                position: 'absolute',
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: accentColor,
                animation: `${toneId}-dot4 1.5s ease-in-out 1.2s infinite`,
              }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* Message text */}
      {message && (
        <p
          style={{
            marginTop: dims.gap,
            fontFamily: fontHeading,
            fontSize: dims.message,
            color: accentColor,
            opacity: 0.7,
            letterSpacing: '0.04em',
            fontWeight: 400,
            textAlign: 'center',
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
