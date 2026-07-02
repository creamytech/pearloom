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
import { useEffect, useRef, useState } from 'react';
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
  const [hovered, setHovered] = useState<string | null>(null);
  // Keep the active tab visible inside the .pl-hscroll strip on
  // phones — on mount and whenever the route changes. behavior
  // 'auto' (instant) doubles as the reduced-motion guard: no
  // smooth scroll to suppress. block 'nearest' avoids vertical
  // page jumps.
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
  }, [pathname]);
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

  // NB: inline styles, NOT styled-jsx — styled-jsx only attaches its
  // scoping class to native DOM elements, never to <Link>, so a
  // class-based stylesheet silently no-ops on these tabs (the cause
  // of the jammed, unstyled sub-nav). Inline styles always apply.
  return (
    <nav
      aria-label={`${meta.label} sub-navigation`}
      className="pl-hscroll"
      style={{
        alignItems: 'flex-end',
        gap: 'clamp(14px, 4vw, 26px)',
        padding: '16px clamp(20px, 4vw, 40px) 0',
        maxWidth: 1240,
        margin: '0 auto 16px',
        borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
      }}
    >
      {tabs.map((tab) => {
        const on = pathname === tab.href;
        const isHover = hovered === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch
            ref={on ? activeTabRef : undefined}
            aria-current={on ? 'page' : undefined}
            onMouseEnter={() => setHovered(tab.id)}
            onMouseLeave={() => setHovered((h) => (h === tab.id ? null : h))}
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '4px 1px 12px',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: on ? 700 : 500,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              color: on || isHover ? 'var(--ink, #0e0d0b)' : 'var(--ink-muted, #8a8472)',
              transition: 'color 160ms var(--pl-ease-out, ease)',
            }}
          >
            {tab.label}
            {/* Active: two-strand olive + gold thread on the baseline.
                Both strands are ALWAYS mounted and weave in via
                scaleX/opacity (inline transitions — see the styled-jsx
                note above), so tab changes draw the thread instead of
                popping it. The faint olive doubles as the hover state. */}
            <span
              aria-hidden
              style={{
                position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2,
                background: 'var(--sage-deep, var(--pl-olive, #5c6b3f))',
                opacity: on ? 1 : isHover ? 0.22 : 0,
                transform: on || isHover ? 'scaleX(1)' : 'scaleX(0.4)',
                transformOrigin: 'left',
                transition: 'opacity 180ms var(--pl-ease-out, ease), transform 240ms var(--pl-ease-emphasis, cubic-bezier(0.16,1,0.3,1))',
              }}
            />
            <span
              aria-hidden
              style={{
                position: 'absolute', left: 2, right: 2, bottom: -4, height: 1, borderRadius: 2,
                background: 'var(--gold, #c19a4b)',
                opacity: on ? 0.65 : 0,
                transform: on ? 'scaleX(1)' : 'scaleX(0.4)',
                transformOrigin: 'left',
                transition: 'opacity 180ms var(--pl-ease-out, ease) 40ms, transform 240ms var(--pl-ease-emphasis, cubic-bezier(0.16,1,0.3,1)) 40ms',
              }}
            />
          </Link>
        );
      })}
    </nav>
  );
}
