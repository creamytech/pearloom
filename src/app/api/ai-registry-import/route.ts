// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-registry-import/route.ts
// AI Registry URL Import — parses a registry URL from Zola,
// Amazon, The Knot, etc. and extracts structured info.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const RATE_LIMIT_REGISTRY_IMPORT = { max: 15, windowMs: 60 * 60 * 1000 };

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 512,
      },
    }),
  });
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user email
  const rateCheck = checkRateLimit(`ai-registry-import:${session.user.email}`, RATE_LIMIT_REGISTRY_IMPORT);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before importing more registries.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A registry URL is required' }, { status: 400 });
    }

    if (url.length > 500) {
      return NextResponse.json({ error: 'URL too long (max 500 characters)' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const prompt = `You are an AI assistant for Pearloom, a wedding website platform.

Given this registry URL, analyze it and extract structured information.
URL: "${url}"

Parse the URL to determine:
1. The registry platform (Zola, Amazon, The Knot, Crate & Barrel, Williams Sonoma, Target, Bed Bath & Beyond, etc.)
2. The couple's name if visible in the URL path
3. A suggested friendly note/description for this registry entry

Return ONLY valid JSON (no markdown, no backticks):
{
  "name": "Platform Name (e.g. Zola, Amazon Wedding, The Knot)",
  "url": "${url}",
  "note": "A warm 5-10 word description of what guests might find here",
  "platform": "platform-slug (e.g. zola, amazon, theknot, crateandbarrel)"
}`;

    let parsed: { name: string; url: string; note: string; platform: string };
    try {
      const raw = await callGemini(prompt, apiKey);
      parsed = JSON.parse(raw);
      // Ensure the URL stays as what was provided
      parsed.url = url;
    } catch {
      // Fallback: try to detect platform from URL
      const hostname = new URL(url).hostname.toLowerCase();
      let name = 'Registry';
      let platform = 'other';
      let note = 'Our registry wishlist';

      if (hostname.includes('zola.com')) { name = 'Zola'; platform = 'zola'; note = 'Our curated home & experience wishlist'; }
      else if (hostname.includes('amazon.com')) { name = 'Amazon'; platform = 'amazon'; note = 'Everyday essentials and fun extras'; }
      else if (hostname.includes('theknot.com')) { name = 'The Knot'; platform = 'theknot'; note = 'Our registry on The Knot'; }
      else if (hostname.includes('crateandbarrel.com')) { name = 'Crate & Barrel'; platform = 'crateandbarrel'; note = 'Home and kitchen favorites'; }
      else if (hostname.includes('williams-sonoma.com')) { name = 'Williams Sonoma'; platform = 'williams-sonoma'; note = 'Kitchen and entertaining picks'; }
      else if (hostname.includes('target.com')) { name = 'Target'; platform = 'target'; note = 'Home and everyday essentials'; }
      else if (hostname.includes('potterybarn.com')) { name = 'Pottery Barn'; platform = 'potterybarn'; note = 'Home decor and furnishings'; }
      else if (hostname.includes('honeyfund.com') || hostname.includes('hitchd.com')) { name = 'Honeymoon Fund'; platform = 'honeyfund'; note = 'Contribute to our honeymoon adventures'; }
      else if (hostname.includes('blueprintregistry.com')) { name = 'Blueprint'; platform = 'blueprint'; note = 'Our hand-picked registry'; }

      parsed = { name, url, note, platform };
    }

    return NextResponse.json({ entry: parsed });
  } catch (err) {
    console.error('[ai-registry-import] Error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
