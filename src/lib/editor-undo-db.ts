// ─────────────────────────────────────────────────────────────
// editor-undo-db.ts — IndexedDB-backed ring buffer for the
// editor's per-site undo history.
//
// useEditorHistory keeps an in-memory undo stack for fast
// session-local undo/redo. This module mirrors that stack to
// IndexedDB so a refresh / accidental tab close doesn't wipe
// every step the user has taken since the page loaded — only
// the post-publish DB write was a true checkpoint before, and
// users were rightly upset when a Ctrl+R lost five minutes of
// reversible work.
//
// Schema:
//   DB:    'pearloom-editor-undo' (v1)
//   Store: 'snapshots' (keyPath: 'k' = `${siteSlug}:${seq}`)
//   Index: 'bySite' on 'siteSlug'
//
// Each record is a full {manifest, names, at} snapshot — JSON
// strings up to a few hundred KB. The cap is enforced
// per-site (RING_CAP) so a long session doesn't unbounded-grow.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

const DB_NAME = 'pearloom-editor-undo';
const DB_VERSION = 1;
const STORE = 'snapshots';
const RING_CAP = 40;

export interface UndoSnapshot {
  manifest: StoryManifest;
  names: [string, string];
  at: number;
}

interface StoredSnapshot extends UndoSnapshot {
  k: string;       // primary key: `${siteSlug}:${seq.padStart(10,'0')}`
  siteSlug: string;
  seq: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'k' });
        store.createIndex('bySite', 'siteSlug', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function pad(n: number): string {
  return n.toString().padStart(10, '0');
}

/** Read the past stack (oldest → newest) for a site. Snapshots are
 *  ordered by seq because the primary key embeds it. Caller usually
 *  treats the trailing entry as "current" and the rest as past. */
export async function loadHistory(siteSlug: string): Promise<UndoSnapshot[]> {
  try {
    const db = await openDB();
    return await new Promise<UndoSnapshot[]>((resolve, reject) => {
      const store = tx(db, 'readonly');
      // Range scan all `${siteSlug}:` rows.
      const lower = `${siteSlug}:`;
      const upper = `${siteSlug};`; // ';' is the next char after ':'
      const req = store.getAll(IDBKeyRange.bound(lower, upper, false, true));
      req.onsuccess = () => {
        const rows = (req.result as StoredSnapshot[]) ?? [];
        rows.sort((a, b) => a.seq - b.seq);
        resolve(rows.map(({ manifest, names, at }) => ({ manifest, names, at })));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

let nextSeqBySite: Record<string, number> = {};

async function nextSeq(siteSlug: string, db: IDBDatabase): Promise<number> {
  if (nextSeqBySite[siteSlug] !== undefined) {
    nextSeqBySite[siteSlug] += 1;
    return nextSeqBySite[siteSlug];
  }
  // First call this session — read the highest existing seq.
  return new Promise<number>((resolve) => {
    const store = tx(db, 'readonly');
    const lower = `${siteSlug}:`;
    const upper = `${siteSlug};`;
    const req = store.openCursor(IDBKeyRange.bound(lower, upper, false, true), 'prev');
    req.onsuccess = () => {
      const cursor = req.result;
      const last = cursor ? (cursor.value as StoredSnapshot).seq : 0;
      nextSeqBySite[siteSlug] = last + 1;
      resolve(last + 1);
    };
    req.onerror = () => {
      nextSeqBySite[siteSlug] = 1;
      resolve(1);
    };
  });
}

/** Append a snapshot to the ring; trim oldest beyond RING_CAP. */
export async function appendSnapshot(siteSlug: string, snap: UndoSnapshot): Promise<void> {
  try {
    const db = await openDB();
    const seq = await nextSeq(siteSlug, db);
    const record: StoredSnapshot = {
      k: `${siteSlug}:${pad(seq)}`,
      siteSlug,
      seq,
      ...snap,
    };
    await new Promise<void>((resolve, reject) => {
      const store = tx(db, 'readwrite');
      const r = store.put(record);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
    // Trim — keep only the most-recent RING_CAP entries.
    await trimToCap(siteSlug);
  } catch {
    // Quota / private-mode / disabled IDB — silently skip; the
    // in-memory stack still works for the session.
  }
}

async function trimToCap(siteSlug: string): Promise<void> {
  const db = await openDB();
  const all = await new Promise<StoredSnapshot[]>((resolve, reject) => {
    const store = tx(db, 'readonly');
    const lower = `${siteSlug}:`;
    const upper = `${siteSlug};`;
    const req = store.getAll(IDBKeyRange.bound(lower, upper, false, true));
    req.onsuccess = () => resolve((req.result as StoredSnapshot[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  if (all.length <= RING_CAP) return;
  all.sort((a, b) => a.seq - b.seq);
  const drop = all.slice(0, all.length - RING_CAP);
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'readwrite');
    let pending = drop.length;
    if (pending === 0) return resolve();
    for (const row of drop) {
      const r = store.delete(row.k);
      r.onsuccess = () => {
        pending -= 1;
        if (pending === 0) resolve();
      };
      r.onerror = () => reject(r.error);
    }
  });
}

/** Drop the most-recently-appended snapshot — used when the user
 *  hits Undo so the IDB stack stays in sync with the in-memory one. */
export async function popSnapshot(siteSlug: string): Promise<void> {
  try {
    const db = await openDB();
    const last = await new Promise<StoredSnapshot | null>((resolve, reject) => {
      const store = tx(db, 'readonly');
      const lower = `${siteSlug}:`;
      const upper = `${siteSlug};`;
      const req = store.openCursor(IDBKeyRange.bound(lower, upper, false, true), 'prev');
      req.onsuccess = () => {
        const cur = req.result;
        resolve(cur ? (cur.value as StoredSnapshot) : null);
      };
      req.onerror = () => reject(req.error);
    });
    if (!last) return;
    await new Promise<void>((resolve, reject) => {
      const store = tx(db, 'readwrite');
      const r = store.delete(last.k);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
    if (nextSeqBySite[siteSlug] !== undefined && nextSeqBySite[siteSlug] > 1) {
      nextSeqBySite[siteSlug] -= 1;
    }
  } catch {
    // ignore
  }
}

/** Wipe the entire history for a site. Called after a successful
 *  publish so the DB only holds in-flight (post-publish) edits. */
export async function clearHistory(siteSlug: string): Promise<void> {
  try {
    const db = await openDB();
    const all = await new Promise<StoredSnapshot[]>((resolve, reject) => {
      const store = tx(db, 'readonly');
      const lower = `${siteSlug}:`;
      const upper = `${siteSlug};`;
      const req = store.getAll(IDBKeyRange.bound(lower, upper, false, true));
      req.onsuccess = () => resolve((req.result as StoredSnapshot[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const store = tx(db, 'readwrite');
      let pending = all.length;
      if (pending === 0) return resolve();
      for (const row of all) {
        const r = store.delete(row.k);
        r.onsuccess = () => {
          pending -= 1;
          if (pending === 0) resolve();
        };
        r.onerror = () => reject(r.error);
      }
    });
    delete nextSeqBySite[siteSlug];
  } catch {
    // ignore
  }
}
