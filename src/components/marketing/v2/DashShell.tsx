'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/v2/DashShell.tsx
// Left-sidebar + topbar shell for every /dashboard/* surface.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { siteDisplayName, useSelectedSite } from '../design/dash/hooks';

interface NavItem {
  k: string;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number | string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const I = (s: string) => (
  <span style={{ fontSize: 14, width: 18, display: 'inline-flex', justifyContent: 'center' }}>{s}</span>
);

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'MY SITES',
    items: [],
  },
  {
    group: 'CREATE NEW',
    items: [
      { k: 'new-scratch', label: 'Start from scratch', href: '/wizard/new', icon: I('＋') },
      { k: 'new-templates', label: 'Browse templates', href: '/marketplace', icon: I('❐') },
      { k: 'new-import', label: 'Import content', href: '/wizard/new?mode=photos', icon: I('⇧') },
    ],
  },
  {
    group: 'TOOLS',
    items: [
      { k: 'guests', label: 'Guest list manager', href: '/rsvps', icon: I('⚇') },
      { k: 'images', label: 'Image library', href: '/photos', icon: I('▦') },
      { k: 'assets', label: 'Design assets', href: '/dashboard/gallery', icon: I('◆') },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { k: 'notifs', label: 'Notifications', href: '/dashboard/profile#notifications', icon: I('◉'), badge: 2 },
      { k: 'brand', label: 'Brand kit', href: '/brand/groove', icon: I('▲') },
      { k: 'settings', label: 'Settings', href: '/dashboard/profile', icon: I('✱') },
    ],
  },
];

export function DashShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer when pathname changes (user navigated)
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  return (
    <div
      style={{
        background: PD.paper,
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        color: PD.ink,
        fontFamily: 'var(--pl-font-body)',
      }}
      className="pl-dash-v2-root"
    >
      <Sidebar pathname={pathname} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onToggleDrawer={() => setDrawerOpen((v) => !v)} />
        <div
          style={{ flex: 1, padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 40px) 80px' }}
        >
          {children}
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="pl-dash-v2-scrim"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(31,36,24,0.42)',
              zIndex: 60,
              animation: 'pl-enter-fade-in 180ms ease',
            }}
          />
          <div
            className="pl-dash-v2-drawer"
            role="dialog"
            aria-label="Navigation"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(82vw, 320px)',
              background: PD.paper,
              zIndex: 61,
              boxShadow: '0 0 60px rgba(31,36,24,0.22)',
              overflowY: 'auto',
              padding: '22px 16px',
              animation: 'pl-drawer-slide-in 260ms cubic-bezier(.22,1,.36,1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  textDecoration: 'none',
                  color: PD.ink,
                }}
              >
                <Pear size={26} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
                <span
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 20,
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Pearloom
                </span>
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: PD.paperCard,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: PD.ink,
                }}
              >
                ×
              </button>
            </div>
            <SidebarBody pathname={pathname} />
          </div>
        </>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl-dash-v2-root) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl-dash-v2-sidebar) {
            display: none !important;
          }
          :global(.pl-dash-v2-hamburger) {
            display: inline-flex !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pl-dash-v2-search) {
            display: none !important;
          }
          :global(.pl-dash-v2-username) {
            display: none !important;
          }
        }
        @keyframes pl-drawer-slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string | null }) {
  return (
    <aside
      className="pl-dash-v2-sidebar"
      style={{
        borderRight: '1px solid rgba(31,36,24,0.06)',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'sticky',
        top: 0,
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px',
          textDecoration: 'none',
          color: PD.ink,
          marginBottom: 14,
        }}
      >
        <Pear size={28} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <span style={{ ...DISPLAY_STYLE, fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Pearloom
        </span>
      </Link>
      <SidebarBody pathname={pathname} />
    </aside>
  );
}

function SidebarBody({ pathname }: { pathname: string | null }) {
  const { sites } = useSelectedSite();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <NavLink
        href="/dashboard"
        label="Dashboard"
        icon={I('⌂')}
        active={pathname === '/dashboard'}
        highlighted
      />

      <NavGroupHeader>MY SITES</NavGroupHeader>
      {sites?.slice(0, 5).map((s) => (
        <Link
          key={s.id}
          href={`/editor/${s.domain}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 10,
            textDecoration: 'none',
            color: PD.ink,
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: PD.paperCard,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Pear size={14} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {siteDisplayName(s)}
          </span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: PD.olive }} />
        </Link>
      ))}
      {!sites?.length && (
        <div style={{ fontSize: 11.5, color: PD.inkSoft, opacity: 0.6, padding: '4px 10px' }}>
          No sites yet
        </div>
      )}

      {NAV_GROUPS.slice(1).map((g) => (
        <div key={g.group} style={{ marginTop: 4 }}>
          <NavGroupHeader>{g.group}</NavGroupHeader>
          {g.items.map((it) => (
            <NavLink
              key={it.k}
              href={it.href}
              label={it.label}
              icon={it.icon}
              badge={it.badge}
              active={pathname === it.href}
            />
          ))}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div
        style={{
          marginTop: 16,
          padding: 14,
          background: '#E8DFE9',
          borderRadius: 14,
          fontSize: 12,
          lineHeight: 1.5,
          color: PD.ink,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Pear size={14} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <span style={{ fontWeight: 600 }}>Pear tip</span>
        </div>
        <div style={{ color: PD.inkSoft, marginBottom: 10 }}>
          Keep everything in one place. Link related celebrations so guests always have the right
          info at hand.
        </div>
        <Link
          href="/dashboard/connections"
          style={{
            display: 'inline-block',
            background: '#FFFEF7',
            border: '1px solid rgba(31,36,24,0.08)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 11,
            color: PD.ink,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Link a celebration →
        </Link>
      </div>
    </div>
  );
}

function NavGroupHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...MONO_STYLE,
        fontSize: 9,
        color: PD.inkSoft,
        opacity: 0.6,
        letterSpacing: '0.22em',
        padding: '16px 10px 6px',
      }}
    >
      {children}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  badge,
  active,
  highlighted,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
  active?: boolean;
  highlighted?: boolean;
}) {
  const bg = active && highlighted ? '#E8DFE9' : active ? PD.paperCard : 'transparent';
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 10px',
        borderRadius: 10,
        background: bg,
        textDecoration: 'none',
        color: PD.ink,
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span
          style={{
            fontSize: 10,
            background: '#6E5BA8',
            color: '#FFFEF7',
            padding: '2px 6px',
            borderRadius: 999,
            minWidth: 16,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function Topbar({ onToggleDrawer }: { onToggleDrawer: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { sites, site, selectSite } = useSelectedSite();
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!picker && !menu) return;
    const close = () => {
      setPicker(false);
      setMenu(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [picker, menu]);

  const name = session?.user?.name ?? session?.user?.email ?? 'You';
  const email = session?.user?.email ?? '';
  const image = session?.user?.image ?? null;
  const initial = (session?.user?.name?.[0] || session?.user?.email?.[0] || 'P').toUpperCase();

  const firstName = useMemo(() => name.split(/[\s@]/)[0], [name]);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(244,236,216,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(31,36,24,0.06)',
        padding: '14px clamp(16px, 4vw, 40px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="pl-dash-v2-hamburger"
        onClick={onToggleDrawer}
        aria-label="Open menu"
        style={{
          display: 'none',
          width: 40,
          height: 40,
          borderRadius: 999,
          background: '#FFFEF7',
          border: '1px solid rgba(31,36,24,0.08)',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
          fontSize: 18,
          color: PD.ink,
          flexShrink: 0,
        }}
      >
        ☰
      </button>

      {/* Site picker */}
      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setPicker((v) => !v)}
          style={{
            background: '#FFFEF7',
            border: '1px solid rgba(31,36,24,0.08)',
            borderRadius: 12,
            padding: '8px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: PD.ink,
          }}
        >
          <span
            style={{
              fontWeight: 500,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {site ? siteDisplayName(site) : 'Pick a site'}
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </button>
        {picker && sites && sites.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: 260,
              background: '#FFFEF7',
              border: '1px solid rgba(31,36,24,0.1)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 18px 40px rgba(31,36,24,0.16)',
              zIndex: 30,
            }}
          >
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  selectSite(s.id);
                  setPicker(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '9px 10px',
                  background: site?.id === s.id ? PD.paperCard : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  textAlign: 'left',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: PD.ink,
                }}
              >
                {siteDisplayName(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div
        className="pl-dash-v2-search"
        style={{ flex: 1, maxWidth: 520, position: 'relative' }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: 14,
            transform: 'translateY(-50%)',
            fontSize: 14,
            color: PD.inkSoft,
            opacity: 0.6,
          }}
        >
          ⌕
        </span>
        <input
          placeholder="Search anything…"
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            background: '#FFFEF7',
            border: '1px solid rgba(31,36,24,0.08)',
            borderRadius: 999,
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            color: PD.ink,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Chat pill */}
      <button
        onClick={() => router.push('/dashboard/help')}
        aria-label="Messages"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: '#FFFEF7',
          border: '1px solid rgba(31,36,24,0.08)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        <Pear size={18} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
      </button>

      {/* Bell */}
      <button
        aria-label="Notifications"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: '#FFFEF7',
          border: '1px solid rgba(31,36,24,0.08)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          position: 'relative',
        }}
      >
        ◉
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: '#C47A4A',
            color: '#FFFEF7',
            fontSize: 9,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          2
        </span>
      </button>

      {/* User menu */}
      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenu((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'inherit',
            color: PD.ink,
          }}
        >
          {image ? (
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                overflow: 'hidden',
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <Image src={image} alt={name} fill sizes="34px" style={{ objectFit: 'cover' }} />
            </span>
          ) : (
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
                color: PD.paper,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {initial}
            </span>
          )}
          <span
            className="pl-dash-v2-username"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            {firstName}
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </button>
        {menu && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 220,
              background: '#FFFEF7',
              border: '1px solid rgba(31,36,24,0.1)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 18px 40px rgba(31,36,24,0.16)',
              zIndex: 30,
            }}
          >
            <div
              style={{
                padding: '10px 12px 12px',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
              {email && (
                <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: 2 }}>{email}</div>
              )}
            </div>
            <Link href="/dashboard/profile" style={menuItem}>Profile</Link>
            <Link href="/dashboard/connections" style={menuItem}>Connections</Link>
            <Link href="/dashboard/help" style={menuItem}>Help</Link>
            <div style={{ height: 1, background: 'rgba(31,36,24,0.08)', margin: '4px 0' }} />
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{
                ...menuItem,
                background: 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                color: PD.plum,
                fontFamily: 'inherit',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const menuItem: React.CSSProperties = {
  display: 'block',
  padding: '8px 12px',
  fontSize: 13,
  color: PD.ink,
  textDecoration: 'none',
  borderRadius: 8,
  fontFamily: 'inherit',
};
