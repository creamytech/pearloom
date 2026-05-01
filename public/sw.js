// ─────────────────────────────────────────────────────────────
// Pearloom Service Worker
// Offline-capable editing for couples on planes & spotty wifi
// ─────────────────────────────────────────────────────────────

const VERSION = '1';

// Cache bucket names
const CACHE_SHELL   = `pearloom-shell-v${VERSION}`;
const CACHE_STATIC  = `pearloom-static-v${VERSION}`;
const CACHE_IMAGES  = `pearloom-images-v${VERSION}`;
const CACHE_API     = `pearloom-api-v${VERSION}`;

const ALL_CACHES = [CACHE_SHELL, CACHE_STATIC, CACHE_IMAGES, CACHE_API];

// ── Precache list ────────────────────────────────────────────
// HTML shells that let the app boot even when offline
const SHELL_URLS = ['/', '/dashboard', '/editor'];

// Offline fallback served when nothing else matches
const OFFLINE_FALLBACK = '/offline.html';

// ── Install ──────────────────────────────────────────────────
// Precache the app shell and offline fallback page

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll([...SHELL_URLS, OFFLINE_FALLBACK]);
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
// Purge stale caches from previous versions

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('pearloom-') && !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Helpers ──────────────────────────────────────────────────

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf|eot)(\?.*)?$/i.test(url.pathname);
}

function isImageRequest(url) {
  return (
    /\.(png|jpe?g|gif|webp|avif|svg|ico)(\?.*)?$/i.test(url.pathname) ||
    url.pathname.startsWith('/api/photos/proxy') ||
    url.pathname.startsWith('/api/img/') ||
    url.hostname.includes('r2.cloudflarestorage.com')
  );
}

function isGoogleFont(url) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

function isMutatingRequest(request) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
}

// ── Fetch strategies ─────────────────────────────────────────

/**
 * Network-first: try the network, fall back to cache.
 * Used for API calls and navigation where freshness matters.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // Only cache successful GET responses
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || null;
  }
}

/**
 * Cache-first: serve from cache, update in background.
 * Used for static assets and images that rarely change.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Stale-while-revalidate: update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response);
      })
      .catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return null;
  }
}

// ── Main fetch handler ───────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-HTTP(S) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // ── Mutating API requests: let them through, don't cache ──
  // Background sync handles retries via the client-side queue
  if (isMutatingRequest(event.request)) return;

  // ── Google Fonts: cache-first (they're versioned/immutable) ──
  if (isGoogleFont(url)) {
    event.respondWith(
      cacheFirst(event.request, CACHE_STATIC).then(
        (response) => response || fetch(event.request)
      )
    );
    return;
  }

  // ── Images: cache-first ──
  if (isImageRequest(url)) {
    event.respondWith(
      cacheFirst(event.request, CACHE_IMAGES).then(
        (response) => response || fetch(event.request)
      )
    );
    return;
  }

  // ── Static assets (JS, CSS, fonts): cache-first ──
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(event.request, CACHE_STATIC).then(
        (response) => response || fetch(event.request)
      )
    );
    return;
  }

  // ── API GET requests: network-first ──
  if (isApiRequest(url)) {
    event.respondWith(
      networkFirst(event.request, CACHE_API).then(
        (response) => response || new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── Navigation (HTML pages): network-first with offline fallback ──
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      networkFirst(event.request, CACHE_SHELL).then(async (response) => {
        if (response) return response;
        // Everything else failed — show the offline page
        const fallback = await caches.match(OFFLINE_FALLBACK);
        return fallback || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // ── Everything else: network with cache fallback ──
  event.respondWith(
    networkFirst(event.request, CACHE_STATIC).then(
      (response) => response || fetch(event.request)
    )
  );
});

// ── Background Sync ──────────────────────────────────────────
// When connectivity returns, the browser fires a 'sync' event.
// We read queued actions from the client and replay them.

self.addEventListener('sync', (event) => {
  if (event.tag === 'pearloom-offline-sync') {
    event.waitUntil(replayQueuedActions());
  }
});

/**
 * Replay queued offline actions stored in IndexedDB by the client.
 * Each action is a serialised fetch (url, method, body, headers).
 */
async function replayQueuedActions() {
  // Open IndexedDB where the client stores pending actions
  const db = await openDB();
  const tx = db.transaction('offline-queue', 'readwrite');
  const store = tx.objectStore('offline-queue');
  const allKeys = await idbGetAllKeys(store);

  for (const key of allKeys) {
    const action = await idbGet(store, key);
    if (!action) continue;

    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body || undefined,
      });

      if (response.ok) {
        // Success — remove from queue
        const deleteTx = db.transaction('offline-queue', 'readwrite');
        deleteTx.objectStore('offline-queue').delete(key);
      }
      // If response is not ok (server error), leave in queue for next sync
    } catch {
      // Still offline or network error — leave in queue
    }
  }
}

// ── IndexedDB helpers (minimal, no deps) ─────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pearloom-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGetAllKeys(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Message handling ─────────────────────────────────────────
// Clients can post messages to trigger manual sync or check status

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'TRIGGER_SYNC') {
    replayQueuedActions().then(() => {
      // Notify all clients that sync completed
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_COMPLETE' });
        });
      });
    });
  }
});
