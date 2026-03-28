'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site-nav.tsx
// Premium glass-morphism navigation — studio wizard + site viewer
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Menu, X, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { SitePage } from '@/types';
import { UserNav } from '@/components/dashboard/user-nav';
import { PearIcon } from '@/components/icons/PearloomIcons';

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

export function SiteNav({ names, pages, currentPage, user, onGoToDashboard, onStartNew }: SiteNavProps) {
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollingDown, setScrollingDown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const prevScrollY = useRef(0);

  // Scroll progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setScrollY(current);
      setScrollingDown(current > prevScrollY.current && current > 60);
      prevScrollY.current = current;
      setLastScrollY(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

          {/* ── Left: Nav links ── */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden md:flex">
            {isStudio && user ? (
              <>
                {onGoToDashboard && (
                  <button
                    onClick={onGoToDashboard}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem',
                      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em',
                      color: 'var(--eg-muted)', background: 'transparent', border: 'none',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.color = 'var(--eg-fg)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--eg-muted)';
                    }}
                  >
                    <LayoutDashboard size={14} />
                    My Sites
                  </button>
                )}
                {onStartNew && (
                  <button
                    onClick={onStartNew}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem',
                      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em',
                      color: 'var(--eg-accent)', background: 'rgba(163,177,138,0.08)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(163,177,138,0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(163,177,138,0.08)'; }}
                  >
                    <Plus size={14} />
                    New Site
                  </button>
                )}
              </>
            ) : (
              // Published site — real page links
              enabledPages.map((pg) => {
                const active = isActive(pg.slug);
                const href = getHref(pg.slug);
                return (
                  <Link
                    key={pg.id}
                    href={href}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em',
                      color: active ? 'var(--eg-fg)' : 'var(--eg-muted)',
                      borderRadius: '0.5rem',
                      background: 'transparent',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      textDecoration: 'none',
                      fontFamily: 'var(--eg-font-body)',
                      display: 'inline-flex', alignItems: 'center', flexDirection: 'column',
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--eg-fg)'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = active ? 'var(--eg-fg)' : 'var(--eg-muted)'; }}
                  >
                    {pg.label}
                    {active && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{
                          position: 'absolute', bottom: '0.2rem', left: '50%',
                          transform: 'translateX(-50%)',
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: 'var(--eg-accent)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* ── Center: Brand Logo ── */}
          <Link
            href="/"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem',
              transition: 'transform 0.3s ease',
              textDecoration: 'none',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateX(-50%) scale(1.04)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateX(-50%) scale(1)'; }}
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
                <PearIcon size={20} color="var(--eg-accent)" />
                <span style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: 'var(--eg-fg)',
                  letterSpacing: '-0.01em',
                }}>
                  {names[0]} & {names[1]}
                </span>
              </>
            )}
          </Link>

          {/* ── Right: User nav + mobile toggle ── */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
            {user && (
              <div className="hidden md:block">
                <UserNav user={user} />
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden"
              style={{
                padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer',
                border: 'none', background: 'transparent',
                color: 'var(--eg-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Mobile menu — slides in from right ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden"
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 48,
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            />

            {/* Slide-in panel from right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="md:hidden"
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                zIndex: 49,
                width: 'min(320px, 85vw)',
                background: 'rgba(245,241,232,0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column',
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)',
                paddingBottom: 'env(safe-area-inset-bottom, 24px)',
                paddingLeft: '2rem', paddingRight: '2rem',
                gap: '0.25rem',
                borderLeft: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.08)',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
                  right: '1.25rem',
                  background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
                  width: '36px', height: '36px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--eg-fg)',
                }}
              >
                <X size={16} />
              </button>

              {/* PearIcon brand mark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <PearIcon size={22} color="var(--eg-accent)" />
                <span style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1rem', color: 'var(--eg-fg)', fontWeight: 600 }}>
                  Pearloom
                </span>
              </div>

              {/* Studio actions */}
              {isStudio && user && onGoToDashboard && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => { onGoToDashboard(); setMobileOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem 0',
                    fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem',
                    color: 'var(--eg-fg)', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    marginBottom: '0.25rem',
                  }}
                >
                  <LayoutDashboard size={20} />
                  My Sites
                </motion.button>
              )}

              {/* Published pages */}
              {enabledPages.map((page, i) => {
                const active = isActive(page.slug);
                return (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 + 0.1 }}
                  >
                    <Link
                      href={getHref(page.slug)}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: '0.875rem 0',
                        fontFamily: 'var(--eg-font-heading)',
                        fontSize: '1.5rem', letterSpacing: '-0.01em',
                        color: active ? 'var(--eg-fg)' : 'var(--eg-muted)',
                        textDecoration: 'none',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        position: 'relative',
                      }}
                    >
                      {page.label}
                      {active && (
                        <span style={{
                          marginLeft: '0.5rem',
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: 'var(--eg-accent)', display: 'inline-block', flexShrink: 0,
                        }} />
                      )}
                    </Link>
                  </motion.div>
                );
              })}

              {user && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{ marginTop: 'auto' }}
                >
                  <UserNav user={user} />
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          .hidden.md\\:flex { display: flex; }
          .hidden.md\\:block { display: block; }
          .md\\:hidden { display: none; }
        }
      `}</style>
    </>
  );
}
