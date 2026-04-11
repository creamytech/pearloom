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

  const chipColors = dark
    ? {
        idle: 'rgba(255,255,255,0.08)',
        idleBorder: 'rgba(255,255,255,0.14)',
        idleText: 'rgba(250,247,242,0.7)',
        done: 'rgba(163,177,138,0.22)',
        doneBorder: 'rgba(163,177,138,0.5)',
        doneText: '#FAF7F2',
        active: 'rgba(163,177,138,0.55)',
        activeBorder: 'rgba(163,177,138,0.85)',
        activeText: '#FFFFFF',
      }
    : {
        idle: 'rgba(255,255,255,0.4)',
        idleBorder: 'rgba(163,177,138,0.15)',
        idleText: 'var(--pl-muted)',
        done: 'rgba(255,255,255,0.7)',
        doneBorder: 'rgba(163,177,138,0.35)',
        doneText: 'var(--pl-ink-soft)',
        active: 'var(--pl-olive, #A3B18A)',
        activeBorder: 'var(--pl-olive-deep, #7D9B6A)',
        activeText: '#FFFFFF',
      };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
        padding: '0 4px 6px',
        maxWidth: 520,
        margin: '0 auto',
      }}
    >
      <AnimatePresence>
        {visibleSteps.map((step, i) => {
          const value = step.display(collected);
          const isActive = step.currentStepMatch.includes(currentStep);
          const isDone = !!value && !isActive;
          // Empty state: pure "upcoming" chip (only used for the
          // current step when it has no value yet).
          const isIdle = !isDone && !isActive;

          const palette = isActive ? {
            bg: chipColors.active,
            border: chipColors.activeBorder,
            color: chipColors.activeText,
          } : isDone ? {
            bg: chipColors.done,
            border: chipColors.doneBorder,
            color: chipColors.doneText,
          } : {
            bg: chipColors.idle,
            border: chipColors.idleBorder,
            color: chipColors.idleText,
          };

          return (
            <motion.button
              key={step.key}
              type="button"
              layout
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{
                duration: 0.25,
                delay: i * 0.03,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={() => {
                if (isDone) onEditField(step.key);
              }}
              disabled={!isDone}
              aria-label={
                isDone
                  ? `Edit ${step.label}: ${value}`
                  : isActive
                  ? `Current step: ${step.label}`
                  : step.label
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 100,
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                color: palette.color,
                fontSize: '0.65rem',
                fontWeight: isActive ? 700 : 600,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                cursor: isDone ? 'pointer' : 'default',
                transition: 'background 0.18s, border-color 0.18s, color 0.18s',
                minHeight: 26,
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {isDone && <Check size={9} strokeWidth={3} />}
              <span style={{ opacity: isIdle ? 0.7 : 1 }}>
                {value || step.label}
              </span>
              {isDone && (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: 2,
                    opacity: 0.6,
                  }}
                >
                  <X size={9} strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
