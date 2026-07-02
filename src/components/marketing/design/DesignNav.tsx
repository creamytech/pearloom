'use client';

// Sticky pill nav — matches the design's Pearloom Home.html
// nav exactly: Pear glyph + wordmark on the left, 5 links in
// the middle, Sign in + "Begin a thread" CTA on the right.
// At ≤900px the link row collapses into a hamburger that opens
// a paper drop-down panel (links + Sign in + CTA).

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  // The floating pill reads "anchored" once the page is moving —
  // shadow deepens, border firms. rAF-throttled boolean so scroll
  // only re-renders on the 0↔1 crossing.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 32);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
          border: `1px solid ${pdInkMix(scrolled ? 20 : 14)}`,
          borderRadius: 999,
          padding: '10px 14px 10px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: scrolled ? `0 12px 34px -14px ${pdShadowMix(30)}` : `0 0 0 0 ${pdShadowMix(0)}`,
          transition: 'box-shadow var(--pl-dur-base) var(--pl-ease-out), border-color var(--pl-dur-base) var(--pl-ease-out)',
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
            <a key={label} href={href} className="pd-nav-link">
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle size="sm" />
          {/* A real sign-in, not the wizard — returning hosts were being
              routed into "create a site". */}
          <Link
            href="/login"
            className="pd-nav-signin pd-nav-link"
            style={{
              fontSize: 14,
              fontWeight: 500,
              padding: '8px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            Sign in
          </Link>
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
            {/* Burger ↔ X crossfade with a quarter-turn — both glyphs
                stay mounted so the swap eases instead of snapping. */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden
              style={{
                transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform var(--pl-dur-base) var(--pl-ease-emphasis)',
              }}
            >
              <g style={{ opacity: open ? 0 : 1, transition: 'opacity var(--pl-dur-quick) var(--pl-ease-out)' }}>
                <path d="M2 4.5 H14 M2 8 H14 M2 11.5 H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              <g style={{ opacity: open ? 1 : 0, transition: 'opacity var(--pl-dur-quick) var(--pl-ease-out)' }}>
                <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            </svg>
          </button>
        </div>
      </div>

      {/* Always mounted so open/close can ease; hidden (and inert)
          when closed via .pd-nav-drawer--closed. Desktop hides it
          entirely through the ≤900px media query below. */}
      <div
        id="pd-nav-drawer"
        className={`pd-nav-drawer ${open ? '' : 'pd-nav-drawer--closed'}`}
        aria-hidden={!open}
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
            tabIndex={open ? 0 : -1}
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
        <Link
          href="/login"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          style={{
            textAlign: 'left',
            padding: '10px 4px',
            fontSize: 15,
            fontWeight: 500,
            color: PD.ink,
            textDecoration: 'none',
            fontFamily: 'var(--pl-font-body)',
            whiteSpace: 'nowrap',
          }}
        >
          Sign in
        </Link>
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

      <style jsx>{`
        /* Nav links: quiet by default; on hover the ink firms and a
           gold thread weaves in from the left (BRAND §3 — thread as
           the visual atom). */
        :global(.pd-nav-link) {
          position: relative;
          opacity: 0.82;
          color: ${PD.ink};
          text-decoration: none;
          white-space: nowrap;
          transition: opacity var(--pl-dur-fast) var(--pl-ease-out);
        }
        :global(.pd-nav-link::after) {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -3px;
          height: 1.5px;
          background: ${PD.gold};
          transform: scaleX(0);
          transform-origin: left;
          transition: transform var(--pl-dur-base) var(--pl-ease-emphasis);
        }
        :global(.pd-nav-link:hover) {
          opacity: 1;
        }
        :global(.pd-nav-link:hover::after) {
          transform: scaleX(1);
        }
        :global(.pd-nav-drawer) {
          opacity: 1;
          transform: translateY(0);
          transition:
            opacity var(--pl-dur-base) var(--pl-ease-emphasis),
            transform var(--pl-dur-base) var(--pl-ease-emphasis),
            visibility 0s linear 0s;
        }
        :global(.pd-nav-drawer--closed) {
          opacity: 0;
          transform: translateY(-8px);
          visibility: hidden;
          pointer-events: none;
          transition:
            opacity var(--pl-dur-fast) var(--pl-ease-out),
            transform var(--pl-dur-fast) var(--pl-ease-out),
            visibility 0s linear var(--pl-dur-fast);
        }
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
          :global(.pd-nav-drawer),
          :global(.pd-nav-drawer--closed),
          :global(.pd-nav-link),
          :global(.pd-nav-link::after) {
            transition: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
