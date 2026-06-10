'use client';

/* eslint-disable no-restricted-syntax */
/* ActivityVotePanel — Content tab for the Group vote section.
   THIN editor over manifest.bachelor.votes[] — the SAME field the
   Weekend planner tool (BachelorPanel) owns. Guest voting + live
   tallies render in the canvas section (activity-vote.tsx).

   TALLY CAVEAT: the redesign data carries plain option strings, so
   the server-side option_id is a slug of the LABEL. Renaming an
   option after guests vote resets its live tally (reordering is
   safe — ids travel with the label). Surfaced as a hint below. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../../motifs';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { isBachelorOccasion, mkId, readOccasion, RemoveButton, RowCard, ToolPointerCard, type BlockPanelProps } from './_shared';

interface VotePoll { id: string; question: string; options: string[] }

/** Tiny ▲/▼ pair for list-row reorder (mirrors the inline-button
 *  language of RemoveButton). */
function ReorderButtons({ index, count, onMove }: { index: number; count: number; onMove: (from: number, to: number) => void }) {
  const btn = (dir: -1 | 1, disabled: boolean) => (
    <button
      type="button"
      aria-label={dir === -1 ? 'Move up' : 'Move down'}
      disabled={disabled}
      onClick={() => onMove(index, index + dir)}
      style={{
        width: 20, height: 14, display: 'grid', placeItems: 'center',
        background: 'transparent', border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        color: 'var(--ink-muted)', opacity: disabled ? 0.3 : 1, padding: 0,
      }}
    >
      <Icon name={dir === -1 ? 'chev-up' : 'chev-down'} size={11} />
    </button>
  );
  return (
    <span style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {btn(-1, index === 0)}
      {btn(1, index === count - 1)}
    </span>
  );
}

export function ActivityVotePanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'activityVote');
  const loose = manifest as unknown as { bachelor?: { votes?: VotePoll[] } & Record<string, unknown> };
  const votes = Array.isArray(loose.bachelor?.votes) ? loose.bachelor.votes : [];

  const write = (next: VotePoll[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), votes: next },
  } as unknown as StoryManifest);

  const patchPoll = (i: number, p: Partial<VotePoll>) =>
    write(votes.map((poll, idx) => (idx === i ? { ...poll, ...p } : poll)));

  const moveOption = (i: number, from: number, to: number) => {
    const poll = votes[i];
    if (!poll || to < 0 || to >= poll.options.length) return;
    const options = [...poll.options];
    const [moved] = options.splice(from, 1);
    options.splice(to, 0, moved);
    patchPoll(i, { options });
  };

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label={`Polls · ${votes.length}`}
          hint="Multi-choice questions for the group. Live tallies key off the option text — renaming an option after guests vote resets its count (reordering is safe)."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {votes.map((poll, i) => (
              <RowCard key={poll.id}>
                <FInput
                  value={poll.question}
                  onChange={(v) => patchPoll(i, { question: v })}
                  icon="sparkles"
                  placeholder="Which bar Friday night?"
                />
                {poll.options.map((opt, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <ReorderButtons index={j} count={poll.options.length} onMove={(from, to) => moveOption(i, from, to)} />
                    <FInput
                      value={opt}
                      onChange={(v) => patchPoll(i, { options: poll.options.map((o, k) => (k === j ? v : o)) })}
                      placeholder="Option text"
                    />
                    <RemoveButton label="Remove option" onClick={() => patchPoll(i, { options: poll.options.filter((_, k) => k !== j) })} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => patchPoll(i, { options: [...poll.options, ''] })}
                  style={{
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--cream-2)', border: '1px solid var(--line-soft)',
                    fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)',
                    cursor: 'pointer', alignSelf: 'flex-start',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Icon name="plus" size={11} color="var(--ink-soft)" />
                  Add option
                </button>
                <button
                  type="button"
                  onClick={() => write(votes.filter((_, idx) => idx !== i))}
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', alignSelf: 'flex-end',
                  }}
                >
                  Remove poll
                </button>
              </RowCard>
            ))}
            <AddCard label="Add a poll" onClick={() => write([...votes, { id: mkId('v'), question: '', options: ['', ''] }])} />
          </div>
        </FGroup>

        {isBachelorOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="bachelor"
            label="Also in the Weekend planner"
            body="Costs, packing, and rooms live there — same polls, one store."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Group vote" />
      </div>
    </SectionPanelShell>
  );
}

export default ActivityVotePanel;
