'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/coming-soon.tsx
// Feature-flagged "coming soon" / engagement placeholder
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import type { ComingSoonConfig } from '@/types';

interface ComingSoonProps {
  config: ComingSoonConfig;
}

export function ComingSoon({ config }: ComingSoonProps) {
  if (!config.enabled) return null;

  return (
    <section className="soon-section">
      {/* Ambient radial glow */}
      <div className="soon-glow" />

      <motion.div
        className="soon-content"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        viewport={{ once: true, margin: '-80px' }}
      >
        <motion.div
          className="soon-icon"
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {config.passwordProtected ? (
            <Lock size={48} strokeWidth={1} />
          ) : (
            <Sparkles size={48} strokeWidth={1} />
          )}
        </motion.div>

        <h2 className="soon-title">{config.title}</h2>
        <p className="soon-subtitle">{config.subtitle}</p>

        {config.revealDate && (
          <p className="soon-date">
            {new Date(config.revealDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </motion.div>
    </section>
  );
}
