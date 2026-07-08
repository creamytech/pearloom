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
import { familiarFacesForPerson, resolvePersonId, type FamiliarFace } from '@/lib/people';
import { isManifestPublished } from '@/lib/next-step';
import type { StoryManifest } from '@/types';

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
  /** The friend's opaque person id — the handle for the person card
   *  (which re-verifies mutual consent server-side). Only surfaced
   *  to an ACCEPTED mutual connection. */
  personId: string;
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
    return otherIds.map((id) => ({ firstName: nameById.get(id) ?? 'A guest', personId: id }));
  } catch (err) {
    console.warn('[friends] listFriends failed:', err);
    return [];
  }
}

/** Requests the caller SENT that are still waiting — so the circle
 *  can show "waiting on Maya" (and an email invite doesn't vanish
 *  into silence after sending). Same first-names-only contract. */
export async function pendingOutgoing(sb: SupabaseClient, personId: string): Promise<IncomingRequest[]> {
  if (!personId) return [];
  try {
    const { data: rows } = await sb
      .from('friendships')
      .select('addressee_person_id')
      .eq('requester_person_id', personId)
      .eq('status', 'pending');
    const ids = Array.from(
      new Set((rows ?? []).map((r) => String((r as { addressee_person_id: string }).addressee_person_id))),
    ).filter((id) => id !== personId);
    if (ids.length === 0) return [];

    const { data: ppl } = await sb.from('people').select('id, display_name').in('id', ids);
    const nameById = new Map((ppl ?? []).map((p) => [String(p.id), firstNameOf(p.display_name)]));
    return ids.map((id) => ({ firstName: nameById.get(id) ?? 'Your invitation', otherId: id }));
  } catch (err) {
    console.warn('[friends] pendingOutgoing failed:', err);
    return [];
  }
}

// ── S1 — invite to your circle, pre-event ─────────────────────

/** Strict email shape for a circle invite. Returns the normalized
 *  (lowercased, trimmed) address or null. Pure — unit-tested. */
export function normalizeInviteEmail(raw: unknown): string | null {
  const e = String(raw ?? '').trim().toLowerCase();
  if (e.length < 5 || e.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/**
 * Invite someone to your circle BY EMAIL — no shared event required
 * (SOCIAL-PLAN S1: the circle becomes people-first). Upserts the
 * person row for the address (the email-keyed people table IS the
 * claim mechanism: when they first sign in with that address,
 * resolvePersonId finds the same row and the pending request greets
 * them) and files a normal pending friendship — consent still runs
 * through their accept, exactly like an in-event request.
 *
 * Design law 1 stays intact: this is "someone you invite by hand,"
 * not discovery. The caller types an address they already know.
 */
export async function inviteToCircle(
  sb: SupabaseClient,
  opts: { fromPersonId: string; email: string; name?: string },
): Promise<FriendResult> {
  const email = normalizeInviteEmail(opts.email);
  if (!email) return { ok: false, error: 'email' };
  if (!opts.fromPersonId?.trim()) return { ok: false, error: 'missing' };
  try {
    const toPersonId = await resolvePersonId(sb, {
      email,
      name: opts.name?.trim() || undefined,
    });
    if (!toPersonId) return { ok: false, error: 'resolve' };
    if (toPersonId === opts.fromPersonId) return { ok: false, error: 'self' };
    return await requestFriend(sb, { fromPersonId: opts.fromPersonId, toPersonId });
  } catch (err) {
    console.warn('[friends] inviteToCircle failed:', err);
    return { ok: false, error: 'internal' };
  }
}

// ── S1 — the person card (mutual-connections-only profile) ────

export interface SharedCelebration {
  label: string;
  occasion: string | null;
}

export interface PersonCard {
  firstName: string;
  sharedCelebrations: SharedCelebration[];
  /** A practical known fact (dietary), shown ONLY to a mutual
   *  connection — the widening S1 deliberately grants. */
  dietary: string | null;
}

/** Intersect two site-id lists (order-preserving on `mine`, deduped,
 *  capped). Pure — unit-tested. */
export function sharedSiteIds(mine: string[], theirs: string[], cap = 12): string[] {
  const theirSet = new Set(theirs);
  const out: string[] = [];
  for (const id of mine) {
    if (theirSet.has(id) && !out.includes(id)) {
      out.push(id);
      if (out.length >= cap) break;
    }
  }
  return out;
}

/**
 * The person card — a minimal, PRIVATE profile of `otherId` for
 * `viewerId`: first name, the published celebrations they share, and
 * known dietary. Returns null unless the pair holds an ACCEPTED
 * friendship (re-verified here, not trusted from the client). Never
 * a public/crawlable profile — the API layer session-gates it too.
 */
export async function personCard(
  sb: SupabaseClient,
  opts: { viewerId: string; otherId: string },
): Promise<PersonCard | null> {
  const { viewerId, otherId } = opts;
  if (!UUID_RX.test(viewerId) || !UUID_RX.test(otherId) || viewerId === otherId) return null;
  try {
    // Mutual consent gate — an accepted row in either direction.
    const [fwd, rev] = await Promise.all([
      sb.from('friendships').select('id').eq('requester_person_id', viewerId).eq('addressee_person_id', otherId).eq('status', 'accepted').maybeSingle(),
      sb.from('friendships').select('id').eq('requester_person_id', otherId).eq('addressee_person_id', viewerId).eq('status', 'accepted').maybeSingle(),
    ]);
    if (!fwd.data && !rev.data) return null;

    const [{ data: person }, mineRes, theirsRes] = await Promise.all([
      sb.from('people').select('display_name, dietary').eq('id', otherId).maybeSingle(),
      sb.from('guests').select('site_id').eq('person_id', viewerId).limit(60),
      sb.from('guests').select('site_id').eq('person_id', otherId).limit(60),
    ]);
    const shared = sharedSiteIds(
      (mineRes.data ?? []).map((r) => String((r as { site_id: string }).site_id)),
      (theirsRes.data ?? []).map((r) => String((r as { site_id: string }).site_id)),
    );

    let sharedCelebrations: SharedCelebration[] = [];
    if (shared.length > 0) {
      const { data: sites } = await sb
        .from('sites')
        .select('id, subdomain, site_config')
        .in('id', shared);
      sharedCelebrations = ((sites ?? []) as Array<{
        id: string;
        subdomain: string;
        site_config: { names?: [string, string]; occasion?: string; manifest?: StoryManifest } | null;
      }>).flatMap((s) => {
        const m = s.site_config?.manifest;
        // Drafts stay private to their hosts — same rule as the
        // guest passport's "Your celebrations" card.
        if (!m || !isManifestPublished(m)) return [];
        const names = (s.site_config?.names ?? []).filter(Boolean) as string[];
        return [{
          label: names.join(' & ') || s.subdomain,
          occasion: s.site_config?.occasion ?? (m as { occasion?: string }).occasion ?? null,
        }];
      });
    }

    return {
      firstName: firstNameOf((person as { display_name?: string } | null)?.display_name),
      sharedCelebrations,
      dietary: ((person as { dietary?: string | null } | null)?.dietary ?? null) || null,
    };
  } catch (err) {
    console.warn('[friends] personCard failed:', err);
    return null;
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
