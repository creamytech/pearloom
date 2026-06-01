'use client';

// ─────────────────────────────────────────────────────────────
// LayoutPicker — port of the prototype's "LAYOUT · WHOLE-PAGE
// FEEL" dial. Three frames:
//   classic     — full scroll, sections fill the viewport
//   invitation  — content sits on a card on a mat (framed)
//   split       — fixed sidebar nav, scrolling content column
//
// Independent of Edition (theme = palette + fonts + radii) and
// kitId (component identity = how rows + dividers are drawn).
// LAYOUT controls the OUTER framing of the whole page.
//
// Reads/writes manifest.pageLayout. The renderer reads it as
// data-pl-page-layout on the .pl8-guest root; CSS scopes the
// framing without per-component prop drilling.
// ─────────────────────────────────────────────────────────────

import type { ReactElement } from 'react';
import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';

type PageLayout = NonNullable<StoryManifest['pageLayout']>;

interface LayoutOption {
  id: PageLayout;
  label: string;
  sub: string;
  /** Tiny SVG that hints at the layout's frame shape. */
  preview: () => ReactElement;
}

function ClassicPreview() {
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

function InvitationPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="100" height="56" fill="#D8CFB8" />
      <rect x="18" y="8" width="64" height="40" rx="2" fill="#FBF7EE" stroke="#C49A6F" strokeWidth="0.5" />
      <rect x="32" y="16" width="36" height="2" rx="1" fill="#C49A6F" />
      <rect x="28" y="22" width="44" height="3" rx="1" fill="#0E0D0B" />
      <rect x="36" y="30" width="28" height="2" rx="1" fill="#6F6557" />
    </svg>
  );
}

function SplitPreview() {
  return (
    <svg viewBox="0 0 100 56" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="32" height="56" fill="#0E0D0B" />
      <rect x="6" y="8" width="20" height="3" rx="1" fill="#C6703D" />
      <rect x="6" y="16" width="14" height="2" rx="1" fill="#F1EBDC" />
      <rect x="6" y="22" width="14" height="2" rx="1" fill="#F1EBDC" />
      <rect x="6" y="28" width="14" height="2" rx="1" fill="#F1EBDC" />
      <rect x="40" y="8" width="54" height="4" rx="1" fill="#E5DCC4" />
      <rect x="40" y="18" width="54" height="2" rx="1" fill="#D8CFB8" />
      <rect x="40" y="24" width="40" height="2" rx="1" fill="#D8CFB8" />
      <rect x="40" y="32" width="54" height="14" rx="1" fill="#EBE3D2" />
    </svg>
  );
}

const LAYOUTS: LayoutOption[] = [
  { id: 'classic', label: 'Classic', sub: 'Full scroll', preview: ClassicPreview },
  { id: 'invitation', label: 'Invitation', sub: 'Card on a mat', preview: InvitationPreview },
  { id: 'split', label: 'Split', sub: 'Sidebar lockup', preview: SplitPreview },
];

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
}

export function LayoutPicker({ manifest, onChange }: Props) {
  /* Active layout — explicit pick wins; falls back to 'classic'
     (the most permissive frame). The renderer reads the same
     fallback chain so a manifest with no pageLayout still
     renders correctly. */
  const active: PageLayout = manifest.pageLayout ?? 'classic';

  function pick(id: PageLayout) {
    onChange({ ...manifest, pageLayout: id });
  }

  return (
    <PanelSection
      label="Layout · whole-page feel"
      hint="How the site is framed. Independent of theme and component kit."
      defaultOpen
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {LAYOUTS.map((l) => {
          const on = active === l.id;
          const Preview = l.preview;
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(l.id)}
              title={l.sub}
              style={{
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
                transition: 'background 180ms ease, color 180ms ease',
              }}
            >
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
