'use client';

/* =========================================================================
   PEARLOOM — DASH PLChrome (v8.5)

   Faithful port of the ClaudeDesign/shared/dash-nav.jsx prototype primitives:

     - PLSidebar     — warm cream nav with sectioned items + brand pill
     - PLAtmosphere  — faint olive sprig atmosphere (fixed underlay)
     - PLTabs        — top tab strip primitive (filled active pill)
     - PLHead        — page header with pre-eyebrow / title / italic accent / actions
     - PLCard        — paper-textured card container with optional title row

   These are PURE chrome primitives. They don't read editor state, they
   don't fetch data, they don't navigate. Pages compose them around
   their existing data flow — no behavioural refactor required.

   Wraps the existing DashLayout's sidebar/topbar story when the page
   wants the prototype's centered editorial layout. The shared DashShell
   (DashSidebar/DashTopbar) remains the default for production routes;
   PLChrome is the editorial alternative used by the redesigned pages.
   ========================================================================= */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  type CSSProperties,
  type ReactNode,
} from 'react';
import { parseLocalDate } from '@/lib/date-utils';
import { Icon, Pear, Sprig } from '../motifs';
import { useIsMobile } from '../redesign/use-nav-hooks';
import { useSelectedSite, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { AMBIENT_BY_CONTEXT, AmbientSprig, type AmbientContext } from '../ambient';
import { useIsInsideShell } from './ShellPersistentLayout';
import { usePlan } from './usePlan';

/* ─────────────────────────────────────────────────────────────────────
   Nav model — mirrors the prototype's PL_NAV exactly, mapped to the
   production routes. Order matches the prototype: Home / Site /
   Guests / Day / Studio / Memory / Settings.
   ──────────────────────────────────────────────────────────────────── */

export interface PLNavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export const PL_NAV: PLNavItem[] = [
  { id: 'home',     label: 'Home',     icon: 'home',       href: '/dashboard' },
  { id: 'site',     label: 'Site',     icon: 'layout',     href: '/dashboard/event' },
  { id: 'guests',   label: 'Guests',   icon: 'users',      href: '/dashboard/rsvp' },
  { id: 'day',      label: 'Day',      icon: 'clock',      href: '/dashboard/day-of' },
  { id: 'studio',   label: 'Studio',   icon: 'brush',      href: '/dashboard/invite' },
  { id: 'memory',   label: 'Memory',   icon: 'heart-icon', href: '/dashboard/keepsakes' },
  { id: 'settings', label: 'Settings', icon: 'settings',   href: '/dashboard/profile' },
];

/** Map of pathname → nav id, derived from PL_NAV. Lets pages omit
 *  the `active` prop entirely when the URL already encodes the
 *  active section. */
const HREF_TO_NAV_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const n of PL_NAV) map[n.href] = n.id;
  return map;
})();
export function plActiveFromPath(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  if (HREF_TO_NAV_ID[pathname]) return HREF_TO_NAV_ID[pathname];
  // Heuristic: longest-prefix match. So `/dashboard/rsvp/123` still
  // highlights `Guests`.
  let best: { id: string; len: number } | null = null;
  for (const [href, id] of Object.entries(HREF_TO_NAV_ID)) {
    if (pathname.startsWith(href) && (!best || href.length > best.len)) {
      best = { id, len: href.length };
    }
  }
  return best?.id;
}

/* =====================================================================
   PLSidebar
   ===================================================================== */

export function PLSidebar({ active }: { active?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { site } = useSelectedSite();
  const plan = usePlan();
  const resolvedActive = active ?? plActiveFromPath(pathname);

  const celebrationLabel = site ? siteDisplayName(site) : (session?.user?.name ?? 'Your celebration');
  const eventDate = parseLocalDate(site?.eventDate);
  const dateLabel = eventDate
    ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Begin a thread';

  return (
    <aside
      className="pl8-pl-sidebar"
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: '1px solid var(--line-soft)',
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        position: 'sticky',
        top: 0,
        // dvh, not vh — mobile browser UI chrome shrinks the visual
        // viewport; static 100vh leaves the sidebar's bottom strip
        // hidden behind the toolbar.
        height: '100dvh',
        background: 'var(--cream)',
        zIndex: 2,
        fontFamily: 'var(--font-ui)',
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 6px',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <Pear size={24} tone="sage" shadow={false} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>
          Pearloom
        </span>
      </Link>

      {/* Celebration pill — matches the prototype's gradient square +
          name + subline. Reads the selected site from production hooks. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '8px 10px',
          borderRadius: 12,
          background: 'var(--card, var(--cream-2))',
          border: '1px solid var(--line-soft)',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background:
              'linear-gradient(135deg, var(--lavender-2, #C4B5D9), var(--peach-2, #EAB286))',
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {celebrationLabel}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{dateLabel}</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PL_NAV.map((n) => {
          const on = n.id === resolvedActive;
          return (
            <Link
              key={n.id}
              href={n.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 11px',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: on ? 700 : 500,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                textDecoration: 'none',
                transition: 'background 160ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <Icon name={n.icon} size={15} color={on ? 'var(--cream)' : 'var(--ink-muted)'} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Plan strip — sage tint, breathing pear, "View" cross-link */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 11px',
          borderRadius: 11,
          background: 'var(--sage-tint)',
        }}
      >
        <Pear size={18} tone="sage" shadow={false} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-deep)' }}>
          {plan.label} · plan
        </span>
        <Link
          href="/dashboard/profile"
          style={{
            marginLeft: 'auto',
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--peach-ink)',
            textDecoration: 'none',
          }}
        >
          {plan.plan === 'free' ? 'Upgrade' : 'View'}
        </Link>
      </div>
    </aside>
  );
}

/* =====================================================================
   PLAtmosphere — fixed-position botanical underlay
   ===================================================================== */

export function PLAtmosphere({ context }: { context?: AmbientContext } = {}) {
  /* Contextual paper marks — each section's underlay depicts what
     the page is ABOUT (guests → a thread strung through pearls,
     day-of → a thread-handed clock, studio → a sealed envelope,
     memory → an album page). When no context is passed we infer it
     from the route so every existing call site upgrades for free.
     The previous version scaled a 24-unit Sprig icon to 230px —
     its filled leaves melted into a gray smudge at that size. */
  const pathname = usePathname();
  const inferred: AmbientContext = context ?? (() => {
    const p = pathname ?? '';
    if (/\/(rsvp|rsvps|guest|submissions|registry|payments|bridge|cadence|passport)/.test(p)) return 'guests';
    if (/\/(day-of|seating|director|weekend)/.test(p)) return 'day';
    if (/\/(invite|library|speech|print|qr-poster|studio)/.test(p)) return 'studio';
    if (/\/(keepsakes|memory|gallery|voice)/.test(p)) return 'memory';
    if (/\/(profile|settings|connections)/.test(p)) return 'settings';
    return 'site';
  })();
  const Motif = AMBIENT_BY_CONTEXT[inferred] ?? AmbientSprig;
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 110,
          right: 48,
          opacity: 0.08,
          transform: 'rotate(8deg)',
        }}
      >
        <Motif size={250} color="var(--sage-deep, #5C6B3F)" accent="var(--gold, #C19A4B)" />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 250,
          opacity: 0.06,
          transform: 'rotate(-7deg) scaleX(-1)',
        }}
      >
        <AmbientSprig size={200} color="var(--sage-deep, #5C6B3F)" accent="var(--gold, #C19A4B)" />
      </div>
    </div>
  );
}

/* =====================================================================
   PLTabs — centered tab strip with filled active pill
   ===================================================================== */

export interface PLTab {
  id?: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function PLTabs({
  tabs,
  active = 0,
  onChange,
  style,
}: {
  tabs: Array<string | PLTab>;
  active?: number | string;
  onChange?: (idx: number, tab: PLTab) => void;
  style?: CSSProperties;
}) {
  const normalized: PLTab[] = tabs.map((t) =>
    typeof t === 'string' ? { label: t } : t,
  );
  const activeIdx =
    typeof active === 'number'
      ? active
      : Math.max(0, normalized.findIndex((t) => t.id === active));

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 22,
        // Phones: let long tab strips wrap instead of overflowing.
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {normalized.map((t, i) => {
        const on = i === activeIdx;
        const className = 'pl8-pl-tab' + (on ? ' is-active' : '');
        const styleProps: CSSProperties = {
          padding: '7px 16px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          background: on ? 'var(--ink)' : 'transparent',
          color: on ? 'var(--cream)' : 'var(--ink-soft)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textDecoration: 'none',
          transition: 'background 200ms cubic-bezier(0.22, 1, 0.36, 1), color 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        };
        if (t.href) {
          return (
            <Link key={t.label + i} href={t.href} className={className} style={styleProps}>
              {t.label}
            </Link>
          );
        }
        return (
          <button
            key={t.label + i}
            type="button"
            className={className}
            style={styleProps}
            onClick={() => {
              t.onClick?.();
              onChange?.(i, t);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* =====================================================================
   PLHead — editorial page header
   ===================================================================== */

export function PLHead({
  pre,
  title,
  italic,
  sub,
  actions,
  align = 'between',
  style,
}: {
  pre?: ReactNode;
  title: ReactNode;
  /** Trailing italic word/phrase rendered in --lavender-ink — the
   *  prototype's signature flourish ("The {italic guest list}.") */
  italic?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  /** 'between' (default): title left, actions right.
   *  'center': everything centered (used by Memory + Settings pages). */
  align?: 'between' | 'center';
  style?: CSSProperties;
}) {
  if (align === 'center') {
    return (
      <div
        style={{
          textAlign: 'center',
          marginBottom: 24,
          ...style,
        }}
      >
        {pre && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink)',
              marginBottom: 4,
            }}
          >
            {pre}
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 7.5vw, 38px)',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.01em',
            color: 'var(--ink)',
          }}
        >
          {title}{' '}
          {italic && (
            <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>{italic}</span>
          )}
        </h1>
        {sub && (
          <div
            style={{
              fontSize: 13.5,
              color: 'var(--ink-soft)',
              marginTop: 4,
              maxWidth: 520,
              marginInline: 'auto',
            }}
          >
            {sub}
          </div>
        )}
        {actions && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 14,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        // Phones: actions drop below the title instead of
        // squeezing it. No-op on desktop (only wraps when needed).
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {pre && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink)',
              marginBottom: 4,
            }}
          >
            {pre}
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 7.5vw, 38px)',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.01em',
            color: 'var(--ink)',
          }}
        >
          {title}{' '}
          {italic && (
            <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>{italic}</span>
          )}
        </h1>
        {sub && (
          <div
            style={{
              fontSize: 13.5,
              color: 'var(--ink-soft)',
              marginTop: 4,
              maxWidth: 520,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   PLCard — paper-textured card container
   ===================================================================== */

export function PLCard({
  title,
  icon,
  extra,
  children,
  style,
  tone = 'paper',
  noPadding = false,
}: {
  title?: ReactNode;
  icon?: string;
  /** Right-aligned content next to the title row (button, label, etc.) */
  extra?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  /** Card tone:
   *   'paper' (default) — var(--card) on var(--line-soft) border
   *   'peach', 'sage', 'lavender' — tinted accent cards
   *   'ink' — inverted dark card */
  tone?: 'paper' | 'peach' | 'sage' | 'lavender' | 'ink';
  /** Skip the default 18px padding (for cards that compose their own
   *  hero / split layouts). */
  noPadding?: boolean;
}) {
  const toneStyles: Record<string, CSSProperties> = {
    paper: {
      background: 'var(--card, var(--cream-2))',
      border: '1px solid var(--line-soft)',
      color: 'var(--ink)',
    },
    peach: {
      background: 'var(--peach-bg)',
      border: 'none',
      color: 'var(--ink)',
    },
    sage: {
      background: 'var(--sage-tint)',
      border: 'none',
      color: 'var(--ink)',
    },
    lavender: {
      background: 'var(--lavender-bg)',
      border: 'none',
      color: 'var(--ink)',
    },
    ink: {
      background: 'var(--ink)',
      border: 'none',
      color: 'var(--cream)',
    },
  };
  return (
    <div
      className={`pl8-pl-card pl8-pl-card-${tone}`}
      style={{
        borderRadius: 16,
        padding: noPadding ? 0 : 18,
        position: 'relative',
        ...toneStyles[tone],
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 13,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {icon && (
              <Icon
                name={icon}
                size={15}
                color={tone === 'ink' ? 'var(--gold)' : 'var(--gold)'}
              />
            )}
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                color: tone === 'ink' ? 'var(--cream)' : 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </span>
          </div>
          {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* =====================================================================
   PLChrome — composite wrapper. Mounts PLSidebar + PLAtmosphere
   around the page's children with the prototype's main-column layout.

   Most redesigned pages compose this once at the top of their JSX
   instead of writing the shell wiring by hand. The `maxWidth` and
   `pad` props mirror the per-page widths used in the prototypes
   (Guests: 1180, Day: 1160, Memory: 1080, Settings: 1040).
   ===================================================================== */

export interface PLChromeProps {
  active?: string;
  /** Centered max-width for the main column. Defaults to the shared
   *  dashboard clamp token --pl-dash-maxw (plan-2 §1-D). */
  maxWidth?: number | string;
  /** Horizontal main padding. Defaults to the shared gutter token. */
  pad?: string;
  /** Mount the sticky PLSidebar (default true). Set false when the
   *  page is already inside a shell that owns the sidebar (e.g. the
   *  shared DashLayout). */
  sidebar?: boolean;
  /** Mount the PLAtmosphere underlay (default true). */
  atmosphere?: boolean;
  children?: ReactNode;
}

export function PLChrome({
  active,
  maxWidth = 'var(--pl-dash-maxw)',
  pad = '24px var(--pl-dash-pad) 60px',
  sidebar = true,
  atmosphere = true,
  children,
}: PLChromeProps) {
  // Below the dashboard's 960px drawer breakpoint the fixed 200px
  // PLSidebar would eat half a phone viewport (and double up with
  // the shell's DashSidebar drawer, which already provides nav).
  // Hide it and slim the main gutters. Desktop untouched.
  const isNarrow = useIsMobile(960);
  // Inside the (shell) layout the DashSidebar is already mounted —
  // rendering PLSidebar too nests a second full nav column inside
  // the content area. Auto-suppress regardless of the prop.
  const insideShell = useIsInsideShell();
  const showSidebar = sidebar && !isNarrow && !insideShell;
  return (
    <div
      className="pl8 pl8-pl-chrome"
      style={{
        display: 'flex',
        minHeight: '100dvh',
        background: 'var(--cream)',
        position: 'relative',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
      }}
    >
      {atmosphere && <PLAtmosphere />}
      {showSidebar && <PLSidebar active={active} />}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          zIndex: 1,
          padding: isNarrow ? '16px 18px 48px' : pad,
          maxWidth,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {children}
      </main>
    </div>
  );
}
