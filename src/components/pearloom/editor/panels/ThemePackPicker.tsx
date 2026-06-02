'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/shared/themes.jsx ThemePicker theme-grid
   tile. Six themes (Santorini Linen / Tuscan Watercolor / Pressed
   Garden / Modern Editorial / Midnight Velvet / Coastal Ink) —
   each rendered as a 2-column tile with the theme name, blurb, and
   a 4-swatch palette strip. Picking a tile writes manifest.themeId.

   This is the canonical entry point to the prototype's --t-* token
   contract. Once a tile is picked, ThemedSiteRenderer's themeRootStyle
   overlay flips every var(--t-*) reference across the site. */

import type { CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { THEMES, type Theme } from '../../site/themes';

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function ThemePackPicker({ manifest, onChange }: Props) {
  const activeId = (manifest as unknown as { themeId?: string }).themeId
    ?? (manifest as unknown as { theme?: { id?: string } }).theme?.id
    ?? null;

  function pick(id: string) {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      themeId: id,
    } as unknown as StoryManifest);
  }

  return (
    <div data-pl-design-anchor="theme-pack" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        Theme pack
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {THEMES.map((t) => (
          <ThemeTile key={t.id} theme={t} active={activeId === t.id} onPick={() => pick(t.id)} />
        ))}
      </div>
    </div>
  );
}

function ThemeTile({ theme, active, onPick }: { theme: Theme; active: boolean; onPick: () => void }) {
  const tileStyle: CSSProperties = {
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
    background: 'var(--card)',
    border: active ? '2px solid var(--ink)' : '1px solid var(--line-soft)',
    boxShadow: active ? '0 0 0 3px rgba(40,28,12,0.06)' : 'none',
    transition: 'box-shadow var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
  };

  /* Mini preview — applies the theme's vars at a tile scope so the
     swatches read with the theme's own contrast. */
  const previewStyle: CSSProperties = {
    ...(theme.vars as unknown as CSSProperties),
    position: 'relative',
    height: 68,
    background: theme.vars['--t-paper'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderBottom: '1px solid var(--line-soft)',
  };

  return (
    <button type="button" onClick={onPick} className="lift pl8" style={tileStyle}>
      <div style={previewStyle}>
        <span style={{
          fontFamily: theme.vars['--t-display'],
          fontSize: 16,
          fontWeight: Number(theme.vars['--t-display-wght'] ?? 600),
          color: theme.vars['--t-ink'],
          letterSpacing: '-0.01em',
        }}>
          Aa
        </span>
        <span style={{
          position: 'absolute',
          bottom: 4,
          left: 4,
          right: 4,
          display: 'flex',
          gap: 3,
        }}>
          {theme.swatches.map((sw, i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: sw }} />
          ))}
        </span>
      </div>
      <div style={{ padding: '9px 11px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
          {theme.name}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.35 }}>
          {theme.blurb}
        </div>
      </div>
    </button>
  );
}

export default ThemePackPicker;
