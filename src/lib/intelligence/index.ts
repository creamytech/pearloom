// ─────────────────────────────────────────────────────────────
// Pearloom / lib/intelligence/index.ts
// Pearloom Intelligence Layer — the proprietary data advantage.
//
// This is NOT a custom AI model. It's a data collection,
// evaluation, and learning system built ON TOP of Gemini
// that makes Pearloom's output better with every site generated.
//
// Architecture:
//   data-collection.ts  — captures every user action
//   prompt-library.ts   — tested, scored prompts by context
//   quality-eval.ts     — auto-scores generated sites (10 dimensions)
//   learning.ts         — discovers patterns, improves over time
// ─────────────────────────────────────────────────────────────

export {
  track, flushEvents,
  trackGeneration, trackEdit, trackDesignChoice,
  trackPublish, trackTitlePreference, trackGuestEngagement,
  trackRegeneration, trackPhotoPreferences,
  type TrackingEvent, type GenerationSignal, type DesignPreference,
  type PhotoSignal, type GuestEngagement,
} from './data-collection';

export {
  PROMPT_LIBRARY, selectPrompt, resolvePrompt, recordPromptUsage,
  type PromptTemplate,
} from './prompt-library';

export {
  evaluateQuality,
  type QualityReport, type DimensionScore, type QualityIssue,
} from './quality-eval';

export {
  analyzeGenerationPatterns, analyzeDesignTrends,
  analyzeEngagementPatterns, runLearningPipeline,
  type LearningInsight,
} from './learning';
