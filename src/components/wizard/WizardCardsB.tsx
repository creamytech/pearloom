'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/WizardCardsB.tsx
// Rich interactive card components for conversational AI wizard
// Organic Glass design: backdrop-blur, warm shadows, olive accents
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

// ── Shared Constants (v5 design system) ─────────────────────

const GLASS_BG = '#FFFFFF';
const GLASS_BORDER = '#E4E4E7';
const WARM_SHADOW = '0 1px 3px rgba(0,0,0,0.04)';
const OLIVE_GLOW = '0 0 0 2px rgba(24,24,27,0.12)';
const CARD_RADIUS = '10px';
const MOUNT_INITIAL = { opacity: 0, y: 8 } as const;
const MOUNT_ANIMATE = { opacity: 1, y: 0 } as const;
const MOUNT_TRANSITION = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };

// ── SVG Icons (no emojis) ───────────────────────────────────

function CheckIcon({ size = 14, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PencilIcon({ size = 14, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function ChevronIcon({ size = 16, color = 'var(--pl-ink-soft)', down = true }: { size?: number; color?: string; down?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: down ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CalendarIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function MapPinIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function HeartIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function UsersIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PaletteIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill={color} />
      <circle cx="17.5" cy="10.5" r=".5" fill={color} />
      <circle cx="8.5" cy="7.5" r=".5" fill={color} />
      <circle cx="6.5" cy="12.5" r=".5" fill={color} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.75 1.5-1.5 0-.36-.13-.68-.35-.95a1.49 1.49 0 0 1 1.35-2.05h2a6 6 0 0 0 0-12H12Z" />
    </svg>
  );
}

function SparkleIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function PhotoIcon({ size = 16, color = 'var(--pl-olive)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function makeGradientFromColors(colors: string[], opacity = 0.25): string {
  if (colors.length === 0) return 'transparent';
  if (colors.length === 1) return colors[0];
  const stops = colors.map((c, i) => {
    const pct = Math.round((i / (colors.length - 1)) * 100);
    return `${c}${Math.round(opacity * 255).toString(16).padStart(2, '0')} ${pct}%`;
  });
  return `linear-gradient(135deg, ${stops.join(', ')})`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ═════════════════════════════════════════════════════════════
// 1. StyleDiscoveryCard
// ═════════════════════════════════════════════════════════════

interface StyleOption {
  name: string;
  colors: string[];
  fonts?: { heading: string; body: string };
}

interface StyleDiscoveryPair {
  a: StyleOption;
  b: StyleOption;
}

interface StyleDiscoveryCardProps {
  pairs: StyleDiscoveryPair[];
  onSelect: (style: { name: string; colors: string[] }) => void;
  names?: [string, string];
}

export function StyleDiscoveryCard({ pairs, onSelect, names }: StyleDiscoveryCardProps) {
  const [pairIndex, setPairIndex] = useState(0);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [selectedSide, setSelectedSide] = useState<'a' | 'b' | null>(null);
  const [finished, setFinished] = useState(false);

  const totalRounds = pairs.length;
  const currentPair = pairs[pairIndex];

  const handleSelect = useCallback((side: 'a' | 'b') => {
    if (selectedSide) return;
    setSelectedSide(side);

    const chosen = side === 'a' ? currentPair.a : currentPair.b;
    setScores(prev => {
      const next = new Map(prev);
      next.set(chosen.name, (next.get(chosen.name) || 0) + 1);
      return next;
    });

    // Advance to next pair after a short delay
    setTimeout(() => {
      if (pairIndex + 1 >= totalRounds) {
        // Determine winner
        const chosen2 = side === 'a' ? currentPair.a : currentPair.b;
        const updatedScores = new Map(scores);
        updatedScores.set(chosen2.name, (updatedScores.get(chosen2.name) || 0) + 1);

        let winner: StyleOption = pairs[0].a;
        let maxScore = 0;
        for (const pair of pairs) {
          for (const opt of [pair.a, pair.b]) {
            const s = updatedScores.get(opt.name) || 0;
            if (s > maxScore) {
              maxScore = s;
              winner = opt;
            }
          }
        }
        setFinished(true);
        onSelect({ name: winner.name, colors: winner.colors });
      } else {
        setPairIndex(i => i + 1);
        setSelectedSide(null);
      }
    }, 600);
  }, [selectedSide, currentPair, pairIndex, totalRounds, scores, pairs, onSelect]);

  if (!currentPair) return null;

  const containerStyle: React.CSSProperties = {
    background: GLASS_BG,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: CARD_RADIUS,
    border: `1px solid ${GLASS_BORDER}`,
    boxShadow: WARM_SHADOW,
    padding: '20px',
    maxWidth: '420px',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--pl-font-heading)',
    fontStyle: 'italic',
    fontSize: '0.92rem',
    color: 'var(--pl-ink-soft)',
    textAlign: 'center',
    marginBottom: '14px',
    fontWeight: 400,
  };

  const roundStyle: React.CSSProperties = {
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--pl-muted)',
    textAlign: 'center',
    marginBottom: '6px',
  };

  const renderCard = (option: StyleOption, side: 'a' | 'b') => {
    const isSelected = selectedSide === side;
    const isOther = selectedSide !== null && selectedSide !== side;
    const headingFont = option.fonts?.heading || 'var(--pl-font-heading)';

    const cardStyle: React.CSSProperties = {
      flex: 1,
      borderRadius: '12px',
      padding: '14px 12px',
      border: isSelected ? '2px solid var(--pl-olive)' : `1px solid ${GLASS_BORDER}`,
      background: makeGradientFromColors(option.colors, 0.15),
      cursor: selectedSide ? 'default' : 'pointer',
      opacity: isOther ? 0.5 : 1,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '130px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    };

    return (
      <motion.button
        key={`${pairIndex}-${side}`}
        onClick={() => handleSelect(side)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isOther ? 0.5 : 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={cardStyle}
      >
        {/* Selected checkmark */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--pl-olive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon size={12} color="white" />
          </motion.div>
        )}

        {/* Color swatches row */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {option.colors.slice(0, 4).map((color, i) => (
            <div
              key={i}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: color,
                border: '2px solid rgba(255,255,255,0.7)',
                boxShadow: '0 1px 3px rgba(43,30,20,0.1)',
              }}
            />
          ))}
        </div>

        {/* Palette name */}
        <span style={{
          fontFamily: headingFont,
          fontSize: '0.82rem',
          fontWeight: 600,
          color: 'var(--pl-ink-soft)',
          textAlign: 'left',
          lineHeight: 1.3,
        }}>
          {option.name}
        </span>

        {/* Names preview in that style's heading font */}
        {names && (
          <span style={{
            fontFamily: headingFont,
            fontSize: '0.72rem',
            color: 'var(--pl-muted)',
            fontStyle: 'italic',
            textAlign: 'left',
          }}>
            {names[0]}{names[1] ? ` & ${names[1]}` : ''}
          </span>
        )}
      </motion.button>
    );
  };

  if (finished) {
    return (
      <motion.div initial={MOUNT_INITIAL} animate={MOUNT_ANIMATE} transition={MOUNT_TRANSITION} style={{ ...containerStyle, textAlign: 'center' as const }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--pl-olive)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 10px',
        }}>
          <CheckIcon size={16} color="white" />
        </div>
        <span style={{
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          fontSize: '0.9rem',
          color: 'var(--pl-ink-soft)',
        }}>
          Style selected
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div initial={MOUNT_INITIAL} animate={MOUNT_ANIMATE} transition={MOUNT_TRANSITION} style={containerStyle}>
      <div style={roundStyle}>Round {pairIndex + 1} of {totalRounds}</div>
      <div style={labelStyle}>Which feels more you?</div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {renderCard(currentPair.a, 'a')}
        {renderCard(currentPair.b, 'b')}
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// 2. ColorPaletteCard
// ═════════════════════════════════════════════════════════════

interface PaletteOption {
  name: string;
  colors: string[];
  description?: string;
}

interface ColorPaletteCardProps {
  palettes: PaletteOption[];
  onSelect: (palette: { name: string; colors: string[] }) => void;
}

/** Mini site preview showing how a palette looks applied */
function PaletteMiniPreview({ colors: c }: { colors: string[] }) {
  // c[0]=accent, c[1]=accent2, c[2]=background, c[3]=foreground
  const bg = c[2] || '#FAFAFA';
  const fg = c[3] || '#18181B';
  const accent = c[0] || '#A3B18A';
  const accent2 = c[1] || '#C4A96A';

  return (
    <div style={{
      width: '100%', height: '80px', borderRadius: '6px',
      background: bg, overflow: 'hidden', position: 'relative',
      border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {/* Hero photo placeholder */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
        background: accent2, opacity: 0.35,
      }} />
      {/* Content area */}
      <div style={{
        position: 'absolute', top: '12px', left: '52%', right: '10px',
        display: 'flex', flexDirection: 'column', gap: '5px',
      }}>
        {/* Title */}
        <div style={{ height: '5px', width: '80%', background: fg, borderRadius: '2px', opacity: 0.85 }} />
        <div style={{ height: '3px', width: '55%', background: fg, borderRadius: '1px', opacity: 0.3 }} />
        <div style={{ height: '3px', width: '65%', background: fg, borderRadius: '1px', opacity: 0.3 }} />
        {/* CTA button */}
        <div style={{
          marginTop: '4px', height: '12px', width: '48px', borderRadius: '3px',
          background: accent,
        }} />
      </div>
      {/* Color strip at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', height: '3px' }}>
        {c.slice(0, 4).map((color, i) => (
          <div key={i} style={{ flex: 1, background: color }} />
        ))}
      </div>
    </div>
  );
}

export function ColorPaletteCard({ palettes, onSelect }: ColorPaletteCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial={MOUNT_INITIAL}
      animate={MOUNT_ANIMATE}
      transition={MOUNT_TRANSITION}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
      }}
    >
      {palettes.slice(0, 3).map((palette, idx) => {
        const isSelected = selectedIndex === idx;

        return (
          <motion.button
            key={palette.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              borderRadius: '10px',
              padding: '12px',
              border: isSelected ? '2px solid #18181B' : `1px solid ${GLASS_BORDER}`,
              background: isSelected ? '#F4F4F5' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isSelected ? OLIVE_GLOW : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onClick={() => {
              setSelectedIndex(idx);
              onSelect({ name: palette.name, colors: palette.colors });
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#18181B';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = GLASS_BORDER;
            }}
          >
            {/* Selected checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute', top: '8px', right: '8px', zIndex: 2,
                  width: '20px', height: '20px', borderRadius: '6px',
                  background: '#18181B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CheckIcon size={10} color="white" />
              </motion.div>
            )}

            {/* Mini site preview */}
            <PaletteMiniPreview colors={palette.colors} />

            {/* Palette info row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Color swatches */}
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                {palette.colors.slice(0, 5).map((color, i) => (
                  <div key={i} style={{
                    width: '16px', height: '16px', borderRadius: '4px',
                    background: color, border: '1px solid rgba(0,0,0,0.06)',
                  }} />
                ))}
              </div>

              {/* Name + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block',
                  fontSize: '0.8rem', fontWeight: 600,
                  color: '#18181B', lineHeight: 1.3,
                }}>
                  {palette.name}
                </span>
                {palette.description && (
                  <span style={{
                    display: 'block',
                    fontSize: '0.65rem', color: '#A1A1AA',
                    lineHeight: 1.3, marginTop: '1px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {palette.description}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// 3. PhotoTimelineCard
// ═════════════════════════════════════════════════════════════

interface PhotoItem {
  url: string;
  date?: string;
  location?: string;
}

interface PhotoTimelineCardProps {
  photos: PhotoItem[];
  onPhotoTap: (index: number) => void;
}

export function PhotoTimelineCard({ photos, onPhotoTap }: PhotoTimelineCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  // Generate stable rotations per photo
  const rotations = useMemo(
    () => photos.map((_, i) => (seededRandom(i * 17 + 3) * 6 - 3)),
    [photos],
  );

  const containerStyle: React.CSSProperties = {
    background: GLASS_BG,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: CARD_RADIUS,
    border: `1px solid ${GLASS_BORDER}`,
    boxShadow: WARM_SHADOW,
    padding: '16px',
    maxWidth: '420px',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
  };

  const scrollContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '14px',
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '8px',
    paddingTop: '4px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
  };

  const fadeGradient = (side: 'left' | 'right', visible: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: '28px',
    background: side === 'left'
      ? 'linear-gradient(to right, rgba(255,255,255,0.7), transparent)'
      : 'linear-gradient(to left, rgba(255,255,255,0.7), transparent)',
    pointerEvents: 'none',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.2s ease',
    zIndex: 2,
  });

  return (
    <motion.div initial={MOUNT_INITIAL} animate={MOUNT_ANIMATE} transition={MOUNT_TRANSITION} style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <PhotoIcon size={16} color="var(--pl-olive)" />
        <span style={{
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          fontSize: '0.88rem',
          fontWeight: 500,
          color: 'var(--pl-ink-soft)',
        }}>
          Your Story
        </span>
      </div>

      {/* Scrollable strip with fade edges */}
      <div style={{ position: 'relative' }}>
        <div style={fadeGradient('left', canScrollLeft)} />
        <div style={fadeGradient('right', canScrollRight)} />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={scrollContainerStyle}
        >
          {/* Hide scrollbar via inline style tag approach using a wrapper */}
          <style>{`.pl-photo-strip::-webkit-scrollbar { display: none; }`}</style>

          {photos.map((photo, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              onClick={() => onPhotoTap(idx)}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              {/* Polaroid-style thumbnail */}
              <div style={{
                width: '72px',
                height: '90px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(43,30,20,0.1)',
                transform: `rotate(${rotations[idx]}deg)`,
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}>
                <img
                  src={photo.url}
                  alt={photo.location || `Photo ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              {/* Date label */}
              {photo.date && (
                <span style={{
                  fontSize: '0.6rem',
                  color: 'var(--pl-muted)',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}>
                  {photo.date}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// 4. ProgressSummaryCard
// ═════════════════════════════════════════════════════════════

interface CollectedData {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
}

interface ProgressSummaryCardProps {
  collected: CollectedData;
  onEdit: (field: string) => void;
}

const PROGRESS_FIELDS = [
  { key: 'occasion', label: 'Occasion', Icon: HeartIcon },
  { key: 'names', label: 'Names', Icon: UsersIcon },
  { key: 'date', label: 'Date', Icon: CalendarIcon },
  { key: 'venue', label: 'Venue', Icon: MapPinIcon },
  { key: 'vibe', label: 'Style', Icon: PaletteIcon },
] as const;

export function ProgressSummaryCard({ collected, onEdit }: ProgressSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedCount = PROGRESS_FIELDS.filter(f => {
    const val = collected[f.key as keyof CollectedData];
    if (f.key === 'names') return val && (val as [string, string])[0];
    return !!val;
  }).length;

  const progressPercent = (completedCount / PROGRESS_FIELDS.length) * 100;

  const containerStyle: React.CSSProperties = {
    background: GLASS_BG,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: CARD_RADIUS,
    border: `1px solid ${GLASS_BORDER}`,
    boxShadow: WARM_SHADOW,
    overflow: 'hidden',
    maxWidth: '380px',
  };

  const progressBarContainerStyle: React.CSSProperties = {
    height: '3px',
    background: 'rgba(163,177,138,0.15)',
    width: '100%',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${progressPercent}%`,
    background: 'var(--pl-olive)',
    borderRadius: '0 2px 2px 0',
    transition: 'width 0.4s ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  };

  const getFieldValue = (key: string): string | null => {
    const val = collected[key as keyof CollectedData];
    if (!val) return null;
    if (key === 'names') {
      const arr = val as [string, string];
      if (!arr[0]) return null;
      return arr[1] ? `${arr[0]} & ${arr[1]}` : arr[0];
    }
    return val as string;
  };

  return (
    <motion.div initial={MOUNT_INITIAL} animate={MOUNT_ANIMATE} transition={MOUNT_TRANSITION} style={containerStyle}>
      {/* Olive accent progress bar at top */}
      <div style={progressBarContainerStyle}>
        <div style={progressBarFillStyle} />
      </div>

      {/* Collapsed header */}
      <button onClick={() => setExpanded(e => !e)} style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparkleIcon size={16} color="var(--pl-olive)" />
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--pl-ink-soft)',
          }}>
            {completedCount} of {PROGRESS_FIELDS.length} details collected
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mini progress dots */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {PROGRESS_FIELDS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i < completedCount ? 'var(--pl-olive)' : 'rgba(163,177,138,0.2)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>
          <ChevronIcon size={16} color="var(--pl-ink-soft)" down={!expanded} />
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {PROGRESS_FIELDS.map(({ key, label, Icon }) => {
              const value = getFieldValue(key);
              const isSet = value !== null;

              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 4px',
                    borderBottom: '1px solid rgba(255,255,255,0.4)',
                  }}
                >
                  {/* Icon */}
                  <Icon size={16} color={isSet ? 'var(--pl-olive)' : 'var(--pl-muted)'} />

                  {/* Label */}
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--pl-muted)',
                    width: '56px',
                    flexShrink: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {label}
                  </span>

                  {/* Value */}
                  <span style={{
                    flex: 1,
                    fontSize: '0.82rem',
                    color: isSet ? 'var(--pl-ink-soft)' : 'var(--pl-muted)',
                    fontStyle: isSet ? 'normal' : 'italic',
                    fontWeight: isSet ? 500 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {value || 'Not set'}
                  </span>

                  {/* Status / edit */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {isSet && (
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(130,170,100,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <CheckIcon size={10} color="var(--pl-olive)" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(key);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(163,177,138,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'none';
                      }}
                    >
                      <PencilIcon size={13} color="var(--pl-olive)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// 5. QuickChips
// ═════════════════════════════════════════════════════════════

interface ChipItem {
  label: string;
  value: string;
}

interface QuickChipsProps {
  chips: ChipItem[];
  onSelect: (value: string) => void;
}

export function QuickChips({ chips, onSelect }: QuickChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  };

  const scrollStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '4px 16px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    alignItems: 'center',
    height: '100%',
  };

  const fadeLeft: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '24px',
    background: 'linear-gradient(to right, rgba(255,255,255,0.85), transparent)',
    pointerEvents: 'none',
    zIndex: 2,
  };

  const fadeRight: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '24px',
    background: 'linear-gradient(to left, rgba(255,255,255,0.85), transparent)',
    pointerEvents: 'none',
    zIndex: 2,
  };

  const chipStyle: React.CSSProperties = {
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    borderRadius: '100px',
    background: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.6)',
    color: 'var(--pl-olive)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 4px rgba(43,30,20,0.04)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={containerStyle}
    >
      <div style={fadeLeft} />
      <div style={fadeRight} />

      <div ref={scrollRef} style={scrollStyle}>
        <style>{`.pl-chips-strip::-webkit-scrollbar { display: none; }`}</style>
        {chips.map((chip, idx) => (
          <motion.button
            key={chip.value}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelect(chip.value)}
            style={chipStyle}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = 'rgba(163,177,138,0.12)';
              btn.style.borderColor = 'rgba(163,177,138,0.3)';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = 'rgba(255,255,255,0.5)';
              btn.style.borderColor = 'rgba(255,255,255,0.6)';
            }}
          >
            {chip.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
