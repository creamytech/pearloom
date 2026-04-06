'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const LABELS = ['Understated', 'Warm', 'Bold'] as const;

interface AlternatesCarouselProps {
  chapterId: string;
  alternates: string[];
  onSelect: (desc: string) => void;
  onClose: () => void;
}

export function AlternatesCarousel({ alternates, onSelect, onClose }: AlternatesCarouselProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: 'rgba(14,11,18,0.98)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        padding: '20px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--pl-muted)',
        }}>
          3 Alternatives
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--pl-muted)', display: 'flex', padding: '4px',
            borderRadius: '4px',
          }}
          aria-label="Close alternatives"
        >
          <X size={15} />
        </button>
      </div>

      {/* Cards row — horizontally scrollable on mobile */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {alternates.map((desc, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flex: '0 0 260px',
              background: 'rgba(22,18,28,0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Label badge */}
            <span style={{
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--pl-olive, #A3B18A)',
              background: 'rgba(163,177,138,0.1)',
              borderRadius: '100px',
              padding: '3px 8px',
              alignSelf: 'flex-start',
            }}>
              {LABELS[i] ?? `Option ${i + 1}`}
            </span>

            {/* Description text */}
            <p style={{
              fontSize: '0.84rem',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.78)',
              margin: 0,
              flex: 1,
            }}>
              {desc}
            </p>

            {/* Use this version button */}
            <button
              onClick={() => { onSelect(desc); onClose(); }}
              style={{
                padding: '8px 14px',
                borderRadius: '7px',
                border: '1px solid rgba(163,177,138,0.35)',
                background: 'rgba(163,177,138,0.12)',
                color: 'var(--pl-olive, #A3B18A)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.22)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.12)'; }}
            >
              Use this version
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
