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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[0.7rem] font-bold tracking-[0.14em] uppercase"
      style={{ background: 'rgba(163,177,138,0.12)', border: '1px solid rgba(163,177,138,0.3)', color: C.olive }}
    >
      {children}
    </span>
  );
}

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
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: C.divider,
        boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: 'rgba(255,255,255,0.9)', borderColor: C.divider }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: C.olive }} />
          <span className="text-[0.7rem] font-semibold" style={{ color: C.ink }}>
            Emma & James
          </span>
          <span className="text-[0.6rem]" style={{ color: C.muted }}>
            / Story / Our Beginning
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded text-[0.55rem] font-semibold" style={{ background: `${C.olive}15`, color: C.olive }}>
            Preview
          </div>
          <div className="px-2 py-0.5 rounded text-[0.55rem] font-semibold" style={{ background: C.olive, color: 'white' }}>
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
          <div className="text-[0.58rem] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: C.muted }}>
            Chapters
          </div>
          {['Our Beginning', 'The Proposal', 'Wedding Day', 'Photo Gallery'].map((ch, i) => (
            <div
              key={ch}
              className="flex items-center gap-2 py-1.5 px-2 rounded-md mb-1 text-[0.72rem]"
              style={{
                background: i === 0 ? `${C.olive}10` : 'transparent',
                color: i === 0 ? C.ink : C.muted,
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              <GripVertical size={10} style={{ opacity: 0.3 }} />
              {ch}
            </div>
          ))}

          <div className="text-[0.58rem] font-bold tracking-[0.12em] uppercase mt-4 mb-2" style={{ color: C.muted }}>
            Add Block
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {['Story', 'Gallery', 'RSVP', 'Timeline'].map(b => (
              <div
                key={b}
                className="text-center py-1.5 rounded text-[0.58rem] font-medium"
                style={{ background: 'rgba(0,0,0,0.03)', color: C.muted }}
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
            <div className="text-[0.55rem] font-bold tracking-[0.16em] uppercase mb-2" style={{ color: C.olive }}>
              Chapter 1
            </div>
            <div
              className="font-[family-name:var(--eg-font-heading)] text-[1.1rem] font-bold italic mb-2"
              style={{ color: C.ink }}
            >
              Our Beginning
            </div>
            <div className="text-[0.72rem] leading-relaxed" style={{ color: C.muted }}>
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
  );
}

export function EditorShowcase() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      id="editor"
      style={{ background: C.cream, padding: 'clamp(3.5rem,7vw,7rem) 1.25rem' }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="mb-4"
          >
            <Pill>
              <Sparkles size={9} strokeWidth={2.5} /> The Editor
            </Pill>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: C.ink }}
          >
            Design like a studio. Edit like a pro.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-[0.95rem] max-w-[480px] mx-auto"
            style={{ color: C.muted, lineHeight: 1.75 }}
          >
            A Webflow-grade visual editor that&rsquo;s actually easy to use. Drag blocks, tweak
            your Rind, preview on any device — no code required.
          </motion.p>
        </div>

        {/* Editor mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mb-10"
        >
          <EditorMockup />
        </motion.div>

        {/* Feature pills — grouped by category with tinted backgrounds */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-6"
        >
          {FEATURE_GROUPS.map(group => (
            <div key={group.label} className="flex flex-wrap items-center gap-2">
              {group.items.map(f => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.label}
                    whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[0.78rem] font-medium transition-all duration-200"
                    style={{
                      background: `${group.tint}08`,
                      borderColor: `${group.tint}20`,
                      color: C.dark,
                    }}
                  >
                    <Icon size={14} style={{ color: group.tint }} />
                    {f.label}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
