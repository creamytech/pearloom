'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileEditorSheet.tsx — Mobile bottom tab bar + sheet panel
// Extracted from FullscreenEditor lines ~1754-2029
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon, PublishIcon,
} from '@/components/icons/EditorIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { DesignPanel } from './DesignPanel';
import { EventsPanel } from './EventsPanel';
import { DetailsPanel } from './DetailsPanel';
import { PagesPanel } from './PagesPanel';
import { AIBlocksPanel } from './AIBlocksPanel';
import { VoiceTrainerPanel } from './VoiceTrainerPanel';
import { CanvasEditor } from './CanvasEditor';
import { ChapterPanel } from './ChapterPanel';

const TAB_ICONS: Record<string, React.ElementType> = {
  canvas: SectionsIcon, story: StoryIcon, events: EventsIcon, design: DesignIcon,
  details: DetailsIcon, blocks: AIBlocksIcon, voice: VoiceIcon,
};

const TAB_LABELS: Record<string, string> = {
  story: 'Story', canvas: 'Sections', events: 'Events', design: 'Design',
  details: 'Details', blocks: 'AI', voice: 'Voice',
};

function getThumb(ch: { images?: Array<{ url?: string }> }) {
  return ch.images?.[0]?.url || null;
}

export function MobileEditorSheet() {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { activeTab, mobileSheetOpen, chapters, activeId, rewritingId, sectionOverridesMap } = state;
  const swipeStartY = useRef<number | null>(null);
  const activeChapter = chapters.find(c => c.id === activeId) || null;

  return (
    <>
      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 1100,
        background: 'var(--eg-dark-2, #3D3530)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'stretch',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {(['canvas', 'story', 'events', 'design', 'details', 'blocks', 'voice'] as EditorTab[]).map(tab => {
          const Icon = TAB_ICONS[tab];
          const isActive = activeTab === tab && mobileSheetOpen;
          return (
            <motion.button
              key={tab}
              onClick={() => {
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
                flex: '0 0 auto', minWidth: '52px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '3px', padding: '6px 8px',
                border: 'none', cursor: 'pointer',
                background: isActive ? 'rgba(109,89,122,0.3)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                borderTop: isActive ? '2px solid var(--eg-plum, #6D597A)' : '2px solid transparent',
                minHeight: '48px',
              }}
            >
              <Icon size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.35)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                {TAB_LABELS[tab] || tab}
              </span>
            </motion.button>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Publish */}
        <motion.button
          onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '8px 16px', border: 'none',
            background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
            color: 'var(--eg-bg, #F5F1E8)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
            borderTop: '2px solid transparent',
            minHeight: '48px',
          }}
        >
          <PublishIcon size={14} />
        </motion.button>
      </div>

      {/* Bottom sheet panel */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
              left: 0, right: 0,
              height: 'calc(80vh - 52px)',
              zIndex: 1050,
              background: 'var(--eg-dark-2, #3D3530)',
              borderRadius: '16px 16px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
            onTouchStart={e => { swipeStartY.current = e.touches[0].clientY; }}
            onTouchEnd={e => {
              if (swipeStartY.current !== null) {
                const delta = e.changedTouches[0].clientY - swipeStartY.current;
                if (delta > 80) dispatch({ type: 'SET_MOBILE_SHEET', open: false });
                swipeStartY.current = null;
              }
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '10px 16px 6px', flexShrink: 0,
            }}>
              <div style={{
                width: '36px', height: '4px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.2)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{
                  fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)',
                }}>
                  {activeTab === 'story' ? 'Story' : activeTab === 'events' ? 'Events' :
                   activeTab === 'design' ? 'Design' : activeTab === 'details' ? 'Details' :
                   activeTab === 'blocks' ? 'AI Blocks' : activeTab === 'voice' ? 'Voice' : 'Sections'}
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
