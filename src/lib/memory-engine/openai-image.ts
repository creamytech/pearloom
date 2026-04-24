// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/openai-image.ts
//
// OpenAI GPT Image 2 (gpt-image-2) client — higher-quality,
// reasoning-aware image generator. Released 2026-04-21.
//
// vs gpt-image-1 (the previous version we were on):
//   - Arbitrary sizes up to 3840×3840 (multiples of 16, aspect ≤3:1)
//   - `format` param (was `output_format`)
//   - `output_compression` knob for jpeg/webp
//   - `moderation: 'auto' | 'low'`
//   - No `input_fidelity` — the model always processes at high fidelity
//   - No transparent backgrounds
//   - Dense multilingual text rendering (JA/KO/ZH/HI/BN) works natively
//
// Docs: https://developers.openai.com/api/docs/models/gpt-image-2
// ─────────────────────────────────────────────────────────────

import { log, logError } from './gemini-client';
import type { GeminiImageInput, GeminiImageResult } from './gemini-client';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_EDITS_URL = 'https://api.openai.com/v1/images/edits';

/** Pinned to the current model. Bump when OpenAI ships a new
 *  default — using the bare alias `gpt-image-2` auto-rolls. */
export const GPT_IMAGE_MODEL = 'gpt-image-2';

export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';

/** gpt-image-2 accepts arbitrary sizes under these constraints:
 *    - Max edge: 3840px
 *    - Both edges: multiples of 16
 *    - Aspect ratio: ≤3:1
 *    - Total pixels: 655_360–8_294_400
 *  These presets cover every Pearloom use case. */
export type ImageSize =
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '2048x2048'
  | '2048x1024'
  | '1024x2048'
  | '1536x2048'
  | '2048x1536'
  | '3840x2160'
  | 'auto';

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

/** Generate or edit an image with gpt-image-2. Returns the same
 *  shape as `geminiGenerateImage` so call sites stay interchangeable. */
export async function openaiGenerateImage(opts: OpenAIImageOpts): Promise<GeminiImageResult | null> {
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
    if (isEdit) {
      const form = new FormData();
      form.append('model', GPT_IMAGE_MODEL);
      form.append('prompt', prompt);
      form.append('quality', quality);
      form.append('size', size);
      form.append('n', String(n));
      form.append('format', format);
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
      size,
      n,
      format,
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
      logError(`[openai-image] ${res.status}:`, errText.slice(0, 400));
      return null;
    }
    const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      log('[openai-image] Empty response');
      return null;
    }
    return { base64: b64, mimeType: mimeFromFormat(format) };
  } catch (err) {
    logError('[openai-image] Error:', err);
    return null;
  }
}

/** True when the OpenAI key is present. Lets call sites decide
 *  whether to pick the OpenAI path or fall back to Gemini. */
export function hasOpenAIImageKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
