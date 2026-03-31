'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Mail,
  LayoutGrid,
  Plane,
  TimerReset,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { C } from './colors';
import { text } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { IconCircle } from '@/components/ui/IconCircle';

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
      style={{ background: C.cream, padding: 'clamp(3.5rem,7vw,7rem) 1.25rem' }}
    >
      <div className="max-w-[960px] mx-auto">
        <SectionHeader
          eyebrow="Guest Experience"
          title={<>Everything your guests need.<br /><span style={{ color: C.plum }}>Nothing they don&rsquo;t.</span></>}
          inView={inView}
        />

        {/* Feature grid — solid cards with accent top border */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                whileHover={{ boxShadow: `0 12px 36px rgba(0,0,0,0.08), 0 0 0 1.5px ${f.accent}30` }}
                className="rounded-xl p-6 transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, white 60%, ${f.accent}0A)`,
                  border: `1px solid ${C.divider}`,
                  borderLeft: `4px solid ${f.accent}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <div className="mb-3.5">
                  <IconCircle icon={Icon} accent={f.accent} size={48} iconSize={22} />
                </div>
                <h3 className="font-semibold mb-1.5" style={{ fontSize: text.md, color: C.ink }}>
                  {f.title}
                </h3>
                <p className="leading-relaxed" style={{ fontSize: text.base, color: C.muted, lineHeight: 1.7 }}>
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
