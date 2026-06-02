'use client';

/* eslint-disable no-restricted-syntax */
/* Bridge: production manifest state → prototype-style locals.
   Keeps the shell pure prototype shape while autosave + undo + publish
   live behind a stable interface. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { buildSitePath, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

interface BridgeInput {
  initialManifest: StoryManifest;
  initialNames: [string, string];
  siteSlug: string;
}

export interface EditorBridge {
  manifest: StoryManifest;
  names: [string, string];
  setManifest: (next: StoryManifest) => void;
  setNames: (next: [string, string]) => void;
  editField: (patch: (m: StoryManifest) => StoryManifest) => void;
  savedAt: string;
  displayNames: string;
  prettyUrl: string;
  prettyPath: string;
  completion: number;
  openPublish: () => void;
  openSettings: () => void;
  openThemeShop: () => void;
  openDecor: () => void;
}

/* Autosave debounce window — same value the old EditorClient used so
   keystroke bursts coalesce into a single POST. */
const AUTOSAVE_DEBOUNCE_MS = 2000;

export function useEditorRedesignBridge({ initialManifest, initialNames, siteSlug }: BridgeInput): EditorBridge {
  const [manifest, setManifestState] = useState<StoryManifest>(initialManifest);
  const [names, setNamesState] = useState<[string, string]>(initialNames);
  const [savedAt, setSavedAt] = useState<string>('just now');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const body = JSON.stringify({ siteSlug, manifest: m, names: n });
        fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }).then(() => {
          setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
        }).catch(() => {
          /* swallow — the next change will retry */
        });
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [siteSlug],
  );

  const setManifest = useCallback((next: StoryManifest) => {
    setManifestState(next);
    persist(next, names);
  }, [persist, names]);

  const setNames = useCallback((next: [string, string]) => {
    setNamesState(next);
    persist(manifest, next);
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
    displayNames,
    prettyUrl,
    prettyPath,
    completion,
    openPublish,
    openSettings,
    openThemeShop,
    openDecor,
  };
}
