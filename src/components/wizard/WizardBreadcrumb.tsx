'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/WizardBreadcrumb.tsx
//
// The chip row above the wizard card. Shows every answer the
// user has already given with the value they picked. Clicking a
// chip resets that field on `collected`, which makes
// `currentStep()` rewind to it — the user can fix a typo or
// change their mind without starting over.
//
// Design note: clicking a chip only clears THAT field, not
// everything after it. If you go back to edit the date, the
// venue + vibe + photos you'd already picked stay intact, so
// you can re-confirm the date and jump back to where you were.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

export type BreadcrumbStepKey =
  | 'occasion'
  | 'names'
  | 'date'
  | 'venue'
  | 'vibe'
  | 'photos'
  | 'layout';

interface Collected {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
  storyLayout?: string;
}

export interface WizardBreadcrumbProps {
  collected: Collected;
  /** Current step ID — highlighted in the chip row. */
  currentStep: string;
  /** Reset a single field. */
  onEditField: (field: BreadcrumbStepKey) => void;
  /** Visual tone — lighter on dark vibes. */
  dark?: boolean;
}

interface StepMeta {
  key: BreadcrumbStepKey;
  label: string;
  currentStepMatch: string[];
  display: (c: Collected) => string | null;
}

const STEPS: StepMeta[] = [
  {
    key: 'occasion',
    label: 'Occasion',
    currentStepMatch: ['occasion'],
    display: (c) => {
      if (!c.occasion) return null;
      return c.occasion.charAt(0).toUpperCase() + c.occasion.slice(1);
    },
  },
  {
    key: 'names',
    label: 'Names',
    currentStepMatch: ['names'],
    display: (c) => {
      if (!c.names?.[0]) return null;
      if (c.names[1]) return `${c.names[0]} & ${c.names[1]}`;
      return c.names[0];
    },
  },
  {
    key: 'date',
    label: 'Date',
    currentStepMatch: ['date'],
    display: (c) => {
      if (!c.date) return null;
      try {
        return new Date(`${c.date}T12:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return c.date;
      }
    },
  },
  {
    key: 'venue',
    label: 'Venue',
    currentStepMatch: ['venue'],
    display: (c) => {
      if (!c.venue) return null;
      if (c.venue === 'TBD') return 'TBD';
      // Trim long venue strings so the chip doesn't blow up the row.
      return c.venue.length > 28 ? `${c.venue.slice(0, 26)}…` : c.venue;
    },
  },
  {
    key: 'vibe',
    label: 'Vibe',
    currentStepMatch: ['vibe-ask', 'vibe-pick'],
    display: (c) => {
      if (!c.vibe) return null;
      return c.vibe.length > 24 ? `${c.vibe.slice(0, 22)}…` : c.vibe;
    },
  },
  {
    key: 'photos',
    label: 'Photos',
    currentStepMatch: ['photos', 'photo-review'],
    display: () => null,
  },
  {
    key: 'layout',
    label: 'Layout',
    currentStepMatch: ['layout'],
    display: (c) => {
      if (!c.storyLayout) return null;
      return c.storyLayout.charAt(0).toUpperCase() + c.storyLayout.slice(1);
    },
  },
];

export function WizardBreadcrumb({
  collected,
  currentStep,
  onEditField,
  dark = false,
}: WizardBreadcrumbProps) {
  // Show only the chips up to and including the current step —
  // no point teasing the user with future steps they haven't hit.
  const activeIdx = STEPS.findIndex((s) =>
    s.currentStepMatch.includes(currentStep),
  );
  const visibleSteps = STEPS.slice(
    0,
    activeIdx >= 0 ? activeIdx + 1 : STEPS.length,
  );

  const palette = dark
    ? {
        rule: 'rgba(184,147,90,0.55)',
        eyebrow: 'rgba(212,175,55,0.85)',
        folio: 'rgba(212,175,55,0.75)',
        folioIdle: 'rgba(255,255,255,0.35)',
        label: 'rgba(250,247,242,0.85)',
        labelIdle: 'rgba(250,247,242,0.45)',
        value: '#FAF7F2',
        activeBg: 'rgba(212,175,55,0.18)',
        activeBorder: 'rgba(212,175,55,0.65)',
        activeFolio: '#F0D484',
        doneValue: 'rgba(250,247,242,0.92)',
        accent: 'rgba(212,175,55,0.85)',
      }
    : {
        rule: 'rgba(184,147,90,0.45)',
        eyebrow: 'rgba(184,147,90,0.85)',
        folio: 'rgba(184,147,90,0.85)',
        folioIdle: 'rgba(184,147,90,0.35)',
        label: 'var(--pl-ink, #18181B)',
        labelIdle: 'rgba(82,82,91,0.55)',
        value: 'var(--pl-ink, #18181B)',
        activeBg: 'rgba(184,147,90,0.14)',
        activeBorder: 'rgba(184,147,90,0.65)',
        activeFolio: 'rgba(184,147,90,1)',
        doneValue: 'var(--pl-ink, #18181B)',
        accent: 'rgba(184,147,90,0.95)',
      };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        paddingBottom: 10,
      }}
    >
      {/* Chip row — warm pills, no folio numbers, no mono caps. Shows
          what's been answered so far with the value; current step gets
          a groovy halo. Click a done chip to edit that field. */}
      <div
        role="list"
        style={{
          display: 'flex',
          gap: 8,
          padding: 2,
          flexWrap: 'wrap',
        }}
      >
        <AnimatePresence>
          {visibleSteps.map((step, i) => {
            const value = step.display(collected);
            const isActive = step.currentStepMatch.includes(currentStep);
            const isDone = !!value && !isActive;
            const isIdle = !isDone && !isActive;

            return (
              <motion.button
                key={step.key}
                type="button"
                role="listitem"
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() => { if (isDone) onEditField(step.key); }}
                disabled={!isDone}
                aria-label={
                  isDone
                    ? `Edit ${step.label}: ${value}`
                    : isActive
                    ? `Current step: ${step.label}`
                    : step.label
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${isActive ? palette.activeBorder : isDone ? palette.accent + '55' : palette.rule}`,
                  background: isActive
                    ? palette.activeBg
                    : isDone
                    ? `color-mix(in oklab, ${palette.accent} 14%, transparent)`
                    : 'transparent',
                  boxShadow: isActive
                    ? `0 0 0 3px color-mix(in oklab, ${palette.activeBorder} 22%, transparent)`
                    : 'none',
                  cursor: isDone ? 'pointer' : 'default',
                  textAlign: 'left',
                  transition:
                    'background var(--pl-dur-fast) var(--pl-ease-out),' +
                    ' box-shadow var(--pl-dur-fast) var(--pl-ease-out),' +
                    ' border-color var(--pl-dur-fast) var(--pl-ease-out)',
                  opacity: isIdle ? 0.55 : 1,
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 700 : 500,
                  lineHeight: 1.2,
                  color: isActive ? palette.value : isDone ? palette.doneValue : palette.labelIdle,
                  letterSpacing: '-0.005em',
                }}
              >
                <span style={{ color: isActive ? palette.value : palette.label, fontWeight: 600 }}>
                  {step.label}
                </span>
                {value && (
                  <>
                    <span aria-hidden style={{ opacity: 0.5 }}>·</span>
                    <span style={{
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {value}
                    </span>
                  </>
                )}
                {isDone && (
                  <span aria-hidden style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: palette.accent,
                    marginLeft: 2,
                  }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
