'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileEditorSheet.tsx — Mobile bottom tab bar + sheet panel
// Redesigned: 4 tabs + More overflow, FAB publish, 55vh sheet, keyboard avoidance
// ─────────────────────────────────────────────────────────────

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image, MoreHorizontal, X, Eye } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon, PublishIcon,
} from '@/components/icons/EditorIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import dynamic from 'next/dynamic';

const DesignPanel = dynamic(() => import('./DesignPanel').then(m => ({ default: m.DesignPanel })), { ssr: false });
const EventsPanel = dynamic(() => import('./EventsPanel').then(m => ({ default: m.EventsPanel })), { ssr: false });
const DetailsPanel = dynamic(() => import('./DetailsPanel').then(m => ({ default: m.DetailsPanel })), { ssr: false });
const PagesPanel = dynamic(() => import('./PagesPanel').then(m => ({ default: m.PagesPanel })), { ssr: false });
const AIBlocksPanel = dynamic(() => import('./AIBlocksPanel').then(m => ({ default: m.AIBlocksPanel })), { ssr: false });
const VoiceTrainerPanel = dynamic(() => import('./VoiceTrainerPanel').then(m => ({ default: m.VoiceTrainerPanel })), { ssr: false });
const CanvasEditor = dynamic(() => import('./CanvasEditor').then(m => ({ default: m.CanvasEditor })), { ssr: false });
const ChapterPanel = dynamic(() => import('./ChapterPanel').then(m => ({ default: m.ChapterPanel })), { ssr: false });

// ── Tab Configuration ─────────────────────────────────────────
const PRIMARY_TABS: Array<{ tab: EditorTab; icon: React.ElementType; label: string }> = [
  { tab: 'story',  icon: StoryIcon,    label: 'Story' },
  { tab: 'design', icon: DesignIcon,   label: 'Design' },
  { tab: 'canvas', icon: SectionsIcon, label: 'Sections' },
];

const OVERFLOW_TABS: Array<{ tab: EditorTab; icon: React.ElementType; label: string }> = [
  { tab: 'events',  icon: EventsIcon,   label: 'Events' },
  { tab: 'details', icon: DetailsIcon,  label: 'Details' },
  { tab: 'blocks',  icon: AIBlocksIcon, label: 'AI Blocks' },
  { tab: 'voice',   icon: VoiceIcon,    label: 'Voice' },
];

const TAB_LABELS: Record<string, string> = {
  story: 'Story', canvas: 'Sections', events: 'Events', design: 'Design',
  details: 'Details', blocks: 'AI Blocks', voice: 'Voice',
};

function getThumb(ch: { images?: Array<{ url?: string }> }) {
  const raw = ch.images?.[0]?.url || null;
  if (!raw) return null;
  // Google Photos baseUrls require OAuth — route through server-side proxy
  if (raw.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=200&h=200`;
  }
  return raw;
}

// ── More Menu Grid ────────────────────────────────────────────
function MoreMenuGrid({
  onSelect,
  onClose,
}: {
  onSelect: (tab: EditorTab) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 8px)',
        right: '8px', width: '180px',
        background: 'rgba(36,30,26,0.98)',
        border: '1px solid rgba(214,198,168,0.12)',
        borderRadius: '12px', padding: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        zIndex: 1200,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px',
      }}
    >
      {OVERFLOW_TABS.map(({ tab, icon: Icon, label }) => (
        <motion.button
          key={tab}
          aria-label={label}
          onClick={() => { onSelect(tab); onClose(); }}
          whileHover={{ backgroundColor: 'rgba(214,198,168,0.1)' }}
          whileTap={{ scale: 0.9 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            padding: '10px 4px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', minHeight: '44px',
          }}
        >
          <Icon size={20} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────
export function MobileEditorSheet() {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { activeTab, mobileSheetOpen, chapters, activeId, rewritingId, sectionOverridesMap } = state;
  const swipeStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const activeChapter = chapters.find(c => c.id === activeId) || null;
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if active tab is in overflow
  const isOverflowTab = OVERFLOW_TABS.some(t => t.tab === activeTab);

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
      {/* ── Bottom Tab Bar ──────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 1100,
        background: 'var(--eg-dark-2, #3D3530)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'stretch',
      } as React.CSSProperties}>
        {/* Primary tabs — equal distribution */}
        {PRIMARY_TABS.map(({ tab, icon: Icon, label }) => {
          const isActive = activeTab === tab && mobileSheetOpen;
          return (
            <motion.button
              key={tab}
              aria-label={label}
              onClick={() => {
                setMoreOpen(false);
                if (state.mobileVisualEdit) {
                  dispatch({ type: 'SET_MOBILE_VISUAL_EDIT', enabled: false });
                }
                if (activeTab === tab && mobileSheetOpen) {
                  dispatch({ type: 'SET_MOBILE_SHEET', open: false });
                } else {
                  dispatch({ type: 'SET_ACTIVE_TAB', tab });
                  dispatch({ type: 'SET_MOBILE_SHEET', open: true });
                }
              }}
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '3px', padding: '6px 8px',
                border: 'none', cursor: 'pointer',
                background: isActive ? 'rgba(109,89,122,0.3)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                borderTop: isActive ? '2px solid var(--eg-plum, #6D597A)' : '2px solid transparent',
                minHeight: '48px',
              }}
            >
              <Icon size={22} color={isActive ? '#fff' : 'rgba(255,255,255,0.35)'} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                {label}
              </span>
            </motion.button>
          );
        })}

        {/* Visual Preview tab */}
        <motion.button
          aria-label="Visual preview"
          onClick={() => {
            setMoreOpen(false);
            const entering = !state.mobileVisualEdit;
            dispatch({ type: 'SET_MOBILE_VISUAL_EDIT', enabled: entering });
            if (entering) {
              dispatch({ type: 'SET_MOBILE_SHEET', open: false });
            }
          }}
          whileTap={{ scale: 0.82 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '3px', padding: '6px 8px',
            border: 'none', cursor: 'pointer',
            background: state.mobileVisualEdit ? 'rgba(163,177,138,0.25)' : 'transparent',
            color: state.mobileVisualEdit ? '#fff' : 'rgba(255,255,255,0.4)',
            borderTop: state.mobileVisualEdit ? '2px solid var(--eg-accent, #A3B18A)' : '2px solid transparent',
            minHeight: '48px',
          }}
        >
          <Eye size={22} color={state.mobileVisualEdit ? '#fff' : 'rgba(255,255,255,0.35)'} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            Preview
          </span>
        </motion.button>

        {/* More tab */}
        <motion.button
          aria-label="More options"
          onClick={() => setMoreOpen(!moreOpen)}
          whileTap={{ scale: 0.82 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '3px', padding: '6px 8px',
            border: 'none', cursor: 'pointer',
            background: (moreOpen || isOverflowTab) ? 'rgba(109,89,122,0.3)' : 'transparent',
            color: (moreOpen || isOverflowTab) ? '#fff' : 'rgba(255,255,255,0.4)',
            borderTop: (moreOpen || isOverflowTab) ? '2px solid var(--eg-plum, #6D597A)' : '2px solid transparent',
            minHeight: '48px',
          }}
        >
          <MoreHorizontal size={22} color={(moreOpen || isOverflowTab) ? '#fff' : 'rgba(255,255,255,0.35)'} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            More
          </span>
        </motion.button>
      </div>

      {/* ── More Menu Overlay ──────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1150 }}
            />
            <MoreMenuGrid
              onSelect={(tab) => {
                dispatch({ type: 'SET_ACTIVE_TAB', tab });
                dispatch({ type: 'SET_MOBILE_SHEET', open: true });
              }}
              onClose={() => setMoreOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Floating Publish FAB ───────────────────────────── */}
      <motion.button
        aria-label="Publish site"
        onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20 }}
        style={{
          position: 'fixed',
          bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)',
          right: '16px',
          width: '52px', height: '52px',
          borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #A3B18A 0%, #7A917A 50%, #6D597A 100%)',
          color: 'var(--eg-bg, #F5F1E8)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(109,89,122,0.4), 0 2px 8px rgba(0,0,0,0.3)',
          zIndex: mobileSheetOpen ? 1040 : 1090,
        }}
      >
        <PublishIcon size={20} />
      </motion.button>

      {/* ── Bottom Sheet Panel ─────────────────────────────── */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onTouchStart={e => { swipeStartY.current = e.touches[0].clientY; }}
            onTouchEnd={e => {
              if (swipeStartY.current !== null) {
                const delta = e.changedTouches[0].clientY - swipeStartY.current;
                const velocity = delta / 300; // approximate velocity
                if (delta > 80 || velocity > 1) dispatch({ type: 'SET_MOBILE_SHEET', open: false });
                swipeStartY.current = null;
              }
            }}
            style={{
              position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
              left: 0, right: 0,
              height: '55vh',
              zIndex: 1050,
              background: 'var(--eg-dark-2, #3D3530)',
              borderRadius: '16px 16px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '10px 16px 6px', flexShrink: 0,
            }}>
              <motion.div
                initial={{ width: 48 }}
                animate={{ width: [48, 56, 48] }}
                transition={{ duration: 1.2, ease: 'easeInOut', times: [0, 0.5, 1] }}
                style={{
                  height: '4px', borderRadius: '100px',
                  background: 'rgba(214,198,168,0.40)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{
                  fontSize: '0.82rem', fontWeight: 400,
                  fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
                  fontStyle: 'italic',
                  color: 'var(--eg-muted, #9A9488)',
                }}>
                  {TAB_LABELS[activeTab] || activeTab}
                </span>
                <button
                  onClick={() => dispatch({ type: 'SET_MOBILE_SHEET', open: false })}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px',
                    color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '5px 12px',
                    fontSize: '0.72rem', fontWeight: 700, minHeight: '32px',
                  }}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px 12px 16px',
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
                  {/* Horizontal chapter cards */}
                  <div style={{
                    display: 'flex', gap: '10px', overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch', paddingBottom: '8px', marginBottom: '12px',
                  } as React.CSSProperties}>
                    {chapters.map((ch, i) => {
                      const thumb = getThumb(ch);
                      const isActive = activeId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => dispatch({ type: 'SET_ACTIVE_ID', id: ch.id })}
                          style={{
                            flexShrink: 0, width: '100px', borderRadius: '10px', border: 'none',
                            background: isActive ? 'rgba(163,177,138,0.18)' : 'rgba(255,255,255,0.05)',
                            outline: isActive ? '2px solid rgba(163,177,138,0.5)' : 'none',
                            cursor: 'pointer', padding: 0, overflow: 'hidden',
                            minHeight: '44px',
                          }}
                        >
                          <div style={{
                            width: '100%', height: '60px',
                            background: thumb ? 'transparent' : 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                          }}>
                            {thumb
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={thumb} alt={ch.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                  <Image size={16} color="rgba(255,255,255,0.2)" />
                                </div>}
                          </div>
                          <div style={{ padding: '6px 8px', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--eg-gold, #D6C6A8)' : 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ch.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Ch. {i + 1}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
