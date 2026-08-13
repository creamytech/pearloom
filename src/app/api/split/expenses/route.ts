// ─────────────────────────────────────────────────────────────
// Pearloom / api/split/expenses/route.ts
//
//   POST   { siteId, token?, payerId, description, amountCents, mode,
//            participantIds, weights?, customShares?, excluded?, spentOn? }
//     → record one expense the group shares. The per-participant shares
//       are computed SERVER-SIDE (computeShares) — a client-sent shares
//       field is NEVER read. Best-effort atomicity: if the share rows
//       fail to insert, the orphan expense is deleted.
//   DELETE ?siteId=&id=[&token=]
//     → owner OR the expense's creator / payer. Cascade removes shares.
//
// Owner or guest of the site only (split-access.gateSplit). Money is
// integer cents; Pearloom never touches it — this is a ledger, and
// Σ share_cents == amount_cents (the payer absorbs the remainder).
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import {
  gateSplit,
  viewExpense,
  UUID_RX,
  MAX_CENTS,
  MAX_DESC_LEN,
  type ExpenseRow,
} from '@/lib/budget/split-access';
import { computeShares, type SplitMode, type SplitInput } from '@/lib/budget/split';

export const dynamic = 'force-dynamic';

const MODES: SplitMode[] = ['even', 'shares', 'custom', 'exclude'];
const EXPENSE_COLS =
  'id, site_id, payer_id, description, amount_cents, currency, split_mode, spent_on, created_by_email, created_at';

interface PostBody {
  siteId?: string;
  token?: string;
  payerId?: string;
  description?: string;
  amountCents?: unknown;
  mode?: string;
  participantIds?: unknown;
  weights?: unknown;
  customShares?: unknown;
  excluded?: unknown;
  spentOn?: unknown;
}

/** A finite, non-negative integer cent count within the ceiling, else null. */
function cents(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_CENTS, Math.round(n));
}

/** Keep only the entries whose key is an allowed participant id. */
function numericMap(v: unknown, allowed: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!allowed.has(k)) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** An ISO date (YYYY-MM-DD) or null — never a fabricated day. */
function isoDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
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
  const { supabase, siteId, actorEmail } = gate.access;

  // ── Validate the shape ──
  const payerId = typeof body.payerId === 'string' ? body.payerId : '';
  if (!UUID_RX.test(payerId)) {
    return NextResponse.json({ ok: false, error: 'A valid payer is required.' }, { status: 400 });
  }
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, MAX_DESC_LEN) : '';
  if (!description) {
    return NextResponse.json({ ok: false, error: 'A description is required.' }, { status: 400 });
  }
  const amountCents = cents(body.amountCents);
  if (amountCents === null || amountCents <= 0) {
    // Never record a $0 expense — an amount is the whole point.
    return NextResponse.json({ ok: false, error: 'An amount is required.' }, { status: 400 });
  }
  const mode: SplitMode = MODES.includes(body.mode as SplitMode) ? (body.mode as SplitMode) : 'even';

  const rawIds = Array.isArray(body.participantIds) ? body.participantIds : [];
  const participantIds = Array.from(
    new Set(rawIds.filter((x): x is string => typeof x === 'string' && UUID_RX.test(x))),
  );
  if (participantIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'Choose who shares this.' }, { status: 400 });
  }

  // ── Every id must be a participant of THIS site (payer included) ──
  const idsToCheck = Array.from(new Set([payerId, ...participantIds]));
  const { data: known, error: memberErr } = await supabase
    .from('participants')
    .select('id')
    .eq('site_id', siteId)
    .in('id', idsToCheck);
  if (memberErr) {
    console.error('[split/expenses] member check failed:', memberErr.message);
    return NextResponse.json({ ok: false, error: 'Could not save the expense.' }, { status: 500 });
  }
  const siteParticipants = new Set(((known ?? []) as { id: string }[]).map((r) => r.id));
  if (!siteParticipants.has(payerId)) {
    return NextResponse.json({ ok: false, error: 'The payer is not on this split.' }, { status: 400 });
  }
  const sharers = participantIds.filter((id) => siteParticipants.has(id));
  if (sharers.length === 0) {
    return NextResponse.json({ ok: false, error: 'Nobody on this split shares this.' }, { status: 400 });
  }

  // ── Compute shares SERVER-SIDE (client-sent shares are never trusted) ──
  const sharerSet = new Set(sharers);
  const weights = numericMap(body.weights, sharerSet);
  const customShares = numericMap(body.customShares, sharerSet);
  const excluded = Array.isArray(body.excluded)
    ? body.excluded.filter((x): x is string => typeof x === 'string' && sharerSet.has(x))
    : [];

  const input: SplitInput = {
    amountCents,
    payerId,
    mode,
    participantIds: sharers,
    weights: mode === 'shares' ? weights : undefined,
    customShares: mode === 'custom' ? customShares : undefined,
    excluded: mode === 'exclude' ? excluded : undefined,
  };
  const shares = computeShares(input);

  // ── Insert the expense, then its shares (delete the expense if that
  //    second write fails, so we never leave an amount with no owers). ──
  const { data: expenseRow, error: expErr } = await supabase
    .from('expenses')
    .insert({
      site_id: siteId,
      payer_id: payerId,
      description,
      amount_cents: amountCents,
      currency: 'usd',
      split_mode: mode,
      spent_on: isoDate(body.spentOn),
      created_by_email: actorEmail,
    })
    .select(EXPENSE_COLS)
    .single();
  if (expErr || !expenseRow) {
    console.error('[split/expenses] insert failed:', expErr?.message);
    return NextResponse.json({ ok: false, error: 'Could not save the expense.' }, { status: 500 });
  }
  const expenseId = (expenseRow as ExpenseRow).id;

  const shareRows = Object.entries(shares)
    .filter(([, c]) => c > 0)
    .map(([participantId, c]) => ({
      expense_id: expenseId,
      participant_id: participantId,
      share_cents: c,
      weight: mode === 'shares' ? (weights[participantId] ?? 1) : null,
    }));

  const { error: shareErr } = await supabase.from('expense_shares').insert(shareRows);
  if (shareErr) {
    console.error('[split/expenses] shares insert failed, rolling back:', shareErr.message);
    await supabase.from('expenses').delete().eq('id', expenseId).eq('site_id', siteId);
    return NextResponse.json({ ok: false, error: 'Could not save the expense.' }, { status: 500 });
  }

  const shareMap: Record<string, number> = {};
  for (const r of shareRows) shareMap[r.participant_id] = r.share_cents;

  return NextResponse.json(
    { ok: true, expense: viewExpense(expenseRow as ExpenseRow, shareMap) },
    { status: 201 },
  );
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
  const { supabase, siteId, isOwner, guest, actorEmail } = gate.access;

  const { data: row } = await supabase
    .from('expenses')
    .select('id, site_id, payer_id, created_by_email')
    .eq('id', id)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // Owner may remove any expense; a guest may remove one they created or
  // one they paid.
  let allowed = isOwner;
  if (!allowed && guest) {
    const createdBy = (row as { created_by_email: string | null }).created_by_email;
    const createdByGuest = !!actorEmail && createdBy?.toLowerCase().trim() === actorEmail;
    if (createdByGuest) {
      allowed = true;
    } else if (guest.personId) {
      // Is the guest the payer of this expense?
      const { data: payer } = await supabase
        .from('participants')
        .select('person_id')
        .eq('id', (row as { payer_id: string }).payer_id)
        .eq('site_id', siteId)
        .maybeSingle();
      if (payer && (payer as { person_id: string | null }).person_id === guest.personId) {
        allowed = true;
      }
    }
  }
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('site_id', siteId);
  if (error) {
    console.error('[split/expenses] DELETE failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not remove the expense.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
