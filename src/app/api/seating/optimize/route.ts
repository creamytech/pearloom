// ─────────────────────────────────────────────────────────────
// Pearloom / api/seating/optimize/route.ts
// AI Auto-Seating Optimizer — uses Gemini Flash to arrange
// guests across tables based on relationships and sides.
// POST { subdomain, coupleNames, vibeString? }
// Returns { assignments: [{ guestName, tableName }], tablesUpdated: N }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status}`);
  }
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  // Strip any markdown code fences
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

interface TableRow {
  id: string;
  label: string;
  capacity: number;
  shape: string;
  seats?: Array<{ id: string; guest_id?: string | null; seat_number: number }>;
}

interface GuestRow {
  id: string;
  name: string;
  status: string;
}

interface RelationshipNode {
  id: string;
  name: string;
  side: string;
  relationshipType: string;
  relationshipLabel: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let body: { subdomain: string; coupleNames: [string, string]; vibeString?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subdomain, coupleNames, vibeString } = body;

  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
  }
  if (!coupleNames || coupleNames.length < 2) {
    return NextResponse.json({ error: 'coupleNames is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'No seating data — add tables and guests first' }, { status: 400 });
  }

  // ── 1. Fetch tables + seats ────────────────────────────────────
  const { data: tablesData, error: tablesError } = await supabase
    .from('seating_tables')
    .select('id, label, capacity, shape, seats(*)')
    .eq('site_id', subdomain)
    .order('created_at', { ascending: true });

  if (tablesError || !tablesData || tablesData.length === 0) {
    return NextResponse.json({ error: 'No seating data — add tables and guests first' }, { status: 400 });
  }

  // ── 2. Fetch attending guests ──────────────────────────────────
  const { data: guestsData, error: guestsError } = await supabase
    .from('guests')
    .select('id, name, status')
    .eq('site_id', subdomain);

  if (guestsError || !guestsData || guestsData.length === 0) {
    return NextResponse.json({ error: 'No seating data — add tables and guests first' }, { status: 400 });
  }

  const attendingGuests: GuestRow[] = (guestsData as GuestRow[]).filter(g => g.status === 'attending');

  if (attendingGuests.length === 0) {
    return NextResponse.json({ error: 'No confirmed attending guests found' }, { status: 400 });
  }

  // ── 3. Fetch relationship graph ───────────────────────────────
  let relationships: RelationshipNode[] = [];
  try {
    const { data: relData } = await supabase
      .from('relationship_nodes')
      .select('id, guest_name, side, relationship_type, relationship_label')
      .eq('site_id', subdomain);

    if (relData && relData.length > 0) {
      relationships = relData.map((r: Record<string, string>) => ({
        id: r.id,
        name: r.guest_name,
        side: r.side,
        relationshipType: r.relationship_type,
        relationshipLabel: r.relationship_label,
      }));
    }
  } catch {
    // Relationship graph is optional
  }

  const tables = tablesData as unknown as TableRow[];
  const [name1, name2] = coupleNames;

  // ── 4. Build Gemini prompt ────────────────────────────────────
  const tablesForPrompt = tables.map(t => ({
    name: t.label,
    capacity: t.capacity,
    shape: t.shape,
  }));

  const guestsForPrompt = attendingGuests.map(g => {
    const rel = relationships.find(r => r.name.toLowerCase() === g.name.toLowerCase());
    return {
      name: g.name,
      side: rel?.side ?? 'unknown',
      relationship: rel?.relationshipLabel ?? 'guest',
    };
  });

  const prompt = `You are seating ${attendingGuests.length} guests across ${tables.length} tables for ${name1} & ${name2}'s wedding.${vibeString ? ` Vibe: ${vibeString}.` : ''}

Tables: ${JSON.stringify(tablesForPrompt)}
Guests: ${JSON.stringify(guestsForPrompt)}
${relationships.length > 0 ? `Known relationships: ${JSON.stringify(relationships.slice(0, 40))}` : ''}

Rules:
- Keep family members of same side together when possible
- Don't seat exes or conflicting relationships near each other
- Balance partner1 vs partner2 sides across tables
- Keep couples/parties together
- Maximize table capacity usage (don't leave single gaps)
- Every attending guest must be assigned exactly one table
- Do not exceed any table's capacity

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{ "assignments": [{ "guestName": string, "tableName": string }] }`;

  // ── 5. Call Gemini ────────────────────────────────────────────
  let assignments: Array<{ guestName: string; tableName: string }> = [];
  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = JSON.parse(raw) as { assignments: typeof assignments };
    assignments = parsed.assignments || [];
  } catch (err) {
    console.error('[api/seating/optimize] Gemini parse error:', err);
    return NextResponse.json({ error: 'AI failed to generate a valid seating arrangement' }, { status: 500 });
  }

  if (assignments.length === 0) {
    return NextResponse.json({ error: 'AI returned no assignments' }, { status: 500 });
  }

  // ── 6. Apply assignments to seats in Supabase ─────────────────
  // Build lookup maps
  const tableByName = new Map<string, TableRow>();
  for (const t of tables) {
    tableByName.set(t.label.toLowerCase(), t);
  }

  const guestByName = new Map<string, GuestRow>();
  for (const g of attendingGuests) {
    guestByName.set(g.name.toLowerCase(), g);
  }

  // First clear all existing seat assignments for these tables
  const tableIds = tables.map(t => t.id);
  await supabase
    .from('seats')
    .update({ guest_id: null })
    .in('table_id', tableIds);

  // Track which seat index to use per table
  const tableNextSeat = new Map<string, number>();

  let tablesUpdated = 0;
  const appliedAssignments: typeof assignments = [];

  for (const assignment of assignments) {
    const table = tableByName.get(assignment.tableName.toLowerCase());
    const guest = guestByName.get(assignment.guestName.toLowerCase());

    if (!table || !guest) continue;

    const seats = (table.seats || []).sort((a, b) => a.seat_number - b.seat_number);
    const nextIdx = tableNextSeat.get(table.id) ?? 0;

    if (nextIdx >= seats.length) continue; // Table full

    const seat = seats[nextIdx];
    tableNextSeat.set(table.id, nextIdx + 1);

    const { error: updateError } = await supabase
      .from('seats')
      .update({ guest_id: guest.id })
      .eq('id', seat.id);

    if (!updateError) {
      appliedAssignments.push(assignment);
      tablesUpdated++;
    }
  }

  return NextResponse.json({
    assignments: appliedAssignments,
    tablesUpdated: new Set(appliedAssignments.map(a => a.tableName)).size,
  });
}
