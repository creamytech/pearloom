// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/translate/route.ts
//
// POST /api/sites/translate
//   body: { siteId, locale, manifest }
//   → translates the host-authored copy (chapters, poetry, faq,
//     events) into `locale` via Gemini Flash-Lite and returns
//     a TranslationsLocale object the editor merges back onto
//     manifest.translations[locale].
//
// We translate ONCE on demand (cheap), persist the result, and
// the published site reads from manifest.translations[locale]
// when the URL or browser locale matches. No more runtime DOM
// walk hack with Gemini calls on page load.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type TranslationLocale = NonNullable<StoryManifest['translations']>[string];

interface Body {
  siteId?: string;
  locale?: string;
  manifest?: StoryManifest;
}

const SUPPORTED = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'ar',
  'nl', 'pl', 'ru', 'tr', 'he', 'hi', 'th', 'vi',
]);

const LOCALE_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', zh: 'Mandarin Chinese', ko: 'Korean',
  ar: 'Arabic', nl: 'Dutch', pl: 'Polish', ru: 'Russian', tr: 'Turkish',
  he: 'Hebrew', hi: 'Hindi', th: 'Thai', vi: 'Vietnamese',
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`translate:${session.user.email}:${ip}`, {
    max: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Translation limited to 12/hour. Try later.' }, { status: 429 });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const locale = (body.locale ?? '').toLowerCase().slice(0, 5);
  if (!SUPPORTED.has(locale)) {
    return NextResponse.json({ error: `Unsupported locale "${locale}"` }, { status: 400 });
  }
  if (!body.manifest) return NextResponse.json({ error: 'manifest required' }, { status: 400 });
  const m = body.manifest;

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Translation not configured' }, { status: 500 });

  // Build a flat segment list. Each segment carries a stable key so
  // we can re-attach the translation to the right field.
  type Segment = { key: string; value: string };
  const segs: Segment[] = [];
  (m.chapters ?? []).forEach((c, i) => {
    if (c.title) segs.push({ key: `chapter.${c.id ?? i}.title`, value: c.title });
    if (c.subtitle) segs.push({ key: `chapter.${c.id ?? i}.subtitle`, value: c.subtitle });
    if (c.description) segs.push({ key: `chapter.${c.id ?? i}.description`, value: c.description });
  });
  const poetry = (m as unknown as { poetry?: { heroTagline?: string; closingLine?: string; rsvpIntro?: string; welcomeStatement?: string } }).poetry;
  if (poetry?.heroTagline) segs.push({ key: 'poetry.heroTagline', value: poetry.heroTagline });
  if (poetry?.closingLine) segs.push({ key: 'poetry.closingLine', value: poetry.closingLine });
  if (poetry?.rsvpIntro) segs.push({ key: 'poetry.rsvpIntro', value: poetry.rsvpIntro });
  if (poetry?.welcomeStatement) segs.push({ key: 'poetry.welcomeStatement', value: poetry.welcomeStatement });
  const faq = (m as unknown as { faq?: Array<{ id?: string; question?: string; answer?: string }> }).faq;
  (faq ?? []).forEach((f, i) => {
    if (f.question) segs.push({ key: `faq.${f.id ?? i}.question`, value: f.question });
    if (f.answer) segs.push({ key: `faq.${f.id ?? i}.answer`, value: f.answer });
  });
  (m.events ?? []).forEach((e, i) => {
    if (e.name) segs.push({ key: `event.${e.id ?? i}.name`, value: e.name });
    if (e.description) segs.push({ key: `event.${e.id ?? i}.description`, value: e.description });
  });

  if (segs.length === 0) {
    return NextResponse.json({ translations: { strings: {}, updatedAt: new Date().toISOString() } });
  }

  // One Gemini call with the whole segment list as JSON. Keep prompt
  // tight — model returns JSON of { key: translated_value }.
  const prompt = [
    `Translate the values in this JSON object into ${LOCALE_LABELS[locale] ?? locale}.`,
    'Preserve the keys exactly. Maintain proper nouns + place names. Keep tone editorial — these are wedding/celebration site copy.',
    'Return ONLY a single JSON object mapping each key to its translation. No prose, no markdown fences.',
    'Input:',
    JSON.stringify(Object.fromEntries(segs.map((s) => [s.key, s.value]))),
  ].join('\n\n');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, response_mime_type: 'application/json' },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('[translate]', res.status, t.slice(0, 200));
      return NextResponse.json({ error: `Gemini ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const map: Record<string, string> = JSON.parse(text);

    // Re-shape into TranslationLocale.
    const out: TranslationLocale = {
      chapters: [],
      poetry: {},
      faq: [],
      events: [],
      strings: {},
      updatedAt: new Date().toISOString(),
    };
    const chMap = new Map<string, { id?: string; title?: string; subtitle?: string; description?: string }>();
    const faqMap = new Map<string, { id?: string; question?: string; answer?: string }>();
    const evMap = new Map<string, { id?: string; name?: string; description?: string }>();
    for (const [key, value] of Object.entries(map)) {
      if (typeof value !== 'string') continue;
      const parts = key.split('.');
      const top = parts[0];
      if (top === 'poetry' && parts[1] && out.poetry) {
        (out.poetry as Record<string, string>)[parts[1]] = value;
      } else if (top === 'chapter') {
        const id = parts[1];
        const field = parts[2];
        const slot = chMap.get(id) ?? { id };
        (slot as Record<string, string>)[field] = value;
        chMap.set(id, slot);
      } else if (top === 'faq') {
        const id = parts[1];
        const field = parts[2];
        const slot = faqMap.get(id) ?? { id };
        (slot as Record<string, string>)[field] = value;
        faqMap.set(id, slot);
      } else if (top === 'event') {
        const id = parts[1];
        const field = parts[2];
        const slot = evMap.get(id) ?? { id };
        (slot as Record<string, string>)[field] = value;
        evMap.set(id, slot);
      } else if (out.strings) {
        out.strings[key] = value;
      }
    }
    out.chapters = Array.from(chMap.values());
    out.faq = Array.from(faqMap.values());
    out.events = Array.from(evMap.values());

    return NextResponse.json({ translations: out, locale });
  } catch (err) {
    console.error('[translate] error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Translation failed' },
      { status: 500 },
    );
  }
}
