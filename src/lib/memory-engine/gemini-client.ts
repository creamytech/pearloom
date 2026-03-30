// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/gemini-client.ts — model routing,
// retry logic, and Gemini API call helpers
// ─────────────────────────────────────────────────────────────────

// ── Model routing ─────────────────────────────────────────────────────────
// Gemini 3.1 Pro → creative passes (story chapters, SVG art, poetry)
// Gemini 3 Flash  → analytical passes (critique, scoring, judgment)
// Gemini 3.1 Flash-Lite → lightweight extraction (couple DNA, metadata)
export const GEMINI_PRO   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';
export const GEMINI_FLASH = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
export const GEMINI_LITE  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

// Default — used for backward compat on any pass not explicitly routed
export const GEMINI_API_BASE = GEMINI_FLASH;

// ── Dev-only logging helpers ─────────────────────────────────────────────────
export const log = process.env.NODE_ENV === 'development' ? console.log : () => {};
export const logWarn = process.env.NODE_ENV === 'development' ? console.warn : () => {};
export const logError = process.env.NODE_ENV === 'development' ? console.error : () => {};

/**
 * Wraps a Gemini fetch with automatic retry on 503 (UNAVAILABLE) and 429 (rate limit).
 * Uses exponential back-off: 2s â†’ 4s â†’ 8s (max 3 attempts).
 */
export async function geminiRetryFetch(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<Response> {
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
    return res;
  }
  throw lastError ?? new Error('Gemini request failed after max retries');
}
