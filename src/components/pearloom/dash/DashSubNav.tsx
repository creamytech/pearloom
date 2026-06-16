'use client';

// ─────────────────────────────────────────────────────────────
// DashSubNav — pill-strip secondary navigation, mounted at the
// top of every section landing page. Single source of truth for
// the section's tab list lives in DASH_SECTIONS in DashShell.
//
// Lives at the top of every consolidated section page so the
// host always knows which section they're in and can hop
// between siblings without going back to the sidebar.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DASH_SECTIONS, sectionForHref } from './DashShell';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { isDashSurfaceApplicable } from '@/lib/event-os/dashboard-applicability';

interface Props {
  /** Section id (`site` | `guests` | `day` | `studio` | `memory`).
   *  Optional — when omitted we infer from the current path. */
  section?: keyof typeof DASH_SECTIONS;
}

export function DashSubNav({ section }: Props) {
  const pathname = usePathname();
  const { site } = useSelectedSite();
  const sectionId = (section ?? sectionForHref(pathname || '')) as keyof typeof DASH_SECTIONS | null;
  if (!sectionId) return null;
  const meta = DASH_SECTIONS[sectionId];
  if (!meta) return null;

  // Occasion-aware tabs: don't advertise surfaces the selected
  // event can't use (registry for a bachelor party, seating for a
  // trip). The tab the host is currently ON always stays visible
  // so a bookmark or site-switch never strands them on a route
  // with no tab.
  const tabs = meta.tabs.filter(
    (tab) => pathname === tab.href || isDashSurfaceApplicable(tab.id, site?.occasion),
  );

  return (
    <nav aria-label={`${meta.label} sub-navigation`} className="pl-subnav">
      {tabs.map((tab) => {
        const on = pathname === tab.href;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch
            aria-current={on ? 'page' : undefined}
            className={`pl-subtab${on ? ' is-on' : ''}`}
          >
            {tab.label}
          </Link>
        );
      })}
      <style jsx>{`
        /* Editorial underline tabs. The active tab is anchored to the
           baseline hairline by a two-strand olive + gold thread —
           the brand's visual atom (BRAND §3/§5) — instead of a heavy
           filled pill floating above a disconnected rule. */
        .pl-subnav {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: clamp(10px, 2.4vw, 26px);
          padding: 16px clamp(20px, 4vw, 40px) 0;
          max-width: 1240px;
          margin: 0 auto 16px;
          border-bottom: 1px solid var(--line-soft, rgba(14, 13, 11, 0.08));
        }
        .pl-subtab {
          position: relative;
          padding: 4px 1px 12px;
          font-family: var(--font-ui);
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--ink-muted, #8a8472);
          text-decoration: none;
          white-space: nowrap;
          transition: color var(--pl-dur-fast, 160ms) var(--pl-ease-out);
        }
        .pl-subtab:hover {
          color: var(--ink, #0e0d0b);
        }
        .pl-subtab.is-on {
          color: var(--ink, #0e0d0b);
          font-weight: 700;
        }
        /* Active: two strands riding the baseline — 2px olive over a
           1px gold hairline. */
        .pl-subtab.is-on::before,
        .pl-subtab.is-on::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          border-radius: 2px;
          pointer-events: none;
        }
        .pl-subtab.is-on::before {
          bottom: -1px;
          height: 2px;
          background: var(--sage-deep, var(--pl-olive, #5c6b3f));
        }
        .pl-subtab.is-on::after {
          bottom: -4px;
          left: 2px;
          right: 2px;
          height: 1px;
          background: var(--gold, #c19a4b);
          opacity: 0.65;
        }
        /* Inactive: a faint olive underline grows in on hover. */
        .pl-subtab:not(.is-on)::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 2px;
          border-radius: 2px;
          background: var(--sage-deep, var(--pl-olive, #5c6b3f));
          opacity: 0;
          transition: opacity var(--pl-dur-fast, 160ms) var(--pl-ease-out);
        }
        .pl-subtab:not(.is-on):hover::after {
          opacity: 0.22;
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-subtab,
          .pl-subtab::after {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}
