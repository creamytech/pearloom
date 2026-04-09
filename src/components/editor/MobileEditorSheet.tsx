'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileEditorSheet.tsx — Preview-First Architecture
// Always-visible live preview + smart bottom sheet + 3-tab nav.
// Direct-DOM rendering (matches desktop) — no iframe.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, Layers, MoreHorizontal, ArrowLeft,
  Undo2, Redo2, ExternalLink, MoreVertical,
  Users, Send, Mail, Mic, LayoutGrid, Globe, Gift,
  Music, ShoppingBag, Heart, BarChart2,
} from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { SiteRenderer } from './SiteRenderer';
import { MobileBottomSheet } from './MobileBottomSheet';
import { MobileContextPanel } from './MobileContextPanel';
import { MobileBlockList } from './MobileBlockList';
import { MobileActionBar } from './MobileActionBar';
import type { PageBlock, BlockType } from '@/types';

// ── Lazy panel imports ──────────────────────────────────────────
const SectionsPanel           = dynamic(() => import('./SectionsPanel').then(m => ({ default: m.SectionsPanel })), { ssr: false });
const DesignPanel             = dynamic(() => import('./DesignPanel').then(m => ({ default: m.DesignPanel })), { ssr: false });
const EventsPanel             = dynamic(() => import('./EventsPanel').then(m => ({ default: m.EventsPanel })), { ssr: false });
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

const ESSENTIAL_TOOLS: MoreTool[] = [
  { id: 'details',     icon: LayoutGrid,  label: 'Details'       },
  { id: 'pages',       icon: Globe,       label: 'Pages'         },
  { id: 'guests',      icon: Users,       label: 'Guests'        },
  { id: 'messaging',   icon: Mail,        label: 'Messaging'     },
  { id: 'invite',      icon: Mail,        label: 'Invites'       },
];

const ADVANCED_TOOLS: MoreTool[] = [
  { id: 'blocks',      icon: LayoutGrid,  label: 'Pear'          },
  { id: 'voice',       icon: Mic,         label: 'Voice AI'      },
  { id: 'seating',     icon: Users,       label: 'Seating Chart' },
  { id: 'analytics',   icon: BarChart2,   label: 'Analytics'     },
  { id: 'translate',   icon: Globe,       label: 'Translate'     },
  { id: 'savethedate', icon: Gift,        label: 'Save the Date' },
  { id: 'vendors',     icon: ShoppingBag, label: 'Vendors'       },
  { id: 'thankyou',    icon: Heart,       label: 'Thank You Notes' },
  { id: 'spotify',     icon: Music,       label: 'Spotify'       },
];

// ── Bottom tabs ─────────────────────────────────────────────────
const TABS: Array<{ id: BottomTab; icon: React.ElementType; label: string }> = [
  { id: 'edit',   icon: Pencil, label: 'Edit'   },
  { id: 'blocks', icon: Layers, label: 'Sections' },
  { id: 'more',   icon: MoreHorizontal, label: 'More' },
];

// ── Main Component ──────────────────────────────────────────────
export function MobileEditorSheet() {
  const { state, dispatch, manifest, coupleNames, actions } = useEditor();
  const { canUndo, canRedo, previewPage, subdomain, mobileActionChapterId } = state;
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // ── State ──
  const [activeTab, setActiveTab] = useState<BottomTab>('edit');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<0 | 1 | 2>(0);
  const [moreToolOpen, setMoreToolOpen] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // ── Couple display name ──
  const displayName = coupleNames
    ? (coupleNames[1]?.trim() ? `${coupleNames[0]} & ${coupleNames[1]}` : coupleNames[0])
    : 'Your Site';

  // ── External chapter-open signal (from FullscreenEditor) ──
  useEffect(() => {
    if (mobileActionChapterId) {
      setActiveChapterId(mobileActionChapterId);
      setActiveSection('story');
      setActiveTab('edit');
      setSheetSnap(1);
      dispatch({ type: 'SET_MOBILE_ACTION_SHEET', chapterId: null });
    }
  }, [mobileActionChapterId, dispatch]);

  // ── Section click — direct DOM (matches EditorCanvas) ──────
  const handleSectionClick = useCallback((sectionId: string, chapterId?: string, blockId?: string) => {
    if (chapterId) {
      setActiveChapterId(chapterId);
      setActiveSection('story');
      setActiveTab('edit');
      setSheetSnap(1);
      dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
      return;
    }

    // Only open panel for sections that have settings — ignore background taps
    const validSections = ['hero', 'story', 'nav', 'footer', 'events', 'rsvp', 'registry', 'travel', 'faq', 'photos', 'guestbook', 'map', 'quote', 'text', 'video', 'countdown', 'divider', 'spotify', 'hashtag', 'weddingParty', 'vibeQuote', 'welcome', 'anniversary', 'storymap', 'quiz', 'photoWall', 'gallery'];
    if (!validSections.includes(sectionId)) return;

    if (blockId) {
      setSelectedBlockId(blockId);
      dispatch({ type: 'SET_ACTIVE_ID', id: blockId });
    }

    setActiveSection(sectionId);
    setActiveChapterId(null);
    setActiveTab('edit');
    // Animate to half-sheet; if already there, the sheet will re-animate via
    // the controlled snap. No flash-to-zero needed.
    setSheetSnap(1);

    // Flash highlight on the tapped section in preview
    try {
      const el = previewRef.current?.querySelector(`[data-pe-section="${sectionId}"]`) as HTMLElement | null;
      if (el) {
        el.style.outline = '2px solid var(--pl-olive)';
        el.style.outlineOffset = '-2px';
        el.style.transition = 'outline-color 0.6s ease';
        setTimeout(() => {
          el.style.outlineColor = 'transparent';
          setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 600);
        }, 800);
      }
    } catch { /* DOM query failed — non-critical */ }
  }, [dispatch]);

  // ── Inline text edit — direct DOM (matches EditorCanvas) ───
  const handleTextEdit = useCallback((path: string, value: string) => {
    if (path === '__addSticker__') {
      const sticker = JSON.parse(value);
      actions.handleDesignChange({ ...manifest, stickers: [...(manifest.stickers || []), sticker] });
      return;
    }
    if (path === '__moveSticker__') {
      const { index, x, y } = JSON.parse(value);
      const stickers = [...(manifest.stickers || [])];
      if (stickers[index]) {
        stickers[index] = { ...stickers[index], x, y };
        actions.handleDesignChange({ ...manifest, stickers });
      }
      return;
    }
    if (path === '__removeSticker__') {
      const index = parseInt(value);
      const stickers = (manifest.stickers || []).filter((_, i) => i !== index);
      actions.handleDesignChange({ ...manifest, stickers });
      return;
    }

    if (path.startsWith('chapter:')) {
      const [, chId, field] = path.split(':');
      const chapter = manifest.chapters?.find(c => c.id === chId);
      if (chapter) actions.updateChapter(chId, { [field]: value });
    } else {
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(manifest));
      let target: Record<string, unknown> = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i]) : parts[i];
        if (target[key as string] === undefined || target[key as string] === null) {
          target[key as string] = {};
        }
        target = target[key as string] as Record<string, unknown>;
      }
      const lastKey = /^\d+$/.test(parts[parts.length - 1]) ? parseInt(parts[parts.length - 1]) : parts[parts.length - 1];
      (target as Record<string | number, unknown>)[lastKey] = value;
      actions.handleDesignChange(updated);
    }
  }, [manifest, actions]);

  // ── Block actions from inline toolbar ─────────────────────
  const handleBlockAction = useCallback((action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete' | 'toggleVisibility', blockId: string) => {
    const blocks = manifest.blocks || [];
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;

    let updated = [...blocks];
    switch (action) {
      case 'moveUp':
        if (idx > 0) [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
        break;
      case 'moveDown':
        if (idx < updated.length - 1) [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
        break;
      case 'duplicate': {
        const dup = { ...blocks[idx], id: `${blocks[idx].type}-dup-${Date.now()}` };
        updated.splice(idx + 1, 0, dup);
        break;
      }
      case 'delete':
        updated = updated.filter(b => b.id !== blockId);
        if (selectedBlockId === blockId) setSelectedBlockId(null);
        break;
      case 'toggleVisibility':
        updated = updated.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b);
        break;
    }
    actions.handleDesignChange({ ...manifest, blocks: updated.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions, selectedBlockId]);

  // ── Block reorder ─────────────────────────────────────────
  const handleBlockReorder = useCallback((fromIdx: number, toIdx: number) => {
    const blocks = [...(manifest.blocks || [])].filter(b => b.visible).sort((a, b) => a.order - b.order);
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= blocks.length || toIdx >= blocks.length) return;
    const [moved] = blocks.splice(fromIdx, 1);
    // After removing the item, insert at the target index directly.
    // No offset adjustment needed since toIdx refers to the final position.
    blocks.splice(toIdx, 0, moved);
    actions.handleDesignChange({ ...manifest, blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions]);

  // ── Block drop → insert at position ──────────────────────
  const handleBlockDrop = useCallback((blockType: string, position: number) => {
    const blocks = manifest.blocks || [];
    const safePosition = Math.max(0, Math.min(position, blocks.length));
    const newBlock = {
      id: `block-${blockType}-${Date.now()}`,
      type: blockType as BlockType,
      order: safePosition,
      visible: true,
    };
    const updated = [...blocks];
    updated.splice(safePosition, 0, newBlock);
    actions.handleDesignChange({ ...manifest, blocks: updated.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions]);

  // ── Block selection → scroll preview (direct DOM) ──────────
  const scrollToBlock = useCallback((blockId: string) => {
    const el = previewRef.current?.querySelector(`[data-block-id="${blockId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Handle block selection from list ──
  const handleSelectBlock = useCallback((blockId: string) => {
    const block = manifest.blocks?.find(b => b.id === blockId);
    if (block) {
      setSelectedBlockId(blockId);
      dispatch({ type: 'SET_ACTIVE_ID', id: blockId });
      setActiveSection(block.type);
      setActiveTab('edit');
      setSheetSnap(1);
    }
  }, [manifest.blocks, dispatch]);

  // ── Context action handler (Edit Text, Change Photo, Style, etc.) ──
  const handleContextAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'edit-text':
      case 'edit':
      case 'settings':
        // Open the Edit tab with the current section's settings
        setActiveTab('edit');
        setSheetSnap(2); // full sheet
        break;
      case 'change-photo':
      case 'photos':
        // Open Edit tab — the MobileContextPanel shows photo/image controls
        setActiveSection(activeSection === 'hero' ? 'hero' : activeSection);
        setActiveTab('edit');
        setSheetSnap(2);
        break;
      case 'style':
        // Open More tools with design panel
        setMoreToolOpen('sections');
        setActiveTab('more');
        setSheetSnap(2);
        break;
      case 'rewrite':
        // Trigger AI rewrite on the active chapter
        if (activeChapterId) {
          actions.handleAIRewrite(activeChapterId);
        }
        break;
      case 'delete':
        // Delete the selected block
        if (selectedBlockId) {
          handleBlockAction('delete', selectedBlockId);
          setSelectedBlockId(null);
          setActiveSection(null);
          setSheetSnap(0);
        } else if (activeChapterId) {
          actions.deleteChapter(activeChapterId);
          setActiveChapterId(null);
          setActiveSection(null);
          setSheetSnap(0);
        }
        break;
      case 'move-up':
        if (selectedBlockId) handleBlockAction('moveUp', selectedBlockId);
        break;
      case 'move-down':
        if (selectedBlockId) handleBlockAction('moveDown', selectedBlockId);
        break;
      case 'publish':
        dispatch({ type: 'OPEN_PUBLISH' });
        break;
    }
  }, [activeSection, activeChapterId, selectedBlockId, actions, dispatch, handleBlockAction]);

  // ── Add block ──
  const handleAddBlock = useCallback(() => {
    setActiveTab('blocks');
    setSheetSnap(2); // full
  }, []);

  // ── Render More tool panel ──
  const renderMoreTool = (toolId: string) => {
    switch (toolId) {
      case 'sections': return <SectionsPanel manifest={manifest} onChange={actions.handleDesignChange} />;
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
          <>
            {/* Back to block list when editing a block that was selected from block list */}
            {selectedBlockId && activeSection && (
              <div style={{ padding: '8px 16px 0' }}>
                <button
                  onClick={() => {
                    setSelectedBlockId(null);
                    setActiveSection(null);
                    setActiveTab('blocks');
                    setSheetSnap(1);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', marginBottom: 4,
                    borderRadius: 'var(--pl-radius-full)',
                    border: '1px solid var(--pl-black-6)',
                    background: 'var(--pl-olive-5)',
                    color: 'var(--pl-ink-soft)',
                    fontSize: 'var(--pl-text-sm)',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sections
                </button>
              </div>
            )}
            <MobileContextPanel
              activeSection={activeSection}
              activeChapterId={activeChapterId}
              activeEventId={activeEventId}
            />
          </>
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
            {/* ── Essentials ── */}
            <div style={{
              fontSize: 'var(--pl-text-2xs)', fontWeight: 800,
              letterSpacing: 'var(--pl-label-tracking)', textTransform: 'uppercase',
              color: 'var(--pl-olive)', marginBottom: 12,
              fontVariant: 'small-caps',
            }}>
              Essentials
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}>
              {ESSENTIAL_TOOLS.map(tool => (
                <motion.button
                  key={tool.id}
                  onClick={() => { setMoreToolOpen(tool.id); setSheetSnap(2); }}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                    padding: '16px 4px',
                    minHeight: 92,
                    borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid var(--pl-black-4)',
                    background: 'var(--pl-cream-card)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--pl-radius-xs)',
                    background: 'var(--pl-olive-8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <tool.icon size={18} color="var(--pl-olive)" />
                  </div>
                  <span style={{
                    fontSize: 'var(--pl-text-xs)', fontWeight: 600,
                    color: 'var(--pl-ink-soft)', textAlign: 'center',
                    lineHeight: 1.2,
                  }}>
                    {tool.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* ── Divider ── */}
            <div style={{
              height: 1, background: 'var(--pl-black-6)',
              margin: '20px 0 16px',
            }} />

            {/* ── More Tools (Advanced) ── */}
            <div style={{
              fontSize: 'var(--pl-text-2xs)', fontWeight: 800,
              letterSpacing: 'var(--pl-label-tracking)', textTransform: 'uppercase',
              color: 'var(--pl-olive)', marginBottom: 12,
              fontVariant: 'small-caps',
            }}>
              More Tools
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}>
              {ADVANCED_TOOLS.map(tool => (
                <motion.button
                  key={tool.id}
                  onClick={() => { setMoreToolOpen(tool.id); setSheetSnap(2); }}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 6,
                    padding: '12px 4px',
                    minHeight: 72,
                    borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid var(--pl-black-4)',
                    background: 'var(--pl-cream-card)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--pl-radius-xs)',
                    background: 'var(--pl-olive-8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <tool.icon size={14} color="var(--pl-olive)" />
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
        minHeight: 44,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 4, paddingRight: 4,
        background: 'var(--pl-glass-heavy)',
        backdropFilter: 'var(--pl-glass-blur)',
        WebkitBackdropFilter: 'var(--pl-glass-blur)',
        borderBottom: '1px solid var(--pl-glass-light-border)',
        zIndex: 10,
        position: 'relative',
      } as React.CSSProperties}>
        {/* Back */}
        <motion.button
          onClick={() => window.history.back()}
          whileTap={{ scale: 0.85 }}
          aria-label="Back to dashboard"
          style={{
            width: 44, height: 44, borderRadius: 12,
            border: 'none', background: 'transparent',
            color: 'var(--pl-ink-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} />
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
            onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }}
            whileTap={{ scale: 0.85 }}
            aria-label="More options"
            style={{
              width: 44, height: 44, borderRadius: 12,
              border: 'none',
              background: showMenu ? 'var(--pl-olive-10)' : 'transparent',
              color: 'var(--pl-ink-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={18} />
          </motion.button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setShowMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
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

      {/* ── Preview Area (direct DOM, matches desktop) ── */}
      <div ref={previewRef} className="pl-mobile-editor-preview" style={{
        flex: 1, position: 'relative', minHeight: 0,
        overflow: 'auto', WebkitOverflowScrolling: 'touch',
        background: 'var(--pl-cream)',
        // Isolate stacking context so SiteRenderer z-index values
        // (icon pickers, context menus) don't overlap the bottom sheet
        zIndex: 0, isolation: 'isolate',
      } as React.CSSProperties}>
        <SiteRenderer
          manifest={manifest}
          names={coupleNames}
          onTextEdit={handleTextEdit}
          onSectionClick={handleSectionClick}
          onBlockDrop={handleBlockDrop}
          onBlockReorder={handleBlockReorder}
          onBlockAction={handleBlockAction}
          selectedBlockId={selectedBlockId}
          editMode
        />
      </div>

      {/* Action bar — fixed between preview and sheet, not inside scroll */}
      <div style={{
        position: 'fixed',
        bottom: sheetSnap === 0 ? 'calc(10vh + 52px)' : sheetSnap === 1 ? 'calc(50vh + 8px)' : 'calc(92vh + 8px)',
        left: 0,
        right: 0,
        zIndex: 1150,
        pointerEvents: 'none',
        transition: 'bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <MobileActionBar
          activeSection={activeSection}
          onAddBlock={handleAddBlock}
          onUndo={actions.undo}
          onRedo={actions.redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onAction={handleContextAction}
        />
      </div>

      {/* ── Bottom Sheet ── */}
      <MobileBottomSheet
        snapPoints={[10, 50, 92]}
        initialSnap={0}
        snap={sheetSnap}
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
                : 'Tap any section on your site to customize it'}
            </div>
          ) : undefined
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={moreToolOpen || activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {renderSheetContent()}
          </motion.div>
        </AnimatePresence>
      </MobileBottomSheet>

      {/* ── Bottom Navigation (3 tabs) ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 1300,
        display: 'flex', alignItems: 'stretch',
        minHeight: 52,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'var(--pl-glass-heavy)',
        backdropFilter: 'var(--pl-glass-blur)',
        WebkitBackdropFilter: 'var(--pl-glass-blur)',
        borderTop: '1px solid var(--pl-glass-light-border)',
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
              whileTap={{ scale: 0.88 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, border: 'none',
                background: 'transparent', cursor: 'pointer',
                padding: '6px 0', position: 'relative',
                minHeight: 44,
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-pill"
                  style={{
                    position: 'absolute', inset: '4px 8px',
                    borderRadius: 10,
                    background: 'var(--pl-olive-15)',
                    border: '1px solid var(--pl-olive-20)',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                />
              )}
              <tab.icon
                size={18}
                style={{
                  position: 'relative', zIndex: 1,
                  color: isActive ? 'var(--pl-olive)' : 'var(--pl-olive-30)',
                }}
              />
              <span style={{
                fontSize: 'var(--pl-text-xs)', fontWeight: 700,
                color: isActive ? 'var(--pl-olive)' : 'var(--pl-olive-30)',
                letterSpacing: '0.04em',
                position: 'relative', zIndex: 1,
              }}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>

    </div>
  );
}
