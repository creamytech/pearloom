// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/music/search/route.ts
//
// Track search for the guest playlist's suggest-a-song composer.
//   GET ?q=… → { ok, results: [{ title, artist, artUrl,
//                                spotifyUrl, previewUrl }] }
//
// Two providers, picked by env:
//   • Spotify (SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET set) —
//     client-credentials flow; the app token is cached in a
//     module-level variable until shortly before expiry.
//   • iTunes Search API otherwise — free, no auth, and it ships
//     30-second preview clips + album art out of the box.
//
// Public + rate-limited per IP. Failures return ok:false so the
// composer can degrade to free-text entry without drama.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export interface MusicSearchResult {
  title: string;
  artist: string;
  artUrl: string | null;
  spotifyUrl: string | null;
  previewUrl: string | null;
}

/* ── Spotify client-credentials token cache ───────────────────
   Module-level on purpose (survives across requests on a warm
   instance). React Compiler rules don't apply here — this is a
   server route. */
let spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (spotifyToken && Date.now() < spotifyToken.expiresAt - 30_000) return spotifyToken.token;
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json?.access_token) return null;
    spotifyToken = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return spotifyToken.token;
  } catch (e) {
    console.warn('[music/search] Spotify token fetch failed:', e);
    return null;
  }
}

/* ── Response mappers (exported for unit tests) ─────────────── */

interface SpotifySearchPayload {
  tracks?: {
    items?: Array<{
      name?: string;
      artists?: Array<{ name?: string }>;
      album?: { images?: Array<{ url?: string; width?: number }> };
      external_urls?: { spotify?: string };
      preview_url?: string | null;
    }>;
  };
}

export function mapSpotifyResults(payload: unknown): MusicSearchResult[] {
  const items = (payload as SpotifySearchPayload)?.tracks?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((t) => typeof t?.name === 'string' && t.name.length > 0)
    .map((t) => {
      const images = t.album?.images ?? [];
      /* images arrive largest-first (640/300/64); the 300px middle
         one is plenty for a tracklist thumbnail. */
      const art = images[1]?.url ?? images[0]?.url ?? null;
      return {
        title: t.name as string,
        artist: (t.artists ?? []).map((a) => a?.name).filter(Boolean).join(', '),
        artUrl: art,
        spotifyUrl: t.external_urls?.spotify ?? null,
        previewUrl: t.preview_url ?? null,
      };
    });
}

interface ItunesSearchPayload {
  results?: Array<{
    trackName?: string;
    artistName?: string;
    artworkUrl100?: string;
    trackViewUrl?: string;
    previewUrl?: string;
  }>;
}

export function mapItunesResults(payload: unknown): MusicSearchResult[] {
  const items = (payload as ItunesSearchPayload)?.results;
  if (!Array.isArray(items)) return [];
  return items
    .filter((t) => typeof t?.trackName === 'string' && t.trackName.length > 0)
    .map((t) => ({
      title: t.trackName as string,
      artist: t.artistName ?? '',
      /* iTunes serves any square size by URL convention — bump the
         100px default to 200px so retina thumbnails stay crisp. */
      artUrl: t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '200x200') : null,
      /* trackViewUrl is an Apple Music link, not Spotify — leave
         spotifyUrl null so the client falls back to the Spotify
         search deep-link it already builds from title + artist. */
      spotifyUrl: null,
      previewUrl: t.previewUrl ?? null,
    }));
}

// ── GET ?q=… ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`music-search:${ip}`, { max: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many searches too fast.' }, { status: 429 });
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  if (q.length < 2) {
    return NextResponse.json({ ok: false, error: 'q must be at least 2 characters' }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // Spotify branch — only when both env vars are configured.
  if (clientId && clientSecret) {
    const token = await getSpotifyToken(clientId, clientSecret);
    if (token) {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?type=track&limit=6&q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          return NextResponse.json({ ok: true, results: mapSpotifyResults(await res.json()) });
        }
        console.warn('[music/search] Spotify search returned', res.status);
      } catch (e) {
        console.warn('[music/search] Spotify search failed:', e);
      }
    }
    // fall through to iTunes on any Spotify failure
  }

  // iTunes fallback — free, no auth.
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=6`,
    );
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Search unavailable.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, results: mapItunesResults(await res.json()) });
  } catch (e) {
    console.warn('[music/search] iTunes search failed:', e);
    return NextResponse.json({ ok: false, error: 'Search unavailable.' }, { status: 502 });
  }
}
