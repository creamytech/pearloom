'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOOD_CARDS = [
  { id: 'golden', label: 'Golden Hour & Film Grain', words: 'warm golden analog nostalgic', emoji: '🌅', gradient: 'linear-gradient(135deg, #D4A574 0%, #C4854A 50%, #8B5E3C 100%)', bg: 'rgba(212,165,116,0.06)' },
  { id: 'minimal', label: 'Clean Lines & Morning Light', words: 'minimal modern crisp airy', emoji: '☀️', gradient: 'linear-gradient(135deg, #F5F5F0 0%, #E8E8E0 50%, #D0D0C8 100%)', bg: 'rgba(200,200,192,0.06)' },
  { id: 'botanical', label: 'Wildflowers & Handwriting', words: 'botanical organic wild romantic', emoji: '🌿', gradient: 'linear-gradient(135deg, #8B9B6A 0%, #6B8B5E 50%, #4A6B45 100%)', bg: 'rgba(139,155,106,0.06)' },
  { id: 'moody', label: 'Velvet & Candlelight', words: 'moody dramatic intimate dark', emoji: '🕯️', gradient: 'linear-gradient(135deg, #4A3060 0%, #6B4080 50%, #3A2050 100%)', bg: 'rgba(74,48,96,0.06)' },
  { id: 'coastal', label: 'Sea Glass & Driftwood', words: 'coastal breezy natural earthy', emoji: '🌊', gradient: 'linear-gradient(135deg, #7BA7BC 0%, #5B8FA8 50%, #3D6E80 100%)', bg: 'rgba(123,167,188,0.06)' },
  { id: 'editorial', label: 'Black & White Editorial', words: 'editorial graphic bold classic', emoji: '🖤', gradient: 'linear-gradient(135deg, #2A2A2A 0%, #4A4A4A 50%, #1A1A1A 100%)', bg: 'rgba(42,42,42,0.04)' },
  { id: 'garden', label: 'English Garden Party', words: 'garden romantic soft pastel', emoji: '🌸', gradient: 'linear-gradient(135deg, #E8B4C0 0%, #D49AB0 50%, #C080A0 100%)', bg: 'rgba(232,180,192,0.06)' },
  { id: 'rustic', label: 'Barn & Timber & Twine', words: 'rustic earthy warm handcrafted', emoji: '🪵', gradient: 'linear-gradient(135deg, #8B7355 0%, #6B5540 50%, #4A3828 100%)', bg: 'rgba(139,115,85,0.06)' },
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
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: '1.3rem',
            fontWeight: 600,
            color: 'var(--pl-ink-soft, #3D3530)',
            marginBottom: '0.5rem',
          }}
        >
          {hasChosen ? 'Your aesthetic is taking shape' : "We'll learn as you go"}
        </motion.p>
        <p style={{ fontSize: '0.85rem', color: 'var(--pl-muted, #888)', marginBottom: '2rem' }}>
          {hasChosen ? `${chosen.length} vibes selected` : 'No worries — you can refine later'}
        </p>

        {hasChosen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
            {chosen.flatMap(w => w.split(' ')).filter(Boolean).map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  background: 'rgba(163,177,138,0.15)',
                  border: '1px solid rgba(163,177,138,0.35)',
                  color: 'var(--pl-ink, #333)',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-heading, Georgia, serif)',
                  fontStyle: 'italic',
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onComplete(vibeWords)}
          style={{
            padding: '0.85rem 2.5rem',
            borderRadius: '999px',
            background: 'var(--pl-olive, #6B7355)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            boxShadow: '0 4px 20px rgba(163,177,138,0.3)',
          }}
        >
          Continue →
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{ backgroundColor: bgColor }}
      transition={{ duration: 0.6 }}
      style={{ padding: '1rem 0 2rem', borderRadius: '24px' }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-heading, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--pl-ink-soft, #3D3530)',
          margin: '0 0 0.25rem',
        }}>
          Swipe right for vibes that feel like you
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted, #888)', margin: 0 }}>
          This shapes your entire site design
        </p>
      </div>

      {/* Swipe feedback overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              fontSize: '3rem',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
            }}
          >
            {feedback === 'yes' ? '✨' : '👋'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card area — significantly larger */}
      <div style={{ position: 'relative', height: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 60, opacity: 0, rotate: 3 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: exitDir === 'right' ? -220 : 220, opacity: 0, rotate: exitDir === 'right' ? -15 : 15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 70) handleSwipe('right');
              else if (info.offset.x < -70) handleSwipe('left');
            }}
            style={{
              width: 'min(380px, 88vw)',
              height: '400px',
              borderRadius: '24px',
              background: card.gradient,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '2.5rem',
              boxShadow: '0 24px 70px rgba(0,0,0,0.28), 0 8px 20px rgba(0,0,0,0.12)',
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              style={{ fontSize: '3.5rem', marginBottom: '1rem' }}
            >
              {card.emoji}
            </motion.div>
            <h3 style={{
              color: 'rgba(255,255,255,0.95)',
              fontFamily: 'var(--font-heading, Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '1.5rem',
              fontWeight: 600,
              textAlign: 'center',
              margin: 0,
              textShadow: '0 2px 12px rgba(0,0,0,0.35)',
              lineHeight: 1.3,
            }}>
              {card.label}
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.82rem',
              marginTop: '0.5rem',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              {card.words.split(' ').join(' · ')}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Yes/No buttons — larger and more prominent */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => handleSwipe('left')}
          style={{
            position: 'absolute',
            left: 'max(1rem, calc(50% - 240px))',
            bottom: '0rem',
            padding: '0.65rem 1.5rem',
            borderRadius: '999px',
            background: 'rgba(220,80,80,0.08)',
            border: '1.5px solid rgba(220,80,80,0.25)',
            color: 'rgba(180,60,60,0.85)',
            cursor: 'pointer',
            fontSize: '0.92rem',
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontWeight: 600,
          }}
        >
          ✕ Not me
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => handleSwipe('right')}
          style={{
            position: 'absolute',
            right: 'max(1rem, calc(50% - 240px))',
            bottom: '0rem',
            padding: '0.65rem 1.5rem',
            borderRadius: '999px',
            background: 'rgba(80,140,80,0.08)',
            border: '1.5px solid rgba(80,140,80,0.25)',
            color: 'rgba(50,110,50,0.85)',
            cursor: 'pointer',
            fontSize: '0.92rem',
            fontFamily: 'var(--font-heading, Georgia, serif)',
            fontWeight: 600,
          }}
        >
          ✓ Love it
        </motion.button>
      </div>

      {/* Progress bar (replaces dots for better visibility) */}
      <div style={{ maxWidth: '300px', margin: '2.5rem auto 0', padding: '0 1rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--pl-olive, #6B7355)', letterSpacing: '0.05em' }}>
            {currentIdx + 1} / {MOOD_CARDS.length}
          </span>
          {chosen.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted, #999)' }}>
              {chosen.length} liked
            </span>
          )}
        </div>
        <div style={{
          height: '4px', borderRadius: '2px',
          background: 'rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${((currentIdx + 1) / MOOD_CARDS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%', borderRadius: '2px',
              background: 'var(--pl-olive, #6B7355)',
            }}
          />
        </div>
      </div>

      {/* Skip */}
      <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pl-muted, #999)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: 'var(--font-heading, Georgia, serif)',
          }}
        >
          Skip this step
        </button>
      </div>
    </motion.div>
  );
}
