// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/photo-intelligence/route.ts
// Vision-based photo quality scoring and smart cluster naming
// POST { clusters: Array<{ photos, location? }> }
// Returns per-cluster: suggestedTitle, qualityScore, heroPhotoIndex, hasDuplicates
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhotoInput {
  baseUrl: string;
  filename: string;
  creationTime: string;
  width: number;
  height: number;
}

interface ClusterInput {
  photos: PhotoInput[];
  location?: { label: string };
}

interface ClusterResult {
  suggestedTitle: string;
  qualityScore: number;
  heroPhotoIndex: number;
  hasDuplicates: boolean;
}

// ---------------------------------------------------------------------------
// Rate limiting — 5 vision requests per user per hour
// ---------------------------------------------------------------------------

const rateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(email);

  if (!entry || now > entry.resetAt) {
    rateMap.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 });
    // Periodic cleanup
    if (rateMap.size > 5000) {
      for (const [k, v] of rateMap) {
        if (now > v.resetAt) rateMap.delete(k);
      }
    }
    return false;
  }

  entry.count++;
  return entry.count > 5;
}

// ---------------------------------------------------------------------------
// Gemini Vision call
// ---------------------------------------------------------------------------

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent';

async function analyzeCluster(
  imageBase64: string,
  mimeType: string,
  cluster: ClusterInput,
  apiKey: string,
): Promise<ClusterResult> {
  const locationHint = cluster.location?.label
    ? `The photos were taken at or near "${cluster.location.label}".`
    : '';

  const photoSummary = cluster.photos
    .map(
      (p, i) =>
        `Photo ${i + 1}: "${p.filename}" (${p.width}x${p.height}, taken ${p.creationTime})`,
    )
    .join('\n');

  const prompt = `You are a professional photo editor helping curate wedding and relationship memories.

Analyze this representative image from a cluster of ${cluster.photos.length} photo(s).
${locationHint}

Photos in the cluster:
${photoSummary}

Tasks:
1. **suggestedTitle**: Suggest a warm, evocative title for this memory (3-5 words). Examples: "Beach Sunset Picnic", "Rooftop Date Night", "First Dance Magic".
2. **qualityScore**: Rate the image quality from 1-10 based on composition, lighting, clarity, and whether faces/subjects are well-captured. Be honest — blurry or poorly lit photos should score low.
3. **heroPhotoIndex**: Based on the filenames, timestamps, and dimensions of all photos listed above, which photo index (0-based) would likely make the best cover image? If unsure, return 0.
4. **hasDuplicates**: Look at the timestamps — if any two photos were taken within 3 seconds of each other, this suggests burst shots. Return true if likely duplicates exist, false otherwise.

Return ONLY a JSON object with these four fields:
{"suggestedTitle": "...", "qualityScore": N, "heroPhotoIndex": N, "hasDuplicates": true/false}`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`Gemini returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(cleaned);

  // Validate and clamp values
  return {
    suggestedTitle: String(parsed.suggestedTitle || 'Untitled Memory').slice(0, 60),
    qualityScore: Math.max(1, Math.min(10, Math.round(Number(parsed.qualityScore) || 5))),
    heroPhotoIndex: Math.max(
      0,
      Math.min(cluster.photos.length - 1, Math.floor(Number(parsed.heroPhotoIndex) || 0)),
    ),
    hasDuplicates: Boolean(parsed.hasDuplicates),
  };
}

// ---------------------------------------------------------------------------
// Duplicate detection fallback (timestamp-based)
// ---------------------------------------------------------------------------

function detectDuplicatesByTimestamp(photos: PhotoInput[]): boolean {
  if (photos.length < 2) return false;

  const timestamps = photos
    .map((p) => new Date(p.creationTime).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] - timestamps[i - 1] <= 3000) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  if (isRateLimited(session.user.email)) {
    return Response.json(
      { error: 'Rate limit exceeded — max 5 photo intelligence requests per hour' },
      { status: 429 },
    );
  }

  let body: { clusters: ClusterInput[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clusters } = body;

  if (!Array.isArray(clusters) || clusters.length === 0) {
    return Response.json({ error: 'clusters must be a non-empty array' }, { status: 400 });
  }

  // Cap at 10 clusters per request
  const clusterSlice = clusters.slice(0, 10);

  const results: ClusterResult[] = [];

  for (const cluster of clusterSlice) {
    if (!Array.isArray(cluster.photos) || cluster.photos.length === 0) {
      results.push({
        suggestedTitle: 'Untitled Memory',
        qualityScore: 5,
        heroPhotoIndex: 0,
        hasDuplicates: false,
      });
      continue;
    }

    try {
      // Fetch the first photo as a small thumbnail for vision analysis
      const photo = cluster.photos[0];
      const photoRes = await fetch(`${photo.baseUrl}=w256-h256`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (!photoRes.ok) {
        throw new Error(`Photo fetch returned ${photoRes.status}`);
      }

      const imageBuffer = await photoRes.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = photoRes.headers.get('content-type') ?? 'image/jpeg';

      const result = await analyzeCluster(imageBase64, mimeType, cluster, apiKey);

      // Supplement duplicate detection with timestamp check
      if (!result.hasDuplicates) {
        result.hasDuplicates = detectDuplicatesByTimestamp(cluster.photos);
      }

      results.push(result);
    } catch (err) {
      console.error('[photo-intelligence] Cluster analysis failed:', err);

      // Return graceful fallback for this cluster
      results.push({
        suggestedTitle: cluster.location?.label ?? 'Untitled Memory',
        qualityScore: 5,
        heroPhotoIndex: 0,
        hasDuplicates: detectDuplicatesByTimestamp(cluster.photos),
      });
    }
  }

  return Response.json({
    results,
    processedCount: clusterSlice.length,
    totalReceived: clusters.length,
  });
}
