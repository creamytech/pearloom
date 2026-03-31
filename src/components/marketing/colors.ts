// Re-export from canonical design tokens
// Existing imports of { C, EASE } from './colors' continue to work
import { colors, ease } from '@/lib/design-tokens';

export const C = colors;
export const EASE = ease.smooth;
