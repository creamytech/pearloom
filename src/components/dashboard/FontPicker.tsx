'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/FontPicker.tsx
// Beautiful font pair picker for the site editor.
// Dark panel theme with category filters and live font previews.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FONT_CATALOG,
  FONT_CATEGORIES,
  buildFontsUrl,
  type FontPair,
} from '@/lib/font-catalog';

interface FontPickerProps {
  currentHeading: string;
  currentBody: string;
  onChange: (heading: string, body: string) => void;
}

type CategoryFilter = 'all' | FontPair['category'];

const CATEGORY_LABELS: Record<FontPair['category'], string> = {
  romantic: 'Romantic',
  modern: 'Modern',
  classic: 'Classic',
  playful: 'Playful',
  editorial: 'Editorial',
  rustic: 'Rustic',
  luxe: 'Luxe',
};

// Track which fonts have already been injected into <head>
const injectedFonts = new Set<string>();

function injectFontLink(pair: FontPair): void {
  if (typeof document === 'undefined') return;
  const url = buildFontsUrl(pair);
  if (injectedFonts.has(url)) return;
  injectedFonts.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export default function FontPicker({
  currentHeading,
  currentBody,
  onChange,
}: FontPickerProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [hovered, setHovered] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const filtered = activeCategory === 'all'
    ? FONT_CATALOG
    : FONT_CATALOG.filter((p) => p.category === activeCategory);

  // Inject fonts for visible cards via IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.pairId;
            if (id) {
              const pair = FONT_CATALOG.find((p) => p.id === id);
              if (pair) injectFontLink(pair);
            }
          }
        }
      },
      { threshold: 0.1 },
    );

    for (const [, el] of cardRefs.current) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [filtered]);

  // When category changes, scroll back to top
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory]);

  const isSelected = (pair: FontPair) =>
    pair.heading === currentHeading && pair.body === currentBody;

  return (
    <div
      style={{
        background: '#1E1B16',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: '#FFFFFF',
          }}
        >
          Font Pairing
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          {FONT_CATALOG.length} curated pairings across 7 styles
        </p>
      </div>

      {/* Category filter pills */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          overflowX: 'auto',
          display: 'flex',
          gap: '6px',
          scrollbarWidth: 'none',
        }}
      >
        {/* All pill */}
        {(['all', ...FONT_CATEGORIES] as const).map((cat) => {
          const isActive = activeCategory === cat;
          const label = cat === 'all' ? 'All' : CATEGORY_LABELS[cat as FontPair['category']];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ ...pillStyle(isActive), position: 'relative' }}
            >
              {isActive && (
                <motion.span
                  layoutId="font-category-active"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '100px',
                    background: '#A3B18A', zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* Font grid — single column for readability on mobile editor panels */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {filtered.map((pair, idx) => {
          const selected = isSelected(pair);

          return (
            <motion.button
              key={pair.id}
              data-pair-id={pair.id}
              ref={(el) => {
                if (el) cardRefs.current.set(pair.id, el);
                else cardRefs.current.delete(pair.id);
              }}
              onClick={() => onChange(pair.heading, pair.body)}
              onMouseEnter={() => setHovered(pair.id)}
              onMouseLeave={() => setHovered(null)}
              title={pair.pairRationale}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(idx * 0.035, 0.5), ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                all: 'unset',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: selected
                  ? 'rgba(163, 177, 138, 0.22)'
                  : 'rgba(255,255,255,0.03)',
                border: selected
                  ? '2px solid #A3B18A'
                  : '2px solid rgba(255,255,255,0.07)',
                boxShadow: selected
                  ? '0 0 0 1px rgba(163, 177, 138, 0.3), inset 0 1px 0 rgba(163, 177, 138, 0.15)'
                  : 'none',
                transition: 'all 0.15s ease',
                position: 'relative',
                textAlign: 'left',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              {/* Left: heading font preview */}
              <span
                style={{
                  fontFamily: `'${pair.heading}', serif`,
                  fontSize: 'clamp(1.1rem, 4vw, 1.35rem)',
                  fontWeight: pair.headingWeight,
                  fontStyle: pair.headingStyle ?? 'normal',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                  flexShrink: 0,
                  width: '38%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {pair.preview}
              </span>

              {/* Right: font names + badges */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pair.heading}
                </span>

                <span
                  style={{
                    fontFamily: `'${pair.body}', sans-serif`,
                    fontSize: '0.72rem',
                    fontWeight: pair.bodyWeight,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pair.body}
                </span>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span style={badgeStyle('#A3B18A', '#1E1B16')}>
                    {CATEGORY_LABELS[pair.category]}
                  </span>
                  <span style={badgeStyle('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.5)')}>
                    {pair.mood}
                  </span>
                </div>
              </div>

              {/* Selected checkmark */}
              <AnimatePresence>
                {selected && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    style={{
                      flexShrink: 0,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#A3B18A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#1E1B16',
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Footer: current selection summary */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          Current Pairing
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <span
            style={{
              fontFamily: `'${currentHeading}', serif`,
              color: '#FFFFFF',
            }}
          >
            {currentHeading}
          </span>
          {' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>+</span>
          {' '}
          <span
            style={{
              fontFamily: `'${currentBody}', sans-serif`,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {currentBody}
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────

function pillStyle(active: boolean): React.CSSProperties {
  return {
    all: 'unset',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: '100px',
    fontSize: '0.72rem',
    fontWeight: active ? 600 : 400,
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    background: active ? 'transparent' : 'rgba(255,255,255,0.07)',
    color: active ? '#1E1B16' : 'rgba(255,255,255,0.6)',
    border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
    transition: 'color 0.15s ease',
    flexShrink: 0,
    zIndex: 0,
  };
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.6rem',
    fontWeight: 500,
    letterSpacing: '0.04em',
    background: bg,
    color,
    lineHeight: 1.5,
  };
}
