// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/activity-votes.ts
//
// Shared shape + id helpers for activity-vote polls. The polls
// themselves live at manifest.bachelor.votes[] (the field the
// Weekend planner / ActivityVotePanel edit); live tallies live in
// the activity_votes table keyed by (site_id = subdomain,
// block_id, option_id).
//
// CONTRACT: the published renderer (redesign/section-variants/
// blocks/activity-vote.tsx) and the host-side tally on
// /dashboard/submissions must derive IDENTICAL block ids and
// option ids or the dashboard reads zeros for real votes. That is
// why these helpers live here and both surfaces import them —
// never fork the slug logic.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export interface VotePollData {
  id?: string;
  question?: string;
  options?: string[];
}

/** The manifest's poll list — [] when the site has no vote block
 *  content. Loose-read because `bachelor` is an untyped manifest
 *  extension. */
export function readVotes(manifest: StoryManifest | null | undefined): VotePollData[] {
  const loose = manifest as unknown as { bachelor?: { votes?: VotePollData[] } } | null | undefined;
  return Array.isArray(loose?.bachelor?.votes) ? loose.bachelor.votes : [];
}

/** The block_id a poll tallies under — its own id, or a stable
 *  index fallback matching the renderer's `vote-${index}`. */
export function voteBlockId(poll: VotePollData, index: number): string {
  return (poll.id ?? '').trim() || `vote-${index}`;
}

export interface VotePollWithId {
  poll: VotePollData;
  blockId: string;
}

/** The polls the published section actually renders, each paired
 *  with its tally block id. The content filter and the
 *  index-based fallback id are computed TOGETHER here because the
 *  fallback index is the position in the FILTERED list — any
 *  surface that filtered differently before assigning ids would
 *  tally id-less polls under the wrong block_id. Both the
 *  renderer and the dashboard tally call this. */
export function votePollsWithIds(manifest: StoryManifest | null | undefined): VotePollWithId[] {
  return readVotes(manifest)
    .filter((p) => (p.question ?? '').trim() || (p.options ?? []).some((o) => o.trim()))
    .map((poll, index) => ({ poll, blockId: voteBlockId(poll, index) }));
}

/* ── Name vote (baby-shower / gender-reveal ballot) ──────────
   Same tally backend, one fixed poll: manifest.nameVote holds the
   host's name options; votes land in activity_votes under the
   constant block id below. The renderer (section-variants/blocks/
   name-vote.tsx) and the host tally on /dashboard/submissions both
   read through these helpers so the ids can never fork. */

export const NAME_VOTE_BLOCK_ID = 'name-vote';

export interface NameVoteData {
  question?: string;
  options?: string[];
  reveal?: boolean;
}

/** The manifest's name-vote config, or null when unset. */
export function readNameVote(manifest: StoryManifest | null | undefined): NameVoteData | null {
  const nv = manifest?.nameVote;
  return nv && typeof nv === 'object' ? nv : null;
}

/** The name ballot as a tally-ready poll — null when the host has
 *  authored no name options (nothing renders, nothing tallies). */
export function nameVotePollWithId(manifest: StoryManifest | null | undefined): VotePollWithId | null {
  const nv = readNameVote(manifest);
  const options = (nv?.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (options.length === 0) return null;
  return {
    poll: { id: NAME_VOTE_BLOCK_ID, question: nv?.question ?? '', options },
    blockId: NAME_VOTE_BLOCK_ID,
  };
}

/** Stable option ids from labels — the redesign data carries plain
 *  strings (no ids), so the server-side option_id is a slug of the
 *  label, index-deduped. Renaming an option therefore resets its
 *  live tally (documented in ActivityVotePanel). */
export function optionIdsFor(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels.map((label, i) => {
    let id = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
    if (!id) id = `opt-${i}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return id;
  });
}
