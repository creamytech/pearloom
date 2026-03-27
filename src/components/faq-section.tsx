'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/faq-section.tsx
// Animated accordion FAQ with editorial styling
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import type { FaqItem } from '@/types';

function FaqAccordionItem({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
      style={{
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '1.75rem 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', gap: '1rem',
        }}
      >
        <span style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: '1.2rem', fontWeight: 400,
          color: 'var(--eg-fg)', lineHeight: 1.3,
        }}>
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ flexShrink: 0, color: 'var(--eg-accent)' }}
        >
          {open ? <Minus size={20} /> : <Plus size={20} />}
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              color: 'var(--eg-muted)',
              fontSize: '1rem',
              lineHeight: 1.8,
              paddingBottom: '1.75rem',
              fontWeight: 300,
            }}>
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface FaqSectionProps {
  faqs: FaqItem[];
  title?: string;
}

export function FaqSection({ faqs, title = 'Questions & Answers' }: FaqSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  const sorted = [...faqs].sort((a, b) => a.order - b.order);

  return (
    <section style={{ padding: '8rem 2rem', background: 'var(--eg-bg)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
            <HelpCircle size={20} color="var(--eg-accent)" strokeWidth={1.5} />
            <div style={{ flex: 1, maxWidth: '120px', height: '1px', background: 'var(--eg-fg)', opacity: 0.1 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)',
          }}>
            {title}
          </h2>
        </motion.div>

        <div>
          {sorted.map((faq, i) => (
            <FaqAccordionItem key={faq.id} item={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
