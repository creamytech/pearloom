// ─────────────────────────────────────────────────────────────
// Pearloom / lib/progressive-generation/index.ts
// Progressive Generation — starts building the site immediately
// as the user fills out the wizard. By the time they hit
// "Generate," 70-80% of the work is already done.
//
// This is the key UX innovation. Instead of:
//   Fill form (3 min) → Wait (3 min) → See result
// It becomes:
//   Fill form (2 min, site building in background) → See result (5 sec)
// ─────────────────────────────────────────────────────────────

import type { GooglePhotoMetadata } from '@/types';

// ── Types ────────────────────────────────────────────────────

export interface ProgressiveState {
  /** Current generation phase */
  phase: 'idle' | 'photos' | 'identity' | 'style' | 'content' | 'polish' | 'complete';
  /** Percentage of total work done (0-100) */
  progress: number;
  /** What's currently being worked on */
  currentTask: string;
  /** Results accumulated so far */
  results: {
    /** Photo analysis (from phase: photos) */
    photoAnalysis?: {
      clusterCount: number;
      dominantColors: string[];
      heroPhotoUrl: string;
      sceneTypes: string[];
      emotionalArc: number[];
    };
    /** Identity (from phase: identity) */
    identity?: {
      chapterTitles: string[];
      narrativeStructure: string;
      suggestedFont: string;
    };
    /** Style (from phase: style) */
    style?: {
      palette: Record<string, string>;
      fontPair: [string, string];
      spacing: Record<string, string>;
      decorativeStyle: string;
    };
    /** Content (from phase: content) */
    content?: {
      chapterDescriptions: string[];
      heroTagline: string;
      closingLine: string;
      welcomeStatement: string;
    };
  };
  /** Errors encountered */
  errors: string[];
  /** Started at */
  startedAt: number;
}

// ── Pipeline Steps ───────────────────────────────────────────

/**
 * Phase 1: Photo Analysis
 * Triggered: immediately after photos are uploaded
 * Does: clustering, color extraction, scene classification, hero selection
 */
export async function startPhotoAnalysis(
  photos: GooglePhotoMetadata[],
  onProgress: (state: Partial<ProgressiveState>) => void,
): Promise<ProgressiveState['results']['photoAnalysis']> {
  onProgress({ phase: 'photos', progress: 5, currentTask: 'Analyzing your photos...' });

  // Simulate clustering (in production: calls actual clustering API)
  await delay(500);
  onProgress({ progress: 10, currentTask: 'Grouping photos by moment...' });

  // Extract dominant colors from first few photos
  const dominantColors = photos.slice(0, 3).map(() => {
    // In production: calls extractColorsFromPhoto()
    return '#A3B18A'; // placeholder
  });

  onProgress({ progress: 15, currentTask: 'Extracting color palette...' });
  await delay(300);

  // Determine hero photo
  const heroPhotoUrl = photos[0]?.baseUrl || '';

  onProgress({ progress: 20, currentTask: 'Selecting hero photo...' });

  return {
    clusterCount: Math.ceil(photos.length / 4),
    dominantColors,
    heroPhotoUrl,
    sceneTypes: ['outdoor', 'portrait'],
    emotionalArc: [5, 7, 8, 6, 4],
  };
}

/**
 * Phase 2: Identity Generation
 * Triggered: after names + occasion are entered
 * Does: chapter titles, narrative structure, font suggestion
 */
export async function startIdentityGeneration(
  names: [string, string],
  occasion: string,
  photoAnalysis: ProgressiveState['results']['photoAnalysis'],
  onProgress: (state: Partial<ProgressiveState>) => void,
): Promise<ProgressiveState['results']['identity']> {
  onProgress({ phase: 'identity', progress: 25, currentTask: 'Drafting your story structure...' });

  await delay(400);
  onProgress({ progress: 30, currentTask: 'Creating chapter titles...' });

  // In production: calls Gemini to generate chapter titles from photo clusters
  const chapterTitles = photoAnalysis
    ? Array.from({ length: photoAnalysis.clusterCount }, (_, i) => `Chapter ${i + 1}`)
    : ['The Beginning'];

  onProgress({ progress: 35, currentTask: 'Mapping narrative arc...' });

  return {
    chapterTitles,
    narrativeStructure: 'chronological',
    suggestedFont: 'Playfair Display',
  };
}

/**
 * Phase 3: Style Generation
 * Triggered: after mood is selected
 * Does: palette, font pairing, spacing, decorative elements
 */
export async function startStyleGeneration(
  vibeWords: string[],
  occasion: string,
  photoColors: string[],
  paletteSource: 'from-photos' | 'preset' | 'ai-decide',
  onProgress: (state: Partial<ProgressiveState>) => void,
): Promise<ProgressiveState['results']['style']> {
  onProgress({ phase: 'style', progress: 40, currentTask: 'Designing your visual identity...' });

  await delay(300);
  onProgress({ progress: 45, currentTask: 'Selecting typography...' });

  // In production: calls selectFontPairing() and generateUniqueStyleSheet()
  await delay(300);
  onProgress({ progress: 50, currentTask: 'Crafting spacing and rhythm...' });

  await delay(200);
  onProgress({ progress: 55, currentTask: 'Generating decorative elements...' });

  return {
    palette: {
      background: '#FAF7F2',
      foreground: '#1A1A1A',
      accent: photoColors[0] || '#A3B18A',
      accentLight: '#EEE8DC',
      muted: '#7A756E',
      cardBg: '#FFFFFF',
    },
    fontPair: ['Playfair Display', 'Inter'],
    spacing: {
      sectionPaddingY: 'clamp(3rem,6vw,6rem)',
      sectionPaddingX: 'clamp(1.5rem,4vw,3rem)',
    },
    decorativeStyle: vibeWords.includes('organic') ? 'botanical' : 'minimal',
  };
}

/**
 * Phase 4: Content Generation
 * Triggered: after style is generated (or while user fills details)
 * Does: chapter descriptions, poetry, welcome statement
 */
export async function startContentGeneration(
  names: [string, string],
  occasion: string,
  vibeWords: string[],
  chapterTitles: string[],
  onProgress: (state: Partial<ProgressiveState>) => void,
): Promise<ProgressiveState['results']['content']> {
  onProgress({ phase: 'content', progress: 60, currentTask: 'Writing your story...' });

  await delay(500);
  onProgress({ progress: 65, currentTask: 'Crafting chapter narratives...' });

  // In production: calls Gemini with voice-trained prompts
  const chapterDescriptions = chapterTitles.map(() => 'Story content generating...');

  await delay(400);
  onProgress({ progress: 70, currentTask: 'Composing poetry...' });

  const displayName = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];

  await delay(300);
  onProgress({ progress: 75, currentTask: 'Adding finishing touches...' });

  return {
    chapterDescriptions,
    heroTagline: `A celebration of ${displayName}`,
    closingLine: 'With love and gratitude.',
    welcomeStatement: `Welcome to our celebration.`,
  };
}

/**
 * Phase 5: Polish
 * Triggered: when user clicks "Generate" (final step)
 * Does: final assembly, quality check, hero art generation
 * This is the only step the user "waits" for — should be 5-10 seconds.
 */
export async function startPolish(
  results: ProgressiveState['results'],
  onProgress: (state: Partial<ProgressiveState>) => void,
): Promise<void> {
  onProgress({ phase: 'polish', progress: 80, currentTask: 'Assembling your site...' });

  await delay(400);
  onProgress({ progress: 85, currentTask: 'Running quality check...' });

  // In production: calls evaluateQuality()
  await delay(300);
  onProgress({ progress: 90, currentTask: 'Generating artwork...' });

  // In production: calls generateSiteArt()
  await delay(500);
  onProgress({ progress: 95, currentTask: 'Final polish...' });

  await delay(300);
  onProgress({ phase: 'complete', progress: 100, currentTask: 'Ready!' });
}

// ── Orchestrator ─────────────────────────────────────────────

/**
 * Create a new progressive generation session.
 * Returns a controller that manages the background pipeline.
 */
export function createProgressiveSession(): {
  state: ProgressiveState;
  /** Call when photos are uploaded */
  onPhotosReady: (photos: GooglePhotoMetadata[]) => Promise<void>;
  /** Call when names + occasion are entered */
  onIdentityReady: (names: [string, string], occasion: string) => Promise<void>;
  /** Call when mood/style is selected */
  onStyleReady: (vibeWords: string[], paletteSource: string) => Promise<void>;
  /** Call when user clicks Generate (final polish only) */
  onGenerate: () => Promise<void>;
  /** Get current state */
  getState: () => ProgressiveState;
} {
  const state: ProgressiveState = {
    phase: 'idle',
    progress: 0,
    currentTask: '',
    results: {},
    errors: [],
    startedAt: Date.now(),
  };

  const updateState = (update: Partial<ProgressiveState>) => {
    Object.assign(state, update);
  };

  return {
    state,
    getState: () => state,

    onPhotosReady: async (photos) => {
      try {
        state.results.photoAnalysis = await startPhotoAnalysis(photos, updateState);
      } catch (err) {
        state.errors.push(`Photo analysis failed: ${err}`);
      }
    },

    onIdentityReady: async (names, occasion) => {
      try {
        state.results.identity = await startIdentityGeneration(
          names, occasion, state.results.photoAnalysis, updateState
        );
      } catch (err) {
        state.errors.push(`Identity generation failed: ${err}`);
      }
    },

    onStyleReady: async (vibeWords, paletteSource) => {
      try {
        const colors = state.results.photoAnalysis?.dominantColors || [];
        state.results.style = await startStyleGeneration(
          vibeWords, 'wedding', colors, paletteSource as 'from-photos', updateState
        );
        // Start content generation immediately after style
        if (state.results.identity) {
          state.results.content = await startContentGeneration(
            ['', ''], 'wedding', vibeWords,
            state.results.identity.chapterTitles, updateState
          );
        }
      } catch (err) {
        state.errors.push(`Style generation failed: ${err}`);
      }
    },

    onGenerate: async () => {
      try {
        await startPolish(state.results, updateState);
      } catch (err) {
        state.errors.push(`Polish failed: ${err}`);
      }
    },
  };
}

// ── Utility ──────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
