'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PearloomMark } from '@/components/brand/PearloomMark';

// ── Spring presets ────────────────────────────────────────────
const SPRING_CARD = { type: 'spring' as const, stiffness: 320, damping: 22 };
const SPRING_TEXT = { type: 'spring' as const, stiffness: 360, damping: 26 };

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

function WeaveFlash() {
  const strips = Array.from({ length: 12 }, (_, i) => i);
  return (
    <>
      {strips.map((i) => (
        <motion.div
          key={i}
          initial={{ x: i % 2 === 1 ? '-101%' : '101%', opacity: 1 }}
          animate={{ x: '0%', opacity: [1, 1, 0] }}
          transition={{
            duration: 0.35,
            delay: i * 0.025,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(i / 12) * 100}%`,
            height: `${(1 / 12) * 100}%`,
            background: 'var(--pl-olive-8)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1C1916',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1.5rem', cursor: 'pointer',
      }}
    >
      {/* Warm blur backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, var(--pl-olive-5) 0%, transparent 70%)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />

      <WeaveFlash />

      {/* Logo — spring scale with overshoot */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ ...SPRING_CARD, delay: 0.7 }}
      >
        <PearloomMark size={80} color="#A3B18A" color2="#D6C6A8" animated />
      </motion.div>

      {/* Title — stagger with spring */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ ...SPRING_TEXT, delay: 1.1 }}
        style={{
          fontFamily: 'var(--pl-font-heading, Playfair Display, Georgia, serif)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontStyle: 'italic',
          fontWeight: 400,
          color: 'var(--pl-ink-soft)',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Your site is ready.
      </motion.div>

      {/* Subtitle — stagger with spring */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ ...SPRING_TEXT, delay: 1.45 }}
        style={{
          fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
          fontSize: '1rem',
          color: 'var(--pl-muted)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        Click anywhere on your site to edit it.
      </motion.div>

      {/* Subtle pulsing hint at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2.5, delay: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '40px',
          fontSize: 'var(--pl-text-sm)', fontWeight: 600,
          color: 'var(--pl-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Tap to begin
      </motion.div>
    </motion.div>
  );
}
