'use client';

// Marketing nav — a FIXED glass pill that floats OVER the hero
// (matches the design handoff's App() nav, Landing v4.html): dark
// glass with cream type while it rides the dark hero photo, then
// "solidifies" to light glass with ink type once the page scrolls
// past the hero. Being fixed, it takes no flow space — the hero
// starts at the very top of the page (no cream strip / "weird gap"
// before the hero begins). At ≤900px the link row collapses into a
// hamburger that opens a paper drop-down panel.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Pearl, PLButton, PD, pdInkMix, pdShadowMix } from './DesignAtoms';
import { PearloomGlyph, PearloomWordmark } from '@/components/pearloom/motifs';
import { ThemeToggle } from '@/components/shell';

interface DesignNavProps {
  onGetStarted: () => void;
}

// Match the zip's App() nav: Themes · Occasions · Pricing.
const LINKS: Array<[string, string]> = [
  ['Themes', '/#themes'],
  ['Occasions', '/#occasions'],
  ['Pricing', '/#pricing'],
];

// Cream ink used while the nav rides the dark hero photo (both page themes).
const HERO_INK = '#FDFAF0';
const HERO_GOLD = '#F0C9A8';

export function DesignNav({ onGetStarted }: DesignNavProps) {
  const [open, setOpen] = useState(false);
  // `solid` flips true once the page has scrolled past the hero
  // (the hero fills the first viewport). Over the hero the pill is
  // dark glass with cream type; past it, light glass with ink type.
  // rAF-throttled so scroll only re-renders on the crossing.
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setSolid(window.scrollY > window.innerHeight - 90);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const dark = !solid; // riding the hero
  const navInk = dark ? HERO_INK : PD.ink;

  return (
    <nav
      style={{
        position: 'fixed',
        top: 16,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: '0 clamp(14px, 3vw, 28px)',
        pointerEvents: 'none', // let the hero receive clicks outside the pill
      }}
    >
      <div
        className="pd-nav-inner"
        style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', pointerEvents: 'auto' }}
      >
        <div
          className="pd-nav-pill"
          style={{
            background: dark
              ? 'rgba(20, 16, 10, 0.34)'
              : 'var(--pd-glass, rgba(244, 236, 216, 0.78))',
            backdropFilter: 'blur(16px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            border: `1px solid ${dark ? 'rgba(253, 250, 240, 0.28)' : pdInkMix(16)}`,
            borderRadius: 999,
            padding: '9px 10px 9px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            boxShadow: dark
              ? '0 10px 40px -12px rgba(0, 0, 0, 0.5)'
              : `0 12px 34px -14px ${pdShadowMix(30)}`,
            transition:
              'background var(--pl-dur-base) var(--pl-ease-out), border-color var(--pl-dur-base) var(--pl-ease-out), box-shadow var(--pl-dur-base) var(--pl-ease-out)',
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: navInk }}
          >
            <PearloomGlyph
              size={30}
              color={dark ? HERO_INK : PD.olive}
              gold={dark ? HERO_GOLD : PD.gold}
              paper={dark ? 'transparent' : PD.paper}
            />
            <span className="pd-nav-wordmark" style={{ display: 'inline-flex', color: navInk }}>
              <PearloomWordmark size={20} color={navInk} />
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
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            {LINKS.map(([label, href]) => (
              <a key={label} href={href} className="pd-nav-link" style={{ color: navInk }}>
                {label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/login"
              className="pd-nav-signin pd-nav-link"
              style={{ fontSize: 14, fontWeight: 500, padding: '8px 10px', whiteSpace: 'nowrap', color: navInk }}
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
                border: `1px solid ${dark ? 'rgba(253, 250, 240, 0.34)' : pdInkMix(20)}`,
                background: 'transparent',
                color: navInk,
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: 0,
              }}
            >
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

        {/* Mobile drawer — a light paper panel regardless of nav state. */}
        <div
          id="pd-nav-drawer"
          className={`pd-nav-drawer ${open ? '' : 'pd-nav-drawer--closed'}`}
          aria-hidden={!open}
          style={{
            display: 'none',
            position: 'absolute',
            left: 0,
            right: 0,
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
      </div>

      <style jsx>{`
        /* Nav links: quiet by default; on hover a gold thread weaves in
           from the left (BRAND §3). Color is set inline per nav state. */
        :global(.pd-nav-link) {
          position: relative;
          opacity: 0.82;
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
          :global(.pd-nav-cta) {
            padding: 7px 12px !important;
            font-size: 12px !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
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
