// ─────────────────────────────────────────────────────────────
// Pearloom / lib/threads.ts — person-pair threads (SOCIAL-PLAN S2:
// conversation beyond the event).
//
// A THREAD is a bounded 1:1 conversation between two MUTUAL
// CONNECTIONS — the second (and last) social object next to the
// Circle (design law 3: no feed, ever). Backed by person_threads +
// person_messages (migration 20260708_person_threads).
//
// PRIVACY CONTRACT (the friendships contract, do not loosen):
//   • A thread may only exist between an ACCEPTED pair — verified
//     here before every read AND write, never trusted from a
//     client.
//   • First names only leave this module; bodies are the pair's
//     own words to each other.
//   • Failure-tolerant like people.ts/friends.ts — the thread
//     layer never throws into a render.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstNameOf(displayName: unknown): string {
  return String(displayName ?? '').trim().split(/\s+/)[0] || 'A guest';
}

/** Canonical (lo, hi) ordering for a pair — one thread per pair,
 *  never two. Pure — unit-tested. Returns null on bad input. */
export function orderPair(a: string, b: string): [string, string] | null {
  if (!UUID_RX.test(a) || !UUID_RX.test(b) || a === b) return null;
  return a.toLowerCase() < b.toLowerCase()
    ? [a.toLowerCase(), b.toLowerCase()]
    : [b.toLowerCase(), a.toLowerCase()];
}

/** True when the pair holds an ACCEPTED friendship (either
 *  direction) — the gate in front of every thread operation. */
export async function isAcceptedPair(sb: SupabaseClient, a: string, b: string): Promise<boolean> {
  const pair = orderPair(a, b);
  if (!pair) return false;
  try {
    const [fwd, rev] = await Promise.all([
      sb.from('friendships').select('id').eq('requester_person_id', a).eq('addressee_person_id', b).eq('status', 'accepted').maybeSingle(),
      sb.from('friendships').select('id').eq('requester_person_id', b).eq('addressee_person_id', a).eq('status', 'accepted').maybeSingle(),
    ]);
    return Boolean(fwd.data || rev.data);
  } catch (err) {
    console.warn('[threads] isAcceptedPair failed:', err);
    return false;
  }
}

async function getOrCreateThread(sb: SupabaseClient, a: string, b: string): Promise<string | null> {
  const pair = orderPair(a, b);
  if (!pair) return null;
  const [lo, hi] = pair;
  try {
    const { data: existing } = await sb
      .from('person_threads')
      .select('id')
      .eq('person_lo', lo)
      .eq('person_hi', hi)
      .maybeSingle();
    if (existing) return String(existing.id);
    const { data, error } = await sb
      .from('person_threads')
      .insert({ person_lo: lo, person_hi: hi, kind: 'pair' })
      .select('id')
      .single();
    if (error) {
      // Unique race — read the winner back.
      const { data: raced } = await sb
        .from('person_threads')
        .select('id')
        .eq('person_lo', lo)
        .eq('person_hi', hi)
        .maybeSingle();
      return raced ? String(raced.id) : null;
    }
    return data ? String(data.id) : null;
  } catch (err) {
    console.warn('[threads] getOrCreateThread failed:', err);
    return null;
  }
}

export interface ThreadMessage {
  id: string;
  /** True when the CALLER wrote it. */
  mine: boolean;
  body: string;
  createdAt: string;
}

/** The pair's conversation, oldest → newest. Empty (not an error)
 *  when the pair isn't accepted or no thread exists yet. */
export async function listMessages(
  sb: SupabaseClient,
  opts: { personId: string; otherId: string; limit?: number },
): Promise<ThreadMessage[]> {
  const { personId, otherId } = opts;
  if (!(await isAcceptedPair(sb, personId, otherId))) return [];
  const pair = orderPair(personId, otherId);
  if (!pair) return [];
  try {
    const { data: thread } = await sb
      .from('person_threads')
      .select('id')
      .eq('person_lo', pair[0])
      .eq('person_hi', pair[1])
      .maybeSingle();
    if (!thread) return [];
    const { data: rows } = await sb
      .from('person_messages')
      .select('id, sender_person_id, body, created_at')
      .eq('thread_id', String(thread.id))
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(Math.min(opts.limit ?? 60, 120));
    return ((rows ?? []) as Array<{ id: string; sender_person_id: string; body: string; created_at: string }>)
      .reverse()
      .map((m) => ({
        id: String(m.id),
        mine: String(m.sender_person_id).toLowerCase() === personId.toLowerCase(),
        body: String(m.body),
        createdAt: String(m.created_at),
      }));
  } catch (err) {
    console.warn('[threads] listMessages failed:', err);
    return [];
  }
}

/** Send a note to a mutual connection. Creates the pair's thread on
 *  first message. Refused (ok:false) outside an accepted pair. */
export async function sendMessage(
  sb: SupabaseClient,
  opts: { personId: string; otherId: string; body: string },
): Promise<{ ok: boolean; error?: string }> {
  const body = opts.body?.trim().slice(0, 4000);
  if (!body) return { ok: false, error: 'empty' };
  if (!(await isAcceptedPair(sb, opts.personId, opts.otherId))) {
    return { ok: false, error: 'not_connected' };
  }
  const threadId = await getOrCreateThread(sb, opts.personId, opts.otherId);
  if (!threadId) return { ok: false, error: 'thread' };
  try {
    const { error } = await sb.from('person_messages').insert({
      thread_id: threadId,
      sender_person_id: opts.personId,
      body,
    });
    return error ? { ok: false, error: 'insert' } : { ok: true };
  } catch (err) {
    console.warn('[threads] sendMessage failed:', err);
    return { ok: false, error: 'internal' };
  }
}

/** Retract your own note (hidden, not deleted — moderation parity
 *  with the host thread's hide). Sender-only. */
export async function hideOwnMessage(
  sb: SupabaseClient,
  opts: { personId: string; messageId: string },
): Promise<boolean> {
  if (!UUID_RX.test(opts.messageId)) return false;
  try {
    const { error } = await sb
      .from('person_messages')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', opts.messageId)
      .eq('sender_person_id', opts.personId);
    return !error;
  } catch (err) {
    console.warn('[threads] hideOwnMessage failed:', err);
    return false;
  }
}

export interface ThreadSummary {
  otherId: string;
  firstName: string;
  lastBody: string;
  lastAt: string;
  /** True when the last word was theirs, not the caller's. */
  theirs: boolean;
}

/** The caller's threads, most recent first — first names only. */
export async function listThreads(sb: SupabaseClient, personId: string): Promise<ThreadSummary[]> {
  if (!UUID_RX.test(personId)) return [];
  try {
    const pid = personId.toLowerCase();
    const [asLo, asHi] = await Promise.all([
      sb.from('person_threads').select('id, person_hi').eq('person_lo', pid).limit(50),
      sb.from('person_threads').select('id, person_lo').eq('person_hi', pid).limit(50),
    ]);
    const threads: Array<{ id: string; otherId: string }> = [
      ...((asLo.data ?? []) as Array<{ id: string; person_hi: string }>).map((t) => ({ id: String(t.id), otherId: String(t.person_hi) })),
      ...((asHi.data ?? []) as Array<{ id: string; person_lo: string }>).map((t) => ({ id: String(t.id), otherId: String(t.person_lo) })),
    ];
    if (threads.length === 0) return [];

    const [{ data: ppl }, lasts] = await Promise.all([
      sb.from('people').select('id, display_name').in('id', threads.map((t) => t.otherId)),
      Promise.all(threads.map((t) =>
        sb.from('person_messages')
          .select('body, created_at, sender_person_id')
          .eq('thread_id', t.id)
          .is('hidden_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      )),
    ]);
    const nameById = new Map((ppl ?? []).map((p) => [String(p.id), firstNameOf(p.display_name)]));

    const out: ThreadSummary[] = [];
    threads.forEach((t, i) => {
      const last = lasts[i]?.data as { body?: string; created_at?: string; sender_person_id?: string } | null;
      if (!last?.created_at) return; // empty thread — nothing to show
      out.push({
        otherId: t.otherId,
        firstName: nameById.get(t.otherId) ?? 'A guest',
        lastBody: String(last.body ?? '').slice(0, 120),
        lastAt: String(last.created_at),
        theirs: String(last.sender_person_id ?? '').toLowerCase() !== pid,
      });
    });
    return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  } catch (err) {
    console.warn('[threads] listThreads failed:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Crew threads (GRAND-PLAN-2 C.6) — the reserved kind, built.
//
// A CREW is a small named group thread ("Bach weekend crew")
// assembled ONLY from the creator's accepted friends — no feed,
// no discovery, no strangers, same as the pair contract. Members
// live in crew_thread_members; every read/write re-verifies
// membership (never trusted from a client). First names only
// leave this module.
// ─────────────────────────────────────────────────────────────

const CREW_MAX_MEMBERS = 16;

/** True when the person belongs to the crew — the gate in front
 *  of every crew read/write. */
export async function isCrewMember(sb: SupabaseClient, threadId: string, personId: string): Promise<boolean> {
  if (!UUID_RX.test(threadId) || !UUID_RX.test(personId)) return false;
  try {
    const { data } = await sb
      .from('crew_thread_members')
      .select('thread_id')
      .eq('thread_id', threadId)
      .eq('person_id', personId.toLowerCase())
      .maybeSingle();
    return Boolean(data);
  } catch (err) {
    console.warn('[threads] isCrewMember failed:', err);
    return false;
  }
}

/** Create a named crew from the creator's ACCEPTED friends only —
 *  each member is re-verified against the friend graph here, not
 *  trusted from the client. The creator is always a member. */
export async function createCrewThread(
  sb: SupabaseClient,
  opts: { creatorId: string; title: string; memberIds: string[] },
): Promise<{ ok: boolean; crewId?: string; error?: string }> {
  const title = opts.title?.trim().slice(0, 80);
  if (!title) return { ok: false, error: 'title' };
  const members = Array.from(new Set(
    (opts.memberIds ?? [])
      .map((m) => String(m).toLowerCase())
      .filter((m) => UUID_RX.test(m) && m !== opts.creatorId.toLowerCase()),
  ));
  if (members.length < 1) return { ok: false, error: 'members' };
  if (members.length > CREW_MAX_MEMBERS - 1) return { ok: false, error: 'too_many' };

  // Every member must be an accepted friend of the CREATOR.
  const checks = await Promise.all(members.map((m) => isAcceptedPair(sb, opts.creatorId, m)));
  if (checks.some((okPair) => !okPair)) return { ok: false, error: 'not_connected' };

  try {
    const { data: thread, error } = await sb
      .from('person_threads')
      .insert({ kind: 'crew', title, created_by: opts.creatorId.toLowerCase() })
      .select('id')
      .single();
    if (error || !thread) {
      console.warn('[threads] createCrewThread insert failed:', error?.message);
      return { ok: false, error: 'unavailable' };
    }
    const crewId = String(thread.id);
    const rows = [opts.creatorId.toLowerCase(), ...members].map((person_id) => ({
      thread_id: crewId,
      person_id,
    }));
    const { error: memberErr } = await sb.from('crew_thread_members').insert(rows);
    if (memberErr) {
      console.warn('[threads] crew member insert failed:', memberErr.message);
      return { ok: false, error: 'members_insert' };
    }
    return { ok: true, crewId };
  } catch (err) {
    console.warn('[threads] createCrewThread failed:', err);
    return { ok: false, error: 'internal' };
  }
}

export interface CrewMessage extends ThreadMessage {
  /** Who said it — needed in a group, first name only. */
  senderFirst: string;
}

/** A crew's conversation, oldest → newest — membership-gated. */
export async function listCrewMessages(
  sb: SupabaseClient,
  opts: { threadId: string; personId: string; limit?: number },
): Promise<CrewMessage[]> {
  if (!(await isCrewMember(sb, opts.threadId, opts.personId))) return [];
  try {
    const { data: rows } = await sb
      .from('person_messages')
      .select('id, sender_person_id, body, created_at')
      .eq('thread_id', opts.threadId)
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(Math.min(opts.limit ?? 80, 160));
    const msgs = ((rows ?? []) as Array<{ id: string; sender_person_id: string; body: string; created_at: string }>).reverse();
    const senderIds = Array.from(new Set(msgs.map((m) => String(m.sender_person_id))));
    const { data: ppl } = senderIds.length > 0
      ? await sb.from('people').select('id, display_name').in('id', senderIds)
      : { data: [] };
    const nameById = new Map((ppl ?? []).map((p) => [String(p.id), firstNameOf(p.display_name)]));
    return msgs.map((m) => ({
      id: String(m.id),
      mine: String(m.sender_person_id).toLowerCase() === opts.personId.toLowerCase(),
      senderFirst: nameById.get(String(m.sender_person_id)) ?? 'A friend',
      body: String(m.body),
      createdAt: String(m.created_at),
    }));
  } catch (err) {
    console.warn('[threads] listCrewMessages failed:', err);
    return [];
  }
}

/** Send into a crew — membership-gated. */
export async function sendCrewMessage(
  sb: SupabaseClient,
  opts: { threadId: string; personId: string; body: string },
): Promise<{ ok: boolean; error?: string }> {
  const body = opts.body?.trim().slice(0, 4000);
  if (!body) return { ok: false, error: 'empty' };
  if (!(await isCrewMember(sb, opts.threadId, opts.personId))) {
    return { ok: false, error: 'not_member' };
  }
  try {
    const { error } = await sb.from('person_messages').insert({
      thread_id: opts.threadId,
      sender_person_id: opts.personId.toLowerCase(),
      body,
    });
    return error ? { ok: false, error: 'insert' } : { ok: true };
  } catch (err) {
    console.warn('[threads] sendCrewMessage failed:', err);
    return { ok: false, error: 'internal' };
  }
}

export interface CrewSummary {
  crewId: string;
  title: string;
  /** Member first names (including the caller), capped. */
  members: string[];
  lastBody: string | null;
  lastAt: string | null;
}

/** The caller's crews, most recently active first. */
export async function listCrews(sb: SupabaseClient, personId: string): Promise<CrewSummary[]> {
  if (!UUID_RX.test(personId)) return [];
  try {
    const pid = personId.toLowerCase();
    const { data: mine } = await sb
      .from('crew_thread_members')
      .select('thread_id')
      .eq('person_id', pid)
      .limit(30);
    const ids = Array.from(new Set((mine ?? []).map((r) => String(r.thread_id))));
    if (ids.length === 0) return [];

    const [{ data: threads }, { data: memberRows }, lasts] = await Promise.all([
      sb.from('person_threads').select('id, title').in('id', ids).eq('kind', 'crew'),
      sb.from('crew_thread_members').select('thread_id, person_id').in('thread_id', ids).limit(400),
      Promise.all(ids.map((id) =>
        sb.from('person_messages')
          .select('body, created_at')
          .eq('thread_id', id)
          .is('hidden_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      )),
    ]);
    const memberIds = Array.from(new Set((memberRows ?? []).map((r) => String(r.person_id))));
    const { data: ppl } = memberIds.length > 0
      ? await sb.from('people').select('id, display_name').in('id', memberIds)
      : { data: [] };
    const nameById = new Map((ppl ?? []).map((p) => [String(p.id), firstNameOf(p.display_name)]));
    const membersByThread = new Map<string, string[]>();
    for (const r of memberRows ?? []) {
      const t = String(r.thread_id);
      const arr = membersByThread.get(t) ?? [];
      if (arr.length < 12) arr.push(nameById.get(String(r.person_id)) ?? 'A friend');
      membersByThread.set(t, arr);
    }

    const out: CrewSummary[] = [];
    (threads ?? []).forEach((t) => {
      const idx = ids.indexOf(String(t.id));
      const last = idx >= 0 ? (lasts[idx]?.data as { body?: string; created_at?: string } | null) : null;
      out.push({
        crewId: String(t.id),
        title: String(t.title ?? 'A crew'),
        members: membersByThread.get(String(t.id)) ?? [],
        lastBody: last?.body ? String(last.body).slice(0, 120) : null,
        lastAt: last?.created_at ? String(last.created_at) : null,
      });
    });
    return out.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
  } catch (err) {
    console.warn('[threads] listCrews failed:', err);
    return [];
  }
}
