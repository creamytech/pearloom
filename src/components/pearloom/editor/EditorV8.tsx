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
    window.addEventListener('pearloom:inspector-focus', onFocus as EventListener);
    return () => window.removeEventListener('pearloom:inspector-focus', onFocus as EventListener);
  }, []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
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
  const history = useEditorHistory(manifest, names, restoreFromHistory);

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
      window.open(prettyPath, '_blank');
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

  // Keyboard shortcuts: ⌘/Ctrl+↓ / ↑ jump blocks; ⌘/Ctrl+Shift+P publishes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
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
      {publishError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            maxWidth: 380,
            padding: '12px 16px',
            background: 'var(--card)',
            border: '1px solid #7A2D2D',
            borderRadius: 12,
            boxShadow: '0 8px 20px rgba(14,13,11,0.22)',
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
      <EditorTopbar
        displayNames={displayNames}
        prettyUrl={prettyUrl}
        prettyPath={prettyPath}
        device={device}
        setDevice={setDevice}
        saveStatus={saveStatus}
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
      <PearCopilot
        manifest={manifest}
        names={names}
        siteSlug={siteSlug}
        onPatchManifest={onManifestChange}
        onJumpBlock={(b) => setBlock(b as BlockKey)}
        onOpenPanel={(panel) => {
          if (panel === 'design-advisor') setAdvisorOpen(true);
        }}
        onOpenPreview={() => window.open(prettyPath, '_blank')}
        onPublish={() => void handlePublish()}
      />
      <DesignAdvisor manifest={manifest} names={names} open={advisorOpen} onClose={() => setAdvisorOpen(false)} />
    </div>
  );
}

/* ---------- Topbar ---------- */
function EditorTopbar({
  displayNames,
  prettyUrl,
  prettyPath,
  device,
  setDevice,
  saveStatus,
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
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onPublish: () => void;
  onOpenAdvisor: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 22px',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--line-soft)',
        flexWrap: 'wrap',
      }}
    >
      <Link href="/dashboard" aria-label="Back to dashboard">
        <PearloomLogo />
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{displayNames}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {prettyUrl}
          <span
            className="pill"
            style={{ padding: '1px 8px', fontSize: 10, background: 'var(--sage-deep)', color: 'var(--cream)', border: 0 }}
          >
            Editing
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, margin: '0 auto', padding: 4, background: 'var(--cream-2)', borderRadius: 10 }}>
        {(['desktop', 'tablet', 'phone'] as const).map((n) => {
          const on = device === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setDevice(n)}
              aria-label={n}
              aria-pressed={on}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: 0,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name={n} size={14} />
            </button>
          );
        })}
      </div>

      <span
        style={{
          fontSize: 11.5,
          color:
            saveStatus === 'saving'
              ? 'var(--ink-muted)'
              : saveStatus === 'saved'
                ? 'var(--sage-deep)'
                : saveStatus === 'error'
                  ? '#7A2D2D'
                  : 'var(--ink-muted)',
          fontWeight: 600,
          minWidth: 70,
          textAlign: 'right',
        }}
      >
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'Saved'}
        {saveStatus === 'error' && 'Save failed'}
      </span>
      <KbdHint />

      {/* Undo / Redo — also bound to Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z. */}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo (Cmd+Z)"
        title="Undo (Cmd+Z)"
        style={{ opacity: canUndo ? 1 : 0.4 }}
      >
        <Icon name="arrow-left" size={13} /> Undo
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo (Cmd+Shift+Z)"
        title="Redo (Cmd+Shift+Z)"
        style={{ opacity: canRedo ? 1 : 0.4 }}
      >
        Redo <Icon name="arrow-right" size={13} />
      </button>

      <button type="button" className="btn btn-outline btn-sm" onClick={onOpenAdvisor} aria-label="Ask Pear to review">
        <Icon name="sparkles" size={13} /> Ask Pear
      </button>
      <Link href={prettyPath} target="_blank" className="btn btn-outline btn-sm">
        <Icon name="eye" size={13} /> Preview
      </Link>
      <Link href="/dashboard" className="btn btn-outline btn-sm">
        <Icon name="grid" size={13} /> Dashboard
      </Link>
      <button type="button" className="btn btn-primary" onClick={onPublish}>
        Save &amp; publish <Icon name="arrow-right" size={13} />
      </button>
    </header>
  );
}

function KbdHint() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Keyboard shortcuts"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'transparent',
          border: '1.5px solid var(--line)',
          color: 'var(--ink-muted)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-ui)',
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
  const theme = BLOCKS_BY_KEY.theme;

  return (
    <aside
      className="pl8-editor-outline"
      style={{
        width: 308,
        flexShrink: 0,
        borderRight: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        padding: '18px 14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Hero — pinned */}
      <BlockRow def={hero} active={block === hero.key} hidden={false} onSelect={() => setBlock(hero.key)} />

      {/* Reorderable middle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--peach-ink)',
            textTransform: 'uppercase',
          }}
        >
          Sections
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Drag to reorder</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

      {/* Theme — pinned */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--peach-ink)',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Style
        </div>
        <BlockRow def={theme} active={block === theme.key} hidden={false} onSelect={() => setBlock(theme.key)} />
      </div>

      <div
        style={{
          marginTop: 'auto',
          background: 'var(--lavender-bg)',
          borderRadius: 14,
          padding: 12,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <Pear size={34} tone="sage" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 2 }}>
            Tip from Pear
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            Drag to reorder. The eye hides a section — drag a hidden row onto the canvas to add it back. Click anything in the preview to edit it.
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
        gridTemplateColumns: `${dragHandleProps ? '18px ' : ''}56px 1fr ${onToggleHidden ? '28px' : ''}`.trim(),
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: active ? 'var(--ink)' : hidden ? 'transparent' : 'transparent',
        color: active ? 'var(--cream)' : 'var(--ink)',
        border: active ? '1px solid var(--ink)' : '1px solid transparent',
        cursor: nativeDraggable ? 'grab' : 'pointer',
        fontFamily: 'var(--font-ui)',
        alignItems: 'center',
        transition: 'background 160ms, border-color 160ms',
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
            width: 18,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 'none',
            color: active ? 'rgba(255,254,247,0.6)' : 'var(--ink-muted)',
            cursor: 'grab',
            touchAction: 'none',
            padding: 0,
          }}
        >
          <Icon name="drag" size={14} />
        </button>
      )}
      {/* Mini section preview — replaces the small icon with an
          illustrative SVG diagram of what the section looks like. */}
      <span
        style={{
          width: 56,
          height: 34,
          flexShrink: 0,
          opacity: hidden ? 0.45 : 1,
          display: 'block',
        }}
      >
        <BlockMiniature block={def.key} active={active} />
      </span>
      <div style={{ minWidth: 0, opacity: hidden ? 0.55 : 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{def.label}</div>
        <div
          style={{
            fontSize: 11.5,
            color: active ? 'rgba(255,254,247,0.7)' : 'var(--ink-muted)',
            lineHeight: 1.35,
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {def.description}
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
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 'none',
            color: active ? 'rgba(255,254,247,0.8)' : 'var(--ink-muted)',
            cursor: 'pointer',
            borderRadius: 6,
            padding: 0,
          }}
        >
          <Icon name={hidden ? 'eye-off' : 'eye'} size={14} />
        </button>
      )}
    </div>
  );
}

// (Old iframe-based Preview component removed — replaced by
//  CanvasStage which renders SiteV8Renderer in-DOM.)

/* ---------- Right inspector ---------- */
function Inspector({
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
  const meta = BLOCKS.find((b) => b.key === block)!;
  return (
    <aside
      className="pl8-editor-inspector"
      style={{
        width: 360,
        flexShrink: 0,
        borderLeft: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--line-soft)',
          position: 'sticky',
          top: 0,
          background: 'var(--cream)',
          zIndex: 2,
        }}
      >
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', fontSize: 10.5, marginBottom: 6 }}>
          Editing
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--cream-2)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name={meta.icon} size={14} />
          </div>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>
            {meta.label}
          </h2>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{meta.description}</p>
      </header>

      <div style={{ padding: '18px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PanelSwitch
          block={block}
          manifest={manifest}
          names={names}
          onChange={onChange}
          onNamesChange={onNamesChange}
        />
        {/* Per-section style overrides — appears below every section
            panel except the global Theme panel (which already has all
            global controls). Lets the host tweak this one section in
            isolation. Uses the same blockId the published renderer
            does so changes are immediately visible. */}
        {block !== 'theme' && block !== 'toasts' && (
          <BlockStylePanel
            manifest={manifest}
            blockId={blockToSectionId(block)}
            label={`${meta.label} — section style`}
            onChange={onChange}
          />
        )}
      </div>
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
