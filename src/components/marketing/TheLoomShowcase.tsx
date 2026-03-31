'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  Eye,
  Mountain,
  Heart,
  GitBranch,
  Star,
  Dna,
  Layers,
  Palette,
  Type,
  Brush,
  ImageIcon,
  Wind,
} from 'lucide-react';
import { C } from './colors';
import { text } from '@/lib/design-tokens';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { IconCircle } from '@/components/ui/IconCircle';

/* ── 7-Pass Engine Visualization ── */
const PASSES = [
  { icon: Eye, label: 'Face Detection', desc: 'Finds the people who matter in every frame', color: '#B4838D' },
  { icon: Mountain, label: 'Scene Understanding', desc: 'Beach sunset, backyard party, candlelit dinner', color: C.olive },
  { icon: Heart, label: 'Emotional Mapping', desc: 'The laughter, the tears, the quiet moments', color: '#D4838D' },
  { icon: GitBranch, label: 'Narrative Threading', desc: 'Weaves moments into a coherent story', color: C.plum },
  { icon: Star, label: 'Moment Ranking', desc: 'Knows which photos matter most', color: C.gold },
  { icon: Dna, label: 'Event DNA', desc: 'Extracts what makes this celebration yours', color: '#7B6BA4' },
  { icon: Layers, label: 'Timeline Weaving', desc: 'Orders everything into a beautiful flow', color: C.olive },
];

function LoomEngine() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <div ref={ref} className="mb-20">
      <div className="text-center mb-10">
        <h3
          className="font-[family-name:var(--eg-font-heading)] font-bold text-[1.5rem] mb-3"
          style={{ color: '#F5F1E8' }}
        >
          Your photos tell a story. The Loom reads it.
        </h3>
        <p className="max-w-[480px] mx-auto" style={{ fontSize: text.base, color: 'rgba(245,241,232,0.55)', lineHeight: 1.75 }}>
          Seven passes. Every photo analyzed for faces, scenes, emotions, and narrative connections.
          The result: a story only you could tell.
        </p>
      </div>

      {/* 7-pass waterfall */}
      <div className="max-w-[560px] mx-auto relative">
        {/* Vertical thread line */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : {}}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute left-[23px] top-0 bottom-0 w-px origin-top"
          style={{ background: `linear-gradient(to bottom, ${C.plum}60, ${C.olive}60)` }}
        />

        <div className="flex flex-col gap-4">
          {PASSES.map((pass, i) => {
            const Icon = pass.icon;
            return (
              <motion.div
                key={pass.label}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.12 + 0.2, duration: 0.5 }}
                className="flex items-start gap-4 pl-1"
              >
                {/* Node */}
                <div className="relative z-10" style={{ border: `2px solid ${pass.color}35`, borderRadius: '50%', boxShadow: `0 0 16px ${pass.color}25` }}>
                  <IconCircle icon={Icon} accent={pass.color} size={46} iconSize={18} />
                </div>

                {/* Content */}
                <div className="pt-2">
                  <div
                    className="font-bold tracking-[0.12em] uppercase mb-0.5"
                    style={{ fontSize: text.xs, color: pass.color }}
                  >
                    Pass {i + 1} · {pass.label}
                  </div>
                  <p style={{ fontSize: text.base, color: 'rgba(245,241,232,0.5)', lineHeight: 1.6 }}>
                    {pass.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Rind™ Showcase ── */
const RIND_EXAMPLES = [
  {
    name: 'Garden Party',
    palette: ['#B4838D', '#E8D5C4', '#6D8B74', '#F5E6D3', '#8B7355'],
    font: 'Playfair Display',
  },
  {
    name: 'Modern Minimalist',
    palette: ['#2B2B2B', '#F5F1E8', '#9A9488', '#D6C6A8', '#E6DFD2'],
    font: 'Inter',
  },
  {
    name: 'Coastal Breeze',
    palette: ['#4A7C8F', '#E8F0ED', '#B5CFC7', '#F0E6D3', '#6B9FAF'],
    font: 'Lora',
  },
];

const RIND_FEATURES = [
  { icon: Palette, label: 'Color palette', desc: 'Custom 5-color palette from your vibe' },
  { icon: Type, label: 'Typography', desc: 'Perfectly paired heading & body fonts' },
  { icon: Brush, label: 'Textures & elements', desc: 'Decorative motifs woven from your story' },
  { icon: ImageIcon, label: 'Hero artwork', desc: 'AI-generated visuals unique to you' },
  { icon: Wind, label: 'Ambient particles', desc: 'Floating elements that match your mood' },
];

function RindShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <div ref={ref} className="mb-20">
      <div className="text-center mb-10">
        <h3
          className="font-[family-name:var(--eg-font-heading)] font-bold text-[1.5rem] mb-3"
          style={{ color: '#F5F1E8' }}
        >
          Every pear has a unique skin. So does every celebration.
        </h3>
        <p className="max-w-[500px] mx-auto" style={{ fontSize: text.base, color: 'rgba(245,241,232,0.55)', lineHeight: 1.75 }}>
          Your <strong style={{ color: '#F5F1E8' }}>Rind</strong> is the visual layer that wraps your
          entire site — colors, typography, artwork, and atmosphere — all woven by The Loom from
          your personality and vibe keywords.
        </p>
      </div>

      {/* 3 Rind examples */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[680px] mx-auto mb-10">
        {RIND_EXAMPLES.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.12 + 0.2, duration: 0.5 }}
            className="rounded-xl border p-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="font-bold tracking-[0.14em] uppercase mb-3" style={{ fontSize: text.xs, color: 'rgba(245,241,232,0.5)' }}>
              {r.name}
            </div>
            {/* Color swatches */}
            <div className="flex justify-center gap-1.5 mb-3">
              {r.palette.map((c, j) => (
                <div
                  key={j}
                  className="w-9 h-9 rounded-full border"
                  style={{ background: c, borderColor: 'rgba(255,255,255,0.15)' }}
                />
              ))}
            </div>
            <div className="italic" style={{ fontSize: text.sm, color: 'rgba(245,241,232,0.45)', fontFamily: r.font }}>
              {r.font}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rind features */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-[700px] mx-auto">
        {RIND_FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 + 0.5, duration: 0.4 }}
              className="text-center"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ background: 'rgba(109,89,122,0.2)' }}
              >
                <Icon size={16} style={{ color: C.plum }} />
              </div>
              <div className="font-semibold" style={{ fontSize: text.xs, color: '#F5F1E8' }}>
                {f.label}
              </div>
              <div style={{ fontSize: text.xs, color: 'rgba(245,241,232,0.45)', lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Event DNA ── */
function EventDNA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-[600px] mx-auto rounded-2xl border p-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Dna size={32} style={{ color: C.plum, margin: '0 auto 1rem', opacity: 0.8 }} />
        <h3
          className="font-[family-name:var(--eg-font-heading)] font-bold text-[1.3rem] mb-3"
          style={{ color: '#F5F1E8' }}
        >
          Event DNA Illustrations
        </h3>
        <p className="mb-6" style={{ fontSize: text.md, color: 'rgba(245,241,232,0.55)', lineHeight: 1.75 }}>
          Mention cats, mountains, or your favourite song — and your site&rsquo;s artwork will
          reference them. The Loom extracts the details that make your celebration yours and weaves
          them into bespoke illustrations.
        </p>

        {/* Example DNA tags */}
        <div className="flex flex-wrap justify-center gap-2">
          {['loves hiking', 'two cats', 'met in Paris', 'jazz music', 'autumn vibes', 'beach lovers'].map(
            tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full font-medium"
                style={{
                  fontSize: text.xs,
                  background: 'rgba(163,177,138,0.15)',
                  color: '#B5C9A0',
                  border: '1px solid rgba(163,177,138,0.3)',
                }}
              >
                {tag}
              </span>
            ),
          )}
        </div>
        <p className="mt-4 italic" style={{ fontSize: text.sm, color: 'rgba(245,241,232,0.4)' }}>
          Each tag becomes a thread in your site&rsquo;s visual tapestry.
        </p>
      </motion.div>
    </div>
  );
}

/* ── Main Export ── */
export function TheLoomShowcase() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.05 });

  return (
    <section
      ref={ref}
      id="the-loom"
      style={{
        background: 'linear-gradient(180deg, #1E1B24 0%, #2A2233 50%, #1E1B24 100%)',
        padding: 'clamp(3.5rem,7vw,7rem) 1.25rem',
      }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Section header */}
        <SectionHeader
          dark
          pill={{ label: 'The Loom', sparkle: true, variant: 'plum' }}
          title="Meet The Loom."
          subtitle={<>Every Pearloom site is woven — not assembled. The Loom reads your photos, understands your vibe, and threads together a site that&rsquo;s unmistakably yours. Weddings, birthdays, reunions — whatever the occasion.</>}
          inView={inView}
        />

        <LoomEngine />
        <RindShowcase />
        <EventDNA />
      </div>
    </section>
  );
}
