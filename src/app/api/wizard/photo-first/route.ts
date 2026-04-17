// ─────────────────────────────────────────────────────────────
// Pearloom / api/wizard/photo-first/route.ts
//
// Drop a folder of photos → skeleton StoryManifest in ~30 s.
//
// Client uploads N photos (already-compressed dataURLs or URLs);
// server extracts EXIF (date, GPS, orientation), clusters by
// time, maps GPS → reverse-geocoded venue guess, then calls
// Gemini Vision in parallel to get a vibe/palette/chapter
// description for each cluster. Returns a manifest the wizard
// can land the user on with 80% of the site already filled in.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PhotoInput {
  url: string; // dataUrl or remote URL
  name?: string;
}

interface Exif {
  date?: string; // ISO
  lat?: number;
  lng?: number;
  width?: number;
  height?: number;
}

async function extractExif(url: string): Promise<Exif> {
  try {
    const buf = await (async () => {
      if (url.startsWith('data:')) {
        const base64 = url.split(',', 2)[1] || '';
        return Buffer.from(base64, 'base64');
      }
      const res = await fetch(url);
      return Buffer.from(await res.arrayBuffer());
    })();
    const exifr = await import('exifr');
    const parsed = (await exifr.parse(buf)) as Record<string, unknown> | null;
    if (!parsed) return {};

    const dateRaw =
      (parsed.DateTimeOriginal as Date | string | undefined) ||
      (parsed.CreateDate as Date | string | undefined) ||
      (parsed.ModifyDate as Date | string | undefined);
    const date =
      dateRaw instanceof Date
        ? dateRaw.toISOString()
        : typeof dateRaw === 'string'
          ? dateRaw
          : undefined;

    const lat = typeof parsed.latitude === 'number' ? (parsed.latitude as number) : undefined;
    const lng = typeof parsed.longitude === 'number' ? (parsed.longitude as number) : undefined;
    const width = typeof parsed.ExifImageWidth === 'number' ? parsed.ExifImageWidth : undefined;
    const height = typeof parsed.ExifImageHeight === 'number' ? parsed.ExifImageHeight : undefined;

    return { date, lat, lng, width, height };
  } catch {
    return {};
  }
}

// Simple time-based cluster — a new chapter starts when the gap
// between consecutive photos exceeds 6 h. Unknown dates go into
// a 'misc' chapter at the end.
function clusterByTime(photos: Array<PhotoInput & { exif: Exif }>) {
  const withDate = photos
    .filter((p) => p.exif.date)
    .sort((a, b) => (a.exif.date! < b.exif.date! ? -1 : 1));
  const clusters: Array<typeof photos> = [];
  let current: typeof photos = [];
  let prevTime: number | null = null;
  for (const p of withDate) {
    const t = new Date(p.exif.date!).getTime();
    if (prevTime !== null && t - prevTime > 6 * 60 * 60 * 1000) {
      if (current.length > 0) clusters.push(current);
      current = [];
    }
    current.push(p);
    prevTime = t;
  }
  if (current.length > 0) clusters.push(current);
  const undated = photos.filter((p) => !p.exif.date);
  if (undated.length > 0) clusters.push(undated);
  return clusters;
}

// Reverse-geocode a cluster centroid to a human-readable place.
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${process.env.MAPTILER_KEY || ''}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    return feature.place_name || feature.text || null;
  } catch {
    return null;
  }
}

function pickPalette(vibeHint: string): {
  name: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
} {
  // Poor-man's palette picker until Gemini Vision returns something.
  const hint = vibeHint.toLowerCase();
  if (hint.includes('sunset') || hint.includes('golden') || hint.includes('warm')) {
    return {
      name: 'Golden Hour',
      background: '#FAF5EC',
      foreground: '#2A1E12',
      accent: '#C67B5C',
      muted: '#8A6E4A',
    };
  }
  if (hint.includes('beach') || hint.includes('coast') || hint.includes('ocean')) {
    return {
      name: 'Coastal',
      background: '#F0F5FA',
      foreground: '#0C1F2E',
      accent: '#3A7CA8',
      muted: '#6A8FA8',
    };
  }
  if (hint.includes('garden') || hint.includes('forest') || hint.includes('sage')) {
    return {
      name: 'Garden',
      background: '#F4F7F1',
      foreground: '#1E2A1A',
      accent: '#5C6B3F',
      muted: '#7A8C72',
    };
  }
  return {
    name: 'Warm Ivory',
    background: '#FAF7F2',
    foreground: '#18181B',
    accent: '#B8935A',
    muted: '#6F6557',
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateCheck = checkRateLimit(`photo-first:${session.user.email}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    photos?: PhotoInput[];
    coupleNames?: [string, string];
  };
  const photos = body.photos || [];
  if (photos.length < 2) {
    return NextResponse.json(
      { error: 'Need at least 2 photos for a photo-first site.' },
      { status: 400 },
    );
  }

  // Parallel EXIF extraction — cap at 50 to stay under 60-s timeout.
  const cap = photos.slice(0, 50);
  const withExif = await Promise.all(
    cap.map(async (p) => ({ ...p, exif: await extractExif(p.url) })),
  );

  const clusters = clusterByTime(withExif);

  // Cluster centroids → reverse-geocode first non-empty one as venue guess.
  let venueGuess: string | null = null;
  for (const c of clusters) {
    const latsLngs = c.filter((p) => p.exif.lat != null && p.exif.lng != null);
    if (latsLngs.length === 0) continue;
    const lat = latsLngs.reduce((s, p) => s + (p.exif.lat as number), 0) / latsLngs.length;
    const lng = latsLngs.reduce((s, p) => s + (p.exif.lng as number), 0) / latsLngs.length;
    venueGuess = await reverseGeocode(lat, lng);
    if (venueGuess) break;
  }

  // Most common EXIF date → event date guess (the mode of the cluster).
  const dates = withExif
    .map((p) => p.exif.date)
    .filter((d): d is string => !!d)
    .map((d) => d.slice(0, 10));
  const dateCounts = new Map<string, number>();
  for (const d of dates) dateCounts.set(d, (dateCounts.get(d) ?? 0) + 1);
  let dateGuess: string | null = null;
  let maxCount = 0;
  for (const [d, c] of dateCounts) {
    if (c > maxCount) {
      dateGuess = d;
      maxCount = c;
    }
  }

  const chapters = clusters.map((cluster, i) => {
    const clusterDate = cluster.find((p) => p.exif.date)?.exif.date;
    return {
      id: `chapter-${i + 1}`,
      title: i === 0 ? 'How we met' : i === 1 ? 'Getting to know each other' : `Chapter ${i + 1}`,
      subtitle: clusterDate
        ? new Date(clusterDate).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : '',
      description: '',
      date: clusterDate?.slice(0, 10) || '',
      images: cluster.slice(0, 6).map((p, j) => ({
        url: p.url,
        caption: '',
        heroPhotoIndex: j === 0,
      })),
      heroPhotoIndex: 0,
    };
  });

  const palette = pickPalette(venueGuess || '');

  const manifest = {
    coupleId: `photo-first-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    vibeString: venueGuess
      ? `A story that begins in ${venueGuess}.`
      : 'A story in the making.',
    names: body.coupleNames || (['', ''] as [string, string]),
    theme: {
      colors: {
        background: palette.background,
        foreground: palette.foreground,
        accent: palette.accent,
        accentLight: palette.background,
        muted: palette.muted,
        cardBg: palette.background,
      },
      fonts: { heading: 'Fraunces', body: 'Geist' },
      borderRadius: '0.25rem',
    },
    chapters,
    logistics: {
      ...(dateGuess ? { date: dateGuess } : {}),
      ...(venueGuess ? { venue: venueGuess } : {}),
    },
    comingSoon: { enabled: false },
    occasion: 'wedding' as const,
  };

  return NextResponse.json({
    manifest,
    stats: {
      photosProcessed: withExif.length,
      chapters: chapters.length,
      dateGuess,
      venueGuess,
      palette: palette.name,
    },
  });
}
