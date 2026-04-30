'use client';

// ─────────────────────────────────────────────────────────────
// useStudioState — Studio editor state + manifest persistence.
//
// State is split into:
//   - tweaks (palette / layout / fontPair / motif / tone / view /
//     showSend / showAssets / showPear / animate) — UI ergonomics
//     persisted under manifest.studio.{type}.tweaks.
//   - per-type drafts list (3 AI directions) — persisted under
//     manifest.studio.{type}.drafts so re-drafts stick.
//   - assets array (built-in + AI-generated) persisted under
//     manifest.studio.assets.
//
// Saves are debounced and posted to /api/sites (the editor's
// shared autosave path). Reads come from props on first mount.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import {
  DEFAULT_ASSET_PALETTE,
  type AssetEntry,
  type StationeryType,
  type CardView,
  type StudioDraft,
} from './studio-constants';

export interface StudioState {
  type: StationeryType;
  view: CardView;
  draft: string;
  palette: string;
  fontPair: string;
  layout: string;
  motif: string;
  tone: string;
  showSend: boolean;
  showAssets: boolean;
  showPear: boolean;
  animate: boolean;
  /** Asset palette — built-in + AI-generated stickers. */
  assets: AssetEntry[];
  /** When set, the active card's motif renders a custom AI-
   *  generated PNG instead of the SVG glyph. Cleared when the
   *  host picks a different built-in motif. */
  customMotifUrl: string | null;
  /** AI-drafted alternates per stationery type. Falls back to the
   *  built-in TYPE_CONTENT defaults when empty. */
  drafts: Partial<Record<StationeryType, StudioDraft[]>>;
  /** Per-type copy overrides — host-typed text that wins over the
   *  built-in TYPE_CONTENT defaults but loses to locked fields
   *  (headline, line3) which always come from the manifest. */
  copyOverrides: Partial<Record<StationeryType, {
    eyebrow?: string;
    line2?: string;
    line4?: string;
    cta?: string;
  }>>;
}

const DEFAULT_STATE: StudioState = {
  type: 'invite',
  view: 'front',
  draft: 'editorial',
  palette: 'lavender',
  fontPair: 'editorial',
  layout: 'classic',
  motif: 'stamp',
  tone: 'warm',
  showSend: false,
  showAssets: true,
  showPear: true,
  animate: true,
  assets: DEFAULT_ASSET_PALETTE,
  customMotifUrl: null,
  drafts: {},
  copyOverrides: {},
};

export type SetStudioField = <K extends keyof StudioState>(key: K, value: StudioState[K]) => void;

interface ManifestStudio {
  type?: StationeryType;
  view?: CardView;
  draft?: string;
  palette?: string;
  fontPair?: string;
  layout?: string;
  motif?: string;
  tone?: string;
  customMotifUrl?: string | null;
  assets?: AssetEntry[];
  drafts?: Partial<Record<StationeryType, StudioDraft[]>>;
  copyOverrides?: Partial<Record<StationeryType, {
    eyebrow?: string;
    line2?: string;
    line4?: string;
    cta?: string;
  }>>;
}

function readInitialState(manifest: StoryManifest | null | undefined): StudioState {
  const studio = (manifest as unknown as { studio?: ManifestStudio } | null)?.studio;
  if (!studio) return DEFAULT_STATE;
  return {
    ...DEFAULT_STATE,
    type: (studio.type as StationeryType) ?? DEFAULT_STATE.type,
    view: (studio.view as CardView) ?? DEFAULT_STATE.view,
    draft: studio.draft ?? DEFAULT_STATE.draft,
    palette: studio.palette ?? DEFAULT_STATE.palette,
    fontPair: studio.fontPair ?? DEFAULT_STATE.fontPair,
    layout: studio.layout ?? DEFAULT_STATE.layout,
    motif: studio.motif ?? DEFAULT_STATE.motif,
    tone: studio.tone ?? DEFAULT_STATE.tone,
    customMotifUrl: studio.customMotifUrl ?? null,
    assets: Array.isArray(studio.assets) && studio.assets.length > 0
      ? studio.assets
      : DEFAULT_ASSET_PALETTE,
    drafts: studio.drafts ?? {},
    copyOverrides: studio.copyOverrides ?? {},
  };
}

export function useStudioState(args: {
  siteSlug: string;
  manifest: StoryManifest;
  onPersist?: (next: StoryManifest) => void;
}) {
  const [state, setState] = useState<StudioState>(() => readInitialState(args.manifest));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastFlush = useRef<number>(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField: SetStudioField = useCallback((key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  /** Apply multiple field updates atomically. */
  const setMany = useCallback((patch: Partial<StudioState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // Debounced persistence to /api/sites. Skips ephemeral fields
  // like showSend / animate so closing the modal doesn't trigger
  // a full save.
  useEffect(() => {
    const writableFields: ManifestStudio = {
      type: state.type,
      view: state.view,
      draft: state.draft,
      palette: state.palette,
      fontPair: state.fontPair,
      layout: state.layout,
      motif: state.motif,
      tone: state.tone,
      customMotifUrl: state.customMotifUrl,
      assets: state.assets,
      drafts: state.drafts,
      copyOverrides: state.copyOverrides,
    };
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(async () => {
      const now = Date.now();
      lastFlush.current = now;
      try {
        const nextManifest = {
          ...args.manifest,
          studio: writableFields,
        } as unknown as StoryManifest;
        await fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: args.siteSlug, manifest: nextManifest }),
        });
        setSavedAt(now);
        args.onPersist?.(nextManifest);
      } catch {
        // Silent — autosave is best-effort. The host can re-trigger
        // by changing any field.
      }
    }, 1500);
    return () => { if (flushTimer.current) clearTimeout(flushTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.type, state.view, state.draft, state.palette, state.fontPair,
    state.layout, state.motif, state.tone, state.customMotifUrl,
    state.assets, state.drafts, state.copyOverrides,
    args.siteSlug,
  ]);

  return useMemo(() => ({ state, setField, setMany, savedAt }), [state, setField, setMany, savedAt]);
}
