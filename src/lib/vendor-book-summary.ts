// ─────────────────────────────────────────────────────────────
// Pearloom / lib/vendor-book-summary.ts
//
// Pure aggregation over the Vendor Book (site_vendors — see
// /api/vendors/book). Three consumers:
//   • /api/pear-chat host mode — the VENDOR BOOK block in Pear's
//     live-stats context
//   • /api/director — the ledger folded into the session context
//   • DashDirector — the "From your vendor book" panel
//
// Field names match the /api/vendors/book view (camelCase) so the
// client can pass API rows straight through; server routes map
// their snake_case rows with a one-line adapter.
//
// Money honesty: every figure is host-entered cents. This module
// only ever adds them up — it never invents a number.
// ─────────────────────────────────────────────────────────────

export interface VendorBookEntry {
  name: string;
  category: string;
  status: string; // 'considering' | 'booked' | 'paid'
  costCents: number | null;
  depositCents: number | null;
  depositDue: string | null; // YYYY-MM-DD
  balanceDue: string | null; // YYYY-MM-DD
  depositPaid: boolean;
  balancePaid: boolean;
  arrivalTime?: string | null;
}

export interface VendorNextDue {
  vendorName: string;
  kind: 'deposit' | 'balance';
  due: string; // YYYY-MM-DD
  amountCents: number | null;
  pastDue: boolean;
}

export interface VendorBookSummary {
  /** Vendors with status 'booked'. */
  bookedCount: number;
  /** Vendors with status 'paid'. */
  paidCount: number;
  /** Sum of cost across booked + paid vendors (cents). */
  totalBookedCents: number;
  /** Deposits + balances actually marked paid (cents). */
  paidCents: number;
  /** totalBookedCents − paidCents, floored at 0. */
  unpaidCents: number;
  /** Per-category cost/paid across booked + paid vendors. */
  perCategory: Array<{ category: string; costCents: number; paidCents: number }>;
  /** The earliest unpaid deposit/balance with a due date (any status). */
  nextDue: VendorNextDue | null;
  /** "Name — arrival" lines for booked/paid vendors with a time. */
  arrivals: string[];
}

/** Host-entered cents → "$1,200" (cents shown only when present). */
export function fmtCentsPlain(cents: number): string {
  const whole = cents % 100 === 0;
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

/** Balance owed = cost minus deposit (when cost is entered). */
export function vendorBalanceCents(v: VendorBookEntry): number | null {
  if (v.costCents == null) return null;
  return Math.max(0, v.costCents - (v.depositCents ?? 0));
}

function paidSoFarCents(v: VendorBookEntry): number {
  let paid = 0;
  if (v.depositPaid && v.depositCents) paid += v.depositCents;
  if (v.balancePaid) paid += vendorBalanceCents(v) ?? 0;
  return paid;
}

/**
 * Aggregate the book. `todayIso` is a YYYY-MM-DD string (kept as a
 * param so the function stays pure — callers pass their notion of
 * "today", local on the client, UTC on the server).
 */
export function summarizeVendorBook(rows: VendorBookEntry[], todayIso: string): VendorBookSummary {
  const money = rows.filter((v) => v.status === 'booked' || v.status === 'paid');

  let totalBookedCents = 0;
  let paidCents = 0;
  const byCategory = new Map<string, { category: string; costCents: number; paidCents: number }>();
  for (const v of money) {
    const cost = v.costCents ?? 0;
    const paid = paidSoFarCents(v);
    totalBookedCents += cost;
    paidCents += paid;
    const key = v.category.trim().toLowerCase();
    const line = byCategory.get(key) ?? { category: v.category.trim(), costCents: 0, paidCents: 0 };
    line.costCents += cost;
    line.paidCents += paid;
    byCategory.set(key, line);
  }

  // Earliest unpaid due across the whole book — a considering
  // vendor with a deposit deadline is still a real deadline.
  let nextDue: VendorNextDue | null = null;
  for (const v of rows) {
    const candidates: Array<{ kind: 'deposit' | 'balance'; due: string; amountCents: number | null }> = [];
    if (v.depositDue && !v.depositPaid) {
      candidates.push({ kind: 'deposit', due: v.depositDue, amountCents: v.depositCents });
    }
    if (v.balanceDue && !v.balancePaid) {
      candidates.push({ kind: 'balance', due: v.balanceDue, amountCents: vendorBalanceCents(v) });
    }
    for (const c of candidates) {
      if (!nextDue || c.due < nextDue.due) {
        nextDue = {
          vendorName: v.name,
          kind: c.kind,
          due: c.due,
          amountCents: c.amountCents,
          pastDue: c.due < todayIso,
        };
      }
    }
  }

  const arrivals = money
    .filter((v) => (v.arrivalTime ?? '').trim())
    .slice(0, 8)
    .map((v) => `${v.name} — ${(v.arrivalTime ?? '').trim()}`);

  return {
    bookedCount: money.filter((v) => v.status === 'booked').length,
    paidCount: money.filter((v) => v.status === 'paid').length,
    totalBookedCents,
    paidCents,
    unpaidCents: Math.max(0, totalBookedCents - paidCents),
    perCategory: [...byCategory.values()],
    nextDue,
    arrivals,
  };
}

/** "Balance for DJ Amara due Jun 3 — $800" (or "… past due — $800"). */
export function describeNextDue(d: VendorNextDue): string {
  const kind = d.kind === 'deposit' ? 'Deposit' : 'Balance';
  const when = new Date(`${d.due}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const amount = d.amountCents != null ? ` — ${fmtCentsPlain(d.amountCents)}` : '';
  return `${kind} for ${d.vendorName} ${d.pastDue ? `was due ${when} (past due)` : `due ${when}`}${amount}`;
}
