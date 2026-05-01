// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/bindings.ts
// Binding resolver — resolves {{ variable.path }} expressions
// in block config values against a data context.
//
// Supports:
//   {{ couple.name }}        → "Jess & Tom"
//   {{ logistics.date }}     → "2025-06-15"
//   {{ poetry.heroTagline }} → "A golden afternoon"
//   {{ sectionLabels.story }}→ "Our Story"
//
// Safe: no eval(), no arbitrary code execution.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

/**
 * The data context available to bindings.
 * Flattened from manifest + vibeSkin + computed values.
 */
export interface BindingContext {
  couple: {
    name: string;
    name1: string;
    name2: string;
  };
  logistics: {
    venue?: string;
    date?: string;
    time?: string;
    rsvpDeadline?: string;
    dresscode?: string;
  };
  poetry: {
    heroTagline?: string;
    closingLine?: string;
    rsvpIntro?: string;
    welcomeStatement?: string;
  };
  sectionLabels: Record<string, string>;
  vibeString: string;
  occasion: string;
  spotifyUrl?: string;
  hashtags: string[];
  [key: string]: unknown;
}

/**
 * Build a BindingContext from manifest + names + vibeSkin.
 */
export function buildContext(
  manifest: StoryManifest,
  names: [string, string],
  vibeSkin?: VibeSkin,
): BindingContext {
  const name1 = names[0]?.charAt(0).toUpperCase() + (names[0]?.slice(1) || '');
  const name2 = names[1]?.charAt(0).toUpperCase() + (names[1]?.slice(1) || '');
  const displayName = name2?.trim() ? `${name1} & ${name2}` : name1;

  return {
    couple: {
      name: displayName,
      name1,
      name2,
    },
    logistics: {
      venue: manifest.logistics?.venue,
      date: manifest.logistics?.date,
      time: manifest.logistics?.time,
      rsvpDeadline: manifest.logistics?.rsvpDeadline,
      dresscode: manifest.logistics?.dresscode,
    },
    poetry: {
      heroTagline: manifest.poetry?.heroTagline,
      closingLine: manifest.poetry?.closingLine,
      rsvpIntro: manifest.poetry?.rsvpIntro,
      welcomeStatement: manifest.poetry?.welcomeStatement,
    },
    sectionLabels: vibeSkin?.sectionLabels || {},
    vibeString: manifest.vibeString || '',
    occasion: manifest.occasion || 'wedding',
    spotifyUrl: manifest.spotifyUrl,
    hashtags: manifest.hashtags || [],
  };
}

// ── Binding pattern: {{ path.to.value }} ────────────────────
const BINDING_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Resolve a single dot-path against the context.
 * Returns undefined if the path doesn't resolve.
 */
function resolvePath(context: BindingContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolve all {{ bindings }} in a string value.
 * Returns the original string with bindings replaced by resolved values.
 * Unresolved bindings are left as-is (so users can see what's missing).
 */
export function resolveBindings(value: string, context: BindingContext): string {
  return value.replace(BINDING_REGEX, (match, path) => {
    const resolved = resolvePath(context, path);
    if (resolved === undefined || resolved === null) return match; // leave unresolved
    if (typeof resolved === 'string') return resolved;
    if (typeof resolved === 'number' || typeof resolved === 'boolean') return String(resolved);
    if (Array.isArray(resolved)) return resolved.join(', ');
    return match;
  });
}

/**
 * Resolve all bindings in a block config object.
 * Only resolves string values — numbers, booleans, objects pass through.
 */
export function resolveBlockConfig(
  config: Record<string, unknown>,
  context: BindingContext,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && BINDING_REGEX.test(value)) {
      // Reset regex state (it's stateful with /g flag)
      BINDING_REGEX.lastIndex = 0;
      resolved[key] = resolveBindings(value, context);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Check if a string contains binding expressions.
 */
export function hasBindings(value: string): boolean {
  BINDING_REGEX.lastIndex = 0;
  return BINDING_REGEX.test(value);
}

/**
 * Extract all binding paths from a string.
 */
export function extractBindings(value: string): string[] {
  const paths: string[] = [];
  let match;
  const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
  while ((match = regex.exec(value)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}
