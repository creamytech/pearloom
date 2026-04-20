'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ParchmentTintPanel.tsx
// Photo filter system with warm tint presets + apply button.
// Migrated to the panel/ token system so chrome stays in lock-step
// with the rest of the editor.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PanelRoot,
  PanelSection,
  panelText,
  panelWeight,
  panelTracking,
} from './panel';

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
  // Item #60: the warm filters are almost invisible over dark-mode
  // surfaces — surface a note so users know why they can't see it.
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      const attr = document.documentElement.getAttribute('data-theme');
      setIsDark(
        attr === 'dark' ||
          (attr !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches),
      );
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  const handleApply = () => {
    onApply(selected);
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  const selectedTint = TINTS.find((t) => t.id === selected);

  return (
    <PanelRoot>
      <PanelSection title="Parchment Tint" hint="A warm wash applied to every photo on the site.">
        {isDark && (
          <div
            style={{
              margin: '0 0 10px',
              padding: '8px 10px',
              borderRadius: 'var(--pl-radius-sm)',
              background: 'color-mix(in oklab, var(--pl-gold, #B8935A) 10%, transparent)',
              border: '1px dashed color-mix(in oklab, var(--pl-gold, #B8935A) 30%, transparent)',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--pl-ink-soft, #3A332C)',
              lineHeight: 1.5,
            }}
          >
            Dark mode active — tint effect is subtle on dark photos.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {TINTS.map((tint) => {
            const isActive = selected === tint.id;
            return (
              <motion.button
                key={tint.id}
                type="button"
                onClick={() => setSelected(tint.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.94 }}
                aria-label={tint.label}
                aria-pressed={isActive}
                title={tint.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: isActive ? '3px solid #18181B' : '1px solid #E4E4E7',
                  background: tint.color,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color var(--pl-dur-instant)',
                  boxShadow: isActive ? '0 0 0 2px rgba(24,24,27,0.12)' : 'none',
                }}
              >
                {isActive && <Check size={14} strokeWidth={3} color="#18181B" />}
              </motion.button>
            );
          })}
        </div>

        <p
          style={{
            margin: '12px 0 0',
            fontSize: panelText.body,
            lineHeight: 1.4,
            color: '#3F3F46',
          }}
        >
          {selectedTint?.label || 'None'}
          {selected !== 'none' && (
            <span
              style={{
                color: '#71717A',
                fontSize: panelText.hint,
                fontWeight: panelWeight.medium,
                letterSpacing: panelTracking.normal,
                marginLeft: 8,
              }}
            >
              Applied to all photos
            </span>
          )}
        </p>

        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleApply}
          icon={applied ? <Check size={14} /> : <Sparkles size={14} />}
          style={{ marginTop: 12 }}
        >
          {applied ? 'Filter Applied' : 'Apply Filter'}
        </Button>
      </PanelSection>
    </PanelRoot>
  );
}

export { TINTS };
export type { TintId };
