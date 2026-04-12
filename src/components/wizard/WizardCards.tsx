'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardCards.tsx — Wizard card components
// Redesign v5: solid surfaces, monochrome icons, zinc neutrals
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Cake, Sparkles, Diamond, BookOpen } from 'lucide-react';

// ── Shared constants (v5 design system) ─────────────────────

const CARD_BG = '#FFFFFF';
const CARD_BORDER = '1px solid #E4E4E7';
const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.04)';
const CARD_SHADOW_HOVER = '0 2px 8px rgba(0,0,0,0.06)';
const RADIUS = 10;

const FONT_HEADING = 'var(--pl-font-heading, "DM Sans", system-ui, sans-serif)';
const FONT_BODY = 'var(--pl-font-body, inherit)';
const COLOR_INK = '#18181B';
const COLOR_INK_SOFT = '#3F3F46';
const COLOR_MUTED = '#71717A';
const COLOR_BORDER_ACTIVE = '#18181B';

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

// ── Occasion icon + description map ─────────────────────────

const OCCASION_META: Record<string, { icon: React.ReactNode; description: string }> = {
  wedding: {
    icon: <Heart size={20} strokeWidth={1.5} />,
    description: 'Ceremony, reception & more',
  },
  birthday: {
    icon: <Cake size={20} strokeWidth={1.5} />,
    description: 'Party, milestones & fun',
  },
  anniversary: {
    icon: <Sparkles size={20} strokeWidth={1.5} />,
    description: 'Celebrate years together',
  },
  engagement: {
    icon: <Diamond size={20} strokeWidth={1.5} />,
    description: 'The big announcement',
  },
  story: {
    icon: <BookOpen size={20} strokeWidth={1.5} />,
    description: 'Tell any story your way',
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
    return 'linear-gradient(135deg, #2D6A4F 0%, #588B5B 50%, #A3B18A 100%)';
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

  return (
    <motion.div {...fadeIn}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
      }}>
        {occasions.map((occ) => {
          const meta = getOccasionMeta(occ.value);
          const isSelected = selected === occ.value;

          return (
            <button
              key={occ.value}
              onClick={() => !selected && handleSelect(occ.value)}
              disabled={!!selected}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '6px',
                padding: '16px 14px',
                borderRadius: RADIUS,
                border: isSelected ? `2px solid ${COLOR_BORDER_ACTIVE}` : CARD_BORDER,
                background: isSelected ? '#F4F4F5' : CARD_BG,
                cursor: selected && !isSelected ? 'default' : 'pointer',
                opacity: selected && !isSelected ? 0.4 : 1,
                boxShadow: isSelected ? CARD_SHADOW_HOVER : CARD_SHADOW,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  (e.currentTarget as HTMLElement).style.borderColor = COLOR_BORDER_ACTIVE;
                  (e.currentTarget as HTMLElement).style.boxShadow = CARD_SHADOW_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!selected && !isSelected) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7';
                  (e.currentTarget as HTMLElement).style.boxShadow = CARD_SHADOW;
                }
              }}
            >
              <span style={{ color: COLOR_INK_SOFT, opacity: 0.7 }}>
                {meta.icon}
              </span>
              <span style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: COLOR_INK,
                fontFamily: FONT_BODY,
              }}>
                {occ.label}
              </span>
              <span style={{
                fontSize: '0.68rem',
                color: COLOR_MUTED,
                fontFamily: FONT_BODY,
                lineHeight: 1.3,
              }}>
                {meta.description}
              </span>

              {/* Checkmark */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 10, right: 10,
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill={COLOR_BORDER_ACTIVE} />
                    <path d="M6 10.5l2.5 2.5 5-5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
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
        marginTop: '12px',
        padding: '24px 20px',
        borderRadius: RADIUS,
        background: CARD_BG,
        border: CARD_BORDER,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {!isSolo && <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '4rem', fontFamily: FONT_HEADING, fontWeight: 300,
          color: COLOR_INK_SOFT, opacity: 0.05, pointerEvents: 'none', lineHeight: 1,
        }}>&amp;</div>}
        <p style={{
          position: 'relative', fontSize: '1.4rem',
          fontFamily: FONT_HEADING, fontWeight: 500,
          color: COLOR_INK, lineHeight: 1.3, zIndex: 1, margin: 0,
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
        marginTop: '12px',
        padding: '20px 20px 20px 24px',
        borderRadius: RADIUS,
        background: CARD_BG,
        border: CARD_BORDER,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
      }}>
        {/* Left accent strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '3px', height: '100%',
          background: COLOR_INK,
          borderRadius: `${RADIUS}px 0 0 ${RADIUS}px`,
        }} />
        <div style={{
          fontSize: '2.5rem', fontFamily: FONT_HEADING, fontWeight: 500,
          color: COLOR_INK, lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {daysUntil}
        </div>
        <div style={{
          fontSize: '0.82rem', fontFamily: FONT_BODY, fontWeight: 600,
          color: COLOR_MUTED, marginTop: '4px',
        }}>
          {daysUntil === 0 ? "It's today!" : daysUntil === 1 ? 'day to go' : 'days to go'}
        </div>
        <div style={{
          fontSize: '0.72rem', fontFamily: FONT_BODY,
          color: COLOR_MUTED, marginTop: '10px', fontWeight: 500,
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
        marginTop: '12px', borderRadius: RADIUS,
        background: CARD_BG, border: CARD_BORDER,
        boxShadow: CARD_SHADOW, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: '0.95rem', fontWeight: 600,
          color: COLOR_INK, fontFamily: FONT_BODY,
          padding: '16px 16px 10px',
        }}>
          {venue}
        </div>
        <div style={{
          position: 'relative', margin: '0 12px', height: '100px',
          borderRadius: 8, background: '#F4F4F5', border: '1px solid #E4E4E7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <path d="M12 1C6.5 1 2 5.5 2 11c0 7 10 19 10 19s10-12 10-19c0-5.5-4.5-10-10-10z"
              fill="#A1A1AA" opacity="0.5" />
            <circle cx="12" cy="11" r="4" fill="white" opacity="0.9" />
          </svg>
        </div>
        {address && <div style={{
          fontSize: '0.75rem', color: COLOR_MUTED, fontFamily: FONT_BODY,
          padding: '8px 16px 0', lineHeight: 1.5,
        }}>{address}</div>}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 16px 16px' }}>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none',
            background: COLOR_INK, color: 'white', fontSize: '0.82rem',
            fontWeight: 600, fontFamily: FONT_BODY, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#27272A'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = COLOR_INK; }}
          >
            Looks right
          </button>
          <button onClick={onEdit} style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: CARD_BORDER, background: 'transparent',
            color: COLOR_MUTED, fontSize: '0.82rem', fontWeight: 600,
            fontFamily: FONT_BODY, cursor: 'pointer', transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Edit
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

  const labels: string[] = [];
  if (occasion) labels.push(occasion.charAt(0).toUpperCase() + occasion.slice(1));
  if (formattedDate) labels.push(formattedDate);
  if (venue && venue !== 'TBD') labels.push(venue);

  return (
    <motion.div {...fadeIn}>
      <div style={{
        marginTop: '12px', borderRadius: RADIUS,
        background: CARD_BG, border: CARD_BORDER,
        boxShadow: CARD_SHADOW, overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px 8px', fontSize: '0.68rem', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          color: COLOR_MUTED, fontFamily: FONT_BODY,
        }}>
          Preview
        </div>
        <div style={{
          margin: '0 12px', borderRadius: 8, background: gradient,
          padding: '32px 20px 24px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <p style={{
            fontFamily: FONT_HEADING, fontSize: '1.4rem', fontWeight: 500,
            color: isDarkVibe ? 'rgba(255,255,255,0.92)' : 'white',
            textShadow: isDarkVibe ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
            lineHeight: 1.25, position: 'relative', zIndex: 1, margin: 0,
          }}>
            {displayNames}
          </p>
          {labels.length > 0 && (
            <p style={{
              fontSize: '0.65rem', fontWeight: 600, fontFamily: FONT_BODY,
              color: isDarkVibe ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.75)',
              marginTop: '8px', letterSpacing: '0.05em',
              position: 'relative', zIndex: 1,
            }}>
              {labels.join('  ·  ')}
            </p>
          )}
        </div>
        {labels.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '4px 12px', padding: '12px 16px 14px',
          }}>
            {labels.map((l, i) => (
              <span key={i} style={{
                fontSize: '0.68rem', fontWeight: 600,
                color: COLOR_MUTED, fontFamily: FONT_BODY,
              }}>{l}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
