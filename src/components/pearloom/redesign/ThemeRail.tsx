'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/shared/themes.jsx L798-933 ThemePicker.

   The right-rail aside when no section is active. Shows:
     · Header: SITE LOOK eyebrow + Theme packs h3 + Shuffle pill
     · Body: Event-type chip, Generate-from-story, theme grid, site
       layout pick, kit pick, fine-tune (voice/spacing/texture/
       motifs/photos), legibility note, Theme Shop CTA, Decor
       Library CTA, Palette-from-photos, Saved looks, Matching STD.
*/

import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { ThemePackPicker } from '../editor/panels/ThemePackPicker';
import { ThemePickerBody } from './ThemePickerBody';
import { useMobileViewport } from './use-mobile-viewport';

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  onOpenShop: () => void;
  onOpenDecor: () => void;
}

export function ThemeRail({ manifest, onChange, onOpenShop, onOpenDecor }: Props) {
  /* True when mounted inside the phone bottom sheet (the desktop
     grid only renders this rail above the breakpoint). */
  const isMobileViewport = useMobileViewport();
  return (
    <aside
      className="pl-rd-rail-right"
      style={{
        /* Desktop grid placement only — inside the phone bottom
           sheet's single-cell grid, the named-area lookup creates an
           implicit empty track that shoves the rail off-center (same
           fix as PearAside / SectionRail). */
        ...(isMobileViewport
          ? {}
          : { gridArea: 'right', borderLeft: '1px solid var(--line-soft)' }),
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header — prototype themes.jsx L811-818. */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="eyebrow" style={{ color: 'var(--lavender-ink)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          SITE LOOK
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '4px 0 2px', fontWeight: 600 }}>
            Site look
          </h3>
          <button
            type="button"
            className="lift"
            title="Shuffle the whole look"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'var(--cream-2)',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <Icon name="sparkles" size={13} /> Shuffle
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
          Pick a whole pack, or dial in your own colors &amp; texture below.
        </div>
      </div>

      {/* Body — literal port of handoff/shared/themes.jsx
          ThemePicker (L820-933). Wrapped in a flex:1 + overflow:auto
          region so the rail content scrolls INSIDE the rail when it
          exceeds the viewport height (the outer aside has overflow:
          hidden so the page itself never scrolls). */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <ThemePickerBody
          manifest={manifest}
          onChange={onChange}
          onOpenShop={onOpenShop}
          onOpenDecor={onOpenDecor}
        />
      </div>
    </aside>
  );
}

// Re-export the ThemePackPicker so consumers can dock the grid elsewhere.
export { ThemePackPicker };
