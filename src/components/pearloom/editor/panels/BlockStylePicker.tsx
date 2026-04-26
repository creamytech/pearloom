'use client';

// ──────────────────────────────────────────────────────────────
// BlockStylePicker — Inspector card grid that lists every
// registered variant for a block type. Reads from the block-style
// registry (src/lib/block-engine/block-styles.ts) so adding a new
// hero / story / rsvp variant requires no editor changes.
//
// Used by HeroPanel today; will be reused by every block panel
// once Phase E migrates the rest of the inline editing.
// ──────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { getBlockStyles } from '@/lib/block-engine/block-styles';
import { PanelSection } from '../atoms';

interface Props {
  blockType: string;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Default variant id when manifest.blockVariants[blockType] is unset. */
  defaultStyleId?: string;
  /** Section label override. Defaults to "Style". */
  label?: string;
  /** Section hint override. */
  hint?: string;
}

export function BlockStylePicker({
  blockType, manifest, onChange, defaultStyleId, label = 'Style', hint,
}: Props) {
  const variants = getBlockStyles(blockType);
  if (variants.length <= 1) return null;

  const activeId =
    (manifest.blockVariants?.[blockType]?.style as string | undefined)
    ?? defaultStyleId
    ?? variants[0]?.id;

  function pick(id: string) {
    onChange({
      ...manifest,
      blockVariants: {
        ...(manifest.blockVariants ?? {}),
        [blockType]: { style: id },
      },
    });
  }

  return (
    <PanelSection label={label} hint={hint ?? `Pick how the ${blockType} renders.`}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {variants.map((v) => {
          const isActive = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => pick(v.id)}
              style={{
                background: 'transparent',
                border: isActive ? '1.5px solid var(--ink)' : '1px solid var(--line-soft)',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'left',
                color: 'var(--ink)',
                transition: 'border-color 200ms ease, transform 200ms ease',
              }}
              title={v.description}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '64/40',
                  background: 'var(--cream-2)',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                {v.preview}
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>{v.label}</div>
                <div
                  style={{
                    fontSize: 10, color: 'var(--ink-muted)', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}
                >
                  {v.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
