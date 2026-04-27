'use client';

/* ========================================================================
   PEARLOOM EDITOR — v8 full block editor
   Left outline → which block is being edited
   Center → live site preview (iframe into /sites/{slug})
   Right → the selected block's edit panel with all its fields
   Autosaves on change, posts to /api/sites, reloads the iframe on save.
   ======================================================================== */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { migrateManifest } from '@/lib/manifest-migrations';
import { captureSnapshot } from '@/lib/snapshots';
import { Icon, Pear, PearloomLogo } from '../motifs';
import { buildSitePath, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { stripArtForStorage } from '@/lib/editor-state';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { CanvasStage } from './canvas/CanvasStage';
import { FirstThreadTour } from './FirstThreadTour';
import { DecorGenerationToast } from './DecorGenerationToast';
import { DecorRecolorModal } from './DecorRecolorModal';
import { IconSwapModal } from './IconSwapModal';
import { ThemeQuickBar } from './canvas/ThemeQuickBar';
import { EditorCanvasProvider } from './canvas/EditorCanvasContext';
import { AssetLibraryPanel } from './panels/AssetLibraryPanel';
import { DecorLibraryPanel } from './panels/DecorLibraryPanel';
import { useEditorHistory } from './canvas/useEditorHistory';
import { HeroPanel } from './panels/HeroPanel';
import { NavPanel } from './panels/NavPanel';
import { StoryPanel } from './panels/StoryPanel';
import { DetailsPanel } from './panels/DetailsPanel';
import { SchedulePanel } from './panels/SchedulePanel';
import { TravelPanel } from './panels/TravelPanel';
import { BlockStylePanel } from './panels/BlockStylePanel';
import { RegistryPanel } from './panels/RegistryPanel';
import { GalleryPanel } from './panels/GalleryPanel';
import { RsvpPanel } from './panels/RsvpPanel';
import { FaqPanel } from './panels/FaqPanel';
import { ToastsPanel } from './panels/ToastsPanel';
import { ThemePanel } from './panels/ThemePanel';
import { PanelSearch } from './atoms';
import { blockFillState, FILL_STATE_COLORS, type ScoredBlockKey } from '@/lib/site-progress';
import { PearCommand } from './PearCommand';
import { DesignAdvisor } from './DesignAdvisor';
import { PearCopilot } from './pear/PearCopilot';

type BlockKey =
  | 'nav'
  | 'hero'
  | 'story'
  | 'details'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'gallery'
  | 'rsvp'
  | 'faq'
  | 'toasts'
  | 'theme';

type DeviceKey = 'desktop' | 'tablet' | 'phone';

type BlockDef = { key: BlockKey; label: string; icon: string; anchor: string; description: string; reorderable: boolean; togglable: boolean };

const BLOCKS: BlockDef[] = [
  { key: 'nav', label: 'Nav', icon: 'menu', anchor: 'top', description: 'Top navigation: brand icon, layout style, links.', reorderable: false, togglable: false },
  { key: 'hero', label: 'Hero', icon: 'image', anchor: 'top', description: 'Names, date, venue, tagline, cover photo.', reorderable: false, togglable: false },
  { key: 'story', label: 'Story', icon: 'text', anchor: 'our-story', description: 'How you got here — chapter by chapter.', reorderable: true, togglable: true },
  { key: 'details', label: 'Details', icon: 'section', anchor: 'details', description: 'Ceremony time, dress code, arrival notes.', reorderable: true, togglable: true },
  { key: 'schedule', label: 'Schedule', icon: 'clock', anchor: 'schedule', description: 'The flow of the day, minute by minute.', reorderable: true, togglable: true },
  { key: 'travel', label: 'Travel', icon: 'pin', anchor: 'travel', description: 'Venue map, directions, hotels.', reorderable: true, togglable: true },
  { key: 'registry', label: 'Registry', icon: 'gift', anchor: 'registry', description: 'Gift buckets and fund links.', reorderable: true, togglable: true },
  { key: 'gallery', label: 'Gallery', icon: 'gallery', anchor: 'gallery', description: 'The bento mosaic of favorites.', reorderable: true, togglable: true },
  { key: 'rsvp', label: 'RSVP', icon: 'mail', anchor: 'rsvp', description: 'Meal options, deadline, plus-ones.', reorderable: true, togglable: true },
  { key: 'faq', label: 'FAQ', icon: 'heart-icon', anchor: 'faq', description: 'Questions Pear anticipates from guests.', reorderable: true, togglable: true },
  { key: 'toasts', label: 'Vows & toasts', icon: 'mic', anchor: 'top', description: 'Drafts you can read from your phone.', reorderable: false, togglable: false },
  { key: 'theme', label: 'Theme', icon: 'palette', anchor: 'top', description: 'Palette, motif, spacing, typography.', reorderable: false, togglable: false },
];

const BLOCKS_BY_KEY: Record<BlockKey, BlockDef> = BLOCKS.reduce((acc, b) => ({ ...acc, [b.key]: b }), {} as Record<BlockKey, BlockDef>);

const REORDERABLE_KEYS: BlockKey[] = BLOCKS.filter((b) => b.reorderable).map((b) => b.key);

// Device preview widths — each pick is a real popular breakpoint.
//   desktop → 1280 (std laptop)
//   tablet  → 820  (iPad portrait)
//   phone   → 390  (iPhone 14)
// Users can drag the canvas edge to fine-tune past these presets.
const DEVICE_WIDTH: Record<DeviceKey, number> = { desktop: 1280, tablet: 820, phone: 390 };

export function EditorV8({
  manifest: initialManifest,
  siteSlug,
  names: initialNames,
  previewPathOverride,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
  /** Optional override for the preview iframe src (dev demos). */
  previewPathOverride?: string;
}) {
  const router = useRouter();

  // Editor ↔ dashboard chrome continuity: whenever the editor
  // mounts for a given site, pin that site as the dashboard's
  // selected site. Clicking "Back to dashboard" then lands on
  // a dashboard already scoped to the right event — no second
  // pick required. localStorage key matches useSelectedSite.
  useEffect(() => {
    if (typeof window === 'undefined' || !siteSlug) return;
    try { window.localStorage.setItem('pl-dash-site', siteSlug); }
    catch { /* noop */ }
  }, [siteSlug]);

  const [manifest, setManifest] = useState<StoryManifest>(() => {
    // Run any pending schema migrations BEFORE coercing themeFamily
    // so future migrations can reshape fields safely without the
    // editor going through a partial state.
    const migrated = migrateManifest(initialManifest) as StoryManifest;
    // V8 is the only supported theme family right now. Anything else
    // (legacy 'classic', unset, garbage value from a half-migrated
    // draft) is coerced to 'v8' so the canvas + published renderer
    // align. Log the override in dev so we know when this fires.
    const tf = (migrated as unknown as { themeFamily?: string }).themeFamily;
    if (tf === 'v8') return migrated;
    if (tf && process.env.NODE_ENV !== 'production') {
      console.warn(`[editor] Coerced themeFamily "${tf}" → "v8" on load.`);
    }
    return { ...migrated, themeFamily: 'v8' } as unknown as StoryManifest;
  });
  const [names, setNames] = useState<[string, string]>(initialNames);
  const [block, setBlock] = useState<BlockKey>('hero');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('section');
  // Snap to Section whenever the active block changes — clicking a
  // section in the canvas should land the user on what they clicked,
  // not on whatever tab was last open.
  useEffect(() => {
    setInspectorTab('section');
  }, [block]);
  const [device, setDevice] = useState<DeviceKey>('desktop');
  // Preview-as-guest toggle. When true, the canvas renders the
  // published-mode view (no edit chrome, no overlays) so the host
  // can read the page exactly as a guest will. Toggle via the
  // topbar eye button or ⌘P. Inspector + outline rail collapse
  // away at the same time so the canvas takes the whole width.
  const [previewMode, setPreviewMode] = useState(false);
  // Resizable inspector rail. Default 380px (the value we shipped as
  // a static width before this session). Clamped to 320–620px so the
  // canvas always has room and the panel never collapses below the
  // narrowest field-row layout. Persisted to localStorage so the
  // host's preferred width survives reloads — different events have
  // different "I want a wider rail" preferences (long FAQ blocks vs.
  // short hero blocks).
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 380;
    try {
      const raw = window.localStorage.getItem('pl-editor-inspector-w');
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n >= 320 && n <= 620) return n;
    } catch {}
    return 380;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('pl-editor-inspector-w', String(inspectorWidth)); } catch {}
  }, [inspectorWidth]);

  // ── Deep-link from external pages ──────────────────────────
  // Dashboard pages (Day-of room, kickoff cards, etc.) link to
  // /editor/{slug}?focus=<blockKey>&anchor=<themeAnchor> when
  // they want the host to land in a specific panel. We read the
  // search params on mount and dispatch the same events as the
  // in-editor Design dropdown so the editor lands in one place.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const focus = sp.get('focus');
    const anchor = sp.get('anchor');
    if (!focus && !anchor) return;
    // Defer one tick so all the editor providers/components mount
    // before we fire the jump.
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pearloom:design-jump', {
        detail: { block: focus ?? undefined, anchor: anchor ?? undefined },
      }));
    }, 120);
    // Strip the params so refresh doesn't re-jump.
    const url = new URL(window.location.href);
    url.searchParams.delete('focus');
    url.searchParams.delete('anchor');
    window.history.replaceState({}, '', url.toString());
    return () => clearTimeout(t);
  }, []);

  // Listen for canvas → inspector focus events so the floating
  // ✎ button on a section opens the matching Inspector panel.
  useEffect(() => {
    function onFocus(e: Event) {
      const detail = (e as CustomEvent<{ blockKey?: string }>).detail;
      const k = detail?.blockKey;
      if (!k) return;
      // Map renderer block keys (story/details/etc) to editor's
      // BlockKey union — 1:1 for the reorderable set.
      if (BLOCKS.some((b) => b.key === k)) {
        setBlock(k as BlockKey);
      }
    }
    function onFocusTab(e: Event) {
      const detail = (e as CustomEvent<{ tab?: 'section' | 'theme' | 'pear' }>).detail;
      if (detail?.tab) setInspectorTab(detail.tab);
    }
    // ── pearloom:design-jump ─────────────────────────────────
    // Top-level Design dropdown + ⌘K design entries fire this with
    // an `anchor` slug that matches a [data-pl-design-anchor=…] on
    // ThemePanel. The handler switches to the Theme tab, then waits
    // one render tick for the panel to mount before scrolling the
    // anchor into view. Two-step is intentional — without it the
    // first jump from a non-theme tab races the panel mount and
    // resolves on a stale DOM that doesn't have the anchor yet.
    function onDesignJump(e: Event) {
      const detail = (e as CustomEvent<{ anchor?: string; block?: string }>).detail;
      if (detail?.block && BLOCKS.some((b) => b.key === detail.block)) {
        setBlock(detail.block as BlockKey);
        setInspectorTab('section');
        return;
      }
      const anchor = detail?.anchor;
      if (!anchor) return;
      setInspectorTab('theme');
      setTimeout(() => {
        const el = document.querySelector(`[data-pl-design-anchor="${anchor}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
    window.addEventListener('pearloom:inspector-focus', onFocus as EventListener);
    window.addEventListener('pearloom:inspector-focus-tab', onFocusTab as EventListener);
    window.addEventListener('pearloom:design-jump', onDesignJump as EventListener);
    return () => {
      window.removeEventListener('pearloom:inspector-focus', onFocus as EventListener);
      window.removeEventListener('pearloom:inspector-focus-tab', onFocusTab as EventListener);
      window.removeEventListener('pearloom:design-jump', onDesignJump as EventListener);
    };
  }, []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Wall-clock timestamp of the most recent successful autosave.
  // Used by SaveDot to render a "Saved 2 min ago" tooltip so the
  // user can see the most recent persistence point at a glance.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  // Last successful publish — drives the "View live" pearl pill +
  // copy-link toast in the topbar. Reset to null on publish error so
  // the toast doesn't promise a URL the publish API didn't return.
  const [publishedAt, setPublishedAt] = useState<{ url: string; at: number } | null>(null);
  const [publishToast, setPublishToast] = useState<{ url: string } | null>(null);

  // If the site was already published before this session, hydrate
  // the live-URL pill from the manifest flag so the topbar shows
  // "Live" immediately on load. Without this the pill wouldn't
  // appear until the user re-published in this tab.
  useEffect(() => {
    const wasPublished = Boolean((manifest as unknown as { published?: boolean }).published);
    if (!wasPublished || publishedAt) return;
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    setPublishedAt({ url: `${origin}${prettyPath}`, at: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  // Mobile-first fallback. <960px collapses the 3-pane layout into
  // a single canvas with drawers for Outline + Inspector (P0 fix,
  // replaces the "editor requires a laptop" failure mode).
  const [isNarrow, setIsNarrow] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<'outline' | 'inspector' | null>(null);
  useEffect(() => {
    function update() {
      setIsNarrow(window.innerWidth < 960);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  // Auto-close the drawer whenever the user jumps to a new block
  // on mobile — feels like "you tapped a block, now edit it."
  useEffect(() => {
    if (isNarrow && mobileDrawer === 'outline') setMobileDrawer('inspector');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);
  // Ref to the canvas stage container — used for scroll-to-block
  // and click-to-select behaviour since the canvas now lives in
  // the same document as the editor chrome (no more iframe).
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const occasion = useMemo(() => normalizeOccasion((manifest as unknown as { occasion?: string }).occasion), [manifest]);
  const prettyPath = useMemo(
    () => previewPathOverride ?? buildSitePath(siteSlug, '', occasion),
    [siteSlug, occasion, previewPathOverride]
  );
  const prettyUrl = useMemo(() => formatSiteDisplayUrl(siteSlug, '', occasion), [siteSlug, occasion]);
  const displayNames = useMemo(() => names.filter(Boolean).join(' & ') || siteSlug, [names, siteSlug]);

  // Debounced autosave on every change. Since the canvas renders
  // in-DOM (CanvasStage), React state IS the preview — no
  // postMessage needed, edits show instantly.
  const queueSave = useCallback(
    (nextManifest: StoryManifest, nextNames: [string, string]) => {
      setSaveStatus('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        // If a previous autosave is in flight, skip this tick — the
        // next keystroke will schedule another timer and we'll pick
        // up the latest state. Prevents out-of-order writes clobbering
        // the server's record when the user types quickly.
        if (saveInFlight.current) {
          saveTimer.current = setTimeout(() => queueSave(nextManifest, nextNames), 300);
          return;
        }
        saveInFlight.current = true;
        try {
          const saveable = stripArtForStorage(nextManifest);
          const res = await fetch('/api/sites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdomain: siteSlug, manifest: saveable, names: nextNames }),
          });
          if (!res.ok) throw new Error(String(res.status));
          setSaveStatus('saved');
          setLastSavedAt(Date.now());
          setTimeout(() => setSaveStatus('idle'), 1400);
        } catch {
          setSaveStatus('error');
        } finally {
          saveInFlight.current = false;
        }
      }, 900);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siteSlug]
  );

  // Undo/redo — maintains an in-memory manifest+names stack and
  // listens for Cmd/Ctrl+Z / Shift+Z globally (skipping inputs).
  const restoreFromHistory = useCallback(
    (nextManifest: StoryManifest, nextNames: [string, string]) => {
      setManifest(nextManifest);
      setNames(nextNames);
      queueSave(nextManifest, nextNames);
    },
    [queueSave],
  );
  const history = useEditorHistory(manifest, names, restoreFromHistory, siteSlug);

  const onManifestChange = useCallback(
    (next: StoryManifest) => {
      setManifest(next);
      history.record(next, names);
      queueSave(next, names);
    },
    [names, queueSave, history]
  );

  const onNamesChange = useCallback(
    (nextNames: [string, string]) => {
      setNames(nextNames);
      history.record(manifest, nextNames);
      queueSave(manifest, nextNames);
    },
    [manifest, queueSave, history]
  );

  async function handlePublish() {
    // Real publish: hits /api/sites/publish which mirrors photos to
    // permanent storage, generates the vibe skin, and upserts the
    // published site row. The autosave endpoint only saves the draft.
    const saveable = stripArtForStorage(manifest);
    setSaveStatus('saving');
    setPublishError(null);
    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug, manifest: saveable, names }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Publish failed (${res.status})`);
      }
      // Capture a snapshot at publish time — this is the "version
      // your guests saw" record so the host can always rewind here.
      const snapped = captureSnapshot(
        { ...manifest, published: true } as StoryManifest,
        `Published ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
      );
      setManifest(snapped);
      // Record the published state in history so undo doesn't nuke the publish.
      history.record(snapped, names);
      // Invalidate the dashboard sites cache so the dashboard sees
      // the newly-published state (badge turns green, URL resolves).
      try {
        const { invalidateSitesCache } = await import('@/components/marketing/design/dash/hooks');
        invalidateSitesCache();
      } catch {}
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
      // Build the absolute URL so the copy-link button gives the
      // host something they can paste into a text message
      // immediately. Falls back to the relative path if origin
      // isn't available (SSR, sandboxed iframe).
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const absoluteUrl = origin ? `${origin}${prettyPath}` : prettyPath;
      setPublishedAt({ url: absoluteUrl, at: Date.now() });
      setPublishToast({ url: absoluteUrl });
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setPublishError(msg);
      setSaveStatus('error');
    }
  }

  // When the user picks a block in the outline rail, scroll that
  // section of the canvas into view and paint a temporary ring.
  // Now operates on the in-document canvas (`canvasRef`) — no
  // iframe, so a simple document query works.
  useEffect(() => {
    const target = BLOCKS_BY_KEY[block];
    const scope = canvasRef.current;
    if (!target || !scope) return;
    // Clear previous highlights. Wrapped in try so a borked selector
    // doesn't crash the editor shell.
    try {
      scope.querySelectorAll<HTMLElement>('[data-pl8-active="1"]').forEach((el) => {
        el.removeAttribute('data-pl8-active');
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.transition = '';
      });
    } catch {}

    const anchor = target.anchor;
    if (anchor === 'top') {
      scope.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Anchors are known kebab-case identifiers (top, our-story,
    // schedule, rsvp, etc.) — but still defensively validate to avoid
    // a CSS selector-injection from an unexpected block registration.
    if (!/^[a-z][a-z0-9-]*$/i.test(anchor)) return;
    let el: HTMLElement | null = null;
    try {
      el = scope.querySelector<HTMLElement>(`#${anchor}`);
    } catch {
      el = null;
    }
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.setAttribute('data-pl8-active', '1');
    el.style.transition = 'outline 220ms cubic-bezier(0.16, 1, 0.3, 1), outline-offset 220ms';
    el.style.outline = '3px solid var(--lavender-ink, #6B5A8C)';
    el.style.outlineOffset = '-8px';
  }, [block]);

  // When a block section on the canvas is clicked, select the
  // matching block in the outline rail. EditableText fields call
  // stopPropagation so their clicks don't bubble up; any other
  // click inside a section selects the block.
  useEffect(() => {
    const scope = canvasRef.current;
    if (!scope) return;
    const handler = (e: Event) => {
      const path = (e.composedPath?.() ?? []) as Array<EventTarget>;
      for (const node of path) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.id && BLOCKS.some((b) => b.anchor === node.id)) {
          const hit = BLOCKS.find((b) => b.anchor === node.id);
          if (hit) setBlock(hit.key);
          return;
        }
      }
    };
    scope.addEventListener('click', handler, true);
    return () => scope.removeEventListener('click', handler, true);
  }, []);

  // Block order + visibility — read/write into manifest.blockOrder / hiddenBlocks.
  const blockOrder = useMemo<BlockKey[]>(() => {
    const raw = (manifest as unknown as { blockOrder?: BlockKey[] }).blockOrder;
    const filtered = (raw ?? REORDERABLE_KEYS).filter((k): k is BlockKey => REORDERABLE_KEYS.includes(k));
    // Include any reorderable blocks not yet in the saved order (new blocks).
    for (const key of REORDERABLE_KEYS) {
      if (!filtered.includes(key)) filtered.push(key);
    }
    return filtered;
  }, [manifest]);

  const hiddenBlocks = useMemo<BlockKey[]>(() => {
    const raw = (manifest as unknown as { hiddenBlocks?: BlockKey[] }).hiddenBlocks;
    return Array.isArray(raw) ? raw : [];
  }, [manifest]);

  function reorderBlocks(next: BlockKey[]) {
    onManifestChange({ ...manifest, blockOrder: next } as unknown as StoryManifest);
  }
  function toggleBlockHidden(key: BlockKey) {
    const next = hiddenBlocks.includes(key)
      ? hiddenBlocks.filter((k) => k !== key)
      : [...hiddenBlocks, key];
    onManifestChange({ ...manifest, hiddenBlocks: next } as unknown as StoryManifest);
  }

  // Keyboard shortcuts:
  //   ⌘/Ctrl+↓ / ↑       — jump between sections in outline order
  //   ⌘/Ctrl+Shift+P     — publish
  //   ⌘/Ctrl+1 / 2 / 3   — switch inspector tab (Section / Theme / Pear)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      // Don't capture when the user is typing in a field — the
      // inspector tabs are a low-priority shortcut and should never
      // win against text input.
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      );
      const all: BlockKey[] = ['hero', ...blockOrder, 'theme'];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const i = all.indexOf(block);
        setBlock(all[Math.min(all.length - 1, i + 1)]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const i = all.indexOf(block);
        setBlock(all[Math.max(0, i - 1)]);
      } else if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        void handlePublish();
      } else if (!e.shiftKey && !e.altKey && !isTyping && (e.key === 'p' || e.key === 'P')) {
        // ⌘P — toggle preview-as-guest. Browsers normally bind this
        // to Print; we override inside the editor since the print
        // shortcut isn't useful here (you'd want a PDF of the guest
        // view, which is what preview-as-guest gives them anyway).
        e.preventDefault();
        setPreviewMode((p) => !p);
      } else if (!e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        // ⌘S — force-save the draft. Always intercept the browser's
        // "Save Page" dialog (would dump the live DOM as HTML, which
        // is worse than useless here). The save itself is debounced
        // to 900ms inside queueSave; ⌘S nudges the timer to fire
        // immediately by re-queueing with the latest state.
        e.preventDefault();
        queueSave(manifest, names);
      } else if (!isTyping && !e.shiftKey && !e.altKey && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        const map: Record<string, InspectorTab> = { '1': 'section', '2': 'theme', '3': 'decor', '4': 'library', '5': 'pear' };
        setInspectorTab(map[e.key]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, blockOrder, manifest, names, queueSave]);

  return (
    <div
      className="pl8 pl8-editor-v8"
      style={{
        // Lock to the viewport so the Inspector + Outline panels
        // scroll internally instead of moving with page scroll.
        // Mobile address-bar safety handled in pearloom.css via dvh.
        height: '100vh',
        maxHeight: '100vh',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <FirstThreadTour siteSlug={siteSlug} />
      <DecorGenerationToast />
      <DecorRecolorModal manifest={manifest} onEditField={(patch) => setManifest((m) => patch(m))} />
      <IconSwapModal onEditField={(patch) => setManifest((m) => patch(m))} />
      {publishError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 480,
            width: 'calc(100% - 64px)',
            padding: '12px 16px',
            background: 'var(--card)',
            border: '1px solid #7A2D2D',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(14,13,11,0.28)',
            zIndex: 9999,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7A2D2D', marginBottom: 4 }}>Publish failed</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4, wordBreak: 'break-word' }}>
              {publishError}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPublishError(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {publishToast && (
        <PublishToast
          url={publishToast.url}
          onClose={() => setPublishToast(null)}
        />
      )}
      <EditorTopbar
        displayNames={displayNames}
        prettyUrl={prettyUrl}
        prettyPath={prettyPath}
        device={device}
        setDevice={setDevice}
        showDeviceToggle={!isNarrow}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        liveUrl={publishedAt?.url ?? null}
        onPublish={handlePublish}
        onOpenAdvisor={() => setAdvisorOpen(true)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode((p) => !p)}
      />
      <div className="pl8-editor-main" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {!isNarrow && !previewMode && (
          <Outline
            block={block}
            setBlock={setBlock}
            blockOrder={blockOrder}
            hiddenBlocks={hiddenBlocks}
            onReorder={reorderBlocks}
            onToggleHidden={toggleBlockHidden}
            manifest={manifest}
          />
        )}
        <CanvasStage
          ref={canvasRef}
          manifest={manifest}
          names={names}
          siteSlug={siteSlug}
          prettyUrl={prettyUrl}
          device={isNarrow ? 'phone' : device}
          onManifestChange={onManifestChange}
          onNamesChange={onNamesChange}
          previewMode={previewMode}
        />
        {!isNarrow && !previewMode && (
          <Inspector
            block={block}
            manifest={manifest}
            names={names}
            onChange={onManifestChange}
            onNamesChange={onNamesChange}
            siteSlug={siteSlug}
            tab={inspectorTab}
            setTab={setInspectorTab}
            onJumpBlock={(b) => setBlock(b)}
            onOpenPreview={() => window.open(prettyPath, '_blank')}
            onPublish={() => void handlePublish()}
            width={inspectorWidth}
            onResize={setInspectorWidth}
          />
        )}
        {isNarrow && mobileDrawer && (
          <MobileDrawer onClose={() => setMobileDrawer(null)}>
            {mobileDrawer === 'outline' ? (
              <Outline
                block={block}
                setBlock={(k) => {
                  setBlock(k);
                  setMobileDrawer('inspector');
                }}
                blockOrder={blockOrder}
                hiddenBlocks={hiddenBlocks}
                onReorder={reorderBlocks}
                onToggleHidden={toggleBlockHidden}
                manifest={manifest}
              />
            ) : (
              <Inspector
                block={block}
                manifest={manifest}
                names={names}
                onChange={onManifestChange}
                onNamesChange={onNamesChange}
                siteSlug={siteSlug}
                tab={inspectorTab}
                setTab={setInspectorTab}
                onJumpBlock={(b) => setBlock(b)}
                onOpenPreview={() => window.open(prettyPath, '_blank')}
                onPublish={() => void handlePublish()}
                fluid
              />
            )}
          </MobileDrawer>
        )}
      </div>
      {isNarrow && (
        <MobileTabbar
          mobileDrawer={mobileDrawer}
          setMobileDrawer={setMobileDrawer}
          blockLabel={BLOCKS_BY_KEY[block]?.label ?? 'Edit'}
        />
      )}
      <PearCommand
        manifest={manifest}
        names={names}
        onJumpBlock={(b) => setBlock(b)}
        onPatchManifest={onManifestChange}
        onOpenInvite={() => router.push(`/dashboard/invite?site=${encodeURIComponent(siteSlug)}`)}
        onOpenPreview={() => window.open(prettyPath, '_blank')}
        onPublish={() => void handlePublish()}
      />
      {/* PearCopilot + ThemeQuickBar are docked into the inspector
          rail's tabs now, so no floating instances live here. The
          legacy floating versions still exist as a fallback (other
          surfaces can mount them with `docked={false}`). */}
      <DesignAdvisor manifest={manifest} names={names} open={advisorOpen} onClose={() => setAdvisorOpen(false)} />
    </div>
  );
}

/* ---------- Topbar ---------- */
/** PublishToast — top-center confirmation pill that appears on
 *  successful publish. Replaces the old auto-`window.open(prettyPath)`
 *  which yanked the user out of the editor unannounced. The toast
 *  surfaces the canonical URL with a Copy Link button (the most
 *  common post-publish action: paste it into a text/email) and a
 *  "View" link if they want to inspect the live render. Auto-
 *  dismisses after 8s; click × to clear immediately. */
function PublishToast({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback: select-and-copy on a hidden textarea (older browsers / iframes).
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
      document.body.removeChild(ta);
    }
  }
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px 10px 16px',
        background: 'var(--ink, #0E0D0B)',
        color: 'rgba(243,233,212,0.95)',
        borderRadius: 999,
        boxShadow: '0 18px 46px rgba(14,13,11,0.32), 0 0 0 1px rgba(184,147,90,0.30)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        fontWeight: 600,
        animation: 'pl-enter-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        maxWidth: 'min(540px, calc(100% - 32px))',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 22,
          height: 22,
          borderRadius: 999,
          background: 'var(--sage-deep, #5C6B3F)',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span style={{ marginRight: 4, whiteSpace: 'nowrap' }}>Pressed.</span>
      <code
        style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 11.5,
          color: 'rgba(243,233,212,0.78)',
          background: 'rgba(243,233,212,0.08)',
          padding: '4px 8px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 280,
        }}
      >
        {url.replace(/^https?:\/\//, '')}
      </code>
      <button
        type="button"
        onClick={copy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 11px',
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 700,
          background: copied ? 'var(--sage-deep, #5C6B3F)' : 'rgba(243,233,212,0.14)',
          color: 'inherit',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.04em',
          transition: 'background 180ms ease',
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 11px',
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 700,
          color: 'inherit',
          textDecoration: 'none',
          letterSpacing: '0.04em',
          background: 'rgba(243,233,212,0.06)',
        }}
      >
        View
        <Icon name="arrow-right" size={11} />
      </a>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          width: 22,
          height: 22,
          marginLeft: 2,
          borderRadius: 999,
          background: 'transparent',
          border: 'none',
          color: 'rgba(243,233,212,0.55)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Design menu ──────────────────────────────────────────────
//
// One-click access to every feature that lived behind "click an
// art element first". Buckets the surfaces by what hosts ask for
// most (palette, fonts, AI decor, nav style) so they don't have
// to hunt through the Theme tab. Each item dispatches a
// pearloom:design-jump event the editor listens to — see the
// onDesignJump handler in EditorV8 — which switches to the right
// tab and scrolls the right anchor into view.
function DesignMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function jumpAnchor(anchor: string) {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { anchor } }));
  }
  function jumpBlock(block: string) {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block } }));
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    color: 'var(--ink)',
    textAlign: 'left',
    width: '100%',
  };
  const groupLabel: React.CSSProperties = {
    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'var(--ink-muted)',
    padding: '8px 10px 4px',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Design — palette, fonts, AI decor, nav style"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          borderRadius: 999,
          background: open ? 'var(--cream-2)' : 'transparent',
          border: '1px solid var(--line-soft)',
          color: 'var(--ink-soft)',
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          transition: 'background 160ms ease',
        }}
      >
        <Icon name="palette" size={12} /> Design
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 280,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 14,
            padding: 6,
            boxShadow: '0 24px 48px rgba(14,13,11,0.20), 0 4px 12px rgba(14,13,11,0.10)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={groupLabel}>Look &amp; feel</div>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('palette')}>
            <Icon name="palette" size={14} /> Color palette
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('fonts')}>
            <Icon name="type" size={14} /> Fonts
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('motif')}>
            <Icon name="sparkles" size={14} /> Motif &amp; shapes
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('spacing')}>
            <Icon name="layout" size={14} /> Spacing
          </button>
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <div style={groupLabel}>AI decor</div>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('decor')}>
            <Icon name="brush" size={14} /> Decor library
            <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--peach-ink, #C6703D)', fontWeight: 700, letterSpacing: '0.12em' }}>NEW</span>
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('ai-accent')}>
            <Icon name="sparkles" size={14} /> Hero flourish
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('hero-decor')}>
            <Icon name="image" size={14} /> Hero decoration style
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('atmosphere')}>
            <Icon name="image" size={14} /> Atmosphere
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('stickers')}>
            <Icon name="sparkles" size={14} /> Stickers
          </button>
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <div style={groupLabel}>Layout</div>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpBlock('nav')}>
            <Icon name="layout" size={14} /> Navigation bar
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpBlock('hero')}>
            <Icon name="image" size={14} /> Hero block
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('footer')}>
            <Icon name="section" size={14} /> Footer
          </button>
          <button type="button" role="menuitem" style={itemStyle} onClick={() => jumpAnchor('layout-mode')}>
            <Icon name="grid" size={14} /> Layout mode
          </button>
        </div>
      )}
    </div>
  );
}

function EditorTopbar({
  displayNames,
  prettyUrl,
  prettyPath,
  device,
  setDevice,
  showDeviceToggle,
  saveStatus,
  lastSavedAt,
  liveUrl,
  onPublish,
  onOpenAdvisor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  previewMode,
  onTogglePreview,
}: {
  displayNames: string;
  prettyUrl: string;
  prettyPath: string;
  device: DeviceKey;
  setDevice: (d: DeviceKey) => void;
  showDeviceToggle: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  /** Absolute URL of the most-recently-published version. Null until
   *  the user publishes once this session, after which the topbar
   *  shows a "View live" pearl pill that opens it in a new tab. */
  liveUrl: string | null;
  onPublish: () => void;
  onOpenAdvisor: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Preview-as-guest toggle. When on, edit chrome (rails, overlays,
   *  click-to-edit) disappears so the host reads the page like a guest.
   *  Toggle button replaces "Preview" (which opens a new tab) since the
   *  host can do both from the same place — single button, two intents. */
  previewMode: boolean;
  onTogglePreview: () => void;
}) {
  // Topbar = three zones over one neutral surface + a single
  // hairline divider. Ghost buttons everywhere except Save & publish
  // (the only pearl-accented affordance), so the eye lands there.
  const ghostBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid var(--line-soft)',
    color: 'var(--ink-soft)',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
  };
  const iconBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--ink-soft)',
    cursor: 'pointer',
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 22px',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--line-soft)',
        flexWrap: 'wrap',
      }}
    >
      {/* Zone 1 — Identity (logo + slug + status) */}
      <Link href="/dashboard" aria-label="Back to dashboard" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <PearloomLogo />
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flexShrink: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.15 }}>{displayNames}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.15 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{prettyUrl}</span>
          <SaveDot saveStatus={saveStatus} lastSavedAt={lastSavedAt} />
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Live: ${liveUrl}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                marginLeft: 4,
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--sage-deep, #5C6B3F)',
                background: 'rgba(92,107,63,0.10)',
                border: '1px solid rgba(92,107,63,0.30)',
                textDecoration: 'none',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: 'currentColor',
                }}
              />
              Live
            </a>
          )}
        </div>
      </div>

      {/* Zone 2 — Device toggle (centered). Hidden on narrow viewports
          where the editor forces phone preview anyway. */}
      <div
        role="tablist"
        aria-label="Preview device"
        style={{
          display: showDeviceToggle ? 'flex' : 'none',
          gap: 2,
          margin: '0 auto',
          padding: 3,
          background: 'var(--cream-2)',
          borderRadius: 999,
        }}
      >
        {(['desktop', 'tablet', 'phone'] as const).map((n) => {
          const on = device === n;
          return (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setDevice(n)}
              aria-label={n}
              title={n.charAt(0).toUpperCase() + n.slice(1)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                border: 0,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                transition: 'background 180ms ease, color 180ms ease',
              }}
            >
              <Icon name={n} size={13} />
            </button>
          );
        })}
      </div>

      {/* Zone 3 — Action cluster (auto-margin keeps it right-aligned
          even when the device toggle is hidden). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: showDeviceToggle ? 0 : 'auto' }}>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo (Cmd+Z)"
          title="Undo (⌘Z)"
          style={{ ...iconBtn, opacity: canUndo ? 1 : 0.35 }}
        >
          <Icon name="undo" size={15} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo (Cmd+Shift+Z)"
          title="Redo (⌘⇧Z)"
          style={{ ...iconBtn, opacity: canRedo ? 1 : 0.35 }}
        >
          <Icon name="redo" size={15} />
        </button>
        <span style={{ width: 1, height: 18, background: 'var(--line-soft)', margin: '0 4px' }} aria-hidden />
        <DesignMenu />
        <button type="button" onClick={onOpenAdvisor} style={ghostBtn}>
          <Icon name="sparkles" size={12} /> Ask Pear
        </button>
        <button
          type="button"
          onClick={onTogglePreview}
          aria-pressed={previewMode}
          title={previewMode ? 'Back to editing (⌘P)' : 'Preview as a guest (⌘P)'}
          style={{
            ...ghostBtn,
            background: previewMode ? 'var(--ink)' : 'transparent',
            color: previewMode ? 'var(--cream)' : 'var(--ink-soft)',
            borderColor: previewMode ? 'var(--ink)' : 'var(--line-soft)',
          }}
        >
          <Icon name="eye" size={12} /> {previewMode ? 'Editing' : 'Preview'}
        </button>
        <Link
          href={prettyPath}
          target="_blank"
          title="Open in a new tab"
          aria-label="Open the published view in a new tab"
          style={{ ...iconBtn, color: 'var(--ink-soft)' }}
        >
          <Icon name="arrow-ur" size={13} />
        </Link>
        <Link href="/dashboard" style={ghostBtn}>
          <Icon name="grid" size={12} /> Dashboard
        </Link>
        <KbdHint />
        <button
          type="button"
          onClick={onPublish}
          className="pl-pearl-accent"
          data-tour-anchor="publish"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            border: 'none',
            marginLeft: 4,
          }}
        >
          Save &amp; publish <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </header>
  );
}

/** Status dot rendered next to the slug — quietly tells the host
 *  whether their work has been written to the server. The 'saved'
 *  state shows a tiny check inside the dot so users get a moment of
 *  reassurance every time autosave completes. Hover surfaces the
 *  exact wall-clock timestamp of the most recent successful save
 *  via the title attribute (fast, native, no popover overhead). */
function SaveDot({
  saveStatus,
  lastSavedAt,
}: {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
}) {
  const colour =
    saveStatus === 'saved'
      ? 'var(--sage-deep)'
      : saveStatus === 'saving'
        ? 'var(--peach-ink, #C6703D)'
        : saveStatus === 'error'
          ? '#7A2D2D'
          : 'var(--ink-muted)';
  const label =
    saveStatus === 'saved'
      ? 'Saved'
      : saveStatus === 'saving'
        ? 'Saving…'
        : saveStatus === 'error'
          ? 'Save failed'
          : 'Editing';
  const showCheck = saveStatus === 'saved';
  // Title text shown on hover. When idle but we know the last save,
  // show "Saved 2 min ago" so the host can confirm at a glance —
  // matches the trust-building patterns in Notion/Linear.
  const tooltipText = (() => {
    if (saveStatus === 'saving') return 'Saving your draft…';
    if (saveStatus === 'error') return 'Last save failed — your edits are local until network returns';
    if (lastSavedAt) {
      const ago = Date.now() - lastSavedAt;
      const wallClock = new Date(lastSavedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      const relative =
        ago < 5_000 ? 'just now' :
        ago < 60_000 ? `${Math.floor(ago / 1000)}s ago` :
        ago < 3_600_000 ? `${Math.floor(ago / 60_000)} min ago` :
        `${Math.floor(ago / 3_600_000)}h ago`;
      return `Saved ${relative} (${wallClock})`;
    }
    return 'Edits autosave every keystroke';
  })();
  return (
    <span
      title={tooltipText}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colour, fontWeight: 600, cursor: 'help' }}
    >
      <span
        aria-hidden
        style={{
          width: showCheck ? 12 : 6,
          height: showCheck ? 12 : 6,
          borderRadius: 999,
          background: colour,
          display: 'inline-grid',
          placeItems: 'center',
          color: '#fff',
          animation: saveStatus === 'saving' ? 'pl-dot-pulse 1.4s ease-in-out infinite' : 'none',
          transition: 'width 200ms ease, height 200ms ease',
        }}
      >
        {showCheck && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {label}
    </span>
  );
}

function KbdHint() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid var(--line-soft)',
          color: 'var(--ink-soft)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'var(--font-ui)',
          transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
        }}
      >
        ⌘
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            boxShadow: '0 14px 40px rgba(61,74,31,0.14)',
            padding: '14px 16px',
            minWidth: 220,
            fontSize: 12.5,
            color: 'var(--ink)',
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Keyboard shortcuts</div>
          {[
            ['Command palette', '⌘K / Ctrl K'],
            ['Next block', '⌘↓ / Ctrl↓'],
            ['Previous block', '⌘↑ / Ctrl↑'],
            ['Section tab', '⌘1 / Ctrl 1'],
            ['Theme tab', '⌘2 / Ctrl 2'],
            ['Decor tab', '⌘3 / Ctrl 3'],
            ['Library tab', '⌘4 / Ctrl 4'],
            ['Pear tab', '⌘5 / Ctrl 5'],
            ['Preview as guest', '⌘P / Ctrl P'],
            ['Save & publish', '⌘⇧P / Ctrl⇧P'],
            ['Force-save draft', '⌘S / Ctrl S'],
            ['Bold / italic / underline', '⌘B / ⌘I / ⌘U'],
          ].map(([label, keys]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5 }}>{keys}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Left outline ---------- */
function Outline({
  block,
  setBlock,
  blockOrder,
  hiddenBlocks,
  onReorder,
  onToggleHidden,
  manifest,
}: {
  block: BlockKey;
  setBlock: (k: BlockKey) => void;
  blockOrder: BlockKey[];
  hiddenBlocks: BlockKey[];
  onReorder: (next: BlockKey[]) => void;
  onToggleHidden: (k: BlockKey) => void;
  /** Manifest used to compute the per-row fill-state pip. */
  manifest: StoryManifest;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blockOrder.indexOf(active.id as BlockKey);
    const to = blockOrder.indexOf(over.id as BlockKey);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(blockOrder, from, to));
  }

  const hero = BLOCKS_BY_KEY.hero;
  // Theme entry removed from the outline — Theme moved to the
  // inspector rail's tab. One source of truth for palette controls.

  return (
    <aside
      className="pl8-editor-outline"
      style={{
        width: 252,
        flexShrink: 0,
        borderRight: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        padding: '16px 10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Identity group — Hero is structurally pinned at the top
          since the section never moves. Wrapped in its own micro-
          group so the pearl outline + drag-to-reorder hint reads
          for the rest of the list. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <BlockRow
          def={hero}
          active={block === hero.key}
          hidden={false}
          onSelect={() => setBlock(hero.key)}
          fillState={blockFillState(hero.key as ScoredBlockKey, manifest)}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.22em',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
          }}
        >
          Sections
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--ink-muted)',
            opacity: 0.65,
          }}
        >
          Drag to reorder
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {blockOrder.map((key) => {
              const def = BLOCKS_BY_KEY[key];
              const hidden = hiddenBlocks.includes(key);
              return (
                <SortableBlockRow
                  key={key}
                  def={def}
                  active={block === key}
                  hidden={hidden}
                  onSelect={() => setBlock(key)}
                  onToggleHidden={() => onToggleHidden(key)}
                  fillState={blockFillState(key as ScoredBlockKey, manifest)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div
        style={{
          marginTop: 'auto',
          background: 'var(--lavender-bg)',
          border: '1px solid rgba(196,181,217,0.35)',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ flexShrink: 0, marginTop: 1 }}>
          <Pear size={24} tone="sage" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: 'var(--lavender-ink)',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Tip from Pear
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            Drag to reorder, eye to hide. Drag hidden rows onto the canvas to add them back. Click anything in the preview to edit it.
          </div>
        </div>
      </div>
    </aside>
  );
}

function SortableBlockRow({
  def,
  active,
  hidden,
  onSelect,
  onToggleHidden,
  fillState,
}: {
  def: BlockDef;
  active: boolean;
  hidden: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
  fillState?: ReturnType<typeof blockFillState>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: def.key });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    boxShadow: isDragging ? '0 12px 28px rgba(14,13,11,0.18)' : 'none',
    borderRadius: 10,
    background: isDragging ? 'var(--card)' : 'transparent',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {/* Drop indicator — peach hairline above the row when another
          row is being dragged over it. dnd-kit reports isOver only
          on the SortableContext target, so this lights up on the
          row that the dragged item would slot into. */}
      {isOver && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -3,
            left: 6,
            right: 6,
            height: 2,
            background: 'var(--peach-ink, #C6703D)',
            borderRadius: 2,
            boxShadow: '0 0 6px rgba(198,112,61,0.45)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}
      <BlockRow
        def={def}
        active={active}
        hidden={hidden}
        onSelect={onSelect}
        onToggleHidden={onToggleHidden}
        dragHandleProps={{ attributes, listeners }}
        fillState={fillState}
      />
    </div>
  );
}

type DragHandleProps = {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
};

function BlockRow({
  def,
  active,
  hidden,
  onSelect,
  onToggleHidden,
  dragHandleProps,
  fillState,
}: {
  def: BlockDef;
  active: boolean;
  hidden: boolean;
  onSelect: () => void;
  onToggleHidden?: () => void;
  dragHandleProps?: DragHandleProps;
  fillState?: ReturnType<typeof blockFillState>;
}) {
  // Hidden rows are draggable onto the canvas via HTML5 DnD. We
  // *don't* enable native drag on visible rows because dnd-kit owns
  // the pointer there for in-list reorder.
  const nativeDraggable = hidden;
  const [hovered, setHovered] = useState(false);
  // Chrome (drag handle, eye toggle) shows on hover or when active
  // so an idle row is just glyph + label + status pip — calm.
  const showChrome = hovered || active;
  return (
    <div
      draggable={nativeDraggable || undefined}
      onDragStart={nativeDraggable
        ? (e) => {
            e.dataTransfer.setData('application/x-pearloom-block', def.key);
            e.dataTransfer.effectAllowed = 'move';
          }
        : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `${dragHandleProps ? '14px ' : ''}24px 1fr ${onToggleHidden ? '22px' : ''}`.trim(),
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: active ? 'var(--cream-2)' : hovered ? 'rgba(14,13,11,0.03)' : 'transparent',
        color: 'var(--ink)',
        cursor: nativeDraggable ? 'grab' : 'pointer',
        fontFamily: 'var(--font-ui)',
        alignItems: 'center',
        transition: 'background 160ms ease',
      }}
      onClick={onSelect}
      title={nativeDraggable ? 'Drag onto the canvas to add' : undefined}
    >
      {/* Active marker — peach hairline on the leading edge, signals
          "this is the open block" without surrounding the row in a
          loud peach box. Hides when not active so idle rows breathe. */}
      {active && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 2,
            borderRadius: 2,
            background: 'var(--peach-ink, #C6703D)',
          }}
        />
      )}
      {dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 14,
            height: 24,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-muted)',
            cursor: 'grab',
            touchAction: 'none',
            padding: 0,
            opacity: showChrome ? 0.7 : 0,
            transition: 'opacity 140ms ease',
          }}
        >
          <Icon name="drag" size={12} />
        </button>
      )}
      {/* Glyph — a single icon at the row's leading edge. Replaces
          the boxed schematic miniature, which read as wireframe
          clipart. Active rows tint the glyph peach to hint at
          "this is the one being edited"; idle rows use ink-soft. */}
      <span
        aria-hidden
        style={{
          width: 24,
          height: 24,
          display: 'grid',
          placeItems: 'center',
          color: active
            ? 'var(--peach-ink, #C6703D)'
            : hidden
              ? 'var(--ink-muted)'
              : 'var(--ink-soft)',
          opacity: hidden ? 0.55 : 1,
          flexShrink: 0,
          transition: 'color 160ms ease',
        }}
      >
        <Icon name={def.icon} size={16} />
      </span>
      <div style={{ minWidth: 0, opacity: hidden ? 0.55 : 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: active ? 700 : 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            letterSpacing: '-0.005em',
          }}
        >
          {fillState && (
            <span
              aria-label={FILL_STATE_COLORS[fillState].label}
              title={FILL_STATE_COLORS[fillState].label}
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: FILL_STATE_COLORS[fillState].bg,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
          )}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.label}</span>
        </div>
      </div>
      {onToggleHidden && (
        <button
          type="button"
          aria-label={hidden ? `Show ${def.label}` : `Hide ${def.label}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHidden();
          }}
          style={{
            width: 22,
            height: 22,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            borderRadius: 6,
            padding: 0,
            opacity: hidden ? 1 : showChrome ? 0.7 : 0,
            transition: 'opacity 140ms ease',
          }}
        >
          <Icon name={hidden ? 'eye-off' : 'eye'} size={13} />
        </button>
      )}
    </div>
  );
}

// (Old iframe-based Preview component removed — replaced by
//  CanvasStage which renders SiteV8Renderer in-DOM.)

/* ---------- Right inspector ---------- */
type InspectorTab = 'section' | 'theme' | 'decor' | 'library' | 'pear';

function Inspector({
  block,
  manifest,
  names,
  onChange,
  onNamesChange,
  siteSlug,
  tab,
  setTab,
  onJumpBlock,
  onOpenPreview,
  onPublish,
  fluid = false,
  width,
  onResize,
}: {
  block: BlockKey;
  manifest: StoryManifest;
  names: [string, string];
  onChange: (m: StoryManifest) => void;
  onNamesChange: (n: [string, string]) => void;
  siteSlug: string;
  tab: InspectorTab;
  setTab: (t: InspectorTab) => void;
  onJumpBlock: (k: BlockKey) => void;
  onOpenPreview: () => void;
  onPublish: () => void;
  /** When true, the inspector fills its container instead of being
   *  fixed-width. Used in the mobile drawer where the parent is
   *  full-width. */
  fluid?: boolean;
  /** Persisted user-chosen width in px. Falls back to 380. */
  width?: number;
  /** Called with each px while the host drags the resize handle. */
  onResize?: (w: number) => void;
}) {
  const meta = BLOCKS.find((b) => b.key === block)!;
  const resolvedWidth = fluid ? '100%' : (width ?? 380);

  // Drag-to-resize. Pointer events on a 6px hit-strip flush against
  // the rail's left edge. We compute width from the right edge of the
  // viewport so the math is independent of layout shifts (sidebar
  // collapsing, mobile chrome appearing). Clamp matches the state's
  // [320, 620] window.
  function onResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    if (!onResize) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const next = Math.round(window.innerWidth - ev.clientX);
      onResize(Math.max(320, Math.min(620, next)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <aside
      className="pl8-editor-inspector"
      style={{
        width: resolvedWidth,
        flexShrink: 0,
        borderLeft: fluid ? 'none' : '1px solid var(--line-soft)',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: fluid ? 1 : undefined,
        position: 'relative',
      }}
    >
      {!fluid && onResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector"
          onPointerDown={onResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            left: -3,
            width: 6,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 5,
          }}
        />
      )}
      {/* Rail tabs — Section / Theme / Library / Pear. Bigger touch
          target (16px vertical), clearer active indicator (peach
          underline pill, animated). Only one body shows at a time,
          so floaters never overlap the canvas. */}
      <div
        role="tablist"
        aria-label="Inspector tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--cream)',
          padding: '0 4px',
        }}
      >
        {(
          [
            // Fixed Section icon — always shows the same glyph
            // regardless of which block is active. The block-
            // specific icon lives in the panel body header below
            // so users get one identity per tab + clear context
            // when they're inside it.
            { key: 'section', label: 'Section', icon: 'sliders' },
            { key: 'theme', label: 'Theme', icon: 'palette' },
            // Decor used to be a sub-anchor inside Theme. It's so
            // important to the v8 visual identity (stamps, dividers,
            // bouquets, the AI accent) that it gets its own tab now —
            // hosts no longer have to scroll past palette / fonts /
            // motif before they reach it.
            { key: 'decor', label: 'Decor', icon: 'fleuron' },
            { key: 'library', label: 'Library', icon: 'image' },
            { key: 'pear', label: 'Pear', icon: 'sparkles' },
          ] as Array<{ key: InspectorTab; label: string; icon: string }>
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                position: 'relative',
                padding: '14px 8px 12px',
                fontFamily: 'var(--font-ui)',
                fontSize: 12.5,
                fontWeight: active ? 700 : 600,
                letterSpacing: '0.02em',
                color: active ? 'var(--ink)' : 'var(--ink-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'color 180ms ease',
              }}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    left: '14%',
                    right: '14%',
                    height: 2,
                    borderRadius: 2,
                    background: 'var(--peach-ink, #C6703D)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === 'section' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <header
            style={{
              padding: '18px 22px 16px',
              borderBottom: '1px solid var(--line-soft)',
              position: 'sticky',
              top: 0,
              background: 'var(--cream)',
              zIndex: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: 'var(--cream-2)',
                  border: '1px solid var(--line-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  color: 'var(--peach-ink, #C6703D)',
                }}
              >
                <Icon name={meta.icon} size={15} />
              </div>
              <h2 className="display" style={{ fontSize: 22, margin: 0, lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                {meta.label}
              </h2>
            </div>
            {meta.description && (
              <p style={{ margin: '8px 0 0 44px', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                {meta.description}
              </p>
            )}
          </header>

          <div style={{ padding: '22px 22px 48px', display: 'flex', flexDirection: 'column' }}>
            <PanelSwitch
              block={block}
              manifest={manifest}
              names={names}
              onChange={onChange}
              onNamesChange={onNamesChange}
            />
            {block !== 'theme' && block !== 'toasts' && (
              <BlockStylePanel
                manifest={manifest}
                blockId={blockToSectionId(block)}
                label={`${meta.label} — section style`}
                onChange={onChange}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'theme' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <EditorCanvasProvider value={{ editMode: true }}>
            <div style={{ padding: '20px 22px' }}>
              {/* ThemeQuickBar at the top — fast palette swap with
                  AI presets — followed by the full ThemePanel
                  wrapped in a live search filter so the 12 design
                  surfaces under it become typeable instead of
                  scroll-and-hunt. */}
              <ThemeQuickBar
                manifest={manifest}
                names={names}
                onApply={(nextTheme) => onChange({ ...manifest, theme: nextTheme ?? manifest.theme })}
                docked
              />
              <div style={{ height: 1, background: 'var(--line-soft)', margin: '20px 0 16px' }} />
              <PanelSearch placeholder="Search palette, fonts, decor, stickers…">
                <ThemePanel manifest={manifest} onChange={onChange} />
              </PanelSearch>
            </div>
          </EditorCanvasProvider>
        </div>
      )}

      {tab === 'decor' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <EditorCanvasProvider value={{ editMode: true, onEditField: (patch) => onChange(patch(manifest)) }}>
            <div style={{ padding: '20px 22px' }}>
              <DecorLibraryPanel manifest={manifest} onChange={onChange} />
            </div>
          </EditorCanvasProvider>
        </div>
      )}

      {tab === 'library' && (
        <AssetLibraryPanel manifest={manifest} onChange={onChange} />
      )}

      {tab === 'pear' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <PearCopilot
            manifest={manifest}
            names={names}
            siteSlug={siteSlug}
            onPatchManifest={onChange}
            onJumpBlock={(b) => onJumpBlock(b as BlockKey)}
            onOpenPreview={onOpenPreview}
            onPublish={onPublish}
            docked
          />
        </div>
      )}
    </aside>
  );
}

/** Map editor block keys to the section IDs the renderer uses, so
 *  BlockStylePanel writes to the same key SiteV8Renderer reads. */
function blockToSectionId(block: BlockKey): string {
  if (block === 'hero') return 'top';
  if (block === 'story') return 'our-story';
  if (block === 'details') return 'details';
  return block;
}

function PanelSwitch({
  block,
  manifest,
  names,
  onChange,
  onNamesChange,
}: {
  block: BlockKey;
  manifest: StoryManifest;
  names: [string, string];
  onChange: (m: StoryManifest) => void;
  onNamesChange: (n: [string, string]) => void;
}) {
  switch (block) {
    case 'nav':
      return <NavPanel manifest={manifest} onChange={onChange} />;
    case 'hero':
      return <HeroPanel manifest={manifest} names={names} onNamesChange={onNamesChange} onChange={onChange} />;
    case 'story':
      return <StoryPanel manifest={manifest} names={names} onChange={onChange} />;
    case 'details':
      return <DetailsPanel manifest={manifest} onChange={onChange} />;
    case 'schedule':
      return <SchedulePanel manifest={manifest} onChange={onChange} />;
    case 'travel':
      return <TravelPanel manifest={manifest} onChange={onChange} />;
    case 'registry':
      return <RegistryPanel manifest={manifest} onChange={onChange} />;
    case 'gallery':
      return <GalleryPanel manifest={manifest} onChange={onChange} />;
    case 'rsvp':
      return <RsvpPanel manifest={manifest} onChange={onChange} />;
    case 'faq':
      return <FaqPanel manifest={manifest} names={names} onChange={onChange} />;
    case 'toasts':
      return <ToastsPanel manifest={manifest} names={names} />;
    case 'theme':
      return <ThemePanel manifest={manifest} onChange={onChange} />;
    default:
      return null;
  }
}

/* ---------- Mobile drawer + tabbar ---------- */
function MobileDrawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(18, 15, 12, 0.38)',
          backdropFilter: 'blur(2px)',
          zIndex: 40,
        }}
      />
      <div
        className="pl8-editor-drawer"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 56,
          top: 'auto',
          maxHeight: 'calc(100vh - 180px)',
          background: 'var(--cream)',
          borderTop: '1px solid var(--line-soft)',
          borderRadius: '20px 20px 0 0',
          zIndex: 41,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -12px 32px rgba(18, 15, 12, 0.16)',
          animation: 'pl8-drawer-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--line-soft)' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </>
  );
}

function MobileTabbar({
  mobileDrawer,
  setMobileDrawer,
  blockLabel,
}: {
  mobileDrawer: 'outline' | 'inspector' | null;
  setMobileDrawer: (d: 'outline' | 'inspector' | null) => void;
  blockLabel: string;
}) {
  const btn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '8px 4px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: active ? 'var(--ink)' : 'var(--ink-soft)',
    fontSize: 11,
    fontWeight: 600,
  });
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'var(--cream)',
        borderTop: '1px solid var(--line-soft)',
        display: 'flex',
        zIndex: 50,
      }}
    >
      <button
        type="button"
        style={btn(mobileDrawer === 'outline')}
        onClick={() => setMobileDrawer(mobileDrawer === 'outline' ? null : 'outline')}
      >
        <Icon name="section" size={18} />
        <span>Blocks</span>
      </button>
      <button
        type="button"
        style={btn(mobileDrawer === null)}
        onClick={() => setMobileDrawer(null)}
      >
        <Icon name="image" size={18} />
        <span>Preview</span>
      </button>
      <button
        type="button"
        style={btn(mobileDrawer === 'inspector')}
        onClick={() => setMobileDrawer(mobileDrawer === 'inspector' ? null : 'inspector')}
      >
        <Icon name="brush" size={18} />
        <span>{blockLabel.length > 8 ? 'Edit' : blockLabel}</span>
      </button>
    </div>
  );
}
