// ─────────────────────────────────────────────────────────────
// Pearloom / lib/moderation/image-moderation.ts
//
// Automated NSFW screening for guest-uploaded photos. Pearloom is
// a craft house for memory — not a place for explicit content. Every
// guest photo already lands in a host moderation queue (pending →
// host approves), but we screen BEFORE it ever reaches that queue so
// a host never has to see explicit material to reject it.
//
// Uses OpenAI's `omni-moderation-latest` model (multimodal — it
// scores image inputs natively). The image rides as a base64 data:
// URL so we never have to expose a public URL first.
//
// Fails OPEN by design: no OPENAI_API_KEY, a network blip, or a
// timeout all resolve to `{ allowed: true }`. The host's manual
// pending→approve queue is the backstop — we never block a guest
// mid-reception because a third-party API hiccuped. We only ever
// auto-reject on a confident, explicit signal.
// ─────────────────────────────────────────────────────────────

const OPENAI_MODERATIONS_URL = 'https://api.openai.com/v1/moderations';
const MODERATION_MODEL = 'omni-moderation-latest';
const TIMEOUT_MS = 12_000;

// OpenAI's calibrated boolean flag is authoritative for these; we
// always reject sexual/minors regardless of score (legal + ethical
// floor). For the general `sexual` category we also keep a score
// gate so borderline-but-flagged beach photos don't trip it.
const SEXUAL_SCORE_FLOOR = 0.7;

export interface ImageModerationResult {
  /** false → the image is explicit and must NOT be stored. */
  allowed: boolean;
  /** Coarse reason for logging — never surfaced verbatim to guests. */
  reason?: string;
  /** Whether a real moderation call ran (vs. failed-open / no key). */
  checked: boolean;
}

export function isImageModerationEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Screen an image buffer for explicit content.
 * Returns `{ allowed: false }` only on a confident sexual/explicit
 * signal. Everything else (clean, error, no key) is allowed-open.
 */
export async function moderateImageBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ImageModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { allowed: true, checked: false };

  // omni-moderation reads jpeg/png/webp/gif. HEIC isn't supported by
  // the vision encoder — skip (host queue is the backstop). The data
  // URL still labels it as its original type for the others.
  const safeMime = /^image\/(jpe?g|png|webp|gif)$/i.test(mimeType) ? mimeType : 'image/jpeg';

  const dataUrl = `data:${safeMime};base64,${buffer.toString('base64')}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_MODERATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        input: [{ type: 'image_url', image_url: { url: dataUrl } }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn('[image-moderation] API non-OK (failing open):', res.status);
      return { allowed: true, checked: false };
    }

    const json = (await res.json()) as {
      results?: Array<{
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
      }>;
    };

    const result = json.results?.[0];
    if (!result) return { allowed: true, checked: false };

    const cats = result.categories ?? {};
    const scores = result.category_scores ?? {};

    // Minors — always reject if flagged at all.
    if (cats['sexual/minors']) {
      return { allowed: false, reason: 'sexual/minors', checked: true };
    }
    // General explicit content — reject when flagged AND confident.
    if (cats['sexual'] && (scores['sexual'] ?? 1) >= SEXUAL_SCORE_FLOOR) {
      return { allowed: false, reason: 'sexual', checked: true };
    }

    return { allowed: true, checked: true };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[image-moderation] timed out (failing open)');
    } else {
      console.warn('[image-moderation] failed (failing open):', err);
    }
    return { allowed: true, checked: false };
  } finally {
    clearTimeout(timer);
  }
}
