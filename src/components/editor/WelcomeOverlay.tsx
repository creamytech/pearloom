'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WelcomeOverlay.tsx — "Your site is ready" screen
// Warm glass entrance with cinematic reveal
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  siteName?: string;
}

export function WelcomeOverlay({ onDismiss, siteName }: WelcomeOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', overflow: 'hidden',
      }}
    >
      {/* Warm gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)',
      }} />

      {/* Soft radial glows */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 30% 40%, rgba(255,240,220,0.5) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 70% 60%, rgba(210,190,170,0.4) 0%, transparent 50%)
        `,
      }} />

      {/* Noise texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }} />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0',
          padding: 'clamp(2.5rem, 6vw, 4rem) clamp(2rem, 5vw, 5rem)',
          borderRadius: '32px',
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(40px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 24px 80px rgba(43,30,20,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
          maxWidth: '480px',
          width: '90%',
        } as React.CSSProperties}
      >
        {/* Decorative accent */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '48px' }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '2px', background: 'var(--pl-olive)', borderRadius: '2px', marginBottom: '2rem' }}
        />

        {/* Accent symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: '1.8rem', color: 'var(--pl-olive)', opacity: 0.6,
            marginBottom: '1.5rem',
          }}
        >
          ✦
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            fontWeight: 400, fontStyle: 'italic',
            color: 'var(--pl-ink-soft)',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            margin: '0 0 0.75rem',
            lineHeight: 1.15,
          }}
        >
          Your site is ready
        </motion.h1>

        {/* Site name */}
        {siteName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            style={{
              fontSize: '0.92rem', fontWeight: 600,
              color: 'var(--pl-olive-deep)',
              marginBottom: '0.5rem',
              letterSpacing: '0.02em',
            }}
          >
            {siteName}
          </motion.p>
        )}

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: '0.88rem',
            color: 'var(--pl-muted)',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '320px',
            margin: '0 0 2rem',
          }}
        >
          Double-click any text to edit it. Drag sections to rearrange. Click anywhere to begin.
        </motion.p>

        {/* CTA hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 1] }}
          transition={{ duration: 2, delay: 1.8, repeat: Infinity, repeatDelay: 3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 20px', borderRadius: '100px',
            background: 'rgba(163,177,138,0.1)',
            border: '1px solid rgba(163,177,138,0.2)',
            color: 'var(--pl-olive-deep)',
            fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          Click anywhere to start editing
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
