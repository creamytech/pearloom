'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/faq/page.tsx — Premium FAQ Page
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { ThemeProvider } from '@/components/theme-provider';
import type { SitePage, ThemeSchema, FaqItem } from '@/types';

const NAMES: [string, string] = ['Ben', 'Shauna'];

const PAGES: SitePage[] = [
  { id: 'pg-1', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
  { id: 'pg-2', slug: 'details', label: 'Details', enabled: true, order: 1 },
  { id: 'pg-3', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 },
  { id: 'pg-4', slug: 'photos', label: 'Photos', enabled: true, order: 3 },
  { id: 'pg-5', slug: 'faq', label: 'FAQ', enabled: true, order: 4 },
];

const THEME: ThemeSchema = {
  name: 'pearloom-ivory',
  fonts: { heading: 'Playfair Display', body: 'Inter' },
  colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
  borderRadius: '1rem',
};

const FAQS: FaqItem[] = [
  { id: 'faq-1', question: 'What should I wear?', answer: 'Cocktail attire — think elevated but comfortable. We want you to feel your best. Think elegant dinner party, not black tie gala.', order: 0 },
  { id: 'faq-2', question: 'Can I bring a plus one?', answer: 'Absolutely! Just make sure to include their name in your RSVP so we can plan accordingly. The more the merrier.', order: 1 },
  { id: 'faq-3', question: 'Is there parking available?', answer: 'Yes! Complimentary valet parking is available at the venue. There\'s also a self-parking garage next door for $10.', order: 2 },
  { id: 'faq-4', question: 'What about dietary restrictions?', answer: 'We\'ve got you covered. Please note any dietary needs in your RSVP — whether it\'s allergies, vegetarian, vegan, kosher, or anything else.', order: 3 },
  { id: 'faq-5', question: 'Can I share photos on social media?', answer: 'Yes please! We\'d love for you to share. Also head to our Photos page to upload your pictures directly.', order: 4 },
  { id: 'faq-6', question: 'What time should I arrive?', answer: 'Cocktails begin at 7:00 PM. We suggest arriving by 6:45 PM so you can settle in and grab a drink.', order: 5 },
  { id: 'faq-7', question: 'Will there be an open bar?', answer: 'You know it. Full open bar all night — cocktails, wine, beer, and a custom signature drink we created just for the occasion.', order: 6 },
  { id: 'faq-8', question: 'Who do I contact with questions?', answer: 'Reach out to either of us directly! You can text, call, or email. We\'re an open book.', order: 7 },
];

function FaqAccordion({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 0',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'var(--pl-font-body)',
        }}
      >
        <span style={{
          color: 'var(--pl-ink)',
          fontWeight: 500,
          fontSize: '0.95rem',
          paddingRight: '1rem',
          lineHeight: 1.5,
        }}>
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={18} color="#9A9488" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              paddingBottom: '1.25rem',
              fontSize: '0.9rem',
              color: '#9A9488',
              lineHeight: 1.75,
            }}>
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  return (
    <ThemeProvider theme={THEME}>
      <SiteNav names={NAMES} pages={PAGES} />

      <main style={{
        minHeight: '100dvh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(180deg, #f5ead6 0%, #F5F1E8 35%, #F5F1E8 100%)',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <div style={{
              width: '4.5rem', height: '4.5rem', borderRadius: '50%',
              background: '#EEE8DC', border: '2px solid rgba(163,177,138,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <HelpCircle size={22} color="#A3B18A" />
            </div>
            <h1 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}>
              FAQ
            </h1>
            <p style={{
              color: '#9A9488',
              maxWidth: '380px',
              margin: '0 auto',
              lineHeight: 1.7,
            }}>
              Answers to questions you might have.
            </p>
          </motion.div>

          {/* Accordion Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(24px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
              borderRadius: '1.5rem',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 40px rgba(43,30,20,0.06), 0 2px 8px rgba(43,30,20,0.03), inset 0 1px 0 rgba(255,255,255,0.5)',
              padding: '0.5rem clamp(1.5rem, 4vw, 2.5rem)',
            } as React.CSSProperties}
          >
            {FAQS.sort((a, b) => a.order - b.order).map((faq) => (
              <FaqAccordion key={faq.id} faq={faq} />
            ))}
          </motion.div>
        </div>
      </main>

      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
