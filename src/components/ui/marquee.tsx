'use client';

import { cn } from '@/lib/cn';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  speed?: number;
  direction?: 'left' | 'right';
}

export function Marquee({
  children,
  className,
  pauseOnHover = true,
  speed = 40,
  direction = 'left',
}: MarqueeProps) {
  return (
    <div
      className={cn('group flex overflow-hidden [--gap:1rem] gap-[var(--gap)]', className)}
      style={{ '--duration': `${speed}s` } as React.CSSProperties}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex shrink-0 gap-[var(--gap)] animate-marquee',
            direction === 'right' && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
          style={{ animationDuration: `var(--duration)` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
