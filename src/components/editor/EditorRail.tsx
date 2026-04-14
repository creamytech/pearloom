'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
// Floating glass navigation rail — primary + overflow tabs
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, LayoutGrid, BookOpen, CalendarDays, Sparkles, Settings,
  MoreHorizontal, Users, MessageSquare, BarChart2, Globe,
  Music, ShoppingBag, Mail, Heart, FileText, X,
} from 'lucide-react';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { RichTooltip } from '@/components/ui/tooltip';
import { useEditor, type EditorTab } from '@/lib/editor-state';

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

function RailButton({ item, isActive, onClick }: { item: RailItem; isActive: boolean; onClick: () => void }) {
  const Icon = item.Icon;
  return (
    <RichTooltip
      label={item.label}
      description={item.description}
      shortcut={item.shortcut}
      side="right"
    >
      <motion.button
        onClick={onClick}
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
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          />
        )}
        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
        <span style={{ fontSize: '0.42rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, userSelect: 'none' }}>
          {item.label}
        </span>
      </motion.button>
    </RichTooltip>
  );
}

export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const activeTab = state.activeTab;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" popover on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
      {/* Primary nav items */}
      {PRIMARY_ITEMS.map(item => (
        <RailButton key={item.id} item={item} isActive={activeTab === item.tab} onClick={() => handleClick(item.tab)} />
      ))}

      {/* Secondary cluster: post-launch tools */}
      <div style={{ width: '28px', height: '1px', background: '#E4E4E7', margin: '2px 0' }} />
      {SECONDARY_ITEMS.map(item => (
        <RailButton key={item.id} item={item} isActive={activeTab === item.tab} onClick={() => handleClick(item.tab)} />
      ))}

      {/* More button + popover */}
      <div ref={moreRef} style={{ position: 'relative' }}>
        <RichTooltip label="More tools" description="All editor panels & features" side="right">
          <motion.button
            onClick={() => setMoreOpen(!moreOpen)}
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
            }}
          >
            <MoreHorizontal size={18} />
            <span style={{ fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1, userSelect: 'none' }}>
              More
            </span>
            {/* Notification dot if active tab is in More */}
            {isMoreActive && !moreOpen && (
              <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#18181B' }} />
            )}
          </motion.button>
        </RichTooltip>

        {/* Popover */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', left: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)',
                width: '200px', padding: '8px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E4E4E7',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                zIndex: 100,
                display: 'flex', flexDirection: 'column', gap: '4px',
                maxHeight: '400px', overflowY: 'auto',
              } as React.CSSProperties}
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
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleClick(item.tab)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '7px 10px', borderRadius: '10px', border: 'none',
                          background: isActive ? 'rgba(24,24,27,0.08)' : 'transparent',
                          color: isActive ? '#18181B' : '#3F3F46',
                          cursor: 'pointer', fontSize: '0.75rem', fontWeight: isActive ? 600 : 400,
                          width: '100%', textAlign: 'left', transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.025)'; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <Icon size={15} style={{ color: isActive ? '#18181B' : '#71717A', flexShrink: 0 }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
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
