'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/dash/DashShell.tsx
//
// Shared dashboard chrome. Every page in /marketing/design/dash/
// mounts <DashShell/>. The shell renders:
//   • Sidebar     — nav groups + Pear credits card (read from
//                    site count until a real credits API exists)
//   • TopbarGlobal — Pear search (⌘K), site selector pill, live
//                    avatar from NextAuth session
//   • Topbar (per-page)
//   • Panel / SectionTitle primitives
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Bloom } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';

interface NavGroup {
  group: string;
  items: Array<{ k: string; l: string; i: string; href: string; needsSite?: boolean }>;
}

const NAV: NavGroup[] = [
  {
    group: 'YOUR LOOM',
    items: [
      { k: 'sites',    l: 'Sites',        i: '✦', href: '/dashboard' },
      { k: 'director', l: 'The Director', i: '❧', href: '/dashboard/director', needsSite: true },
    ],
  },
  {
    group: 'PER EVENT',
    items: [
      { k: 'dayof',       l: 'Day-of room', i: '◉', href: '/dashboard/day-of',      needsSite: true },
      { k: 'guests',      l: 'Guests',      i: '☞', href: '/dashboard/rsvp',        needsSite: true },
      { k: 'submissions', l: 'Submissions', i: '✢', href: '/dashboard/submissions', needsSite: true },
      { k: 'gallery',     l: 'The Reel',    i: '◎', href: '/dashboard/gallery' },
      { k: 'connections', l: 'Connections', i: '∞', href: '/dashboard/connections' },
    ],
  },
  {
    group: 'THE HOUSE',
    items: [
      { k: 'marketplace', l: 'Marketplace', i: '⛉', href: '/marketplace' },
      { k: 'analytics',   l: 'Analytics',   i: '▲', href: '/dashboard/analytics', needsSite: true },
    ],
  },
  {
    group: 'YOU',
    items: [
      { k: 'settings', l: 'Settings', i: '◇', href: '/dashboard/profile' },
    ],
  },
];

interface DashShellProps {
  children: ReactNode;
  /** Skip the per-page topbar wrap. (Advanced — rarely needed.) */
  bare?: boolean;
}

// DashShell now delegates its chrome to the Pearloom v8 DashLayout so
// every existing dashboard page automatically adopts the new warm
// sidebar + topbar. The internal components (Panel, SectionTitle,
// Topbar, etc.) below are preserved for compatibility — they render
// inside the v8 main column.
import { DashLayout as PearloomDashLayout } from '@/components/pearloom/dash/DashShell';
import { usePathname as useDashPathname } from 'next/navigation';

export function DashShell({ children }: DashShellProps) {
  const { status } = useSession();
  const pathname = useDashPathname() ?? '';

  // Auth redirect happens at the /dashboard/layout.tsx level now.
  // Public dashboard surfaces (e.g. /marketplace) stay reachable.
  useEffect(() => {
    if (pathname.startsWith('/dashboard') && status === 'unauthenticated') {
      void signIn();
    }
  }, [status, pathname]);

  if (status === 'loading' && pathname.startsWith('/dashboard')) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--cream)',
          color: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Pear size={44} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
          <div
            style={{
              ...DISPLAY_STYLE,
              fontStyle: 'italic',
              fontSize: 22,
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Threading…
          </div>
        </div>
      </div>
    );
  }

  // Map the current path to the v8 sidebar's active key.
  let active: string | undefined = undefined;
  if (pathname === '/dashboard') active = 'dashboard';
  else if (pathname.startsWith('/dashboard/day-of')) active = 'timeline';
  else if (pathname.startsWith('/dashboard/rsvp')) active = 'guests';
  else if (pathname.startsWith('/dashboard/analytics')) active = 'analytics';
  else if (pathname.startsWith('/dashboard/connections')) active = 'connections';
  else if (pathname.startsWith('/dashboard/profile')) active = 'settings';
  else if (pathname.startsWith('/dashboard/gallery') || pathname.startsWith('/dashboard/submissions')) active = 'sites';
  else if (pathname.startsWith('/dashboard/event')) active = 'sites';
  else if (pathname.startsWith('/dashboard/director')) active = 'studio';

  return (
    <PearloomDashLayout active={active} hideTopbar>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {children}
      </div>
    </PearloomDashLayout>
  );
}

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar() {
  const pathname = usePathname() ?? '/dashboard';
  const { data: session } = useSession();
  const { sites } = useUserSites();
  const { site } = useSelectedSite();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // First name from session; fall back to email handle.
  const firstName =
    session?.user?.name?.split(' ')[0]?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'Host';

  const sitesCount = sites?.length ?? 0;
  const displayedLoom =
    site ? siteDisplayName(site).toUpperCase() : `${firstName.toUpperCase()}'S LOOM`;

  return (
    <aside
      style={{
        width: 252,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        padding: '26px 18px 20px',
        background: PD.paper,
        borderRight: '1px solid rgba(31,36,24,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '2px 10px 22px',
          textDecoration: 'none',
          color: PD.ink,
        }}
      >
        <Pear size={34} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Pearloom
          </div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 9,
              opacity: 0.5,
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
            title={displayedLoom}
          >
            {displayedLoom}
          </div>
        </div>
      </Link>

      {NAV.map((g, gi) => (
        <div key={g.group} style={{ marginTop: gi === 0 ? 0 : 14 }}>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 9,
              opacity: 0.5,
              padding: '0 12px 8px',
            }}
          >
            {g.group}
          </div>
          {g.items.map((it) => {
            const active = isActive(it.href);
            const disabled = it.needsSite && sitesCount === 0;
            const href = disabled ? '/dashboard' : it.href;
            return (
              <Link
                key={it.k}
                href={href}
                aria-disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '9px 12px',
                  background: active ? PD.ink : 'transparent',
                  color: active ? PD.paper : PD.ink,
                  border: 'none',
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  marginBottom: 2,
                  transition: 'all 140ms',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active && !disabled) e.currentTarget.style.background = 'rgba(31,36,24,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!active && !disabled) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    opacity: active ? 1 : 0.7,
                    fontFamily: '"Fraunces", Georgia, serif',
                  }}
                >
                  {it.i}
                </span>
                <span>{it.l}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Your loom — count card. Updates live with sites count. */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PD.paper2} 0%, ${PD.paper} 100%)`,
          border: '1px solid rgba(31,36,24,0.12)',
          borderRadius: 16,
          padding: '14px 14px 12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -14, right: -14, opacity: 0.5 }} aria-hidden>
          <Bloom size={50} color={PD.butter} centerColor={PD.terra} speed={10} />
        </div>
        <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6, marginBottom: 6 }}>YOUR LOOM</div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 20,
            fontStyle: 'italic',
            lineHeight: 1,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {sitesCount} <span style={{ color: PD.olive }}>
            {sitesCount === 1 ? 'site' : 'sites'}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: 11,
            color: PD.inkSoft,
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {sitesCount === 0
            ? 'Begin your first thread'
            : `Hosted by ${session?.user?.email ?? 'you'}`}
        </div>
        <Link
          href="/wizard/new"
          style={{
            marginTop: 10,
            width: '100%',
            background: PD.ink,
            color: PD.paper,
            border: 'none',
            borderRadius: 999,
            padding: '7px 10px',
            fontSize: 11.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          {sitesCount === 0 ? 'Begin a thread →' : 'New site →'}
        </Link>
      </div>
    </aside>
  );
}

// ── TopbarGlobal ─────────────────────────────────────────────
function TopbarGlobal() {
  const { data: session } = useSession();
  const { sites, site, selectSite } = useSelectedSite();
  const [focus, setFocus] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  const name = session?.user?.name ?? session?.user?.email ?? '';
  const email = session?.user?.email ?? '';
  const initial = (session?.user?.name?.[0] || session?.user?.email?.[0] || 'P').toUpperCase();
  const image = session?.user?.image ?? null;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(244,236,216,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(31,36,24,0.08)',
        padding: '10px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          flex: 1,
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: focus ? PD.paperCard : PD.paper3,
          border: `1px solid rgba(31,36,24,${focus ? 0.2 : 0.1})`,
          borderRadius: 999,
          padding: '8px 14px',
          transition: 'all 160ms',
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.5, fontFamily: '"Fraunces", Georgia, serif' }}>✦</span>
        <input
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Ask Pear anything, or jump to a block..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            color: PD.ink,
          }}
        />
        <span
          style={{
            ...MONO_STYLE,
            fontSize: 9,
            opacity: 0.5,
            padding: '2px 6px',
            background: 'rgba(31,36,24,0.08)',
            borderRadius: 4,
          }}
        >
          ⌘K
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {sites && sites.length > 1 && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            style={{
              border: '1px solid rgba(31,36,24,0.14)',
              background: 'transparent',
              borderRadius: 999,
              padding: '7px 12px',
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'inherit',
              color: PD.ink,
              maxWidth: 240,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 99, background: PD.olive }} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {site ? siteDisplayName(site) : 'All sites'}
            </span>
            <span style={{ opacity: 0.55 }}>⌄</span>
          </button>
          {pickerOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: 240,
                background: PD.paperCard,
                border: '1px solid rgba(31,36,24,0.14)',
                borderRadius: 14,
                padding: 6,
                boxShadow: '0 18px 40px -16px rgba(31,36,24,0.3)',
                zIndex: 30,
              }}
            >
              {sites.map((s) => {
                const active = site?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      selectSite(s.id);
                      setPickerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: active ? PD.paper2 : 'transparent',
                      border: 'none',
                      borderRadius: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: PD.ink,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: active ? PD.olive : PD.stone,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {siteDisplayName(s)}
                      </div>
                      <div style={{ fontSize: 11, color: '#6A6A56' }}>
                        {s.occasion ?? 'site'} · {s.domain}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title={name}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          style={{
            position: 'relative',
            width: 34,
            height: 34,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 999,
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: PD.paper,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
              }}
            >
              {initial}
            </div>
          )}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: -1,
              bottom: -1,
              width: 10,
              height: 10,
              borderRadius: 99,
              background: PD.olive,
              border: `2px solid ${PD.paper}`,
            }}
          />
        </button>
        {menuOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 220,
              background: PD.paperCard,
              border: '1px solid rgba(31,36,24,0.14)',
              borderRadius: 14,
              padding: 6,
              boxShadow: '0 18px 40px -16px rgba(31,36,24,0.3)',
              zIndex: 40,
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                padding: '10px 12px 12px',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: PD.ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {session?.user?.name || 'You'}
              </div>
              {email && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#6A6A56',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {email}
                </div>
              )}
            </div>
            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              style={menuItemStyle}
            >
              Profile
            </Link>
            <Link
              href="/dashboard/connections"
              onClick={() => setMenuOpen(false)}
              style={menuItemStyle}
            >
              Connections
            </Link>
            <Link
              href="/dashboard/help"
              onClick={() => setMenuOpen(false)}
              style={menuItemStyle}
            >
              Help
            </Link>
            <div style={{ height: 1, background: 'rgba(31,36,24,0.08)', margin: '4px 0' }} />
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              style={{ ...menuItemStyle, color: PD.terra, background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const menuItemStyle: CSSProperties = {
  display: 'block',
  padding: '9px 12px',
  fontSize: 13,
  color: PD.ink,
  borderRadius: 8,
  textDecoration: 'none',
  fontFamily: 'inherit',
};

// ── Topbar (per-page) ────────────────────────────────────────
interface TopbarProps {
  subtitle?: string;
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}
export function Topbar({ subtitle, title, actions, children }: TopbarProps) {
  // Centered layout to match the v8 PearloomDashLayout topbar.
  // Title + subtitle stack vertically and centre; actions absolute-
  // anchor to the top-right so they don't shift the title's centre.
  // Replaces the old left-aligned space-between header so every
  // dashboard page reads with the same centered identity.
  return (
    <header
      data-topbar
      style={{
        position: 'relative',
        padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 56px) clamp(12px, 2vw, 20px)',
        textAlign: 'center',
        maxWidth: 1480,
        margin: '0 auto',
        width: '100%',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {subtitle && (
        <div
          className="eyebrow"
          style={{ fontSize: 11, marginBottom: 8, color: 'var(--peach-ink)' }}
        >
          {subtitle}
        </div>
      )}
      <h1
        className="display"
        style={{
          fontSize: 'clamp(32px, 4.4vw, 44px)',
          lineHeight: 1.08,
          margin: 0,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          maxWidth: 820,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {title}
      </h1>
      {children && (
        <div
          style={{
            marginTop: 12,
            color: 'var(--ink-soft)',
            fontSize: 14.5,
            lineHeight: 1.5,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {children}
        </div>
      )}
      {actions && (
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
        </div>
      )}
    </header>
  );
}

// ── Panel ─────────────────────────────────────────────────────
interface PanelProps {
  children?: ReactNode;
  style?: CSSProperties;
  bg?: string;
  padding?: number | string;
  border?: boolean;
}
export function Panel({
  children,
  style,
  bg,
  padding = 28,
  border = true,
}: PanelProps) {
  return (
    <div
      style={{
        background: bg ?? 'var(--card)',
        borderRadius: 20,
        border: border ? '1px solid var(--card-ring)' : 'none',
        boxShadow: 'var(--shadow-sm)',
        padding,
        position: 'relative',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── SectionTitle ─────────────────────────────────────────────
interface SectionTitleProps {
  eyebrow?: string;
  title: ReactNode;
  italic?: ReactNode;
  accent?: string;
  style?: CSSProperties;
}
export function SectionTitle({
  eyebrow,
  title,
  italic,
  accent,
  style,
}: SectionTitleProps) {
  const accentColor = accent ?? 'var(--peach-ink)';
  return (
    <div style={{ marginBottom: 20, fontFamily: 'var(--font-ui)', ...style }}>
      {eyebrow && (
        <div
          className="eyebrow"
          style={{ fontSize: 11, marginBottom: 6, color: accentColor }}
        >
          {eyebrow}
        </div>
      )}
      <div
        className="display"
        style={{
          fontSize: 22,
          lineHeight: 1.1,
          fontWeight: 600,
          letterSpacing: '-0.015em',
        }}
      >
        {title}{' '}
        {italic && (
          <span
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              color: accentColor,
            }}
          >
            {italic}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Common empty / loading placeholders ──────────────────────
export function EmptyShell({ message }: { message: string }) {
  return (
    <main style={{ padding: '60px 40px 80px', maxWidth: 720 }}>
      <Panel bg={PD.paper3} style={{ padding: 40, textAlign: 'center' }}>
        <Pear size={48} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <div
          style={{
            ...DISPLAY_STYLE,
            fontStyle: 'italic',
            fontSize: 22,
            color: PD.olive,
            marginTop: 14,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {message}
        </div>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 20,
            padding: '10px 16px',
            background: PD.ink,
            color: PD.paper,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          ← Back to Sites
        </Link>
      </Panel>
    </main>
  );
}

// ── Button styles ────────────────────────────────────────────
export const btnInk: CSSProperties = {
  background: 'var(--ink)',
  color: 'var(--cream)',
  border: 'none',
  borderRadius: 999,
  padding: '10px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};
export const btnGhost: CSSProperties = {
  background: 'var(--card)',
  color: 'var(--ink)',
  border: '1.5px solid var(--line)',
  borderRadius: 999,
  padding: '10px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
export const btnMini: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
export const btnMiniGhost: CSSProperties = {
  background: 'var(--card)',
  color: 'var(--ink)',
  border: '1.5px solid var(--line)',
  borderRadius: 999,
  padding: '7px 12px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};
