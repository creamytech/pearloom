'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { C } from './colors';

/* Three example Rind™ themes that cycle in the hero mockup */
const RINDS = [
  {
    label: 'Wedding',
    accent: '#B4838D',
    bg: '#FDF6F0',
    heading: 'Emma & James',
    sub: 'September 14, 2026 · Napa Valley',
    blocks: ['Gallery', 'Timeline', 'RSVP'],
  },
  {
    label: 'Birthday',
    accent: '#6D8B74',
    bg: '#F4F8F0',
    heading: 'Happy 30th, Maya!',
    sub: 'April 22, 2026 · Brooklyn',
    blocks: ['Story', 'Guestbook', 'Countdown'],
  },
  {
    label: 'Anniversary',
    accent: '#7B6BA4',
    bg: '#F5F0FA',
    heading: 'Priya & Rohan',
    sub: '10 years · A decade woven together',
    blocks: ['Timeline', 'Time Capsule', 'Gallery'],
  },
] as const;

export function SiteMockup() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % RINDS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const rind = RINDS[idx];

  return (
    <div className="w-full max-w-[800px] mx-auto">
      <div style={{ boxShadow: '0 25px 80px rgba(43,43,43,0.12), 0 8px 24px rgba(43,43,43,0.08)', borderRadius: '0.75rem', overflow: 'hidden' }}>
      {/* Browser chrome */}
      <div
        className="rounded-t-xl border border-b-0 px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'var(--pl-ink)', borderColor: C.divider }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFBD2E' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
        </div>
        <div
          className="flex-1 text-center text-[0.65rem] tracking-wide font-medium"
          style={{ color: C.muted }}
        >
          pearloom.com/emma-james
        </div>
      </div>

      {/* Site preview area */}
      <div
        className="rounded-b-xl border overflow-hidden relative"
        style={{ borderColor: C.divider, height: 'clamp(280px, 45vw, 380px)' }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={rind.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col"
            style={{ background: rind.bg }}
          >
            {/* Mini hero */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div
                className="text-[0.55rem] font-bold tracking-[0.2em] uppercase mb-3"
                style={{ color: rind.accent, opacity: 0.7 }}
              >
                {rind.label}
              </div>
              <h3
                className="font-heading text-[1.6rem] font-light italic leading-tight mb-1.5"
                style={{ color: C.ink }}
              >
                {rind.heading}
              </h3>
              <p className="text-[0.72rem]" style={{ color: C.muted }}>
                {rind.sub}
              </p>

              {/* Decorative line */}
              <div className="flex items-center gap-2 mt-4">
                <div className="w-8 h-px" style={{ background: rind.accent, opacity: 0.3 }} />
                <div
                  className="w-1.5 h-1.5 rotate-45"
                  style={{ background: rind.accent, opacity: 0.5 }}
                />
                <div className="w-8 h-px" style={{ background: rind.accent, opacity: 0.3 }} />
              </div>
            </div>

            {/* Faux photo strip */}
            <div className="flex gap-2 px-6 mb-3">
              {[rind.accent, `${rind.accent}88`, `${rind.accent}55`, `${rind.accent}33`].map((bg, j) => (
                <div key={j} className="flex-1 h-12 rounded-lg" style={{ background: bg, opacity: 0.4 }} />
              ))}
            </div>

            {/* Mini blocks bar */}
            <div
              className="flex justify-center gap-3 py-3 border-t"
              style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'var(--pl-ink-soft)' }}
            >
              {rind.blocks.map(b => (
                <span
                  key={b}
                  className="text-[0.58rem] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full"
                  style={{
                    color: rind.accent,
                    background: `${rind.accent}15`,
                    border: `1px solid ${rind.accent}25`,
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      </div>

      {/* Rind indicator dots */}
      <div className="flex justify-center gap-2 mt-3">
        {RINDS.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setIdx(i)}
            className="flex items-center gap-1.5 text-[0.62rem] font-semibold tracking-wider uppercase transition-all duration-300"
            style={{
              color: i === idx ? C.ink : C.muted,
              opacity: i === idx ? 1 : 0.5,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                background: i === idx ? RINDS[i].accent : C.muted,
                transform: i === idx ? 'scale(1.3)' : 'scale(1)',
              }}
            />
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
