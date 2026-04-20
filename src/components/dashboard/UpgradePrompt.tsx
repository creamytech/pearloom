'use client';
// src/components/dashboard/UpgradePrompt.tsx
// Shown to free-tier users who hit a limit.
import { useState } from 'react';
import { motion } from 'framer-motion';

interface UpgradePromptProps {
  feature: string;
  onDismiss?: () => void;
}

export function UpgradePrompt({ feature, onDismiss }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.5)',
        borderRadius: 'var(--pl-radius-xl)', padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ rotate: [0, 15, -10, 5, 0] }}
        transition={{ duration: 0.7, delay: 0.3 }}
        style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}
      >
        ✦
      </motion.div>
      <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--pl-font-heading)', fontStyle: 'italic', color: 'var(--pl-ink)' }}>Upgrade to Pro</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--pl-muted)', marginBottom: '1rem' }}>
        {feature} is a Pro feature. Upgrade for $12/month.
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <motion.button
          onClick={handleUpgrade}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.04, y: -1 }}
          whileTap={loading ? {} : { scale: 0.97 }}
          style={{
            padding: '0.6rem 1.5rem', borderRadius: 'var(--pl-radius-lg)',
            background: 'var(--pl-olive)', color: 'var(--pl-cream)',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          {loading ? 'Redirecting…' : 'Upgrade Now'}
        </motion.button>
        {onDismiss && (
          <motion.button
            onClick={onDismiss}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ padding: '0.6rem 1rem', borderRadius: 'var(--pl-radius-lg)', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--pl-ink)' } as React.CSSProperties}
          >
            Not now
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
