'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorWing.tsx
//
// Floating glass inspector — overlaid on top of the canvas
// rather than pushing it. Matches the Stitch contextual
// inspector pattern (Hero Section, Properties, etc.)
// ─────────────────────────────────────────────────────────────

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META } from '@/lib/plan-tiers';

// ── Spring presets ────────────────────────────────────────────
const SPRING_PANEL = { type: 'spring' as const, stiffness: 300, damping: 28 };
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 400, damping: 28 };

const MIN_W = 280;
const MAX_W = 460;
const DEFAULT_W = 340;

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
  history:     'History',
};

const TAB_HINT: Partial<Record<EditorTab, string>> = {
  story:       'Edit chapters & narrative',
  canvas:      'Arrange & add sections',
  events:      'Ceremony & schedule',
  design:      'Colors, fonts & effects',
  details:     'URL, SEO & settings',
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
  history:     'Undo/redo timeline & restore',
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
  const dragStartX = useRef(0);
  const dragStartW = useRef(DEFAULT_W);

  const [resizeHover, setResizeHover] = useState(false);
  const prevTabRef = useRef(activeTab);
  const [slideDirection, setSlideDirection] = useState(1); // 1 = right, -1 = left

  const title = TAB_LABEL[activeTab] ?? String(activeTab);
  const hint  = TAB_HINT[activeTab];
  const tier  = TAB_TIER[activeTab];
  const meta  = tier ? TIER_META[tier] : null;

  // Track tab order for directional content transitions
  const tabKeys = Object.keys(TAB_LABEL);
  useEffect(() => {
    const prevIdx = tabKeys.indexOf(prevTabRef.current);
    const nextIdx = tabKeys.indexOf(activeTab);
    setSlideDirection(nextIdx >= prevIdx ? 1 : -1);
    prevTabRef.current = activeTab;
  }, [activeTab]);

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
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_W, Math.max(MIN_W, dragStartW.current + delta));
      setPanelW(next);
      dispatch({ type: 'SET_SIDEBAR_WIDTH', width: next });
    };

    const onUp = () => setResizing(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, dispatch]);

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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.96 }}
          transition={SPRING_PANEL}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            bottom: '72px',
            width: panelW,
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 40px rgba(43,30,20,0.1), 0 2px 8px rgba(43,30,20,0.05)',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {/* Panel header */}
          <div style={{
            padding: '14px 14px 10px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ minWidth: 0 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={SPRING_SNAPPY}
                >
                  <h3 style={{
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    fontFamily: 'var(--pl-font-heading)',
                    fontStyle: 'italic',
                    color: 'var(--pl-ink)',
                    margin: 0, lineHeight: 1.2,
                  }}>
                    {title}
                  </h3>
                  {hint && (
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-muted)',
                      display: 'block', marginTop: '2px',
                    }}>
                      {hint}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
              {meta && (
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700,
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: meta.color,
                  background: meta.bg,
                  border: `1px solid ${meta.color}30`,
                  padding: '1px 6px',
                  borderRadius: '100px',
                  lineHeight: '16px',
                  display: 'inline-block', marginTop: '6px',
                }}>
                  {meta.label}
                </span>
              )}
            </div>
            <motion.button
              onClick={onToggle}
              title="Close panel"
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)', rotate: 90 }}
              whileTap={{ scale: 0.82 }}
              transition={SPRING_SNAPPY}
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px', border: 'none',
                background: 'transparent',
                color: 'var(--pl-muted)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </motion.button>
          </div>

          {/* Scrollable content area — crossfade with scale on tab change */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '2px 0',
              position: 'relative',
            } as React.CSSProperties}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: slideDirection * 16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: slideDirection * -10, scale: 0.98 }}
                transition={SPRING_SNAPPY}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Left-edge resize handle with glow on hover */}
          <motion.div
            onMouseDown={startResize}
            onMouseEnter={() => setResizeHover(true)}
            onMouseLeave={() => setResizeHover(false)}
            animate={{
              backgroundColor: resizeHover
                ? 'rgba(163,177,138,0.5)'
                : 'rgba(0,0,0,0)',
              boxShadow: resizeHover
                ? '0 0 8px rgba(163,177,138,0.4)'
                : '0 0 0px rgba(0,0,0,0)',
            }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', left: -2, top: 20, bottom: 20,
              width: 4, cursor: 'col-resize', zIndex: 10,
              borderRadius: '4px',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
