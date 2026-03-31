'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Upload, Cpu, Share2 } from 'lucide-react';
import { C } from './colors';

const STEPS = [
  {
    n: '01',
    icon: Upload,
    title: 'Share Your Story',
    body: 'Upload photos, type or speak your story, pick a vibe. That\u2019s it \u2014 we handle the rest.',
    accent: C.olive,
    mockup: {
      heading: 'Tell us about your celebration',
      items: ['Upload 10+ photos', 'Describe your vibe', 'Add event details'],
    },
    cardStyle: { border: `2px dashed ${C.olive}40`, background: 'white' } as React.CSSProperties,
  },
  {
    n: '02',
    icon: Cpu,
    title: 'The Loom Weaves Your World',
    body: 'Our 7-pass engine reads the emotion in your words, the light in your photos, and weaves a visual identity uniquely yours.',
    accent: C.plum,
    mockup: {
      heading: 'The Loom is working\u2026',
      items: ['Reading your photos', 'Weaving your Rind\u2122', 'Crafting your narrative'],
    },
    cardStyle: { border: `2px solid ${C.plum}30`, background: 'rgba(109,89,122,0.04)' } as React.CSSProperties,
  },
  {
    n: '03',
    icon: Share2,
    title: 'Edit, Share, Celebrate',
    body: 'Fine-tune in our studio-grade editor. Send your link. Guests RSVP, leave wishes, and explore your story \u2014 all in one place.',
    accent: C.gold,
    mockup: {
      heading: 'Your site is live!',
      items: ['Drag & drop editor', 'RSVP tracking', 'Guest time capsule'],
    },
    cardStyle: { border: `2px solid ${C.olive}`, background: 'white' } as React.CSSProperties,
  },
];

function StepMockup({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <div
      className="rounded-xl p-5 w-full max-w-[400px]"
      style={step.cardStyle}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="text-[0.62rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: step.accent }}
        >
          {step.mockup.heading}
        </div>
        {step.n === '03' && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {step.mockup.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-bold"
              style={{ background: `${step.accent}15`, color: step.accent }}
            >
              {i + 1}
            </div>
            <span className="text-[0.8rem]" style={{ color: C.ink }}>
              {item}
            </span>
          </div>
        ))}
      </div>
      {/* Progress bar for step 2 */}
      {step.n === '02' && (
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: `${C.plum}15` }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: C.plum }}
            initial={{ width: '0%' }}
            animate={{ width: '72%' }}
            transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      id="how-it-works"
      style={{ background: C.cream, padding: 'clamp(3.5rem,7vw,7rem) 1.25rem' }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* Header — watermark number behind h2 */}
        <div className="text-center mb-10 md:mb-14 relative">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--eg-font-heading)] font-bold select-none pointer-events-none"
            style={{ fontSize: 'clamp(5rem, 12vw, 8rem)', color: C.ink, opacity: 0.03, lineHeight: 1 }}
          >
            3
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight relative"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: C.ink }}
          >
            From photos to a finished site in minutes
          </motion.h2>
        </div>

        {/* Progress line (desktop) — gradient connector */}
        <div className="hidden md:flex justify-center gap-0 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.15 + 0.3 }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[0.8rem] font-bold"
                style={{
                  background: `${s.accent}18`,
                  color: s.accent,
                  border: `2px solid ${s.accent}40`,
                }}
              >
                {s.n}
              </motion.div>
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ delay: i * 0.15 + 0.45, duration: 0.5 }}
                  className="w-32 h-0.5 origin-left"
                  style={{ background: `linear-gradient(to right, ${STEPS[i].accent}60, ${STEPS[i + 1].accent}60)` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-16 md:gap-20">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isEven = i % 2 === 1;
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15 + 0.3, duration: 0.6 }}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Text side */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: `${s.accent}15` }}
                    >
                      <Icon size={18} style={{ color: s.accent }} />
                    </div>
                    <span
                      className="font-[family-name:var(--eg-font-heading)] text-[3.5rem] font-bold leading-none"
                      style={{ color: `${s.accent}20` }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3
                    className="font-[family-name:var(--eg-font-heading)] font-bold text-[1.3rem] mb-3"
                    style={{ color: C.ink }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-[0.92rem] leading-relaxed max-w-[400px] mx-auto md:mx-0"
                    style={{ color: C.muted, lineHeight: 1.8 }}
                  >
                    {s.body}
                  </p>
                </div>

                {/* Mockup side */}
                <div className="flex-shrink-0">
                  <StepMockup step={s} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
