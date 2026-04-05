'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/MoodBoardSwipe.tsx
// Mood board card carousel — swipe left/right to select vibes.
// Premium SVG icons replace emojis for a refined aesthetic.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Custom SVG mood icons ────────────────────────────────────

function SunriseIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="18" r="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 7V4M24.5 11.5L26.5 9.5M7.5 11.5L5.5 9.5M28 18H31M1 18H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 26H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LeafMinimalIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 28C8 28 6 18 12 12C18 6 28 4 28 4C28 4 26 14 20 20C14 26 8 28 8 28Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 18L28 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function CandleIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="14" width="8" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 10C16 10 13 7 16 4C19 7 16 10 16 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function WaveIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 16C2 16 6 10 10 10C14 10 14 22 18 22C22 22 22 10 26 10C30 10 30 16 30 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 22C2 22 6 16 10 16C14 16 14 28 18 28C22 28 22 16 26 16C30 16 30 22 30 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function DiamondIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 10H24L16 2L8 10Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" opacity="0.4" />
      <path d="M8 10L16 30" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M24 10L16 30" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function FloralIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 4C16 4 19 8 19 11C19 14 16 13 16 13C16 13 13 14 13 11C13 8 16 4 16 4Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 28C16 28 13 24 13 21C13 18 16 19 16 19C16 19 19 18 19 21C19 24 16 28 16 28Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 16C4 16 8 13 11 13C14 13 13 16 13 16C13 16 14 19 11 19C8 19 4 16 4 16Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M28 16C28 16 24 19 21 19C18 19 19 16 19 16C19 16 18 13 21 13C24 13 28 16 28 16Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function GrainIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="22" cy="22" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function WoodIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="16" rx="12" ry="12" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="8" ry="8" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <ellipse cx="16" cy="16" rx="4" ry="4" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function MorningIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="14" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 4V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 8L25.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 8L6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 26H28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 22H26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

// ── Mood card data ───────────────────────────────────────────

const MOOD_CARDS = [
  { id: 'golden', label: 'Golden Hour & Film Grain', words: 'warm golden analog nostalgic', Icon: SunriseIcon, gradient: 'linear-gradient(135deg, #D4A574 0%, #C4854A 50%, #8B5E3C 100%)', bg: 'rgba(212,165,116,0.06)' },
  { id: 'minimal', label: 'Clean Lines & Morning Light', words: 'minimal modern crisp airy', Icon: MorningIcon, gradient: 'linear-gradient(135deg, #F5F5F0 0%, #E8E8E0 50%, #D0D0C8 100%)', bg: 'rgba(200,200,192,0.06)' },
  { id: 'botanical', label: 'Wildflowers & Handwriting', words: 'botanical organic wild romantic', Icon: LeafMinimalIcon, gradient: 'linear-gradient(135deg, #8B9B6A 0%, #6B8B5E 50%, #4A6B45 100%)', bg: 'rgba(139,155,106,0.06)' },
  { id: 'moody', label: 'Velvet & Candlelight', words: 'moody dramatic intimate dark', Icon: CandleIcon, gradient: 'linear-gradient(135deg, #4A3060 0%, #6B4080 50%, #3A2050 100%)', bg: 'rgba(74,48,96,0.06)' },
  { id: 'coastal', label: 'Sea Glass & Driftwood', words: 'coastal breezy natural earthy', Icon: WaveIcon, gradient: 'linear-gradient(135deg, #7BA7BC 0%, #5B8FA8 50%, #3D6E80 100%)', bg: 'rgba(123,167,188,0.06)' },
  { id: 'editorial', label: 'Black & White Editorial', words: 'editorial graphic bold classic', Icon: DiamondIcon, gradient: 'linear-gradient(135deg, #2A2A2A 0%, #4A4A4A 50%, #1A1A1A 100%)', bg: 'rgba(42,42,42,0.04)' },
  { id: 'garden', label: 'English Garden Party', words: 'garden romantic soft pastel', Icon: FloralIcon, gradient: 'linear-gradient(135deg, #E8B4C0 0%, #D49AB0 50%, #C080A0 100%)', bg: 'rgba(232,180,192,0.06)' },
  { id: 'rustic', label: 'Barn & Timber & Twine', words: 'rustic earthy warm handcrafted', Icon: WoodIcon, gradient: 'linear-gradient(135deg, #8B7355 0%, #6B5540 50%, #4A3828 100%)', bg: 'rgba(139,115,85,0.06)' },
];

// ── Component ────────────────────────────────────────────────

interface MoodBoardSwipeProps {
  onComplete: (vibeWords: string) => void;
  onSkip: () => void;
}

export function MoodBoardSwipe({ onComplete, onSkip }: MoodBoardSwipeProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('right');
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);

  const handleSwipe = useCallback((dir: 'left' | 'right') => {
    setExitDir(dir);
    setFeedback(dir === 'right' ? 'yes' : 'no');
    setTimeout(() => setFeedback(null), 600);

    if (dir === 'right') {
      setChosen(prev => [...prev, MOOD_CARDS[currentIdx].words]);
    }
    if (currentIdx >= MOOD_CARDS.length - 1) {
      setTimeout(() => setShowSummary(true), 300);
    } else {
      setCurrentIdx(i => i + 1);
    }
  }, [currentIdx]);

  const card = MOOD_CARDS[currentIdx];
  const bgColor = card?.bg || 'transparent';

  // ── Summary screen ──
  if (showSummary) {
    const vibeWords = chosen.join(', ');
    const hasChosen = chosen.length > 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', padding: '2rem 1rem' }}
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontStyle: 'italic',
            fontSize: '1.3rem',
            fontWeight: 600,
            color: 'var(--pl-ink-soft)',
            marginBottom: '0.5rem',
          }}
        >
          {hasChosen ? 'Your aesthetic is taking shape' : "We'll learn as you go"}
        </motion.p>
        <p style={{ fontSize: '0.85rem', color: 'var(--pl-muted)', marginBottom: '2rem' }}>
          {hasChosen ? `${chosen.length} vibes selected` : 'No worries — you can refine later'}
        </p>

        {hasChosen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
            {chosen.flatMap(w => w.split(' ')).filter(Boolean).map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  background: 'var(--pl-olive-mist)',
                  color: 'var(--pl-olive-deep)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        )}

        <Button variant="primary" size="lg" onClick={() => onComplete(vibeWords)} icon={<ArrowRight size={15} />}>
          Continue with this vibe
        </Button>
      </motion.div>
    );
  }

  // ── Card carousel ──
  const CardIcon = card.Icon;

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--pl-olive-deep)',
          marginBottom: '8px',
        }}>
          Mood Discovery
        </p>
        <h3 style={{
          fontFamily: 'var(--pl-font-heading)',
          fontSize: '1.6rem',
          fontWeight: 500,
          fontStyle: 'italic',
          color: 'var(--pl-ink-soft)',
          marginBottom: '4px',
        }}>
          Swipe to choose your aesthetic
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted)' }}>
          Right = love it, Left = skip it
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '1.5rem' }}>
        {MOOD_CARDS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === currentIdx ? '20px' : '6px',
              background: i < currentIdx
                ? 'var(--pl-olive)'
                : i === currentIdx
                  ? 'var(--pl-ink)'
                  : 'var(--pl-divider)',
            }}
            transition={{ duration: 0.3 }}
            style={{ height: '6px', borderRadius: '3px' }}
          />
        ))}
      </div>

      {/* Card */}
      <motion.div
        style={{
          background: bgColor,
          borderRadius: '24px',
          padding: '12px',
          transition: 'background 0.5s ease',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, x: 60, rotateZ: 3 }}
            animate={{ opacity: 1, x: 0, rotateZ: 0 }}
            exit={{
              opacity: 0,
              x: exitDir === 'right' ? 200 : -200,
              rotateZ: exitDir === 'right' ? 12 : -12,
            }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80) handleSwipe('right');
              else if (info.offset.x < -80) handleSwipe('left');
            }}
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              cursor: 'grab',
              position: 'relative',
            }}
          >
            {/* Gradient background */}
            <div style={{
              width: '100%',
              height: '280px',
              background: card.gradient,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              position: 'relative',
            }}>
              {/* SVG Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  width: '72px', height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                <CardIcon size={32} />
              </motion.div>

              {/* Label */}
              <motion.h4
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontFamily: 'var(--pl-font-heading)',
                  fontSize: '1.25rem',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  color: 'white',
                  textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  textAlign: 'center',
                  padding: '0 2rem',
                  margin: 0,
                }}
              >
                {card.label}
              </motion.h4>

              {/* Vibe words */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', padding: '0 1.5rem' }}>
                {card.words.split(' ').map((word) => (
                  <span key={word} style={{
                    padding: '3px 10px',
                    borderRadius: '100px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Feedback indicator */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px', height: '60px',
                borderRadius: '50%',
                background: feedback === 'yes' ? 'var(--pl-olive)' : 'var(--pl-warning)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 700,
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              {feedback === 'yes' ? '✓' : '✗'}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action buttons */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '16px',
        marginTop: '1.5rem',
      }}>
        <motion.button
          onClick={() => handleSwipe('left')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            border: '2px solid var(--pl-divider)',
            background: 'white',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pl-muted)',
          }}
        >
          <ChevronLeft size={20} />
        </motion.button>

        <motion.button
          onClick={() => handleSwipe('right')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            border: '2px solid var(--pl-olive)',
            background: 'var(--pl-olive-deep)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      {/* Skip */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'var(--pl-font-heading)',
            fontStyle: 'italic',
            color: 'var(--pl-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          }}
        >
          Skip mood board
        </button>
      </div>

      {/* Card counter */}
      <p style={{
        textAlign: 'center', marginTop: '0.75rem',
        fontSize: '0.68rem', fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--pl-muted)',
      }}>
        {currentIdx + 1} of {MOOD_CARDS.length}
      </p>
    </div>
  );
}
