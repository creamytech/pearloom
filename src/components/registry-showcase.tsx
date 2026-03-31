'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/registry-showcase.tsx
// Multi-registry display with beautiful preview cards
// Supports: Zola, Amazon, The Knot, Crate & Barrel, Williams Sonoma, custom
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import {
  GiftIcon,
  ElegantHeartIcon,
  PearlDividerIcon,
} from '@/components/icons/PearloomIcons';
import { SectionDivider } from '@/components/site/SectionDivider';

interface RegistryEntry {
  name: string;
  url: string;
  note?: string;
}

interface RegistryShowcaseProps {
  registries: RegistryEntry[];
  cashFundUrl?: string;
  cashFundMessage?: string;
  message?: string;
  title?: string;
}

// Brand recognition map — no emoji, use letter-avatar logic instead
const REGISTRY_BRANDS: Record<
  string,
  { accentColor: string; description: string; letter: string }
> = {
  zola: {
    accentColor: '#e8927a',
    description: 'Wedding Registry',
    letter: 'Z',
  },
  amazon: {
    accentColor: '#c07a00',
    description: 'Amazon Registry',
    letter: 'A',
  },
  'the knot': {
    accentColor: '#d4456a',
    description: 'The Knot Registry',
    letter: 'K',
  },
  crate: {
    accentColor: '#3b5be8',
    description: 'Crate & Barrel',
    letter: 'C',
  },
  williams: {
    accentColor: '#2e7d4f',
    description: 'Williams Sonoma',
    letter: 'W',
  },
  'bed bath': {
    accentColor: '#0078d4',
    description: 'Bed Bath & Beyond',
    letter: 'B',
  },
  target: {
    accentColor: '#cc0000',
    description: 'Target Registry',
    letter: 'T',
  },
  'pottery barn': {
    accentColor: '#8b5e3c',
    description: 'Pottery Barn',
    letter: 'P',
  },
};

function getBrand(url: string, name: string) {
  const lower = url.toLowerCase() + ' ' + name.toLowerCase();
  for (const [key, brand] of Object.entries(REGISTRY_BRANDS)) {
    if (lower.includes(key)) return brand;
  }
  const firstChar = name.charAt(0).toUpperCase() || 'G';
  return {
    accentColor: 'var(--eg-accent)',
    description: 'Gift Registry',
    letter: firstChar,
  };
}

function LetterAvatar({
  letter,
  accentColor,
}: {
  letter: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: accentColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
        fontFamily: 'var(--eg-font-heading)',
        fontSize: '1.1rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
      }}
    >
      {letter}
    </div>
  );
}

function RegistryCard({
  entry,
  index,
}: {
  entry: RegistryEntry;
  index: number;
}) {
  const brand = getBrand(entry.url, entry.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: '0 24px 60px rgba(43,43,43,0.1)' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(43,43,43,0.05)',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Top accent strip */}
      <div
        style={{
          height: '3px',
          background: `linear-gradient(90deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 30%, transparent))`,
          width: '100%',
        }}
      />

      <div
        style={{
          padding: '2rem 2.25rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        {/* Brand identity row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <LetterAvatar letter={brand.letter} accentColor={brand.accentColor} />
          <div>
            <div
              style={{
                fontSize: '0.6rem',
                fontWeight: 800,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: brand.accentColor,
                lineHeight: 1.2,
              }}
            >
              {brand.description}
            </div>
          </div>
        </div>

        <h3
          style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(1.35rem, 2.5vw, 1.6rem)',
            fontWeight: 400,
            color: 'var(--eg-fg)',
            marginBottom: entry.note ? '0.6rem' : '0',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}
        >
          {entry.name}
        </h3>

        {entry.note && (
          <p
            style={{
              color: 'var(--eg-muted)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              lineHeight: 1.65,
              fontStyle: 'italic',
              flexGrow: 1,
            }}
          >
            {entry.note}
          </p>
        )}

        {/* CTA button — olive background */}
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.5rem',
            borderRadius: '100px',
            background: 'var(--eg-accent)',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            textDecoration: 'none',
            marginTop: entry.note ? '0' : 'auto',
            alignSelf: 'flex-start',
            transition: 'background 0.2s ease, transform 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--eg-accent-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--eg-accent)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          View Registry
          <ExternalLink size={11} />
        </a>
      </div>
    </motion.div>
  );
}

export function RegistryShowcase({
  registries,
  cashFundUrl,
  cashFundMessage,
  message,
  title = 'Gifts & Registry',
}: RegistryShowcaseProps) {
  const hasContent = (registries && registries.length > 0) || cashFundUrl;
  if (!hasContent) return null;

  return (
    <section
      data-pe-section="registry"
      style={{
        background: 'var(--eg-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wave divider at top */}
      <SectionDivider color="var(--eg-bg-section)" />

      <div style={{ padding: '4rem 2rem 8rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            style={{ textAlign: 'center', marginBottom: '4.5rem' }}
          >
            {/* Eyebrow with GiftIcon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '1px',
                  background: 'var(--eg-accent)',
                  opacity: 0.3,
                }}
              />
              <GiftIcon size={20} color="var(--eg-accent)" style={{ opacity: 0.75 }} />
              <div
                style={{
                  width: '48px',
                  height: '1px',
                  background: 'var(--eg-accent)',
                  opacity: 0.3,
                }}
              />
            </div>

            <h2
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: 'var(--eg-fg)',
                marginBottom: '1.5rem',
                lineHeight: 1.05,
              }}
            >
              {title}
            </h2>

            {/* Ornamental rule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
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
                fontSize: '1.05rem',
                fontStyle: 'italic',
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: 1.7,
              }}
            >
              Your presence is the greatest gift. But if you&apos;d like to celebrate
              us further, we&apos;ve shared a few ideas.
            </p>
          </motion.div>

          {/* Couple's custom message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              style={{
                textAlign: 'center',
                marginBottom: '3.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  opacity: 0.5,
                }}
              >
                <PearlDividerIcon size={10} color="var(--eg-accent)" />
              </div>
              <blockquote
                style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  fontStyle: 'italic',
                  color: 'var(--eg-fg)',
                  lineHeight: 1.75,
                  maxWidth: '600px',
                  margin: '0 auto',
                  padding: '0 2rem',
                  borderLeft: 'none',
                  opacity: 0.85,
                }}
              >
                &ldquo;{message}&rdquo;
              </blockquote>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '1.25rem',
                  opacity: 0.5,
                }}
              >
                <PearlDividerIcon size={10} color="var(--eg-accent)" />
              </div>
            </motion.div>
          )}

          {/* Registry cards grid */}
          {registries && registries.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: cashFundUrl ? '3rem' : 0,
              }}
            >
              {registries.map((reg, i) => (
                <RegistryCard key={i} entry={reg} index={i} />
              ))}
            </div>
          )}

          {/* Cash fund — special featured card */}
          {cashFundUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{
                textAlign: 'center',
                padding: '3.5rem 3rem',
                background:
                  'linear-gradient(135deg, var(--eg-plum-light) 0%, color-mix(in srgb, var(--eg-bg) 80%, var(--eg-plum-light) 20%) 100%)',
                borderRadius: '1.25rem',
                border: '1px solid color-mix(in srgb, var(--eg-plum) 18%, transparent)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle dot grid overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage:
                    'radial-gradient(circle, color-mix(in srgb, var(--eg-plum) 10%, transparent) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.4,
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <ElegantHeartIcon
                  size={26}
                  color="var(--eg-plum)"
                  style={{ marginBottom: '1.5rem', opacity: 0.7 }}
                />
                <p
                  style={{
                    fontFamily: 'var(--eg-font-heading)',
                    fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                    color: 'var(--eg-fg)',
                    marginBottom: '0.75rem',
                    fontWeight: 400,
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {cashFundMessage ||
                    'Contribute to our honeymoon fund or future adventures together.'}
                </p>
                <p
                  style={{
                    color: 'var(--eg-muted)',
                    fontSize: '0.88rem',
                    marginBottom: '2rem',
                    fontStyle: 'italic',
                  }}
                >
                  Your generosity means the world to us.
                </p>
                <a
                  href={cashFundUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.9rem 2.5rem',
                    borderRadius: '100px',
                    background: 'var(--eg-plum)',
                    color: '#fff',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    textTransform: 'uppercase' as const,
                    boxShadow:
                      '0 8px 30px color-mix(in srgb, var(--eg-plum) 30%, transparent)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 14px 40px color-mix(in srgb, var(--eg-plum) 40%, transparent)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow =
                      '0 8px 30px color-mix(in srgb, var(--eg-plum) 30%, transparent)';
                  }}
                >
                  <ElegantHeartIcon size={14} />
                  Contribute a Gift
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
