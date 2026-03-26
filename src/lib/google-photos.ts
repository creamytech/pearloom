// ─────────────────────────────────────────────────────────────
// everglow / lib/google-photos.ts — metadata extractor service
// ─────────────────────────────────────────────────────────────

import type { GooglePhotoMetadata, PhotoCluster, GeoLocation } from '@/types';

const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

/**
 * Fetches all media items from the user's Google Photos library.
 * Handles pagination automatically.
 * Requires an OAuth2 access token with photoslibrary.readonly scope.
 */
export async function fetchAllPhotos(
  accessToken: string,
  maxItems: number = 500
): Promise<GooglePhotoMetadata[]> {
  const photos: GooglePhotoMetadata[] = [];
  let pageToken: string | undefined;

  while (photos.length < maxItems) {
    const url = new URL(`${PHOTOS_API_BASE}/mediaItems`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Google Photos API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const items = data.mediaItems ?? [];

    for (const item of items) {
      // Only process images, skip videos
      if (!item.mimeType?.startsWith('image/')) continue;

      photos.push(normalizeMediaItem(item));

      if (photos.length >= maxItems) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return photos;
}

/**
 * Searches for photos in a specific date range.
 */
export async function searchPhotosByDateRange(
  accessToken: string,
  startDate: { year: number; month: number; day: number },
  endDate: { year: number; month: number; day: number }
): Promise<GooglePhotoMetadata[]> {
  const res = await fetch(`${PHOTOS_API_BASE}/mediaItems:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pageSize: 100,
      filters: {
        dateFilter: {
          ranges: [{ startDate, endDate }],
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Google Photos search error: ${res.status}`);
  }

  const data = await res.json();
  return (data.mediaItems ?? [])
    .filter((item: { mimeType?: string }) => item.mimeType?.startsWith('image/'))
    .map(normalizeMediaItem);
}

/**
 * Normalizes a raw Google Photos API media item into our type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMediaItem(item: any): GooglePhotoMetadata {
  const meta = item.mediaMetadata ?? {};
  return {
    id: item.id,
    filename: item.filename ?? '',
    mimeType: item.mimeType ?? 'image/jpeg',
    creationTime: meta.creationTime ?? new Date().toISOString(),
    width: parseInt(meta.width ?? '0', 10),
    height: parseInt(meta.height ?? '0', 10),
    baseUrl: item.baseUrl ?? '',
    location: meta.photo?.location
      ? {
          latitude: meta.photo.location.latitude,
          longitude: meta.photo.location.longitude,
        }
      : undefined,
    cameraMake: meta.photo?.cameraMake,
    cameraModel: meta.photo?.cameraModel,
    description: item.description,
  };
}

/**
 * Clusters photos by proximity in time and location.
 * A new cluster starts when:
 *   - More than `gapDays` days have passed since the previous photo, OR
 *   - The location is far from the previous cluster centroid.
 */
export function clusterPhotos(
  photos: GooglePhotoMetadata[],
  gapDays: number = 14
): PhotoCluster[] {
  if (!photos.length) return [];

  // Sort by creation time ascending
  const sorted = [...photos].sort(
    (a, b) => new Date(a.creationTime).getTime() - new Date(b.creationTime).getTime()
  );

  const clusters: PhotoCluster[] = [];
  let currentCluster: GooglePhotoMetadata[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].creationTime).getTime();
    const curr = new Date(sorted[i].creationTime).getTime();
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diffDays > gapDays) {
      clusters.push(buildCluster(currentCluster));
      currentCluster = [sorted[i]];
    } else {
      currentCluster.push(sorted[i]);
    }
  }

  // Push final cluster
  if (currentCluster.length > 0) {
    clusters.push(buildCluster(currentCluster));
  }

  return clusters;
}

function buildCluster(photos: GooglePhotoMetadata[]): PhotoCluster {
  const dates = photos.map((p) => new Date(p.creationTime).getTime());
  const startDate = new Date(Math.min(...dates)).toISOString();
  const endDate = new Date(Math.max(...dates)).toISOString();

  // Find the centroid location (average of all geo-tagged photos)
  const geoPhotos = photos.filter((p) => p.location);
  let location: GeoLocation | null = null;

  if (geoPhotos.length > 0) {
    const avgLat =
      geoPhotos.reduce((sum, p) => sum + (p.location?.latitude ?? 0), 0) / geoPhotos.length;
    const avgLng =
      geoPhotos.reduce((sum, p) => sum + (p.location?.longitude ?? 0), 0) / geoPhotos.length;

    location = {
      lat: avgLat,
      lng: avgLng,
      label: '', // will be reverse-geocoded by the Memory Engine
    };
  }

  return { startDate, endDate, location, photos };
}

/**
 * Reverse geocode a lat/lng pair into a human-readable label.
 * Uses the free Nominatim API (OpenStreetMap).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'everglow/1.0' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const addr = data.address ?? {};
    return [addr.city || addr.town || addr.village, addr.state || addr.country]
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}
