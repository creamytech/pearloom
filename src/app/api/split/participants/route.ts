// ─────────────────────────────────────────────────────────────
// Pearloom / api/split/participants/route.ts
//
//   POST   { siteId, token?, displayName, email? }
//     → create (or return the existing) participant. When an email is
//       given the participant is anchored to people.id — the cross-
//       event identity — and deduped on the (site_id, person_id) unique
//       index; name-only participants may repeat.
//   DELETE ?siteId=&id=[&token=]
//     → owner OR the guest who owns that participant (person match).
//       Cascade removes their expenses + shares via FK.
//
// Owner or guest of the site only (split-access.gateSplit). Pearloom
// never touches the money — a participant is just a payer/ower unit.
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import {
  gateSplit,
  viewParticipant,
  UUID_RX,
  MAX_NAME_LEN,
  type ParticipantRow,
} from '@/lib/budget/split-access';
import { resolvePersonId, normalizePersonEmail } from '@/lib/people';

export const dynamic = 'force-dynamic';

const PARTICIPANT_COLS = 'id, site_id, celebration_id, person_id, display_name, email, created_at';

interface PostBody {
  siteId?: string;
  token?: string;
  displayName?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const gate = await gateSplit(req, {
    rawSiteId: typeof body.siteId === 'string' ? body.siteId : null,
    token: typeof body.token === 'string' ? body.token : null,
    write: true,
  });
  if (!gate.ok) return gate.res;
  const { supabase, siteId } = gate.access;

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, MAX_NAME_LEN) : '';
  if (!displayName) {
    return NextResponse.json({ ok: false, error: 'A name is required.' }, { status: 400 });
  }

  const email = normalizePersonEmail(body.email);

  // With an email we anchor to a person and dedupe within the site; a
  // name-only participant is always a fresh row.
  let personId: string | null = null;
  if (email) {
    personId = await resolvePersonId(supabase, { email, name: displayName });
    if (personId) {
      const { data: existing } = await supabase
        .from('participants')
        .select(PARTICIPANT_COLS)
        .eq('site_id', siteId)
        .eq('person_id', personId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ ok: true, participant: viewParticipant(existing as ParticipantRow) });
      }
    }
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({ site_id: siteId, person_id: personId, display_name: displayName, email })
    .select(PARTICIPANT_COLS)
    .single();

  if (error || !data) {
    // Unique-index race (two guests adding the same person at once) —
    // read the winner back rather than 500.
    if (personId) {
      const { data: raced } = await supabase
        .from('participants')
        .select(PARTICIPANT_COLS)
        .eq('site_id', siteId)
        .eq('person_id', personId)
        .maybeSingle();
      if (raced) {
        return NextResponse.json({ ok: true, participant: viewParticipant(raced as ParticipantRow) });
      }
    }
    console.error('[split/participants] insert failed:', error?.message);
    return NextResponse.json({ ok: false, error: 'Could not add the person.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, participant: viewParticipant(data as ParticipantRow) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const gate = await gateSplit(req, {
    rawSiteId: req.nextUrl.searchParams.get('siteId'),
    token: req.nextUrl.searchParams.get('token'),
    write: true,
  });
  if (!gate.ok) return gate.res;
  const { supabase, siteId, isOwner, guest } = gate.access;

  // Load the participant, scoped to the site (never trust a cross-site id).
  const { data: row } = await supabase
    .from('participants')
    .select('id, site_id, person_id')
    .eq('id', id)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // Owner may remove anyone; a guest may only remove their own person.
  const participantPerson = (row as { person_id: string | null }).person_id;
  const guestOwnsIt = !!guest?.personId && participantPerson === guest.personId;
  if (!isOwner && !guestOwnsIt) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)
    .eq('site_id', siteId);
  if (error) {
    console.error('[split/participants] DELETE failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not remove the person.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
