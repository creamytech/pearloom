'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const FAQS = [
  {
    q: 'Is it really free to start?',
    a: 'Yes. Create your site, get your custom visual identity, and share it on a Pearloom link — completely free, forever. Upgrade to Atelier ($19 one-time) when you want extras like a custom domain, all 19+ block types, seating charts, and full guest management.',
  },
  {
    q: "What's the difference between Journal, Atelier, and Legacy?",
    a: 'Journal (free) gives you everything to launch a beautiful site: AI generation, your visual identity, 7 block types, and up to 150 guest RSVPs. Atelier ($19 one-time per celebration) unlocks the full platform for a single event — all 19+ blocks, unlimited guests, seating charts, bulk messaging, AI concierge, 9-language translations, analytics, Save the Date cards, hashtag generator, time capsule, and guestbook. Legacy ($12/month) gives you Atelier for every celebration, forever, plus anniversary mode, coordinator collaboration, and early AI features.',
  },
  {
    q: 'Do I need a subscription?',
    a: 'No. Atelier is a one-time payment per celebration — pay once and that site is yours with no recurring charges. Legacy is a monthly subscription for couples who want to use Pearloom for multiple occasions (anniversaries, birthdays, future celebrations) without paying per event.',
  },
  {
    q: 'How long does it take to create a site?',
    a: 'Most people go from zero to a live site in under 5 minutes. Upload your photos, describe your vibe, and The Loom handles the rest — seven AI passes, one extraordinary site. You can then fine-tune in the editor for as long as you like.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Absolutely. Atelier and Legacy sites can connect a custom domain (like emma-and-james.com). We handle SSL and DNS setup for you. Journal sites live at pearloom.com/sites/yourname.',
  },
  {
    q: 'What languages are supported?',
    a: 'Pair and Perennial include AI translation into 9 languages: Spanish, French, Italian, Portuguese, German, Japanese, Chinese (Simplified), Hebrew, and Arabic. Translations are generated per chapter and stored independently so your guests can read the site in their preferred language.',
  },
  {
    q: 'What happens after the wedding?',
    a: 'Your site stays live forever on your plan. With Legacy, it automatically transitions into anniversary mode after your wedding date — preserving your story, unlocking time capsule messages on anniversaries, and letting you add new chapters as your life together continues.',
  },
  {
    q: 'What types of events does Pearloom support?',
    a: 'Weddings, engagements, anniversaries, birthdays, reunions, graduations, retirements, quinceañeras — any celebration worth remembering. The Loom adapts its narrative style and visual identity to match your occasion.',
  },
  {
    q: 'Can I edit my site after publishing?',
    a: "Of course. Your site is a living document. Edit the narrative, add chapters, update photos, swap blocks, invite new guests — changes go live instantly. No need to republish.",
  },
  {
    q: 'Is my data secure?',
    a: 'Your photos and data are encrypted at rest and in transit. We never share your personal information with third parties. You can delete your site and all associated data at any time.',
  },
];

export function FAQSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });

  return (
    <section
      ref={ref}
      id="faq"
      style={{ background: 'var(--pl-cream)', padding: `${sectionPadding.y} ${sectionPadding.x}` }}
    >
      <div style={{ maxWidth: layout.narrowWidth, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="FAQ"
          title="Your questions, answered."
          inView={inView}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="p-5 sm:p-8"
          style={{
            borderRadius: card.radius,
            background: 'var(--pl-cream-card)',
            border: '1px solid var(--pl-divider)',
            boxShadow: 'var(--pl-shadow-sm)',
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
