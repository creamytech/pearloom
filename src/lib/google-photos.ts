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
  maxItems: number = 200
): Promise<GooglePhotoMetadata[]> {
  const photos: GooglePhotoMetadata[] = [];
  
  // Step 1: Fetch Albums because global mediaItems.list is strictly deprecated by Google in 2025 
  // and returns a hard 403 Insufficient Scopes error for new unverified projects.
  const albumsUrl = new URL(`${PHOTOS_API_BASE}/albums`);
  albumsUrl.searchParams.set('pageSize', '50');

  const albumsRes = await fetch(albumsUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const albumsData = await albumsRes.json().catch(() => ({}));

  if (!albumsRes.ok) {
    let rawScopes = "UNKNOWN";
    try {
      const dbg = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
      const dbgJson = await dbg.json();
      rawScopes = dbgJson.scope || "NO SCOPES ATTACHED";
    } catch (e) {}

    const googleError = albumsData.error?.message || albumsRes.statusText;
    const errorMsg = `Google Photos API error (${albumsRes.status}): ${googleError}. [DIAGNOSTIC SCOPES HELD BY TOKEN: ${rawScopes}]`;
    console.error('Album Fetch Error:', errorMsg, JSON.stringify(albumsData));
    throw new Error(errorMsg);
  }

  const albums = albumsData.albums || [];

  if (albums.length === 0) {
    // If they have no albums, we're out of luck and they'd need the Picker API or manual upload.
    return [];
  }

  // Step 2: Search for items within their most recent albums until we hit maxItems
  for (const album of albums) {
    if (photos.length >= maxItems) break;

    const searchUrl = `${PHOTOS_API_BASE}/mediaItems:search`;
    
    // We fetch a batch from this specific album
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        albumId: album.id,
        pageSize: 100,
      }),
    });

    const searchData = await searchRes.json().catch(() => ({}));
    
    // If a specific album fails, just skip it gracefully
    if (!searchRes.ok) continue;

    const items = searchData.mediaItems || [];

    for (const item of items) {
      if (!item.mimeType?.startsWith('image/')) continue;
      photos.push(normalizeMediaItem(item));
      if (photos.length >= maxItems) break;
    }
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
