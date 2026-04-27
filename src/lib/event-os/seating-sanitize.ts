// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/seating-sanitize.ts
//
// Pure post-processing for the Claude seating planner output.
// Kept separate from the route so it can be unit-tested without
// mocking the Claude + Supabase clients.
// ─────────────────────────────────────────────────────────────

export interface PlannedTable {
  label: string;
  guestIds: string[];
  rationale: string;
}

export interface TableCapacity {
  label: string;
  capacity: number;
}

export interface RelationshipEdge {
  from_guest_id: string | null;
  to_guest_id: string | null;
  closeness: number | null;
}

export interface SanitizeInput {
  planTables: PlannedTable[];
  planUnseated: string[];
  tables: TableCapacity[];
  edges: RelationshipEdge[];
}

export interface SanitizeResult {
  tables: PlannedTable[];
  unseatedGuestIds: string[];
  stats: {
    seated: number;
    closenessScore: number;
    closenessPossible: number;
  };
}

/**
 * Trim over-capacity tables, dedupe guests, and push overflow into unseated.
 * Also computes the achieved vs. possible closeness score across edges.
 */
export function sanitizeSeatingPlan(input: SanitizeInput): SanitizeResult {
  const { planTables, planUnseated, tables, edges } = input;
  const capByLabel = new Map(tables.map((t) => [t.label.toLowerCase(), t.capacity]));
  const seen = new Set<string>();
  const sanitizedTables: PlannedTable[] = [];
  const overflow: string[] = [];

  for (const pt of planTables) {
    const cap = capByLabel.get(pt.label.toLowerCase()) ?? 0;
    const ids: string[] = [];
    for (const gid of pt.guestIds) {
      if (!gid) continue;
      if (seen.has(gid)) continue;
      if (ids.length >= cap) {
        overflow.push(gid);
        continue;
      }
      seen.add(gid);
      ids.push(gid);
    }
    sanitizedTables.push({ ...pt, guestIds: ids });
  }

  const unseated = [
    ...planUnseated.filter((gid) => Boolean(gid) && !seen.has(gid)),
    ...overflow,
  ];

  // Closeness score — same-table edges contribute their closeness, cross-table edges don't.
  const guestToTable = new Map<string, string>();
  for (const t of sanitizedTables) {
    for (const gid of t.guestIds) guestToTable.set(gid, t.label);
  }
  let closenessScore = 0;
  let closenessPossible = 0;
  for (const e of edges) {
    if (!e.from_guest_id || !e.to_guest_id || typeof e.closeness !== 'number') continue;
    closenessPossible += e.closeness;
    if (guestToTable.get(e.from_guest_id) === guestToTable.get(e.to_guest_id)) {
      closenessScore += e.closeness;
    }
  }

  return {
    tables: sanitizedTables,
    unseatedGuestIds: unseated,
    stats: {
      seated: seen.size,
      closenessScore,
      closenessPossible,
    },
  };
}
