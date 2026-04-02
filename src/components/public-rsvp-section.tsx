'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/public-rsvp-section.tsx
// Full RSVP section for the public wedding site
// Wired to /api/rsvp → guests table
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { EnvelopeIcon } from '@/components/icons/PearloomIcons';
import { SectionDivider } from '@/components/site/SectionDivider';
import { RsvpForm } from '@/components/rsvp-form';
import type { WeddingEvent } from '@/types';
import { parseLocalDate } from '@/lib/date';

interface PublicRsvpSectionProps {
  siteId: string;
  events: WeddingEvent[];
  deadline?: string;
  // Poetry pass — warm RSVP intro from AI
  rsvpIntro?: string;
  // Section heading override
  title?: string;
}

export function PublicRsvpSection({
  siteId,
  events,
  deadline,
  rsvpIntro,
  title,
}: PublicRsvpSectionProps) {
  const headingText = title || rsvpIntro || 'Join us';

  const deadlineFormatted = deadline
    ? (() => {
        try {
          return parseLocalDate(deadline).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {
          return deadline;
        }
      })()
    : null;

  return (
    <section
      id="rsvp"
      style={{
        background: 'var(--eg-bg-section)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wave divider at top */}
      <SectionDivider color="var(--eg-bg)" />

      {/* Pear watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '-80px',
          right: '-80px',
          width: '300px',
          height: '380px',
          borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
          background: 'var(--eg-accent)',
          opacity: 0.04,
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '4rem 2rem 8rem' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          {/* Eyebrow with EnvelopeIcon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 0.2 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flex: 1,
                maxWidth: '120px',
                height: '1px',
                background: 'var(--eg-accent)',
                transformOrigin: 'right',
              }}
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 0.75 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            >
              <EnvelopeIcon size={22} color="var(--eg-accent)" />
            </motion.div>
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 0.2 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flex: 1,
                maxWidth: '120px',
                height: '1px',
                background: 'var(--eg-accent)',
                transformOrigin: 'left',
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              color: 'var(--eg-fg)',
              marginBottom: '1.25rem',
              lineHeight: 1.05,
            }}
          >
            {headingText}
          </h2>

          {/* Ornamental rule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '1px',
                background: 'var(--eg-accent)',
                opacity: 0.35,
              }}
            />
            <div
              style={{
                width: '4px',
                height: '4px',
                background: 'var(--eg-accent)',
                transform: 'rotate(45deg)',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                width: '24px',
                height: '1px',
                background: 'var(--eg-accent)',
                opacity: 0.35,
              }}
            />
          </div>

          <p
            style={{
              color: 'var(--eg-muted)',
              fontSize: '1.1rem',
              fontStyle: 'italic',
              maxWidth: '480px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            We would be honored by your presence.
          </p>
        </motion.div>

        {/* RSVP deadline banner */}
        {deadlineFormatted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{
              marginBottom: '2rem',
              padding: '0.875rem 1.5rem',
              background:
                'linear-gradient(135deg, var(--eg-accent-light), color-mix(in srgb, var(--eg-accent-light) 70%, #fff))',
              borderRadius: '0.75rem',
              border: '1.5px solid color-mix(in srgb, var(--eg-accent) 20%, transparent)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--eg-accent)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              Please RSVP by {deadlineFormatted}
            </p>
          </motion.div>
        )}

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          style={{
            background: 'var(--eg-bg)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 40px rgba(43,43,43,0.06)',
            padding: '2.5rem',
          }}
        >
          <RsvpForm events={events} siteId={siteId} />
        </motion.div>
      </div>
    </section>
  );
}
