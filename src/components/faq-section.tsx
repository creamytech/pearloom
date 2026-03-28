'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/faq-section.tsx
// Animated accordion FAQ with editorial styling
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { LeafSprigIcon } from '@/components/icons/PearloomIcons';
import type { FaqItem } from '@/types';

// FaqItem from types doesn't have a category field — extend locally
interface FaqItemWithCategory extends FaqItem {
  category?: string;
}

function FaqAccordionItem({
  item,
  index,
}: {
  item: FaqItemWithCategory;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.65,
        delay: index * 0.055,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '1.85rem 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '1.5rem',
        }}
        aria-expanded={open}
      >
        <span
          style={{
            fontFamily: 'var(--eg-font-body)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--eg-fg)',
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
            flex: 1,
            minWidth: 0,
          }}
        >
          {item.question}
        </span>

        {/* Animated + / x toggle */}
        <div
          style={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px solid',
            borderColor: open ? 'var(--eg-accent)' : 'rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: open ? 'var(--eg-accent)' : 'var(--eg-muted)',
            transition: 'border-color 0.3s ease, color 0.3s ease',
          }}
        >
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
            <div
              style={{
                paddingLeft: '0',
                borderLeft: '2px solid var(--eg-accent)',
                marginLeft: '0',
                paddingRight: '2.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <p
                style={{
                  color: 'var(--eg-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  paddingBottom: '2rem',
                  paddingLeft: '1rem',
                  fontWeight: 300,
                }}
              >
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
  faqs: FaqItemWithCategory[];
  title?: string;
  subtitle?: string;
}

export function FaqSection({
  faqs,
  title = 'Questions & Answers',
  subtitle = 'Everything you need to know.',
}: FaqSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  const sorted = [...faqs].sort((a, b) => a.order - b.order);

  // Extract unique categories if any faq has a category
  const hasCategories = sorted.some((f) => f.category);
  const allCategories = hasCategories
    ? ['All', ...Array.from(new Set(sorted.map((f) => f.category || 'General')))]
    : [];

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered =
    !hasCategories || activeCategory === 'All'
      ? sorted
      : sorted.filter((f) => (f.category || 'General') === activeCategory);

  return (
    <section style={{ padding: '8rem 2rem', background: 'var(--eg-bg)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '5.5rem' }}
        >
          {/* Eyebrow with LeafSprigIcon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '1px',
                background: 'var(--eg-accent)',
                opacity: 0.3,
              }}
            />
            <LeafSprigIcon size={20} color="var(--eg-accent)" style={{ opacity: 0.75 }} />
            <div
              style={{
                width: '48px',
                height: '1px',
                background: 'var(--eg-accent)',
                opacity: 0.3,
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: 'var(--eg-fg)',
              lineHeight: 1.05,
              marginBottom: '1.5rem',
            }}
          >
            {title}
          </h2>

          {/* Ornamental rule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '1px',
                background: 'var(--eg-accent)',
                opacity: 0.35,
              }}
            />
            <div
              style={{
                width: '4px',
                height: '4px',
                background: 'var(--eg-accent)',
                transform: 'rotate(45deg)',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                width: '24px',
                height: '1px',
                background: 'var(--eg-accent)',
                opacity: 0.35,
              }}
            />
          </div>

          <p
            style={{
              color: 'var(--eg-muted)',
              fontSize: '1.05rem',
              fontStyle: 'italic',
              lineHeight: 1.65,
            }}
          >
            {subtitle}
          </p>
        </motion.div>

        {/* Category pill filters */}
        {hasCategories && allCategories.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'center',
              marginBottom: '3rem',
            }}
          >
            {allCategories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '100px',
                    border: `1.5px solid ${isActive ? 'var(--eg-accent)' : 'rgba(0,0,0,0.1)'}`,
                    background: isActive ? 'var(--eg-accent)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--eg-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--eg-font-body)',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Accordion list */}
        <div>
          {filtered.map((faq, i) => (
            <FaqAccordionItem key={faq.id} item={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
