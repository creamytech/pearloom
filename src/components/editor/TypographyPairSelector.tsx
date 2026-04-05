'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/TypographyPairSelector.tsx
// Typography pair dropdown — "Serif & Sans", "Mono & Serif", etc.
// Matches Stitch "Properties" panel Typography Pair control
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PAIRS = [
  {
    id: 'serif-sans',
    label: 'Serif & Sans',
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", system-ui, sans-serif',
    preview: { heading: 'Playfair Display', body: 'Inter' },
  },
  {
    id: 'mono-serif',
    label: 'Mono & Serif',
    heading: '"JetBrains Mono", monospace',
    body: '"Lora", Georgia, serif',
    preview: { heading: 'JetBrains Mono', body: 'Lora' },
  },
  {
    id: 'display-body',
    label: 'Display & Body',
    heading: '"Cormorant Garamond", Georgia, serif',
    body: '"Source Sans 3", sans-serif',
    preview: { heading: 'Cormorant Garamond', body: 'Source Sans 3' },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    heading: '"Newsreader", Georgia, serif',
    body: '"Newsreader", Georgia, serif',
    preview: { heading: 'Newsreader', body: 'Newsreader' },
  },
] as const;

type PairId = typeof PAIRS[number]['id'];

interface TypographyPairSelectorProps {
  value?: PairId;
  onChange: (pair: PairId) => void;
}

export function TypographyPairSelector({ value = 'serif-sans', onChange }: TypographyPairSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = PAIRS.find(p => p.id === value) || PAIRS[0];

  return (
    <div style={{ padding: '16px' }}>
      <h4 style={{
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--pl-muted)',
        marginBottom: '8px',
      }}>
        Typography Pair
      </h4>

      {/* Dropdown trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 'var(--pl-radius-sm)',
          border: '1.5px solid var(--pl-divider)',
          background: 'white',
          cursor: 'pointer',
          fontSize: '0.88rem',
          fontFamily: 'var(--pl-font-body)',
          color: 'var(--pl-ink)',
        }}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'var(--pl-muted)',
          }}
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              marginTop: '4px',
              borderRadius: 'var(--pl-radius-sm)',
              border: '1px solid var(--pl-divider)',
              background: 'white',
              overflow: 'hidden',
              boxShadow: 'var(--pl-shadow-md)',
            }}
          >
            {PAIRS.map((pair) => (
              <button
                key={pair.id}
                onClick={() => { onChange(pair.id); setOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '10px 14px',
                  border: 'none',
                  background: pair.id === value ? 'var(--pl-olive-mist)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (pair.id !== value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.02)';
                }}
                onMouseLeave={(e) => {
                  if (pair.id !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: pair.id === value ? 600 : 500,
                  color: pair.id === value ? 'var(--pl-olive-deep)' : 'var(--pl-ink)',
                }}>
                  {pair.label}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  color: 'var(--pl-muted)',
                }}>
                  {pair.preview.heading} + {pair.preview.body}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { PAIRS };
export type { PairId };
