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
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { parseLocalDate } from '@/lib/date-utils';
import { Blob, Heart, Icon, Pear, PearloomLogo } from '../motifs';
import { useIsInsideShell } from './ShellPersistentLayout';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { useDashDrawer } from './useDashDrawer';
import { useUserSettings } from './UserSettingsModal';
import { usePlan } from './usePlan';
import { useSelectedSite, siteDisplayName, type SiteSummary } from '@/components/marketing/design/dash/hooks';
import { PlAvatar, useUserAvatar } from '../avatars';

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

/* Grouped nav — ported 1:1 from the v2 dashboard ui_kit
   (handoff-v2/ui_kits/dashboard/DashShell.jsx NAV). Static mono
   group labels; every href is a real production route, so routing +
   active-state wiring is untouched. */
const DASH_NAV_GROUPS: DashNavGroup[] = [
  {
    id: 'main',
    label: '',
    items: [
      { id: 'home', label: 'Home', icon: 'home', href: '/dashboard' },
    ],
  },
  {
    id: 'loom',
    label: 'Your loom',
    items: [
      { id: 'site', label: 'My sites', icon: 'layout', href: '/dashboard/event' },
    ],
  },
  {
    id: 'event',
    label: 'This event',
    items: [
      { id: 'guests',  label: 'Guests',   icon: 'users',    href: '/dashboard/rsvp' },
      { id: 'day',     label: 'Day',      icon: 'clock',    href: '/dashboard/day-of' },
      { id: 'studio',  label: 'Studio',   icon: 'sparkles', href: '/dashboard/invite' },
      { id: 'gallery', label: 'The Reel',  icon: 'image',    href: '/dashboard/gallery' },
      { id: 'memory',  label: 'Memory',   icon: 'heart-icon', href: '/dashboard/keepsakes' },
    ],
  },
  {
    id: 'house',
    label: 'The house',
    items: [
      { id: 'tools',    label: 'More',     icon: 'grid',     href: '/dashboard/tools' },
      { id: 'settings', label: 'Settings', icon: 'settings', href: '/dashboard/profile' },
    ],
  },
];

/** Section → sub-tabs map. Mounted at the top of each landing
 *  page via <DashSubNav>. Routes still match the old paths so no
 *  redirects + no broken bookmarks; we just visually group them
 *  under one umbrella entry in the sidebar. */
/** Simplified sub-nav — 22 tabs across 5 sections collapsed to
 *  10 essential destinations. The 12 removed routes (Weekend,
 *  AI planner, Templates, Send cadence, Pear's review, Payments,
 *  Print orders, QR poster, Music, Voice DNA, Passport cards,
 *  Vendors, The bridge, Analytics) still WORK at their existing
 *  URLs — they're just no longer surfaced in the sub-nav strip
 *  that wrapped on most laptops. Hosts reach them via the
 *  command palette (⌘K) and inline cross-links from related
 *  surfaces (e.g. Registry page links to Payments). */
export const DASH_SECTIONS: Record<string, { label: string; tabs: Array<{ id: string; label: string; href: string }> }> = {
  site: {
    label: 'Site',
    tabs: [
      { id: 'sites',       label: 'My sites',     href: '/dashboard/event' },
      { id: 'weekend',     label: 'Weekend',      href: '/dashboard/weekend' },
      { id: 'connections', label: 'Linked events', href: '/dashboard/connections' },
    ],
  },
  guests: {
    label: 'Guests',
    tabs: [
      { id: 'roster',      label: 'Roster',      href: '/dashboard/rsvp' },
      { id: 'messages',    label: 'Messages',    href: '/dashboard/messages' },
      { id: 'submissions', label: 'Submissions', href: '/dashboard/submissions' },
      { id: 'registry',    label: 'Registry',    href: '/dashboard/registry' },
    ],
  },
  day: {
    label: 'Day of',
    tabs: [
      { id: 'timeline', label: 'Timeline', href: '/dashboard/day-of' },
      { id: 'seating',  label: 'Seating',  href: '/dashboard/seating' },
    ],
  },
  studio: {
    label: 'Studio',
    tabs: [
      { id: 'invite',  label: 'Invites', href: '/dashboard/invite' },
      { id: 'library', label: 'My uploads',  href: '/dashboard/library' },
      { id: 'gallery', label: 'The Reel', href: '/dashboard/gallery' },
      { id: 'speech',  label: 'Speech',  href: '/dashboard/speech' },
    ],
  },
  memory: {
    label: 'Memory',
    tabs: [
      { id: 'keepsakes',  label: 'Keepsakes', href: '/dashboard/keepsakes' },
      { id: 'memory-book', label: 'Book',     href: '/dashboard/memory-book' },
    ],
  },
};

/** Map of every sub-tab href → its parent section id. Used by
 *  <DashSubNav> to figure out which section to render when the
 *  consumer doesn't pass it explicitly. */
const HREF_TO_SECTION: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [sectionId, section] of Object.entries(DASH_SECTIONS)) {
    for (const tab of section.tabs) map[tab.href] = sectionId;
  }
  return map;
})();
export function sectionForHref(href: string): string | null {
  return HREF_TO_SECTION[href] ?? null;
}

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
  const plan = usePlan();

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
        // even on long pages. We deliberately set both height + max
        // so flex stretching can't blow it past the window. dvh, not
        // vh — mobile browser UI chrome shrinks the visual viewport
        // and static 100vh hides the pinned bottom plan/user chrome.
        position: 'sticky',
        top: 0,
        height: '100dvh',
        maxHeight: '100dvh',
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
            <strong style={{ color: 'var(--ink)' }}>{plan.label}</strong>
            <span style={{ color: 'var(--ink-muted)', marginLeft: 4 }}>· plan</span>
          </div>
          <Link
            href="/dashboard/profile"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--peach-ink, #C6703D)',
              textDecoration: 'none',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            {plan.plan === 'free' ? 'Upgrade' : 'View'}
          </Link>
        </div>

        <UserMenu name={name} email={email} initial={initial} />
      </div>
      {/* pl8-plan-* keyframes live in globals.css — a <style jsx>
          block here made the styled-jsx scope class hash differently
          between SSR and client, warning on every dashboard page. */}
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
  const { openTab } = useUserSettings();
  const { avatarId } = useUserAvatar();

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
        {avatarId ? (
          <PlAvatar id={avatarId} size={30} />
        ) : (
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
        )}
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
            background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
            backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
            WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
            border: '1px solid var(--pl-glass-border)',
            borderRadius: 14,
            padding: 6,
            boxShadow: 'var(--pl-glass-shadow-lg)',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <UserMenuItem
            onClick={() => {
              setOpen(false);
              openTab('account');
            }}
            icon="sliders"
            label="Settings"
            description="Profile, preferences, theme"
          />
          <UserMenuItem
            onClick={() => {
              setOpen(false);
              openTab('subscription');
            }}
            icon="star"
            label="Plan & billing"
          />
          <UserMenuItem
            onClick={() => {
              setOpen(false);
              openTab('usage');
            }}
            icon="sparkles"
            label="Usage & credits"
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
  onClick,
  icon,
  label,
  description,
  onSelect,
}: {
  href?: string;
  onClick?: () => void;
  icon: string;
  label: string;
  description?: string;
  onSelect?: () => void;
}) {
  const sharedStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'var(--ink)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    textAlign: 'left',
  };
  const inner = (
    <>
      <span style={{ display: 'inline-flex', color: 'var(--ink-soft)', flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
        {description && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.25 }}>{description}</span>
        )}
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        role="menuitem"
        onClick={onSelect}
        style={sharedStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect?.();
        onClick?.();
      }}
      style={sharedStyle}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {inner}
    </button>
  );
}

/* ── Site crest — the switcher's identity tile ────────────────
   Replaces the old spinning conic-gradient square (which read
   "AI startup", BRAND.md §10, and said nothing about the site).
   Cover photo when the site has one — inside a gold hairline
   frame per the brand's photo rule — otherwise an occasion-
   tinted paper tile with the celebration's initial in the
   display italic and the gold pearl as punctuation. */

const CREST_TINTS = {
  sage:     { bg: 'var(--sage-tint, #E4E2CC)',     fg: 'var(--sage-deep, #3D4A1F)' },
  peach:    { bg: 'var(--peach-bg, #F4E3D3)',      fg: 'var(--peach-ink, #C6703D)' },
  lavender: { bg: 'var(--lavender-bg, #E8E0F0)',   fg: 'var(--lavender-ink, #6B5A8C)' },
  gold:     { bg: 'rgba(193,154,75,0.16)',         fg: '#8A6A2E' },
  plum:     { bg: 'rgba(122,45,45,0.10)',          fg: 'var(--pl-plum, #7A2D2D)' },
} as const;

function crestTint(occasion?: string): { bg: string; fg: string } {
  switch (occasion) {
    case 'wedding': case 'engagement': case 'anniversary': case 'vow-renewal':
      return CREST_TINTS.peach;
    case 'memorial': case 'funeral':
      return CREST_TINTS.plum;
    case 'bachelor-party': case 'bachelorette-party': case 'bridal-shower':
    case 'birthday': case 'milestone-birthday': case 'sweet-sixteen':
      return CREST_TINTS.gold;
    case 'baby-shower': case 'gender-reveal': case 'sip-and-see':
    case 'baptism': case 'first-communion': case 'confirmation':
    case 'bar-mitzvah': case 'bat-mitzvah': case 'quinceanera':
      return CREST_TINTS.lavender;
    default:
      return CREST_TINTS.sage;
  }
}

function SiteCrest({ site, size = 38 }: { site: SiteSummary | null | undefined; size?: number }) {
  const radius = Math.max(8, Math.round(size * 0.26));
  if (!site) {
    // No site yet — the pear waits on cream.
    return (
      <div
        aria-hidden
        style={{
          width: size, height: size, borderRadius: radius, flexShrink: 0,
          background: 'var(--cream-2, #FBF6E8)',
          border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
          display: 'grid', placeItems: 'center',
        }}
      >
        <Pear size={Math.round(size * 0.55)} tone="sage" shadow={false} />
      </div>
    );
  }
  if (site.coverPhoto) {
    return (
      <div
        aria-hidden
        style={{
          width: size, height: size, borderRadius: radius, flexShrink: 0,
          border: '1px solid var(--pl-gold, #C19A4B)',
          padding: 1.5,
          background: 'var(--card, #FBF7EE)',
        }}
      >
        <img
          src={site.coverPhoto}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            borderRadius: radius - 3, display: 'block',
          }}
        />
      </div>
    );
  }
  const tint = crestTint(site.occasion);
  const letter = (siteDisplayName(site).trim()[0] ?? 'P').toUpperCase();
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: tint.bg,
        border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
        display: 'grid', placeItems: 'center',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: size * 0.48,
          lineHeight: 1,
          color: tint.fg,
        }}
      >
        {letter}
      </span>
      {/* The gold pearl — the brand bead as punctuation. */}
      <span
        style={{
          position: 'absolute',
          right: Math.round(size * 0.14),
          bottom: Math.round(size * 0.14),
          width: Math.max(4, Math.round(size * 0.13)),
          height: Math.max(4, Math.round(size * 0.13)),
          borderRadius: 999,
          background: 'var(--pl-gold, #C19A4B)',
        }}
      />
    </div>
  );
}

/* ── Celebration switcher card (top of sidebar) ──────────────── */
function CelebrationCard() {
  const { site, sites, selectSite } = useSelectedSite();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = site ? siteDisplayName(site) : 'Your celebration';
  const sublineDate = parseLocalDate(site?.eventDate);
  const subline = site
    ? (sublineDate
        ? sublineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Tap to switch')
    : (sites && sites.length === 0 ? 'Create a site' : 'Tap to switch');
  const hasOptions = (sites?.length ?? 0) > 0;

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="pl8-dash-cele"
        onClick={() => {
          if (!hasOptions) {
            // No sites yet — kick straight to creation.
            window.location.href = '/dashboard/event';
            return;
          }
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          background: open ? 'var(--cream-2)' : 'var(--card)',
          border: '1px solid var(--card-ring)',
          borderRadius: 14,
          padding: 10,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          color: 'inherit',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms, background 200ms ease',
        }}
        onMouseEnter={(e) => {
          if (open) return;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 14px rgba(61,74,31,0.10)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <SiteCrest site={site} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{subline}</div>
        </div>
        {hasOptions && (
          <svg
            aria-hidden
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              color: 'var(--ink-muted)',
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {open && hasOptions && (
        <div
          role="listbox"
          aria-label="Switch celebration"
          className="pl8-content-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            boxShadow: '0 24px 48px -16px rgba(14,13,11,0.24)',
            padding: 6,
            maxHeight: 360,
            overflowY: 'auto',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {sites!.map((s) => {
            const on = site?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  selectSite(s.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: on ? 'var(--cream-2)' : 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 160ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!on) e.currentTarget.style.background = 'var(--cream-2)';
                }}
                onMouseLeave={(e) => {
                  if (!on) e.currentTarget.style.background = 'transparent';
                }}
              >
                <SiteCrest site={s} size={28} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {siteDisplayName(s)}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10.5,
                      color: 'var(--ink-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {s.occasion ?? '—'}
                    {(() => {
                      const d = parseLocalDate(s.eventDate);
                      return d ? ` · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
                    })()}
                  </span>
                </span>
                {on && (
                  <svg
                    aria-hidden
                    width="13" height="13" viewBox="0 0 24 24"
                    fill="none" stroke="var(--pl-gold, #C19A4B)" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <Link
            href="/dashboard/event"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--peach-ink, #C6703D)',
              textDecoration: 'none',
            }}
          >
            <Icon name="sparkles" size={12} /> Manage sites
          </Link>
        </div>
      )}
    </div>
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
  // v2 IA — static mono group label (no collapse), then the items.
  // The active item carries its own ink pill (NavLink), so there's
  // no measured sliding-pill machinery anymore.
  const headerless = !group.label || group.label.trim().length === 0;
  return (
    <div className="dash-navgroup">
      {!headerless && (
        <div
          className="dash-grouplabel"
          style={{
            padding: '4px 12px 6px',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
          }}
        >
          {group.label}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {group.items.map((item) => {
          const isActive = active ? item.id === active : pathname === item.href;
          // Real unread-activity count rides the Guests badge (the
          // v2 mock showed a static "5"); never fabricated.
          const liveBadge = item.id === 'guests' && unread > 0 ? String(unread) : item.badge;
          return (
            <NavLink
              key={item.id}
              item={item}
              isActive={isActive}
              liveBadge={liveBadge}
              badgeTone={item.id === 'gallery' ? 'gold' : 'peach'}
            />
          );
        })}
      </div>
    </div>
  );
}

/* DashNavGlyph — the v2 in-house sidebar line-icon set
   (handoff-v2/ui_kits/dashboard/Icons.jsx). 24×24, fill:none, 1.75px
   round-cap strokes. Each glyph carries data-icon so the bespoke
   per-icon hover motion in pearloom.css can target it
   (.dash-navbtn:hover .dash-navicon svg[data-icon="…"]). Kept local to
   the sidebar so the rest of the app's Icon usage is untouched. */
const DASH_NAV_GLYPHS: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.5 14.6A5.5 5.5 0 0 1 20.5 20"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sparkles: '<path d="M12 3.5c.5 3.4 1.6 4.5 5 5-3.4.5-4.5 1.6-5 5-.5-3.4-1.6-4.5-5-5 3.4-.5 4.5-1.6 5-5Z"/><path d="M18.5 13.5c.3 1.6.8 2.1 2.4 2.4-1.6.3-2.1.8-2.4 2.4-.3-1.6-.8-2.1-2.4-2.4 1.6-.3 2.1-.8 2.4-2.4Z"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4.5 17.5 9 13l3 2.5L15.5 11l4.5 5"/>',
  gift: '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13"/><path d="M12 9v11.5"/><path d="M12 9S10.8 4.5 8.5 4.5a2 2 0 0 0 0 4.5Z"/><path d="M12 9s1.2-4.5 3.5-4.5a2 2 0 0 1 0 4.5Z"/>',
  bars: '<path d="M4 20V11"/><path d="M9.3 20V5"/><path d="M14.6 20v-6.5"/><path d="M20 20V8"/>',
  grid: '<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/>',
  heart: '<path d="M12 20S4 14.5 4 9a4.2 4.2 0 0 1 8-1.6A4.2 4.2 0 0 1 20 9c0 5.5-8 11-8 11Z"/>',
};
/* Production nav-item icon name → v2 glyph + the data-icon the CSS
   animation targets. Unknown names fall back to the production <Icon>. */
const DASH_NAV_GLYPH_ALIAS: Record<string, string> = { 'heart-icon': 'heart' };

function DashNavGlyph({ name, size = 18 }: { name: string; size?: number }) {
  const key = DASH_NAV_GLYPH_ALIAS[name] ?? name;
  const body = DASH_NAV_GLYPHS[key];
  if (!body) return <Icon name={name} size={size} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon={key}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

function NavLink({
  item,
  isActive,
  liveBadge,
  badgeTone = 'peach',
}: {
  item: DashNavItem;
  isActive: boolean;
  liveBadge?: string;
  badgeTone?: 'peach' | 'gold';
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
  // v2 NavLink — ink pill on the active item (data-on), a thread
  // hover-rail (olive→gold) that draws in at the left edge of idle
  // items, and the bespoke per-icon hover motion (CSS, keyed on the
  // glyph's data-icon). Hover bg + all motion live in pearloom.css.
  return (
    <Link
      data-nav-active={isActive ? '1' : undefined}
      data-on={isActive ? '1' : undefined}
      data-nav-pending={pending ? '1' : undefined}
      href={item.href}
      onClick={handleClick}
      className="pl8-dash-navlink dash-navbtn"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--cream)' : 'var(--ink)',
        backgroundColor: isActive ? 'var(--ink)' : 'transparent',
        textDecoration: 'none',
        zIndex: 1,
      }}
    >
      <span className="dash-navrail" aria-hidden="true" />
      <span className="dash-navicon" style={{ display: 'inline-flex' }}>
        <DashNavGlyph name={item.icon} />
      </span>
      <span className="dash-navlabel" style={{ flex: 1 }}>{item.label}</span>
      {pending && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: isActive ? 'var(--cream)' : 'var(--peach-ink, #C6703D)',
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
          className="dash-navbadge"
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            fontWeight: 700,
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            background: isActive
              ? 'color-mix(in oklab, var(--cream) 18%, transparent)'
              : (badgeTone === 'gold' ? 'rgba(193,154,75,0.18)' : 'var(--peach-bg)'),
            color: isActive
              ? 'var(--cream)'
              : (badgeTone === 'gold' ? '#8A6A2E' : 'var(--peach-ink)'),
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
        background: isActive ? 'var(--cream)' : 'var(--peach-ink, #C6703D)',
        display: 'inline-block',
        marginRight: 4,
        animation: 'pl-dot-pulse 0.9s ease-in-out infinite',
        flexShrink: 0,
      }}
    />
  );
}

/** Mobile-only sticky strip mounted once by ShellPersistentLayout:
 *  hamburger (opens the sidebar drawer) · wordmark · account avatar.
 *
 *  The drawer trigger used to live only inside DashTopbar — pages on
 *  the PLChrome/PLHead chrome never mounted one, so on a phone there
 *  was NO way to reach the other dashboard sections or sign out.
 *  Hidden ≥960px via .pl8-dash-mobilebar (the drawer breakpoint). */
export function DashMobileBar() {
  const { toggle, open } = useDashDrawer();
  return (
    <div className="pl8-dash-mobilebar">
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          border: '1px solid var(--line)',
          background: 'var(--card)',
          color: 'var(--ink)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
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
      <Link href="/dashboard" aria-label="Dashboard home" style={{ display: 'flex', alignItems: 'center', color: 'var(--ink)' }}>
        <PearloomLogo size={24} />
      </Link>
      {/* Account · notifications · theme — the global controls, on
          mobile. Previously the mobile bar carried only the avatar,
          so phones had no bell or theme toggle at all. The cluster
          is pushed right; the avatar opens the settings modal. */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ThemeToggle size="md" />
        <NotificationBell />
        <TopbarAvatarButton />
      </div>
    </div>
  );
}

/* ── DashUtilityBar — the persistent top-right control cluster ──
   The global chrome (theme · notifications · account) lives HERE,
   mounted once by the shell, instead of being re-implemented in
   every page's topbar (DashTopbar) and again inline (WelcomeHome).
   Pages that hide their topbar or use PLHead now still get the
   controls. Sticky to the viewport top; desktop only — phones use
   DashMobileBar above. Right-aligned over a hairline glass strip
   so it reads as chrome, not content. */
export function DashUtilityBar() {
  return (
    <div className="pl8-dash-utilitybar" data-utilitybar>
      {/* Ask-Pear / jump-to search — opens the ⌘K command palette.
          Matches the v2 design system's persistent utility-bar search. */}
      <button
        type="button"
        className="pl8-dash-ask"
        onClick={() => window.dispatchEvent(new CustomEvent('pl-open-command'))}
        aria-label="Ask Pear, or jump to anything"
      >
        <Icon name="search" size={15} />
        <span className="pl8-dash-ask-label">Ask Pear anything, or jump to a block…</span>
        <span className="pl8-dash-ask-kbd">⌘K</span>
      </button>
      <span style={{ flex: 1 }} aria-hidden />
      <ThemeToggle size="md" />
      <NotificationBell />
      <TopbarAvatarButton />
    </div>
  );
}

/** Avatar button at the top-right of every dashboard topbar. Opens
 *  the user-settings modal directly. Mirrors the Claude-app pattern
 *  of "tap your face for account". The sidebar UserMenu remains the
 *  primary entry; this is the alternate path the user expects from
 *  a topbar avatar. */
export function TopbarAvatarButton() {
  const { data: session } = useSession();
  const { openTab } = useUserSettings();
  const { avatarId } = useUserAvatar();
  const name = session?.user?.name ?? 'Guest';
  const initial = (name.trim()[0] ?? 'P').toUpperCase();
  return (
    <button
      type="button"
      onClick={() => openTab('account')}
      aria-label="Open account settings"
      title="Account"
      style={{
        width: 32,
        height: 32,
        padding: 0,
        borderRadius: '50%',
        cursor: 'pointer',
        flexShrink: 0,
        background: avatarId
          ? 'transparent'
          : 'linear-gradient(135deg, var(--sage-deep), var(--sage, #9ca77a))',
        color: 'var(--cream)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 13,
        fontWeight: 700,
        border: '2px solid var(--card)',
        boxShadow: '0 1px 3px rgba(61,74,31,0.18)',
        overflow: 'hidden',
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
    >
      {avatarId ? <PlAvatar id={avatarId} size={28} /> : initial}
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
        // Match page content maxWidth (1240) so the title aligns
        // with the content rail beneath it. Left-aligned with an
        // in-flow action cluster — the old centered title +
        // absolute right cluster could overlap at mid widths, and
        // split the dashboard into two title paradigms (Home was
        // already left-aligned).
        maxWidth: 1240,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
      <h1
        className="display pl-letterpress"
        style={{
          fontSize: 'clamp(28px, 3.6vw, 38px)',
          margin: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
        {showHeart && (
          /* The pearl — the same gold bead knotted into the logo's
             weft, as a full-stop after the page title. (Was an 18px
             Heart→Sprig alias, which read as a meaningless slash.) */
          <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden style={{ flexShrink: 0, marginTop: 6 }}>
            <circle cx="6" cy="6" r="4.4" fill="var(--pl-gold, #C19A4B)" stroke="var(--pl-cream, #FDFAF0)" strokeWidth="1.4" />
          </svg>
        )}
      </h1>
      {subtitle && (
        <div
          style={{
            marginTop: 6,
            fontSize: 13.5,
            color: 'var(--ink-soft)',
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
      )}
      </div>
      {/* The global controls (theme · bell · account) used to live
          here, duplicated on every page. They're now mounted once
          by the shell's DashUtilityBar, so this row carries only
          the page's own actions + CTA. */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          flexShrink: 0,
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
  const pathname = usePathname();
  void active; // sidebar reads pathname directly when persistent

  // Route-keyed children wrapper — remounts on every tab change so
  // the CSS .pl8-dash-page-enter animation retriggers. Without this
  // key, navigation between tabs would only fire the animation
  // once on initial mount.
  const pageKey = `page:${pathname}`;

  if (insideShell) {
    // ShellPersistentLayout already wraps children in a
    // pathname-keyed pl8-dash-page-enter div, so we DON'T
    // double-wrap here. Just render the topbar + children.
    void pageKey;
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
        <DashMobileBar />
        {/* Global controls (theme · notifications · account), mounted
            once — matches the persistent-shell path. */}
        <DashUtilityBar />
        {/* Paper grain — the brand's fixed warm underlay (BRAND.md §3),
            previously missing from the dashboard entirely. Wrapper
            opacity halves the utility's 0.35 so the work surface
            stays quiet enough to read through. */}
        <div aria-hidden className="pl-grain" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
          <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
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
          <div key={pageKey} className="pl8-dash-page-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
