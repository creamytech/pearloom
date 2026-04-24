'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, Pear, PearloomLogo, Stamp } from './motifs';

export type NavLink = { label: string; href: string; hasMenu?: boolean };

const DEFAULT_LINKS: NavLink[] = [
  { label: 'Product', href: '/#product' },
  { label: 'Event Types', href: '/#event-types' },
  { label: 'Features', href: '/#features' },
  { label: 'Templates', href: '/templates' },
  { label: 'Pricing', href: '/#pricing' },
];

export function TopNav({
  active,
  links,
  ctaText = 'Start your timeline',
  ctaHref = '/wizard/new',
}: {
  active?: string;
  links?: NavLink[];
  ctaText?: string;
  ctaHref?: string;
}) {
  const { data: session, status } = useSession();
  const loggedIn = status === 'authenticated' && !!session;
  const nav = links ?? DEFAULT_LINKS;
  const [drawer, setDrawer] = useState(false);

  // Close drawer on route hash change + esc
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  return (
    <>
      <div className="topnav">
        <div className="topnav-inner">
          <Link href="/" aria-label="Pearloom home">
            <PearloomLogo />
          </Link>
          <nav className="nav-links">
            {nav.map((l) => (
              <Link key={l.label} href={l.href} className={active === l.label ? 'active' : ''}>
                {l.label}
                {l.hasMenu && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.5 }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                )}
              </Link>
            ))}
          </nav>
          <div className="pl8-topnav-cta" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {loggedIn ? (
              <>
                <Link className="btn btn-ghost btn-sm" href="/dashboard">
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm pl8-desktop-only" href="/login">
                  Log in
                </Link>
                <Link className="btn btn-primary btn-sm" href={ctaHref}>
                  <span className="pl8-desktop-only">{ctaText}</span>
                  <span className="pl8-mobile-only">Start</span>
                  <Pear size={14} tone="cream" shadow={false} />
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="pl8-mobile-only"
              style={{
                background: 'transparent',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                padding: 8,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="list" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div
          role="presentation"
          onClick={() => setDrawer(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(61,74,31,0.42)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            role="dialog"
            aria-label="Navigation"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(320px, 88vw)',
              height: '100%',
              background: 'var(--cream)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '-24px 0 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <PearloomLogo />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 8,
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {nav.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setDrawer(false)}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    background: 'transparent',
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!loggedIn && (
                <Link href="/login" className="btn btn-outline" style={{ justifyContent: 'center' }} onClick={() => setDrawer(false)}>
                  Log in
                </Link>
              )}
              <Link href={ctaHref} className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => setDrawer(false)}>
                {ctaText} <Pear size={14} tone="cream" shadow={false} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Footbar({
  primaryText = 'Made for meaningful moments.',
  ctaText = 'Create your event',
  ctaHref = '/wizard/new',
  variant = 'marketing',
  extras,
}: {
  primaryText?: string;
  ctaText?: string | null;
  ctaHref?: string;
  /** 'marketing' — full promotional footer (default).
   *  'quiet'     — no CTA, no tagline, no stamp — legal/privacy/partners. */
  variant?: 'marketing' | 'quiet';
  extras?: ReactNode;
}) {
  if (variant === 'quiet') {
    return (
      <div className="footbar footbar-quiet" style={{ padding: '18px 32px' }}>
        <div
          className="footbar-inner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            maxWidth: 1200,
            margin: '0 auto',
            flexWrap: 'wrap',
          }}
        >
          <Pear size={28} tone="cream" shadow={false} />
          <div style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.8 }}>
            © {new Date().getFullYear()} Pearloom
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/" style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.75, textDecoration: 'none' }}>
            Home
          </Link>
          <Link href="/privacy" style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.75, textDecoration: 'none' }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.75, textDecoration: 'none' }}>
            Terms
          </Link>
          <a
            href="mailto:hello@pearloom.com"
            style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.75, textDecoration: 'none' }}
          >
            hello@pearloom.com
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="footbar">
      <div className="footbar-inner">
        <Pear size={56} tone="cream" shadow={false} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--cream)' }}>
            {primaryText}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Thoughtfully designed. Beautifully connected. Built to last.
          </div>
        </div>
        {extras}
        {ctaText && (
          <Link
            href={ctaHref}
            className="btn"
            style={{ background: 'var(--cream)', color: 'var(--ink)' }}
          >
            {ctaText}
            <Pear size={14} tone="ink" shadow={false} />
          </Link>
        )}
        <div
          style={{
            fontFamily: 'var(--font-script)',
            fontSize: 18,
            color: 'var(--cream)',
            opacity: 0.85,
            whiteSpace: 'nowrap',
          }}
        >
          It&apos;s free <br />
          to get started!
        </div>
        <Stamp size={72} tone="lavender" text="WITH YOU EVERY STEP OF THE WAY" icon="heart" rotation={-10} />
      </div>
    </div>
  );
}

/** Simple subheader / page scaffold */
export function PearloomPage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="pl8" style={style}>
      {children}
    </div>
  );
}
