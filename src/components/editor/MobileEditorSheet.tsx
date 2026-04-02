'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileEditorSheet.tsx — Mobile bottom tab bar + sheet panel
// Redesigned: 4 tabs + More overflow, FAB publish, 55vh sheet, keyboard avoidance
// ─────────────────────────────────────────────────────────────

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Image, X } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon,
} from '@/components/icons/EditorIcons';
import { PearlIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import type { Chapter } from '@/types';
import dynamic from 'next/dynamic';

const DesignPanel = dynamic(() => import('./DesignPanel').then(m => ({ default: m.DesignPanel })), { ssr: false });
const EventsPanel = dynamic(() => import('./EventsPanel').then(m => ({ default: m.EventsPanel })), { ssr: false });
const DetailsPanel = dynamic(() => import('./DetailsPanel').then(m => ({ default: m.DetailsPanel })), { ssr: false });
const PagesPanel = dynamic(() => import('./PagesPanel').then(m => ({ default: m.PagesPanel })), { ssr: false });
const AIBlocksPanel = dynamic(() => import('./AIBlocksPanel').then(m => ({ default: m.AIBlocksPanel })), { ssr: false });
const VoiceTrainerPanel = dynamic(() => import('./VoiceTrainerPanel').then(m => ({ default: m.VoiceTrainerPanel })), { ssr: false });
const CanvasEditor = dynamic(() => import('./CanvasEditor').then(m => ({ default: m.CanvasEditor })), { ssr: false });
const ChapterPanel = dynamic(() => import('./ChapterPanel').then(m => ({ default: m.ChapterPanel })), { ssr: false });

// ── Arc items for the radial FAB ─────────────────────────────
// Radius 130px, 5 items spread 100°→0° = 25° apart = arc length ~56px between
// centers at that radius. With 52px buttons there is a comfortable 4px gap.
const RADIUS = 130;

interface ArcItem {
  tab: EditorTab;
  icon: React.ElementType;
  label: string;
  angle: number; // degrees from positive x-axis (90 = up, 0 = right)
}

const ARC_ITEMS: ArcItem[] = [
  { tab: 'story',   icon: StoryIcon,    label: 'Story',    angle: 100 },
  { tab: 'events',  icon: EventsIcon,   label: 'Events',   angle: 75  },
  { tab: 'design',  icon: DesignIcon,   label: 'Design',   angle: 50  },
  { tab: 'details', icon: DetailsIcon,  label: 'Details',  angle: 25  },
  { tab: 'canvas',  icon: SectionsIcon, label: 'Sections', angle: 0   },
];

const TAB_LABELS: Record<string, string> = {
  story: 'Story', canvas: 'Sections', events: 'Events', design: 'Design',
  details: 'Details', blocks: 'AI Blocks', voice: 'Voice',
};

// ── Radial FAB ────────────────────────────────────────────────
function RadialFab({ activeTab, onTabChange, sheetOpen, onToggleSheet }: {
  activeTab: string;
  onTabChange: (tab: EditorTab) => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}) {
  const [arcOpen, setArcOpen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
        left: 20,
        zIndex: 1100,
        width: 58,
        height: 58,
      }}
    >
      {/* Arc items */}
      <AnimatePresence>
        {arcOpen && ARC_ITEMS.map((item, index) => {
          const rad = item.angle * Math.PI / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = -Math.sin(rad) * RADIUS;
          const Icon = item.icon;
          const isActive = activeTab === item.tab;

          return (
            <motion.button
              key={item.tab}
              onClick={() => {
                setArcOpen(false);
                onTabChange(item.tab);
                if (!sheetOpen) onToggleSheet();
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{ x, y, scale: 1, opacity: 1 }}
              exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              transition={{ delay: index * 0.045, type: 'spring', stiffness: 360, damping: 26 }}
              aria-label={item.label}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                // Pill shape — wider than tall to give text room
                width: 72,
                height: 52,
                borderRadius: '14px',
                border: `1.5px solid ${isActive ? 'rgba(163,177,138,0.65)' : 'rgba(255,255,255,0.13)'}`,
                background: isActive
                  ? 'rgba(163,177,138,0.22)'
                  : 'rgba(18, 15, 12, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transform: 'translate(-50%, -50%)',
                boxShadow: isActive
                  ? '0 4px 18px rgba(163,177,138,0.25), 0 2px 8px rgba(0,0,0,0.5)'
                  : '0 4px 18px rgba(0,0,0,0.55)',
              } as React.CSSProperties}
            >
              <Icon size={19} color={isActive ? 'rgba(163,177,138,1)' : 'rgba(214,198,168,0.75)'} />
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: isActive ? 'rgba(163,177,138,1)' : 'rgba(214,198,168,0.6)',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => {
          if (sheetOpen) {
            onToggleSheet();
          } else {
            setArcOpen(v => !v);
          }
        }}
        animate={{ rotate: arcOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        aria-label={sheetOpen ? 'Close panel' : (arcOpen ? 'Close menu' : 'Open menu')}
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: (arcOpen || sheetOpen) ? '#A3B18A' : '#F5F1E8',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(0,0,0,0.45), inset 0 0 0 1.5px rgba(255,255,255,0.18)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {(arcOpen || sheetOpen)
          ? <X size={24} color="#fff" />
          : <PearlIcon size={26} color="#2B2520" />
        }
      </motion.button>
    </div>
  );
}

function getThumb(ch: { images?: Array<{ url?: string }> }): string | null {
  const raw = ch.images?.[0]?.url || null;
  if (!raw) return null;
  // Google Photos baseUrls require OAuth — route through server-side proxy
  if (raw.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=200&h=200`;
  }
  return raw;
}

// ── Mobile chapter row with drag handle ──────────────────────
function ChapterReorderRow({
  chapter, index, isActive, onSelect, onDelete, canDelete,
}: {
  chapter: Chapter;
  index: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const controls = useDragControls();
  const thumb = getThumb(chapter);

  return (
    <Reorder.Item
      value={chapter}
      id={chapter.id}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: 'none' }}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.45)', zIndex: 10, opacity: 0.97 }}
    >
      <div
        onClick={() => onSelect(chapter.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 10px 10px 4px',
          borderRadius: '10px',
          background: isActive ? 'rgba(163,177,138,0.14)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isActive ? 'rgba(163,177,138,0.4)' : 'rgba(255,255,255,0.07)'}`,
          borderLeft: isActive ? '3px solid rgba(163,177,138,0.8)' : '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer', marginBottom: '5px', touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* Drag handle — wide touch target */}
        <motion.div
          onPointerDown={e => { e.preventDefault(); controls.start(e); }}
          whileHover={{ color: 'rgba(163,177,138,0.8)' }}
          style={{
            cursor: 'grab', padding: '8px 10px', flexShrink: 0,
            color: 'rgba(255,255,255,0.22)', touchAction: 'none',
            display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center',
          }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '14px', height: '2px', borderRadius: '1px', background: 'currentColor' }} />
          ))}
        </motion.div>

        {/* Thumbnail */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0,
          overflow: 'hidden', background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Image size={16} color="rgba(255,255,255,0.2)" />}
        </div>

        {/* Title + number */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.88rem', fontWeight: 700,
            color: isActive ? 'rgba(214,198,168,0.95)' : 'rgba(255,255,255,0.85)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {chapter.title || 'Untitled'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
            Chapter {index + 1}
          </div>
        </div>

        {/* Delete */}
        {canDelete && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(chapter.id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '8px', borderRadius: '6px',
              minWidth: '36px', minHeight: '36px', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}


// ── Main Component ────────────────────────────────────────────
export function MobileEditorSheet() {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { activeTab, mobileSheetOpen, chapters, activeId, rewritingId, sectionOverridesMap } = state;
  const swipeStartY = useRef<number | null>(null);
  const touchStartTime = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const activeChapter = chapters.find(c => c.id === activeId) || null;

  // ── Keyboard avoidance ──────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !sheetRef.current) return;

    const handler = () => {
      if (!sheetRef.current) return;
      const keyboardHeight = window.innerHeight - vv.height;
      if (keyboardHeight > 100) {
        sheetRef.current.style.transform = `translateY(-${keyboardHeight}px)`;
      } else {
        sheetRef.current.style.transform = '';
      }
    };

    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, [mobileSheetOpen]);

  return (
    <>
      {/* ── Radial FAB ─────────────────────────────────────── */}
      <RadialFab
        activeTab={activeTab}
        onTabChange={(tab) => dispatch({ type: 'SET_ACTIVE_TAB', tab })}
        sheetOpen={mobileSheetOpen}
        onToggleSheet={() => dispatch({ type: 'SET_MOBILE_SHEET', open: !mobileSheetOpen })}
      />

      {/* ── Bottom Sheet Panel ─────────────────────────────── */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onTouchStart={e => { swipeStartY.current = e.touches[0].clientY; touchStartTime.current = Date.now(); }}
            onTouchEnd={e => {
              if (swipeStartY.current !== null) {
                const delta = e.changedTouches[0].clientY - swipeStartY.current;
                const elapsed = Math.max(Date.now() - touchStartTime.current, 1);
                const velocity = delta / elapsed;
                if (delta > 80 || velocity > 0.5) dispatch({ type: 'SET_MOBILE_SHEET', open: false });
                swipeStartY.current = null;
              }
            }}
            style={{
              position: 'fixed', bottom: 'env(safe-area-inset-bottom, 0px)',
              left: 0, right: 0,
              height: '62vh',
              zIndex: 1050,
              background: 'var(--eg-dark-2, #2E2A26)',
              borderRadius: '20px 20px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -12px 48px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle + header */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 18px 10px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Pill handle */}
              <div style={{
                width: 40, height: 4, borderRadius: '100px',
                background: 'rgba(214,198,168,0.30)',
                marginBottom: '12px',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{
                  fontSize: '1.05rem', fontWeight: 600,
                  fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                  fontStyle: 'italic',
                  color: 'rgba(214,198,168,0.9)',
                  letterSpacing: '0.01em',
                }}>
                  {TAB_LABELS[activeTab] || activeTab}
                </span>
                <button
                  onClick={() => dispatch({ type: 'SET_MOBILE_SHEET', open: false })}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer', padding: '7px 16px',
                    fontSize: '0.78rem', fontWeight: 700, minHeight: '36px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 16px 96px',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              {activeTab === 'story' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>
                      Story Chapters
                    </span>
                    <motion.button
                      onClick={actions.addChapter}
                      whileHover={{ scale: 1.06, backgroundColor: 'rgba(163,177,138,0.26)' }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '8px 14px', borderRadius: '5px', border: 'none',
                        background: 'rgba(163,177,138,0.18)', color: 'var(--eg-accent, #A3B18A)',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                        minHeight: '44px',
                      }}
                    >
                      <Plus size={13} /> Add
                    </motion.button>
                  </div>
                  {/* Draggable chapter list */}
                  <Reorder.Group
                    axis="y"
                    values={chapters}
                    onReorder={actions.handleReorder}
                    style={{ listStyle: 'none', margin: 0, padding: 0, marginBottom: '12px' }}
                  >
                    {chapters.map((ch, i) => (
                      <ChapterReorderRow
                        key={ch.id}
                        chapter={ch}
                        index={i}
                        isActive={activeId === ch.id}
                        onSelect={id => dispatch({ type: 'SET_ACTIVE_ID', id })}
                        onDelete={actions.deleteChapter}
                        canDelete={chapters.length > 1}
                      />
                    ))}
                  </Reorder.Group>
                  {/* Inline chapter editor */}
                  <AnimatePresence mode="wait">
                    {activeChapter && (
                      <motion.div
                        key={activeChapter.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChapterPanel
                          chapter={activeChapter}
                          onUpdate={actions.updateChapter}
                          onAIRewrite={actions.handleAIRewrite}
                          isRewriting={rewritingId === activeChapter.id}
                          vibeSkin={manifest.vibeSkin}
                          vibeString={manifest.vibeString}
                          sectionOverrides={sectionOverridesMap[activeChapter.id]}
                          onOverridesChange={(id, overrides) => {
                            dispatch({ type: 'SET_SECTION_OVERRIDES', id, overrides });
                            actions.updateChapter(id, { styleOverrides: { backgroundColor: overrides.backgroundColor, textColor: overrides.textColor, padding: overrides.padding } });
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              {activeTab === 'design' && (
                <DesignPanel manifest={manifest} onChange={actions.handleDesignChange} />
              )}
              {activeTab === 'events' && (
                <EventsPanel manifest={manifest} onChange={actions.handleDesignChange} />
              )}
              {activeTab === 'details' && (
                <DetailsPanel manifest={manifest} onChange={actions.handleDesignChange} subdomain={state.subdomain} />
              )}
              {activeTab === 'pages' && (
                <PagesPanel manifest={manifest} subdomain={state.subdomain} onChange={actions.handleDesignChange} />
              )}
              {activeTab === 'blocks' && (
                <AIBlocksPanel
                  manifest={manifest}
                  coupleNames={coupleNames}
                  onChange={(m) => { actions.handleDesignChange(m); }}
                />
              )}
              {activeTab === 'voice' && (
                <div style={{ padding: '4px 0' }}>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: '12px', lineHeight: 1.5 }}>
                    Teach the chatbot to speak like you.
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                    <VoiceTrainerPanel
                      voiceSamples={manifest.voiceSamples || []}
                      onChange={(samples) => {
                        actions.handleDesignChange({ ...manifest, voiceSamples: samples });
                      }}
                    />
                  </div>
                </div>
              )}
              {activeTab === 'canvas' && (
                <CanvasEditor
                  manifest={manifest}
                  onChange={actions.handleDesignChange}
                  pushToPreview={actions.pushToPreview}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
