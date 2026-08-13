// ─────────────────────────────────────────────────────────────
// Pearloom / api/music/search/route.test.ts
//
// The guest playlist's typeahead leans on this route, and the
// zero-config path is the iTunes Search API — its field names
// (trackName / artistName / artworkUrl100 / previewUrl) are easy
// to silently misread into empty dropdowns. Pin the mapping +
// the route's iTunes fallback contract:
//   • trackName/artistName/artworkUrl100/trackViewUrl/previewUrl
//     → { title, artist, artUrl, spotifyUrl, previewUrl }
//   • artwork bumped 100x100 → 200x200 for retina thumbnails
//   • spotifyUrl stays null (trackViewUrl is Apple, not Spotify)
//   • rows without a trackName are dropped; garbage payloads → []
//   • GET without Spotify env hits iTunes and returns mapped rows
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, mapItunesResults, mapSpotifyResults } from './route';

const ITUNES_TRACK = {
  trackName: 'September',
  artistName: 'Earth, Wind & Fire',
  artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg',
  trackViewUrl: 'https://music.apple.com/us/album/september/1234?i=5678',
  previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
};

describe('mapItunesResults', () => {
  it('maps the iTunes field names onto the shared result shape', () => {
    const out = mapItunesResults({ results: [ITUNES_TRACK] });
    expect(out).toEqual([
      {
        title: 'September',
        artist: 'Earth, Wind & Fire',
        artUrl: 'https://is1-ssl.mzstatic.com/image/thumb/x/200x200bb.jpg',
        spotifyUrl: null,
        previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
      },
    ]);
  });

  it('tolerates missing optional fields', () => {
    const out = mapItunesResults({ results: [{ trackName: 'Dreams' }] });
    expect(out).toEqual([
      { title: 'Dreams', artist: '', artUrl: null, spotifyUrl: null, previewUrl: null },
    ]);
  });

  it('drops rows without a trackName and survives garbage payloads', () => {
    expect(mapItunesResults({ results: [{ artistName: 'Nobody' }, ITUNES_TRACK] })).toHaveLength(1);
    expect(mapItunesResults(null)).toEqual([]);
    expect(mapItunesResults({})).toEqual([]);
    expect(mapItunesResults({ results: 'nope' })).toEqual([]);
  });
});

describe('mapSpotifyResults', () => {
  it('maps tracks.items with the middle album image + external url', () => {
    const out = mapSpotifyResults({
      tracks: {
        items: [{
          name: 'Dreams',
          artists: [{ name: 'Fleetwood Mac' }, { name: 'Someone Else' }],
          album: { images: [{ url: 'big.jpg' }, { url: 'mid.jpg' }, { url: 'small.jpg' }] },
          external_urls: { spotify: 'https://open.spotify.com/track/abc' },
          preview_url: 'https://p.scdn.co/mp3-preview/abc',
        }],
      },
    });
    expect(out).toEqual([
      {
        title: 'Dreams',
        artist: 'Fleetwood Mac, Someone Else',
        artUrl: 'mid.jpg',
        spotifyUrl: 'https://open.spotify.com/track/abc',
        previewUrl: 'https://p.scdn.co/mp3-preview/abc',
      },
    ]);
  });

  it('survives garbage payloads', () => {
    expect(mapSpotifyResults(null)).toEqual([]);
    expect(mapSpotifyResults({ tracks: {} })).toEqual([]);
  });
});

describe('GET /api/music/search (iTunes fallback)', () => {
  // Per-test unique IP so the in-memory rate limiter doesn't bleed
  // state between cases (mirrors api/rsvp/route.test.ts).
  let ipCounter = 0;
  function makeGet(q: string): NextRequest {
    ipCounter += 1;
    return new NextRequest(`http://localhost/api/music/search?q=${encodeURIComponent(q)}`, {
      headers: { 'x-forwarded-for': `10.9.${Math.floor(ipCounter / 256)}.${ipCounter % 256}` },
    });
  }

  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects queries under 2 characters', async () => {
    const res = await GET(makeGet('a'));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches iTunes when Spotify env vars are absent and maps the rows', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [ITUNES_TRACK] }), { status: 200 }),
    );
    const res = await GET(makeGet('september'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toHaveLength(1);
    expect(json.results[0]).toMatchObject({
      title: 'September',
      artist: 'Earth, Wind & Fire',
      artUrl: expect.stringContaining('200x200'),
      spotifyUrl: null,
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('itunes.apple.com/search');
  });

  it('returns ok:false 502 when iTunes is down (client degrades to free text)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const res = await GET(makeGet('september'));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
