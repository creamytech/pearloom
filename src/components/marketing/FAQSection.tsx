'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { C } from './colors';

const FAQS = [
  {
    q: 'Is it really free to start?',
    a: 'Yes! Create your site with The Loom, get your custom Rind\u2122 visual identity, and share it with a Pearloom link \u2014 all completely free. Upgrade to Premium only when you want extras like a custom domain, all 15 block types, and full guest management.',
  },
  {
    q: 'How long does it take to create a site?',
    a: 'Most people go from zero to a live site in under 5 minutes. Upload your photos, describe your vibe, and The Loom handles the rest. You can then fine-tune in the editor for as long as you like.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Absolutely. Premium sites can connect a custom domain (like emma-and-james.com). We handle the SSL certificate and DNS setup for you.',
  },
  {
    q: 'Is my data secure?',
    a: 'Your photos and data are encrypted at rest and in transit. We never share your personal information. You can delete your site and all associated data at any time.',
  },
  {
    q: 'What types of events does Pearloom support?',
    a: 'Weddings, engagements, anniversaries, birthdays, reunions, graduations, retirements, quincea\u00f1eras \u2014 any celebration worth remembering. The Loom adapts its narrative style and visual identity to match your occasion.',
  },
  {
    q: 'Can I edit my site after publishing?',
    a: 'Of course! Your site is a living document. Edit the narrative, add new chapters, update photos, swap blocks \u2014 all changes go live instantly. No need to republish.',
  },
];

function FAQItem({ faq, isOpen, onToggle }: { faq: (typeof FAQS)[number]; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: C.divider }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer bg-transparent border-none"
      >
        <span
          className="font-[family-name:var(--eg-font-heading)] text-[1.02rem] font-semibold pr-4"
          style={{ color: C.ink }}
        >
          {faq.q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={18} style={{ color: C.muted }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p
              className="pb-5 text-[0.88rem] leading-relaxed pl-3"
              style={{ color: C.muted, lineHeight: 1.75, borderLeft: `3px solid ${C.olive}` }}
            >
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      ref={ref}
      id="faq"
      style={{ background: C.cream, padding: '7rem 1.5rem' }}
    >
      <div className="max-w-[700px] mx-auto">
        {/* Header — simple label */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="mb-4"
          >
            <span
              className="text-[0.68rem] font-bold tracking-[0.14em] uppercase"
              style={{ color: C.olive }}
            >
              FAQ
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: C.ink }}
          >
            Questions? Woven answers.
          </motion.h2>
        </div>

        {/* Accordion — clean white card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border p-1 sm:p-6"
          style={{
            background: 'white',
            borderColor: C.divider,
          }}
        >
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
