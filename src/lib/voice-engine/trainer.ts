// ─────────────────────────────────────────────────────────────
// Pearloom / lib/voice-engine/trainer.ts
// Voice Training Pipeline — analyzes couple's writing style,
// builds a personalized voice profile that The Loom uses to
// write content in their authentic tone.
//
// This is a key competitive moat: the trained voice model is
// unique to each couple and cannot be replicated by competitors.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface VoiceProfile {
  /** Unique ID for this profile */
  id: string;
  /** Couple/user this profile belongs to */
  ownerId: string;
  /** Training samples used to build the profile */
  sampleCount: number;
  /** Training timestamp */
  trainedAt: number;

  /** ── Style Analysis ── */

  /** Average sentence length (words) */
  avgSentenceLength: number;
  /** Vocabulary richness (unique words / total words) */
  vocabularyRichness: number;
  /** Formality score 0-10 (0 = very casual, 10 = very formal) */
  formality: number;
  /** Warmth score 0-10 (0 = distant, 10 = intimate) */
  warmth: number;
  /** Humor score 0-10 */
  humor: number;
  /** Emotional expressiveness 0-10 */
  expressiveness: number;

  /** ── Tone Markers ── */

  /** Common phrases and expressions they use */
  signaturePhrases: string[];
  /** Words they use frequently (above average) */
  frequentWords: string[];
  /** Words they never use (avoid in generation) */
  avoidedWords: string[];
  /** Preferred pronouns (we/us vs. I/me, they/them) */
  pronounPreference: 'we' | 'i' | 'they' | 'mixed';
  /** Do they use contractions? (don't vs do not) */
  usesContractions: boolean;
  /** Do they use exclamation marks frequently? */
  usesExclamations: boolean;
  /** Do they use emoji? */
  usesEmoji: boolean;

  /** ── Content Preferences ── */

  /** Topics they mention frequently */
  topicAffinities: string[];
  /** Metaphor style (nature, food, travel, music, etc.) */
  metaphorStyle: string[];
  /** How do they refer to each other? (babe, love, partner, by name) */
  petNames: string[];
  /** Cultural references they make */
  culturalReferences: string[];

  /** ── Generation Prompt ── */

  /** The compiled system prompt for Gemini to write in this voice */
  systemPrompt: string;
}

export interface TrainingSample {
  text: string;
  source: 'message' | 'email' | 'social' | 'vow' | 'speech' | 'freeform';
  /** Who wrote it (partner1 or partner2) */
  author?: 'partner1' | 'partner2' | 'both';
}

// ── Analysis Functions ───────────────────────────────────────

/**
 * Analyze a text sample for voice characteristics.
 */
function analyzeSample(text: string): {
  sentenceLength: number;
  vocabularyRichness: number;
  formality: number;
  warmth: number;
  humor: number;
  expressiveness: number;
  contractions: boolean;
  exclamations: boolean;
  emoji: boolean;
  frequentWords: string[];
  phrases: string[];
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const uniqueWords = new Set(words);

  // Sentence length
  const sentenceLength = sentences.length > 0
    ? words.length / sentences.length
    : 10;

  // Vocabulary richness
  const vocabularyRichness = words.length > 0
    ? uniqueWords.size / words.length
    : 0.5;

  // Formality (heuristic based on word choice)
  const formalWords = ['furthermore', 'however', 'therefore', 'moreover', 'subsequently', 'regarding', 'concerning', 'nevertheless'];
  const casualWords = ['gonna', 'wanna', 'kinda', 'sorta', 'lol', 'haha', 'omg', 'btw', 'tbh', 'literally'];
  const formalCount = words.filter(w => formalWords.includes(w)).length;
  const casualCount = words.filter(w => casualWords.includes(w)).length;
  const formality = Math.min(10, Math.max(0, 5 + formalCount * 2 - casualCount * 2));

  // Warmth (endearment words, emotional language)
  const warmWords = ['love', 'heart', 'beautiful', 'amazing', 'wonderful', 'blessed', 'grateful', 'cherish', 'forever', 'always', 'darling', 'sweetheart'];
  const warmCount = words.filter(w => warmWords.includes(w)).length;
  const warmth = Math.min(10, warmCount * 1.5 + 3);

  // Humor (haha, lol, jokes indicators)
  const humorWords = ['haha', 'lol', 'funny', 'hilarious', 'joke', 'laughing', '😂', '🤣'];
  const humorCount = words.filter(w => humorWords.includes(w)).length;
  const humor = Math.min(10, humorCount * 3);

  // Expressiveness (exclamations, strong adjectives, capitals)
  const exclamationCount = (text.match(/!/g) || []).length;
  const strongAdjectives = ['incredible', 'amazing', 'absolutely', 'insanely', 'ridiculously', 'literally'];
  const strongCount = words.filter(w => strongAdjectives.includes(w)).length;
  const expressiveness = Math.min(10, exclamationCount + strongCount * 2 + 2);

  // Contractions
  const contractions = /n't|'re|'ve|'ll|'d|'m|'s/.test(text);

  // Exclamations
  const exclamations = exclamationCount > sentences.length * 0.3;

  // Emoji
  const emoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u.test(text);

  // Frequent words (appear 3+ times, excluding common words)
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'with', 'that', 'this', 'from', 'they', 'been', 'said', 'each', 'which', 'their']);
  const wordCounts: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) wordCounts[w] = (wordCounts[w] || 0) + 1;
  }
  const frequentWords = Object.entries(wordCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);

  // Extract 2-3 word phrases
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 2])) {
      phrases.push(phrase);
    }
  }

  return {
    sentenceLength, vocabularyRichness, formality, warmth, humor,
    expressiveness, contractions, exclamations, emoji, frequentWords, phrases,
  };
}

/**
 * Train a voice profile from multiple writing samples.
 * Returns a VoiceProfile that can be used as a system prompt for AI generation.
 */
export function trainVoiceProfile(
  samples: TrainingSample[],
  ownerId: string,
): VoiceProfile {
  if (samples.length === 0) {
    return createDefaultProfile(ownerId);
  }

  // Analyze all samples
  const analyses = samples.map(s => analyzeSample(s.text));

  // Average the scores
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const avgSentenceLength = avg(analyses.map(a => a.sentenceLength));
  const vocabularyRichness = avg(analyses.map(a => a.vocabularyRichness));
  const formality = avg(analyses.map(a => a.formality));
  const warmth = avg(analyses.map(a => a.warmth));
  const humor = avg(analyses.map(a => a.humor));
  const expressiveness = avg(analyses.map(a => a.expressiveness));

  // Aggregate frequent words and phrases
  const allFrequentWords = analyses.flatMap(a => a.frequentWords);
  const wordFreq: Record<string, number> = {};
  for (const w of allFrequentWords) { wordFreq[w] = (wordFreq[w] || 0) + 1; }
  const frequentWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);

  const allPhrases = analyses.flatMap(a => a.phrases);
  const phraseFreq: Record<string, number> = {};
  for (const p of allPhrases) { phraseFreq[p] = (phraseFreq[p] || 0) + 1; }
  const signaturePhrases = Object.entries(phraseFreq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p]) => p);

  // Detect pronoun preference
  const allText = samples.map(s => s.text).join(' ').toLowerCase();
  const weCount = (allText.match(/\bwe\b|\bus\b|\bour\b/g) || []).length;
  const iCount = (allText.match(/\bi\b|\bme\b|\bmy\b/g) || []).length;
  const pronounPreference: VoiceProfile['pronounPreference'] =
    weCount > iCount * 1.5 ? 'we' :
    iCount > weCount * 1.5 ? 'i' :
    'mixed';

  // Detect pet names
  const petNamePatterns = ['babe', 'baby', 'love', 'darling', 'sweetheart', 'honey', 'dear'];
  const petNames = petNamePatterns.filter(p => allText.includes(p));

  // Detect topic affinities
  const topicWords: Record<string, string[]> = {
    travel: ['travel', 'trip', 'adventure', 'explore', 'destination', 'flight', 'hotel'],
    food: ['food', 'restaurant', 'cook', 'dinner', 'lunch', 'brunch', 'coffee', 'wine'],
    nature: ['nature', 'mountain', 'ocean', 'beach', 'sunset', 'garden', 'flowers'],
    music: ['music', 'song', 'dance', 'playlist', 'concert', 'band'],
    family: ['family', 'parents', 'mom', 'dad', 'siblings', 'grandparents', 'kids'],
  };
  const topicAffinities = Object.entries(topicWords)
    .map(([topic, words]) => ({ topic, count: words.filter(w => allText.includes(w)).length }))
    .filter(t => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map(t => t.topic);

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    formality, warmth, humor, expressiveness, avgSentenceLength,
    usesContractions: analyses.every(a => a.contractions),
    usesExclamations: analyses.some(a => a.exclamations),
    pronounPreference, signaturePhrases, petNames, topicAffinities,
  });

  return {
    id: `voice-${Date.now()}`,
    ownerId,
    sampleCount: samples.length,
    trainedAt: Date.now(),
    avgSentenceLength: Math.round(avgSentenceLength),
    vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
    formality: Math.round(formality * 10) / 10,
    warmth: Math.round(warmth * 10) / 10,
    humor: Math.round(humor * 10) / 10,
    expressiveness: Math.round(expressiveness * 10) / 10,
    signaturePhrases,
    frequentWords,
    avoidedWords: [],
    pronounPreference,
    usesContractions: analyses.every(a => a.contractions),
    usesExclamations: analyses.some(a => a.exclamations),
    usesEmoji: analyses.some(a => a.emoji),
    topicAffinities,
    metaphorStyle: topicAffinities.slice(0, 2),
    petNames,
    culturalReferences: [],
    systemPrompt,
  };
}

/**
 * Build a Gemini system prompt from voice profile data.
 * This prompt instructs the AI to write in the couple's authentic voice.
 */
function buildSystemPrompt(profile: {
  formality: number;
  warmth: number;
  humor: number;
  expressiveness: number;
  avgSentenceLength: number;
  usesContractions: boolean;
  usesExclamations: boolean;
  pronounPreference: string;
  signaturePhrases: string[];
  petNames: string[];
  topicAffinities: string[];
}): string {
  const parts: string[] = [
    'You are writing as this specific couple. Match their voice exactly.',
    '',
  ];

  // Tone
  if (profile.formality > 7) {
    parts.push('Their writing is formal and polished. Use complete sentences, proper grammar.');
  } else if (profile.formality < 3) {
    parts.push('Their writing is casual and conversational. Use natural, relaxed language.');
  } else {
    parts.push('Their writing balances warmth with polish. Natural but considered.');
  }

  if (profile.warmth > 7) {
    parts.push('They are deeply emotional and affectionate in their writing.');
  }

  if (profile.humor > 5) {
    parts.push('They have a sense of humor — include lighthearted moments where appropriate.');
  }

  if (profile.expressiveness > 7) {
    parts.push('They are enthusiastic and expressive — strong adjectives, vivid language.');
  }

  // Mechanics
  parts.push(`Average sentence length: ${profile.avgSentenceLength} words. Match this.`);

  if (profile.usesContractions) {
    parts.push("Use contractions (don't, we're, it's) — they do.");
  } else {
    parts.push("Avoid contractions — they write 'do not' instead of 'don't'.");
  }

  if (profile.usesExclamations) {
    parts.push('Occasional exclamation marks are natural for them.');
  }

  // Pronouns
  if (profile.pronounPreference === 'we') {
    parts.push("They use 'we/us/our' — always write from the couple's shared perspective.");
  } else if (profile.pronounPreference === 'i') {
    parts.push("They use 'I/me/my' — write from individual perspective.");
  }

  // Signature elements
  if (profile.signaturePhrases.length > 0) {
    parts.push(`Their signature phrases: ${profile.signaturePhrases.slice(0, 5).join(', ')}`);
  }

  if (profile.petNames.length > 0) {
    parts.push(`They call each other: ${profile.petNames.join(', ')}`);
  }

  if (profile.topicAffinities.length > 0) {
    parts.push(`Topics they care about: ${profile.topicAffinities.join(', ')}`);
  }

  return parts.join('\n');
}

function createDefaultProfile(ownerId: string): VoiceProfile {
  return {
    id: `voice-default-${Date.now()}`,
    ownerId,
    sampleCount: 0,
    trainedAt: Date.now(),
    avgSentenceLength: 12,
    vocabularyRichness: 0.65,
    formality: 5,
    warmth: 7,
    humor: 3,
    expressiveness: 5,
    signaturePhrases: [],
    frequentWords: [],
    avoidedWords: [],
    pronounPreference: 'we',
    usesContractions: true,
    usesExclamations: false,
    usesEmoji: false,
    topicAffinities: [],
    metaphorStyle: [],
    petNames: [],
    culturalReferences: [],
    systemPrompt: 'Write warm, authentic content for a celebration site. Use natural language that feels personal and genuine.',
  };
}
