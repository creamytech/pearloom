'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/PostWeddingBanner.tsx
// Post-Wedding Memory Mode banner — shown in editor when wedding date has passed
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { parseLocalDate } from '@/lib/date';

const DISMISS_KEY = 'pl-memory-banner-dismissed';
const DISMISS_DAYS = 30;

interface PostWeddingBannerProps {
  manifest: StoryManifest;
  subdomain: string;
  onUpdate: (m: StoryManifest) => void;
}

export function PostWeddingBanner({ manifest, subdomain, onUpdate }: PostWeddingBannerProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed within 30 days
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = parseInt(raw, 10);
        if (Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
          setDismissed(true);
          return;
        }
      }
    } catch {
      // ignore
    }

    const dateStr = manifest.logistics?.date;
    if (!dateStr) return;

    const weddingDate = parseLocalDate(dateStr);
    const now = new Date();
    const isPast = weddingDate < now;
    const alreadyEnabled = !!manifest.features?.postWedding;

    setVisible(isPast && !alreadyEnabled);
  }, [manifest]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setDismissed(true);
    setVisible(false);
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.manifest) {
          onUpdate(data.manifest);
          setVisible(false);
        }
      }
    } catch (err) {
      console.error('[PostWeddingBanner] Activate error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (dismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          margin: '0.75rem 1rem 0',
          background: 'linear-gradient(135deg, rgba(24,24,27,0.06) 0%, rgba(24,24,27,0.06) 100%)',
          border: '1px solid rgba(24,24,27,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: '0.875rem', right: '0.875rem',
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#71717A',
            transition: 'color var(--pl-dur-fast)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#71717A'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#A1A1AA'; }}
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>

        {/* Icon */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'rgba(24,24,27,0.06)',
          border: '1px solid rgba(24,24,27,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sparkles size={20} color="#71717A" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{
            margin: '0 0 0.3rem',
            fontSize: '0.9rem', fontWeight: 700,
            color: '#18181B',
            fontFamily: 'var(--pl-font-heading, Georgia, serif)',
          }}>
            Your wedding day has passed
          </h3>
          <p style={{
            margin: 0,
            fontSize: '0.8rem', color: '#71717A', lineHeight: 1.5,
          }}>
            Transform your site into a permanent memory archive. The Loom will rewrite your story in past tense and highlight your most emotional moments.
          </p>
        </div>

        {/* CTA */}
        <motion.button
          onClick={handleActivate}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.03, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}
          whileTap={loading ? {} : { scale: 0.97 }}
          style={{
            padding: '0.7rem 1.4rem',
            background: loading
              ? 'rgba(24,24,27,0.15)'
              : 'linear-gradient(135deg, #71717A 0%, #6D597A 100%)',
            color: '#3F3F46',
            border: 'none',
            borderRadius: '0.625rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontFamily: 'var(--pl-font-body, Georgia, serif)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background var(--pl-dur-fast)',
          }}
        >
          {loading ? 'Rewriting your story...' : 'Activate Memory Mode'}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
