'use client';

// Sticky pill nav — matches the design's Pearloom Home.html
// nav exactly: Pear glyph + wordmark on the left, 5 links in
// the middle, Sign in + "Begin a thread" CTA on the right.
// At ≤900px the link row collapses into a hamburger that opens
// a paper drop-down panel (links + Sign in + CTA).

import Link from 'next/link';
import { useState } from 'react';
import { Pearl, PLButton, PD, pdInkMix, pdShadowMix } from './DesignAtoms';
import { PearloomGlyph, PearloomWordmark } from '@/components/pearloom/motifs';
import { ThemeToggle } from '@/components/shell';

interface DesignNavProps {
  onGetStarted: () => void;
}

// Absolute (/#…) so the nav works from any page (legal, etc.), not
// just the landing — on the homepage these still just scroll.
const LINKS: Array<[string, string]> = [
  ['The three acts', '/#acts'],
  ['Occasions', '/#occasions'],
  ['The Director', '/#director'],
  ['Pricing', '/#pricing'],
  ['Journal', '/#journal'],
];

export function DesignNav({ onGetStarted }: DesignNavProps) {
  const [open, setOpen] = useState(false);

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
        className="pd-nav-pill"
        style={{
          background: 'var(--pd-glass, rgba(244, 236, 216, 0.78))',
          backdropFilter: 'blur(14px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
          border: `1px solid ${pdInkMix(14)}`,
          borderRadius: 999,
          padding: '10px 14px 10px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: PD.ink }}>
          <PearloomGlyph size={32} color={PD.olive} gold={PD.gold} paper={PD.paper} />
          {/* Finalized vectorized wordmark (design system v2) — replaces
              the old Fraunces type-set lockup (MIGRATION §2). */}
          <span className="pd-nav-wordmark" style={{ display: 'inline-flex', color: PD.ink }}>
            <PearloomWordmark size={20} color={PD.ink} />
          </span>
        </Link>

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
                transition: 'opacity var(--pl-dur-fast) var(--pl-ease-out)',
                textDecoration: 'none',
                color: PD.ink,
                whiteSpace: 'nowrap',
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
          <ThemeToggle size="sm" />
          <button
            className="pd-nav-signin"
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
              whiteSpace: 'nowrap',
            }}
          >
            Sign in
          </button>
          <PLButton variant="pearl" size="sm" className="pd-nav-cta" onClick={onGetStarted}>
            Begin a thread <Pearl size={8} />
          </PLButton>
          <button
            className="pd-nav-burger"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="pd-nav-drawer"
            style={{
              display: 'none',
              width: 36,
              height: 36,
              borderRadius: 999,
              border: `1px solid ${pdInkMix(20)}`,
              background: 'transparent',
              color: PD.ink,
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              {open ? (
                <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M2 4.5 H14 M2 8 H14 M2 11.5 H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="pd-nav-drawer"
          className="pd-nav-drawer"
          style={{
            display: 'none',
            position: 'absolute',
            left: 24,
            right: 24,
            top: 'calc(100% + 8px)',
            background: PD.paperCard,
            border: `1px solid ${PD.line}`,
            borderRadius: 20,
            padding: '14px 18px 18px',
            flexDirection: 'column',
            gap: 4,
            boxShadow: `0 18px 40px -18px ${pdShadowMix(30)}`,
          }}
        >
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                padding: '10px 4px',
                fontSize: 15,
                fontWeight: 500,
                color: PD.ink,
                textDecoration: 'none',
                fontFamily: 'var(--pl-font-body)',
                borderBottom: `1px solid ${PD.line}`,
              }}
            >
              {label}
            </a>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onGetStarted();
            }}
            style={{
              textAlign: 'left',
              padding: '10px 4px',
              fontSize: 15,
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              color: PD.ink,
              fontFamily: 'var(--pl-font-body)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sign in
          </button>
          <PLButton
            variant="pearl"
            size="md"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => {
              setOpen(false);
              onGetStarted();
            }}
          >
            Begin a thread <Pearl size={8} />
          </PLButton>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${PD.line}`,
            }}
          >
            <span style={{ fontSize: 14, color: PD.ink, fontFamily: 'var(--pl-font-body)' }}>Theme</span>
            <ThemeToggle size="sm" />
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-nav-links) {
            display: none !important;
          }
          :global(.pd-nav-burger) {
            display: inline-flex !important;
          }
          :global(.pd-nav-drawer) {
            display: flex !important;
          }
        }
        @media (max-width: 600px) {
          :global(.pd-nav-signin) {
            display: none !important;
          }
          :global(.pd-nav-pill) {
            padding: 8px 10px 8px 14px !important;
            gap: 10px !important;
          }
          :global(.pd-nav-wordmark) {
            font-size: 20px !important;
          }
          :global(.pd-nav-cta) {
            padding: 7px 12px !important;
            font-size: 12px !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.pd-anim),
          :global(.pd-anim *) {
            animation: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
