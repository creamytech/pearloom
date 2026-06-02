// ─────────────────────────────────────────────────────────────
// Details-layout variants — registers the 5 prototype variants
// (tiles, iconrow, list, accordion, bento) with the BlockStyle
// registry AND ships a real React Component per variant so each
// pick produces a visually distinct layout.
//
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.details +
// the DetailsBlock renderer in ClaudeDesign/pages/themed-site.jsx
// (lines 459-508). `tiles` is the prototype's default (KDetails
// classic), `iconrow`/`accordion`/`bento` map to dedicated
// `else if` branches in the prototype; `list` had no prototype
// implementation — modeled on the existing DetailsPlate (which
// IS the leader-list shape) per the LeaderListPreview SVG.
//
// Dispatch: ThemedSiteRenderer.ThemedDetails reads
// manifest.blockVariants.details.style and looks up the variant
// here via getBlockStyle('details', id). When the host hasn't
// explicitly picked, it falls back to the kit-based render path
// so existing sites keep their current look.
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';
import { Icon } from '../motifs';
import { EditableText } from '../editor/canvas/EditableText';
import { EditableField } from '../editor/canvas/EditableField';
import type { StoryManifest } from '@/types';

// ── Variant contract — mirrors the shape ThemedDetails computes
//    upstream. Kept lean: variants are layout-only; the host
//    owns label/icon/value mapping. ──

export type DetailFieldKey = 'dresscode' | 'kids' | 'gifts' | 'parking';

export interface DetailVariantItem {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  field: DetailFieldKey;
}

type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

export interface DetailsVariantProps {
  items: DetailVariantItem[];
  onEditField?: FieldEditor;
}

// Shared field-patching helper. Maps a DetailFieldKey back to its
// canonical manifest path (logistics.dresscode / logistics.kids /
// registry.message / logistics.parking).
function makePatchDetail(onEditField: FieldEditor | undefined, field: DetailFieldKey) {
  return (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      if (field === 'gifts') {
        const reg = (m as unknown as { registry?: { message?: string; entries?: unknown[] } }).registry ?? {};
        return {
          ...m,
          registry: { ...reg, message: value },
        } as unknown as StoryManifest;
      }
      const logistics = { ...(m.logistics ?? {}) } as Record<string, unknown>;
      logistics[field] = value;
      return { ...m, logistics } as StoryManifest;
    });
  };
}

// Shared editable value primitive. `gifts` (registry message) is
// prose-shaped so it wears the AI-rewrite chip via EditableField;
// the other three keys (dresscode/kids/parking) are short labels
// so they use EditableText for a quieter affordance.
function DetailValue({
  item,
  onEditField,
  style,
  as = 'div',
}: {
  item: DetailVariantItem;
  onEditField?: FieldEditor;
  style?: CSSProperties;
  as?: 'div' | 'span';
}) {
  const placeholder = `Add ${item.label.toLowerCase()}…`;
  if (item.field === 'gifts') {
    return (
      <EditableField
        as={as}
        context={`Details · ${item.label}`}
        value={item.value}
        onSave={makePatchDetail(onEditField, item.field)}
        multiline
        maxLength={400}
        placeholder={placeholder}
        ariaLabel={`${item.label} value`}
        style={style}
      />
    );
  }
  return (
    <EditableText
      as={as}
      value={item.value}
      onSave={makePatchDetail(onEditField, item.field)}
      maxLength={160}
      placeholder={placeholder}
      ariaLabel={`${item.label} value`}
      style={style}
    />
  );
}

// ─── TILES — equal cards in a row. Date / venue / dress code /
// parking each get an icon disc, eyebrow label, display-font
// value. This is the prototype's default (KDetails classic) but
// shipped here as an explicit variant so the picker has a
// canonical "tiles" identity. ───
export function DetailsTiles({ items, onEditField }: DetailsVariantProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`,
        gap: 14,
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      {items.map((d) => (
        <div
          key={d.label}
          style={{
            padding: 18,
            background: 'var(--card, var(--t-card, #FBF7EE))',
            border: '1px solid var(--line, var(--t-line, rgba(14,13,11,0.10)))',
            borderRadius: 'var(--t-radius, 12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--t-accent-bg, var(--peach-bg, rgba(198,112,61,0.10)))',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 10,
            }}
          >
            <Icon name={d.icon} size={18} color="var(--t-accent-ink, var(--peach-ink, #C6703D))" />
          </div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
              marginBottom: 4,
            }}
          >
            {d.label}
          </div>
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
              fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
              fontSize: 19,
              color: 'var(--t-ink, var(--ink, #0E0D0B))',
            }}
          />
          {d.sub && (
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft, var(--ink-muted, #6F6557))', marginTop: 3 }}>
              {d.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ICON ROW — circular icon discs centered, label + value
// stacked beneath. Borderless, airy. Prototype lines 463-475. ───
export function DetailsIconRow({ items, onEditField }: DetailsVariantProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        gap: 36,
        flexWrap: 'wrap',
        maxWidth: 760,
        marginInline: 'auto',
      }}
    >
      {items.map((d) => (
        <div key={d.label} style={{ textAlign: 'center', maxWidth: 160 }}>
          <div
            aria-hidden
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--t-accent-bg, var(--peach-bg, rgba(198,112,61,0.10)))',
              display: 'grid',
              placeItems: 'center',
              marginInline: 'auto',
              marginBottom: 10,
            }}
          >
            <Icon name={d.icon} size={22} color="var(--t-accent-ink, var(--peach-ink, #C6703D))" />
          </div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
            }}
          >
            {d.label}
          </div>
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
              fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
              fontSize: 19,
              marginTop: 2,
              color: 'var(--t-ink, var(--ink, #0E0D0B))',
            }}
          />
          {d.sub && (
            <div style={{ fontSize: 12, color: 'var(--t-ink-soft, var(--ink-muted, #6F6557))', marginTop: 2 }}>
              {d.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LIST (Leader list) — two columns joined by a dotted
// leader line. Label LEFT (uppercase eyebrow), value RIGHT
// (display font, right-aligned), dots stretch between them.
// No prototype implementation existed for this id; modeled on
// the LeaderListPreview SVG + DetailsPlate's leader pattern. ───
export function DetailsLeaderList({ items, onEditField }: DetailsVariantProps) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '15px 4px',
            borderBottom:
              i < items.length - 1
                ? '1px solid var(--line-soft, var(--t-line-soft, rgba(14,13,11,0.10)))'
                : 'none',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
              minWidth: 96,
            }}
          >
            {d.label}
          </span>
          <span
            aria-hidden
            style={{
              flex: 1,
              borderBottom: '1px dotted var(--line-soft, var(--t-line-soft, rgba(14,13,11,0.20)))',
              transform: 'translateY(-4px)',
            }}
          />
          <span style={{ textAlign: 'right' }}>
            <DetailValue
              item={d}
              onEditField={onEditField}
              as="span"
              style={{
                fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
                fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
                fontSize: 18,
                color: 'var(--t-ink, var(--ink, #0E0D0B))',
              }}
            />
            {d.sub && (
              <span
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
                }}
              >
                {d.sub}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── ACCORDION — tappable rows with chevron + leading icon +
// inline label / value pair. Prototype lines 476-487. ───
export function DetailsAccordion({ items, onEditField }: DetailsVariantProps) {
  return (
    <div
      style={{
        position: 'relative',
        maxWidth: 620,
        marginInline: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      {items.map((d) => (
        <div
          key={d.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            padding: '15px 18px',
            borderRadius: 'var(--t-radius, 12px)',
            background: 'var(--t-card, var(--card, #FBF7EE))',
            border: '1px solid var(--t-line, var(--line, rgba(14,13,11,0.10)))',
          }}
        >
          <Icon name={d.icon} size={18} color="var(--t-accent-ink, var(--peach-ink, #C6703D))" />
          <div style={{ flex: 1, fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span style={{ color: 'var(--t-ink-soft, var(--ink-muted, #6F6557))', fontSize: 13.5 }}>
              {' '}—{' '}
              <DetailValue
                item={d}
                onEditField={onEditField}
                as="span"
                style={{
                  fontFamily: 'inherit',
                  fontWeight: 400,
                  color: 'var(--t-ink-soft, var(--ink-muted, #6F6557))',
                }}
              />
              {d.sub ? `, ${d.sub}` : null}
            </span>
          </div>
          <Icon name="chev-down" size={14} color="var(--t-ink-muted, var(--ink-muted, #6F6557))" />
        </div>
      ))}
    </div>
  );
}

// ─── BENTO — asymmetric grid; the headline card spans both
// columns and uses the accent wash, the rest are paper cards.
// Prototype lines 488-499. ───
export function DetailsBento({ items, onEditField }: DetailsVariantProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        maxWidth: 640,
        marginInline: 'auto',
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            gridColumn: i === 0 ? 'span 2' : 'span 1',
            padding: 20,
            borderRadius: 'var(--t-radius-lg, 16px)',
            background:
              i === 0
                ? 'var(--t-accent-bg, var(--peach-bg, rgba(198,112,61,0.10)))'
                : 'var(--t-card, var(--card, #FBF7EE))',
            border: '1px solid var(--t-line, var(--line, rgba(14,13,11,0.10)))',
          }}
        >
          <Icon name={d.icon} size={20} color="var(--t-accent-ink, var(--peach-ink, #C6703D))" />
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
              fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
              fontSize: 22,
              marginTop: 8,
              color: 'var(--t-ink, var(--ink, #0E0D0B))',
            }}
          />
          <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft, var(--ink-muted, #6F6557))', marginTop: 2 }}>
            {d.label}
            {d.sub ? ` · ${d.sub}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Variant dispatch — let ThemedDetails (or any caller) resolve
//    a registered id to its Component. Exported so the renderer
//    can decide whether the host has picked a variant (override
//    the kit-based render) or not (fall through to kit dispatch). ──
export const DETAILS_VARIANT_COMPONENTS: Record<
  string,
  (props: DetailsVariantProps) => ReactNode
> = {
  tiles: DetailsTiles,
  iconrow: DetailsIconRow,
  list: DetailsLeaderList,
  accordion: DetailsAccordion,
  bento: DetailsBento,
};

export function getDetailsVariantComponent(
  id: string | undefined,
): ((props: DetailsVariantProps) => ReactNode) | undefined {
  if (!id) return undefined;
  return DETAILS_VARIANT_COMPONENTS[id];
}

// ── Mini SVG previews — 64×40 sketches of each layout. ──

function TilesPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) =>
        createElement('rect', {
          key: `tile-${i}`,
          x: 4 + (i % 4) * 15,
          y: 12,
          width: 13,
          height: 16,
          rx: 1.5,
          fill: ['#C49A6F', '#8B6F8E', '#5C6B3F', '#C6703D'][i],
          opacity: 0.55,
        }),
      ),
    ],
  );
}

function IconRowPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => [
        createElement('circle', {
          key: `c-${i}`,
          cx: 10 + i * 15,
          cy: 16,
          r: 4,
          fill: '#C49A6F',
          opacity: 0.55,
        }),
        createElement('rect', {
          key: `l-${i}`,
          x: 6 + i * 15,
          y: 23,
          width: 8,
          height: 1.2,
          fill: '#6F6557',
          opacity: 0.5,
        }),
        createElement('rect', {
          key: `v-${i}`,
          x: 5 + i * 15,
          y: 27,
          width: 10,
          height: 2,
          fill: '#0E0D0B',
          opacity: 0.7,
        }),
      ]).flat(),
    ],
  );
}

function LeaderListPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((row) => [
        createElement(
          'text',
          {
            key: `k-${row}`,
            x: 6,
            y: 12 + row * 7,
            fontFamily: 'sans-serif',
            fontSize: 3,
            fill: '#6F6557',
          },
          ['DATE', 'VENUE', 'DRESS', 'PARKING'][row],
        ),
        createElement('line', {
          key: `dl-${row}`,
          x1: 22,
          y1: 11 + row * 7,
          x2: 50,
          y2: 11 + row * 7,
          stroke: '#6F6557',
          strokeWidth: 0.3,
          strokeDasharray: '0.6 1',
        }),
        createElement(
          'text',
          {
            key: `v-${row}`,
            x: 58,
            y: 12 + row * 7,
            fontFamily: 'serif',
            fontSize: 3,
            fill: '#0E0D0B',
            textAnchor: 'end',
          },
          ['Apr 26', 'Casa', 'Resort', 'On-site'][row],
        ),
      ]).flat(),
    ],
  );
}

function AccordionPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((row) => [
        createElement('rect', {
          key: `r-${row}`,
          x: 6,
          y: 8 + row * 9,
          width: 52,
          height: 7,
          rx: 1.5,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.4,
        }),
        createElement('circle', {
          key: `i-${row}`,
          cx: 10,
          cy: 11.5 + row * 9,
          r: 1.5,
          fill: '#C6703D',
          opacity: 0.6,
        }),
        createElement('rect', {
          key: `l-${row}`,
          x: 14,
          y: 11 + row * 9,
          width: 20,
          height: 1.2,
          fill: '#0E0D0B',
        }),
        createElement('path', {
          key: `ch-${row}`,
          d: `M52 ${10 + row * 9} l2 1.5 -2 1.5`,
          fill: 'none',
          stroke: '#6F6557',
          strokeWidth: 0.5,
        }),
      ]).flat(),
    ],
  );
}

function BentoPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: '1', x: 4, y: 6, width: 56, height: 12, rx: 1.5, fill: '#E5DCEF', opacity: 0.8 }),
      createElement('rect', { key: '2', x: 4, y: 20, width: 27, height: 14, rx: 1.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
      createElement('rect', { key: '3', x: 33, y: 20, width: 27, height: 14, rx: 1.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  tiles: TilesPreview,
  iconrow: IconRowPreview,
  list: LeaderListPreview,
  accordion: AccordionPreview,
  bento: BentoPreview,
};

const COMPONENT_BY_ID: Record<string, (props: DetailsVariantProps) => ReactNode> = {
  tiles: DetailsTiles,
  iconrow: DetailsIconRow,
  list: DetailsLeaderList,
  accordion: DetailsAccordion,
  bento: DetailsBento,
};

for (const variant of LAYOUTS.details) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  const VariantComponent = COMPONENT_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'details',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: VariantComponent
      ? (VariantComponent as unknown as React.ComponentType<unknown>)
      : (() => null as unknown as React.ReactElement),
  });
}

export const DETAILS_VARIANTS_REGISTERED = true;
