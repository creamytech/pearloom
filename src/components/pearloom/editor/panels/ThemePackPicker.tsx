'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of the handoff "RECOMMENDED FOR WEDDING" tile.

   Each tile is intentionally minimal — just "Aa" + italic "and" in
   the theme's display font + ink color on the theme's paper, plus
   the theme's motif rendered as a subtle corner decoration. The
   prototype design choice: hosts pick by feel, not by looking at
   a full save-the-date miniature.

   Badges:
     - "★ PICK" top-left when the theme is in the event's
        recommended-top list (handoff themes.jsx L815-833).
     - Green ✓ pill top-right when the theme is the active pick.

   Footer (under the preview): theme name (bold) + blurb +
   4-circle palette swatch strip. */

import type { CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { THEMES, type Theme } from '../../site/themes';
import { Motif, type MotifKind } from '../../site/MotifScatter';
import { Icon } from '../../motifs';

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

/* Recommended-top set per occasion. Defaults to the first 3 themes
   when an occasion isn't in the registry. Mirrors the prototype's
   `recommendedThemes(event)` registry in themes.jsx around L800-808. */
const RECOMMENDED_FOR: Record<string, string[]> = {
  wedding: ['santorini', 'garden', 'tuscan'],
  engagement: ['tuscan', 'garden', 'santorini'],
  anniversary: ['midnight', 'tuscan', 'santorini'],
  birthday: ['garden', 'tuscan', 'editorial'],
  story: ['garden', 'tuscan', 'editorial'],
  memorial: ['midnight', 'editorial', 'coastal'],
};

export function ThemePackPicker({ manifest, onChange }: Props) {
  const activeId = (manifest as unknown as { themeId?: string }).themeId
    ?? (manifest as unknown as { theme?: { id?: string } }).theme?.id
    ?? null;

  const occasion = ((manifest as unknown as { occasion?: string }).occasion) ?? 'wedding';
  const recommendedTop = new Set(RECOMMENDED_FOR[occasion] ?? RECOMMENDED_FOR.wedding);
  const occasionLabel = occasion.charAt(0).toUpperCase() + occasion.slice(1);

  function pick(id: string) {
    /* Clear any Theme-Store pack overrides — picking a "tile"
       theme should fully take over the look, not be partially
       overridden by a previously-applied shop pack (which writes
       its own kit/texture/pattern/motifs/fonts). Without this,
       the host clicks a theme and sees little change because
       pack values dominate. */
    const loose = manifest as unknown as Record<string, unknown>;
    const existingTheme = (loose.theme as Record<string, unknown> | undefined) ?? {};
    const nextTheme = { ...existingTheme };
    /* Strip pack-applied fonts so the theme's own typography
       takes effect. The new theme's vars carry display + body. */
    delete (nextTheme as { fonts?: unknown }).fonts;
    onChange({
      ...loose,
      themeId: id,
      theme: nextTheme,
      /* Pack identity fields — null them out (renderer reads
         falsy as "use theme defaults"). */
      kitId: undefined,
      texture: undefined,
      pattern: undefined,
      motifs: undefined,
    } as unknown as StoryManifest);
  }

  return (
    <div data-pl-design-anchor="theme-pack" style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '14px 14px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        Recommended for {occasionLabel}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: -4, marginBottom: 4 }}>
        One pick sets the whole theme — palette, fonts, radii, atmosphere.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {THEMES.map((t) => (
          <ThemeTile
            key={t.id}
            theme={t}
            active={activeId === t.id}
            recommended={recommendedTop.has(t.id)}
            onPick={() => pick(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeTile({ theme, active, recommended, onPick }: { theme: Theme; active: boolean; recommended: boolean; onPick: () => void }) {
  const tileStyle: CSSProperties = {
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
    background: 'var(--card)',
    border: active ? '2px solid var(--ink)' : '1px solid var(--line-soft)',
    fontFamily: 'inherit',
    width: '100%',
  };

  /* Mini preview — theme paper + corner motif + "Aa / and" body.
     Apply the theme's --t-* vars at this scope so the inner type
     reads with the theme's actual display font + ink color. */
  const previewStyle: CSSProperties = {
    ...(theme.vars as unknown as CSSProperties),
    position: 'relative',
    height: 92,
    background: theme.vars['--t-paper'],
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const isSans = String(theme.vars['--t-display'] ?? '').includes('Inter');

  return (
    <button type="button" onClick={onPick} className="lift" style={tileStyle}>
      <div style={previewStyle}>
        {/* Corner motif — the theme's actual decoration glyph,
            absolute-positioned bottom-right, low-opacity. */}
        {theme.motif && theme.motif !== 'none' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              opacity: 0.55,
              pointerEvents: 'none',
            }}
          >
            <Motif kind={theme.motif as MotifKind} size={28} />
          </div>
        )}

        {/* "★ PICK" badge top-left when recommended. */}
        {recommended && !active && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--card)',
              border: '1px solid var(--line-soft)',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              boxShadow: '0 1px 2px rgba(40,28,12,0.05)',
            }}
          >
            ★ Pick
          </div>
        )}

        {/* Green checkmark badge top-right when active. */}
        {active && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--sage-deep, #5C6B3F)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 6px rgba(61,74,31,0.18)',
            }}
          >
            <Icon name="check" size={12} color="#FBF7EE" />
          </div>
        )}

        {/* "Aa / and" body — the prototype's minimal preview. */}
        <div
          style={{
            fontFamily: theme.vars['--t-display'],
            fontWeight: Number(theme.vars['--t-display-wght'] ?? 600),
            fontSize: 30,
            lineHeight: 1,
            color: theme.vars['--t-ink'],
            letterSpacing: '-0.01em',
          }}
        >
          Aa
        </div>
        <div
          style={{
            fontFamily: theme.vars['--t-display'],
            fontStyle: isSans ? 'normal' : 'italic',
            fontSize: 13,
            color: theme.vars['--t-ink-soft'],
            marginTop: 4,
            opacity: 0.85,
          }}
        >
          and
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
            <span
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: sw,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10)',
              }}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

export default ThemePackPicker;
