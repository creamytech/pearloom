// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/openai-image.ts
//
// OpenAI GPT Image client (gpt-image-1).
//
// Params the API actually takes:
//   - `output_format: 'png' | 'jpeg' | 'webp'` (NOT `format`)
//   - `output_compression: number` (0–100, jpeg/webp only)
//   - `quality: 'low' | 'medium' | 'high' | 'auto'`
//   - `size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto'`
//   - `n: 1` (only 1 supported at high quality)
//   - `background: 'transparent' | 'opaque' | 'auto'`
//   - `moderation: 'auto' | 'low'`
//
// We log the real API error body on failure so empty responses
// stop showing up with no explanation in the editor UI.
// ─────────────────────────────────────────────────────────────

import { log, logError } from './gemini-client';
import type { GeminiImageInput, GeminiImageResult } from './gemini-client';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_EDITS_URL = 'https://api.openai.com/v1/images/edits';

/** Pinned to the current shipping model. */
export const GPT_IMAGE_MODEL = 'gpt-image-1';

export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';

/** gpt-image-1 accepts a fixed set of sizes — no arbitrary dimensions.
 *  Anything else is a 400 BadRequest. */
export type ImageSize =
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | 'auto';

/** Clamps a requested size to the closest supported one. Used by
 *  callers that previously passed 2048×… which now silently fail. */
export function normalizeSize(requested: string): ImageSize {
  const supported = new Set(['1024x1024', '1536x1024', '1024x1536', 'auto']);
  if (supported.has(requested)) return requested as ImageSize;
  // Aspect-based fallback.
  const m = /^(\d+)x(\d+)$/.exec(requested);
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w > h * 1.3) return '1536x1024';
    if (h > w * 1.3) return '1024x1536';
    return '1024x1024';
  }
  return '1024x1024';
}

export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ImageModeration = 'auto' | 'low';

export interface OpenAIImageOpts {
  apiKey: string;
  prompt: string;
  /** Optional source image — triggers the edits endpoint. */
  inputImage?: GeminiImageInput;
  /** Multiple source images (gpt-image-2 accepts up to 10 on edits). */
  inputImages?: GeminiImageInput[];
  /** Optional alpha mask for inpainting-style edits. */
  mask?: GeminiImageInput;
  quality?: ImageQuality;
  size?: ImageSize;
  n?: number;
  format?: ImageFormat;
  /** 0–100 (only used for jpeg/webp). */
  outputCompression?: number;
  /** Default `'auto'`. Use `'low'` when the archetype is stylized
   *  portraiture of the couple — avoids false positives on
   *  wedding portraits. */
  moderation?: ImageModeration;
}

function mimeFromFormat(f: ImageFormat): string {
  return f === 'jpeg' ? 'image/jpeg' : `image/${f}`;
}

// Last OpenAI error text — exported so higher-level routes can relay
// the real failure to the UI instead of saying "empty response".
let lastOpenAIError: string | null = null;
export function getLastOpenAIError(): string | null {
  return lastOpenAIError;
}

/** Generate or edit an image with gpt-image-1. Returns the same
 *  shape as `geminiGenerateImage` so call sites stay interchangeable. */
export async function openaiGenerateImage(opts: OpenAIImageOpts): Promise<GeminiImageResult | null> {
  lastOpenAIError = null;
  const {
    apiKey,
    prompt,
    inputImage,
    inputImages,
    mask,
    quality = 'high',
    size = '1024x1024',
    n = 1,
    format = 'png',
    outputCompression,
    moderation = 'auto',
  } = opts;

  const isEdit = Boolean(inputImage || inputImages?.length);

  try {
    const normalizedSize = normalizeSize(size);
    if (isEdit) {
      const form = new FormData();
      form.append('model', GPT_IMAGE_MODEL);
      form.append('prompt', prompt);
      form.append('quality', quality);
      form.append('size', normalizedSize);
      form.append('n', String(n));
      form.append('output_format', format);
      form.append('moderation', moderation);
      if (outputCompression != null && (format === 'jpeg' || format === 'webp')) {
        form.append('output_compression', String(outputCompression));
      }

      const images = inputImages?.length ? inputImages : inputImage ? [inputImage] : [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const blob = new Blob(
          [Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0))],
          { type: img.mimeType || 'image/png' },
        );
        // OpenAI accepts an array by repeating `image[]` entries.
        form.append(images.length > 1 ? 'image[]' : 'image', blob, `input-${i}.png`);
      }
      if (mask) {
        const maskBlob = new Blob(
          [Uint8Array.from(atob(mask.base64), (c) => c.charCodeAt(0))],
          { type: mask.mimeType || 'image/png' },
        );
        form.append('mask', maskBlob, 'mask.png');
      }

      const res = await fetch(OPENAI_EDITS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        lastOpenAIError = `edit ${res.status}: ${errText.slice(0, 300)}`;
        logError(`[openai-image/edit] ${res.status}:`, errText.slice(0, 400));
        return null;
      }
      const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) return null;
      return { base64: b64, mimeType: mimeFromFormat(format) };
    }

    // Plain generation — JSON body.
    const body: Record<string, unknown> = {
      model: GPT_IMAGE_MODEL,
      prompt,
      quality,
      size: normalizedSize,
      n,
      output_format: format,
      moderation,
    };
    if (outputCompression != null && (format === 'jpeg' || format === 'webp')) {
      body.output_compression = outputCompression;
    }

    const res = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      lastOpenAIError = `${res.status}: ${errText.slice(0, 300)}`;
      logError(`[openai-image] ${res.status}:`, errText.slice(0, 400));
      return null;
    }
    const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      lastOpenAIError = 'Empty response (no b64_json in data[0])';
      log('[openai-image] Empty response');
      return null;
    }
    return { base64: b64, mimeType: mimeFromFormat(format) };
  } catch (err) {
    lastOpenAIError = err instanceof Error ? err.message : String(err);
    logError('[openai-image] Error:', err);
    return null;
  }
}

/** True when the OpenAI key is present. Lets call sites decide
 *  whether to pick the OpenAI path or fall back to Gemini. */
export function hasOpenAIImageKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
