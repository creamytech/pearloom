'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / site-nav.tsx — v4
// Organic Glass nav bar + CSS-animated slide-in drawer
//
// Two completely separate render paths:
//   inline=true  → plain <nav> (editor preview, no Framer Motion)
//   inline=false → <motion.nav> with entrance animation (public site)
//
// Drawer uses CSS @keyframes — works in both paths.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Menu, X, LayoutDashboard, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSharedScroll } from '@/lib/shared-scroll';
import type { SitePage, LogoIconId } from '@/types';
import { layout } from '@/lib/design-tokens';
import { UserNav } from '@/components/dashboard/user-nav';
import { signOut } from 'next-auth/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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

// ── Icon helpers ──────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────

interface SiteNavProps {
  names: [string, string];
  pages: SitePage[];
  logoIcon?: LogoIconId;
  logoSvg?: string;
  navStyle?: 'glass' | 'minimal' | 'solid' | 'editorial' | 'floating' | 'centered' | 'sidebar' | 'command';
  mobileNavStyle?: 'classic' | 'compact-glass' | 'floating-pill' | 'bottom-tabs' | 'hidden' | 'floating-island';
  navOpacity?: number;
  navBackground?: string;
  /** Render inline (not fixed) — used inside mobile editor preview */
  inline?: boolean;
  currentPage?: string;
  /** When provided, overrides the default path-based href generation for page links. */
  pageHrefOverride?: (slug: string) => string;
  /** Custom page label overrides (page id → display text) */
  pageLabels?: Record<string, string>;
  user?: { name?: string | null; email?: string | null; image?: string | null };
  onGoToDashboard?: () => void;
  onStartNew?: () => void;
}

// ── Main component ────────────────────────────────────────────

export function SiteNav({
  names,
  pages,
  logoIcon,
  logoSvg,
  navStyle = 'solid',
  mobileNavStyle = 'classic',
  navOpacity,
  navBackground,
  inline = false,
  currentPage,
  pageHrefOverride,
  pageLabels,
  user,
  onGoToDashboard,
  onStartNew,
}: SiteNavProps) {
  const [scrollY, setScrollY]         = useState(0);
  const [drawerOpen, setDrawer]       = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [isDesktop, setIsDesktop]     = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scroll progress (Framer Motion) — only used in non-inline path
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 32, restDelta: 0.001 });

  // Shared scroll context for scrollY
  const sharedScroll = useSharedScroll();
  useEffect(() => {
    setScrollY(sharedScroll.scrollY);
  }, [sharedScroll.scrollY]);

  // ── Derived state ────────────────────────────────────────────
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

  const getHref = (slug: string) =>
    pageHrefOverride ? pageHrefOverride(slug) : (slug === '' ? basePath : `${basePath}/${slug}`);

  const openDrawer  = () => setDrawer(true);
  const closeDrawer = () => setDrawer(false);

  // ── Effective mobile style (hidden = no top bar) ──────────────
  const isMobileHidden = !isDesktop && mobileNavStyle === 'hidden';
  const isMobilePill = !isDesktop && mobileNavStyle === 'floating-pill';
  const isMobileBottomTabs = !isDesktop && mobileNavStyle === 'bottom-tabs';
  const isMobileFloatingIsland = !isDesktop && mobileNavStyle === 'floating-island';
  const isMobileCompactGlass = !isDesktop && mobileNavStyle === 'compact-glass';

  // ── Nav style classes ────────────────────────────────────────
  const navClassName = cn(
    'z-[100] overflow-hidden',
    !inline && 'pt-[env(safe-area-inset-top,0px)]',
    'transition-[background,box-shadow,border-color,padding,margin,border-radius] duration-300',
    inline
      ? 'sticky top-0 w-full'
      : isMobilePill
        ? 'fixed top-3 left-[20%] right-[20%] rounded-full lg:top-0 lg:left-0 lg:right-0 lg:rounded-none'
        : navStyle === 'floating'
          ? 'fixed top-3 left-4 right-4 rounded-full'
          : 'fixed top-0 left-0 right-0',
    (isMobileHidden || isMobileCompactGlass) && !isDesktop ? 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto' : '',
    scrolled ? 'py-1.5 lg:py-2' : navStyle === 'floating' || isMobilePill ? 'py-1' : 'py-2 lg:py-4',
  );

  // ── Nav style-specific background classes ────────────────────
  const navBgClassName = cn(
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
                ? 'bg-[rgba(255,255,255,0.65)] border-b border-[rgba(255,255,255,0.5)] shadow-[0_1px_12px_rgba(43,30,20,0.04)]'
                : 'bg-[rgba(255,255,255,0.82)] border-b border-[rgba(255,255,255,0.5)] shadow-[0_1px_12px_rgba(43,30,20,0.04)]'),
  );

  // ── Backdrop filter inline style ──────────────────────────────
  const navInlineStyle: React.CSSProperties = {
    backdropFilter:
      navStyle === 'minimal' ? 'none'
      : navStyle === 'floating' ? 'blur(24px) saturate(1.5)'
      : 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter:
      navStyle === 'minimal' ? 'none'
      : navStyle === 'floating' ? 'blur(24px) saturate(1.5)'
      : 'blur(20px) saturate(1.4)',
  } as React.CSSProperties;

  // ── Brand / couple name ──────────────────────────────────────
  const brandContent = (
    <Link
      href={basePath}
      onClick={inline ? (e: React.MouseEvent) => e.preventDefault() : undefined}
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
          <span
            className={cn(
              'font-heading font-semibold text-[1rem] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis',
              isDesktop
                ? 'text-[var(--pl-ink-soft)] max-w-none'
                : 'text-[var(--pl-ink-soft)] max-w-[200px] italic',
            )}
            {...(inline ? { 'data-pe-editable': 'true', 'data-pe-path': 'coupleNames.0' } : {})}
          >
            {names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0]}
          </span>
        </>
      )}
    </Link>
  );

  // ── Desktop page links ───────────────────────────────────────
  const desktopNav = isDesktop && !isStudio ? (
    <nav className="flex items-center gap-0.5 justify-center">
      {enabledPages.map((page) => {
        const active = isActive(page.slug);
        const displayLabel = pageLabels?.[page.id] ?? page.label;
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
            {inline ? (
              <span data-pe-editable="true" data-pe-path={`pageLabels.${page.id}`}>{displayLabel}</span>
            ) : displayLabel}
          </Link>
        );
      })}
    </nav>
  ) : null;

  // ── Right-side actions ───────────────────────────────────────
  const rightContent = (
    <div className="flex items-center gap-2.5">
      {/* Desktop studio quick actions */}
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
          onClick={() => drawerOpen ? closeDrawer() : openDrawer()}
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
  );

  // ── Inner nav content (shared by both render paths) ──────────
  const navInner = (
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

      <div
        className="relative mx-auto grid items-center"
        style={{
          maxWidth: layout.maxWidth,
          padding: `0 ${layout.padding}`,
          gridTemplateColumns: isDesktop ? 'auto 1fr auto' : '1fr auto',
          overflow: 'visible',
          height: isDesktop ? '52px' : '48px',
        }}
      >
        {brandContent}
        {desktopNav}
        {rightContent}
      </div>
    </>
  );

  // ── Scroll progress bar (inline path uses plain div) ──────────
  const scrollProgressBar = !isStudio && !inline ? (
    <motion.div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px', scaleX, transformOrigin: '0%',
        background: 'linear-gradient(90deg, var(--pl-olive), color-mix(in srgb, var(--pl-olive) 60%, white))',
      }}
    />
  ) : null;

  // ── Drawer (Radix Sheet) ──────────────────────────────────────
  const drawer = (
    <Sheet open={drawerOpen} onOpenChange={setDrawer}>
      <SheetContent
        side="right"
        hideClose
        className="w-[min(280px,100vw)] overflow-y-auto flex flex-col p-0"
      >
        {/* Drawer header */}
        <div className={cn("flex items-center justify-between px-5 pb-4 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0", inline ? "pt-5" : "pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]")}>
          <span className="font-heading text-[1.3rem] font-semibold italic text-[var(--pl-ink-soft)] tracking-tight leading-tight">
            {isStudio ? 'Pearloom' : (names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0])}
          </span>
          <button
            onClick={closeDrawer}
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
                onClick={() => { onGoToDashboard(); closeDrawer(); }}
                className="pl-enter pl-enter-d1 flex items-center gap-3.5 w-full min-h-[52px] px-5 text-[0.92rem] font-[500] text-[var(--pl-ink)] font-body bg-transparent border-0 cursor-pointer text-left hover:bg-[rgba(163,177,138,0.07)] transition-colors duration-150"
              >
                <LayoutDashboard size={17} className="text-[var(--pl-olive)]" />
                My Sites
              </button>
            )}
            {onStartNew && (
              <button
                onClick={() => { onStartNew(); closeDrawer(); }}
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
                  onClick={closeDrawer}
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
                onClick={() => { closeDrawer(); signOut(); }}
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
      </SheetContent>
    </Sheet>
  );

  // ════════════════════════════════════════════════════════════════
  // RENDER — new style variants: centered, sidebar, command
  // ════════════════════════════════════════════════════════════════

  // ── 'centered' nav style — two-row layout ────────────────────
  if (navStyle === 'centered' && isDesktop && !isStudio) {
    const centeredNav = (
      <div
        className={cn(inline ? 'sticky top-0 w-full' : 'fixed top-0 left-0 right-0', 'z-[100]')}
        style={{
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 12px rgba(43,30,20,0.04)',
          ...(inline ? {} : { paddingTop: 'env(safe-area-inset-top,0px)' }),
        }}
        data-pe-section="nav" data-pe-label="Navigation"
      >
        {/* Row 1: logo */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '44px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          {brandContent}
        </div>
        {/* Row 2: links + right actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', gap: '0', position: 'relative' }}>
          {desktopNav}
          <div style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)' }}>
            {user && <UserNav user={user} onDashboard={onGoToDashboard} />}
          </div>
        </div>
      </div>
    );
    return (
      <>
        {inline ? centeredNav : (
          <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            {centeredNav}
          </motion.div>
        )}
        {drawer}
      </>
    );
  }

  // ── 'sidebar' nav style — fixed left sidebar ─────────────────
  if (navStyle === 'sidebar' && isDesktop && !isStudio) {
    const sidebarEl = (
      <div
        style={{
          position: inline ? 'sticky' : 'fixed',
          top: 0, left: 0, bottom: 0, width: '240px',
          zIndex: 'var(--z-sticky)', display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(0,0,0,0.05)', boxShadow: '4px 0 24px rgba(43,30,20,0.04)',
          paddingTop: inline ? '0' : 'env(safe-area-inset-top,0px)',
        }}
        data-pe-section="nav" data-pe-label="Navigation"
      >
        {/* Logo row */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {brandContent}
        </div>
        {/* Page links */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {enabledPages.map((page) => {
            const active = isActive(page.slug);
            const displayLabel = pageLabels?.[page.id] ?? page.label;
            return (
              <Link
                key={page.id}
                href={getHref(page.slug)}
                onClick={inline ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 20px', textDecoration: 'none',
                  color: active ? 'var(--pl-ink)' : 'var(--pl-muted)',
                  fontFamily: 'var(--pl-font-body)', fontSize: '0.82rem', fontWeight: active ? 700 : 500,
                  borderLeft: `3px solid ${active ? 'var(--pl-olive)' : 'transparent'}`,
                  background: active ? 'rgba(163,177,138,0.07)' : 'transparent',
                  transition: 'all var(--pl-dur-instant)',
                }}
              >
                <PageIcon slug={page.slug} size={15} />
                {inline ? (
                  <span data-pe-editable="true" data-pe-path={`pageLabels.${page.id}`}>{displayLabel}</span>
                ) : displayLabel}
              </Link>
            );
          })}
        </nav>
        {/* User row */}
        {user && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <UserNav user={user} onDashboard={onGoToDashboard} />
          </div>
        )}
      </div>
    );
    return <>{sidebarEl}{drawer}</>;
  }

  // ── 'command' nav style — ⌘K floating button + dialog ────────
  if (navStyle === 'command' && !isStudio) {
    return (
      <>
        {/* Floating ⌘K button — bottom right */}
        <button
          onClick={() => setCommandOpen(true)}
          aria-label="Open navigation (⌘K)"
          style={{
            position: inline ? 'absolute' : 'fixed',
            bottom: '24px', right: '24px', zIndex: 'var(--z-sticky)',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--pl-radius-lg)', border: 'none',
            background: 'rgba(24,24,27,0.88)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: 'background var(--pl-dur-instant)',
          }}
        >
          <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>⌘K</span>
          <span>Navigate</span>
        </button>

        {/* Command palette dialog */}
        {commandOpen && (
          <>
            <div
              onClick={() => setCommandOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-max)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
                zIndex: 'var(--z-max)', width: 'min(480px, 90vw)',
                background: 'rgba(250,247,242,0.98)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                borderRadius: 'var(--pl-radius-xl)', border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 16px 64px rgba(0,0,0,0.14)', overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-muted)', marginBottom: '4px' }}>Navigate</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-heading)', fontStyle: 'italic' }}>
                  {names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0]}
                </div>
              </div>
              <div style={{ padding: '8px' }}>
                {enabledPages.map((page) => {
                  const active = isActive(page.slug);
                  const displayLabel = pageLabels?.[page.id] ?? page.label;
                  return (
                    <Link
                      key={page.id}
                      href={getHref(page.slug)}
                      onClick={() => setCommandOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: 'var(--pl-radius-lg)',
                        textDecoration: 'none',
                        color: active ? 'var(--pl-ink)' : 'var(--pl-muted)',
                        background: active ? 'rgba(163,177,138,0.1)' : 'transparent',
                        transition: 'background var(--pl-dur-instant)',
                        fontFamily: 'var(--pl-font-body)', fontSize: '0.88rem', fontWeight: active ? 700 : 500,
                      }}
                    >
                      <PageIcon slug={page.slug} size={16} />
                      <span style={{ flex: 1 }}>{displayLabel}</span>
                      {active && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pl-olive)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current</span>}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER — two completely separate paths
  // ════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ── Nav bar ── */}
      {inline ? (
        /* INLINE PATH: plain <nav>, no Framer Motion, no motion.* */
        <nav className={cn(navClassName, navBgClassName)} style={navInlineStyle} data-pe-section="nav" data-pe-label="Navigation">
          {navInner}
        </nav>
      ) : (
        /* PUBLIC PATH: motion.nav with entrance animation */
        <motion.nav
          className={cn(navClassName, navBgClassName)}
          style={navInlineStyle}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {scrollProgressBar}
          {navInner}
        </motion.nav>
      )}

      {/* ── Floating hamburger for 'hidden' mobile nav style ── */}
      {isMobileHidden && !inline && (
        <button
          onClick={() => drawerOpen ? closeDrawer() : openDrawer()}
          aria-label="Open menu"
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 101,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 2px 12px rgba(43,30,20,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--pl-ink)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          {drawerOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* ── CSS-animated drawer (works in both paths) ── */}
      {drawer}

      {/* ── Feature 1: The Seam (left edge scroll indicator) ── */}
      {!isStudio && !inline && (
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

      {/* ── Mobile bottom tab bar (shown for bottom-tabs style, or classic with 3+ pages) ── */}
      {!isDesktop && !isStudio && !inline && enabledPages.length > 0 && (mobileNavStyle === 'bottom-tabs' || (mobileNavStyle === 'classic' && enabledPages.length >= 3)) && (
        <>
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
            {(() => {
              const shortLabels: Record<string, string> = {
                'Our Story': 'Story', 'Our Photos': 'Photos',
                'Schedule': 'Events', 'Getting There': 'Travel',
              };
              const shortLabel = (label: string) => {
                const lbl = shortLabels[label] || label;
                return lbl.length > 8 ? lbl.slice(0, 7) + '\u2026' : lbl;
              };
              // Show first 4 + "More" if overflow, else show all (up to 5).
              const hasOverflow = enabledPages.length > 5;
              const visiblePages = hasOverflow ? enabledPages.slice(0, 4) : enabledPages.slice(0, 5);
              const overflowPages = hasOverflow ? enabledPages.slice(4) : [];
              const anyOverflowActive = overflowPages.some((p) => isActive(p.slug));
              return (
                <>
                  {visiblePages.map((page) => {
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
                          color: active ? 'var(--pl-olive)' : 'rgba(0,0,0,0.35)',
                          transition: 'color var(--pl-dur-instant)',
                          position: 'relative',
                        }}
                      >
                        {active && (
                          <div style={{
                            position: 'absolute', top: 0, left: '25%', right: '25%',
                            height: '2px', borderRadius: '0 0 2px 2px',
                            background: 'var(--pl-olive)',
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
                          {shortLabel(page.label)}
                        </span>
                      </Link>
                    );
                  })}
                  {hasOverflow && (
                    <button
                      type="button"
                      onClick={() => setMoreSheetOpen(true)}
                      aria-label="More navigation options"
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        padding: '8px 4px 6px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: anyOverflowActive ? 'var(--pl-olive)' : 'rgba(0,0,0,0.35)',
                        transition: 'color var(--pl-dur-instant)',
                        position: 'relative',
                        fontFamily: 'inherit',
                      }}
                    >
                      {anyOverflowActive && (
                        <div style={{
                          position: 'absolute', top: 0, left: '25%', right: '25%',
                          height: '2px', borderRadius: '0 0 2px 2px',
                          background: 'var(--pl-olive)',
                        }} />
                      )}
                      <Menu size={18} />
                      <span style={{
                        fontSize: '0.58rem',
                        fontWeight: anyOverflowActive ? 700 : 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        color: 'inherit',
                      }}>
                        More
                      </span>
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Overflow sheet for pages beyond the first 4 */}
          {enabledPages.length > 5 && (
            <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
              <SheetContent
                side="bottom"
                className="rounded-t-2xl max-h-[70vh] overflow-auto"
                style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
              >
                <div style={{ padding: '12px 8px 4px' }}>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.45)',
                    padding: '4px 12px 10px',
                  }}>
                    More pages
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {enabledPages.slice(4).map((page) => {
                      const active = isActive(page.slug);
                      return (
                        <Link
                          key={page.id}
                          href={getHref(page.slug)}
                          onClick={() => setMoreSheetOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 12px',
                            borderRadius: 'var(--pl-radius-lg)',
                            textDecoration: 'none',
                            color: active ? 'var(--pl-olive)' : 'var(--pl-ink)',
                            background: active ? 'rgba(163,177,138,0.12)' : 'transparent',
                            fontWeight: active ? 700 : 500,
                          }}
                        >
                          <PageIcon slug={page.slug} size={20} />
                          <span style={{ fontSize: '0.95rem' }}>
                            {pageLabels?.[page.id] ?? page.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </>
      )}

      {/* ── Compact Glass mobile nav (frosted bottom bar: couple names + hamburger) ── */}
      {isMobileCompactGlass && !inline && !isStudio && (
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 99,
            display: 'grid',
            gridTemplateColumns: '44px 1fr 44px',
            alignItems: 'center',
            height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 -2px 16px rgba(43,30,20,0.05)',
          }}
          data-pe-section="nav"
          data-pe-label="Navigation"
        >
          {/* Left: logo (small, tappable link home) */}
          <Link
            href={basePath}
            onClick={inline ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            aria-label="Home"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, color: 'var(--pl-olive)', textDecoration: 'none',
            }}
          >
            {logoSvg ? (
              <span
                style={{ display: 'flex', width: 18, height: 18, color: 'var(--pl-olive)' }}
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
          </Link>

          {/* Center: couple names */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 0, padding: '0 8px',
            }}
          >
            <span
              className="font-heading italic"
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--pl-ink-soft)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0]}
            </span>
          </div>

          {/* Right: hamburger */}
          <button
            onClick={() => drawerOpen ? closeDrawer() : openDrawer()}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, border: 'none', background: 'transparent',
              color: 'var(--pl-ink)', cursor: 'pointer',
            }}
          >
            {drawerOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      )}

      {/* ── Floating Island mobile nav ── */}
      {isMobileFloatingIsland && !inline && !isStudio && enabledPages.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99, display: 'flex', alignItems: 'center', gap: '2px',
          padding: '4px 8px', borderRadius: 'var(--pl-radius-full)',
          background: 'rgba(245,241,232,0.96)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(43,30,20,0.1)',
          paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))',
        }}>
          {enabledPages.slice(0, 5).map((page) => {
            const active = isActive(page.slug);
            return (
              <Link
                key={page.id}
                href={getHref(page.slug)}
                title={pageLabels?.[page.id] ?? page.label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: active ? 'auto' : '36px', height: '36px',
                  borderRadius: 'var(--pl-radius-full)',
                  padding: active ? '0 12px' : '0',
                  background: active ? 'var(--pl-olive)' : 'transparent',
                  color: active ? '#fff' : 'rgba(0,0,0,0.45)',
                  textDecoration: 'none', transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
                  gap: '5px',
                }}
              >
                <PageIcon slug={page.slug} size={16} />
                {active && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {(pageLabels?.[page.id] ?? page.label).slice(0, 8)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Feature 2: Thread Navigation (desktop side dots) ── */}
      {!inline && isDesktop && !isStudio && enabledPages.length > 0 && (
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
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--pl-olive)' : 'rgba(0,0,0,0.35)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    opacity: showLabel ? 1 : 0,
                    transition: 'opacity 0.18s ease',
                  }}
                >
                  {page.label}
                </span>

                {/* Dot */}
                <div
                  style={{
                    width: active ? '7px' : '5px',
                    height: active ? '7px' : '5px',
                    background: active ? 'var(--pl-olive)' : 'rgba(0,0,0,0.18)',
                    borderRadius: '50%',
                    flexShrink: 0,
                    transition: 'width 0.2s, height 0.2s, background 0.2s',
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
