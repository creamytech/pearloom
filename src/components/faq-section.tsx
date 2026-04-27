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
      className="pl-scroll-fade-up"
      data-pe-faq-id={item.id}
      data-pe-faq-index={index}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.65,
        delay: index * 0.055,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        '--pl-stagger-delay': `${index * 80}ms`,
        borderBottom: '1px solid var(--pl-divider)',
        overflow: 'hidden',
      } as React.CSSProperties}
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
          outline: 'none',
          borderRadius: 'var(--pl-radius-xs)',
        }}
        className="pl-faq-btn"
        aria-expanded={open}
      >
        <span
          data-pe-editable="true"
          data-pe-path={`faqs.${index}.question`}
          style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--pl-ink)',
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
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid',
            borderColor: open ? 'var(--pl-olive)' : 'rgba(163,177,138,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: open ? 'var(--pl-olive)' : 'var(--pl-muted)',
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
                borderLeft: '2px solid var(--pl-olive)',
                marginLeft: '0',
                paddingRight: '2.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <p
                data-pe-editable="true"
                data-pe-path={`faqs.${index}.answer`}
                style={{
                  color: 'var(--pl-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  paddingBottom: '2rem',
                  paddingLeft: '1rem',
                  fontWeight: 300,
                  maxWidth: '600px',
                  fontFamily: 'var(--pl-font-body)',
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
    <section data-pe-section="faq" data-pe-label="FAQ" style={{ padding: '8rem 2rem', background: 'var(--pl-cream)' }}>
      <style>{`
        .pl-faq-btn:focus-visible {
          outline: 2px solid var(--pl-olive) !important;
          outline-offset: 2px;
        }
      `}</style>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
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
                background: 'var(--pl-olive)',
                opacity: 0.3,
              }}
            />
            <LeafSprigIcon size={20} color="var(--pl-olive)" style={{ opacity: 0.75 }} />
            <div
              style={{
                width: '48px',
                height: '1px',
                background: 'var(--pl-olive)',
                opacity: 0.3,
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              color: 'var(--pl-ink)',
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
                background: 'var(--pl-olive)',
                opacity: 0.35,
              }}
            />
            <div
              style={{
                width: '4px',
                height: '4px',
                background: 'var(--pl-olive)',
                transform: 'rotate(45deg)',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                width: '24px',
                height: '1px',
                background: 'var(--pl-olive)',
                opacity: 0.35,
              }}
            />
          </div>

          <p
            style={{
              color: 'var(--pl-muted)',
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
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--pl-radius-full)',
                    border: `1.5px solid ${isActive ? 'var(--pl-olive)' : 'rgba(0,0,0,0.1)'}`,
                    background: isActive ? 'var(--pl-olive)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--pl-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
                    fontFamily: 'var(--pl-font-body)',
                    minHeight: '44px',
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
