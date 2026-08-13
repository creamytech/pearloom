'use client';

// ─────────────────────────────────────────────────────────────
// DashTabBar — phone-only fixed bottom tab bar for the dashboard.
//
// The hamburger drawer used to be the ONLY nav on phones, so the
// common destinations sat 2-3 taps deep. This bar puts the four
// destinations hosts actually live in one thumb-tap away, plus
// "More" which opens the existing drawer (useDashDrawer) for
// everything else.
//
// Paper chrome, not glass — the bar is persistent structure, not
// floating chrome (BRAND.md §9). Hidden ≥960px (the same
// breakpoint as DashMobileBar / the drawer); all styling lives in
// globals.css under `.pl8-dash-tabbar`. The active tab wears the
// app's two-strand olive + gold thread (DashSubNav's motif).
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../motifs';
import { useDashDrawer } from './useDashDrawer';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { isDashSurfaceApplicable, type DashSurfaceId } from '@/lib/event-os/dashboard-applicability';
import { cockpitPhaseFor, isPostEventPhase } from '@/lib/event-os/cockpit-phase';
import { parseLocalDate, daysBetweenCalendarDates } from '@/lib/date-utils';

interface TabDef {
  id: string;
  label: string;
  icon: string;
  href: string;
  /** Home matches `/dashboard` exactly; the rest prefix-match. */
  exact?: boolean;
  /** Optional dashboard-applicability gate (occasion-shaped). */
  gate?: DashSurfaceId;
}

/* The four fixed destinations mirror the sidebar's "This event"
   spine, which shows them for every occasion (there are no
   dashboard-applicability gates for guests / day-of / studio
   today). Each slot still carries an optional `gate` so a future
   registry rule takes effect here automatically; if one drops
   out, Registry steps in when it applies. */
const PRIMARY_TABS: TabDef[] = [
  { id: 'home',   label: 'Home',   icon: 'home',     href: '/dashboard', exact: true },
  { id: 'guests', label: 'Guests', icon: 'users',    href: '/dashboard/rsvp' },
  { id: 'day',    label: 'Day',    icon: 'clock',    href: '/dashboard/day-of' },
  { id: 'studio', label: 'Studio', icon: 'sparkles', href: '/dashboard/invite' },
];
const STANDBY_TAB: TabDef = { id: 'registry', label: 'Registry', icon: 'gift', href: '/dashboard/registry', gate: 'registry' };

/** Routes that ship their own fixed bottom chrome on phones —
 *  the bar stands down there instead of stacking two bars.
 *  (Studio mounts StudioMobileBar at /dashboard/invite.)
 *  Exported: DashMobileBar shows its hamburger ONLY here, where
 *  the bar's More tab (the drawer's thumb-zone door) is absent —
 *  one drawer door per screen, never two. */
export const OWN_BOTTOM_CHROME = ['/dashboard/invite'];

/** The day passes; the tab follows (the same cockpit clock every
 *  dashboard card reads). Post-event, "Day" hands its slot to
 *  "Memory" — the room the host actually lives in now. */
const MEMORY_TAB: TabDef = { id: 'memory', label: 'Memory', icon: 'heart-icon', href: '/dashboard/keepsakes' };

function isActiveTab(tab: TabDef, pathname: string): boolean {
  if (tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export function DashTabBar() {
  const pathname = usePathname() ?? '';
  const { open: drawerOpen, toggle: toggleDrawer } = useDashDrawer();
  const { site } = useSelectedSite();
  const [todayD] = useState<Date | null>(() => new Date());

  if (OWN_BOTTOM_CHROME.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return null;
  }

  const occasion = site?.occasion;
  const eventD = parseLocalDate(site?.eventDate);
  const post = eventD !== null && todayD !== null
    && isPostEventPhase(cockpitPhaseFor(daysBetweenCalendarDates(eventD, todayD)));
  const primary = post
    ? PRIMARY_TABS.map((t) => (t.id === 'day' ? MEMORY_TAB : t))
    : PRIMARY_TABS;
  let tabs = primary.filter((t) => !t.gate || isDashSurfaceApplicable(t.gate, occasion));
  if (tabs.length < primary.length && isDashSurfaceApplicable(STANDBY_TAB.gate!, occasion)) {
    tabs = [...tabs, STANDBY_TAB];
  }

  return (
    <>
      {/* In-flow spacer so page content never hides under the
          fixed bar. Phone-only, like the bar (globals.css). */}
      <div aria-hidden className="pl8-dash-tabbar-spacer" />
      <nav aria-label="Dashboard" className="pl8-dash-tabbar">
        {tabs.map((tab) => {
          const on = isActiveTab(tab, pathname);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch
              aria-current={on ? 'page' : undefined}
              data-on={on ? '' : undefined}
              className="pl8-dash-tab"
            >
              <TabThread />
              <Icon name={tab.icon} size={18} />
              <span className="pl8-dash-tab-label">{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleDrawer}
          aria-expanded={drawerOpen}
          data-on={drawerOpen ? '' : undefined}
          className="pl8-dash-tab"
        >
          <TabThread />
          <Icon name="grid" size={18} />
          <span className="pl8-dash-tab-label">More</span>
        </button>
      </nav>
    </>
  );
}

/** The two-strand olive + gold thread — the active marker, drawn
 *  in via scaleX (see globals.css; reduced-motion renders it
 *  without the draw). */
function TabThread() {
  return (
    <span aria-hidden className="pl8-dash-tab-thread">
      <span />
      <span />
    </span>
  );
}
