'use client';

/* ========================================================================
   FontPicker — bespoke typography control for the Theme panel.

   Three sub-controls in one cohesive surface:

     1. Pair grid — visual previews of curated heading×body pairings
        from src/lib/font-catalog.ts. Filterable by category. Each tile
        renders the pair's preview phrase using the actual fonts loaded
        on demand via a <link> injection.

     2. Custom — heading + body + script select with live previews of
        the host's current pair. Lets users mix outside the curated
        catalog.

     3. Scale — H1 / H2 / Body sample at the resolved theme so the
        host sees how the pair carries through a real page hierarchy.

   Reads/writes manifest.theme.fonts.{heading|body} so the renderer
   sees changes immediately. Also persists manifest.fontPairId for
   future reference.
   ======================================================================== */

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, PanelSection } from '../atoms';
import { Icon } from '../../motifs';
import {
  FONT_CATALOG,
  FONT_CATEGORIES,
  ALL_HEADING_FONTS,
  ALL_BODY_FONTS,
  buildSingleFontUrl,
  type FontPair,
} from '@/lib/font-catalog';

const SCRIPT_FONTS = [
  'Caveat',
  'Homemade Apple',
  'Dancing Script',
  'Pinyon Script',
  'Allura',
  'Sacramento',
  'Italianno',
  'Petit Formal Script',
];

export function FontPicker({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const themeFonts = (manifest as unknown as { theme?: { fonts?: { heading?: string; body?: string; script?: string } } }).theme?.fonts;
  const headingFont = themeFonts?.heading ?? 'Fraunces';
  const bodyFont = themeFonts?.body ?? 'Inter';
  const scriptFont = themeFonts?.script ?? 'Caveat';
  const fontPairId = (manifest as unknown as { fontPairId?: string }).fontPairId;

  const [tab, setTab] = useState<'pairs' | 'custom'>('pairs');
  const [category, setCategory] = useState<FontPair['category'] | 'all'>('all');

  // Inject Google Fonts <link> for every visible pair so previews render
  // with the right typeface, not Times. Cheap because Google Fonts dedups.
  const visiblePairs = useMemo(() => {
    if (category === 'all') return FONT_CATALOG;
    return FONT_CATALOG.filter((p) => p.category === category);
  }, [category]);

  useEffect(() => {
    const loaded = new Set<string>();
    document.querySelectorAll<HTMLLinkElement>('link[data-pl-font]').forEach((l) => {
      const f = l.dataset.plFont;
      if (f) loaded.add(f);
    });
    const needed = new Set<string>();
    for (const p of visiblePairs) {
      needed.add(p.heading);
      needed.add(p.body);
    }
    needed.add(headingFont);
    needed.add(bodyFont);
    needed.add(scriptFont);
    for (const font of needed) {
      if (loaded.has(font)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = buildSingleFontUrl(font);
      link.dataset.plFont = font;
      document.head.appendChild(link);
    }
  }, [visiblePairs, headingFont, bodyFont, scriptFont]);

  function applyPair(pair: FontPair) {
    const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    const existingFonts = ((existingTheme.fonts as Record<string, string> | undefined) ?? {}) as Record<string, string>;
    onChange({
      ...manifest,
      headingFont: pair.heading,
      bodyFont: pair.body,
      fontPairId: pair.id,
      theme: {
        ...existingTheme,
        fonts: { ...existingFonts, heading: pair.heading, body: pair.body },
      },
    } as unknown as StoryManifest);
  }

  function applySingle(slot: 'heading' | 'body' | 'script', value: string) {
    const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    const existingFonts = ((existingTheme.fonts as Record<string, string> | undefined) ?? {}) as Record<string, string>;
    onChange({
      ...manifest,
      [slot === 'heading' ? 'headingFont' : slot === 'body' ? 'bodyFont' : 'scriptFont']: value,
      // Clear fontPairId if user manually breaks the pairing.
      ...(slot !== 'script' ? { fontPairId: undefined } : {}),
      theme: {
        ...existingTheme,
        fonts: { ...existingFonts, [slot]: value },
      },
    } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="Typography"
      hint="50+ curated pairings, each previewed in its actual font. Or mix your own."
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['pairs', 'custom'] as const).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                fontSize: 12,
                fontWeight: on ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t === 'pairs' ? `Pairings (${FONT_CATALOG.length})` : 'Mix your own'}
            </button>
          );
        })}
      </div>

      {tab === 'pairs' && (
        <>
          {/* Category filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            <CategoryChip label="All" on={category === 'all'} onClick={() => setCategory('all')} />
            {FONT_CATEGORIES.map((c) => (
              <CategoryChip key={c} label={c} on={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
            {visiblePairs.map((pair) => (
              <PairTile
                key={pair.id}
                pair={pair}
                active={fontPairId === pair.id || (headingFont === pair.heading && bodyFont === pair.body)}
                onPick={() => applyPair(pair)}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'custom' && (
        <>
          <Field label="Headings">
            <FontSelect
              value={headingFont}
              options={ALL_HEADING_FONTS}
              onChange={(v) => applySingle('heading', v)}
              previewText="Save the date"
              previewSize={26}
            />
          </Field>
          <Field label="Body">
            <FontSelect
              value={bodyFont}
              options={ALL_BODY_FONTS}
              onChange={(v) => applySingle('body', v)}
              previewText="The day will be better for it."
              previewSize={14}
            />
          </Field>
          <Field label="Script">
            <FontSelect
              value={scriptFont}
              options={SCRIPT_FONTS}
              onChange={(v) => applySingle('script', v)}
              previewText="With love"
              previewSize={22}
              italic
            />
          </Field>
        </>
      )}

      {/* Scale preview — always visible. Shows how the current heading +
          body carry through a real page hierarchy. */}
      <div
        style={{
          marginTop: 14,
          padding: 16,
          borderRadius: 12,
          background: 'var(--cream-2, #F3E9D4)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          <Icon name="type" size={11} /> Live preview
        </div>
        <div style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: 28, lineHeight: 1.05, color: 'var(--ink)', marginBottom: 6 }}>
          We&apos;d love you there
        </div>
        <div style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: 18, lineHeight: 1.15, color: 'var(--ink-soft)', fontStyle: 'italic', marginBottom: 8 }}>
          Come celebrate with us
        </div>
        <div style={{ fontFamily: `"${bodyFont}", system-ui, -apple-system, sans-serif`, fontSize: 13, lineHeight: 1.55, color: 'var(--ink)' }}>
          The full schedule, travel notes, and our story — all in one spot. RSVP by the day on the card.
        </div>
        <div style={{ fontFamily: `"${scriptFont}", cursive`, fontSize: 22, color: 'var(--peach-ink, #C6703D)', marginTop: 10 }}>
          With love, the couple
        </div>
      </div>
    </PanelSection>
  );
}

function CategoryChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        background: on ? 'var(--peach-bg)' : 'var(--card)',
        color: on ? 'var(--peach-ink)' : 'var(--ink-soft)',
        border: `1px solid ${on ? 'var(--peach-ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </button>
  );
}

function PairTile({ pair, active, onPick }: { pair: FontPair; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: 14,
        borderRadius: 12,
        background: active ? 'var(--cream-2)' : 'var(--card)',
        border: active ? '2px solid var(--ink)' : '1.5px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: `"${pair.heading}", Georgia, serif`,
            fontSize: 22,
            fontWeight: pair.headingWeight,
            fontStyle: pair.headingStyle ?? 'normal',
            color: 'var(--ink)',
            lineHeight: 1.05,
          }}
        >
          {pair.preview}
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--peach-ink)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {pair.category}
        </span>
      </div>
      <div
        style={{
          fontFamily: `"${pair.body}", system-ui, -apple-system, sans-serif`,
          fontSize: 12.5,
          color: 'var(--ink-soft)',
          fontWeight: pair.bodyWeight,
          lineHeight: 1.4,
        }}
      >
        {pair.mood} — {pair.heading} + {pair.body}
      </div>
      <div
        style={{
          fontFamily: `"${pair.body}", system-ui, sans-serif`,
          fontSize: 10.5,
          color: 'var(--ink-muted)',
          lineHeight: 1.45,
          marginTop: 4,
          fontStyle: 'italic',
        }}
      >
        {pair.pairRationale}
      </div>
    </button>
  );
}

function FontSelect({
  value,
  options,
  onChange,
  previewText,
  previewSize,
  italic,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  previewText: string;
  previewSize: number;
  italic?: boolean;
}) {
  // Lazy-load the selected font + the visible options when the dropdown is open.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    for (const f of options) {
      if (document.querySelector(`link[data-pl-font="${f}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = buildSingleFontUrl(f);
      link.dataset.plFont = f;
      document.head.appendChild(link);
    }
  }, [open, options]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--card)',
          border: '1.5px solid var(--line)',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            fontFamily: `"${value}", Georgia, serif`,
            fontSize: previewSize,
            fontStyle: italic ? 'italic' : 'normal',
            color: 'var(--ink)',
            lineHeight: 1.1,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {previewText}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{value}</span>
        <Icon name="chev-down" size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            boxShadow: '0 16px 32px rgba(14,13,11,0.18)',
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 5,
          }}
        >
          {options.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                onChange(f);
                setOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: f === value ? 'var(--cream-2)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  fontFamily: `"${f}", Georgia, serif`,
                  fontSize: previewSize,
                  fontStyle: italic ? 'italic' : 'normal',
                  color: 'var(--ink)',
                  lineHeight: 1.05,
                }}
              >
                {previewText}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-muted)', flexShrink: 0 }}>{f}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
