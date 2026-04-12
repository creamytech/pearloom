'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ParchmentTintPanel.tsx
// Photo filter system with 4 warm tint presets + apply button
// Matches Stitch "Photo Atelier" Properties panel
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { Button } from '@/components/ui/button';

const TINTS = [
  { id: 'none',      label: 'None',      color: '#FFFFFF', filter: 'none' },
  { id: 'ivory',     label: 'Ivory',     color: '#FFFFF0', filter: 'sepia(0.08) saturate(1.1)' },
  { id: 'linen',     label: 'Linen',     color: '#FAF0E6', filter: 'sepia(0.15) saturate(0.95) brightness(1.02)' },
  { id: 'parchment', label: 'Parchment', color: '#F5E6C8', filter: 'sepia(0.25) saturate(0.85) contrast(1.04)' },
  { id: 'sepia',     label: 'Sepia',     color: '#D2B48C', filter: 'sepia(0.4) saturate(0.8) brightness(0.98)' },
] as const;

type TintId = typeof TINTS[number]['id'];

interface ParchmentTintPanelProps {
  currentTint?: TintId;
  onApply: (tint: TintId) => void;
}

export function ParchmentTintPanel({ currentTint = 'none', onApply }: ParchmentTintPanelProps) {
  const [selected, setSelected] = useState<TintId>(currentTint);
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    onApply(selected);
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  return (
    <div style={{ padding: '16px' }}>
      <h4 style={{
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: '#71717A',
        marginBottom: '12px',
      }}>
        Parchment Tint
      </h4>

      {/* Tint swatches */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {TINTS.map((tint) => (
          <motion.button
            key={tint.id}
            onClick={() => setSelected(tint.id)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            title={tint.label}
            style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              border: selected === tint.id
                ? '3px solid #18181B'
                : '2px solid rgba(255,255,255,0.25)',
              background: tint.color,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s',
              boxShadow: selected === tint.id
                ? '0 0 0 2px rgba(110,140,92,0.2)'
                : 'none',
            }}
          >
            {selected === tint.id && (
              <Check size={14} strokeWidth={3} color="#18181B" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Selected label */}
      <p style={{
        fontSize: '0.78rem',
        color: '#3F3F46',
        fontFamily: 'inherit',
        
        marginBottom: '16px',
      }}>
        {TINTS.find(t => t.id === selected)?.label || 'None'}
        {selected !== 'none' && (
          <span style={{ color: '#71717A', fontStyle: 'normal', fontSize: '0.68rem', marginLeft: '8px' }}>
            Applied to all photos
          </span>
        )}
      </p>

      {/* Apply button */}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={handleApply}
        icon={applied ? <Check size={14} /> : <Sparkles size={14} />}
      >
        {applied ? 'Filter Applied' : 'Apply Filter'}
      </Button>
    </div>
  );
}

export { TINTS };
export type { TintId };
