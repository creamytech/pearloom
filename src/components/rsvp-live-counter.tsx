'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/rsvp-live-counter.tsx
// Live animated RSVP headcount — shows real-time attendance.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Leaf, HelpCircle } from 'lucide-react';

interface RsvpLiveCounterProps {
  siteId: string;
  coupleNames: [string, string];
}

interface Stats {
  attending: number;
  notAttending?: number;
  total: number;
  pending: number;
}

export function RsvpLiveCounter({ siteId, coupleNames }: RsvpLiveCounterProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/rsvp-stats?siteId=${siteId}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, [siteId]);

  const pct = stats && stats.total > 0 ? Math.round((stats.attending / stats.total) * 100) : 0;
  const notAttending = stats?.notAttending ?? 0;
  const hasResponses = stats && stats.total > 0;
  const noAttendees = loaded && (!stats || stats.attending === 0);

  // Show the component always once loaded, including zero state
  if (!loaded) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      style={{
        maxWidth: '600px', margin: '0 auto 4rem',
        background: noAttendees
          ? 'linear-gradient(135deg, rgba(var(--pl-gold),0.04), rgba(var(--pl-gold),0.08))'
          : '#F5F1E8',
        borderRadius: '1.5rem',
        padding: '2rem 2.25rem',
        border: noAttendees
          ? '1.5px dashed rgba(163,177,138,0.25)'
          : '1px solid rgba(0,0,0,0.06)',
        boxShadow: noAttendees
          ? 'none'
          : '0 8px 40px rgba(0,0,0,0.06)',
        transition: 'all 0.5s ease',
      }}
    >
      <AnimatePresence mode="popLayout">
        {noAttendees ? (
          /* ── Zero / empty state ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '0.5rem 0' }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(163,177,138,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Leaf size={20} color="#5C6B3F" />
            </motion.div>
            <p style={{
              fontFamily: 'var(--pl-font-heading)', fontSize: '1.1rem',
              fontWeight: 400, color: 'var(--pl-ink)', marginBottom: '0.35rem',
              letterSpacing: '-0.01em',
            }}>
              Be the first to RSVP!
            </p>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              Help {coupleNames[0]} & {coupleNames[1]} plan their perfect day.
            </p>
          </motion.div>
        ) : (
          /* ── Has attendees ── */
          <motion.div
            key="filled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  border: '1.5px solid rgba(34,197,94,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(34,197,94,0.15)',
                }}
              >
                <Leaf size={18} color="#10b981" strokeWidth={2} fill="rgba(16,185,129,0.2)" />
              </motion.div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--pl-ink)', lineHeight: 1.4 }}>
                  <motion.span
                    key={stats?.attending}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    style={{
                      fontFamily: 'var(--pl-font-heading)',
                      fontSize: '1.5rem', color: '#10b981', fontWeight: 400,
                      display: 'inline-block', marginRight: '0.35rem',
                    }}
                  >
                    {stats?.attending}
                  </motion.span>
                  {stats?.attending === 1 ? 'person is' : 'people are'} coming to celebrate with {coupleNames[0]} & {coupleNames[1]}!
                </div>
                {stats && stats.pending > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', marginTop: '0.2rem' }}>
                    {stats.pending} {stats.pending === 1 ? 'person' : 'people'} still deciding
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                background: 'rgba(0,0,0,0.06)', borderRadius: 'var(--pl-radius-full)',
                height: '8px', overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  style={{
                    height: '100%', borderRadius: 'var(--pl-radius-full)',
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                  }}
                />
              </div>
            </div>

            {/* Breakdown row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.5rem',
            }}>
              {/* Attending */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 5px rgba(16,185,129,0.5)',
                }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 600 }}>
                  {stats?.attending} attending
                </span>
              </div>

              {/* Not attending — only show if data present */}
              {notAttending > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#f87171',
                  }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 600 }}>
                    {notAttending} unable to attend
                  </span>
                </div>
              )}

              {/* Pending */}
              {stats && stats.pending > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HelpCircle size={10} color="#f59e0b" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 600 }}>
                    {stats.pending} pending
                  </span>
                </div>
              )}

              <span style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', marginLeft: 'auto' }}>
                {pct}% responded
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
