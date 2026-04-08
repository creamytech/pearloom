'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileEditorSheet.tsx — v2 Preview-First Architecture
// Always-visible live preview + smart bottom sheet + 3-tab nav.
// Rivals Zola's mobile editing experience.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, Layers, MoreHorizontal, X, ArrowLeft,
  Undo2, Redo2, ExternalLink, Send, MoreVertical,
  Users, Mail, Mic, LayoutGrid, Globe, Gift,
  Music, ShoppingBag, Heart, BarChart2,
} from 'lucide-react';
import { useEditor, stripArtForStorage } from '@/lib/editor-state';
import { MobileBottomSheet } from './MobileBottomSheet';
import { MobileContextPanel } from './MobileContextPanel';
import { MobileBlockList } from './MobileBlockList';
import { MobileActionBar } from './MobileActionBar';
import { MobileChapterEditor } from './MobileChapterEditor';
import type { Chapter } from '@/types';

// ── Lazy panel imports ──────────────────────────────────────────
const DetailsPanel            = dynamic(() => import('./DetailsPanel').then(m => ({ default: m.DetailsPanel })), { ssr: false });
const PagesPanel              = dynamic(() => import('./PagesPanel').then(m => ({ default: m.PagesPanel })), { ssr: false });
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
type BottomTab = 'edit' | 'blocks' | 'more';

interface MoreTool {
  id: string;
  icon: React.ElementType;
  label: string;
}

const MORE_TOOLS: MoreTool[] = [
  { id: 'details',     icon: LayoutGrid,  label: 'Details'       },
  { id: 'pages',       icon: Globe,       label: 'Pages'         },
  { id: 'guests',      icon: Users,       label: 'Guests'        },
  { id: 'messaging',   icon: Mail,        label: 'Messaging'     },
  { id: 'invite',      icon: Mail,        label: 'Invites'       },
  { id: 'blocks',      icon: LayoutGrid,  label: 'AI Fill'       },
  { id: 'voice',       icon: Mic,         label: 'Voice'         },
  { id: 'seating',     icon: Users,       label: 'Seating'       },
  { id: 'analytics',   icon: BarChart2,   label: 'Analytics'     },
  { id: 'translate',   icon: Globe,       label: 'Translate'     },
  { id: 'savethedate', icon: Gift,        label: 'Save Date'     },
  { id: 'vendors',     icon: ShoppingBag, label: 'Vendors'       },
  { id: 'thankyou',    icon: Heart,       label: 'Thank You'     },
  { id: 'spotify',     icon: Music,       label: 'Spotify'       },
];

// ── Bottom tabs ─────────────────────────────────────────────────
const TABS: Array<{ id: BottomTab; icon: React.ElementType; label: string }> = [
  { id: 'edit',   icon: Pencil, label: 'Edit'   },
  { id: 'blocks', icon: Layers, label: 'Blocks' },
  { id: 'more',   icon: MoreHorizontal, label: 'More' },
];

// ── Main Component ──────────────────────────────────────────────
export function MobileEditorSheet() {
  const { state, dispatch, manifest, coupleNames, actions, previewKey, iframeRef } = useEditor();
  const { chapters, activeId, canUndo, canRedo, previewPage, subdomain } = state;

  // ── State ──
  const [activeTab, setActiveTab] = useState<BottomTab>('edit');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<0 | 1 | 2>(0);
  const [moreToolOpen, setMoreToolOpen] = useState<string | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // ── Preview iframe source ──
  const iframeSrc = `/preview?key=${previewKey}${previewPage ? `&page=${encodeURIComponent(previewPage)}` : ''}`;

  // ── Couple display name ──
  const displayName = coupleNames
    ? (coupleNames[1]?.trim() ? `${coupleNames[0]} & ${coupleNames[1]}` : coupleNames[0])
    : 'Your Site';

  // ── Listen for messages from preview iframe ──
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Section tap — open context panel
      if (event.data?.type === 'pearloom-section-click') {
        const { chapterId, sectionId } = event.data;
        if (chapterId) {
          setActiveChapterId(chapterId);
          setActiveSection('story');
          setActiveTab('edit');
          setSheetSnap(1); // half
        } else if (sectionId) {
          setActiveSection(sectionId);
          setActiveChapterId(null);
          setActiveTab('edit');
          setSheetSnap(1);
        }
      }

      // Inline text edit commit
      if (event.data?.type === 'pearloom-edit-commit') {
        const { chapterId, field, value } = event.data;
        if (chapterId && field !== undefined) {
          actions.updateChapter(chapterId, { [field]: value });
        }
      }

      // Photo operations
      if (event.data?.type === 'pearloom-photo-replace') {
        const { chapterId, photoIndex, newUrl, newAlt } = event.data;
        if (!chapterId || !newUrl) return;
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        const imgs = [...(chapter.images || [])];
        const newImage = { id: `img-${Date.now()}`, url: newUrl, alt: newAlt || '', width: 0, height: 0 };
        if (photoIndex >= 0 && photoIndex < imgs.length) {
          imgs[photoIndex] = newImage;
        } else {
          imgs.push(newImage);
        }
        actions.updateChapter(chapterId, { images: imgs });
      }

      if (event.data?.type === 'pearloom-photo-remove') {
        const { chapterId, photoIndex } = event.data;
        if (!chapterId) return;
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        const imgs = (chapter.images || []).filter((_: unknown, i: number) => i !== photoIndex);
        actions.updateChapter(chapterId, { images: imgs });
      }

      // Iframe ready
      if (event.data?.type === 'pearloom-ready') {
        dispatch({ type: 'SET_IFRAME_READY', ready: true });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [chapters, actions, dispatch]);

  // ── Enable edit mode in iframe on load ──
  const handleIframeLoad = useCallback(() => {
    dispatch({ type: 'SET_IFRAME_READY', ready: true });
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'pearloom-edit-mode', enabled: true }, '*');
      iframeRef.current?.contentWindow?.postMessage({
        type: 'pearloom-preview-update',
        manifest: stripArtForStorage(manifest),
        names: coupleNames,
      }, '*');
    } catch {}
  }, [dispatch, iframeRef, manifest, coupleNames]);

  // ── Block selection → scroll preview ──
  const scrollToBlock = useCallback((blockId: string) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'pearloom-scroll-to-block',
        blockId,
      }, '*');
    } catch {}
  }, [iframeRef]);

  // ── Handle block selection from list ──
  const handleSelectBlock = useCallback((blockId: string) => {
    const block = manifest.blocks?.find(b => b.id === blockId);
    if (block) {
      setActiveSection(block.type);
      setActiveTab('edit');
      setSheetSnap(1);
    }
  }, [manifest.blocks]);

  // ── Add block ──
  const handleAddBlock = useCallback(() => {
    setActiveTab('blocks');
    setSheetSnap(2); // full
  }, []);

  // ── Open chapter editor ──
  const openChapterEditor = useCallback((chId: string) => {
    const ch = chapters.find(c => c.id === chId);
    if (ch) setEditingChapter(ch);
  }, [chapters]);

  // ── Render More tool panel ──
  const renderMoreTool = (toolId: string) => {
    switch (toolId) {
      case 'details': return <DetailsPanel manifest={manifest} onChange={actions.handleDesignChange} subdomain={subdomain} />;
      case 'pages': return <PagesPanel manifest={manifest} subdomain={subdomain} onChange={actions.handleDesignChange} previewPage={previewPage} onPreviewPage={(slug) => dispatch({ type: 'SET_PREVIEW_PAGE', page: slug })} />;
      case 'guests': return <GuestSearchPanel siteId={subdomain} />;
      case 'messaging': return <MessagingPanel manifest={manifest} siteId={subdomain} subdomain={subdomain} />;
      case 'invite': return <BulkInvitePanel manifest={manifest} siteId={subdomain} subdomain={subdomain} />;
      case 'blocks': return <AIBlocksPanel manifest={manifest} coupleNames={coupleNames} onChange={(m) => { actions.handleDesignChange(m); }} />;
      case 'voice': return <VoiceTrainerPanel voiceSamples={manifest.voiceSamples || []} onChange={(samples) => { const updated = { ...manifest, voiceSamples: samples }; actions.handleDesignChange(updated); }} />;
      case 'seating': return <SeatingEditorPanel siteId={subdomain} />;
      case 'analytics': return <AnalyticsDashboardPanel siteId={subdomain} />;
      case 'translate': return <TranslationPanel manifest={manifest} onChange={actions.handleDesignChange} />;
      case 'savethedate': return <SaveTheDatePanel manifest={manifest} subdomain={subdomain} />;
      case 'vendors': return <VendorPanel />;
      case 'thankyou': return <ThankYouPanel />;
      case 'spotify': return <SpotifyPanel />;
      default: return null;
    }
  };

  // ── Sheet content based on active tab ──
  const renderSheetContent = () => {
    // If a More tool is open, show it
    if (moreToolOpen) {
      return (
        <div style={{ padding: '0 16px 24px' }}>
          <button
            onClick={() => setMoreToolOpen(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', marginBottom: 12,
              borderRadius: 'var(--pl-radius-full)',
              border: '1px solid var(--pl-black-6)',
              background: 'var(--pl-olive-5)',
              color: 'var(--pl-ink-soft)',
              fontSize: 'var(--pl-text-sm)',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          {renderMoreTool(moreToolOpen)}
        </div>
      );
    }

    switch (activeTab) {
      case 'edit':
        return (
          <MobileContextPanel
            activeSection={activeSection}
            activeChapterId={activeChapterId}
            activeEventId={activeEventId}
          />
        );

      case 'blocks':
        return (
          <MobileBlockList
            onSelectBlock={handleSelectBlock}
            onScrollToBlock={scrollToBlock}
          />
        );

      case 'more':
        return (
          <div style={{ padding: '8px 16px 24px' }}>
            <div style={{
              fontSize: 'var(--pl-text-2xs)', fontWeight: 800,
              letterSpacing: 'var(--pl-label-tracking)', textTransform: 'uppercase',
              color: 'var(--pl-muted)', marginBottom: 12,
            }}>
              Tools
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}>
              {MORE_TOOLS.map(tool => (
                <motion.button
                  key={tool.id}
                  onClick={() => { setMoreToolOpen(tool.id); setSheetSnap(2); }}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 6,
                    padding: '14px 4px',
                    borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid var(--pl-black-4)',
                    background: 'var(--pl-cream-card)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--pl-radius-xs)',
                    background: 'var(--pl-olive-8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <tool.icon size={16} color="var(--pl-olive)" />
                  </div>
                  <span style={{
                    fontSize: 'var(--pl-text-2xs)', fontWeight: 600,
                    color: 'var(--pl-ink-soft)', textAlign: 'center',
                    lineHeight: 1.2,
                  }}>
                    {tool.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', flexDirection: 'column',
      background: 'var(--pl-cream-deep)',
    }}>
      {/* ── Top Bar ── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        gap: 8, padding: '8px 12px',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        background: 'var(--pl-glass-heavy)',
        backdropFilter: 'var(--pl-glass-blur)',
        WebkitBackdropFilter: 'var(--pl-glass-blur)',
        borderBottom: '1px solid var(--pl-glass-light-border)',
        zIndex: 10,
      } as React.CSSProperties}>
        {/* Back */}
        <motion.button
          onClick={() => {
            // Navigate back to dashboard
            window.history.back();
          }}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: 'none', background: 'var(--pl-black-4)',
            color: 'var(--pl-ink-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </motion.button>

        {/* Site name */}
        <div style={{
          flex: 1, minWidth: 0, textAlign: 'center',
          fontFamily: 'var(--pl-font-heading)',
          fontSize: 'var(--pl-text-md)', fontWeight: 700,
          fontStyle: 'italic',
          color: 'var(--pl-ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayName}
        </div>

        {/* Menu button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            whileTap={{ scale: 0.88 }}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: 'none', background: 'var(--pl-black-4)',
              color: 'var(--pl-ink-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={16} />
          </motion.button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    position: 'absolute', top: '100%', right: 0,
                    marginTop: 4, width: 180, zIndex: 100,
                    background: 'var(--pl-glass-heavy)',
                    backdropFilter: 'var(--pl-glass-blur)',
                    WebkitBackdropFilter: 'var(--pl-glass-blur)',
                    borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid var(--pl-glass-light-border)',
                    boxShadow: 'var(--pl-glass-shadow-lg)',
                    padding: 4, overflow: 'hidden',
                  } as React.CSSProperties}
                >
                  {[
                    { label: 'Undo', icon: Undo2, action: () => { actions.undo(); setShowMenu(false); }, disabled: !canUndo },
                    { label: 'Redo', icon: Redo2, action: () => { actions.redo(); setShowMenu(false); }, disabled: !canRedo },
                    { label: 'Preview', icon: ExternalLink, action: () => { actions.storePreviewForOpen(); setShowMenu(false); } },
                    { label: 'Publish', icon: Send, action: () => { dispatch({ type: 'OPEN_PUBLISH' }); setShowMenu(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      disabled={item.disabled}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', border: 'none', borderRadius: 'var(--pl-radius-xs)',
                        background: 'transparent', cursor: item.disabled ? 'default' : 'pointer',
                        color: item.disabled ? 'var(--pl-muted)' : 'var(--pl-ink-soft)',
                        fontSize: 'var(--pl-text-sm)', fontWeight: 600,
                        opacity: item.disabled ? 0.4 : 1,
                      }}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Preview Area (always visible) ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={handleIframeLoad}
          title="Live Preview"
          style={{
            width: '100%', height: '100%',
            border: 'none', display: 'block',
            background: 'var(--pl-cream)',
          }}
        />

        {/* Action bar floating above sheet */}
        <MobileActionBar
          activeSection={activeSection}
          onAddBlock={handleAddBlock}
          onUndo={actions.undo}
          onRedo={actions.redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* ── Bottom Sheet ── */}
      <MobileBottomSheet
        snapPoints={[12, 45, 88]}
        initialSnap={0}
        onSnapChange={setSheetSnap}
        open
        header={
          sheetSnap === 0 ? (
            <div style={{
              padding: '0 16px 8px', textAlign: 'center',
              fontSize: 'var(--pl-text-xs)', color: 'var(--pl-muted)',
              fontWeight: 600,
            }}>
              {activeSection
                ? `${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Settings`
                : 'Tap anything on your site to edit'}
            </div>
          ) : undefined
        }
      >
        {renderSheetContent()}
      </MobileBottomSheet>

      {/* ── Bottom Navigation (3 tabs) ── */}
      <div style={{
        flexShrink: 0, display: 'flex',
        background: 'var(--pl-glass-heavy)',
        backdropFilter: 'var(--pl-glass-blur)',
        WebkitBackdropFilter: 'var(--pl-glass-blur)',
        borderTop: '1px solid var(--pl-glass-light-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 20,
      } as React.CSSProperties}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMoreToolOpen(null);
                if (tab.id === 'edit') setSheetSnap(activeSection ? 1 : 0);
                else if (tab.id === 'blocks') setSheetSnap(1);
                else if (tab.id === 'more') setSheetSnap(1);
              }}
              whileTap={{ scale: 0.9 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3,
                padding: '10px 0 6px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                position: 'relative',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-active"
                  style={{
                    position: 'absolute', top: 4, left: '20%', right: '20%',
                    height: 28, borderRadius: 'var(--pl-radius-full)',
                    background: 'var(--pl-olive-12)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                size={18}
                color={isActive ? 'var(--pl-olive)' : 'var(--pl-muted)'}
                style={{ position: 'relative', zIndex: 1 }}
              />
              <span style={{
                fontSize: 'var(--pl-text-2xs)', fontWeight: 700,
                color: isActive ? 'var(--pl-olive-deep, #6E8C5C)' : 'var(--pl-muted)',
                letterSpacing: '0.02em',
                position: 'relative', zIndex: 1,
              }}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Full-screen Chapter Editor (slides over everything) ── */}
      <AnimatePresence>
        {editingChapter && (
          <MobileChapterEditor
            chapter={editingChapter}
            onBack={() => setEditingChapter(null)}
            onNavigate={(id) => {
              const ch = chapters.find(c => c.id === id);
              if (ch) setEditingChapter(ch);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
