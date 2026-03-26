'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site-nav.tsx
// Premium glass-morphism navigation
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { SitePage } from '@/types';
import { UserNav } from '@/components/dashboard/user-nav';

interface SiteNavProps {
  names: [string, string];
  pages: SitePage[];
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function SiteNav({ names, pages, user }: SiteNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enabledPages = pages.filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  const isActive = (slug: string) => {
    if (slug === 'our-story') return pathname === '/';
    return pathname === `/${slug}`;
  };

  const getHref = (slug: string) => {
    if (slug === 'our-story') return '/';
    return `/${slug}`;
  };

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || pathname !== '/'
            ? 'bg-[#ffffff] shadow-[0_10px_40px_rgba(0,0,0,0.03)] py-4'
            : 'bg-transparent py-8'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3rem' }}>
          
          {/* Left Navigation (Static & Dynamic Pages) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1.75rem' }} className="hidden md:flex">
            {enabledPages.map((page) => (
              <Link
                key={page.id}
                href={getHref(page.slug)}
                className={`text-[13px] tracking-wide transition-all duration-300 relative py-1
                  ${isActive(page.slug)
                    ? 'text-[var(--eg-fg)] font-medium'
                    : 'text-[var(--eg-muted)] hover:text-[var(--eg-fg)]'
                  }`}
              >
                {page.label}
                {isActive(page.slug) && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: 'var(--eg-accent)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Centered Brand Logo */}
          <Link
            href="/"
            className="transform transition-transform hover:scale-105"
            style={{ 
              position: 'absolute', 
              left: '50%', 
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {names[0] === 'Pearloom' ? (
              <Image src="/logo.png" alt="Pearloom Logo" width={110} height={32} style={{ objectFit: 'contain' }} priority />
            ) : (
              <span style={{ fontFamily: 'var(--eg-font-heading)', fontWeight: 600, fontSize: '1.25rem' }}>
                {names[0]} & {names[1]}
              </span>
            )}
          </Link>

          {/* Right Actions */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {user && (
              <div className="hidden md:block">
                <UserNav user={user} />
              </div>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[var(--eg-fg)] cursor-pointer z-20"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[var(--eg-bg)]/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-6">
              {enabledPages.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    href={getHref(page.slug)}
                    onClick={() => setMobileOpen(false)}
                    className={`text-2xl tracking-tight transition-colors
                      ${isActive(page.slug)
                        ? 'text-[var(--eg-fg)]'
                        : 'text-[var(--eg-muted)]'
                      }`}
                    style={{ fontFamily: 'var(--eg-font-heading)' }}
                  >
                    {page.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
