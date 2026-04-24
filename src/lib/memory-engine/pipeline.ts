// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/pipeline.ts — 7-pass orchestration
// ─────────────────────────────────────────────────────────────────

import type { PhotoCluster, StoryManifest, Chapter, ChapterImage, ThemeSchema } from '@/types';
import { generateVibeSkin, extractCoupleProfile } from '@/lib/vibe-engine';
import type { VibeSkin, CoupleProfile } from '@/lib/vibe-engine';
import { GEMINI_PRO, GEMINI_API_BASE, log, logWarn, logError, geminiRetryFetch } from './gemini-client';
import { fetchClusterImages } from './image-fetcher';
import { buildPrompt } from './prompts';
import { critiqueAndRefineChapters, generatePoetryPass } from './passes';
import {
  corePassClaude,
  critiqueChaptersClaude,
  poetryPassClaude,
  extractCoupleProfileClaude,
  useClaudeForStory,
} from './claude-passes';
import { getEventType } from '@/lib/event-os/event-types';
import { pickFontPair } from './typography-picker';
import { pickMotifs } from './motif-picker';
import { tagPhotos, summarizeClusterTags, type PhotoTags } from './photo-vision';

export async function generateStoryManifest(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  apiKey: string,
  googleAccessToken?: string,
  occasion?: string,
  eventDate?: string,
  inspirationUrls?: string[],
  layoutFormat?: string,
  onProgress?: (pass: number, snapshot?: StoryManifest) => void,
  preferredPalette?: string[],
  /**
   * Optional factual anchors the user gave the wizard. Pass 1.5
   * (grounding) checks chapter sentences against these + cluster
   * notes and flags ungrounded claims for Pass 1.2 to strip.
   */
  factSheet?: { howWeMet?: string; why?: string; favorite?: string },
): Promise<StoryManifest> {
  onProgress?.(0);

  // ── Pass 0.5 — Per-photo vision tagging ─────────────────────────
  // Tags every photo (not just the 1 representative per cluster that
  // goes into Pass 1's multimodal prompt) with scene / mood /
  // peopleCount / time-of-day. We fold the per-cluster summary into
  // cluster.note so Pass 1 — and every downstream note-consuming
  // pass — sees the vision context for free. Non-fatal: if the API
  // is unreachable or rate-limits, we fall through with no tags.
  const photoTagsById = new Map<string, PhotoTags>();
  try {
    const allPhotos = clusters.flatMap((c) => c.photos);
    if (allPhotos.length > 0) {
      const tagged = await tagPhotos(allPhotos, apiKey, googleAccessToken);
      for (const t of tagged) {
        if (t.photo?.id) photoTagsById.set(t.photo.id, t.tags);
      }
      clusters = clusters.map((c) => {
        const clusterTags = c.photos
          .map((p) => photoTagsById.get(p.id))
          .filter((t): t is PhotoTags => Boolean(t));
        const summary = summarizeClusterTags(clusterTags);
        if (!summary) return c;
        const nextNote = c.note ? `${c.note}\n(vision: ${summary})` : `(vision: ${summary})`;
        return { ...c, note: nextNote };
      });
    }
  } catch (err) {
    logWarn('[Memory Engine] Photo vision tagging failed (non-fatal):', err);
  }

  // Cap chapters to number of photos (one chapter per photo cluster)
  const photoCount = clusters.length;
  const prompt = buildPrompt(clusters, vibeString, coupleNames, occasion, eventDate, photoCount, layoutFormat);

  // Build the multimodal parts array
  const parts: Record<string, unknown>[] = [{ text: prompt }];

  // Fetch 1 representative image per cluster for Gemini vision.
  // Works for both Google Photos URLs (needs token) and regular URLs
  // (R2 / public images) — the fetcher auto-detects.
  try {
    const imageParts = await fetchClusterImages(clusters, googleAccessToken);
    if (imageParts.length > 0) parts.push(...imageParts);
  } catch (err) {
    log('[Memory Engine] Image fetching failed, falling back to text-only:', err);
  }

  // Pass 1 — core storytelling.
  // Prefer Claude Opus 4.7 when ANTHROPIC_API_KEY is set (cheaper w/ prompt caching,
  // stronger long-form literary voice). Falls back to Gemini 3.1 Pro otherwise.
  const claudeStoryEnabled = useClaudeForStory();
  let rawText: string;
  if (claudeStoryEnabled) {
    log('[Memory Engine] Pass 1: Sending to Claude Opus 4.7 (core storytelling)...');
    try {
      const result = await corePassClaude(clusters, vibeString, coupleNames, {
        occasion,
        eventDate,
        photoCount,
        layoutFormat,
        voice: getEventType(occasion)?.voice,
        factSheet,
      });
      rawText = result.raw;
    } catch (err) {
      logWarn('[Memory Engine] Claude Pass 1 failed — falling back to Gemini:', err);
      const fallback = await geminiRetryFetch(`${GEMINI_PRO}?key=${apiKey}`, {
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
      if (!fallback.ok) throw new Error(`Gemini fallback ${fallback.status}: ${await fallback.text()}`);
      const data = await fallback.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    }
  } else {
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
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  }

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
      accent: '#5C6B3F',
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

  // Prevent consecutive identical layouts
  const LAYOUT_CYCLE = ['editorial', 'split', 'fullbleed', 'cinematic', 'gallery', 'mosaic'] as const;
  for (let i = 1; i < manifest.chapters.length; i++) {
    if (manifest.chapters[i].layout === manifest.chapters[i - 1].layout) {
      const current = manifest.chapters[i].layout || 'editorial';
      const alternatives = LAYOUT_CYCLE.filter(l => l !== current);
      manifest.chapters[i] = { ...manifest.chapters[i], layout: alternatives[Math.floor(Math.random() * alternatives.length)] };
    }
  }

  // Strip banned words from chapter content (in case AI ignored the instruction)
  const BANNED_WORDS_RE = /\b(journey|adventure|soulmate|fairy[ -]?tale|happily ever after|storybook|chapter of our lives?|love story begins?|ride or die)\b/gi;
  manifest.chapters = manifest.chapters.map((ch: Chapter) => ({
    ...ch,
    title: ch.title?.replace(BANNED_WORDS_RE, '').trim() || `Chapter ${(ch as { order?: number }).order ?? ''}`.trim(),
    description: ch.description?.replace(BANNED_WORDS_RE, '').trim() || ch.description || '',
    subtitle: ch.subtitle?.replace(BANNED_WORDS_RE, '').trim() || '',
  }));

  // Strip wedding-specific event types for non-wedding occasions
  if (occasion === 'anniversary' || occasion === 'birthday' || occasion === 'story') {
    if (manifest.events?.length) {
      manifest.events = manifest.events.filter(
        (e: { type?: string }) => e.type !== 'ceremony' && e.type !== 'reception' && e.type !== 'rehearsal'
      );
      if (manifest.events.length > 1) manifest.events = [manifest.events[0]];
    }
  }
  // Omit FAQs for story occasion
  if (occasion === 'story') {
    manifest.faqs = [];
  }

  // Emit first real snapshot so the live preview can show the chapters
  // and theme as soon as Pass 1 finishes — don't wait for the full pipeline.
  onProgress?.(1, manifest);

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

  // ── Pass 1.5 grounding (early) ──────────────────────────────
  // Run this BEFORE Pass 1.2 so the critique pass sees chapters
  // with `[UNGROUNDED: ...]` markers where Pass 1 invented facts.
  // Pass 1.2's existing refine prompt already knows how to rewrite
  // around bracketed markers — we just make sure the flags are
  // there when it runs.
  let chaptersSnapshot = manifest.chapters;
  try {
    const { groundChaptersAgainstNotes } = await import('./grounding');
    const grounded = await groundChaptersAgainstNotes({
      chapters: chaptersSnapshot,
      clusterNotes,
      factSheet,
    });
    chaptersSnapshot = grounded.chapters;
    manifest.chapters = grounded.chapters;
    if (grounded.flaggedCount > 0) {
      log(`[Memory Engine] Pass 1.5: grounded ${grounded.flaggedCount} ungrounded sentence(s)`);
    }
  } catch (err) {
    logWarn('[Memory Engine] Grounding pass failed — continuing:', err);
  }

  const [pass12Result, pass15Result, pass4Result] = await Promise.allSettled([
    // Pass 1.2: Chapter quality gate
    claudeStoryEnabled
      ? critiqueChaptersClaude(chaptersSnapshot, vibeString, coupleNames, occasion, clusterNotes, getEventType(occasion)?.voice)
      : critiqueAndRefineChapters(chaptersSnapshot, vibeString, coupleNames, apiKey, occasion, clusterNotes),
    // Pass 1.5: Couple DNA extraction
    claudeStoryEnabled
      ? extractCoupleProfileClaude(
          vibeString,
          chaptersSnapshot.map(c => ({ title: c.title, description: c.description, mood: c.mood })),
          occasion,
          clusterNotes
        )
      : extractCoupleProfile(
          vibeString,
          chaptersSnapshot.map(c => ({ title: c.title, description: c.description, mood: c.mood })),
          apiKey,
          occasion,
          clusterNotes
        ),
    // Pass 4: Poetry (welcome + tagline + closing). Claude pass
    // additionally gets the EventType.voice — shifts tone so a
    // memorial doesn't read like a wedding, bachelor doesn't read
    // like a baptism. Falls back to 'celebratory' if the occasion
    // isn't in the registry.
    claudeStoryEnabled
      ? poetryPassClaude(
          manifest.vibeString,
          coupleNames,
          chaptersSnapshot,
          occasion,
          getEventType(occasion)?.voice,
        )
      : generatePoetryPass(manifest.vibeString, coupleNames, chaptersSnapshot, apiKey, occasion),
  ]);

  if (pass12Result.status === 'fulfilled') {
    manifest.chapters = pass12Result.value;
    log('[Memory Engine] Pass 1.2: Chapter quality gate complete');
  } else {
    logWarn('[Memory Engine] Chapter quality gate failed (non-fatal):', pass12Result.reason);
  }

  // Belt-and-braces: strip any `[UNGROUNDED: ...]` markers the critique
  // pass didn't rewrite away. We'd rather drop a sentence than ship a
  // flagged claim as-is.
  try {
    const { stripUngroundedMarkers } = await import('./grounding');
    manifest.chapters = manifest.chapters.map((c) => ({
      ...c,
      description: c.description ? stripUngroundedMarkers(c.description) : c.description,
    }));
  } catch {
    /* grounding module already logs — don't double-log */
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

  if (!manifest.poetry) {
    manifest.poetry = {
      heroTagline: '',
      closingLine: '',
      rsvpIntro: '',
    };
  }

  // Emit snapshot after passes 1.2/1.5/4 — chapters + poetry are now refined
  onProgress?.(4, manifest);

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
      preferredPalette,  // User-chosen hex colors — must appear in final palette
    }, occasion, getEventType(occasion)?.voice);
    manifest.vibeSkin = vibeSkin;
    log('[Memory Engine] Pass 2: VibeSkin generated',
      vibeSkin.chapterIcons?.length ? `with ${vibeSkin.chapterIcons.length} chapter icons` : '(no chapter icons)'
    );
  } catch (err) {
    logWarn('[Memory Engine] VibeSkin generation failed (non-fatal):', err);
  }

  // ── Reconcile theme.colors with vibeSkin.palette — single source of truth ──
  // Raster art (Pass 2.5) is generated separately via /api/generate/art after
  // the manifest is returned to the client, so it doesn't block the response.
  if (manifest.vibeSkin?.palette) {
    const p = manifest.vibeSkin.palette;
    manifest.theme = {
      ...manifest.theme,
      colors: {
        background: p.background || manifest.theme.colors.background,
        foreground: p.foreground || manifest.theme.colors.foreground,
        accent: p.accent || manifest.theme.colors.accent,
        accentLight: p.highlight || manifest.theme.colors.accentLight,
        muted: p.muted || manifest.theme.colors.muted,
        cardBg: p.card || manifest.theme.colors.cardBg,
      },
    };
  }

  // ── Pick a sensible animated section divider based on vibe + occasion ──
  // Users can always override this in the editor's Visual Effects panel.
  // We only seed a default when one hasn't already been set.
  if (!manifest.theme?.effects?.sectionDivider) {
    const pickDivider = (): NonNullable<NonNullable<ThemeSchema['effects']>['sectionDivider']> => {
      const tone = manifest.vibeSkin?.tone;
      const curve = manifest.vibeSkin?.curve;
      const occ = (occasion || '').toLowerCase();
      // Occasion-first: birthdays and playful celebrations get confetti/sparkle
      if (occ.includes('birthday') || tone === 'playful') {
        return { style: 'confetti', height: 80, flip: false, animated: true };
      }
      if (tone === 'cosmic') {
        return { style: 'constellation', height: 80, flip: false, animated: true };
      }
      if (tone === 'luxurious') {
        return { style: 'flourish', height: 80, flip: false, animated: true };
      }
      if (tone === 'intimate' || occ.includes('anniversary') || occ.includes('vow')) {
        return { style: 'ribbon', height: 80, flip: true, animated: true };
      }
      if (tone === 'wild' || tone === 'rustic' || curve === 'petal') {
        return { style: 'botanical', height: 90, flip: true, animated: true };
      }
      if (tone === 'dreamy' || curve === 'organic' || curve === 'ribbon') {
        return { style: 'petals', height: 80, flip: true, animated: true };
      }
      // Sensible default — animated wave matches most vibes
      return { style: 'wave2', height: 70, flip: true, animated: true };
    };
    manifest.theme = {
      ...manifest.theme,
      effects: {
        ...(manifest.theme?.effects ?? {}),
        sectionDivider: pickDivider(),
      },
    };
  }

  // ── Typography pair (user-generated sites only) ────────────────────
  // Templates ship their own font pairings; bare sites previously fell
  // back to Playfair + Inter regardless of voice. Pick a pair keyed on
  // the EventType voice + occasion so bachelor sites read loud and
  // memorial sites read quiet.
  if (!manifest.templateId) {
    try {
      const pair = pickFontPair(occasion ?? 'wedding', manifest.vibeString);
      manifest.theme = {
        ...manifest.theme,
        fonts: { heading: pair.heading, body: pair.body },
      };
      log(`[Memory Engine] Typography: ${pair.heading} + ${pair.body} — ${pair.note}`);
    } catch (err) {
      logWarn('[Memory Engine] Font pair selection failed (non-fatal):', err);
    }
  }

  // ── Motif intelligence (user-generated sites only) ─────────────────
  // Templates bring their own motif pack. Bare sites get a voice-driven
  // pack so the hero + decorations don't look empty next to templated
  // sites. Safe to re-run: only applied when motifs are still absent.
  if (!manifest.templateId && !manifest.motifs) {
    try {
      manifest.motifs = pickMotifs(occasion ?? 'wedding', manifest.vibeString);
      log(`[Memory Engine] Motifs: blob=${manifest.motifs.blob} stamp="${manifest.motifs.stamp?.text}"`);
    } catch (err) {
      logWarn('[Memory Engine] Motif selection failed (non-fatal):', err);
    }
  }

  // Emit snapshot AFTER reconcile so downstream consumers see the final
  // palette + theme applied alongside the vibeSkin SVG art.
  onProgress?.(5, manifest);
  onProgress?.(6, manifest);

  // Enforce emotional arc: last chapter should be the emotional peak
  if (manifest.chapters.length > 1) {
    const last = manifest.chapters[manifest.chapters.length - 1];
    if ((last.emotionalIntensity ?? 0) < 7) {
      manifest.chapters[manifest.chapters.length - 1] = {
        ...last,
        emotionalIntensity: 8,
        isEmotionalPeak: true,
      };
    }
  }

  return manifest;
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

    // Build ChapterImage[] from EVERY photo in the cluster. Individual
    // layouts cap display counts at render time (most use photos[0];
    // BentoGrid caps at 5; KenBurns at 6). Keeping the full set in the
    // manifest lets the dashboard gallery show every photo the user
    // uploaded instead of losing the tail.
    const images: import('@/types').ChapterImage[] = bestCluster.photos
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
      colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#5C6B3F', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
      borderRadius: '1rem',
    };
  }
}
