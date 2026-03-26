'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/coming-soon.tsx
// High-Fidelity Engagement Placeholder
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
    <section style={{
      position: 'relative',
      padding: '10rem 2rem',
      background: 'var(--eg-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Ambient radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, var(--eg-accent-light) 0%, transparent 70%)',
        opacity: 0.3,
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: '-100px' }}
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '600px',
          background: '#ffffff',
          borderRadius: '2rem',
          padding: '4rem 3rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.03)'
        }}
      >
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            color: 'var(--eg-accent)',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {config.passwordProtected ? (
            <Lock size={40} strokeWidth={1.5} />
          ) : (
            <Sparkles size={40} strokeWidth={1.5} />
          )}
        </motion.div>

        <h2 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          lineHeight: 1.1,
          marginBottom: '1rem',
          letterSpacing: '-0.02em',
        }}>
          {config.title}
        </h2>
        
        <p style={{
          fontFamily: 'var(--eg-font-body)',
          fontSize: '1.1rem',
          fontWeight: 300,
          color: 'var(--eg-muted)',
          lineHeight: 1.6,
          marginBottom: config.revealDate ? '2rem' : 0
        }}>
          {config.subtitle}
        </p>

        {config.revealDate && (
          <div style={{
            display: 'inline-flex',
            background: 'var(--eg-accent-light)',
            color: 'var(--eg-accent)',
            padding: '0.75rem 1.5rem',
            borderRadius: '2rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            {new Date(config.revealDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )}
      </motion.div>
    </section>
  );
}
