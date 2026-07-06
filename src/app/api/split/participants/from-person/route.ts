// ─────────────────────────────────────────────────────────────
// /api/split/participants/from-person — the growth payoff of the
// Social layer (GRAND-PLAN Phase 4) tied to the split keystone
// (Phase 1). A HOST drops a known person from the event graph —
// a friend, a returning guest — straight into their event's split
// ledger as a participant. This is "add a friend to your bachelor
// party" made real.
//
//   POST { siteId, personId }
//     → creates (or returns the existing) participants row for that
//       person, deduped on (site_id, person_id). display_name + email
//       come from the people row — the caller only supplies an id.
//
// OWNER-GATED: only the site owner's session may add. gateSplit with
// no token authorizes owner-only (a guest token would authorize a
// guest, so we additionally require isOwner). A NEW route — the
// existing participants handler is left untouched (it takes a raw
// name/email; this one resolves from a person id).
//
// Pearloom never touches the money; a participant is just a
// payer/ower unit in the derived ledger.
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import {
  gateSplit,
  viewParticipant,
  UUID_RX,
  MAX_NAME_LEN,
  type ParticipantRow,
} from '@/lib/budget/split-access';

export const dynamic = 'force-dynamic';

const PARTICIPANT_COLS = 'id, site_id, celebration_id, person_id, display_name, email, created_at';

interface PostBody {
  siteId?: string;
  personId?: string;
}

export async function POST(req: NextRequest) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const personId = typeof body.personId === 'string' ? body.personId.trim() : '';
  if (!UUID_RX.test(personId)) {
    return NextResponse.json({ ok: false, error: 'personId required' }, { status: 400 });
  }

  // No token → owner-only path through the shared gate.
  const gate = await gateSplit(req, {
    rawSiteId: typeof body.siteId === 'string' ? body.siteId : null,
    token: null,
    write: true,
  });
  if (!gate.ok) return gate.res;
  const { supabase, siteId, isOwner } = gate.access;
  if (!isOwner) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // Resolve the person's public facts (never trust a client-supplied
  // name/email here — the id is the anchor).
  const { data: person } = await supabase
    .from('people')
    .select('id, display_name, email')
    .eq('id', personId)
    .maybeSingle();
  if (!person) {
    return NextResponse.json({ ok: false, error: 'Person not found' }, { status: 404 });
  }
  const displayName = (String(person.display_name ?? '').trim() || 'A guest').slice(0, MAX_NAME_LEN);
  const email = (person.email as string | null) ?? null;

  // Dedup on (site_id, person_id) — the same unique index the
  // participants route relies on. Already present → return it.
  const { data: existing } = await supabase
    .from('participants')
    .select(PARTICIPANT_COLS)
    .eq('site_id', siteId)
    .eq('person_id', personId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, added: false, participant: viewParticipant(existing as ParticipantRow) });
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({ site_id: siteId, person_id: personId, display_name: displayName, email })
    .select(PARTICIPANT_COLS)
    .single();

  if (error || !data) {
    // Unique-index race (two adds at once) — read the winner back.
    const { data: raced } = await supabase
      .from('participants')
      .select(PARTICIPANT_COLS)
      .eq('site_id', siteId)
      .eq('person_id', personId)
      .maybeSingle();
    if (raced) {
      return NextResponse.json({ ok: true, added: false, participant: viewParticipant(raced as ParticipantRow) });
    }
    console.error('[split/participants/from-person] insert failed:', error?.message);
    return NextResponse.json({ ok: false, error: 'Could not add the person.' }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, added: true, participant: viewParticipant(data as ParticipantRow) },
    { status: 201 },
  );
}
