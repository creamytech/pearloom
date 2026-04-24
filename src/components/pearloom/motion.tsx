'use client';

/* ========================================================================
   PEARLOOM MOTION — shared animation primitives (TSX port)
   ======================================================================== */

import * as React from 'react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  outBack: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  in: 'cubic-bezier(0.5, 0, 0.75, 0)',
};

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function useInView(options: { once?: boolean; threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const once = options.once !== false;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const alreadyVisible = rect.top < vh * 1.05 && rect.bottom > -vh * 0.05;
    if (alreadyVisible) {
      setInView(true);
      if (once) return;
    }
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io?.disconnect();
          } else if (!once) {
            setInView(false);
          }
        },
        { threshold: options.threshold ?? 0.01, rootMargin: options.rootMargin ?? '0px 0px 10% 0px' }
      );
      io.observe(el);
    }
    const timeout = window.setTimeout(() => setInView(true), 1200);
    return () => {
      io?.disconnect();
      window.clearTimeout(timeout);
    };
  }, [once, options.threshold, options.rootMargin]);
  return [ref, inView] as const;
}

export function Reveal({
  children,
  delay = 0,
  y = 14,
  x = 0,
  scale,
  duration = 720,
  ease = EASE.out,
  once = true,
  className = '',
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  duration?: number;
  ease?: string;
  once?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView({ once });
  const show = inView || reduced;

  if (reduced) {
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={className} style={{ opacity: 1, ...style }}>
        {children}
      </div>
    );
  }
  const playing = show;
  const vars = {
    '--rx': `${x}px`,
    '--ry': `${y}px`,
    '--rs': String(scale ?? 1),
  } as React.CSSProperties;
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={{
        opacity: playing ? 1 : 0,
        transform: playing ? 'translate3d(0,0,0)' : undefined,
        ...vars,
        animation: playing ? `pearloom-reveal ${duration}ms ${ease} ${delay}ms both` : 'none',
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Stagger({
  children,
  step = 70,
  initialDelay = 0,
  y = 12,
  duration = 640,
  ease = EASE.out,
  className = '',
  style,
  once = true,
}: {
  children: ReactNode;
  step?: number;
  initialDelay?: number;
  y?: number;
  duration?: number;
  ease?: string;
  className?: string;
  style?: CSSProperties;
  once?: boolean;
}) {
  const items = React.Children.toArray(children);
  return (
    <div className={className} style={style}>
      {items.map((child, i) => (
        <Reveal
          key={(child as { key?: string }).key ?? i}
          delay={initialDelay + i * step}
          y={y}
          duration={duration}
          ease={ease}
          once={once}
        >
          {child}
        </Reveal>
      ))}
    </div>
  );
}

export function Float({
  children,
  amplitude = 6,
  duration = 6,
  delay = 0,
  className = '',
  style,
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  const vars = { '--float-a': `${amplitude}px` } as React.CSSProperties;
  return (
    <div
      className={className}
      style={{
        animation: reduced ? 'none' : `pearloom-float ${duration}s ease-in-out ${delay}s infinite`,
        ...vars,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Drift({
  children,
  duration = 24,
  className = '',
  style,
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      className={className}
      style={{
        animation: reduced ? 'none' : `pearloom-drift ${duration}s ease-in-out infinite`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Fade({
  show,
  children,
  duration = 300,
  className = '',
  style,
}: {
  show: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'none' : 'translateY(4px)',
        transition: reduced ? 'none' : `opacity ${duration}ms ${EASE.out}, transform ${duration}ms ${EASE.out}`,
        pointerEvents: show ? 'auto' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function useCountUp(
  target: number,
  { duration = 1200, start = 0, enabled = true }: { duration?: number; start?: number; enabled?: boolean } = {}
) {
  const [value, setValue] = useState(start);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!enabled) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, enabled, reduced]);
  return value;
}

export function PageEnter({
  children,
  duration = 520,
  className = '',
  style,
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(false);
  useLayoutEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translate3d(0, 8px, 0)',
        transition: reduced ? 'none' : `opacity ${duration}ms ${EASE.out}, transform ${duration}ms ${EASE.out}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Marquee({
  children,
  speed = 60,
  className = '',
  style,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className={`marquee ${className}`} style={{ overflow: 'hidden', ...style }}>
      <div
        style={{
          display: 'inline-flex',
          gap: 32,
          animation: reduced ? 'none' : `pearloom-marquee ${speed}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
