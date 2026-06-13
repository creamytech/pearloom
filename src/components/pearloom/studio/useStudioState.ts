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
import { studioDefaultsFromLook } from './studio-defaults-from-look';
import {
  DEFAULT_ASSET_PALETTE,
  PALETTES,
  STUDIO_TEXTURES,
  FONT_PAIRS,
  LAYOUTS,
  MOTIFS,
  COPY_TONES,
  type AssetEntry,
  type StationeryType,
  type CardView,
  type StudioDraft,
} from './studio-constants';

/** Host-typed color overrides — each key, when set, wins over the
 *  preset palette's matching slot. Mirrors the site editor's
 *  "Tweak colors" panel so the suite can match a custom site. */
export interface StudioCustomColors {
  paper?: string;
  ink?: string;
  accent?: string;
  accent2?: string;
}

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
   *  host picks a different built-in motif. The site editor's
   *  decor library feeds this too (RemixRail's Decor group). */
  customMotifUrl: string | null;
  /** Custom color overrides on top of the preset palette. */
  customColors: StudioCustomColors | null;
  /** Card paper texture ([data-pl-texture] id) — null = smooth. */
  texture: string | null;
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
  customColors: null,
  texture: null,
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
  customColors?: StudioCustomColors | null;
  texture?: string | null;
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

// Validate enum-shaped persisted fields against the canonical
// option lists. A corrupt or stale manifest (e.g. a palette id
// renamed in a later release) silently falls back to the
// default instead of letting an invalid id propagate into the
// renderer where it'd render as the empty / wrong card.
const VALID_TYPES: ReadonlySet<StationeryType> = new Set(['std', 'invite', 'thanks']);
const VALID_VIEWS: ReadonlySet<CardView> = new Set(['front', 'back', 'envelope']);
const VALID_PALETTES = new Set(PALETTES.map(p => p.id));
const VALID_FONTS = new Set(FONT_PAIRS.map(f => f.id));
const VALID_LAYOUTS = new Set(LAYOUTS.map(l => l.id));
const VALID_MOTIFS = new Set(MOTIFS.map(m => m.id));
const VALID_TONES = new Set(COPY_TONES.map(t => t.id));
const VALID_TEXTURES = new Set(STUDIO_TEXTURES.map(t => t.id));

const HEX_RX = /^#[0-9a-fA-F]{6}$/;
function sanitizeCustomColors(raw: unknown): StudioCustomColors | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: StudioCustomColors = {};
  for (const key of ['paper', 'ink', 'accent', 'accent2'] as const) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string' && HEX_RX.test(v)) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function pick<T extends string>(value: unknown, allowed: ReadonlySet<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

function readInitialState(manifest: StoryManifest | null | undefined): StudioState {
  const studio = (manifest as unknown as { studio?: ManifestStudio } | null)?.studio;
  /* First-time Studio open on this site (no persisted studio
     state) — seed from the host's Site Look (Edition / Kit /
     accent / voice) so the stationery matches the site rather
     than opening on a generic lavender card. The brief's §6:
     "matched stationery suite from the same SiteLook." */
  if (!studio) {
    if (!manifest) return DEFAULT_STATE;
    const lookSeeded = studioDefaultsFromLook(manifest);
    return {
      ...DEFAULT_STATE,
      palette: VALID_PALETTES.has(lookSeeded.palette) ? lookSeeded.palette : DEFAULT_STATE.palette,
      fontPair: VALID_FONTS.has(lookSeeded.fontPair) ? lookSeeded.fontPair : DEFAULT_STATE.fontPair,
      layout: VALID_LAYOUTS.has(lookSeeded.layout) ? lookSeeded.layout : DEFAULT_STATE.layout,
      motif: VALID_MOTIFS.has(lookSeeded.motif) ? lookSeeded.motif : DEFAULT_STATE.motif,
      tone: VALID_TONES.has(lookSeeded.tone) ? lookSeeded.tone : DEFAULT_STATE.tone,
    };
  }
  return {
    ...DEFAULT_STATE,
    type: pick(studio.type, VALID_TYPES, DEFAULT_STATE.type),
    view: pick(studio.view, VALID_VIEWS, DEFAULT_STATE.view),
    draft: studio.draft ?? DEFAULT_STATE.draft,
    palette: pick(studio.palette, VALID_PALETTES, DEFAULT_STATE.palette),
    fontPair: pick(studio.fontPair, VALID_FONTS, DEFAULT_STATE.fontPair),
    layout: pick(studio.layout, VALID_LAYOUTS, DEFAULT_STATE.layout),
    motif: pick(studio.motif, VALID_MOTIFS, DEFAULT_STATE.motif),
    tone: pick(studio.tone, VALID_TONES, DEFAULT_STATE.tone),
    customMotifUrl: studio.customMotifUrl ?? null,
    customColors: sanitizeCustomColors(studio.customColors),
    texture: typeof studio.texture === 'string' && VALID_TEXTURES.has(studio.texture) ? studio.texture : null,
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
  /** True when the most recent flush failed (network error or
   *  non-2xx response). The Studio rail surfaces this so the
   *  host knows their tweaks aren't persisted. Cleared on the
   *  next successful flush. */
  const [saveError, setSaveError] = useState(false);
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
  /** First-render gate. The autosave effect runs once on mount
   *  with the just-loaded state — those values came from the
   *  manifest we just read, so persisting them is a no-op DB
   *  write. Skipping the first run avoids that AND eliminates a
   *  race in the e2e suite where the mount-time save could land
   *  before the host's first edit, capturing the default
   *  manifest slice instead of the edited one. */
  const hasMounted = useRef<boolean>(false);

  const setField: SetStudioField = useCallback((key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  /** Apply multiple field updates atomically. */
  const setMany = useCallback((patch: Partial<StudioState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // The actual POST. Extracted so the topbar's "Try again" link
  // can call it directly without waiting on the debounce window
  // to elapse from a future change.
  const flushNow = useCallback(async () => {
    const payload = pendingPayload.current;
    if (!payload) return;
    const now = Date.now();
    setSaving(true);
    try {
      const r = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      // fetch resolves successfully on 4xx/5xx — without this
      // check a 500 would silently set savedAt and clear dirty
      // even though nothing was persisted.
      if (!r.ok) throw new Error(`save ${r.status}`);
      setSavedAt(now);
      setSaveError(false);
      dirty.current = false;
    } catch {
      // Surface the failure so the host doesn't trust a stale
      // "Saved 12s ago" label. dirty stays true so beforeunload
      // still warns until the next successful flush.
      setSaveError(true);
    } finally {
      setSaving(false);
    }
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
      customColors: state.customColors,
      texture: state.texture,
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
    // First-render call captures the just-loaded state. There's
    // nothing to save — those values came out of the manifest we
    // just read. Skip the timer + dirty flag; subsequent renders
    // (real edits) take the normal path.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    dirty.current = true;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => { void flushNow(); }, 1500);
    return () => { if (flushTimer.current) clearTimeout(flushTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.type, state.view, state.draft, state.palette, state.fontPair,
    state.layout, state.motif, state.tone, state.customMotifUrl,
    state.assets, state.drafts, state.copyOverrides, state.showAssets,
    args.siteSlug,
  ]);

  // Unmount flush — SPA navigation via next/link triggers a
  // component unmount but NOT beforeunload. The debounce cleanup
  // would clear the pending timer with no save fired, losing
  // every edit made in the last <1500ms. Fire a sendBeacon with
  // the latest payload on unmount so the back-arrow to /dashboard
  // doesn't drop work silently.
  useEffect(() => {
    return () => {
      if (!dirty.current || !pendingPayload.current) return;
      try {
        const blob = new Blob([pendingPayload.current], { type: 'application/json' });
        navigator.sendBeacon('/api/sites', blob);
      } catch {
        // sendBeacon failures are silent — the user already left.
      }
    };
  }, []);

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

  return useMemo(
    () => ({ state, setField, setMany, savedAt, saving, saveError, retrySave: flushNow }),
    [state, setField, setMany, savedAt, saving, saveError, flushNow],
  );
}
