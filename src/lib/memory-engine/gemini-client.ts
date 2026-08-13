// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/gemini-client.ts — model routing,
// retry logic, and Gemini API call helpers
// ─────────────────────────────────────────────────────────────────

// ── Model routing ─────────────────────────────────────────────────────────
// Verified against ai.google.dev/gemini-api/docs/changelog on
// 2026-06-01:
//   gemini-3.1-pro-preview      — current Pro (3-pro-preview retired
//                                  Mar 26, 2026; 3.5-pro still limited
//                                  preview, GA targeted June 2026)
//   gemini-3.5-flash            — GA May 19, 2026 ($1.50/$9 per MTok),
//                                  frontier agentic/coding; preferred
//                                  Flash going forward
//   gemini-3.1-flash-lite       — GA, dropped -preview suffix.
//                                  Cheapest production option
//                                  ($0.25/$1.50 per MTok)
//   gemini-3.1-flash-image-preview — DEPRECATED, shutting down
//                                     June 25, 2026. Pearloom must
//                                     migrate /api/photos/stylize off
//                                     this URL before that date.
//                                     See lib/image-gen/ for the
//                                     migration path to gpt-image-2.
export const GEMINI_PRO        = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';
export const GEMINI_FLASH      = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
export const GEMINI_LITE       = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';
/** DEPRECATED — shuts down June 25, 2026. Use the helper in
 *  src/lib/image-gen/index.ts instead, which routes to the
 *  successor provider configured per env. */
export const GEMINI_IMAGE_DEPRECATED = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent';
/** @deprecated kept as named export so existing imports don't break;
 *  references log a console.warn in dev. New code should import from
 *  '@/lib/image-gen' instead. */
export const GEMINI_IMAGE = GEMINI_IMAGE_DEPRECATED;

// Default — used for backward compat on any pass not explicitly routed
export const GEMINI_API_BASE = GEMINI_FLASH;

// ── Dev-only logging helpers ─────────────────────────────────────────────────
export const log = process.env.NODE_ENV === 'development' ? console.log : () => {};
export const logWarn = process.env.NODE_ENV === 'development' ? console.warn : () => {};
export const logError = process.env.NODE_ENV === 'development' ? console.error : () => {};

// ── Usage accounting (src/lib/ai-usage.ts) ──────────────────────────────────
// geminiRetryFetch is the shared chokepoint for Gemini calls, but it
// hands raw Response objects back to callers who parse the JSON
// themselves. So we clone() the response and read `usageMetadata`
// (promptTokenCount / candidatesTokenCount / cachedContentTokenCount)
// from the clone asynchronously — fire-and-forget, never touching the
// body the caller needs. Streaming responses (:streamGenerateContent /
// text/event-stream) are skipped rather than buffered.
//
// NOTE coverage boundary: a number of API routes call `fetch` against
// the GEMINI_* URLs directly instead of going through geminiRetryFetch
// (e.g. /api/rewrite-text, /api/translate, /api/ai-chat, pear-chat's
// Gemini streaming path, photo-vision). Those bypass this accounting
// until they're migrated onto geminiRetryFetch.

function modelFromGeminiUrl(url: string): string | null {
  const m = /\/models\/([^:/?]+)/.exec(url);
  return m ? m[1] : null;
}

function recordGeminiUsage(url: string, res: Response, startedMs: number): void {
  try {
    if (!res.ok) return;
    // Skip streaming responses — we'd have to buffer the whole stream
    // to total the usage; not worth racing the caller's reader.
    if (url.includes(':streamGenerateContent')) return;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) return;
    const model = modelFromGeminiUrl(url);
    if (!model) return;

    // clone() so the caller's res.json()/res.text() is untouched.
    const clone = res.clone();
    void clone
      .json()
      .then(async (data) => {
        const meta = (data as {
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            thoughtsTokenCount?: number;
            cachedContentTokenCount?: number;
          };
        })?.usageMetadata;
        if (!meta) return;
        const { recordAiUsage } = await import('@/lib/ai-usage');
        recordAiUsage({
          provider: 'gemini',
          model,
          inputTokens: meta.promptTokenCount ?? 0,
          outputTokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
          cacheReadTokens: meta.cachedContentTokenCount ?? 0,
          ms: Date.now() - startedMs,
        });
      })
      .catch(() => {
        /* malformed body / aborted — accounting is best-effort */
      });
  } catch {
    // accounting must never break a model call
  }
}

/**
 * Wraps a Gemini fetch with automatic retry on 503 (UNAVAILABLE) and 429 (rate limit).
 * Uses exponential back-off: 2s â†’ 4s â†’ 8s (max 3 attempts).
 */
export async function geminiRetryFetch(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  const startedMs = Date.now();
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 503 || res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const backoff = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      if (attempt < maxAttempts) {
        logWarn(`[Memory Engine] Gemini ${res.status} â€” retrying in ${backoff / 1000}s (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      lastError = new Error(`Gemini API temporarily unavailable (${res.status}). Please try again in a moment.`);
      throw lastError;
    }
    // ms includes retry back-off — it's the caller-perceived latency.
    recordGeminiUsage(url, res, startedMs);
    return res;
  }
  throw lastError ?? new Error('Gemini request failed after max retries');
}

// ── Image generation / editing ───────────────────────────────────────────
// Wrapper for the gemini-3.1-flash-image-preview model ("Nano Banana").
// Accepts an optional input image (e.g. a couple photo) plus a text
// prompt, and returns the first image part the model produces.
export interface GeminiImageInput {
  /** MIME type of the source image (e.g. "image/jpeg"). */
  mimeType: string;
  /** Raw base64 (no data-URL prefix). */
  base64: string;
}

export interface GeminiImageResult {
  base64: string;
  mimeType: string;
}

export async function geminiGenerateImage(opts: {
  apiKey: string;
  prompt: string;
  inputImage?: GeminiImageInput;
}): Promise<GeminiImageResult | null> {
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];
  if (opts.inputImage) {
    parts.push({
      inlineData: {
        mimeType: opts.inputImage.mimeType,
        data: opts.inputImage.base64,
      },
    });
  }
  parts.push({ text: opts.prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  const res = await geminiRetryFetch(`${GEMINI_IMAGE}?key=${opts.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    logError(`[gemini-image] ${res.status}:`, errText.slice(0, 300));
    return null;
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
  };
  const outParts = data.candidates?.[0]?.content?.parts ?? [];
  for (const p of outParts) {
    const inline = p.inlineData;
    if (inline?.data) {
      return {
        base64: inline.data,
        mimeType: inline.mimeType || 'image/png',
      };
    }
  }
  return null;
}
