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
import { ThemePanel } from '../editor/panels/ThemePanel';

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  onOpenShop: () => void;
  onOpenDecor: () => void;
}

export function ThemeRail({ manifest, onChange, onOpenShop, onOpenDecor }: Props) {
  return (
    <aside
      style={{
        gridArea: 'right',
        background: 'var(--card)',
        borderLeft: '1px solid var(--line-soft)',
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
            Theme packs
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
          A whole look — texture, palette, type &amp; motifs, tuned to your event.
        </div>
      </div>

      {/* Body — the existing ThemePanel already houses the right cluster
          (Event-type → Generate → Theme grid → Edition → Layout → Kit →
          Fine-tune → Theme Shop CTA → Decor Library CTA → Palette-from-
          photos → Saved looks → Matching STD). Mount it here instead
          of in the legacy inspector tab. */}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <ThemePanel manifest={manifest} onChange={onChange} />
      </div>

      {/* Quick-access dock — Theme Shop + Decor Library. Mirrors
          themes.jsx L886-912 even when ThemePanel scrolls the
          embedded versions out of view. */}
      <div style={{ padding: 14, borderTop: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <button
          type="button"
          onClick={onOpenShop}
          className="lift pl8"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '11px 14px',
            borderRadius: 12,
            width: '100%',
            cursor: 'pointer',
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.12)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}
          >
            <Icon name="sparkles" size={15} color="var(--gold)" />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>Theme Shop</span>
            <span style={{ display: 'block', fontSize: 10.5, opacity: 0.7 }}>60+ premium packs · try live</span>
          </span>
          <Icon name="arrow-up" size={13} color="var(--cream)" />
        </button>

        <button
          type="button"
          onClick={onOpenDecor}
          className="lift"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '11px 14px',
            borderRadius: 12,
            width: '100%',
            cursor: 'pointer',
            background: 'linear-gradient(120deg, var(--lavender-bg), var(--peach-bg))',
            border: '1px solid var(--line-soft)',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--card)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(61,74,31,0.08)',
            }}
          >
            <Icon name="sparkles" size={16} color="var(--lavender-ink)" />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
              Decor Library
            </span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-soft)' }}>
              Motifs, dividers, patterns &amp; monograms
            </span>
          </span>
          <Icon name="arrow-right" size={13} color="var(--ink-soft)" />
        </button>
      </div>
    </aside>
  );
}

// Re-export the ThemePackPicker so consumers can dock the grid elsewhere.
export { ThemePackPicker };
