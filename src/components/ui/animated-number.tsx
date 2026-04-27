'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Animated Number ────────────────────────────────────────
// A small component that animates number changes with a rolling
// digit effect. Uses CSS transition on translateY to roll digits
// up/down when the value changes.

interface AnimatedNumberProps {
  value: number;
  /** Duration in ms (default 400) */
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedNumber({
  value,
  duration = 400,
  className,
  style,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === prevRef.current) return;

    const goingUp = value > prevRef.current;
    setDirection(goingUp ? 'up' : 'down');

    // After the CSS transition completes, snap to the new value
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDisplayValue(value);
      setDirection(null);
    }, duration);

    prevRef.current = value;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, duration]);

  const offsetY = direction === 'up' ? '-100%' : direction === 'down' ? '100%' : '0%';

  return (
    <span
      className={className}
      style={{
        ...style,
        display: 'inline-flex',
        overflow: 'hidden',
        position: 'relative',
        verticalAlign: 'baseline',
      }}
    >
      {/* Current value — slides out */}
      <span
        style={{
          display: 'inline-block',
          transition: direction ? `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none',
          transform: direction ? `translateY(${offsetY})` : 'translateY(0)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayValue}
      </span>

      {/* New value — slides in */}
      {direction && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: direction === 'up' ? '100%' : '-100%',
            display: 'inline-block',
            transition: `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            transform: `translateY(${offsetY})`,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
      )}
    </span>
  );
}
