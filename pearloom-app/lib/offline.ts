import { useEffect, useState, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { UserSite } from './types';

const SITES_CACHE_KEY = 'pearloom_sites_cache';
const PENDING_EDITS_KEY = 'pearloom_pending_edits';

// ── Network status detection ──────────────────────────────────────────

/**
 * Hook that monitors network connectivity.
 * Uses a lightweight fetch-based check since @react-native-community/netinfo
 * may not be installed.
 */
export function useNetworkStatus(): { isOnline: boolean; checking: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectivity = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch('https://pearloom.com/api/health', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnectivity();
    intervalRef.current = setInterval(checkConnectivity, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkConnectivity]);

  return { isOnline, checking };
}

// ── Site list cache ───────────────────────────────────────────────────

/**
 * Caches the site list locally so it can be loaded when offline.
 */
export async function cacheSites(sites: UserSite[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(SITES_CACHE_KEY, JSON.stringify(sites));
  } catch {
    // SecureStore has a size limit; silently fail
  }
}

/**
 * Returns the cached site list, or an empty array if not available.
 */
export async function getCachedSites(): Promise<UserSite[]> {
  try {
    const raw = await SecureStore.getItemAsync(SITES_CACHE_KEY);
    if (raw) return JSON.parse(raw) as UserSite[];
  } catch {
    // ignore parse errors
  }
  return [];
}

// ── Pending edits queue ───────────────────────────────────────────────

interface PendingEdit {
  id: string;
  siteId: string;
  path: string;
  method: string;
  body: string;
  createdAt: string;
}

/**
 * Queues an edit to be synced when connectivity is restored.
 */
export async function queueOfflineEdit(edit: Omit<PendingEdit, 'id' | 'createdAt'>): Promise<void> {
  try {
    const existing = await getPendingEdits();
    const newEdit: PendingEdit = {
      ...edit,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    existing.push(newEdit);
    await SecureStore.setItemAsync(PENDING_EDITS_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

/**
 * Returns all pending edits.
 */
export async function getPendingEdits(): Promise<PendingEdit[]> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_EDITS_KEY);
    if (raw) return JSON.parse(raw) as PendingEdit[];
  } catch {
    // ignore
  }
  return [];
}

/**
 * Clears all pending edits after successful sync.
 */
export async function clearPendingEdits(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_EDITS_KEY);
  } catch {
    // ignore
  }
}
