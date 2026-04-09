'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorWing.tsx
//
// Floating glass inspector — overlaid on top of the canvas
// rather than pushing it. Matches the Stitch contextual
// inspector pattern (Hero Section, Properties, etc.)
// ─────────────────────────────────────────────────────────────

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META } from '@/lib/plan-tiers';

const MIN_W = 280;
const MAX_W = 460;
const DEFAULT_W = 340;

const TAB_LABEL: Partial<Record<EditorTab, string>> = {
  story:       'Chapters',
  canvas:      'Page Layout',
  events:      'Events',
  design:      'Design',
  details:     'Details',
  pages:       'Pages',
  blocks:      'Smart Fill',
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
  story:       'Edit your story chapters',
  canvas:      'Add, reorder & configure sections',
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
  const { dispatch, state: editorState } = useEditor();
  const [panelW, setPanelW] = useState(DEFAULT_W);
  const [resizing, setResizing] = useState(false);
  const dragControls = useDragControls();
  const dragStartX = useRef(0);
  const dragStartW = useRef(DEFAULT_W);

  const title = TAB_LABEL[activeTab] ?? String(activeTab);
  const hint  = TAB_HINT[activeTab];
  const tier  = TAB_TIER[activeTab];
  const meta  = tier ? TIER_META[tier] : null;

  // FIX #12: Auto-save visual feedback — shows briefly when save state transitions to 'saved'
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSaveState = useRef(editorState.saveState);
  useEffect(() => {
    if (editorState.saveState === 'saved' && prevSaveState.current === 'unsaved') {
      setShowSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
    }
    prevSaveState.current = editorState.saveState;
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current); };
  }, [editorState.saveState]);

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
          initial={{ opacity: 0, x: 30, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          drag
          dragControls={dragControls}
          dragMomentum={false}
          dragElastic={0}
          dragListener={false}
          style={{
            position: 'absolute',
            top: '48px',
            right: '12px',
            maxHeight: 'calc(100vh - 80px)',
            height: '75vh',
            width: panelW,
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            background: 'rgba(250,247,242,0.82)',
            backdropFilter: 'blur(32px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 8px 40px rgba(43,30,20,0.12), 0 2px 8px rgba(43,30,20,0.06), inset 0 1px 0 rgba(255,255,255,0.4)',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {/* Panel header — drag handle */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            style={{
              padding: '12px 14px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.08)',
              flexShrink: 0,
              cursor: 'grab',
              touchAction: 'none',
            }}>
            <div style={{ minWidth: 0 }}>
              <AnimatePresence mode="popLayout">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {/* FIX #12: Auto-save indicator */}
              <AnimatePresence>
                {showSaved && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '3px',
                      fontSize: '0.58rem', fontWeight: 600,
                      color: 'var(--pl-olive, #A3B18A)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(163,177,138,0.1)',
                    }}
                  >
                    <Check size={9} /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
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
          </div>

          {/* Scrollable content area — organic glass interior */}
          {/* FIX #11: Added bottom padding so content doesn't get clipped by resize handle */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '4px 0 16px',
            } as React.CSSProperties}
          >
            {children}
          </div>

          {/* Left-edge resize handle — visible on hover */}
          <div
            onMouseDown={startResize}
            className="group/resize"
            style={{
              position: 'absolute', left: -4, top: 40, bottom: 40,
              width: 8, cursor: 'col-resize', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: '3px', height: '40px', borderRadius: '3px',
              background: 'rgba(163,177,138,0.2)',
              transition: 'background 0.2s, height 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.5)'; (e.currentTarget as HTMLElement).style.height = '60px'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)'; (e.currentTarget as HTMLElement).style.height = '40px'; }}
            />
          </div>

          {/* Bottom resize handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = e.currentTarget.parentElement?.getBoundingClientRect().height || 500;
              const onMove = (ev: MouseEvent) => {
                const newH = Math.max(300, Math.min(startH + (ev.clientY - startY), window.innerHeight - 80));
                if (e.currentTarget.parentElement) {
                  (e.currentTarget.parentElement as HTMLElement).style.height = `${newH}px`;
                }
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                document.body.style.cursor = '';
              };
              document.body.style.cursor = 'row-resize';
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            style={{
              position: 'absolute', bottom: -4, left: 40, right: 40,
              height: 8, cursor: 'row-resize', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: '40px', height: '3px', borderRadius: '3px',
              background: 'rgba(163,177,138,0.2)',
              transition: 'background 0.2s, width 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.5)'; (e.currentTarget as HTMLElement).style.width = '60px'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)'; (e.currentTarget as HTMLElement).style.width = '40px'; }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
