'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/MobileEditorSheet.tsx
//
// iOS-quality bottom sheet for the mobile editor.
// Features:
//   • Draggable snap sheet (peek / mid / full)
//   • Arc FAB that fans out tab icons
//   • Arc backdrop — tap outside to dismiss
//   • Push navigation for Story (list → chapter editor)
//   • Keyboard avoidance via visualViewport paddingBottom
//   • Frosted glass surface
// ─────────────────────────────────────────────────────────────

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, animate, useDragControls,
} from 'framer-motion';
import { X, Mail, ChevronLeft } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon, PublishIcon,
} from '@/components/icons/EditorIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { StoryPanel } from './StoryPanel';
import { CanvasEditor } from './CanvasEditor';
import { EventsPanel } from './EventsPanel';
import { DesignPanel } from './DesignPanel';
import { DetailsPanel } from './DetailsPanel';
import { AIBlocksPanel } from './AIBlocksPanel';
import { GuestSearchPanel } from './GuestSearchPanel';
import { TranslationPanel } from './TranslationPanel';
import { SaveTheDatePanel } from './SaveTheDatePanel';

// ── Constants ──────────────────────────────────────────────────
const TOOLBAR_H = 56;
const SPRING = { type: 'spring', stiffness: 520, damping: 42 } as const;
const PEEK_RATIO = 0.72;   // y as fraction of sheetH → barely visible handle
const MID_RATIO  = 0.38;   // y as fraction of sheetH → half open
const FULL_Y     = 0;      // fully open

// ── Arc tabs ───────────────────────────────────────────────────
type ArcTab = { tab: EditorTab; Icon: React.ElementType; label: string };

const ARC_TABS: ArcTab[] = [
  { tab: 'canvas',  Icon: SectionsIcon, label: 'Sections' },
  { tab: 'story',   Icon: StoryIcon,    label: 'Story'    },
  { tab: 'events',  Icon: EventsIcon,   label: 'Events'   },
  { tab: 'design',  Icon: DesignIcon,   label: 'Design'   },
  { tab: 'details', Icon: DetailsIcon,  label: 'Details'  },
  { tab: 'blocks',  Icon: AIBlocksIcon, label: 'Blocks'   },
];

// ── TabStrip ───────────────────────────────────────────────────
function TabStrip({
  activeTab,
  onSelect,
}: {
  activeTab: EditorTab;
  onSelect: (t: EditorTab) => void;
}) {
  return (
    <div style={{
      display: 'flex', gap: '4px', padding: '0 14px 10px',
      overflowX: 'auto', flexShrink: 0,
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {ARC_TABS.map(({ tab, Icon, label }) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '20px', flexShrink: 0,
              border: active
                ? '1px solid rgba(163,177,138,0.45)'
                : '1px solid rgba(255,255,255,0.07)',
              background: active ? 'rgba(163,177,138,0.14)' : 'transparent',
              color: active ? '#A3B18A' : 'rgba(255,255,255,0.4)',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'color 0.15s, border-color 0.15s, background 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
      {/* Messaging */}
      <button
        onClick={() => onSelect('messaging')}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '6px 12px', borderRadius: '20px', flexShrink: 0,
          border: activeTab === 'messaging'
            ? '1px solid rgba(163,177,138,0.45)'
            : '1px solid rgba(255,255,255,0.07)',
          background: activeTab === 'messaging' ? 'rgba(163,177,138,0.14)' : 'transparent',
          color: activeTab === 'messaging' ? '#A3B18A' : 'rgba(255,255,255,0.4)',
          fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.02em',
          transition: 'color 0.15s, border-color 0.15s, background 0.15s',
        }}
      >
        <Mail size={13} />
        Guests
      </button>
    </div>
  );
}

// ── MobileSheetContent ─────────────────────────────────────────
function MobileSheetContent({
  padBottom,
  onExpandFull,
}: {
  padBottom: number;
  onExpandFull: () => void;
}) {
  const { state, dispatch, manifest, coupleNames, actions } = useEditor();

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 14px',
        paddingBottom: `${20 + padBottom}px`,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}
    >
      <AnimatePresence mode="wait">
        {state.activeTab === 'story' && (
          <motion.div
            key="story"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <StoryPanel />
          </motion.div>
        )}

        {state.activeTab === 'canvas' && (
          <motion.div
            key="canvas"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <CanvasEditor
              manifest={manifest}
              onChange={actions.handleDesignChange}
              pushToPreview={actions.pushToPreview}
            />
          </motion.div>
        )}

        {state.activeTab === 'events' && (
          <motion.div
            key="events"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <EventsPanel manifest={manifest} onChange={actions.handleDesignChange} />
          </motion.div>
        )}

        {state.activeTab === 'design' && (
          <motion.div
            key="design"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <DesignPanel manifest={manifest} onChange={actions.handleDesignChange} />
          </motion.div>
        )}

        {state.activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <DetailsPanel
              manifest={manifest}
              onChange={actions.handleDesignChange}
              subdomain={state.subdomain}
            />
          </motion.div>
        )}

        {state.activeTab === 'blocks' && (
          <motion.div
            key="blocks"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <AIBlocksPanel
              manifest={manifest}
              coupleNames={coupleNames}
              onChange={(m) => { actions.handleDesignChange(m); actions.pushToPreview(m); }}
            />
          </motion.div>
        )}

        {state.activeTab === 'messaging' && (
          <motion.div
            key="messaging"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <GuestSearchPanel siteId={state.subdomain} />
          </motion.div>
        )}

        {state.activeTab === 'translate' && (
          <motion.div
            key="translate"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <TranslationPanel manifest={manifest} onChange={actions.handleDesignChange} />
          </motion.div>
        )}

        {state.activeTab === 'savethedate' && (
          <motion.div
            key="savethedate"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <SaveTheDatePanel manifest={manifest} subdomain={state.subdomain} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function MobileEditorSheet() {
  const { state, dispatch, actions } = useEditor();

  const dragControls = useDragControls();
  const y = useMotionValue(600); // start off-screen

  const [arcOpen, setArcOpen]     = useState(false);
  const [sheetH, setSheetH]       = useState(0);
  const [padBottom, setPadBottom] = useState(0);

  const sheetHRef = useRef(0);

  // ── Compute sheet height ─────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const h = window.innerHeight - TOOLBAR_H;
      setSheetH(h);
      sheetHRef.current = h;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Keyboard avoidance ───────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      setPadBottom(Math.max(0, kb));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // ── Snap helpers ─────────────────────────────────────────────
  const snapFull = useCallback(() => {
    animate(y, FULL_Y, SPRING);
  }, [y]);

  const snapMid = useCallback(() => {
    animate(y, sheetHRef.current * MID_RATIO, SPRING);
  }, [y]);

  const snapPeek = useCallback(() => {
    animate(y, sheetHRef.current * PEEK_RATIO, SPRING);
  }, [y]);

  const snapClose = useCallback(() => {
    animate(y, sheetHRef.current, SPRING);
    dispatch({ type: 'SET_MOBILE_SHEET', open: false });
  }, [y, dispatch]);

  // ── React to sheet open/close state ─────────────────────────
  useEffect(() => {
    if (!sheetH) return;
    if (state.mobileSheetOpen) {
      animate(y, sheetH * MID_RATIO, SPRING);
    } else {
      animate(y, sheetH, SPRING);
    }
  }, [state.mobileSheetOpen, sheetH, y]);

  // ── Drag end — snap to nearest ───────────────────────────────
  const handleDragEnd = useCallback(() => {
    const h = sheetHRef.current;
    const curr = y.get();
    const snaps = [FULL_Y, h * MID_RATIO, h * PEEK_RATIO, h];
    const closest = snaps.reduce((a, b) =>
      Math.abs(curr - a) < Math.abs(curr - b) ? a : b
    );
    if (closest >= h * 0.92) {
      snapClose();
    } else {
      animate(y, closest, SPRING);
      if (!state.mobileSheetOpen) {
        dispatch({ type: 'SET_MOBILE_SHEET', open: true });
      }
    }
  }, [y, snapClose, state.mobileSheetOpen, dispatch]);

  // ── Arc tab selection ────────────────────────────────────────
  const handleArcTabSelect = useCallback((tab: EditorTab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
    dispatch({ type: 'SET_MOBILE_SHEET', open: true });
    setArcOpen(false);
    animate(y, sheetHRef.current * MID_RATIO, SPRING);
  }, [y, dispatch]);

  // ── FAB tab select (from sheet tab strip) ────────────────────
  const handleTabSelect = useCallback((tab: EditorTab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
    snapFull();
  }, [dispatch, snapFull]);

  if (!sheetH) return null;

  const CurrentTabIcon = ARC_TABS.find(t => t.tab === state.activeTab)?.Icon ?? SectionsIcon;

  return (
    <>
      {/* ── Arc backdrop ──────────────────────────────────────── */}
      <AnimatePresence>
        {arcOpen && (
          <motion.div
            key="arc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setArcOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1090,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            } as React.CSSProperties}
          />
        )}
      </AnimatePresence>

      {/* ── Arc tab buttons ───────────────────────────────────── */}
      <AnimatePresence>
        {arcOpen && ARC_TABS.map(({ tab, Icon, label }, i) => {
          const total = ARC_TABS.length;
          const angleStart = -165;
          const angleEnd   = -15;
          const angle = angleStart + (i / (total - 1)) * (angleEnd - angleStart);
          const rad = (angle * Math.PI) / 180;
          const r = 96;
          const tx = Math.cos(rad) * r;
          const ty = Math.sin(rad) * r;
          const isActive = state.activeTab === tab;

          return (
            <motion.button
              key={tab}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ ...SPRING, delay: i * 0.025 }}
              onClick={() => handleArcTabSelect(tab)}
              style={{
                position: 'fixed',
                bottom: '20px', right: '20px',
                width: '46px', height: '46px',
                borderRadius: '50%',
                border: isActive
                  ? '1.5px solid rgba(163,177,138,0.7)'
                  : '1px solid rgba(255,255,255,0.14)',
                background: isActive
                  ? 'rgba(163,177,138,0.22)'
                  : 'rgba(18,14,11,0.94)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                color: isActive ? '#A3B18A' : 'rgba(255,255,255,0.72)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '2px',
                cursor: 'pointer',
                zIndex: 1100,
                boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                transform: `translate(${tx}px, ${ty}px)`,
                pointerEvents: 'auto',
                fontSize: '0.48rem', fontWeight: 800,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              } as React.CSSProperties}
            >
              <Icon size={17} />
              <span style={{ marginTop: '1px', lineHeight: 1 }}>{label}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* ── FAB ───────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setArcOpen(a => !a)}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          width: '54px', height: '54px',
          borderRadius: '50%',
          background: arcOpen
            ? 'rgba(30,22,16,0.96)'
            : 'linear-gradient(135deg, #A3B18A 0%, #6E8B5A 100%)',
          border: arcOpen
            ? '1px solid rgba(255,255,255,0.12)'
            : 'none',
          color: arcOpen ? 'rgba(255,255,255,0.75)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1110,
          boxShadow: arcOpen
            ? 'none'
            : '0 4px 22px rgba(100,140,80,0.55), 0 1px 4px rgba(0,0,0,0.3)',
        } as React.CSSProperties}
      >
        <AnimatePresence mode="wait">
          {arcOpen ? (
            <motion.span
              key="x"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex' }}
            >
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex' }}
            >
              <CurrentTabIcon size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Bottom sheet ──────────────────────────────────────── */}
      <motion.div
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          height: sheetH,
          y,
          borderRadius: '24px 24px 0 0',
          background: 'rgba(18,14,11,0.97)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          willChange: 'transform',
        }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: sheetH }}
        dragElastic={{ top: 0.04, bottom: 0.06 }}
        onDragEnd={handleDragEnd}
      >
        {/* Handle pill */}
        <div
          onPointerDown={e => { dragControls.start(e); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: '10px', paddingBottom: '6px',
            cursor: 'grab', flexShrink: 0, touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            width: '36px', height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.16)',
          }} />
        </div>

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '2px 14px 8px',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(214,198,168,0.45)',
          }}>
            Editor
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <motion.button
              onClick={() => actions.handlePublishSubmit()}
              whileTap={{ scale: 0.94 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px', borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, #A3B18A 0%, #6E8B5A 100%)',
                color: '#fff', fontSize: '0.72rem', fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(100,140,80,0.35)',
                letterSpacing: '0.04em',
              } as React.CSSProperties}
            >
              <PublishIcon size={12} />
              Publish
            </motion.button>
          </div>
        </div>

        {/* Tab strip */}
        <TabStrip activeTab={state.activeTab} onSelect={handleTabSelect} />

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'rgba(255,255,255,0.05)',
          flexShrink: 0, marginBottom: '2px',
        }} />

        {/* Panel content */}
        <MobileSheetContent
          padBottom={padBottom}
          onExpandFull={snapFull}
        />
      </motion.div>
    </>
  );
}
