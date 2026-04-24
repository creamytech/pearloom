'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/CanvasStage.tsx
//
// Option A of the editor overhaul: render the published-site
// component (SiteV8Renderer) DIRECTLY inside the editor's DOM
// — no iframe. Text nodes wrapped with EditableText become
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
// CSS isolation: the v8 site uses `pl8-guest` as its root and
// reads from `--pl-*` tokens the editor also uses, so nothing
// needs special scoping. Device simulation wraps the render in
// a fixed-width container.
// ─────────────────────────────────────────────────────────────

import { forwardRef, useMemo } from 'react';
import type { StoryManifest } from '@/types';
import { SiteV8Renderer } from '../../site/SiteV8Renderer';
import { ThemeQuickBar } from './ThemeQuickBar';
import { EditorCanvasProvider } from './EditorCanvasContext';

// Match EditorV8's device contract exactly so ref + prop pass
// through without type friction.
export type DeviceKey = 'desktop' | 'tablet' | 'phone';

const DEVICE_WIDTH: Record<DeviceKey, number> = {
  desktop: 1200,
  tablet: 900,
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
}

export const CanvasStage = forwardRef<HTMLDivElement, CanvasStageProps>(
  function CanvasStage(
    { manifest, names, siteSlug, prettyUrl, device, onManifestChange, onNamesChange },
    ref,
  ) {
    const w = DEVICE_WIDTH[device];

    // Patch helper — each EditableText in the tree calls onEditField
    // with a pure manifest → manifest transform, we apply + push up.
    const onEditField = useMemo(
      () => (patch: (m: StoryManifest) => StoryManifest) => {
        onManifestChange(patch(manifest));
      },
      [manifest, onManifestChange],
    );

    return (
      <div
        ref={ref}
        className="pl8-editor-canvas"
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          padding: 24,
          background: 'var(--cream-2)',
          display: 'grid',
          placeItems: 'start center',
        }}
      >
        <div
          style={{
            width: w,
            maxWidth: '100%',
            background: 'var(--paper)',
            borderRadius: 20,
            border: '1px solid var(--card-ring)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            transition: 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <SiteV8Renderer
            manifest={manifest}
            names={names}
            siteSlug={siteSlug}
            prettyUrl={prettyUrl}
            onEditField={onEditField}
            onEditNames={onNamesChange}
          />
        </div>
        {/* Floating theme quick bar — SiteV8Renderer's internal
            context doesn't reach here, so wrap in a sibling
            provider to activate edit mode for the toolbar. */}
        <EditorCanvasProvider value={{ editMode: true }}>
          <ThemeQuickBar
            manifest={manifest}
            names={names}
            onApply={(nextTheme) =>
              onManifestChange({ ...manifest, theme: nextTheme ?? manifest.theme })
            }
          />
        </EditorCanvasProvider>
      </div>
    );
  },
);
