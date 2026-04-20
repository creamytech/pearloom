'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/FontPicker.tsx
// Font picker with two modes: curated pairings and custom
// independent heading + body font selection.
// Designed for light panel backgrounds (editor sidebar).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
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
  romantic:  'Romantic',
  modern:    'Modern',
  classic:   'Classic',
  playful:   'Playful',
  editorial: 'Editorial',
  rustic:    'Rustic',
  luxe:      'Luxe',
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
    for (const [, el] of cardRefs.current) observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [filtered, tab, headingSearch, bodySearch]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: 'transparent', color: '#18181B' }}>

      {/* ── Current pairing preview ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '10px',
        background: '#F4F4F5', marginBottom: '8px', border: '1px solid #E4E4E7',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: `'${currentHeading}', serif`,
            fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.2,
            color: '#18181B', letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentHeading}
          </div>
          <div style={{
            fontFamily: `'${currentBody}', sans-serif`,
            fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4,
            color: '#71717A', marginTop: '2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentBody}
          </div>
        </div>
        <div style={{
          fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--pl-olive)', flexShrink: 0,
        }}>Active</div>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{
        display: 'flex', gap: '2px', padding: '3px',
        background: '#F4F4F5', borderRadius: '9px', marginBottom: '8px',
      }}>
        {(['pairings', 'custom'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, border: 'none', borderRadius: '7px', cursor: 'pointer',
              padding: '6px 0', fontSize: '0.73rem', fontWeight: 600,
              fontFamily: 'inherit', transition: 'all var(--pl-dur-instant)',
              background: tab === t ? '#ffffff' : 'transparent',
              color: tab === t ? '#18181B' : '#71717A',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t === 'pairings' ? 'Pairings' : 'Custom'}
          </button>
        ))}
      </div>

      {tab === 'pairings' ? (
        <>
          {/* Category filter pills */}
          <div style={{
            display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px',
          }}>
            {(['all', ...FONT_CATEGORIES] as const).map((cat) => {
              const isActive = activeCategory === cat;
              const label = cat === 'all' ? 'All' : CATEGORY_LABELS[cat as FontPair['category']];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                    padding: '4px 9px', fontSize: '0.68rem', fontWeight: 600,
                    fontFamily: 'inherit', letterSpacing: '0.02em',
                    transition: 'all var(--pl-dur-instant)',
                    background: isActive ? '#18181B' : '#F4F4F5',
                    color: isActive ? '#ffffff' : '#52525B',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Font pairing cards */}
          <div
            ref={scrollRef}
            style={{
              display: 'flex', flexDirection: 'column', gap: '4px',
              maxHeight: '420px', overflowY: 'auto',
              scrollbarWidth: 'thin',
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.025, 0.3) }}
                  whileHover={{ backgroundColor: selected ? undefined : 'rgba(0,0,0,0.03)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    all: 'unset',
                    display: 'flex', alignItems: 'stretch', gap: '0',
                    borderRadius: '10px', cursor: 'pointer',
                    background: selected ? 'rgba(163,177,138,0.12)' : '#FAFAFA',
                    border: selected ? '1.5px solid var(--pl-olive)' : '1.5px solid #E4E4E7',
                    overflow: 'hidden', boxSizing: 'border-box', width: '100%',
                    transition: 'border-color 0.12s',
                  }}
                  title={pair.pairRationale}
                >
                  {/* Left: heading preview swatch */}
                  <div style={{
                    width: '80px', flexShrink: 0,
                    background: selected ? 'rgba(163,177,138,0.18)' : '#F0EFE9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '10px 8px',
                  }}>
                    <span style={{
                      fontFamily: `'${pair.heading}', serif`,
                      fontSize: '1.05rem',
                      fontWeight: pair.headingWeight,
                      fontStyle: pair.headingStyle ?? 'normal',
                      color: '#18181B',
                      lineHeight: 1.2,
                      textAlign: 'center',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {pair.preview}
                    </span>
                  </div>

                  {/* Right: names + meta */}
                  <div style={{
                    flex: 1, padding: '9px 10px', display: 'flex',
                    flexDirection: 'column', gap: '2px', minWidth: 0,
                  }}>
                    <span style={{
                      fontFamily: `'${pair.heading}', serif`,
                      fontSize: '0.78rem', fontWeight: 600,
                      color: '#18181B', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {pair.heading}
                    </span>
                    <span style={{
                      fontFamily: `'${pair.body}', sans-serif`,
                      fontSize: '0.7rem', fontWeight: pair.bodyWeight,
                      color: '#71717A', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {pair.body}
                    </span>
                    <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                      <span style={{
                        fontSize: '0.57rem', fontWeight: 600, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: 'var(--pl-olive)',
                        background: 'rgba(163,177,138,0.12)', padding: '1px 5px',
                        borderRadius: '3px',
                      }}>
                        {CATEGORY_LABELS[pair.category]}
                      </span>
                      <span style={{
                        fontSize: '0.57rem', fontWeight: 500, color: '#A1A1AA',
                        background: '#F0EFE9', padding: '1px 5px', borderRadius: '3px',
                      }}>
                        {pair.mood}
                      </span>
                    </div>
                  </div>

                  {/* Selected check */}
                  <div style={{
                    width: '32px', flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AnimatePresence>
                      {selected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                          style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'var(--pl-olive)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Check size={10} color="#fff" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Custom font selection ── */
        <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'Heading Font', list: filteredHeadingFonts, active: currentHeading, search: headingSearch, onSearch: setHeadingSearch, onSelect: (f: string) => onChange(f, currentBody), fontType: 'serif' },
            { label: 'Body Font', list: filteredBodyFonts, active: currentBody, search: bodySearch, onSearch: setBodySearch, onSelect: (f: string) => onChange(currentHeading, f), fontType: 'sans-serif' },
          ].map(({ label, list, active, search, onSearch, onSelect, fontType }) => (
            <div key={label}>
              <div style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#71717A', marginBottom: '6px',
              }}>
                {label}
              </div>
              <input
                type="text"
                placeholder={`Search ${label.toLowerCase()}s...`}
                value={search}
                onChange={e => onSearch(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                  border: '1px solid #E4E4E7', background: '#FAFAFA',
                  color: '#18181B', fontSize: '0.78rem', outline: 'none',
                  boxSizing: 'border-box', marginBottom: '6px', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                {list.map(font => {
                  const isActive = font === active;
                  return (
                    <button
                      key={font}
                      data-font-name={font}
                      ref={(el) => {
                        if (el) cardRefs.current.set(`${label}-${font}`, el);
                        else cardRefs.current.delete(`${label}-${font}`);
                      }}
                      onClick={() => onSelect(font)}
                      style={{
                        all: 'unset', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '8px 10px',
                        borderRadius: '7px', cursor: 'pointer',
                        background: isActive ? 'rgba(163,177,138,0.12)' : 'transparent',
                        border: isActive ? '1px solid var(--pl-olive)' : '1px solid transparent',
                        transition: 'all 0.1s', width: '100%', boxSizing: 'border-box',
                      }}
                    >
                      <span style={{
                        fontFamily: `'${font}', ${fontType}`,
                        fontSize: '0.95rem', fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#18181B' : '#3F3F46',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>
                        {font}
                      </span>
                      {isActive && (
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: 'var(--pl-olive)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Check size={8} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
