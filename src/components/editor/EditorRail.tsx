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
import { useEditor, type EditorTab } from '@/lib/editor-state';

type RailItem = {
  id: string;
  tab: EditorTab;
  Icon: React.ElementType;
  label: string;
};

// Primary tabs — always visible on the rail
const PRIMARY_ITEMS: RailItem[] = [
  { id: 'design',   tab: 'design',   Icon: Palette,      label: 'Design' },
  { id: 'sections', tab: 'canvas',   Icon: LayoutGrid,   label: 'Layout' },
  { id: 'story',    tab: 'story',    Icon: BookOpen,     label: 'Chapters' },
  { id: 'events',   tab: 'events',   Icon: CalendarDays, label: 'Events' },
  { id: 'blocks',   tab: 'blocks',   Icon: Sparkles,     label: 'AI Blocks' },
];

// Overflow tabs — shown in "More" popover
const MORE_ITEMS: RailItem[] = [
  { id: 'guests',     tab: 'guests',     Icon: Users,        label: 'Guests' },
  { id: 'messaging',  tab: 'messaging',  Icon: MessageSquare, label: 'Messages' },
  { id: 'analytics',  tab: 'analytics',  Icon: BarChart2,    label: 'Analytics' },
  { id: 'seating',    tab: 'seating',    Icon: Users,        label: 'Seating' },
  { id: 'translate',  tab: 'translate',  Icon: Globe,        label: 'Translate' },
  { id: 'spotify',    tab: 'spotify',    Icon: Music,        label: 'Music' },
  { id: 'vendors',    tab: 'vendors',    Icon: ShoppingBag,  label: 'Vendors' },
  { id: 'invite',     tab: 'invite',     Icon: Mail,         label: 'Invitations' },
  { id: 'savethedate', tab: 'savethedate', Icon: Heart,      label: 'Save the Date' },
  { id: 'thankyou',   tab: 'thankyou',   Icon: Heart,        label: 'Thank You' },
  { id: 'voice',      tab: 'voice',      Icon: Sparkles,     label: 'Voice AI' },
  { id: 'pages',      tab: 'pages',      Icon: FileText,     label: 'Pages' },
];

function RailButton({ item, isActive, onClick }: { item: RailItem; isActive: boolean; onClick: () => void }) {
  const Icon = item.Icon;
  return (
    <motion.button
      onClick={onClick}
      title={item.label}
      whileHover={{ backgroundColor: 'rgba(163,177,138,0.12)' }}
      whileTap={{ scale: 0.88 }}
      style={{
        width: '44px', height: '44px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '3px', border: 'none', borderRadius: '14px',
        background: isActive ? 'rgba(163,177,138,0.15)' : 'transparent',
        color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
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
            background: 'var(--pl-olive-deep)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        />
      )}
      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
      <span style={{ fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1, userSelect: 'none' }}>
        {item.label}
      </span>
    </motion.button>
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

  // Check if active tab is in the "more" overflow
  const isMoreActive = MORE_ITEMS.some(item => item.tab === activeTab);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
        zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px', padding: '12px 8px', borderRadius: '24px',
        background: 'rgba(250,247,242,0.78)',
        backdropFilter: 'blur(32px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 4px 24px rgba(43,30,20,0.1), 0 1px 4px rgba(43,30,20,0.04), inset 0 1px 0 rgba(255,255,255,0.4)',
      } as React.CSSProperties}
    >
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--pl-olive-mist)', border: '2px solid var(--pl-olive)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '8px', cursor: 'pointer',
        }}
      >
        <ElegantHeartIcon size={16} color="var(--pl-olive-deep)" />
      </motion.div>

      {/* Primary nav items */}
      {PRIMARY_ITEMS.map(item => (
        <RailButton key={item.id} item={item} isActive={activeTab === item.tab} onClick={() => handleClick(item.tab)} />
      ))}

      {/* More button + popover */}
      <div ref={moreRef} style={{ position: 'relative' }}>
        <motion.button
          onClick={() => setMoreOpen(!moreOpen)}
          title="More tools"
          whileHover={{ backgroundColor: 'rgba(163,177,138,0.12)' }}
          whileTap={{ scale: 0.88 }}
          style={{
            width: '44px', height: '44px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '3px', border: 'none', borderRadius: '14px',
            background: moreOpen || isMoreActive ? 'rgba(163,177,138,0.15)' : 'transparent',
            color: moreOpen || isMoreActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          <MoreHorizontal size={18} />
          <span style={{ fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1, userSelect: 'none' }}>
            More
          </span>
          {/* Notification dot if active tab is in More */}
          {isMoreActive && !moreOpen && (
            <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
          )}
        </motion.button>

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
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(24px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 12px 40px rgba(43,30,20,0.12), 0 4px 12px rgba(43,30,20,0.05)',
                zIndex: 100,
                display: 'flex', flexDirection: 'column', gap: '2px',
                maxHeight: '400px', overflowY: 'auto',
              } as React.CSSProperties}
            >
              <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '4px 8px 6px', borderBottom: '1px solid rgba(0,0,0,0.04)', marginBottom: '2px' }}>
                All Tools
              </div>
              {MORE_ITEMS.map(item => {
                const Icon = item.Icon;
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item.tab)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: '10px', border: 'none',
                      background: isActive ? 'rgba(163,177,138,0.12)' : 'transparent',
                      color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-ink-soft)',
                      cursor: 'pointer', fontSize: '0.78rem', fontWeight: isActive ? 600 : 400,
                      width: '100%', textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon size={15} style={{ color: isActive ? 'var(--pl-olive)' : 'var(--pl-muted)', flexShrink: 0 }} />
                    {item.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1, minHeight: '12px' }} />

      {/* Settings at bottom */}
      <RailButton
        item={{ id: 'details', tab: 'details', Icon: Settings, label: 'Settings' }}
        isActive={activeTab === 'details'}
        onClick={() => handleClick('details')}
      />
    </motion.div>
  );
}
