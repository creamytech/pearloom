// ─────────────────────────────────────────────────────────────
// Pearloom / lib/friends.ts — the light friend layer (GRAND-PLAN
// Phase 4, the Social layer) over the event graph's people table.
//
// A friendship is one directed request row per (requester,
// addressee) pair (public.friendships, migration 20260706). Consent
// is the request → accept handshake; a mutual pending (each person
// requested the other) collapses to 'accepted'.
//
// PRIVACY CONTRACT (mirrors familiarFacesForPerson / connections —
// do not loosen without a product decision):
//   • First names ONLY leave this module — never an email, never a
//     last name. Names come from public.people.display_name, first
//     token only.
//   • Consent is mutual: a person only becomes visible to another
//     once BOTH sides pass through request → accept. The API layer
//     additionally gates who a request may even be SENT to (a
//     mutual-opt-in "familiar face", see /api/guest/friends).
//   • Failure-tolerant like people.ts: the friend layer is a nicety
//     layered on the passport; it must never throw into a render.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import { familiarFacesForPerson, type FamiliarFace } from '@/lib/people';

export type FriendStatus = 'pending' | 'accepted' | 'declined';

export interface FriendshipRow {
  id: string;
  requester_person_id: string;
  addressee_person_id: string;
  status: FriendStatus;
  created_at: string;
  responded_at: string | null;
}

/** A friend, reduced to what may cross the wire. */
export interface FriendFace {
  firstName: string;
}

/** A pending request addressed TO the caller — they can accept/decline. */
export interface IncomingRequest {
  firstName: string;
  /** The requester's person id — the handle the caller responds to. */
  otherId: string;
}

/** Someone the caller may send a request to (a mutual-opt-in familiar
 *  face they aren't already tied to). */
export interface FriendCandidate {
  firstName: string;
  personId: string;
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstNameOf(displayName: unknown): string {
  return String(displayName ?? '').trim().split(/\s+/)[0] || 'A guest';
}

// ── Pure request state machine (unit-tested) ──────────────────

export type RequestDecision =
  /** Invalid input — nothing to write. */
  | { kind: 'invalid'; reason: 'self' | 'missing' }
  /** The other person already asked us — accept their pending row. */
  | { kind: 'accept-reverse'; rowId: string }
  /** Already pending or accepted our way — nothing changes. */
  | { kind: 'noop'; status: FriendStatus }
  /** We asked before and were declined — re-open our own row as pending. */
  | { kind: 'reopen'; rowId: string }
  /** No relationship yet — insert a fresh pending request. */
  | { kind: 'insert' };

/**
 * Decide what requestFriend should do, given the two possible existing
 * rows for a (from → to) request. Pure so the handshake logic — the
 * subtle part — is testable without a database.
 *
 *   reverse = the (to → from) row if any (they asked us)
 *   forward = the (from → to) row if any (we asked them before)
 */
export function decideRequest(input: {
  fromPersonId: string;
  toPersonId: string;
  reverse: { id: string; status: FriendStatus } | null;
  forward: { id: string; status: FriendStatus } | null;
}): RequestDecision {
  const { fromPersonId: from, toPersonId: to, reverse, forward } = input;
  if (!from || !to) return { kind: 'invalid', reason: 'missing' };
  if (from === to) return { kind: 'invalid', reason: 'self' };

  // They already asked us. A pending reverse → mutual desire → accept.
  if (reverse) {
    if (reverse.status === 'accepted') return { kind: 'noop', status: 'accepted' };
    if (reverse.status === 'pending') return { kind: 'accept-reverse', rowId: reverse.id };
    // reverse === 'declined' (we once declined them) — a fresh forward
    // request is legitimate; fall through to the forward handling.
  }

  if (forward) {
    if (forward.status === 'declined') return { kind: 'reopen', rowId: forward.id };
    // pending or accepted our way — idempotent no-op.
    return { kind: 'noop', status: forward.status };
  }

  return { kind: 'insert' };
}

// ── DB-bound helpers ──────────────────────────────────────────

export interface FriendResult {
  ok: boolean;
  status?: FriendStatus;
  error?: string;
}

/**
 * Request (or advance) a friendship from `fromPersonId` to
 * `toPersonId`. Idempotent; refuses self-friendship; if the other
 * person already has a pending request to us, accepts it (mutual
 * consent → 'accepted'). All consent still runs through the
 * request → accept handshake.
 */
export async function requestFriend(
  sb: SupabaseClient,
  opts: { fromPersonId: string; toPersonId: string },
): Promise<FriendResult> {
  const from = opts.fromPersonId?.trim();
  const to = opts.toPersonId?.trim();
  if (!from || !to) return { ok: false, error: 'missing' };
  if (from === to) return { ok: false, error: 'self' };
  try {
    const [reverseRes, forwardRes] = await Promise.all([
      sb
        .from('friendships')
        .select('id, status')
        .eq('requester_person_id', to)
        .eq('addressee_person_id', from)
        .maybeSingle(),
      sb
        .from('friendships')
        .select('id, status')
        .eq('requester_person_id', from)
        .eq('addressee_person_id', to)
        .maybeSingle(),
    ]);
    const reverse = (reverseRes.data as { id: string; status: FriendStatus } | null) ?? null;
    const forward = (forwardRes.data as { id: string; status: FriendStatus } | null) ?? null;

    const decision = decideRequest({ fromPersonId: from, toPersonId: to, reverse, forward });
    switch (decision.kind) {
      case 'invalid':
        return { ok: false, error: decision.reason };
      case 'noop':
        return { ok: true, status: decision.status };
      case 'accept-reverse': {
        const { error } = await sb
          .from('friendships')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', decision.rowId);
        return error ? { ok: false, error: 'update' } : { ok: true, status: 'accepted' };
      }
      case 'reopen': {
        const { error } = await sb
          .from('friendships')
          .update({ status: 'pending', responded_at: null })
          .eq('id', decision.rowId);
        return error ? { ok: false, error: 'update' } : { ok: true, status: 'pending' };
      }
      case 'insert': {
        const { error } = await sb.from('friendships').insert({
          requester_person_id: from,
          addressee_person_id: to,
          status: 'pending',
        });
        if (error) {
          // Unique-index race (two taps landing together) — read it back.
          const { data: raced } = await sb
            .from('friendships')
            .select('status')
            .eq('requester_person_id', from)
            .eq('addressee_person_id', to)
            .maybeSingle();
          if (raced) return { ok: true, status: raced.status as FriendStatus };
          return { ok: false, error: 'insert' };
        }
        return { ok: true, status: 'pending' };
      }
    }
  } catch (err) {
    console.warn('[friends] requestFriend failed:', err);
    return { ok: false, error: 'internal' };
  }
}

/**
 * Respond to a pending request that was addressed to `personId` by
 * `otherPersonId`. Accepting is the consent that makes the pair
 * mutually visible; declining files the row away. Idempotent — a
 * row that's already resolved just returns its status.
 */
export async function respondFriend(
  sb: SupabaseClient,
  opts: { personId: string; otherPersonId: string; accept: boolean },
): Promise<FriendResult> {
  const personId = opts.personId?.trim();
  const otherPersonId = opts.otherPersonId?.trim();
  if (!personId || !otherPersonId) return { ok: false, error: 'missing' };
  if (personId === otherPersonId) return { ok: false, error: 'self' };
  try {
    // The request must be addressed TO me (I'm the addressee).
    const { data: row } = await sb
      .from('friendships')
      .select('id, status')
      .eq('requester_person_id', otherPersonId)
      .eq('addressee_person_id', personId)
      .maybeSingle();
    if (!row) return { ok: false, error: 'not_found' };
    const current = row.status as FriendStatus;
    if (current !== 'pending') return { ok: true, status: current }; // idempotent

    const status: FriendStatus = opts.accept ? 'accepted' : 'declined';
    const { error } = await sb
      .from('friendships')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) return { ok: false, error: 'update' };
    return { ok: true, status };
  } catch (err) {
    console.warn('[friends] respondFriend failed:', err);
    return { ok: false, error: 'internal' };
  }
}

/** Every person the caller has any friendship row with, either
 *  direction, any status — the exclusion set for candidate discovery. */
async function relatedPersonIds(sb: SupabaseClient, personId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const [asReq, asAdd] = await Promise.all([
      sb.from('friendships').select('addressee_person_id').eq('requester_person_id', personId),
      sb.from('friendships').select('requester_person_id').eq('addressee_person_id', personId),
    ]);
    for (const r of asReq.data ?? []) ids.add(String((r as { addressee_person_id: string }).addressee_person_id));
    for (const r of asAdd.data ?? []) ids.add(String((r as { requester_person_id: string }).requester_person_id));
  } catch (err) {
    console.warn('[friends] relatedPersonIds failed:', err);
  }
  return ids;
}

/** Accepted friends of `personId`, as first names only. */
export async function listFriends(sb: SupabaseClient, personId: string): Promise<FriendFace[]> {
  if (!personId) return [];
  try {
    const [asReq, asAdd] = await Promise.all([
      sb
        .from('friendships')
        .select('addressee_person_id')
        .eq('status', 'accepted')
        .eq('requester_person_id', personId),
      sb
        .from('friendships')
        .select('requester_person_id')
        .eq('status', 'accepted')
        .eq('addressee_person_id', personId),
    ]);
    const otherIds = Array.from(
      new Set([
        ...(asReq.data ?? []).map((r) => String((r as { addressee_person_id: string }).addressee_person_id)),
        ...(asAdd.data ?? []).map((r) => String((r as { requester_person_id: string }).requester_person_id)),
      ]),
    ).filter((id) => id !== personId);
    if (otherIds.length === 0) return [];

    const { data: ppl } = await sb.from('people').select('id, display_name').in('id', otherIds);
    const nameById = new Map((ppl ?? []).map((p) => [String(p.id), firstNameOf(p.display_name)]));
    return otherIds.map((id) => ({ firstName: nameById.get(id) ?? 'A guest' }));
  } catch (err) {
    console.warn('[friends] listFriends failed:', err);
    return [];
  }
}

/** Pending requests addressed TO `personId` — first name + the
 *  requester's id so the caller can accept/decline. */
export async function pendingIncoming(sb: SupabaseClient, personId: string): Promise<IncomingRequest[]> {
  if (!personId) return [];
  try {
    const { data: rows } = await sb
      .from('friendships')
      .select('requester_person_id')
      .eq('addressee_person_id', personId)
      .eq('status', 'pending');
    const ids = Array.from(
      new Set((rows ?? []).map((r) => String((r as { requester_person_id: string }).requester_person_id))),
    ).filter((id) => id !== personId);
    if (ids.length === 0) return [];

    const { data: ppl } = await sb.from('people').select('id, display_name').in('id', ids);
    const nameById = new Map((ppl ?? []).map((p) => [String(p.id), firstNameOf(p.display_name)]));
    return ids.map((id) => ({ firstName: nameById.get(id) ?? 'A guest', otherId: id }));
  } catch (err) {
    console.warn('[friends] pendingIncoming failed:', err);
    return [];
  }
}

/**
 * People the caller may send a request to on THIS event: mutual-opt-in
 * "familiar faces" (both connections_opt_in true + a shared celebration,
 * per familiarFacesForPerson) minus anyone already tied to them. The
 * CALLER must have verified the requester's own opt-in before calling —
 * discovery is mutual, exactly like the connections card.
 */
export async function friendCandidates(
  sb: SupabaseClient,
  opts: { personId: string; siteId: string },
): Promise<FriendCandidate[]> {
  if (!UUID_RX.test(opts.personId)) return [];
  try {
    const faces = await familiarFacesForPerson(sb, { personId: opts.personId, siteId: opts.siteId });
    if (faces.length === 0) return [];
    const related = await relatedPersonIds(sb, opts.personId);
    return faces
      .filter((f: FamiliarFace) => f.personId !== opts.personId && !related.has(f.personId))
      .map((f) => ({ firstName: f.firstName, personId: f.personId }));
  } catch (err) {
    console.warn('[friends] friendCandidates failed:', err);
    return [];
  }
}

/** True when `otherPersonId` is a legitimate friend-request target for
 *  `personId` on `siteId` (a current mutual-opt-in familiar face). The
 *  request gate — you can only ask someone you've genuinely celebrated
 *  with who also opted in. */
export async function isRequestable(
  sb: SupabaseClient,
  opts: { personId: string; siteId: string; otherPersonId: string },
): Promise<boolean> {
  if (!UUID_RX.test(opts.otherPersonId)) return false;
  try {
    const faces = await familiarFacesForPerson(sb, { personId: opts.personId, siteId: opts.siteId });
    return faces.some((f) => f.personId === opts.otherPersonId);
  } catch (err) {
    console.warn('[friends] isRequestable failed:', err);
    return false;
  }
}
