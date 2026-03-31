'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Upload, Cpu, Share2 } from 'lucide-react';
import { colors as C, text, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { IconCircle } from '@/components/ui/IconCircle';
import { Card } from '@/components/ui';

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
  },
];

function StepMockup({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <Card variant="elevated" padding="md" className="w-full max-w-[400px]">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="font-bold tracking-[0.16em] uppercase"
          style={{ fontSize: text.xs, color: step.accent }}
        >
          {step.mockup.heading}
        </div>
        {step.n === '03' && (
          <div className="w-2 h-2 rounded-full" style={{ background: C.olive }} />
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {step.mockup.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
              style={{ fontSize: text.xs, background: `${step.accent}15`, color: step.accent }}
            >
              {i + 1}
            </div>
            <span style={{ fontSize: text.sm, color: C.ink }}>
              {item}
            </span>
          </div>
        ))}
      </div>
      {/* Progress bar for step 2 */}
      {step.n === '02' && (
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: `${C.plum}15` }}>
          <div
            className="h-full rounded-full"
            style={{ background: C.plum, width: '72%' }}
          />
        </div>
      )}
    </Card>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      id="how-it-works"
      style={{ background: C.cream, padding: `${sectionPadding.y} ${sectionPadding.x}` }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        <SectionHeader
          watermark="3"
          title="From photos to a finished site in minutes"
          inView={inView}
        />

        {/* Progress line (desktop) — elegant gold connector */}
        <div className="hidden md:flex justify-center gap-0 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.15 + 0.3 }}
                className="w-10 h-10 rounded-full flex items-center justify-center font-[family-name:var(--eg-font-heading)]"
                style={{
                  fontSize: text.sm,
                  fontWeight: 700,
                  background: s.accent,
                  color: '#fff',
                }}
              >
                {s.n}
              </motion.div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-32"
                  style={{ height: 1, background: C.gold }}
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
                    <IconCircle icon={Icon} accent={s.accent} size={48} iconSize={22} />
                  </div>
                  <h3
                    className="font-[family-name:var(--eg-font-heading)] mb-3"
                    style={{ fontSize: text.xl, fontWeight: 600, color: C.ink }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="font-[family-name:var(--eg-font-body)] max-w-[400px] mx-auto md:mx-0"
                    style={{ fontSize: text.md, color: C.muted, lineHeight: 1.8 }}
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
