'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorCanvas.tsx — Direct-DOM canvas
// Renders the site directly in the editor DOM (no iframe).
// Enables native drag-drop, direct click-to-edit, and real
// glass blur transparency.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useEditor, type DeviceMode } from '@/lib/editor-state';
import { SiteRenderer } from './SiteRenderer';
import { PearTextRewrite } from './PearTextRewrite';
import { FocalPointOverlay } from './preview/FocalPointOverlay';
import { CanvasChapterToolbar, type ChapterToolbarAction } from './preview/CanvasChapterToolbar';
import { CanvasEventToolbar, type EventToolbarAction } from './preview/CanvasEventToolbar';
import { CanvasFaqToolbar, type FaqToolbarAction } from './preview/CanvasFaqToolbar';
import { CanvasSectionToolbar, type SectionToolbarAction } from './preview/CanvasSectionToolbar';
import { CanvasRegistryToolbar, type RegistryToolbarAction } from './preview/CanvasRegistryToolbar';
import { CanvasHeroEditBar } from './preview/CanvasHeroEditBar';
import { CanvasInlineFormatBar, type TextFormat } from './preview/CanvasInlineFormatBar';
import { BlockConfigPopover } from './preview/BlockConfigPopover';
import { BLOCK_SCHEMAS } from '@/lib/block-engine/schema';
import type { BlockType, PageBlock } from '@/types';

export function EditorCanvas() {
  const { state, dispatch, manifest, coupleNames, actions } = useEditor();
  const { device, previewZoom } = state;
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const zoom = previewZoom || 1;
  const [isPanning, setIsPanning] = useState(false);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const [focalPoint, setFocalPoint] = useState<{
    chapterId: string; rect: DOMRect; x: number; y: number;
  } | null>(null);
  const [hoveredChapter, setHoveredChapter] = useState<{
    chapterId: string; rect: DOMRect; chapterIndex: number; chapterCount: number;
  } | null>(null);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredEvent, setHoveredEvent] = useState<{
    eventId: string; rect: DOMRect; eventIndex: number; eventCount: number;
  } | null>(null);
  const eventLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredFaq, setHoveredFaq] = useState<{
    faqId: string; rect: DOMRect; faqIndex: number; faqCount: number;
  } | null>(null);
  const faqLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredSection, setHoveredSection] = useState<{
    section: string; label: string; rect: DOMRect;
  } | null>(null);
  const sectionLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredRegistry, setHoveredRegistry] = useState<{
    registryId: string; registryIndex: number; rect: DOMRect;
  } | null>(null);
  const registryLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredHero, setHoveredHero] = useState<{ rect: DOMRect } | null>(null);
  const heroLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [focusedTextField, setFocusedTextField] = useState<{
    path: string; rect: DOMRect;
  } | null>(null);

  const [blockConfigPopover, setBlockConfigPopover] = useState<{
    blockId: string; rect: DOMRect;
  } | null>(null);

  // ── Spacebar to pan ─────────────────────────────────────
  useEffect(() => {
    let panStartX = 0, panStartY = 0, scrollStartX = 0, scrollStartY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('[contenteditable]')) {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsPanning(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!isPanning || !scrollContainerRef.current) return;
      panStartX = e.clientX;
      panStartY = e.clientY;
      scrollStartX = scrollContainerRef.current.scrollLeft;
      scrollStartY = scrollContainerRef.current.scrollTop;
      document.body.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning || !scrollContainerRef.current || !panStartX) return;
      scrollContainerRef.current.scrollLeft = scrollStartX - (e.clientX - panStartX);
      scrollContainerRef.current.scrollTop = scrollStartY - (e.clientY - panStartY);
    };
    const onMouseUp = () => {
      panStartX = 0;
      document.body.style.cursor = '';
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning]);

  const isPhone = device === 'mobile';
  const isTablet = device === 'tablet';
  const isFramed = isPhone || isTablet;
  const frameWidth = isPhone ? 390 : isTablet ? 768 : undefined;

  // ── Section click → inline editing for creative sections, panel deep-link for structured-data ──
  const handleSectionClick = useCallback((sectionId: string, chapterId?: string, blockId?: string) => {
    // Chapter-specific: select chapter for inline editing, do NOT force-switch tabs.
    if (chapterId) {
      dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
      return;
    }

    // Structured-data sections that legitimately live in side panels.
    // Clicking these still deep-links to the relevant panel tab + sub-section.
    const structuredDataSections: Record<string, { tab: string; contextSection?: string }> = {
      'registry': { tab: 'details', contextSection: 'registry' },
      'travel': { tab: 'details', contextSection: 'travel' },
      'faq': { tab: 'details', contextSection: 'faq' },
      'footer': { tab: 'details', contextSection: 'footer' },
      'design': { tab: 'design', contextSection: 'theme' },
      'theme': { tab: 'design', contextSection: 'theme' },
    };

    const structured = structuredDataSections[sectionId];
    if (structured) {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: structured.tab as import('@/lib/editor-state').EditorTab });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: structured.contextSection || null });
      dispatch({ type: 'SET_FIELD_FOCUS', field: structured.contextSection || sectionId });
      setTimeout(() => dispatch({ type: 'SET_FIELD_FOCUS', field: null }), 1600);
      return;
    }

    // Creative sections: inline editing only. Select the block + open inline popover.
    // No SET_ACTIVE_TAB — panels stay accessible from the sidebar but don't auto-open.
    if (blockId) dispatch({ type: 'SET_ACTIVE_ID', id: blockId });
    dispatch({ type: 'SET_CONTEXT_SECTION', section: null });
    const blockType = sectionId === 'gallery' ? 'photos' : sectionId;
    window.dispatchEvent(new CustomEvent('pearloom-select-block', { detail: { blockType, blockId } }));
    if (blockId && BLOCK_SCHEMAS[blockType]) {
      const el = canvasRef.current?.querySelector(`[data-block-id="${blockId}"]`);
      const rect = el?.getBoundingClientRect();
      if (rect) {
        window.dispatchEvent(new CustomEvent('pearloom-block-config-open', {
          detail: { blockId, blockType, rect },
        }));
      }
    }
  }, [dispatch]);

  // ── Inline text edit → update manifest ──────────────────
  const handleTextEdit = useCallback((path: string, value: string) => {
    // Sticker operations
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

    if (path === '__replaceChapterPhoto__') {
      const { chapterId, imgIndex, newUrl, newAlt, append } = JSON.parse(value) as {
        chapterId: string; imgIndex: number; newUrl: string; newAlt?: string; append?: boolean;
      };
      const chapter = manifest.chapters?.find(c => c.id === chapterId);
      if (chapter) {
        const images = [...(chapter.images || [])];
        const newImg = {
          id: images[imgIndex]?.id || `photo-${Date.now()}`,
          url: newUrl,
          alt: newAlt || images[imgIndex]?.alt || 'Photo',
          width: images[imgIndex]?.width || 0,
          height: images[imgIndex]?.height || 0,
        };
        if (append || imgIndex >= images.length) {
          images.push(newImg);
        } else {
          images[imgIndex] = newImg;
        }
        actions.updateChapter(chapterId, { images });
      }
      return;
    }

    if (path.startsWith('__format:')) {
      // Inline text format: __format:manifest.path → value = JSON stringified format object
      const formatPath = path.slice('__format:'.length);
      try {
        const fmt = JSON.parse(value);
        const formats = { ...(manifest.textFormats || {}), [formatPath]: fmt };
        actions.handleDesignChange({ ...manifest, textFormats: formats });
      } catch {}
      return;
    }
    if (path.startsWith('chapter:')) {
      const [, chapterId, field] = path.split(':');
      const chapter = manifest.chapters?.find(c => c.id === chapterId);
      if (chapter) actions.updateChapter(chapterId, { [field]: value });
    } else if (path.startsWith('block-config:')) {
      // block-config:blockId:configKey — updates a block's config field
      const [, blockId, ...keyParts] = path.split(':');
      const configKey = keyParts.join(':');
      const blocks = [...(manifest.blocks || [])];
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx !== -1) {
        blocks[idx] = { ...blocks[idx], config: { ...(blocks[idx].config || {}), [configKey]: value } };
        actions.handleDesignChange({ ...manifest, blocks });
      }
    } else {
      // Manifest path edit (e.g., "events.0.name", "poetry.heroTagline", "vibeSkin.accentSymbol")
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(manifest));
      let target: Record<string, unknown> = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i]) : parts[i];
        // Create intermediate objects if they don't exist
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
        break;
      case 'toggleVisibility':
        updated = updated.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b);
        break;
    }
    actions.handleDesignChange({ ...manifest, blocks: updated.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions]);

  // ── Canvas drag-to-reorder ──────────────────────────────
  const handleBlockReorder = useCallback((fromIdx: number, toIdx: number) => {
    const blocks = [...(manifest.blocks || [])].filter(b => b.visible).sort((a, b) => a.order - b.order);
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const [moved] = blocks.splice(fromIdx, 1);
    blocks.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, moved);
    actions.handleDesignChange({ ...manifest, blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  }, [manifest, actions]);

  // ── Copy/Paste ──────────────────────────────────────────
  const [clipboardBlock, setClipboardBlock] = useState<PageBlock | null>(null);

  const handleBlockCopy = useCallback((blockId: string) => {
    const block = manifest.blocks?.find(b => b.id === blockId);
    if (block) {
      setClipboardBlock({ ...block });
      setUndoToast('Copied: ' + (block.type || 'section'));
      setTimeout(() => setUndoToast(null), 2000);
    }
  }, [manifest]);

  const handleBlockPaste = useCallback((position: number) => {
    if (!clipboardBlock) return;
    const blocks = [...(manifest.blocks || [])];
    const clampedPos = Math.max(0, Math.min(position, blocks.length));
    const pasted = { ...clipboardBlock, id: `${clipboardBlock.type}-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, config: clipboardBlock.config ? { ...clipboardBlock.config } : undefined };
    blocks.splice(clampedPos, 0, pasted);
    actions.handleDesignChange({ ...manifest, blocks: blocks.map((b, i) => ({ ...b, order: i })) });
    setUndoToast('Pasted: ' + (clipboardBlock.type || 'section'));
    setTimeout(() => setUndoToast(null), 2000);
  }, [manifest, clipboardBlock, actions]);

  // ── Chapter toolbar actions ─────────────────────────────
  const handleChapterToolbarAction = useCallback((action: ChapterToolbarAction) => {
    if (!hoveredChapter) return;
    const { chapterId } = hoveredChapter;

    if (action === 'edit') {
      dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
      return;
    }
    if (action === 'aiRewrite') {
      window.dispatchEvent(new CustomEvent('pear-command', {
        detail: { prompt: `Rewrite the story chapters with more vivid, emotional storytelling. Keep all names, dates, and facts the same. Use update_chapter for each.` }
      }));
      return;
    }
    if (typeof action === 'object' && 'layout' in action) {
      actions.updateChapter(chapterId, { layout: action.layout } as Parameters<typeof actions.updateChapter>[1]);
      return;
    }

    // Structural chapter operations (duplicate / move / delete)
    const chapters = [...(manifest.chapters || [])];
    const idx = chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return;

    switch (action) {
      case 'duplicate': {
        const dup = { ...chapters[idx], id: `chapter-dup-${Date.now()}` };
        chapters.splice(idx + 1, 0, dup);
        break;
      }
      case 'moveUp':
        if (idx > 0) [chapters[idx - 1], chapters[idx]] = [chapters[idx], chapters[idx - 1]];
        break;
      case 'moveDown':
        if (idx < chapters.length - 1) [chapters[idx], chapters[idx + 1]] = [chapters[idx + 1], chapters[idx]];
        break;
      case 'delete': {
        const name = chapters[idx]?.title || 'this chapter';
        if (!confirm(`Delete "${name}"?`)) return;
        chapters.splice(idx, 1);
        setHoveredChapter(null);
        break;
      }
    }
    actions.handleDesignChange({ ...manifest, chapters });
  }, [hoveredChapter, manifest, actions, dispatch]);

  // ── Event toolbar actions ───────────────────────────────
  const handleEventToolbarAction = useCallback((action: EventToolbarAction) => {
    if (!hoveredEvent) return;
    const { eventIndex } = hoveredEvent;
    const events = [...(manifest.events || [])];
    if (action === 'edit') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: 'theday' });
      return;
    }
    switch (action) {
      case 'moveUp':
        if (eventIndex > 0) [events[eventIndex - 1], events[eventIndex]] = [events[eventIndex], events[eventIndex - 1]];
        break;
      case 'moveDown':
        if (eventIndex < events.length - 1) [events[eventIndex], events[eventIndex + 1]] = [events[eventIndex + 1], events[eventIndex]];
        break;
      case 'duplicate': {
        const dup = { ...events[eventIndex], id: `event-dup-${Date.now()}` };
        events.splice(eventIndex + 1, 0, dup);
        break;
      }
      case 'delete': {
        const name = events[eventIndex]?.name || 'this event';
        if (!confirm(`Delete "${name}"?`)) return;
        events.splice(eventIndex, 1);
        setHoveredEvent(null);
        break;
      }
    }
    actions.handleDesignChange({ ...manifest, events });
  }, [hoveredEvent, manifest, actions, dispatch]);

  // ── FAQ toolbar actions ─────────────────────────────────
  const handleFaqToolbarAction = useCallback((action: FaqToolbarAction) => {
    if (!hoveredFaq) return;
    const { faqId, faqIndex } = hoveredFaq;
    const faqs = [...(manifest.faqs || [])];
    if (action === 'edit') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: 'faq' });
      return;
    }
    switch (action) {
      case 'moveUp':
        if (faqIndex > 0) [faqs[faqIndex - 1], faqs[faqIndex]] = [faqs[faqIndex], faqs[faqIndex - 1]];
        break;
      case 'moveDown':
        if (faqIndex < faqs.length - 1) [faqs[faqIndex], faqs[faqIndex + 1]] = [faqs[faqIndex + 1], faqs[faqIndex]];
        break;
      case 'delete': {
        const q = faqs[faqIndex]?.question || 'this FAQ';
        const preview = q.length > 48 ? q.slice(0, 45) + '…' : q;
        if (!confirm(`Delete "${preview}"?`)) return;
        faqs.splice(faqIndex, 1);
        setHoveredFaq(null);
        break;
      }
    }
    actions.handleDesignChange({ ...manifest, faqs: faqs.map((f, i) => ({ ...f, order: i })) });
    void faqId; // consumed via index
  }, [hoveredFaq, manifest, actions, dispatch]);

  // ── Section hover (footer / nav) ────────────────────────
  const handleSectionToolbarAction = useCallback((action: SectionToolbarAction) => {
    if (!hoveredSection) return;
    const { section } = hoveredSection;
    if (action === 'edit') {
      if (section === 'footer') {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
        dispatch({ type: 'SET_CONTEXT_SECTION', section: 'footer' });
      } else if (section === 'nav') {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
        dispatch({ type: 'SET_CONTEXT_SECTION', section: 'navigation' });
      }
    }
  }, [hoveredSection, dispatch]);

  useEffect(() => {
    const cancelTimer = () => {
      if (sectionLeaveTimerRef.current) { clearTimeout(sectionLeaveTimerRef.current); sectionLeaveTimerRef.current = null; }
    };
    const onHover = (e: Event) => { cancelTimer(); setHoveredSection((e as CustomEvent).detail); };
    const onKeep = () => cancelTimer();
    const onEnd = () => { sectionLeaveTimerRef.current = setTimeout(() => setHoveredSection(null), 200); };
    window.addEventListener('pearloom-section-hover', onHover);
    window.addEventListener('pearloom-section-hover-keep', onKeep);
    window.addEventListener('pearloom-section-hover-end', onEnd);
    return () => {
      window.removeEventListener('pearloom-section-hover', onHover);
      window.removeEventListener('pearloom-section-hover-keep', onKeep);
      window.removeEventListener('pearloom-section-hover-end', onEnd);
      if (sectionLeaveTimerRef.current) clearTimeout(sectionLeaveTimerRef.current);
    };
  }, []);

  // ── Registry card hover toolbar ─────────────────────────
  const handleRegistryToolbarAction = useCallback((action: RegistryToolbarAction) => {
    if (!hoveredRegistry) return;
    const { registryIndex } = hoveredRegistry;
    if (action === 'edit') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
      dispatch({ type: 'SET_CONTEXT_SECTION', section: 'registry' });
      return;
    }
    if (action === 'openLink') {
      const reg = manifest.registry?.entries?.[registryIndex];
      if (reg?.url) window.open(reg.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === 'delete') {
      const entries = [...(manifest.registry?.entries || [])];
      const name = entries[registryIndex]?.name || 'this registry item';
      if (!confirm(`Delete "${name}"?`)) return;
      entries.splice(registryIndex, 1);
      actions.handleDesignChange({ ...manifest, registry: { ...(manifest.registry || { enabled: true }), entries } });
      setHoveredRegistry(null);
    }
  }, [hoveredRegistry, manifest, actions, dispatch]);

  useEffect(() => {
    const cancelTimer = () => {
      if (registryLeaveTimerRef.current) { clearTimeout(registryLeaveTimerRef.current); registryLeaveTimerRef.current = null; }
    };
    const onHover = (e: Event) => { cancelTimer(); setHoveredRegistry((e as CustomEvent).detail); };
    const onKeep = () => cancelTimer();
    const onEnd = () => { registryLeaveTimerRef.current = setTimeout(() => setHoveredRegistry(null), 200); };
    window.addEventListener('pearloom-registry-hover', onHover);
    window.addEventListener('pearloom-registry-hover-keep', onKeep);
    window.addEventListener('pearloom-registry-hover-end', onEnd);
    return () => {
      window.removeEventListener('pearloom-registry-hover', onHover);
      window.removeEventListener('pearloom-registry-hover-keep', onKeep);
      window.removeEventListener('pearloom-registry-hover-end', onEnd);
      if (registryLeaveTimerRef.current) clearTimeout(registryLeaveTimerRef.current);
    };
  }, []);

  // ── Hero hover edit bar ──────────────────────────────────
  const handleHeroStyleChange = useCallback((field: string, value: string) => {
    if (value === '') {
      // Clear the override (e.g. heroTextColorOverride)
      const updated = { ...manifest } as unknown as Record<string, unknown>;
      delete updated[field];
      actions.handleDesignChange(updated as unknown as typeof manifest);
    } else {
      actions.handleDesignChange({ ...manifest, [field]: value });
    }
  }, [manifest, actions]);

  const handleHeroFontClick = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
    dispatch({ type: 'SET_CONTEXT_SECTION', section: 'typography' });
  }, [dispatch]);

  useEffect(() => {
    const cancelTimer = () => {
      if (heroLeaveTimerRef.current) { clearTimeout(heroLeaveTimerRef.current); heroLeaveTimerRef.current = null; }
    };
    const onHover = (e: Event) => { cancelTimer(); setHoveredHero((e as CustomEvent).detail); };
    const onKeep = () => cancelTimer();
    const onEnd = () => { heroLeaveTimerRef.current = setTimeout(() => setHoveredHero(null), 300); };
    window.addEventListener('pearloom-hero-hover', onHover);
    window.addEventListener('pearloom-hero-hover-keep', onKeep);
    window.addEventListener('pearloom-hero-hover-end', onEnd);
    return () => {
      window.removeEventListener('pearloom-hero-hover', onHover);
      window.removeEventListener('pearloom-hero-hover-keep', onKeep);
      window.removeEventListener('pearloom-hero-hover-end', onEnd);
      if (heroLeaveTimerRef.current) clearTimeout(heroLeaveTimerRef.current);
    };
  }, []);

  // ── Inline text format bar ────────────────────────────────
  const handleFormatChange = useCallback((path: string, format: TextFormat) => {
    handleTextEdit('__format:' + path, JSON.stringify(format));
  }, [handleTextEdit]);

  useEffect(() => {
    const onFocus = (e: Event) => {
      const { path, rect } = (e as CustomEvent).detail;
      if (path && rect) setFocusedTextField({ path, rect });
      else setFocusedTextField(null);
    };
    const onBlur = () => {
      // Brief delay so clicks on the format bar buttons register before it unmounts
      setTimeout(() => setFocusedTextField(null), 150);
    };
    window.addEventListener('pearloom-field-focus', onFocus);
    window.addEventListener('pearloom-field-blur', onBlur);
    return () => {
      window.removeEventListener('pearloom-field-focus', onFocus);
      window.removeEventListener('pearloom-field-blur', onBlur);
    };
  }, []);

  // ── Focal point overlay ─────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => setFocalPoint((e as CustomEvent).detail);
    window.addEventListener('pearloom-focal-point-start', handler);
    return () => window.removeEventListener('pearloom-focal-point-start', handler);
  }, []);

  // ── Chapter hover toolbar ────────────────────────────────
  useEffect(() => {
    const cancelTimer = () => {
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
    };
    const onHover = (e: Event) => {
      cancelTimer();
      setHoveredChapter((e as CustomEvent).detail);
    };
    const onHoverKeep = () => cancelTimer();
    const onHoverEnd = () => {
      hoverLeaveTimerRef.current = setTimeout(() => setHoveredChapter(null), 200);
    };
    window.addEventListener('pearloom-chapter-hover', onHover);
    window.addEventListener('pearloom-chapter-hover-keep', onHoverKeep);
    window.addEventListener('pearloom-chapter-hover-end', onHoverEnd);
    return () => {
      window.removeEventListener('pearloom-chapter-hover', onHover);
      window.removeEventListener('pearloom-chapter-hover-keep', onHoverKeep);
      window.removeEventListener('pearloom-chapter-hover-end', onHoverEnd);
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    };
  }, []);

  // ── Event card hover toolbar ────────────────────────────────
  useEffect(() => {
    const cancelTimer = () => {
      if (eventLeaveTimerRef.current) { clearTimeout(eventLeaveTimerRef.current); eventLeaveTimerRef.current = null; }
    };
    const onHover = (e: Event) => { cancelTimer(); setHoveredEvent((e as CustomEvent).detail); };
    const onKeep = () => cancelTimer();
    const onEnd = () => { eventLeaveTimerRef.current = setTimeout(() => setHoveredEvent(null), 200); };
    window.addEventListener('pearloom-event-hover', onHover);
    window.addEventListener('pearloom-event-hover-keep', onKeep);
    window.addEventListener('pearloom-event-hover-end', onEnd);
    return () => {
      window.removeEventListener('pearloom-event-hover', onHover);
      window.removeEventListener('pearloom-event-hover-keep', onKeep);
      window.removeEventListener('pearloom-event-hover-end', onEnd);
      if (eventLeaveTimerRef.current) clearTimeout(eventLeaveTimerRef.current);
    };
  }, []);

  // ── FAQ item hover toolbar ───────────────────────────────────
  useEffect(() => {
    const cancelTimer = () => {
      if (faqLeaveTimerRef.current) { clearTimeout(faqLeaveTimerRef.current); faqLeaveTimerRef.current = null; }
    };
    const onHover = (e: Event) => { cancelTimer(); setHoveredFaq((e as CustomEvent).detail); };
    const onKeep = () => cancelTimer();
    const onEnd = () => { faqLeaveTimerRef.current = setTimeout(() => setHoveredFaq(null), 200); };
    window.addEventListener('pearloom-faq-hover', onHover);
    window.addEventListener('pearloom-faq-hover-keep', onKeep);
    window.addEventListener('pearloom-faq-hover-end', onEnd);
    return () => {
      window.removeEventListener('pearloom-faq-hover', onHover);
      window.removeEventListener('pearloom-faq-hover-keep', onKeep);
      window.removeEventListener('pearloom-faq-hover-end', onEnd);
      if (faqLeaveTimerRef.current) clearTimeout(faqLeaveTimerRef.current);
    };
  }, []);

  // ── Sidebar sync on inline text edit focus ───────────────
  // When the user clicks into a text field on the canvas, route
  // the sidebar to the relevant panel (story chapter, events, etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const { chapterId, field, path } = (e as CustomEvent).detail as {
        chapterId: string | null; field: string | null; path: string | null;
      };
      if (chapterId) {
        dispatch({ type: 'SET_ACTIVE_ID', id: chapterId });
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
        return;
      }
      if (path?.startsWith('events.')) {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'details' });
        dispatch({ type: 'SET_CONTEXT_SECTION', section: 'events' });
        return;
      }
      if (path?.startsWith('poetry.') || field === 'heroTagline') {
        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' });
        dispatch({ type: 'SET_CONTEXT_SECTION', section: 'typography' });
        return;
      }
    };
    window.addEventListener('pearloom-field-focus', handler);
    return () => window.removeEventListener('pearloom-field-focus', handler);
  }, [dispatch]);

  // ── Block config popover open/close ──────────────────────
  useEffect(() => {
    const onOpen = (e: Event) => {
      const { blockId, rect } = (e as CustomEvent).detail ?? {};
      if (!blockId || !rect) return;
      setBlockConfigPopover({ blockId, rect });
    };
    const onClose = () => setBlockConfigPopover(null);
    window.addEventListener('pearloom-block-config-open', onOpen);
    window.addEventListener('pearloom-block-config-close', onClose);
    return () => {
      window.removeEventListener('pearloom-block-config-open', onOpen);
      window.removeEventListener('pearloom-block-config-close', onClose);
    };
  }, []);

  // ── Block drop → insert at position ──────────────────────
  const handleBlockDrop = useCallback((blockType: string, position: number) => {
    const blocks = manifest.blocks || [];
    const newBlock = {
      id: `block-${blockType}-${Date.now()}`,
      type: blockType as BlockType,
      order: position,
      visible: true,
    };
    const updated = [...blocks];
    updated.splice(position, 0, newBlock);
    const sorted = updated.map((b, i) => ({ ...b, order: i }));
    actions.handleDesignChange({ ...manifest, blocks: sorted });
  }, [manifest, actions]);

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--pl-cream-deep)',
      }}
    >
      {/* Device switcher moved to toolbar */}

      {/* AI text rewrite floating pill — shows on text selection */}
      <PearTextRewrite onTextEdit={handleTextEdit} />

      {/* Focal point drag overlay — activated on chapter image click */}
      {focalPoint && (
        <FocalPointOverlay
          chapterId={focalPoint.chapterId}
          rect={focalPoint.rect}
          currentX={focalPoint.x}
          currentY={focalPoint.y}
          onPositionChange={(x, y) =>
            actions.updateChapter(focalPoint.chapterId, { imagePosition: { x, y } })
          }
          onCommit={(x, y) => {
            actions.updateChapter(focalPoint.chapterId, { imagePosition: { x, y } });
            setFocalPoint(null);
          }}
          onClose={() => setFocalPoint(null)}
        />
      )}

      {/* Canvas chapter hover toolbar */}
      <AnimatePresence>
        {hoveredChapter && (
          <CanvasChapterToolbar
            key={hoveredChapter.chapterId}
            rect={hoveredChapter.rect}
            chapterIndex={hoveredChapter.chapterIndex}
            chapterCount={hoveredChapter.chapterCount}
            onAction={handleChapterToolbarAction}
          />
        )}
      </AnimatePresence>

      {/* Canvas event card hover toolbar */}
      <AnimatePresence>
        {hoveredEvent && (
          <CanvasEventToolbar
            key={hoveredEvent.eventId}
            rect={hoveredEvent.rect}
            eventIndex={hoveredEvent.eventIndex}
            eventCount={hoveredEvent.eventCount}
            onAction={handleEventToolbarAction}
          />
        )}
      </AnimatePresence>

      {/* Canvas FAQ item hover toolbar */}
      <AnimatePresence>
        {hoveredFaq && (
          <CanvasFaqToolbar
            key={hoveredFaq.faqId}
            rect={hoveredFaq.rect}
            faqIndex={hoveredFaq.faqIndex}
            faqCount={hoveredFaq.faqCount}
            onAction={handleFaqToolbarAction}
          />
        )}
      </AnimatePresence>

      {/* Canvas section hover toolbar (footer / nav) */}
      <AnimatePresence>
        {hoveredSection && (
          <CanvasSectionToolbar
            key={hoveredSection.section}
            rect={hoveredSection.rect}
            label={hoveredSection.label}
            keepEvent="pearloom-section-hover-keep"
            onAction={handleSectionToolbarAction}
          />
        )}
      </AnimatePresence>

      {/* Canvas registry card hover toolbar */}
      <AnimatePresence>
        {hoveredRegistry && (
          <CanvasRegistryToolbar
            key={hoveredRegistry.registryId}
            rect={hoveredRegistry.rect}
            registryIndex={hoveredRegistry.registryIndex}
            registryUrl={hoveredRegistry.registryId}
            onAction={handleRegistryToolbarAction}
          />
        )}
      </AnimatePresence>

      {/* Hero inline edit bar */}
      <AnimatePresence>
        {hoveredHero && (
          <CanvasHeroEditBar
            rect={hoveredHero.rect}
            manifest={manifest}
            canvasRef={canvasRef}
            onStyleChange={handleHeroStyleChange}
            onFontClick={handleHeroFontClick}
          />
        )}
      </AnimatePresence>

      {/* Inline text format bar — shows on contenteditable focus */}
      <AnimatePresence>
        {focusedTextField && canvasRef.current && (
          <CanvasInlineFormatBar
            key={focusedTextField.path}
            elementRect={focusedTextField.rect}
            canvasRect={canvasRef.current.getBoundingClientRect()}
            path={focusedTextField.path}
            format={manifest.textFormats?.[focusedTextField.path] ?? {}}
            onChange={handleFormatChange}
          />
        )}
      </AnimatePresence>

      {/* Block config popover — anchored to a selected block with a schema */}
      <AnimatePresence>
        {blockConfigPopover && (() => {
          const block = manifest.blocks?.find(b => b.id === blockConfigPopover.blockId);
          if (!block) return null;
          return (
            <BlockConfigPopover
              key={blockConfigPopover.blockId}
              block={block}
              rect={blockConfigPopover.rect}
              canvasRef={canvasRef}
              onTextEdit={handleTextEdit}
              onClose={() => setBlockConfigPopover(null)}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Canvas content — direct DOM rendering ── */}
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isFramed ? 'center' : undefined,
        padding: isFramed ? '80px 20px 20px' : '0',
        overflow: 'auto',
      }}>
        {isFramed ? (
          /* Device frame (tablet/phone) */
          <motion.div
            key={device}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{
              width: frameWidth, maxWidth: '100%',
              borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 12px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
              minHeight: isPhone ? 780 : 600,
              background: 'var(--pl-cream)',
            }}
          >
            <SiteRenderer
              manifest={manifest}
              names={coupleNames}
              onTextEdit={handleTextEdit}
              onSectionClick={handleSectionClick}
              onBlockDrop={handleBlockDrop}
              onBlockReorder={handleBlockReorder}
              onBlockCopy={handleBlockCopy}
              onBlockPaste={handleBlockPaste}
              onBlockAction={handleBlockAction}
              selectedBlockId={state.activeId}
              hasClipboard={!!clipboardBlock}
              editMode
            />
          </motion.div>
        ) : (
          /* Desktop — full bleed with zoom support, padded for toolbar */
          <div ref={scrollContainerRef} style={{
            width: '100%', height: '100%', overflow: 'auto',
            paddingTop: '40px',
            cursor: isPanning ? 'grab' : 'default',
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }}>
            <SiteRenderer
              manifest={manifest}
              names={coupleNames}
              onTextEdit={handleTextEdit}
              onSectionClick={handleSectionClick}
              onBlockDrop={handleBlockDrop}
              onBlockReorder={handleBlockReorder}
              onBlockCopy={handleBlockCopy}
              onBlockPaste={handleBlockPaste}
              onBlockAction={handleBlockAction}
              selectedBlockId={state.activeId}
              hasClipboard={!!clipboardBlock}
              editMode
            />
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, pointerEvents: 'none',
            padding: '6px 16px', borderRadius: '8px',
            background: 'rgba(250,247,242,0.92)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid #E4E4E7',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            fontSize: '0.65rem', fontWeight: 600, color: '#18181B',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {undoToast}
        </motion.div>
      )}

      {/* Pan mode indicator */}
      {isPanning && (
        <div style={{
          position: 'absolute', top: '56px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, padding: '4px 12px', borderRadius: '8px',
          background: '#18181B', color: 'white',
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Panning — release Space to stop
        </div>
      )}
    </div>
  );
}
