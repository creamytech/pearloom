// ─────────────────────────────────────────────────────────────
// Pearloom / lib/intelligence/learning.ts
// Learning flywheel — uses collected data to improve generation
// quality over time. This is what makes Pearloom's AI get
// better with every site, creating an unbridgeable advantage.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { type GenerationSignal, type DesignPreference, type GuestEngagement } from './data-collection';
import { type QualityReport, evaluateQuality } from './quality-eval';
import { type PromptTemplate, PROMPT_LIBRARY, recordPromptUsage } from './prompt-library';

// ── Learning Insights ────────────────────────────────────────

export interface LearningInsight {
  id: string;
  type: 'prompt' | 'design' | 'content' | 'structure';
  /** What we learned */
  insight: string;
  /** Confidence level 0-1 */
  confidence: number;
  /** Number of data points supporting this */
  sampleSize: number;
  /** When this insight was generated */
  generatedAt: number;
}

/**
 * Analyze generation signals to find patterns.
 * This runs periodically to discover what works.
 */
export function analyzeGenerationPatterns(
  signals: GenerationSignal[],
): LearningInsight[] {
  const insights: LearningInsight[] = [];

  if (signals.length < 10) return insights; // Need minimum data

  // ── Which vibe words produce the best sites? ──
  const vibeWordSuccess: Record<string, { published: number; total: number }> = {};
  for (const s of signals) {
    const words = s.generated.vibeString.toLowerCase().split(/[\s,]+/);
    for (const word of words) {
      if (!vibeWordSuccess[word]) vibeWordSuccess[word] = { published: 0, total: 0 };
      vibeWordSuccess[word].total++;
      if (s.quality.published) vibeWordSuccess[word].published++;
    }
  }

  const topVibeWords = Object.entries(vibeWordSuccess)
    .filter(([, v]) => v.total >= 5)
    .map(([word, v]) => ({ word, rate: v.published / v.total, total: v.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  if (topVibeWords.length > 0) {
    insights.push({
      id: 'vibe-word-success',
      type: 'content',
      insight: `Top-performing vibe words: ${topVibeWords.map(w => `"${w.word}" (${Math.round(w.rate * 100)}%)`).join(', ')}`,
      confidence: Math.min(0.9, topVibeWords[0].total / 50),
      sampleSize: signals.length,
      generatedAt: Date.now(),
    });
  }

  // ── Do users with fewer edits have higher publish rates? ──
  const lowEdit = signals.filter(s => s.quality.editCount < 5);
  const highEdit = signals.filter(s => s.quality.editCount >= 15);
  if (lowEdit.length >= 5 && highEdit.length >= 5) {
    const lowEditPublishRate = lowEdit.filter(s => s.quality.published).length / lowEdit.length;
    const highEditPublishRate = highEdit.filter(s => s.quality.published).length / highEdit.length;

    insights.push({
      id: 'edit-count-correlation',
      type: 'content',
      insight: `Low-edit sites (${Math.round(lowEditPublishRate * 100)}% publish) vs high-edit (${Math.round(highEditPublishRate * 100)}% publish) — ${lowEditPublishRate > highEditPublishRate ? 'fewer edits correlate with better AI output' : 'users who edit more tend to publish more'}`,
      confidence: 0.7,
      sampleSize: lowEdit.length + highEdit.length,
      generatedAt: Date.now(),
    });
  }

  // ── Which titles do users change most? ──
  const titleChanges = signals.flatMap(s =>
    s.userChanges.titlesChanged.map(t => t.toLowerCase())
  );
  const titleChangeFreq: Record<string, number> = {};
  for (const t of titleChanges) {
    for (const word of t.split(/\s+/)) {
      titleChangeFreq[word] = (titleChangeFreq[word] || 0) + 1;
    }
  }

  const mostChangedWords = Object.entries(titleChangeFreq)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (mostChangedWords.length > 0) {
    insights.push({
      id: 'title-word-avoidance',
      type: 'prompt',
      insight: `Users frequently change titles containing: ${mostChangedWords.map(([w, c]) => `"${w}" (${c}x)`).join(', ')} — consider avoiding these in prompts`,
      confidence: 0.6,
      sampleSize: titleChanges.length,
      generatedAt: Date.now(),
    });
  }

  // ── Which layouts are most popular? ──
  const layoutPrefs: Record<string, number> = {};
  for (const s of signals) {
    layoutPrefs[s.generated.layoutFormat] = (layoutPrefs[s.generated.layoutFormat] || 0) + 1;
  }

  const topLayout = Object.entries(layoutPrefs).sort((a, b) => b[1] - a[1])[0];
  if (topLayout) {
    insights.push({
      id: 'layout-preference',
      type: 'design',
      insight: `Most popular layout: "${topLayout[0]}" (${Math.round(topLayout[1] / signals.length * 100)}% of sites)`,
      confidence: 0.8,
      sampleSize: signals.length,
      generatedAt: Date.now(),
    });
  }

  // ── Regeneration patterns ──
  const regenRate = signals.filter(s => s.quality.regenerated).length / signals.length;
  if (regenRate > 0.2) {
    insights.push({
      id: 'high-regen-rate',
      type: 'content',
      insight: `${Math.round(regenRate * 100)}% of sites are regenerated — AI output quality may need improvement`,
      confidence: 0.9,
      sampleSize: signals.length,
      generatedAt: Date.now(),
    });
  }

  return insights;
}

/**
 * Analyze design preferences to find trends.
 */
export function analyzeDesignTrends(
  preferences: DesignPreference[],
): LearningInsight[] {
  const insights: LearningInsight[] = [];

  if (preferences.length < 10) return insights;

  // ── Most popular color palettes ──
  const paletteChoices: Record<string, number> = {};
  for (const p of preferences) {
    paletteChoices[p.palette.chosen] = (paletteChoices[p.palette.chosen] || 0) + 1;
  }

  const topPalette = Object.entries(paletteChoices).sort((a, b) => b[1] - a[1])[0];
  if (topPalette) {
    insights.push({
      id: 'palette-trend',
      type: 'design',
      insight: `Most chosen palette: "${topPalette[0]}" (${Math.round(topPalette[1] / preferences.length * 100)}%)`,
      confidence: 0.7,
      sampleSize: preferences.length,
      generatedAt: Date.now(),
    });
  }

  // ── Do users change fonts from AI suggestion? ──
  const fontChangeRate = preferences.filter(p => p.fonts.changed).length / preferences.length;
  insights.push({
    id: 'font-change-rate',
    type: 'design',
    insight: `${Math.round(fontChangeRate * 100)}% of users change the AI-suggested fonts — ${fontChangeRate > 0.4 ? 'font suggestions need improvement' : 'font suggestions are well-received'}`,
    confidence: 0.8,
    sampleSize: preferences.length,
    generatedAt: Date.now(),
  });

  // ── Most popular font pairings ──
  const fontPairs: Record<string, number> = {};
  for (const p of preferences) {
    const pair = `${p.fonts.heading}/${p.fonts.body}`;
    fontPairs[pair] = (fontPairs[pair] || 0) + 1;
  }

  const topFonts = Object.entries(fontPairs).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topFonts.length > 0) {
    insights.push({
      id: 'top-font-pairs',
      type: 'design',
      insight: `Top font pairings: ${topFonts.map(([p, c]) => `${p} (${c})`).join(', ')}`,
      confidence: 0.75,
      sampleSize: preferences.length,
      generatedAt: Date.now(),
    });
  }

  return insights;
}

/**
 * Analyze guest engagement to find what drives RSVPs.
 */
export function analyzeEngagementPatterns(
  engagements: GuestEngagement[],
): LearningInsight[] {
  const insights: LearningInsight[] = [];

  if (engagements.length < 5) return insights;

  // ── Which sections correlate with higher RSVP rates? ──
  const highRsvp = engagements.filter(e => e.rsvpRate > 0.7);
  const lowRsvp = engagements.filter(e => e.rsvpRate < 0.3);

  if (highRsvp.length >= 3 && lowRsvp.length >= 3) {
    // Compare section view patterns
    const highSections = new Set<string>();
    for (const e of highRsvp) {
      const topSections = Object.entries(e.sectionViews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s);
      topSections.forEach(s => highSections.add(s));
    }

    insights.push({
      id: 'rsvp-section-correlation',
      type: 'structure',
      insight: `High-RSVP sites have more views on: ${Array.from(highSections).join(', ')}`,
      confidence: 0.6,
      sampleSize: highRsvp.length + lowRsvp.length,
      generatedAt: Date.now(),
    });
  }

  // ── Mobile vs desktop engagement ──
  const avgMobileRate = engagements.reduce((sum, e) => sum + e.devices.mobile / (e.devices.mobile + e.devices.desktop + e.devices.tablet), 0) / engagements.length;

  insights.push({
    id: 'mobile-usage',
    type: 'structure',
    insight: `${Math.round(avgMobileRate * 100)}% of guests visit on mobile — ${avgMobileRate > 0.6 ? 'mobile-first design is critical' : 'desktop experience matters too'}`,
    confidence: 0.9,
    sampleSize: engagements.length,
    generatedAt: Date.now(),
  });

  return insights;
}

/**
 * Run the full learning pipeline and generate insights.
 */
export function runLearningPipeline(
  generationSignals: GenerationSignal[],
  designPreferences: DesignPreference[],
  guestEngagements: GuestEngagement[],
): {
  insights: LearningInsight[];
  promptUpdates: Array<{ promptId: string; adjustment: string }>;
  qualityTrend: 'improving' | 'stable' | 'declining';
} {
  const insights = [
    ...analyzeGenerationPatterns(generationSignals),
    ...analyzeDesignTrends(designPreferences),
    ...analyzeEngagementPatterns(guestEngagements),
  ];

  // ── Generate prompt adjustment recommendations ──
  const promptUpdates: Array<{ promptId: string; adjustment: string }> = [];

  // Find prompts with declining success rates
  for (const prompt of PROMPT_LIBRARY) {
    if (prompt.useCount >= 50 && prompt.successRate < 0.6) {
      promptUpdates.push({
        promptId: prompt.id,
        adjustment: `Success rate ${Math.round(prompt.successRate * 100)}% — consider revising or A/B testing a new version`,
      });
    }
  }

  // ── Determine quality trend ──
  const recentSignals = generationSignals.slice(-50);
  const olderSignals = generationSignals.slice(-100, -50);

  let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentSignals.length >= 10 && olderSignals.length >= 10) {
    const recentPublishRate = recentSignals.filter(s => s.quality.published).length / recentSignals.length;
    const olderPublishRate = olderSignals.filter(s => s.quality.published).length / olderSignals.length;

    if (recentPublishRate > olderPublishRate + 0.05) qualityTrend = 'improving';
    else if (recentPublishRate < olderPublishRate - 0.05) qualityTrend = 'declining';
  }

  return { insights, promptUpdates, qualityTrend };
}
