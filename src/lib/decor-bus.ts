'use client';

// ─────────────────────────────────────────────────────────────
// decor-bus — module-level pub/sub for in-flight AI decor
// generation jobs. The DecorLibraryPanel + AiAccentSection
// (which can run for 10–30 seconds) used to lock the user
// inside the Theme tab with an inline "running" spinner. Now
// they enqueue jobs through this bus and a global toast
// surfaces progress in the bottom-right so the host can
// keep editing other parts of the site while Pear paints.
//
// The fetch itself was always non-blocking — what was missing
// was a *visible* signal once the panel scrolled out of view.
// This bus is that signal.
// ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

export type DecorJobStatus = 'running' | 'done' | 'error';

export interface DecorJob {
  id: string;
  /** Short slug — divider | sectionStamps | confetti | footerBouquet | accent */
  slot: string;
  /** Human-readable label that the toast renders. */
  label: string;
  status: DecorJobStatus;
  error?: string;
  /** Wall-clock when the job was enqueued. */
  startedAt: number;
  /** Wall-clock when the job finished (null while running). */
  endedAt: number | null;
}

let jobs: DecorJob[] = [];
const subscribers = new Set<() => void>();
function notify() {
  subscribers.forEach((fn) => fn());
}

/** Enqueue a new job. Returns a stable id the caller passes to
 *  completeJob() when the fetch resolves. */
export function startDecorJob(slot: string, label: string): string {
  const id = `decor-${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  jobs = [
    ...jobs,
    { id, slot, label, status: 'running', error: undefined, startedAt: Date.now(), endedAt: null },
  ];
  notify();
  return id;
}

/** Mark a job done (ok=true) or errored (ok=false + message).
 *  Done jobs auto-evict after FADE_MS so the toast self-clears;
 *  errored jobs stay until the user dismisses them. */
const FADE_MS = 4500;

export function completeDecorJob(id: string, ok: boolean, error?: string): void {
  jobs = jobs.map((j) =>
    j.id === id
      ? { ...j, status: ok ? 'done' : 'error', error, endedAt: Date.now() }
      : j,
  );
  notify();
  if (ok) {
    setTimeout(() => dismissDecorJob(id), FADE_MS);
  }
}

export function dismissDecorJob(id: string): void {
  jobs = jobs.filter((j) => j.id !== id);
  notify();
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
function getSnapshot(): DecorJob[] {
  return jobs;
}
const NO_JOBS: DecorJob[] = [];
function getServerSnapshot(): DecorJob[] {
  return NO_JOBS;
}

/** Hook that re-renders every time the jobs list changes.
 *  useSyncExternalStore, not a useState-tick: under the React
 *  Compiler (reactCompiler: true) a tick whose value is never
 *  read gets memoized away and the toast never updates. */
export function useDecorJobs(): DecorJob[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
