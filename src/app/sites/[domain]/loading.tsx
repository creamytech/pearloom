import React from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / sites/[domain]/loading.tsx
// Next.js loading state shown during the server component's
// data fetch. Uses default Pearloom branding (cream + olive)
// since we don't have the theme data yet at this stage.
// ─────────────────────────────────────────────────────────────

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading your site"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAF8F4',
        zIndex: 'var(--z-max)',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pl-default-symbol {
              0%, 100% { transform: scale(0.9); opacity: 0.5; }
              50%      { transform: scale(1.1); opacity: 1.0; }
            }
            @keyframes pl-default-ring {
              0%, 100% { transform: scale(0.92); opacity: 0.12; }
              50%      { transform: scale(1.08); opacity: 0.25; }
            }
            @keyframes pl-default-glow {
              0%, 100% { opacity: 0.10; filter: blur(12px); transform: scale(0.85); }
              50%      { opacity: 0.22; filter: blur(18px); transform: scale(1.15); }
            }
          `,
        }}
      />

      {/* Eyebrow above the mark */}
      <div
        className="eyebrow"
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#C6703D',
          marginBottom: 24,
        }}
      >
        Weaving your story
      </div>

      {/* Symbol + ring container \u2014 peach accent matches the prototype */}
      <div
        style={{
          position: 'relative',
          width: 96,
          height: 96,
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
            border: '1.5px solid #C6703D',
            animation: 'pl-default-ring 2s ease-in-out infinite',
          }}
        />

        {/* Soft glow */}
        <div
          style={{
            position: 'absolute',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: '#C6703D',
            filter: 'blur(14px)',
            animation: 'pl-default-glow 2s ease-in-out infinite',
          }}
        />

        {/* Display-italic & \u2014 the prototype's "and" letterform
            instead of a generic sparkle. */}
        <span
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '3.4rem',
            color: '#C6703D',
            lineHeight: 1,
            animation: 'pl-default-symbol 2s ease-in-out infinite',
            userSelect: 'none',
            position: 'relative',
            zIndex: 1,
          }}
          aria-hidden="true"
        >
          and
        </span>
      </div>

      {/* Gold hairline */}
      <div
        aria-hidden
        style={{
          width: 100,
          height: 1,
          margin: '24px auto 14px',
          background: 'linear-gradient(90deg, transparent, #C19A4B 50%, transparent)',
          opacity: 0.55,
        }}
      />

      {/* Message */}
      <p
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontStyle: 'italic',
          fontSize: 15,
          color: '#3A332C',
          letterSpacing: '-0.005em',
          fontWeight: 400,
          textAlign: 'center',
        }}
      >
        Loading your site&hellip;
      </p>
    </div>
  );
}
