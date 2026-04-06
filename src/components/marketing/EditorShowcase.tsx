'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Layers,
  LayoutGrid,
  Monitor,
  GripVertical,
  Undo2,
  Command,
  PenLine,
  Columns2,
  ZoomIn,
  MousePointer2,
} from 'lucide-react';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const FEATURE_ITEMS = [
  { icon: Layers, label: '15 Block Types' },
  { icon: LayoutGrid, label: '6 Layouts' },
  { icon: Columns2, label: 'Split View' },
  { icon: GripVertical, label: 'Drag & Drop' },
  { icon: Undo2, label: 'Undo / Redo' },
  { icon: Command, label: 'Command Palette' },
  { icon: PenLine, label: 'AI Rewrite' },
  { icon: Monitor, label: 'Device Preview' },
  { icon: ZoomIn, label: 'Zoom Controls' },
];

/* Stylized editor mockup with animated cursor */
function EditorMockup() {
  const [typingIdx, setTypingIdx] = useState(0);
  const storyText = 'It started with a coffee that lasted four hours and a conversation that never really ended...';

  useEffect(() => {
    if (typingIdx >= storyText.length) return;
    const t = setTimeout(() => setTypingIdx(i => i + 1), 40);
    return () => clearTimeout(t);
  }, [typingIdx, storyText.length]);

  // Reset typing animation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => setTypingIdx(0), 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative"
      style={{
        borderRadius: card.radius,
        border: card.border,
        boxShadow: '0 25px 80px rgba(43,30,20,0.12), 0 8px 24px rgba(43,30,20,0.06)',
        background: card.bg,
        overflow: 'hidden',
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: card.border, background: 'rgba(250,247,242,0.8)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
          </div>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: C.olive }} />
            <span className="font-semibold" style={{ fontSize: text.xs }}>
              Emma & James
            </span>
            <span style={{ fontSize: text.xs, color: C.muted }}>
              / Story / Our Beginning
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-md font-semibold" style={{ fontSize: text.xs, background: `${C.olive}1A`, color: C.olive }}>
            Preview
          </div>
          <div className="px-3 py-1 rounded-md font-semibold" style={{ fontSize: text.xs, background: C.olive, color: 'white' }}>
            Publish
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex" style={{ minHeight: 340, maxHeight: 480, height: 'clamp(340px, 45vw, 440px)', background: C.cream }}>
        {/* Sidebar */}
        <div
          className="w-[200px] p-4 flex-shrink-0 hidden sm:block"
          style={{ borderRight: card.border, background: card.bg }}
        >
          <div className="font-bold tracking-[0.12em] uppercase mb-3" style={{ fontSize: text.xs, color: C.muted }}>
            Chapters
          </div>
          {['Our Beginning', 'The Proposal', 'Wedding Day', 'Photo Gallery'].map((ch, i) => (
            <div
              key={ch}
              className="flex items-center gap-2 py-2 px-2.5 rounded-lg mb-1 transition-colors duration-150"
              style={{
                fontSize: text.sm,
                background: i === 0 ? `${C.olive}1A` : 'transparent',
                color: i === 0 ? C.ink : C.muted,
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              <GripVertical size={10} style={{ opacity: 0.3 }} />
              {ch}
            </div>
          ))}

          <div className="font-bold tracking-[0.12em] uppercase mt-5 mb-2" style={{ fontSize: text.xs, color: C.muted }}>
            Add Block
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {['Story', 'Gallery', 'RSVP', 'Timeline'].map(b => (
              <div
                key={b}
                className="text-center py-2 rounded-md font-medium cursor-pointer transition-all duration-150 hover:scale-[1.02]"
                style={{ fontSize: text.xs, background: `${C.divider}66`, color: C.muted }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 relative">
          {/* Animated cursor */}
          <motion.div
            className="absolute z-20 pointer-events-none"
            animate={{
              x: [60, 120, 80, 140, 60],
              y: [40, 100, 160, 80, 40],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <MousePointer2 size={16} style={{ color: C.plum, filter: `drop-shadow(0 2px 4px rgba(109,89,122,0.3))` }} />
          </motion.div>

          <div
            className="w-full max-w-[340px] rounded-xl p-6 text-center relative"
            style={{ background: card.bg, border: card.border, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <div className="font-bold tracking-[0.16em] uppercase mb-2" style={{ fontSize: text.xs, color: C.olive }}>
              Chapter 1
            </div>
            <div
              className="font-heading text-[1.2rem] font-bold italic mb-3"
              style={{ color: C.ink }}
            >
              Our Beginning
            </div>
            <div className="leading-relaxed text-left" style={{ fontSize: text.sm, color: C.muted, minHeight: '2.5rem' }}>
              {storyText.slice(0, typingIdx)}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
                style={{ background: C.olive }}
              />
            </div>
            {/* Placeholder image */}
            <div
              className="w-full h-16 rounded-lg mt-4"
              style={{ background: `linear-gradient(135deg, ${C.gold}4D, ${C.plum}26)` }}
            />
          </div>
          {/* Photo grid placeholder */}
          <div className="w-full max-w-[340px] flex gap-2">
            {[C.gold, C.olive, C.plum, C.gold].map((color, j) => (
              <motion.div
                key={j}
                className="flex-1 h-12 rounded-lg"
                style={{ background: `${color}33` }}
                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
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
      className="relative overflow-hidden"
      style={{ background: C.cream, padding: `${sectionPadding.y} ${sectionPadding.x}` }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        {/* Header */}
        <SectionHeader
          pill={{ label: 'The Editor', sparkle: true }}
          title="Design like a studio. Edit like a pro."
          subtitle={<>A Webflow-grade visual editor that&rsquo;s actually easy to use. Drag blocks, tweak your Rind, preview on any device — no code required.</>}
          inView={inView}
        />

        {/* Editor mockup — enlarged */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mb-12"
        >
          <EditorMockup />
        </motion.div>

        {/* Feature grid — tabbed into 3 groups */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="max-w-[520px] mx-auto"
        >
          <Tabs defaultValue="visual">
            <div className="flex justify-center mb-2">
              <TabsList>
                <TabsTrigger value="visual">Visual Editor</TabsTrigger>
                <TabsTrigger value="ai">AI Powers</TabsTrigger>
                <TabsTrigger value="collab">Collaboration</TabsTrigger>
              </TabsList>
            </div>
            {[
              { value: 'visual', items: FEATURE_ITEMS.slice(0, 3) },
              { value: 'ai', items: FEATURE_ITEMS.slice(3, 6) },
              { value: 'collab', items: FEATURE_ITEMS.slice(6, 9) },
            ].map(group => (
              <TabsContent key={group.value} value={group.value}>
                <div className="grid grid-cols-3 gap-4">
                  {group.items.map(f => {
                    const Icon = f.icon;
                    return (
                      <div key={f.label} className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `${C.olive}1A` }}
                        >
                          <Icon size={13} style={{ color: C.olive }} />
                        </div>
                        <span className="font-medium" style={{ fontSize: text.sm, color: C.dark }}>
                          {f.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
    </section>
  );
}
