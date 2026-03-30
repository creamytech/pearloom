// ─────────────────────────────────────────────────────────────
// Pearloom / api/gallery/route.ts — Guest photo gallery
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET = 'photos';
const MAX_SIZE_MB = 10;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ photos: [] });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[gallery] GET error:', error);
    return NextResponse.json({ error: 'Failed to load gallery', photos: [] }, { status: 500 });
  }

  const photos = (data || []).map((r) => ({
    id: r.id,
    url: r.public_url,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ photos });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Guest';
    const siteId = formData.get('siteId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only jpeg, png, webp, and gif images are allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uuid = Math.random().toString(36).substring(2, 15);
    const storagePath = `gallery/${siteId}/${Date.now()}_${uuid}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabase();

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[gallery] Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    // Save record to gallery_photos table
    const { data, error: insertError } = await supabase
      .from('gallery_photos')
      .insert({
        site_id: siteId,
        uploaded_by: uploadedBy,
        storage_path: storagePath,
        public_url: publicUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[gallery] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 });
    }

    return NextResponse.json({
      photo: {
        id: data.id,
        url: data.public_url,
        uploadedBy: data.uploaded_by,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('[gallery] Unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
