'use client';

/* Name vote section — the baby-shower / gender-reveal name ballot.

   Data: manifest.nameVote = { question?, options?: string[],
   reveal? } — written by NameVotePanel. Names are the ballot; the
   optional `reveal` mode keeps the tallies sealed until the guest
   has cast their own vote (no bandwagon).

   GUEST INTERACTIVITY (published only): rides the exact
   activityVote plumbing — useActivityVote (localStorage optimistic
   layer + /api/event-os/votes sync) under the constant block id
   NAME_VOTE_BLOCK_ID, option ids slugged from the labels via
   optionIdsFor. The host tally on /dashboard/submissions reads the
   same ids through nameVotePollWithId — never fork them.

   Variants (layouts.ts): ballot (single variant). */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';
import { useActivityVote, usePrefersReducedMotion } from './activity-vote';
import { nameVotePollWithId, optionIdsFor } from '@/lib/event-os/activity-votes';

function readSiteId(manifest: BlockSectionProps['manifest']): string {
  return (manifest.subdomain ?? '').trim();
}

/* Occasion-voiced defaults — plain words, no craft vocabulary. */
function defaultsFor(occasion?: string): { eyebrow: string; title: string } {
  if (occasion === 'gender-reveal') {
    return { eyebrow: 'Before the reveal', title: 'Pick a favorite name' };
  }
  return { eyebrow: 'Help us choose', title: 'Vote on the name' };
}

function Ballot({
  question, options, siteId, blockId, editable, reveal,
}: {
  question: string;
  options: string[];
  siteId: string;
  blockId: string;
  editable: boolean;
  reveal: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const ids = optionIdsFor(options);
  const { myVote, serverTallies, castVote, canSync } = useActivityVote(siteId, blockId, !editable);

  const serverTotal = Object.values(serverTallies).reduce((a, b) => a + b, 0);
  const useServer = canSync && serverTotal > 0;
  const counts = ids.map((id) => (useServer ? (serverTallies[id] ?? 0) : (myVote === id ? 1 : 0)));
  const total = counts.reduce((a, b) => a + b, 0);
  /* Reveal mode: tallies stay sealed until the guest has voted.
     The editor canvas always shows the shape (counts hidden there
     anyway — no votes exist on the canvas). */
  const showCounts = total > 0 && (!reveal || !!myVote || editable);

  return (
    <div
      style={{
        maxWidth: 560, margin: '0 auto',
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        padding: 'clamp(18px, 3.5vw, 28px)',
        boxShadow: 'var(--t-shadow-sm, none)',
      }}
    >
      {question.trim() && (
        <div style={{ fontFamily: 'var(--t-display)', fontSize: 'clamp(17px, 2.4vw, 19px)', color: 'var(--t-ink)', lineHeight: 1.3, marginBottom: 16, textAlign: 'center' }}>
          {question.trim()}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {options.map((name, i) => {
          const id = ids[i];
          const on = myVote === id;
          return (
            <button
              key={id}
              type="button"
              onClick={editable ? undefined : () => castVote(id)}
              disabled={editable}
              aria-pressed={on}
              title={editable ? undefined : on ? 'Tap again to retract your vote' : 'Tap to vote'}
              style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                gap: 14, width: '100%',
                padding: '13px 18px', borderRadius: 'var(--t-radius, 10px)',
                border: on ? '1px solid var(--t-accent)' : '1px solid var(--t-line)',
                background: on ? 'var(--t-accent)' : 'var(--t-paper)',
                color: on ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                cursor: editable ? 'default' : 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
                transition: reduced ? 'none' : 'background 160ms ease, border-color 160ms ease, color 160ms ease',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
                {/* The name wears the display face — it's the point. */}
                <span style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 'clamp(17px, 2.6vw, 21px)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
                {on && (
                  <span style={{ fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85, flexShrink: 0 }}>
                    Your pick
                  </span>
                )}
              </span>
              {showCounts && (
                <span
                  style={{
                    fontFamily: 'var(--t-mono)', fontSize: 11, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                    padding: '2px 9px', borderRadius: 999,
                    background: 'color-mix(in oklab, currentColor 12%, transparent)',
                  }}
                >
                  {counts[i]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {reveal && !myVote && !editable && total > 0 && (
        <p style={{ marginTop: 12, textAlign: 'center', fontSize: 11.5, fontStyle: 'italic', color: 'var(--t-ink-muted)' }}>
          Cast your vote to see how the names are doing.
        </p>
      )}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function NameVoteSection({ manifest, pad, editable, onEditCopy }: BlockSectionProps) {
  const entry = nameVotePollWithId(manifest);
  const empty = entry === null;
  if (empty && !editable) return null;

  const looseM = manifest as unknown as { occasion?: string };
  const D = defaultsFor(looseM.occasion);
  const siteId = readSiteId(manifest);
  const reveal = manifest.nameVote?.reveal === true;
  const canSync = !editable && Boolean(siteId);

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'nameVoteEyebrow', D.eyebrow)}
        title={blockCopy(manifest, 'nameVoteTitle', D.title)}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('nameVoteEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('nameVoteTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add the names in the Name vote panel — guests pick their favorite here." />
      ) : (
        <>
          <Ballot
            question={entry.poll.question ?? ''}
            options={entry.poll.options ?? []}
            siteId={siteId}
            blockId={entry.blockId}
            editable={editable}
            reveal={reveal}
          />
          {!canSync && !editable && (
            <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12, fontStyle: 'italic', color: 'var(--t-ink-muted)' }}>
              Your vote is saved in your browser. Live tallies appear once the site is published.
            </p>
          )}
        </>
      )}
    </BlockFrame>
  );
}
