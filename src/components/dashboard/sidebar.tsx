'use client';

// ─────────────────────────────────────────────────────────────
// DashboardSidebar — Wave C rebuild.
// • Regrouped: Build · Run Event · Grow · Account (was: flat)
// • Design tokens (no hardcoded zinc)
// • Editorial knotted-ring mark instead of "P" tile
// • Theme-aware (works on light + dark)
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Settings,
  Store,
  Plus,
  HelpCircle,
  Sparkles,
  Megaphone,
  Users,
  BarChart3,
  CalendarRange,
  MessageSquare,
  Link2,
} from 'lucide-react';

import type { GroovePersonality } from './GrooveSidebarIcon';
import { GrooveSidebarIcon } from './GrooveSidebarIcon';

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  personality?: GroovePersonality;
}

interface NavSection {
  label: string;
  links: NavLink[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'Build',
    links: [
      { href: '/dashboard',          label: 'Sites',         icon: LayoutDashboard, personality: 'morph' },
      { href: '/dashboard/director', label: 'Director',      icon: Sparkles,        personality: 'bloom' },
    ],
  },
  {
    label: 'Run event',
    links: [
      { href: '/dashboard/day-of',       label: 'Day-of',       icon: Megaphone,     personality: 'bounce' },
      { href: '/dashboard/rsvp',         label: 'Guests · RSVP', icon: Users,        personality: 'wobble' },
      { href: '/dashboard/submissions',  label: 'Submissions',  icon: MessageSquare, personality: 'wave' },
      { href: '/dashboard/gallery',      label: 'Gallery',      icon: ImageIcon,     personality: 'morph' },
      { href: '/dashboard/connections',  label: 'Connections',  icon: Link2,         personality: 'pulse' },
    ],
  },
  {
    label: 'Grow',
    links: [
      { href: '/marketplace',         label: 'Marketplace', icon: Store,      personality: 'morph' },
      { href: '/dashboard/analytics', label: 'Analytics',   icon: BarChart3, personality: 'pulse' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/dashboard/profile', label: 'Settings', icon: Settings,   personality: 'spin' },
      { href: '/dashboard/help',    label: 'Help',     icon: HelpCircle, personality: 'wobble' },
    ],
  },
];

interface DashboardSidebarProps {
  onNewSite?: () => void;
}

export function DashboardSidebar({ onNewSite }: DashboardSidebarProps = {}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 232 : 64,
        flexShrink: 0,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream-card)',
        borderRight: '1px solid var(--pl-divider)',
        transition: 'width var(--pl-dur-base) var(--pl-ease-out)',
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          height: 60,
          padding: '0 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--pl-divider)',
          flexShrink: 0,
        }}
      >
        <PearloomMark />
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontSize: '1.05rem',
                color: 'var(--pl-ink)',
                letterSpacing: '-0.01em',
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
              }}
            >
              Pearloom
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {SECTIONS.map((section) => (
          <SectionGroup key={section.label} label={section.label} expanded={expanded}>
            {section.links.map((link) => (
              <SidebarLink
                key={link.href}
                link={link}
                expanded={expanded}
                active={
                  link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname?.startsWith(link.href) ?? false
                }
              />
            ))}
          </SectionGroup>
        ))}
      </nav>

      {/* CTA */}
      <div style={{ padding: '0 10px 14px', flexShrink: 0 }}>
        {onNewSite ? (
          <CtaButton onClick={onNewSite} expanded={expanded} />
        ) : (
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 12px',
              background: 'var(--pl-ink)',
              color: 'var(--pl-cream)',
              borderRadius: 'var(--pl-radius-md)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
            }}
          >
            <Plus size={14} />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                >
                  New site
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────

function SectionGroup({
  label,
  expanded,
  children,
}: {
  label: string;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              padding: '4px 14px 8px',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--pl-muted)',
              overflow: 'hidden',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

function SidebarLink({
  link,
  active,
  expanded,
}: {
  link: NavLink;
  active: boolean;
  expanded: boolean;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      title={!expanded ? link.label : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: expanded ? '8px 12px' : '8px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        margin: '0 4px',
        borderRadius: 'var(--pl-radius-md)',
        minHeight: 36,
        background: active
          ? 'color-mix(in oklab, var(--pl-groove-terra) 14%, transparent)'
          : 'transparent',
        color: active ? 'var(--pl-groove-ink)' : 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: active ? 700 : 500,
        letterSpacing: '-0.005em',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-groove-butter) 22%, transparent)';
          e.currentTarget.style.color = 'var(--pl-groove-ink)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)';
        }
      }}
    >
      {active && (
        <motion.span
          layoutId="dashboard-sidebar-active"
          aria-hidden
          style={{
            position: 'absolute',
            left: -4,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 4,
            height: 22,
            borderRadius: 'var(--pl-groove-radius-pill)',
            background: 'var(--pl-groove-blob-sunrise)',
            boxShadow: '0 2px 6px rgba(139,74,106,0.28)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <GrooveSidebarIcon
        Icon={Icon}
        personality={link.personality ?? 'bounce'}
        alwaysOn={active}
      />
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
      {expanded && link.badge && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.62rem',
            padding: '1px 6px',
            background: 'var(--pl-gold)',
            color: 'var(--pl-ink)',
            borderRadius: 'var(--pl-radius-full)',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {link.badge}
        </span>
      )}
    </Link>
  );
}

function CtaButton({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--pl-ink)',
        color: 'var(--pl-cream)',
        border: 'none',
        borderRadius: 'var(--pl-radius-md)',
        fontFamily: 'var(--pl-font-body)',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'transform var(--pl-dur-fast) var(--pl-ease-spring), background var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-ink) 88%, var(--pl-olive))';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--pl-ink)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Plus size={14} />
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            New site
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function PearloomMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="var(--pl-ink)" strokeWidth="1.4" />
      <path
        d="M12 3c2.5 4 2.5 14 0 18M3 12c4-2.5 14-2.5 18 0"
        stroke="var(--pl-olive)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

// Suppress unused imports kept for potential expansion
void CalendarRange;
