'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/registry/RegistryCard.tsx
// Beautiful card for a single registry source.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import type { RegistrySource } from '@/types';

export interface RegistryCardProps {
  source: RegistrySource;
  onEdit?: () => void;
  onDelete?: () => void;
  editable?: boolean;
}

// ── Brand config ─────────────────────────────────────────────

interface BrandConfig {
  accent: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
}

function detectBrand(storeName: string, url: string): BrandConfig {
  const name = storeName.toLowerCase();
  const u = url.toLowerCase();

  // Amazon
  if (name.includes('amazon') || u.includes('amazon.com')) {
    return {
      accent: '#FF9900',
      bg: '#FFF8EE',
      label: 'Amazon',
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#FF9900" />
          <path
            d="M8 17.5c4.5 3 10.5 3 15 0"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M21 16.5c1-.3 2 .2 2.5 1"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M10 10h12M10 10c0 3 2 5 6 5s6-2 6-5"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    };
  }

  // Zola
  if (name.includes('zola') || u.includes('zola.com')) {
    return {
      accent: '#1E6060',
      bg: '#EEF6F6',
      label: 'Zola',
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#1E6060" />
          <text x="7" y="22" fontSize="14" fontWeight="bold" fill="#fff" fontFamily="Georgia,serif">
            Z
          </text>
          <path d="M8 23h16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    };
  }

  // Target
  if (name.includes('target') || u.includes('target.com')) {
    return {
      accent: '#CC0000',
      bg: '#FFF0F0',
      label: 'Target',
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#CC0000" />
          <circle cx="16" cy="16" r="8" stroke="#fff" strokeWidth="2" />
          <circle cx="16" cy="16" r="4" stroke="#fff" strokeWidth="2" />
          <circle cx="16" cy="16" r="1.5" fill="#fff" />
        </svg>
      ),
    };
  }

  // MyRegistry
  if (name.includes('myregistry') || u.includes('myregistry.com')) {
    return {
      accent: '#2563EB',
      bg: '#EFF6FF',
      label: 'MyRegistry',
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#2563EB" />
          <path
            d="M8 22V12l8 6 8-6v10"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    };
  }

  // Crate & Barrel
  if (name.includes('crate') || u.includes('crateandbarrel.com')) {
    return {
      accent: '#111111',
      bg: '#F5F5F5',
      label: 'Crate & Barrel',
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#111" />
          <rect x="9" y="10" width="14" height="12" rx="1" stroke="#fff" strokeWidth="1.5" />
          <path d="M9 14h14M9 18h14" stroke="#fff" strokeWidth="1.5" />
        </svg>
      ),
    };
  }

  // Williams Sonoma
  if (name.includes('williams') || u.includes('williams-sonoma.com')) {
    return {
      accent: '#1A3C34',
      bg: '#EEF4F0',
      label: 'Williams Sonoma',
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#1A3C34" />
          <path
            d="M8 10c0 8 16 8 16 0"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect x="11" y="14" width="10" height="8" rx="1" stroke="#fff" strokeWidth="1.5" />
        </svg>
      ),
    };
  }

  // Bed Bath & Beyond / Overstock
  if (
    name.includes('bed bath') ||
    name.includes('overstock') ||
    u.includes('bedbathandbeyond.com') ||
    u.includes('overstock.com')
  ) {
    return {
      accent: '#1A56DB',
      bg: '#EFF6FF',
      label: storeName,
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#1A56DB" />
          <path
            d="M8 20v-8a4 4 0 0 1 8 0v8"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M16 16h8v4H8v-4h8z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    };
  }

  // Cash fund / Venmo / PayPal / Honeymoon
  if (
    name.includes('venmo') ||
    name.includes('paypal') ||
    name.includes('honeymoon') ||
    name.includes('cash') ||
    name.includes('fund') ||
    u.includes('venmo.com') ||
    u.includes('paypal.com')
  ) {
    return {
      accent: '#B8860B',
      bg: '#FFFBEB',
      label: storeName,
      icon: (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#B8860B" />
          <path
            d="M16 22s-8-5-8-10a4 4 0 0 1 8 0 4 4 0 0 1 8 0c0 5-8 10-8 10z"
            fill="#fff"
            fillOpacity="0.9"
          />
        </svg>
      ),
    };
  }

  // Generic / unknown store — shopping bag icon
  return {
    accent: '#6B7280',
    bg: '#F9FAFB',
    label: storeName,
    icon: (
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="#9CA3AF" />
        <path
          d="M10 13h12l-1.5 10h-9L10 13z"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M13 13v-2a3 3 0 0 1 6 0v2"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Component ────────────────────────────────────────────────

export function RegistryCard({ source, onEdit, onDelete, editable = false }: RegistryCardProps) {
  const brand = detectBrand(source.storeName, source.registryUrl);
  const domain = getDomain(source.registryUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: '0 12px 36px rgba(0,0,0,0.13)' }}
      style={{
        background: '#FEFCF8',
        borderRadius: '1rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        border: `1px solid #EDE8E0`,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        position: 'relative',
      }}
    >
      {/* Edit / Delete buttons */}
      {editable && (
        <div
          style={{
            position: 'absolute',
            top: '0.875rem',
            right: '0.875rem',
            display: 'flex',
            gap: '0.4rem',
          }}
        >
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label="Edit registry"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                color: '#9A9488',
                lineHeight: 1,
                transition: 'color var(--pl-dur-instant)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--pl-ink)')}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = '#9A9488')
              }
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81 3.547 11.013a.25.25 0 0 0-.064.108l-.655 2.293 2.293-.655a.25.25 0 0 0 .108-.064L11.19 6.25z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete registry"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                color: '#9A9488',
                lineHeight: 1,
                transition: 'color var(--pl-dur-instant)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#DC2626')}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = '#9A9488')
              }
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Top row: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '0.625rem',
            background: brand.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1px solid ${brand.accent}22`,
          }}
        >
          {brand.icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'Playfair Display, Georgia, serif',
              color: '#1C1C1C',
              lineHeight: 1.3,
            }}
          >
            {source.storeName}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: '#9A9488',
              fontFamily: 'Inter, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {domain}
          </p>
        </div>
      </div>

      {/* Category pill */}
      {source.category && (
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '0.2rem 0.7rem',
              borderRadius: 'var(--pl-radius-full)',
              background: `${brand.accent}18`,
              color: brand.accent,
              fontSize: '0.7rem',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {source.category}
          </span>
        </div>
      )}

      {/* Notes */}
      {source.notes && (
        <p
          style={{
            margin: 0,
            fontSize: '0.825rem',
            color: '#6B6660',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {source.notes}
        </p>
      )}

      {/* CTA */}
      <motion.a
        href={source.registryUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          marginTop: 'auto',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.625rem',
          background: brand.accent,
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          textDecoration: 'none',
        }}
      >
        View Registry
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 7h8M7.5 3.5 11 7l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.a>
    </motion.div>
  );
}
