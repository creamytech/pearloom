'use client';

// Sticky pill nav — matches the design's Pearloom Home.html
// nav exactly: Pear glyph + wordmark on the left, 5 links in
// the middle, Sign in + "Begin a thread" CTA on the right.

import { Pear, Pearl, PLButton, PD } from './DesignAtoms';

interface DesignNavProps {
  onGetStarted: () => void;
}

const LINKS: Array<[string, string]> = [
  ['The three acts', '#acts'],
  ['Occasions', '#occasions'],
  ['The Director', '#director'],
  ['Pricing', '#pricing'],
  ['Journal', '#journal'],
];

export function DesignNav({ onGetStarted }: DesignNavProps) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 14,
        zIndex: 50,
        margin: '14px auto 0',
        maxWidth: 1320,
        padding: '0 24px',
      }}
    >
      <div
        style={{
          background: 'rgba(244, 236, 216, 0.78)',
          backdropFilter: 'blur(14px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
          border: '1px solid rgba(31,36,24,0.14)',
          borderRadius: 999,
          padding: '10px 14px 10px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: PD.ink }}>
          <Pear size={30} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <span
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontVariationSettings: '"SOFT" 80, "opsz" 144',
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: PD.ink,
            }}
          >
            Pearloom
          </span>
        </a>

        <div
          className="pd-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 30,
            fontSize: 14,
            fontWeight: 500,
            color: PD.ink,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{
                opacity: 0.82,
                transition: 'opacity 160ms',
                textDecoration: 'none',
                color: PD.ink,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.82';
              }}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onGetStarted}
            style={{
              fontSize: 14,
              fontWeight: 500,
              opacity: 0.8,
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              color: PD.ink,
              fontFamily: 'var(--pl-font-body)',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
          <PLButton variant="ink" size="sm" onClick={onGetStarted}>
            Begin a thread <Pearl size={8} />
          </PLButton>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-nav-links) {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
