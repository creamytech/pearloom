// ─────────────────────────────────────────────────────────────
// Pearloom / lib/budget/split.ts — the collaborative-split math
// (GRAND-PLAN Phase 1, the keystone).
//
// Pure, dependency-free, integer-cents throughout (no float drift):
//   • computeShares  — split ONE expense across participants by mode
//     (even / shares / custom / exclude); the rounding remainder
//     always lands on the payer, so Σ shares == amount exactly.
//   • computeBalances — net each participant across many expenses
//     (paid − owed). Positive = owed TO them; negative = they owe.
//   • settleUp — the minimized who-pays-whom set (greedy largest-
//     creditor ↔ largest-debtor). Pearloom never moves the money;
//     the UI hangs each transfer off the creditor's own P2P handle.
// ─────────────────────────────────────────────────────────────

export type SplitMode = 'even' | 'shares' | 'custom' | 'exclude';

export interface SplitInput {
  amountCents: number;
  /** Who fronted the money — absorbs the rounding remainder. */
  payerId: string;
  mode: SplitMode;
  /** Everyone potentially sharing this expense. */
  participantIds: string[];
  /** mode='shares': relative weight per participant (default 1; ≤0 excludes). */
  weights?: Record<string, number>;
  /** mode='custom': explicit cents per participant. Any shortfall/overage
   *  vs amount is reconciled onto the payer. */
  customShares?: Record<string, number>;
  /** mode='exclude': participants who do NOT share (evenly split the rest). */
  excluded?: string[];
}

const int = (v: number): number => (Number.isFinite(v) ? Math.round(v) : 0);

/** The participants who actually share this expense, per mode. */
function sharersFor(input: SplitInput): string[] {
  const ids = input.participantIds;
  switch (input.mode) {
    case 'exclude': {
      const ex = new Set(input.excluded ?? []);
      return ids.filter((id) => !ex.has(id));
    }
    case 'shares':
      return ids.filter((id) => (input.weights?.[id] ?? 1) > 0);
    case 'custom':
      return ids.filter((id) => input.customShares?.[id] != null);
    case 'even':
    default:
      return ids;
  }
}

/**
 * Split one expense into per-participant cents. The result always sums
 * EXACTLY to amountCents — the rounding remainder (or a custom-mode
 * shortfall/overage) is reconciled onto the payer, or, if the payer
 * isn't among the sharers, onto the first sharer.
 */
export function computeShares(input: SplitInput): Record<string, number> {
  const amount = Math.max(0, int(input.amountCents));
  const sharers = sharersFor(input);
  const out: Record<string, number> = {};
  if (sharers.length === 0) {
    // No one to share with → the payer bears it all.
    out[input.payerId] = amount;
    return out;
  }

  // 1) Base allocation per mode (may under/over-shoot by rounding).
  if (input.mode === 'custom') {
    for (const id of sharers) out[id] = Math.max(0, int(input.customShares?.[id] ?? 0));
  } else if (input.mode === 'shares') {
    const w = (id: string) => Math.max(0, input.weights?.[id] ?? 1);
    const total = sharers.reduce((s, id) => s + w(id), 0);
    if (total <= 0) {
      for (const id of sharers) out[id] = 0;
    } else {
      for (const id of sharers) out[id] = Math.floor((amount * w(id)) / total);
    }
  } else {
    // even / exclude → equal split.
    const base = Math.floor(amount / sharers.length);
    for (const id of sharers) out[id] = base;
  }

  // 2) Reconcile the remainder (amount − Σ base) onto the payer.
  const allocated = sharers.reduce((s, id) => s + out[id], 0);
  const remainder = amount - allocated;
  const anchor = out[input.payerId] !== undefined ? input.payerId : sharers[0];
  out[anchor] = Math.max(0, out[anchor] + remainder);

  return out;
}

// ── Balances across many expenses ─────────────────────────────

export interface ExpenseWithShares {
  payerId: string;
  amountCents: number;
  /** participantId → cents owed for THIS expense (from computeShares). */
  shares: Record<string, number>;
}

/**
 * Net each participant across all expenses: paid (as payer) − owed
 * (their shares). Positive = the group owes THEM; negative = they owe
 * the group. Sums to ~0 across everyone (each expense's shares sum to
 * its amount).
 */
export function computeBalances(expenses: ExpenseWithShares[]): Record<string, number> {
  const net: Record<string, number> = {};
  const bump = (id: string, cents: number) => {
    net[id] = (net[id] ?? 0) + cents;
  };
  for (const e of expenses) {
    bump(e.payerId, int(e.amountCents));
    for (const [id, cents] of Object.entries(e.shares)) bump(id, -int(cents));
  }
  return net;
}

// ── Settle up ─────────────────────────────────────────────────

export interface Transfer {
  fromId: string; // the debtor pays…
  toId: string; //   …the creditor
  amountCents: number;
}

/**
 * Minimize who-owes-whom. Greedy: repeatedly settle the largest
 * creditor against the largest debtor. Not provably minimal (that's
 * NP-hard) but tight in practice and deterministic. Ignores sub-cent
 * dust; only positive transfers are returned.
 */
export function settleUp(net: Record<string, number>): Transfer[] {
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amt: int(v) }));
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amt: -int(v) }));

  // Descending by amount, with id as a tiebreak so the output is
  // deterministic regardless of object key order.
  const byAmt = (a: { id: string; amt: number }, b: { id: string; amt: number }) =>
    b.amt - a.amt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  creditors.sort(byAmt);
  debtors.sort(byAmt);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const pay = Math.min(c.amt, d.amt);
    if (pay > 0) {
      transfers.push({ fromId: d.id, toId: c.id, amountCents: pay });
      c.amt -= pay;
      d.amt -= pay;
    }
    if (c.amt === 0) ci++;
    if (d.amt === 0) di++;
  }
  return transfers;
}

/** Convenience: expenses → the settle-up transfers in one call. */
export function settleExpenses(expenses: ExpenseWithShares[]): Transfer[] {
  return settleUp(computeBalances(expenses));
}
