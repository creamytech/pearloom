// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/image-router.ts
//
// Single entry point for every AI image generation call in the
// product. As of 2026-04-21 we default to OpenAI GPT Image 2 for
// both generation AND edits when the OPENAI_API_KEY is set —
// gpt-image-2 is now better than Nano Banana at stylization,
// face consistency, and legible text. Gemini stays as a graceful
// fallback when OpenAI is unreachable, rate-limited, or absent.
//
// Callers get the same result shape either way.
// ─────────────────────────────────────────────────────────────

import { geminiGenerateImage, type GeminiImageInput, type GeminiImageResult } from './gemini-client';
import {
  openaiGenerateImage,
  hasOpenAIImageKey,
  type ImageQuality,
  type ImageSize,
  type ImageFormat,
  type ImageModeration,
} from './openai-image';

export type ImageProvider = 'openai' | 'gemini' | 'auto';

export interface GenerateImageOpts {
  /** Free-form Gemini API key override. When absent, reads from env. */
  apiKey?: string;
  prompt: string;
  inputImage?: GeminiImageInput;
  inputImages?: GeminiImageInput[];
  mask?: GeminiImageInput;
  /** 'auto' (default) prefers OpenAI gpt-image-2, falls back to Gemini. */
  provider?: ImageProvider;
  /** OpenAI-only knobs; ignored on Gemini. */
  quality?: ImageQuality;
  size?: ImageSize;
  format?: ImageFormat;
  outputCompression?: number;
  moderation?: ImageModeration;
  /** Use-case tag for logging + provider routing. Stylize + couple
   *  scene edits now prefer OpenAI since gpt-image-2 handles faces
   *  more faithfully than Nano Banana. */
  purpose?:
    | 'hero'
    | 'chapter'
    | 'motif'
    | 'thumbnail'
    | 'edit'
    | 'stylize'
    | 'invite'
    | 'stamp'
    | 'seal'
    | 'postmark'
    | 'avatar'
    | 'scene'
    | 'other';
}

function pickProvider(opts: GenerateImageOpts): 'openai' | 'gemini' {
  if (opts.provider === 'openai') return 'openai';
  if (opts.provider === 'gemini') return 'gemini';
  if (hasOpenAIImageKey()) return 'openai';
  return 'gemini';
}

export async function generateImage(opts: GenerateImageOpts): Promise<GeminiImageResult | null> {
  const provider = pickProvider(opts);

  if (provider === 'openai') {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return fallbackToGemini();
    const result = await openaiGenerateImage({
      apiKey: openaiKey,
      prompt: opts.prompt,
      inputImage: opts.inputImage,
      inputImages: opts.inputImages,
      mask: opts.mask,
      quality: opts.quality ?? (opts.purpose === 'thumbnail' ? 'medium' : 'high'),
      size: opts.size ?? '1024x1024',
      format: opts.format,
      outputCompression: opts.outputCompression,
      moderation: opts.moderation,
    });
    // Fall back to Gemini when OpenAI returns null (rate limit, bad
    // prompt, etc.) — we never let the pipeline silently lose art.
    if (!result) return fallbackToGemini();
    return result;
  }

  return fallbackToGemini();

  async function fallbackToGemini(): Promise<GeminiImageResult | null> {
    const geminiKey =
      opts.apiKey ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_AI_KEY ??
      process.env.GOOGLE_API_KEY;
    if (!geminiKey) return null;
    return geminiGenerateImage({
      apiKey: geminiKey,
      prompt: opts.prompt,
      inputImage: opts.inputImage,
    });
  }
}
