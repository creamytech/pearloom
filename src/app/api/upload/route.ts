// ─────────────────────────────────────────────────────────────
// Pearloom / api/upload/route.ts
// Server-side file upload to Supabase Storage.
// Uses the service role key to bypass RLS — anon key cannot
// write to storage without custom policies.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'photos';
const MAX_SIZE_MB = 20;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uuid = Math.random().toString(36).substring(2, 15);
    const filename = `${Date.now()}_${uuid}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      console.error('[upload] Supabase storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    return NextResponse.json({
      filename,
      publicUrl,
      originalName: file.name,
      mimeType: file.type,
    });
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
