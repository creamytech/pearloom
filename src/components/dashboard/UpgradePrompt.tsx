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
        background: 'linear-gradient(135deg, rgba(163,177,138,0.08), rgba(163,177,138,0.15))',
        border: '1px solid rgba(163,177,138,0.3)',
        borderRadius: '1rem', padding: '1.5rem',
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
      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Upgrade to Pro</div>
      <div style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1rem' }}>
        {feature} is a Pro feature. Upgrade for $12/month.
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <motion.button
          onClick={handleUpgrade}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.04, y: -1 }}
          whileTap={loading ? {} : { scale: 0.97 }}
          style={{
            padding: '0.6rem 1.5rem', borderRadius: '0.75rem',
            background: 'var(--pl-olive-deep)', color: '#fff',
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
            style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Not now
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
