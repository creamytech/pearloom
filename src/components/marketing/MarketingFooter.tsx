'use client';

import { layout } from '@/lib/design-tokens';
import { PearIcon } from '@/components/icons/PearloomIcons';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'Partner Program', href: '/partners' },
      { label: 'For Photographers', href: '/partners' },
      { label: 'For Planners', href: '/partners' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

function SocialIcon({ type }: { type: 'twitter' | 'instagram' }) {
  const props = {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (type === 'twitter') {
    return <svg {...props}><path d="M4 4l6.5 8L4 20h2l5.3-6.5L15 20h5l-6.8-8.5L19.5 4h-2l-5 6.2L9 4H4z" /></svg>;
  }
  return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" /></svg>;
}

export function MarketingFooter() {
  return (
    <footer
      className="bg-[var(--pl-ink)] border-t border-[var(--pl-dark-border)] py-[clamp(3rem,5vw,5rem)] px-6 pb-10"
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        {/* Top row */}
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          {/* Brand column */}
          <div className="md:w-[260px] flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-4">
              <PearIcon size={28} color="var(--pl-olive)" />
              <span className="font-heading text-[1.35rem] font-bold italic tracking-[0.03em] text-[var(--pl-dark-heading)]">
                Pearloom
              </span>
            </div>
            <p className="text-[0.85rem] text-[var(--pl-dark-text)] leading-relaxed mb-6">
              Preserving the ephemeral through the precision of the future. The digital atelier for your life&rsquo;s work.
            </p>

            {/* Newsletter */}
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-dark-text)] mb-3">
                Stay in the loop
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-0">
                <input
                  type="email"
                  placeholder="your@email.com"
                  aria-label="Email address for newsletter"
                  className="flex-1 min-w-0 px-3 py-2 rounded-l-[var(--pl-radius-sm)] border-0 outline-none text-[max(16px,0.85rem)] text-[var(--pl-dark-heading)] bg-white/[0.08] placeholder:text-white/30"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-r-[var(--pl-radius-sm)] font-semibold tracking-widest uppercase cursor-pointer bg-[var(--pl-olive)] text-white text-[0.62rem] border-0 hover:bg-[var(--pl-olive-hover)] transition-colors duration-150"
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="text-[0.65rem] font-bold tracking-[0.16em] uppercase text-[var(--pl-dark-heading)] mb-3">
                  {col.title}
                </div>
                <div className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-[0.85rem] text-[var(--pl-dark-text)] no-underline hover:underline hover:text-white/80 transition-colors duration-150"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--pl-dark-border)] mb-5" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[0.68rem] text-[var(--pl-dark-text)] tracking-[0.04em]">
            &copy; 2026 Pearloom &middot; Crafted with love &amp; intelligence
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 text-[var(--pl-dark-text)]">
              <a href="#" aria-label="Follow on X" className="hover:opacity-80 transition-opacity">
                <SocialIcon type="twitter" />
              </a>
              <a href="#" aria-label="Follow on Instagram" className="hover:opacity-80 transition-opacity">
                <SocialIcon type="instagram" />
              </a>
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-[var(--pl-dark-text)] text-[0.68rem] tracking-[0.06em] cursor-pointer bg-transparent border-0 hover:opacity-80 transition-opacity"
              aria-label="Back to top"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 15l-6-6-6 6" />
              </svg>
              <span className="uppercase font-semibold hidden sm:inline">Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
