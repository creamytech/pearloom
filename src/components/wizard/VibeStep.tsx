'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Cloud, Sun, Leaf, Waves, Flame, Camera, Pencil, Sparkles,
} from 'lucide-react';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { Button } from '@/components/ui';
import { MoodBoardSwipe } from './MoodBoardSwipe';
import type { VibeFormData } from '@/lib/wizard-state';

// ── Occasions ────────────────────────────────────────────────
const OCCASIONS = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'travel', label: 'Travel Log' },
  { id: 'family', label: 'Family Archive' },
  { id: 'garden', label: 'Digital Garden' },
];

// ── Mood Infusion ────────────────────────────────────────────
const MOODS = [
  { id: 'dreamy', label: 'Dreamy', Icon: Cloud },
  { id: 'luminous', label: 'Luminous', Icon: Sun },
  { id: 'organic', label: 'Organic', Icon: Leaf },
  { id: 'serene', label: 'Serene', Icon: Waves },
  { id: 'bold', label: 'Bold', Icon: Flame },
  { id: 'candid', label: 'Candid', Icon: Camera },
];

// ── Current Selection card ───────────────────────────────────
function CurrentSelectionCard({
  occasion,
  mood,
  onConfirm,
}: {
  occasion: string;
  mood: string;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--pl-radius-lg)] p-5 border border-[rgba(0,0,0,0.06)]"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-2">
        Current Selection
      </p>
      <h3 className="font-heading italic text-[1.15rem] text-[var(--pl-ink)] mb-1">
        Golden Loom
      </h3>
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--pl-gold)]" />
        <span className="text-[0.75rem] text-[var(--pl-muted)]">
          {OCCASIONS.find(o => o.id === occasion)?.label || 'Wedding'}
          {' \u2022 '}
          {MOODS.find(m => m.id === mood)?.label || 'Organic'}
          {' \u2022 Golden'}
        </span>
      </div>
      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={onConfirm}
        icon={<Sparkles size={13} />}
      >
        Confirm Vibe
      </Button>
      <p className="text-[0.68rem] text-[var(--pl-muted)] text-center mt-2">
        Stage 3 will involve arranging your initial curation.
      </p>
    </motion.div>
  );
}

// ── Main VibeStep ────────────────────────────────────────────

interface VibeStepProps {
  coupleNames: [string, string];
  vibeString: string;
  onSubmit: (data: VibeFormData) => void;
  onBack: () => void;
}

export function VibeStep({ coupleNames, vibeString, onSubmit, onBack }: VibeStepProps) {
  const [showMoodBoard, setShowMoodBoard] = useState(true);
  const [moodVibeWords, setMoodVibeWords] = useState<string | undefined>(undefined);
  const [selectedOccasion, setSelectedOccasion] = useState('wedding');
  const [selectedMood, setSelectedMood] = useState('organic');

  const handleMoodBoardComplete = (vibeWords: string) => {
    setMoodVibeWords(vibeWords || undefined);
    setShowMoodBoard(false);
  };

  const handleMoodBoardSkip = () => {
    setShowMoodBoard(false);
  };

  return (
    <div className="pb-8">
      {showMoodBoard ? (
        <div className="max-w-[680px] mx-auto">
          <MoodBoardSwipe
            onComplete={handleMoodBoardComplete}
            onSkip={handleMoodBoardSkip}
          />
        </div>
      ) : (
        <div className="flex gap-8">
          {/* Left: form + occasion + mood */}
          <div className="flex-1 min-w-0">
            <div className="max-w-[560px]">
              <VibeInput
                onSubmit={onSubmit}
                initialNames={coupleNames[0] ? coupleNames : undefined}
                initialVibe={moodVibeWords ?? vibeString ?? undefined}
              />
            </div>

            {/* Occasion selector */}
            <div className="mt-8">
              <h3 className="font-heading text-[1.15rem] text-[var(--pl-ink-soft)] mb-4">
                Select the Occasion
              </h3>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ.id}
                    onClick={() => setSelectedOccasion(occ.id)}
                    className="transition-all duration-200"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '100px',
                      border: selectedOccasion === occ.id
                        ? '1.5px solid var(--pl-olive-deep)'
                        : '1.5px solid var(--pl-divider)',
                      background: selectedOccasion === occ.id
                        ? 'var(--pl-olive-deep)'
                        : 'transparent',
                      color: selectedOccasion === occ.id
                        ? 'white'
                        : 'var(--pl-ink-soft)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {occ.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood Infusion */}
            <div className="mt-8">
              <h3 className="font-heading text-[1.15rem] text-[var(--pl-ink-soft)] mb-4">
                Mood Infusion
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {MOODS.map((mood) => {
                  const Icon = mood.Icon;
                  const isActive = selectedMood === mood.id;
                  return (
                    <motion.button
                      key={mood.id}
                      onClick={() => setSelectedMood(mood.id)}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-[var(--pl-radius-lg)] transition-all duration-200 cursor-pointer"
                      style={{
                        border: isActive
                          ? '2px solid var(--pl-olive-deep)'
                          : '1.5px solid var(--pl-divider)',
                        background: isActive
                          ? 'rgba(163,177,138,0.08)'
                          : 'transparent',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: isActive
                            ? 'var(--pl-olive-deep)'
                            : 'var(--pl-cream-deep)',
                          color: isActive ? 'white' : 'var(--pl-muted)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <span
                        className="text-[0.68rem] font-bold uppercase tracking-[0.08em]"
                        style={{
                          color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                        }}
                      >
                        {mood.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Current Selection card */}
          <div className="w-[260px] flex-shrink-0 hidden lg:block">
            <CurrentSelectionCard
              occasion={selectedOccasion}
              mood={selectedMood}
              onConfirm={() => {
                const vibeStr = `${selectedMood}, ${selectedOccasion}${moodVibeWords ? `, ${moodVibeWords}` : ''}`;
                onSubmit({
                  names: coupleNames,
                  vibeString: vibeStr,
                  occasion: selectedOccasion,
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Back button — mobile friendly */}
      <div className="mt-6">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={() => {
            const hasData = coupleNames[0] || coupleNames[1] || vibeString;
            if (hasData && !confirm('You\'ll lose your progress. Go back anyway?')) return;
            onBack();
          }}
        >
          Back to photos
        </Button>
      </div>
    </div>
  );
}
