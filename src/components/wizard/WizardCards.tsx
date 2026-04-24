'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardCards.tsx — Editorial wizard cards
// Editorial Modernism: cream paper, gold hairlines, folio numbering,
// italic Fraunces headlines, mono-cap labels.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Cake, Sparkles, Diamond, BookOpen, Users, Mountain, Crown, Globe2 } from 'lucide-react';

// ── Shared tokens ─────────────────────

const CARD_BG = 'rgba(250,247,242,0.72)';
const CARD_BG_ACTIVE = 'rgba(193,154,75,0.1)';
const CARD_BORDER = '1px solid rgba(193,154,75,0.3)';
const CARD_BORDER_ACTIVE_VAL = '1px solid rgba(193,154,75,0.75)';
const CARD_TOP_RULE = '1.5px solid rgba(193,154,75,0.55)';
const CARD_TOP_RULE_ACTIVE = '1.5px solid rgba(193,154,75,0.95)';
const CARD_SHADOW = '0 1px 2px rgba(22,16,6,0.04)';
const CARD_SHADOW_HOVER = '0 2px 10px rgba(22,16,6,0.08)';
const CARD_HALO_ACTIVE = '0 0 0 3px rgba(193,154,75,0.18)';
const RADIUS = 2;

const FONT_DISPLAY = 'var(--pl-font-display, "Fraunces", serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const FONT_BODY = 'var(--pl-font-body, inherit)';
const COLOR_INK = '#18181B';
const COLOR_INK_SOFT = '#3F3F46';
const COLOR_MUTED = '#52525B';
const COLOR_ACCENT = 'rgba(193,154,75,0.95)';
const COLOR_ACCENT_SOFT = 'rgba(193,154,75,0.65)';

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

// ── Occasion icon + description map ─────────────────────────

const OCCASION_META: Record<string, { icon: React.ReactNode; description: string }> = {
  // Categories (first wizard step)
  'wedding-arc': {
    icon: <Heart size={22} strokeWidth={1.8} />,
    description: 'Weddings, showers, bachelor weekends',
  },
  family: {
    icon: <Users size={22} strokeWidth={1.8} />,
    description: 'Anniversaries, baby showers, housewarmings',
  },
  milestone: {
    icon: <Mountain size={22} strokeWidth={1.8} />,
    description: 'Birthdays, graduations, retirements',
  },
  cultural: {
    icon: <Crown size={22} strokeWidth={1.8} />,
    description: 'Bar & bat mitzvah, quinceañera, baptism',
  },
  commemoration: {
    icon: <Globe2 size={22} strokeWidth={1.8} />,
    description: 'Memorials, reunions, gatherings',
  },
  // Occasions (second wizard step — individual events)
  wedding: {
    icon: <Heart size={22} strokeWidth={1.8} />,
    description: 'Ceremony, reception, everything after',
  },
  birthday: {
    icon: <Cake size={22} strokeWidth={1.8} />,
    description: 'Party, milestones, many candles',
  },
  anniversary: {
    icon: <Sparkles size={22} strokeWidth={1.8} />,
    description: 'Years together, still writing chapters',
  },
  engagement: {
    icon: <Diamond size={22} strokeWidth={1.8} />,
    description: 'They said yes. Tell the world.',
  },
  story: {
    icon: <BookOpen size={22} strokeWidth={1.8} />,
    description: 'Any story, any shape, your way',
  },
};

function getOccasionMeta(value: string) {
  return OCCASION_META[value] || OCCASION_META.story;
}

// ── Vibe-based gradient for SitePreviewCard ────────────────
// (Kept for the preview card — shows user a taste of the generated site's palette)

function vibeGradient(vibe?: string): string {
  if (!vibe) return 'linear-gradient(135deg, #E4E4E7 0%, #D4D4D8 50%, #A1A1AA 100%)';
  const v = vibe.toLowerCase();
  if (v.includes('dark') || v.includes('moody') || v.includes('gothic'))
    return 'linear-gradient(135deg, #2C2C2C 0%, #3D3530 50%, #4A3F36 100%)';
  if (v.includes('bright') || v.includes('colorful') || v.includes('fun'))
    return 'linear-gradient(135deg, #F9D976 0%, #F39F86 50%, #E8739E 100%)';
  if (v.includes('coastal') || v.includes('beach') || v.includes('ocean'))
    return 'linear-gradient(135deg, #5B9BD5 0%, #B8D4E8 50%, #E0F0FF 100%)';
  if (v.includes('rustic') || v.includes('earth') || v.includes('terracotta'))
    return 'linear-gradient(135deg, #C67B5C 0%, #E8B89D 50%, #F0DFD0 100%)';
  if (v.includes('lavender') || v.includes('purple'))
    return 'linear-gradient(135deg, #9B8EC1 0%, #D4A0C4 50%, #F0E8F8 100%)';
  if (v.includes('emerald') || v.includes('green') || v.includes('garden'))
    return 'linear-gradient(135deg, #2D6A4F 0%, #588B5B 50%, #5C6B3F 100%)';
  if (v.includes('gold') || v.includes('elegant') || v.includes('classic'))
    return 'linear-gradient(135deg, #C4A96A 0%, #E8D5A8 50%, #F5EED8 100%)';
  if (v.includes('romantic') || v.includes('blush') || v.includes('rose'))
    return 'linear-gradient(135deg, #E8BDD4 0%, #F2CDD0 50%, #FAE8EC 100%)';
  return 'linear-gradient(135deg, #E4E4E7 0%, #D4D4D8 50%, #A1A1AA 100%)';
}


// ═════════════════════════════════════════════════════════════
// 1. OccasionCard
// ═════════════════════════════════════════════════════════════

interface OccasionCardProps {
  occasions: { label: string; value: string; icon?: string }[];
  onSelect: (value: string) => void;
}

export function OccasionCard({ occasions, onSelect }: OccasionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    setTimeout(() => onSelect(value), 180);
  };

  // Cycling palette blobs so the grid feels alive; avoids mono
  // repetition without locking each card to a specific tone.
  const TONES = [
    { wash: 'var(--pl-groove-butter)', ink: 'var(--pl-groove-terra)' },
    { wash: 'var(--pl-groove-rose)',   ink: 'var(--pl-groove-plum)'  },
    { wash: 'var(--pl-groove-sage)',   ink: 'var(--pl-groove-sage)'  },
    { wash: 'var(--pl-groove-terra)',  ink: 'var(--pl-groove-terra)' },
  ];

  return (
    <motion.div {...fadeIn}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        {occasions.map((occ, idx) => {
          const meta = getOccasionMeta(occ.value);
          const isSelected = selected === occ.value;
          const tone = TONES[idx % TONES.length];
          // Cycle all 8 blob shapes so no two cards are copies —
          // the wizard grid has a lot of cards, and repetition
          // made it feel manufactured rather than hand-woven.
          const radiusCycle = [
            'var(--pl-groove-radius-blob-1)',
            'var(--pl-groove-radius-blob-2)',
            'var(--pl-groove-radius-blob-3)',
            'var(--pl-groove-radius-blob-4)',
            'var(--pl-groove-radius-blob-5)',
            'var(--pl-groove-radius-blob-6)',
            'var(--pl-groove-radius-blob-7)',
            'var(--pl-groove-radius-blob-8)',
          ];
          const radius = radiusCycle[idx % radiusCycle.length];
          const blobRadius = idx % 2 === 0
            ? 'var(--pl-groove-radius-blob-3)'
            : '50%';

          return (
            <motion.button
              key={occ.value}
              onClick={() => !selected && handleSelect(occ.value)}
              disabled={!!selected}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={!selected ? { y: -3, scale: 1.01 } : {}}
              whileTap={!selected ? { scale: 0.98 } : {}}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 14,
                padding: '22px 20px 20px',
                borderRadius: radius,
                border: isSelected
                  ? `1.5px solid color-mix(in oklab, ${tone.ink} 60%, transparent)`
                  : `1px solid color-mix(in oklab, ${tone.ink} 22%, transparent)`,
                background: isSelected
                  ? `color-mix(in oklab, ${tone.wash} 28%, var(--pl-groove-cream))`
                  : `color-mix(in oklab, ${tone.wash} 14%, var(--pl-groove-cream))`,
                cursor: selected && !isSelected ? 'default' : 'pointer',
                opacity: selected && !isSelected ? 0.35 : 1,
                boxShadow: isSelected
                  ? `0 2px 6px rgba(43,30,20,0.05), 0 14px 40px color-mix(in oklab, ${tone.ink} 22%, transparent)`
                  : `0 1px 3px rgba(43,30,20,0.04), 0 8px 24px color-mix(in oklab, ${tone.ink} 12%, transparent)`,
                transition:
                  'background var(--pl-dur-fast) var(--pl-ease-out),' +
                  ' border-color var(--pl-dur-fast) var(--pl-ease-out),' +
                  ' box-shadow var(--pl-dur-base) var(--pl-ease-out)',
                overflow: 'hidden',
                textAlign: 'left',
                fontFamily: 'inherit',
                minHeight: 128,
              }}
            >
              {/* Soft accent blob in the corner — backs the icon */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: -24,
                  right: -24,
                  width: 96,
                  height: 96,
                  borderRadius: blobRadius,
                  background: tone.wash,
                  opacity: 0.35,
                  filter: 'blur(12px)',
                  pointerEvents: 'none',
                }}
              />

              {/* Icon blob — big, warm, no hairline frame */}
              <span
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: blobRadius,
                  background: `color-mix(in oklab, ${tone.wash} 60%, var(--pl-groove-cream))`,
                  color: tone.ink,
                  boxShadow: `inset 0 1px 0 color-mix(in oklab, ${tone.wash} 50%, white)`,
                }}
              >
                {meta.icon}
              </span>

              {/* Title — sentence-case, body font, no folio, no mono eyebrow */}
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--pl-groove-ink)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.012em',
                }}
              >
                {occ.label}
              </span>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: '0.88rem',
                  fontWeight: 400,
                  color: 'color-mix(in oklab, var(--pl-groove-ink) 68%, transparent)',
                  lineHeight: 1.45,
                }}
              >
                {meta.description}
              </span>

              {/* Check pip when selected — groovy circle, no black square */}
              {isSelected && (
                <motion.span
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: tone.ink,
                    color: 'var(--pl-groove-cream)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px color-mix(in oklab, ${tone.ink} 38%, transparent)`,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.2l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}


// ═════════════════════════════════════════════════════════════
// 2. NamesPreviewCard
// ═════════════════════════════════════════════════════════════

interface NamesPreviewCardProps {
  names: [string, string];
  occasion?: string;
}

export function NamesPreviewCard({ names }: NamesPreviewCardProps) {
  const isSolo = !names[1];
  const displayText = isSolo ? names[0] : `${names[0]} & ${names[1]}`;

  return (
    <motion.div {...fadeIn}>
      <div style={{
        position: 'relative',
        marginTop: 12,
        padding: '28px 24px 24px',
        borderRadius: RADIUS,
        background: CARD_BG,
        border: CARD_BORDER,
        borderTop: CARD_TOP_RULE,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {!isSolo && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '5.5rem',
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontWeight: 400,
            color: COLOR_ACCENT_SOFT,
            opacity: 0.12,
            pointerEvents: 'none',
            lineHeight: 1,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}>&amp;</div>
        )}
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color: COLOR_ACCENT,
          marginBottom: 8,
          position: 'relative', zIndex: 1,
        }}>
          Dedicated to
        </div>
        <p style={{
          position: 'relative',
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: '1.75rem',
          fontWeight: 400,
          color: COLOR_INK,
          lineHeight: 1.1,
          letterSpacing: '-0.008em',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          zIndex: 1, margin: 0,
        }}>
          {displayText}
        </p>
      </div>
    </motion.div>
  );
}


// ═════════════════════════════════════════════════════════════
// 3. CountdownCard
// ═════════════════════════════════════════════════════════════

interface CountdownCardProps {
  date: string;
  names?: [string, string];
  occasion?: string;
}

export function CountdownCard({ date }: CountdownCardProps) {
  const { daysUntil, formatted } = useMemo(() => {
    const target = new Date(date + 'T12:00:00');
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const fmt = target.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    return { daysUntil: days, formatted: fmt };
  }, [date]);

  return (
    <motion.div {...fadeIn}>
      <div style={{
        position: 'relative',
        marginTop: 12,
        padding: '20px 20px 18px 26px',
        borderRadius: RADIUS,
        background: CARD_BG,
        border: CARD_BORDER,
        borderTop: CARD_TOP_RULE,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
      }}>
        {/* Left gold accent strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 3, height: '100%',
          background: 'linear-gradient(180deg, rgba(193,154,75,0.85) 0%, rgba(212,175,55,0.75) 100%)',
        }} />
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: COLOR_ACCENT,
          marginBottom: 4,
        }}>
          Countdown · d-
        </div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: 'italic',
          fontSize: '3rem', fontWeight: 400,
          color: COLOR_INK, lineHeight: 0.95,
          letterSpacing: '-0.022em',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}>
          {daysUntil}
        </div>
        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: COLOR_INK_SOFT, marginTop: 6,
        }}>
          {daysUntil === 0 ? "It's Today" : daysUntil === 1 ? 'Day to go' : 'Days to go'}
        </div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontStyle: 'italic',
          fontSize: '0.9rem',
          color: COLOR_MUTED, marginTop: 8,
          letterSpacing: '-0.003em',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}>
          {formatted}
        </div>
      </div>
    </motion.div>
  );
}


// ═════════════════════════════════════════════════════════════
// 4. VenueMapCard
// ═════════════════════════════════════════════════════════════

interface VenueMapCardProps {
  venue: string;
  address?: string;
  onConfirm: () => void;
  onEdit: () => void;
}

export function VenueMapCard({ venue, address, onConfirm, onEdit }: VenueMapCardProps) {
  return (
    <motion.div {...fadeIn}>
      <div style={{
        marginTop: 12, borderRadius: RADIUS,
        background: CARD_BG, border: CARD_BORDER,
        borderTop: CARD_TOP_RULE,
        boxShadow: CARD_SHADOW, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(193,154,75,0.28)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: COLOR_ACCENT,
          }}>Venue · mapped</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(193,154,75,0.28)' }} />
        </div>
        <div style={{
          padding: '14px 16px 6px',
          fontFamily: FONT_DISPLAY, fontStyle: 'italic',
          fontSize: '1.1rem', fontWeight: 400,
          color: COLOR_INK,
          lineHeight: 1.15,
          letterSpacing: '-0.004em',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}>
          {venue}
        </div>
        <div style={{
          position: 'relative',
          margin: '6px 16px 0',
          height: 110,
          borderRadius: RADIUS,
          background: 'rgba(193,154,75,0.08)',
          border: '1px solid rgba(193,154,75,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* faint grid */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(193,154,75,0.2) 0 1px, transparent 1px 20px),' +
              'repeating-linear-gradient(90deg, rgba(193,154,75,0.2) 0 1px, transparent 1px 20px)',
          }} />
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" style={{ position: 'relative' }}>
            <path d="M12 1C6.5 1 2 5.5 2 11c0 7 10 19 10 19s10-12 10-19c0-5.5-4.5-10-10-10z"
              fill="rgba(193,154,75,0.85)" />
            <circle cx="12" cy="11" r="4" fill="#FDFAF0" />
          </svg>
        </div>
        {address && (
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(82,82,91,0.8)',
            padding: '10px 16px 0', lineHeight: 1.5,
          }}>{address}</div>
        )}
        <div style={{
          display: 'flex', gap: 8,
          padding: '14px 16px 16px',
          marginTop: 10,
          borderTop: '1px solid rgba(193,154,75,0.22)',
        }}>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px 14px', borderRadius: RADIUS, border: 'none',
            background: COLOR_INK,
            fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            color: '#FDFAF0', cursor: 'pointer',
            boxShadow: '0 0 0 3px rgba(193,154,75,0.22)',
            transition: 'box-shadow 180ms ease, background 180ms ease',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(193,154,75,0.32)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(193,154,75,0.22)'; }}
          >
            Confirm
          </button>
          <button onClick={onEdit} style={{
            flex: 1, padding: '11px 14px', borderRadius: RADIUS,
            border: '1px solid rgba(193,154,75,0.45)',
            background: 'transparent',
            fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            color: COLOR_INK, cursor: 'pointer',
            transition: 'background 180ms ease, border-color 180ms ease',
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(193,154,75,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(193,154,75,0.75)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(193,154,75,0.45)';
            }}
          >
            Revise
          </button>
        </div>
      </div>
    </motion.div>
  );
}


// ═════════════════════════════════════════════════════════════
// 5. SitePreviewCard
// ═════════════════════════════════════════════════════════════

interface SitePreviewCardProps {
  names: [string, string];
  occasion?: string;
  date?: string;
  vibe?: string;
  venue?: string;
}

export function SitePreviewCard({ names, occasion, date, vibe, venue }: SitePreviewCardProps) {
  const isSolo = !names[1];
  const displayNames = isSolo ? names[0] : `${names[0]} & ${names[1]}`;

  const formattedDate = useMemo(() => {
    if (!date) return null;
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [date]);

  const gradient = vibeGradient(vibe);
  const isDarkVibe = vibe?.toLowerCase().includes('dark') || vibe?.toLowerCase().includes('moody') || vibe?.toLowerCase().includes('gothic');

  const occasionLabel = occasion ? occasion.charAt(0).toUpperCase() + occasion.slice(1) : null;
  const metaRows: { kicker: string; value: string }[] = [];
  if (occasionLabel) metaRows.push({ kicker: 'Kind', value: occasionLabel });
  if (formattedDate) metaRows.push({ kicker: 'Date', value: formattedDate });
  if (venue && venue !== 'TBD') metaRows.push({ kicker: 'Venue', value: venue });

  return (
    <motion.div {...fadeIn}>
      <div style={{
        marginTop: 12,
        borderRadius: RADIUS,
        background: 'linear-gradient(180deg, #FDFAF0 0%, #F3EFE7 100%)',
        border: '1px solid rgba(193,154,75,0.32)',
        borderTop: '2px solid rgba(212,175,55,0.72)',
        boxShadow: '0 8px 26px rgba(22,16,6,0.1)',
        overflow: 'hidden',
      }}>
        {/* Masthead */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px 10px',
          borderBottom: '1px solid rgba(193,154,75,0.28)',
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: COLOR_ACCENT,
          }}>Live preview · {new Date().getFullYear()}</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(193,154,75,0.32)' }} />
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: COLOR_ACCENT,
          }}>№ 01</span>
        </div>

        {/* Hero plate */}
        <div style={{
          margin: '14px 14px 10px',
          borderRadius: RADIUS,
          background: gradient,
          padding: '36px 22px 26px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(193,154,75,0.25)',
        }}>
          {/* Faint corner folio on hero */}
          <span style={{
            position: 'absolute', top: 10, left: 12,
            fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 700,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: isDarkVibe ? 'rgba(240,212,132,0.75)' : 'rgba(255,255,255,0.75)',
            background: 'rgba(22,16,6,0.22)', backdropFilter: 'blur(6px)',
            padding: '3px 8px', borderRadius: 'var(--pl-radius-xs)',
            border: isDarkVibe ? '1px solid rgba(240,212,132,0.35)' : '1px solid rgba(255,255,255,0.3)',
          }}>The Cover</span>
          <p style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: '1.85rem', fontWeight: 400,
            color: isDarkVibe ? 'rgba(250,247,242,0.96)' : '#FFFFFF',
            textShadow: isDarkVibe ? '0 1px 2px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.2)',
            lineHeight: 1.05,
            letterSpacing: '-0.012em',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            position: 'relative', zIndex: 1, margin: 0,
          }}>
            {displayNames}
          </p>
          {metaRows.length > 0 && (
            <p style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: isDarkVibe ? 'rgba(250,247,242,0.68)' : 'rgba(255,255,255,0.85)',
              marginTop: 10,
              position: 'relative', zIndex: 1,
            }}>
              {metaRows.map(r => r.value).join(' · ')}
            </p>
          )}
        </div>

        {/* Colophon rows */}
        {metaRows.length > 0 && (
          <div style={{
            padding: '10px 16px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 6,
          }}>
            {metaRows.map((row, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr',
                gap: 10,
                alignItems: 'baseline',
                paddingBottom: 6,
                borderBottom: i < metaRows.length - 1 ? '1px dashed rgba(193,154,75,0.28)' : 'none',
              }}>
                <span style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: COLOR_ACCENT,
                }}>{row.kicker}</span>
                <span style={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: '0.92rem',
                  color: COLOR_INK,
                  letterSpacing: '-0.003em',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
