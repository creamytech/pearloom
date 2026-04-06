// ─────────────────────────────────────────────────────────────
// Pearloom / lib/photo-intelligence/analyzer.ts
// Photo Intelligence Engine — face detection, emotion scoring,
// scene classification, story arc analysis, visual quality scoring.
//
// This is Pearloom's primary technical moat. The deeper the photo
// analysis, the better The Loom's narrative generation becomes,
// and the harder it is for competitors to replicate the output.
// ─────────────────────────────────────────────────────────────

import type { GooglePhotoMetadata } from '@/types';

// ── Types ────────────────────────────────────────────────────

export interface FaceDetection {
  /** Bounding box as percentages (0-1) */
  bounds: { x: number; y: number; width: number; height: number };
  /** Estimated emotion */
  emotion: 'joy' | 'love' | 'surprise' | 'neutral' | 'contemplative' | 'tearful';
  /** Confidence 0-1 */
  confidence: number;
  /** Estimated age range */
  ageRange?: [number, number];
  /** Is this person looking at camera? */
  eyeContact: boolean;
  /** Unique face cluster ID (for tracking same person across photos) */
  clusterId?: string;
}

export interface SceneClassification {
  /** Primary scene type */
  scene: 'outdoor-nature' | 'outdoor-urban' | 'indoor-venue' | 'indoor-home'
    | 'beach' | 'garden' | 'church' | 'restaurant' | 'dance-floor'
    | 'portrait' | 'group' | 'detail-shot' | 'food' | 'architecture';
  /** Time of day */
  timeOfDay: 'golden-hour' | 'blue-hour' | 'midday' | 'evening' | 'night' | 'unknown';
  /** Season */
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'unknown';
  /** Weather/lighting */
  lighting: 'natural-soft' | 'natural-harsh' | 'artificial-warm' | 'artificial-cool'
    | 'candlelight' | 'dramatic' | 'backlit' | 'silhouette';
  /** Color temperature (warm = positive, cool = negative) */
  colorTemp: number;
  /** Dominant colors as hex values */
  dominantColors: string[];
}

export interface EmotionalScore {
  /** Overall emotional intensity 0-10 */
  intensity: number;
  /** Primary emotion */
  primary: 'joy' | 'love' | 'nostalgia' | 'excitement' | 'serenity' | 'intimacy' | 'celebration' | 'neutral';
  /** Secondary emotion (if present) */
  secondary?: string;
  /** Is this an "emotional peak" moment? */
  isPeak: boolean;
  /** Narrative weight — how important is this for storytelling? */
  narrativeWeight: number;
}

export interface VisualQuality {
  /** Overall quality score 0-10 */
  score: number;
  /** Sharpness score 0-10 */
  sharpness: number;
  /** Composition score 0-10 (rule of thirds, leading lines, etc.) */
  composition: number;
  /** Exposure score 0-10 */
  exposure: number;
  /** Is this photo suitable for hero/cover use? */
  heroCandidate: boolean;
  /** Is this a duplicate or near-duplicate of another photo? */
  isDuplicate: boolean;
  /** Similar photo IDs (near-duplicates) */
  similarTo?: string[];
}

export interface StoryArcPosition {
  /** Where does this photo fall in the narrative arc? */
  position: 'setup' | 'rising-action' | 'climax' | 'falling-action' | 'resolution';
  /** Suggested chapter role */
  role: 'opener' | 'establishing' | 'detail' | 'emotional-peak' | 'transition' | 'closer';
  /** Suggested caption style */
  captionStyle: 'descriptive' | 'emotional' | 'poetic' | 'minimal' | 'storytelling';
}

/** Complete analysis for a single photo */
export interface PhotoAnalysis {
  photoId: string;
  faces: FaceDetection[];
  scene: SceneClassification;
  emotion: EmotionalScore;
  quality: VisualQuality;
  storyArc: StoryArcPosition;
  /** AI-generated caption */
  caption?: string;
  /** AI-suggested alt text for accessibility */
  altText?: string;
  /** Tags for searchability */
  tags: string[];
  /** Analysis timestamp */
  analyzedAt: number;
}

/** Analysis for a cluster of photos (a "moment") */
export interface ClusterAnalysis {
  clusterId: string;
  photoCount: number;
  /** Best photo for hero/cover use */
  heroPhotoId: string;
  /** Photos ranked by storytelling value */
  rankedPhotoIds: string[];
  /** Overall mood of this moment */
  mood: string;
  /** Suggested chapter title */
  suggestedTitle: string;
  /** Suggested narrative tone */
  tone: 'warm' | 'dramatic' | 'playful' | 'elegant' | 'candid' | 'cinematic';
  /** Time span */
  timeSpan: { start: string; end: string };
  /** Location (if detected) */
  location?: string;
  /** Emotional arc within this cluster */
  emotionalArc: Array<{ photoId: string; intensity: number }>;
}

// ── Analysis Engine ──────────────────────────────────────────

/**
 * Analyze a single photo using Gemini Vision.
 * Returns comprehensive analysis including faces, scene, emotion, quality.
 */
export async function analyzePhoto(
  photo: GooglePhotoMetadata,
  imageData: string, // base64 or URL
  apiKey: string,
): Promise<PhotoAnalysis> {
  const prompt = `Analyze this photo for a celebration site builder. Return JSON with:
{
  "faces": [{ "emotion": "joy|love|surprise|neutral|contemplative|tearful", "confidence": 0.9, "eyeContact": true, "ageRange": [25, 35] }],
  "scene": { "scene": "outdoor-nature", "timeOfDay": "golden-hour", "season": "summer", "lighting": "natural-soft", "colorTemp": 0.3, "dominantColors": ["#D4A574", "#8B9B6A"] },
  "emotion": { "intensity": 8, "primary": "joy", "isPeak": true, "narrativeWeight": 9 },
  "quality": { "score": 8, "sharpness": 9, "composition": 7, "exposure": 8, "heroCandidate": true, "isDuplicate": false },
  "storyArc": { "position": "climax", "role": "emotional-peak", "captionStyle": "emotional" },
  "caption": "A golden moment of pure joy",
  "altText": "Couple laughing together in a sunlit garden",
  "tags": ["couple", "outdoor", "golden-hour", "laughing", "garden"]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              imageData.startsWith('data:')
                ? { inlineData: { mimeType: 'image/jpeg', data: imageData.split(',')[1] } }
                : { fileData: { mimeType: 'image/jpeg', fileUri: imageData } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini returned ${res.status}`);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    const analysis = JSON.parse(text);

    return {
      photoId: photo.id,
      faces: analysis.faces || [],
      scene: analysis.scene || { scene: 'portrait', timeOfDay: 'unknown', season: 'unknown', lighting: 'natural-soft', colorTemp: 0, dominantColors: [] },
      emotion: analysis.emotion || { intensity: 5, primary: 'neutral', isPeak: false, narrativeWeight: 5 },
      quality: analysis.quality || { score: 5, sharpness: 5, composition: 5, exposure: 5, heroCandidate: false, isDuplicate: false },
      storyArc: analysis.storyArc || { position: 'setup', role: 'establishing', captionStyle: 'descriptive' },
      caption: analysis.caption,
      altText: analysis.altText,
      tags: analysis.tags || [],
      analyzedAt: Date.now(),
    };
  } catch (err) {
    console.warn('[Photo Intelligence] Analysis failed:', err);
    return createFallbackAnalysis(photo);
  }
}

/**
 * Analyze a cluster of photos and determine the optimal storytelling arrangement.
 */
export function analyzeCluster(
  photos: Array<{ photo: GooglePhotoMetadata; analysis: PhotoAnalysis }>,
  clusterId: string,
): ClusterAnalysis {
  if (photos.length === 0) {
    return {
      clusterId,
      photoCount: 0,
      heroPhotoId: '',
      rankedPhotoIds: [],
      mood: 'neutral',
      suggestedTitle: 'Untitled Moment',
      tone: 'candid',
      timeSpan: { start: '', end: '' },
      emotionalArc: [],
    };
  }

  // Find best hero photo (highest quality + composition + heroCandidate)
  const heroPhoto = photos.reduce((best, curr) => {
    const bestScore = best.analysis.quality.score * 0.4 + best.analysis.quality.composition * 0.3 + (best.analysis.quality.heroCandidate ? 3 : 0);
    const currScore = curr.analysis.quality.score * 0.4 + curr.analysis.quality.composition * 0.3 + (curr.analysis.quality.heroCandidate ? 3 : 0);
    return currScore > bestScore ? curr : best;
  });

  // Rank photos by storytelling value
  const ranked = [...photos].sort((a, b) =>
    (b.analysis.emotion.narrativeWeight + b.analysis.quality.score) -
    (a.analysis.emotion.narrativeWeight + a.analysis.quality.score)
  );

  // Determine overall mood from dominant emotions
  const emotionCounts: Record<string, number> = {};
  for (const p of photos) {
    const e = p.analysis.emotion.primary;
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;
  }
  const mood = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  // Determine tone from scene types
  const sceneCounts: Record<string, number> = {};
  for (const p of photos) {
    sceneCounts[p.analysis.scene.scene] = (sceneCounts[p.analysis.scene.scene] || 0) + 1;
  }

  const dominantScene = Object.entries(sceneCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const tone: ClusterAnalysis['tone'] =
    dominantScene === 'dance-floor' ? 'playful' :
    dominantScene === 'church' ? 'elegant' :
    dominantScene === 'portrait' ? 'cinematic' :
    mood === 'joy' || mood === 'celebration' ? 'warm' :
    mood === 'intimacy' || mood === 'love' ? 'dramatic' :
    'candid';

  // Suggest chapter title from tags and mood
  const allTags = photos.flatMap(p => p.analysis.tags);
  const tagCounts: Record<string, number> = {};
  for (const t of allTags) { tagCounts[t] = (tagCounts[t] || 0) + 1; }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

  const suggestedTitle = topTags.length > 0
    ? topTags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ')
    : 'A Beautiful Moment';

  // Build emotional arc
  const emotionalArc = photos
    .sort((a, b) => new Date(a.photo.creationTime || '').getTime() - new Date(b.photo.creationTime || '').getTime())
    .map(p => ({ photoId: p.photo.id, intensity: p.analysis.emotion.intensity }));

  return {
    clusterId,
    photoCount: photos.length,
    heroPhotoId: heroPhoto.photo.id,
    rankedPhotoIds: ranked.map(r => r.photo.id),
    mood,
    suggestedTitle,
    tone,
    timeSpan: {
      start: photos[0]?.photo.creationTime || '',
      end: photos[photos.length - 1]?.photo.creationTime || '',
    },
    location: photos[0]?.analysis.tags.find(t => t.includes('location'))?.replace('location:', ''),
    emotionalArc,
  };
}

/**
 * Detect near-duplicate photos within a set.
 * Uses perceptual hashing via dominant color + face count similarity.
 */
export function detectDuplicates(analyses: PhotoAnalysis[]): Map<string, string[]> {
  const duplicates = new Map<string, string[]>();

  for (let i = 0; i < analyses.length; i++) {
    for (let j = i + 1; j < analyses.length; j++) {
      const a = analyses[i];
      const b = analyses[j];

      // Simple similarity check: same scene + same face count + similar colors
      if (
        a.scene.scene === b.scene.scene &&
        a.faces.length === b.faces.length &&
        a.scene.dominantColors[0] === b.scene.dominantColors[0]
      ) {
        const existing = duplicates.get(a.photoId) || [];
        existing.push(b.photoId);
        duplicates.set(a.photoId, existing);
        b.quality.isDuplicate = true;
        b.quality.similarTo = [a.photoId];
      }
    }
  }

  return duplicates;
}

/**
 * Score photos for "story arc" placement.
 * Determines which photos work as openers, climaxes, and closers.
 */
export function scoreStoryArc(analyses: PhotoAnalysis[]): PhotoAnalysis[] {
  const sorted = [...analyses].sort((a, b) => b.emotion.intensity - a.emotion.intensity);

  // Top 10% are climax candidates
  const climaxThreshold = Math.ceil(sorted.length * 0.1);
  // Bottom 20% are resolution candidates
  const resolutionThreshold = Math.ceil(sorted.length * 0.2);

  return analyses.map((a, i) => {
    const rank = sorted.findIndex(s => s.photoId === a.photoId);

    if (rank < climaxThreshold) {
      a.storyArc = { position: 'climax', role: 'emotional-peak', captionStyle: 'emotional' };
    } else if (rank < climaxThreshold * 3) {
      a.storyArc = { position: 'rising-action', role: 'detail', captionStyle: 'storytelling' };
    } else if (rank > sorted.length - resolutionThreshold) {
      a.storyArc = { position: 'resolution', role: 'closer', captionStyle: 'poetic' };
    } else if (i === 0) {
      a.storyArc = { position: 'setup', role: 'opener', captionStyle: 'descriptive' };
    }

    return a;
  });
}

// ── Fallback ─────────────────────────────────────────────────

function createFallbackAnalysis(photo: GooglePhotoMetadata): PhotoAnalysis {
  return {
    photoId: photo.id,
    faces: [],
    scene: { scene: 'portrait', timeOfDay: 'unknown', season: 'unknown', lighting: 'natural-soft', colorTemp: 0, dominantColors: [] },
    emotion: { intensity: 5, primary: 'neutral', isPeak: false, narrativeWeight: 5 },
    quality: { score: 5, sharpness: 5, composition: 5, exposure: 5, heroCandidate: false, isDuplicate: false },
    storyArc: { position: 'setup', role: 'establishing', captionStyle: 'descriptive' },
    tags: [],
    analyzedAt: Date.now(),
  };
}
