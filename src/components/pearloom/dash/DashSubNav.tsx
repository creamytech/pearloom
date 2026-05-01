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

interface Props {
  /** Section id (`site` | `guests` | `day` | `studio` | `memory`).
   *  Optional — when omitted we infer from the current path. */
  section?: keyof typeof DASH_SECTIONS;
}

export function DashSubNav({ section }: Props) {
  const pathname = usePathname();
  const sectionId = (section ?? sectionForHref(pathname || '')) as keyof typeof DASH_SECTIONS | null;
  if (!sectionId) return null;
  const meta = DASH_SECTIONS[sectionId];
  if (!meta) return null;

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
        borderBottom: '1px solid var(--line-soft)',
        marginBottom: 8,
      }}
    >
      {meta.tabs.map((tab) => {
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
              transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
