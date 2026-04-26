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
import { FloatingFormatToolbar } from './FloatingFormatToolbar';

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
          padding: '32px 32px 96px',
          // Warm dark slate so the device viewport reads as a real
          // object on a workbench instead of floating in cream space.
          // Dotted-grid texture is layered on top via a fine repeating
          // radial-gradient at low alpha — quiet but tangible.
          background:
            'radial-gradient(rgba(251,247,238,0.06) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(180deg, #1c1a16 0%, #15130f 100%)',
          backgroundAttachment: 'local, local',
          display: 'grid',
          placeItems: 'start center',
        }}
      >
        <div
          style={{
            width: w,
            maxWidth: '100%',
            background: 'var(--paper)',
            borderRadius: 18,
            border: '1px solid rgba(251,247,238,0.06)',
            boxShadow:
              '0 30px 80px -30px rgba(0,0,0,0.6), 0 12px 32px -16px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.4)',
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
        {/* Floating format toolbar — surfaces over any text
            selection inside an [data-pl-editable] node. Lets the
            host bold / italic / link / clear / ask-Pear-to-rewrite
            without leaving the canvas. */}
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
