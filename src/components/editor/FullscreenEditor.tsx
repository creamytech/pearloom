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
import { Globe, Mail, Copy, Check, Phone, MessageCircle } from 'lucide-react';
import type { StoryManifest, Chapter, BlockType } from '@/types';
import type { CommandAction } from './CommandPalette';

// ── Extracted components ──────────────────────────────────────
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { EditorWing } from './EditorWing';
import { EditorRail } from './EditorRail';
import { EditorStatusBar } from './EditorStatusBar';
import { FloatingToolbar } from './FloatingToolbar';
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
import { AICommandBar } from './AICommandBar';
import { GuestMessagingPanel } from './GuestMessagingPanel';
import { PostWeddingBanner } from './PostWeddingBanner';
import { AnalyticsDashboardPanel } from './AnalyticsDashboardPanel';
import { GuestSearchPanel } from './GuestSearchPanel';
import { BulkInvitePanel } from './BulkInvitePanel';
import { SeatingEditorPanel } from './SeatingEditorPanel';
import { TranslationPanel } from './TranslationPanel';
import { GuestsLifecyclePanel } from './GuestsLifecyclePanel';
import { ThankYouPanel } from './ThankYouPanel';
import { SpotifyPanel } from './SpotifyPanel';
import { AnniversaryNudgePanel } from './AnniversaryNudgePanel';
import { VendorPanel } from './VendorPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { BlockConfigEditor } from './BlockConfigEditor';
import { BlockStyleEditor } from './BlockStyleEditor';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { BlockLibraryDrawer } from './BlockLibraryDrawer';
import { CustomCSSEditor } from './CustomCSSEditor';
import { CustomizationPanel } from './CustomizationPanel';
import { ComponentLibrary } from './ComponentLibrary';
import { ActiveCuratorBadge } from '@/components/dashboard/CuratorAICard';
import { trackPublish, trackEdit } from '@/lib/intelligence';
import { WeddingPartyEditor } from './WeddingPartyEditor';
import { EditorTour } from './EditorTour';
import { GettingStartedChecklist } from './GettingStartedChecklist';
import { InlineStoryLayoutSwitcher } from './InlineStoryLayoutSwitcher';
import { PearPublishAudit } from './PearPublishAudit';
import {
  duplicateBlock, deleteBlock, moveBlockUp, moveBlockDown,
  setBlockStyle, saveSnapshot, parseElementId,
  mapKeyToAction, applyBlockAction, type BlockStyleOverrides,
} from '@/lib/block-engine';
import { makeId } from '@/lib/editor-ids';
import { logEditorError } from '@/lib/editor-log';
import { writeClipboardText } from '@/lib/clipboard';

// ── State ─────────────────────────────────────────────────────
import {
  EditorContext, editorReducer, createInitialEditorState,
  storePreview, stripArtForStorage,
  PREVIEW_KEY_PREFIX, AUTOSAVE_KEY,
  useEditor, DESIGN_COALESCE_MS,
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
  // Panel open/collapsed lives in editor state (sidebarCollapsed) so the
  // toolbar and keyboard shortcuts can toggle it without prop drilling.
  const panelOpen = !state.sidebarCollapsed;
  // previewKey + iframeRef kept for mobile editor sheet + external preview window
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentPanelRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewriteControllerRef = useRef<AbortController | null>(null);
  const tabScrollPositions = useRef<Record<string, number>>({});
  const preDragSplitView = useRef(false);
  const hintShownRef = useRef(false);
  const [showPublishAudit, setShowPublishAudit] = useState(false);
  const auditPassedRef = useRef(false);
  // Block library drawer — persistent left palette for drag-to-canvas.
  const [blockLibraryOpen, setBlockLibraryOpen] = useState(false);
  // Lightweight transient info toast (used by ⌘S, copy/paste block, etc.)
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const infoToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showInfoToast = useCallback((msg: string, ms = 2200) => {
    if (infoToastTimerRef.current) clearTimeout(infoToastTimerRef.current);
    setInfoToast(msg);
    infoToastTimerRef.current = setTimeout(() => setInfoToast(null), ms);
  }, []);
  // In-memory clipboard for copy/paste block shortcuts (item 70)
  const blockClipboardRef = useRef<{ type: string; config?: Record<string, unknown>; visible?: boolean } | null>(null);


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
    const check = () => dispatch({ type: 'SET_MOBILE', isMobile: window.innerWidth < 640 });
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Item 101: previewZoom persistence (localStorage) ─────────
  // Hydrate on mount, save on change. Keep zoom between 0.25 and 2.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pl-editor-preview-zoom');
      if (raw) {
        const z = parseFloat(raw);
        if (!Number.isNaN(z) && z >= 0.25 && z <= 2) {
          dispatch({ type: 'SET_PREVIEW_ZOOM', zoom: z });
        }
      }
    } catch (err) {
      logEditorError('FullscreenEditor: hydrate preview zoom', err);
    }
    // Only run on first mount — subsequent changes are driven by user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('pl-editor-preview-zoom', String(state.previewZoom));
    } catch (err) {
      logEditorError('FullscreenEditor: persist preview zoom', err);
    }
  }, [state.previewZoom]);

  // ── Auto-open panel on tab change ───────────────────────────
  useEffect(() => {
    if (!state.isMobile) dispatch({ type: 'SET_SIDEBAR_COLLAPSED', collapsed: false });
  }, [state.activeTab, state.isMobile]);

  // ── Sync chapters when manifest.chapters changes from parent ─
  useEffect(() => {
    const sorted = [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    dispatch({ type: 'SET_CHAPTERS', chapters: sorted });
    // Preserve activeId if it's a valid chapter OR a valid block ID
    const chapterIds = new Set((manifest.chapters || []).map(c => c.id));
    const blockIds = new Set((manifest.blocks || []).map(b => b.id));
    const currentId = state.activeId ?? '';
    if (!chapterIds.has(currentId) && !blockIds.has(currentId)) {
      dispatch({ type: 'SET_ACTIVE_ID', id: manifest.chapters?.[0]?.id || null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.chapters]);

  // ── Intercept publish → show audit first ─────────────────────
  useEffect(() => {
    if (state.showPublish && !showPublishAudit && !auditPassedRef.current) {
      // Intercept: hide the publish modal and show audit instead
      dispatch({ type: 'SET_SHOW_PUBLISH', show: false });
      setShowPublishAudit(true);
    }
    // Reset the bypass flag when publish modal closes
    if (!state.showPublish) {
      auditPassedRef.current = false;
    }
  }, [state.showPublish, showPublishAudit]);

  // ── Welcome overlay safety timer ─────────────────────────────
  // The overlay is click-to-dismiss; a 12-second safety timer
  // removes it if the user ignores it (previous 2.5s was too fast
  // for anyone to actually read the copy).
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'SET_WELCOME', show: false }), 12000);
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
  // Item 2: When `opts.coalesceKey` is provided AND it matches the previous
  // push within DESIGN_COALESCE_MS (400ms), we replace the top entry instead
  // of appending — so rapid text-edits to the same field collapse into one
  // undo step. We also forward the key to PUSH_UNDO_ENTRY so `state.undoHistory`
  // stays in sync with the manifest-ref stack.
  const lastPushKeyRef = useRef<string | null>(null);
  const lastPushAtRef = useRef<number>(0);
  const pushHistory = useCallback((m: StoryManifest, opts?: { coalesceKey?: string; label?: string }) => {
    const now = Date.now();
    const coalesceKey = opts?.coalesceKey;
    const canCoalesce =
      !!coalesceKey &&
      coalesceKey === lastPushKeyRef.current &&
      now - lastPushAtRef.current < DESIGN_COALESCE_MS &&
      historyRef.current.length > 0 &&
      historyIndexRef.current === historyRef.current.length - 1;

    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (canCoalesce) {
      stack[stack.length - 1] = m;
    } else {
      stack.push(m);
      if (stack.length > 50) stack.shift();
    }
    historyRef.current = stack;
    historyIndexRef.current = stack.length - 1;
    lastPushKeyRef.current = coalesceKey ?? null;
    lastPushAtRef.current = now;
    dispatch({ type: 'SET_CAN_UNDO', can: stack.length > 1 });
    dispatch({ type: 'SET_CAN_REDO', can: false });
    dispatch({ type: 'PUSH_UNDO_ENTRY', label: opts?.label || 'Edit', coalesceKey });
  }, []);

  // ── Push to preview (debounced) ──────────────────────────────
  // pushToPreview — with direct DOM rendering, changes propagate automatically
  // via React re-renders. Also triggers a debounced server autosave so the
  // "Saved" indicator reflects actual persistence, not just a cosmetic timer.
  const autosaveAbortRef = useRef<AbortController | null>(null);
  const latestManifestRef = useRef<StoryManifest>(manifest);
  useEffect(() => { latestManifestRef.current = manifest; }, [manifest]);

  const pushToPreview = useCallback((m: StoryManifest) => {
    dispatch({ type: 'SET_SAVE_STATE', state: 'unsaved' });
    dispatch({ type: 'SET_DIRTY', dirty: true });
    latestManifestRef.current = m;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    try {
      storePreview(previewKey, m, coupleNames);
    } catch {}
    saveTimeoutRef.current = setTimeout(async () => {
      // Skip autosave when no subdomain is assigned yet (pre-publish drafts
      // are kept in localStorage only — see AUTOSAVE_KEY below).
      const targetSubdomain = initialSubdomain?.trim();
      if (!targetSubdomain) {
        dispatch({ type: 'SET_SAVE_STATE', state: 'saved' });
        dispatch({ type: 'SET_DIRTY', dirty: false });
        return;
      }
      // Cancel any in-flight autosave so rapid edits never double-write.
      autosaveAbortRef.current?.abort();
      const controller = new AbortController();
      autosaveAbortRef.current = controller;
      try {
        const res = await fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain: targetSubdomain,
            manifest: latestManifestRef.current,
            names: latestManifestRef.current.names || coupleNames,
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          dispatch({ type: 'SET_SAVE_STATE', state: 'saved' });
          dispatch({ type: 'SET_DIRTY', dirty: false });
        } else {
          // Server rejected — leave "unsaved" so the user knows work isn't safe.
          // 401 (no session) is treated as saved-locally since localStorage
          // autosave still holds the draft.
          if (res.status === 401) {
            dispatch({ type: 'SET_SAVE_STATE', state: 'saved' });
            dispatch({ type: 'SET_DIRTY', dirty: false });
          } else {
            showInfoToast('Couldn\u2019t save to server · kept local copy', 3600);
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logEditorError('FullscreenEditor: server autosave', err);
          showInfoToast('Network glitch · retrying on next edit', 3600);
        }
      }
    }, 1500);
  }, [previewKey, coupleNames, initialSubdomain, showInfoToast]);

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
  // Item 2: `opts` is forwarded to `pushHistory` so text-edit callers can
  // coalesce rapid per-keystroke pushes on the same field into one undo step.
  const syncManifest = useCallback((newChapters: Chapter[], opts?: { coalesceKey?: string; label?: string }) => {
    const m = { ...manifest, chapters: newChapters.map((ch, i) => ({ ...ch, order: i })) };
    pushHistory(m, opts);
    onChange(m);
    pushToPreview(m);
  }, [manifest, onChange, pushToPreview, pushHistory]);

  const updateChapter = useCallback((id: string, data: Partial<Chapter>, opts?: { coalesceKey?: string; label?: string }) => {
    const next = state.chapters.map(ch => ch.id === id ? { ...ch, ...data } : ch);
    dispatch({ type: 'SET_CHAPTERS', chapters: next });
    syncManifest(next, opts);
  }, [state.chapters, syncManifest]);

  const deleteChapter = useCallback((id: string) => {
    const next = state.chapters.filter(ch => ch.id !== id);
    dispatch({ type: 'SET_CHAPTERS', chapters: next });
    if (state.activeId === id) dispatch({ type: 'SET_ACTIVE_ID', id: next[0]?.id || null });
    syncManifest(next);
  }, [state.chapters, state.activeId, syncManifest]);

  const addChapter = useCallback(() => {
    const id = makeId('ch');
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

  const handleDesignChange = useCallback((m: StoryManifest, opts?: { coalesceKey?: string; label?: string }) => {
    pushHistory(m, opts);
    onChange(m);
    pushToPreview(m);
  }, [onChange, pushToPreview, pushHistory]);

  // Append a block of a given type to the canvas. Used by the
  // library drawer's tap-to-insert fallback.
  const handleInsertBlockFromLibrary = useCallback((type: BlockType) => {
    const blocks = manifest.blocks || [];
    const newBlock = {
      id: `block-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      order: blocks.length,
      visible: true,
    };
    const next = { ...manifest, blocks: [...blocks, newBlock] };
    handleDesignChange(next, { coalesceKey: `insert-block:${type}`, label: `Insert ${type}` });
    // Select the new block so the inspector focuses on it.
    dispatch({ type: 'SET_ACTIVE_ID', id: newBlock.id });
    showInfoToast(`Inserted ${type}`);
  }, [manifest, handleDesignChange, showInfoToast]);

  // Allow any part of the editor (rail, command palette, slash menu) to
  // open the library drawer by dispatching a CustomEvent.
  useEffect(() => {
    const open = () => setBlockLibraryOpen(true);
    const close = () => setBlockLibraryOpen(false);
    window.addEventListener('pearloom-open-library', open);
    window.addEventListener('pearloom-close-library', close);
    return () => {
      window.removeEventListener('pearloom-open-library', open);
      window.removeEventListener('pearloom-close-library', close);
    };
  }, []);

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
      case 'pear':
        // Forward to the AI command bar via the same channel empty-state
        // buttons and ambient suggestion badges use.
        window.dispatchEvent(new CustomEvent('pear-command', {
          detail: { prompt: action.prompt },
        }));
        break;
    }
  }, [addChapter, handleTabChange, storePreviewForOpen, undo, redo, dispatch]);

  // ── AI Rewrite ───────────────────────────────────────────────
  const cancelAIRewrite = useCallback(() => {
    rewriteControllerRef.current?.abort();
  }, []);

  const handleAIRewrite = useCallback(async (id: string) => {
    const ch = state.chapters.find(c => c.id === id);
    if (!ch) return;

    // Cancel any in-flight rewrite
    rewriteControllerRef.current?.abort();
    const controller = new AbortController();
    rewriteControllerRef.current = controller;

    dispatch({ type: 'SET_REWRITING', id });
    dispatch({ type: 'SET_STREAMING_TEXT', text: '', chapterId: id });

    try {
      const res = await fetch('/api/rewrite/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ch.title,
          description: ch.description,
          mood: ch.mood,
          vibeString: manifest.vibeString,
          occasion: manifest.occasion,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        dispatch({ type: 'SET_REWRITE_ERROR', error: 'Rewrite failed — please try again' });
        setTimeout(() => dispatch({ type: 'SET_REWRITE_ERROR', error: null }), 4000);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice('data: '.length).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'chunk' && event.text) {
              accumulated += event.text;
              dispatch({ type: 'SET_STREAMING_TEXT', text: accumulated, chapterId: id });
            } else if (event.type === 'done') {
              if (accumulated) {
                updateChapter(id, { description: accumulated });
              }
              dispatch({ type: 'SET_STREAMING_TEXT', text: null, chapterId: null });
            }
          } catch {
            // Skip unparseable events
          }
        }
      }

      // Finalize if stream ended without a 'done' event
      if (accumulated) {
        updateChapter(id, { description: accumulated });
      }
      dispatch({ type: 'SET_STREAMING_TEXT', text: null, chapterId: null });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // User cancelled — clear streaming state but keep whatever was written
        dispatch({ type: 'SET_STREAMING_TEXT', text: null, chapterId: null });
        return;
      }
      console.error('AI rewrite failed:', e);
      dispatch({ type: 'SET_REWRITE_ERROR', error: 'Rewrite failed — please try again' });
      setTimeout(() => dispatch({ type: 'SET_REWRITE_ERROR', error: null }), 4000);
      dispatch({ type: 'SET_STREAMING_TEXT', text: null, chapterId: null });
    } finally {
      dispatch({ type: 'SET_REWRITING', id: null });
      rewriteControllerRef.current = null;
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
          names: manifest.names || coupleNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      dispatch({ type: 'MARK_PUBLISHED', url: data.url });
      trackPublish(state.subdomain, historyRef.current.length, Date.now() - (state as unknown as Record<string, number>)._startTime || 0);
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

  const checkForRecoverableDraft = useCallback(() => {
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
    } catch (err) {
      logEditorError('FullscreenEditor: draft recovery', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAFT_DISMISSED_KEY]);

  useEffect(() => {
    checkForRecoverableDraft();
  }, [checkForRecoverableDraft]);

  // Re-check for a recoverable draft whenever the user tabs back in.
  // Covers the case where someone edits in another tab / lets the
  // browser sleep for hours — they return to 'stale' local state.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForRecoverableDraft();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [checkForRecoverableDraft]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ manifest, savedAt: Date.now() }));
      } catch (err) {
        logEditorError('FullscreenEditor: autosave draft', err);
      }
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
      // Cmd+S — force save (item 67). Autosave is always on, but ⌘S gives the
      // user a reassuring confirmation toast and flushes the autosave payload.
      if (mod && e.key === 's') {
        e.preventDefault();
        try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ manifest, savedAt: Date.now() })); } catch {}
        dispatch({ type: 'SET_SAVE_STATE', state: 'saved' });
        showInfoToast('Autosave is on, changes are being saved continuously.');
        return;
      }
      // Cmd+Alt+1/2/3 — switch preview device (desktop/tablet/mobile)
      if (mod && e.altKey && (e.key === '1' || e.key === '2' || e.key === '3' || e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3')) {
        if (state.isMobile) return;
        e.preventDefault();
        const digit = e.key === '1' || e.code === 'Digit1' ? '1' : e.key === '2' || e.code === 'Digit2' ? '2' : '3';
        const mode = digit === '1' ? 'desktop' : digit === '2' ? 'tablet' : 'mobile';
        dispatch({ type: 'SET_DEVICE', device: mode });
        return;
      }
      // Cmd+1-8 — switch tabs (item 13: gate ⌘1/2/3 on mobile since the
      // device switcher and tabbed panel layout don't apply to mobile)
      if (mod && !e.altKey && TAB_KEYS[e.key]) {
        if (state.isMobile && (e.key === '1' || e.key === '2' || e.key === '3')) {
          return;
        }
        e.preventDefault();
        handleTabChange(TAB_KEYS[e.key]);
        return;
      }
      // ⌘⇧A / Ctrl+Shift+A — open the block library drawer
      if (mod && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setBlockLibraryOpen((v) => !v);
        return;
      }
      // ── Item 73: ⌘⇧C — add chapter, ⌘⇧E — add event ──
      // Key comparisons use e.key which is affected by Shift → uppercase letters.
      if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        const id = makeId('ch');
        const newCh: Chapter = {
          id,
          date: new Date().toISOString(),
          title: 'New Chapter',
          subtitle: 'Add your subtitle',
          description: 'Write your story here…',
          images: [],
          location: null,
          mood: 'romantic',
          order: chaptersRef.current.length,
        };
        const next = [...chaptersRef.current, newCh];
        dispatch({ type: 'SET_CHAPTERS', chapters: next });
        dispatch({ type: 'SET_ACTIVE_ID', id });
        const newManifest = { ...manifest, chapters: next.map((ch, i) => ({ ...ch, order: i })) };
        pushHistory(newManifest);
        onChange(newManifest);
        pushToPreviewRef.current(newManifest);
        showInfoToast('Chapter added');
        return;
      }
      if (mod && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        const newEvent = {
          id: makeId('evt'),
          name: 'New Event',
          type: 'ceremony' as const,
          date: new Date().toISOString(),
          time: '',
          venue: '',
          address: '',
          description: '',
        };
        const events = [...(manifest.events || []), newEvent];
        const newManifest = { ...manifest, events };
        pushHistory(newManifest);
        onChange(newManifest);
        pushToPreviewRef.current(newManifest);
        showInfoToast('Event added');
        return;
      }

      // ── Item 70: Copy / Paste selected block ──
      // Only trigger when there's no text selection (so normal copy/paste in
      // inputs still works). active element must not be an input/textarea.
      const activeEl = document.activeElement as HTMLElement | null;
      const inField = !!activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (mod && !e.shiftKey && e.key === 'c' && !inField) {
        const id = activeIdRef.current;
        if (id && manifest.blocks) {
          const src = manifest.blocks.find(b => b.id === id);
          if (src) {
            e.preventDefault();
            blockClipboardRef.current = {
              type: src.type,
              config: src.config ? { ...src.config } : undefined,
              visible: src.visible,
            };
            showInfoToast('Block copied');
            return;
          }
        }
      }
      if (mod && !e.shiftKey && e.key === 'v' && !inField) {
        const clip = blockClipboardRef.current;
        if (clip && manifest.blocks) {
          e.preventDefault();
          // Item 91: guard against ID collisions — makeId yields UUIDs but we
          // still defensively check the manifest's existing IDs and regen if
          // a collision is found (belt + suspenders for paste workflows).
          const existingIds = new Set(manifest.blocks.map(b => b.id));
          let newId = makeId(clip.type);
          while (existingIds.has(newId)) newId = makeId(clip.type);
          const newBlock = {
            id: newId,
            type: clip.type as (typeof manifest.blocks)[number]['type'],
            order: manifest.blocks.length,
            visible: clip.visible ?? true,
            config: clip.config ? { ...clip.config } : undefined,
          };
          const blocks = [...manifest.blocks, newBlock].map((b, i) => ({ ...b, order: i }));
          const newManifest = { ...manifest, blocks };
          pushHistory(newManifest);
          onChange(newManifest);
          pushToPreviewRef.current(newManifest);
          dispatch({ type: 'SET_ACTIVE_ID', id: newId });
          showInfoToast('Block pasted');
          return;
        }
      }

      // Escape — close modals/sheets
      if (e.key === 'Escape') {
        if (state.cmdPaletteOpen) { dispatch({ type: 'SET_CMD_PALETTE', open: false }); return; }
        if (state.showPublish) { dispatch({ type: 'SET_SHOW_PUBLISH', show: false }); return; }
        if (state.mobileSheetOpen) { dispatch({ type: 'SET_MOBILE_SHEET', open: false }); return; }
      }
      // Cmd+D — duplicate active chapter (or active block if selection is a block)
      if (mod && e.key === 'd') {
        e.preventDefault();
        const id = activeIdRef.current;
        const chs = chaptersRef.current;
        if (!id) return;
        const original = chs.find(c => c.id === id);
        if (!original) return;
        const copyId = makeId('ch');
        const copy: Chapter = { ...original, id: copyId, title: `${original.title} (copy)`, order: (original.order ?? 0) + 0.5 };
        const next = [...chs, copy].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        dispatch({ type: 'SET_CHAPTERS', chapters: next });
        dispatch({ type: 'SET_ACTIVE_ID', id: copyId });
        const newManifest = { ...manifest, chapters: next.map((ch, i) => ({ ...ch, order: i })) };
        pushHistory(newManifest);
        onChange(newManifest);
        pushToPreviewRef.current(newManifest);
        return;
      }
      // ── Block keyboard shortcuts (Delete, Arrow Up/Down for blocks) ──
      const blockAction = mapKeyToAction(e, state.activeId);
      if (blockAction) {
        if (blockAction.type === 'saveSnapshot') {
          saveSnapshot(manifest, `Snapshot ${new Date().toLocaleTimeString()}`);
          return;
        }
        if (blockAction.type === 'deselect') {
          dispatch({ type: 'SET_ACTIVE_ID', id: null });
          return;
        }
        if (manifest.blocks) {
          const updatedBlocks = applyBlockAction(manifest.blocks, blockAction);
          if (updatedBlocks) {
            const updated = { ...manifest, blocks: updatedBlocks };
            pushHistory(updated);
            onChange(updated);
            pushToPreviewRef.current(updated);
            if (blockAction.type === 'delete') {
              dispatch({ type: 'SET_ACTIVE_ID', id: null });
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, manifest, pushHistory, onChange, storePreviewForOpen, handleTabChange, state.cmdPaletteOpen, state.showPublish, state.mobileSheetOpen, state.isMobile, showInfoToast]);

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
      const newId = makeId('ch');
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
    handleAIRewrite, cancelAIRewrite, handlePublishSubmit, handleRestoreDraft,
    storePreviewForOpen,
    jumpToHistory: (index: number) => {
      if (index >= 0 && index < historyRef.current.length) {
        historyIndexRef.current = index;
        const target = historyRef.current[index];
        onChange(target);
        pushToPreview(target);
        dispatch({ type: 'SET_CAN_UNDO', can: index > 0 });
        dispatch({ type: 'SET_CAN_REDO', can: index < historyRef.current.length - 1 });
        dispatch({ type: 'SET_UNDO_INDEX', index });
      }
    },
    getHistoryEntries: () => historyRef.current.map((m, i) => ({ manifest: m, label: `State ${i + 1}`, timestamp: Date.now() })),
    getHistoryIndex: () => historyIndexRef.current,
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
    <motion.div
      // Item 100: subtle fade + y-offset entrance so the editor doesn't snap in.
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        background: 'var(--pl-cream)', fontFamily: 'var(--pl-font-body)',
      }}>
      {/* Skip to canvas — visible only on keyboard focus. */}
      <a
        href="#pl-editor-canvas"
        className="pl-skip-link"
        style={{
          position: 'absolute',
          top: -40,
          left: 8,
          zIndex: 10000,
          padding: '8px 12px',
          background: 'var(--pl-ink, #18181B)',
          color: 'var(--pl-cream, #FFF)',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'top 0.15s',
        }}
        onFocus={(e) => { e.currentTarget.style.top = '8px'; }}
        onBlur={(e) => { e.currentTarget.style.top = '-40px'; }}
      >
        Skip to canvas
      </a>

      {/* Command Palette */}
      <CommandPalette
        open={state.cmdPaletteOpen}
        onClose={() => dispatch({ type: 'SET_CMD_PALETTE', open: false })}
        onAction={handleCommandAction}
        chapters={state.chapters.map(c => ({ id: c.id, title: c.title || '' }))}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        contextHints={{
          activeChapterId: state.activeId,
          activeChapterTitle: state.chapters.find(c => c.id === state.activeId)?.title || null,
          selectedBlockCount: state.selectedBlockIds.length,
          focusedFieldPath: state.fieldFocus,
        }}
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

      {/* ── Docked shell: toolbar on top, rail floats left, canvas + wing share the body row ── */}

      {/* Top bar — flex child, so body below can flex-fill */}
      {!state.isMobile && (
        <div style={{ flexShrink: 0, zIndex: 40, position: 'relative' }}>
          <EditorToolbar onExit={onExit} />
          {/* AIContextBar removed — chapter actions now in inline canvas toolbar + panel */}
          <PostWeddingBanner manifest={manifest} subdomain={state.subdomain} onUpdate={(m) => { onChange(m); pushToPreview(m); }} />
        </div>
      )}

      {/* Body — flex row holding canvas and docked wing */}
      {!state.isMobile && (
        <div style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'row',
          position: 'relative',
        }}>
          {/* Canvas claims the remaining horizontal space */}
          <div id="pl-editor-canvas" style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
            <EditorCanvas />
          </div>
          {/* Docked editor panel — reserves its own width from the row */}
          <EditorWing
            open={panelOpen}
            onToggle={() => dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' })}
            activeTab={state.activeTab}
            contentRef={contentPanelRef}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={state.activeTab}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {state.activeTab === 'story' && <AnniversaryNudgePanel />}
                {state.activeTab === 'story' && <StoryPanel />}
                {state.activeTab === 'story' && manifest.occasion !== 'birthday' && (
                  <WeddingPartyEditor
                    members={manifest.weddingParty || []}
                    onChange={(members) => {
                      handleDesignChange(
                        { ...manifest, weddingParty: members },
                        { coalesceKey: 'weddingParty', label: 'Edit wedding party' },
                      );
                    }}
                  />
                )}

                {state.activeTab === 'canvas' && (
                  <>
                  <CanvasEditor manifest={manifest} onChange={(m) => { onChange(m); }} pushToPreview={pushToPreview} />
                  {/* Block config editor — shown when a block is selected */}
                  {state.activeId && manifest.blocks?.find(b => b.id === state.activeId) && (
                    <BlockConfigEditor
                      block={manifest.blocks.find(b => b.id === state.activeId)!}
                      onChange={(config) => {
                        const updated = {
                          ...manifest,
                          blocks: (manifest.blocks || []).map(b =>
                            b.id === state.activeId ? { ...b, config } : b
                          ),
                        };
                        handleDesignChange(updated, {
                          coalesceKey: `block-config:${state.activeId}`,
                          label: 'Edit block',
                        });
                      }}
                    />
                  )}
                  </>
                )}

                {state.activeTab === 'events' && (
                  <EventsPanel manifest={manifest} onChange={handleDesignChange} />
                )}

                {state.activeTab === 'pages' && (
                  <PagesPanel
                    manifest={manifest}
                    subdomain={state.subdomain}
                    onChange={handleDesignChange}
                    previewPage={state.previewPage}
                    onPreviewPage={(slug) => dispatch({ type: 'SET_PREVIEW_PAGE', page: slug })}
                  />
                )}

                {state.activeTab === 'design' && (
                  <>
                    <DesignPanel manifest={manifest} onChange={handleDesignChange} coupleNames={coupleNames} />
                    <PropertiesPanel
                      manifest={manifest}
                      onChange={handleDesignChange}
                      fallbackNames={coupleNames}
                    />
                    {/* Per-block style editor — shown when a block is selected */}
                    {state.activeId && manifest.blocks?.find(b => b.id === state.activeId) && (
                      <BlockStyleEditor
                        block={manifest.blocks.find(b => b.id === state.activeId)!}
                        onChange={(style) => {
                          handleDesignChange(
                            {
                              ...manifest,
                              blocks: setBlockStyle(manifest.blocks || [], state.activeId!, style),
                            },
                            { coalesceKey: `block-style:${state.activeId}`, label: 'Edit block style' },
                          );
                        }}
                      />
                    )}
                    <CustomizationPanel
                      customization={manifest.customization || {}}
                      onChange={(c) => {
                        handleDesignChange(
                          { ...manifest, customization: c },
                          { coalesceKey: 'customization', label: 'Edit customization' },
                        );
                      }}
                      names={coupleNames}
                      accentColor={manifest.vibeSkin?.palette?.accent}
                    />
                    {/* Custom CSS — shown when a block is selected */}
                    {state.activeId && manifest.blocks?.find(b => b.id === state.activeId) && (
                      <CustomCSSEditor
                        block={manifest.blocks.find(b => b.id === state.activeId)!}
                        onChange={(css) => {
                          handleDesignChange(
                            {
                              ...manifest,
                              blocks: (manifest.blocks || []).map(b =>
                                b.id === state.activeId ? { ...b, config: { ...(b.config || {}), _customCSS: css } } : b
                              ),
                            },
                            { coalesceKey: `block-css:${state.activeId}`, label: 'Edit block CSS' },
                          );
                        }}
                      />
                    )}
                  </>
                )}

                {state.activeTab === 'details' && (
                  <DetailsPanel manifest={manifest} onChange={handleDesignChange} subdomain={state.subdomain} />
                )}

                {state.activeTab === 'blocks' && (
                  <AIBlocksPanel manifest={manifest} coupleNames={coupleNames} onChange={(m) => { onChange(m); pushToPreview(m); }} />
                )}

                {state.activeTab === 'voice' && (
                  <VoiceTrainerPanel
                    voiceSamples={manifest.voiceSamples || []}
                    onChange={(samples) => {
                      handleDesignChange(
                        { ...manifest, voiceSamples: samples },
                        { coalesceKey: 'voiceSamples', label: 'Edit voice samples' },
                      );
                    }}
                  />
                )}

                {state.activeTab === 'messaging' && (
                  <GuestMessagingPanel />
                )}

                {(state.activeTab === 'guests' ||
                  state.activeTab === 'invite' ||
                  state.activeTab === 'seating' ||
                  state.activeTab === 'savethedate') && (
                  <GuestsLifecyclePanel manifest={manifest} subdomain={state.subdomain} />
                )}

                {state.activeTab === 'analytics' && (
                  <AnalyticsDashboardPanel siteId={state.subdomain} />
                )}

                {state.activeTab === 'translate' && (
                  <TranslationPanel manifest={manifest} onChange={handleDesignChange} />
                )}

                {state.activeTab === 'thankyou' && (
                  <ThankYouPanel />
                )}

                {state.activeTab === 'spotify' && (
                  <SpotifyPanel />
                )}

                {state.activeTab === 'vendors' && (
                  <VendorPanel />
                )}

                {state.activeTab === 'components' && (
                  <ComponentLibrary manifest={manifest} onChange={handleDesignChange} />
                )}

                {state.activeTab === 'history' && (
                  <VersionHistoryPanel
                    manifest={manifest}
                    siteId={state.subdomain}
                    onRestore={(restored) => {
                      handleDesignChange(restored, { label: 'Restore version' });
                      dispatch({ type: 'SET_CHAPTERS', chapters: restored.chapters || [] });
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </EditorWing>
        </div>
      )}

      {/* Navigation rail — floats over the canvas, independent of the body row */}
      {!state.isMobile && (
        <EditorRail onOpen={() => dispatch({ type: 'SET_SIDEBAR_COLLAPSED', collapsed: false })} />
      )}

      {/* Mobile */}
      {state.isMobile && <MobileEditorSheet />}

      {/* Toasts */}
      <AnimatePresence>
        {state.showHint && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1500, pointerEvents: 'none',
              background: 'color-mix(in oklab, var(--pl-cream-card) 95%, transparent)',
              backdropFilter: 'saturate(140%) blur(14px)',
              WebkitBackdropFilter: 'saturate(140%) blur(14px)',
              border: '1px solid var(--pl-divider)',
              borderRadius: 999, padding: '8px 18px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px color-mix(in oklab, var(--pl-ink) 12%, transparent)',
            } as React.CSSProperties}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-olive)' }}>↑</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pl-ink)', whiteSpace: 'nowrap' }}>Click any section in the preview to jump to it</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {state.rewriteError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1500, pointerEvents: 'none',
              background: 'color-mix(in oklab, var(--pl-plum) 14%, var(--pl-cream-card))',
              backdropFilter: 'saturate(140%) blur(14px)',
              WebkitBackdropFilter: 'saturate(140%) blur(14px)',
              border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
              borderRadius: 999, padding: '8px 18px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px color-mix(in oklab, var(--pl-plum) 18%, transparent)',
            } as React.CSSProperties}>
            <span style={{ fontSize: 14, color: 'var(--pl-plum)' }}>⚠</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pl-plum)', whiteSpace: 'nowrap' }}>{state.rewriteError}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Lightweight info toast for ⌘S + block copy/paste */}
      <AnimatePresence>
        {infoToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%',
              transform: 'translateX(-50%)', zIndex: 1500, pointerEvents: 'none',
              background: 'color-mix(in oklab, var(--pl-ink) 90%, transparent)',
              backdropFilter: 'saturate(140%) blur(14px)',
              WebkitBackdropFilter: 'saturate(140%) blur(14px)',
              border: '1px solid color-mix(in oklab, var(--pl-cream) 14%, transparent)',
              borderRadius: 999, padding: '8px 18px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px color-mix(in oklab, var(--pl-ink) 22%, transparent)',
            } as React.CSSProperties}
          >
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--pl-cream)',
              whiteSpace: 'nowrap',
            }}>
              {infoToast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active AI badge — shows during rewrite/regeneration */}
      <AnimatePresence>
        <ActiveCuratorBadge active={!!state.rewritingId} />
      </AnimatePresence>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: color-mix(in oklab, var(--pl-ink) 8%, transparent);
          border-radius: 100px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: color-mix(in oklab, var(--pl-ink) 22%, transparent);
        }
      `}</style>

      {/* Pre-publish audit */}
      {showPublishAudit && (
        <PearPublishAudit
          manifest={manifest}
          coupleNames={coupleNames}
          onProceed={() => {
            setShowPublishAudit(false);
            auditPassedRef.current = true;
            dispatch({ type: 'OPEN_PUBLISH' });
          }}
          onClose={() => setShowPublishAudit(false)}
        />
      )}

      {/* Publish Modal */}
      <PublishModalInline />

      {/* Block library drawer — slides in from the left of the canvas.
          Cards are native-draggable; drops land in SiteRenderer DropZones. */}
      <BlockLibraryDrawer
        open={blockLibraryOpen}
        onClose={() => setBlockLibraryOpen(false)}
        occasion={manifest.occasion === 'birthday' ? 'birthday' : 'wedding'}
        existingTypes={new Set((manifest.blocks || []).map(b => b.type as BlockType))}
        onInsert={handleInsertBlockFromLibrary}
      />

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {state.canvasDragId && (
          <div style={{
            padding: '8px 14px',
            background: 'var(--pl-ink)',
            color: 'var(--pl-cream)',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            boxShadow: '0 16px 40px color-mix(in oklab, var(--pl-ink) 30%, transparent)',
            display: 'flex', alignItems: 'center', gap: 8,
            pointerEvents: 'none',
            border: '1px solid color-mix(in oklab, var(--pl-cream) 14%, transparent)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: '1.05rem', color: 'var(--pl-olive-mist, var(--pl-olive))' }}>
              {state.canvasDragId.startsWith('chapter:') ? '⌖' : '✦'}
            </span>
            {state.canvasDragLabel}
          </div>
        )}
      </DragOverlay>

      {/* Pear AI — single assistant surface: floating pill (mobile) +
          expanding side panel (desktop). Receives prompts from empty states,
          ambient suggestions, and the command palette via 'pear-command'. */}
      <AICommandBar />

      {/* Welcome */}
      <AnimatePresence>
        {state.showWelcome && <WelcomeOverlay onDismiss={() => dispatch({ type: 'SET_WELCOME', show: false })} siteName={state.subdomain} manifest={manifest} coupleNames={coupleNames} />}
      </AnimatePresence>

      {/* Guided tour (first-time only) + Getting started checklist */}
      {!state.isMobile && <EditorTour />}
      {!state.isMobile && <GettingStartedChecklist />}

      {/* Inline story layout switcher — appears above a selected story section */}
      {!state.isMobile && <InlineStoryLayoutSwitcher />}
    </motion.div>
    </DndContext>
    </EditorContext.Provider>
  );
}

// ── Inline Publish Modal (uses context) ────────────────────────
import { Loader2 } from 'lucide-react';

function PublishModalInline() {
  const { state, dispatch, actions, coupleNames } = useEditor();
  const { showPublish, publishedUrl, publishError, isPublishing, subdomain } = state;
  const [shareCopied, setShareCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const displayNames = coupleNames
    ? (coupleNames[1]?.trim() ? `${coupleNames[0]} & ${coupleNames[1]}` : coupleNames[0])
    : 'Our Site';
  const shareMsg = publishedUrl
    ? `You're invited! View ${displayNames}'s site: ${publishedUrl}`
    : '';
  const rsvpUrl = publishedUrl ? `${publishedUrl}#rsvp` : '';

  const handleCopyLink = async () => {
    if (!publishedUrl) return;
    const ok = await writeClipboardText(publishedUrl);
    if (ok) {
      setCopyError(null);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      setCopyError('Couldn\u2019t copy automatically — select the link above.');
      setTimeout(() => setCopyError(null), 3500);
    }
  };

  if (!showPublish) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'color-mix(in oklab, var(--pl-ink) 70%, transparent)',
          backdropFilter: 'saturate(140%) blur(20px)',
          WebkitBackdropFilter: 'saturate(140%) blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'calc(2rem + env(safe-area-inset-top, 0px)) 2rem calc(2rem + env(safe-area-inset-bottom, 0px))',
        } as React.CSSProperties}
        onClick={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: false })}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--pl-cream-card)',
            border: '1px solid var(--pl-divider)',
            borderRadius: 24,
            padding: 'clamp(1.75rem, 3vw, 2.5rem)',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 40px 100px color-mix(in oklab, var(--pl-ink) 40%, transparent)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Soft olive halo behind the modal */}
          <div style={{
            position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
            width: 260, height: 260, borderRadius: '50%',
            background: publishedUrl
              ? 'radial-gradient(circle, color-mix(in oklab, var(--pl-olive) 18%, transparent) 0%, transparent 65%)'
              : 'radial-gradient(circle, color-mix(in oklab, var(--pl-olive) 8%, transparent) 0%, transparent 65%)',
            pointerEvents: 'none', transition: 'background 0.6s',
          }} />
          <AnimatePresence mode="popLayout">
            {publishedUrl ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.05 }}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'color-mix(in oklab, var(--pl-olive) 18%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--pl-olive) 32%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 28px color-mix(in oklab, var(--pl-olive) 24%, transparent)',
                  }}>
                  <Globe size={26} color="var(--pl-olive)" />
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)',
                    color: 'var(--pl-ink)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    fontWeight: 400,
                    fontVariationSettings: '"opsz" 32, "SOFT" 70, "WONK" 1',
                  }}>
                  It&apos;s <em style={{ fontStyle: 'italic', color: 'var(--pl-olive)' }}>live</em>.
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  style={{ color: 'var(--pl-ink-soft)', margin: 0, fontSize: '0.9rem' }}>
                  Your story is now live at:
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  style={{ width: '100%', position: 'relative' }}>
                  <code style={{
                    display: 'block',
                    background: 'color-mix(in oklab, var(--pl-ink) 5%, transparent)',
                    border: '1px solid var(--pl-divider)',
                    padding: '0.7rem 2.8rem 0.7rem 1.2rem',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    color: 'var(--pl-ink)',
                    fontFamily: 'var(--pl-font-mono)',
                    wordBreak: 'break-all',
                    textAlign: 'left',
                  }}>
                    {publishedUrl}
                  </code>
                  <motion.button onClick={() => { void writeClipboardText(publishedUrl!); }} title="Copy link"
                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
                    style={{
                      position: 'absolute', right: '0.6rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--pl-muted)', padding: 4, display: 'flex',
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </motion.button>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
                  style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
                  <motion.a href={publishedUrl!} target="_blank" rel="noreferrer"
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 1, padding: '0.95rem',
                      borderRadius: 999,
                      background: 'var(--pl-ink)',
                      color: 'var(--pl-cream)',
                      textDecoration: 'none',
                      fontWeight: 700, fontSize: '0.78rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      textAlign: 'center', display: 'block',
                      boxShadow: '0 4px 18px color-mix(in oklab, var(--pl-olive) 28%, transparent)',
                    }}>
                    Open site →
                  </motion.a>
                  <motion.button onClick={() => { dispatch({ type: 'SET_SHOW_PUBLISH', show: false }); }}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 1, padding: '0.95rem',
                      borderRadius: 999,
                      background: 'transparent',
                      border: '1px solid var(--pl-divider)',
                      color: 'var(--pl-ink)',
                      cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.78rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                    Dashboard
                  </motion.button>
                </motion.div>

                {/* ── Share with guests ── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
                  style={{ width: '100%', borderTop: '1px solid var(--pl-divider)', paddingTop: '1.1rem', marginTop: '0.25rem' }}>
                  <div style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted)',
                    marginBottom: '0.75rem',
                    textAlign: 'left',
                  }}>
                    Share with guests
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <ShareChip
                      onClick={() => { if (shareMsg) window.location.href = `sms:?body=${encodeURIComponent(shareMsg)}`; }}
                      Icon={Phone}
                      label="iMessage"
                    />
                    <ShareChip
                      onClick={() => { if (shareMsg) window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank'); }}
                      Icon={MessageCircle}
                      label="WhatsApp"
                    />
                    <ShareChip
                      onClick={() => { if (publishedUrl) window.open(`mailto:?subject=${encodeURIComponent(`You're invited — ${displayNames}`)}&body=${encodeURIComponent(`View our site:\n${publishedUrl}`)}`); }}
                      Icon={Mail}
                      label="Email"
                    />
                    <ShareChip
                      onClick={handleCopyLink}
                      Icon={shareCopied ? Check : Copy}
                      label={shareCopied ? 'Copied!' : 'Copy link'}
                      active={shareCopied}
                    />
                  </div>
                  {copyError && (
                    <div
                      role="status"
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.72rem',
                        color: 'var(--pl-plum)',
                        fontFamily: 'var(--pl-font-mono)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {copyError}
                    </div>
                  )}
                  {rsvpUrl && (
                    <div style={{
                      marginTop: '0.75rem',
                      fontSize: '0.65rem',
                      color: 'var(--pl-muted)',
                      textAlign: 'left',
                      fontFamily: 'var(--pl-font-mono)',
                      letterSpacing: '0.04em',
                    }}>
                      RSVP link: <span style={{ color: 'var(--pl-ink-soft)' }}>{rsvpUrl}</span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div key="url-picker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)',
                  color: 'var(--pl-ink)',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em',
                  fontWeight: 400,
                  fontVariationSettings: '"opsz" 28, "SOFT" 70',
                }}>
                  Choose your <em style={{ fontStyle: 'italic', color: 'var(--pl-olive)' }}>URL</em>.
                </h2>
                <p style={{
                  color: 'var(--pl-ink-soft)',
                  marginBottom: '1.75rem',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}>
                  Customize your site address — you can change it anytime.
                </p>
                {publishError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    style={{
                      background: 'color-mix(in oklab, var(--pl-plum) 12%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--pl-plum) 28%, transparent)',
                      color: 'var(--pl-plum)',
                      borderRadius: 12,
                      padding: '0.75rem 1rem',
                      marginBottom: '1.25rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}>
                    <span style={{ flexShrink: 0 }}>⚠</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{publishError}</span>
                    <motion.button
                      onClick={actions.handlePublishSubmit}
                      disabled={isPublishing}
                      whileHover={!isPublishing ? { scale: 1.05 } : {}}
                      whileTap={!isPublishing ? { scale: 0.95 } : {}}
                      style={{
                        flexShrink: 0,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'color-mix(in oklab, var(--pl-plum) 18%, transparent)',
                        border: '1px solid color-mix(in oklab, var(--pl-plum) 40%, transparent)',
                        color: 'var(--pl-plum)',
                        cursor: isPublishing ? 'not-allowed' : 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isPublishing ? 'Retrying…' : 'Retry'}
                    </motion.button>
                  </motion.div>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'color-mix(in oklab, var(--pl-ink) 4%, transparent)',
                  borderRadius: 12,
                  border: '1px solid var(--pl-divider)',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{
                    padding: '0.95rem 0.25rem 0.95rem 1rem',
                    color: 'var(--pl-muted)',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--pl-font-mono)',
                  }}>
                    pearloom.com/sites/
                  </div>
                  <input value={subdomain} onChange={e => dispatch({ type: 'SET_SUBDOMAIN', subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="shauna-and-ben" disabled={isPublishing} autoFocus
                    style={{
                      flex: 1,
                      padding: '0.95rem 1rem 0.95rem 0',
                      background: 'transparent',
                      border: 'none', outline: 'none',
                      color: 'var(--pl-ink)',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--pl-font-mono)',
                    }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <motion.button onClick={() => dispatch({ type: 'SET_SHOW_PUBLISH', show: false })} disabled={isPublishing}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 1, padding: '0.95rem',
                      borderRadius: 999,
                      background: 'transparent',
                      border: '1px solid var(--pl-divider)',
                      color: 'var(--pl-ink-soft)',
                      cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.72rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                    Cancel
                  </motion.button>
                  <motion.button onClick={actions.handlePublishSubmit} disabled={isPublishing || !subdomain}
                    whileHover={!isPublishing && subdomain ? { y: -1 } : {}}
                    whileTap={!isPublishing && subdomain ? { scale: 0.97 } : {}}
                    style={{
                      flex: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '0.95rem',
                      borderRadius: 999,
                      background: 'var(--pl-ink)',
                      color: 'var(--pl-cream)',
                      border: 'none',
                      cursor: isPublishing || !subdomain ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: '0.72rem',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      opacity: isPublishing || !subdomain ? 0.55 : 1,
                      boxShadow: !subdomain || isPublishing
                        ? 'none'
                        : '0 4px 18px color-mix(in oklab, var(--pl-olive) 30%, transparent)',
                    }}>
                    {isPublishing
                      ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Publishing…</>
                      : <><Globe size={14} /> Publish site</>}
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

interface ShareChipProps {
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
}

function ShareChip({ onClick, Icon, label, active = false }: ShareChipProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 999,
        background: active
          ? 'color-mix(in oklab, var(--pl-olive) 16%, transparent)'
          : 'var(--pl-cream-card)',
        border: `1px solid ${active
          ? 'color-mix(in oklab, var(--pl-olive) 40%, transparent)'
          : 'var(--pl-divider)'}`,
        color: active ? 'var(--pl-olive)' : 'var(--pl-ink-soft)',
        cursor: 'pointer',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        fontFamily: 'var(--pl-font-mono)',
        textTransform: 'uppercase',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      <Icon size={13} />
      <span>{label}</span>
    </motion.button>
  );
}

