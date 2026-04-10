'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardCards.tsx — Rich inline cards for AI wizard
// Organic Glass design: backdrop-blur, warm shadows, olive accents
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// ── Shared constants ────────────────────────────────────────

const GLASS_BG = 'rgba(255,255,255,0.5)';
const GLASS_BORDER = '1px solid rgba(255,255,255,0.5)';
const WARM_SHADOW = '0 4px 24px rgba(43,30,20,0.08)';
const WARM_SHADOW_HOVER = '0 8px 32px rgba(43,30,20,0.14)';
const BACKDROP = 'blur(16px)';
const RADIUS = 20;

const FONT_HEADING = 'var(--pl-font-heading, "Playfair Display")';
const FONT_BODY = 'var(--pl-font-body, inherit)';
const COLOR_OLIVE = 'var(--pl-olive, #A3B18A)';
const COLOR_INK_SOFT = 'var(--pl-ink-soft, #3D3530)';
const COLOR_MUTED = 'var(--pl-muted, #8C7E72)';

const fadeIn = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

// ── Occasion gradient + icon map ────────────────────────────

const OCCASION_STYLES: Record<string, { gradient: string; icon: React.ReactNode }> = {
  wedding: {
    gradient: 'linear-gradient(135deg, #F2CDD0 0%, #E8A5B0 50%, #D4878F 100%)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="12" cy="16" r="7" stroke="white" strokeWidth="1.8" fill="none" />
        <circle cx="20" cy="16" r="7" stroke="white" strokeWidth="1.8" fill="none" />
      </svg>
    ),
  },
  birthday: {
    gradient: 'linear-gradient(135deg, #F9D976 0%, #F39F86 50%, #E8739E 100%)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="8" y="16" width="16" height="10" rx="3" stroke="white" strokeWidth="1.8" fill="none" />
        <line x1="16" y1="16" x2="16" y2="10" stroke="white" strokeWidth="1.8" />
        <circle cx="16" cy="8" r="2" fill="white" opacity="0.9" />
      </svg>
    ),
  },
  anniversary: {
    gradient: 'linear-gradient(135deg, #F5D998 0%, #E2B662 50%, #C99A3A 100%)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 6l2.5 5.5L24 12.5l-4 4.2 1 6.3L16 20.5 10.8 23l1-6.3-4-4.2 5.5-1z" stroke="white" strokeWidth="1.8" fill="none" />
      </svg>
    ),
  },
  engagement: {
    gradient: 'linear-gradient(135deg, #F5E0EC 0%, #E8BDD4 50%, #D4A0BF 100%)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 8l3 5h-6l3-5z" fill="white" opacity="0.9" />
        <circle cx="16" cy="20" r="6" stroke="white" strokeWidth="1.8" fill="none" />
        <line x1="16" y1="14" x2="16" y2="13" stroke="white" strokeWidth="1.8" />
      </svg>
    ),
  },
  story: {
    gradient: 'linear-gradient(135deg, #D4CEC8 0%, #B8B0A6 50%, #9C9488 100%)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="9" y="7" width="14" height="18" rx="2" stroke="white" strokeWidth="1.8" fill="none" />
        <line x1="13" y1="12" x2="19" y2="12" stroke="white" strokeWidth="1.4" />
        <line x1="13" y1="16" x2="19" y2="16" stroke="white" strokeWidth="1.4" />
        <line x1="13" y1="20" x2="17" y2="20" stroke="white" strokeWidth="1.4" />
      </svg>
    ),
  },
};

function getOccasionStyle(value: string) {
  return OCCASION_STYLES[value] || OCCASION_STYLES.story;
}

// ── Occasion-based gradient for other cards ─────────────────

function occasionGradient(occasion?: string): string {
  switch (occasion) {
    case 'wedding': return 'linear-gradient(135deg, rgba(242,205,208,0.3) 0%, rgba(232,165,176,0.15) 100%)';
    case 'birthday': return 'linear-gradient(135deg, rgba(249,217,118,0.25) 0%, rgba(243,159,134,0.15) 100%)';
    case 'anniversary': return 'linear-gradient(135deg, rgba(245,217,152,0.3) 0%, rgba(226,182,98,0.15) 100%)';
    case 'engagement': return 'linear-gradient(135deg, rgba(245,224,236,0.3) 0%, rgba(232,189,212,0.15) 100%)';
    default: return 'linear-gradient(135deg, rgba(212,206,200,0.3) 0%, rgba(184,176,166,0.15) 100%)';
  }
}

// ── Vibe-based gradient for SitePreviewCard ────────────────

function vibeGradient(vibe?: string): string {
  if (!vibe) return 'linear-gradient(135deg, #E8D5C4 0%, #D4B8A0 50%, #C4A088 100%)';
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
  return 'linear-gradient(135deg, #E8D5C4 0%, #D4B8A0 50%, #C4A088 100%)';
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
  const [pressing, setPressing] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    setPressing(value);
    setTimeout(() => {
      setPressing(null);
      onSelect(value);
    }, 200);
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '14px',
  };

  return (
    <motion.div {...fadeIn}>
      <div style={gridStyle}>
        {occasions.map((occ) => {
          const style = getOccasionStyle(occ.value);
          const isSelected = selected === occ.value;
          const isPressing = pressing === occ.value;

          const cardStyle: React.CSSProperties = {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '18px 12px',
            borderRadius: 16,
            border: isSelected ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.3)',
            background: style.gradient,
            cursor: selected && !isSelected ? 'default' : 'pointer',
            opacity: selected && !isSelected ? 0.45 : 1,
            transform: isPressing ? 'scale(0.97)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, box-shadow 0.2s ease, border 0.2s ease',
            boxShadow: isSelected ? WARM_SHADOW_HOVER : '0 2px 12px rgba(43,30,20,0.06)',
            overflow: 'hidden',
          };

          const labelStyle: React.CSSProperties = {
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.15)',
            fontFamily: FONT_BODY,
            textAlign: 'center',
          };

          return (
            <button
              key={occ.value}
              onClick={() => !selected && handleSelect(occ.value)}
              disabled={!!selected}
              style={cardStyle}
              onMouseEnter={(e) => {
                if (!selected) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                  (e.currentTarget as HTMLElement).style.boxShadow = WARM_SHADOW_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(43,30,20,0.06)';
                }
              }}
            >
              {style.icon}
              <span style={labelStyle}>{occ.label}</span>

              {/* Checkmark overlay */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.18)',
                  borderRadius: 15,
                }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="12" fill="white" opacity="0.9" />
                    <path d="M9 14.5l3.5 3.5 6.5-7" stroke="#3D3530" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

export function NamesPreviewCard({ names, occasion }: NamesPreviewCardProps) {
  const isSolo = !names[1];
  const displayText = isSolo ? names[0] : `${names[0]} & ${names[1]}`;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    marginTop: '14px',
    padding: '28px 24px',
    borderRadius: RADIUS,
    background: GLASS_BG,
    backdropFilter: BACKDROP,
    WebkitBackdropFilter: BACKDROP,
    border: GLASS_BORDER,
    boxShadow: WARM_SHADOW,
    overflow: 'hidden',
    textAlign: 'center',
  };

  const gradientOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: occasionGradient(occasion),
    pointerEvents: 'none',
    borderRadius: RADIUS,
  };

  const decorativeCharStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '5rem',
    fontFamily: FONT_HEADING,
    fontStyle: 'italic',
    color: COLOR_INK_SOFT,
    opacity: 0.06,
    pointerEvents: 'none',
    lineHeight: 1,
  };

  const namesStyle: React.CSSProperties = {
    position: 'relative',
    fontSize: '1.5rem',
    fontFamily: FONT_HEADING,
    fontStyle: 'italic',
    fontWeight: 400,
    color: COLOR_INK_SOFT,
    lineHeight: 1.3,
    zIndex: 1,
  };

  return (
    <motion.div {...fadeIn}>
      <div style={cardStyle}>
        <div style={gradientOverlayStyle} />
        {!isSolo && <div style={decorativeCharStyle}>&amp;</div>}
        <p style={namesStyle}>{displayText}</p>
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

export function CountdownCard({ date, names, occasion }: CountdownCardProps) {
  const { daysUntil, formatted, isExciting } = useMemo(() => {
    const target = new Date(date + 'T12:00:00');
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const fmt = target.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return {
      daysUntil: days,
      formatted: fmt,
      isExciting: days <= 30,
    };
  }, [date]);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    marginTop: '14px',
    padding: '24px 24px 24px 32px',
    borderRadius: RADIUS,
    background: GLASS_BG,
    backdropFilter: BACKDROP,
    WebkitBackdropFilter: BACKDROP,
    border: GLASS_BORDER,
    boxShadow: WARM_SHADOW,
    overflow: 'hidden',
  };

  const accentStripStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '5px',
    height: '100%',
    background: occasionGradient(occasion)
      .replace('rgba', 'rgba')
      .includes('linear-gradient')
      ? `linear-gradient(180deg, ${COLOR_OLIVE} 0%, rgba(163,177,138,0.4) 100%)`
      : COLOR_OLIVE,
    borderRadius: '20px 0 0 20px',
  };

  const numberStyle: React.CSSProperties = {
    fontSize: '3rem',
    fontFamily: FONT_HEADING,
    fontWeight: 400,
    fontStyle: 'italic',
    color: COLOR_INK_SOFT,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '0.82rem',
    fontFamily: FONT_BODY,
    fontWeight: 600,
    color: COLOR_MUTED,
    marginTop: '4px',
  };

  const dateStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontFamily: FONT_BODY,
    color: COLOR_MUTED,
    marginTop: '12px',
    fontWeight: 500,
  };

  const excitedStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontFamily: FONT_BODY,
    fontWeight: 600,
    color: COLOR_OLIVE,
    marginTop: '8px',
  };

  return (
    <motion.div {...fadeIn}>
      <div style={cardStyle}>
        <div style={accentStripStyle} />
        <div style={numberStyle}>{daysUntil}</div>
        <div style={subtitleStyle}>
          {daysUntil === 0 ? "It's today!" : daysUntil === 1 ? 'day to go' : 'days to go'}
        </div>
        {isExciting && daysUntil > 0 && (
          <div style={excitedStyle}>It&apos;s almost here!</div>
        )}
        <div style={dateStyle}>{formatted}</div>
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
  const cardStyle: React.CSSProperties = {
    marginTop: '14px',
    borderRadius: RADIUS,
    background: GLASS_BG,
    backdropFilter: BACKDROP,
    WebkitBackdropFilter: BACKDROP,
    border: GLASS_BORDER,
    boxShadow: WARM_SHADOW,
    overflow: 'hidden',
  };

  const venueNameStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    color: COLOR_INK_SOFT,
    fontFamily: FONT_BODY,
    padding: '18px 20px 12px',
  };

  const mapAreaStyle: React.CSSProperties = {
    position: 'relative',
    margin: '0 16px',
    height: '120px',
    borderRadius: 12,
    background: 'linear-gradient(145deg, rgba(163,177,138,0.15) 0%, rgba(200,195,185,0.2) 50%, rgba(180,170,158,0.15) 100%)',
    border: '1px solid rgba(163,177,138,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const pinIcon = (
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none">
      <path
        d="M16 2C9.4 2 4 7.4 4 14c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"
        fill={COLOR_OLIVE}
        opacity="0.7"
      />
      <circle cx="16" cy="14" r="5" fill="white" opacity="0.9" />
    </svg>
  );

  const addressStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: COLOR_MUTED,
    fontFamily: FONT_BODY,
    padding: '10px 20px 0',
    lineHeight: 1.5,
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    padding: '16px 20px 18px',
  };

  const primaryBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 12,
    border: 'none',
    background: COLOR_OLIVE,
    color: 'white',
    fontSize: '0.82rem',
    fontWeight: 700,
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const ghostBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 12,
    border: '1px solid rgba(163,177,138,0.3)',
    background: 'transparent',
    color: COLOR_MUTED,
    fontSize: '0.82rem',
    fontWeight: 600,
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  return (
    <motion.div {...fadeIn}>
      <div style={cardStyle}>
        <div style={venueNameStyle}>{venue}</div>
        <div style={mapAreaStyle}>{pinIcon}</div>
        {address && <div style={addressStyle}>{address}</div>}
        <div style={buttonRowStyle}>
          <button
            style={primaryBtnStyle}
            onClick={onConfirm}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.88';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            That&apos;s the spot
          </button>
          <button
            style={ghostBtnStyle}
            onClick={onEdit}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
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
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [date]);

  const gradient = vibeGradient(vibe);
  const isDarkVibe = vibe?.toLowerCase().includes('dark') || vibe?.toLowerCase().includes('moody') || vibe?.toLowerCase().includes('gothic');

  const cardStyle: React.CSSProperties = {
    marginTop: '14px',
    borderRadius: RADIUS,
    background: GLASS_BG,
    backdropFilter: BACKDROP,
    WebkitBackdropFilter: BACKDROP,
    border: GLASS_BORDER,
    boxShadow: WARM_SHADOW,
    overflow: 'hidden',
  };

  const subtitleBarStyle: React.CSSProperties = {
    padding: '14px 20px 10px',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: COLOR_MUTED,
    fontFamily: FONT_BODY,
  };

  const previewAreaStyle: React.CSSProperties = {
    margin: '0 16px',
    borderRadius: 14,
    background: gradient,
    padding: '36px 24px 28px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const previewNamesStyle: React.CSSProperties = {
    fontFamily: FONT_HEADING,
    fontStyle: 'italic',
    fontSize: '1.6rem',
    fontWeight: 400,
    color: isDarkVibe ? 'rgba(255,255,255,0.92)' : 'white',
    textShadow: isDarkVibe ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
    lineHeight: 1.25,
    position: 'relative',
    zIndex: 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.68rem',
    fontWeight: 600,
    fontFamily: FONT_BODY,
    color: isDarkVibe ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.75)',
    marginTop: '10px',
    letterSpacing: '0.05em',
    position: 'relative',
    zIndex: 1,
  };

  const metaRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '6px 14px',
    padding: '14px 20px 18px',
  };

  const metaTagStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: COLOR_MUTED,
    fontFamily: FONT_BODY,
  };

  const labels: string[] = [];
  if (occasion) labels.push(occasion.charAt(0).toUpperCase() + occasion.slice(1));
  if (formattedDate) labels.push(formattedDate);
  if (venue && venue !== 'TBD') labels.push(venue);

  return (
    <motion.div {...fadeIn}>
      <div style={cardStyle}>
        <div style={subtitleBarStyle}>Here&apos;s a taste of what we&apos;re building</div>
        <div style={previewAreaStyle}>
          <p style={previewNamesStyle}>{displayNames}</p>
          {labels.length > 0 && (
            <p style={labelStyle}>
              {labels.join('  /  ')}
            </p>
          )}
        </div>
        {labels.length > 0 && (
          <div style={metaRowStyle}>
            {labels.map((l, i) => (
              <span key={i} style={metaTagStyle}>{l}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
