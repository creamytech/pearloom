'use client';

/* eslint-disable no-restricted-syntax */
/* Mini SAVE-THE-DATE preview per theme — matches the handoff
   prototype's "Recommended for wedding" tile pattern. Each tile
   renders a real save-the-date in the theme's typography + paper
   + accent, so the host picks by SEEING what the site will look
   like, not by reading swatch chips.

   Source: handoff/pages/wizard.jsx SiteVignette + handoff/pages/
   theme-shop.jsx ShopPreview. Same concept, scoped to a tile. */

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

  /* Use real host names if set; otherwise show "Ava & Liam" so the
     preview still reads as a save-the-date and not as placeholder
     text. The prototype uses identical sample names. */
  const nameA = (manifest as unknown as { names?: [string, string] }).names?.[0] || 'Ava';
  const nameB = (manifest as unknown as { names?: [string, string] }).names?.[1] || 'Liam';

  function pick(id: string) {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      themeId: id,
    } as unknown as StoryManifest);
  }

  return (
    <div data-pl-design-anchor="theme-pack" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        Recommended themes
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: -4, marginBottom: 4 }}>
        One pick sets the whole theme — palette, fonts, radii, atmosphere.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {THEMES.map((t) => (
          <ThemeTile key={t.id} theme={t} active={activeId === t.id} nameA={nameA} nameB={nameB} onPick={() => pick(t.id)} />
        ))}
      </div>
    </div>
  );
}

function ThemeTile({ theme, active, nameA, nameB, onPick }: { theme: Theme; active: boolean; nameA: string; nameB: string; onPick: () => void }) {
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
    fontFamily: 'inherit',
  };

  /* Mini SAVE-THE-DATE preview — applies the theme's --t-* vars at
     a tile scope so the inner type + paper read with the theme's
     own palette + font, exactly like the prototype's SiteVignette. */
  const previewStyle: CSSProperties = {
    ...(theme.vars as unknown as CSSProperties),
    position: 'relative',
    height: 112,
    background: theme.vars['--t-paper'],
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '14px 12px',
    textAlign: 'center',
  };

  const eyebrowStyle: CSSProperties = {
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: theme.vars['--t-eyebrow-ls'] ?? '0.18em',
    textTransform: 'uppercase',
    color: theme.vars['--t-accent-ink'],
    marginBottom: 5,
  };

  const namesStyle: CSSProperties = {
    fontFamily: theme.vars['--t-display'],
    fontWeight: Number(theme.vars['--t-display-wght'] ?? 600),
    fontSize: 18,
    lineHeight: 1,
    color: theme.vars['--t-ink'],
    letterSpacing: '-0.01em',
  };

  /* "&" glyph rendered slightly smaller + italic (or upright for
      sans-serif themes like Modern Editorial). Matches the prototype's
      treatment of inline "and" in ShopPreview. */
  const isSans = String(theme.vars['--t-display'] ?? '').includes('Inter');

  return (
    <button type="button" onClick={onPick} className="lift" style={tileStyle}>
      <div style={previewStyle}>
        <div style={eyebrowStyle}>Save the date</div>
        <div style={namesStyle}>
          {nameA}
          <span
            style={{
              fontStyle: isSans ? 'normal' : 'italic',
              fontSize: '0.62em',
              color: theme.vars['--t-ink-soft'],
              margin: '0 0.16em',
              fontWeight: 400,
            }}
          >
            &amp;
          </span>
          {nameB}
        </div>
        <div style={{ width: 50, height: 1, background: theme.vars['--t-accent'], opacity: 0.6, margin: '7px 0 5px' }} />
        <div style={{ fontSize: 8.5, color: theme.vars['--t-ink-soft'], letterSpacing: '0.04em' }}>
          26 · 04 · 2027
        </div>
      </div>
      <div style={{ padding: '9px 11px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
          {theme.name}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.35 }}>
          {theme.blurb}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
          {theme.swatches.slice(0, 4).map((sw, i) => (
            <span key={i} style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: sw,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10)',
            }} />
          ))}
        </div>
      </div>
    </button>
  );
}

export default ThemePackPicker;
