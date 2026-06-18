// ─────────────────────────────────────────────────────────────
// Shell primitives — barrel re-export.
// Import from '@/components/shell' (not subpaths) so the design
// system surface stays consolidated.
// ─────────────────────────────────────────────────────────────

export { ThemeProvider, useTheme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
export { PageCard } from './PageCard';
export { EmptyState } from './EmptyState';
export { Skeleton, SkeletonStack, SkeletonCard } from './LoadingSkeleton';
export { Button } from './Button';
export { Badge } from './Badge';
export { StatTile } from './StatTile';
