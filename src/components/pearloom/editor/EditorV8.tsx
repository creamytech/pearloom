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
import { ThemeQuickBar } from './canvas/ThemeQuickBar';
import { EditorCanvasProvider } from './canvas/EditorCanvasContext';
import { AssetLibraryPanel } from './panels/AssetLibraryPanel';
import { useEditorHistory } from './canvas/useEditorHistory';
import { HeroPanel } from './panels/HeroPanel';
import { NavPanel } from './panels/NavPanel';
import { StoryPanel } from './panels/StoryPanel';
import { DetailsPanel } from './panels/DetailsPanel';
import { SchedulePanel } from './panels/SchedulePanel';
import { TravelPanel } from './panels/TravelPanel';
import { BlockStylePanel } from './panels/BlockStylePanel';
import { BlockMiniature } from './BlockMiniature';
import { RegistryPanel } from './panels/RegistryPanel';
import { GalleryPanel } from './panels/GalleryPanel';
import { RsvpPanel } from './panels/RsvpPanel';
import { FaqPanel } from './panels/FaqPanel';
import { ToastsPanel } from './panels/ToastsPanel';
import { ThemePanel } from './panels/ThemePanel';
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
    window.addEventListener('pearloom:inspector-focus', onFocus as EventListener);
    window.addEventListener('pearloom:inspector-focus-tab', onFocusTab as EventListener);
    return () => {
      window.removeEventListener('pearloom:inspector-focus', onFocus as EventListener);
      window.removeEventListener('pearloom:inspector-focus-tab', onFocusTab as EventListener);
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
      } else if (!isTyping && !e.shiftKey && !e.altKey && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
        e.preventDefault();
        const map: Record<string, InspectorTab> = { '1': 'section', '2': 'theme', '3': 'library', '4': 'pear' };
        setInspectorTab(map[e.key]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, blockOrder]);

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
      />
      <div className="pl8-editor-main" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {!isNarrow && (
          <Outline
            block={block}
            setBlock={setBlock}
            blockOrder={blockOrder}
            hiddenBlocks={hiddenBlocks}
            onReorder={reorderBlocks}
            onToggleHidden={toggleBlockHidden}
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
        />
        {!isNarrow && (
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
        <button type="button" onClick={onOpenAdvisor} style={ghostBtn}>
          <Icon name="sparkles" size={12} /> Ask Pear
        </button>
        <Link href={prettyPath} target="_blank" style={ghostBtn}>
          <Icon name="eye" size={12} /> Preview
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
            ['Library tab', '⌘3 / Ctrl 3'],
            ['Pear tab', '⌘4 / Ctrl 4'],
            ['Save & publish', '⌘⇧P / Ctrl⇧P'],
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
}: {
  block: BlockKey;
  setBlock: (k: BlockKey) => void;
  blockOrder: BlockKey[];
  hiddenBlocks: BlockKey[];
  onReorder: (next: BlockKey[]) => void;
  onToggleHidden: (k: BlockKey) => void;
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
        width: 264,
        flexShrink: 0,
        borderRight: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        padding: '14px 12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Hero — pinned */}
      <BlockRow def={hero} active={block === hero.key} hidden={false} onSelect={() => setBlock(hero.key)} />

      {/* Reorderable middle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 4,
          padding: '0 4px',
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--peach-ink)',
            textTransform: 'uppercase',
          }}
        >
          Sections
        </div>
        <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Drag to reorder</span>
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
          borderRadius: 12,
          padding: 10,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        <Pear size={28} tone="sage" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 2 }}>
            Tip from Pear
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            Drag rows to reorder. Hide with the eye — drag hidden rows onto the canvas to add them back. Click anything in the preview to edit it.
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
}: {
  def: BlockDef;
  active: boolean;
  hidden: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
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
}: {
  def: BlockDef;
  active: boolean;
  hidden: boolean;
  onSelect: () => void;
  onToggleHidden?: () => void;
  dragHandleProps?: DragHandleProps;
}) {
  // Hidden rows are draggable onto the canvas via HTML5 DnD. We
  // *don't* enable native drag on visible rows because dnd-kit owns
  // the pointer there for in-list reorder.
  const nativeDraggable = hidden;
  return (
    <div
      draggable={nativeDraggable || undefined}
      onDragStart={nativeDraggable
        ? (e) => {
            e.dataTransfer.setData('application/x-pearloom-block', def.key);
            e.dataTransfer.effectAllowed = 'move';
          }
        : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: `${dragHandleProps ? '14px ' : ''}40px 1fr ${onToggleHidden ? '24px' : ''}`.trim(),
        gap: 8,
        padding: '6px 8px',
        borderRadius: 8,
        background: active ? 'var(--cream-2)' : 'transparent',
        color: 'var(--ink)',
        border: active
          ? '1px solid var(--peach-ink, #C6703D)'
          : '1px solid transparent',
        boxShadow: active ? '0 0 0 3px rgba(198,112,61,0.10)' : 'none',
        cursor: nativeDraggable ? 'grab' : 'pointer',
        fontFamily: 'var(--font-ui)',
        alignItems: 'center',
        transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
      }}
      onClick={onSelect}
      title={nativeDraggable ? 'Drag onto the canvas to add' : undefined}
    >
      {dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 14,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-muted)',
            cursor: 'grab',
            touchAction: 'none',
            padding: 0,
          }}
        >
          <Icon name="drag" size={12} />
        </button>
      )}
      {/* Mini section preview — small SVG diagram of what the
          section looks like. Description has moved to the inspector
          header so we keep rows compact. */}
      <span
        style={{
          width: 40,
          height: 26,
          flexShrink: 0,
          opacity: hidden ? 0.45 : 1,
          display: 'block',
        }}
      >
        <BlockMiniature block={def.key} active={active} />
      </span>
      <div style={{ minWidth: 0, opacity: hidden ? 0.55 : 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {def.label}
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
            width: 24,
            height: 24,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            borderRadius: 6,
            padding: 0,
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
type InspectorTab = 'section' | 'theme' | 'library' | 'pear';

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
   *  fixed to 380px. Used in the mobile drawer where the parent is
   *  full-width. */
  fluid?: boolean;
}) {
  const meta = BLOCKS.find((b) => b.key === block)!;
  return (
    <aside
      className="pl8-editor-inspector"
      style={{
        width: fluid ? '100%' : 380,
        flexShrink: 0,
        borderLeft: fluid ? 'none' : '1px solid var(--line-soft)',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: fluid ? 1 : undefined,
      }}
    >
      {/* Rail tabs — Section / Theme / Pear. Only one body shows at
          a time, so floaters never overlap the canvas. */}
      <div
        role="tablist"
        aria-label="Inspector tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--cream)',
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
                padding: '12px 8px 10px',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: active ? 'var(--ink)' : 'var(--ink-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--peach-ink, #C6703D)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'color 180ms ease, border-color 180ms ease',
              }}
            >
              <Icon name={t.icon} size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'section' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <header
            style={{
              padding: '14px 20px 12px',
              borderBottom: '1px solid var(--line-soft)',
              position: 'sticky',
              top: 0,
              background: 'var(--cream)',
              zIndex: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: 'var(--cream-2)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={meta.icon} size={13} />
              </div>
              <h2 className="display" style={{ fontSize: 20, margin: 0, lineHeight: 1.1 }}>
                {meta.label}
              </h2>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{meta.description}</p>
          </header>

          <div style={{ padding: '18px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <EditorCanvasProvider value={{ editMode: true }}>
            <ThemeQuickBar
              manifest={manifest}
              names={names}
              onApply={(nextTheme) => onChange({ ...manifest, theme: nextTheme ?? manifest.theme })}
              docked
            />
          </EditorCanvasProvider>
        </div>
      )}

      {tab === 'library' && (
        <AssetLibraryPanel />
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
