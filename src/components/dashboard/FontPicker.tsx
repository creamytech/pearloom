'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/FontPicker.tsx
// Font picker with two modes: curated pairings and custom
// independent heading + body font selection.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FONT_CATALOG,
  FONT_CATEGORIES,
  ALL_HEADING_FONTS,
  ALL_BODY_FONTS,
  buildFontsUrl,
  buildSingleFontUrl,
  type FontPair,
} from '@/lib/font-catalog';

interface FontPickerProps {
  currentHeading: string;
  currentBody: string;
  onChange: (heading: string, body: string) => void;
}

type CategoryFilter = 'all' | FontPair['category'];
type TabId = 'pairings' | 'custom';

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

function injectSingleFont(name: string): void {
  if (typeof document === 'undefined') return;
  const key = `single:${name}`;
  if (injectedFonts.has(key)) return;
  injectedFonts.add(key);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildSingleFontUrl(name);
  document.head.appendChild(link);
}

export default function FontPicker({
  currentHeading,
  currentBody,
  onChange,
}: FontPickerProps) {
  const [tab, setTab] = useState<TabId>('pairings');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [hovered, setHovered] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Custom tab state
  const [headingSearch, setHeadingSearch] = useState('');
  const [bodySearch, setBodySearch] = useState('');

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
            const fontName = (entry.target as HTMLElement).dataset.fontName;
            if (fontName) injectSingleFont(fontName);
          }
        }
      },
      { threshold: 0.1 },
    );

    for (const [, el] of cardRefs.current) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [filtered, tab, headingSearch, bodySearch]);

  // When category changes, scroll back to top
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory, tab]);

  const isSelected = (pair: FontPair) =>
    pair.heading === currentHeading && pair.body === currentBody;

  const filteredHeadingFonts = headingSearch
    ? ALL_HEADING_FONTS.filter(f => f.toLowerCase().includes(headingSearch.toLowerCase()))
    : ALL_HEADING_FONTS;

  const filteredBodyFonts = bodySearch
    ? ALL_BODY_FONTS.filter(f => f.toLowerCase().includes(bodySearch.toLowerCase()))
    : ALL_BODY_FONTS;

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
      {/* Tab switcher: Pairings / Custom */}
      <div
        style={{
          padding: '12px 20px 0',
          flexShrink: 0,
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {(['pairings', 'custom'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              all: 'unset',
              flex: 1,
              textAlign: 'center',
              padding: '8px 0 10px',
              fontSize: '0.78rem',
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#A3B18A' : 'rgba(255,255,255,0.45)',
              borderBottom: tab === t ? '2px solid #A3B18A' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.03em',
            }}
          >
            {t === 'pairings' ? 'Pairings' : 'Custom'}
          </button>
        ))}
      </div>

      {tab === 'pairings' ? (
        <>
          {/* Category filter pills */}
          <div
            style={{
              padding: '10px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              flexShrink: 0,
              overflowX: 'auto',
              display: 'flex',
              gap: '6px',
              scrollbarWidth: 'none',
            }}
          >
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

          {/* Font pairing list */}
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
                      : 'rgba(163,177,138,0.04)',
                    border: selected
                      ? '2px solid #A3B18A'
                      : '2px solid rgba(0,0,0,0.05)',
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
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--pl-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pair.heading}
                    </span>
                    <span style={{ fontFamily: `'${pair.body}', sans-serif`, fontSize: '0.72rem', fontWeight: pair.bodyWeight, color: 'var(--pl-ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pair.body}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={badgeStyle('#A3B18A', '#1E1B16')}>{CATEGORY_LABELS[pair.category]}</span>
                      <span style={badgeStyle('rgba(0,0,0,0.06)', 'var(--pl-ink-soft)')}>{pair.mood}</span>
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
                          flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
                          background: '#A3B18A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', color: '#1E1B16', fontWeight: 700, lineHeight: 1,
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
        </>
      ) : (
        /* ── Custom independent font selection ── */
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {/* Heading font picker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-muted)', marginBottom: '8px', fontWeight: 600 }}>
              Heading Font
            </div>
            <input
              type="text"
              placeholder="Search heading fonts..."
              value={headingSearch}
              onChange={e => setHeadingSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
                background: 'rgba(163,177,138,0.06)', color: '#fff', fontSize: '0.82rem',
                outline: 'none', boxSizing: 'border-box', marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredHeadingFonts.map(font => {
                const active = font === currentHeading;
                return (
                  <button
                    key={font}
                    data-font-name={font}
                    ref={(el) => {
                      if (el) cardRefs.current.set(`h-${font}`, el);
                      else cardRefs.current.delete(`h-${font}`);
                    }}
                    onClick={() => onChange(font, currentBody)}
                    style={{
                      all: 'unset',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: active ? 'rgba(163,177,138,0.2)' : 'rgba(163,177,138,0.04)',
                      border: active ? '1.5px solid #A3B18A' : '1.5px solid rgba(0,0,0,0.04)',
                      transition: 'all 0.12s', width: '100%', boxSizing: 'border-box',
                    }}
                  >
                    <span style={{
                      fontFamily: `'${font}', serif`, fontSize: '1.1rem', fontWeight: 600,
                      color: active ? '#fff' : 'var(--pl-ink)', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {font}
                    </span>
                    {active && (
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%', background: '#A3B18A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', color: '#1E1B16', fontWeight: 700, flexShrink: 0,
                      }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body font picker */}
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pl-muted)', marginBottom: '8px', fontWeight: 600 }}>
              Body Font
            </div>
            <input
              type="text"
              placeholder="Search body fonts..."
              value={bodySearch}
              onChange={e => setBodySearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
                background: 'rgba(163,177,138,0.06)', color: '#fff', fontSize: '0.82rem',
                outline: 'none', boxSizing: 'border-box', marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredBodyFonts.map(font => {
                const active = font === currentBody;
                return (
                  <button
                    key={font}
                    data-font-name={font}
                    ref={(el) => {
                      if (el) cardRefs.current.set(`b-${font}`, el);
                      else cardRefs.current.delete(`b-${font}`);
                    }}
                    onClick={() => onChange(currentHeading, font)}
                    style={{
                      all: 'unset',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: active ? 'rgba(163,177,138,0.2)' : 'rgba(163,177,138,0.04)',
                      border: active ? '1.5px solid #A3B18A' : '1.5px solid rgba(0,0,0,0.04)',
                      transition: 'all 0.12s', width: '100%', boxSizing: 'border-box',
                    }}
                  >
                    <span style={{
                      fontFamily: `'${font}', sans-serif`, fontSize: '1rem', fontWeight: 400,
                      color: active ? '#fff' : 'var(--pl-ink)', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {font}
                    </span>
                    {active && (
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%', background: '#A3B18A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', color: '#1E1B16', fontWeight: 700, flexShrink: 0,
                      }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer: current selection summary */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--pl-muted)' }}>
          Current Pairing
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--pl-ink)' }}>
          <span style={{ fontFamily: `'${currentHeading}', serif`, color: '#FFFFFF' }}>{currentHeading}</span>
          {' '}
          <span style={{ color: 'var(--pl-muted)' }}>+</span>
          {' '}
          <span style={{ fontFamily: `'${currentBody}', sans-serif`, color: 'var(--pl-ink-soft)' }}>{currentBody}</span>
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
    background: active ? 'transparent' : 'rgba(0,0,0,0.05)',
    color: active ? '#1E1B16' : 'var(--pl-ink-soft)',
    border: active ? '1px solid transparent' : '1px solid rgba(0,0,0,0.06)',
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
