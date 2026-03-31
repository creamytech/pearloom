import { NextRequest, NextResponse } from 'next/server';
import { publishSite } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { StoryManifest } from '@/types';
import { generateVibeSkin } from '@/lib/vibe-engine';
import pLimit from 'p-limit';

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

// -- Mirror Google Photos URLs -> R2 (primary) or Supabase Storage (fallback) --
// Google Photos baseUrls expire within ~1 hour. On publish we upload
// each image to permanent storage so they're accessible forever.
async function mirrorImagesToStorage(
  manifest: StoryManifest,
  accessToken: string,
  subdomain: string
): Promise<StoryManifest> {
  const r2 = getR2Client();
  const r2Bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';
  const r2PublicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasR2 = !!(r2 && r2PublicBase);
  const hasSupabase = !!(supabaseUrl && serviceKey);

  if (!hasR2 && !hasSupabase) {
    console.warn('[Mirror] No storage backend configured — photos will use Google CDN (may expire)');
    return manifest;
  }

  const supabase = hasSupabase ? createClient(supabaseUrl!, serviceKey!) : null;
  const limit = pLimit(5);

  const updatedChapters = await Promise.all(
    manifest.chapters.map(async (chapter, ci) => {
      const updatedImages = await Promise.all(
        (chapter.images || []).map((img, ii) => limit(async () => {
          // Only mirror Google Photos URLs (not already-mirrored or base64 uploads)
          if (!img.url || !img.url.includes('googleusercontent.com')) return img;

          try {
            // Fetch image server-side using the user's OAuth token
            const photoRes = await fetch(`${img.url}=w1600-h1200-c`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!photoRes.ok) {
              console.warn(`[Mirror] Google returned ${photoRes.status} for ch${ci}-img${ii}`);
              return img;
            }

            const buffer = await photoRes.arrayBuffer();
            const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const path = `sites/${subdomain}/ch${ci}-img${ii}.${ext}`;

            // Primary: Upload to R2
            if (hasR2) {
              try {
                await r2!.send(new PutObjectCommand({
                  Bucket: r2Bucket,
                  Key: path,
                  Body: Buffer.from(buffer),
                  ContentType: contentType,
                  CacheControl: 'public, max-age=31536000, immutable',
                }));

                const publicUrl = `${r2PublicBase}/${path}`;
                console.log(`[Mirror] R2 OK ${path} -> ${publicUrl}`);
                return { ...img, url: publicUrl };
              } catch (r2Err) {
                console.warn(`[Mirror] R2 upload failed for ${path}, falling back to Supabase:`, r2Err);
                // Fall through to Supabase
              }
            }

            // Fallback: Upload to Supabase Storage
            if (supabase) {
              const { error } = await supabase.storage
                .from('photos')
                .upload(path, buffer, {
                  contentType,
                  upsert: true,
                  cacheControl: '31536000',
                });

              if (error) {
                console.warn(`[Mirror] Supabase upload failed for ${path}:`, error.message);
                return img;
              }

              const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
              console.log(`[Mirror] Supabase OK ${path} -> ${publicUrl}`);
              return { ...img, url: publicUrl };
            }

            return img;
          } catch (err) {
            console.warn(`[Mirror] Exception for ch${ci}-img${ii}:`, err);
            return img;
          }
        }))
      );
      return { ...chapter, images: updatedImages };
    })
  );

  return { ...manifest, chapters: updatedChapters };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subdomain, manifest, names } = body;

    console.log('[Publish API] Request:', { 
      subdomain, 
      hasManifest: !!manifest,
      hasNames: !!names,
      email: session.user.email 
    });

    if (!subdomain || !manifest) {
      return NextResponse.json({ 
        error: `Missing required fields: subdomain=${!!subdomain}, manifest=${!!manifest}` 
      }, { status: 400 });
    }

    // Format subdomain purely to be safe (no spaces, lowercase, etc)
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (cleanSubdomain.length < 3) {
      return NextResponse.json({ error: 'Subdomain must be at least 3 characters' }, { status: 400 });
    }
    if (cleanSubdomain.length > 63) {
      return NextResponse.json({ error: 'Subdomain too long (max 63 characters)' }, { status: 400 });
    }
    if (/^-|-$/.test(cleanSubdomain)) {
      return NextResponse.json({ error: 'Subdomain cannot start or end with a hyphen' }, { status: 400 });
    }
    const RESERVED = new Set(['api', 'admin', 'www', 'mail', 'ftp', 'support', 'billing', 'app', 'dashboard', 'editor', 'preview', 'sites', 'status', 'health']);
    if (RESERVED.has(cleanSubdomain)) {
      return NextResponse.json({ error: 'That subdomain is reserved. Please choose another.' }, { status: 400 });
    }

    // Mirror Google Photos -> Supabase Storage before persisting
    let persistManifest: StoryManifest = manifest;
    if (session.accessToken) {
      console.log('[Publish API] Mirroring photos to Supabase Storage...');
      persistManifest = await mirrorImagesToStorage(manifest, session.accessToken, cleanSubdomain);
    }

    // Generate AI vibe skin (unless already cached)
    if (!persistManifest.vibeSkin || !persistManifest.vibeSkin.aiGenerated) {
      console.log('[Publish API] Generating AI vibe skin...');
      const vibeSkin = await generateVibeSkin(
        persistManifest.vibeString,
        process.env.GEMINI_API_KEY,
        names as [string, string],
        undefined,
        persistManifest.occasion
      );
      persistManifest = { ...persistManifest, vibeSkin };
      console.log(`[Publish API] Vibe skin generated: ${vibeSkin.tone} / ${vibeSkin.curve} / aiGenerated=${vibeSkin.aiGenerated}`);
    }

    // Pass the tuple of names to the DB upsert
    const { success, error } = await publishSite(
      session.user.email, 
      cleanSubdomain, 
      persistManifest, 
      names || ['', '']
    );

    if (!success) {
      return NextResponse.json({ error: error || 'Failed to publish' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';

    // Auto-detect the URL format to return.
    // NEXT_PUBLIC_SITE_URL (e.g. https://pearloom.com) is the canonical base —
    // use it when set so we always produce the correct subdomain URL regardless
    // of which host the API request arrived on (e.g. app.pearloom.com vs pearloom.com).
    let finalUrl = '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      try {
        const base = new URL(siteUrl);
        finalUrl = `${base.protocol}//${cleanSubdomain}.${base.hostname}`;
      } catch {
        // fall through to host-based detection below
      }
    }
    if (!finalUrl) {
      if (host.includes('localhost')) {
        finalUrl = `http://${cleanSubdomain}.localhost:3000`;
      } else if (host.includes('vercel.app')) {
        finalUrl = `https://${host}/sites/${cleanSubdomain}`;
      } else {
        // Strip any port and www. prefix so we get clean subdomain URLs
        const baseDomain = host.replace(/^www\./, '').replace(/:\d+$/, '');
        finalUrl = `https://${cleanSubdomain}.${baseDomain}`;
      }
    }

    // Generate a preview token and store it alongside the published site
    let previewToken: string | null = null;
    try {
      const token = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        const previewSupabase = createClient(supabaseUrl, serviceKey);
        const { error: tokenError } = await previewSupabase
          .from('preview_tokens')
          .insert({
            token,
            site_id: cleanSubdomain,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            manifest: persistManifest,
          });

        if (!tokenError) {
          previewToken = token;
        } else {
          console.warn('[Publish API] Preview token insert skipped:', tokenError.message);
        }

        // Store vibe tags in the sites table if the column exists
        if (persistManifest.vibeTags?.length) {
          await previewSupabase
            .from('sites')
            .update({ vibe_tags: persistManifest.vibeTags })
            .eq('subdomain', cleanSubdomain)
            .then(({ error: tagsError }) => {
              if (tagsError) {
                console.warn('[Publish API] Vibe tags update skipped:', tagsError.message);
              }
            });
        }
      }
    } catch (tokenErr) {
      console.warn('[Publish API] Preview token generation error (non-fatal):', tokenErr);
    }

    const protocol = host.includes('localhost') ? 'http' : 'https';
    const previewUrl = previewToken ? `${protocol}://${host}/preview/${previewToken}` : null;

    return NextResponse.json({ success: true, url: finalUrl, previewToken, previewUrl });

  } catch (err: unknown) {
    console.error('Publishing API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
