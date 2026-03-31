'use client';

import { colors as C, text } from '@/lib/design-tokens';
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
      style={{
        background: C.ink,
        padding: 'clamp(3rem,5vw,5rem) 1.25rem 2.5rem',
        borderTop: `1px solid ${C.darkBorder}`,
      }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Top row: logo + columns */}
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          {/* Brand column */}
          <div className="md:w-[260px] flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-4">
              <PearIcon size={30} color={C.olive} />
              <span
                className="font-[family-name:var(--eg-font-heading)] text-[1.4rem] font-bold italic"
                style={{ color: C.darkHeading, letterSpacing: '0.03em' }}
              >
                Pearloom
              </span>
            </div>
            <p className="leading-relaxed mb-6" style={{ fontSize: text.sm, color: C.darkText }}>
              Every moment worth celebrating deserves its own world. Powered by The Loom.
            </p>

            {/* Newsletter signup */}
            <div className="mb-2">
              <p
                className="font-semibold tracking-[0.1em] uppercase mb-3"
                style={{ fontSize: text.xs, color: C.darkText }}
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
                  className="flex-1 min-w-0 px-3 py-2 rounded-l-md border-0 outline-none"
                  style={{
                    background: 'rgba(245,241,232,0.08)',
                    color: C.darkHeading,
                    fontSize: text.sm,
                  }}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-r-md font-semibold tracking-wider uppercase cursor-pointer"
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
                  style={{ fontSize: text.xs, color: C.darkHeading }}
                >
                  {col.title}
                </div>
                <div className="flex flex-col gap-2">
                  {col.links.map(link => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="no-underline hover:underline"
                      style={{ fontSize: text.sm, color: C.darkText }}
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
        <div className="h-px mb-5" style={{ background: C.darkBorder }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ fontSize: text.xs, color: C.darkText, letterSpacing: '0.04em' }}>
            &copy; 2026 Pearloom &middot; Crafted with love &amp; intelligence
          </p>

          <div className="flex items-center gap-4">
            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              <a
                href="#"
                aria-label="Follow us on X"
                className="hover:opacity-80"
                style={{ color: C.darkText }}
              >
                <SocialIcon type="twitter" />
              </a>
              <a
                href="#"
                aria-label="Follow us on Instagram"
                className="hover:opacity-80"
                style={{ color: C.darkText }}
              >
                <SocialIcon type="instagram" />
              </a>
            </div>

            {/* Back to top */}
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 hover:opacity-80 cursor-pointer bg-transparent border-0"
              style={{ color: C.darkText, fontSize: text.xs, letterSpacing: '0.06em' }}
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
