'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/MoodBoardSwipe.tsx
// Organic glass vibe card grid — tap to select vibes
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

// ── Vibe card data with organic pastel gradients ─────────────

const VIBE_CARDS = [
  {
    id: 'romance',
    label: 'Classic Romance',
    desc: 'Timeless, elegant, deeply comforting',
    words: 'romantic elegant timeless classic',
    icon: '♡',
    gradient: 'linear-gradient(145deg, rgba(232,180,192,0.35) 0%, rgba(220,160,175,0.2) 100%)',
    borderColor: 'rgba(232,180,192,0.4)',
  },
  {
    id: 'adventure',
    label: 'Adventurous',
    desc: 'Wild, exploring the world together',
    words: 'adventurous bold wild natural',
    icon: '△',
    gradient: 'linear-gradient(145deg, rgba(163,177,138,0.3) 0%, rgba(140,160,120,0.15) 100%)',
    borderColor: 'rgba(163,177,138,0.4)',
  },
  {
    id: 'playful',
    label: 'Playful & Fun',
    desc: 'Laughter, color, and vibrant energy',
    words: 'playful colorful fun vibrant',
    icon: '✳',
    gradient: 'linear-gradient(145deg, rgba(220,200,140,0.35) 0%, rgba(200,180,120,0.15) 100%)',
    borderColor: 'rgba(220,200,140,0.4)',
  },
  {
    id: 'intimate',
    label: 'Cozy & Intimate',
    desc: 'Quiet meetings, warmth, and comfort',
    words: 'intimate cozy warm candlelit',
    icon: '◎',
    gradient: 'linear-gradient(145deg, rgba(210,185,165,0.35) 0%, rgba(190,165,145,0.15) 100%)',
    borderColor: 'rgba(210,185,165,0.45)',
  },
  {
    id: 'wanderlust',
    label: 'Wanderlust',
    desc: 'Travel-driven, worldly, cultural',
    words: 'wanderlust travel worldly cultural',
    icon: '◻',
    gradient: 'linear-gradient(145deg, rgba(155,180,200,0.35) 0%, rgba(135,165,185,0.15) 100%)',
    borderColor: 'rgba(155,180,200,0.4)',
  },
  {
    id: 'natural',
    label: 'Organic & Natural',
    desc: 'Botanical, earthy, garden-inspired',
    words: 'botanical organic natural earthy',
    icon: '❋',
    gradient: 'linear-gradient(145deg, rgba(170,190,150,0.35) 0%, rgba(150,175,130,0.15) 100%)',
    borderColor: 'rgba(170,190,150,0.45)',
  },
];

// ── Component ────────────────────────────────────────────────

interface MoodBoardSwipeProps {
  onComplete: (vibeWords: string) => void;
  onSkip: () => void;
}

export function MoodBoardSwipe({ onComplete, onSkip }: MoodBoardSwipeProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleCard = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleContinue = () => {
    const vibeWords = VIBE_CARDS
      .filter(c => selected.has(c.id))
      .map(c => c.words)
      .join(', ');
    onComplete(vibeWords);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h3 style={{
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
          fontWeight: 400,
          color: 'var(--pl-ink-soft)',
          marginBottom: '6px',
        }}>
          What&rsquo;s your vibe?
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--pl-muted)' }}>
          Colors, fonts, and voice all flow from this
        </p>
      </div>

      {/* 2-column organic glass card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        maxWidth: '500px',
        margin: '0 auto',
      }}>
        {VIBE_CARDS.map((card, i) => {
          const isSelected = selected.has(card.id);
          return (
            <motion.button
              key={card.id}
              onClick={() => toggleCard(card.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '20px 16px',
                borderRadius: '16px',
                border: isSelected ? '1.5px solid var(--pl-olive)' : '1px solid rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                overflow: 'hidden',
                boxShadow: isSelected
                  ? '0 4px 20px rgba(163,177,138,0.2), 0 0 0 2px rgba(163,177,138,0.15)'
                  : '0 4px 20px rgba(43,30,20,0.06)',
                minHeight: '120px',
              } as React.CSSProperties}
            >
              {/* Selected check */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'var(--pl-olive)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check size={12} color="white" strokeWidth={3} />
                </motion.div>
              )}

              {/* Icon */}
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.35)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontSize: '1.1rem',
                color: 'var(--pl-ink-soft)',
                marginBottom: '12px',
                border: '1px solid rgba(255,255,255,0.4)',
              } as React.CSSProperties}>
                {card.icon}
              </span>

              {/* Label */}
              <span style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--pl-ink)',
                lineHeight: 1.3,
                marginBottom: '4px',
              }}>
                {card.label}
              </span>

              {/* Description */}
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--pl-muted)',
                lineHeight: 1.5,
              }}>
                {card.desc}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '2rem', maxWidth: '500px', margin: '2rem auto 0',
      }}>
        <button
          onClick={onSkip}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '0.78rem', color: 'var(--pl-muted)', padding: '8px 0',
            fontWeight: 500,
          }}
        >
          Skip for now
        </button>

        <motion.button
          onClick={handleContinue}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 24px', borderRadius: '100px',
            border: selected.size > 0 ? 'none' : '1px solid rgba(255,255,255,0.5)',
            background: selected.size > 0 ? 'var(--pl-olive)' : 'rgba(255,255,255,0.45)',
            backdropFilter: selected.size > 0 ? 'none' : 'blur(20px)',
            WebkitBackdropFilter: selected.size > 0 ? 'none' : 'blur(20px)',
            color: selected.size > 0 ? 'white' : 'var(--pl-muted)',
            fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: selected.size > 0 ? '0 4px 16px rgba(163,177,138,0.3)' : '0 4px 20px rgba(43,30,20,0.06)',
          } as React.CSSProperties}
        >
          CONTINUE <ArrowRight size={14} />
        </motion.button>
      </div>
    </div>
  );
}
