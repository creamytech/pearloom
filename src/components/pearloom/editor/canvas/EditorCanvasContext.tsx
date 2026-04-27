'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/EditorCanvasContext.tsx
//
// The single React context every inline-edit primitive
// (EditableText, EditableImage, block toolbars, etc.) reads
// to know whether we're rendering inside the editor or on the
// public site.
//
// When `editMode` is false (published site, preview without
// `?editor=1`), the primitives render as plain tags — no
// hover chrome, no contenteditable, no listeners.
//
// When `editMode` is true, the primitives expose affordances
// (hover ring, click-to-edit, keyboard shortcuts) and call
// `onSave` with the new value. The editor's parent state
// integrates the change into the manifest.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';

export interface EditorCanvasContextShape {
  editMode: boolean;
  /** Currently-focused block id — used by block-level toolbars. */
  focusedBlockId?: string;
  /** Setter for block focus — call when user clicks any element
   *  inside a block. */
  setFocusedBlockId?: (id: string | null) => void;
  /** Multi-select set of block ids/keys currently selected on the
   *  canvas. Used to apply the .pl-block-selected outline and to
   *  drive bulk keyboard actions (⌫ to hide all, Esc to clear). */
  selectedBlockIds?: string[];
  /** Pick exactly one block (replaces selection) or toggle membership
   *  when `additive` is true (Shift-click / Cmd-click). */
  selectBlock?: (id: string, additive?: boolean) => void;
  /** Empty the selection set. Bound to Escape at the editor root. */
  clearSelection?: () => void;
  /** Manifest patcher exposed via context so deep canvas
   *  primitives (SectionStamp, FooterBouquet, ConfettiBurst)
   *  can wrap themselves in edit overlays without prop-drilling
   *  the editor's onEditField through ten layers. */
  onEditField?: (patch: (m: StoryManifest) => StoryManifest) => void;
  /** Icon name overrides keyed by purpose (e.g.
   *  'stamp.story.fallback'). Surfaced here so deep primitives
   *  can swap their default glyph without prop-drilling. */
  iconOverrides?: Record<string, string>;
}

const defaultCtx: EditorCanvasContextShape = {
  editMode: false,
};

const EditorCanvasContext = createContext<EditorCanvasContextShape>(defaultCtx);

export function EditorCanvasProvider({
  value,
  children,
}: {
  value: EditorCanvasContextShape;
  children: ReactNode;
}) {
  return <EditorCanvasContext.Provider value={value}>{children}</EditorCanvasContext.Provider>;
}

export function useEditorCanvas(): EditorCanvasContextShape {
  return useContext(EditorCanvasContext);
}

/** Convenience: returns true only when we're in edit mode.
 *  Lets callers short-circuit edit-specific work cheaply. */
export function useIsEditMode(): boolean {
  return useContext(EditorCanvasContext).editMode;
}
