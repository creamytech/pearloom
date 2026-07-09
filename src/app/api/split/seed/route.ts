// ─────────────────────────────────────────────────────────────
// Pearloom / api/split/seed/route.ts — bring the weekend planner's
// back-of-napkin costs into the live split ledger (GRAND-PLAN Phase 1).
//
//   POST { siteId }
//     → OWNER-ONLY. Idempotent: if the site already has ANY
//       participant or expense, this is a no-op. Otherwise it maps
//       manifest.bachelor.costs → seed participants (the distinct
//       named payers) + expenses (even split across them), computing
//       each expense's shares SERVER-SIDE (lib/budget/split), and
//       returns the seeded counts.
//
// gateSplit authenticates + rate-limits. Because we pass NO guest
// token, only an owning SESSION can pass the gate; the explicit
// isOwner check is belt-and-braces. Pearloom never touches the money —
// this is a ledger. Fill-only: a legacy cost with no parseable amount
// or no named payer is skipped, never fabricated (see split-seed.ts).
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { gateSplit } from '@/lib/budget/split-access';
import { seedFromBachelorCosts } from '@/lib/budget/split-seed';
import { computeShares } from '@/lib/budget/split';

export const dynamic = 'force-dynamic';

interface PostBody {
  siteId?: string;
}

export async function POST(req: NextRequest) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // No token forwarded → only an owning session passes the gate.
  const gate = await gateSplit(req, {
    rawSiteId: typeof body.siteId === 'string' ? body.siteId : null,
    write: true,
  });
  if (!gate.ok) return gate.res;
  const { supabase, siteId, isOwner, actorEmail } = gate.access;
  if (!isOwner) {
    return NextResponse.json({ ok: false, error: 'Only the host can bring in the costs.' }, { status: 403 });
  }

  // Idempotency — any existing row (participant or expense) means the
  // ledger is already in use; never double-seed.
  const [pExisting, eExisting] = await Promise.all([
    supabase.from('participants').select('id').eq('site_id', siteId).limit(1),
    supabase.from('expenses').select('id').eq('site_id', siteId).limit(1),
  ]);
  if (pExisting.error || eExisting.error) {
    console.error('[split/seed] existence check failed:', pExisting.error?.message ?? eExisting.error?.message);
    return NextResponse.json({ ok: false, error: 'Could not read the ledger.' }, { status: 500 });
  }
  if ((pExisting.data?.length ?? 0) > 0 || (eExisting.data?.length ?? 0) > 0) {
    return NextResponse.json({ ok: true, seeded: false, participants: 0, expenses: 0 });
  }

  // Map the legacy cost list off the stored manifest.
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('ai_manifest')
    .eq('id', siteId)
    .maybeSingle();
  if (siteErr) {
    console.error('[split/seed] manifest read failed:', siteErr.message);
    return NextResponse.json({ ok: false, error: 'Could not read the site.' }, { status: 500 });
  }
  const seed = seedFromBachelorCosts((site as { ai_manifest?: unknown } | null)?.ai_manifest ?? null);
  if (seed.participants.length === 0) {
    // Nothing seedable (no named payers / no parseable amounts).
    return NextResponse.json({ ok: true, seeded: false, participants: 0, expenses: 0 });
  }

  // Insert the participants (distinct named payers), keep the name→id map.
  const { data: insertedRaw, error: pErr } = await supabase
    .from('participants')
    .insert(seed.participants.map((p) => ({ site_id: siteId, display_name: p.displayName })))
    .select('id, display_name');
  if (pErr || !insertedRaw) {
    console.error('[split/seed] participant insert failed:', pErr?.message);
    return NextResponse.json({ ok: false, error: 'Could not seed the ledger.' }, { status: 500 });
  }
  const inserted = insertedRaw as Array<{ id: string; display_name: string }>;
  const idByName = new Map(inserted.map((r) => [r.display_name, r.id]));
  const allIds = inserted.map((r) => r.id);

  // Insert each expense (payer = the named payer, even split across
  // everyone) followed by its server-computed shares. Best-effort per
  // expense — a share failure rolls back that one expense only.
  let expenses = 0;
  for (const exp of seed.expenses) {
    if (!exp.payerDisplayName) continue; // no payer → can't seed honestly.
    const payerId = idByName.get(exp.payerDisplayName);
    if (!payerId) continue;

    const shares = computeShares({
      amountCents: exp.amountCents,
      payerId,
      mode: 'even',
      participantIds: allIds,
    });

    const { data: expRow, error: expErr } = await supabase
      .from('expenses')
      .insert({
        site_id: siteId,
        payer_id: payerId,
        description: exp.description,
        amount_cents: exp.amountCents,
        currency: 'usd',
        split_mode: 'even',
        spent_on: null,
        created_by_email: actorEmail,
      })
      .select('id')
      .single();
    if (expErr || !expRow) {
      console.error('[split/seed] expense insert failed:', expErr?.message);
      continue;
    }
    const expenseId = (expRow as { id: string }).id;

    const shareRows = Object.entries(shares)
      .filter(([, c]) => c > 0)
      .map(([participant_id, share_cents]) => ({ expense_id: expenseId, participant_id, share_cents, weight: null }));
    const { error: shareErr } = await supabase.from('expense_shares').insert(shareRows);
    if (shareErr) {
      console.error('[split/seed] shares insert failed, rolling back the expense:', shareErr.message);
      await supabase.from('expenses').delete().eq('id', expenseId).eq('site_id', siteId);
      continue;
    }
    expenses += 1;
  }

  return NextResponse.json({ ok: true, seeded: true, participants: inserted.length, expenses });
}
