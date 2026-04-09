// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wedding-graph.ts
// AI orchestration layer — seating, registry, constraints
// ─────────────────────────────────────────────────────────────

import type { Guest, SeatingTable, SeatingConstraint, RegistryItem } from '@/types';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ─── Internal helpers ─────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return key;
}

async function geminiJson<T>(prompt: string): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${text}`);
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(raw) as T;
}

async function geminiText(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const res = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${text}`);
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─────────────────────────────────────────────────────────────
// parseConstraintFromText
// Parse natural language like "Keep John and Mary at the same
// table" into a structured SeatingConstraint fragment.
// ─────────────────────────────────────────────────────────────

export async function parseConstraintFromText(
  text: string,
  guests: Guest[]
): Promise<Partial<SeatingConstraint>> {
  const guestNames = guests.map((g) => `${g.id}:${g.name}`).join(', ');

  const prompt = `
You are a wedding seating assistant. Parse the following natural-language constraint into a structured JSON object.

Available guests (id:name): ${guestNames}

Constraint types: must_sit_together | must_not_sit_together | near_exit | near_dance_floor | avoid_table | prefer_table | custom

User's constraint: "${text}"

Return a JSON object with these fields:
{
  "type": "<constraint type>",
  "guestIds": ["<guest uuid>", ...],   // only for guest-based constraints
  "priority": 1,                        // 1 = soft, 2 = hard
  "description": "<short plain-English summary>"
}

Rules:
- Match guests by name (case-insensitive). Only include guestIds for guests found in the list.
- If no guests are mentioned, return an empty guestIds array.
- If the constraint cannot be clearly mapped to a known type, use "custom".
- Return only valid JSON, no markdown.
`.trim();

  const parsed = await geminiJson<Partial<SeatingConstraint>>(prompt);
  return parsed;
}

// ─────────────────────────────────────────────────────────────
// scoreSeatingArrangement
// Evaluate how well a seating plan satisfies all constraints.
// Returns a 0-100 score, list of violated constraints,
// and actionable suggestions.
// ─────────────────────────────────────────────────────────────

export async function scoreSeatingArrangement(
  tables: SeatingTable[],
  guests: Guest[],
  constraints: SeatingConstraint[]
): Promise<{ score: number; violations: string[]; suggestions: string[] }> {
  const violations: string[] = [];

  // Build guest-to-table lookup
  const guestTableMap = new Map<string, string>(); // guestId -> tableId
  for (const table of tables) {
    for (const seat of table.seats ?? []) {
      if (seat.guestId) {
        guestTableMap.set(seat.guestId, table.id);
      }
    }
  }

  // Helper: get guest name by id
  const guestName = (id: string) =>
    guests.find((g) => g.id === id)?.name ?? id;

  // Evaluate each constraint
  for (const c of constraints) {
    const guestIds = c.guestIds ?? [];

    if (c.type === 'must_sit_together' && guestIds.length >= 2) {
      const tableIds = new Set(guestIds.map((id) => guestTableMap.get(id)).filter(Boolean));
      if (tableIds.size > 1) {
        const names = guestIds.map(guestName).join(' & ');
        violations.push(`${names} must sit together but are at different tables.`);
      }
    }

    if (c.type === 'must_not_sit_together' && guestIds.length >= 2) {
      const tableIds = guestIds.map((id) => guestTableMap.get(id)).filter(Boolean);
      const uniqueTables = new Set(tableIds);
      if (uniqueTables.size < tableIds.length) {
        const names = guestIds.map(guestName).join(' & ');
        violations.push(`${names} must NOT sit together but are at the same table.`);
      }
    }

    if (c.type === 'avoid_table' && c.tableId && guestIds.length > 0) {
      for (const gId of guestIds) {
        if (guestTableMap.get(gId) === c.tableId) {
          violations.push(`${guestName(gId)} should avoid table but is seated there.`);
        }
      }
    }

    if (c.type === 'prefer_table' && c.tableId && guestIds.length > 0) {
      for (const gId of guestIds) {
        if (guestTableMap.get(gId) !== c.tableId) {
          violations.push(`${guestName(gId)} prefers a specific table but is seated elsewhere.`);
        }
      }
    }
  }

  // Score: start at 100, deduct per violation weighted by priority
  let deduction = 0;
  for (const v of violations) {
    // Find the constraint that generated this violation to get priority
    // Simple approach: each violation costs 10 points for soft, 20 for hard
    const relatedConstraint = constraints.find((c) =>
      c.description ? v.toLowerCase().includes(c.description.toLowerCase()) : false
    );
    deduction += relatedConstraint?.priority === 2 ? 20 : 10;
  }
  const score = Math.max(0, 100 - deduction);

  // Generate suggestions via LLM
  const suggestions: string[] = [];
  if (violations.length > 0) {
    const suggestionPrompt = `
You are a wedding seating assistant. The following constraint violations were detected:

${violations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

List 2-3 concrete, actionable suggestions to resolve these violations. Be brief and practical.
Return as a JSON array of strings, e.g. ["Move X to table Y", "Swap A and B"].
`.trim();

    try {
      const parsed = await geminiJson<string[]>(suggestionPrompt);
      if (Array.isArray(parsed)) suggestions.push(...parsed);
    } catch {
      // suggestions are best-effort
    }
  }

  return { score, violations, suggestions };
}

// ─────────────────────────────────────────────────────────────
// generateSeatingProposal
// Greedy algorithm: group must_sit_together guests, then fill
// tables. LLM writes the explanation.
// ─────────────────────────────────────────────────────────────

export async function generateSeatingProposal(
  tables: SeatingTable[],
  guests: Guest[],
  constraints: SeatingConstraint[]
): Promise<{ tables: SeatingTable[]; explanation: string }> {
  // Only seat attending guests
  const attending = guests.filter((g) => g.status === 'attending');

  // Build groups from must_sit_together constraints
  // Use Union-Find style grouping
  const parentMap = new Map<string, string>(); // guestId -> groupRootId
  const find = (id: string): string => {
    if (!parentMap.has(id)) parentMap.set(id, id);
    const parent = parentMap.get(id)!;
    if (parent !== id) {
      parentMap.set(id, find(parent));
    }
    return parentMap.get(id)!;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parentMap.set(ra, rb);
  };

  // Apply must_sit_together
  for (const c of constraints) {
    if (c.type === 'must_sit_together' && (c.guestIds?.length ?? 0) >= 2) {
      const ids = c.guestIds!;
      for (let i = 1; i < ids.length; i++) {
        union(ids[0], ids[i]);
      }
    }
  }

  // Group guests by their root
  const groups = new Map<string, Guest[]>();
  for (const g of attending) {
    const root = find(g.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(g);
  }

  // must_not_sit_together pairs (set of tableId exclusions applied after placement)
  const mustNotPairs = constraints
    .filter((c) => c.type === 'must_not_sit_together' && (c.guestIds?.length ?? 0) >= 2)
    .map((c) => c.guestIds!);

  // Clone tables to mutate
  const result: SeatingTable[] = tables.map((t) => ({
    ...t,
    seats: Array.from({ length: t.capacity }, (_, i) => ({
      id: `seat-${t.id}-${i + 1}`,
      tableId: t.id,
      seatNumber: i + 1,
      guestId: undefined,
      mealPreference: undefined,
    })),
  }));

  // Sort tables: non-reserved first, then by capacity desc
  const sortedTables = [...result].filter((t) => !t.isReserved).sort((a, b) => b.capacity - a.capacity);

  // Place groups into tables greedily
  const guestTableMap = new Map<string, string>(); // guestId -> tableId

  const placeGroup = (group: Guest[], preferTable?: SeatingTable): boolean => {
    const targets = preferTable ? [preferTable, ...sortedTables.filter((t) => t.id !== preferTable.id)] : sortedTables;
    for (const table of targets) {
      const emptySeats = table.seats!.filter((s) => !s.guestId);
      if (emptySeats.length < group.length) continue;

      // Check must_not_sit_together: none of group should share table with existing conflicting guests
      const tableGuestIds = table.seats!.filter((s) => s.guestId).map((s) => s.guestId!);
      let conflict = false;
      for (const pair of mustNotPairs) {
        const groupIds = group.map((g) => g.id);
        const hasGroupMember = groupIds.some((id) => pair.includes(id));
        const hasTableConflict = tableGuestIds.some((id) => pair.includes(id));
        if (hasGroupMember && hasTableConflict) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      // Assign seats
      let seatIdx = 0;
      for (const guest of group) {
        while (table.seats![seatIdx].guestId) seatIdx++;
        table.seats![seatIdx].guestId = guest.id;
        guestTableMap.set(guest.id, table.id);
        seatIdx++;
      }
      return true;
    }
    return false; // couldn't place
  };

  // Handle prefer_table constraints first
  const preferConstraints = constraints.filter((c) => c.type === 'prefer_table' && c.tableId);

  for (const c of preferConstraints) {
    const preferredTable = result.find((t) => t.id === c.tableId);
    for (const gId of c.guestIds ?? []) {
      const guest = attending.find((g) => g.id === gId);
      if (!guest || guestTableMap.has(gId)) continue;
      const root = find(gId);
      const group = groups.get(root) ?? [guest];
      placeGroup(group, preferredTable);
      // Mark all in group as placed
      for (const g of group) groups.delete(find(g.id));
    }
  }

  // Place remaining groups
  for (const [, group] of groups) {
    if (group.some((g) => guestTableMap.has(g.id))) continue; // already placed
    placeGroup(group);
  }

  // Generate LLM explanation
  const seatedCount = [...guestTableMap.keys()].length;
  const unseatedCount = attending.length - seatedCount;
  const violationsResult = await scoreSeatingArrangement(result, guests, constraints);

  const explanationPrompt = `
You are a warm, professional wedding planner assistant. Briefly explain the seating arrangement you just created for a wedding.

Facts:
- ${attending.length} attending guests
- ${result.filter((t) => !t.isReserved).length} tables available
- ${seatedCount} guests successfully seated
- ${unseatedCount} guests could not be seated (capacity issue)
- Constraint score: ${violationsResult.score}/100
- Violations: ${violationsResult.violations.length === 0 ? 'none' : violationsResult.violations.join('; ')}

Write 2-3 warm, helpful sentences summarizing what was done and any next steps.
`.trim();

  let explanation = '';
  try {
    explanation = await geminiText(explanationPrompt);
  } catch {
    explanation = `Seated ${seatedCount} of ${attending.length} guests across ${result.length} tables with a constraint score of ${violationsResult.score}/100.`;
  }

  return { tables: result, explanation };
}

// ─────────────────────────────────────────────────────────────
// normalizeRegistryFromUrl
// Use Gemini to parse / infer registry items from a store URL.
// In production this would be paired with a real scraper;
// here we ask the AI to do its best from the URL alone.
// ─────────────────────────────────────────────────────────────

export async function normalizeRegistryFromUrl(
  url: string,
  storeName: string
): Promise<RegistryItem[]> {
  const prompt = `
You are a wedding registry assistant. A couple has linked their ${storeName} registry at:
${url}

Since you cannot browse the web, generate 5 representative, realistic registry items a couple might have on a ${storeName} registry. These should feel genuine and varied in price.

Return a JSON array of objects with this shape:
[
  {
    "sourceId": "",
    "name": "<item name>",
    "price": <number or null>,
    "imageUrl": null,
    "itemUrl": "${url}",
    "category": "<category>",
    "priority": "want",
    "purchased": false,
    "notes": null
  }
]

Return only valid JSON, no markdown.
`.trim();

  try {
    const items = await geminiJson<Omit<RegistryItem, 'id'>[]>(prompt);
    if (!Array.isArray(items)) return [];
    // Assign placeholder ids so callers can handle them before persistence
    return items.map((item, i) => ({
      ...item,
      id: `temp-${i}`,
      sourceId: item.sourceId ?? '',
      priority: (['need', 'want', 'dream'].includes(item.priority) ? item.priority : 'want') as RegistryItem['priority'],
      purchased: item.purchased ?? false,
    }));
  } catch {
    return [];
  }
}
