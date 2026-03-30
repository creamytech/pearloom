'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  Mail,
  LayoutGrid,
  Plane,
  TimerReset,
  Bot,
  MessageSquare,
} from 'lucide-react';

const C = {
  cream: '#F5F1E8',
  olive: '#A3B18A',
  gold: '#D6C6A8',
  plum: '#6D597A',
  ink: '#2B2B2B',
  muted: '#9A9488',
  divider: '#E6DFD2',
} as const;

const FEATURES = [
  {
    icon: Mail,
    title: 'RSVP with details',
    desc: 'Dietary preferences, plus-ones, song requests — all captured in one beautiful form.',
    accent: C.olive,
  },
  {
    icon: LayoutGrid,
    title: 'Interactive seating chart',
    desc: 'Drag-and-drop table assignments. Guests can find their seat before they arrive.',
    accent: C.plum,
  },
  {
    icon: Plane,
    title: 'Travel & accommodations',
    desc: 'Maps, hotel blocks, flight details — everything guests need to plan their trip.',
    accent: C.gold,
  },
  {
    icon: TimerReset,
    title: 'Time capsule',
    desc: 'Guests leave messages sealed until your anniversary, birthday, or any date you choose.',
    accent: C.olive,
  },
  {
    icon: Bot,
    title: 'AI concierge',
    desc: 'Guests can ask questions about the event and get instant answers — powered by The Loom.',
    accent: C.plum,
  },
  {
    icon: MessageSquare,
    title: 'Guestbook & photos',
    desc: 'Wishes, notes, and shared photos collected in a living, breathing guestbook.',
    accent: C.gold,
  },
];

export function GuestExperience() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      id="features"
      style={{ background: C.cream, padding: '7rem 1.5rem' }}
    >
      <div className="max-w-[920px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="mb-4"
          >
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[0.7rem] font-bold tracking-[0.14em] uppercase"
              style={{ background: 'rgba(163,177,138,0.12)', border: '1px solid rgba(163,177,138,0.3)', color: C.olive }}
            >
              <Sparkles size={9} strokeWidth={2.5} /> Guest Experience
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: C.ink }}
          >
            Everything your guests need.
            <br />
            <span style={{ color: C.plum }}>Nothing they don&rsquo;t.</span>
          </motion.h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                whileHover={{ y: -3, boxShadow: '0 10px 32px rgba(0,0,0,0.06)' }}
                className="rounded-xl border p-5 transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(8px)',
                  borderColor: C.divider,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-3.5"
                  style={{ background: `${f.accent}12` }}
                >
                  <Icon size={18} style={{ color: f.accent }} />
                </div>
                <h3 className="text-[0.95rem] font-semibold mb-1.5" style={{ color: C.ink }}>
                  {f.title}
                </h3>
                <p className="text-[0.84rem] leading-relaxed" style={{ color: C.muted, lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
