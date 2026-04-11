// ─────────────────────────────────────────────────────────────
// Pearloom / api/photos/suggest-vibe/route.ts
//
// Reads 2-4 of the user's chosen photos with Gemini Vision and
// suggests three tappable vibe descriptions that match what the
// photos actually look like. Powers the "Let Pear look at your
// photos" suggestions card on the vibe-ask wizard step, so the
// user can skip typing anything if one of the auto-suggested
// vibes feels right.
//
// Returns exactly 3 suggestions so the UI can render them as a
// three-chip row without worrying about overflow.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GEMINI_PRO =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';

interface Suggestion {
  /** 3-8 word vibe description the user can tap. */
  vibe: string;
  /** One-line rationale referencing what was in the photos. */
  reason: string;
  /** Optional 3 hex colors the model saw in the photos. */
  palette?: string[];
}

const PROMPT = (occasion: string, names: string) => `You are a visual
curator for Pearloom, a premium celebration-site builder. You'll be
shown 2-4 photos from a user's ${occasion || 'celebration'}.${names ? ` The site is for ${names}.` : ''}

Look at the photos and suggest THREE distinct vibe descriptions that
match what you actually see. Each suggestion should be:

- 3-8 words long
- evocative and specific — reference real visual details from the
  photos (lighting, location, color palette, emotional tone)
- tappable as a button label

Also extract 3 dominant hex colors from the photos for each
suggestion so the wizard can pre-seed a palette.

Return ONLY this JSON, no markdown:
{
  "suggestions": [
    { "vibe": "<3-8 words>", "reason": "<1 sentence on why>", "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"] },
    { "vibe": "<3-8 words>", "reason": "<1 sentence>", "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"] },
    { "vibe": "<3-8 words>", "reason": "<1 sentence>", "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"] }
  ]
}

Rules:
- Exactly 3 suggestions, no more, no less.
- The three suggestions should each capture a DIFFERENT feeling
  from the photos — don't repeat yourself. Think: one feels
  warm & classic, one feels fresh & editorial, one feels
  moody & intimate.
- Never output generic words like "beautiful", "amazing",
  "journey", "unforgettable". Be specific.
- Colors must be real hex strings starting with "#".`;

async function fetchPhotoAsBase64(
  url: string,
  accessToken: string | undefined,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    // Proxy URLs won't work server-side — unwrap them first
    let target = url;
    if (url.includes('/api/photos/proxy')) {
      try {
        const inner = new URL(url, 'http://localhost').searchParams.get('url');
        if (inner) target = inner;
      } catch { /* keep original */ }
    }
    // Google Picker baseUrls require the user's OAuth token
    const headers: Record<string, string> = {};
    if (target.includes('googleusercontent.com') && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
      // Size hint — picker URLs need this
      if (!target.includes('=w') && !target.includes('=h')) {
        target = `${target}=w800-h800`;
      }
    }
    const res = await fetch(target, { headers, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return {
      mimeType: res.headers.get('content-type') || 'image/jpeg',
      data: Buffer.from(buf).toString('base64'),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    photoUrls?: string[];
    occasion?: string;
    names?: [string, string];
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const photoUrls = (body.photoUrls || []).filter((u) => typeof u === 'string').slice(0, 4);
  if (photoUrls.length === 0) {
    return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Vibe suggestion is not configured on this server.' },
      { status: 500 },
    );
  }

  // Fetch every photo as base64 so we can send them to Gemini
  // inline. Picker URLs need the OAuth token; R2 URLs are public.
  const accessToken = (session as unknown as { accessToken?: string }).accessToken;
  const imageParts = await Promise.all(
    photoUrls.map(async (url) => {
      const img = await fetchPhotoAsBase64(url, accessToken);
      if (!img) return null;
      return {
        inlineData: { mimeType: img.mimeType, data: img.data },
      };
    }),
  );
  const validImages = imageParts.filter(
    (p): p is { inlineData: { mimeType: string; data: string } } => p !== null,
  );

  if (validImages.length === 0) {
    return NextResponse.json(
      { error: 'Pear couldn\u2019t read any of those photos.' },
      { status: 502 },
    );
  }

  const occasion = typeof body.occasion === 'string' ? body.occasion : '';
  const names = Array.isArray(body.names)
    ? body.names.filter(Boolean).join(' & ')
    : '';

  const parts: Record<string, unknown>[] = [
    { text: PROMPT(occasion, names) },
    ...validImages,
  ];

  try {
    const res = await fetch(`${GEMINI_PRO}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[suggest-vibe] Gemini error', res.status, errText);
      return NextResponse.json(
        { error: 'Pear couldn\u2019t suggest a vibe right now — try again?' },
        { status: 502 },
      );
    }

    const data = await res.json();
    const raw: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    let parsed: { suggestions?: Suggestion[] };
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[suggest-vibe] Failed to parse JSON:', raw.slice(0, 200));
      return NextResponse.json(
        { error: 'Pear couldn\u2019t read the photos clearly.' },
        { status: 502 },
      );
    }

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((s) => s && typeof s.vibe === 'string' && s.vibe.trim().length > 0)
          .slice(0, 3)
          .map((s) => ({
            vibe: s.vibe.trim().slice(0, 80),
            reason: typeof s.reason === 'string' ? s.reason.trim().slice(0, 160) : '',
            palette: Array.isArray(s.palette)
              ? s.palette
                  .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c))
                  .slice(0, 4)
              : undefined,
          }))
      : [];

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: 'Pear couldn\u2019t find a vibe in those photos.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('[suggest-vibe] Exception:', err);
    return NextResponse.json(
      { error: 'Pear couldn\u2019t suggest a vibe right now — try again?' },
      { status: 500 },
    );
  }
}
