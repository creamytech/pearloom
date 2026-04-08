'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/public-rsvp-section.tsx
// Full RSVP section for the public wedding site
// Wired to /api/rsvp → guests table
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnvelopeIcon } from '@/components/icons/PearloomIcons';
import { SectionDivider } from '@/components/site/SectionDivider';
import { RsvpForm } from '@/components/rsvp-form';
import type { WeddingEvent } from '@/types';
import { parseLocalDate } from '@/lib/date';

type EnvelopeState = 'sealed' | 'opening' | 'open';

interface PublicRsvpSectionProps {
  siteId: string;
  events: WeddingEvent[];
  deadline?: string;
  rsvpIntro?: string;
  title?: string;
  mealOptions?: Array<{ id: string; name: string; dietaryTags?: string[] }>;
}

export function PublicRsvpSection({
  siteId,
  events,
  deadline,
  rsvpIntro,
  title,
  mealOptions,
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

  const [envelopeState, setEnvelopeState] = useState<EnvelopeState>('sealed');

  useEffect(() => {
    if (envelopeState === 'opening') {
      const timer = setTimeout(() => {
        setEnvelopeState('open');
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [envelopeState]);

  function handleOpenEnvelope() {
    setEnvelopeState('opening');
  }

  return (
    <section
      id="rsvp"
      style={{
        background: 'var(--pl-cream-deep)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wave divider at top */}
      <SectionDivider color="var(--pl-cream)" />

      {/* Pear watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '-80px',
          right: '-80px',
          width: '300px',
          height: '380px',
          borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
          background: 'var(--pl-olive)',
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
                background: 'var(--pl-olive)',
                transformOrigin: 'right',
              }}
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 0.75 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            >
              <EnvelopeIcon size={22} color="var(--pl-olive)" />
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
                background: 'var(--pl-olive)',
                transformOrigin: 'left',
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              color: 'var(--pl-ink)',
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
                background: 'var(--pl-olive)',
                opacity: 0.35,
              }}
            />
            <div
              style={{
                width: '4px',
                height: '4px',
                background: 'var(--pl-olive)',
                transform: 'rotate(45deg)',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                width: '24px',
                height: '1px',
                background: 'var(--pl-olive)',
                opacity: 0.35,
              }}
            />
          </div>

          <p
            style={{
              color: 'var(--pl-muted)',
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
                'linear-gradient(135deg, var(--pl-olive-mist), color-mix(in srgb, var(--pl-olive-mist) 70%, #fff))',
              borderRadius: '0.75rem',
              border: '1.5px solid color-mix(in srgb, var(--pl-olive) 20%, transparent)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--pl-olive)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              Please RSVP by {deadlineFormatted}
            </p>
          </motion.div>
        )}

        {/* ── Golden Ticket Envelope Experience ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
        >
          {(envelopeState === 'sealed' || envelopeState === 'opening') && (
            <div
              style={{
                background: 'linear-gradient(135deg, #FBF8F1 0%, #F5F0E8 100%)',
                border: '1px solid rgba(196,169,106,0.3)',
                borderRadius: '12px',
                padding: 0,
                overflow: 'hidden',
                boxShadow:
                  '0 8px 40px rgba(43,43,43,0.12), 0 0 0 1px rgba(196,169,106,0.15)',
              }}
            >
              {/* Envelope flap */}
              <div style={{ perspective: '600px' }}>
                <motion.div
                  animate={
                    envelopeState === 'opening'
                      ? { rotateX: -160 }
                      : { rotateX: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    transformOrigin: 'top center',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 50% 55%)',
                      background: 'linear-gradient(135deg, #F0EAD8, #E8E0CC)',
                      height: '120px',
                      borderBottom: '1px solid rgba(196,169,106,0.2)',
                      position: 'relative',
                    }}
                  >
                    {/* Wax seal */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background:
                          'radial-gradient(circle at 40% 35%, #C4A96A, #8B7040)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                      }}
                    >
                      <EnvelopeIcon size={16} color="white" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Card body */}
              <div
                style={{
                  padding: 'clamp(1.5rem, 5vw, 2.5rem)',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--pl-font-heading)',
                    fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: 'var(--pl-ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    marginBottom: '0.75rem',
                  }}
                >
                  {headingText}
                </p>

                {deadlineFormatted && (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      fontVariant: 'small-caps',
                      letterSpacing: '0.12em',
                      color: 'var(--pl-muted)',
                      marginBottom: '2rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {deadlineFormatted}
                  </p>
                )}

                {!deadlineFormatted && <div style={{ marginBottom: '2rem' }} />}

                {/* Open invitation button */}
                <motion.button
                  onClick={handleOpenEnvelope}
                  disabled={envelopeState === 'opening'}
                  whileHover={envelopeState === 'sealed' ? { scale: 1.03 } : {}}
                  whileTap={envelopeState === 'sealed' ? { scale: 0.98 } : {}}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.85rem 2rem',
                    background:
                      envelopeState === 'opening'
                        ? 'linear-gradient(135deg, #d4b87a, #a8894e)'
                        : 'linear-gradient(135deg, #C4A96A, #8B7040)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2rem',
                    fontFamily: 'var(--pl-font-body, inherit)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    cursor: envelopeState === 'opening' ? 'default' : 'pointer',
                    boxShadow:
                      '0 4px 16px rgba(139,112,64,0.35), inset 0 1px 0 rgba(0,0,0,0.08)',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <span>{envelopeState === 'opening' ? 'Opening…' : 'Open your invitation'}</span>
                </motion.button>
              </div>
            </div>
          )}

          {/* Open state — invitation card slides up */}
          {envelopeState === 'open' && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'linear-gradient(135deg, #FBF8F1 0%, #F5F0E8 100%)',
                border: '1px solid rgba(196,169,106,0.3)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow:
                  '0 8px 40px rgba(43,43,43,0.12), 0 0 0 1px rgba(196,169,106,0.15)',
              }}
            >
              {/* Invitation card header */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 2.5rem 2rem',
                  borderBottom: '1px solid rgba(196,169,106,0.2)',
                }}
              >
                {/* Gold ornamental divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      maxWidth: '80px',
                      height: '1px',
                      background: 'linear-gradient(to right, transparent, rgba(196,169,106,0.5))',
                    }}
                  />
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#C4A96A',
                      opacity: 0.7,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      maxWidth: '80px',
                      height: '1px',
                      background: 'linear-gradient(to left, transparent, rgba(196,169,106,0.5))',
                    }}
                  />
                </div>

                <p
                  style={{
                    fontFamily: 'var(--pl-font-heading)',
                    fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: 'var(--pl-ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    marginBottom: '0.5rem',
                  }}
                >
                  {headingText}
                </p>
                <p
                  style={{
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    color: 'var(--pl-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  kindly request your presence
                </p>
              </div>

              {/* RSVP form embedded in invitation */}
              <div style={{ padding: '2.5rem' }}>
                <RsvpForm events={events} siteId={siteId} mealOptions={mealOptions} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
