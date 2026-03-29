// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / lib/memory-engine.ts â€” AI story generation
// Upgraded prompt: uses photo metadata (locations, dates,
// cameras, filenames) alongside rich vibe data
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';
import { generateVibeSkin, extractCoupleProfile, generateSiteArt, WAVE_PATHS } from '@/lib/vibe-engine';
import type { VibeSkin, CoupleProfile } from '@/lib/vibe-engine';

// ── Model routing ─────────────────────────────────────────────────────────
// Gemini 3.1 Pro → creative passes (story chapters, SVG art, poetry)
// Gemini 3 Flash  → analytical passes (critique, scoring, judgment)
// Gemini 3.1 Flash-Lite → lightweight extraction (couple DNA, metadata)
const GEMINI_PRO   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';
const GEMINI_FLASH = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const GEMINI_LITE  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

// Default — used for backward compat on any pass not explicitly routed
const GEMINI_API_BASE = GEMINI_FLASH;

// ── Dev-only logging helpers ─────────────────────────────────────────────────
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};
const logWarn = process.env.NODE_ENV === 'development' ? console.warn : () => {};
const logError = process.env.NODE_ENV === 'development' ? console.error : () => {};

/**
 * Wraps a Gemini fetch with automatic retry on 503 (UNAVAILABLE) and 429 (rate limit).
 * Uses exponential back-off: 2s â†’ 4s â†’ 8s (max 3 attempts).
 */
async function geminiRetryFetch(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 503 || res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const backoff = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      if (attempt < maxAttempts) {
        logWarn(`[Memory Engine] Gemini ${res.status} â€” retrying in ${backoff / 1000}s (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      lastError = new Error(`Gemini API temporarily unavailable (${res.status}). Please try again in a moment.`);
      throw lastError;
    }
    return res;
  }
  throw lastError ?? new Error('Gemini request failed after max retries');
}

/**
 * Sends photo clusters + vibe string to Gemini
 * and returns a fully structured Story Manifest.
 */
export async function generateStoryManifest(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  apiKey: string,
  googleAccessToken?: string,
  occasion?: string,
  eventDate?: string,
  inspirationUrls?: string[]
): Promise<StoryManifest> {
  // Cap chapters to number of photos (one chapter per photo cluster)
  const photoCount = clusters.length;
  const prompt = buildPrompt(clusters, vibeString, coupleNames, occasion, eventDate, photoCount);

  // Build the multimodal parts array
  const parts: Record<string, unknown>[] = [{ text: prompt }];

  // If we have an access token, fetch 1 representative image per cluster to show Gemini
  if (googleAccessToken) {
    log(`[Memory Engine] Fetching up to ${clusters.length} images for Multimodal AI analysis...`);
    const imagePromises = clusters.map(async (cluster) => {
      const bestPhoto = cluster.photos[0];
      if (!bestPhoto?.baseUrl) return null;
      
      try {
        const isGoogle = bestPhoto.baseUrl.includes('googleusercontent.com');
        const fetchUrl = isGoogle ? `${bestPhoto.baseUrl}=w1024-h1024` : bestPhoto.baseUrl;
        const headers = isGoogle && googleAccessToken ? { Authorization: `Bearer ${googleAccessToken}` } : undefined;

        const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(8000) });

        if (!res.ok) {
          logWarn(`[Memory Engine] Failed to fetch image: ${res.status} ${res.statusText}`);
          return null;
        }
        
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Gemini STRICTLY rejects application/octet-stream. Force it to image/jpeg if it's missing or generic.
        let mimeType = bestPhoto.mimeType || 'image/jpeg';
        if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg';
        }
        
        return {
          inlineData: {
            data: base64,
            mimeType,
          }
        };
      } catch (err) {
        logWarn('Failed to fetch image for Gemini:', err);
        return null;
      }
    });

    const resolvedImages = await Promise.all(imagePromises);
    resolvedImages.forEach((imgData, index) => {
      if (imgData) {
        // Interleave text markers so Gemini knows which cluster this image belongs to
        parts.push({ text: `\n\n--- Image for Cluster ${index} ---` });
        parts.push(imgData);
      }
    });
    log(`[Memory Engine] Successfully appended images to Gemini prompt!`);
  }

  // Pass 1 uses Gemini 3.1 Pro — core storytelling is the most important creative pass
  log('[Memory Engine] Pass 1: Sending to Gemini 3.1 Pro (core storytelling)...');
  const res = await geminiRetryFetch(`${GEMINI_PRO}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.85,
        maxOutputTokens: 16384,
        topP: 0.95,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  // â”€â”€ Robust JSON extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Strip leading/trailing whitespace
  rawText = rawText.trim();

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  rawText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // 3. If the response has stray text before the JSON object, find '{'
  const firstBrace = rawText.indexOf('{');
  if (firstBrace > 0) {
    rawText = rawText.slice(firstBrace);
  }

  // 4. If JSON is truncated mid-string (odd number of unescaped quotes),
  // cut to the last safely-closed string boundary.
  // Count only unescaped " chars to detect truncation
  const unescapedQuotes = (rawText.match(/(?<!\\)"/g) || []).length;
  if (unescapedQuotes % 2 !== 0) {
    // Truncated mid-string — cut at last safely-closed key/value boundary
    const lastClosedQuote = rawText.lastIndexOf('",');
    if (lastClosedQuote > 0) rawText = rawText.slice(0, lastClosedQuote + 1);
  }

  // 5. Count { vs } â€” append missing closing braces
  let depth = 0;
  for (const ch of rawText) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  if (depth > 0) {
    rawText += '}'.repeat(depth);
  }

  // 6. Remove trailing commas before } or ] (common Gemini mistake)
  rawText = rawText.replace(/,\s*([}\]])/g, '$1');

  let parsed: Partial<StoryManifest>;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    logError('[memory-engine] Failed to parse Gemini JSON:', e);
    logError('[memory-engine] Raw text (first 800 chars):', rawText.slice(0, 800));

    // Last resort: try extracting just the chapters array if it's there
    try {
      const chapStart = rawText.indexOf('"chapters"');
      if (chapStart !== -1) {
        const partial = '{' + rawText.slice(chapStart);
        parsed = JSON.parse(partial + '}');
        logWarn('[memory-engine] Recovered partial manifest (chapters only)');
      } else {
        throw new Error('no chapters');
      }
    } catch {
      throw new Error('AI returned invalid JSON. Please try again.');
    }
  }

  // Defensive defaults â€” ensure every required field exists before the editor renders
  const DEFAULT_THEME = {
    name: 'pearloom-ivory',
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    colors: {
      background: '#F5F1E8',
      foreground: '#2B2B2B',
      accent: '#A3B18A',
      accentLight: '#EEE8DC',
      muted: '#9A9488',
      cardBg: '#ffffff',
    },
    borderRadius: '1rem',
  };

  let manifest: StoryManifest = {
    coupleId: parsed.coupleId || `couple-${Date.now()}`,
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    vibeString: parsed.vibeString || '',
    theme: parsed.theme ?? DEFAULT_THEME,
    chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    comingSoon: parsed.comingSoon ?? {
      enabled: false,
      title: 'Coming Soon',
      subtitle: 'Something beautiful is on its way.',
      passwordProtected: false,
    },
    logistics: parsed.logistics,
    registry: parsed.registry,
    events: parsed.events,
    faqs: parsed.faqs,
    travelInfo: parsed.travelInfo,
  };

  // Ensure theme has all required color keys
  manifest.theme = {
    ...DEFAULT_THEME,
    ...manifest.theme,
    colors: {
      ...DEFAULT_THEME.colors,
      ...(manifest.theme?.colors || {}),
    },
    fonts: {
      ...DEFAULT_THEME.fonts,
      ...(manifest.theme?.fonts || {}),
    },
  };

  // â”€â”€â”€ CRITICAL: Hydrate chapter images from source clusters â”€â”€â”€
  // The AI always returns `images: []`. We post-process here to
  // match each chapter back to its source cluster by date range
  // and inject the real photo URLs.
  manifest.chapters = hydrateChapterImages(manifest.chapters, clusters);

  // Cap chapters to photoCount: strip any AI-hallucinated extras.
  // Prevents chapters that reference non-existent photos.
  if (photoCount > 0 && manifest.chapters.length > photoCount) {
    logWarn(`[Memory Engine] AI generated ${manifest.chapters.length} chapters but only ${photoCount} photo cluster(s) — trimming to ${photoCount}`);
    manifest.chapters = manifest.chapters.slice(0, photoCount);
  }

  // Deduplicate chapters: remove any chapter whose title normalizes to a duplicate
  const seenTitles = new Set<string>();
  manifest.chapters = manifest.chapters.filter((ch: Chapter) => {
    const key = ch.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  manifest.chapters = manifest.chapters
    .sort((a: Chapter, b: Chapter) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((ch: Chapter, i: number) => ({
      ...ch,
      order: i,
      isEmotionalPeak: (ch.emotionalIntensity ?? 0) >= 8,
    }));

  // Strip banned words from chapter content (in case AI ignored the instruction)
  const BANNED_WORDS_RE = /\b(journey|adventure|soulmate|fairy[ -]?tale|happily ever after|storybook|chapter of our lives?|love story begins?|ride or die)\b/gi;
  manifest.chapters = manifest.chapters.map((ch: Chapter) => ({
    ...ch,
    title: ch.title?.replace(BANNED_WORDS_RE, '').trim() || ch.title,
    description: ch.description?.replace(BANNED_WORDS_RE, '').trim() || ch.description,
    subtitle: ch.subtitle?.replace(BANNED_WORDS_RE, '').trim() || ch.subtitle,
  }));

  // ── Passes 1.2, 1.5, 4: Run in parallel ─────────────────────────────
  // All three depend only on the chapters from Pass 1 and the vibeString.
  // None depend on each other — run concurrently to save ~40-60s.
  const clusterNotes = clusters
    .map((cluster, i) => ({
      chapterIndex: i,
      note: cluster.note ?? '',
      location: cluster.location?.label ?? null,
    }))
    .filter(cn => cn.note.length > 0);

  const chaptersSnapshot = manifest.chapters;

  const [pass12Result, pass15Result, pass4Result] = await Promise.allSettled([
    // Pass 1.2: Chapter quality gate (Flash — scoring/judgment)
    critiqueAndRefineChapters(chaptersSnapshot, vibeString, coupleNames, apiKey, occasion, clusterNotes),
    // Pass 1.5: Couple DNA extraction (Lite — lightweight)
    extractCoupleProfile(
      vibeString,
      chaptersSnapshot.map(c => ({ title: c.title, description: c.description, mood: c.mood })),
      apiKey,
      occasion
    ),
    // Pass 4: Poetry (Flash — only needs chapters + vibe, no design context needed)
    generatePoetryPass(manifest.vibeString, coupleNames, chaptersSnapshot, apiKey, occasion),
  ]);

  if (pass12Result.status === 'fulfilled') {
    manifest.chapters = pass12Result.value;
    log('[Memory Engine] Pass 1.2: Chapter quality gate complete');
  } else {
    logWarn('[Memory Engine] Chapter quality gate failed (non-fatal):', pass12Result.reason);
  }

  let coupleProfile: CoupleProfile | undefined;
  if (pass15Result.status === 'fulfilled') {
    coupleProfile = pass15Result.value;
    log('[Memory Engine] Pass 1.5: Couple DNA extracted —',
      `pets: [${coupleProfile.pets.join(', ')}]`,
      `interests: [${coupleProfile.interests.join(', ')}]`
    );
  } else {
    logWarn('[Memory Engine] Couple profile extraction failed (non-fatal):', pass15Result.reason);
    coupleProfile = { pets: [], interests: [], locations: [], motifs: [], heritage: [], illustrationPrompt: '' };
  }

  if (pass4Result.status === 'fulfilled') {
    manifest.poetry = pass4Result.value;
    log('[Memory Engine] Pass 4: Poetry pass complete');
  } else {
    logWarn('[Memory Engine] Poetry pass failed (non-fatal):', pass4Result.reason);
  }

  // ── Pass 2: Generate vibeSkin (visual design + custom SVG art) ────────
  // Depends on refined chapters (1.2) and couple profile (1.5) — runs after both.
  try {
    const chapterContext = manifest.chapters.map(c => ({
      title: c.title,
      subtitle: c.subtitle,
      mood: c.mood,
      location: c.location,
      description: c.description,
    }));

    // Pass first photo from each cluster as representative photo URLs (with size params)
    const photoUrls = clusters.slice(0, 5)
      .map(c => c.photos[0]?.baseUrl)
      .filter(Boolean)
      .map(url => url.includes('googleusercontent.com') ? `${url}=w800-h800` : url) as string[];

    const vibeSkin = await generateVibeSkin(manifest.vibeString, apiKey, coupleNames, {
      chapters: chapterContext,
      photoUrls,
      inspirationUrls,
      coupleProfile,  // Couple DNA drives bespoke illustration generation
    }, occasion);
    manifest.vibeSkin = vibeSkin;
    log('[Memory Engine] Pass 2: VibeSkin generated',
      vibeSkin.chapterIcons?.length ? `with ${vibeSkin.chapterIcons.length} chapter icons` : '(no chapter icons)'
    );
  } catch (err) {
    logWarn('[Memory Engine] VibeSkin generation failed (non-fatal):', err);
  }

  // ── Passes 2.5 and 3: Run in parallel after Pass 2 ───────────────────
  // Both depend only on manifest.vibeSkin from Pass 2.
  // Pass 2.5: Raster art (hero panel + ambient bg + art strip)
  // Pass 3: Design critique & iterative refinement
  if (manifest.vibeSkin) {
    const vibeSkinForParallel = manifest.vibeSkin;

    const [artResult, critiqueResult] = await Promise.allSettled([
      generateSiteArt(manifest.vibeString, vibeSkinForParallel.palette, apiKey, occasion, coupleNames),
      critiqueAndRefineDesign(vibeSkinForParallel, manifest.vibeString, coupleNames, apiKey),
    ]);

    // Apply design critique first (replaces base vibeSkin with improved version)
    if (critiqueResult.status === 'fulfilled') {
      manifest.vibeSkin = critiqueResult.value;
      log('[Memory Engine] Pass 3: Design critique complete');
    } else {
      logWarn('[Memory Engine] Design critique pass failed (non-fatal):', critiqueResult.reason);
    }

    // Apply raster art on top (additive — sets art DataURLs on the (possibly critiqued) skin)
    if (artResult.status === 'fulfilled') {
      const siteArt = artResult.value;
      if (siteArt.heroArtDataUrl) manifest.vibeSkin.heroArtDataUrl = siteArt.heroArtDataUrl;
      if (siteArt.ambientArtDataUrl) manifest.vibeSkin.ambientArtDataUrl = siteArt.ambientArtDataUrl;
      if (siteArt.artStripDataUrl) manifest.vibeSkin.artStripDataUrl = siteArt.artStripDataUrl;
      log('[Memory Engine] Pass 2.5: Raster art generation complete');
    } else {
      logWarn('[Memory Engine] Raster art generation failed (non-fatal):', artResult.reason);
    }
  }

  return manifest;
}

// ── Pass 1.2: Chapter Story Quality Gate ─────────────────────────────
// Gemini reviews every chapter description and scores it 1–10 for
// "could this ONLY belong to this specific couple?"
// Any chapter scoring < 7 is rewritten before the user ever sees it.
async function critiqueAndRefineChapters(
  chapters: import('@/types').Chapter[],
  vibeString: string,
  coupleNames: [string, string] | undefined,
  apiKey: string,
  occasion?: string,
  clusterNotes?: Array<{ chapterIndex: number; note: string; location: string | null }>
): Promise<import('@/types').Chapter[]> {
  if (!chapters.length) return chapters;
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const occ = (occasion || 'wedding').charAt(0).toUpperCase() + (occasion || 'wedding').slice(1);

  const chapterList = chapters.map((c, i) =>
    `Chapter ${i}:\n  Title: "${c.title}"\n  Subtitle: "${c.subtitle}"\n  Description: "${c.description}"\n  Mood: ${c.mood}`
  ).join('\n\n');

  // Build cluster notes section for the prompt
  const notesSection = (clusterNotes && clusterNotes.length > 0)
    ? `\nCRITICAL: The following chapters have USER-WRITTEN NOTES that MUST be preserved and reflected in any rewrite:\n${
        clusterNotes
          .filter(cn => cn.chapterIndex < chapters.length)
          .map(cn => {
            const locationPart = cn.location ? ` (location: ${cn.location})` : '';
            return `Chapter ${cn.chapterIndex}: User note: '${cn.note}'${locationPart} — this MUST appear in any rewrite`;
          })
          .join('\n')
      }\n\nWhen a chapter with a user note scores < 7, the issue is generic PROSE, not the content reference. The rewrite must still honor the note's location, activity, and emotional context.\n`
    : '';

  const prompt = `You are a world-class story editor reviewing chapters for ${namesCtx}'s ${occ} website on Pearloom.

Their vibe: "${vibeString.slice(0, 300)}"
${notesSection}
CHAPTERS TO REVIEW:
${chapterList}

For EACH chapter, score 1–10: "Could this description ONLY belong to this couple, or could it fit any ${occ} site?"

Score guide:
- 1–3: Generic filler ("Our journey began...", "We started our adventure...", "It was a beautiful day")
- 4–6: Some personal detail but still fits many couples
- 7–10: Deeply specific — references THEIR actual vibe, uses unexpected language, feels written for THEM alone

Return ONLY valid JSON (no markdown):
{
  "chapters": [
    {
      "index": 0,
      "score": <1-10>,
      "issue": "<one-sentence reason if score < 7, else null>",
      "rewrite": {
        "title": "<improved title, or null if score >= 7>",
        "subtitle": "<improved subtitle, or null if score >= 7>",
        "description": "<FULL rewritten description if score < 7 — 3-4 sentences, FIRST PERSON PLURAL (we/us/our), deeply specific to their vibe, zero clichés. null if score >= 7>"
      }
    }
  ]
}

REWRITE RULES (apply only when score < 7):
- Preserve the date, mood, location metadata — only rewrite the prose
- Must use "We" / "us" / "our" throughout
- Must weave specific details from: "${vibeString.slice(0, 200)}"
- BANNED WORDS: journey, adventure, soulmate, fairy tale, magical, beautiful memories, new chapter, story of us, chapter of our lives
- Each rewritten description must feel like it could ONLY be THIS couple's site`;

  try {
    // Pass 1.2 uses Flash — scoring/judgment task, speed matters more than creativity
    const res = await geminiRetryFetch(
      `${GEMINI_FLASH}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.9,
            maxOutputTokens: 4096,
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Chapter critique API ${res.status}`);

    const data = await res.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      .replace(/,\s*([}\]])/g, '$1');

    const result = JSON.parse(raw) as {
      chapters: Array<{
        index: number;
        score: number;
        issue?: string | null;
        rewrite: { title: string | null; subtitle: string | null; description: string | null };
      }>;
    };

    // Build a set of chapter indices that have user notes (they get a higher score floor)
    const chaptersWithNotes = new Set(
      (clusterNotes ?? []).map(cn => cn.chapterIndex)
    );

    let rewriteCount = 0;
    const improved = [...chapters];
    for (const review of (result.chapters || [])) {
      const idx = review.index;
      if (typeof idx !== 'number' || idx < 0 || idx >= improved.length) continue;
      // Chapters with user notes only get rewritten if score < 6 (floor bumped to 6)
      // so they are only rewritten when truly broken, not just slightly generic.
      const rewriteThreshold = chaptersWithNotes.has(idx) ? 6 : 7;
      if (review.score < rewriteThreshold && review.rewrite) {
        const ch = { ...improved[idx] };
        if (review.rewrite.title) ch.title = review.rewrite.title;
        if (review.rewrite.subtitle) ch.subtitle = review.rewrite.subtitle;
        if (review.rewrite.description) ch.description = review.rewrite.description;
        improved[idx] = ch;
        rewriteCount++;
        log(`[Chapter Critique] Chapter ${idx} scored ${review.score}/10 — rewritten: ${review.issue}`);
      } else {
        log(`[Chapter Critique] Chapter ${idx} scored ${review.score}/10 — approved`);
      }
    }
    log(`[Chapter Critique] ${rewriteCount}/${chapters.length} chapter(s) rewritten`);
    return improved;
  } catch (err) {
    logWarn('[Chapter Critique] Failed (non-fatal):', err);
    return chapters;
  }
}

// ── Pass 4: Poetry pass ───────────────────────────────────────────────
// Gemini call that generates all couple-specific copywriting:
//   heroTagline      — 5-8 word poetic subtitle for the hero section
//   closingLine      — 10-15 word footer closing line
//   rsvpIntro        — warm, personal 1-2 sentence intro for RSVP
//   welcomeStatement — 3-5 sentence personal intro in the couple's own voice
//   milestones       — year-by-year highlights (anniversaries/birthdays only)
async function generatePoetryPass(
  vibeString: string,
  coupleNames: [string, string] | undefined,
  chapters: import('@/types').Chapter[],
  apiKey: string,
  occasion?: string
): Promise<{
  heroTagline: string;
  closingLine: string;
  rsvpIntro: string;
  welcomeStatement?: string;
  milestones?: Array<{ year: number; label: string; emoji?: string }>;
}> {
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const name1 = coupleNames?.[0] ?? 'We';
  const occ = occasion || 'wedding';

  // Pull a few chapter titles to give Gemini narrative context
  const chapterTitles = chapters.slice(0, 5).map(c => `"${c.title}"`).join(', ');
  const chapterDescSample = chapters[0]?.description?.slice(0, 150) || '';

  const occasionSectionLabels: Record<string, string> = {
    wedding:     'Our Story, The Ceremony, The Celebration, Our Registry, Getting There, Good to Know',
    anniversary: 'Our Journey, Through the Years, Still Us, The Celebration, Wishes',
    birthday:    `Who They Are, Their Story, Celebrating ${name1}, Wishes & Messages`,
    engagement:  "Our Love Story, The Proposal, The Party, What's Next",
    story:       'Our Story, Our Moments, Our World',
  };

  const rsvpIntroContext: Record<string, string> = {
    wedding:     'Write as a couple inviting guests to their wedding celebration.',
    anniversary: 'Write as a couple inviting friends to their anniversary celebration. Warm and inclusive.',
    birthday:    'Write as the host inviting guests to a birthday celebration. Center the birthday person.',
    engagement:  'Write as an engaged couple sharing their joy and inviting guests to celebrate.',
    story:       'Write as a warm personal invitation to share in this moment.',
  };

  const welcomeVoiceGuide: Record<string, string> = {
    wedding:     `Write as the couple, introducing themselves and their relationship. Reference how they met or something specific from their vibe. End with anticipation for the wedding.`,
    anniversary: `Write as the couple looking back at years together. Reference the number of years and something specific they've lived through. Celebratory, warm, reflective.`,
    birthday:    `Write as the host (or the birthday person themselves) introducing ${name1} to guests. Celebrate who they are — specific personality, passions, what makes them unforgettable. First person ("I'm ${name1}…") or third person from the host's perspective.`,
    engagement:  `Write as the newly-engaged couple, bursting with excitement. Reference the proposal story if available in the vibe. Romantic, electric, full of "what's next" energy.`,
    story:       `Write as the person/couple behind this site, introducing themselves and why this story matters. Intimate, personal, literary.`,
  };

  const needsMilestones = ['anniversary', 'birthday'].includes(occ);
  const milestonesInstruction = needsMilestones ? `
5. milestones: An array of ${occ === 'anniversary' ? '6-10 year-by-year highlights from their relationship' : '4-8 life highlights from this person\'s story'}. Each milestone should feel like a mini-chapter title — specific, poetic, 3-6 words. Use the chapter titles and vibe string as source material. Include a relevant emoji for each.
   Example for anniversary: [{"year": 2018, "label": "First terrible date, best story", "emoji": "☕"}, {"year": 2019, "label": "Moved in, chaos ensued", "emoji": "📦"}]
   Example for birthday: [{"year": 1994, "label": "Arrived, immediately took over", "emoji": "🌟"}, {"year": 2012, "label": "Discovered the mountains", "emoji": "⛰️"}]
` : '';

  const sectionLabels = occasionSectionLabels[occ] || occasionSectionLabels.wedding;
  const rsvpContext = rsvpIntroContext[occ] || rsvpIntroContext.wedding;
  const welcomeVoice = welcomeVoiceGuide[occ] || welcomeVoiceGuide.wedding;
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);

  const poetryPrompt = `You are a gifted copywriter and poet writing for ${namesCtx}'s ${occCap} website on Pearloom.
Their vibe: "${vibeString}"
Story chapters: ${chapterTitles || 'the beginning of their love'}
Sample chapter prose: "${chapterDescSample}"

This is a ${occCap} site — every piece of writing must reflect THIS specific occasion and THIS specific person/couple.

Use section labels appropriate for a ${occCap}: ${sectionLabels}

Write ${needsMilestones ? '5' : '4'} pieces of text — each must be deeply specific, not generic:

1. heroTagline: A 5-8 word poetic subtitle for their hero section. Should feel like a line from a literary novel or indie film. NOT clichés like "A love story written in stars". Must reference their actual vibe.
   Strong examples: "Where the mountains remembered everything", "Two people who chose the long way home", "Still the same room, still the same light"

2. closingLine: A 10-15 word closing line for their site footer. Warm, intimate, final. References their specific story or vibe — not a generic platitude.
   Strong examples: "Two threads, one loom, forever woven in light", "Here is where we began. Here is where we stay.", "See you on the other side of forever."

3. rsvpIntro: A warm, personal 1-2 sentence intro for their RSVP section. ${rsvpContext} Must feel genuinely personal with a specific nod to their celebration.

4. welcomeStatement: ${welcomeVoice}
   CRITICAL RULES:
   - 3-5 sentences. No more.
   - Must feel like a REAL person wrote it, not an AI. Conversational, specific, alive.
   - Must reference at least ONE specific detail from their vibe: "${vibeString.slice(0, 200)}"
   - Banned: "journey", "adventure", "fairy tale", "soulmate", "beautifully unique story"
   - Must make a guest feel like they know these people after reading it.
   - Strong example tone: "We're Mia and Carlos. We met at a salsa class in Miami — he stepped on her feet twice, she forgave him anyway. Four years later, we're doing this. This site is our way of sharing a little of what got us here before the big day."
${milestonesInstruction}
Return ONLY valid JSON (no markdown, no backticks):
{
  "heroTagline": "<5-8 word poetic subtitle>",
  "closingLine": "<10-15 word closing footer line>",
  "rsvpIntro": "<1-2 warm, personal sentences>",
  "welcomeStatement": "<3-5 sentence personal intro in their voice>"${needsMilestones ? `,
  "milestones": [{"year": <number>, "label": "<3-6 word specific highlight>", "emoji": "<single emoji>"}]` : ''}
}`;

  // Pass 4 uses Gemini 3.1 Pro — welcome statement + poetry requires maximum creative quality
  const res = await geminiRetryFetch(
    `${GEMINI_PRO}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: poetryPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1.0,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Poetry pass API ${res.status}`);

  const data = await res.json();
  let raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    .replace(/,\s*([}\]])/g, '$1');

  const result = JSON.parse(raw) as {
    heroTagline?: string;
    closingLine?: string;
    rsvpIntro?: string;
    welcomeStatement?: string;
    milestones?: Array<{ year: number; label: string; emoji?: string }>;
  };

  return {
    heroTagline: typeof result.heroTagline === 'string' && result.heroTagline.length > 0
      ? result.heroTagline : 'A love story worth every page',
    closingLine: typeof result.closingLine === 'string' && result.closingLine.length > 0
      ? result.closingLine : 'Thank you for being part of our story.',
    rsvpIntro: typeof result.rsvpIntro === 'string' && result.rsvpIntro.length > 0
      ? result.rsvpIntro : "We can't wait to celebrate with you. Please let us know if you'll be joining us.",
    ...(typeof result.welcomeStatement === 'string' && result.welcomeStatement.length > 10
      ? { welcomeStatement: result.welcomeStatement } : {}),
    ...(Array.isArray(result.milestones) && result.milestones.length > 0
      ? { milestones: result.milestones } : {}),
  };
}

// ── Design critique & iterative refinement pass ───────────────────────
// Gemini reviews the VibeSkin it just generated and asks:
//   "Is this design truly specific to this couple's world,
//    or could it belong to any wedding site?"
// Scores each dimension 1-10 and patches any below 7.
async function critiqueAndRefineDesign(
  skin: VibeSkin,
  vibeString: string,
  coupleNames: [string, string] | undefined,
  apiKey: string
): Promise<VibeSkin> {

  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';

  const critiquePrompt = `You are a senior art director and brand strategist reviewing an AI-generated wedding website design for ${namesCtx}.

Their vibe: "${vibeString}"

Current design spec:
- Visual tone: ${skin.tone}
- Curve/shape language: ${skin.curve}
- Color accent: ${skin.particleColor}
- Primary motif: ${skin.accentSymbol}
- Decorative icons: ${skin.decorIcons.join(' ')}
- Divider quote: "${skin.dividerQuote}"
- Section labels: ${JSON.stringify(skin.sectionLabels, null, 2)}
- Custom SVG art generated: ${[skin.heroPatternSvg, skin.sectionBorderSvg, skin.medallionSvg].filter(Boolean).length}/3 pieces

Your job: Score each of these dimensions 1-10 for how SPECIFIC and UNIQUE they feel to "${vibeString}" (vs. being generic wedding defaults):
1. particleColor — does this hex feel emotionally tied to their specific vibe world?
2. decorIcons — are these icons thematically tied to their world (not just generic hearts/stars)?  
3. dividerQuote — does this quote feel written FOR them specifically (not a cliche)?
4. sectionLabels — do these feel like a letter written to this couple, not just relabeled defaults?
5. tone — is this the right emotional register for their specific vibe?

If ALL score 7+, return: { "approved": true }

If ANY score below 7, return ONLY the fields that need improvement:
{
  "approved": false,
  "reason": "<single sentence: what's the weakest point>",
  "improvements": {
    "particleColor": "<more evocative hex if needed>",
    "accentSymbol": "<more thematically specific symbol if needed>",
    "decorIcons": ["<5 icons tightly tied to their specific vibe world>"],
    "dividerQuote": "<original quote that could only be for THIS couple — intimate, specific, under 14 words>",
    "tone": "<corrected tone if needed — dreamy|playful|luxurious|wild|intimate|cosmic|rustic>",
    "curve": "<corrected curve if needed — organic|arch|geometric|wave|petal>",
    "sectionLabels": {
      "story": "<poetic label that fits their vibe>",
      "events": "<label>",
      "registry": "<label>",
      "travel": "<label>",
      "faqs": "<label>",
      "rsvp": "<personal invitation in their voice>"
    }
  }
}

Return ONLY valid JSON. No markdown. No backticks.`;

  // Pass 3 uses Flash — analytical judgment, not creative output
  const res = await fetch(
    `${GEMINI_FLASH}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: critiquePrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.5,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Design critique API \${res.status}`);

  const data = await res.json();
  let raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    .replace(/,\s*([}\]])/g, '$1');

  const result = JSON.parse(raw) as {
    approved?: boolean;
    reason?: string;
    improvements?: Partial<VibeSkin & { sectionLabels: VibeSkin['sectionLabels'] }>;
  };

  if (result.approved) {
    log('[Design Critique] Design approved — thematically specific, no changes needed');
    return skin;
  }

  const imp = result.improvements ?? {};
  log(`[Design Critique] Refining design: \${result.reason || 'generic elements detected'}`);

  const VALID_CURVES: VibeSkin['curve'][] = ['organic', 'arch', 'geometric', 'wave', 'petal'];
  const VALID_TONES: VibeSkin['tone'][] = ['dreamy', 'playful', 'luxurious', 'wild', 'intimate', 'cosmic', 'rustic'];

  const curve: VibeSkin['curve'] = (imp.curve && VALID_CURVES.includes(imp.curve as VibeSkin['curve']))
    ? imp.curve as VibeSkin['curve'] : skin.curve;
  const waveDef = WAVE_PATHS[curve];

  return {
    ...skin,
    curve,
    wavePath: waveDef.d,
    wavePathInverted: waveDef.di,
    ...(imp.tone && VALID_TONES.includes(imp.tone as VibeSkin['tone']) ? { tone: imp.tone as VibeSkin['tone'] } : {}),
    ...(imp.particle ? { particle: imp.particle } : {}),
    ...(imp.particleColor ? { particleColor: imp.particleColor } : {}),
    ...(imp.accentSymbol ? { accentSymbol: imp.accentSymbol } : {}),
    ...(Array.isArray(imp.decorIcons) && imp.decorIcons.length >= 3
      ? { decorIcons: imp.decorIcons.slice(0, 5) } : {}),
    ...(imp.dividerQuote ? { dividerQuote: imp.dividerQuote } : {}),
    ...(imp.sectionLabels ? {
      sectionLabels: { ...skin.sectionLabels, ...imp.sectionLabels }
    } : {}),
  };
}

/**
 * Matches AI-generated chapters back to their source photo clusters
 * by date proximity, then injects ChapterImage[] from the cluster's photos.
 * Each photo gets a { id, url, alt, width, height } record.
 */
function hydrateChapterImages(
  chapters: Chapter[],
  clusters: PhotoCluster[]
): Chapter[] {
  if (!clusters.length) return chapters;

  return chapters.map((chapter) => {
    // Find the cluster whose date range contains or is nearest to the chapter date
    const chapterTime = new Date(chapter.date).getTime();

    let bestCluster: PhotoCluster | null = null;
    let bestDelta = Infinity;

    for (const cluster of clusters) {
      const start = new Date(cluster.startDate).getTime();
      const end = new Date(cluster.endDate).getTime();
      const mid = (start + end) / 2;

      // Exact range match â€” prefer this
      if (chapterTime >= start - 86_400_000 && chapterTime <= end + 86_400_000) {
        bestCluster = cluster;
        break;
      }

      // Otherwise track nearest midpoint
      const delta = Math.abs(chapterTime - mid);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestCluster = cluster;
      }
    }

    if (!bestCluster) return chapter;

    // Build ChapterImage[] from the cluster's photos
    // Limit to 6 per chapter to keep the UI clean
    const images: import('@/types').ChapterImage[] = bestCluster.photos
      .slice(0, 6)
      .map((photo) => ({
        id: photo.id,
        // Google Photos: append size params. Local uploads: already a data URL
        url: photo.baseUrl.includes('googleusercontent.com')
          ? `${photo.baseUrl}=w1600-h1600`
          : photo.baseUrl,
        alt: photo.description || photo.filename || chapter.title,
        width: photo.width || 1600,
        height: photo.height || 1200,
      }));

    return { ...chapter, images };
  });
}

function buildPrompt(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  occasion?: string,
  eventDate?: string,
  photoCount?: number
): string {
  // Build richly detailed cluster summaries including per-photo metadata
  const clusterSummary = clusters.map((c, i) => {
    const photoDetails = c.photos.map(p => ({
      filename: p.filename,
      date: p.creationTime?.slice(0, 10),
      camera: [p.cameraMake, p.cameraModel].filter(Boolean).join(' ') || 'unknown',
      dimensions: `${p.width}x${p.height}`,
      mimeType: p.mimeType,
    }));

    return {
      clusterIndex: i,
      dateRange: `${c.startDate.slice(0, 10)} to ${c.endDate.slice(0, 10)}`,
      photoCount: c.photos.length,
      note: c.note || null,
      noteInstruction: c.note
        ? `⚠️ HIGHEST PRIORITY CONTEXT — written BY THE COUPLE about this exact moment: '${c.note}'. The chapter title, subtitle, and description MUST directly reflect this note's emotion, details, and voice.`
        : null,
      location: c.location?.label || null,
      locationInstruction: c.location?.label
        ? `This chapter takes place in ${c.location.label}. Weave this place into the narrative naturally — the light there, the feeling of arriving, what made it memorable. Do NOT invent a location if none is provided.`
        : 'No specific location was given for this chapter. Do NOT make up or invent a location. Write about the emotional space and feeling instead of a geographical place.',
      photos: photoDetails,
    };
  });

  const occ = occasion || 'wedding';
  const occasionLabels: Record<string, string> = {
    wedding: 'a breathtaking wedding website with ceremony & reception events',
    engagement: 'a stunning engagement announcement & celebration website',
    anniversary: 'a beautiful anniversary celebration documenting years of love',
    birthday: 'a joyful birthday celebration gift website',
    story: 'a deeply personal love story documentary website',
  };
  const ctxLabel = occasionLabels[occ] || occasionLabels.wedding;
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);

  const eventDateCtx = eventDate
    ? `\n- The couple's event is on ${eventDate}. If this chapter predates the event, write with anticipation building toward it. If the chapter is recent, write with the joy of imminence.`
    : '';

  const occasionChapterGuidance: Record<string, string> = {
    wedding: `CHAPTER STRUCTURE: Build toward the wedding day. Suggested arc:
    - "How we met" or "The beginning" — origin story
    - "Growing together" — key moments, adventures, milestones
    - "The proposal" — if proposal happened and photos exist
    - "Our wedding day" or forward-looking — ceremony/celebration
    Each chapter should build emotional anticipation toward the event.`,

    anniversary: `CHAPTER STRUCTURE: This is a RETROSPECTIVE celebration of years together. Build a timeline narrative:
    - Early chapters: "The beginning", "Year One", early memories
    - Middle chapters: milestones, adventures, challenges overcome, growth
    - Final chapter: "Today" or "Still choosing you" — present-day celebration
    If anniversaryYears is provided, reference the specific milestone meaningfully.
    Tone: warm, nostalgic, celebratory of endurance and deepening love.
    DO NOT treat this as a forward-looking wedding site. This is a love retrospective.`,

    birthday: `CHAPTER STRUCTURE: This is a TRIBUTE to a specific person. Build chapters that celebrate WHO THEY ARE:
    - First chapter: "Who you are" — their personality, spirit, what makes them unique
    - Middle chapters: key life chapters, their passions, adventures, relationships
    - Final chapter: "Here's to you" or "Happy [age]th" — joyful celebration
    If birthdayAge is provided, reference the milestone meaningfully.
    Tone: joyful, celebratory, personal, tribute-style. Center the birthday person, not a couple narrative.
    DO NOT write as if this is a couple's love story.`,

    engagement: `CHAPTER STRUCTURE: This is a LOVE STORY building toward the proposal and beyond:
    - First chapters: how they met, falling in love, growing together
    - Key chapter: "The proposal" — tell the proposal story with emotion and detail
    - Final chapter: "What's next" or "Forever starts now" — the future together
    If proposalStory is in the vibe data, use it as the emotional centerpiece.
    Tone: romantic, electric, forward-looking, full of anticipation.`,

    story: `CHAPTER STRUCTURE: This is a PURE LOVE STORY or personal narrative with no event anchor:
    - Chapters based entirely on the photos and emotional moments
    - No requirement to build toward any event date
    - Can be abstract, poetic, impressionistic
    - Let the photos and vibe guide structure
    Tone: intimate, literary, personal.`,
  };

  const chapterGuidance = occasionChapterGuidance[occ] || occasionChapterGuidance.wedding;
  const effectivePhotoCount = photoCount ?? clusters.length;

  const occasionEventSchema: Record<string, string> = {
    wedding: `EVENTS: Generate ceremony and reception objects. Leave venue, address, time as empty strings — these come from real user-provided data.`,

    anniversary: `EVENTS: Generate ONE celebration event (the anniversary dinner/party).
    DO NOT generate "ceremony" or "reception" fields — this is not a wedding.
    Event name should reflect the milestone: e.g. "Anniversary Dinner", "25th Anniversary Celebration".
    If no event details provided, omit events entirely or create a single gentle celebration.`,

    birthday: `EVENTS: Generate ONE birthday celebration event.
    DO NOT generate "ceremony" or "reception" — this is a birthday party.
    Event name: "[Name]'s [Age]th Birthday" or similar.
    If this is a surprise party (indicated in vibe), note "Surprise!" in description.`,

    engagement: `EVENTS: Generate ONE engagement party event (if venue provided).
    DO NOT generate "ceremony" or "reception" — that's the wedding, not the engagement.
    Event name: "Engagement Celebration" or "[Name] & [Name] Are Engaged!"`,

    story: `EVENTS: Only generate events if explicitly provided in logistics. Otherwise omit entirely.`,
  };

  const eventSchemaGuidance = occasionEventSchema[occ] || occasionEventSchema.wedding;

  const occasionFaqGuidance: Record<string, string> = {
    wedding: `FAQs: Generate 4-5 wedding-specific FAQs: dress code, RSVP deadline, children policy, parking/accommodation, dietary requirements.`,

    anniversary: `FAQs: Generate 2-3 celebration FAQs appropriate for an anniversary party: is it a formal event, gift registry (if any), what to expect on the night. Keep brief and warm.`,

    birthday: `FAQs: Generate 2-3 birthday party FAQs: dress code/theme, gift info, dietary needs.
    If it's a surprise, include: "How do I keep it a secret?" as a FAQ.`,

    engagement: `FAQs: Generate 2-3 engagement party FAQs: is gifts expected, dress code, timing/schedule.`,

    story: `FAQs: Omit FAQs unless explicitly needed. This is a personal story site, not an event.`,
  };

  const faqGuidance = occasionFaqGuidance[occ] || occasionFaqGuidance.wedding;

  // Occasion-aware names line — birthday sites center the honoree, not a couple
  const namesLine = occ === 'birthday'
    ? `- Honoree (the birthday person): ${coupleNames[0]}${coupleNames[1] ? `\n- This site was created as a gift by: ${coupleNames[1]}` : ''}`
    : `- Names: ${coupleNames[0]} & ${coupleNames[1]}`;

  return `You are the "Memory Engine" for Pearloom \u2014 a world-class storytelling AI that crafts ${ctxLabel}. Your output powers a live, editorial-quality website. It must be stunning.

## The Couple / Honorees
${namesLine}
- Occasion type: ${occCap}${eventDateCtx}

---
## OCCASION-SPECIFIC CHAPTER GUIDANCE (non-negotiable)
${chapterGuidance}

---
## OCCASION-SPECIFIC EVENT GUIDANCE (non-negotiable)
${eventSchemaGuidance}

---
## OCCASION-SPECIFIC FAQ GUIDANCE (non-negotiable)
${faqGuidance}

---
## Their Vibe & Personality
${vibeString}

## Photo Clusters (rich metadata)
${JSON.stringify(clusterSummary, null, 2)}

## CRITICAL LOCATION AND CONTEXT RULES (non-negotiable)
- Each cluster above has a "locationInstruction" field. You MUST follow it exactly for that chapter.
- NEVER invent a location if "location" is null. Use the locationInstruction's fallback language instead.

## BLURB/NOTE RULES (HIGHEST PRIORITY):
- Each cluster may have a "note" field — a personal caption written BY THE COUPLE about that moment
- If a cluster has a "note", it is the SINGLE MOST IMPORTANT piece of context for that chapter
- The chapter title, subtitle, and description MUST reflect the emotion and content of the note
- Do NOT paraphrase or genericize the note — honor its specific details, feelings, and voice
- If the note mentions a specific activity, place, feeling, or inside joke — weave it directly into the narrative
- The note represents what the couple themselves want remembered about this moment

---
## NARRATIVE QUALITY STANDARDS (non-negotiable)

### Titles â€” Be SPECIFIC, evocative, poetic (3-6 words max)
âœ… Good: "That October Night", "Sundays with Poppy", "The Rooftop, Brooklyn", "Her Terrible Fake Laugh", "How It Started"
âŒ Bad: "Our Journey Begins", "Beautiful Memories", "The Start of Us", "First Meeting", "A New Chapter"

Titles must feel like chapter headings from a memoir or short film. They should surprise the reader, not telegraph the obvious.

### Descriptions â€” Write in FIRST PERSON PLURAL, from inside the memory
- 3â€“4 sentences, intimate and specific
- ALWAYS use "We", "us", "our" â€” written as if the couple themselves are narrating
- Include SENSORY DETAILS: what the weather was, what song was playing, the smell of the place, the texture of the moment
- Reference REAL details from their vibe: pets, restaurants, inside jokes, places, rituals
- Never use: "journey", "adventure", "soulmate", "fairy tale", "happily ever after", "storybook"
- DO use: specific sensory experiences, honest emotions, humor if it fits the vibe
- Each chapter description should feel like it could ONLY belong to this couple

### EMOTIONAL ARC â€” The chapters must have a narrative through-line
- First 1-2 chapters: wonder, excitement, the spark â€” "We found ourselves..."
- Middle chapters: growth, discovery, challenge overcome â€” "We learned..."
- Final 1-2 chapters: certainty, commitment, coming home â€” "We knew..."

### Chapter count: Minimum 3, Maximum 7

### Subtitles â€” One poetic, unusual line
- Should feel like a line from a poem or a song lyric, not a description
- Examples: "the part where everything changed", "neither of us were ready", "in all the best ways"

### Mood Tags â€” Short, evocative, lowercase
- Examples: golden hour, late night, mountain air, lazy sunday, first winter
- Avoid generic: romantic, happy, fun

---
## THEME DESIGN
- Must feel PREMIUM: think Vogue editorial, Kinfolk magazine, Architectural Digest, luxury stationery
- Colors come from the vibe input. If a specific palette or hex was mentioned, use it
- Heading fonts: Cormorant Garamond, EB Garamond, Lora, Playfair Display, Libre Baskerville
- Body fonts: Inter, Outfit, DM Sans, Work Sans, Nunito (all from Google Fonts)
- Background: NEVER pure white. Use warm off-whites (#F5F1E8), soft creams, moody deep tones, dusty greens, rose blush â€” whatever fits the vibe
- Contrast must remain readable at all times

---
## VISUAL ANALYSIS
You have been provided with one representative image per cluster. YOU MUST LOOK AT EACH IMAGE to understand:
- Who is in the photo (clothing, energy, context)
- What environment they're in (indoor, outdoor, landmark, specific setting)
- What the emotional register of the moment is

WRITE DESCRIPTIONS BASED ON WHAT YOU ACTUALLY SEE. If the location metadata says "Unknown" but you can clearly see they're at a ski mountain, write about the mountain. Never gaslighting the couple with incorrect descriptions.

If a cluster location is unknown, deduce it from the visual. Do NOT hallucinate a location based on the vibe string alone.

---
## LAYOUT ROTATION RULES
Available layouts: "editorial", "fullbleed", "split", "cinematic", "gallery", "mosaic"

- Chapter 1: ALWAYS "editorial" or "fullbleed" (maximum visual impact)
- Chapter 2: NEVER the same as chapter 1
- "fullbleed" â€” use for vacations, outdoor scenery, emotional milestone moments
- "cinematic" â€” use for intimate, quiet, emotionally heavy memories
- "gallery" â€” ONLY when a cluster has 3+ images
- "mosaic" â€” use when a cluster has 3â€“5 fun, casual, varied photos (travels, gatherings)
- "split" â€” use for date nights, events, or moments with one strong photo
- "editorial" â€” versatile; use as a reset between heavy layouts
- NEVER use the same layout for two consecutive chapters
- Distribute layouts as evenly as possible across all chapters

---
## CHAPTER COUNT (CRITICAL — enforce strictly)
- You have exactly ${effectivePhotoCount} photo cluster(s). Generate AT MOST ${effectivePhotoCount} chapters — one chapter per photo cluster. Do NOT invent chapters for photos that do not exist.
- Maximum: 7 chapters. If there are more than 7 clusters, intelligently merge the least visually distinct ones into nearby chapters.
- Minimum: If there is only 1 cluster, generate exactly 1 chapter. Do NOT pad to 3.
- Each chapter must have emotional momentum — the full arc from first spark to certainty.

---
## OUTPUT SCHEMA (strict JSON, NO markdown)
Return ONLY this JSON with no additional text:
{
  "coupleId": "<generate-uuid>",
  "generatedAt": "<current ISO timestamp>",
  "vibeString": "${vibeString.slice(0, 120)}",
  "theme": {
    "name": "<creative theme name â€” e.g. 'Warm Ivory', 'Midnight Sage', 'Nordic Blush'>",
    "fonts": { "heading": "<Google Font>", "body": "<Google Font>" },
    "colors": {
      "background": "<hex â€” warm off-white or moody dark>",
      "foreground": "<hex>",
      "accent": "<hex â€” warm, saturated but not neon>",
      "accentLight": "<hex â€” very light version of accent for tints>",
      "muted": "<hex â€” readable grey or warm neutral>",
      "cardBg": "<hex â€” slightly lighter/darker than background>"
    },
    "borderRadius": "<css value, e.g. '0.75rem'>",
    "elementShape": "<square | rounded | arch | pill>",
    "cardStyle": "<solid | glass | bordered | shadow-heavy>",
    "backgroundPattern": "<none | noise | dots | grid | waves | floral | topography>"
  },
  "chapters": [
    {
      "id": "<uuid>",
      "date": "<ISO date â€” REAL date from photo metadata>",
      "title": "<evocative, specific, 2â€“5 words>",
      "subtitle": "<one poetic, unusual line â€” not a description>",
      "description": "<3â€“4 sentences, intimate, specific, written as if by the couple>",
      "images": [],
      "location": { "lat": <number>, "lng": <number>, "label": "<City, State or Country>" } | null,
      "mood": "<two-word lowercase mood tag>",
      "layout": "<Choose based on PHOTO COUNT + INTENSITY: 1 photo->editorial, 2 photos->split, 3+ photos->gallery/mosaic, high emotion->cinematic/fullbleed>",
      "emotionalIntensity": "<1-10: rate emotional weight: 1=quiet/everyday, 5=travel/adventure, 8=first kiss/proposal/milestone, 10=life-defining moment>",
      "ambientColor": "<hex tint for this chapter section: beach->#E8F4F8, golden-hour->#FDF0E0, forest->#EAF2E8, night->#1A1A2E, city->#F0F0F8, match the mood>",
      "imagePosition": { "x": "<0-100 horizontal: left-third=25, center=50, right-third=75>", "y": "<0-100 vertical: top=25, center=50, bottom=75>" },
      "heroPhotoIndex": "<index 0-N of the most visually striking image in this chapter to use as the hero/cover — pick the one with best composition, lighting, and emotional impact>",
      "order": <number starting at 0>
    }
  ],
  “events”: [
    /* Follow the OCCASION-SPECIFIC EVENT GUIDANCE above strictly.
       For weddings: generate both “Ceremony” and “Reception” objects.
       For anniversaries/birthdays/engagements: generate ONE event with an appropriate name.
       For story: omit this array entirely if no event details were provided.
       Each event object shape: */
    {
      “id”: “<uuid>”,
      “name”: “<Event name per occasion guidance above>”,
      “date”: “<ISO 8601 date from user data, or empty string>”,
      “time”: “”,
      “endTime”: “”,
      “venue”: “”,
      “address”: “”,
      “description”: “<one warm sentence about what to expect>”,
      “dressCode”: “”,
      “mapUrl”: null
    }
  ],
  “faqs”: [
    /* Follow the OCCASION-SPECIFIC FAQ GUIDANCE above strictly.
       For weddings: 4-5 FAQs (parking, children, dress code, RSVP deadline, dietary).
       For anniversaries/birthdays/engagements: 2-3 FAQs appropriate to the occasion.
       For story: omit this array entirely.
       Each FAQ object shape: */
    {
      “id”: “<uuid>”,
      “question”: “<Question appropriate to the occasion per FAQ guidance above>”,
      “answer”: “<warm, helpful, occasion-appropriate answer>”,
      “order”: 0
    }
  ],
  “travelInfo”: {
    “airports”: [],
    “hotels”: [],
    “parkingInfo”: “”,
    “directions”: “”
  },
  "registry": {
    "enabled": true,
    "cashFundUrl": null,
    "cashFundMessage": "Your presence is the greatest gift. But if you'd like to celebrate us further, we've created a honeymoon fund.",
    "entries": [
      {
        "name": "Zola",
        "url": "https://www.zola.com",
        "note": "Our curated home and experience wishlist"
      }
    ]
  },
  "comingSoon": {
    "enabled": true,
    "title": "<3-5 word section title>",
    "subtitle": "<one personalized line â€” wedding date, birthday wish, or poetic nod to their future>",
    "passwordProtected": false
  }
}

CRITICAL FINAL CHECKS before returning:
1. Did you use REAL dates from photo metadata? (not fabricated)
2. Are all chapter titles specific and evocative? (not generic)
3. Is the layout sequence varied? (no consecutive duplicates)
4. Is the theme background a warm off-white or moody tone? (not #ffffff)
5. Does the vibeString quote feel poetic and site-worthy?
6. Did you follow the OCCASION-SPECIFIC EVENT GUIDANCE? (${occ === 'wedding' ? 'wedding needs ceremony + reception' : occ === 'story' ? 'story: omit events if none provided' : `${occ}: ONE celebration event, NOT ceremony/reception`})
7. Did you follow the OCCASION-SPECIFIC FAQ GUIDANCE? (${occ === 'wedding' ? '4-5 wedding FAQs' : occ === 'story' ? 'story: omit FAQs' : `${occ}: 2-3 occasion-appropriate FAQs`})
8. Does travelInfo have empty arrays for airports and hotels? (leave empty — users add real details in the editor)
9. Does the chapter structure follow the ${occCap} arc? (NOT a generic wedding narrative)`;
}

/**
 * Generates only a ThemeSchema from a vibe string.
 */
export async function generateThemeFromVibe(
  vibeString: string,
  apiKey: string
): Promise<ThemeSchema> {
  const prompt = `Generate a sophisticated, premium color theme for a romantic anniversary website.

Vibe: "${vibeString}"

Return JSON:
{
  "name": "<creative-name>",
  "fonts": { "heading": "<Google Font name>", "body": "<Google Font name>" },
  "colors": {
    "background": "<hex - never pure white>",
    "foreground": "<hex>",
    "accent": "<hex>",
    "accentLight": "<hex>",
    "muted": "<hex>",
    "cardBg": "<hex>"
  },
  "borderRadius": "<css value>"
}

Rules: Use premium Google Fonts only. Colors should be warm, intimate, and high-contrast for readability. Background should be an off-white or warm tone, never #ffffff. No neon or overly bright colors. The palette should feel like a luxury brand.`;

  const res = await geminiRetryFetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini theme generation failed: ${res.status}`);

  const data = await res.json();
  let themeRaw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim();
  themeRaw = themeRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const firstBrace = themeRaw.indexOf('{');
  if (firstBrace > 0) themeRaw = themeRaw.slice(firstBrace);
  themeRaw = themeRaw.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(themeRaw);
  } catch {
    logWarn('[generateThemeFromVibe] Parse failed, returning default theme');
    return {
      name: 'Warm Ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
      borderRadius: '1rem',
    };
  }
}

