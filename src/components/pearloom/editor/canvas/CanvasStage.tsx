'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/CanvasStage.tsx
//
// Option A of the editor overhaul: render the published-site
// component (ThemedSiteRenderer) DIRECTLY inside the editor's
// DOM — no iframe. Text nodes wrapped with EditableText become
// contenteditable on click; every commit flows back through
// onManifestChange. Single source of truth.
//
// This replaces the old iframe preview in EditorV8. The iframe
// approach required a postMessage roundtrip per keystroke to
// be "inline", which was impossible to make smooth. Rendering
// in-DOM gives us:
//
//   - Click-to-edit with zero lag
//   - Keyboard shortcuts that span editor chrome + canvas
//   - CSS-in-site can use our custom fonts immediately (no
//     Google Fonts re-fetch inside the iframe)
//   - Ability to drag blocks, photos, events between panels
//     and the canvas in future phases
//
// CSS isolation: the themed site uses `pl8-guest` as its root
// and reads from `--pl-*` tokens the editor also uses, so
// nothing needs special scoping. Device simulation wraps the
// render in a fixed-width container.
//
// ThemedSiteRenderer is the canonical renderer; legacy V8
// dispatch was removed 2026-06-01.
// ─────────────────────────────────────────────────────────────

import { forwardRef, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSiteRenderer } from '../../site/ThemedSiteRenderer';
import { FloatingFormatToolbar } from './FloatingFormatToolbar';
import { CanvasContextMenu } from './CanvasContextMenu';
import { IconDropTarget } from './IconDropTarget';

// Match EditorV8's device contract exactly so ref + prop pass
// through without type friction.
export type DeviceKey = 'desktop' | 'tablet' | 'phone';

const DEVICE_WIDTH: Record<DeviceKey, number> = {
  desktop: 1280,
  tablet: 820,
  phone: 390,
};

export interface CanvasStageProps {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  prettyUrl: string;
  device: DeviceKey;
  onManifestChange: (next: StoryManifest) => void;
  onNamesChange: (next: [string, string]) => void;
  /** When true, the canvas renders the published-mode view —
   *  no edit chrome, no overlays, no toolbars. Used by the
   *  "Preview as guest" toggle in the editor topbar. */
  previewMode?: boolean;
}

export const CanvasStage = forwardRef<HTMLDivElement, CanvasStageProps>(
  function CanvasStage(
    { manifest, names, siteSlug, prettyUrl, device, onManifestChange, onNamesChange, previewMode },
    ref,
  ) {
    const w = DEVICE_WIDTH[device];

    // Mirror the forwarded ref into a local node ref so child
    // components (IconDropTarget) can register listeners on the
    // canvas root without each route having to thread the ref.
    const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
    function attachRef(node: HTMLDivElement | null) {
      setRootEl(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }
    // Force-resync the rootEl on every mount so the listener
    // useEffects in IconDropTarget see a stable element. (Pure
    // setState in attachRef handles re-renders; this is just
    // belt + braces if React StrictMode double-invokes.)
    useEffect(() => { /* no-op intentional */ }, [rootEl]);

    // Canvas-wide right-click handler. Walks the target's ancestors,
    // figures out what kind of element the host clicked (photo /
    // decor / section), and dispatches the existing
    // pearloom:context-menu-open event with the right item list.
    // Single source of truth for right-click; replaces the
    // per-component onContextMenu handlers that only worked on
    // photos + section roots. Skips contenteditable + form fields
    // so the browser's native menu (paste, spellcheck) still works
    // inside text edits.
    useEffect(() => {
      if (!rootEl || previewMode) return;
      function onCtx(e: MouseEvent) {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        // Native form elements + contenteditable text keep their
        // browser-default menus.
        if (target.isContentEditable) return;
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'IMG' || tag === 'VIDEO') return;
        // Find the most specific edit zone the click landed in.
        const photoZone = target.closest<HTMLElement>('.pl8-photo-action-wrap');
        const decorZone = target.closest<HTMLElement>('[data-pl-decor-edit]');
        const sectionZone = target.closest<HTMLElement>('[data-pl-block-sortable]');
        if (!photoZone && !decorZone && !sectionZone) return;
        type Item = { id: string; label: string; icon?: string; onSelect: () => void; danger?: boolean; divider?: boolean };
        const items: Item[] = [];
        let title = 'Canvas';
        if (photoZone) {
          // Photo wrap dispatches its own onContextMenu already, but
          // some surfaces (gallery tiles, hero) render the wrap with
          // pointer-events: none on overlays; bridge the gap here.
          title = 'Photo';
          items.push({
            id: 'photo-replace',
            label: 'Replace photo',
            icon: 'upload',
            onSelect: () => {
              // Trigger the wrap's own picker via a synthetic click
              // on its replace button.
              const replaceBtn = photoZone.querySelector<HTMLButtonElement>('button[aria-label="Replace photo"]');
              replaceBtn?.click();
            },
          });
        } else if (decorZone) {
          title = 'Decor';
          items.push({
            id: 'decor-swap',
            label: 'Swap art',
            icon: 'sparkles',
            onSelect: () => {
              const swapBtn = decorZone.querySelector<HTMLButtonElement>('button[title*="Swap" i]');
              swapBtn?.click();
            },
          });
          items.push({
            id: 'decor-hide',
            label: 'Hide this',
            icon: 'eye-off',
            danger: true,
            divider: true,
            onSelect: () => {
              const hideBtn = decorZone.querySelector<HTMLButtonElement>('button[title*="Hide" i]');
              hideBtn?.click();
            },
          });
        } else if (sectionZone) {
          // Section-level menu pulls the same actions as the hover
          // pill so right-click + hover surface the same operations.
          const blockKey = sectionZone.getAttribute('data-pl-block') ?? '';
          title = blockKey || 'Section';
          items.push({
            id: 'edit',
            label: 'Edit in inspector',
            icon: 'sliders',
            onSelect: () => {
              window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: blockKey } }));
            },
          });
          items.push({
            id: 'hide',
            label: `Hide ${blockKey}`,
            icon: 'eye-off',
            danger: true,
            divider: true,
            onSelect: () => {
              const hideBtn = sectionZone.querySelector<HTMLButtonElement>('.pl8-canvas-section-menu button[aria-label^="Remove"]');
              hideBtn?.click();
            },
          });
        }
        if (items.length === 0) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('pearloom:context-menu-open', {
          detail: { x: e.clientX, y: e.clientY, title, items },
        }));
      }
      rootEl.addEventListener('contextmenu', onCtx);
      return () => rootEl.removeEventListener('contextmenu', onCtx);
    }, [rootEl, previewMode]);

    // Patch helper — each EditableText in the tree calls onEditField
    // with a pure manifest → manifest transform, we apply + push up.
    // In previewMode we DON'T pass onEditField so the renderer's
    // editMode = Boolean(onEditField) goes false and every edit
    // overlay disappears — host sees the page as a guest does.
    const onEditField = useMemo(
      () => (patch: (m: StoryManifest) => StoryManifest) => {
        onManifestChange(patch(manifest));
      },
      [manifest, onManifestChange],
    );

    return (
      <div
        ref={attachRef}
        id="pl-editor-canvas"
        className="pl8-editor-canvas"
        // role="main" makes the canvas a screen-reader landmark so
        // it shows up alongside Editor toolbar (header), Outline,
        // and Inspector (asides) when the host navigates by region.
        role="main"
        aria-label="Site canvas"
        // Negative tabIndex so the skip-link target is programmatically
        // focusable but doesn't introduce its own tab stop. The site
        // body inside is keyboard-reachable via its own controls.
        tabIndex={-1}
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          // Drop the default focus outline on programmatic focus —
          // the host's screen reader announces the canvas via the
          // skip link's target without needing a visible ring on a
          // viewport-scale element.
          outline: 'none',
          padding: device === 'phone' ? '24px 0' : '28px 24px',
          // Prototype L243-257 literal: cream-3 paper workbench with a
          // radial-gradient dotted grid backdrop. Replaces the previous
          // dark slate look so the editor canvas matches the prototype.
          background:
            "radial-gradient(circle, rgba(61,74,31,0.08) 1px, transparent 1px) 0 0 / 22px 22px, var(--cream-3)",
          display: 'grid',
          placeItems: 'start center',
        }}
      >
        <div
          className="pl8-canvas-device-frame"
          data-device={device}
          style={{
            width: w,
            maxWidth: '100%',
            background: 'var(--paper)',
            borderRadius: device === 'phone' ? 36 : 14,
            border: '1px solid var(--card-ring)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
            transition: 'width var(--pl-dur-base) var(--pl-ease-out)',
            // CSS container so site responsive rules can react to
            // the *device viewport* width via @container queries
            // instead of window.innerWidth. See pearloom.css —
            // every @media (max-width: …) for site layouts has a
            // mirrored @container pl-site rule for editor preview.
            containerType: 'inline-size',
            containerName: 'pl-site',
          }}
        >
          {/* ThemedSiteRenderer is the canonical renderer and
              matches PublishedSiteShell so the editor preview
              shows the SAME thing guests will see. Inline edits
              flow through onEditField / onEditNames; when preview
              mode is on, both callbacks are suppressed so the
              canvas reads as guest-view. */}
          <ThemedSiteRenderer
            manifest={manifest}
            names={names}
            siteSlug={siteSlug}
            // Editor canvas → scaffolding visible. Preview mode
            // toggles inline-edit affordances; when the host is
            // reading-as-guest we still show scaffolding because
            // they're inside the editor (the published site has
            // its own renderer mount with editMode=false).
            editMode={!previewMode}
            onEditField={previewMode ? undefined : onEditField}
            onEditNames={previewMode ? undefined : onNamesChange}
          />
          {/* prettyUrl prop retained on CanvasStageProps for now —
              consumed by toolbars / other surfaces above. */}
        </div>
        {/* Theme picker now lives in the inspector rail's Theme
            tab — no floating bottom-right card here anymore. */}
        {/* Floating format toolbar — surfaces over any text
            selection inside an [data-pl-editable] node. Lets the
            host bold / italic / link / clear / ask-Pear-to-rewrite
            without leaving the canvas. */}
        <CanvasContextMenu />
        {/* Click-to-swap + drag-to-replace for every icon. The
            modal that picks the new icon (IconSwapModal) is mounted
            once at the editor root. Dragging here happens against
            the *canvas* element so listeners can't fire when the
            host is rearranging the inspector or topbar. */}
        <IconDropTarget
          editMode={!previewMode}
          onEditField={previewMode ? undefined : onEditField}
          canvasRoot={rootEl}
        />
        <FloatingFormatToolbar
          onAiRewrite={async (text) => {
            try {
              const res = await fetch('/api/inline-rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, context: 'inline-format' }),
              });
              if (!res.ok) return null;
              const data = (await res.json()) as { rewritten?: string };
              return data.rewritten ?? null;
            } catch {
              return null;
            }
          }}
        />
      </div>
    );
  },
);
