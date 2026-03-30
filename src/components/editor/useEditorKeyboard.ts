'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / useEditorKeyboard.ts — Centralized keyboard shortcuts
// Extracted from FullscreenEditor keyboard handler
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import type { Chapter } from '@/types';

const TAB_SHORTCUTS: Record<string, EditorTab> = {
  '1': 'story',
  '2': 'events',
  '3': 'design',
  '4': 'details',
  '5': 'pages',
  '6': 'blocks',
  '7': 'voice',
  '8': 'canvas',
};

export function useEditorKeyboard() {
  const { state, dispatch, actions, manifest } = useEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+K — toggle command palette
      if (mod && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_CMD_PALETTE' });
        return;
      }

      // Cmd+Z — undo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
        return;
      }

      // Cmd+Shift+Z — redo
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        actions.redo();
        return;
      }

      // Cmd+Y — redo (Windows convention)
      if (mod && e.key === 'y') {
        e.preventDefault();
        actions.redo();
        return;
      }

      // Cmd+\ — toggle sidebar
      if (mod && e.key === '\\') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' });
        return;
      }

      // Cmd+P — preview in new tab
      if (mod && e.key === 'p') {
        e.preventDefault();
        actions.storePreviewForOpen();
        return;
      }

      // Cmd+S — mark as saved (no-op save gesture for user comfort)
      if (mod && e.key === 's') {
        e.preventDefault();
        dispatch({ type: 'SET_SAVE_STATE', state: 'saved' });
        return;
      }

      // Cmd+1-8 — switch tabs
      if (mod && TAB_SHORTCUTS[e.key]) {
        e.preventDefault();
        actions.handleTabChange(TAB_SHORTCUTS[e.key]);
        return;
      }

      // Escape — close active modal/sheet
      if (e.key === 'Escape') {
        if (state.cmdPaletteOpen) {
          dispatch({ type: 'SET_CMD_PALETTE', open: false });
          return;
        }
        if (state.showPublish) {
          dispatch({ type: 'SET_SHOW_PUBLISH', show: false });
          return;
        }
        if (state.mobileSheetOpen) {
          dispatch({ type: 'SET_MOBILE_SHEET', open: false });
          return;
        }
      }

      // Cmd+D — duplicate active chapter
      if (mod && e.key === 'd') {
        e.preventDefault();
        const id = state.activeId;
        if (!id) return;
        const original = state.chapters.find(c => c.id === id);
        if (!original) return;
        const copyId = `ch-${Date.now()}`;
        const copy: Chapter = {
          ...original,
          id: copyId,
          title: `${original.title} (copy)`,
          order: (original.order ?? 0) + 0.5,
        };
        const next = [...state.chapters, copy].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        dispatch({ type: 'SET_CHAPTERS', chapters: next });
        dispatch({ type: 'SET_ACTIVE_ID', id: copyId });
        actions.syncManifest(next);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, dispatch, actions, manifest]);
}
