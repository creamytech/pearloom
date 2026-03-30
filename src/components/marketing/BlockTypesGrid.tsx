'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Crown,
  BookOpen,
  Image,
  Clock,
  Mail,
  Gift,
  Plane,
  Building,
  HelpCircle,
  LayoutGrid,
  TimerReset,
  MessageSquare,
  Timer,
  Music,
  Puzzle,
} from 'lucide-react';
import { C } from './colors';

const BLOCKS = [
  { icon: Crown, name: 'Hero', desc: 'Full-bleed cinematic opener', accent: C.plum },
  { icon: BookOpen, name: 'Story', desc: 'Your narrative, beautifully told', accent: C.olive },
  { icon: Image, name: 'Gallery', desc: 'Photo grids & masonry layouts', accent: C.gold },
  { icon: Clock, name: 'Timeline', desc: '6 layout styles to choose from', accent: C.plum },
  { icon: Mail, name: 'RSVP', desc: 'One-click guest responses', accent: C.olive },
  { icon: Gift, name: 'Registry', desc: 'Link your gift registries', accent: C.gold },
  { icon: Plane, name: 'Travel', desc: 'Maps, flights & directions', accent: C.plum },
  { icon: Building, name: 'Accommodations', desc: 'Hotels & lodging options', accent: C.olive },
  { icon: HelpCircle, name: 'FAQ', desc: 'Answer common questions', accent: C.gold },
  { icon: LayoutGrid, name: 'Seating Chart', desc: 'Interactive table assignments', accent: C.plum },
  { icon: TimerReset, name: 'Time Capsule', desc: 'Messages opened on anniversaries', accent: C.olive },
  { icon: MessageSquare, name: 'Guestbook', desc: 'Wishes, notes & photos', accent: C.gold },
  { icon: Timer, name: 'Countdown', desc: 'Live ticker to your big day', accent: C.plum },
  { icon: Music, name: 'Music', desc: 'Playlist & song requests', accent: C.olive },
  { icon: Puzzle, name: 'Custom', desc: 'Build your own block', accent: C.gold },
];

export function BlockTypesGrid() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      style={{
        background: C.deep,
        padding: '7rem 1.5rem',
        borderTop: `1px solid ${C.divider}`,
      }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Header with decorative watermark number */}
        <div className="text-center mb-12 relative">
          {/* Watermark "15" */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--eg-font-heading)] font-bold select-none pointer-events-none"
            style={{ fontSize: 'clamp(6rem, 14vw, 10rem)', color: C.ink, opacity: 0.03, lineHeight: 1 }}
          >
            15
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight mb-3 relative"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: C.ink }}
          >
            15 blocks. Infinite possibilities.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-[0.95rem] max-w-[460px] mx-auto relative"
            style={{ color: C.muted, lineHeight: 1.75 }}
          >
            Mix and match blocks to build exactly the site you need — from intimate stories to
            full event management.
          </motion.p>
        </div>

        {/* Grid — 4 columns for more breathing room */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {BLOCKS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.04 + 0.2, duration: 0.4 }}
                whileHover={{ boxShadow: `0 8px 24px rgba(0,0,0,0.06), 0 0 0 1.5px ${b.accent}40` }}
                className="rounded-xl p-4 text-center transition-all duration-200 cursor-default"
                style={{
                  background: 'white',
                  border: `1.5px solid ${C.divider}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2.5"
                  style={{ background: `${b.accent}12` }}
                >
                  <Icon size={16} style={{ color: b.accent }} />
                </div>
                <div className="text-[0.78rem] font-semibold mb-0.5" style={{ color: C.ink }}>
                  {b.name}
                </div>
                <div className="text-[0.62rem] leading-snug" style={{ color: C.muted }}>
                  {b.desc}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
