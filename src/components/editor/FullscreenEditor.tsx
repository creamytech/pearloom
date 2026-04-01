'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / FullscreenEditor.tsx — Composition root
// Orchestrates: EditorToolbar + Sidebar + Canvas + Mobile + Overlays
// All UI extracted to focused components. State in editor-state.ts.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Globe, Eye, Phone, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { PublishIcon } from '@/components/icons/EditorIcons';
import type { StoryManifest, Chapter } from '@/types';
import type { CommandAction } from './CommandPalette';

// ── Extracted components ──────────────────────────────────────
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { EditorSidebar } from './EditorSidebar';
import { StoryPanel } from './StoryPanel';
import { MobileEditorSheet } from './MobileEditorSheet';
import { WelcomeOverlay } from './WelcomeOverlay';
import { DraftBanner } from './DraftBanner';
import { CommandPalette } from './CommandPalette';
import { DesignPanel } from './DesignPanel';
import { EventsPanel } from './EventsPanel';
import { DetailsPanel } from './DetailsPanel';
import { PagesPanel } from './PagesPanel';
import { AIBlocksPanel } from './AIBlocksPanel';
import { VoiceTrainerPanel } from './VoiceTrainerPanel';
import { CanvasEditor } from './CanvasEditor';
import { AIEditorChat } from './AIEditorChat';
import { MessagingPanel } from '@/components/dashboard/MessagingPanel';
import { PostWeddingBanner } from './PostWeddingBanner';

// ── State ─────────────────────────────────────────────────────
import {
  EditorContext, editorReducer, createInitialEditorState,
  storePreview, stripArtForStorage,
  PREVIEW_KEY_PREFIX, AUTOSAVE_KEY,
  type EditorTab, type EditorActions,
} from '@/lib/editor-state';

interface FullscreenEditorProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  subdomain: string;
  onChange: (m: StoryManifest) => void;
  onPublish?: () => void;
  onExit: () => void;
}

export function FullscreenEditor({ manifest, coupleNames, subdomain: initialSubdomain, onChange, onPublish, onExit }: FullscreenEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => createInitialEditorState(manifest, initialSubdomain));
  const [previewKey] = useState(() => `${PREVIEW_KEY_PREFIX}-${Date.now()}`);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentPanelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabScrollPositions = useRef<Record<string, number>>({});
  const preDragSplitView = useRef(false);
  const hintShownRef = useRef(false);

  // ── History ──────────────────────────────────────────────────
  const historyRef = useRef<StoryManifest[]>([manifest]);
  const historyIndexRef = useRef(0);

  // Stable refs for keyboard handler
  const activeIdRef = useRef(state.activeId);
  const chaptersRef = useRef(state.chapters);
  const pushToPreviewRef = useRef<(m: StoryManifest) => void>(() => {});
  useEffect(() => { activeIdRef.current = state.activeId; }, [state.activeId]);
  useEffect(() => { chaptersRef.current = state.chapters; }, [state.chapters]);

  // ── Mobile detection ─────────────────────────────────────────
  useEffect(() => {
    const check = () => dispatch({ type: 'SET_MOBILE', isMobile: window.innerWidth < 768 });
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Sync chapters when manifest.chapters changes from parent ─
  useEffect(() => {
    const sorted = [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    dispatch({ type: 'SET_CHAPTERS', chapters: sorted });
    dispatch({ type: 'SET_ACTIVE_ID', id: (() => {
      const ids = new Set((manifest.chapters || []).map(c => c.id));
      return ids.has(state.activeId ?? '') ? state.activeId : manifest.chapters?.[0]?.id || null;
    })() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.chapters]);

  // ── Auto-dismiss welcome ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'SET_WELCOME', show: false }), 2500);
    return () => clearTimeout(t);
  }, []);

  // ── Preview timeout ──────────────────────────────────────────
  useEffect(() => {
    if (state.iframeReady) return;
    const t = setTimeout(() => dispatch({ type: 'SET_PREVIEW_SLOW', slow: true }), 8000);
    return () => clearTimeout(t);
  }, [state.iframeReady]);

  // ── Split view hint ──────────────────────────────────────────
  useEffect(() => {
    if (state.splitView && !hintShownRef.current) {
      hintShownRef.current = true;
      dispatch({ type: 'SET_HINT', show: true });
      const t = setTimeout(() => dispatch({ type: 'SET_HINT', show: false }), 4000);
      return () => clearTimeout(t);
    }
  }, [state.splitView]);

  // ── Seed sessionStorage on mount ─────────────────────────────
  useEffect(() => {
    try { storePreview(previewKey, manifest, coupleNames); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Warn before tab close ────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.isDirty]);

  // ── History helpers ──────────────────────────────────────────
  const pushHistory = useCallback((m: StoryManifest) => {
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    stack.push(m);
    if (stack.length > 50) stack.shift();
    historyRef.current = stack;
    historyIndexRef.current = stack.length - 1;
    dispatch({ type: 'SET_CAN_UNDO', can: stack.length > 1 });
    dispatch({ type: 'SET_CAN_REDO', can: false });
  }, []);

  // ── Push to preview (debounced) ──────────────────────────────
  const pushToPreview = useCallback((m: StoryManifest) => {
    dispatch({ type: 'SET_SAVE_STATE', state: 'unsaved' });
    dispatch({ type: 'SET_DIRTY', dirty: true });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        storePreview(previewKey, m, coupleNames);
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'pearloom-preview-update',
            manifest: stripArtForStorage(m),
            names: coupleNames,
          }, '*');
        }
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: 'saved' }), 2500);
      } catch {}
    }, 600);
  }, [previewKey, coupleNames]);

  useEffect(() => { pushToPreviewRef.current = pushToPreview; }, [pushToPreview]);

  // Initial preview push
  useEffect(() => {
    try { storePreview(previewKey, manifest, coupleNames); } catch {}
    pushToPreview(manifest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    onChange(prev);
    pushToPreview(prev);
    dispatch({ type: 'SET_CAN_UNDO', can: historyIndexRef.current > 0 });
    dispatch({ type: 'SET_CAN_REDO', can: true });
  }, [onChange, pushToPreview]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    onChange(next);
    pushToPreview(next);
    dispatch({ type: 'SET_CAN_UNDO', can: true });
    dispatch({ type: 'SET_CAN_REDO', can: historyIndexRef.current < historyRef.current.length - 1 });
  }, [onChange, pushToPreview]);

  // ── Core actions ─────────────────────────────────────────────
  const syncManifest = useCallback((newChapters: Chapter[]) => {
    const m = { ...manifest, chapters: newChapters.map((ch, i) => ({ ...ch, order: i })) };
    pushHistory(m);
    onChange(m);
    pushToPreview(m);
  }, [manifest, onChange, pushToPreview, pushHistory]);

  const updateChapter = useCallback((id: string, data: Partial<Chapter>) => {
    const next = state.chapters.map(ch => ch.id === id ? { ...ch, ...data } : ch);
    dispatch({ type: 'SET_CHAPTERS', chapters: next });
    syncManifest(next);
  }, [state.chapters, syncManifest]);

  const deleteChapter = useCallback((id: string) => {
    const next = state.chapters.filter(ch => ch.id !== id);
    dispatch({ type: 'SET_CHAPTERS', chapters: next });
    if (state.activeId === id) dispatch({ type: 'SET_ACTIVE_ID', id: next[0]?.id || null });
    syncManifest(next);
  }, [state.chapters, state.activeId, syncManifest]);

  const addChapter = useCallback(() => {
    const id = `ch-${Date.now()}`;
    const newCh: Chapter = {
      id, date: new Date().toISOString(), title: 'New Chapter',
      subtitle: 'Add your subtitle', description: 'Write your story here…',
      images: [], location: null, mood: 'romantic', order: state.chapters.length,
    };
    const next = [...state.chapters, newCh];
    dispatch({ type: 'SET_CHAPTERS', chapters: next });
    dispatch({ type: 'SET_ACTIVE_ID', id });
    syncManifest(next);
  }, [state.chapters, syncManifest]);

  const handleDesignChange = useCallback((m: StoryManifest) => {
    pushHistory(m);
    onChange(m);
    pushToPreview(m);
  }, [onChange, pushToPreview, pushHistory]);

  const handleChatManifestUpdate = useCallback((updates: Partial<StoryManifest>) => {
    const next = { ...manifest, ...updates };
    pushHistory(next);
    onChange(next);
    pushToPreview(next);
  }, [manifest, onChange, pushToPreview, pushHistory]);

  const handleReorder = useCallback((newOrder: Chapter[]) => {
    dispatch({ type: 'SET_CHAPTERS', chapters: newOrder });
    syncManifest(newOrder);
  }, [syncManifest]);

  const handleTabChange = useCallback((newTab: EditorTab) => {
    if (contentPanelRef.current) {
      tabScrollPositions.current[state.activeTab] = contentPanelRef.current.scrollTop;
    }
    dispatch({ type: 'SET_ACTIVE_TAB', tab: newTab });
    setTimeout(() => {
      if (contentPanelRef.current) {
        contentPanelRef.current.scrollTop = tabScrollPositions.current[newTab] || 0;
      }
    }, 0);
  }, [state.activeTab]);

  const storePreviewForOpen = useCallback(() => {
    storePreview(previewKey, manifest, coupleNames);
    window.open(`/preview?key=${previewKey}`, '_blank');
  }, [previewKey, manifest, coupleNames]);

  const handleCommandAction = useCallback((action: CommandAction) => {
    switch (action.type) {
      case 'tab':    handleTabChange(action.tab); break;
      case 'device': dispatch({ type: 'SET_DEVICE', device: action.mode }); break;
      case 'chapter': dispatch({ type: 'SET_ACTIVE_ID', id: action.id }); dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' }); break;
      case 'add-chapter': addChapter(); break;
      case 'preview': storePreviewForOpen(); break;
      case 'publish': dispatch({ type: 'OPEN_PUBLISH' }); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
    }
  }, [addChapter, handleTabChange, storePreviewForOpen, undo, redo]);

  // ── AI Rewrite ───────────────────────────────────────────────
  const handleAIRewrite = useCallback(async (id: string) => {
    const ch = state.chapters.find(c => c.id === id);
    if (!ch) return;
    dispatch({ type: 'SET_REWRITING', id });
    try {
      const res = await fetch('/api/generate-block', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Rewrite this ${manifest.occasion || 'wedding'} chapter with fresh, intimate, specific language. Keep the same emotional theme but use richer storytelling.\n\nCurrent title: "${ch.title}"\nCurrent story: "${ch.description}"\nMood: ${ch.mood || 'romantic'}\nVibe: ${manifest.vibeString || ''}\nOccasion: ${manifest.occasion || 'wedding'}\n\nReturn JSON with: title, subtitle, description, mood`,
          systemPrompt: `You are a storytelling AI for Pearloom ${manifest.occasion || 'wedding'} websites. Write in a warm, cinematic, intimate voice appropriate for this type of life event. Return ONLY valid JSON with keys: title, subtitle, description, mood.`,
        }),
      });
      if (res.ok) {
        const { block } = await res.json();
        if (block && (block.title || block.description)) {
          updateChapter(id, {
            title: block.title || ch.title, subtitle: block.subtitle || ch.subtitle,
            description: block.description || ch.description, mood: block.mood || ch.mood,
          });
        } else {
          dispatch({ type: 'SET_REWRITE_ERROR', error: 'Rewrite returned no content — try again' });
          setTimeout(() => dispatch({ type: 'SET_REWRITE_ERROR', error: null }), 4000);
        }
      } else {
        dispatch({ type: 'SET_REWRITE_ERROR', error: 'Rewrite failed — please try again' });
        setTimeout(() => dispatch({ type: 'SET_REWRITE_ERROR', error: null }), 4000);
      }
    } catch (e) {
      console.error('AI rewrite failed:', e);
      dispatch({ type: 'SET_REWRITE_ERROR', error: 'Rewrite failed — please try again' });
      setTimeout(() => dispatch({ type: 'SET_REWRITE_ERROR', error: null }), 4000);
    } finally {
      dispatch({ type: 'SET_REWRITING', id: null });
    }
  }, [state.chapters, manifest, updateChapter]);

  // ── Publish ──────────────────────────────────────────────────
  const handlePublishSubmit = useCallback(async () => {
    const target = state.subdomain.trim();
    if (!target) return dispatch({ type: 'SET_PUBLISH_ERROR', error: 'Please enter a URL.' });
    dispatch({ type: 'SET_PUBLISH_ERROR', error: null });
    dispatch({ type: 'SET_PUBLISHING', publishing: true });
    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: target,
          manifest: { ...manifest, chapters: state.chapters.map((ch, i) => ({ ...ch, order: i })) },
          names: coupleNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      dispatch({ type: 'MARK_PUBLISHED', url: data.url });
      onPublish?.();
    } catch (err) {
      dispatch({ type: 'SET_PUBLISH_ERROR', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      dispatch({ type: 'SET_PUBLISHING', publishing: false });
    }
  }, [state.subdomain, state.chapters, manifest, coupleNames, onPublish]);

  // ── Draft recovery ───────────────────────────────────────────
  const DRAFT_DISMISSED_KEY = `pearloom-draft-dismissed-${state.subdomain}`;
  const [recoveredDraft, setRecoveredDraft] = useState<StoryManifest | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DRAFT_DISMISSED_KEY)) return;
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const saved: { manifest: StoryManifest; savedAt: number } = JSON.parse(raw);
      const propTime = manifest.generatedAt ? new Date(manifest.generatedAt).getTime() : 0;
      if (saved.savedAt > propTime) {
        setRecoveredDraft(saved.manifest);
        dispatch({ type: 'SET_DRAFT_BANNER', state: 'visible' });
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ manifest, savedAt: Date.now() })); } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [manifest]);

  const handleRestoreDraft = useCallback(() => {
    if (!recoveredDraft) return;
    onChange(recoveredDraft);
    pushToPreview(recoveredDraft);
    pushHistory(recoveredDraft);
    dispatch({ type: 'SET_DRAFT_BANNER', state: 'hidden' });
    setRecoveredDraft(null);
  }, [recoveredDraft, onChange, pushToPreview, pushHistory]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  const TAB_KEYS: Record<string, EditorTab> = { '1': 'story', '2': 'events', '3': 'design', '4': 'details', '5': 'pages', '6': 'blocks', '7': 'voice', '8': 'canvas' };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') { e.preventDefault(); dispatch({ type: 'TOGGLE_CMD_PALETTE' }); return; }
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return; }
      if (mod && e.key === 'y') { e.preventDefault(); redo(); return; }
      if (mod && e.key === '\\') { e.preventDefault(); dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' }); return; }
      // Cmd+P — preview in new tab
      if (mod && e.key === 'p') { e.preventDefault(); storePreviewForOpen(); return; }
      // Cmd+S — mark as saved
      if (mod && e.key === 's') {
        e.preventDefault();
        try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ manifest, savedAt: Date.now() })); } catch {}
        dispatch({ type: 'SET_SAVE_STATE', state: 'saved' });
        return;
      }
      // Cmd+1-8 — switch tabs
      if (mod && TAB_KEYS[e.key]) { e.preventDefault(); handleTabChange(TAB_KEYS[e.key]); return; }
      // Escape — close modals/sheets
      if (e.key === 'Escape') {
        if (state.cmdPaletteOpen) { dispatch({ type: 'SET_CMD_PALETTE', open: false }); return; }
        if (state.showPublish) { dispatch({ type: 'SET_SHOW_PUBLISH', show: false }); return; }
        if (state.mobileSheetOpen) { dispatch({ type: 'SET_MOBILE_SHEET', open: false }); return; }
      }
      // Cmd+D — duplicate active chapter
      if (mod && e.key === 'd') {
        e.preventDefault();
        const id = activeIdRef.current;
        const chs = chaptersRef.current;
        if (!id) return;
        const original = chs.find(c => c.id === id);
        if (!original) return;
        const copyId = `ch-${Date.now()}`;
        const copy: Chapter = { ...original, id: copyId, title: `${original.title} (copy)`, order: (original.order ?? 0) + 0.5 };
        const next = [...chs, copy].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        dispatch({ type: 'SET_CHAPTERS', chapters: next });
        dispatch({ type: 'SET_ACTIVE_ID', id: copyId });
        const newManifest = { ...manifest, chapters: next.map((ch, i) => ({ ...ch, order: i })) };
        pushHistory(newManifest);
        onChange(newManifest);
        pushToPreviewRef.current(newManifest);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, manifest, pushHistory, onChange, storePreviewForOpen, handleTabChange, state.cmdPaletteOpen, state.showPublish, state.mobileSheetOpen]);

  // ── Drag and drop ────────────────────────────────────────────
  const canvasDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
  );

  const handleCanvasDragStart = useCallback((e: DragStartEvent) => {
    const data = e.active.data.current as { type: string; id: string; label: string } | undefined;
    dispatch({ type: 'SET_CANVAS_DRAG', id: String(e.active.id), label: data?.label || '' });
    if (!state.isMobile) {
      preDragSplitView.current = state.splitView;
      dispatch({ type: 'SET_SPLIT_VIEW', split: true });
    }
  }, [state.isMobile, state.splitView]);

  const handleCanvasDragEnd = useCallback((e: DragEndEvent) => {
    dispatch({ type: 'SET_CANVAS_DRAG', id: null });
    if (!state.isMobile) dispatch({ type: 'SET_SPLIT_VIEW', split: preDragSplitView.current });
    const { over, active } = e;
    if (!over) return;
    const dropId = String(over.id);
    const activeData = active.data.current as { type: string; id: string } | undefined;
    const match = dropId.match(/^drop:(after|before):(\d+)$/);
    if (!match) return;
    const [, position, idxStr] = match;
    const targetIndex = parseInt(idxStr, 10) + (position === 'after' ? 1 : 0);

    if (activeData?.type === 'chapter') {
      const chapterId = activeData.id;
      const current = state.chapters.findIndex(c => c.id === chapterId);
      if (current === -1) return;
      const newOrder = [...state.chapters];
      const [moved] = newOrder.splice(current, 1);
      const insertAt = current < targetIndex ? targetIndex - 1 : targetIndex;
      newOrder.splice(Math.max(0, insertAt), 0, moved);
      dispatch({ type: 'SET_CHAPTERS', chapters: newOrder });
      syncManifest(newOrder);
    } else if (activeData?.type === 'block') {
      const layout = activeData.id.replace('block:', '') as Chapter['layout'];
      const newId = `ch-${Date.now()}`;
      const newCh: Chapter = {
        id: newId, title: 'New Chapter', subtitle: '', description: 'Add your story here...',
        date: new Date().toISOString().slice(0, 10), images: [], location: null,
        mood: 'golden hour', layout, order: targetIndex,
      };
      const newOrder = [...state.chapters];
      newOrder.splice(targetIndex, 0, newCh);
      dispatch({ type: 'SET_CHAPTERS', chapters: newOrder });
      syncManifest(newOrder);
      dispatch({ type: 'SET_ACTIVE_ID', id: newId });
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' });
    }
  }, [state.chapters, state.isMobile, syncManifest]);

  // ── Assemble actions for context ─────────────────────────────
  const actions: EditorActions = {
    updateChapter, deleteChapter, addChapter, handleReorder,
    syncManifest, handleDesignChange, handleChatManifestUpdate,
    undo, redo, pushHistory, pushToPreview,
    handleTabChange, handleCommandAction,
    handleAIRewrite, handlePublishSubmit, handleRestoreDraft,
    storePreviewForOpen,
  };

  const contextValue = {
    state, dispatch, actions, manifest, coupleNames,
    previewKey, iframeRef, contentPanelRef,
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <EditorContext.Provider value={contextValue}>
    <DndContext
      sensors={canvasDragSensors}
      onDragStart={handleCanvasDragStart}
      onDragEnd={handleCanvasDragEnd}
    >
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: 'var(--eg-dark-2, #3D3530)', fontFamily: 'var(--eg-font-body, Lora, Georgia, serif)',
    }}>
      {/* Command Palette */}
      <CommandPalette
        open={state.cmdPaletteOpen}
        onClose={() => dispatch({ type: 'SET_CMD_PALETTE', open: false })}
        onAction={handleCommandAction}
        chapters={state.chapters.map(c => ({ id: c.id, title: c.title || '' }))}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
      />

      {/* Draft Recovery Banner */}
      {state.draftBanner === 'visible' && (
        <DraftBanner
          onRestore={handleRestoreDraft}
          onDismiss={() => {
            try { localStorage.setItem(DRAFT_DISMISSED_KEY, '1'); } catch {}
            dispatch({ type: 'SET_DRAFT_BANNER', state: 'hidden' });
          }}
        />
      )}

      {/* Top Bar */}
      <EditorToolbar onExit={onExit} />

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        {!state.isMobile && (
          <EditorSidebar
            activeTab={state.activeTab}
            onTabChange={handleTabChange}
            width={state.sidebarWidth}
            onWidthChange={(w) => dispatch({ type: 'SET_SIDEBAR_WIDTH', width: w })}
            collapsed={state.sidebarCollapsed}
            onCollapsedChange={(c) => dispatch({ type: 'SET_SIDEBAR_COLLAPSED', collapsed: c })}
            contentRef={contentPanelRef}
            footer={
              <div style={{ padding: '10px 12px', display: 'flex', gap: '8px' }}>
                <motion.button
                  onClick={storePreviewForOpen}
                  whileHover={{ scale: 1.04, backgroundColor: 'rgba(163,177,138,0.1)', color: '#fff' }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '9px 10px', borderRadius: '8px',
                    border: '1px solid rgba(163,177,138,0.4)',
                    background: 'transparent', color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    whiteSpace: 'nowrap', minHeight: '38px',
                  }}
                >
                  <Eye size={12} /> Preview
                </motion.button>
                <motion.button
                  onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
                  whileHover={{ scale: 1.06, boxShadow: '0 6px 20px rgba(163,177,138,0.55)', y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '9px 10px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
                    color: '#F5F1E8', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(163,177,138,0.35)',
                    whiteSpace: 'nowrap', minHeight: '38px',
                  }}
                >
                  <Globe size={12} /> Publish
                </motion.button>
              </div>
            }
          >
            {/* Tab content */}
            {state.activeTab === 'story' && <StoryPanel />}

            <AnimatePresence mode="wait">
              {state.activeTab === 'design' && (
                <motion.div key="design" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <DesignPanel manifest={manifest} onChange={handleDesignChange} />
                </motion.div>
              )}
              {state.activeTab === 'events' && (
                <motion.div key="events" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <EventsPanel manifest={manifest} onChange={handleDesignChange} />
                </motion.div>
              )}
              {state.activeTab === 'details' && (
                <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <DetailsPanel manifest={manifest} onChange={handleDesignChange} subdomain={state.subdomain} />
                </motion.div>
              )}
              {state.activeTab === 'pages' && (
                <motion.div key="pages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <PagesPanel
                    manifest={manifest}
                    subdomain={state.subdomain}
                    onChange={handleDesignChange}
                    previewPage={state.previewPage}
                    onPreviewPage={(slug) => dispatch({ type: 'SET_PREVIEW_PAGE', page: slug })}
                  />
                </motion.div>
              )}
              {state.activeTab === 'blocks' && (
                <motion.div key="blocks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <AIBlocksPanel manifest={manifest} coupleNames={coupleNames} onChange={(m) => { onChange(m); pushToPreview(m); }} />
                </motion.div>
              )}
            </AnimatePresence>

            {state.activeTab === 'voice' && (
              <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                <div style={{ padding: '4px 0' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)' }}>AI Voice Training</span>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: 1.5 }}>Teach the chatbot to speak like you.</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                    <VoiceTrainerPanel
                      voiceSamples={manifest.voiceSamples || []}
                      onChange={(samples) => { const updated = { ...manifest, voiceSamples: samples }; onChange(updated); pushToPreview(updated); }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {state.activeTab === 'canvas' && (
              <CanvasEditor manifest={manifest} onChange={(m) => { onChange(m); }} pushToPreview={pushToPreview} />
            )}

            {state.activeTab === 'messaging' && (
              <MessagingPanel
                manifest={manifest}
                siteId={state.subdomain}
                subdomain={state.subdomain}
              />
            )}
          </EditorSidebar>
        )}

        {/* Center Canvas + Post-Wedding Banner */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!state.isMobile && (
            <PostWeddingBanner
              manifest={manifest}
              subdomain={state.subdomain}
              onUpdate={(m) => { onChange(m); pushToPreview(m); }}
            />
          )}
          <EditorCanvas />
        </div>
      </div>

      {/* Mobile */}
      {state.isMobile && <MobileEditorSheet />}

      {/* Toasts */}
      <AnimatePresence>
        {state.showHint && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}
            style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1500, pointerEvents: 'none', background: 'rgba(20,18,16,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(163,177,138,0.3)', borderRadius: '100px', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' } as React.CSSProperties}>
            <span style={{ fontSize: '14px' }}>👆</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>Click any section in the preview to jump to it</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {state.rewriteError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}
            style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1500, pointerEvents: 'none', background: 'rgba(40,10,10,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '100px', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' } as React.CSSProperties}>
            <span style={{ fontSize: '14px' }}>⚠</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(248,113,113,0.9)', whiteSpace: 'nowrap' }}>{state.rewriteError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 100px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Publish Modal */}
      <PublishModalInline />

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {state.canvasDragId && (
          <div style={{ padding: '10px 14px', background: 'var(--eg-accent, #A3B18A)', color: '#F5F1E8', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '1.2rem' }}>{state.canvasDragId.startsWith('chapter:') ? '⌖' : '✦'}</span>
            {state.canvasDragLabel}
          </div>
        )}
      </DragOverlay>

      {/* AI Chat */}
      <AIEditorChat manifest={manifest} activeChapterId={state.activeId} onUpdateChapter={updateChapter} onUpdateManifest={handleChatManifestUpdate} />

      {/* Welcome */}
      <AnimatePresence>
        {state.showWelcome && <WelcomeOverlay onDismiss={() => dispatch({ type: 'SET_WELCOME', show: false })} />}
      </AnimatePresence>
    </div>
    </DndContext>
    </EditorContext.Provider>
  );
}

// ── Inline Publish Modal (uses context) ────────────────────────
import { Loader2 } from 'lucide-react';

function PublishModalInline() {
  const { state, dispatch, actions, manifest, coupleNames } = useEditor();
  const { showPublish, publishedUrl, publishError, isPublishing, subdomain } = state;
  const [shareCopied, setShareCopied] = useState(false);

  const accent = manifest?.theme?.colors?.accent || '#A3B18A';
  const displayNames = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'Our Site';
  const shareMsg = publishedUrl
    ? `You're invited! View ${displayNames}'s site: ${publishedUrl}`
    : '';
  const rsvpUrl = publishedUrl ? `${publishedUrl}#rsvp` : '';

  const handleCopyLink = () => {
    if (!publishedUrl) return;
    navigator.clipboard?.writeText(publishedUrl).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (!showPublish) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'calc(2rem + env(safe-area-inset-top, 0px)) 2rem calc(2rem + env(safe-area-inset-bottom, 0px))',
        } as React.CSSProperties}
        onClick={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: false })}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(160deg, #3d3530 0%, #312b26 100%)',
            borderRadius: '16px 16px 36px 36px', padding: '2.5rem', maxWidth: '460px', width: '100%',
            boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07) inset',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '200px', borderRadius: '50%',
            background: publishedUrl ? 'radial-gradient(circle, rgba(163,177,138,0.18) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(163,177,138,0.08) 0%, transparent 70%)',
            pointerEvents: 'none', transition: 'background 0.6s',
          }} />
          <AnimatePresence mode="wait">
            {publishedUrl ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.05 }}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(163,177,138,0.15)', border: '1px solid rgba(163,177,138,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(163,177,138,0.2)' }}>
                  <Globe size={26} color="var(--eg-accent, #A3B18A)" />
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                  It&apos;s Live.
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  style={{ color: 'rgba(255,255,255,0.48)', margin: 0, fontSize: '0.9rem' }}>Your story is now live at:</motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  style={{ width: '100%', position: 'relative' }}>
                  <code style={{ display: 'block', background: 'rgba(163,177,138,0.1)', border: '1px solid rgba(163,177,138,0.2)', padding: '0.65rem 2.8rem 0.65rem 1.2rem', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--eg-accent, #A3B18A)', wordBreak: 'break-all', textAlign: 'left' }}>
                    {publishedUrl}
                  </code>
                  <motion.button onClick={() => navigator.clipboard?.writeText(publishedUrl!).catch(() => {})} title="Copy link"
                    whileHover={{ scale: 1.15, color: '#A3B18A' }} whileTap={{ scale: 0.88 }}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(163,177,138,0.55)', padding: '4px', display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </motion.button>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
                  style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
                  <motion.a href={publishedUrl!} target="_blank" rel="noreferrer"
                    whileHover={{ scale: 1.04, boxShadow: '0 6px 22px rgba(163,177,138,0.45)' }} whileTap={{ scale: 0.95 }}
                    style={{ flex: 1, padding: '0.9rem', borderRadius: '10px 10px 10px 10px', background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)', color: 'var(--eg-bg, #F5F1E8)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', display: 'block', boxShadow: '0 3px 12px rgba(163,177,138,0.35)' }}>
                    Open Site →
                  </motion.a>
                  <motion.button onClick={() => { dispatch({ type: 'SET_SHOW_PUBLISH', show: false }); }}
                    whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.95 }}
                    style={{ flex: 1, padding: '0.9rem', borderRadius: '10px 10px 10px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    Dashboard
                  </motion.button>
                </motion.div>

                {/* ── Share with guests ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
                  style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '0.75rem', textAlign: 'left' }}>
                    Share with guests
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* iMessage / SMS */}
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={() => { if (shareMsg) window.location.href = `sms:?body=${encodeURIComponent(shareMsg)}`; }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', borderRadius: '100px', background: 'rgba(163,177,138,0.15)', border: '1px solid rgba(163,177,138,0.25)', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                      <Phone size={13} /> iMessage
                    </motion.button>
                    {/* WhatsApp */}
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={() => { if (shareMsg) window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                      <MessageCircle size={13} /> WhatsApp
                    </motion.button>
                    {/* Email */}
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={() => { if (publishedUrl) window.open(`mailto:?subject=${encodeURIComponent(`You're invited — ${displayNames}`)}&body=${encodeURIComponent(`View our site:\n${publishedUrl}`)}`); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                      <Mail size={13} /> Email
                    </motion.button>
                    {/* Copy link */}
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={handleCopyLink}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', borderRadius: '100px', background: shareCopied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: shareCopied ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.1)', color: shareCopied ? '#4ade80' : 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}>
                      {shareCopied ? <Check size={13} /> : <Copy size={13} />}
                      {shareCopied ? 'Copied!' : 'Copy Link'}
                    </motion.button>
                  </div>
                  {/* RSVP link hint */}
                  {rsvpUrl && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', textAlign: 'left' }}>
                      RSVP link: <span style={{ color: 'rgba(163,177,138,0.7)', fontFamily: 'ui-monospace, monospace' }}>{rsvpUrl}</span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div key="url-picker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Choose Your URL</h2>
                <p style={{ color: 'rgba(255,255,255,0.42)', marginBottom: '2rem', fontSize: '0.88rem' }}>Customize your site address — you can change it anytime.</p>
                {publishError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(185,28,28,0.14)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ flexShrink: 0 }}>⚠</span><span>{publishError}</span>
                  </motion.div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.2) inset' }}>
                  <input value={subdomain} onChange={e => dispatch({ type: 'SET_SUBDOMAIN', subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="shauna-and-ben" disabled={isPublishing} autoFocus
                    style={{ flex: 1, padding: '0.9rem 1rem', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.95rem', fontFamily: 'inherit' }} />
                  <div style={{ padding: '0.9rem 1rem', color: 'rgba(255,255,255,0.28)', fontSize: '0.82rem', borderLeft: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.03)' }}>.pearloom.com</div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <motion.button onClick={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: false })} disabled={isPublishing}
                    whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.95 }}
                    style={{ flex: 1, padding: '0.9rem', borderRadius: '10px 10px 22px 22px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                    Cancel
                  </motion.button>
                  <motion.button onClick={actions.handlePublishSubmit} disabled={isPublishing || !subdomain}
                    whileHover={!isPublishing && subdomain ? { scale: 1.04, boxShadow: '0 6px 24px rgba(163,177,138,0.5)' } : {}}
                    whileTap={!isPublishing && subdomain ? { scale: 0.95 } : {}}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.9rem', borderRadius: '10px 10px 22px 22px', background: 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)', color: 'var(--eg-bg, #F5F1E8)', border: 'none', cursor: isPublishing || !subdomain ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.88rem', opacity: isPublishing || !subdomain ? 0.65 : 1, boxShadow: '0 3px 12px rgba(163,177,138,0.3)' }}>
                    {isPublishing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</> : <><Globe size={14} /> Publish Site</>}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Need useEditor import for PublishModalInline
import { useEditor } from '@/lib/editor-state';
