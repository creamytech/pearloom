'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
// Floating glass navigation rail — primary + overflow tabs
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, LayoutGrid, BookOpen, CalendarDays, Sparkles, Settings,
  MoreHorizontal, Users, MessageSquare, BarChart2, Globe,
  Music, ShoppingBag, Mail, Heart, FileText, X,
} from 'lucide-react';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { RichTooltip } from '@/components/ui/tooltip';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META, type PlanTier } from '@/lib/plan-tiers';
import { isPlanSufficient } from '@/lib/plan-gate';

type RailItem = {
  id: string;
  tab: EditorTab;
  Icon: React.ElementType;
  label: string;
  description?: string;
  shortcut?: string;
};

// Primary tabs — always visible on the rail
const PRIMARY_ITEMS: RailItem[] = [
  { id: 'design',   tab: 'design',   Icon: Palette,      label: 'Design',   description: 'Colors, fonts & visual style', shortcut: '⌘3' },
  { id: 'sections', tab: 'canvas',   Icon: LayoutGrid,   label: 'Layout',   description: 'Add & arrange page sections', shortcut: '⌘8' },
  { id: 'story',    tab: 'story',    Icon: BookOpen,     label: 'Chapters', description: 'Your love story timeline', shortcut: '⌘1' },
  { id: 'events',   tab: 'events',   Icon: CalendarDays, label: 'Events',   description: 'Ceremony, reception & more', shortcut: '⌘2' },
  { id: 'pages',    tab: 'pages',    Icon: FileText,     label: 'Pages',    description: 'Manage site pages', shortcut: '⌘5' },
];

// Secondary rail items — post-launch tools surfaced as first-class icons
const SECONDARY_ITEMS: RailItem[] = [
  { id: 'guests',    tab: 'guests',    Icon: Users,        label: 'Guests',    description: 'Guest list & RSVPs' },
  { id: 'analytics', tab: 'analytics', Icon: BarChart2,   label: 'Analytics', description: 'Views, RSVPs & engagement' },
  { id: 'messaging', tab: 'messaging', Icon: MessageSquare, label: 'Messages', description: 'Email your guests' },
];

type MoreGroup = { label: string; items: RailItem[] };

// Overflow groups — shown in "More" popover, organized by category
const MORE_GROUPS: MoreGroup[] = [
  {
    label: 'Content',
    items: [
      { id: 'blocks', tab: 'blocks', Icon: Sparkles,  label: 'Pear AI',   description: 'AI content suggestions' },
      { id: 'voice',  tab: 'voice',  Icon: Sparkles,  label: 'Voice AI',  description: 'Personalized voice & tone' },
    ],
  },
  {
    label: 'Guests & Invitations',
    items: [
      { id: 'invite',   tab: 'invite',   Icon: Mail,  label: 'Invitations', description: 'Send bulk invites' },
      { id: 'seating',  tab: 'seating',  Icon: Users, label: 'Seating',     description: 'Seating chart editor' },
    ],
  },
  {
    label: 'After the Wedding',
    items: [
      { id: 'savethedate', tab: 'savethedate', Icon: Heart,       label: 'Save the Date' },
      { id: 'thankyou',    tab: 'thankyou',    Icon: Heart,       label: 'Thank You Notes' },
      { id: 'spotify',     tab: 'spotify',     Icon: Music,       label: 'Music' },
      { id: 'vendors',     tab: 'vendors',     Icon: ShoppingBag, label: 'Vendors' },
      { id: 'translate',   tab: 'translate',   Icon: Globe,       label: 'Translate' },
    ],
  },
];

// Resolve the user's plan from session or a body data-attribute fallback.
function useUserPlan(): string {
  const { data: session } = useSession();
  const sessionPlan = (session as Record<string, unknown> | null)?.plan;
  if (typeof sessionPlan === 'string' && sessionPlan) return sessionPlan;
  if (typeof document !== 'undefined') {
    const attr = document.body.getAttribute('data-plan');
    if (attr) return attr;
  }
  return 'free';
}

function RailButton({
  item,
  isActive,
  locked,
  lockedTierLabel,
  onClick,
}: {
  item: RailItem;
  isActive: boolean;
  locked?: boolean;
  lockedTierLabel?: string;
  onClick: () => void;
}) {
  const Icon = item.Icon;
  const description = locked && lockedTierLabel
    ? `${lockedTierLabel} plan required`
    : item.description;
  return (
    <RichTooltip
      label={item.label}
      description={description}
      shortcut={item.shortcut}
      side="right"
    >
      <motion.button
        onClick={onClick}
        className="pl-rail-btn"
        whileHover={{ backgroundColor: 'rgba(24,24,27,0.08)' }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: '38px', height: '38px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '4px', border: 'none', borderRadius: '12px',
          background: isActive ? 'rgba(24,24,27,0.08)' : 'transparent',
          color: isActive ? '#18181B' : '#71717A',
          cursor: 'pointer', position: 'relative',
          transition: 'background 0.15s, color 0.15s',
          opacity: locked ? 0.55 : 1,
        }}
      >
        {isActive && (
          <motion.div
            layoutId="rail-active"
            style={{
              position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)',
              width: '3px', height: '20px', borderRadius: '0 3px 3px 0',
              background: '#18181B',
            }}
            transition={{ type: 'spring', stiffness: 700, damping: 38, mass: 0.6 }}
          />
        )}
        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
        <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, userSelect: 'none' }}>
          {item.label}
        </span>
      </motion.button>
    </RichTooltip>
  );
}

export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const activeTab = state.activeTab;
  const currentPlan = useUserPlan();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverScrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(true);
  const [canScroll, setCanScroll] = useState(false);

  // Close "More" popover on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Item 19 + 20: Escape closes popover; focus trap on Tab cycling.
  useEffect(() => {
    if (!moreOpen) return;
    const getFocusables = (): HTMLElement[] => {
      const root = popoverRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => !el.hasAttribute('data-focus-skip'));
    };

    // Focus first focusable element after the popover mounts.
    const focusTimer = window.setTimeout(() => {
      const focusables = getFocusables();
      focusables[0]?.focus();
    }, 0);

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMoreOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !popoverRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !popoverRef.current?.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handler);
    };
  }, [moreOpen]);

  // Item 26: track scroll position within the popover to toggle bottom fade.
  useEffect(() => {
    if (!moreOpen) return;
    const el = popoverScrollRef.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollHeight - el.clientHeight;
      setCanScroll(overflow > 1);
      setScrolledToBottom(overflow <= 1 || el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => { el.removeEventListener('scroll', update); };
  }, [moreOpen]);

  const handleClick = (tab: EditorTab) => {
    actions.handleTabChange(tab);
    onOpen?.();
    setMoreOpen(false);
  };

  // Check if active tab is in secondary or overflow panels
  const allMoreItems = MORE_GROUPS.flatMap(g => g.items);
  const isMoreActive = allMoreItems.some(item => item.tab === activeTab) &&
    !SECONDARY_ITEMS.some(item => item.tab === activeTab);

  // Item 24: compute lock state + tier label per tab.
  const tabLockInfo = useMemo(() => {
    const info: Record<string, { locked: boolean; tierLabel?: string }> = {};
    const allTabs: EditorTab[] = [
      ...PRIMARY_ITEMS.map(i => i.tab),
      ...SECONDARY_ITEMS.map(i => i.tab),
      ...allMoreItems.map(i => i.tab),
    ];
    for (const tab of allTabs) {
      const tier = TAB_TIER[tab] as PlanTier | undefined;
      if (!tier) { info[tab] = { locked: false }; continue; }
      const ok = isPlanSufficient(currentPlan, tier);
      info[tab] = { locked: !ok, tierLabel: TIER_META[tier].label };
    }
    return info;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
        zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px', padding: '8px 6px', borderRadius: '12px',
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Item 80: focus-visible outline for keyboard nav. */}
      <style>{`
        .pl-rail-btn:focus { outline: none; }
        .pl-rail-btn:focus-visible { outline: 2px solid #4a9b8a; outline-offset: 2px; }
        .pl-rail-more-item:focus { outline: none; }
        .pl-rail-more-item:focus-visible { outline: 2px solid #4a9b8a; outline-offset: 2px; }
      `}</style>

      {/* Primary nav items */}
      {PRIMARY_ITEMS.map(item => {
        const lock = tabLockInfo[item.tab];
        return (
          <RailButton
            key={item.id}
            item={item}
            isActive={activeTab === item.tab}
            locked={lock?.locked}
            lockedTierLabel={lock?.tierLabel}
            onClick={() => handleClick(item.tab)}
          />
        );
      })}

      {/* Item 23: secondary cluster divider — small-caps TOOLS label with inset rules. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '3px',
          width: '100%', padding: '4px 0 2px', userSelect: 'none',
        }}
        aria-hidden="true"
      >
        <span style={{ flex: 1, height: '1px', background: '#E4E4E7' }} />
        <span style={{
          fontSize: '0.42rem', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#A1A1AA', lineHeight: 1,
        }}>Tools</span>
        <span style={{ flex: 1, height: '1px', background: '#E4E4E7' }} />
      </div>
      {SECONDARY_ITEMS.map(item => {
        const lock = tabLockInfo[item.tab];
        return (
          <RailButton
            key={item.id}
            item={item}
            isActive={activeTab === item.tab}
            locked={lock?.locked}
            lockedTierLabel={lock?.tierLabel}
            onClick={() => handleClick(item.tab)}
          />
        );
      })}

      {/* More button + popover */}
      <div ref={moreRef} style={{ position: 'relative' }}>
        <RichTooltip label="More tools" description="All editor panels & features" side="right">
          <motion.button
            onClick={() => setMoreOpen(!moreOpen)}
            className="pl-rail-btn"
            whileHover={{ backgroundColor: 'rgba(24,24,27,0.08)' }}
            whileTap={{ scale: 0.88 }}
            style={{
              width: '44px', height: '44px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', border: 'none', borderRadius: '8px',
              background: moreOpen || isMoreActive ? 'rgba(24,24,27,0.08)' : 'transparent',
              color: moreOpen || isMoreActive ? '#18181B' : '#71717A',
              cursor: 'pointer', transition: 'background 0.15s',
              position: 'relative',
            }}
          >
            <MoreHorizontal size={18} />
            <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1, userSelect: 'none' }}>
              More
            </span>
            {/* Item 22: pulse when visible (reuse existing global pl-dot-pulse). */}
            {isMoreActive && !moreOpen && (
              <div
                className="pl-dot-pulse"
                style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#18181B' }}
              />
            )}
          </motion.button>
        </RichTooltip>

        {/* Popover */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              ref={popoverRef}
              role="dialog"
              aria-label="More tools"
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', left: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)',
                width: '200px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E4E4E7',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                zIndex: 100,
              } as React.CSSProperties}
            >
              <div
                ref={popoverScrollRef}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  padding: '8px',
                  maxHeight: '400px', overflowY: 'auto',
                  borderRadius: '12px',
                }}
              >
                {MORE_GROUPS.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <div style={{ height: '1px', background: '#F4F4F5', margin: '4px 0' }} />}
                    <div style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', padding: '4px 10px 2px' }}>
                      {group.label}
                    </div>
                    {group.items.map(item => {
                      const Icon = item.Icon;
                      const isActive = activeTab === item.tab;
                      const lock = tabLockInfo[item.tab];
                      const locked = lock?.locked;
                      const lockedLabel = lock?.tierLabel;
                      const button = (
                        <button
                          key={item.id}
                          onClick={() => handleClick(item.tab)}
                          className="pl-rail-more-item"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '7px 10px', borderRadius: '10px', border: 'none',
                            background: isActive ? 'rgba(24,24,27,0.08)' : 'transparent',
                            color: isActive ? '#18181B' : '#3F3F46',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: isActive ? 600 : 400,
                            width: '100%', textAlign: 'left', transition: 'background 0.12s',
                            opacity: locked ? 0.55 : 1,
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.025)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Icon size={15} style={{ color: isActive ? '#18181B' : '#71717A', flexShrink: 0 }} />
                          {item.label}
                        </button>
                      );
                      if (locked && lockedLabel) {
                        return (
                          <RichTooltip
                            key={item.id}
                            label={item.label}
                            description={`${lockedLabel} plan required`}
                            side="right"
                          >
                            {button}
                          </RichTooltip>
                        );
                      }
                      return button;
                    })}
                  </div>
                ))}
              </div>
              {/* Item 26: bottom scroll-fade affordance — only when content overflows and user hasn't reached the bottom. */}
              {canScroll && !scrolledToBottom && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    height: '36px', borderRadius: '0 0 12px 12px',
                    pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 70%, rgba(255,255,255,1) 100%)',
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1, minHeight: '12px' }} />

      {/* Settings at bottom */}
      <RailButton
        item={{ id: 'details', tab: 'details', Icon: Settings, label: 'Settings', description: 'Site details & configuration' }}
        isActive={activeTab === 'details'}
        onClick={() => handleClick('details')}
      />
    </motion.div>
  );
}
