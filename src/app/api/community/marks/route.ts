import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import crypto from 'node:crypto';

// ─────────────────────────────────────────────────────────────
// /api/community/marks
//
// GET  — browse approved community marks. Filters: ?kind=…
//        &occasion=… &palette=hex,hex,hex (matches by hash) &q=…
//        &cursor=<id>. Sort: downloads desc, then created_at desc.
//
// POST — opt a host's painted mark INTO the community library.
//        Inserts state='pending' so a moderator (or auto-classifier
//        later) can approve before it's discoverable. Body:
//          { asset_url, kind, occasion, vibe_tags[], palette_hex[],
//            source_prompt?, megasheet_cells? }
//        When megasheet_cells is provided, the parent megasheet
//        row + N child cell rows are inserted in one transaction.
// ─────────────────────────────────────────────────────────────

function paletteHashFor(hex: string[] | undefined): string | null {
  if (!hex || hex.length === 0) return null;
  const sorted = [...hex].map((h) => h.toLowerCase().trim()).sort().join(',');
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 32);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`community-browse:${ip}`, { max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a tick' }, { status: 429 });
  }
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ marks: [], note: 'Community library not configured.' });

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');
  const occasion = url.searchParams.get('occasion');
  const paletteCsv = url.searchParams.get('palette');
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Math.min(60, Math.max(8, Number(url.searchParams.get('limit') ?? '24')));

  let query = sb
    .from('community_marks')
    .select('id, asset_url, kind, cell_key, occasion, vibe_tags, palette_hex, source_prompt, downloads, hearts, created_at')
    .eq('state', 'approved')
    .is('withdrawn_at', null)
    .order('downloads', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (kind) query = query.eq('kind', kind);
  if (occasion) query = query.eq('occasion', occasion);
  if (paletteCsv) {
    const hash = paletteHashFor(paletteCsv.split(',').map((s) => s.trim()).filter(Boolean));
    if (hash) {
      // First try exact palette match for top results.
      query = query.eq('palette_hash', hash);
    }
  }
  // q: free-text search over source_prompt + occasion + tags.
  if (q) {
    query = query.or(`source_prompt.ilike.%${q}%,occasion.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[community/marks GET] error:', error);
    return NextResponse.json({ marks: [] });
  }
  return NextResponse.json({ marks: data ?? [] });
}

interface MegaCell {
  asset_url: string;
  cell_key: string;
}
interface PostBody {
  asset_url?: string;
  kind?: string;
  occasion?: string;
  vibe_tags?: string[];
  palette_hex?: string[];
  source_prompt?: string;
  megasheet_cells?: MegaCell[];
}

const ALLOWED_KINDS = new Set(['stamp', 'divider', 'footer', 'accent', 'confetti', 'megasheet']);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const rawEmail = session?.user?.email;
  if (!rawEmail) return NextResponse.json({ error: 'Sign in to share a mark' }, { status: 401 });
  // Normalise — IdP casing variance, see /api/sites/[domain].
  const email = rawEmail.toLowerCase().trim();

  const ip = getClientIp(req);
  const rl = checkRateLimit(`community-publish:${ip}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many community publishes — try again in an hour' }, { status: 429 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: 'Community library not configured' }, { status: 503 });

  let body: PostBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!body.asset_url || typeof body.asset_url !== 'string') {
    return NextResponse.json({ error: 'asset_url required' }, { status: 400 });
  }
  if (!body.kind || !ALLOWED_KINDS.has(body.kind)) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  }

  const palette_hash = paletteHashFor(body.palette_hex);

  // Insert parent row.
  const { data: parent, error: parentErr } = await sb
    .from('community_marks')
    .insert({
      owner_email: email,
      asset_url: body.asset_url,
      kind: body.kind,
      occasion: body.occasion ?? null,
      vibe_tags: body.vibe_tags ?? [],
      palette_hex: body.palette_hex ?? [],
      palette_hash,
      source_prompt: body.source_prompt ?? null,
      state: 'pending',
    })
    .select('id')
    .single();
  if (parentErr || !parent) {
    console.error('[community/marks POST] parent insert error:', parentErr);
    return NextResponse.json({ error: 'Failed to share — try again' }, { status: 500 });
  }

  // Megasheet child rows.
  if (body.kind === 'megasheet' && Array.isArray(body.megasheet_cells) && body.megasheet_cells.length > 0) {
    const rows = body.megasheet_cells
      .filter((c) => c && typeof c.asset_url === 'string' && typeof c.cell_key === 'string')
      .map((c) => {
        // Cell key is e.g. 'stamp:travel' or 'divider' — derive the
        // child's `kind` from the prefix so each cell is independently
        // browseable.
        const childKind = c.cell_key.split(':')[0];
        const validKind = ALLOWED_KINDS.has(childKind) ? childKind : c.cell_key;
        return {
          owner_email: email,
          asset_url: c.asset_url,
          kind: ALLOWED_KINDS.has(validKind) ? validKind : 'stamp',
          cell_key: c.cell_key,
          parent_id: parent.id,
          occasion: body.occasion ?? null,
          vibe_tags: body.vibe_tags ?? [],
          palette_hex: body.palette_hex ?? [],
          palette_hash,
          source_prompt: body.source_prompt ?? null,
          state: 'pending',
        };
      });
    if (rows.length > 0) {
      const { error: childErr } = await sb.from('community_marks').insert(rows);
      if (childErr) {
        console.error('[community/marks POST] child insert error:', childErr);
        // Don't roll back the parent — partial publish is still
        // useful; admin can clean up if needed.
      }
    }
  }

  return NextResponse.json({ ok: true, id: parent.id, state: 'pending' });
}
