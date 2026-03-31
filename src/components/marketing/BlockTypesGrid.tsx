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
import { colors as C, text, card, sectionPadding } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { IconCircle } from '@/components/ui/IconCircle';

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
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
        borderTop: `1px solid ${C.divider}`,
      }}
    >
      <div className="max-w-[960px] mx-auto">
        <SectionHeader
          watermark="15"
          title="15 blocks. Infinite possibilities."
          subtitle="Mix and match blocks to build exactly the site you need — from intimate stories to full event management."
          inView={inView}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BLOCKS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.04 + 0.2, duration: 0.4 }}
                whileHover={{ boxShadow: card.shadowHover, y: -1 }}
                className="p-4 text-center transition-shadow duration-200 cursor-default"
                style={{
                  background: card.bg,
                  border: card.border,
                  borderRadius: card.radius,
                  boxShadow: card.shadow,
                }}
              >
                <div className="mx-auto mb-2.5">
                  <IconCircle icon={Icon} accent={b.accent} size={44} iconSize={20} />
                </div>
                <div className="font-semibold mb-0.5" style={{ fontSize: text.md, color: C.ink }}>
                  {b.name}
                </div>
                <div className="leading-snug" style={{ fontSize: text.sm, color: C.muted }}>
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
