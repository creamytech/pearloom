'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileEditorSheet.tsx
// Full-screen tabbed mobile editor — no drag/snap sheet.
// Fixed layout, 5-tab bottom nav, push-navigation for chapters.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  motion, AnimatePresence, useMotionValue, animate,
  useDragControls, Reorder,
} from 'framer-motion';
import {
  Eye, BookOpen, CalendarDays, Palette, MoreHorizontal,
  Plus, Trash2, Image, Clock, ChevronRight, X,
  Users, Send, Mail, Mic, LayoutGrid, Globe, Gift,
  Music, ShoppingBag, Heart, BarChart2,
} from 'lucide-react';
import { GripIcon } from '@/components/icons/EditorIcons';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor } from '@/lib/editor-state';
import type { Chapter } from '@/types';
import { MobilePreviewPane } from './MobilePreviewPane';
import { MobileChapterEditor } from './MobileChapterEditor';

// ── Lazy panel imports ──────────────────────────────────────────
const DesignPanel             = dynamic(() => import('./DesignPanel').then(m => ({ default: m.DesignPanel })), { ssr: false });
const EventsPanel             = dynamic(() => import('./EventsPanel').then(m => ({ default: m.EventsPanel })), { ssr: false });
const DetailsPanel            = dynamic(() => import('./DetailsPanel').then(m => ({ default: m.DetailsPanel })), { ssr: false });
const GuestSearchPanel        = dynamic(() => import('./GuestSearchPanel').then(m => ({ default: m.GuestSearchPanel })), { ssr: false });
const MessagingPanel          = dynamic(() => import('@/components/dashboard/MessagingPanel').then(m => ({ default: m.MessagingPanel })), { ssr: false });
const BulkInvitePanel         = dynamic(() => import('./BulkInvitePanel').then(m => ({ default: m.BulkInvitePanel })), { ssr: false });
const SeatingEditorPanel      = dynamic(() => import('./SeatingEditorPanel').then(m => ({ default: m.SeatingEditorPanel })), { ssr: false });
const AnalyticsDashboardPanel = dynamic(() => import('./AnalyticsDashboardPanel').then(m => ({ default: m.AnalyticsDashboardPanel })), { ssr: false });
const TranslationPanel        = dynamic(() => import('./TranslationPanel').then(m => ({ default: m.TranslationPanel })), { ssr: false });
const SaveTheDatePanel        = dynamic(() => import('./SaveTheDatePanel').then(m => ({ default: m.SaveTheDatePanel })), { ssr: false });
const ThankYouPanel           = dynamic(() => import('./ThankYouPanel').then(m => ({ default: m.ThankYouPanel })), { ssr: false });
const SpotifyPanel            = dynamic(() => import('./SpotifyPanel').then(m => ({ default: m.SpotifyPanel })), { ssr: false });
const VendorPanel             = dynamic(() => import('./VendorPanel').then(m => ({ default: m.VendorPanel })), { ssr: false });
const VoiceTrainerPanel       = dynamic(() => import('./VoiceTrainerPanel').then(m => ({ default: m.VoiceTrainerPanel })), { ssr: false });
const AIBlocksPanel           = dynamic(() => import('./AIBlocksPanel').then(m => ({ default: m.AIBlocksPanel })), { ssr: false });

// ── Types ───────────────────────────────────────────────────────
type ActiveView = 'preview' | 'story' | 'events' | 'design' | 'more';

type MoreTool = {
  id: string;
  icon: React.ElementType;
  label: string;
};

// ── More drawer tools ───────────────────────────────────────────
const MORE_TOOLS: MoreTool[] = [
  { id: 'details',     icon: LayoutGrid,  label: 'Details'       },
  { id: 'guests',      icon: Users,       label: 'Guests'        },
  { id: 'messaging',   icon: Mail,        label: 'Messaging'     },
  { id: 'invite',      icon: Send,        label: 'Invites'       },
  { id: 'blocks',      icon: LayoutGrid,  label: 'AI Blocks'     },
  { id: 'voice',       icon: Mic,         label: 'Voice'         },
  { id: 'seating',     icon: Users,       label: 'Seating'       },
  { id: 'analytics',   icon: BarChart2,   label: 'Analytics'     },
  { id: 'translate',   icon: Globe,       label: 'Translate'     },
  { id: 'savethedate', icon: Gift,        label: 'Save the Date' },
  { id: 'vendors',     icon: ShoppingBag, label: 'Vendors'       },
  { id: 'thankyou',    icon: Heart,       label: 'Thank You'     },
  { id: 'spotify',     icon: Music,       label: 'Spotify'       },
];

// ── Bottom tabs ─────────────────────────────────────────────────
const BOTTOM_TABS: Array<{ id: ActiveView; icon: React.ElementType; label: string }> = [
  { id: 'preview', icon: Eye,           label: 'Preview'  },
  { id: 'story',   icon: BookOpen,      label: 'Story'    },
  { id: 'events',  icon: CalendarDays,  label: 'Events'   },
  { id: 'design',  icon: Palette,       label: 'Design'   },
  { id: 'more',    icon: MoreHorizontal, label: 'More'    },
];

// ── Helpers ─────────────────────────────────────────────────────
function getThumb(ch: Chapter): string | null {
  const raw = ch.images?.[0]?.url || null;
  if (!raw) return null;
  if (raw.includes('googleusercontent.com'))
    return `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=200&h=200`;
  return raw;
}

// ── ChapterReorderRow ───────────────────────────────────────────
function ChapterReorderRow({
  chapter,
  index,
  isActive,
  onSelect,
  onDelete,
}: {
  chapter: Chapter;
  index: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const controls = useDragControls();
  const thumb = getThumb(chapter);
  const [isSwiping, setIsSwiping] = useState(false);
  const rowX = useMotionValue(0);

  return (
    <Reorder.Item
      value={chapter}
      id={chapter.id}
      dragListener={!isSwiping}
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
      {/* Swipe-to-delete container */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
        {/* Delete zone revealed on swipe-left */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            background: 'rgba(220,53,69,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0 12px 12px 0',
          }}
        >
          <Trash2 size={16} color="rgba(255,255,255,0.9)" />
        </div>

        {/* Row content — x-draggable for swipe-to-delete */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -80, right: 0 }}
          dragElastic={{ left: 0.08, right: 0 }}
          style={{
            x: rowX,
            borderRadius: 12,
            background: isActive ? 'rgba(163,177,138,0.11)' : 'rgba(255,255,255,0.04)',
            borderLeft: isActive
              ? '3px solid rgba(163,177,138,0.75)'
              : '3px solid rgba(163,177,138,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 10px 10px 6px',
            cursor: 'pointer',
            minHeight: 56,
          }}
          onDragStart={() => setIsSwiping(true)}
          onDragEnd={(_, info) => {
            setIsSwiping(false);
            if (info.offset.x < -60) {
              onDelete(chapter.id);
            } else {
              animate(rowX, 0, { type: 'spring', stiffness: 500, damping: 38 });
            }
          }}
          whileHover={!isActive ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
          transition={{ duration: 0.13 }}
          onClick={() => onSelect(chapter.id)}
        >
          {/* Grip handle — y-drag is no longer competing with any sheet drag */}
          <motion.div
            role="button"
            aria-label="Drag to reorder"
            onPointerDown={e => {
              e.preventDefault();
              e.stopPropagation();
              controls.start(e);
            }}
            whileHover={{ color: 'rgba(163,177,138,0.8)' }}
            style={{
              cursor: 'grab',
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              color: 'rgba(255,255,255,0.2)',
              touchAction: 'none',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <GripIcon size={13} />
          </motion.div>

          {/* Index badge */}
          <div
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: isActive ? 'rgba(163,177,138,0.28)' : 'rgba(255,255,255,0.07)',
              border: isActive
                ? '1px solid rgba(163,177,138,0.45)'
                : '1px solid rgba(255,255,255,0.09)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.63rem',
              fontWeight: 800,
              color: isActive ? '#A3B18A' : 'rgba(255,255,255,0.4)',
            }}
          >
            {index + 1}
          </div>

          {/* Thumbnail */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 7,
              flexShrink: 0,
              background: thumb ? 'transparent' : 'rgba(255,255,255,0.07)',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            {thumb ? (
              <img
                src={thumb}
                alt={chapter.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image size={13} color="rgba(255,255,255,0.22)" />
              </div>
            )}
          </div>

          {/* Title / date */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                fontFamily: 'var(--eg-font-heading, "Playfair Display", Georgia, serif)',
                color: isActive ? 'rgba(214,198,168,0.95)' : 'rgba(255,255,255,0.9)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
              }}
            >
              {chapter.title || 'Untitled'}
            </div>
            {chapter.date && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Clock size={9} style={{ flexShrink: 0, opacity: 0.65 }} />
                <span>{chapter.date?.slice(0, 10)}</span>
              </div>
            )}
          </div>

          <ChevronRight size={14} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />
        </motion.div>
      </div>
    </Reorder.Item>
  );
}

// ── Scrollable panel wrapper ────────────────────────────────────
function ScrollPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 16px 80px',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export function MobileEditorSheet() {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { chapters, activeId, mobileActionChapterId } = state;

  const [activeView, setActiveView] = useState<ActiveView>('preview');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [activeMoreTool, setActiveMoreTool] = useState<string | null>(null);

  const isInChapterEditor = editingChapterId !== null;
  const activeChapter = editingChapterId
    ? chapters.find(c => c.id === editingChapterId) ?? null
    : null;

  // Watch mobileActionChapterId — external signal to open a chapter
  useEffect(() => {
    if (mobileActionChapterId) {
      openChapter(mobileActionChapterId);
      dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileActionChapterId]);

  const openChapter = useCallback((id: string) => {
    setEditingChapterId(id);
    setActiveView('story');
  }, []);

  const closeChapter = useCallback(() => {
    setEditingChapterId(null);
  }, []);

  const handleTabClick = useCallback((tab: ActiveView) => {
    if (tab === 'more') {
      setMoreDrawerOpen(prev => !prev);
    } else {
      setMoreDrawerOpen(false);
      setActiveView(tab);
    }
  }, []);

  const openMoreTool = useCallback((toolId: string) => {
    setMoreDrawerOpen(false);
    setActiveMoreTool(toolId);
    setActiveView('more');
  }, []);

  const closeMoreTool = useCallback(() => {
    setActiveMoreTool(null);
    setActiveView('preview');
  }, []);

  const handleDeleteChapter = useCallback(
    (id: string) => {
      actions.deleteChapter(id);
    },
    [actions],
  );

  const handleReorder = useCallback(
    (reordered: Chapter[]) => {
      reordered.forEach((ch, i) => {
        if (ch.order !== i) {
          actions.updateChapter(ch.id, { order: i });
        }
      });
    },
    [actions],
  );

  // ── Render active more-tool panel ──────────────────────────────
  const renderMoreToolPanel = () => {
    if (!activeMoreTool) return null;
    const panelStyle: React.CSSProperties = { height: '100%', overflow: 'hidden' };

    switch (activeMoreTool) {
      case 'details':
        return (
          <ScrollPanel>
            <DetailsPanel manifest={manifest} onChange={actions.handleDesignChange} subdomain={state.subdomain} />
          </ScrollPanel>
        );
      case 'guests':
        return (
          <div style={panelStyle}>
            <GuestSearchPanel siteId={state.subdomain} />
          </div>
        );
      case 'messaging':
        return (
          <div style={panelStyle}>
            <MessagingPanel manifest={manifest} siteId={state.subdomain} subdomain={state.subdomain} />
          </div>
        );
      case 'invite':
        return (
          <div style={panelStyle}>
            <BulkInvitePanel manifest={manifest} siteId={state.subdomain} subdomain={state.subdomain} />
          </div>
        );
      case 'blocks':
        return (
          <ScrollPanel>
            <AIBlocksPanel manifest={manifest} coupleNames={coupleNames} onChange={actions.handleDesignChange} />
          </ScrollPanel>
        );
      case 'voice':
        return (
          <div style={panelStyle}>
            <VoiceTrainerPanel
              voiceSamples={manifest?.voiceSamples || []}
              onChange={(samples) => actions.handleDesignChange({ ...manifest, voiceSamples: samples })}
            />
          </div>
        );
      case 'seating':
        return (
          <div style={panelStyle}>
            <SeatingEditorPanel siteId={state.subdomain} />
          </div>
        );
      case 'analytics':
        return (
          <div style={panelStyle}>
            <AnalyticsDashboardPanel siteId={state.subdomain} />
          </div>
        );
      case 'translate':
        return (
          <ScrollPanel>
            <TranslationPanel manifest={manifest} onChange={actions.handleDesignChange} />
          </ScrollPanel>
        );
      case 'savethedate':
        return (
          <ScrollPanel>
            <SaveTheDatePanel manifest={manifest} subdomain={state.subdomain} />
          </ScrollPanel>
        );
      case 'vendors':
        return (
          <div style={panelStyle}>
            <VendorPanel />
          </div>
        );
      case 'thankyou':
        return (
          <ScrollPanel>
            <ThankYouPanel />
          </ScrollPanel>
        );
      case 'spotify':
        return (
          <ScrollPanel>
            <SpotifyPanel />
          </ScrollPanel>
        );
      default:
        return null;
    }
  };

  // ── Render active view content ─────────────────────────────────
  const renderContent = () => {
    switch (activeView) {
      case 'preview':
        return (
          <MobilePreviewPane
            manifest={manifest}
            coupleNames={coupleNames}
            vibeSkin={manifest?.vibeSkin}
            selectedChapterId={activeId}
            onChapterTap={(id) => {
              setActiveView('story');
              openChapter(id);
            }}
          />
        );

      case 'story':
        return (
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '12px 12px 80px',
            } as React.CSSProperties}
          >
            {/* Add Chapter button */}
            <motion.button
              onClick={() => actions.addChapter()}
              whileTap={{ scale: 0.95 }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 0',
                marginBottom: 12,
                borderRadius: 12,
                border: '1px dashed rgba(163,177,138,0.35)',
                background: 'rgba(163,177,138,0.05)',
                color: '#A3B18A',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <Plus size={14} />
              Add Chapter
            </motion.button>

            {/* Chapter list */}
            <Reorder.Group
              axis="y"
              values={chapters}
              onReorder={handleReorder}
              as="div"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              <AnimatePresence initial={false}>
                {chapters.map((ch, i) => (
                  <ChapterReorderRow
                    key={ch.id}
                    chapter={ch}
                    index={i}
                    isActive={ch.id === activeId}
                    onSelect={openChapter}
                    onDelete={handleDeleteChapter}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        );

      case 'events':
        return (
          <ScrollPanel>
            <EventsPanel manifest={manifest} onChange={actions.handleDesignChange} />
          </ScrollPanel>
        );

      case 'design':
        return (
          <ScrollPanel>
            <DesignPanel manifest={manifest} onChange={actions.handleDesignChange} />
          </ScrollPanel>
        );

      case 'more':
        if (activeMoreTool) {
          return renderMoreToolPanel();
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <>
      {/* ── Full-screen fixed container ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          background: '#0F0C09',
          overflow: 'hidden',
        }}
      >
        {/* ── Top header (hidden when in chapter editor) ── */}
        {!isInChapterEditor && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              height: 52,
              paddingTop: 'env(safe-area-inset-top, 0px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(15,12,9,0.98)',
              gap: 8,
            }}
          >
            {/* Logo + brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                flexShrink: 0,
              }}
            >
              <ElegantHeartIcon size={20} color="#A3B18A" />
              <span
                style={{
                  fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: 'rgba(214,198,168,0.85)',
                  letterSpacing: '0.01em',
                }}
              >
                Pearloom
              </span>
            </div>

            {/* Couple name / site title */}
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.55)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                fontStyle: 'italic',
              }}
            >
              {coupleNames?.[0] && coupleNames?.[1]
                ? `${coupleNames[0]} & ${coupleNames[1]}`
                : coupleNames?.[0] || 'My Site'}
            </div>

            {/* Publish button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: true })}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 20,
                border: 'none',
                background: '#A3B18A',
                color: '#1a1a1a',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Publish
            </motion.button>
          </div>
        )}

        {/* ── More tool back bar ── */}
        {activeView === 'more' && activeMoreTool && !isInChapterEditor && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(15,12,9,0.95)',
            }}
          >
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={closeMoreTool}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 20,
                border: 'none',
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(214,198,168,0.75)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <X size={13} />
              Close
            </motion.button>
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'rgba(214,198,168,0.75)',
                fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                fontStyle: 'italic',
              }}
            >
              {MORE_TOOLS.find(t => t.id === activeMoreTool)?.label || ''}
            </span>
            <div style={{ width: 72 }} />
          </div>
        )}

        {/* ── Main scrollable content area ── */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isInChapterEditor ? `chapter-${editingChapterId}` : activeView}
              initial={{ opacity: isInChapterEditor ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%', position: 'absolute', inset: 0 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* ── Chapter editor slides in from right ── */}
          <AnimatePresence>
            {isInChapterEditor && activeChapter && (
              <MobileChapterEditor
                chapter={activeChapter}
                onBack={closeChapter}
                onNavigate={(id) => setEditingChapterId(id)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom tab bar (hidden when in chapter editor) ── */}
        {!isInChapterEditor && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              height: 58,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(15,12,9,0.98)',
              position: 'relative',
            }}
          >
            {BOTTOM_TABS.map(tab => {
              const isActive =
                tab.id !== 'more'
                  ? activeView === tab.id
                  : moreDrawerOpen || (activeView === 'more' && !!activeMoreTool);
              const Icon = tab.icon;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  whileTap={{ scale: 0.88 }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '6px 0',
                    position: 'relative',
                  }}
                >
                  {/* Animated pill background */}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-pill"
                      style={{
                        position: 'absolute',
                        inset: '4px 6px',
                        borderRadius: 10,
                        background: 'rgba(163,177,138,0.14)',
                        border: '1px solid rgba(163,177,138,0.25)',
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    />
                  )}

                  <Icon
                    size={18}
                    color={isActive ? '#A3B18A' : 'rgba(214,198,168,0.28)'}
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: isActive ? '#A3B18A' : 'rgba(214,198,168,0.28)',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── More drawer (slides up from bottom) ── */}
      <AnimatePresence>
        {moreDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMoreDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 600,
                background: 'rgba(0,0,0,0.45)',
              }}
            />

            {/* Drawer panel */}
            <motion.div
              key="more-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 601,
                background: '#181410',
                borderRadius: '20px 20px 0 0',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Drawer handle */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '12px 0 8px',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.15)',
                  }}
                />
              </div>

              {/* Drawer title */}
              <div
                style={{
                  padding: '0 18px 12px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                More Tools
              </div>

              {/* Tool grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  padding: '0 14px 24px',
                }}
              >
                {MORE_TOOLS.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <motion.button
                      key={tool.id}
                      onClick={() => openMoreTool(tool.id)}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '14px 8px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(214,198,168,0.65)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={20} />
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {tool.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
