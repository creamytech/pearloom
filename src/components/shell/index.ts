// ─────────────────────────────────────────────────────────────
// Shell primitives — barrel re-export.
// Import from '@/components/shell' (not subpaths) so the design
// system surface stays consolidated.
// ─────────────────────────────────────────────────────────────

export { ThemeProvider, useTheme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
export { EmptyState } from './EmptyState';
export { Skeleton, SkeletonStack, SkeletonCard } from './LoadingSkeleton';
export { Button } from './Button';
export { Badge } from './Badge';
export { StateChip, rsvpStateKind, vendorStateKind } from './StateChip';
export type { StateKind } from './StateChip';
export { StatTile } from './StatTile';
