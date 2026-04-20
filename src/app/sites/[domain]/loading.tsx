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
        zIndex: 9999,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pl-default-symbol {
              0%, 100% { transform: scale(0.9); opacity: 0.4; }
              50%      { transform: scale(1.1); opacity: 1.0; }
            }
            @keyframes pl-default-ring {
              0%, 100% { transform: scale(0.92); opacity: 0.08; }
              50%      { transform: scale(1.08); opacity: 0.18; }
            }
            @keyframes pl-default-glow {
              0%, 100% { opacity: 0.12; filter: blur(12px); transform: scale(0.85); }
              50%      { opacity: 0.3; filter: blur(18px); transform: scale(1.15); }
            }
          `,
        }}
      />

      {/* Symbol + ring container */}
      <div
        style={{
          position: 'relative',
          width: 88,
          height: 88,
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
            border: '2px solid #5C6B3F',
            opacity: 0.15,
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
            background: '#5C6B3F',
            opacity: 0.15,
            filter: 'blur(14px)',
            animation: 'pl-default-glow 2s ease-in-out infinite',
          }}
        />

        {/* Accent symbol */}
        <span
          style={{
            fontSize: '3.5rem',
            color: '#5C6B3F',
            lineHeight: 1,
            animation: 'pl-default-symbol 2s ease-in-out infinite',
            userSelect: 'none',
            position: 'relative',
            zIndex: 1,
          }}
          aria-hidden="true"
        >
          {'\u2726'}
        </span>
      </div>

      {/* Message */}
      <p
        style={{
          marginTop: '1.25rem',
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '0.9rem',
          color: '#5C6B3F',
          opacity: 0.7,
          letterSpacing: '0.04em',
          fontWeight: 400,
          textAlign: 'center',
        }}
      >
        Loading your site&hellip;
      </p>
    </div>
  );
}
