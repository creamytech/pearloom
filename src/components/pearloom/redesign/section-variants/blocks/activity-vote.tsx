'use client';
 
/* Activity vote section — let the group pick.

   Data: manifest.bachelor.votes[]  — the SAME field the Weekend
   planner tool (BachelorPanel) edits. ActivityVotePanel is a thin
   editor over it.
     { id, question, options: string[] }

   Rendered READ-ONLY here — guest voting (POST /api/event-os/votes,
   tally display, voter dedup) is design-agent work. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface VotePollData { id?: string; question?: string; options?: string[] }

export function readVotes(manifest: BlockSectionProps['manifest']): VotePollData[] {
  const loose = manifest as unknown as { bachelor?: { votes?: VotePollData[] } };
  return Array.isArray(loose.bachelor?.votes) ? loose.bachelor.votes : [];
}

export function ActivityVoteSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* pills | bars — design agents dispatch here. */
  const polls = readVotes(manifest).filter(
    (p) => (p.question ?? '').trim() || (p.options ?? []).some((o) => o.trim()),
  );
  const empty = polls.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'activityVoteEyebrow', 'You decide')}
        title={blockCopy(manifest, 'activityVoteTitle', 'Cast your vote')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('activityVoteEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('activityVoteTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add a poll in the Group vote panel (or the Weekend planner)." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 620, margin: '0 auto' }}>
          {polls.map((poll, pi) => (
            <div
              key={poll.id ?? pi}
              style={{
                background: 'var(--t-card)',
                border: '1px solid var(--t-line)',
                borderRadius: 'var(--t-radius-lg, 14px)',
                padding: '18px 20px',
              }}
            >
              <div style={{ fontFamily: 'var(--t-display)', fontSize: 18, color: 'var(--t-ink)', marginBottom: 12 }}>
                {poll.question?.trim() || 'Untitled poll'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(poll.options ?? []).filter((o) => o.trim()).map((opt, oi) => (
                  <span
                    key={oi}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid var(--t-line)',
                      background: 'var(--t-paper)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--t-ink)',
                    }}
                  >
                    <span aria-hidden style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--t-accent)', flexShrink: 0 }} />
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockFrame>
  );
}
