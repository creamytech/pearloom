// ─────────────────────────────────────────────────────────────
// Pearloom patch protocol — a tiny structured-output convention
// the Pear chat endpoint emits at the END of its prose response
// when the host asked for a concrete change. The client detects
// the marker and offers an "Apply" button that runs the patch
// against the manifest.
//
// Shape (inside the streamed response, fenced):
//
//   ```pearloom:patch
//   {
//     "summary": "Rewrote the hero tagline to lean warmer.",
//     "patches": [
//       { "path": "poetry.heroTagline", "value": "We can't wait to have you there." }
//     ]
//   }
//   ```
//
// Supported path syntax:
//   • Dot paths:      "logistics.venue", "poetry.heroTagline"
//   • Array index:    "chapters[0].title", "chapters[2].description"
//   • Replace whole:  "faqs" (replaces the entire faqs array)
//
// Returns null if no patch block is present, or the patch envelope
// otherwise. Detection is forgiving — accepts both ```pearloom:patch
// and ```json```-fenced blocks that contain a `patches` field.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export interface PearPatch {
  path: string;
  value: unknown;
}

export interface PearPatchEnvelope {
  summary: string;
  patches: PearPatch[];
}

const FENCE_RX = /```(?:pearloom:patch|json)?\s*\n([\s\S]*?)\n```/;

/** Pull the first Pearloom-shaped patch envelope out of streamed
 *  Pear text. Returns null when no envelope is present. Forgives
 *  slightly malformed JSON (trailing commas, etc.) by giving up
 *  cleanly rather than throwing. */
export function extractPatch(text: string): PearPatchEnvelope | null {
  const m = FENCE_RX.exec(text);
  if (!m) return null;
  const raw = m[1].trim();
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as { patches?: unknown }).patches) &&
      typeof (parsed as { summary?: unknown }).summary === 'string'
    ) {
      return parsed as PearPatchEnvelope;
    }
  } catch {
    // Malformed JSON — drop it. We could try to repair (trailing
    // commas, missing quotes) but the model is reliable enough
    // that a hard fail is better than a silent half-apply.
  }
  return null;
}

/** Strips the patch + follow-ups fences out of streamed text so
 *  the prose part can be displayed without showing the JSON to
 *  the host. */
export function stripPatchFromText(text: string): string {
  return text
    .replace(FENCE_RX, '')
    .replace(FOLLOWUPS_RX, '')
    .trim();
}

const FOLLOWUPS_RX = /```pearloom:followups\s*\n([\s\S]*?)\n```/;

/** Pull up to 3 short follow-up suggestions out of the response.
 *  Returns [] when no fence is present or the JSON is malformed. */
export function extractFollowups(text: string): string[] {
  const m = FOLLOWUPS_RX.exec(text);
  if (!m) return [];
  const raw = m[1].trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 60)
        .slice(0, 3);
    }
  } catch {
    // ignore
  }
  return [];
}

/** Apply a single patch path → value to the manifest. Returns a
 *  shallow-cloned manifest with the patch applied. */
export function applyPearPatch(manifest: StoryManifest, patch: PearPatch): StoryManifest {
  const segments = parsePath(patch.path);
  return setDeep(manifest as unknown as Record<string, unknown>, segments, patch.value) as unknown as StoryManifest;
}

/** Apply a whole envelope of patches in order. */
export function applyPearPatchEnvelope(manifest: StoryManifest, env: PearPatchEnvelope): StoryManifest {
  return env.patches.reduce(applyPearPatch, manifest);
}

// ── Path parsing ──────────────────────────────────────────────
type Segment = { kind: 'key'; value: string } | { kind: 'index'; value: number };

function parsePath(path: string): Segment[] {
  const out: Segment[] = [];
  // Walk char-by-char to handle "chapters[0].title" as
  // [chapters, 0, title].
  let buf = '';
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.') {
      if (buf) { out.push({ kind: 'key', value: buf }); buf = ''; }
    } else if (ch === '[') {
      if (buf) { out.push({ kind: 'key', value: buf }); buf = ''; }
      const close = path.indexOf(']', i);
      if (close === -1) break;
      const idx = parseInt(path.slice(i + 1, close), 10);
      if (Number.isFinite(idx)) out.push({ kind: 'index', value: idx });
      i = close;
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ kind: 'key', value: buf });
  return out;
}

function setDeep(root: Record<string, unknown>, segments: Segment[], value: unknown): Record<string, unknown> {
  if (segments.length === 0) return root;
  const out: Record<string, unknown> = { ...root };
  let cur: Record<string, unknown> | unknown[] = out;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const next = segments[i + 1];
    if (seg.kind === 'key') {
      const key = seg.value;
      const curObj = cur as Record<string, unknown>;
      const existing = curObj[key];
      if (next.kind === 'index') {
        // Need an array at curObj[key]
        const arr = Array.isArray(existing) ? [...existing] : [];
        curObj[key] = arr;
        cur = arr;
      } else {
        const nextObj = existing && typeof existing === 'object' && !Array.isArray(existing)
          ? { ...(existing as Record<string, unknown>) }
          : {};
        curObj[key] = nextObj;
        cur = nextObj;
      }
    } else {
      const idx = seg.value;
      const arr = cur as unknown[];
      const existing = arr[idx];
      const nextNode = existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
      arr[idx] = nextNode;
      cur = nextNode;
    }
  }
  // Final segment — write the value.
  const last = segments[segments.length - 1];
  if (last.kind === 'key') {
    (cur as Record<string, unknown>)[last.value] = value;
  } else {
    (cur as unknown[])[last.value] = value;
  }
  return out;
}
