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
  const displayNames = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[var(--eg-fg)] text-[rgba(245,241,232,0.7)] relative overflow-hidden">
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.025'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-[1] max-w-[1080px] mx-auto px-8 pt-16 pb-0">

        {/* Pearl divider */}
        <div className="flex justify-center mb-12 opacity-25">
          <PearlDividerIcon size={14} color="var(--eg-gold)" />
        </div>

        {/* Three-column grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mb-14"
        >
          {/* Col 1: Couple + Pearloom brand */}
          <div>
            <h3 className="font-heading text-2xl font-semibold italic text-[rgba(245,241,232,0.95)] tracking-[-0.025em] leading-tight mb-3">
              {displayNames}
            </h3>
            {closingLine && (
              <p className="text-[0.85rem] leading-relaxed text-[rgba(245,241,232,0.5)] italic mb-6">
                {closingLine}
              </p>
            )}
            <div className="flex items-center gap-2 mt-6">
              <PearIcon size={18} color="var(--eg-accent)" />
              <span className="text-[0.75rem] text-[rgba(245,241,232,0.4)] tracking-[0.04em]">
                Powered by{' '}
                <a
                  href="https://pearloom.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[rgba(245,241,232,0.55)] no-underline font-semibold font-heading hover:text-[var(--eg-accent)] transition-colors duration-200"
                >
                  Pearloom
                </a>
              </span>
            </div>
          </div>

          {/* Col 2: Quick links */}
          <div>
            <h4 className="text-[0.62rem] font-extrabold tracking-[0.14em] uppercase text-[rgba(245,241,232,0.35)] mb-5">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-2.5">
              {enabledPages.map((pg) => (
                <Link
                  key={pg.id}
                  href={pg.slug === '' ? basePath : `${basePath}/${pg.slug}`}
                  className="text-[0.875rem] text-[rgba(245,241,232,0.55)] no-underline font-body hover:text-[rgba(245,241,232,0.9)] transition-colors duration-200"
                >
                  {pg.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 3: RSVP CTA */}
          <div>
            <h4 className="text-[0.62rem] font-extrabold tracking-[0.14em] uppercase text-[rgba(245,241,232,0.35)] mb-5">
              Join the Celebration
            </h4>
            {rsvpSlug ? (
              <>
                <p className="text-[0.85rem] text-[rgba(245,241,232,0.5)] leading-relaxed mb-5">
                  We would love to see you there. Let us know if you can make it.
                </p>
                <Link
                  href={`${basePath}/${rsvpSlug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[rgba(163,177,138,0.15)] text-[var(--eg-accent)] border border-[rgba(163,177,138,0.25)] no-underline text-[0.85rem] font-semibold font-body hover:bg-[rgba(163,177,138,0.25)] hover:border-[rgba(163,177,138,0.4)] transition-all duration-200"
                >
                  RSVP Now
                </Link>
              </>
            ) : (
              <p className="text-[0.85rem] text-[rgba(245,241,232,0.4)] leading-relaxed">
                We cannot wait to celebrate with you.
              </p>
            )}
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="border-t border-[rgba(245,241,232,0.07)] py-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[0.72rem] text-[rgba(245,241,232,0.3)] tracking-[0.04em]">
            {displayNames} &copy; {new Date().getFullYear()}
          </p>

          {/* Back to top */}
          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[rgba(245,241,232,0.12)] bg-transparent text-[rgba(245,241,232,0.5)] cursor-pointer text-[0.72rem] font-semibold font-body tracking-[0.06em] hover:bg-[rgba(245,241,232,0.06)] hover:text-[rgba(245,241,232,0.8)] hover:border-[rgba(245,241,232,0.2)] transition-all duration-200"
          >
            <ArrowUp size={13} />
            Back to top
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
