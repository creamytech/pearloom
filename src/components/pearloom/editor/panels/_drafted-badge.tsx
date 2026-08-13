'use client';

/* DraftedBadge — the per-field "Pear drafted this — make it yours"
   affordance (FIRST-PRESSING-PLAN §5, Wave 3).

   Renders ONLY when the bound field-path(s) are in
   manifest.draftedByPear. Two ways to make the draft theirs:
     • the host edits the field → the panel clears the path itself
       (clearDraftedPath in the write path); the badge disappears.
     • Clear → empties the field to its honest-empty state AND drops
       the path — one onChange, one undo step (routes through the
       same onChange the bridge pushes history for).

   Quiet, gold-hairline, Pear-marked. Presentational; the panel owns
   how its own field is emptied (onClear). */

import type { StoryManifest } from '@/types';
import { Pear, Icon } from '../../motifs';
import { clearDraftedPaths, isDrafted } from '@/lib/first-pressing/clear-on-edit';

export function DraftedBadge({
  manifest,
  onChange,
  paths,
  onClear,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Field-path(s) this control writes — one control can map to
   *  more than one (the hero tagline writes both poetry.heroTagline
   *  and tagline). */
  paths: string | string[];
  /** Pure: return the manifest with THIS field emptied to its
   *  honest-empty state. The badge folds the path-clear in and fires
   *  ONE onChange so it's a single, undoable step. */
  onClear: (m: StoryManifest) => StoryManifest;
}) {
  const list = Array.isArray(paths) ? paths : [paths];
  const active = list.filter((p) => isDrafted(manifest, p));
  if (active.length === 0) return null;

  const clear = () => {
    const emptied = onClear(manifest);
    onChange(clearDraftedPaths(emptied, list));
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px 4px 9px',
        borderRadius: 999,
        background: 'var(--peach-bg)',
        border: '1px solid var(--gold, #C19A4B)',
        borderColor: 'color-mix(in oklab, var(--gold, #C19A4B) 55%, transparent)',
        fontSize: 11,
        color: 'var(--peach-ink)',
      }}
    >
      <Pear size={12} tone="sage" shadow={false} />
      <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-display, Fraunces, Georgia, serif)' }}>
        Pear drafted this, make it yours
      </span>
      <button
        type="button"
        onClick={clear}
        aria-label="Clear Pear's draft for this field"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid color-mix(in oklab, var(--peach-ink) 30%, transparent)',
          color: 'var(--peach-ink)',
          fontSize: 10.5,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Icon name="close" size={9} color="var(--peach-ink)" />
        Clear
      </button>
    </div>
  );
}

export default DraftedBadge;
