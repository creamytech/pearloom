// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/activity-votes.test.ts
//
// Pins the poll-id contract shared by the published renderer
// (section-variants/blocks/activity-vote.tsx) and the host tally
// on /dashboard/submissions (DashSubmissions' VotesTally). If a
// slug rule changes here, live tallies keyed under the OLD ids
// read as zeros on both surfaces — treat any failure as a data
// migration, not a copy tweak.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { StoryManifest } from '@/types';
import { NAME_VOTE_BLOCK_ID, nameVotePollWithId, optionIdsFor, readNameVote, readVotes, voteBlockId, votePollsWithIds } from './activity-votes';

describe('readVotes', () => {
  it('reads manifest.bachelor.votes and returns [] otherwise', () => {
    const polls = [{ id: 'v1', question: 'Which bar Friday?', options: ['Rooftop', 'Dive'] }];
    const manifest = { bachelor: { votes: polls } } as unknown as StoryManifest;
    expect(readVotes(manifest)).toEqual(polls);
    expect(readVotes({} as StoryManifest)).toEqual([]);
    expect(readVotes(null)).toEqual([]);
    expect(readVotes({ bachelor: { votes: 'nope' } } as unknown as StoryManifest)).toEqual([]);
  });
});

describe('voteBlockId', () => {
  it('prefers the poll id, falls back to the renderer’s vote-${index}', () => {
    expect(voteBlockId({ id: 'poll-abc' }, 3)).toBe('poll-abc');
    expect(voteBlockId({ id: '  ' }, 3)).toBe('vote-3');
    expect(voteBlockId({}, 0)).toBe('vote-0');
  });
});

describe('votePollsWithIds', () => {
  it('assigns fallback ids over the RENDERED (filtered) list — question-only polls keep their slot', () => {
    const manifest = {
      bachelor: {
        votes: [
          { options: [] },                                  // empty — filtered out
          { question: 'Where first?' },                     // question-only — rendered, holds vote-0
          { question: 'Which bar?', options: ['A', 'B'] },  // rendered as vote-1
          { id: 'named', options: ['X'] },                  // keeps its own id
        ],
      },
    } as unknown as StoryManifest;
    expect(votePollsWithIds(manifest).map((e) => e.blockId)).toEqual(['vote-0', 'vote-1', 'named']);
  });
});

describe('nameVotePollWithId', () => {
  it('exposes the name ballot under the constant block id with trimmed options', () => {
    const manifest = {
      nameVote: { question: 'Help us pick', options: [' Juniper ', '', 'Wren'] },
    } as unknown as StoryManifest;
    expect(nameVotePollWithId(manifest)).toEqual({
      poll: { id: NAME_VOTE_BLOCK_ID, question: 'Help us pick', options: ['Juniper', 'Wren'] },
      blockId: NAME_VOTE_BLOCK_ID,
    });
  });

  it('returns null when the host authored no name options (nothing renders, nothing tallies)', () => {
    expect(nameVotePollWithId({} as StoryManifest)).toBeNull();
    expect(nameVotePollWithId({ nameVote: { question: 'Names?' } } as unknown as StoryManifest)).toBeNull();
    expect(nameVotePollWithId({ nameVote: { options: ['  '] } } as unknown as StoryManifest)).toBeNull();
    expect(nameVotePollWithId(null)).toBeNull();
  });

  it('the block id is pinned — changing it orphans live tallies', () => {
    expect(NAME_VOTE_BLOCK_ID).toBe('name-vote');
  });
});

describe('readNameVote', () => {
  it('reads manifest.nameVote, null otherwise', () => {
    expect(readNameVote({ nameVote: { reveal: true } } as unknown as StoryManifest)).toEqual({ reveal: true });
    expect(readNameVote({} as StoryManifest)).toBeNull();
    expect(readNameVote(null)).toBeNull();
  });
});

describe('optionIdsFor', () => {
  it('slugs labels the way the published section stores option_id', () => {
    expect(optionIdsFor(['Rooftop Bar!', 'The Dive'])).toEqual(['rooftop-bar', 'the-dive']);
  });

  it('index-dedupes collisions and backfills empty slugs', () => {
    expect(optionIdsFor(['Yes', 'yes', '™'])).toEqual(['yes', 'yes-1', 'opt-2']);
  });

  it('caps slugs at 48 chars', () => {
    const long = 'a'.repeat(80);
    expect(optionIdsFor([long])[0]).toHaveLength(48);
  });
});
