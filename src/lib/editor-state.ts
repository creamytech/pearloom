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
export type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas';
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

  // Mobile
  isMobile: boolean;
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
  | { type: 'SET_SHOW_PUBLISH'; show: boolean }
  | { type: 'SET_SUBDOMAIN'; subdomain: string }
  | { type: 'SET_PUBLISHING'; publishing: boolean }
  | { type: 'SET_PUBLISH_ERROR'; error: string | null }
  | { type: 'SET_PUBLISHED_URL'; url: string | null }
  | { type: 'SET_CANVAS_DRAG'; id: string | null; label?: string }
  | { type: 'SET_DRAFT_BANNER'; state: DraftBannerState }
  | { type: 'SET_SECTION_OVERRIDES'; id: string; overrides: SectionStyleOverrides }
  | { type: 'SET_MOBILE'; isMobile: boolean }
  | { type: 'MARK_PUBLISHED'; url: string }
  | { type: 'OPEN_PUBLISH' };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
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
      return { ...state, rewritingId: action.id };
    case 'SET_REWRITE_ERROR':
      return { ...state, rewriteError: action.error };
    case 'SET_SHOW_PUBLISH':
      return { ...state, showPublish: action.show };
    case 'SET_SUBDOMAIN':
      return { ...state, subdomain: action.subdomain };
    case 'SET_PUBLISHING':
      return { ...state, isPublishing: action.publishing };
    case 'SET_PUBLISH_ERROR':
      return { ...state, publishError: action.error };
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
    case 'MARK_PUBLISHED':
      return { ...state, publishedUrl: action.url, saveState: 'saved', isDirty: false };
    case 'OPEN_PUBLISH':
      return { ...state, showPublish: true, publishError: null, publishedUrl: null };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────

export interface EditorActions {
  // Chapter mutations
  updateChapter: (id: string, data: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  addChapter: () => void;
  handleReorder: (chapters: Chapter[]) => void;

  // Manifest mutations
  syncManifest: (chapters: Chapter[]) => void;
  handleDesignChange: (m: StoryManifest) => void;
  handleChatManifestUpdate: (updates: Partial<StoryManifest>) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: (m: StoryManifest) => void;

  // Preview
  pushToPreview: (m: StoryManifest) => void;

  // Tab
  handleTabChange: (tab: EditorTab) => void;
  handleCommandAction: (action: CommandAction) => void;

  // AI
  handleAIRewrite: (id: string) => void;

  // Publish
  handlePublishSubmit: () => Promise<void>;

  // Draft
  handleRestoreDraft: () => void;

  // Store preview for external use
  storePreviewForOpen: () => void;
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
    splitView: false,
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
    showPublish: false,
    subdomain: initialSubdomain || '',
    isPublishing: false,
    publishError: null,
    publishedUrl: null,
    canvasDragId: null,
    canvasDragLabel: '',
    draftBanner: null,
    sectionOverridesMap: {},
    isMobile: false,
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
  return {
    ...manifest,
    vibeSkin: {
      ...manifest.vibeSkin,
      heroArtDataUrl: undefined,
      ambientArtDataUrl: undefined,
      artStripDataUrl: undefined,
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
