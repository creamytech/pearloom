'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / hooks/useGooglePhotosPicker.ts
// Reusable hook for launching the Google Photos Picker flow.
// Creates a session, opens the popup, polls for completion,
// and returns picked photo URLs via a callback.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';

export interface PickedPhoto {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
}

type PickerState = 'idle' | 'creating' | 'waiting' | 'fetching' | 'done' | 'error';

const MAX_POLL_MS = 30 * 60 * 1000; // 30 minutes
const GRACE_MS = 8_000; // wait after popup closes before giving up

export function useGooglePhotosPicker() {
  const [state, setState] = useState<PickerState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const callbackRef = useRef<((photos: PickedPhoto[]) => void) | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pick = useCallback(async (onPicked: (photos: PickedPhoto[]) => void) => {
    stopPolling();
    setState('creating');
    setError(null);
    // Store callback in ref so the polling interval always has the latest
    callbackRef.current = onPicked;

    try {
      // Create picker session
      const res = await fetch('/api/photos?action=create-session');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create picker session — are you signed in?');
      }
      const session = await res.json();

      if (!session.pickerUri) {
        throw new Error('No picker URI returned — Google Photos may be unavailable');
      }

      // NOTE: the old code appended '/autoclose' as a path. pickerUri
      // includes a query string, so string-concatenating produces a
      // malformed URL that can confuse Google's close-signal logic.
      // Use the raw pickerUri; we detect completion via polling +
      // popup.closed regardless of auto-close.
      const uri = session.pickerUri;

      // Open popup — must happen synchronously from user gesture on iOS
      const popup = window.open(uri, 'google-photos-picker', 'width=900,height=700');
      if (!popup) {
        // Fallback: redirect in same tab if popup was blocked
        setState('error');
        setError('Popup blocked — please allow popups for this site, or try on desktop');
        return;
      }

      setState('waiting');
      startRef.current = Date.now();

      let popupClosedAt: number | null = null;
      // `popup.closed` can throw a cross-origin SecurityError on some
      // browsers while Google's domain is loaded — treat any read
      // failure as "still open" so we don't abort the polling loop.
      const isPopupClosed = (): boolean => {
        try {
          return popup.closed;
        } catch {
          return false;
        }
      };

      // Poll for completion
      pollRef.current = setInterval(async () => {
        if (Date.now() - startRef.current > MAX_POLL_MS) {
          stopPolling();
          setState('error');
          setError('Session expired — please try again');
          return;
        }

        try {
          const pollRes = await fetch(`/api/photos?action=poll&sessionId=${session.id}`);
          if (!pollRes.ok) {
            // 401 = session revoked; show the user something actionable.
            if (pollRes.status === 401) {
              stopPolling();
              setState('error');
              const data = await pollRes.json().catch(() => ({}));
              setError((data.error as string) || 'Your Google session expired — sign out and back in.');
            }
            return;
          }

          const pollData = await pollRes.json();

          if (pollData.mediaItemsSet) {
            stopPolling();
            setState('fetching');

            // Fetch picked items
            const fetchRes = await fetch(`/api/photos?action=fetch&sessionId=${session.id}`);
            if (!fetchRes.ok) {
              const data = await fetchRes.json().catch(() => ({}));
              throw new Error((data.error as string) || `Failed to fetch picked photos (${fetchRes.status})`);
            }
            const fetchData = await fetchRes.json();

            // API returns { photos: [...] } with GooglePhotoMetadata shape.
            // Accept both legacy .mediaItems and current .photos payloads.
            const rawPhotos: Array<Record<string, unknown>> = (fetchData.photos as Array<Record<string, unknown>>) || (fetchData.mediaItems as Array<Record<string, unknown>>) || [];
            const photos: PickedPhoto[] = rawPhotos
              .map((item) => {
                const meta = (item.mediaMetadata as { width?: number; height?: number } | undefined) ?? {};
                const baseUrl = (item.baseUrl as string) || '';
                if (!baseUrl) {
                  console.warn('[GooglePhotosPicker] Picked item missing baseUrl — skipped', item);
                  return null;
                }
                return {
                  id: (item.id as string) || `gp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  baseUrl,
                  filename: (item.filename as string) || '',
                  mimeType: (item.mimeType as string) || 'image/jpeg',
                  width: (item.width as number) ?? meta.width ?? 0,
                  height: (item.height as number) ?? meta.height ?? 0,
                };
              })
              .filter((p): p is PickedPhoto => p !== null);

            if (photos.length === 0) {
              // Previously we'd silently flip back to idle here and the
              // user thought the click did nothing. Surface what happened
              // so they can course-correct (re-auth, pick images not
              // videos, etc).
              setState('error');
              const hint = rawPhotos.length
                ? 'Pearloom can only use photos right now — videos were skipped.'
                : 'Google returned no photos. If this keeps happening, sign out of Google and sign back in to refresh the Pearloom permission.';
              setError(hint);
              return;
            }

            callbackRef.current?.(photos);
            setState('done');
            setTimeout(() => setState('idle'), 2000);
            return;
          }

          // Track popup close — keep polling briefly after close in case
          // the user confirmed their selection right as the window shut.
          if (isPopupClosed() && !popupClosedAt) {
            popupClosedAt = Date.now();
          }
          if (popupClosedAt && Date.now() - popupClosedAt > GRACE_MS) {
            stopPolling();
            setState('idle');
          }
        } catch (err) {
          console.warn('[GooglePhotosPicker] Poll error:', err);
        }
      }, 2500);

    } catch (err) {
      stopPolling();
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to start Google Photos picker');
    }
  }, [stopPolling]);

  return { pick, state, error, isActive: state !== 'idle' && state !== 'done' && state !== 'error' };
}
