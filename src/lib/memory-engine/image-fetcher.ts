// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/image-fetcher.ts — multimodal
// image fetching with auth for Gemini analysis
// ─────────────────────────────────────────────────────────────────

import type { PhotoCluster } from './types';
import type { GooglePhotoMetadata } from '@/types';
import { log, logWarn } from './gemini-client';

function pickBestPhoto(photos: GooglePhotoMetadata[]): GooglePhotoMetadata {
  if (photos.length === 0) throw new Error('No photos');
  if (photos.length === 1) return photos[0];

  return photos.reduce((best, photo) => {
    let score = 0;
    let bestScore = 0;

    // Prefer larger images
    score += Math.min((photo.width * photo.height) / 1_000_000, 10);
    bestScore += Math.min((best.width * best.height) / 1_000_000, 10);

    // Prefer landscape aspect ratio for hero images
    const ar = photo.width / Math.max(photo.height, 1);
    const bestAr = best.width / Math.max(best.height, 1);
    if (ar >= 1.2 && ar <= 2.0) score += 3;
    if (bestAr >= 1.2 && bestAr <= 2.0) bestScore += 3;

    // Prefer JPEG/PNG over other formats
    if (photo.mimeType?.includes('jpeg') || photo.mimeType?.includes('png')) score += 2;
    if (best.mimeType?.includes('jpeg') || best.mimeType?.includes('png')) bestScore += 2;

    // Penalize screenshots
    const fn = (photo.filename || '').toLowerCase();
    const bestFn = (best.filename || '').toLowerCase();
    if (fn.includes('screenshot') || fn.includes('screen_shot')) score -= 5;
    if (bestFn.includes('screenshot') || bestFn.includes('screen_shot')) bestScore -= 5;

    return score > bestScore ? photo : best;
  });
}

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
    const bestPhoto = pickBestPhoto(cluster.photos);
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
