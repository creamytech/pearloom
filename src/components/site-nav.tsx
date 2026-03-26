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

interface SiteNavProps {
  names: [string, string];
  pages: SitePage[];
}

export function SiteNav({ names, pages }: SiteNavProps) {
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled
            ? 'glass-nav shadow-sm'
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="text-base tracking-tight transition-opacity hover:opacity-60 flex items-center gap-2"
            style={{ fontFamily: 'var(--eg-font-heading)', fontWeight: 600 }}
          >
            {names[0] === 'Pearloom' ? (
              <Image src="/logo.png" alt="Pearloom Logo" width={110} height={32} style={{ objectFit: 'contain' }} priority />
            ) : (
              <>{names[0]} & {names[1]}</>
            )}
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
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

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[var(--eg-fg)] cursor-pointer"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
