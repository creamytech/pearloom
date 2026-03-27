'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/rsvp-live-counter.tsx
// Live animated RSVP headcount — shows real-time attendance.
// "X people are coming to celebrate with you" strip.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface RsvpLiveCounterProps {
  siteId: string;
  coupleNames: [string, string];
}

interface Stats {
  attending: number;
  total: number;
  pending: number;
}

export function RsvpLiveCounter({ siteId, coupleNames }: RsvpLiveCounterProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`/api/rsvp-stats?siteId=${siteId}`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, [siteId]);

  if (!stats || stats.attending === 0) return null;

  const pct = stats.total > 0 ? Math.round((stats.attending / stats.total) * 100) : 0;
  const heads = stats.attending; // simplified — real includes +1 count

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      style={{
        maxWidth: '600px', margin: '0 auto 4rem',
        background: '#fff', borderRadius: '1.25rem', padding: '1.75rem 2rem',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18} color="#10b981" />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--eg-fg)' }}>
            <motion.span
              key={heads}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              style={{ color: '#10b981' }}
            >
              {heads} people
            </motion.span>{' '}
            are coming to celebrate with {coupleNames[0]} & {coupleNames[1]}!
          </div>
          {stats.pending > 0 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--eg-muted)', marginTop: '0.2rem' }}>
              {stats.pending} still deciding
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'rgba(0,0,0,0.06)', borderRadius: '100px',
        height: '6px', overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{
            height: '100%', borderRadius: '100px',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--eg-muted)' }}>{stats.attending} confirmed</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--eg-muted)' }}>{pct}% responded</span>
      </div>
    </motion.div>
  );
}
