'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';
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
import { colors as C, text, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { IconCircle } from '@/components/ui/IconCircle';

// ── Block definitions with featured flag ──────────────────────
import type { LucideIcon } from 'lucide-react';

interface BlockDef {
  icon: LucideIcon;
  name: string;
  desc: string;
  accent: string;
  featured?: boolean;
  tagline?: string;
}

const BLOCKS: BlockDef[] = [
  { icon: Crown,         name: 'Hero',           desc: 'Full-bleed cinematic opener with parallax photos, animated names, and countdown badge.',                    accent: C.plum,  featured: true, tagline: 'The first impression' },
  { icon: BookOpen,      name: 'Story',          desc: 'Multi-chapter narrative with 6 layout styles — editorial, split, cinematic, gallery, mosaic, and fullbleed.', accent: C.olive, featured: true, tagline: 'Your love, chapter by chapter' },
  { icon: Image,         name: 'Gallery',        desc: 'Masonry photo grids with lightbox viewing. AI auto-sorts your best shots.',                                  accent: C.gold,  featured: true, tagline: 'Every photo, perfectly placed' },
  { icon: Clock,         name: 'Timeline',       desc: '6 layout styles to choose from',       accent: C.plum },
  { icon: Mail,          name: 'RSVP',           desc: 'One-click guest responses + meal prefs', accent: C.olive },
  { icon: Gift,          name: 'Registry',       desc: 'Link your gift registries',              accent: C.gold },
  { icon: Plane,         name: 'Travel',         desc: 'Maps, flights & directions',             accent: C.plum },
  { icon: Building,      name: 'Accommodations', desc: 'Hotels & lodging options',               accent: C.olive },
  { icon: HelpCircle,    name: 'FAQ',            desc: 'Answer common questions',                accent: C.gold },
  { icon: LayoutGrid,    name: 'Seating Chart',  desc: 'Interactive table assignments',          accent: C.plum },
  { icon: TimerReset,    name: 'Time Capsule',   desc: 'Messages opened on anniversaries',       accent: C.olive },
  { icon: MessageSquare, name: 'Guestbook',      desc: 'Wishes, notes & photos',                 accent: C.gold },
  { icon: Timer,         name: 'Countdown',      desc: 'Live ticker to your big day',            accent: C.plum },
  { icon: Music,         name: 'Music',          desc: 'Playlist & song requests',               accent: C.olive },
  { icon: Puzzle,        name: 'Custom',         desc: 'Build your own block',                   accent: C.gold },
];

const featured = BLOCKS.filter(b => b.featured);
const standard = BLOCKS.filter(b => !b.featured);

export function BlockTypesGrid() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--pl-cream-deep)',
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
        borderTop: '1px solid var(--pl-divider)',
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        <SectionHeader
          title="15 modular blocks. Infinite combinations."
          subtitle="Design your entire celebration experience — from cinematic openers to interactive RSVPs."
          inView={inView}
        />

        {/* ── Bento: 3 featured blocks ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {featured.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={b.name}
                className={`pl-enter pl-enter-d${i + 1} rounded-[20px] p-6 md:p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(43,30,20,0.1)]`}
                style={{
                  background: 'color-mix(in oklab, var(--pl-cream-card) 92%, transparent)',
                  border: '1px solid var(--pl-divider)',
                  boxShadow: 'var(--pl-shadow-sm)',
                }}
              >
                <div className="mb-4">
                  <IconCircle icon={Icon} accent={b.accent} size={56} iconSize={26} />
                </div>
                <div
                  className="text-[0.6rem] font-bold uppercase tracking-[0.14em] mb-2"
                  style={{ color: b.accent }}
                >
                  {b.tagline}
                </div>
                <div
                  className="font-heading italic text-[1.3rem] font-semibold mb-2"
                  style={{ color: 'var(--pl-ink)' }}
                >
                  {b.name}
                </div>
                <div
                  className="text-[0.88rem] leading-relaxed"
                  style={{ color: 'var(--pl-muted)', maxWidth: '280px' }}
                >
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Compact grid: remaining blocks ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {standard.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={b.name}
                className={`pl-enter pl-enter-d${Math.min(i + 1, 8)} rounded-[14px] p-4 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 cursor-default`}
                style={{
                  background: 'color-mix(in oklab, var(--pl-cream-card) 78%, transparent)',
                  border: '1px solid var(--pl-divider-soft)',
                }}
              >
                <div className="mb-2">
                  <IconCircle icon={Icon} accent={b.accent} size={40} iconSize={18} />
                </div>
                <div className="font-semibold mb-0.5" style={{ fontSize: text.md, color: 'var(--pl-ink)' }}>
                  {b.name}
                </div>
                <div className="leading-snug" style={{ fontSize: text.sm, color: 'var(--pl-muted)' }}>
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
