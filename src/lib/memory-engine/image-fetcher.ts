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
 * Fetches a representative sample of images (max 6) for Gemini multimodal analysis.
 * Capping at 6 clusters keeps the prompt lean — the model doesn't need every single
 * photo to write accurate chapters, and fewer/smaller images cuts Pass 1 latency
 * by 20-35s for large albums.
 */
const MAX_IMAGES_FOR_AI = 6;

function pickRepresentativeClusters(clusters: PhotoCluster[]): PhotoCluster[] {
  if (clusters.length <= MAX_IMAGES_FOR_AI) return clusters;
  // Spread evenly across the timeline so we cover beginning, middle and end
  const step = clusters.length / MAX_IMAGES_FOR_AI;
  return Array.from({ length: MAX_IMAGES_FOR_AI }, (_, i) => clusters[Math.round(i * step)]);
}

export async function fetchClusterImages(
  clusters: PhotoCluster[],
  googleAccessToken: string
): Promise<Record<string, unknown>[]> {
  const parts: Record<string, unknown>[] = [];

  const selected = pickRepresentativeClusters(clusters);
  log(`[Memory Engine] Fetching ${selected.length}/${clusters.length} representative images for multimodal analysis...`);

  const imagePromises = selected.map(async (cluster) => {
    const bestPhoto = pickBestPhoto(cluster.photos);
    if (!bestPhoto?.baseUrl) return null;

    try {
      const isGoogle = bestPhoto.baseUrl.includes('googleusercontent.com');
      // 600px is plenty for the model to understand scene/mood — smaller = fewer tokens = faster
      const fetchUrl = isGoogle ? `${bestPhoto.baseUrl}=w600-h600` : bestPhoto.baseUrl;
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
