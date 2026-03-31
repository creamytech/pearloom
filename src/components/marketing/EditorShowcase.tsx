'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  Layers,
  LayoutGrid,
  Monitor,
  GripVertical,
  Undo2,
  Command,
  PenLine,
  Columns2,
  ZoomIn,
} from 'lucide-react';
import { C } from './colors';
import { text, radius } from '@/lib/design-tokens';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/marketing/SectionHeader';

const FEATURE_GROUPS = [
  {
    label: 'Layout',
    tint: C.olive,
    items: [
      { icon: Layers, label: '15 Block Types' },
      { icon: LayoutGrid, label: '6 Layouts' },
      { icon: Columns2, label: 'Split View' },
    ],
  },
  {
    label: 'Editing',
    tint: C.plum,
    items: [
      { icon: GripVertical, label: 'Drag & Drop' },
      { icon: Undo2, label: 'Undo / Redo' },
      { icon: Command, label: 'Command Palette' },
      { icon: PenLine, label: 'AI Rewrite' },
    ],
  },
  {
    label: 'Preview',
    tint: C.gold,
    items: [
      { icon: Monitor, label: 'Device Preview' },
      { icon: ZoomIn, label: 'Zoom Controls' },
    ],
  },
];

/* Stylized editor mockup built with divs */
function EditorMockup() {
  return (
    <div className="relative">
    <div
      className="rounded-xl border overflow-hidden relative z-10"
      style={{
        borderColor: C.divider,
        boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: 'rgba(255,255,255,0.9)', borderColor: C.divider }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: C.olive }} />
          <span className="font-semibold" style={{ fontSize: text.xs }}>
            Emma & James
          </span>
          <span style={{ fontSize: text.xs, color: C.muted }}>
            / Story / Our Beginning
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded font-semibold" style={{ fontSize: text.xs, background: `${C.olive}15`, color: C.olive }}>
            Preview
          </div>
          <div className="px-2 py-0.5 rounded font-semibold" style={{ fontSize: text.xs, background: C.olive, color: 'white' }}>
            Publish
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex" style={{ minHeight: 280, maxHeight: 420, height: 'clamp(280px, 40vw, 360px)', background: C.cream }}>
        {/* Sidebar */}
        <div
          className="w-[180px] border-r p-3 flex-shrink-0 hidden sm:block"
          style={{ borderColor: C.divider, background: 'rgba(255,255,255,0.5)' }}
        >
          <div className="font-bold tracking-[0.12em] uppercase mb-3" style={{ fontSize: text.xs, color: C.muted }}>
            Chapters
          </div>
          {['Our Beginning', 'The Proposal', 'Wedding Day', 'Photo Gallery'].map((ch, i) => (
            <div
              key={ch}
              className="flex items-center gap-2 py-1.5 px-2 rounded-md mb-1"
              style={{
                fontSize: text.sm,
                background: i === 0 ? `${C.olive}10` : 'transparent',
                color: i === 0 ? C.ink : C.muted,
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              <GripVertical size={10} style={{ opacity: 0.3 }} />
              {ch}
            </div>
          ))}

          <div className="font-bold tracking-[0.12em] uppercase mt-4 mb-2" style={{ fontSize: text.xs, color: C.muted }}>
            Add Block
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {['Story', 'Gallery', 'RSVP', 'Timeline'].map(b => (
              <div
                key={b}
                className="text-center py-1.5 rounded font-medium"
                style={{ fontSize: text.xs, background: 'rgba(0,0,0,0.03)', color: C.muted }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <div
            className="w-full max-w-[300px] rounded-lg border p-5 text-center"
            style={{ background: 'white', borderColor: `${C.olive}30` }}
          >
            <div className="font-bold tracking-[0.16em] uppercase mb-2" style={{ fontSize: text.xs, color: C.olive }}>
              Chapter 1
            </div>
            <div
              className="font-[family-name:var(--eg-font-heading)] text-[1.1rem] font-bold italic mb-2"
              style={{ color: C.ink }}
            >
              Our Beginning
            </div>
            <div className="leading-relaxed" style={{ fontSize: text.sm, color: C.muted }}>
              It started with a coffee that lasted four hours and a conversation that
              never really ended...
            </div>
            {/* Fake image placeholder */}
            <div
              className="w-full h-14 rounded-md mt-3"
              style={{ background: `linear-gradient(135deg, ${C.gold}30, ${C.plum}15)` }}
            />
          </div>
          {/* Second content block — faux photo grid */}
          <div className="w-full max-w-[300px] flex gap-2">
            {[C.gold, C.olive, C.plum, C.gold].map((color, j) => (
              <div
                key={j}
                className="flex-1 h-10 rounded-md"
                style={{ background: `${color}20` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    {/* Reflection beneath the mockup */}
    <div
      className="absolute left-[5%] right-[5%] -bottom-3 h-8 rounded-xl z-0"
      style={{
        background: `linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 100%)`,
        filter: 'blur(8px)',
      }}
    />
    </div>
  );
}

export function EditorShowcase() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      id="editor"
      className="relative overflow-hidden"
      style={{ background: C.cream, padding: 'clamp(4.5rem,8vw,8rem) 1.25rem' }}
    >
      {/* Faint dot pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(${C.muted}18 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="max-w-[960px] mx-auto relative z-10">
        {/* Header */}
        <SectionHeader
          pill={{ label: 'The Editor', sparkle: true }}
          title="Design like a studio. Edit like a pro."
          subtitle={<>A Webflow-grade visual editor that&rsquo;s actually easy to use. Drag blocks, tweak your Rind, preview on any device — no code required.</>}
          inView={inView}
        />

        {/* Editor mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mb-16"
        >
          <EditorMockup />
        </motion.div>

        {/* Feature groups — prominent stat-style cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[720px] mx-auto"
        >
          {FEATURE_GROUPS.map(group => (
            <div
              key={group.label}
              className="rounded-xl border p-5"
              style={{
                background: `${group.tint}06`,
                borderColor: `${group.tint}18`,
              }}
            >
              <div
                className="font-bold tracking-[0.14em] uppercase mb-4"
                style={{ fontSize: text.xs, color: group.tint }}
              >
                {group.label}
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map(f => {
                  const Icon = f.icon;
                  // Extract leading number from label (e.g. "15" from "15 Block Types")
                  const numMatch = f.label.match(/^(\d+)\s+(.+)$/);
                  return (
                    <div
                      key={f.label}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${group.tint}18`,
                          boxShadow: `0 0 8px ${group.tint}12`,
                        }}
                      >
                        <Icon size={13} style={{ color: group.tint }} />
                      </div>
                      {numMatch ? (
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="font-[family-name:var(--eg-font-heading)] font-extrabold"
                            style={{ fontSize: text.xl, color: C.ink, lineHeight: 1 }}
                          >
                            {numMatch[1]}
                          </span>
                          <span
                            className="font-medium"
                            style={{ fontSize: text.sm, color: C.dark }}
                          >
                            {numMatch[2]}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="font-medium"
                          style={{ fontSize: text.sm, color: C.dark }}
                        >
                          {f.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
