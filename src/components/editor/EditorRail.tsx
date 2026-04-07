'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
//
// Floating glass navigation rail — overlaid on the canvas left edge.
// Icon-only buttons with labels, rounded glassmorphic card.
// Matches Stitch Photo Atelier / Glass Island Editor pattern.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, PanelTop, Image, Clock, Settings, Package, History,
} from 'lucide-react';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';

// ── Spring presets ────────────────────────────────────────────
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 400, damping: 28 };
const SPRING_BOUNCY = { type: 'spring' as const, stiffness: 360, damping: 22 };
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 300, damping: 26 };

// ── Tooltip component with spring slide-in ────────────────────
function RailTooltip({ label, visible }: { label: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -8, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -6, scale: 0.95 }}
          transition={SPRING_BOUNCY}
          style={{
            position: 'absolute',
            left: 'calc(100% + 10px)',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px 10px',
            borderRadius: '8px',
            background: 'rgba(28,25,22,0.92)',
            backdropFilter: 'blur(12px)',
            color: '#f5f0eb',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            zIndex: 100,
          }}
        >
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Simplified icon-only rail items ─────────────────────────
type RailItem = {
  id: string;
  tab: EditorTab;
  Icon: React.ElementType;
  label: string;
};

const RAIL_ITEMS: RailItem[] = [
  { id: 'design',     tab: 'design',     Icon: Palette,  label: 'Design' },
  { id: 'sections',   tab: 'canvas',     Icon: PanelTop, label: 'Sections' },
  { id: 'story',      tab: 'story',      Icon: Image,    label: 'Story' },
  { id: 'components', tab: 'components', Icon: Package,  label: 'Symbols' },
  { id: 'analytics',  tab: 'analytics',  Icon: Clock,    label: 'Insights' },
  { id: 'history',    tab: 'history',    Icon: History,  label: 'History' },
];

export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const activeTab = state.activeTab;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleClick = (tab: EditorTab) => {
    actions.handleTabChange(tab);
    onOpen?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_GENTLE}
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
      {/* Avatar / Logo at top — stagger index 0 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...SPRING_BOUNCY, delay: 0.15 }}
        whileHover={{ scale: 1.12, boxShadow: '0 0 14px rgba(163,177,138,0.35)' }}
        whileTap={{ scale: 0.92 }}
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

      {/* Nav items — staggered mount */}
      {RAIL_ITEMS.map((item, index) => {
        const Icon = item.Icon;
        const isActive = activeTab === item.tab;
        const isHovered = hoveredId === item.id;

        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING_BOUNCY, delay: 0.2 + index * 0.06 }}
            onClick={() => handleClick(item.tab)}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            whileHover={{
              scale: 1.08,
              backgroundColor: 'rgba(163,177,138,0.14)',
              boxShadow: '0 0 12px rgba(163,177,138,0.2)',
            }}
            whileTap={{ scale: 0.88 }}
            style={{
              width: '44px', height: '44px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px',
              border: 'none',
              borderRadius: '14px',
              background: 'transparent',
              color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Sliding olive pill behind active icon */}
            {isActive && (
              <motion.div
                layoutId="rail-active-pill"
                style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '14px',
                  background: 'rgba(163,177,138,0.15)',
                  zIndex: -1,
                }}
                transition={SPRING_SNAPPY}
              />
            )}
            {/* Active indicator bar — slides between items */}
            {isActive && (
              <motion.div
                layoutId="rail-active-bar"
                style={{
                  position: 'absolute', left: '-4px', top: '50%',
                  transform: 'translateY(-50%)',
                  width: '3px', height: '20px',
                  borderRadius: '0 3px 3px 0',
                  background: 'var(--pl-olive-deep)',
                }}
                transition={SPRING_SNAPPY}
              />
            )}
            <motion.div
              animate={{ scale: isActive ? 1.05 : 1 }}
              transition={SPRING_SNAPPY}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            </motion.div>
            <span style={{
              fontSize: '0.48rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              lineHeight: 1, userSelect: 'none',
            }}>
              {item.label}
            </span>
            {/* Tooltip slides in from left with spring */}
            <RailTooltip label={item.label} visible={isHovered} />
          </motion.button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: '24px' }} />

      {/* Settings at bottom — staggered last */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...SPRING_BOUNCY, delay: 0.2 + RAIL_ITEMS.length * 0.06 }}
        onClick={() => handleClick('details')}
        onMouseEnter={() => setHoveredId('settings')}
        onMouseLeave={() => setHoveredId(null)}
        whileHover={{
          scale: 1.08,
          backgroundColor: 'rgba(163,177,138,0.14)',
          boxShadow: '0 0 12px rgba(163,177,138,0.2)',
        }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: '44px', height: '44px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '3px',
          border: 'none',
          borderRadius: '14px',
          background: 'transparent',
          color: activeTab === 'details' ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        {activeTab === 'details' && (
          <motion.div
            layoutId="rail-active-pill"
            style={{
              position: 'absolute', inset: 0,
              borderRadius: '14px',
              background: 'rgba(163,177,138,0.15)',
              zIndex: -1,
            }}
            transition={SPRING_SNAPPY}
          />
        )}
        {activeTab === 'details' && (
          <motion.div
            layoutId="rail-active-bar"
            style={{
              position: 'absolute', left: '-4px', top: '50%',
              transform: 'translateY(-50%)',
              width: '3px', height: '20px',
              borderRadius: '0 3px 3px 0',
              background: 'var(--pl-olive-deep)',
            }}
            transition={SPRING_SNAPPY}
          />
        )}
        <Settings size={18} strokeWidth={1.8} />
        <span style={{
          fontSize: '0.48rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          lineHeight: 1, userSelect: 'none',
        }}>
          Settings
        </span>
        <RailTooltip label="Settings" visible={hoveredId === 'settings'} />
      </motion.button>
    </motion.div>
  );
}
