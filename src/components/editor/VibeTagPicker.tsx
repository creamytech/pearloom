'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VibeTagPickerProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const VIBE_TAGS: { category: string; tags: string[] }[] = [
  {
    category: 'Settings',
    tags: [
      'garden party', 'beach wedding', 'mountain escape', 'city hall', 'vineyard',
      'barn wedding', 'destination wedding', 'backyard', 'ballroom', 'museum',
    ],
  },
  {
    category: 'Aesthetic',
    tags: [
      'bohemian', 'minimalist', 'vintage', 'modern luxe', 'rustic', 'tropical',
      'art deco', 'fairytale', 'industrial', 'cottagecore',
    ],
  },
  {
    category: 'Mood',
    tags: [
      'romantic', 'playful & fun', 'intimate', 'grand & dramatic', 'whimsical',
      'classic', 'editorial', 'laid-back', 'celestial', 'earthy',
    ],
  },
];

const MAX_TAGS = 5;

export function VibeTagPicker({ selectedTags, onChange }: VibeTagPickerProps) {
  function toggle(tag: string) {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length >= MAX_TAGS) return;
      onChange([...selectedTags, tag]);
    }
  }

  const atMax = selectedTags.length >= MAX_TAGS;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.8rem',
            color: 'rgba(245,240,232,0.5)',
            lineHeight: 1.5,
            display: 'block',
          }}
        >
          Help others discover your vibe (shown in our wedding gallery)
        </span>
        <motion.span
          animate={{ color: atMax ? '#71717A' : 'rgba(245,240,232,0.35)' }}
          transition={{ duration: 0.25 }}
          style={{
            fontSize: '0.75rem',
            marginTop: '0.2rem',
            display: 'block',
          }}
        >
          {selectedTags.length}/{MAX_TAGS} selected
          {atMax ? ' · Maximum reached' : ''}
        </motion.span>
      </div>

      {VIBE_TAGS.map(({ category, tags }, catIdx) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: catIdx * 0.07, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: '1rem' }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.4)',
              marginBottom: '0.4rem',
            }}
          >
            {category}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
            }}
          >
            {tags.map((tag, tagIdx) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atMax;

              return (
                <motion.button
                  key={tag}
                  onClick={() => toggle(tag)}
                  disabled={isDisabled}
                  title={isDisabled ? `Remove a tag to select "${tag}"` : undefined}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.28,
                    delay: catIdx * 0.07 + tagIdx * 0.025,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={isDisabled ? {} : { scale: 1.06, y: -1 }}
                  whileTap={isDisabled ? {} : { scale: 0.93 }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '2rem',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 600 : 400,
                    border: isSelected
                      ? '1px solid #71717A'
                      : '1px solid rgba(0,0,0,0.08)',
                    background: isSelected
                      ? 'rgba(24,24,27,0.12)'
                      : 'transparent',
                    color: isSelected
                      ? '#71717A'
                      : isDisabled
                      ? 'rgba(245,240,232,0.2)'
                      : 'rgba(245,240,232,0.7)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                  }}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0, width: 0 }}
                        animate={{ scale: 1, opacity: 1, width: 14 }}
                        exit={{ scale: 0, opacity: 0, width: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                        style={{ display: 'inline-flex', flexShrink: 0, overflow: 'hidden' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {tag}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
