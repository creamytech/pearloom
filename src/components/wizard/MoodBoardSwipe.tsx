'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOOD_CARDS = [
  { id: 'golden', label: 'Golden Hour & Film Grain', words: 'warm golden analog nostalgic', emoji: '🌅', gradient: 'linear-gradient(135deg, #D4A574 0%, #C4854A 50%, #8B5E3C 100%)' },
  { id: 'minimal', label: 'Clean Lines & Morning Light', words: 'minimal modern crisp airy', emoji: '☀️', gradient: 'linear-gradient(135deg, #F5F5F0 0%, #E8E8E0 50%, #D0D0C8 100%)' },
  { id: 'botanical', label: 'Wildflowers & Handwriting', words: 'botanical organic wild romantic', emoji: '🌿', gradient: 'linear-gradient(135deg, #8B9B6A 0%, #6B8B5E 50%, #4A6B45 100%)' },
  { id: 'moody', label: 'Velvet & Candlelight', words: 'moody dramatic intimate dark', emoji: '🕯️', gradient: 'linear-gradient(135deg, #4A3060 0%, #6B4080 50%, #3A2050 100%)' },
  { id: 'coastal', label: 'Sea Glass & Driftwood', words: 'coastal breezy natural earthy', emoji: '🌊', gradient: 'linear-gradient(135deg, #7BA7BC 0%, #5B8FA8 50%, #3D6E80 100%)' },
  { id: 'editorial', label: 'Black & White Editorial', words: 'editorial graphic bold classic', emoji: '🖤', gradient: 'linear-gradient(135deg, #2A2A2A 0%, #4A4A4A 50%, #1A1A1A 100%)' },
  { id: 'garden', label: 'English Garden Party', words: 'garden romantic soft pastel', emoji: '🌸', gradient: 'linear-gradient(135deg, #E8B4C0 0%, #D49AB0 50%, #C080A0 100%)' },
  { id: 'rustic', label: 'Barn & Timber & Twine', words: 'rustic earthy warm handcrafted', emoji: '🪵', gradient: 'linear-gradient(135deg, #8B7355 0%, #6B5540 50%, #4A3828 100%)' },
];

interface MoodBoardSwipeProps {
  onComplete: (vibeWords: string) => void;
  onSkip: () => void;
}

export function MoodBoardSwipe({ onComplete, onSkip }: MoodBoardSwipeProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('right');

  const handleSwipe = (dir: 'left' | 'right') => {
    setExitDir(dir);
    if (dir === 'right') {
      setChosen(prev => [...prev, MOOD_CARDS[currentIdx].words]);
    }
    if (currentIdx >= MOOD_CARDS.length - 1) {
      setTimeout(() => setShowSummary(true), 300);
    } else {
      setCurrentIdx(i => i + 1);
    }
  };

  const card = MOOD_CARDS[currentIdx];

  if (showSummary) {
    const vibeWords = chosen.join(', ');
    const hasChosen = chosen.length > 0;

    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <p style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: '1.1rem',
          color: 'var(--pl-muted, #888)',
          marginBottom: '1.5rem',
        }}>
          {hasChosen ? 'Your aesthetic is taking shape.' : "We'll learn as you go"}
        </p>

        {hasChosen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
            {chosen.flatMap(w => w.split(' ')).filter(Boolean).map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '999px',
                  background: 'rgba(163,177,138,0.15)',
                  border: '1px solid rgba(163,177,138,0.35)',
                  color: 'var(--pl-text, #333)',
                  fontSize: '0.85rem',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        )}

        <button
          onClick={() => onComplete(vibeWords)}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '999px',
            background: 'var(--pl-olive, #6B7355)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.02em',
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 0 3rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: '1rem',
          color: 'var(--pl-muted, #888)',
          margin: 0,
        }}>
          Swipe right for vibes that feel like you
        </p>
      </div>

      {/* Card area */}
      <div style={{ position: 'relative', height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 60, opacity: 0, rotate: 3 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: exitDir === 'right' ? -200 : 200, opacity: 0, rotate: exitDir === 'right' ? -12 : 12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 80) handleSwipe('right');
              else if (info.offset.x < -80) handleSwipe('left');
            }}
            style={{
              width: 'min(320px, 85vw)',
              height: '320px',
              borderRadius: '20px',
              background: card.gradient,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{card.emoji}</div>
            <h3 style={{
              color: 'rgba(255,255,255,0.95)',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: '1.3rem',
              textAlign: 'center',
              margin: 0,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {card.label}
            </h3>
          </motion.div>
        </AnimatePresence>

        {/* Yes/No buttons */}
        <button
          onClick={() => handleSwipe('left')}
          style={{
            position: 'absolute',
            left: '1rem',
            bottom: '-3rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '999px',
            background: 'rgba(220,80,80,0.1)',
            border: '1px solid rgba(220,80,80,0.3)',
            color: 'rgba(180,60,60,0.9)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontFamily: 'Georgia, serif',
          }}
        >
          ✕ Not me
        </button>
        <button
          onClick={() => handleSwipe('right')}
          style={{
            position: 'absolute',
            right: '1rem',
            bottom: '-3rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '999px',
            background: 'rgba(80,140,80,0.1)',
            border: '1px solid rgba(80,140,80,0.3)',
            color: 'rgba(50,110,50,0.9)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontFamily: 'Georgia, serif',
          }}
        >
          ✓ Yes
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '4rem' }}>
        {MOOD_CARDS.map((_, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <motion.div
              key={i}
              animate={isCurrent ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={isCurrent ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
              style={{
                width: isCurrent ? '10px' : '8px',
                height: isCurrent ? '10px' : '8px',
                borderRadius: '50%',
                background: isCompleted
                  ? 'var(--pl-olive, #6B7355)'
                  : isCurrent
                    ? '#C4A035'
                    : 'rgba(0,0,0,0.12)',
                border: isCompleted || isCurrent ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
                transition: 'background 0.3s',
              }}
            />
          );
        })}
      </div>

      {/* Skip */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pl-muted, #999)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: 'Georgia, serif',
          }}
        >
          Skip this step
        </button>
      </div>
    </div>
  );
}
