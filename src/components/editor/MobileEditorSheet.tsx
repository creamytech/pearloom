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
  Music, ShoppingBag, Heart, BarChart2, Sparkles,
  Palette, Image as ImageIcon,
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
const GuestsLifecyclePanel    = dynamic(() => import('./GuestsLifecyclePanel').then(m => ({ default: m.GuestsLifecyclePanel })), { ssr: false });
const ThankYouPanel           = dynamic(() => import('./ThankYouPanel').then(m => ({ default: m.ThankYouPanel })), { ssr: false });
const SpotifyPanel            = dynamic(() => import('./SpotifyPanel').then(m => ({ default: m.SpotifyPanel })), { ssr: false });
const VendorPanel             = dynamic(() => import('./VendorPanel').then(m => ({ default: m.VendorPanel })), { ssr: false });
const VoiceTrainerPanel       = dynamic(() => import('./VoiceTrainerPanel').then(m => ({ default: m.VoiceTrainerPanel })), { ssr: false });
const AIBlocksPanel           = dynamic(() => import('./AIBlocksPanel').then(m => ({ default: m.AIBlocksPanel })), { ssr: false });
const ColorPalettePanel       = dynamic(() => import('./ColorPalettePanel').then(m => ({ default: m.ColorPalettePanel })), { ssr: false });
const MediaLibraryPanel       = dynamic(() => import('./MediaLibraryPanel').then(m => ({ default: m.MediaLibraryPanel })), { ssr: false });

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
  { id: 'colors',      icon: Palette,     label: 'Palette'       },
  { id: 'media',       icon: ImageIcon,   label: 'Media library' },
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
  // Phase 3 mobile UX: when this is true, the preview + bottom sheet
  // disappear and the section's edit panel takes the whole viewport.
  // Eliminates the half-snap keyboard-clash problem on dense panels.
  const [editFullScreen, setEditFullScreen] = useState(false);
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

  // ── Track scroll to distinguish tap from scroll ─────────────
  const scrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePreviewScroll = useCallback(() => {
    scrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => { scrollingRef.current = false; }, 150);
  }, []);

  // ── Section click — only on intentional taps, not scroll ──────
  const handleSectionClick = useCallback((sectionId: string, chapterId?: string, blockId?: string) => {
    // Ignore if user was just scrolling — prevents accidental opens
    if (scrollingRef.current) return;

    // Pear-primary mode parity with desktop: tapping a section opens Ask Pear
    // pre-filled with a section-specific prompt instead of the settings sheet.
    const pearModeOn =
      typeof document !== 'undefined' &&
      document.body.getAttribute('data-pear-mode') === '1';
    if (pearModeOn) {
      const friendly = sectionId
        .replace(/-/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase();
      const prompt = chapterId
        ? 'Help me improve this chapter: '
        : sectionId === 'hero'
          ? 'Rewrite my hero tagline to be more '
          : sectionId === 'rsvp'
            ? 'Write a warmer RSVP intro for my guests: '
            : sectionId === 'events'
              ? 'Add an event to my schedule: '
              : sectionId === 'faq'
                ? 'Suggest FAQs guests would actually ask about our '
                : sectionId === 'registry'
                  ? 'Help me set up my registry for '
                  : `Change my ${friendly} section to `;
      window.dispatchEvent(
        new CustomEvent('pearloom:ask-pear', { detail: { prompt } }),
      );
      if (chapterId) dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
      return;
    }

    if (chapterId) {
      setActiveChapterId(chapterId);
      setActiveSection('story');
      setActiveTab('edit');
      setEditFullScreen(true);
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
    // Full-screen edit takes over the viewport. Bottom sheet + nav
    // hide so dense panels + the soft keyboard both fit.
    setEditFullScreen(true);
    setSheetSnap(1);

    // Flash highlight on the tapped section in preview
    try {
      const el = previewRef.current?.querySelector(`[data-pe-section="${sectionId}"]`) as HTMLElement | null;
      if (el) {
        el.style.outline = '2px solid #18181B';
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
      // Item 2: coalesce rapid keystrokes on the same chapter field.
      if (chapter) actions.updateChapter(chId, { [field]: value }, { coalesceKey: `text:${path}` });
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
      // Item 2: per-path coalesce key so different fields stay separate.
      actions.handleDesignChange(updated, { coalesceKey: `text:${path}` });
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
      setEditFullScreen(true);
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
      case 'guests':
      case 'invite':
      case 'seating':
      case 'savethedate':
        return <GuestsLifecyclePanel manifest={manifest} subdomain={subdomain} />;
      case 'messaging': return <MessagingPanel manifest={manifest} siteId={subdomain} subdomain={subdomain} />;
      case 'colors': return <ColorPalettePanel manifest={manifest} onChange={actions.handleDesignChange} names={coupleNames} />;
      case 'media': return <MediaLibraryPanel />;
      case 'blocks': return <AIBlocksPanel manifest={manifest} coupleNames={coupleNames} onChange={(m) => { actions.handleDesignChange(m); }} />;
      case 'voice': return <VoiceTrainerPanel voiceSamples={manifest.voiceSamples || []} onChange={(samples) => { const updated = { ...manifest, voiceSamples: samples }; actions.handleDesignChange(updated); }} />;
      case 'analytics': return <AnalyticsDashboardPanel siteId={subdomain} />;
      case 'translate': return <TranslationPanel manifest={manifest} onChange={actions.handleDesignChange} />;
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
              background: 'rgba(24,24,27,0.03)',
              color: '#3F3F46',
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
                    background: 'rgba(24,24,27,0.03)',
                    color: '#3F3F46',
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
              color: '#18181B', marginBottom: 12,
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
                    background: 'var(--card)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--pl-radius-xs)',
                    background: 'rgba(24,24,27,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <tool.icon size={18} color="#18181B" />
                  </div>
                  <span style={{
                    fontSize: 'var(--pl-text-xs)', fontWeight: 600,
                    color: '#3F3F46', textAlign: 'center',
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
              color: '#18181B', marginBottom: 12,
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
                    background: 'var(--card)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--pl-radius-xs)',
                    background: 'rgba(24,24,27,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <tool.icon size={14} color="#18181B" />
                  </div>
                  <span style={{
                    fontSize: 'var(--pl-text-2xs)', fontWeight: 600,
                    color: '#3F3F46', textAlign: 'center',
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

  // Tag <body> so global CSS can detect we're inside the mobile editor
  // (powers the iOS auto-zoom guard, 44 px tap-target floor, and the
  // landscape rotate prompt).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-pl-editor', 'active');
    return () => {
      document.body.removeAttribute('data-pl-editor');
    };
  }, []);

  // Keyboard auto-scroll — when any input/textarea gains focus, slide
  // the bottom sheet content so the active field sits above the iOS
  // keyboard. Without this, tapping a field below the half-snap fold
  // hides the input behind the soft keyboard.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
      // Wait a beat for the keyboard to render then scroll into view.
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 240);
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Full-screen edit overlay — Phase 3 mobile UX. When the user
  // taps any editable section, we render a dedicated full-height
  // layer instead of the half-snap sheet. Dense panels fit, the
  // keyboard doesn't collide with the content, and the canvas is
  // one tap away via the back chevron.
  // ─────────────────────────────────────────────────────────
  if (editFullScreen && activeSection) {
    const friendly = activeSection.charAt(0).toUpperCase() + activeSection.slice(1);
    const exit = () => {
      setEditFullScreen(false);
      setActiveSection(null);
      setActiveChapterId(null);
      setSelectedBlockId(null);
      dispatch({ type: 'SET_ACTIVE_ID', id: null });
      setSheetSnap(0);
    };
    return (
      <div
        className="pl-mobile-editor"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 520,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card)',
        }}
      >
        {/* Top bar */}
        <header
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 52,
            padding: '6px 10px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
            borderBottom: '1px solid var(--line)',
            background: 'var(--cream)',
          }}
        >
          <button
            type="button"
            onClick={exit}
            aria-label="Back to canvas"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              cursor: 'pointer',
              borderRadius: 'var(--pl-radius-md)',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.52rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                fontWeight: 700,
              }}
            >
              Editing
            </span>
            <span
              style={{
                fontFamily: 'var(--pl-font-heading)',
                fontStyle: 'italic',
                fontSize: '1.04rem',
                color: 'var(--ink)',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {friendly}
            </span>
          </div>
          {/* Quick actions — Pear, preview, done */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('pearloom:ask-pear', {
                  detail: {
                    prompt: `Change my ${activeSection} section to `,
                  },
                }),
              );
            }}
            aria-label="Ask Pear about this section"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '8px 12px',
              background: 'color-mix(in oklab, var(--sage-deep) 14%, transparent)',
              color: 'var(--sage-deep)',
              border: '1px solid color-mix(in oklab, var(--sage-deep) 32%, transparent)',
              borderRadius: 'var(--pl-radius-full)',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.58rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={12} /> Pear
          </button>
          <button
            type="button"
            onClick={exit}
            aria-label="Done"
            style={{
              padding: '8px 14px',
              background: 'var(--ink)',
              color: 'var(--cream)',
              border: 'none',
              borderRadius: 'var(--pl-radius-full)',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </header>

        {/* Panel body — scrolls independently */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0 120px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {selectedBlockId && activeSection && activeSection !== 'story' ? (
            <MobileContextPanel
              activeSection={activeSection}
              activeChapterId={null}
              activeEventId={activeEventId}
            />
          ) : (
            <MobileContextPanel
              activeSection={activeSection}
              activeChapterId={activeChapterId}
              activeEventId={activeEventId}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pl-mobile-editor" style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', flexDirection: 'column',
      background: 'var(--cream-2)',
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
            width: 44, height: 44, borderRadius: 'var(--pl-radius-lg)',
            border: 'none', background: 'transparent',
            color: '#3F3F46',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>

        {/* Site name */}
        <div style={{
          flex: 1, minWidth: 0, textAlign: 'center',
          fontFamily: 'inherit',
          fontSize: 'var(--pl-text-md)', fontWeight: 700,
          
          color: '#18181B',
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
              width: 44, height: 44, borderRadius: 'var(--pl-radius-lg)',
              border: 'none',
              background: showMenu ? 'rgba(24,24,27,0.06)' : 'transparent',
              color: '#3F3F46',
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
                    marginTop: 4, width: 180, zIndex: 'var(--z-sticky)',
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
                    {
                      label:
                        typeof document !== 'undefined' &&
                        document.body.getAttribute('data-pear-mode') === '1'
                          ? 'Switch to Advanced'
                          : 'Switch to Pear mode',
                      icon: Sparkles,
                      action: () => {
                        const curr =
                          typeof document !== 'undefined' &&
                          document.body.getAttribute('data-pear-mode') === '1';
                        try {
                          localStorage.setItem('pearloom:pear-mode', curr ? '0' : '1');
                        } catch {}
                        if (typeof document !== 'undefined') {
                          document.body.setAttribute('data-pear-mode', curr ? '0' : '1');
                        }
                        setShowMenu(false);
                      },
                    },
                    { label: 'Publish', icon: Send, action: () => { dispatch({ type: 'OPEN_PUBLISH' }); setShowMenu(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      disabled={item.disabled}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', border: 'none', borderRadius: 'var(--pl-radius-xs)',
                        background: 'transparent', cursor: item.disabled ? 'default' : 'pointer',
                        color: item.disabled ? '#71717A' : '#3F3F46',
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
      <div ref={previewRef} onScroll={handlePreviewScroll} className="pl-mobile-editor-preview" style={{
        flex: 1, position: 'relative', minHeight: 0,
        overflow: 'auto', WebkitOverflowScrolling: 'touch',
        background: 'var(--cream)',
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
      {/* Heavy tools benefit from a taller half-snap so their dense UIs
          (e.g. seating chart, analytics) aren't cramped. Light/default tabs
          keep the standard 50% half-snap. */}
      <MobileBottomSheet
        snapPoints={
          moreToolOpen && ['seating', 'analytics', 'messaging', 'voice', 'invite', 'guests'].includes(moreToolOpen)
            ? [10, 70, 92]
            : [10, 50, 92]
        }
        initialSnap={0}
        snap={sheetSnap}
        onSnapChange={setSheetSnap}
        open
        scrollKey={
          moreToolOpen
            ? `more:${moreToolOpen}`
            : activeTab === 'edit'
            ? `edit:${activeSection ?? 'none'}:${activeChapterId ?? ''}:${activeEventId ?? ''}`
            : activeTab
        }
        header={
          sheetSnap === 0 ? (
            <div style={{
              padding: '0 16px 8px', textAlign: 'center',
              fontSize: 'var(--pl-text-xs)', color: '#71717A',
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

      {/* Mobile readiness chip — sits just above the bottom nav so the
          publisher can see how far they are without opening the publish
          drawer. Mirrors the 5-item desktop checklist. */}
      <MobileReadinessChip onPublish={() => dispatch({ type: 'OPEN_PUBLISH' })} />

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
                    borderRadius: 'var(--pl-radius-lg)',
                    background: 'rgba(24,24,27,0.08)',
                    border: '1px solid rgba(24,24,27,0.1)',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                />
              )}
              <tab.icon
                size={18}
                style={{
                  position: 'relative', zIndex: 1,
                  color: isActive ? '#18181B' : 'rgba(24,24,27,0.15)',
                }}
              />
              <span style={{
                fontSize: 'var(--pl-text-xs)', fontWeight: 700,
                color: isActive ? '#18181B' : 'rgba(24,24,27,0.15)',
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

// ─────────────────────────────────────────────────────────────
// Tiny readiness chip that floats above the mobile bottom nav.
// Mirrors the 5-item checklist in the desktop publish drawer so
// users see 'X/5 ready' before they decide to publish.
// ─────────────────────────────────────────────────────────────
function MobileReadinessChip({ onPublish }: { onPublish: () => void }) {
  const { manifest, coupleNames, state } = useEditor();

  const checks = [
    !!coupleNames?.[0]?.trim(),
    !!(manifest?.logistics?.date || manifest?.events?.[0]?.date),
    (manifest?.chapters?.length || 0) > 0,
    (manifest?.chapters?.reduce((n, c) => n + (c.images?.length || 0), 0) || 0) > 0 ||
      !!manifest?.coverPhoto ||
      (manifest?.heroSlideshow?.filter(Boolean).length || 0) > 0,
    !!manifest?.logistics?.rsvpDeadline,
  ];
  const ready = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = (ready / total) * 100;
  const isPublished = !!state.publishedUrl;
  const allReady = ready === total;

  if (isPublished) return null;

  return (
    <button
      type="button"
      onClick={onPublish}
      data-pl-chip="true"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)',
        zIndex: 1290,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        background: 'var(--card)',
        border: '1px solid color-mix(in oklab, var(--pl-gold, #B8935A) 32%, transparent)',
        borderRadius: 'var(--pl-radius-full)',
        boxShadow: '0 6px 20px rgba(40,28,12,0.08)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.58rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: allReady ? 'var(--sage-deep)' : 'var(--gold)',
        }}
      >
        {ready}/{total} ready
      </span>
      <div
        style={{
          flex: 1,
          height: 3,
          background: 'color-mix(in oklab, var(--pl-gold, #B8935A) 18%, transparent)',
          borderRadius: 'var(--pl-radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: allReady ? 'var(--sage-deep)' : 'var(--gold)',
            transition: 'width 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.58rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          fontWeight: 700,
        }}
      >
        {allReady ? 'Publish →' : 'Review'}
      </span>
    </button>
  );
}
