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

  const activeVariant = variants.find((v) => v.id === activeId);

  return (
    <PanelSection
      label={label}
      hint={
        activeVariant
          ? `${activeVariant.label} — ${activeVariant.description}`
          : (hint ?? `Pick how the ${blockType} renders.`)
      }
    >
      <div
        data-pl-block-style-picker={blockType}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
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
              aria-pressed={isActive}
              style={{
                position: 'relative',
                background: 'var(--cream)',
                border: isActive
                  ? '2px solid var(--peach-ink, #C6703D)'
                  : '1px solid var(--line-soft)',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'left',
                color: 'var(--ink)',
                boxShadow: isActive
                  ? '0 0 0 4px rgba(198,112,61,0.12)'
                  : 'none',
                transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
              }}
              title={v.description}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--ink-soft)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--line-soft)';
                  e.currentTarget.style.transform = '';
                }
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '64/40',
                  background: 'var(--cream-2)',
                  borderBottom: '1px solid var(--line-soft)',
                  position: 'relative',
                }}
              >
                {v.preview}
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: 'var(--peach-ink, #C6703D)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 2px 6px rgba(14,13,11,0.22)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
              <div style={{ padding: '6px 8px 7px' }}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {v.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
