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
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, boxShadow: '0 20px 50px rgba(0,0,0,0.12)' }}
      style={{
        display: 'flex', flexDirection: 'column',
        textDecoration: 'none',
        background: brand.color,
        borderRadius: '1.25rem',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: '4px', background: brand.accentColor, width: '100%' }} />

      <div style={{ padding: '2rem', flex: 1 }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{brand.emoji}</div>
        <div style={{
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: brand.accentColor, marginBottom: '0.4rem',
        }}>
          {brand.description}
        </div>
        <h3 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: '1.5rem', fontWeight: 400, color: 'var(--eg-fg)',
          marginBottom: '0.5rem',
        }}>
          {entry.name}
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
          {entry.note || hostname}
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: '100px',
          background: brand.accentColor, color: '#fff',
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
        }}>
          View Registry
          <ExternalLink size={12} />
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
      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
        <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
        <Gift size={20} color="var(--eg-accent)" strokeWidth={1.5} />
        <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)', marginBottom: '1.25rem',
          }}>
            {title}
          </h2>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', fontStyle: 'italic', maxWidth: '500px', margin: '0 auto' }}>
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
              padding: '3rem',
              background: 'var(--eg-accent-light)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <Heart size={28} color="var(--eg-accent)" style={{ marginBottom: '1.25rem' }} strokeWidth={1.5} />
            <p style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '1.35rem', color: 'var(--eg-fg)',
              marginBottom: '1rem', fontWeight: 400,
            }}>
              {cashFundMessage || 'Contribute to our honeymoon fund or future adventures together.'}
            </p>
            <a
              href={cashFundUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.9rem 2rem', borderRadius: '100px',
                background: 'var(--eg-accent)', color: '#fff',
                fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <Heart size={16} />
              Contribute a Gift
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
