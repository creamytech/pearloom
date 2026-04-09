'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / site-nav.tsx — v3
// Glass nav bar + slide-in drawer
// Pure Tailwind — no inline style props for visual properties
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Menu, X, LayoutDashboard, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSharedScroll } from '@/lib/shared-scroll';
import type { SitePage, LogoIconId } from '@/types';
import { layout } from '@/lib/design-tokens';
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
  WeddingRingsIcon,
  ChampagneIcon,
  MountainIcon,
  CoffeeCupIcon,
  MusicNoteIcon,
  PawIcon,
  SuitcaseIcon,
  BouquetIcon,
} from '@/components/icons/PearloomIcons';
import { cn } from '@/lib/cn';

function LogoIcon({ iconId, size = 18, color }: { iconId?: LogoIconId; size?: number; color: string }) {
  switch (iconId) {
    case 'wedding-rings': return <WeddingRingsIcon size={size} color={color} />;
    case 'heart':         return <ElegantHeartIcon size={size} color={color} />;
    case 'champagne':     return <ChampagneIcon size={size} color={color} />;
    case 'gift':          return <GiftIcon size={size} color={color} />;
    case 'envelope':      return <EnvelopeIcon size={size} color={color} />;
    case 'bouquet':       return <BouquetIcon size={size} color={color} />;
    case 'mountain':      return <MountainIcon size={size} color={color} />;
    case 'coffee':        return <CoffeeCupIcon size={size} color={color} />;
    case 'music-note':    return <MusicNoteIcon size={size} color={color} />;
    case 'paw':           return <PawIcon size={size} color={color} />;
    case 'suitcase':      return <SuitcaseIcon size={size} color={color} />;
    case 'starburst':     return <StarburstIcon size={size} color={color} />;
    case 'pearl':         return <PearlIcon size={size} color={color} />;
    case 'pear':
    default:              return <PearIcon size={size} color={color} />;
  }
}

function PageIcon({ slug, size = 17 }: { slug: string; size?: number }) {
  const c = 'var(--pl-olive)';
  if (slug === '' || slug === 'our-story' || slug === 'story') return <ElegantHeartIcon size={size} color={c} />;
  if (slug === 'events' || slug === 'ceremony' || slug === 'schedule') return <CalendarHeartIcon size={size} color={c} />;
  if (slug === 'registry')  return <GiftIcon size={size} color={c} />;
  if (slug === 'travel')    return <LocationPinIcon size={size} color={c} />;
  if (slug === 'rsvp')      return <EnvelopeIcon size={size} color={c} />;
  if (slug === 'faq')       return <PearlIcon size={size} color={c} />;
  if (slug === 'photos')    return <StarburstIcon size={size} color={c} />;
  return <PearlIcon size={size} color={c} />;
}

interface SiteNavProps {
  names: [string, string];
  pages: SitePage[];
  logoIcon?: LogoIconId;
  logoSvg?: string;
  navStyle?: 'glass' | 'minimal' | 'solid' | 'editorial' | 'floating';
  navOpacity?: number;
  navBackground?: string;
  /** Render inline (not fixed) — used inside mobile editor preview */
  inline?: boolean;
  currentPage?: string;
  /** When provided, overrides the default path-based href generation for page links. */
  pageHrefOverride?: (slug: string) => string;
  user?: { name?: string | null; email?: string | null; image?: string | null };
  onGoToDashboard?: () => void;
  onStartNew?: () => void;
}

export function SiteNav({
  names,
  pages,
  logoIcon,
  logoSvg,
  navStyle = 'glass',
  navOpacity,
  navBackground,
  inline = false,
  currentPage,
  pageHrefOverride,
  user,
  onGoToDashboard,
  onStartNew,
}: SiteNavProps) {
  const [scrollY, setScrollY]         = useState(0);
  const [drawerOpen, setDrawer]       = useState(false);
  const [isDesktop, setIsDesktop]     = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 32, restDelta: 0.001 });

  // Use shared scroll context for scrollY (avoids duplicate listener)
  const sharedScroll = useSharedScroll();
  useEffect(() => {
    setScrollY(sharedScroll.scrollY);
  }, [sharedScroll.scrollY]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const atTop    = scrollY < 20;
  const scrolled = scrollY > 60;
  const isStudio = names[0] === 'Pearloom';
  const enabledPages = pages.filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  const isActive = (slug: string) => {
    if (currentPage !== undefined) return slug === '' ? currentPage === '' : currentPage === slug;
    if (slug === '') return pathname.split('/').filter(Boolean).length === 1;
    return pathname.endsWith(`/${slug}`);
  };

  const basePath = (() => {
    const parts = pathname.split('/');
    if (parts[1] === 'sites') return `/${parts[1]}/${parts[2]}`;
    return '/' + parts[1];
  })();

  const getHref = (slug: string) => pageHrefOverride ? pageHrefOverride(slug) : (slug === '' ? basePath : `${basePath}/${slug}`);

  const navClassName = cn(
    'z-[100] overflow-hidden',
    !inline && 'pt-[env(safe-area-inset-top,0px)]',
    'transition-[background,box-shadow,border-color,padding,margin,border-radius] duration-300',
    inline
      ? 'sticky top-0 w-full'
      : navStyle === 'floating'
        ? 'fixed top-2 left-4 right-4 rounded-full'
        : 'fixed top-0 left-0 right-0',
    scrolled ? 'py-1.5 lg:py-2' : navStyle === 'floating' ? 'py-1' : 'py-2 lg:py-4',
    navBackground
      ? ''
      : navStyle === 'minimal'
        ? (atTop && !isStudio
          ? 'bg-transparent border-b border-transparent shadow-none'
          : 'bg-transparent border-b border-[rgba(0,0,0,0.06)] shadow-none')
        : navStyle === 'solid'
          ? 'bg-white border-b border-[rgba(0,0,0,0.05)] shadow-[0_2px_12px_rgba(43,30,20,0.04)]'
          : navStyle === 'editorial'
            ? (atTop && !isStudio
              ? 'bg-transparent border-b border-transparent'
              : 'bg-[var(--pl-cream)]/98 border-b border-[rgba(0,0,0,0.04)]')
            : navStyle === 'floating'
              ? 'bg-white/90 border border-[rgba(255,255,255,0.6)] shadow-[0_4px_24px_rgba(43,30,20,0.08)]'
              : (atTop && !isStudio
                ? 'bg-black/50 border-b border-white/10 shadow-none'
                : 'bg-[var(--pl-cream,rgba(245,241,232,0.94))]/95 border-b border-[rgba(0,0,0,0.04)] shadow-[0_2px_20px_rgba(0,0,0,0.04)]'),
  );

  const navInlineStyle: React.CSSProperties = {
    backdropFilter: navStyle === 'minimal' ? 'none'
      : navStyle === 'floating' ? 'blur(24px) saturate(1.5)'
      : 'blur(14px) saturate(1.6)',
    WebkitBackdropFilter: navStyle === 'minimal' ? 'none'
      : navStyle === 'floating' ? 'blur(24px) saturate(1.5)'
      : 'blur(14px) saturate(1.6)',
  } as React.CSSProperties;

  const navContent = (
    <>
      {/* Custom nav background overlay */}
      {navBackground && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            backgroundColor: navBackground,
            opacity: navOpacity !== undefined ? navOpacity / 100 : 1,
            borderRadius: 'inherit',
          }}
        />
      )}
      {!navBackground && navOpacity !== undefined && navOpacity < 100 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: 'inherit',
            opacity: navOpacity / 100,
            borderRadius: 'inherit',
          }}
        />
      )}
      {/* Scroll progress bar */}
      {!isStudio && !inline && (
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '2px', scaleX, transformOrigin: '0%',
            background: 'linear-gradient(90deg, var(--pl-olive), color-mix(in srgb, var(--pl-olive) 60%, white))',
          }}
        />
      )}

      <div
        className="relative mx-auto grid items-center h-[3.25rem]"
          style={{
            maxWidth: layout.maxWidth,
            padding: `0 ${layout.padding}`,
            gridTemplateColumns: isDesktop ? 'auto 1fr auto' : '1fr auto',
            overflow: 'visible',
          }}
        >
          {/* ── Brand / couple name ── */}
          <Link
            href={basePath}
            className="flex items-center gap-2 no-underline hover:opacity-75 transition-opacity duration-200 min-w-0"
          >
            {isStudio ? (
              <Image
                src="/logo.png"
                alt="Pearloom"
                width={130}
                height={40}
                className="object-contain h-8 w-auto max-w-[140px]"
                priority
              />
            ) : (
              <>
                {logoSvg ? (
                  <span
                    className="flex items-center w-[18px] h-[18px] text-[var(--pl-olive)]"
                    dangerouslySetInnerHTML={{
                      __html: logoSvg
                        .replace(/width="[^"]*"/, 'width="18"')
                        .replace(/height="[^"]*"/, 'height="18"')
                        .replace(/stroke="[^"]*"/g, 'stroke="currentColor"'),
                    }}
                  />
                ) : (
                  <LogoIcon iconId={logoIcon} size={18} color="var(--pl-olive)" />
                )}
                <span className="font-heading font-semibold text-[1rem] text-[var(--pl-ink-soft)] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] lg:max-w-none">
                  {names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0]}
                </span>
              </>
            )}
          </Link>

          {/* ── Desktop inline nav (≥1024px, guest sites only) ── */}
          {isDesktop && !isStudio ? (
            <nav className="flex items-center gap-0.5 justify-center">
              {enabledPages.map((page) => {
                const active = isActive(page.slug);
                return (
                  <Link
                    key={page.id}
                    href={getHref(page.slug)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-[var(--pl-radius-full)]',
                      'text-[0.72rem] font-body no-underline uppercase tracking-[0.08em] font-semibold',
                      'border transition-all duration-150 whitespace-nowrap',
                      active
                        ? 'text-[var(--pl-ink)] border-b-2 border-b-[var(--pl-ink)] border-x-transparent border-t-transparent rounded-none bg-transparent'
                        : 'text-[var(--pl-muted)] bg-transparent border-transparent hover:text-[var(--pl-ink)]',
                    )}
                  >
                    {page.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div />
          )}

          {/* ── Right: desktop studio actions + user avatar + hamburger ── */}
          <div className="flex items-center gap-2.5">
            {/* Desktop studio quick actions — replaces hamburger on ≥1024px */}
            {isDesktop && isStudio && (
              <div className="flex items-center gap-1.5">
                {onGoToDashboard && (
                  <button
                    onClick={onGoToDashboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--pl-radius-sm)] text-[0.78rem] font-[500] text-[var(--pl-muted)] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,0,0,0.05)] hover:text-[var(--pl-ink)] transition-colors duration-150 whitespace-nowrap"
                  >
                    <LayoutDashboard size={13} />
                    My Sites
                  </button>
                )}
                {onStartNew && (
                  <button
                    onClick={onStartNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--pl-radius-sm)] text-[0.78rem] font-semibold text-[var(--pl-olive)] bg-[rgba(163,177,138,0.1)] border border-[rgba(163,177,138,0.2)] cursor-pointer hover:bg-[rgba(163,177,138,0.18)] transition-colors duration-150 whitespace-nowrap"
                  >
                    <Plus size={13} />
                    New Site
                  </button>
                )}
              </div>
            )}
            {user && <UserNav user={user} onDashboard={onGoToDashboard} />}
            {/* Hamburger: mobile only */}
            {!isDesktop && (
              <button
                onClick={() => setDrawer(!drawerOpen)}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-[var(--pl-radius-sm)]',
                  'text-[var(--pl-ink)] bg-transparent border-0 cursor-pointer',
                  'hover:bg-[rgba(0,0,0,0.05)] transition-colors duration-150',
                )}
              >
                {drawerOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
            )}
          </div>
        </div>
      </>
    );

  return (
    <>
      {/* ── Nav bar — plain <nav> when inline (editor), motion.nav otherwise ── */}
      {inline ? (
        <nav className={navClassName} style={navInlineStyle}>
          {navContent}
        </nav>
      ) : (
        <motion.nav
          className={navClassName}
          style={navInlineStyle}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {navContent}
        </motion.nav>
      )}

      {/* ── Slide-in drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-[101] bg-black/35 backdrop-blur-[4px]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'fixed top-0 right-0 bottom-0 z-[102]',
                'w-[min(300px,100vw)]',
                'flex flex-col',
                'bg-[rgba(245,241,232,0.98)] border-l border-[rgba(0,0,0,0.05)]',
                'shadow-[-16px_0_50px_rgba(0,0,0,0.09)]',
                'pb-[env(safe-area-inset-bottom,24px)]',
                'overflow-y-auto',
              )}
              style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
                <span className="font-heading text-[1.3rem] font-semibold italic text-[var(--pl-ink-soft)] tracking-tight leading-tight">
                  {isStudio ? 'Pearloom' : (names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0])}
                </span>
                <button
                  onClick={() => setDrawer(false)}
                  aria-label="Close menu"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-[rgba(0,0,0,0.06)] text-[var(--pl-ink)] border-0 cursor-pointer hover:bg-[rgba(0,0,0,0.10)] transition-colors duration-150 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Studio-mode actions */}
              {isStudio && user && (
                <div className="py-1.5 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0">
                  {onGoToDashboard && (
                    <button
                      onClick={() => { onGoToDashboard(); setDrawer(false); }}
                      className="pl-enter pl-enter-d1 flex items-center gap-3.5 w-full min-h-[52px] px-5 text-[0.92rem] font-[500] text-[var(--pl-ink)] font-body bg-transparent border-0 cursor-pointer text-left hover:bg-[rgba(163,177,138,0.07)] transition-colors duration-150"
                    >
                      <LayoutDashboard size={17} className="text-[var(--pl-olive)]" />
                      My Sites
                    </button>
                  )}
                  {onStartNew && (
                    <button
                      onClick={() => { onStartNew(); setDrawer(false); }}
                      className="pl-enter pl-enter-d2 flex items-center gap-3.5 w-full min-h-[52px] px-5 text-[0.92rem] font-[500] text-[var(--pl-ink)] font-body bg-transparent border-0 cursor-pointer text-left hover:bg-[rgba(163,177,138,0.07)] transition-colors duration-150"
                    >
                      <Plus size={17} className="text-[var(--pl-olive)]" />
                      New Site
                    </button>
                  )}
                </div>
              )}

              {/* Page links */}
              <nav className="flex-1 py-1.5">
                {enabledPages.map((page, i) => {
                  const active = isActive(page.slug);
                  return (
                    <div
                      key={page.id}
                      className={`pl-enter pl-enter-d${Math.min(i + 1, 8)}`}
                    >
                      <Link
                        href={getHref(page.slug)}
                        onClick={() => setDrawer(false)}
                        className={cn(
                          'flex items-center gap-3.5 min-h-[52px] px-5',
                          'text-[0.92rem] font-body no-underline',
                          'border-l-[3px] transition-all duration-150',
                          active
                            ? 'font-semibold text-[var(--pl-ink)] bg-[rgba(163,177,138,0.07)] border-l-[var(--pl-olive)]'
                            : 'font-[500] text-[var(--pl-muted)] bg-transparent border-l-transparent hover:bg-[rgba(163,177,138,0.06)]',
                        )}
                      >
                        <PageIcon slug={page.slug} size={17} />
                        <span className="flex-1">{page.label}</span>
                      </Link>
                    </div>
                  );
                })}
              </nav>

              {/* Account row + powered-by */}
              <div className="flex-shrink-0 border-t border-[rgba(0,0,0,0.06)] px-5 py-4">
                {user && (
                  <div className="pl-enter-fade pl-enter-d3 flex items-center gap-2.5 mb-3.5">

                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt=""
                        role="presentation"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--pl-olive)] flex items-center justify-center flex-shrink-0">
                        <LogOut size={12} color="#fff" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8rem] font-semibold text-[var(--pl-ink)] truncate">
                        {user.name || 'Your Account'}
                      </div>
                      <div className="text-[0.68rem] text-[var(--pl-muted)] truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => { setDrawer(false); signOut(); }}
                      title="Sign out"
                      className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-lg bg-[rgba(0,0,0,0.05)] text-[var(--pl-muted)] border-0 cursor-pointer hover:bg-[rgba(0,0,0,0.10)] hover:text-[var(--pl-ink)] transition-all duration-150"
                    >
                      <LogOut size={13} />
                    </button>
                  </div>
                )}
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--pl-muted)] opacity-60 m-0">
                  Powered by Pearloom
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Feature 1: The Seam ── */}
      {!isStudio && (
        <motion.div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '1.5px',
            height: '100dvh',
            background: 'linear-gradient(180deg, transparent 0%, var(--pl-olive) 6%, var(--pl-olive) 94%, transparent 100%)',
            opacity: 0.28,
            scaleY: scaleX,
            transformOrigin: 'top center',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Mobile bottom tab bar ── */}
      {!isDesktop && !isStudio && enabledPages.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 99,
            display: 'flex',
            alignItems: 'stretch',
            background: 'rgba(245,241,232,0.96)',
            backdropFilter: 'blur(16px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.04)',
          }}
        >
          {enabledPages.slice(0, 5).map((page) => {
            const active = isActive(page.slug);
            return (
              <Link
                key={page.id}
                href={getHref(page.slug)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  padding: '8px 4px 6px',
                  textDecoration: 'none',
                  color: active ? 'var(--pl-olive, var(--pl-olive))' : 'rgba(0,0,0,0.35)',
                  transition: 'color 0.15s',
                  position: 'relative',
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '25%', right: '25%',
                    height: '2px', borderRadius: '0 0 2px 2px',
                    background: 'var(--pl-olive, var(--pl-olive))',
                  }} />
                )}
                <PageIcon slug={page.slug} size={18} />
                <span style={{
                  fontSize: '0.58rem',
                  fontWeight: active ? 700 : 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  color: 'inherit',
                }}>
                  {(() => {
                    const shortLabels: Record<string, string> = {
                      'Our Story': 'Story', 'Our Photos': 'Photos',
                      'Schedule': 'Events', 'Getting There': 'Travel',
                    };
                    const lbl = shortLabels[page.label] || page.label;
                    return lbl.length > 8 ? lbl.slice(0, 7) + '…' : lbl;
                  })()}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Feature 2: Thread Navigation ── */}
      {isDesktop && !isStudio && enabledPages.length > 0 && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 45,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0,
          }}
        >
          {/* Vertical thread line */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '1px',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, transparent, var(--pl-olive) 20%, var(--pl-olive) 80%, transparent)',
              opacity: 0.18,
              pointerEvents: 'none',
            }}
          />

          {enabledPages.map((page) => {
            const active = isActive(page.slug);
            const hovered = hoveredSlug === page.slug;
            const showLabel = active || hovered;

            return (
              <Link
                key={page.id}
                href={getHref(page.slug)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 0',
                  textDecoration: 'none',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredSlug(page.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
              >
                {/* Label text */}
                <motion.span
                  animate={{ opacity: showLabel ? 1 : 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--pl-olive)' : 'rgba(0,0,0,0.35)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  {page.label}
                </motion.span>

                {/* Dot */}
                <motion.div
                  animate={{
                    width: active ? '7px' : '5px',
                    height: active ? '7px' : '5px',
                    background: active ? 'var(--pl-olive)' : 'rgba(0,0,0,0.18)',
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
