// ─────────────────────────────────────────────────────────────
// Pearloom / lib/breakpoint-utils.ts
// Utilities for per-breakpoint block config resolution
// and generic responsive value helpers
// ─────────────────────────────────────────────────────────────

import type { PageBlock } from '@/types';
import type { DeviceMode } from '@/lib/editor-state';

// ── Breakpoint constants ─────────────────────────────────────
export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
} as const;

// ── Generic responsive value type ────────────────────────────
export type ResponsiveValue<T> = {
  desktop?: T;
  tablet?: T;
  mobile?: T;
};

/**
 * Resolve a responsive value for the current device, falling back
 * to larger breakpoints then the provided fallback.
 *
 * Resolution order:
 *   mobile  -> tablet -> desktop -> fallback
 *   tablet  -> desktop -> fallback
 *   desktop -> fallback
 */
export function resolveResponsive<T>(
  value: ResponsiveValue<T> | T,
  device: DeviceMode,
  fallback: T,
): T {
  // If the value is not a responsive object, return it directly
  if (!isResponsive(value)) return value as T;

  const rv = value as ResponsiveValue<T>;

  if (device === 'mobile') {
    return rv.mobile ?? rv.tablet ?? rv.desktop ?? fallback;
  }
  if (device === 'tablet') {
    return rv.tablet ?? rv.desktop ?? fallback;
  }
  // desktop
  return rv.desktop ?? fallback;
}

/**
 * Check whether a value is a responsive object (has at least one
 * of desktop/tablet/mobile keys and is a plain object).
 */
export function isResponsive(value: unknown): value is ResponsiveValue<unknown> {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value as Record<string, unknown>);
  const responsiveKeys = ['desktop', 'tablet', 'mobile'];
  return keys.length > 0 && keys.every(k => responsiveKeys.includes(k));
}

/**
 * Resolve the effective config for a block at a given device breakpoint.
 * Desktop = base config. Tablet/Mobile = base merged with overrides.
 */
export function resolveBreakpointConfig(
  block: PageBlock,
  device: DeviceMode,
): Record<string, unknown> {
  const base = block.config || {};

  if (device === 'tablet' && block.tabletConfig) {
    return { ...base, ...block.tabletConfig };
  }

  if (device === 'mobile') {
    // Mobile inherits tablet overrides first, then applies its own
    const tabletLayer = block.tabletConfig || {};
    const mobileLayer = block.mobileConfig || {};
    return { ...base, ...tabletLayer, ...mobileLayer };
  }

  return base;
}

/**
 * Get the config key to write to for a given device mode.
 * Desktop writes to `config`, tablet to `tabletConfig`, mobile to `mobileConfig`.
 */
export function getConfigKeyForDevice(
  device: DeviceMode,
): 'config' | 'tabletConfig' | 'mobileConfig' {
  if (device === 'tablet') return 'tabletConfig';
  if (device === 'mobile') return 'mobileConfig';
  return 'config';
}

/**
 * Check whether a block has any overrides for a specific device.
 */
export function hasBreakpointOverrides(
  block: PageBlock,
  device: DeviceMode,
): boolean {
  if (device === 'tablet') {
    return !!block.tabletConfig && Object.keys(block.tabletConfig).length > 0;
  }
  if (device === 'mobile') {
    return !!block.mobileConfig && Object.keys(block.mobileConfig).length > 0;
  }
  return false;
}

/**
 * Device label for display.
 */
export function deviceLabel(device: DeviceMode): string {
  if (device === 'tablet') return 'Tablet';
  if (device === 'mobile') return 'Mobile';
  return 'Desktop';
}
