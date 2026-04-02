'use client';

import { motion } from 'framer-motion';
import { PearloomMark } from '@/components/brand/PearloomMark';

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
            background: 'rgba(163,177,138,0.07)',
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
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1C1916',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1.5rem', cursor: 'pointer',
      }}
    >
      <WeaveFlash />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <PearloomMark size={80} color="#A3B18A" color2="#D6C6A8" animated />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--eg-font-heading, Playfair Display, Georgia, serif)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontStyle: 'italic',
          fontWeight: 400,
          color: '#F5F1E8',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Your site is ready.
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--eg-font-body, Lora, Georgia, serif)',
          fontSize: '1rem',
          color: 'rgba(245,241,232,0.55)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        Click anywhere on your site to edit it.
      </motion.div>
    </motion.div>
  );
}
