// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/photos/route.ts
// Google Photos Picker API — session + polling + media fetch
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createPickerSession,
  pollPickerSession,
  fetchPickedMediaItems,
  clusterPhotos,
  reverseGeocode,
} from '@/lib/google-photos';

/**
 * GET /api/photos
 *   ?action=create-session     → Creates a new Picker session, returns pickerUri
 *   ?action=poll&sessionId=X   → Polls session status
 *   ?action=fetch&sessionId=X  → Fetches picked media items after user finishes
 *   ?cluster=true              → Also clusters the fetched photos
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated. Sign in with Google first.' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'create-session';

  try {
    // ── Step 1: Create a Picker session ──
    if (action === 'create-session') {
      const pickerSession = await createPickerSession(session.accessToken);
      return NextResponse.json(pickerSession);
    }

    // ── Step 2: Poll the session ──
    if (action === 'poll') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
      }
      const pollResult = await pollPickerSession(session.accessToken, sessionId);
      return NextResponse.json(pollResult);
    }

    // ── Step 3: Fetch picked items ──
    if (action === 'fetch') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
      }

      const limit = parseInt(url.searchParams.get('limit') ?? '200', 10);
      const doCluster = url.searchParams.get('cluster') === 'true';

      const photos = await fetchPickedMediaItems(session.accessToken, sessionId, limit);

      if (doCluster) {
        const clusters = clusterPhotos(photos);
        const enriched = await Promise.all(
          clusters.map(async (c) => {
            if (c.location && !c.location.label) {
              c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
            }
            return c;
          })
        );
        return NextResponse.json({ clusters: enriched, totalPhotos: photos.length });
      }

      return NextResponse.json({ photos, total: photos.length });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Photos API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process photos request' },
      { status: 500 }
    );
  }
}
