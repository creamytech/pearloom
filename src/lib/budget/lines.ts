// ─────────────────────────────────────────────────────────────
// Pearloom / lib/budget/lines.ts — the money-spine math
// (GRAND-PLAN Phase 0).
//
// Pure, dependency-free helpers over budget_lines rows (see
// 20260706_budget_lines.sql). The table is the source of truth; the
// cockpit's manifest.budget array ([{cat, used, cap}] in DOLLARS) is
// a cached projection derived here so the existing BudgetBreakdown
// keeps working unchanged.
//
// Everything is CENTS in, dollars only at the projection edge — no
// rounding drift in the ledger itself.
// ─────────────────────────────────────────────────────────────

export type BudgetKind = 'expense' | 'income';
export type BudgetSourceKind = 'manual' | 'vendor' | 'expense' | 'pledge';

/** A budget_lines row in app (camelCase) shape. */
export interface BudgetLine {
  id: string;
  siteId: string;
  celebrationId?: string | null;
  scope?: 'site' | 'celebration';
  category: string;
  label?: string | null;
  kind: BudgetKind;
  plannedCents?: number | null;
  committedCents?: number | null;
  paidCents?: number | null;
  sourceKind?: BudgetSourceKind | null;
  sourceId?: string | null;
  sortIndex?: number;
}

/** The fields a caller may set when upserting a line. */
export type BudgetLineInput = Pick<
  BudgetLine,
  'category' | 'label' | 'kind' | 'plannedCents' | 'committedCents' | 'paidCents' | 'sourceKind' | 'sourceId'
> & { sortIndex?: number; celebrationId?: string | null };

export interface CategoryTotals {
  plannedCents: number;
  committedCents: number;
  paidCents: number;
}

export interface BudgetRollup {
  /** Sum of planned/committed/paid across EXPENSE lines only. */
  plannedCents: number;
  committedCents: number;
  paidCents: number;
  /** Money coming IN (gifts/contributions) — tracked separately, never
   *  netted against expenses so the two figures stay legible. */
  incomeCents: number;
  /** committed exceeds planned — the cockpit paints this in plum. */
  overBudget: boolean;
  /** Still-to-pay on what's committed (never negative). */
  remainingCents: number;
  byCategory: Record<string, CategoryTotals>;
}

const n = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Roll a set of lines up into the cockpit figures. Expense lines feed
 * planned/committed/paid; income lines feed incomeCents only.
 */
export function rollupBudget(lines: BudgetLine[]): BudgetRollup {
  let plannedCents = 0;
  let committedCents = 0;
  let paidCents = 0;
  let incomeCents = 0;
  const byCategory: Record<string, CategoryTotals> = {};

  for (const l of lines) {
    if (l.kind === 'income') {
      // Income is realized when paid, else its pledged/committed figure.
      incomeCents += n(l.paidCents) || n(l.committedCents) || n(l.plannedCents);
      continue;
    }
    const p = n(l.plannedCents);
    const c = n(l.committedCents);
    const d = n(l.paidCents);
    plannedCents += p;
    committedCents += c;
    paidCents += d;
    const key = l.category || 'Other';
    const cat = (byCategory[key] ??= { plannedCents: 0, committedCents: 0, paidCents: 0 });
    cat.plannedCents += p;
    cat.committedCents += c;
    cat.paidCents += d;
  }

  return {
    plannedCents,
    committedCents,
    paidCents,
    incomeCents,
    overBudget: committedCents > plannedCents,
    remainingCents: Math.max(0, committedCents - paidCents),
    byCategory,
  };
}

/** A cockpit budget line: whole DOLLARS, `used` = paid, `cap` = the
 *  line's full contracted (or, absent that, planned) cost. */
export interface ManifestBudgetLine {
  cat: string;
  used: number;
  cap: number;
}

const toDollars = (cents: number | null | undefined): number => Math.round(n(cents) / 100);

/**
 * Project expense lines into the legacy manifest.budget array shape so
 * the existing cockpit BudgetBreakdown renders table-backed lines with
 * no change. Income lines are omitted (the cockpit tracks spend, not
 * gifts). One entry per line, labelled by its label ?? category.
 */
export function toManifestProjection(lines: BudgetLine[]): ManifestBudgetLine[] {
  return lines
    .filter((l) => l.kind !== 'income')
    .slice()
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((l) => ({
      cat: (l.label?.trim() || l.category || 'Other').slice(0, 80),
      used: toDollars(l.paidCents),
      cap: toDollars(l.committedCents ?? l.plannedCents),
    }));
}

/** The minimal vendor shape needed to derive a budget line (a subset of
 *  VendorBookClient's BookVendor — kept local so this stays pure). */
export interface VendorForBudget {
  id: string;
  name: string;
  category?: string | null;
  costCents?: number | null;
  depositCents?: number | null;
  depositPaid?: boolean;
  balancePaid?: boolean;
}

/**
 * Derive a vendor-linked budget line input from a Vendor Book row —
 * the real FK that replaces addToBudget's name-string merge. Committed
 * = the vendor's full cost; paid = whichever of deposit/balance is
 * marked paid. The unique index on (site_id, source_id) makes a repeat
 * add update the line in place.
 */
export function vendorToBudgetLine(v: VendorForBudget): BudgetLineInput {
  const cost = n(v.costCents);
  const deposit = n(v.depositCents);
  const balance = Math.max(0, cost - deposit);
  let paid = 0;
  if (v.depositPaid) paid += deposit;
  if (v.balancePaid) paid += balance;
  return {
    category: (v.category || 'Vendors').slice(0, 80),
    label: v.name.trim().slice(0, 80),
    kind: 'expense',
    committedCents: cost || null,
    paidCents: paid || null,
    plannedCents: null,
    sourceKind: 'vendor',
    sourceId: v.id,
  };
}
