/* ========================================================================
   PEARLOOM MOTION — shared animation primitives
   Smooth, spring-like, reduced-motion-aware.
   ======================================================================== */

const { useRef, useEffect, useState, useLayoutEffect, createContext, useContext } = React;

/* ---------------- Easing curves (custom cubics, not library bezier) ---------------- */
const EASE = {
  out:     'cubic-bezier(0.16, 1, 0.3, 1)',       // soft, decelerating — default
  outBack: 'cubic-bezier(0.34, 1.36, 0.64, 1)',   // tiny overshoot (springy)
  inOut:   'cubic-bezier(0.65, 0, 0.35, 1)',      // s-curve
  in:      'cubic-bezier(0.5, 0, 0.75, 0)',
};

/* ---------------- Prefers reduced motion ---------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/* ---------------- IntersectionObserver hook ----------------
   Strategy: reveal on mount if already in viewport; otherwise observe.
   Always guaranteed to fire via a short mount-delay fallback so content
   is never stuck hidden (important for print/headless capture).           */
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const once = options.once !== false;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If element is already in viewport on mount, reveal immediately.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const alreadyVisible = rect.top < vh * 1.05 && rect.bottom > -vh * 0.05;
    if (alreadyVisible) {
      setInView(true);
      if (once) return;
    }

    let io;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      }, { threshold: options.threshold ?? 0.01, rootMargin: options.rootMargin ?? '0px 0px 10% 0px' });
      io.observe(el);
    }

    // Guaranteed fallback: reveal no matter what after 1.2s so content
    // never stays hidden (e.g. in headless or scroll-driven edge cases).
    const timeout = setTimeout(() => setInView(true), 1200);

    return () => {
      io?.disconnect();
      clearTimeout(timeout);
    };
  }, [once, options.threshold, options.rootMargin]);
  return [ref, inView];
}

/* ---------------- Reveal — fade+rise on enter ----------------
   Uses CSS @keyframes animations (not transitions) because transitions
   trigger two-pass mount (render from-state, then to-state) which is
   unreliable under React batching — sometimes stuck at the start frame.
   Keyframe animations apply on mount deterministically.              */
function Reveal({
  children,
  delay = 0,
  y = 14,
  x = 0,
  scale,
  duration = 720,
  ease = EASE.out,
  as: Tag = 'div',
  once = true,
  className = '',
  style = {},
  ...rest
}) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView({ once });
  const show = inView || reduced;

  // Build a unique keyframe name per options — not strictly needed since
  // the animation itself is deterministic; reuse one global keyframe.
  if (reduced) {
    return (
      <Tag ref={ref} className={className} style={{ opacity: 1, ...style }} {...rest}>
        {children}
      </Tag>
    );
  }

  const playing = show;
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: playing ? 1 : 0,
        transform: playing ? 'translate3d(0,0,0)' : undefined,
        ['--rx']: `${x}px`,
        ['--ry']: `${y}px`,
        ['--rs']: scale ?? 1,
        animation: playing
          ? `pearloom-reveal ${duration}ms ${ease} ${delay}ms both`
          : 'none',
        willChange: 'opacity, transform',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------------- Stagger — distribute delay across children ---------------- */
function Stagger({
  children,
  step = 70,           // ms between children
  initialDelay = 0,
  y = 12,
  duration = 640,
  ease = EASE.out,
  as: Tag = 'div',
  className = '',
  style = {},
  once = true,
}) {
  const items = React.Children.toArray(children);
  return (
    <Tag className={className} style={style}>
      {items.map((child, i) =>
        React.createElement(Reveal, {
          key: child.key ?? i,
          delay: initialDelay + i * step,
          y, duration, ease, once,
        }, child)
      )}
    </Tag>
  );
}

/* ---------------- Float — gentle perpetual hover animation ---------------- */
function Float({
  children, amplitude = 6, duration = 6,
  delay = 0, className = '', style = {}, as: Tag = 'div',
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <Tag
      className={className}
      style={{
        animation: reduced ? 'none' : `pearloom-float ${duration}s ease-in-out ${delay}s infinite`,
        ['--float-a']: `${amplitude}px`,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

/* ---------------- Shimmer — slow drift for backgrounds ---------------- */
function Drift({ children, duration = 24, className = '', style = {} }) {
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

/* ---------------- HoverLift — a11y-friendly hover/press effect via class ---------------- */
// (The base .btn already has transform:translateY; this adds richer lift for cards.)

/* ---------------- Cross-fade between states (tweak selectors, toggles) ---------------- */
function Fade({ show, children, duration = 300, className = '', style = {} }) {
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

/* ---------------- Counter / number tween ---------------- */
function useCountUp(target, { duration = 1200, start = 0, enabled = true } = {}) {
  const [value, setValue] = useState(start);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!enabled) return;
    if (reduced) { setValue(target); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
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

/* ---------------- Auto-focus ring for keyboard users (ambient improvement) ---------------- */
function useFocusVisible() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Tab') document.documentElement.classList.add('kbd-nav');
    };
    const onMouse = () => document.documentElement.classList.remove('kbd-nav');
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouse);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouse);
    };
  }, []);
}

/* ---------------- Parallax — subtle translate on scroll ---------------- */
function Parallax({ children, speed = 0.1, className = '', style = {} }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let raf;
    const update = () => {
      raf = null;
      const r = el.getBoundingClientRect();
      const viewCenter = window.innerHeight / 2;
      const d = (r.top + r.height / 2) - viewCenter;
      el.style.transform = `translate3d(0, ${-d * speed}px, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed, reduced]);
  return <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}>{children}</div>;
}

/* ---------------- Marquee — slow continuous strip ---------------- */
function Marquee({ children, speed = 60, className = '', style = {} }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className={`marquee ${className}`} style={{ overflow: 'hidden', ...style }}>
      <div style={{
        display: 'inline-flex', gap: 32,
        animation: reduced ? 'none' : `pearloom-marquee ${speed}s linear infinite`,
        willChange: 'transform',
      }}>
        {children}{children}
      </div>
    </div>
  );
}

/* ---------------- Page entrance — runs once on mount ---------------- */
function PageEnter({ children, duration = 520, className = '', style = {} }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(false);
  useEffect(() => {
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

/* ---------------- Exports ---------------- */
Object.assign(window, {
  EASE,
  usePrefersReducedMotion, useInView, useCountUp, useFocusVisible,
  Reveal, Stagger, Float, Drift, Fade, Parallax, Marquee, PageEnter,
});
