'use client';

// ─────────────────────────────────────────────────────────────
// useStudioState — Studio editor state + manifest persistence.
//
// State is split into persisted vs ephemeral:
//   - PERSISTED (round-trip via manifest.studio): type, view,
//     draft, palette, fontPair, layout, motif, tone,
//     customMotifUrl, assets, drafts, copyOverrides, showAssets.
//   - EPHEMERAL (reset on every mount): showSend (modal flag),
//     animate.
//
// Saves are debounced 1500ms and posted to /api/sites. Reads
// come from props on first mount.
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
  showAssets?: boolean;
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
    showAssets: studio.showAssets ?? DEFAULT_STATE.showAssets,
  };
}

export function useStudioState(args: {
  siteSlug: string;
  manifest: StoryManifest;
}) {
  const [state, setState] = useState<StudioState>(() => readInitialState(args.manifest));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  /** True between the start of the network POST and the
   *  setSavedAt() that follows. The 1500ms debounce window
   *  doesn't count — only the actual flush. */
  const [saving, setSaving] = useState(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Holds the most-recent serialised manifest. The
   *  beforeunload handler uses it to fire a sendBeacon when
   *  the host closes the tab inside the debounce window. */
  const pendingPayload = useRef<string | null>(null);
  /** True when there's an unflushed change (debounce timer
   *  pending OR a network POST in flight). beforeunload
   *  triggers the browser's native confirmation when this is
   *  true. */
  const dirty = useRef<boolean>(false);

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
      showAssets: state.showAssets,
    };
    const nextManifest = {
      ...args.manifest,
      studio: writableFields,
    } as unknown as StoryManifest;
    const payload = JSON.stringify({ subdomain: args.siteSlug, manifest: nextManifest });
    pendingPayload.current = payload;
    dirty.current = true;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(async () => {
      const now = Date.now();
      setSaving(true);
      try {
        await fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        setSavedAt(now);
        dirty.current = false;
      } catch {
        // Silent — autosave is best-effort. The host can re-trigger
        // by changing any field. dirty stays true so beforeunload
        // still warns until the next successful flush.
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => { if (flushTimer.current) clearTimeout(flushTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.type, state.view, state.draft, state.palette, state.fontPair,
    state.layout, state.motif, state.tone, state.customMotifUrl,
    state.assets, state.drafts, state.copyOverrides, state.showAssets,
    args.siteSlug,
  ]);

  // beforeunload — when the host closes the tab inside the
  // debounce window, fire a sendBeacon with the most recent
  // payload AND set returnValue so the browser surfaces its
  // native "you have unsaved changes" dialog.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty.current || !pendingPayload.current) return;
      try {
        const blob = new Blob([pendingPayload.current], { type: 'application/json' });
        navigator.sendBeacon('/api/sites', blob);
      } catch {
        // sendBeacon failures are silent; the native dialog
        // is the host's last line of defence.
      }
      e.preventDefault();
      // Setting returnValue on the event is what triggers the
      // browser's confirmation prompt. Most browsers ignore the
      // string and show their own copy.
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return useMemo(() => ({ state, setField, setMany, savedAt, saving }), [state, setField, setMany, savedAt, saving]);
}
