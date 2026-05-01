// ─────────────────────────────────────────────────────────────
// Pearloom / lib/intelligence/quality-eval.ts
// Auto-evaluation pipeline — scores every generated site on
// 10 dimensions before the user sees it. Low-scoring outputs
// get flagged for regeneration.
//
// This is what separates "we use AI" from "our AI is good."
// Every site passes through quality gates that improve over time.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest, Chapter } from '@/types';

// ── Types ────────────────────────────────────────────────────

export interface QualityReport {
  siteId: string;
  /** Overall score 0-100 */
  overallScore: number;
  /** Pass/fail — sites below threshold get flagged */
  passed: boolean;
  /** Individual dimension scores */
  dimensions: {
    narrativeCoherence: DimensionScore;
    titleQuality: DimensionScore;
    descriptionDepth: DimensionScore;
    emotionalRange: DimensionScore;
    visualVariety: DimensionScore;
    poetryQuality: DimensionScore;
    occasionFit: DimensionScore;
    lengthAppropriate: DimensionScore;
    clicheAvoidance: DimensionScore;
    completeness: DimensionScore;
  };
  /** Specific issues found */
  issues: QualityIssue[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Timestamp */
  evaluatedAt: number;
}

export interface DimensionScore {
  score: number; // 0-10
  explanation: string;
}

export interface QualityIssue {
  severity: 'critical' | 'warning' | 'info';
  dimension: string;
  message: string;
  /** Which chapter/section has the issue */
  location?: string;
}

// ── Quality Threshold ────────────────────────────────────────

const QUALITY_THRESHOLD = 65; // Sites below this get flagged

// ── Evaluation Functions ─────────────────────────────────────

/**
 * Evaluate the quality of a generated site manifest.
 * Returns a comprehensive quality report.
 */
export function evaluateQuality(manifest: StoryManifest): QualityReport {
  const chapters = manifest.chapters || [];
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];

  // 1. Narrative coherence — do chapters flow logically?
  const narrativeCoherence = evaluateNarrative(chapters, issues);

  // 2. Title quality — are titles specific and evocative?
  const titleQuality = evaluateTitles(chapters, issues);

  // 3. Description depth — are descriptions rich but not bloated?
  const descriptionDepth = evaluateDescriptions(chapters, issues);

  // 4. Emotional range — do chapters have varied emotional intensity?
  const emotionalRange = evaluateEmotions(chapters, issues);

  // 5. Visual variety — are different layouts used appropriately?
  const visualVariety = evaluateVisuals(chapters, issues);

  // 6. Poetry quality — are tagline/closing line good?
  const poetryQuality = evaluatePoetry(manifest, issues);

  // 7. Occasion fit — does content match the occasion?
  const occasionFit = evaluateOccasionFit(manifest, issues);

  // 8. Length appropriate — not too short, not too long?
  const lengthAppropriate = evaluateLength(chapters, issues, suggestions);

  // 9. Cliché avoidance — is the writing original?
  const clicheAvoidance = evaluateCliches(chapters, manifest, issues);

  // 10. Completeness — are all expected sections present?
  const completeness = evaluateCompleteness(manifest, issues, suggestions);

  const dimensions = {
    narrativeCoherence,
    titleQuality,
    descriptionDepth,
    emotionalRange,
    visualVariety,
    poetryQuality,
    occasionFit,
    lengthAppropriate,
    clicheAvoidance,
    completeness,
  };

  const overallScore = Math.round(
    Object.values(dimensions).reduce((sum, d) => sum + d.score, 0) / 10 * 10
  );

  return {
    siteId: manifest.subdomain || 'unknown',
    overallScore,
    passed: overallScore >= QUALITY_THRESHOLD,
    dimensions,
    issues,
    suggestions,
    evaluatedAt: Date.now(),
  };
}

// ── Individual Evaluators ────────────────────────────────────

function evaluateNarrative(chapters: Chapter[], issues: QualityIssue[]): DimensionScore {
  if (chapters.length === 0) return { score: 0, explanation: 'No chapters' };
  if (chapters.length === 1) return { score: 5, explanation: 'Only one chapter — limited narrative' };

  // Check chronological order
  const dates = chapters.map(c => new Date(c.date).getTime());
  const isChronological = dates.every((d, i) => i === 0 || d >= dates[i - 1]);

  let score = 7;
  if (!isChronological) { score -= 2; issues.push({ severity: 'warning', dimension: 'narrative', message: 'Chapters are not in chronological order' }); }
  if (chapters.length >= 3) score += 1;
  if (chapters.length >= 5) score += 1;

  return { score: Math.min(10, score), explanation: isChronological ? 'Good chronological flow' : 'Chapters need reordering' };
}

function evaluateTitles(chapters: Chapter[], issues: QualityIssue[]): DimensionScore {
  if (chapters.length === 0) return { score: 0, explanation: 'No chapters' };

  let score = 7;
  const titles = chapters.map(c => c.title?.toLowerCase() || '');

  // Check for generic titles
  const generic = ['chapter 1', 'chapter 2', 'untitled', 'our story', 'the beginning'];
  const genericCount = titles.filter(t => generic.some(g => t.includes(g))).length;
  if (genericCount > 0) { score -= genericCount * 1.5; issues.push({ severity: 'warning', dimension: 'titles', message: `${genericCount} generic title(s) found` }); }

  // Check for duplicates
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size < titles.length) { score -= 2; issues.push({ severity: 'warning', dimension: 'titles', message: 'Duplicate chapter titles' }); }

  // Check title length (too short or too long)
  const avgLen = titles.reduce((sum, t) => sum + t.split(' ').length, 0) / titles.length;
  if (avgLen < 2) { score -= 1; issues.push({ severity: 'info', dimension: 'titles', message: 'Titles are very short' }); }
  if (avgLen > 8) { score -= 1; issues.push({ severity: 'info', dimension: 'titles', message: 'Titles are too long' }); }

  return { score: Math.max(0, Math.min(10, score)), explanation: `${uniqueTitles.size} unique titles, avg ${Math.round(avgLen)} words` };
}

function evaluateDescriptions(chapters: Chapter[], issues: QualityIssue[]): DimensionScore {
  if (chapters.length === 0) return { score: 0, explanation: 'No chapters' };

  let score = 7;
  const descriptions = chapters.map(c => c.description || '');
  const avgWordCount = descriptions.reduce((sum, d) => sum + d.split(' ').length, 0) / descriptions.length;
  const emptyCount = descriptions.filter(d => d.trim().length < 10).length;

  if (emptyCount > 0) { score -= emptyCount * 2; issues.push({ severity: 'critical', dimension: 'descriptions', message: `${emptyCount} chapter(s) with empty/very short descriptions` }); }
  if (avgWordCount >= 30 && avgWordCount <= 80) score += 2;
  if (avgWordCount < 15) { score -= 1; issues.push({ severity: 'info', dimension: 'descriptions', message: 'Descriptions are very brief' }); }
  if (avgWordCount > 120) { score -= 1; issues.push({ severity: 'info', dimension: 'descriptions', message: 'Descriptions are very long' }); }

  return { score: Math.max(0, Math.min(10, score)), explanation: `Avg ${Math.round(avgWordCount)} words per chapter` };
}

function evaluateEmotions(chapters: Chapter[], issues: QualityIssue[]): DimensionScore {
  if (chapters.length < 2) return { score: 5, explanation: 'Not enough chapters for emotional range' };

  const intensities = chapters.map(c => c.emotionalIntensity || 5);
  const range = Math.max(...intensities) - Math.min(...intensities);
  const hasPeak = chapters.some(c => c.isEmotionalPeak);

  let score = 6;
  if (range >= 4) score += 2;
  if (hasPeak) score += 1;
  if (range < 2) { score -= 1; issues.push({ severity: 'info', dimension: 'emotions', message: 'Low emotional variety — all chapters feel similar' }); }

  return { score: Math.min(10, score), explanation: `Emotional range: ${range}/10${hasPeak ? ', has peak moment' : ''}` };
}

function evaluateVisuals(chapters: Chapter[], issues: QualityIssue[]): DimensionScore {
  const layouts = chapters.map(c => c.layout || 'editorial');
  const uniqueLayouts = new Set(layouts);

  let score = 6;
  if (uniqueLayouts.size >= 3) score += 2;
  else if (uniqueLayouts.size >= 2) score += 1;
  else if (chapters.length > 2) { issues.push({ severity: 'info', dimension: 'visuals', message: 'All chapters use the same layout' }); }

  const hasPhotos = chapters.every(c => c.images && c.images.length > 0);
  if (hasPhotos) score += 1;
  else { issues.push({ severity: 'warning', dimension: 'visuals', message: 'Some chapters have no photos' }); }

  return { score: Math.min(10, score), explanation: `${uniqueLayouts.size} layout types used` };
}

function evaluatePoetry(manifest: StoryManifest, issues: QualityIssue[]): DimensionScore {
  let score = 5;
  const poetry = manifest.poetry;

  if (!poetry) return { score: 3, explanation: 'No poetry generated' };

  if (poetry.heroTagline && poetry.heroTagline.length > 5) score += 2;
  else issues.push({ severity: 'warning', dimension: 'poetry', message: 'Missing or weak hero tagline' });

  if (poetry.closingLine && poetry.closingLine.length > 10) score += 1.5;
  if (poetry.rsvpIntro && poetry.rsvpIntro.length > 10) score += 0.5;
  if (poetry.welcomeStatement && poetry.welcomeStatement.length > 20) score += 1;

  return { score: Math.min(10, score), explanation: `${[poetry.heroTagline, poetry.closingLine, poetry.rsvpIntro, poetry.welcomeStatement].filter(Boolean).length}/4 poetry elements present` };
}

function evaluateOccasionFit(manifest: StoryManifest, issues: QualityIssue[]): DimensionScore {
  const occasion = manifest.occasion || 'wedding';
  let score = 7;

  // Check if blocks are appropriate for the occasion
  const blockTypes = (manifest.blocks || []).map(b => b.type);

  if (occasion === 'birthday') {
    if (blockTypes.includes('registry')) { score -= 1; issues.push({ severity: 'info', dimension: 'occasion', message: 'Registry block may not be appropriate for birthday' }); }
  }

  if (occasion === 'wedding') {
    if (!blockTypes.includes('rsvp') && !blockTypes.includes('event')) {
      score -= 2; issues.push({ severity: 'warning', dimension: 'occasion', message: 'Wedding site missing RSVP or event details' });
    }
  }

  return { score: Math.min(10, score), explanation: `${occasion} — ${blockTypes.length} blocks configured` };
}

function evaluateLength(chapters: Chapter[], issues: QualityIssue[], suggestions: string[]): DimensionScore {
  let score = 7;

  if (chapters.length === 0) { return { score: 2, explanation: 'No chapters' }; }
  if (chapters.length === 1) { score = 5; suggestions.push('Consider adding more chapters for a richer narrative'); }
  if (chapters.length > 10) { score -= 1; suggestions.push('Consider consolidating some chapters — too many can overwhelm visitors'); }
  if (chapters.length >= 3 && chapters.length <= 8) score += 2;

  return { score: Math.min(10, score), explanation: `${chapters.length} chapters` };
}

function evaluateCliches(chapters: Chapter[], manifest: StoryManifest, issues: QualityIssue[]): DimensionScore {
  const cliches = [
    'happily ever after', 'love at first sight', 'meant to be',
    'better half', 'soulmate', 'fairytale', 'once upon a time',
    'two become one', 'the rest is history', 'love conquers all',
    'a match made in heaven', 'the one',
  ];

  const allText = [
    ...chapters.map(c => c.description || ''),
    manifest.poetry?.heroTagline || '',
    manifest.poetry?.closingLine || '',
    manifest.poetry?.welcomeStatement || '',
  ].join(' ').toLowerCase();

  const found = cliches.filter(c => allText.includes(c));
  let score = 9;

  if (found.length > 0) {
    score -= found.length * 1.5;
    issues.push({
      severity: 'warning',
      dimension: 'cliches',
      message: `Found ${found.length} cliché(s): "${found.join('", "')}"`,
    });
  }

  return { score: Math.max(0, Math.min(10, score)), explanation: `${found.length} clichés found` };
}

function evaluateCompleteness(manifest: StoryManifest, issues: QualityIssue[], suggestions: string[]): DimensionScore {
  let score = 5;
  const checks = [
    { name: 'Chapters', present: (manifest.chapters || []).length > 0, weight: 2 },
    { name: 'Hero tagline', present: !!manifest.poetry?.heroTagline, weight: 1 },
    { name: 'Closing line', present: !!manifest.poetry?.closingLine, weight: 1 },
    { name: 'Vibe skin', present: !!manifest.vibeSkin, weight: 1.5 },
    { name: 'Blocks configured', present: (manifest.blocks || []).length > 0, weight: 1 },
    { name: 'Event date', present: !!manifest.logistics?.date, weight: 0.5 },
  ];

  for (const check of checks) {
    if (check.present) {
      score += check.weight;
    } else {
      suggestions.push(`Missing: ${check.name}`);
    }
  }

  return { score: Math.min(10, score), explanation: `${checks.filter(c => c.present).length}/${checks.length} elements complete` };
}
