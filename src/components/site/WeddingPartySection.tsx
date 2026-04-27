'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / site/WeddingPartySection.tsx
// "Meet Our People" — wedding party members with photos,
// roles, and short bios. Works for weddings & engagements.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import type { WeddingPartyMember } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  'bride': 'The Bride',
  'groom': 'The Groom',
  'maid-of-honor': 'Maid of Honor',
  'best-man': 'Best Man',
  'bridesmaid': 'Bridesmaid',
  'groomsman': 'Groomsman',
  'flower-girl': 'Flower Girl',
  'ring-bearer': 'Ring Bearer',
  'officiant': 'Officiant',
  'parent': 'Parent',
  'grandparent': 'Grandparent',
  'other': '',
};

interface WeddingPartySectionProps {
  members: WeddingPartyMember[];
  title?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export function WeddingPartySection({
  members,
  title = 'Our People',
  accentColor = 'var(--pl-olive)',
  headingFont = 'Playfair Display',
  bodyFont = 'Inter',
}: WeddingPartySectionProps) {
  if (members.length === 0) return null;

  const sorted = [...members].sort((a, b) => a.order - b.order);

  return (
    <section style={{
      padding: 'clamp(3rem,6vw,6rem) clamp(1rem,4vw,2rem)',
      maxWidth: '1080px',
      margin: '0 auto',
    }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem,4vw,3.5rem)' }}>
        <p style={{
          fontSize: '0.65rem', fontWeight: 800,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: accentColor, marginBottom: '0.6rem',
          fontFamily: `"${bodyFont}", sans-serif`,
        }}>
          The Wedding Party
        </p>
        <h2 style={{
          fontFamily: `"${headingFont}", serif`,
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight: 400, fontStyle: 'italic',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          {title}
        </h2>
      </div>

      {/* Members grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 'clamp(1.5rem, 3vw, 2.5rem)',
      }}>
        {sorted.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            style={{ textAlign: 'center' }}
          >
            {/* Photo */}
            <div style={{
              width: '160px', height: '160px',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              overflow: 'hidden',
              background: `${accentColor}15`,
              border: `2px solid ${accentColor}20`,
            }}>
              {member.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo}
                  alt={member.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', fontWeight: 300,
                  fontFamily: `"${headingFont}", serif`,
                  fontStyle: 'italic',
                  color: `${accentColor}40`,
                }}>
                  {member.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Name */}
            <h3 style={{
              fontFamily: `"${headingFont}", serif`,
              fontSize: '1.1rem', fontWeight: 600,
              fontStyle: 'italic',
              margin: '0 0 0.25rem',
            }}>
              {member.name}
            </h3>

            {/* Role */}
            <p style={{
              fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: accentColor,
              margin: '0 0 0.5rem',
            }}>
              {member.customRole || ROLE_LABELS[member.role] || member.role}
            </p>

            {/* Relationship */}
            {member.relationship && (
              <p style={{
                fontSize: '0.78rem',
                color: 'var(--pl-muted, #888)',
                fontStyle: 'italic',
                margin: '0 0 0.5rem',
              }}>
                {member.relationship}
              </p>
            )}

            {/* Bio */}
            {member.bio && (
              <p style={{
                fontSize: '0.82rem',
                color: 'var(--pl-muted, #888)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {member.bio}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
