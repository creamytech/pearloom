'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site-nav.tsx
// Always-drawer navigation — hamburger on both mobile + desktop
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Menu, X, LayoutDashboard, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { SitePage } from '@/types';
import { UserNav } from '@/components/dashboard/user-nav';
import { signOut } from 'next-auth/react';
import {
  PearIcon,
  CalendarHeartIcon,
  GiftIcon,
  LocationPinIcon,
  EnvelopeIcon,
  PearlIcon,
  StarburstIcon,
  ElegantHeartIcon,
} from '@/components/icons/PearloomIcons';

interface SiteNavProps {
  names: [string, string];
  pages: SitePage[];
  /** Current sub-page slug for server-side active highlighting (e.g. 'travel') */
  currentPage?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  /** If provided, studio-mode links (Dashboard / New Site) are shown */
  onGoToDashboard?: () => void;
  onStartNew?: () => void;
}

/** Map page slugs to the appropriate icon component */
function PageIcon({ slug, size = 18 }: { slug: string; size?: number }) {
  const color = 'var(--eg-accent)';
  if (slug === '' || slug === 'our-story' || slug === 'story') return <ElegantHeartIcon size={size} color={color} />;
  if (slug === 'events' || slug === 'ceremony' || slug === 'schedule') return <CalendarHeartIcon size={size} color={color} />;
  if (slug === 'registry') return <GiftIcon size={size} color={color} />;
  if (slug === 'travel') return <LocationPinIcon size={size} color={color} />;
  if (slug === 'rsvp') return <EnvelopeIcon size={size} color={color} />;
  if (slug === 'faq') return <PearlIcon size={size} color={color} />;
  if (slug === 'photos') return <StarburstIcon size={size} color={color} />;
  // Default fallback — PearlIcon is clearly recognisable at small sizes
  return <PearlIcon size={size} color={color} />;
}

export function SiteNav({ names, pages, currentPage, user, onGoToDashboard, onStartNew }: SiteNavProps) {
  const [scrollY, setScrollY] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const prevScrollY = useRef(0);

  // Scroll progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setScrollY(current);
      prevScrollY.current = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const isAtTop = scrollY < 20;
  const scrolled = scrollY > 60;

  const isStudio = names[0] === 'Pearloom';
  const enabledPages = pages.filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  const isActive = (slug: string) => {
    if (currentPage !== undefined) {
      return slug === '' ? currentPage === '' : currentPage === slug;
    }
    if (slug === '') return pathname.split('/').filter(Boolean).length === 1;
    return pathname.endsWith(`/${slug}`);
  };

  const basePath = (() => {
    const parts = pathname.split('/');
    if (parts[1] === 'sites') return `/${parts[1]}/${parts[2]}`;
    return '/' + parts[1];
  })();

  const getHref = (slug: string) => {
    if (slug === '') return basePath;
    return `${basePath}/${slug}`;
  };

  // Background behavior: scroll down = opaque, at top = transparent
  const navBg = isAtTop && !isStudio
    ? 'transparent'
    : 'rgba(245,241,232,0.95)';
  const navBackdrop = isAtTop && !isStudio ? 'none' : 'blur(12px) saturate(1.5)';
  const navBorder = isAtTop && !isStudio ? '1px solid transparent' : '1px solid rgba(0,0,0,0.04)';

  return (
    <>
      <motion.nav
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: navBg,
          backdropFilter: navBackdrop,
          WebkitBackdropFilter: navBackdrop,
          borderBottom: navBorder,
          boxShadow: scrolled && !isAtTop ? '0 4px 30px rgba(0,0,0,0.04)' : 'none',
          transition: 'background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, padding 0.35s ease',
          padding: scrolled ? '0.6rem 0' : '1.25rem 0',
        }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Scroll progress bar */}
        {!isStudio && (
          <motion.div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '2px', scaleX, transformOrigin: '0%',
              background: 'linear-gradient(90deg, var(--eg-accent), color-mix(in srgb, var(--eg-accent) 60%, #fff))',
            }}
          />
        )}

        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '3.25rem',
          overflow: 'visible',
        }}>

          {/* ── Left: Couple name / brand ── */}
          <Link
            href={basePath}
            style={{
              display: 'flex', alignItems: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s ease',
              textDecoration: 'none',
              flex: 1,
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {isStudio ? (
              <Image
                src="/logo.png"
                alt="Pearloom"
                width={130}
                height={40}
                style={{ objectFit: 'contain', width: 'auto', height: '32px', maxWidth: '140px' }}
                priority
              />
            ) : (
              <>
                <PearIcon size={18} color="var(--eg-accent)" />
                <span style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: 'var(--eg-fg)',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}>
                  {names[0]} & {names[1]}
                </span>
              </>
            )}
          </Link>

          {/* ── Right: User nav + hamburger menu ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user && (
              <UserNav user={user} onDashboard={onGoToDashboard} />
            )}
            {/* Hamburger — always visible on both mobile and desktop */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              style={{
                padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer',
                border: 'none', background: 'transparent',
                color: 'var(--eg-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {drawerOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Navigation Drawer — slides in from right on all viewports ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 48,
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            />

            {/* Slide-in panel from right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                zIndex: 49,
                width: 'min(320px, 100vw)',
                background: 'rgba(245,241,232,0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom, 24px)',
                borderLeft: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.1)',
                overflowY: 'auto',
              }}
            >
              {/* Drawer header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'calc(env(safe-area-inset-top, 0px) + 1.5rem) 1.5rem 1.25rem',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: 400,
                  color: 'var(--eg-fg)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.15,
                }}>
                  {isStudio ? 'Pearloom' : `${names[0]} & ${names[1]}`}
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  style={{
                    background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
                    width: '36px', height: '36px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--eg-fg)', flexShrink: 0,
                    transition: 'background 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Studio actions */}
              {isStudio && user && (
                <div style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                  {onGoToDashboard && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      onClick={() => { onGoToDashboard(); setDrawerOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        width: '100%',
                        minHeight: '56px',
                        padding: '0 1.5rem',
                        fontFamily: 'var(--eg-font-body)', fontSize: '0.95rem', fontWeight: 500,
                        color: 'var(--eg-fg)', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(163,177,138,0.08)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <LayoutDashboard size={18} color="var(--eg-accent)" />
                      My Sites
                    </motion.button>
                  )}
                  {onStartNew && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 }}
                      onClick={() => { onStartNew(); setDrawerOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        width: '100%',
                        minHeight: '56px',
                        padding: '0 1.5rem',
                        fontFamily: 'var(--eg-font-body)', fontSize: '0.95rem', fontWeight: 500,
                        color: 'var(--eg-fg)', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(163,177,138,0.08)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Plus size={18} color="var(--eg-accent)" />
                      New Site
                    </motion.button>
                  )}
                </div>
              )}

              {/* Page links */}
              <nav style={{ flex: 1, padding: '0.75rem 0' }}>
                {enabledPages.map((page, i) => {
                  const active = isActive(page.slug);
                  return (
                    <motion.div
                      key={page.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.055 + 0.06 }}
                    >
                      <Link
                        href={getHref(page.slug)}
                        onClick={() => setDrawerOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem',
                          minHeight: '56px',
                          padding: '0 1.5rem',
                          fontFamily: 'var(--eg-font-body)',
                          fontSize: '0.95rem', fontWeight: active ? 600 : 500,
                          color: active ? 'var(--eg-fg)' : 'var(--eg-muted)',
                          textDecoration: 'none',
                          position: 'relative',
                          transition: 'background 0.15s ease, color 0.15s ease',
                          background: active ? 'rgba(163,177,138,0.08)' : 'transparent',
                          borderLeft: active ? '3px solid #A3B18A' : '3px solid transparent',
                        }}
                        onMouseOver={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.08)';
                        }}
                        onMouseOut={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <PageIcon slug={page.slug} size={18} />
                        <span style={{ flex: 1 }}>{page.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Bottom area — account row + powered by */}
              <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)', padding: '1rem 1.5rem' }}>
                {user && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}
                  >
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.image} alt="" role="presentation" style={{ width: '2rem', height: '2rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--eg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LogOut size={12} color="#fff" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--eg-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Your Account'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <button
                      onClick={() => { setDrawerOpen(false); signOut(); }}
                      title="Sign out"
                      style={{
                        background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '0.5rem',
                        padding: '0.4rem', cursor: 'pointer', color: 'var(--eg-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'background 0.15s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                    >
                      <LogOut size={14} />
                    </button>
                  </motion.div>
                )}
                <p style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--eg-muted)',
                  opacity: 0.5,
                  margin: 0,
                }}>
                  Powered by Pearloom
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
