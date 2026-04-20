'use client';

// ─────────────────────────────────────────────────────────────
// MarketingNav — editorial replacement for the dark-band nav.
// Fixes:
//   • WCAG contrast (audit flagged text-white/75 on --pl-ink)
//   • Visual mismatch between dark nav and cream hero below it
//   • No theme toggle on the public surface
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/shell';
import { AmbientNav } from '@/components/brand/AmbientNav';
import { SquishyButton } from '@/components/brand/groove';

interface MarketingNavProps {
  onGetStarted: () => void;
}

const NAV_LINKS = [
  { label: 'Event OS', href: '#event-os' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'The Loom', href: '#the-loom' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function MarketingNav({ onGetStarted }: MarketingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Placeholder — keeps page layout honest while the real nav
          floats. Matches the nav's 64px height exactly. */}
      <div aria-hidden style={{ height: 64 }} />
      <AmbientNav forceVisible={mobileOpen} zIndex={100}>
      <nav
        style={{
          height: 64,
          padding: '0 clamp(20px, 5vw, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          background: scrolled
            ? 'color-mix(in oklab, var(--pl-cream) 88%, transparent)'
            : 'transparent',
          backdropFilter: scrolled ? 'saturate(140%) blur(14px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'saturate(140%) blur(14px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--pl-divider)' : '1px solid transparent',
          transition:
            'background var(--pl-dur-base) var(--pl-ease-out), border-color var(--pl-dur-base) var(--pl-ease-out), backdrop-filter var(--pl-dur-base) var(--pl-ease-out)',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--pl-ink)',
            textDecoration: 'none',
            fontFamily: 'var(--pl-font-display)',
            fontSize: '1.15rem',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            fontVariationSettings: '"opsz" 144, "SOFT" 50',
          }}
        >
          <PearloomMark />
          <span>
            Pearloom
            <span
              aria-hidden
              style={{
                color: 'var(--pl-olive)',
                fontStyle: 'italic',
                marginLeft: 4,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                fontSize: '0.92em',
              }}
            >
              .
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div
          className="pl-mn-links"
          style={{
            display: 'flex',
            gap: 28,
            alignItems: 'center',
          }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                color: 'var(--pl-ink-soft)',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 500,
                letterSpacing: '0.005em',
                position: 'relative',
                paddingBottom: 2,
                transition: 'color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--pl-ink)';
                const u = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (u) u.style.transform = 'scaleX(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--pl-ink-soft)';
                const u = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (u) u.style.transform = 'scaleX(0)';
              }}
            >
              {l.label}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: -4,
                  width: '100%',
                  height: 1,
                  background: 'var(--pl-groove-terra)',
                  transformOrigin: 'left',
                  transform: 'scaleX(0)',
                  transition: 'transform var(--pl-dur-base) var(--pl-ease-out)',
                }}
              />
            </a>
          ))}
        </div>

        {/* Right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <SquishyButton
            className="pl-mn-cta"
            onClick={onGetStarted}
            size="sm"
            palette="sunrise"
          >
            Start free
          </SquishyButton>
          <button
            className="pl-mn-burger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--pl-divider)',
              borderRadius: 'var(--pl-radius-md)',
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pl-ink)',
              cursor: 'pointer',
            }}
          >
            <Menu size={18} />
          </button>
        </div>
      </nav>
      </AmbientNav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: 'color-mix(in oklab, var(--pl-ink) 50%, transparent)',
                backdropFilter: 'blur(4px)',
              }}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                zIndex: 201,
                width: 'min(82vw, 360px)',
                background: 'var(--pl-cream-card)',
                borderLeft: '1px solid var(--pl-divider)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-24px 0 60px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  height: 64,
                  padding: '0 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--pl-divider)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: '1.12rem',
                    color: 'var(--pl-ink)',
                  }}
                >
                  Pearloom
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--pl-divider)',
                    borderRadius: 'var(--pl-radius-md)',
                    width: 36,
                    height: 36,
                    color: 'var(--pl-ink)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                {NAV_LINKS.map((l, i) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={`pl-rise pl-rise-d${Math.min(i + 1, 6)}`}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--pl-radius-md)',
                      color: 'var(--pl-ink)',
                      textDecoration: 'none',
                      fontFamily: 'var(--pl-font-display)',
                      fontSize: '1.18rem',
                      letterSpacing: '-0.01em',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{l.label}</span>
                    <span style={{ color: 'var(--pl-olive)', fontFamily: 'var(--pl-font-mono)', fontSize: '0.66rem', letterSpacing: '0.18em' }}>
                      0{i + 1}
                    </span>
                  </a>
                ))}
              </div>

              <div style={{ padding: 20, borderTop: '1px solid var(--pl-divider)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SquishyButton
                  onClick={() => {
                    setMobileOpen(false);
                    onGetStarted();
                  }}
                  size="lg"
                  palette="sunrise"
                  fullWidth
                >
                  Start weaving — free
                </SquishyButton>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.74rem',
                    color: 'var(--pl-muted)',
                  }}
                >
                  <span>Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Responsive — bigger break than the rest of the app to keep the nav airy */}
      <style jsx>{`
        @media (max-width: 880px) {
          :global(.pl-mn-links) { display: none !important; }
          :global(.pl-mn-burger) { display: inline-flex !important; }
        }
        @media (max-width: 520px) {
          :global(.pl-mn-cta) { display: none !important; }
        }
      `}</style>
    </>
  );
}

function PearloomMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--pl-ink)" strokeWidth="1.4" />
      <path
        d="M12 3c2.5 4 2.5 14 0 18M3 12c4-2.5 14-2.5 18 0"
        stroke="var(--pl-olive)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
