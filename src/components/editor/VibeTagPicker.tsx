'use client';

import React from 'react';

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
      if (selectedTags.length >= MAX_TAGS) return; // at max
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
        <span
          style={{
            fontSize: '0.75rem',
            color: atMax ? '#A3B18A' : 'rgba(245,240,232,0.35)',
            marginTop: '0.2rem',
            display: 'block',
          }}
        >
          {selectedTags.length}/{MAX_TAGS} selected
          {atMax ? ' · Maximum reached' : ''}
        </span>
      </div>

      {VIBE_TAGS.map(({ category, tags }) => (
        <div key={category} style={{ marginBottom: '1rem' }}>
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
            {tags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atMax;

              return (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  disabled={isDisabled}
                  title={isDisabled ? `Remove a tag to select "${tag}"` : undefined}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '2rem',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 600 : 400,
                    border: isSelected
                      ? '1px solid rgba(163,177,138,0.6)'
                      : '1px solid rgba(255,255,255,0.15)',
                    background: isSelected
                      ? 'rgba(163,177,138,0.22)'
                      : 'transparent',
                    color: isSelected
                      ? '#A3B18A'
                      : isDisabled
                      ? 'rgba(245,240,232,0.2)'
                      : 'rgba(245,240,232,0.7)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isDisabled && !isSelected) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(163,177,138,0.4)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,240,232,0.95)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDisabled && !isSelected) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,240,232,0.7)';
                    }
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#A3B18A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
