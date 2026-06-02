'use client';

// ─────────────────────────────────────────────────────────────
// SiteLayoutPicker — direct port of the prototype's LAYOUT ·
// WHOLE-PAGE FEEL dial. Three frames using the prototype's
// exact naming (themed-site.jsx, the siteLayout prop):
//   stacked  — full scroll, sections stack vertically
//   boxed    — the entire site sits as a card on a mat
//   split    — sticky sidebar lockup + scrolling content
//
// Independent of Edition (palette + fonts) and kitId (row
// treatments). Reads/writes manifest.siteLayout. When the host
// hasn't picked one, the matching tile for the active Edition's
// recommendedLayout is badged "★ Recommended" (matches the
// Match / Recommended pattern used elsewhere — KitPicker,
// EditionPicker).
//
// Mounts inside ThemePanel or LookEnginePanel — whichever surface
// makes sense for the host's mental model.
// ─────────────────────────────────────────────────────────────

import type { ReactElement } from 'react';
import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';

type SiteLayout = NonNullable<StoryManifest['siteLayout']>;

interface LayoutOption {
  id: SiteLayout;
  label: string;
  sub: string;
  /** Tiny SVG that hints at the layout's frame shape. Ported
   *  from the prototype's miniature patterns — stacked is a flat
   *  scroll, boxed is a centered card with a mat backdrop, split
   *  is a dark sidebar + content column. */
  preview: () => ReactElement;
}

function StackedPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      <rect x="6" y="8" width="88" height="6" rx="1" fill="#E5DCC4" />
      <rect x="6" y="20" width="88" height="2" rx="1" fill="#D8CFB8" />
      <rect x="6" y="26" width="88" height="2" rx="1" fill="#D8CFB8" />
      <rect x="6" y="36" width="42" height="12" rx="1" fill="#EBE3D2" />
      <rect x="52" y="36" width="42" height="12" rx="1" fill="#EBE3D2" />
    </svg>
  );
}

function BoxedPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Mat backdrop — color-mixed ink-into-paper, ~14% as in
          the prototype's themed-site.jsx line 197 formula. */}
      <rect x="0" y="0" width="100" height="56" fill="#D8CFB8" />
      {/* Inner card with the lifted shadow + hairline border. */}
      <rect x="18" y="6" width="64" height="44" rx="2" fill="#FBF7EE" stroke="#C49A6F" strokeWidth="0.5" />
      <rect x="32" y="14" width="36" height="2" rx="1" fill="#C49A6F" />
      <rect x="28" y="20" width="44" height="3" rx="1" fill="#0E0D0B" />
      <rect x="36" y="28" width="28" height="2" rx="1" fill="#6F6557" />
      <rect x="28" y="36" width="18" height="8" rx="1" fill="#EBE3D2" />
      <rect x="54" y="36" width="18" height="8" rx="1" fill="#EBE3D2" />
    </svg>
  );
}

function SplitPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Sticky-left sidebar — ~35% column, dark (--ink). */}
      <rect x="0" y="0" width="32" height="56" fill="#0E0D0B" />
      <rect x="6" y="8" width="20" height="3" rx="1" fill="#C6703D" />
      <rect x="6" y="16" width="14" height="2" rx="1" fill="#F1EBDC" />
      <rect x="6" y="22" width="14" height="2" rx="1" fill="#F1EBDC" />
      <rect x="6" y="28" width="14" height="2" rx="1" fill="#F1EBDC" />
      {/* Scrolling content column with the 1px line border. */}
      <rect x="32" y="0" width="0.5" height="56" fill="#D8CFB8" />
      <rect x="40" y="8" width="54" height="4" rx="1" fill="#E5DCC4" />
      <rect x="40" y="18" width="54" height="2" rx="1" fill="#D8CFB8" />
      <rect x="40" y="24" width="40" height="2" rx="1" fill="#D8CFB8" />
      <rect x="40" y="32" width="54" height="14" rx="1" fill="#EBE3D2" />
    </svg>
  );
}

const LAYOUTS: LayoutOption[] = [
  { id: 'stacked', label: 'Stacked', sub: 'Full scroll', preview: StackedPreview },
  { id: 'boxed',   label: 'Boxed',   sub: 'Card on a mat', preview: BoxedPreview },
  { id: 'split',   label: 'Split',   sub: 'Sidebar lockup', preview: SplitPreview },
];

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
}

export function SiteLayoutPicker({ manifest, onChange }: Props) {
  /* Resolve the active layout the same way the renderer does so
     the picker reflects what's actually painted:
       1. Explicit siteLayout WINS
       2. Legacy pageLayout — mapped
       3. Edition's recommendedLayout — fallback
       4. 'stacked' — universal default */
  const occasion = manifest.occasion ?? 'wedding';
  const edition = manifest.edition ?? 'almanac';
  const voice = getEventType(occasion)?.voice ?? 'celebratory';
  const activeEdition = resolveEdition({ edition, occasion, voice });
  const recommended: SiteLayout = activeEdition.recommendedLayout ?? 'stacked';

  const explicitPick: SiteLayout | undefined =
    manifest.siteLayout ??
    (manifest.pageLayout === 'invitation'
      ? 'boxed'
      : manifest.pageLayout === 'split'
      ? 'split'
      : manifest.pageLayout === 'classic'
      ? 'stacked'
      : undefined);
  const active: SiteLayout = explicitPick ?? recommended;
  const hasExplicitPick = explicitPick != null;

  function pick(id: SiteLayout) {
    /* Writing siteLayout — the prototype-native field. We also
       clear the legacy pageLayout so subsequent reads use the new
       field only (and the renderer doesn't have to reconcile two
       sources of truth on this manifest going forward). */
    onChange({ ...manifest, siteLayout: id, pageLayout: undefined });
  }

  function clearPick() {
    /* Reset to "match Edition" by clearing BOTH the new field and
       the legacy one. The renderer's recommendedLayout fallback
       takes over. */
    onChange({ ...manifest, siteLayout: undefined, pageLayout: undefined });
  }

  return (
    <PanelSection
      label="Site layout"
      hint="Whole-page feel. Independent of theme and kit."
      defaultOpen
    >
      {hasExplicitPick && (
        <button
          type="button"
          onClick={clearPick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            marginBottom: 10,
            background: 'transparent',
            border: '1px dashed var(--line-soft, rgba(14,13,11,0.16))',
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 600,
            color: 'var(--ink-muted, #6F6557)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          ↺ Match Edition ({recommended})
        </button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {LAYOUTS.map((l) => {
          const on = active === l.id;
          const isRecommended = !hasExplicitPick && l.id === recommended;
          const Preview = l.preview;
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(l.id)}
              title={l.sub}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                background: on ? 'var(--sage-deep, #3D4A1F)' : 'var(--cream-2, #FBF7EE)',
                color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink, #0E0D0B)',
                border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'left',
                transition:
                  'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {isRecommended && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    padding: '2px 8px',
                    background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                    color: 'var(--peach-ink, #C6703D)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: 999,
                    border: '1px solid rgba(198,112,61,0.30)',
                  }}
                >
                  ★ Match
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '25 / 14',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: on ? 'rgba(245,239,226,0.12)' : 'var(--paper, #F5EFE2)',
                }}
              >
                <Preview />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>
                  {l.label}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    opacity: on ? 0.85 : 0.7,
                    lineHeight: 1.3,
                  }}
                >
                  {l.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
