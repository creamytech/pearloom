'use client';

/* eslint-disable no-restricted-syntax */
/* Bridge: production manifest state → prototype-style locals.
   Keeps the shell pure prototype shape while autosave + undo + publish
   live behind a stable interface. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
/* useEffect imported above; explicit so the beforeunload + cleanup
   wiring stays obvious to future readers. */
import type { StoryManifest } from '@/types';
import { buildSitePath, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

interface BridgeInput {
  initialManifest: StoryManifest;
  initialNames: [string, string];
  siteSlug: string;
}

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

export interface EditorBridge {
  manifest: StoryManifest;
  names: [string, string];
  setManifest: (next: StoryManifest) => void;
  setNames: (next: [string, string]) => void;
  editField: (patch: (m: StoryManifest) => StoryManifest) => void;
  savedAt: string;
  saveState: SaveState;
  displayNames: string;
  prettyUrl: string;
  prettyPath: string;
  completion: number;
  openPublish: () => void;
  openSettings: () => void;
  openThemeShop: () => void;
  openDecor: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/* Autosave debounce window — same value the old EditorClient used so
   keystroke bursts coalesce into a single POST. */
const AUTOSAVE_DEBOUNCE_MS = 2000;

/* Names sanitiser — strips UUID/hex/numeric-only slug fragments from
   either name slot so the published renderer never shows "F7d9a3b2"
   in the hero. Applies once when the manifest first loads + on every
   setNames call. */
const isUuidLike = (s: string): boolean =>
  /^[0-9a-f]{4,}$/i.test(s) || /^\d+$/.test(s) || s.toLowerCase() === 'couple';
const cleanName = (s: string, fallback: string): string =>
  s && !isUuidLike(s) ? s : fallback;
const sanitiseNames = (raw: [string, string]): [string, string] => [
  cleanName(raw[0] ?? '', ''),
  cleanName(raw[1] ?? '', ''),
];

export function useEditorRedesignBridge({ initialManifest, initialNames, siteSlug }: BridgeInput): EditorBridge {
  const [manifest, setManifestState] = useState<StoryManifest>(initialManifest);
  const [names, setNamesState] = useState<[string, string]>(() => sanitiseNames(initialNames));
  const [savedAt, setSavedAt] = useState<string>('just now');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPayload = useRef<{ manifest: StoryManifest; names: [string, string] }>({ manifest: initialManifest, names: initialNames });

  /* Undo/redo — a simple manifest history. Each setManifest call
     pushes a snapshot; undo rewinds the cursor. Capped at 50 to keep
     memory in check. */
  const history = useRef<{ stack: StoryManifest[]; cursor: number }>({ stack: [initialManifest], cursor: 0 });
  const [historyTick, setHistoryTick] = useState(0);
  const pushHistory = useCallback((m: StoryManifest) => {
    const { stack, cursor } = history.current;
    /* Slice off forward history once the user edits after an undo. */
    const head = stack.slice(0, cursor + 1);
    head.push(m);
    const next = head.length > 50 ? head.slice(head.length - 50) : head;
    history.current = { stack: next, cursor: next.length - 1 };
    setHistoryTick((t) => t + 1);
  }, []);
  const canUndo = history.current.cursor > 0;
  const canRedo = history.current.cursor < history.current.stack.length - 1;
  void historyTick;

  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
  const prettyPath = buildSitePath(siteSlug, '', occasion);
  const prettyUrl = formatSiteDisplayUrl(siteSlug, '', occasion);

  const displayNames = useMemo(() => {
    const [a, b] = names;
    if (a && b) return `${a} & ${b}`;
    return a || b || 'Your site';
  }, [names]);

  /* Completion %% — quick fill-state heuristic across the canonical
     manifest fields. Mirrors what production's SiteCompletenessPanel
     computes but condensed to a single number for the rail. */
  const completion = useMemo(() => {
    const checks = [
      Boolean(names[0] && names[1]),
      Boolean((manifest as unknown as { logistics?: { date?: string } }).logistics?.date),
      Boolean((manifest as unknown as { logistics?: { venue?: string } }).logistics?.venue),
      Boolean((manifest.chapters ?? []).length > 0),
      Boolean((manifest.events ?? []).length > 0),
      Boolean((manifest.faqs ?? []).length > 0),
      Boolean((manifest as unknown as { themeId?: string }).themeId),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [manifest, names]);

  const persist = useCallback(
    (m: StoryManifest, n: [string, string]) => {
      if (typeof window === 'undefined') return;
      latestPayload.current = { manifest: m, names: n };
      setSaveState('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveState('saving');
        const body = JSON.stringify({ siteSlug, manifest: m, names: n });
        fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          /* keepalive lets the request complete even if the user
             navigates away mid-flight. Same body the beforeunload
             handler sendBeacon's on unload. */
          keepalive: true,
        }).then((res) => {
          if (!res.ok) throw new Error(`save failed: ${res.status}`);
          setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
          setSaveState('saved');
        }).catch(() => {
          setSaveState('error');
          /* Next change will retry via the debounce timer. */
        });
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [siteSlug],
  );

  /* beforeunload — flush in-flight changes via sendBeacon so the
     last edit makes it to the server even if the user closes the
     tab during the 2-second debounce window. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flush = () => {
      const { manifest: m, names: n } = latestPayload.current;
      const body = JSON.stringify({ siteSlug, manifest: m, names: n });
      try {
        navigator.sendBeacon('/api/sites', new Blob([body], { type: 'application/json' }));
      } catch {
        /* sendBeacon can throw on some browsers when the page is
           already unloading — swallow. */
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState !== 'saved') {
        flush();
        /* Show the native "you have unsaved changes" prompt while
           the beacon fires in the background. */
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [siteSlug, saveState]);

  const setManifest = useCallback((next: StoryManifest) => {
    const incomingNames = (next as unknown as { names?: [string, string] }).names;
    const nextNames = Array.isArray(incomingNames) && incomingNames.length === 2
      ? sanitiseNames(incomingNames as [string, string])
      : names;
    setManifestState(next);
    if (nextNames[0] !== names[0] || nextNames[1] !== names[1]) {
      setNamesState(nextNames);
    }
    pushHistory(next);
    persist(next, nextNames);
  }, [persist, names, pushHistory]);

  const undo = useCallback(() => {
    if (history.current.cursor <= 0) return;
    history.current.cursor -= 1;
    const prev = history.current.stack[history.current.cursor];
    setManifestState(prev);
    persist(prev, names);
    setHistoryTick((t) => t + 1);
  }, [persist, names]);

  const redo = useCallback(() => {
    if (history.current.cursor >= history.current.stack.length - 1) return;
    history.current.cursor += 1;
    const next = history.current.stack[history.current.cursor];
    setManifestState(next);
    persist(next, names);
    setHistoryTick((t) => t + 1);
  }, [persist, names]);

  /* Keyboard shortcuts — Cmd/Ctrl+Z + Shift to redo. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const setNames = useCallback((next: [string, string]) => {
    const clean = sanitiseNames(next);
    setNamesState(clean);
    persist(manifest, clean);
  }, [persist, manifest]);

  /* editField — patch-function variant matching the renderer's
     FieldEditor signature. The renderer hands us a manifest
     transformer; we apply it, persist, and store the next manifest. */
  const editField = useCallback((patch: (m: StoryManifest) => StoryManifest) => {
    setManifestState((prev) => {
      const next = patch(prev);
      persist(next, names);
      return next;
    });
  }, [persist, names]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const openPublish = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-publish'));
  }, []);
  const openSettings = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-settings'));
  }, []);
  const openThemeShop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-theme-shop'));
  }, []);
  const openDecor = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-decor-library'));
  }, []);

  return {
    manifest,
    names,
    setManifest,
    setNames,
    editField,
    savedAt,
    saveState,
    displayNames,
    prettyUrl,
    prettyPath,
    completion,
    openPublish,
    openSettings,
    openThemeShop,
    openDecor,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
