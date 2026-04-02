'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorWing.tsx
//
// Push panel — an inline flex child (NOT position:fixed) that
// shrinks to 0 when closed and springs to PANEL_W when open.
// Canvas is always to the right; the panel pushes it, never
// covers it.
//
// Tab switching is handled by EditorRail. This component just
// shows/hides and renders its children.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { PanelLeftClose } from 'lucide-react';
import type { EditorTab } from '@/lib/editor-state';

const PANEL_W = 320;

const TAB_LABEL: Partial<Record<EditorTab, string>> = {
  story:       'Story',
  canvas:      'Sections',
  events:      'Events',
  design:      'Design',
  details:     'Details',
  pages:       'Pages',
  blocks:      'AI Blocks',
  voice:       'Voice',
  messaging:   'Messages',
  analytics:   'Analytics',
  guests:      'Guests',
  seating:     'Seating',
  translate:   'Translations',
  invite:      'Invitations',
  savethedate: 'Save the Date',
};

interface EditorWingProps {
  open: boolean;
  onToggle: () => void;
  activeTab: EditorTab;
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export function EditorWing({
  open,
  onToggle,
  activeTab,
  children,
  contentRef,
}: EditorWingProps) {
  const title = TAB_LABEL[activeTab] ?? String(activeTab);

  return (
    <motion.div
      animate={{ width: open ? PANEL_W : 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      style={{
        flexShrink: 0,
        overflow: 'hidden',
        height: '100%',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Inner panel — always full PANEL_W, clipped by outer overflow:hidden */}
      <div style={{
        width: PANEL_W,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream-card)',
        borderRight: '1px solid var(--pl-divider)',
        boxShadow: open ? 'var(--pl-shadow-md)' : 'none',
        transition: 'box-shadow 0.3s',
      } as React.CSSProperties}>

        {/* Panel header */}
        <div style={{
          height: '42px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px 0 16px',
          borderBottom: '1px solid var(--pl-divider)',
          background: 'var(--pl-cream)',
        }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--pl-muted)',
          }}>
            {title}
          </span>
          <motion.button
            onClick={onToggle}
            title="Collapse panel"
            whileHover={{ backgroundColor: 'rgba(163,177,138,0.1)', color: 'var(--pl-ink)' }}
            whileTap={{ scale: 0.88 }}
            style={{
              width: '26px', height: '26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', border: 'none',
              background: 'transparent',
              color: 'var(--pl-muted)',
              cursor: 'pointer',
            }}
          >
            <PanelLeftClose size={14} />
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingTop: '6px',
          } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}
