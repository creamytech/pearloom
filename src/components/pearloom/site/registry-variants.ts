// ─────────────────────────────────────────────────────────────
// Registry-layout variants — registers the 4 prototype variants
// (cards, chips, progress, logowall) with the BlockStyle registry
// AND exports the per-variant render functions that ThemedRegistry
// dispatches on.
//
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.registry +
// the RegistryBlock renderer in ClaudeDesign/pages/themed-site.jsx
// (function RegistryBlock around line 651).
//
// Renderer status (2026-06-01):
//   cards    — shipped (the existing ThemedRegistry chip-row body
//              is the production default and serves the 'cards'
//              picker option; not touched here)
//   chips    — shipped via renderRegistryChips below
//   progress — shipped via renderRegistryProgress below
//   logowall — shipped via renderRegistryLogowall below
//
// The chips / progress / logowall variants are visually distinct
// in three orthogonal directions:
//   - chips: tiny dense pills, no body copy, no per-store icon
//   - progress: hero card with funded bar + sub chips below
//   - logowall: equal tiles in a 2-col grid w/ centered gift icon
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { EditableField } from '../editor/canvas/EditableField';

function NoopRegistryComponent(): null {
  return null;
}

/** Rich registry entry fields the prototype's progress variant
 *  renders. Captures the per-store status + cash-fund percentage.
 *  Renderers read these via
 *  `(entry as unknown as Partial<RegistryEntryEnriched>)` until
 *  StoryManifest catches up. */
export interface RegistryEntryEnriched {
  /** Icon glyph name — 'heart-icon', 'gift', etc. Picker shows
   *  these from the existing icon library. */
  icon?: string;
  /** Sub-label shown under the store name. Eg "62% funded ·
   *  €3,100 of €5,000" or "14 of 32 gifts remaining". */
  status?: string;
  /** Funding percent 0-100. When set, the card / hero renders a
   *  progress bar; CTA reads "Contribute" not "View". */
  fundingPct?: number;
  /** Cash-fund flag. When true, the 'progress' variant promotes
   *  this entry to the hero card. */
  isCashFund?: boolean;
}

/** Shape of a registry entry as the manifest stores it. */
export interface RegistryEntry {
  name?: string;
  label?: string;
  url: string;
}

/** Helper — patch the registry message via the field editor pipe. */
type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

interface RegistryRenderArgs {
  manifest: StoryManifest;
  entries: RegistryEntry[];
  message: string;
  editMode?: boolean;
  onEditField?: FieldEditor;
}

function patchRegistryMessage(onEditField: FieldEditor | undefined, value: string) {
  onEditField?.((m) => {
    const r = (m as unknown as { registry?: Record<string, unknown> }).registry ?? {};
    return {
      ...m,
      registry: { ...r, message: value },
    } as unknown as StoryManifest;
  });
}

function MessageField({
  message,
  editMode,
  onEditField,
  align = 'center',
  maxWidth = 560,
  marginBottom = 32,
}: {
  message: string;
  editMode?: boolean;
  onEditField?: FieldEditor;
  align?: 'center' | 'left';
  maxWidth?: number;
  marginBottom?: number;
}): ReactNode {
  if (!message && !onEditField) return null;
  return createElement(EditableField, {
    as: 'div',
    context: 'Registry note',
    value: message ?? '',
    onSave: (v: string) => patchRegistryMessage(onEditField, v),
    multiline: true,
    maxLength: 400,
    placeholder: 'Add a gentle note about gifts…',
    ariaLabel: 'Registry note',
    style: {
      fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
      fontStyle: 'italic',
      fontSize: 17,
      color: 'var(--ink-soft, #3A332C)',
      maxWidth,
      margin: align === 'center' ? `0 auto ${marginBottom}px` : `0 0 ${marginBottom}px`,
      lineHeight: 1.55,
      textAlign: align,
    },
  });
  // Note: editMode arg accepted to keep dispatch signature uniform.
  void editMode;
}

/* ─── chips ─── tiny inline pill links centered on the page.
   Lighter / denser than 'cards'; suitable when the host has 4+
   registries and doesn't want the section to dominate. The
   prototype renders these via KChip (themed-site.jsx ~line 661);
   we approximate with a 1px-bordered cream pill so the look
   inherits theme tokens via var(--card) + var(--line). */
export function renderRegistryChips({ manifest, entries, message, editMode, onEditField }: RegistryRenderArgs): ReactNode {
  void manifest;
  return createElement(
    'div',
    { style: { textAlign: 'center' } },
    [
      createElement(MessageField, {
        key: 'msg',
        message,
        editMode,
        onEditField,
        align: 'center',
        maxWidth: 480,
        marginBottom: 22,
      }),
      createElement(
        'div',
        {
          key: 'chips',
          className: 'pl8-registry-chips pl8-registry-chips--dense',
          style: {
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            maxWidth: 720,
            margin: '0 auto',
          },
        },
        entries.map((e, i) =>
          createElement(
            'a',
            {
              key: i,
              href: e.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                background: 'var(--card, #FBF7EE)',
                border: '1px solid var(--line, #D8CFB8)',
                borderRadius: 999,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                letterSpacing: '0.01em',
              },
            },
            [
              createElement('span', { key: 't' }, e.name ?? e.label ?? 'Registry'),
              createElement(Icon, {
                key: 'a',
                name: 'arrow-ur',
                size: 11,
                color: 'var(--peach-ink, #C6703D)',
              }),
            ],
          ),
        ),
      ),
    ],
  );
}

/* ─── progress ─── honeymoon-fund hero card with progress bar,
   small chips for other registries below. The prototype picks
   the first entry whose enriched meta has a `pct` — we surface
   any entry flagged `isCashFund` first, else the first with
   fundingPct, else fall back to the first entry with sensible
   defaults so the card always renders. */
export function renderRegistryProgress({ manifest, entries, message, editMode, onEditField }: RegistryRenderArgs): ReactNode {
  void manifest;
  if (entries.length === 0) return null;

  const enriched = entries.map((e) => ({
    entry: e,
    meta: (e as unknown as Partial<RegistryEntryEnriched>),
  }));
  const heroIdx = (() => {
    const cashIdx = enriched.findIndex((x) => x.meta.isCashFund);
    if (cashIdx >= 0) return cashIdx;
    const pctIdx = enriched.findIndex((x) => typeof x.meta.fundingPct === 'number');
    if (pctIdx >= 0) return pctIdx;
    return 0;
  })();
  const hero = enriched[heroIdx];
  const rest = enriched.filter((_, i) => i !== heroIdx);

  const pct = typeof hero.meta.fundingPct === 'number' ? Math.max(0, Math.min(100, hero.meta.fundingPct)) : 62;
  const status = hero.meta.status ?? `${pct}% funded`;

  const heroCard: CSSProperties = {
    maxWidth: 520,
    marginInline: 'auto',
    background: 'var(--card, #FBF7EE)',
    border: '1px solid var(--line, #D8CFB8)',
    borderRadius: 'var(--pl-card-radius, 14px)',
    padding: '26px 28px',
    boxShadow: 'var(--pl-card-shadow, 0 8px 24px rgba(75,65,52,0.10))',
    textAlign: 'center',
  };

  return createElement(
    'div',
    { style: { textAlign: 'center' } },
    [
      createElement(MessageField, {
        key: 'msg',
        message,
        editMode,
        onEditField,
        align: 'center',
        maxWidth: 480,
        marginBottom: 22,
      }),
      createElement(
        'div',
        { key: 'hero', style: heroCard },
        [
          createElement(
            'div',
            {
              key: 't',
              style: {
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 600,
                fontSize: 24,
                lineHeight: 1.15,
                color: 'var(--ink, #0E0D0B)',
              },
            },
            hero.entry.name ?? hero.entry.label ?? 'Cash fund',
          ),
          createElement(
            'div',
            {
              key: 's',
              style: {
                fontSize: 13,
                color: 'var(--ink-soft, #3A332C)',
                marginTop: 4,
                letterSpacing: '0.01em',
              },
            },
            status,
          ),
          // progress bar
          createElement(
            'div',
            {
              key: 'bar',
              style: {
                height: 10,
                borderRadius: 999,
                background: 'var(--peach-bg, color-mix(in oklab, var(--peach-ink, #C6703D) 14%, var(--card, #FBF7EE)))',
                overflow: 'hidden',
                margin: '16px 0',
              },
              role: 'progressbar',
              'aria-valuenow': pct,
              'aria-valuemin': 0,
              'aria-valuemax': 100,
            },
            createElement('div', {
              style: {
                width: `${pct}%`,
                height: '100%',
                background: 'var(--peach-ink, #C6703D)',
                borderRadius: 999,
                transition: 'width var(--pl-dur-slow, 480ms) var(--pl-ease-out, cubic-bezier(0.22,1,0.36,1))',
              },
            }),
          ),
          createElement(
            'a',
            {
              key: 'cta',
              href: hero.entry.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                background: 'var(--peach-ink, #C6703D)',
                color: 'var(--paper, #FBF7EE)',
                borderRadius: 999,
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: 600,
                letterSpacing: '0.02em',
              },
            },
            [
              createElement('span', { key: 'l' }, 'Contribute'),
              createElement(Icon, { key: 'a', name: 'arrow-right', size: 13, color: 'var(--paper, #FBF7EE)' }),
            ],
          ),
        ],
      ),
      rest.length > 0 &&
        createElement(
          'div',
          {
            key: 'rest',
            style: {
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
              maxWidth: 640,
              margin: '20px auto 0',
            },
          },
          rest.map((x, i) =>
            createElement(
              'a',
              {
                key: i,
                href: x.entry.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 14px',
                  background: 'var(--card, #FBF7EE)',
                  border: '1px solid var(--line, #D8CFB8)',
                  borderRadius: 999,
                  textDecoration: 'none',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--ink, #0E0D0B)',
                },
              },
              [
                createElement('span', { key: 't' }, x.entry.name ?? x.entry.label ?? 'Registry'),
                createElement(Icon, { key: 'a', name: 'arrow-ur', size: 10, color: 'var(--peach-ink, #C6703D)' }),
              ],
            ),
          ),
        ),
    ].filter(Boolean),
  );
}

/* ─── logowall ─── equal-sized tiles in a 2-col responsive grid.
   Each tile centers a gift icon above the store name in display
   font. Heavier visual presence than chips; useful when the host
   wants the registry to read as a curated brand line-up. */
export function renderRegistryLogowall({ manifest, entries, message, editMode, onEditField }: RegistryRenderArgs): ReactNode {
  void manifest;
  return createElement(
    'div',
    { style: { textAlign: 'center' } },
    [
      createElement(MessageField, {
        key: 'msg',
        message,
        editMode,
        onEditField,
        align: 'center',
        maxWidth: 480,
        marginBottom: 26,
      }),
      createElement(
        'div',
        {
          key: 'grid',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            maxWidth: 680,
            marginInline: 'auto',
          },
        },
        entries.map((e, i) =>
          createElement(
            'a',
            {
              key: i,
              href: e.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                padding: '24px 14px',
                borderRadius: 'var(--pl-card-radius, 14px)',
                border: '1px solid var(--line, #D8CFB8)',
                background: 'var(--card, #FBF7EE)',
                display: 'grid',
                placeItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: 'var(--ink, #0E0D0B)',
                boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.08))',
                transition: 'transform var(--pl-dur-fast, 180ms) var(--pl-ease-out, cubic-bezier(0.22,1,0.36,1))',
              },
            },
            [
              createElement(
                'span',
                {
                  key: 'i',
                  style: {
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'var(--peach-bg, color-mix(in oklab, var(--peach-ink, #C6703D) 14%, var(--card, #FBF7EE)))',
                    display: 'grid',
                    placeItems: 'center',
                  },
                },
                createElement(Icon, { name: 'gift', size: 20, color: 'var(--peach-ink, #C6703D)' }),
              ),
              createElement(
                'span',
                {
                  key: 'n',
                  style: {
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontWeight: 600,
                    fontSize: 16,
                    letterSpacing: '0.005em',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  },
                },
                e.name ?? e.label ?? 'Registry',
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

/** Dispatch — picks a render function by variant id. ThemedRegistry
 *  calls this; unknown ids return null so the renderer falls back
 *  to its existing chip body (the `cards` shipped default). */
export function renderRegistryVariant(
  variant: string,
  args: RegistryRenderArgs,
): ReactNode {
  switch (variant) {
    case 'chips':
      return renderRegistryChips(args);
    case 'progress':
      return renderRegistryProgress(args);
    case 'logowall':
      return renderRegistryLogowall(args);
    default:
      return null;
  }
}

// ── Mini SVG previews. ──

function CardsPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((i) => [
        createElement('rect', {
          key: `c-${i}`,
          x: 4 + i * 19,
          y: 8,
          width: 17,
          height: 24,
          rx: 1.5,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.4,
        }),
        createElement('rect', {
          key: `i-${i}`,
          x: 7 + i * 19,
          y: 11,
          width: 6,
          height: 6,
          rx: 1.5,
          fill: '#C6703D',
          opacity: 0.5,
        }),
        createElement('rect', {
          key: `l-${i}`,
          x: 7 + i * 19,
          y: 19,
          width: 11,
          height: 1.4,
          fill: '#0E0D0B',
        }),
        createElement('rect', {
          key: `s-${i}`,
          x: 7 + i * 19,
          y: 22,
          width: 9,
          height: 0.8,
          fill: '#6F6557',
          opacity: 0.6,
        }),
      ]).flat(),
    ],
  );
}

function ChipsPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((i) =>
        createElement('rect', {
          key: `p-${i}`,
          x: 8 + i * 16,
          y: 17,
          width: 14,
          height: 6,
          rx: 3,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.5,
        }),
      ),
      ...[0, 1, 2].map((i) =>
        createElement('rect', {
          key: `t-${i}`,
          x: 10 + i * 16,
          y: 19.5,
          width: 8,
          height: 1.2,
          fill: '#0E0D0B',
        }),
      ),
    ],
  );
}

function ProgressPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Hero card
      createElement('rect', { key: 'h', x: 8, y: 6, width: 48, height: 18, rx: 2, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.5 }),
      createElement('rect', { key: 't', x: 12, y: 9, width: 26, height: 1.7, fill: '#0E0D0B' }),
      // Progress bar empty + filled portion
      createElement('rect', { key: 'p1', x: 12, y: 16, width: 40, height: 2, rx: 1, fill: '#E5DCEF', opacity: 0.8 }),
      createElement('rect', { key: 'p2', x: 12, y: 16, width: 26, height: 2, rx: 1, fill: '#5C6B3F' }),
      // Sub-chips below
      createElement('rect', { key: 'c1', x: 14, y: 28, width: 14, height: 5, rx: 2.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
      createElement('rect', { key: 'c2', x: 32, y: 28, width: 14, height: 5, rx: 2.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
    ],
  );
}

function LogoWallPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return [
          createElement('rect', {
            key: `t-${i}`,
            x: 6 + col * 27,
            y: 6 + row * 15,
            width: 24,
            height: 13,
            rx: 1.5,
            fill: '#FBF7EE',
            stroke: '#D8CFB8',
            strokeWidth: 0.4,
          }),
          createElement('circle', {
            key: `g-${i}`,
            cx: 12 + col * 27,
            cy: 12 + row * 15,
            r: 2,
            fill: '#C6703D',
            opacity: 0.55,
          }),
          createElement('rect', {
            key: `n-${i}`,
            x: 17 + col * 27,
            y: 11 + row * 15,
            width: 11,
            height: 1.4,
            fill: '#0E0D0B',
          }),
        ];
      }).flat(),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  cards: CardsPreview,
  chips: ChipsPreview,
  progress: ProgressPreview,
  logowall: LogoWallPreview,
};

for (const variant of LAYOUTS.registry) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'registry',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: NoopRegistryComponent,
  });
}

export const REGISTRY_VARIANTS_REGISTERED = true;
