'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/vibe/VibeParticles.tsx
// Disabled — floating emoji particles made the UI feel like a
// game. The published site should feel elegant, not animated.
// Keeping the export so existing imports don't break.
// ─────────────────────────────────────────────────────────────

import type { VibeSkin } from '@/lib/vibe-engine';

interface VibeParticlesProps {
  particle: VibeSkin['particle'];
  accent?: string;
}

export function VibeParticles(_props: VibeParticlesProps) {
  return null;
}
