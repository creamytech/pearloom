'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site-nav.tsx
// Premium glass-morphism navigation — studio wizard + site viewer
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Menu, X, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { SitePage } from '@/types';
import { UserNav } from '@/components/dashboard/user-nav';

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
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Scroll progress bar (only for non-studio/published sites)
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isStudio = names[0] === 'Pearloom'; // Studio mode (wizard) vs published site
  const enabledPages = pages.filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  const isActive = (slug: string) => {
    // Server-provided currentPage takes priority
    if (currentPage !== undefined) {
      return slug === '' ? currentPage === '' : currentPage === slug;
    }
    // Client-side fallback using pathname
    if (slug === '') return pathname.split('/').filter(Boolean).length === 1;
    return pathname.endsWith(`/${slug}`);
  };

  const getHref = (slug: string, basePath: string) => {
    // basePath is extracted from window.location in client, or passed in via pathname
    // For SEO, use real URLs for all pages
    if (slug === '') return basePath; // homepage
    return `${basePath}/${slug}`;
  };

  // Extract base domain path: e.g. '/sites/shaunaandben' from pathname
  const basePath = (() => {
    const parts = pathname.split('/');
    // pathname: /sites/domain[/page]
    if (parts[1] === 'sites') return `/${parts[1]}/${parts[2]}`;
    // Direct subdomain: pathname IS the page
    return '/' + parts[1];
  })();

  return (
    <>
      <motion.nav
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          transition: 'all 0.35s ease',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: scrolled || pathname !== '/'
            ? 'rgba(245,241,232,0.88)'
            : 'transparent',
          backdropFilter: scrolled || pathname !== '/' ? 'blur(20px) saturate(1.6)' : 'none',
          WebkitBackdropFilter: scrolled || pathname !== '/' ? 'blur(20px) saturate(1.6)' : 'none',
          borderBottom: scrolled || pathname !== '/' ? '1px solid rgba(0,0,0,0.04)' : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.04)' : 'none',
          padding: scrolled ? '0.75rem 0' : '1.5rem 0',
        }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Scroll progress bar — published sites only */}
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
          height: '3.5rem',
          overflow: 'visible',
        }}>

          {/* ── Left: Nav links or Studio actions ── */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden md:flex">
            {isStudio && user ? (
              // Studio wizard navigation
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
                const href = getHref(pg.slug, basePath);
                return (
                  <Link
                    key={pg.id}
                    href={href}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em',
                      color: active ? 'var(--eg-fg)' : 'var(--eg-muted)',
                      borderRadius: '0.5rem',
                      background: active ? 'rgba(0,0,0,0.04)' : 'transparent',
                      transition: 'all 0.2s ease', position: 'relative',
                      textDecoration: 'none', fontFamily: 'var(--eg-font-body)',
                      display: 'inline-flex', alignItems: 'center',
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--eg-fg)'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.color = active ? 'var(--eg-fg)' : 'var(--eg-muted)'; }}
                  >
                    {pg.label}
                    {active && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{
                          position: 'absolute', bottom: '0.25rem', left: '1rem', right: '1rem',
                          height: '2px', borderRadius: '100px', background: 'var(--eg-accent)',
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
              transition: 'transform 0.3s ease',
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
                style={{ objectFit: 'contain', width: 'auto', height: '34px', maxWidth: '140px' }}
                priority
              />
            ) : (
              <span style={{
                fontFamily: 'var(--eg-font-heading)',
                fontWeight: 600,
                fontSize: '1.15rem',
                color: 'var(--eg-fg)',
                letterSpacing: '-0.01em',
              }}>
                {names[0]} & {names[1]}
              </span>
            )}
          </Link>

          {/* ── Right: User nav + mobile toggle ── */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
            {user && (
              <div className="hidden md:block">
                <UserNav user={user} />
              </div>
            )}

            {/* Mobile hamburger */}
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

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="md:hidden"
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(245,241,232,0.97)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '2rem',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 24px)',
            }}
          >
            {/* Mobile: studio actions */}
            {isStudio && user && onGoToDashboard && (
              <motion.button
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                onClick={() => { onGoToDashboard(); setMobileOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  fontFamily: 'var(--eg-font-heading)', fontSize: '2rem',
                  color: 'var(--eg-fg)', background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                <LayoutDashboard size={24} />
                My Sites
              </motion.button>
            )}

            {/* Mobile: published pages */}
            {enabledPages.map((page, i) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 + 0.1 }}
              >
                <Link
                  href={getHref(page.slug, basePath)}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontFamily: 'var(--eg-font-heading)',
                    fontSize: '2.5rem', letterSpacing: '-0.01em',
                    color: isActive(page.slug) ? 'var(--eg-fg)' : 'var(--eg-muted)',
                    textDecoration: 'none',
                  }}
                >
                  {page.label}
                </Link>
              </motion.div>
            ))}

            {user && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <UserNav user={user} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
