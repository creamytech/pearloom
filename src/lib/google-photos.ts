// ─────────────────────────────────────────────────────────────
// Pearloom / lib/google-photos.ts — Google Photos Picker API
// Migrated to the new Picker API (March 2025+)
// Old Library API scopes (photoslibrary.readonly) were removed.
// New scope: photospicker.mediaitems.readonly
// ─────────────────────────────────────────────────────────────

import type { GooglePhotoMetadata, PhotoCluster, GeoLocation } from '@/types';

const PICKER_API_BASE = 'https://photospicker.googleapis.com/v1';

// ── Picker Session Management ──────────────────────────────

/**
 * Creates a new Picker session. Returns { id, pickerUri, pollingConfig }.
 * The pickerUri is what you open in a new tab/popup for the user to pick photos.
 */
export async function createPickerSession(accessToken: string): Promise<{
  id: string;
  pickerUri: string;
  pollingConfig: { pollInterval: string; timeoutIn: string };
  mediaItemsSet: boolean;
}> {
  const res = await fetch(`${PICKER_API_BASE}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const googleError = data.error?.message || res.statusText;
    throw new Error(`Picker API session error (${res.status}): ${googleError}`);
  }

  return {
    id: data.id,
    pickerUri: data.pickerUri,
    pollingConfig: data.pollingConfig || { pollInterval: '5s', timeoutIn: '1800s' },
    mediaItemsSet: data.mediaItemsSet || false,
  };
}

/**
 * Polls a Picker session to check if the user has finished selecting.
 * Returns the updated session state.
 */
export async function pollPickerSession(accessToken: string, sessionId: string): Promise<{
  id: string;
  pickerUri: string;
  pollingConfig: { pollInterval: string; timeoutIn: string };
  mediaItemsSet: boolean;
}> {
  const res = await fetch(`${PICKER_API_BASE}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const googleError = data.error?.message || res.statusText;
    throw new Error(`Picker API poll error (${res.status}): ${googleError}`);
  }

  return {
    id: data.id,
    pickerUri: data.pickerUri,
    pollingConfig: data.pollingConfig || { pollInterval: '5s', timeoutIn: '1800s' },
    mediaItemsSet: data.mediaItemsSet || false,
  };
}

/**
 * Fetches picked media items from a completed Picker session.
 * Call this after mediaItemsSet is true.
 */
export async function fetchPickedMediaItems(
  accessToken: string,
  sessionId: string,
  maxItems: number = 200
): Promise<GooglePhotoMetadata[]> {
  const photos: GooglePhotoMetadata[] = [];
  let pageToken: string | undefined;

  while (photos.length < maxItems) {
    const url = new URL(`${PICKER_API_BASE}/mediaItems`);
    url.searchParams.set('sessionId', sessionId);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const googleError = data.error?.message || res.statusText;
      throw new Error(`Picker API mediaItems error (${res.status}): ${googleError}`);
    }

    const items = data.mediaItems ?? [];

    for (const item of items) {
      // Only process photos, skip videos
      if (item.type === 'VIDEO') continue;

      // Debug: log raw item structure from Google
      console.log('[Picker API] Raw item:', JSON.stringify(item, null, 2));

      photos.push(normalizePickedItem(item));

      if (photos.length >= maxItems) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return photos;
}

// ── Legacy wrapper (kept for backward compat with photo-browser) ──

/**
 * @deprecated — The old Library API is dead (March 31 2025).
 * This now throws a helpful error directing users to the Picker flow.
 */
export async function fetchAllPhotos(): Promise<GooglePhotoMetadata[]> {
  throw new Error(
    'The Google Photos Library API (photoslibrary.readonly) was removed by Google on March 31, 2025. ' +
    'Please use the new Picker API flow instead. Click "Select from Google Photos" to use the updated integration.'
  );
}

/**
 * @deprecated — same as above
 */
export async function searchPhotosByDateRange(): Promise<GooglePhotoMetadata[]> {
  throw new Error(
    'The Google Photos Library API date search was removed by Google on March 31, 2025.'
  );
}

// ── Normalizer for Picker API response shape ────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePickedItem(item: any): GooglePhotoMetadata {
  const mediaFile = item.mediaFile ?? {};
  const metadata = mediaFile.mediaFileMetadata ?? {};

  return {
    id: item.id,
    filename: mediaFile.filename ?? '',
    mimeType: mediaFile.mimeType ?? 'image/jpeg',
    creationTime: item.createTime ?? new Date().toISOString(),
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    baseUrl: mediaFile.baseUrl ?? '',
    cameraMake: metadata.cameraMake,
    cameraModel: metadata.cameraModel,
    location: metadata.location ? {
      latitude: metadata.location.latitude ?? 0,
      longitude: metadata.location.longitude ?? 0,
    } : undefined
  };
}

// ── Clustering (unchanged — framework agnostic) ─────────────

/**
 * Clusters photos by proximity in time.
 * A new cluster starts when more than `gapDays` days have elapsed.
 */
export function clusterPhotos(
  photos: GooglePhotoMetadata[],
  gapDays: number = 14
): PhotoCluster[] {
  if (!photos.length) return [];

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

  if (currentCluster.length > 0) {
    clusters.push(buildCluster(currentCluster));
  }

  return clusters;
}

function buildCluster(photos: GooglePhotoMetadata[]): PhotoCluster {
  const dates = photos.map((p) => new Date(p.creationTime).getTime());
  const startDate = new Date(Math.min(...dates)).toISOString();
  const endDate = new Date(Math.max(...dates)).toISOString();

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
      label: '',
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
      { headers: { 'User-Agent': 'pearloom/1.0' } }
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
