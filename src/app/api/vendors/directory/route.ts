// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendors/directory/route.ts
//
// Public read of the curated vendor directory. Filterable by
// category / region / palette / vibe / free-text. Returns active
// vendors only. Used by /vendors page.
//
// Distinct from /api/vendors which is host-private (per-site
// shortlist + custom vendor entries).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ vendors: [] });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const region = searchParams.get('region');
  const palette = searchParams.get('palette');
  const vibe = searchParams.get('vibe');
  const q = searchParams.get('q')?.toLowerCase().trim();

  let query = sb
    .from('vendors')
    .select('*')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('rating', { ascending: false })
    .limit(60);
  if (category) query = query.eq('category', category);
  if (region) query = query.eq('region', region);
  if (palette) query = query.contains('palettes', [palette]);
  if (vibe) query = query.contains('vibes', [vibe]);

  const { data, error } = await query;
  if (error) {
    console.warn('[vendors/directory GET]', error.message);
    return NextResponse.json({ vendors: [] });
  }

  let vendors = data ?? [];
  if (q && q.length >= 2) {
    vendors = vendors.filter((v: { name: string; description?: string }) =>
      v.name.toLowerCase().includes(q) || (v.description ?? '').toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ vendors });
}
