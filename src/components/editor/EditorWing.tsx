'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorWing.tsx
//
// Docked editor inspector — claims its own width from the shell's
// flex row so the canvas reflows beside it (no overlay stacking).
// Left-edge resize handle adjusts the dock width; slides in/out
// on open/close.
// ─────────────────────────────────────────────────────────────

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META } from '@/lib/plan-tiers';
import { RichTooltip } from '@/components/ui/tooltip';

const MIN_W = 280;
const MAX_W = 460;
const DEFAULT_W = 340;
const STORAGE_KEY = 'pl-editor-wing-width';

const TAB_LABEL: Partial<Record<EditorTab, string>> = {
  story:       'Chapters',
  canvas:      'Page Layout',
  events:      'Events',
  design:      'Design',
  details:     'Details',
  pages:       'Pages',
  blocks:      'Pear',
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

// FIX #29: Read persisted width on init (SSR-safe; clamp into [MIN_W, MAX_W])
function readPersistedWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_W;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_W;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < MIN_W || n > MAX_W) return DEFAULT_W;
    return n;
  } catch {
    return DEFAULT_W;
  }
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
  const dragStartX = useRef(0);
  const dragStartW = useRef(DEFAULT_W);

  const title = TAB_LABEL[activeTab] ?? String(activeTab);
  const hint  = TAB_HINT[activeTab];
  const tier  = TAB_TIER[activeTab];
  const meta  = tier ? TIER_META[tier] : null;

  // FIX #29: Hydrate panel width from localStorage on mount
  useEffect(() => {
    const w = readPersistedWidth();
    if (w !== DEFAULT_W) {
      setPanelW(w);
      dispatch({ type: 'SET_SIDEBAR_WIDTH', width: w });
    }
  }, [dispatch]);

  // FIX #29: Persist panel width to localStorage (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try { window.localStorage.setItem(STORAGE_KEY, String(panelW)); } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [panelW]);

  // FIX #12/#32/#33: Auto-save visual feedback — pulse dot when unsaved,
  // show "Saved" chip briefly on transition (debounced to 1200ms between shows).
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSaveState = useRef(editorState.saveState);
  const lastSavedShownAt = useRef<number>(0);
  useEffect(() => {
    if (editorState.saveState === 'saved' && prevSaveState.current === 'unsaved') {
      const now = Date.now();
      if (now - lastSavedShownAt.current > 1200) {
        lastSavedShownAt.current = now;
        setShowSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
      }
    }
    prevSaveState.current = editorState.saveState;
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current); };
  }, [editorState.saveState]);

  // FIX #34: Scroll focused field into view when editorState.fieldFocus changes
  useEffect(() => {
    const key = editorState.fieldFocus;
    if (!key || !contentRef?.current) return;
    const el = contentRef.current.querySelector<HTMLElement>(
      `[data-field-focus="${CSS.escape(key)}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editorState.fieldFocus, contentRef]);

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
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelW, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{
            width: { type: 'spring', stiffness: 420, damping: 38 },
            opacity: { duration: 0.14 },
          }}
          style={{
            position: 'relative',
            flexShrink: 0,
            height: '100%',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
            borderLeft: '1px solid #E4E4E7',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '12px 14px 8px',
              borderBottom: '1px solid #E4E4E7',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FAFAFA',
              flexShrink: 0,
            }}>
            {/* FIX #35: Fixed min-height prevents layout jump during title swap */}
            <div style={{ minWidth: 0, minHeight: 42 }}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                >
                  <h3 style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: '#18181B',
                    margin: 0, lineHeight: 1.2,
                  }}>
                    {title}
                  </h3>
                  {hint && (
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#71717A',
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
                  borderRadius: '8px',
                  lineHeight: '16px',
                  display: 'inline-block', marginTop: '6px',
                }}>
                  {meta.label}
                </span>
              )}
            </div>
            {/* FIX #84: Group header action controls for a11y */}
            <div
              role="group"
              aria-label="Panel actions"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              {/* FIX #33: Save-state indicator — orange pulse when unsaved,
                  green check chip when saved (AnimatePresence swap) */}
              <AnimatePresence mode="wait">
                {editorState.saveState === 'unsaved' ? (
                  <motion.span
                    key="unsaved"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.18 }}
                    aria-label="Unsaved changes"
                    style={{
                      display: 'inline-block',
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: '#fb923c',
                      boxShadow: '0 0 0 0 rgba(251,146,60,0.6)',
                      animation: 'pl-wing-pulse 1.4s ease-out infinite',
                    }}
                  />
                ) : showSaved ? (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '3px',
                      fontSize: '0.58rem', fontWeight: 600,
                      color: '#16a34a',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(22,163,74,0.10)',
                    }}
                  >
                    <Check size={9} /> Saved
                  </motion.span>
                ) : null}
              </AnimatePresence>
              {/* FIX #31: RichTooltip replaces plain title attribute */}
              <RichTooltip label="Hide panel" shortcut="⌘\" side="bottom">
                <motion.button
                  onClick={onToggle}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                  whileTap={{ scale: 0.88 }}
                  style={{
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px', border: 'none',
                    background: 'transparent',
                    color: '#71717A',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </motion.button>
              </RichTooltip>
            </div>
          </div>

          {/* Scrollable content area — organic glass interior */}
          {/* FIX #30: Bumped bottom padding from 16 -> 24 so the last row
              isn't clipped by the resize handle / dock edge. */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '4px 0 24px',
            } as React.CSSProperties}
          >
            {children}
          </div>

          {/* Left-edge resize handle — wider hit area (12px) with a narrow 2px visible line. */}
          {/* FIX #27: bumped hit-area 6 -> 12. FIX #28: cursor: col-resize on the wrapper. */}
          <div
            onMouseDown={startResize}
            aria-label="Resize panel"
            className="pl-wing-resize"
            data-resizing={resizing ? 'true' : 'false'}
            style={{
              position: 'absolute', left: -6, top: 0, bottom: 0,
              width: 12, cursor: 'col-resize', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              className="pl-wing-resize-bar"
              style={{
                width: '2px', height: '100%',
                background: resizing ? 'rgba(24,24,27,0.22)' : 'transparent',
                transition: 'background 0.15s',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Pulse keyframes for the unsaved-dot animation (FIX #33)
              + hover affordance on the resize handle (FIX #28). */}
          <style>{`
            @keyframes pl-wing-pulse {
              0%   { box-shadow: 0 0 0 0 rgba(251,146,60,0.55); }
              70%  { box-shadow: 0 0 0 6px rgba(251,146,60,0); }
              100% { box-shadow: 0 0 0 0 rgba(251,146,60,0); }
            }
            .pl-wing-resize[data-resizing="false"]:hover .pl-wing-resize-bar {
              background: rgba(24,24,27,0.14);
            }
          `}</style>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
