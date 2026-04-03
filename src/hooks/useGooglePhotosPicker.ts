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

    try {
      // Create picker session
      const res = await fetch('/api/photos?action=create-session');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create picker session — are you signed in?');
      }
      const session = await res.json();
      const uri = session.pickerUri + '/autoclose';

      // Open popup
      window.open(uri, 'google-photos-picker', 'width=900,height=700');
      setState('waiting');
      startRef.current = Date.now();

      let popupClosedAt: number | null = null;

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
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();

          if (pollData.mediaItemsSet) {
            stopPolling();
            setState('fetching');

            // Fetch picked items
            const fetchRes = await fetch(`/api/photos?action=fetch&sessionId=${session.id}`);
            if (!fetchRes.ok) throw new Error('Failed to fetch picked photos');
            const fetchData = await fetchRes.json();

            const photos: PickedPhoto[] = (fetchData.mediaItems || []).map((item: any) => ({
              id: item.id || `gp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              baseUrl: item.baseUrl || '',
              filename: item.filename || '',
              mimeType: item.mimeType || 'image/jpeg',
              width: item.mediaMetadata?.width ? Number(item.mediaMetadata.width) : 0,
              height: item.mediaMetadata?.height ? Number(item.mediaMetadata.height) : 0,
            }));

            onPicked(photos);
            setState('done');
            setTimeout(() => setState('idle'), 2000);
            return;
          }

          // Check if popup was closed without picking
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
