'use client';

/* ========================================================================
   PEARLOOM — DASHBOARD SHELL (v8)
   Shared sidebar + topbar scaffold.
   ======================================================================== */

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Blob, Heart, Icon, Pear, PearloomLogo, Squiggle } from '../motifs';

interface DashNavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

const DASH_NAV: DashNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/dashboard' },
  { id: 'sites', label: 'My Sites', icon: 'layout', href: '/dashboard/event' },
  { id: 'timeline', label: 'Timeline', icon: 'clock', href: '/dashboard/day-of' },
  { id: 'guests', label: 'Guests', icon: 'users', href: '/dashboard/rsvp' },
  { id: 'bridge', label: 'The bridge', icon: 'sparkles', href: '/dashboard/bridge' },
  { id: 'library', label: 'Photo library', icon: 'image', href: '/dashboard/library' },
  { id: 'invite', label: 'Invite designer', icon: 'mail', href: '/dashboard/invite' },
  { id: 'passport-cards', label: 'Passport cards', icon: 'user-plus', href: '/dashboard/passport-cards' },
  { id: 'keepsakes', label: 'Keepsakes', icon: 'heart-icon', href: '/dashboard/keepsakes' },
  { id: 'memory-book', label: 'Memory book', icon: 'grid', href: '/dashboard/memory-book' },
  { id: 'templates', label: 'Templates', icon: 'grid', href: '/templates' },
  { id: 'connections', label: 'Guest Manager', icon: 'user-plus', href: '/dashboard/connections' },
  { id: 'analytics', label: 'Analytics', icon: 'sparkles', href: '/dashboard/analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/dashboard/profile' },
];

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
      style={{
        width: 260,
        flexShrink: 0,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--cream)',
        borderRight: '1px solid var(--line-soft)',
        minHeight: '100vh',
      }}
    >
      <Link href="/" className="pl8-dash-logo" style={{ padding: '4px 8px 12px' }}>
        <PearloomLogo />
      </Link>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-ring)',
          borderRadius: 14,
          padding: 10,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg,#F0C9A8,#C4B5D9)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Your celebration
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Tap to switch</div>
        </div>
      </div>

      <nav className="pl8-dash-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
        {DASH_NAV.map((item) => {
          const isActive = active ? item.id === active : pathname === item.href;
          const liveBadge = item.id === 'bridge' && unread > 0 ? String(unread) : item.badge;
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                background: isActive ? 'var(--ink)' : 'transparent',
                color: isActive ? 'var(--cream)' : 'var(--ink)',
              }}
            >
              <Icon name={item.icon} size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
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
        })}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center',
          }}
        >
          <Pear size={44} tone="sage" sparkle />
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
    </aside>
  );
}

export function DashTopbar({
  title = 'Welcome back',
  subtitle,
  ctaText,
  ctaHref,
}: {
  title?: string;
  subtitle?: ReactNode;
  ctaText?: string;
  ctaHref?: string;
}) {
  return (
    <div data-topbar style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 32px 8px', gap: 24 }}>
      <div>
        <h1 className="display" style={{ fontSize: 40, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {title} <Heart size={22} />
        </h1>
        {subtitle && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-soft)' }}>{subtitle}</div>}
      </div>
      {ctaText && ctaHref && (
        <Link href={ctaHref} className="btn btn-primary">
          {ctaText} <Pear size={14} tone="cream" shadow={false} />
        </Link>
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
  children,
  hideTopbar = false,
}: {
  active?: string;
  title?: string;
  subtitle?: ReactNode;
  ctaText?: string;
  ctaHref?: string;
  children?: ReactNode;
  hideTopbar?: boolean;
}) {
  return (
    <div className="pl8 pl8-dashshell">
      <DashSidebar active={active} />
      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
          <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
          <Squiggle variant={1} width={180} style={{ position: 'absolute', top: 40, right: 200, transform: 'rotate(-15deg)', opacity: 0.6 }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {!hideTopbar && <DashTopbar title={title} subtitle={subtitle} ctaText={ctaText} ctaHref={ctaHref} />}
          {children}
        </div>
      </main>
    </div>
  );
}
