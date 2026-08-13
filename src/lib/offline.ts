// ─────────────────────────────────────────────────────────────
// Pearloom / lib/offline.ts
// Offline detection, service worker registration, and
// background sync queue for resilient editing on bad wifi.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface OfflineAction {
  id?: number;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
}

// ── IndexedDB setup ──────────────────────────────────────────

const DB_NAME = 'pearloom-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Online detection ─────────────────────────────────────────

/**
 * Check whether the browser currently has network connectivity.
 * Returns true on the server (SSR) to avoid false offline states.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

// ── Service worker registration ──────────────────────────────

/**
 * Register the Pearloom service worker.
 * Call this once from a top-level client component (e.g. layout).
 * In development, registration is skipped to avoid caching issues.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Skip in development to avoid stale cache headaches
  if (process.env.NODE_ENV === 'development') {
    console.log('[pearloom] SW registration skipped in dev mode');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // When a new SW is available, notify the user
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'activated' &&
          navigator.serviceWorker.controller
        ) {
          // New version activated — could show an "update available" toast
          console.log('[pearloom] New service worker activated');
        }
      });
    });

    console.log('[pearloom] Service worker registered');
  } catch (err) {
    console.error('[pearloom] SW registration failed:', err);
  }
}

// ── Offline action queue ─────────────────────────────────────

/**
 * Queue a failed API call for later retry.
 * Stores the request in IndexedDB and requests background sync
 * if the browser supports it.
 */
export async function queueOfflineAction(action: {
  url: string;
  method: string;
  body?: string;
  timestamp: number;
}): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(action);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Request background sync (browser will fire 'sync' event on SW)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }).sync.register('pearloom-offline-sync');
    }
  } catch (err) {
    console.error('[pearloom] Failed to queue offline action:', err);
  }
}

/**
 * Retrieve all pending offline actions from the queue.
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Process all queued offline actions.
 * Replays each fetch in order. Returns counts of successes and failures.
 * Successfully replayed actions are removed from the queue.
 */
export async function processQueue(): Promise<{ success: number; failed: number }> {
  const actions = await getPendingActions();
  let success = 0;
  let failed = 0;

  if (actions.length === 0) return { success: 0, failed: 0 };

  const db = await openDB();

  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body || undefined,
      });

      if (response.ok) {
        // Remove from queue on success
        const tx = db.transaction(STORE_NAME, 'readwrite');
        if (action.id !== undefined) {
          tx.objectStore(STORE_NAME).delete(action.id);
        }
        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
        });
        success++;
      } else {
        failed++;
      }
    } catch {
      // Still can't reach the server
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Clear all pending actions (e.g. after user discards offline edits).
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error('[pearloom] Failed to clear offline queue:', err);
  }
}
