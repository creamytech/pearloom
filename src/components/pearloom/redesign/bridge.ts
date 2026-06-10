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
import { stripArtForStorage } from '@/lib/editor-state';

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
  /* In-flight guard: prevents two POSTs racing against the same
     Supabase row. If a save is mid-flight when a new edit lands,
     we stash the latest payload + queue a follow-up that fires
     once the in-flight POST resolves. */
  const saveInFlight = useRef<boolean>(false);
  const pendingFollowup = useRef<boolean>(false);
  /* Retry counter for transient failures (5xx, network errors).
     Resets on each successful save. Capped so we don't spin
     forever on a permanent outage. */
  const retryAttempt = useRef<number>(0);

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

  /* fireSave — the actual POST, factored out so the in-flight
     guard + retry timer can re-enter without re-arming the
     debounce. Returns nothing; updates saveState as it progresses. */
  const fireSave = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (saveInFlight.current) {
      /* Another save is mid-flight; mark a follow-up pending so we
         re-fire once the in-flight one resolves with whatever the
         newest payload happens to be at that moment. */
      pendingFollowup.current = true;
      return;
    }
    saveInFlight.current = true;
    setSaveState('saving');
    /* Strip base64 DataURLs from chapter images + vibeSkin so the
       JSON payload stays small. NOTE: deliberately NOT using
       keepalive on the regular autosave — keepalive imposes a
       64 KB body cap, which silently rejects any manifest with
       photos still embedded as base64. beforeunload uses
       sendBeacon (which has the same 64 KB cap) but at that
       point we've already stripped art too. */
    const { manifest: m, names: n } = latestPayload.current;
    const m2 = stripArtForStorage(m);
    const body = JSON.stringify({ subdomain: siteSlug, manifest: m2, names: n });
    fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).then(async (res) => {
      saveInFlight.current = false;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[redesign/bridge] save failed ${res.status}:`, text);
        /* 4xx is permanent (bad payload, auth, conflict). 5xx +
           network errors are transient — back off and retry up
           to 3 times. */
        if (res.status >= 500 || res.status === 0) {
          if (retryAttempt.current < 3) {
            retryAttempt.current += 1;
            const wait = [2000, 6000, 18000][retryAttempt.current - 1] ?? 18000;
            setTimeout(fireSave, wait);
            setSaveState('unsaved');
            return;
          }
        }
        setSaveState('error');
        return;
      }
      retryAttempt.current = 0;
      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setSaveState('saved');
      /* A follow-up edit may have landed while this POST was in
         flight; fire one more save with the newest payload. */
      if (pendingFollowup.current) {
        pendingFollowup.current = false;
        fireSave();
      }
    }).catch((err) => {
      saveInFlight.current = false;
      console.error('[redesign/bridge] save network error:', err);
      if (retryAttempt.current < 3) {
        retryAttempt.current += 1;
        const wait = [2000, 6000, 18000][retryAttempt.current - 1] ?? 18000;
        setTimeout(fireSave, wait);
        setSaveState('unsaved');
        return;
      }
      setSaveState('error');
    });
  }, [siteSlug]);

  const persist = useCallback(
    (m: StoryManifest, n: [string, string]) => {
      if (typeof window === 'undefined') return;
      latestPayload.current = { manifest: m, names: n };
      setSaveState('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(fireSave, AUTOSAVE_DEBOUNCE_MS);
    },
    [fireSave],
  );

  /* beforeunload — flush in-flight changes via sendBeacon so the
     last edit makes it to the server even if the user closes the
     tab during the 2-second debounce window. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flush = () => {
      const { manifest: m, names: n } = latestPayload.current;
      const m2 = stripArtForStorage(m);
      const body = JSON.stringify({ subdomain: siteSlug, manifest: m2, names: n });
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

  /* Keyboard shortcuts — Cmd/Ctrl+Z (+Shift = redo), Cmd+S
     (flush the autosave debounce now — pure muscle-memory
     reassurance; the topbar dot flips Saving… → Saved), and
     Cmd+Enter (open the publish flow, unless the host is typing
     in a field that uses it as its own submit). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
      else if (e.key === 's') {
        e.preventDefault();
        if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
        fireSave();
      } else if (e.key === 'Enter') {
        const ae = document.activeElement as HTMLElement | null;
        const typing = !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
        if (!typing) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('pearloom:open-publish'));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, fireSave]);

  const setNames = useCallback((next: [string, string]) => {
    const clean = sanitiseNames(next);
    setNamesState(clean);
    persist(manifest, clean);
  }, [persist, manifest]);

  /* editField — patch-function variant matching the renderer's
     FieldEditor signature. The renderer hands us a manifest
     transformer; we apply it, push history, persist, and store
     the next manifest. Runs OUTSIDE the setState updater so
     StrictMode's double-invocation doesn't fire persist twice. */
  const editField = useCallback((patch: (m: StoryManifest) => StoryManifest) => {
    const next = patch(manifest);
    setManifestState(next);
    pushHistory(next);
    persist(next, names);
  }, [manifest, persist, names, pushHistory]);

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
