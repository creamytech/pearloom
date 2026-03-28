// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/community-memory/route.ts
// Guest memory submissions — public submit, couple moderation
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BUCKET = 'community-memories';
const MAX_PHOTO_MB = 5;
const MAX_SUBMISSIONS_PER_DAY = 3;

// ── In-memory fallback (when Supabase table doesn't exist) ────
interface MemoryRecord {
  id: string;
  site_id: string;
  guest_name: string;
  relationship: string | null;
  memory_text: string;
  photo_url: string | null;
  approved: boolean;
  created_at: string;
}

const memoryStore: MemoryRecord[] = [
  {
    id: 'mock-1',
    site_id: '__mock__',
    guest_name: 'Sarah M.',
    relationship: 'College Friend',
    memory_text:
      'We went on the most chaotic road trip to Big Sur and that\'s when I knew they were meant for each other. Two people who could navigate both a broken GPS and each other\'s quirks that perfectly? Soulmates.',
    photo_url: null,
    approved: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'mock-2',
    site_id: '__mock__',
    guest_name: 'James & Priya',
    relationship: 'Family',
    memory_text:
      'Thanksgiving 2022 — they showed up with three pies and stayed till midnight helping wash dishes. That\'s love.',
    photo_url: null,
    approved: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mock-3',
    site_id: '__mock__',
    guest_name: 'Tom K.',
    relationship: 'Coworker',
    memory_text:
      'I watched them fall for each other over terrible office coffee. Best love story I\'ve ever witnessed from a gray cubicle.',
    photo_url: null,
    approved: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function rowToMemory(r: MemoryRecord) {
  return {
    id: r.id,
    siteId: r.site_id,
    guestName: r.guest_name,
    relationship: r.relationship,
    memoryText: r.memory_text,
    photoUrl: r.photo_url,
    approved: r.approved,
    createdAt: r.created_at,
  };
}

// ── GET ───────────────────────────────────────────────────────
// ?siteId=...&approved=true  → public approved memories
// ?siteId=...&all=true       → couple only: all memories
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  const all = req.nextUrl.searchParams.get('all') === 'true';
  const approvedOnly = !all;

  if (!siteId) {
    return NextResponse.json({ memories: [] });
  }

  // Auth check for "all" view
  if (all) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabase();

  if (!supabase) {
    // Fallback: use in-memory mock memories
    const memories = memoryStore
      .filter((m) => approvedOnly ? m.approved : true)
      .map(rowToMemory);
    return NextResponse.json({ memories });
  }

  try {
    let query = supabase
      .from('community_memories')
      .select('*')
      .eq('site_id', siteId)
      .order('approved', { ascending: true }) // pending first
      .order('created_at', { ascending: false });

    if (approvedOnly) {
      query = query.eq('approved', true);
    }

    const { data, error } = await query;

    if (error) {
      // Table likely doesn't exist — return mock memories
      console.warn('[community-memory] Table not found, using mock:', error.message);
      const memories = memoryStore
        .filter((m) => approvedOnly ? m.approved : true)
        .map(rowToMemory);
      return NextResponse.json({ memories });
    }

    return NextResponse.json({ memories: (data || []).map(rowToMemory) });
  } catch (err) {
    console.error('[community-memory] GET error:', err);
    return NextResponse.json({ memories: [] });
  }
}

// ── POST ──────────────────────────────────────────────────────
// Guest submits a memory — no auth required
// FormData: { siteId, guestName, relationship, memoryText, photo? }
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const siteId = formData.get('siteId') as string | null;
    const guestName = (formData.get('guestName') as string | null)?.trim();
    const relationship = (formData.get('relationship') as string | null)?.trim() || null;
    const memoryText = (formData.get('memoryText') as string | null)?.trim();
    const photo = formData.get('photo') as File | null;

    // Validation
    if (!siteId || !guestName || !memoryText) {
      return NextResponse.json({ error: 'siteId, guestName, and memoryText are required' }, { status: 400 });
    }
    if (memoryText.length < 20) {
      return NextResponse.json({ error: 'Memory must be at least 20 characters' }, { status: 400 });
    }
    if (memoryText.length > 400) {
      return NextResponse.json({ error: 'Memory must be 400 characters or fewer' }, { status: 400 });
    }
    if (photo && photo.size > MAX_PHOTO_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Photo must be under ${MAX_PHOTO_MB}MB` }, { status: 413 });
    }

    const supabase = getSupabase();

    if (!supabase) {
      // Fallback: store in memory
      const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      memoryStore.push({
        id,
        site_id: siteId,
        guest_name: guestName,
        relationship,
        memory_text: memoryText,
        photo_url: null,
        approved: false,
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, id });
    }

    // Rate limit: max 3 submissions per IP per site per day
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('community_memories')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('submitter_ip', ip)
      .gte('created_at', since);

    if (recentCount !== null && recentCount >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        { error: 'You have reached the daily submission limit. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Upload photo if provided
    let photoUrl: string | null = null;
    if (photo && photo.type.startsWith('image/')) {
      const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
      const uuid = Math.random().toString(36).substring(2, 12);
      const storagePath = `${siteId}/${Date.now()}_${uuid}.${ext}`;
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: photo.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        photoUrl = publicUrl;
      } else {
        console.warn('[community-memory] Photo upload failed:', uploadError.message);
      }
    }

    // Insert record
    const { data, error } = await supabase
      .from('community_memories')
      .insert({
        site_id: siteId,
        guest_name: guestName,
        relationship,
        memory_text: memoryText,
        photo_url: photoUrl,
        approved: false,
        submitter_ip: ip,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      // Table doesn't exist yet — fallback to memory
      console.warn('[community-memory] Insert error (table may not exist):', error.message);
      const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      memoryStore.push({
        id,
        site_id: siteId,
        guest_name: guestName,
        relationship,
        memory_text: memoryText,
        photo_url: photoUrl,
        approved: false,
        created_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('[community-memory] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────
// Couple approves or rejects a memory (auth required)
// Body: { id, approved: boolean }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, approved } = await req.json();
    if (!id || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'id and approved (boolean) are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (!supabase) {
      // Fallback: update in-memory
      const mem = memoryStore.find((m) => m.id === id);
      if (mem) mem.approved = approved;
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from('community_memories')
      .update({ approved })
      .eq('id', id);

    if (error) {
      console.error('[community-memory] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[community-memory] PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────
// Couple deletes a memory (auth required)
// ?id=...
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (!supabase) {
      // Fallback: remove from in-memory
      const idx = memoryStore.findIndex((m) => m.id === id);
      if (idx !== -1) memoryStore.splice(idx, 1);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from('community_memories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[community-memory] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[community-memory] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
