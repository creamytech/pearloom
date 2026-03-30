// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/image-fetcher.ts — multimodal
// image fetching with auth for Gemini analysis
// ─────────────────────────────────────────────────────────────────

import type { PhotoCluster } from './types';
import { log, logWarn } from './gemini-client';

/**
 * Fetches one representative image per cluster and returns Gemini-compatible
 * inline data parts interleaved with cluster marker text parts.
 */
export async function fetchClusterImages(
  clusters: PhotoCluster[],
  googleAccessToken: string
): Promise<Record<string, unknown>[]> {
  const parts: Record<string, unknown>[] = [];

  log(`[Memory Engine] Fetching up to ${clusters.length} images for Multimodal AI analysis...`);
  const imagePromises = clusters.map(async (cluster) => {
    const bestPhoto = cluster.photos[0];
    if (!bestPhoto?.baseUrl) return null;

    try {
      const isGoogle = bestPhoto.baseUrl.includes('googleusercontent.com');
      const fetchUrl = isGoogle ? `${bestPhoto.baseUrl}=w1024-h1024` : bestPhoto.baseUrl;
      const headers = isGoogle && googleAccessToken ? { Authorization: `Bearer ${googleAccessToken}` } : undefined;

      const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(8000) });

      if (!res.ok) {
        logWarn(`[Memory Engine] Failed to fetch image: ${res.status} ${res.statusText}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Gemini STRICTLY rejects application/octet-stream. Force it to image/jpeg if it's missing or generic.
      let mimeType = bestPhoto.mimeType || 'image/jpeg';
      if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
        mimeType = 'image/jpeg';
      }

      return {
        inlineData: {
          data: base64,
          mimeType,
        }
      };
    } catch (err) {
      logWarn('Failed to fetch image for Gemini:', err);
      return null;
    }
  });

  const resolvedImages = await Promise.all(imagePromises);
  resolvedImages.forEach((imgData, index) => {
    if (imgData) {
      // Interleave text markers so Gemini knows which cluster this image belongs to
      parts.push({ text: `\n\n--- Image for Cluster ${index} ---` });
      parts.push(imgData);
    }
  });
  log(`[Memory Engine] Successfully appended images to Gemini prompt!`);

  return parts;
}
