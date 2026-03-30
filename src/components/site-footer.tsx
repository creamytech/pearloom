'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site-footer.tsx
// Premium three-column footer for published wedding sites.
// ─────────────────────────────────────────────────────────────

import { ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { SitePage } from '@/types';
import { PearIcon, PearlDividerIcon } from '@/components/icons/PearloomIcons';

interface SiteFooterProps {
  names: [string, string];
  /** Site pages for quick links */
  pages?: SitePage[];
  /** RSVP page slug — if provided, show CTA */
  rsvpSlug?: string;
  /** Base path for building hrefs */
  basePath?: string;
  /** Closing line from poetry pass */
  closingLine?: string;
}

export function SiteFooter({
  names,
  pages = [],
  rsvpSlug,
  basePath = '',
  closingLine,
}: SiteFooterProps) {
  const enabledPages = pages.filter((p) => p.enabled).sort((a, b) => a.order - b.order);
  const displayNames = `${names[0]} & ${names[1]}`;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      style={{
        background: 'var(--eg-fg)',
        color: 'rgba(245,241,232,0.7)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle noise texture */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.025'/%3E%3C/svg%3E\")",
          opacity: 0.4,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem 0' }}>

        {/* Pearl divider */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem', opacity: 0.25 }}>
          <PearlDividerIcon size={14} color="var(--eg-gold)" />
        </div>

        {/* Three-column grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '3rem',
            marginBottom: '3.5rem',
          }}
          className="footer-grid"
        >
          {/* Col 1: Couple + Pearloom brand */}
          <div>
            <h3 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '1.5rem', fontWeight: 400,
              color: 'rgba(245,241,232,0.95)',
              letterSpacing: '-0.015em', lineHeight: 1.2,
              marginBottom: '0.75rem',
            }}>
              {displayNames}
            </h3>
            {closingLine && (
              <p style={{
                fontSize: '0.85rem', lineHeight: 1.7,
                color: 'rgba(245,241,232,0.5)',
                fontStyle: 'italic', marginBottom: '1.5rem',
              }}>
                {closingLine}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <PearIcon size={18} color="var(--eg-accent)" />
              <span style={{
                fontSize: '0.75rem', color: 'rgba(245,241,232,0.4)',
                letterSpacing: '0.04em',
              }}>
                Powered by{' '}
                <a
                  href="https://pearloom.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'rgba(245,241,232,0.55)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontFamily: 'var(--eg-font-heading)',
                    transition: 'color 0.2s',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--eg-accent)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,241,232,0.55)'; }}
                >
                  Pearloom
                </a>
              </span>
            </div>
          </div>

          {/* Col 2: Quick links */}
          <div>
            <h4 style={{
              fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(245,241,232,0.35)',
              marginBottom: '1.25rem',
            }}>
              Quick Links
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {enabledPages.map((pg) => (
                <Link
                  key={pg.id}
                  href={pg.slug === '' ? basePath : `${basePath}/${pg.slug}`}
                  style={{
                    fontSize: '0.875rem', color: 'rgba(245,241,232,0.55)',
                    textDecoration: 'none', fontFamily: 'var(--eg-font-body)',
                    transition: 'color 0.2s',
                    display: 'inline-block',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,241,232,0.9)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,241,232,0.55)'; }}
                >
                  {pg.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 3: RSVP CTA */}
          <div>
            <h4 style={{
              fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(245,241,232,0.35)',
              marginBottom: '1.25rem',
            }}>
              Join the Celebration
            </h4>
            {rsvpSlug ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'rgba(245,241,232,0.5)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                  We would love to see you there. Let us know if you can make it.
                </p>
                <Link
                  href={`${basePath}/${rsvpSlug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.5rem', borderRadius: '100px',
                    background: 'rgba(163,177,138,0.15)',
                    color: 'var(--eg-accent)',
                    border: '1px solid rgba(163,177,138,0.25)',
                    textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
                    fontFamily: 'var(--eg-font-body)',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,177,138,0.25)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(163,177,138,0.4)';
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,177,138,0.15)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(163,177,138,0.25)';
                  }}
                >
                  RSVP Now
                </Link>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'rgba(245,241,232,0.4)', lineHeight: 1.7 }}>
                We cannot wait to celebrate with you.
              </p>
            )}
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(245,241,232,0.07)',
          padding: '1.5rem 0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <p style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.3)', letterSpacing: '0.04em' }}>
            {displayNames} &copy; {new Date().getFullYear()}
          </p>

          {/* Back to top */}
          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', borderRadius: '100px',
              border: '1px solid rgba(245,241,232,0.12)',
              background: 'transparent',
              color: 'rgba(245,241,232,0.5)',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
              fontFamily: 'var(--eg-font-body)',
              transition: 'background 0.2s, color 0.2s, border-color 0.2s',
              letterSpacing: '0.06em',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(245,241,232,0.06)';
              e.currentTarget.style.color = 'rgba(245,241,232,0.8)';
              e.currentTarget.style.borderColor = 'rgba(245,241,232,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(245,241,232,0.5)';
              e.currentTarget.style.borderColor = 'rgba(245,241,232,0.12)';
            }}
          >
            <ArrowUp size={13} />
            Back to top
          </motion.button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
