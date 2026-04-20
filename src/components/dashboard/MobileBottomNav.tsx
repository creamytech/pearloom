'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/MobileBottomNav.tsx
//
// Five-tab mobile nav with a More drawer that mirrors the
// desktop sidebar's full destination list. The four most-
// common tasks live on the bar; everything else lives one tap
// away in the drawer, grouped the same way the sidebar is
// (Build / Run event / Grow / Account). This closes the mobile
// parity gap without overwhelming the bar.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Plus,
  Users,
  Megaphone,
  MoreHorizontal,
  Sparkles,
  Image as ImageIcon,
  Store,
  BarChart3,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';

type BarTab = 'feed' | 'build' | 'aiscout' | 'profile';

interface MobileBottomNavProps {
  activeTab: BarTab;
  onTabChange: (tab: BarTab) => void;
  onBuild?: () => void;
}

interface BarEntry {
  id: 'feed' | 'guests' | 'build' | 'day-of' | 'more';
  Icon: typeof LayoutDashboard;
  label: string;
  href?: string;
  primary?: boolean;
}

const BAR_TABS: BarEntry[] = [
  { id: 'feed', Icon: LayoutDashboard, label: 'Sites', href: '/dashboard' },
  { id: 'guests', Icon: Users, label: 'Guests', href: '/dashboard/rsvp' },
  { id: 'build', Icon: Plus, label: 'Create', primary: true },
  { id: 'day-of', Icon: Megaphone, label: 'Day-of', href: '/dashboard/day-of' },
  { id: 'more', Icon: MoreHorizontal, label: 'More' },
];

interface DrawerLink {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  hint?: string;
}

interface DrawerSection {
  label: string;
  links: DrawerLink[];
}

// Full mirror of the desktop sidebar. Adding a new destination
// in sidebar.tsx should also add it here.
const DRAWER_SECTIONS: DrawerSection[] = [
  {
    label: 'Build',
    links: [
      { href: '/dashboard', label: 'Sites', Icon: LayoutDashboard, hint: 'Your live + draft sites' },
      { href: '/dashboard/director', label: 'Director', Icon: Sparkles, hint: 'Pear\u2019s nudges + next-steps' },
    ],
  },
  {
    label: 'Run event',
    links: [
      { href: '/dashboard/day-of', label: 'Day-of', Icon: Megaphone, hint: 'Live board for the wedding day' },
      { href: '/dashboard/rsvp', label: 'Guests · RSVP', Icon: Users, hint: 'Replies, seating, plus-ones' },
      { href: '/dashboard/gallery', label: 'Gallery', Icon: ImageIcon, hint: 'Shared photos from the day' },
    ],
  },
  {
    label: 'Grow',
    links: [
      { href: '/marketplace', label: 'Marketplace', Icon: Store, hint: 'Templates + asset packs' },
      { href: '/dashboard/analytics', label: 'Analytics', Icon: BarChart3, hint: 'Visits, RSVPs, engagement' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/dashboard/profile', label: 'Settings', Icon: Settings, hint: 'Profile, billing, plan' },
      { href: '/dashboard/help', label: 'Help', Icon: HelpCircle, hint: 'Docs + support' },
    ],
  },
];

export function MobileBottomNav({ activeTab, onTabChange, onBuild }: MobileBottomNavProps) {
  const pathname = usePathname() ?? '';
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on route change so a nav tap doesn't leave
  // it lingering after we've moved pages.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Keep the More button visually highlighted whenever the
  // current route isn't one of the bar tabs — so the user sees
  // a clear "you arrived here via More" indicator.
  const pathMatchesBarHref = BAR_TABS.some(
    (t) => t.href && (t.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(t.href)),
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 safe-bottom lg:hidden"
        style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 -4px 20px rgba(43,30,20,0.06)',
        } as React.CSSProperties}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            maxWidth: '520px',
            margin: '0 auto',
            padding: '6px 4px 2px',
          }}
        >
          {BAR_TABS.map((tab) => {
            const Icon = tab.Icon;
            const hrefActive = !!(tab.href && (tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href)));
            const stateActive =
              tab.id === 'feed' ? activeTab === 'feed' :
              tab.id === 'more' ? drawerOpen || !pathMatchesBarHref :
              false;
            const isActive = hrefActive || stateActive;

            const handleTap = () => {
              if (tab.id === 'build' && onBuild) {
                onBuild();
                return;
              }
              if (tab.id === 'more') {
                setDrawerOpen(true);
                return;
              }
              if (tab.href) {
                window.location.href = tab.href;
                return;
              }
              onTabChange(tab.id as BarTab);
            };

            return (
              <motion.button
                key={tab.id}
                onClick={handleTap}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={tab.id === 'more' ? drawerOpen : undefined}
                whileTap={{ scale: 0.88 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: tab.primary ? '0' : '8px 10px',
                  minHeight: tab.primary ? undefined : '48px',
                  minWidth: '48px',
                  position: 'relative',
                }}
              >
                {tab.primary ? (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--pl-olive-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 16px rgba(110,140,92,0.3)',
                      marginTop: '-14px',
                    }}
                  >
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                ) : (
                  <>
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      style={{
                        color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                        transition: 'color var(--pl-dur-instant)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                        transition: 'color var(--pl-dur-instant)',
                      }}
                    >
                      {tab.label}
                    </span>
                  </>
                )}

                {isActive && !tab.primary && (
                  <motion.div
                    layoutId="mobile-nav-dot"
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: 'var(--pl-olive-deep)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* ── More drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(14,13,11,0.4)', backdropFilter: 'blur(3px)' }}
            />
            <motion.aside
              key="more-drawer"
              role="dialog"
              aria-label="More destinations"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed left-0 right-0 bottom-0 z-50 lg:hidden"
              style={{
                background: 'var(--pl-cream-card)',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderTop: '1px solid var(--pl-divider)',
                boxShadow: '0 -12px 40px rgba(14,13,11,0.18)',
                maxHeight: '86dvh',
                overflowY: 'auto',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                <span
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    background: 'var(--pl-divider)',
                  }}
                />
              </div>

              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px 10px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-muted)',
                      marginBottom: 2,
                    }}
                  >
                    Pearloom
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontSize: '1.4rem',
                      color: 'var(--pl-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    All destinations
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: '1px solid var(--pl-divider)',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--pl-ink)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sections */}
              <div style={{ padding: '6px 12px 24px' }}>
                {DRAWER_SECTIONS.map((section) => (
                  <div key={section.label} style={{ marginBottom: 18 }}>
                    <div
                      style={{
                        padding: '8px 12px 6px',
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.58rem',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-muted)',
                      }}
                    >
                      {section.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {section.links.map((link) => {
                        const active =
                          link.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname.startsWith(link.href);
                        const LinkIcon = link.Icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setDrawerOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: '12px 12px',
                              textDecoration: 'none',
                              color: 'var(--pl-ink)',
                              background: active ? 'var(--pl-olive-mist)' : 'transparent',
                              borderRadius: 12,
                              minHeight: 56,
                            }}
                          >
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: active
                                  ? 'var(--pl-olive-deep)'
                                  : 'color-mix(in oklab, var(--pl-olive) 14%, transparent)',
                                color: active ? 'var(--pl-cream)' : 'var(--pl-olive-deep)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <LinkIcon size={18} strokeWidth={active ? 2.2 : 1.8} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: active ? 600 : 500,
                                  lineHeight: 1.2,
                                  color: 'var(--pl-ink)',
                                }}
                              >
                                {link.label}
                              </div>
                              {link.hint && (
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--pl-muted)',
                                    marginTop: 2,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {link.hint}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
