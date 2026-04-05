'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorWing.tsx
//
// Push panel — inline flex child (NOT position:fixed) that
// shrinks to 0 when closed and springs to width when open.
// Canvas always sits to the right; the panel pushes it.
//
// Improvements:
//   • AnimatePresence cross-fade on tab switch
//   • Animated panel title change
//   • Gradient top accent line
//   • Drag-resize handle (260–520px range)
//   • Resizing state cursor management
// ─────────────────────────────────────────────────────────────

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose } from 'lucide-react';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META } from '@/lib/plan-tiers';

const MIN_W = 260;
const MAX_W = 520;
const DEFAULT_W = 320;

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
  thankyou:    'Thank You Notes',
  spotify:     'Music',
  vendors:     'Vendors',
};

const TAB_HINT: Partial<Record<EditorTab, string>> = {
  story:       'Edit chapters and narrative',
  canvas:      'Arrange and add page sections',
  events:      'Ceremony, reception & schedule',
  design:      'Theme, colors & visual style',
  details:     'Site URL, settings & metadata',
  blocks:      'AI-powered content blocks',
  voice:       'Train AI to match your voice',
  messaging:   'Bulk email & guest messaging',
  analytics:   'Views, RSVPs & engagement',
  guests:      'Manage your guest list',
  translate:   'Multi-language translations',
  savethedate: 'Design your Save the Date',
  thankyou:    'Post-event thank you notes',
  spotify:     'Playlist & song requests',
  vendors:     'Vendor contacts & timeline',
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
  const { dispatch } = useEditor();
  const [panelW, setPanelW] = useState(DEFAULT_W);
  const [resizing, setResizing] = useState(false);
  const [handleHovered, setHandleHovered] = useState(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(DEFAULT_W);

  const title = TAB_LABEL[activeTab] ?? String(activeTab);
  const hint  = TAB_HINT[activeTab];
  const tier  = TAB_TIER[activeTab];
  const meta  = tier ? TIER_META[tier] : null;

  // ── Resize handle ──────────────────────────────────────────
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = panelW;
    setResizing(true);
  }, [panelW]);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      const next = Math.min(MAX_W, Math.max(MIN_W, dragStartW.current + delta));
      setPanelW(next);
      dispatch({ type: 'SET_SIDEBAR_WIDTH', width: next });
    };

    const onUp = () => {
      setResizing(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, dispatch]);

  // Cursor override while resizing
  useEffect(() => {
    if (resizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  return (
    <motion.div
      animate={{ width: open ? panelW : 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      style={{
        flexShrink: 0,
        overflow: 'hidden',
        height: '100%',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Inner panel — always full panelW, clipped by outer overflow:hidden */}
      <div style={{
        width: panelW,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-dark-bg)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        boxShadow: open ? 'var(--pl-shadow-md)' : 'none',
        transition: 'box-shadow 0.3s',
        position: 'relative',
      } as React.CSSProperties}>

        {/* Top gradient accent line */}
        <div style={{
          height: '2px',
          flexShrink: 0,
          background: 'linear-gradient(90deg, var(--pl-olive) 0%, rgba(163,177,138,0.3) 50%, transparent 100%)',
        }} />

        {/* Panel header */}
        <div style={{
          height: '42px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px 0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden', minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden', minWidth: 0 }}
              >
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.35)',
                  whiteSpace: 'nowrap' as const,
                  display: 'block',
                }}>
                  {title}
                </span>
                {hint && (
                  <span style={{
                    fontSize: '0.58rem', fontWeight: 500,
                    color: 'rgba(255,255,255,0.2)',
                    whiteSpace: 'nowrap' as const,
                    display: 'block',
                    marginTop: '1px',
                  }}>
                    {hint}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
            {meta && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                color: meta.color,
                background: meta.bg,
                border: `1px solid ${meta.color}30`,
                padding: '1px 6px',
                borderRadius: '100px',
                lineHeight: '16px',
                flexShrink: 0,
              }}>
                {meta.label}
              </span>
            )}
          </div>
          <motion.button
            onClick={onToggle}
            title="Collapse panel"
            whileHover={{ backgroundColor: 'rgba(163,177,138,0.12)', color: '#A3B18A' }}
            whileTap={{ scale: 0.88 }}
            style={{
              width: '26px', height: '26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <PanelLeftClose size={14} />
          </motion.button>
        </div>

        {/* Scrollable content area */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingTop: '6px',
            position: 'relative',
          } as React.CSSProperties}
        >
          {children}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          onMouseEnter={() => setHandleHovered(true)}
          onMouseLeave={() => setHandleHovered(false)}
          style={{
            position: 'absolute', right: -3, top: 0, bottom: 0,
            width: 6, cursor: 'col-resize', zIndex: 10,
          }}
        >
          {/* Visual indicator line */}
          <div style={{
            position: 'absolute', left: '50%', top: '20%', bottom: '20%',
            width: '2px', transform: 'translateX(-50%)',
            background: (resizing || handleHovered)
              ? 'rgba(163,177,138,0.6)'
              : 'transparent',
            borderRadius: '2px',
            transition: 'background 0.15s',
            boxShadow: resizing ? '0 0 6px rgba(163,177,138,0.4)' : 'none',
          }} />
        </div>
      </div>
    </motion.div>
  );
}
