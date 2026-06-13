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
    <nav
      aria-label={`${meta.label} sub-navigation`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '14px clamp(20px, 4vw, 40px) 4px',
        maxWidth: 1240,
        margin: '0 auto',
        // Gold hairline — the brand's punctuation (BRAND.md §5):
        // a 1px rule tinted toward gold instead of a plain gray border.
        borderBottom: '1px solid color-mix(in oklab, var(--gold, #C19A4B) 30%, var(--line-soft))',
        marginBottom: 8,
      }}
    >
      {tabs.map((tab) => {
        const on = pathname === tab.href;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch
            className="pl8-chip-pop"
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'var(--font-ui)',
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--cream)' : 'var(--ink-soft)',
              border: on ? '1.5px solid var(--ink)' : '1.5px solid transparent',
              transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
