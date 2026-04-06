'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/CuratorAICard.tsx
// "Curator's Edge AI" launcher card with "LAUNCH AI" button
// Matches Stitch "Curator's Edge AI" card from Botanical Collection
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { BarChart2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CuratorAICardProps {
  onLaunch?: () => void;
}

export function CuratorAICard({ onLaunch }: CuratorAICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      style={{
        borderRadius: 'var(--pl-radius-xl)',
        background: 'var(--pl-ink)',
        padding: '2rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '120px', height: '120px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(163,177,138,0.2) 0%, transparent 70%)',
        filter: 'blur(30px)',
      }} />

      {/* Icon */}
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '14px',
        background: 'rgba(163,177,138,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <BarChart2 size={22} color="var(--pl-olive)" />
      </div>

      {/* Content */}
      <h3 style={{
        fontSize: '1.2rem',
        fontFamily: 'var(--pl-font-heading)',
        fontWeight: 600,
        marginBottom: '8px',
      }}>
        Curator&rsquo;s Edge AI
      </h3>
      <p style={{
        fontSize: '0.85rem',
        color: 'rgba(245,241,232,0.6)',
        lineHeight: 1.6,
        marginBottom: '20px',
      }}>
        Advanced analysis for the discerning collector.
      </p>

      {/* Launch button */}
      <Button
        variant="accent"
        size="md"
        onClick={onLaunch}
        icon={<Sparkles size={14} />}
        className="w-full"
      >
        Launch AI
      </Button>
    </motion.div>
  );
}

// ── Active Curator floating badge ────────────────────────────
// Small floating indicator showing AI is actively processing

export function ActiveCuratorBadge({ active = false }: { active?: boolean }) {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 8 }}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 100,
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px',
        borderRadius: '100px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(43,30,20,0.1)',
      } as React.CSSProperties}
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles size={14} color="var(--pl-gold)" />
      </motion.div>
      <span style={{
        fontSize: '0.68rem', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--pl-olive-deep)',
      }}>
        Active Curator
      </span>
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--pl-olive)',
        }}
      />
    </motion.div>
  );
}
