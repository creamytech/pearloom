'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
//
// Floating glass navigation rail — overlaid on the canvas left edge.
// Icon-only buttons with labels, rounded glassmorphic card.
// Matches Stitch Photo Atelier / Glass Island Editor pattern.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, PanelTop, Image, Clock, Settings,
} from 'lucide-react';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';

// ── Simplified icon-only rail items ─────────────────────────
type RailItem = {
  id: string;
  tab: EditorTab;
  Icon: React.ElementType;
  label: string;
};

const RAIL_ITEMS: RailItem[] = [
  { id: 'design',    tab: 'design',    Icon: Palette,  label: 'Design' },
  { id: 'sections',  tab: 'canvas',    Icon: PanelTop, label: 'Sections' },
  { id: 'story',     tab: 'story',     Icon: Image,    label: 'Story' },
  { id: 'analytics', tab: 'analytics', Icon: Clock,    label: 'Insights' },
];

export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const activeTab = state.activeTab;

  const handleClick = (tab: EditorTab) => {
    actions.handleTabChange(tab);
    onOpen?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 8px',
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(43,30,20,0.08), 0 1px 4px rgba(43,30,20,0.04)',
      } as React.CSSProperties}
    >
      {/* Avatar / Logo at top */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        style={{
          width: '40px', height: '40px',
          borderRadius: '50%',
          background: 'var(--pl-olive-mist)',
          border: '2px solid var(--pl-olive)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '8px',
          cursor: 'pointer',
        }}
      >
        <ElegantHeartIcon size={16} color="var(--pl-olive-deep)" />
      </motion.div>

      {/* Nav items */}
      {RAIL_ITEMS.map((item) => {
        const Icon = item.Icon;
        const isActive = activeTab === item.tab;

        return (
          <motion.button
            key={item.id}
            onClick={() => handleClick(item.tab)}
            title={item.label}
            whileHover={{ backgroundColor: 'rgba(163,177,138,0.12)' }}
            whileTap={{ scale: 0.88 }}
            style={{
              width: '44px', height: '44px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px',
              border: 'none',
              borderRadius: '14px',
              background: isActive ? 'rgba(163,177,138,0.15)' : 'transparent',
              color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="rail-active"
                style={{
                  position: 'absolute', left: '-4px', top: '50%',
                  transform: 'translateY(-50%)',
                  width: '3px', height: '20px',
                  borderRadius: '0 3px 3px 0',
                  background: 'var(--pl-olive-deep)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{
              fontSize: '0.48rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              lineHeight: 1, userSelect: 'none',
            }}>
              {item.label}
            </span>
          </motion.button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: '24px' }} />

      {/* Settings at bottom */}
      <motion.button
        onClick={() => handleClick('details')}
        title="Settings"
        whileHover={{ backgroundColor: 'rgba(163,177,138,0.12)' }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: '44px', height: '44px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '3px',
          border: 'none',
          borderRadius: '14px',
          background: activeTab === 'details' ? 'rgba(163,177,138,0.15)' : 'transparent',
          color: activeTab === 'details' ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <Settings size={18} strokeWidth={1.8} />
        <span style={{
          fontSize: '0.48rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          lineHeight: 1, userSelect: 'none',
        }}>
          Settings
        </span>
      </motion.button>
    </motion.div>
  );
}
