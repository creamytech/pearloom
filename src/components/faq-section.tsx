'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/faq-section.tsx
// Animated accordion FAQ with editorial styling
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, HelpCircle } from 'lucide-react';
import type { FaqItem } from '@/types';

function FaqAccordionItem({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);
  const ordinal = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '1.85rem 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem', flex: 1, minWidth: 0 }}>
          {/* Ordinal number label */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--eg-accent)', opacity: 0.6, flexShrink: 0,
            fontFamily: 'var(--eg-font-body)',
          }}>
            {ordinal}
          </span>
          <span style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', fontWeight: 400,
            color: open ? 'var(--eg-fg)' : 'var(--eg-fg)',
            lineHeight: 1.35, letterSpacing: '-0.005em',
            transition: 'color 0.3s ease',
          }}>
            {item.question}
          </span>
        </div>
        {/* Animated plus/cross icon */}
        <div style={{
          flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
          border: '1px solid',
          borderColor: open ? 'var(--eg-accent)' : 'rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? 'var(--eg-accent)' : 'var(--eg-muted)',
          transition: 'border-color 0.3s ease, color 0.3s ease',
        }}>
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Plus size={14} strokeWidth={2} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingLeft: 'calc(0.65rem + 1.25rem + 0.65rem)' }}>
              <p style={{
                color: 'var(--eg-muted)',
                fontSize: '0.97rem',
                lineHeight: 1.85,
                paddingBottom: '2rem',
                fontWeight: 300,
              }}>
                {item.answer}
              </p>
            </div>
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
          style={{ textAlign: 'center', marginBottom: '5.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
            <HelpCircle size={15} color="var(--eg-accent)" strokeWidth={1.5} style={{ opacity: 0.7 }} />
            <div style={{ width: '50px', height: '1px', background: 'var(--eg-accent)', opacity: 0.25 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
            fontWeight: 400, letterSpacing: '-0.025em',
            color: 'var(--eg-fg)', lineHeight: 1.05,
            marginBottom: '1.5rem',
          }}>
            {title}
          </h2>
          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
            <div style={{ width: '4px', height: '4px', background: 'var(--eg-accent)', transform: 'rotate(45deg)', opacity: 0.5 }} />
            <div style={{ width: '24px', height: '1px', background: 'var(--eg-accent)', opacity: 0.35 }} />
          </div>
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
