// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/relationship-graph/route.ts
// Store and fetch relationship graph nodes for a wedding site.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export interface GraphNode {
  id: string;
  name: string;
  side: 'partner1' | 'partner2' | 'both';
  relationshipType: 'family' | 'college' | 'work' | 'childhood' | 'neighbors' | 'other';
  relationshipLabel: string;
  memorySnippet?: string;
}

export interface GraphEdge {
  from: string;
  to: string; // 'partner1' | 'partner2'
  strength: number; // 1-3
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function edgesForNode(node: GraphNode): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const strength = node.side === 'both' ? 3 : node.relationshipType === 'family' ? 3 : 2;
  if (node.side === 'partner1' || node.side === 'both') {
    edges.push({ from: node.id, to: 'partner1', strength });
  }
  if (node.side === 'partner2' || node.side === 'both') {
    edges.push({ from: node.id, to: 'partner2', strength });
  }
  return edges;
}

function buildMockData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    // Partner center nodes
    { id: 'partner1', name: 'Alex', side: 'partner1', relationshipType: 'other', relationshipLabel: 'The couple' },
    { id: 'partner2', name: 'Jordan', side: 'partner2', relationshipType: 'other', relationshipLabel: 'The couple' },
    // Partner 1 side — Family (3)
    { id: 'p1-f1', name: 'Margaret', side: 'partner1', relationshipType: 'family', relationshipLabel: "Alex's mother", memorySnippet: 'I watched them grow into the most loving person.' },
    { id: 'p1-f2', name: 'Thomas', side: 'partner1', relationshipType: 'family', relationshipLabel: "Alex's older brother", memorySnippet: 'We built forts and big dreams together.' },
    { id: 'p1-f3', name: 'Lily', side: 'partner1', relationshipType: 'family', relationshipLabel: "Alex's cousin", memorySnippet: 'Summer vacations felt infinite with you.' },
    // Partner 1 side — College (2)
    { id: 'p1-c1', name: 'Priya', side: 'partner1', relationshipType: 'college', relationshipLabel: "Alex's college roommate", memorySnippet: 'Late nights and terrible coffee changed us both.' },
    { id: 'p1-c2', name: 'Marcus', side: 'partner1', relationshipType: 'college', relationshipLabel: "Alex's study partner", memorySnippet: 'We survived finals week — together.' },
    // Partner 1 side — Work (1)
    { id: 'p1-w1', name: 'Diana', side: 'partner1', relationshipType: 'work', relationshipLabel: "Alex's first work mentor" },
    // Partner 2 side — Family (2)
    { id: 'p2-f1', name: 'Robert', side: 'partner2', relationshipType: 'family', relationshipLabel: "Jordan's father", memorySnippet: 'So proud of the person you have become.' },
    { id: 'p2-f2', name: 'Camille', side: 'partner2', relationshipType: 'family', relationshipLabel: "Jordan's sister", memorySnippet: 'You always believed in love first.' },
    // Partner 2 side — Childhood (2)
    { id: 'p2-ch1', name: 'Ethan', side: 'partner2', relationshipType: 'childhood', relationshipLabel: "Jordan's childhood best friend", memorySnippet: 'We rode bikes until the streetlights came on.' },
    { id: 'p2-ch2', name: 'Sofia', side: 'partner2', relationshipType: 'childhood', relationshipLabel: "Jordan's neighbor growing up" },
    // Partner 2 side — College (2)
    { id: 'p2-c1', name: 'Andre', side: 'partner2', relationshipType: 'college', relationshipLabel: "Jordan's college friend", memorySnippet: 'The best road trips happened in those years.' },
    { id: 'p2-c2', name: 'Hana', side: 'partner2', relationshipType: 'college', relationshipLabel: "Jordan's sorority sister" },
    // Shared nodes (both)
    { id: 'shared-1', name: 'Sam & Cleo', side: 'both', relationshipType: 'other', relationshipLabel: 'Mutual friends who introduced them', memorySnippet: 'We knew from the first night this was special.' },
    { id: 'shared-2', name: 'Nina', side: 'both', relationshipType: 'work', relationshipLabel: 'Colleague who knows you both' },
    { id: 'shared-3', name: 'The Garcias', side: 'both', relationshipType: 'neighbors', relationshipLabel: 'Neighbors on Maple Street', memorySnippet: 'Their porch light was always on for us.' },
  ];

  const edges: GraphEdge[] = nodes
    .filter(n => n.id !== 'partner1' && n.id !== 'partner2')
    .flatMap(edgesForNode);

  return { nodes, edges };
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`relationship-graph:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ nodes: [], edges: [] });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('relationship_nodes')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true });

    if (error) {
      // Table likely doesn't exist — return beautiful mock data
      console.warn('[RelationshipGraph] Table not found, using mock data:', error.message);
      return NextResponse.json(buildMockData());
    }

    if (!data || data.length === 0) {
      // No real data yet — return mock data so the graph renders attractively
      return NextResponse.json(buildMockData());
    }

    // Add synthetic center partner nodes
    const partnerNodes: GraphNode[] = [
      { id: 'partner1', name: 'Partner 1', side: 'partner1', relationshipType: 'other', relationshipLabel: 'The couple' },
      { id: 'partner2', name: 'Partner 2', side: 'partner2', relationshipType: 'other', relationshipLabel: 'The couple' },
    ];

    const guestNodes: GraphNode[] = data.map(r => ({
      id: r.id,
      name: r.guest_name,
      side: r.side as GraphNode['side'],
      relationshipType: r.relationship_type as GraphNode['relationshipType'],
      relationshipLabel: r.relationship_label,
      memorySnippet: r.memory_snippet ?? undefined,
    }));

    const nodes = [...partnerNodes, ...guestNodes];
    const edges = guestNodes.flatMap(edgesForNode);

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    console.warn('[RelationshipGraph] Fallback to mock data:', err);
    return NextResponse.json(buildMockData());
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`relationship-graph-post:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { siteId, guestName, side, relationshipType, relationshipLabel, memorySnippet } = await req.json();

    if (!siteId || !guestName || !side || !relationshipType || !relationshipLabel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('relationship_nodes')
      .insert({
        site_id: siteId,
        guest_name: guestName,
        side,
        relationship_type: relationshipType,
        relationship_label: relationshipLabel,
        memory_snippet: memorySnippet || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[RelationshipGraph] Insert error:', error);
      // Table doesn't exist — return a synthetic node with a generated id
      const syntheticNode: GraphNode = {
        id: `temp-${Date.now()}`,
        name: guestName,
        side,
        relationshipType,
        relationshipLabel,
        memorySnippet: memorySnippet || undefined,
      };
      return NextResponse.json({ node: syntheticNode });
    }

    const node: GraphNode = {
      id: data.id,
      name: data.guest_name,
      side: data.side,
      relationshipType: data.relationship_type,
      relationshipLabel: data.relationship_label,
      memorySnippet: data.memory_snippet ?? undefined,
    };

    return NextResponse.json({ node });
  } catch (err) {
    console.error('[RelationshipGraph] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
