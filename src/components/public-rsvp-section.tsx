'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/public-rsvp-section.tsx
// Full RSVP section for the public wedding site
// Wired to /api/rsvp → guests table
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { RsvpForm } from '@/components/rsvp-form';
import type { WeddingEvent } from '@/types';

interface PublicRsvpSectionProps {
  siteId: string;
  events: WeddingEvent[];
  deadline?: string;
}

export function PublicRsvpSection({ siteId, events, deadline }: PublicRsvpSectionProps) {
  return (
    <section
      id="rsvp"
      style={{
        padding: '8rem 2rem',
        background: 'var(--eg-card-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pear watermark */}
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: '300px', height: '380px',
        borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
        background: 'var(--eg-accent)',
        opacity: 0.04,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '1.5rem', marginBottom: '3rem',
          }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
            <Heart size={20} color="var(--eg-accent)" strokeWidth={1.5} />
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
          </div>

          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)', marginBottom: '1.25rem',
          }}>
            Will You Join Us?
          </h2>
          <p style={{
            color: 'var(--eg-muted)', fontSize: '1.1rem',
            fontStyle: 'italic', maxWidth: '480px', margin: '0 auto',
            lineHeight: 1.6,
          }}>
            We would be honored by your presence. Please let us know by
            {deadline ? ` ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : ' the deadline'}.
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          style={{
            background: '#fff',
            borderRadius: '1.5rem',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
            padding: '2.5rem',
          }}
        >
          <RsvpForm events={events} siteId={siteId} />
        </motion.div>
      </div>
    </section>
  );
}
