'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PD, DISPLAY_STYLE, Pear } from '../design/DesignAtoms';

const LINKS = [
  { href: '/#product', label: 'Product' },
  { href: '/#templates', label: 'Templates' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#about', label: 'About' },
  { href: '/#resources', label: 'Resources', caret: true },
];

export function LandingNav({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(244,236,216,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(31,36,24,0.06)',
        padding: '18px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: PD.ink,
        }}
      >
        <Pear size={34} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <span
          style={{
            ...DISPLAY_STYLE,
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          Pearloom
        </span>
      </Link>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
        }}
        className="pl-landing-nav-links"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              color: PD.ink,
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {l.label}
            {l.caret && <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link
          href="/login"
          style={{
            color: PD.ink,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Log in
        </Link>
        <button
          onClick={onStart}
          style={{
            background: PD.oliveDeep,
            color: '#FFFEF7',
            border: 'none',
            borderRadius: 999,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 6px 16px rgba(76,90,38,0.22)',
          }}
        >
          Start planning
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pl-landing-nav-links) {
            display: none !important;
          }
        }
      `}</style>
      {/* mobile toggle is intentionally light — full menu on desktop only */}
      <noscript>{open ? '' : ''}</noscript>
    </nav>
  );
}
