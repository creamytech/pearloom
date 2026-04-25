'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  const [scrolled, setScrolled] = useState(false);

  // Sliding underline indicator follows hover, falls back to active
  // when no hover. Measured in <Link> ref refs.
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [underline, setUnderline] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // Measure the active or hovered link to position the underline.
  useLayoutEffect(() => {
    if (!navRef.current) return;
    const target = hoveredLabel ?? active;
    if (!target) {
      setUnderline((u) => ({ ...u, visible: false }));
      return;
    }
    const el = linkRefs.current.get(target);
    if (!el) {
      setUnderline((u) => ({ ...u, visible: false }));
      return;
    }
    const navRect = navRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setUnderline({
      left: elRect.left - navRect.left + 14, // strip the link's left padding
      width: elRect.width - 28,               // and right padding
      visible: true,
    });
  }, [hoveredLabel, active, nav]);

  // Scroll-aware: shrink + tighten glass past 32px.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const captureLink = (label: string) => (el: HTMLAnchorElement | null) => {
    if (el) linkRefs.current.set(label, el);
    else linkRefs.current.delete(label);
  };

  return (
    <>
      <div className={`topnav${scrolled ? ' topnav-scrolled' : ''}`}>
        <div className="topnav-inner">
          <Link
            href="/"
            aria-label="Pearloom home"
            className="pl8-topnav-logo"
            style={{ display: 'inline-flex' }}
          >
            <PearloomLogo />
          </Link>
          <nav className="nav-links" ref={navRef}>
            {/* Sliding underline that follows hover/active */}
            <span
              aria-hidden="true"
              className="pl8-nav-underline"
              style={{
                position: 'absolute',
                bottom: 6,
                left: underline.left,
                width: underline.width,
                opacity: underline.visible ? 1 : 0,
                transform: underline.visible ? 'scaleX(1)' : 'scaleX(0.6)',
              }}
            />
            {nav.map((l) => (
              <Link
                key={l.label}
                ref={captureLink(l.label)}
                href={l.href}
                className={active === l.label ? 'active' : ''}
                onMouseEnter={() => setHoveredLabel(l.label)}
                onMouseLeave={() => setHoveredLabel(null)}
                onFocus={() => setHoveredLabel(l.label)}
                onBlur={() => setHoveredLabel(null)}
              >
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
                <Link className="btn btn-primary btn-sm pl8-btn-sheen" href={ctaHref}>
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
              className="pl8-mobile-only pl8-burger"
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
        <ScrollProgress />
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div
          role="presentation"
          onClick={() => setDrawer(false)}
          className="pl8-drawer-backdrop"
        >
          <div
            role="dialog"
            aria-label="Navigation"
            onClick={(e) => e.stopPropagation()}
            className="pl8-drawer-panel"
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
              {nav.map((l, i) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setDrawer(false)}
                  className="pl8-drawer-link"
                  style={{ animationDelay: `${i * 40}ms` }}
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
              <Link href={ctaHref} className="btn btn-primary pl8-btn-sheen" style={{ justifyContent: 'center' }} onClick={() => setDrawer(false)}>
                {ctaText} <Pear size={14} tone="cream" shadow={false} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------
   ScrollProgress — slim 2px bar pinned to the bottom of the topnav,
   filling left→right as the page scrolls. Uses scrollHeight so the
   bar reaches 100% exactly when the user hits the page end.
   ------------------------------------------------------------------ */
function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    function tick() {
      const h = document.documentElement;
      const scrolled = h.scrollTop || document.body.scrollTop;
      const max = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
      setPct(max <= 0 ? 0 : Math.min(100, Math.max(0, (scrolled / max) * 100)));
    }
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, []);
  return (
    <div className="pl8-scroll-progress" aria-hidden="true">
      <div className="pl8-scroll-progress-bar" style={{ width: `${pct}%` }} />
    </div>
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
            className="btn pl8-btn-sheen"
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
    <div className="pl8 pl8-page-enter" style={style}>
      {children}
    </div>
  );
}
