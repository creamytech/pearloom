// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/ai-blocks.ts
// AI-powered block generation, content suggestions, and
// auto-layout optimization.
//
// Uses the Gemini API via /api/ai-blocks to generate block
// schemas with content and bindings from natural language prompts.
// ─────────────────────────────────────────────────────────────

import type { PageBlock, StoryManifest } from '@/types';

/**
 * Generate a block from a natural language prompt.
 * Calls the AI endpoint to create a block with content.
 *
 * @example
 *   const block = await generateBlockFromPrompt(
 *     "Add a section about our honeymoon in Bali",
 *     manifest
 *   );
 *   // → { type: 'text', config: { text: 'Our Bali honeymoon...' } }
 */
export async function generateBlockFromPrompt(
  prompt: string,
  manifest: StoryManifest,
  signal?: AbortSignal,
): Promise<PageBlock | null> {
  try {
    const res = await fetch('/api/ai-blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        vibeString: manifest.vibeString,
        occasion: manifest.occasion,
        existingBlocks: (manifest.blocks || []).map(b => b.type),
      }),
      signal,
    });

    if (!res.ok) return null;
    const data = await res.json();

    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: data.type || 'text',
      order: (manifest.blocks || []).length,
      visible: true,
      config: data.config || { text: data.content || prompt },
    };
  } catch {
    return null;
  }
}

/**
 * Suggest content for an empty block based on its type and the site context.
 * Returns a string suggestion the user can accept or dismiss.
 */
export function suggestContent(
  blockType: string,
  manifest: StoryManifest,
): string {
  const occasion = manifest.occasion || 'wedding';
  const names = manifest.chapters?.[0]?.title || 'your celebration';

  const suggestions: Record<string, string[]> = {
    text: [
      'Share a personal note about what this day means to you.',
      'Tell the story of how you met in your own words.',
      'Add a note for your guests about what to expect.',
    ],
    quote: [
      '"Love is not about how many days, months, or years you have been together. Love is about how much you love each other every single day."',
      '"The best thing to hold onto in life is each other."',
      '"In all the world, there is no heart for me like yours."',
    ],
    welcome: [
      `We are so thrilled to share this special moment with you. Your presence means the world to us.`,
      `Thank you for being part of our journey. We can't wait to celebrate with you.`,
    ],
    countdown: [
      occasion === 'wedding' ? 'Until we say I do' :
      occasion === 'birthday' ? 'Until the celebration' :
      occasion === 'anniversary' ? 'Until our anniversary' :
      'The moment arrives',
    ],
    hashtag: [
      'Share your photos with our hashtag!',
    ],
  };

  const options = suggestions[blockType];
  if (!options || options.length === 0) return '';

  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Suggest optimal block ordering based on content type and length.
 * Returns a reordered copy of the blocks array.
 *
 * Scoring logic:
 * 1. Hero always first
 * 2. Story/Welcome near the top
 * 3. Events and RSVP in the middle
 * 4. Social features (guestbook, photos, quiz) near bottom
 * 5. Footer always last
 */
export function suggestBlockOrder(blocks: PageBlock[]): PageBlock[] {
  const PRIORITY: Record<string, number> = {
    hero: 0,
    vibeQuote: 1,
    welcome: 2,
    story: 3,
    event: 4,
    countdown: 5,
    rsvp: 6,
    registry: 7,
    travel: 8,
    faq: 9,
    photos: 10,
    video: 11,
    guestbook: 12,
    spotify: 13,
    quiz: 14,
    photoWall: 15,
    hashtag: 16,
    gallery: 17,
    map: 18,
    text: 19,
    quote: 20,
    divider: 50,
    anniversary: 51,
    footer: 99,
  };

  const sorted = [...blocks].sort((a, b) => {
    const pa = PRIORITY[a.type] ?? 50;
    const pb = PRIORITY[b.type] ?? 50;
    return pa - pb;
  });

  return sorted.map((b, i) => ({ ...b, order: i }));
}

/**
 * Analyze current blocks and suggest missing sections.
 * Returns an array of block type suggestions the user might want to add.
 */
export function suggestMissingBlocks(
  blocks: PageBlock[],
  manifest: StoryManifest,
): Array<{ type: string; reason: string }> {
  const existingTypes = new Set(blocks.map(b => b.type));
  const suggestions: Array<{ type: string; reason: string }> = [];

  if (!existingTypes.has('hero')) {
    suggestions.push({ type: 'hero', reason: 'Every site needs a hero section' });
  }
  if (!existingTypes.has('rsvp') && manifest.events?.length) {
    suggestions.push({ type: 'rsvp', reason: 'Let guests RSVP to your events' });
  }
  if (!existingTypes.has('photos') && manifest.chapters?.some(c => c.images?.length)) {
    suggestions.push({ type: 'photos', reason: 'Showcase your photos in a gallery' });
  }
  if (!existingTypes.has('countdown') && manifest.logistics?.date) {
    suggestions.push({ type: 'countdown', reason: 'Build excitement with a countdown' });
  }
  if (!existingTypes.has('guestbook')) {
    suggestions.push({ type: 'guestbook', reason: 'Let guests leave messages and wishes' });
  }
  if (!existingTypes.has('faq') && manifest.faqs?.length) {
    suggestions.push({ type: 'faq', reason: 'Answer common guest questions' });
  }
  if (!existingTypes.has('spotify') && manifest.spotifyUrl) {
    suggestions.push({ type: 'spotify', reason: 'Share your music playlist' });
  }
  if (!existingTypes.has('footer')) {
    suggestions.push({ type: 'footer', reason: 'Add a footer with your closing line' });
  }

  return suggestions;
}
