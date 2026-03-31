'use client';

import { C } from './colors';
import { text } from '@/lib/design-tokens';

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

export function MarketingFooter() {
  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #3D3530 0%, #322B26 100%)',
        padding: 'clamp(2.5rem,4vw,4rem) 1.25rem 2.5rem',
        borderTop: '1px solid rgba(214,198,168,0.1)',
      }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Top row: logo + columns */}
        <div className="flex flex-col md:flex-row gap-10 mb-10">
          {/* Brand */}
          <div className="md:w-[240px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.olive }} />
              <span
                className="font-[family-name:var(--eg-font-heading)] text-[1.05rem] font-bold italic"
                style={{ color: C.cream, letterSpacing: '0.03em' }}
              >
                Pearloom
              </span>
            </div>
            <p className="leading-relaxed" style={{ fontSize: text.sm, color: 'rgba(245,241,232,0.35)' }}>
              Every moment worth celebrating deserves its own world. Powered by The Loom.
            </p>
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
                      className="no-underline transition-colors duration-200 hover:text-[rgba(245,241,232,0.8)]"
                      style={{ fontSize: text.sm, color: 'rgba(245,241,232,0.45)' }}
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
        <div className="h-px mb-5" style={{ background: 'rgba(214,198,168,0.1)' }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: text.xs, color: 'rgba(245,241,232,0.2)', letterSpacing: '0.04em' }}>
            &copy; 2026 Pearloom &middot; Crafted with love &amp; intelligence
          </p>
          <div className="flex items-center gap-1.5">
            {/* Two intertwining threads — brand motif */}
            <svg width="28" height="12" viewBox="0 0 28 12" fill="none" aria-hidden="true">
              <path
                d="M0 6C5 6 7 2 14 2C21 2 23 6 28 6"
                stroke={C.gold}
                strokeWidth="1"
                opacity="0.3"
              />
              <path
                d="M0 6C5 6 7 10 14 10C21 10 23 6 28 6"
                stroke={C.olive}
                strokeWidth="1"
                opacity="0.3"
              />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
