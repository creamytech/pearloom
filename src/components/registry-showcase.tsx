'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/registry-showcase.tsx
// Multi-registry display with beautiful preview cards
// Supports: Zola, Amazon, The Knot, Crate & Barrel, Williams Sonoma, custom
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { ExternalLink, Gift, Heart } from 'lucide-react';

interface RegistryEntry {
  name: string;
  url: string;
  note?: string;
}

interface RegistryShowcaseProps {
  registries: RegistryEntry[];
  cashFundUrl?: string;
  cashFundMessage?: string;
  title?: string;
}

// Brand recognition map
const REGISTRY_BRANDS: Record<string, { color: string; accentColor: string; description: string; emoji: string }> = {
  zola: { color: '#fff7f0', accentColor: '#e8927a', description: 'Wedding Registry', emoji: '💍' },
  amazon: { color: '#fff9f0', accentColor: '#ff9900', description: 'Amazon Registry', emoji: '📦' },
  'the knot': { color: '#fff5f5', accentColor: '#d4456a', description: 'The Knot Registry', emoji: '💒' },
  'crate': { color: '#f0f4ff', accentColor: '#3b5be8', description: 'Crate & Barrel', emoji: '🏠' },
  'williams': { color: '#f5fff0', accentColor: '#2e7d4f', description: 'Williams Sonoma', emoji: '🍳' },
  'bed bath': { color: '#f0f9ff', accentColor: '#0078d4', description: 'Bed Bath & Beyond', emoji: '🛏️' },
  'target': { color: '#fff0f0', accentColor: '#cc0000', description: 'Target Registry', emoji: '🎯' },
  'pottery barn': { color: '#fdf8f0', accentColor: '#8b5e3c', description: 'Pottery Barn', emoji: '🪴' },
};

function getBrand(url: string) {
  const lower = url.toLowerCase();
  for (const [key, brand] of Object.entries(REGISTRY_BRANDS)) {
    if (lower.includes(key)) return brand;
  }
  return { color: '#f9f5f0', accentColor: 'var(--eg-accent)', description: 'Gift Registry', emoji: '🎁' };
}

function RegistryCard({ entry, index }: { entry: RegistryEntry; index: number }) {
  const brand = getBrand(entry.url);
  const hostname = (() => { try { return new URL(entry.url).hostname.replace('www.', ''); } catch { return entry.name; } })();

  return (
    <motion.a
      href={entry.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, boxShadow: '0 24px 60px rgba(0,0,0,0.1)' }}
      style={{
        display: 'flex', flexDirection: 'column',
        textDecoration: 'none',
        background: brand.color,
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Top accent strip — thicker for prominence */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 50%, transparent))`, width: '100%' }} />

      <div style={{ padding: '2rem 2.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Brand identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: `color-mix(in srgb, ${brand.accentColor} 12%, white)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', flexShrink: 0,
          }}>{brand.emoji}</div>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: brand.accentColor, lineHeight: 1.2 }}>
              {brand.description}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', marginTop: '0.1rem' }}>{hostname}</div>
          </div>
        </div>

        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(1.35rem, 2.5vw, 1.65rem)', fontWeight: 400, color: 'var(--eg-fg)',
          marginBottom: '0.5rem', lineHeight: 1.15, letterSpacing: '-0.01em',
        }}>
          {entry.name}
        </h3>
        {entry.note && (
          <p style={{ color: 'var(--eg-muted)', fontSize: '0.83rem', marginBottom: '1.5rem', lineHeight: 1.55, fontStyle: 'italic', flexGrow: 1 }}>
            {entry.note}
          </p>
        )}

        {/* Luxury CTA button */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.65rem 1.4rem', borderRadius: '100px',
          background: 'transparent',
          border: `1.5px solid ${brand.accentColor}`,
          color: brand.accentColor,
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          marginTop: entry.note ? '0' : 'auto',
          alignSelf: 'flex-start',
        }}>
          View Registry
          <ExternalLink size={11} />
        </div>
      </div>
    </motion.a>
  );
}

export function RegistryShowcase({ registries, cashFundUrl, cashFundMessage, title = 'Our Registry' }: RegistryShowcaseProps) {
  const hasContent = (registries && registries.length > 0) || cashFundUrl;
  if (!hasContent) return null;

  return (
    <section style={{
      padding: '8rem 2rem',
      background: 'var(--eg-bg)',
      position: 'relative',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '4.5rem' }}
        >
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
            <Gift size={16} color="var(--eg-accent)" strokeWidth={1.5} style={{ opacity: 0.7 }} />
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)', marginBottom: '1.5rem',
            lineHeight: 1.05,
          }}>
            {title}
          </h2>
          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
            <div style={{ width: '4px', height: '4px', background: 'var(--eg-accent)', transform: 'rotate(45deg)', opacity: 0.5 }} />
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
          </div>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', fontStyle: 'italic', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
            Your presence is the greatest gift. But if you&apos;d like to celebrate us further, we&apos;ve shared a few ideas.
          </p>
        </motion.div>

        {/* Registry cards grid */}
        {registries && registries.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
            gap: '1.5rem',
            marginBottom: cashFundUrl ? '3rem' : 0,
          }}>
            {registries.map((reg, i) => (
              <RegistryCard key={i} entry={reg} index={i} />
            ))}
          </div>
        )}

        {/* Cash fund CTA */}
        {cashFundUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              textAlign: 'center',
              padding: '3.5rem 3rem',
              background: 'var(--eg-accent-light)',
              borderRadius: '0.5rem',
              border: '1px solid color-mix(in srgb, var(--eg-accent) 18%, transparent)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Subtle dot grid overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--eg-accent) 15%, transparent) 1px, transparent 1px)',
              backgroundSize: '20px 20px', opacity: 0.3,
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Heart size={24} color="var(--eg-accent)" style={{ marginBottom: '1.5rem', opacity: 0.7 }} strokeWidth={1.5} />
              <p style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', color: 'var(--eg-fg)',
                marginBottom: '0.75rem', fontWeight: 400, lineHeight: 1.35,
                letterSpacing: '-0.01em',
              }}>
                {cashFundMessage || 'Contribute to our honeymoon fund or future adventures together.'}
              </p>
              <p style={{ color: 'var(--eg-muted)', fontSize: '0.88rem', marginBottom: '2rem', fontStyle: 'italic' }}>Your generosity means the world to us.</p>
              <a
                href={cashFundUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.9rem 2.5rem', borderRadius: '100px',
                  background: 'var(--eg-accent)', color: '#fff',
                  fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.8rem',
                  textDecoration: 'none', textTransform: 'uppercase',
                  boxShadow: '0 8px 30px color-mix(in srgb, var(--eg-accent) 35%, transparent)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px color-mix(in srgb, var(--eg-accent) 45%, transparent)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px color-mix(in srgb, var(--eg-accent) 35%, transparent)'; }}
              >
                <Heart size={14} />
                Contribute a Gift
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
