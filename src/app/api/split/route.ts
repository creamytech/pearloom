// ─────────────────────────────────────────────────────────────
// Pearloom / api/split/route.ts — the collaborative-split ledger
// (GRAND-PLAN Phase 1, THE keystone).
//
//   GET ?siteId=<uuid|subdomain>[&token=<guest>]
//     → { ok, participants[], expenses[{…, shares}], balances, settleUp }
//
// The group shares the cost of a bachelor trip / reunion / group
// birthday and Pearloom shows who owes whom — WITHOUT ever touching
// the money. Balances + settle-up are DERIVED here from the stored
// expense_shares (src/lib/budget/split.ts), never stored, so there's
// no ledger drift. Auth: site owner OR a valid guest of the site
// (split-access.gateSplit); no anonymous reads.
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import {
  gateSplit,
  viewParticipant,
  viewExpense,
  type ParticipantRow,
  type ExpenseRow,
  type ShareRow,
} from '@/lib/budget/split-access';
import {
  computeBalances,
  settleUp,
  type ExpenseWithShares,
} from '@/lib/budget/split';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await gateSplit(req, {
    rawSiteId: req.nextUrl.searchParams.get('siteId'),
    token: req.nextUrl.searchParams.get('token'),
    write: false,
  });
  if (!gate.ok) return gate.res;
  const { supabase, siteId } = gate.access;

  // Participants, expenses, and their shares — three reads, one site.
  const [pRes, eRes] = await Promise.all([
    supabase.from('participants').select('*').eq('site_id', siteId).order('created_at', { ascending: true }),
    supabase.from('expenses').select('*').eq('site_id', siteId).order('spent_on', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true }),
  ]);

  if (pRes.error || eRes.error) {
    console.error('[split] GET failed:', pRes.error?.message ?? eRes.error?.message);
    return NextResponse.json({ ok: false, error: 'Could not load the split.' }, { status: 500 });
  }

  const participants = (pRes.data ?? []) as ParticipantRow[];
  const expenses = (eRes.data ?? []) as ExpenseRow[];

  // Shares for every expense in this site (empty when there are none).
  const expenseIds = expenses.map((e) => e.id);
  let shareRows: ShareRow[] = [];
  if (expenseIds.length > 0) {
    const { data, error } = await supabase
      .from('expense_shares')
      .select('*')
      .in('expense_id', expenseIds);
    if (error) {
      console.error('[split] GET shares failed:', error.message);
      return NextResponse.json({ ok: false, error: 'Could not load the split.' }, { status: 500 });
    }
    shareRows = (data ?? []) as ShareRow[];
  }

  // Group shares by expense → { participantId: cents }.
  const sharesByExpense = new Map<string, Record<string, number>>();
  for (const s of shareRows) {
    const map = sharesByExpense.get(s.expense_id) ?? {};
    map[s.participant_id] = s.share_cents;
    sharesByExpense.set(s.expense_id, map);
  }

  // Derive balances + settle-up from the stored shares (the payer paid the
  // amount; each participant owes their share).
  const withShares: ExpenseWithShares[] = expenses.map((e) => ({
    payerId: e.payer_id,
    amountCents: e.amount_cents,
    shares: sharesByExpense.get(e.id) ?? {},
  }));
  const balances = computeBalances(withShares);
  const transfers = settleUp(balances);

  return NextResponse.json({
    ok: true,
    participants: participants.map(viewParticipant),
    expenses: expenses.map((e) => viewExpense(e, sharesByExpense.get(e.id) ?? {})),
    balances,
    settleUp: transfers,
  });
}
