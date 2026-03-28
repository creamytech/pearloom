import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';

// ── In-memory fallback store (used when preview_tokens table doesn't exist) ──
interface PreviewEntry {
  token: string;
  siteId: string;
  manifest: StoryManifest;
  expiresAt: number;
  comments: Array<{ name: string; message: string; createdAt: string }>;
}

const memoryStore = new Map<string, PreviewEntry>();

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── POST /api/preview ───────────────────────────────────────────────────────
// Generate a new preview token, OR store a feedback comment.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle feedback comment submission
    if (body.type === 'comment') {
      const { token, name, message } = body as { token: string; name: string; message: string; type: string };
      if (!token || !name || !message) {
        return NextResponse.json({ error: 'Missing token, name, or message' }, { status: 400 });
      }

      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.from('preview_comments').insert({
            token,
            name: name.trim(),
            message: message.trim(),
            created_at: new Date().toISOString(),
          });
        } catch {
          // Table may not exist — fall through to memory store
        }
      }
      // Also update memory store if entry exists
      const memEntry = memoryStore.get(token);
      if (memEntry) {
        memEntry.comments.push({ name: name.trim(), message: message.trim(), createdAt: new Date().toISOString() });
      }

      return NextResponse.json({ success: true });
    }

    // Handle token generation
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteId, manifest } = body as { siteId: string; manifest?: StoryManifest };
    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId' }, { status: 400 });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const supabase = getSupabase();
    let usedSupabase = false;

    if (supabase) {
      try {
        await supabase.from('preview_tokens').insert({
          token,
          site_id: siteId,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          manifest: manifest ?? null,
        });
        usedSupabase = true;
      } catch {
        // Table doesn't exist — fall back to memory store
      }
    }

    if (!usedSupabase) {
      memoryStore.set(token, {
        token,
        siteId,
        manifest: manifest as StoryManifest,
        expiresAt: expiresAt.getTime(),
        comments: [],
      });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const previewUrl = `${protocol}://${host}/preview/${token}`;

    return NextResponse.json({ token, previewUrl });
  } catch (err) {
    console.error('[Preview API POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── GET /api/preview?token=... ──────────────────────────────────────────────
// Fetch the manifest for a given preview token.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('preview_tokens')
          .select('manifest, expires_at, site_id')
          .eq('token', token)
          .single();

        if (!error && data) {
          if (new Date(data.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Preview link has expired' }, { status: 404 });
          }
          return NextResponse.json({ manifest: data.manifest as StoryManifest, siteId: data.site_id });
        }
      } catch {
        // Fall through to memory store
      }
    }

    // Check in-memory fallback
    const memEntry = memoryStore.get(token);
    if (!memEntry) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    if (memEntry.expiresAt < Date.now()) {
      memoryStore.delete(token);
      return NextResponse.json({ error: 'Preview link has expired' }, { status: 404 });
    }

    return NextResponse.json({ manifest: memEntry.manifest, siteId: memEntry.siteId });
  } catch (err) {
    console.error('[Preview API GET]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
