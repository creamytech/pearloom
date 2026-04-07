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
          drag
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={{ top: 0, left: -600, right: 0, bottom: 0 }}
          initial={{ opacity: 0, x: 30, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          whileDrag={{ scale: 1.01, boxShadow: '0 16px 60px rgba(43,30,20,0.15), 0 4px 16px rgba(43,30,20,0.08)' }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            bottom: '72px',
            width: panelW,
            zIndex: 60,
            cursor: 'grab',
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
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
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
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
              whileTap={{ scale: 0.88 }}
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

          {/* Scrollable content area */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '2px 0',
            } as React.CSSProperties}
          >
            {children}
          </div>

          {/* Left-edge resize handle */}
          <div
            onMouseDown={startResize}
            style={{
              position: 'absolute', left: -3, top: 20, bottom: 20,
              width: 6, cursor: 'col-resize', zIndex: 10,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
