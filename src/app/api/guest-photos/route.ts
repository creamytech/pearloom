// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-photos/route.ts
// Guest photo upload + public retrieval for the Photo Wall feature.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { addGuestPhoto, getGuestPhotos } from '@/lib/db';
import { encryptBuffer, isEncryptionEnabled } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

const MAX_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  const photos = await getGuestPhotos(siteId, 'approved');
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 uploads per hour per IP
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`guest-photos:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads — please wait a while and try again.' },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('siteId') as string | null;
    const uploaderName = formData.get('uploaderName') as string | null;
    const caption = formData.get('caption') as string | null;
    // Optional guest token from /sites/[domain]/upload?t=<token>.
    // When present, we look up the pearloom_guests row and stamp
    // guest_id on the photo so /g/[token] can surface it as "your
    // contribution." Bad tokens fall through silently — the
    // upload still works, attribution just doesn't link.
    const guestToken = formData.get('guestToken') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }
    if (!uploaderName?.trim()) {
      return NextResponse.json({ error: 'uploaderName is required' }, { status: 400 });
    }

    // iOS can report HEIC with empty or generic MIME — accept by extension fallback
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json({ error: 'Only jpeg, png, webp, gif, and heic images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
    }

    // Host gates, enforced server-side (the /sites/[domain]/upload
    // page checks the same flags). Both fail OPEN on lookup errors so
    // a DB blip never blocks guests mid-reception:
    //   • guestUploads !== false — the "Guest uploads" switch.
    //   • rsvpConfig.guestListOnly — when on, only people already on
    //     the guest list (resolved via their personal token) may post.
    //     This is the same invitation gate the RSVP route enforces;
    //     it keeps a public site from becoming an open photo dump.
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient } = await import('@supabase/supabase-js');
        const gateDb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
        const { data: siteRow } = await gateDb
          .from('sites')
          .select('id, ai_manifest')
          .eq('subdomain', siteId)
          .maybeSingle();
        const manifest = siteRow?.ai_manifest as
          | { guestUploads?: boolean; rsvpConfig?: { guestListOnly?: boolean } }
          | null;
        const uploadsOpen = (manifest?.guestUploads) !== false;
        if (siteRow && !uploadsOpen) {
          return NextResponse.json(
            { error: 'The hosts have closed photo uploads for this celebration.' },
            { status: 403 },
          );
        }
        // Invitation-only: require a token that resolves to a guest
        // ON this site. No valid token → warm 403, same copy shape as
        // the RSVP gate.
        if (siteRow && manifest?.rsvpConfig?.guestListOnly) {
          const { resolveGuestToken } = await import('@/lib/people');
          const resolved = guestToken ? await resolveGuestToken(gateDb, guestToken) : null;
          const onList = !!resolved && String(resolved.siteId) === String((siteRow as { id: string }).id);
          if (!onList) {
            return NextResponse.json(
              {
                error: 'This celebration is sharing photos by invitation — please open your personal invite link to add yours. If you can’t find it, reach out to your hosts.',
                guestListOnly: true,
              },
              { status: 403 },
            );
          }
        }
      }
    } catch (gateErr) {
      console.warn('[guest-photos] uploads gate failed (failing open):', gateErr);
    }

    let ext = rawExt || 'jpg';
    if (ext === 'heic' || ext === 'heif') ext = 'jpg';

    const uuid = Math.random().toString(36).substring(2, 15);
    const filename = `guest-photos/${Date.now()}_${uuid}.${ext}`;

    const plaintext = Buffer.from(await file.arrayBuffer());

    // ── NSFW screen ──────────────────────────────────────────────
    // Before the photo ever touches storage or the host's queue, run
    // it past automated moderation. Confident sexual/explicit content
    // is rejected outright; everything else flows on to the normal
    // pending → host-approves path. Fails open (no key / API blip) so
    // the host queue stays the backstop.
    try {
      const { moderateImageBuffer } = await import('@/lib/moderation/image-moderation');
      const verdict = await moderateImageBuffer(plaintext, file.type || 'image/jpeg');
      if (!verdict.allowed) {
        console.warn(`[guest-photos] rejected by moderation (${verdict.reason ?? 'explicit'}) for site ${siteId}`);
        return NextResponse.json(
          { error: 'That photo can’t be shared here. Please choose a different one.' },
          { status: 422 },
        );
      }
    } catch (modErr) {
      console.warn('[guest-photos] moderation step failed (failing open):', modErr);
    }

    const body = isEncryptionEnabled() ? encryptBuffer(plaintext) : plaintext;

    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';

    let publicUrl: string;

    if (r2) {
      // Primary: Cloudflare R2 — encrypted, served via /api/img proxy
      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: body,
        ContentType: 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      publicUrl = `/api/img/${filename}`;
    } else {
      // Fallback: Supabase Storage
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[guest-photos] No storage backend configured');
        return NextResponse.json({ error: 'Storage not configured — contact support' }, { status: 503 });
      }
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, plaintext, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        console.error('[guest-photos] Supabase storage error:', uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: { publicUrl: supabaseUrl } } = supabase.storage.from('photos').getPublicUrl(filename);
      publicUrl = supabaseUrl;
    }

    // Resolve guest_id from token (if provided) — best-effort.
    let resolvedGuestId: string | null = null;
    if (guestToken && guestToken.trim().length >= 6) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        const { data: guestRow } = await supabase
          .from('pearloom_guests')
          .select('id')
          .eq('guest_token', guestToken.trim())
          .maybeSingle();
        resolvedGuestId = (guestRow as { id?: string } | null)?.id ?? null;
      } catch { /* silent — attribution is nice-to-have */ }
    }

    const photo = await addGuestPhoto({
      siteId,
      uploaderName: uploaderName.trim(),
      guestId: resolvedGuestId,
      url: publicUrl,
      thumbnailUrl: undefined,
      caption: caption?.trim() || undefined,
      status: 'pending',
    });

    if (!photo) {
      return NextResponse.json({ error: 'Failed to save photo metadata' }, { status: 500 });
    }

    // Tell the host a new photo arrived (category 'content' —
    // instant or digest per their prefs). Fire-and-forget; never
    // blocks the upload. siteId here is the subdomain.
    void (async () => {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: site } = await sb
          .from('sites')
          .select('id, subdomain, creator_email, site_config')
          .eq('subdomain', siteId)
          .maybeSingle();
        const cfg = (site as { site_config?: { creator_email?: string; names?: [string, string] } } | null)?.site_config;
        const ownerEmail = String((site as { creator_email?: string } | null)?.creator_email ?? cfg?.creator_email ?? '');
        if (!site || !ownerEmail) return;
        const names = (cfg?.names ?? []).filter(Boolean);
        const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : ((site as { subdomain?: string }).subdomain ?? 'your site');
        const who = uploaderName.trim().split(/\s+/)[0] || 'A guest';
        const { notifyHost } = await import('@/lib/notifications/notify');
        await notifyHost(sb, {
          siteId: String((site as { id: string }).id),
          siteLabel,
          ownerEmail,
          category: 'content',
          title: `${who} shared a photo`,
          body: `A new photo is waiting for your review before it joins the wall. Approve or remove it from your Reel.`,
          href: '/dashboard/gallery',
          dedupeKey: `photo:${(photo as { id?: string }).id ?? Date.now()}`,
          // Photos are time-sensitive (they want to reach the live
          // wall during the event), so email the host right away even
          // though guest content otherwise defaults to the digest.
          forceInstantEmail: true,
        });
      } catch (e) { console.warn('[guest-photos] notifyHost failed (non-fatal):', e); }
    })();

    return NextResponse.json({ success: true, photo });
  } catch (err) {
    console.error('[guest-photos] Unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
