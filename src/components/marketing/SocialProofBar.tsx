'use client';

import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { C } from './colors';
import { text } from '@/lib/design-tokens';

const STATS = [
  { value: '2,000+', numericEnd: 2000, suffix: '+', label: 'Sites Created', icon: 'globe' },
  { value: '50,000+', numericEnd: 50000, suffix: '+', label: 'Photos Woven', icon: 'camera' },
  { value: '4.9/5', numericEnd: 4.9, suffix: '/5', label: 'Creator Rating', icon: 'star' },
  { value: '5 min', numericEnd: 5, suffix: ' min', label: 'Average Build Time', icon: 'clock' },
] as const;

function formatNumber(n: number, end: number): string {
  if (end >= 1000) return Math.round(n).toLocaleString();
  if (end === 4.9) return n.toFixed(1);
  return Math.round(n).toString();
}

function StatIcon({ icon, color }: { icon: string; color: string }) {
  const size = 22;
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (icon) {
    case 'globe':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 9h17M3.5 15h17" />
          <path d="M12 3c-2.5 3-2.5 15 0 18" />
          <path d="M12 3c2.5 3 2.5 15 0 18" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...props}>
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case 'star':
      return (
        <svg {...props}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    default:
      return null;
  }
}

function AnimatedStat({ stat, inView }: { stat: typeof STATS[number]; inView: boolean }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => formatNumber(v, stat.numericEnd));
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, stat.numericEnd, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [inView, motionValue, stat.numericEnd]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = v + stat.suffix;
      }
    });
    return unsubscribe;
  }, [rounded, stat.suffix]);

  return (
    <span ref={displayRef}>{inView ? '' : '0' + stat.suffix}</span>
  );
}

/* Decorative thread divider SVG for between stats */
function ThreadDivider() {
  return (
    <svg
      width="2"
      height="48"
      viewBox="0 0 2 48"
      fill="none"
      className="hidden md:block"
      aria-hidden="true"
      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
    >
      <path
        d="M1 0 Q2 8 0.5 16 Q-0.5 24 1.5 32 Q2.5 40 1 48"
        stroke={C.gold}
        strokeWidth="1.2"
        opacity="0.4"
      />
      <path
        d="M1 0 Q0 8 1.5 16 Q2.5 24 0.5 32 Q-0.5 40 1 48"
        stroke={C.olive}
        strokeWidth="0.8"
        opacity="0.25"
      />
    </svg>
  );
}

export function SocialProofBar() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      className="border-y relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${C.deep} 0%, rgba(163,177,138,0.08) 50%, ${C.deep} 100%)`,
        borderColor: C.divider,
        padding: 'clamp(2.5rem,5vw,4.5rem) 1.25rem',
      }}
    >
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${C.gold}18 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          opacity: 0.5,
        }}
      />

      <div className="max-w-[960px] mx-auto relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="text-center relative"
              style={{ padding: '0 1rem' }}
            >
              {/* Thread divider between stats (not on last) */}
              {i < STATS.length - 1 && <ThreadDivider />}

              {/* Accent icon */}
              <div className="flex justify-center mb-3" style={{ opacity: 0.55 }}>
                <StatIcon icon={s.icon} color={C.olive} />
              </div>

              {/* Animated stat value */}
              <div
                className="font-[family-name:var(--eg-font-heading)] font-bold leading-none mb-2"
                style={{
                  color: C.ink,
                  fontSize: 'clamp(2.2rem, 4vw, 2.8rem)',
                  fontWeight: 700,
                }}
              >
                <AnimatedStat stat={s} inView={inView} />
              </div>

              {/* Label */}
              <div
                className="font-semibold tracking-[0.14em] uppercase"
                style={{ fontSize: text.sm, color: C.muted }}
              >
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
