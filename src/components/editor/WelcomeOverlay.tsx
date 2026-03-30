'use client';

import { motion } from 'framer-motion';
import { PearloomMark } from '@/components/brand/PearloomMark';

interface WelcomeOverlayProps {
  onDismiss: () => void;
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
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <PearloomMark size={80} color="#A3B18A" color2="#D6C6A8" animated />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
        transition={{ duration: 0.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--eg-font-body, Lora, Georgia, serif)',
          fontSize: '1rem',
          color: 'rgba(245,241,232,0.55)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        Let&apos;s bring it to life.
      </motion.div>
    </motion.div>
  );
}
