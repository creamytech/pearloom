'use client';

import { C } from './colors';
import { text } from '@/lib/design-tokens';
import { PearIcon } from '@/components/icons/PearloomIcons';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'The Loom', href: '#the-loom' },
      { label: 'Editor', href: '#editor' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Occasions',
    links: [
      { label: 'Weddings', href: '#occasions' },
      { label: 'Birthdays', href: '#occasions' },
      { label: 'Anniversaries', href: '#occasions' },
      { label: 'All Events', href: '#occasions' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: 'mailto:hello@pearloom.com' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

function SocialIcon({ type }: { type: 'twitter' | 'instagram' }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (type === 'twitter') {
    return (
      <svg {...props}>
        <path d="M4 4l6.5 8L4 20h2l5.3-6.5L15 20h5l-6.8-8.5L19.5 4h-2l-5 6.2L9 4H4z" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MarketingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #3D3530 0%, #2A2420 50%, #322B26 100%)',
        padding: 'clamp(3rem,5vw,5rem) 1.25rem 2.5rem',
        borderTop: '1px solid rgba(214,198,168,0.1)',
      }}
    >
      {/* Subtle radial glow pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 600px 400px at 20% 30%, rgba(163,177,138,0.06) 0%, transparent 70%),
                       radial-gradient(ellipse 500px 300px at 80% 70%, rgba(214,198,168,0.05) 0%, transparent 70%)`,
        }}
      />
      {/* Faint dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,241,232,0.03) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="max-w-[960px] mx-auto relative">
        {/* Top row: logo + columns */}
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          {/* Brand column */}
          <div className="md:w-[260px] flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-4">
              <PearIcon size={30} color={C.olive} />
              <span
                className="font-[family-name:var(--eg-font-heading)] text-[1.4rem] font-bold italic"
                style={{ color: C.cream, letterSpacing: '0.03em' }}
              >
                Pearloom
              </span>
            </div>
            <p className="leading-relaxed mb-6" style={{ fontSize: text.sm, color: 'rgba(245,241,232,0.4)' }}>
              Every moment worth celebrating deserves its own world. Powered by The Loom.
            </p>

            {/* Newsletter signup */}
            <div className="mb-2">
              <p
                className="font-semibold tracking-[0.1em] uppercase mb-3"
                style={{ fontSize: text.xs, color: 'rgba(245,241,232,0.3)' }}
              >
                Stay in the loop
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex gap-0"
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  aria-label="Email address for newsletter"
                  className="flex-1 min-w-0 px-3 py-2 rounded-l-md border-0 outline-none transition-colors duration-200 focus:ring-1"
                  style={{
                    background: 'rgba(245,241,232,0.08)',
                    color: C.cream,
                    fontSize: text.sm,
                    borderRight: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-r-md font-semibold tracking-wider uppercase transition-opacity duration-200 hover:opacity-85 cursor-pointer"
                  style={{
                    background: C.olive,
                    color: '#fff',
                    fontSize: text.xs,
                    border: 'none',
                  }}
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6">
            {COLUMNS.map(col => (
              <div key={col.title}>
                <div
                  className="font-bold tracking-[0.16em] uppercase mb-3"
                  style={{ fontSize: text.xs, color: 'rgba(245,241,232,0.3)' }}
                >
                  {col.title}
                </div>
                <div className="flex flex-col gap-2">
                  {col.links.map(link => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="no-underline group relative inline-block w-fit"
                      style={{ fontSize: text.sm, color: 'rgba(245,241,232,0.45)' }}
                    >
                      <span className="transition-colors duration-200 group-hover:text-[rgba(245,241,232,0.85)]">
                        {link.label}
                      </span>
                      {/* Animated underline */}
                      <span
                        className="absolute left-0 bottom-[-2px] h-[1px] w-0 group-hover:w-full transition-all duration-300 ease-out"
                        style={{ background: C.olive }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-5" style={{ background: 'rgba(214,198,168,0.12)' }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ fontSize: text.xs, color: 'rgba(245,241,232,0.25)', letterSpacing: '0.04em' }}>
            &copy; 2026 Pearloom &middot; Crafted with love &amp; intelligence
          </p>

          <div className="flex items-center gap-4">
            {/* Thread SVG motif */}
            <svg width="44" height="14" viewBox="0 0 44 14" fill="none" aria-hidden="true">
              <path
                d="M0 7C6 7 9 2 16 2C23 2 25 7 32 7C37 7 40 4 44 4"
                stroke={C.gold}
                strokeWidth="1.2"
                opacity="0.35"
              />
              <path
                d="M0 7C4 7 7 12 14 12C21 12 24 7 30 7C36 7 40 10 44 10"
                stroke={C.olive}
                strokeWidth="1.2"
                opacity="0.3"
              />
            </svg>

            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              <a
                href="#"
                aria-label="Follow us on X"
                className="transition-opacity duration-200 hover:opacity-80"
                style={{ color: 'rgba(245,241,232,0.35)' }}
              >
                <SocialIcon type="twitter" />
              </a>
              <a
                href="#"
                aria-label="Follow us on Instagram"
                className="transition-opacity duration-200 hover:opacity-80"
                style={{ color: 'rgba(245,241,232,0.35)' }}
              >
                <SocialIcon type="instagram" />
              </a>
            </div>

            {/* Back to top */}
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-80 cursor-pointer bg-transparent border-0"
              style={{ color: 'rgba(245,241,232,0.35)', fontSize: text.xs, letterSpacing: '0.06em' }}
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
