'use client';

// Pearloom / MobileEditorSheet.tsx -- iOS-quality bottom sheet
// Draggable snap sheet, radial FAB, story push-navigation, keyboard avoidance

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  motion, AnimatePresence, useMotionValue, animate,
  useDragControls, Reorder,
} from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Image, Clock, ChevronRight } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon, GripIcon,
} from '@/components/icons/EditorIcons';
import { PearlIcon } from '@/components/icons/PearloomIcons';
import { useEditor } from '@/lib/editor-state';
import type { Chapter } from '@/types';

// Dynamic imports (kept lazy-loaded, no SSR)
const DesignPanelLazy       = dynamic(() => import('./DesignPanel').then(m => ({ default: m.DesignPanel })), { ssr: false });
const EventsPanelLazy       = dynamic(() => import('./EventsPanel').then(m => ({ default: m.EventsPanel })), { ssr: false });
const DetailsPanelLazy      = dynamic(() => import('./DetailsPanel').then(m => ({ default: m.DetailsPanel })), { ssr: false });
const PagesPanelLazy        = dynamic(() => import('./PagesPanel').then(m => ({ default: m.PagesPanel })), { ssr: false });
const AIBlocksPanelLazy     = dynamic(() => import('./AIBlocksPanel').then(m => ({ default: m.AIBlocksPanel })), { ssr: false });
const VoiceTrainerPanelLazy = dynamic(() => import('./VoiceTrainerPanel').then(m => ({ default: m.VoiceTrainerPanel })), { ssr: false });
const CanvasEditorLazy      = dynamic(() => import('./CanvasEditor').then(m => ({ default: m.CanvasEditor })), { ssr: false });
const ChapterPanelLazy      = dynamic(() => import('./ChapterPanel').then(m => ({ default: m.ChapterPanel })), { ssr: false });

// Constants
const RADIUS    = 126;
const FAB_ANGLES = [90, 68, 46, 24, 2] as const;
const FAB_LEFT  = 26;

type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas';
type StorySubview = 'list' | 'editor';

const TAB_LABELS: Record<EditorTab, string> = {
  canvas: 'Sections', story: 'Story Chapters', events: 'Events',
  design: 'Design', details: 'Details', pages: 'Pages',
  blocks: 'AI Blocks', voice: 'Voice',
};

const TAB_SHORT: Record<EditorTab, string> = {
  canvas: 'Sections', story: 'Story', events: 'Events',
  design: 'Design', details: 'Details', pages: 'Pages',
  blocks: 'AI', voice: 'Voice',
};

const ARC_TABS: Array<{ tab: EditorTab; icon: React.ElementType; label: string }> = [
  { tab: 'story',   icon: StoryIcon,    label: 'Story' },
  { tab: 'events',  icon: EventsIcon,   label: 'Events' },
  { tab: 'design',  icon: DesignIcon,   label: 'Design' },
  { tab: 'details', icon: DetailsIcon,  label: 'Details' },
  { tab: 'canvas',  icon: SectionsIcon, label: 'Sections' },
];

const SHEET_TABS: EditorTab[] = ['story', 'canvas', 'events', 'design', 'details', 'blocks', 'voice'];

const TAB_ICONS: Record<EditorTab, React.ElementType> = {
  story: StoryIcon, canvas: SectionsIcon, events: EventsIcon,
  design: DesignIcon, details: DetailsIcon, blocks: AIBlocksIcon,
  voice: VoiceIcon, pages: DetailsIcon,
};

// Helper
function getThumb(ch: Chapter): string | null {
  const raw = ch.images?.[0]?.url || null;
  if (!raw) return null;
  if (raw.includes('googleusercontent.com'))
    return `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=200&h=200`;
  return raw;
}

function snapToNearest(y: number, snaps: { full: number; mid: number; peek: number }): number {
  const vals = [snaps.full, snaps.mid, snaps.peek];
  return vals.reduce((closest, s) =>
    Math.abs(s - y) < Math.abs(closest - y) ? s : closest
  );
}

// ChapterReorderRow
function ChapterReorderRow({
  chapter, index, isActive, onSelect, onDelete,
}: {
  chapter: Chapter; index: number; isActive: boolean;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  const controls = useDragControls();
  const thumb = getThumb(chapter);

  return (
    <Reorder.Item
      value={chapter}
      id={chapter.id}
      dragListener={false}
      dragControls={controls}
      as="div"
      whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: '0 12px 32px rgba(0,0,0,0.55)' }}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.18 }}
      style={{ marginBottom: 6 }}
    >
      <motion.div
        whileHover={!isActive ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
        transition={{ duration: 0.13 }}
        style={{
          borderRadius: 12,
          background: isActive ? 'rgba(163,177,138,0.11)' : 'rgba(255,255,255,0.04)',
          borderLeft: isActive ? '3px solid rgba(163,177,138,0.75)' : '3px solid rgba(163,177,138,0.12)',
          border: '1px solid transparent',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 10px 10px 6px', cursor: 'pointer', minHeight: 56,
        }}
        onClick={() => onSelect(chapter.id)}
      >
        <motion.div
          role="button"
          aria-label="Drag to reorder"
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); controls.start(e); }}
          whileHover={{ color: 'rgba(163,177,138,0.8)' }}
          style={{
            cursor: 'grab', padding: '0 8px', display: 'flex', alignItems: 'center',
            color: 'rgba(255,255,255,0.2)', touchAction: 'none', userSelect: 'none', flexShrink: 0,
          }}
        >
          <GripIcon size={13} />
        </motion.div>

        <div style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
          background: isActive ? 'rgba(163,177,138,0.28)' : 'rgba(255,255,255,0.07)',
          border: isActive ? '1px solid rgba(163,177,138,0.45)' : '1px solid rgba(255,255,255,0.09)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.63rem', fontWeight: 800,
          color: isActive ? '#A3B18A' : 'rgba(255,255,255,0.4)',
        }}>
          {index + 1}
        </div>

        <div style={{
          width: 40, height: 40, borderRadius: 7, flexShrink: 0,
          background: thumb ? 'transparent' : 'rgba(255,255,255,0.07)',
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)',
        }}>
          {thumb
            ? <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image size={13} color="rgba(255,255,255,0.22)" />
              </div>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.88rem', fontWeight: 700,
            fontFamily: 'var(--eg-font-heading, "Playfair Display", Georgia, serif)',
            color: isActive ? 'rgba(214,198,168,0.95)' : 'rgba(255,255,255,0.9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3,
          }}>
            {chapter.title || 'Untitled'}
          </div>
          {chapter.date && (
            <div style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)',
              marginTop: 2, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Clock size={9} style={{ flexShrink: 0, opacity: 0.65 }} />
              <span>{chapter.date?.slice(0, 10)}</span>
            </div>
          )}
        </div>

        <ChevronRight size={14} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />

        <motion.button
          onClick={e => {
            e.stopPropagation();
            if (window.confirm(`Delete "${chapter.title || 'this chapter'}"?`)) onDelete(chapter.id);
          }}
          whileHover={{ scale: 1.15, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.12)' }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{
            padding: 5, borderRadius: 5, border: 'none',
            background: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer',
            display: 'flex', flexShrink: 0,
          }}
        >
          <Trash2 size={12} />
        </motion.button>
      </motion.div>
    </Reorder.Item>
  );
}

// Main component
export function MobileEditorSheet() {
  const { state, dispatch, actions, manifest } = useEditor();
  const {
    activeTab, mobileSheetOpen, chapters, activeId,
    rewritingId, sectionOverridesMap, mobileActionChapterId, subdomain,
  } = state;

  // Sheet geometry — computed synchronously so sheetY starts fully off-screen
  const initialSheetH = typeof window !== 'undefined'
    ? Math.min(window.innerHeight * 0.94, window.innerHeight - 56)
    : 820;
  const [sheetH, setSheetH] = useState(initialSheetH);

  useEffect(() => {
    const h = Math.min(window.innerHeight * 0.94, window.innerHeight - 56);
    setSheetH(h);
  }, []);

  const snaps = { full: 0, mid: sheetH * 0.31, peek: sheetH * 0.57 };

  // Sheet Y motion value & drag controls — start at sheetH (fully off-screen)
  const sheetY = useMotionValue(initialSheetH);
  const sheetDragControls = useDragControls();

  // Story subview
  const [storySubview, setStorySubview] = useState<StorySubview>('list');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);

  // Keyboard avoidance
  const [keyboardPad, setKeyboardPad] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const kbH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardPad(kbH > 80 ? kbH : 0);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => { vv.removeEventListener('resize', handler); vv.removeEventListener('scroll', handler); };
  }, []);

  // FAB + arc
  const [arcOpen, setArcOpen] = useState(false);

  // Snap helpers
  const snapTo = useCallback((target: number) => {
    animate(sheetY, target, { type: 'spring', stiffness: 520, damping: 42 });
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([3]);
  }, [sheetY]);

  const expandToFull = useCallback(() => snapTo(snaps.full), [snapTo, snaps.full]);
  const expandToMid  = useCallback(() => snapTo(snaps.mid),  [snapTo, snaps.mid]);

  // Sheet open/close sync
  useEffect(() => {
    if (mobileSheetOpen) { snapTo(snaps.mid); } else { snapTo(sheetH); }
  }, [mobileSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset storySubview on tab change
  useEffect(() => {
    if (activeTab !== 'story') { setStorySubview('list'); setEditingChapterId(null); }
  }, [activeTab]);

  // mobileActionChapterId watcher
  useEffect(() => {
    if (mobileActionChapterId && mobileSheetOpen) {
      openChapterEditor(mobileActionChapterId);
      dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: null });
    }
  }, [mobileActionChapterId, mobileSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Story navigation
  const openChapterEditor = useCallback((id: string) => {
    setEditingChapterId(id);
    setStorySubview('editor');
    dispatch({ type: 'SET_ACTIVE_ID', id });
    expandToFull();
  }, [dispatch, expandToFull]);

  const closeChapterEditor = useCallback(() => {
    setStorySubview('list');
    setEditingChapterId(null);
    expandToMid();
  }, [expandToMid]);

  // Drag end
  const handleDragEnd = useCallback((_e: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
    const vy = info.velocity.y;
    const oy = info.offset.y;
    const current = sheetY.get();

    if (vy > 650) {
      const next = current < snaps.mid ? snaps.mid : snaps.peek;
      if (next >= snaps.peek && oy > 100) {
        snapTo(sheetH);
        dispatch({ type: 'SET_MOBILE_SHEET', open: false });
      } else {
        snapTo(next);
      }
    } else if (vy < -650) {
      const next = current > snaps.mid ? snaps.mid : snaps.full;
      snapTo(next);
    } else {
      const nearest = snapToNearest(current, snaps);
      if (nearest >= snaps.peek && oy > 100) {
        snapTo(sheetH);
        dispatch({ type: 'SET_MOBILE_SHEET', open: false });
      } else {
        snapTo(nearest);
      }
    }
  }, [sheetY, snaps, sheetH, snapTo, dispatch]);

  // Derived
  const activeChapter = chapters.find(c => c.id === (editingChapterId || activeId)) || null;
  const isRewriting = activeChapter ? rewritingId === activeChapter.id : false;

  let headerTitle = TAB_LABELS[activeTab as EditorTab] ?? String(activeTab);
  if (activeTab === 'story' && storySubview === 'editor' && activeChapter) {
    headerTitle = activeChapter.title || 'Chapter Editor';
  }

  // Tab content
  function renderContent() {
    if (activeTab === 'story') {
      if (storySubview === 'editor' && activeChapter) {
        return (
          <ChapterPanelLazy
            chapter={activeChapter}
            onUpdate={actions.updateChapter}
            onAIRewrite={actions.handleAIRewrite}
            isRewriting={isRewriting}
            vibeSkin={manifest?.vibeSkin}
            vibeString={manifest?.vibeString}
            sectionOverrides={sectionOverridesMap[activeChapter.id]}
            onOverridesChange={(id, overrides) => {
              dispatch({ type: 'SET_SECTION_OVERRIDES', id, overrides });
              actions.updateChapter(id, {
                styleOverrides: {
                  backgroundColor: overrides.backgroundColor,
                  textColor: overrides.textColor,
                  padding: overrides.padding,
                },
              });
            }}
          />
        );
      }
      return (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
          }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(154,148,136,0.85)',
            }}>
              {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
            </span>
            <motion.button
              onClick={actions.addChapter}
              whileHover={{ scale: 1.07, backgroundColor: 'rgba(163,177,138,0.26)' }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 20, border: 'none',
                background: 'rgba(163,177,138,0.16)', color: '#A3B18A',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
              }}
            >
              <Plus size={12} /> Add
            </motion.button>
          </div>

          <Reorder.Group
            axis="y"
            values={chapters}
            onReorder={actions.handleReorder}
            as="div"
            style={{ margin: 0, padding: 0 }}
          >
            <AnimatePresence>
              {chapters.map((ch, i) => (
                <ChapterReorderRow
                  key={ch.id}
                  chapter={ch}
                  index={i}
                  isActive={activeId === ch.id}
                  onSelect={openChapterEditor}
                  onDelete={actions.deleteChapter}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      );
    }
    if (activeTab === 'canvas') {
      return (
        <CanvasEditorLazy
          manifest={manifest}
          onChange={actions.handleDesignChange}
          pushToPreview={actions.pushToPreview}
        />
      );
    }
    if (activeTab === 'events') {
      return <EventsPanelLazy manifest={manifest} onChange={actions.handleDesignChange} />;
    }
    if (activeTab === 'design') {
      return <DesignPanelLazy manifest={manifest} onChange={actions.handleDesignChange} />;
    }
    if (activeTab === 'details') {
      return <DetailsPanelLazy manifest={manifest} onChange={actions.handleDesignChange} subdomain={subdomain} />;
    }
    if (activeTab === 'pages') {
      return (
        <PagesPanelLazy
          manifest={manifest}
          subdomain={subdomain}
          onChange={actions.handleDesignChange}
          onPreviewPage={page => dispatch({ type: 'SET_PREVIEW_PAGE', page })}
          previewPage={state.previewPage}
        />
      );
    }
    if (activeTab === 'blocks') {
      return (
        <AIBlocksPanelLazy
          manifest={manifest}
          coupleNames={['Partner 1', 'Partner 2']}
          onChange={actions.handleDesignChange}
        />
      );
    }
    if (activeTab === 'voice') {
      return (
        <VoiceTrainerPanelLazy
          voiceSamples={manifest?.voiceSamples || []}
          onChange={samples => actions.handleDesignChange({ ...manifest, voiceSamples: samples })}
        />
      );
    }
    return null;
  }

  return (
    <>
      {/* Arc backdrop */}
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
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.28)',
              zIndex: 1090,
            }}
          />
        )}
      </AnimatePresence>

      {/* Radial FAB + arc items */}
      <div style={{
        position: 'fixed',
        bottom: 72,
        left: FAB_LEFT,
        zIndex: 1100,
        pointerEvents: mobileSheetOpen ? 'none' : 'all',
      }}>
        <AnimatePresence>
          {arcOpen && ARC_TABS.map((item, i) => {
            const angleRad = (FAB_ANGLES[i] * Math.PI) / 180;
            const x = Math.cos(angleRad) * RADIUS;
            const y = -Math.sin(angleRad) * RADIUS;
            const Icon = item.icon;
            const isAct = activeTab === item.tab;
            return (
              <motion.button
                key={item.tab}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 440, damping: 28, delay: i * 0.035 }}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_TAB', tab: item.tab });
                  dispatch({ type: 'SET_MOBILE_SHEET', open: true });
                  setArcOpen(false);
                }}
                aria-label={item.label}
                style={{
                  position: 'absolute', bottom: 0, left: 0,
                  width: 70, height: 50, borderRadius: 12,
                  border: isAct ? '1.5px solid rgba(163,177,138,0.55)' : '1px solid rgba(255,255,255,0.12)',
                  background: isAct ? 'rgba(163,177,138,0.22)' : 'rgba(18,14,11,0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  color: isAct ? '#A3B18A' : 'rgba(214,198,168,0.75)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
                  zIndex: 1100,
                  transform: `translate(${x}px, ${y}px)`,
                }}
              >
                <Icon size={15} color="currentColor" />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', lineHeight: 1 }}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onTap={() => {
            if (mobileSheetOpen) {
              dispatch({ type: 'SET_MOBILE_SHEET', open: false });
            } else {
              setArcOpen(prev => !prev);
            }
          }}
          whileTap={{ scale: 0.88 }}
          animate={arcOpen ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          aria-label={arcOpen ? 'Close menu' : 'Open editor menu'}
          style={{
            position: 'relative', zIndex: 1101,
            width: 52, height: 52, borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(18,14,11,0.95)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            color: 'rgba(214,198,168,0.88)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.06)',
            pointerEvents: 'all',
          }}
        >
          <PearlIcon size={22} color="rgba(214,198,168,0.88)" />
        </motion.button>
      </div>

      {/* Sheet */}
      <motion.div
        drag="y"
        dragControls={sheetDragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: snaps.peek }}
        dragElastic={{ top: 0.06, bottom: 0.16 }}
        onDragEnd={handleDragEnd}
        style={{
          y: sheetY,
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: sheetH, zIndex: 1200,
          background: 'rgba(18,14,11,0.97)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.75), 0 -1px 0 rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          pointerEvents: mobileSheetOpen ? 'all' : 'none',
          touchAction: 'none',
        }}
      >
        {/* Handle pill */}
        <div
          onPointerDown={e => { e.preventDefault(); sheetDragControls.start(e); }}
          style={{
            flexShrink: 0, paddingTop: 14, paddingBottom: 6,
            display: 'flex', justifyContent: 'center',
            cursor: 'grab', touchAction: 'none', userSelect: 'none',
          }}
        >
          <div style={{
            width: 34, height: 4, borderRadius: 100,
            background: 'rgba(255,255,255,0.2)',
          }} />
        </div>

        {/* Header */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: '0 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          gap: 10, minHeight: 44,
        }}>
          <AnimatePresence>
            {activeTab === 'story' && storySubview === 'editor' && (
              <motion.button
                key="back-btn"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                onClick={closeChapterEditor}
                aria-label="Back to story list"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 10px', borderRadius: 20, border: 'none',
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(214,198,168,0.7)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0,
                }}
              >
                <ArrowLeft size={13} /> Back
              </motion.button>
            )}
          </AnimatePresence>

          <span style={{
            flex: 1, fontSize: '1.1rem',
            fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
            fontStyle: 'italic', fontWeight: 500, letterSpacing: '-0.01em',
            color: 'rgba(214,198,168,0.92)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {headerTitle}
          </span>

          <motion.button
            onClick={() => dispatch({ type: 'SET_MOBILE_SHEET', open: false })}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.93 }}
            transition={{ duration: 0.13 }}
            style={{
              padding: '6px 14px', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(214,198,168,0.65)', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, flexShrink: 0,
            }}
          >
            Done
          </motion.button>
        </div>

        {/* Tab bar */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'stretch',
          overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        } as React.CSSProperties}>
          {SHEET_TABS.map(tab => {
            const Icon = TAB_ICONS[tab];
            const isAct = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab })}
                aria-label={TAB_SHORT[tab]}
                style={{
                  flex: '1 0 auto', minWidth: 54,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '8px 4px', border: 'none', cursor: 'pointer',
                  background: isAct ? 'rgba(214,198,168,0.08)' : 'transparent',
                  color: isAct ? 'rgba(214,198,168,0.92)' : 'rgba(214,198,168,0.3)',
                  position: 'relative', transition: 'color 0.15s, background 0.15s',
                }}
              >
                {isAct && (
                  <motion.div
                    layoutId="mobile-tab-accent"
                    style={{
                      position: 'absolute', bottom: 0, left: '12%', right: '12%',
                      height: 2, background: 'rgba(214,198,168,0.55)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={15} color="currentColor" />
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700,
                  letterSpacing: '0.07em', textTransform: 'uppercase', lineHeight: 1,
                }}>
                  {TAB_SHORT[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 96 + keyboardPad,
          } as React.CSSProperties}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${storySubview}`}
              initial={{ opacity: 0, x: storySubview === 'editor' ? 28 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: storySubview === 'editor' ? -20 : 0 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ padding: '16px 16px 0' }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Push-to-preview footer */}
        {activeTab !== 'canvas' && (
          <div style={{
            flexShrink: 0,
            padding: '10px 16px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(18,14,11,0.8)',
          }}>
            <motion.button
              onClick={() => actions.pushToPreview(manifest)}
              whileHover={{ backgroundColor: 'rgba(163,177,138,0.22)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.13 }}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                border: '1px solid rgba(163,177,138,0.3)',
                background: 'rgba(163,177,138,0.12)', color: '#A3B18A',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              Preview on {subdomain || 'your site'}
            </motion.button>
          </div>
        )}
      </motion.div>
    </>
  );
}
