import { NextRequest, NextResponse } from 'next/server';
import { publishSite } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
import { generateVibeSkin } from '@/lib/vibe-engine';

// â”€â”€ Mirror Google Photos URLs â†’ Supabase Storage â”€â”€
// Google Photos baseUrls expire within ~1 hour. On publish we upload
// each image to the 'photos' bucket so they're permanently accessible.
async function mirrorImagesToStorage(
  manifest: StoryManifest,
  accessToken: string,
  subdomain: string
): Promise<StoryManifest> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return manifest; // skip if not configured

  const supabase = createClient(supabaseUrl, serviceKey);

  const updatedChapters = await Promise.all(
    manifest.chapters.map(async (chapter, ci) => {
      const updatedImages = await Promise.all(
        (chapter.images || []).map(async (img, ii) => {
          // Only mirror Google Photos URLs (not already-mirrored or base64 uploads)
          if (!img.url || !img.url.includes('googleusercontent.com')) return img;

          try {
            // Fetch image server-side using the user's OAuth token
            const photoRes = await fetch(`${img.url}=w1200-h900-c`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!photoRes.ok) return img; // keep original on failure

            const buffer = await photoRes.arrayBuffer();
            const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const path = `sites/${subdomain}/ch${ci}-img${ii}.${ext}`;

            const { error } = await supabase.storage
              .from('photos')
              .upload(path, buffer, {
                contentType,
                upsert: true,
                cacheControl: '31536000', // 1 year
              });

            if (error) {
              console.warn(`[Mirror] Upload failed for ${path}:`, error.message);
              return img; // keep original
            }

            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
            console.log(`[Mirror] âœ“ ${path} â†’ ${publicUrl}`);
            return { ...img, url: publicUrl };
          } catch (err) {
            console.warn(`[Mirror] Exception for ch${ci}-img${ii}:`, err);
            return img; // keep original, don't block publish
          }
        })
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

    // Mirror Google Photos â†’ Supabase Storage before persisting
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
        names as [string, string]
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
    
    // Auto-detect the URL format to return
    let finalUrl = '';
    if (host.includes('localhost')) {
      finalUrl = `http://${cleanSubdomain}.localhost:3000`;
    } else if (host.includes('vercel.app')) {
      finalUrl = `https://${host}/sites/${cleanSubdomain}`;
    } else {
      finalUrl = `https://${cleanSubdomain}.${host}`;
    }

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (err: unknown) {
    console.error('Publishing API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
