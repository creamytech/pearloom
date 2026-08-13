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

   Variants (layouts.ts):
     ballot — names stacked in tappable rows, tally on the right.
     tiles  — the same names as a card grid; each name a plate you
              tap to vote, the tally a gold pearl in the corner. A
              different rhythm for shorter lists (a slate of options
              to weigh side by side rather than a ranked list). */

import type { CSSProperties } from 'react';
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

/* Shared vote state for both variants — one hook so ballot + tiles
   read the exact same tally/reveal logic (only one variant mounts
   at a time, so the hook runs once). */
interface NameBallotState {
  ids: string[];
  myVote: string | null;
  counts: number[];
  showCounts: boolean;
  castVote: (id: string) => void;
}
function useNameBallot(
  options: string[], siteId: string, blockId: string, editable: boolean, reveal: boolean,
): NameBallotState {
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
  return { ids, myVote: myVote ?? null, counts, showCounts, castVote };
}

/** Tally pill — gold pearl + tabular count, shared by both variants. */
function TallyPill({ count, style }: { count: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: 'var(--t-mono)', fontSize: 11, fontWeight: 700,
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        padding: '2px 9px', borderRadius: 999,
        background: 'color-mix(in oklab, currentColor 12%, transparent)',
        ...style,
      }}
    >
      {count}
    </span>
  );
}

/** RevealNote — the "cast to see" hint, shared by both variants. */
function RevealNote({ reveal, myVote, editable, total }: { reveal: boolean; myVote: string | null; editable: boolean; total: number }) {
  if (!(reveal && !myVote && !editable && total > 0)) return null;
  return (
    <p style={{ marginTop: 12, textAlign: 'center', fontSize: 11.5, fontStyle: 'italic', color: 'var(--t-ink-muted)' }}>
      Cast your vote to see how the names are doing.
    </p>
  );
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
  const { ids, myVote, counts, showCounts, castVote } = useNameBallot(options, siteId, blockId, editable, reveal);
  const total = counts.reduce((a, b) => a + b, 0);

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
              {showCounts && <TallyPill count={counts[i]} />}
            </button>
          );
        })}
      </div>
      <RevealNote reveal={reveal} myVote={myVote} editable={editable} total={total} />
    </div>
  );
}

/* ─── Tiles — the same names as a tappable card grid. ─────────── */

function Tiles({
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
  const { ids, myVote, counts, showCounts, castVote } = useNameBallot(options, siteId, blockId, editable, reveal);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {question.trim() && (
        <div style={{ fontFamily: 'var(--t-display)', fontSize: 'clamp(17px, 2.4vw, 19px)', color: 'var(--t-ink)', lineHeight: 1.3, marginBottom: 20, textAlign: 'center' }}>
          {question.trim()}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: 12,
        }}
      >
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
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, minHeight: 104,
                padding: '22px 16px', borderRadius: 'var(--t-radius-lg, 14px)',
                border: on ? '1px solid var(--t-accent)' : '1px solid var(--t-line)',
                background: on ? 'var(--t-accent)' : 'var(--t-card)',
                color: on ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                cursor: editable ? 'default' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: 'var(--t-shadow-sm, none)',
                transition: reduced ? 'none' : 'background 160ms ease, border-color 160ms ease, color 160ms ease',
              }}
            >
              {showCounts && (
                <TallyPill count={counts[i]} style={{ position: 'absolute', top: 10, right: 10, background: 'color-mix(in oklab, currentColor 14%, transparent)' }} />
              )}
              {/* The name wears the display face — it's the point. */}
              <span style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 'clamp(20px, 3.4vw, 26px)', lineHeight: 1.15, textAlign: 'center', overflowWrap: 'break-word', maxWidth: '100%' }}>
                {name}
              </span>
              {on && (
                <span style={{ fontFamily: 'var(--t-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85 }}>
                  Your pick
                </span>
              )}
            </button>
          );
        })}
      </div>
      <RevealNote reveal={reveal} myVote={myVote} editable={editable} total={total} />
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function NameVoteSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const entry = nameVotePollWithId(manifest);
  const empty = entry === null;
  if (empty && !editable) return null;

  const looseM = manifest as unknown as { occasion?: string };
  const D = defaultsFor(looseM.occasion);
  const siteId = readSiteId(manifest);
  const reveal = manifest.nameVote?.reveal === true;
  const canSync = !editable && Boolean(siteId);
  const Layout = variant === 'tiles' ? Tiles : Ballot;

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
        <BlockEmpty hint="Add the names in the Name vote panel, guests pick their favorite here." />
      ) : (
        <>
          <Layout
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
