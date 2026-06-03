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

function MagazinePreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Hero spans full width. */}
      <rect x="6" y="4" width="88" height="14" rx="1" fill="#EBE3D2" />
      <rect x="34" y="8" width="32" height="2" rx="1" fill="#0E0D0B" />
      {/* Two-column spread below. */}
      <rect x="6" y="22" width="42" height="28" rx="1" fill="#E5DCC4" />
      <rect x="52" y="22" width="42" height="28" rx="1" fill="#E5DCC4" />
      <line x1="49.5" y1="22" x2="49.5" y2="50" stroke="#D8CFB8" strokeWidth="0.5" />
      <rect x="10" y="26" width="34" height="1.6" rx="0.5" fill="#0E0D0B" />
      <rect x="10" y="30" width="28" height="1.2" rx="0.5" fill="#6F6557" />
      <rect x="56" y="26" width="34" height="1.6" rx="0.5" fill="#0E0D0B" />
      <rect x="56" y="30" width="32" height="1.2" rx="0.5" fill="#6F6557" />
    </svg>
  );
}

function ZinePreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Three rotated pages — alternating cream and cream-deep. */}
      <rect x="8" y="4" width="84" height="14" rx="1" fill="#FBF7EE" />
      <g transform="rotate(-1 50 28)">
        <rect x="10" y="22" width="80" height="12" rx="1" fill="#EBE3D2" />
        <rect x="14" y="26" width="34" height="1.5" rx="0.5" fill="#0E0D0B" />
        <rect x="14" y="30" width="50" height="1" rx="0.5" fill="#6F6557" />
      </g>
      <g transform="rotate(1 50 46)">
        <rect x="10" y="40" width="80" height="12" rx="1" fill="#F5EFE2" />
        <rect x="14" y="44" width="40" height="1.5" rx="0.5" fill="#0E0D0B" />
      </g>
    </svg>
  );
}

function StorybookPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Hero. */}
      <rect x="0" y="0" width="100" height="14" fill="#EBE3D2" />
      <rect x="34" y="6" width="32" height="3" rx="1" fill="#0E0D0B" />
      {/* Pages — each with a folio number. */}
      <line x1="0" y1="14" x2="100" y2="14" stroke="#D8CFB8" strokeWidth="0.5" />
      <text x="6" y="22" fontFamily="serif" fontStyle="italic" fontSize="3.5" fill="#6F6557">· 01 ·</text>
      <rect x="22" y="20" width="46" height="2" rx="0.5" fill="#0E0D0B" />
      <rect x="22" y="24" width="52" height="1.2" rx="0.5" fill="#6F6557" />
      <line x1="0" y1="32" x2="100" y2="32" stroke="#D8CFB8" strokeWidth="0.5" />
      <text x="6" y="40" fontFamily="serif" fontStyle="italic" fontSize="3.5" fill="#6F6557">· 02 ·</text>
      <rect x="22" y="38" width="42" height="2" rx="0.5" fill="#0E0D0B" />
      <rect x="22" y="42" width="48" height="1.2" rx="0.5" fill="#6F6557" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="#D8CFB8" strokeWidth="0.5" />
    </svg>
  );
}

function GalleryPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Hero full-bleed. */}
      <rect x="0" y="0" width="100" height="20" fill="#EBE3D2" />
      <rect x="32" y="9" width="36" height="2.5" rx="1" fill="#0E0D0B" />
      {/* Narrow centered column. */}
      <rect x="28" y="26" width="44" height="2" rx="0.5" fill="#0E0D0B" />
      <rect x="28" y="30" width="44" height="1.2" rx="0.5" fill="#6F6557" />
      <rect x="28" y="38" width="44" height="6" rx="1" fill="#E5DCC4" />
      <rect x="28" y="48" width="44" height="2" rx="0.5" fill="#0E0D0B" />
      {/* Right-edge sticky progress dots. */}
      <circle cx="94" cy="28" r="1.2" fill="#5C6B3F" />
      <circle cx="94" cy="34" r="1.2" fill="#D8CFB8" />
      <circle cx="94" cy="40" r="1.2" fill="#D8CFB8" />
      <circle cx="94" cy="46" r="1.2" fill="#D8CFB8" />
    </svg>
  );
}

function PostcardPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      {/* Darker mat. */}
      <rect x="0" y="0" width="100" height="56" fill="#3A332C" />
      {/* Postcard card. */}
      <rect x="8" y="4" width="84" height="48" rx="1" fill="#FBF7EE" stroke="#D8CFB8" strokeWidth="0.5" />
      {/* Faux stamp top-right. */}
      <rect x="78" y="9" width="9" height="11" fill="#EBE3D2" stroke="#6F6557" strokeWidth="0.4" strokeDasharray="0.6 0.6" transform="rotate(4 82.5 14.5)" />
      {/* Inner content card. */}
      <rect x="14" y="12" width="58" height="28" rx="0.5" fill="#F5EFE2" stroke="#E5DCC4" strokeWidth="0.4" />
      <rect x="20" y="17" width="46" height="2" rx="0.5" fill="#0E0D0B" />
      <rect x="20" y="22" width="36" height="1.2" rx="0.5" fill="#6F6557" />
      <rect x="20" y="28" width="46" height="6" rx="0.5" fill="#EBE3D2" />
      {/* Caption strip. */}
      <text x="14" y="48" fontFamily="serif" fontStyle="italic" fontSize="3" fill="#6F6557">E &amp; J</text>
      <text x="80" y="48" fontFamily="serif" fontSize="2.4" fill="#6F6557" letterSpacing="0.2">2026</text>
    </svg>
  );
}

const LAYOUTS: LayoutOption[] = [
  { id: 'stacked',   label: 'Stacked',   sub: 'Full scroll',         preview: StackedPreview },
  { id: 'boxed',     label: 'Boxed',     sub: 'Card on a mat',       preview: BoxedPreview },
  { id: 'split',     label: 'Split',     sub: 'Sidebar lockup',      preview: SplitPreview },
  { id: 'magazine',  label: 'Magazine',  sub: 'Two-column spread',   preview: MagazinePreview },
  { id: 'zine',      label: 'Zine',      sub: 'Tilted hand-cut pages', preview: ZinePreview },
  { id: 'storybook', label: 'Storybook', sub: 'Paged with folios',   preview: StorybookPreview },
  { id: 'gallery',   label: 'Gallery',   sub: 'Narrow column, big air', preview: GalleryPreview },
  { id: 'postcard',  label: 'Postcard',  sub: 'Keepsake card frame', preview: PostcardPreview },
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
