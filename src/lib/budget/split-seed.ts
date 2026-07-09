// ─────────────────────────────────────────────────────────────
// Pearloom / lib/budget/split-seed.ts — back-compat seeding
// (GRAND-PLAN Phase 1).
//
// The Weekend planner (BachelorPanel) has long stored a back-of-
// napkin cost list at manifest.bachelor.costs[] — a flat list of
// { label, amount (a free-form dollar STRING), paidBy (a display
// name) }. When a host first opens the real split ledger, we offer
// to seed it from that list.
//
// This helper is the pure MAPPING only — it does NOT write anything.
// The (separate, not-built-here) consumer decides whether to insert.
// Fill-only, never fabricating: a cost with no parseable amount is
// dropped (we won't invent a number), and unnamed payers are left
// null (we won't guess who paid). Distinct named payers become the
// seed participants; splitCount is NOT used to fabricate anonymous
// "Guest 2"-style participants.
// ─────────────────────────────────────────────────────────────

import type { SplitMode } from '@/lib/budget/split';

/** The legacy row shape (BachelorPanel / CostSplitterSection). */
interface LegacyCost {
  id?: string;
  label?: string;
  /** Free-form dollar string, e.g. "480" or "$68.57". May be a number. */
  amount?: string | number;
  /** A display name — the person who fronted it. */
  paidBy?: string;
}

export interface SplitSeedParticipant {
  displayName: string;
}

export interface SplitSeedExpense {
  description: string;
  amountCents: number;
  /** The named payer, or null when the legacy row didn't say. */
  payerDisplayName: string | null;
  mode: SplitMode;
}

export interface SplitSeed {
  participants: SplitSeedParticipant[];
  expenses: SplitSeedExpense[];
}

/** Parse a free-form dollar string ("$480", "68.57") into integer
 *  cents. Returns null when there's no usable number — we never
 *  fabricate an amount. */
function parseDollarsToCents(raw: string | number | undefined): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) : null;
  }
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const dollars = parseFloat(cleaned);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  return Math.round(dollars * 100);
}

/**
 * Map a manifest's legacy bachelor cost list into a seedable split.
 * Pure + defensive: any missing/oddly-shaped input yields an empty
 * seed rather than throwing.
 */
export function seedFromBachelorCosts(manifest: unknown): SplitSeed {
  const bachelor = (manifest as { bachelor?: { costs?: unknown } } | null | undefined)?.bachelor;
  const rawCosts = Array.isArray(bachelor?.costs) ? (bachelor?.costs as LegacyCost[]) : [];

  const expenses: SplitSeedExpense[] = [];
  const participantOrder: string[] = [];
  const seen = new Set<string>();

  for (const cost of rawCosts) {
    if (!cost || typeof cost !== 'object') continue;
    const amountCents = parseDollarsToCents(cost.amount);
    if (amountCents === null) continue; // no amount → not seedable, don't invent one.

    const description = (typeof cost.label === 'string' ? cost.label.trim() : '') || 'Shared cost';
    const payer = typeof cost.paidBy === 'string' ? cost.paidBy.trim() : '';
    const payerDisplayName = payer || null;

    if (payer && !seen.has(payer)) {
      seen.add(payer);
      participantOrder.push(payer);
    }

    expenses.push({ description, amountCents, payerDisplayName, mode: 'even' });
  }

  return {
    participants: participantOrder.map((displayName) => ({ displayName })),
    expenses,
  };
}
