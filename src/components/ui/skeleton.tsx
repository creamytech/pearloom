'use client';

import { cn } from '@/lib/cn';

// ─── Skeleton Loader ─────────────────────────────────────────

const roundedMap = {
  sm: 'rounded-[var(--pl-radius-sm)]',
  md: 'rounded-[var(--pl-radius-md)]',
  lg: 'rounded-[var(--pl-radius-lg)]',
  full: 'rounded-full',
} as const;

const shimmerStyle: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--pl-cream-deep) 0%, rgba(196,169,106,0.15) 50%, var(--pl-cream-deep) 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

function Skeleton({ width, height, rounded = 'md', className }: SkeletonProps) {
  return (
    <div
      className={cn(roundedMap[rounded], className)}
      style={{ width, height, ...shimmerStyle }}
    />
  );
}

// ─── Skeleton Text (multiple lines) ─────────────────────────

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: string | number;
  gap?: string | number;
  lastLineWidth?: string;
  className?: string;
}

function SkeletonText({
  lines = 3,
  lineHeight = 12,
  gap = 10,
  lastLineWidth = '60%',
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn('flex flex-col', className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--pl-radius-sm)]"
          style={{
            height: lineHeight,
            width: i === lines - 1 ? lastLineWidth : '100%',
            ...shimmerStyle,
          }}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Circle ─────────────────────────────────────────

export interface SkeletonCircleProps {
  size?: string | number;
  className?: string;
}

function SkeletonCircle({ size = 40, className }: SkeletonCircleProps) {
  return (
    <div
      className={cn('rounded-full flex-shrink-0', className)}
      style={{ width: size, height: size, ...shimmerStyle }}
    />
  );
}

export { Skeleton, SkeletonText, SkeletonCircle };
