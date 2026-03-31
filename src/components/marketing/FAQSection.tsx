'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

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

export function FAQSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      id="faq"
      style={{ background: C.cream, padding: `${sectionPadding.y} ${sectionPadding.x}` }}
    >
      <div style={{ maxWidth: layout.narrowWidth, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="FAQ"
          title="Questions? Woven answers."
          inView={inView}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="p-5 sm:p-8"
          style={{
            borderRadius: card.radius,
            background: card.bg,
            border: card.border,
            boxShadow: card.shadow,
          }}
        >
          <Accordion type="single" collapsible defaultValue="faq-0">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
