// ─────────────────────────────────────────────────────────────
// Pearloom / api/relationships/infer/route.ts
//
// POST { siteId } — uses Claude Sonnet to read the site's
// chapters + guest list and propose a relationship graph
// (who is best-friends with whom, who is family, who has a
// story worth telling at the reception). Returns the
// proposed edges — the user confirms before persistence.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { generateJson, cached } from '@/lib/claude';
import { listGuests } from '@/lib/event-os/db';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

interface InferredEdge {
  fromName: string;
  toName: string;
  kind: string;
  closeness: number;
  story: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { siteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const siteId = body.siteId;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data: site } = await sb()
    .from('sites')
    .select('id, site_config')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const manifest = (site.site_config as { manifest?: StoryManifest }).manifest;
  if (!manifest) return NextResponse.json({ error: 'Site has no manifest' }, { status: 400 });

  const guests = await listGuests(siteId);
  if (guests.length < 2) {
    return NextResponse.json({ edges: [] });
  }

  const chaptersSummary = (manifest.chapters ?? []).slice(0, 10).map((c) => ({
    title: c.title,
    description: c.description?.slice(0, 400),
  }));

  try {
    const result = await generateJson<{ edges: InferredEdge[] }>({
      tier: 'sonnet',
      temperature: 0.5,
      maxTokens: 1800,
      system: cached(
        `You are Pearloom's relationship graph analyst. You read event stories + guest lists and surface the meaningful connections: best friends since childhood, long-distance siblings, the coworker who introduced them, etc. Only emit edges you can ground in the text.`,
        '1h'
      ) as unknown as string,
      messages: [
        {
          role: 'user',
          content: `SITE CHAPTERS:
${JSON.stringify(chaptersSummary)}

GUESTS (names are canonical — match them exactly in your output):
${JSON.stringify(guests.map((g) => ({
  name: g.display_name,
  relationship: g.relationship_to_host,
  side: g.side,
  city: g.home_city,
})))}

Produce up to 30 inferred relationship edges. Each edge:
- fromName and toName must match a guest name exactly
- kind: one of "family", "close_friend", "friend", "coworker", "mentor", "neighbor", "bridal_party", "groomsman", "other"
- closeness: 1 (acquaintance) to 5 (chosen family)
- story: one sentence grounding this edge in the chapters or their stated relationship; if inferred indirectly, say so

Bias toward high-signal edges. Skip edges you cannot justify.`,
        },
      ],
      schemaName: 'emit_relationship_edges',
      schema: {
        type: 'object',
        properties: {
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fromName: { type: 'string' },
                toName: { type: 'string' },
                kind: { type: 'string' },
                closeness: { type: 'number' },
                story: { type: 'string' },
              },
              required: ['fromName', 'toName', 'kind', 'closeness', 'story'],
            },
          },
        },
        required: ['edges'],
      },
    });

    // Map names back to guest IDs
    const nameIndex = new Map(guests.map((g) => [g.display_name.toLowerCase(), g.id]));
    const hydrated = (result.edges ?? [])
      .map((e) => ({
        ...e,
        fromGuestId: nameIndex.get(e.fromName.toLowerCase()) ?? null,
        toGuestId: nameIndex.get(e.toName.toLowerCase()) ?? null,
      }))
      .filter((e) => e.fromGuestId && e.toGuestId && e.fromGuestId !== e.toGuestId);

    return NextResponse.json({ edges: hydrated });
  } catch (err) {
    console.error('[relationships/infer] failed', err);
    return NextResponse.json(
      { error: 'Failed to infer relationships', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
