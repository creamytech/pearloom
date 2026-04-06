'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, ImagePlus, Lock, Sparkles, MapPin, Save } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { Button } from '@/components/ui';
import type { GooglePhotoMetadata } from '@/types';

const MAX_PHOTOS = 40;

// ── Story Arc Advisor — right-side glass panel ────────────────

function StoryArcAdvisor({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Selected Gems counter */}
      <div
        className="rounded-[var(--pl-radius-lg)] p-5 border border-[rgba(0,0,0,0.06)]"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)]">
            Selected Gems
          </span>
          <span className="text-[1.4rem] font-heading font-semibold text-[var(--pl-ink)] tabular-nums">
            {count} <span className="text-[0.85rem] text-[var(--pl-muted)] font-body">/ {max}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--pl-cream-deep)] overflow-hidden">
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-[var(--pl-olive-deep)]"
          />
        </div>
        {count > 0 && count < 10 && (
          <p className="text-[0.72rem] text-[var(--pl-muted)] mt-3 flex items-center gap-1.5">
            <Sparkles size={11} className="text-[var(--pl-gold)]" />
            AI Suggesting {Math.min(5, max - count)} more links
          </p>
        )}
      </div>

      {/* Story Arc Advisor card */}
      {count >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--pl-radius-lg)] p-5 border border-[rgba(0,0,0,0.06)]"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-heading text-[1rem] font-semibold text-[var(--pl-ink)]">
              Story Arc Advisor
            </h3>
            <Sparkles size={16} className="text-[var(--pl-gold)]" />
          </div>
          <p className="text-[0.82rem] text-[var(--pl-ink-soft)] leading-relaxed mb-4">
            &ldquo;Your current selection leans heavily towards{' '}
            <em className="font-semibold">quiet moments</em>. To build a stronger
            narrative, consider adding more{' '}
            <em className="font-semibold">candid interactions</em>.&rdquo;
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pl-gold)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[var(--pl-muted)]">
                Missing Link: Dinner Scene
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pl-olive)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[var(--pl-muted)]">
                Cohesion: High (Warm Palettes)
              </span>
            </div>
          </div>
          <Button
            variant="ink"
            size="sm"
            className="w-full mt-4"
          >
            Ask Advisor for More
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ── Main PhotosStep ───────────────────────────────────────────

interface PhotosStepProps {
  selectedPhotos: GooglePhotoMetadata[];
  onPhotosSelected: (photos: GooglePhotoMetadata[]) => void;
  onContinue: () => void;
  onBack?: () => void;
}

export function PhotosStep({ selectedPhotos, onPhotosSelected, onContinue, onBack }: PhotosStepProps) {
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  const count = selectedPhotos.length;

  const handleContinue = () => {
    if (count === 0) {
      setAttemptedContinue(true);
      return;
    }
    onContinue();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Photo browser */}
      <div className="flex-1 min-h-0">
        <PhotoBrowser
          onSelectionChange={onPhotosSelected}
          maxSelection={MAX_PHOTOS}
        />
      </div>

      {/* Empty state hint */}
      {count === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mx-auto mt-6 px-5 py-3.5 max-w-[480px] bg-[var(--pl-olive-mist)] rounded-xl border border-[rgba(163,177,138,0.2)]"
        >
          <ImagePlus size={16} className="text-[var(--pl-olive)] flex-shrink-0" />
          <p className="text-[var(--pl-ink)] text-[0.88rem] leading-snug m-0">
            Select the clusters that best tell the story of your memories.
          </p>
        </motion.div>
      )}

      {/* Bottom action bar — matches Stitch "← Previous Step | Status | Continue Weaving →" */}
      <div className="sticky bottom-0 mt-6 px-4 py-3 bg-white/95 backdrop-blur-sm rounded-t-2xl border-t border-[var(--pl-divider)] flex items-center justify-between gap-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={13} />}>
            Previous Step
          </Button>
        )}
        <div className="flex items-center gap-2 text-[0.72rem] text-[var(--pl-muted)]">
          <Save size={12} />
          <span className="font-semibold uppercase tracking-[0.06em]">Status</span>
          <span className="font-heading italic text-[var(--pl-olive-deep)]">
            {count > 0 ? 'Photos selected & clustered' : 'Awaiting selection'}
          </span>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleContinue}
          disabled={count === 0}
          icon={count > 0 ? <ArrowRight size={14} /> : <Lock size={12} />}
        >
          Continue Weaving
        </Button>
      </div>
    </div>
  );
}

// Export the advisor for use in WizardLayout's rightPanel slot
export { StoryArcAdvisor };
