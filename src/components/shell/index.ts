// ─────────────────────────────────────────────────────────────
// Shell primitives — barrel re-export.
// Import from '@/components/shell' (not subpaths) so the design
// system surface stays consolidated.
// ─────────────────────────────────────────────────────────────

export { ThemeProvider, useTheme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
export { AppShell, NavGroup, NavItem } from './AppShell';
export { PageCard } from './PageCard';
export { EmptyState } from './EmptyState';
export { Skeleton, SkeletonStack, SkeletonCard } from './LoadingSkeleton';
export { SiteSelector } from './SiteSelector';
export type { SiteOption } from './SiteSelector';
export { ResponsiveTable } from './ResponsiveTable';
export type { Column } from './ResponsiveTable';
export { Button } from './Button';
export { StatTile } from './StatTile';
