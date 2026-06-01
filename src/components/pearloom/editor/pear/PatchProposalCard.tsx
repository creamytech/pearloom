'use client';

// ─────────────────────────────────────────────────────────────
// PatchProposalCard — the "Pear can apply this" card that lands
// in the chat when Pear emits a pearloom:patch envelope.
//
// Replaces the old single-button "Apply" chip with a richer card
// that adapts to the patch shape:
//
//   • Picker patch (options.length >= 2)  — renders each option
//     as a tappable tile. Clicking applies that option.
//   • Single-value patch with before+after — renders a side-by-
//     side diff (before strikethrough, after peach-highlighted).
//   • Single-value patch without before    — renders just the
//     proposed value with an Apply button.
//   • Multi-patch envelope — every patch gets its own subcard so
//     the host can read what changes before applying.
//
// Visual treatment is editorial-peach with a subtle gradient,
// per the redesign's "Pear can help" strip — but tighter, since
// this card is about a concrete change rather than a menu of
// possibilities.
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../../motifs';
import {
  applyPearPatch,
  isPickerPatch,
  readPearPatchTarget,
  type PearPatch,
  type PearPatchEnvelope,
} from './patch';

interface Props {
  envelope: PearPatchEnvelope;
  manifest: StoryManifest;
  /** When true, the card has already been applied. Renders the
   *  applied confirmation chip instead of the Apply controls. */
  applied: boolean;
  /** True when the host can apply patches (parent wired the
   *  apply callback). When false, the card renders read-only. */
  canApply: boolean;
  /** Called with the chosen value when the host picks an option,
   *  or with the patch's existing value for single-value applies.
   *  Parent runs the patch and updates the manifest. */
  onApply: (next: StoryManifest) => void;
  /** Called when the host dismisses the proposal without
   *  applying. The parent removes the card from the chat. */
  onDismiss: () => void;
}

export function PatchProposalCard({
  envelope,
  manifest,
  applied,
  canApply,
  onApply,
  onDismiss,
}: Props) {
  // Local state for picker selections — keyed by patch path so
  // multiple picker patches in one envelope don't cross-contaminate.
  const [selections, setSelections] = useState<Record<string, number>>({});

  // Resolve every patch's effective value: picker → host's pick,
  // else patch.value, else undefined (skip on apply).
  function resolvedPatches(): PearPatch[] {
    return envelope.patches.map((p) => {
      if (isPickerPatch(p)) {
        const idx = selections[p.path];
        if (idx == null || !p.options) return p; // unresolved
        return { ...p, value: p.options[idx] };
      }
      return p;
    });
  }

  // Ready to apply when every picker has a selection. Single-
  // value patches are always ready.
  const allResolved = envelope.patches.every((p) => {
    if (!isPickerPatch(p)) return true;
    return selections[p.path] != null;
  });

  function handleApply() {
    let next = manifest;
    for (const p of resolvedPatches()) {
      next = applyPearPatch(next, p);
    }
    onApply(next);
  }

  return (
    <div
      role="region"
      aria-label="Pear patch proposal"
      style={{
        background: 'linear-gradient(165deg, var(--peach-bg, #FBE8D6) 0%, rgba(232,224,240,0.6) 100%)',
        border: '1px solid rgba(198,112,61,0.22)',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Header — Pear glyph + summary eyebrow */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ flexShrink: 0, marginTop: 1 }}>
          <Pear size={20} tone="peach" shadow={false} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              marginBottom: 2,
            }}
          >
            {applied ? 'Applied by Pear' : 'Pear can apply this'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500 }}>
            {envelope.summary}
          </div>
        </div>
      </div>

      {/* Per-patch body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {envelope.patches.map((patch) => (
          <PatchBody
            key={patch.path}
            patch={patch}
            manifest={manifest}
            applied={applied}
            selectedIdx={selections[patch.path]}
            onPick={(idx) => setSelections((s) => ({ ...s, [patch.path]: idx }))}
          />
        ))}
      </div>

      {/* Footer — Apply / Dismiss */}
      {!applied && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply || !allResolved}
            className={canApply && allResolved ? 'pl-pearl-accent' : undefined}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 999,
              border: canApply && allResolved ? 'none' : '1px solid var(--line)',
              background: canApply && allResolved ? undefined : 'var(--cream-2)',
              color: canApply && allResolved ? undefined : 'var(--ink-muted)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: canApply && allResolved ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ui)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {!canApply
              ? 'Read-only mode'
              : !allResolved
                ? 'Pick one to apply'
                : 'Apply'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink-soft)',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {applied && (
        <div
          role="status"
          aria-live="polite"
          style={{
            alignSelf: 'flex-start',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(92,107,63,0.14)',
            color: 'var(--sage-deep, #5C6B3F)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="check" size={11} color="var(--sage-deep)" />
          Applied
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PatchBody — one patch's body. Switches between picker tiles
// and before/after diff based on the patch shape.
// ─────────────────────────────────────────────────────────────
function PatchBody({
  patch,
  manifest,
  applied,
  selectedIdx,
  onPick,
}: {
  patch: PearPatch;
  manifest: StoryManifest;
  applied: boolean;
  selectedIdx?: number;
  onPick: (idx: number) => void;
}) {
  // Resolve the "before" value: prefer Pear's explicit hint, fall
  // back to reading the manifest at the path.
  const before = patch.before !== undefined ? patch.before : readPearPatchTarget(manifest, patch.path);

  if (isPickerPatch(patch) && patch.options) {
    // Detect if all options are image URLs — switch to a thumbnail
    // grid in that case. Suggest-cover and similar passes ship URL
    // strings as options; rendering them as 13px text would be
    // useless. The detection is cheap (regex) and falls back to
    // text rendering for mixed/non-image options.
    const allImages = patch.options.every((opt) => typeof opt === 'string' && IMAGE_URL_RX.test(opt));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Eyebrow>{prettyPath(patch.path)}</Eyebrow>
        {typeof before === 'string' && before.trim() && !applied && !IMAGE_URL_RX.test(before) && (
          <BeforeBox>{before}</BeforeBox>
        )}
        {typeof before === 'string' && IMAGE_URL_RX.test(before) && !applied && (
          <BeforeImageBox url={before} />
        )}
        {allImages ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 6,
            }}
          >
            {patch.options.map((opt, i) => {
              const url = String(opt);
              const label = patch.optionLabels?.[i];
              const isSelected = selectedIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(i)}
                  disabled={applied}
                  title={label ?? `Option ${i + 1}`}
                  aria-label={label ?? `Option ${i + 1}`}
                  style={{
                    position: 'relative',
                    aspectRatio: '4 / 5',
                    padding: 0,
                    borderRadius: 10,
                    background: `var(--cream-2, #F5EFE2) center/cover no-repeat url(${url})`,
                    border: isSelected
                      ? '2px solid var(--peach-ink, #C6703D)'
                      : '1px solid rgba(198,112,61,0.22)',
                    cursor: applied ? 'default' : 'pointer',
                    overflow: 'hidden',
                    transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                  }}
                >
                  {label && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        right: 4,
                        padding: '2px 6px',
                        background: 'rgba(14,13,11,0.7)',
                        color: 'var(--cream, #FBF7EE)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        borderRadius: 999,
                        textAlign: 'center',
                      }}
                    >
                      {label}
                    </span>
                  )}
                  {isSelected && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: 'var(--peach-ink, #C6703D)',
                        color: 'var(--cream)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        boxShadow: '0 2px 6px rgba(14,13,11,0.18)',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {patch.options.map((opt, i) => {
              const label = patch.optionLabels?.[i];
              const isSelected = selectedIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(i)}
                  disabled={applied}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.45)',
                    border: isSelected
                      ? '1.5px solid var(--peach-ink, #C6703D)'
                      : '1px solid rgba(198,112,61,0.18)',
                    cursor: applied ? 'default' : 'pointer',
                    fontFamily: 'var(--font-ui)',
                    transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
                  }}
                  onMouseEnter={(e) => {
                    if (applied || isSelected) return;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                  }}
                  onMouseLeave={(e) => {
                    if (applied || isSelected) return;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                  }}
                >
                  {label && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink, #C6703D)',
                      }}
                    >
                      {label}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
                    {String(opt)}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink, #C6703D)',
                        marginTop: 2,
                      }}
                    >
                      ✓ Picked
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Single-value patch. Render before/after when before is a string
  // and non-empty; otherwise just the after value. Image URLs flip
  // the row to a side-by-side thumbnail comparison so cover-photo
  // patches don't read as a wall of `https://…`.
  const value = patch.value;
  const beforeIsString = typeof before === 'string' && before.trim().length > 0;
  const valueIsString = typeof value === 'string';
  const beforeIsImage = beforeIsString && IMAGE_URL_RX.test(before as string);
  const valueIsImage = valueIsString && IMAGE_URL_RX.test(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Eyebrow>{prettyPath(patch.path)}</Eyebrow>
      {(beforeIsImage || valueIsImage) ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: beforeIsImage && valueIsImage ? '1fr 1fr' : '1fr',
            gap: 8,
          }}
        >
          {beforeIsImage && <BeforeImageBox url={before as string} />}
          {valueIsImage && <AfterImageBox url={value as string} />}
        </div>
      ) : (
        <>
          {beforeIsString && <BeforeBox>{before as string}</BeforeBox>}
          {value !== undefined && (
            <AfterBox>{valueIsString ? (value as string) : JSON.stringify(value, null, 2)}</AfterBox>
          )}
        </>
      )}
    </div>
  );
}

// Loose detector — anything that looks like an image URL or data URI.
// Catches CDN URLs without explicit extensions (e.g. /api/photos/abc)
// would NOT match here. Hosts whose photos lack extensions miss the
// thumbnail rendering, which is acceptable: the text URL still works.
const IMAGE_URL_RX = /^(https?:\/\/|data:image\/|\/).*\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i;

function BeforeImageBox({ url }: { url: string }) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '4 / 5',
        borderRadius: 10,
        background: `var(--cream-2, #F5EFE2) center/cover no-repeat url(${url})`,
        border: '1px dashed rgba(14,13,11,0.18)',
        opacity: 0.55,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          padding: '2px 7px',
          background: 'rgba(14,13,11,0.7)',
          color: 'var(--cream, #FBF7EE)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          borderRadius: 999,
        }}
      >
        Before
      </span>
    </div>
  );
}

function AfterImageBox({ url }: { url: string }) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '4 / 5',
        borderRadius: 10,
        background: `var(--cream-2, #F5EFE2) center/cover no-repeat url(${url})`,
        border: '1.5px solid rgba(198,112,61,0.32)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          padding: '2px 7px',
          background: 'var(--peach-ink, #C6703D)',
          color: 'var(--cream, #FBF7EE)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          borderRadius: 999,
        }}
      >
        After
      </span>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
      }}
    >
      {children}
    </span>
  );
}

function BeforeBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.4)',
        border: '1px dashed rgba(14,13,11,0.14)',
        borderRadius: 8,
        fontSize: 12.5,
        color: 'var(--ink-muted)',
        textDecoration: 'line-through',
        textDecorationColor: 'rgba(14,13,11,0.3)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function AfterBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.78)',
        border: '1.5px solid rgba(198,112,61,0.32)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--ink)',
        lineHeight: 1.5,
        fontWeight: 500,
        whiteSpace: 'pre-wrap',
      }}
    >
      {children}
    </div>
  );
}

// "poetry.heroTagline" → "Poetry · Hero tagline" so the eyebrow
// reads like a section ref instead of a code path.
function prettyPath(path: string): string {
  const segments = path.split(/[.[\]]/).filter(Boolean);
  return segments
    .map((s) => s.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' · ');
}
