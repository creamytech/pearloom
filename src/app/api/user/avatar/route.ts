// ─────────────────────────────────────────────────────────────
// Pearloom / api/user/avatar — the profile photograph
// (ONBOARDING-PLAN O1, the mark system).
//
// POST  multipart { file } → normalize with sharp (rotate() bakes
//       the EXIF orientation and re-encoding drops ALL metadata —
//       GPS included; the client's canvas crop already stripped it
//       once, this is the server's own guarantee), resize to a
//       512px square, upload to R2, save user_preferences
//       .avatar_url. Returns { ok, url }.
// DELETE → clears avatar_url (the photo file is left in R2 —
//       orphaned objects are cheap; a lifecycle rule can reap them).
//
// Requires migration 20260708_avatar_url (avatar_url on
// user_preferences). Until it's applied the route answers 503
// with a calm message rather than corrupting the prefs row.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { uploadToR2 } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB in; ~50KB out after resize
const OUT_SIZE = 512;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function saveAvatarUrl(email: string, url: string | null): Promise<boolean> {
  try {
    const client = sb();
    const { data: existing } = await client
      .from('user_preferences')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      const { error } = await client.from('user_preferences').update({ avatar_url: url }).eq('email', email);
      return !error;
    }
    // First-touch row — minimal insert; the preferences GET fills
    // display defaults for any column the row doesn't carry yet.
    const { error } = await client.from('user_preferences').insert({ email, avatar_url: url });
    return !error;
  } catch (err) {
    console.error('[user/avatar] save failed:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  if (!checkRateLimit(`avatar:${email}:${ip}`, { max: 10, windowMs: 60 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many uploads — try again in an hour' }, { status: 429 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a file upload' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ ok: false, error: 'Expected a file upload' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'Photo is too large (8MB max)' }, { status: 400 });
  }
  if (!/^image\//.test(file.type)) {
    return NextResponse.json({ ok: false, error: 'That doesn’t look like a photo' }, { status: 400 });
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const jpeg = await sharp(input)
      .rotate() // bake EXIF orientation; re-encode drops metadata
      .resize(OUT_SIZE, OUT_SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 88 })
      .toBuffer();

    /* Key: a stable per-account prefix (hashed — never the raw email
       in a public URL) + a timestamp so a new upload never fights the
       CDN cache of the old one. */
    const who = createHash('sha256').update(email).digest('hex').slice(0, 20);
    const key = `avatars/${who}/${Date.now()}.jpg`;
    const url = await uploadToR2(key, jpeg, 'image/jpeg');

    const saved = await saveAvatarUrl(email, url);
    if (!saved) {
      return NextResponse.json(
        { ok: false, error: 'Could not save your photo — try again shortly' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error('[user/avatar] upload failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not process that photo' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const saved = await saveAvatarUrl(email, null);
  return saved
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: 'Could not update' }, { status: 503 });
}
