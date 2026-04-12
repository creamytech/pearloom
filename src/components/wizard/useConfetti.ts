'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/useConfetti.ts
//
// Confetti disabled — the authoring UI should feel professional,
// not celebratory. Celebrations happen on the user's published
// site, not in the editor chrome.
//
// Keeping the export so existing call sites don't break.
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';

export interface ConfettiOptions {
  colors?: string[];
  count?: number;
  spread?: number;
  lifetimeMs?: number;
}

export function useConfetti() {
  const fire = useCallback(
    (
      _eventOrElement: React.MouseEvent | HTMLElement | { x: number; y: number },
      _options: ConfettiOptions = {},
    ) => {
      // No-op — confetti disabled in redesign v4
    },
    [],
  );

  return fire;
}
