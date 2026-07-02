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
