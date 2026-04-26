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
    <aside
      className="pl8-dash-sidebar"
      style={{
        width: 264,
        flexShrink: 0,
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'var(--cream)',
        borderRight: '1px solid var(--line-soft)',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
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

      <nav
        className="pl8-dash-nav"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginTop: 4,
        }}
      >
        {DASH_NAV_GROUPS.map((group) => (
          <NavGroup key={group.id} group={group} active={active} pathname={pathname} unread={unread} />
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div
          className="pl8-dash-plan"
          style={{
            position: 'relative',
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Soft breathing glow behind the Pear — reads as the card
              "thinking". Honors reduced-motion. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 70,
              height: 70,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--sage-deep) 24%, transparent) 0%, transparent 70%)',
              filter: 'blur(6px)',
              animation: 'pl8-plan-halo 4.8s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              display: 'inline-flex',
              animation: 'pl8-plan-breathe 4.8s ease-in-out infinite',
              transformOrigin: 'center',
            }}
          >
            <Pear size={44} tone="sage" sparkle />
          </span>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            You&apos;re on the
            <br />
            <strong style={{ color: 'var(--ink)' }}>Evergreen Plan</strong>
            <br />
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Free while in trial</span>
          </div>
          <Link href="/dashboard/help" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            View plan
          </Link>
        </div>

        <div
          style={{
            marginTop: 12,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 14,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingBottom: 10,
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--lavender)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              {initial}
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0 }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              {email && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8 }}>
            <Link
              href="/dashboard/help"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                color: 'var(--ink-soft)',
                padding: '6px 4px',
              }}
            >
              <Icon name="bell" size={14} /> Help center
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                color: 'var(--ink-soft)',
                padding: '6px 4px',
                background: 'transparent',
                border: 0,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <Icon name="arrow-right" size={14} /> Log out
            </button>
          </div>
        </div>
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

/* ── Nav group with sliding active pill ─────────────────────── */
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

  // Measure the active item's offsetTop + height so the pill can
  // slide to it with a CSS transition. Runs synchronously before
  // paint so there's no flicker when the route changes.
  useLayoutEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLAnchorElement>('[data-nav-active="1"]');
    if (!activeEl) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const listRect = listRef.current.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    setPill({ top: itemRect.top - listRect.top, height: itemRect.height, visible: true });
  }, [active, pathname]);

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          padding: '0 12px 6px',
        }}
      >
        {group.label}
      </div>
      <div ref={listRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Animated active pill — slides between items as the route changes. */}
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
            transition:
              'top 320ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
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
        transition: 'color 260ms cubic-bezier(0.22, 1, 0.36, 1)',
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
        padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 56px) clamp(12px, 2vw, 20px)',
        maxWidth: 1480,
        margin: '0 auto',
        width: '100%',
        textAlign: 'center',
        // Centered headline, CTA pinned to the top-right so the
        // title reads cleanly as the page identity. Topbar no
        // longer fades in on tab switch — sidebar was always
        // persistent, the topbar opacity-fade was the visible
        // 'page fades in' perception.
      }}
    >
      <h1
        className="display"
        style={{
          fontSize: 'clamp(32px, 4.4vw, 44px)',
          margin: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          lineHeight: 1.05,
        }}
      >
        {title}
        {showHeart && (
          <span style={{ display: 'inline-flex', color: 'var(--peach-ink, #C6703D)' }}>
            <Heart size={20} />
          </span>
        )}
      </h1>
      {subtitle && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14.5,
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
      {(actions || (ctaText && ctaHref)) && (
        <div
          style={{
            position: 'absolute',
            top: 'clamp(28px, 5vw, 48px)',
            right: 'clamp(20px, 4vw, 56px)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
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
      )}
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
