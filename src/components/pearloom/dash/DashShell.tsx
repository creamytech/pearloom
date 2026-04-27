'use client';

/* ========================================================================
   PEARLOOM — DASHBOARD SHELL (v8)
   Shared sidebar + topbar scaffold with motion polish: grouped nav,
   sliding active indicator, hover icon scale, breathing Pear.
   ======================================================================== */

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useLinkStatus } from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { Blob, Heart, Icon, Pear, PearloomLogo, Squiggle } from '../motifs';
import { useIsInsideShell } from './ShellPersistentLayout';
import { NotificationBell } from './NotificationBell';
import { useDashDrawer } from './useDashDrawer';

interface DashNavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

interface DashNavGroup {
  id: string;
  label: string;
  items: DashNavItem[];
}

const DASH_NAV_GROUPS: DashNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/dashboard' },
      { id: 'sites', label: 'My Sites', icon: 'layout', href: '/dashboard/event' },
      { id: 'weekend', label: 'Weekend builder', icon: 'sparkles', href: '/dashboard/weekend' },
    ],
  },
  {
    id: 'event',
    label: 'Your event',
    items: [
      { id: 'timeline', label: 'Timeline', icon: 'clock', href: '/dashboard/day-of' },
      { id: 'guests', label: 'Guests', icon: 'users', href: '/dashboard/rsvp' },
      { id: 'seating', label: 'Seating', icon: 'grid', href: '/dashboard/seating' },
      { id: 'submissions', label: 'Submissions', icon: 'mail', href: '/dashboard/submissions' },
      { id: 'connections', label: 'Guest Manager', icon: 'user-plus', href: '/dashboard/connections' },
      { id: 'registry', label: 'Registry', icon: 'gift', href: '/dashboard/registry' },
      { id: 'payments', label: 'Gifts & payments', icon: 'sparkles', href: '/dashboard/payments' },
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    items: [
      { id: 'library', label: 'Photo library', icon: 'image', href: '/dashboard/library' },
      { id: 'invite', label: 'Invite designer', icon: 'mail', href: '/dashboard/invite' },
      { id: 'speech', label: 'Speech composer', icon: 'mic', href: '/dashboard/speech' },
      { id: 'vendors', label: 'Vendors', icon: 'layers', href: '/vendors' },
      { id: 'passport-cards', label: 'Passport cards', icon: 'user-plus', href: '/dashboard/passport-cards' },
      { id: 'qr-poster', label: 'QR poster', icon: 'sparkles', href: '/dashboard/qr-poster' },
      { id: 'templates', label: 'Templates', icon: 'grid', href: '/templates' },
    ],
  },
  {
    id: 'after',
    label: 'After the day',
    items: [
      { id: 'keepsakes', label: 'Keepsakes', icon: 'heart-icon', href: '/dashboard/keepsakes' },
      { id: 'memory-book', label: 'Memory book', icon: 'grid', href: '/dashboard/memory-book' },
      { id: 'bridge', label: 'The bridge', icon: 'sparkles', href: '/dashboard/bridge' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics', icon: 'sparkles', href: '/dashboard/analytics' },
      { id: 'settings', label: 'Settings', icon: 'settings', href: '/dashboard/profile' },
    ],
  },
];

// Flattened list for quick lookup when other parts of the app still
// want the single-level DASH_NAV map.
const DASH_NAV: DashNavItem[] = DASH_NAV_GROUPS.flatMap((g) => g.items);
void DASH_NAV;

export function DashSidebar({ active }: { active?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { open: drawerOpen, setOpen: setDrawerOpen } = useDashDrawer();
  // Auto-close the mobile drawer whenever the route changes, so
  // tapping a nav item inside the drawer dismisses it instead of
  // leaving it pinned over the new page.
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  const name = session?.user?.name ?? 'Guest';
  const email = session?.user?.email ?? '';
  const initial = (name.trim()[0] ?? 'P').toUpperCase();

  // Unread-whispers badge — counts whispers delivered but not yet
  // read across all of the user's sites. Cheap endpoint, 30s refresh.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await fetch('/api/whispers/count', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setUnread(Number(d.unread) || 0);
      } catch {}
    };
    void pull();
    const id = setInterval(pull, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      {/* Mobile drawer scrim — covers the canvas when the sidebar
          is open as a drawer. Click to dismiss. */}
      {drawerOpen && (
        <div
          aria-hidden
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14,13,11,0.42)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 80,
            animation: 'pl-enter-fade-in 200ms ease both',
          }}
        />
      )}
    <aside
      className="pl8-dash-sidebar"
      data-drawer-open={drawerOpen ? '' : undefined}
      style={{
        width: 264,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cream)',
        borderRight: '1px solid var(--line-soft)',
        // Sidebar is exactly the viewport height and pinned to the
        // top of the viewport so it always reads as a fixed shell
        // even on long pages. We deliberately set both min + max to
        // 100vh so flex stretching can't blow it past the window.
        position: 'sticky',
        top: 0,
        height: '100vh',
        maxHeight: '100vh',
        // Outer aside no longer scrolls — the nav block in the
        // middle is the only scroll surface. Logo + celebration
        // card pin to the top, plan card + user menu pin to the
        // bottom, and the user can never accidentally push them
        // off-screen by mouse-wheeling the sidebar.
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 14px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link
          href="/"
          className="pl8-dash-logo"
          style={{
            padding: '4px 8px 8px',
            display: 'inline-flex',
            transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.035)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
          <PearloomLogo />
        </Link>

        <CelebrationCard />
      </div>

      <nav
        className="pl8-dash-nav"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          // The only scrollable region of the sidebar. Long nav
          // (5 groups, expanded) scrolls inside this lane while the
          // pinned chrome above + below stays put. Slim scrollbar
          // styling already lives in pearloom.css under
          // .pl8-dash-sidebar::-webkit-scrollbar.
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 14px 12px',
        }}
      >
        {DASH_NAV_GROUPS.map((group) => (
          <NavGroup key={group.id} group={group} active={active} pathname={pathname} unread={unread} />
        ))}
      </nav>

      <div style={{ flexShrink: 0, padding: '0 14px 18px' }}>
        <div
          className="pl8-dash-plan"
          style={{
            position: 'relative',
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 12,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
          }}
        >
          {/* Compact plan strip — was a 200px+ tall card with a
              breathing pear, halo, and three lines of copy.
              Slimmed to a single row so it doesn't dominate the
              sidebar bottom. */}
          <Pear size={26} tone="sage" />
          <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.3 }}>
            <strong style={{ color: 'var(--ink)' }}>Evergreen</strong>
            <span style={{ color: 'var(--ink-muted)', marginLeft: 4 }}>· trial</span>
          </div>
          <Link
            href="/dashboard/help"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--peach-ink, #C6703D)',
              textDecoration: 'none',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            View
          </Link>
        </div>

        <UserMenu name={name} email={email} initial={initial} />
      </div>
      <style jsx>{`
        @keyframes pl8-plan-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes pl8-plan-halo {
          0%, 100% { opacity: 0.45; transform: translateX(-50%) scale(0.94); }
          50%      { opacity: 0.9;  transform: translateX(-50%) scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl8-plan-breathe {
            0%, 100% { transform: none; }
          }
          @keyframes pl8-plan-halo {
            0%, 100% { opacity: 0.6; transform: translateX(-50%); }
          }
        }
      `}</style>
    </aside>
    </>
  );
}

/* ── User menu (bottom of sidebar) ─────────────────────────────
   The whole avatar + name + email row is a single button. Clicking
   reveals a small popover with View settings / Help / Log out. The
   user's previous expectation — "I should be able to click on my
   profile to see settings" — is honoured here without giving up
   the existing space-saving compact look. ──────────────────── */
function UserMenu({ name, email, initial }: { name: string; email: string; initial: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative', marginTop: 12 }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'var(--card)',
          border: `1px solid ${open ? 'var(--ink)' : 'var(--card-ring)'}`,
          borderRadius: 14,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
          fontFamily: 'inherit',
          transition: 'border-color 160ms ease, background 160ms ease',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--cream-2)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--card)';
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--lavender)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--ink)',
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          {email && (
            <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </div>
          )}
        </div>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            color: 'var(--ink-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 14,
            padding: 6,
            boxShadow: '0 18px 40px rgba(14,13,11,0.18), 0 4px 10px rgba(14,13,11,0.10)',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <UserMenuItem
            href="/dashboard/profile"
            icon="sliders"
            label="Settings"
            description="Profile, preferences, theme"
            onSelect={() => setOpen(false)}
          />
          <UserMenuItem
            href="/dashboard/payments"
            icon="star"
            label="Plan & billing"
            onSelect={() => setOpen(false)}
          />
          <UserMenuItem
            href="/dashboard/help"
            icon="bell"
            label="Help center"
            onSelect={() => setOpen(false)}
          />
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--ink)',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon name="arrow-right" size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function UserMenuItem({
  href,
  icon,
  label,
  description,
  onSelect,
}: {
  href: string;
  icon: string;
  label: string;
  description?: string;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'var(--ink)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ display: 'inline-flex', color: 'var(--ink-soft)', flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
        {description && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.25 }}>{description}</span>
        )}
      </span>
    </Link>
  );
}

/* ── Celebration switcher card (top of sidebar) ──────────────── */
function CelebrationCard() {
  return (
    <Link
      href="/dashboard/event"
      className="pl8-dash-cele"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14,
        padding: 10,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 14px rgba(61,74,31,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          flexShrink: 0,
          background:
            'conic-gradient(from 140deg at 50% 50%, var(--peach-2), var(--lavender-ink), var(--sage-deep), var(--peach-2))',
          opacity: 0.88,
          animation: 'pl8-sb-cele-spin 24s linear infinite',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Your celebration
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Tap to switch</div>
      </div>
      <style jsx>{`
        @keyframes pl8-sb-cele-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl8-sb-cele-spin {
            from { transform: none; }
            to   { transform: none; }
          }
        }
      `}</style>
    </Link>
  );
}

/* ── Nav group with collapsible header ───────────────────────
   The dashboard has 22+ nav items across 5 groups — too much to
   fit one viewport. Each group is now collapsible: groups
   containing the current route are open by default, others
   collapsed. State persists in localStorage so the user's
   open/closed choices stick across navigations.
   ──────────────────────────────────────────────────────────── */
function NavGroup({
  group,
  active,
  pathname,
  unread,
}: {
  group: DashNavGroup;
  active?: string;
  pathname: string | null;
  unread: number;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = useState<{ top: number; height: number; visible: boolean }>({
    top: 0,
    height: 0,
    visible: false,
  });

  // Group is open if it contains the active route. User can manually
  // expand/collapse via the header button; that override persists
  // in localStorage under a per-group key.
  const containsActive = group.items.some((item) => {
    if (active) return item.id === active;
    return pathname === item.href;
  });
  const storageKey = `pl-dash-nav-open:${group.id}`;
  const [open, setOpen] = useState<boolean>(containsActive);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === '1') setOpen(true);
    else if (stored === '0') setOpen(false);
    else setOpen(containsActive);
    // We only want to read storage on mount + when the active group
    // changes, not on every pathname tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containsActive]);
  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {}
    }
  };

  // Measure the active item's offsetTop + height so the pill can
  // snap into place. Skipped while collapsed.
  useLayoutEffect(() => {
    if (!listRef.current || !open) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const activeEl = listRef.current.querySelector<HTMLAnchorElement>('[data-nav-active="1"]');
    if (!activeEl) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const listRect = listRef.current.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    setPill({ top: itemRect.top - listRect.top, height: itemRect.height, visible: true });
  }, [active, pathname, open]);

  return (
    <div>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 12px 6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          textAlign: 'left',
        }}
      >
        <span>{group.label}</span>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            color: 'var(--ink-muted)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <div ref={listRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: pill.top,
              height: pill.height,
              background: 'var(--ink)',
              borderRadius: 10,
              opacity: pill.visible ? 1 : 0,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          {group.items.map((item) => {
            const isActive = active ? item.id === active : pathname === item.href;
            const liveBadge = item.id === 'bridge' && unread > 0 ? String(unread) : item.badge;
            return (
              <NavLink
                key={item.id}
                item={item}
                isActive={isActive}
                liveBadge={liveBadge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  isActive,
  liveBadge,
}: {
  item: DashNavItem;
  isActive: boolean;
  liveBadge?: string;
}) {
  // Navigate via router.push wrapped in startTransition so the
  // OLD page stays painted while the new page streams in. This is
  // the only way to truly avoid the brief blank that the user
  // perceived as 'the whole page fades in'. With useTransition,
  // React holds the previous tree visible until the new route is
  // ready, then swaps without any unmount/remount blink.
  const router = useRouter();
  const [pending, startNav] = useTransition();
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let middle-click / cmd-click / target=_blank do the native
    // behaviour. Only intercept plain left-clicks.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    startNav(() => {
      router.push(item.href);
    });
  };
  return (
    <Link
      data-nav-active={isActive ? '1' : undefined}
      data-nav-pending={pending ? '1' : undefined}
      href={item.href}
      onClick={handleClick}
      className="pl8-dash-navlink"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        color: isActive ? 'var(--cream)' : 'var(--ink)',
        textDecoration: 'none',
        zIndex: 1,
        // No color transition — snap to active state. The 260ms
        // color fade was firing on every link in the sidebar
        // simultaneously when active row changed, contributing to
        // the perceived 'whole sidebar fades' effect.
      }}
      onMouseEnter={(e) => {
        if (isActive) return;
        e.currentTarget.style.background = 'rgba(14,13,11,0.04)';
        const svg = e.currentTarget.querySelector<SVGElement>('svg');
        if (svg) svg.style.transform = 'scale(1.14)';
      }}
      onMouseLeave={(e) => {
        if (isActive) return;
        e.currentTarget.style.background = 'transparent';
        const svg = e.currentTarget.querySelector<SVGElement>('svg');
        if (svg) svg.style.transform = '';
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Icon name={item.icon} size={18} />
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {pending && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: isActive ? 'rgba(255,255,255,0.85)' : 'var(--peach-ink, #C6703D)',
            display: 'inline-block',
            marginRight: 4,
            animation: 'pl-dot-pulse 0.9s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      <NavLinkPending isActive={isActive} />
      {liveBadge && (
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            background: isActive ? 'rgba(255,255,255,0.18)' : 'var(--peach-bg)',
            color: isActive ? 'var(--cream)' : 'var(--peach-ink)',
            fontWeight: 700,
          }}
        >
          {liveBadge}
        </span>
      )}
    </Link>
  );
}

/** Per-link pending indicator. Shows a tiny pulsing dot the
 *  instant the user clicks a sidebar link, before the new page
 *  has even started rendering. Combines with the global top
 *  progress bar for two-tier feedback (point-of-click + global
 *  status). */
function NavLinkPending({ isActive }: { isActive: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: isActive ? 'rgba(255,255,255,0.85)' : 'var(--peach-ink, #C6703D)',
        display: 'inline-block',
        marginRight: 4,
        animation: 'pl-dot-pulse 0.9s ease-in-out infinite',
        flexShrink: 0,
      }}
    />
  );
}

// Mobile-only hamburger pinned to the topbar's leading edge. On
// desktop it's hidden via .pl8-dash-mobile-menu visibility CSS.
function MobileMenuButton() {
  const { toggle, open } = useDashDrawer();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className="pl8-dash-mobile-menu"
      style={{
        position: 'absolute',
        top: 'clamp(16px, 2.6vw, 28px)',
        left: 'clamp(16px, 4vw, 24px)',
        width: 38,
        height: 38,
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink)',
        cursor: 'pointer',
        display: 'none', // CSS media query reveals it
        placeItems: 'center',
        zIndex: 5,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {open ? (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        ) : (
          <>
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </>
        )}
      </svg>
    </button>
  );
}

export function DashTopbar({
  title = 'Welcome back',
  subtitle,
  ctaText,
  ctaHref,
  actions,
  showHeart = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  ctaText?: string;
  ctaHref?: string;
  /** Free-form actions area absolutely positioned to top-right.
   *  Use this when ctaText/ctaHref isn't enough (multiple buttons,
   *  status text + buttons, custom controls). */
  actions?: ReactNode;
  /** Hide the peach heart accent — for pages where it doesn't fit
   *  the tone (e.g. memorial / funeral dashboards). */
  showHeart?: boolean;
}) {
  return (
    <div
      data-topbar
      className="pl8-dash-topbar"
      style={{
        position: 'relative',
        // Tightened vertical rhythm. The previous clamp left ~140px
        // between the page top and the first content card on
        // average viewports — pushing 6-card grids below the fold
        // unnecessarily. New scale (16-28 top / 8-12 bottom) keeps
        // the editorial feel without forcing a scroll.
        padding: 'clamp(16px, 2.6vw, 28px) clamp(20px, 4vw, 40px) clamp(8px, 1.4vw, 12px)',
        // Match page content maxWidth (1240) so the title sits
        // visually centered above the card grid instead of being
        // 240px wider than the content rail beneath it.
        maxWidth: 1240,
        margin: '0 auto',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <MobileMenuButton />
      <h1
        className="display"
        style={{
          fontSize: 'clamp(28px, 3.6vw, 38px)',
          margin: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
        {showHeart && (
          <span style={{ display: 'inline-flex', color: 'var(--peach-ink, #C6703D)' }}>
            <Heart size={18} />
          </span>
        )}
      </h1>
      {subtitle && (
        <div
          style={{
            marginTop: 6,
            fontSize: 13.5,
            color: 'var(--ink-soft)',
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(16px, 2.6vw, 28px)',
          right: 'clamp(20px, 4vw, 40px)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Aggregated activity bell — always present in the
            topbar so the host doesn't have to scan multiple
            widgets to see what's new. Polls every 60s. */}
        <NotificationBell />
        {actions}
        {ctaText && ctaHref && (
          <Link
            href={ctaHref}
            className="btn btn-primary"
            style={{
              transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            {ctaText} <Pear size={14} tone="cream" shadow={false} />
          </Link>
        )}
      </div>
    </div>
  );
}

export function DashLayout({
  active,
  title,
  subtitle,
  ctaText,
  ctaHref,
  actions,
  showHeart,
  children,
  hideTopbar = false,
}: {
  active?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  ctaText?: string;
  ctaHref?: string;
  actions?: ReactNode;
  showHeart?: boolean;
  children?: ReactNode;
  hideTopbar?: boolean;
}) {
  // When this DashLayout is rendered INSIDE the (shell) route
  // group's persistent layout, skip the outer wrapper + sidebar
  // entirely so we don't double-mount them. This is what makes
  // navigation between dashboard tabs flash-free: only the inner
  // content + topbar re-render.
  const insideShell = useIsInsideShell();
  void active; // sidebar reads pathname directly when persistent

  if (insideShell) {
    return (
      <>
        {!hideTopbar && (
          <DashTopbar
            title={title}
            subtitle={subtitle}
            ctaText={ctaText}
            ctaHref={ctaHref}
            actions={actions}
            showHeart={showHeart}
          />
        )}
        {children}
      </>
    );
  }

  return (
    <div className="pl8 pl8-dashshell">
      <DashSidebar active={active} />
      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
          <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
          <Squiggle variant={1} width={180} style={{ position: 'absolute', top: 40, right: 200, transform: 'rotate(-15deg)', opacity: 0.6 }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {!hideTopbar && (
            <DashTopbar
              title={title}
              subtitle={subtitle}
              ctaText={ctaText}
              ctaHref={ctaHref}
              actions={actions}
              showHeart={showHeart}
            />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
