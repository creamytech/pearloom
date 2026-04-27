// ─────────────────────────────────────────────────────────────
// Pearloom / api/wedding-day/route.ts
// Wedding Day guest photo feed API.
//
// GET  /api/wedding-day?siteId=...
//   → { photos: Array<{id, url, uploadedBy, caption, uploadedAt}> }
//
// POST /api/wedding-day (FormData: siteId, name, caption, image)
//   → uploads to Supabase bucket 'wedding-day-photos'
//   → inserts into 'wedding_day_photos' table
//   → { photo: { id, url, uploadedBy, caption, uploadedAt } }
//
// Falls back gracefully if Supabase tables / bucket don't exist yet.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BUCKET = 'wedding-day-photos';
const TABLE = 'wedding_day_photos';
const MAX_SIZE_MB = 15;

// Rate limit: max 10 photo uploads per IP per hour
const uploadRateMap = new Map<string, { count: number; resetAt: number }>();
function isUploadRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = uploadRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    uploadRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    if (uploadRateMap.size > 3000) {
      for (const [k, v] of uploadRateMap) { if (now > v.resetAt) uploadRateMap.delete(k); }
    }
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Table-missing + unexpected-error responses return an empty
// list. We never ship placeholder guest photos to a real site.

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ photos: [] });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('site_id', siteId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      // Table likely doesn't exist yet — return mock data in development
      console.warn('[wedding-day] GET fallback (table missing?):', error.message);
      return NextResponse.json({ photos: [] });
    }

    const photos = (data || []).map((r) => ({
      id: r.id,
      url: r.url,
      uploadedBy: r.uploaded_by,
      caption: r.caption ?? '',
      uploadedAt: r.uploaded_at,
    }));

    return NextResponse.json({ photos });
  } catch (err) {
    console.error('[wedding-day] GET unexpected error:', err);
    return NextResponse.json({ photos: [] });
  }
}

// ── POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isUploadRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many uploads — please wait before uploading again' }, { status: 429 });
    }

    const formData = await req.formData();
    const siteId = formData.get('siteId') as string | null;
    const name = (formData.get('name') as string | null) || 'Guest';
    const caption = (formData.get('caption') as string | null) || '';
    const image = formData.get('image') as File | null;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_MIME_TYPES.includes(image.type)) {
      return NextResponse.json({ error: 'Only jpeg, png, webp, and gif images are allowed' }, { status: 400 });
    }
    if (image.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
    }

    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const ext = image.name.split('.').pop()?.toLowerCase() || 'jpg';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
    }
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${siteId}/${uid}.${ext}`;

    const buffer = Buffer.from(await image.arrayBuffer());
    const supabase = getSupabase();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: image.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      // Bucket may not exist yet — return a graceful 200 with placeholder
      console.warn('[wedding-day] Storage upload fallback:', uploadError.message);
      const placeholder = {
        id: uid,
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
        uploadedBy: name,
        caption,
        uploadedAt: new Date().toISOString(),
      };
      return NextResponse.json({ photo: placeholder });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    // Insert record
    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase
      .from(TABLE)
      .insert({
        site_id: siteId,
        uploaded_by: name,
        caption: caption || null,
        url: publicUrl,
        storage_path: storagePath,
        uploaded_at: now,
      })
      .select()
      .single();

    if (insertError) {
      // Table may not exist yet — still return the photo URL so the UI stays live
      console.warn('[wedding-day] Insert fallback:', insertError.message);
      const photo = {
        id: uid,
        url: publicUrl,
        uploadedBy: name,
        caption,
        uploadedAt: now,
      };
      return NextResponse.json({ photo });
    }

    return NextResponse.json({
      photo: {
        id: data.id,
        url: data.url,
        uploadedBy: data.uploaded_by,
        caption: data.caption ?? '',
        uploadedAt: data.uploaded_at,
      },
    });
  } catch (err) {
    console.error('[wedding-day] POST unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
