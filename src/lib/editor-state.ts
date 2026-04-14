'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / lib/editor-state.ts — Centralized editor state
// useReducer + Context replacing 32+ useState calls in FullscreenEditor
// ─────────────────────────────────────────────────────────────

import {
  createContext, useContext, useReducer, useCallback, useRef, useEffect, useState,
  type Dispatch, type RefObject,
} from 'react';
import type { StoryManifest, Chapter } from '@/types';
import type { SectionStyleOverrides } from '@/components/editor/SectionStyleEditor';
import type { CommandAction } from '@/components/editor/CommandPalette';

// ── Types ──────────────────────────────────────────────────────
export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas' | 'messaging' | 'analytics' | 'guests' | 'seating' | 'translate' | 'invite' | 'savethedate' | 'thankyou' | 'spotify' | 'vendors' | 'components' | 'history';

export interface UndoHistoryEntry {
  label: string;
  timestamp: number;
}

export interface HistoryEntry {
  manifest: import('@/types').StoryManifest;
  label: string;
  timestamp: number;
}

export const MAX_UNDO_ENTRIES = 50;
// Item 77: Coalesce consecutive design changes targeting the same key within this window
// into a single history entry to avoid one-entry-per-keystroke for sliders.
export const DESIGN_COALESCE_MS = 400;
export type SaveState = 'saved' | 'unsaved';
export type DraftBannerState = 'visible' | 'hidden' | null;

export interface EditorState {
  // Content
  chapters: Chapter[];
  activeId: string | null;

  // UI
  activeTab: EditorTab;
  device: DeviceMode;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  splitView: boolean;
  mobileSheetOpen: boolean;
  cmdPaletteOpen: boolean;
  showWelcome: boolean;
  showHint: boolean;

  // Status
  saveState: SaveState;
  isDirty: boolean;
  iframeReady: boolean;
  previewSlow: boolean;
  canUndo: boolean;
  canRedo: boolean;

  // Rewrite
  rewritingId: string | null;
  rewriteError: string | null;
  streamingText: string | null;
  streamingChapterId: string | null;

  // Publish
  showPublish: boolean;
  subdomain: string;
  isPublishing: boolean;
  publishError: string | null;
  publishedUrl: string | null;

  // Drag
  canvasDragId: string | null;
  canvasDragLabel: string;

  // Draft
  draftBanner: DraftBannerState;

  // Section overrides
  sectionOverridesMap: Record<string, SectionStyleOverrides>;

  // Preview zoom
  previewZoom: number;

  // Per-page preview (null = homepage)
  previewPage: string | null;

  // Mobile
  isMobile: boolean;
  mobileVisualEdit: boolean;
  mobileActionChapterId: string | null;

  // Chapter alternates
  chapterAlternates: Record<string, string[]>;
  alternatesLoadingId: string | null;

  // Multi-select blocks
  selectedBlockIds: string[];

  // Contextual section — tells panels which sub-section to auto-expand
  contextSection: string | null;

  // Field focus — tells panels which specific field to scroll to + highlight
  fieldFocus: string | null;

  // Undo history entries
  undoHistory: UndoHistoryEntry[];
  undoIndex: number;

  // Item 75: Set to true transiently when the oldest undo entry is dropped due to
  // MAX_UNDO_ENTRIES. Components can read this to show a toast. Auto-clears on the
  // very next action.
  undoTruncated: boolean;

  // Canvas width for responsive editing
  canvasWidth: number;
}

export type EditorAction =
  | { type: 'SET_CHAPTERS'; chapters: Chapter[] }
  | { type: 'SET_ACTIVE_ID'; id: string | null }
  | { type: 'SET_ACTIVE_TAB'; tab: EditorTab }
  | { type: 'SET_DEVICE'; device: DeviceMode }
  | { type: 'SET_SIDEBAR_WIDTH'; width: number }
  | { type: 'SET_SIDEBAR_COLLAPSED'; collapsed: boolean }
  | { type: 'TOGGLE_SIDEBAR_COLLAPSED' }
  | { type: 'SET_SPLIT_VIEW'; split: boolean }
  | { type: 'TOGGLE_SPLIT_VIEW' }
  | { type: 'SET_MOBILE_SHEET'; open: boolean }
  | { type: 'SET_CMD_PALETTE'; open: boolean }
  | { type: 'TOGGLE_CMD_PALETTE' }
  | { type: 'SET_WELCOME'; show: boolean }
  | { type: 'SET_HINT'; show: boolean }
  | { type: 'SET_SAVE_STATE'; state: SaveState }
  | { type: 'SET_DIRTY'; dirty: boolean }
  | { type: 'SET_IFRAME_READY'; ready: boolean }
  | { type: 'SET_PREVIEW_SLOW'; slow: boolean }
  | { type: 'SET_CAN_UNDO'; can: boolean }
  | { type: 'SET_CAN_REDO'; can: boolean }
  | { type: 'SET_REWRITING'; id: string | null }
  | { type: 'SET_REWRITE_ERROR'; error: string | null }
  | { type: 'SET_STREAMING_TEXT'; text: string | null; chapterId: string | null }
  | { type: 'SET_SHOW_PUBLISH'; show: boolean }
  | { type: 'SET_SUBDOMAIN'; subdomain: string }
  | { type: 'SET_PUBLISHING'; publishing: boolean }
  | { type: 'SET_PUBLISH_ERROR'; error: string | null }
  | { type: 'SET_PUBLISHED_URL'; url: string | null }
  | { type: 'SET_CANVAS_DRAG'; id: string | null; label?: string }
  | { type: 'SET_DRAFT_BANNER'; state: DraftBannerState }
  | { type: 'SET_SECTION_OVERRIDES'; id: string; overrides: SectionStyleOverrides }
  | { type: 'SET_MOBILE'; isMobile: boolean }
  | { type: 'SET_MOBILE_VISUAL_EDIT'; enabled: boolean }
  | { type: 'SET_MOBILE_ACTION_SHEET'; chapterId: string | null }
  | { type: 'SET_PREVIEW_ZOOM'; zoom: number }
  | { type: 'SET_PREVIEW_PAGE'; page: string | null }
  | { type: 'MARK_PUBLISHED'; url: string }
  | { type: 'OPEN_PUBLISH' }
  | { type: 'SET_CHAPTER_ALTERNATES'; id: string; alternates: string[] }
  | { type: 'SET_ALTERNATES_LOADING'; id: string | null }
  | { type: 'SET_SELECTED_BLOCKS'; ids: string[] }
  | { type: 'TOGGLE_BLOCK_SELECTION'; id: string }
  | { type: 'SET_CONTEXT_SECTION'; section: string | null }
  | { type: 'SET_FIELD_FOCUS'; field: string | null }
  | { type: 'CLEAR_FIELD_FOCUS' }
  | { type: 'PUSH_UNDO_ENTRY'; label: string; coalesceKey?: string }
  | { type: 'SET_UNDO_INDEX'; index: number }
  | { type: 'CLEAR_UNDO_HISTORY' }
  | { type: 'CLEAR_REWRITE_ERROR' }
  | { type: 'CLEAR_PUBLISH_ERROR' }
  | { type: 'SET_CANVAS_WIDTH'; width: number };

// Item 77: Track the last design-coalesce key + timestamp so PUSH_UNDO_ENTRY can
// collapse rapid, same-target design changes (e.g. slider drags) into one history
// entry instead of one-per-keystroke. Kept in module scope so it survives across
// dispatches without polluting state (which would trigger re-renders).
let lastCoalesceKey: string | null = null;
let lastCoalesceAt = 0;

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // Item 75: `undoTruncated` is a one-shot signal — it auto-clears on the next
  // action, whatever that action may be.
  const clearTruncated = state.undoTruncated && action.type !== 'PUSH_UNDO_ENTRY'
    ? { undoTruncated: false }
    : null;

  const next = reduceInner(state, action);
  // Item 78: Always derive canUndo/canRedo from the history array so they can
  // never desync from undoHistory/undoIndex. We only override when the action
  // touched history — otherwise we leave existing values (preserves the
  // dispatch contract for the legacy SET_CAN_UNDO / SET_CAN_REDO actions which
  // reflect an external manifest-stack maintained in refs).
  const touchedHistory =
    action.type === 'PUSH_UNDO_ENTRY' ||
    action.type === 'SET_UNDO_INDEX' ||
    action.type === 'CLEAR_UNDO_HISTORY';
  const derived = touchedHistory
    ? {
        canUndo: next.undoIndex > 0,
        canRedo: next.undoIndex < next.undoHistory.length - 1,
      }
    : null;
  if (!clearTruncated && !derived) return next;
  return { ...next, ...(clearTruncated || {}), ...(derived || {}) };
}

function reduceInner(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_CHAPTERS':
      return { ...state, chapters: action.chapters };
    case 'SET_ACTIVE_ID':
      return { ...state, activeId: action.id };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_DEVICE':
      return { ...state, device: action.device };
    case 'SET_SIDEBAR_WIDTH':
      return { ...state, sidebarWidth: action.width };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.collapsed };
    case 'TOGGLE_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_SPLIT_VIEW':
      return { ...state, splitView: action.split };
    case 'TOGGLE_SPLIT_VIEW':
      return { ...state, splitView: !state.splitView };
    case 'SET_MOBILE_SHEET':
      return { ...state, mobileSheetOpen: action.open };
    case 'SET_CMD_PALETTE':
      return { ...state, cmdPaletteOpen: action.open };
    case 'TOGGLE_CMD_PALETTE':
      return { ...state, cmdPaletteOpen: !state.cmdPaletteOpen };
    case 'SET_WELCOME':
      return { ...state, showWelcome: action.show };
    case 'SET_HINT':
      return { ...state, showHint: action.show };
    case 'SET_SAVE_STATE':
      return { ...state, saveState: action.state };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.dirty };
    case 'SET_IFRAME_READY':
      return { ...state, iframeReady: action.ready };
    case 'SET_PREVIEW_SLOW':
      return { ...state, previewSlow: action.slow };
    case 'SET_CAN_UNDO':
      return { ...state, canUndo: action.can };
    case 'SET_CAN_REDO':
      return { ...state, canRedo: action.can };
    case 'SET_REWRITING':
      // Item 79: Starting a new rewrite clears any stale rewrite error.
      return { ...state, rewritingId: action.id, rewriteError: action.id ? null : state.rewriteError };
    case 'SET_REWRITE_ERROR':
      return { ...state, rewriteError: action.error };
    case 'CLEAR_REWRITE_ERROR':
      return { ...state, rewriteError: null };
    case 'SET_STREAMING_TEXT':
      return { ...state, streamingText: action.text, streamingChapterId: action.chapterId };
    case 'SET_SHOW_PUBLISH':
      return { ...state, showPublish: action.show };
    case 'SET_SUBDOMAIN':
      return { ...state, subdomain: action.subdomain };
    case 'SET_PUBLISHING':
      // Item 79: Kicking off a publish clears any stale publish error.
      return { ...state, isPublishing: action.publishing, publishError: action.publishing ? null : state.publishError };
    case 'SET_PUBLISH_ERROR':
      return { ...state, publishError: action.error };
    case 'CLEAR_PUBLISH_ERROR':
      return { ...state, publishError: null };
    case 'SET_PUBLISHED_URL':
      return { ...state, publishedUrl: action.url };
    case 'SET_CANVAS_DRAG':
      return { ...state, canvasDragId: action.id, canvasDragLabel: action.label || '' };
    case 'SET_DRAFT_BANNER':
      return { ...state, draftBanner: action.state };
    case 'SET_SECTION_OVERRIDES':
      return { ...state, sectionOverridesMap: { ...state.sectionOverridesMap, [action.id]: action.overrides } };
    case 'SET_MOBILE':
      return { ...state, isMobile: action.isMobile };
    case 'SET_MOBILE_VISUAL_EDIT':
      return { ...state, mobileVisualEdit: action.enabled, mobileActionChapterId: null };
    case 'SET_MOBILE_ACTION_SHEET':
      return { ...state, mobileActionChapterId: action.chapterId };
    case 'SET_PREVIEW_ZOOM':
      return { ...state, previewZoom: action.zoom };
    case 'SET_PREVIEW_PAGE':
      return { ...state, previewPage: action.page, iframeReady: false };
    case 'MARK_PUBLISHED':
      return { ...state, publishedUrl: action.url, saveState: 'saved', isDirty: false };
    case 'OPEN_PUBLISH':
      return { ...state, showPublish: true, publishError: null, publishedUrl: null };
    case 'SET_CHAPTER_ALTERNATES':
      return { ...state, chapterAlternates: { ...state.chapterAlternates, [action.id]: action.alternates } };
    case 'SET_ALTERNATES_LOADING':
      return { ...state, alternatesLoadingId: action.id };
    case 'SET_SELECTED_BLOCKS':
      return { ...state, selectedBlockIds: action.ids };
    case 'TOGGLE_BLOCK_SELECTION': {
      const ids = state.selectedBlockIds.includes(action.id)
        ? state.selectedBlockIds.filter(id => id !== action.id)
        : [...state.selectedBlockIds, action.id];
      return { ...state, selectedBlockIds: ids };
    }
    case 'SET_CONTEXT_SECTION':
      return { ...state, contextSection: action.section };
    case 'SET_FIELD_FOCUS':
      // Item 76: No auto-clear here — `fieldFocus` persists until the component
      // explicitly dispatches CLEAR_FIELD_FOCUS (or overwrites it). This prevents
      // the focus highlight from vanishing on users who scroll slowly.
      return { ...state, fieldFocus: action.field };
    case 'CLEAR_FIELD_FOCUS':
      return { ...state, fieldFocus: null };
    case 'PUSH_UNDO_ENTRY': {
      const now = Date.now();
      // Item 77: Coalesce consecutive design changes that target the same key
      // within DESIGN_COALESCE_MS — replace the last entry instead of appending.
      const coalesceKey = action.coalesceKey ?? null;
      const canCoalesce =
        coalesceKey !== null &&
        coalesceKey === lastCoalesceKey &&
        now - lastCoalesceAt < DESIGN_COALESCE_MS &&
        state.undoHistory.length > 0 &&
        state.undoIndex === state.undoHistory.length - 1;

      // Item 74: When dispatching a new action while the cursor is not at the
      // tip of the stack, discard any redo branch BEFORE appending the new
      // snapshot — otherwise stale redo entries linger alongside new work.
      const history = state.undoHistory.slice(0, state.undoIndex + 1);
      let undoTruncated = false;
      if (canCoalesce) {
        // Replace the previous entry's label + timestamp.
        history[history.length - 1] = { label: action.label, timestamp: now };
      } else {
        history.push({ label: action.label, timestamp: now });
        // Item 75: When the oldest entry is dropped to enforce MAX_UNDO_ENTRIES,
        // set a transient flag so components can surface a toast. The flag
        // auto-clears on the next action (handled in the wrapper reducer).
        if (history.length > MAX_UNDO_ENTRIES) {
          history.shift();
          undoTruncated = true;
        }
      }
      lastCoalesceKey = coalesceKey;
      lastCoalesceAt = now;
      return {
        ...state,
        undoHistory: history,
        undoIndex: history.length - 1,
        undoTruncated: undoTruncated || state.undoTruncated,
      };
    }
    case 'SET_UNDO_INDEX':
      return { ...state, undoIndex: Math.max(0, Math.min(action.index, state.undoHistory.length - 1)) };
    case 'CLEAR_UNDO_HISTORY':
      lastCoalesceKey = null;
      lastCoalesceAt = 0;
      return {
        ...state,
        undoHistory: [{ label: 'Initial state', timestamp: Date.now() }],
        undoIndex: 0,
        undoTruncated: false,
      };
    case 'SET_CANVAS_WIDTH':
      return { ...state, canvasWidth: action.width };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────

// Item 2: options accepted by history-pushing actions. `coalesceKey` is
// forwarded to PUSH_UNDO_ENTRY so that rapid per-keystroke text edits to the
// same field collapse into a single undo entry within DESIGN_COALESCE_MS.
export interface HistoryPushOpts {
  coalesceKey?: string;
  label?: string;
}

export interface EditorActions {
  // Chapter mutations
  updateChapter: (id: string, data: Partial<Chapter>, opts?: HistoryPushOpts) => void;
  deleteChapter: (id: string) => void;
  addChapter: () => void;
  handleReorder: (chapters: Chapter[]) => void;

  // Manifest mutations
  syncManifest: (chapters: Chapter[], opts?: HistoryPushOpts) => void;
  handleDesignChange: (m: StoryManifest, opts?: HistoryPushOpts) => void;
  handleChatManifestUpdate: (updates: Partial<StoryManifest>) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: (m: StoryManifest, opts?: HistoryPushOpts) => void;

  // Preview
  pushToPreview: (m: StoryManifest) => void;

  // Tab
  handleTabChange: (tab: EditorTab) => void;
  handleCommandAction: (action: CommandAction) => void;

  // AI
  handleAIRewrite: (id: string) => void;
  cancelAIRewrite: () => void;

  // Publish
  handlePublishSubmit: () => Promise<void>;

  // Draft
  handleRestoreDraft: () => void;

  // Store preview for external use
  storePreviewForOpen: () => void;

  // History (for UndoTimeline)
  jumpToHistory: (index: number) => void;
  getHistoryEntries: () => HistoryEntry[];
  getHistoryIndex: () => number;
}

export interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  actions: EditorActions;
  manifest: StoryManifest;
  coupleNames: [string, string];
  previewKey: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  contentPanelRef: RefObject<HTMLDivElement | null>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

// Re-export the context for the provider
export { EditorContext, editorReducer };

export function createInitialEditorState(
  manifest: StoryManifest,
  initialSubdomain: string,
): EditorState {
  const chapters = [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    chapters,
    activeId: chapters[0]?.id || null,
    activeTab: 'story',
    device: 'desktop',
    sidebarWidth: 380,
    sidebarCollapsed: false,
    splitView: true,
    mobileSheetOpen: false,
    cmdPaletteOpen: false,
    showWelcome: true,
    showHint: false,
    saveState: 'saved',
    isDirty: false,
    iframeReady: false,
    previewSlow: false,
    canUndo: false,
    canRedo: false,
    rewritingId: null,
    rewriteError: null,
    streamingText: null,
    streamingChapterId: null,
    showPublish: false,
    subdomain: initialSubdomain || '',
    isPublishing: false,
    publishError: null,
    publishedUrl: null,
    canvasDragId: null,
    canvasDragLabel: '',
    draftBanner: null,
    sectionOverridesMap: {},
    previewZoom: 1,
    previewPage: null,
    isMobile: false,
    mobileVisualEdit: true,
    mobileActionChapterId: null,
    chapterAlternates: {},
    alternatesLoadingId: null,
    selectedBlockIds: [],
    contextSection: null,
    fieldFocus: null,
    undoHistory: [{ label: 'Initial state', timestamp: Date.now() }],
    undoIndex: 0,
    undoTruncated: false,
    canvasWidth: 1280,
  };
}

// ── Constants ──────────────────────────────────────────────────
export const PREVIEW_KEY_PREFIX = 'pearloom-editor-live';
export const AUTOSAVE_KEY = 'pearloom_draft_manifest';

export const DEVICE_DIMS: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop (1280px)' },
  tablet: { width: '768px', label: 'Tablet (768px)' },
  mobile: { width: '390px', label: 'Mobile (390px)' },
};

export const LAYOUT_OPTS = ['editorial', 'fullbleed', 'split', 'cinematic', 'gallery', 'mosaic'] as const;

export const LAYOUT_LABELS: Record<string, string> = {
  editorial: 'Editorial', fullbleed: 'Full Bleed', split: 'Split',
  cinematic: 'Cinematic', gallery: 'Gallery', mosaic: 'Mosaic',
};

// ── Preview helpers ─────────────────────────────────────────────
export function stripArtForStorage(manifest: StoryManifest): StoryManifest {
  if (!manifest.vibeSkin) return manifest;
  // Only strip base64 DataURLs (too large for sessionStorage).
  // Permanent URLs (R2/CDN) are small strings and should be preserved.
  const isBase64 = (url?: string) => url?.startsWith('data:');
  return {
    ...manifest,
    vibeSkin: {
      ...manifest.vibeSkin,
      heroArtDataUrl: isBase64(manifest.vibeSkin.heroArtDataUrl) ? undefined : manifest.vibeSkin.heroArtDataUrl,
      ambientArtDataUrl: isBase64(manifest.vibeSkin.ambientArtDataUrl) ? undefined : manifest.vibeSkin.ambientArtDataUrl,
      artStripDataUrl: isBase64(manifest.vibeSkin.artStripDataUrl) ? undefined : manifest.vibeSkin.artStripDataUrl,
    },
  };
}

export function storePreview(key: string, manifest: StoryManifest, names: [string, string]) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ manifest: stripArtForStorage(manifest), names }));
  } catch {
    try {
      const lean = { ...stripArtForStorage(manifest), chapters: manifest.chapters.map(c => ({ ...c, images: [] })) };
      sessionStorage.setItem(key, JSON.stringify({ manifest: lean, names }));
    } catch {}
  }
}
