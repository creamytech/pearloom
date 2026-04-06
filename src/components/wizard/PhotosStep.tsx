'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, ImagePlus, Lock, Sparkles } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import type { GooglePhotoMetadata } from '@/types';

const MAX_PHOTOS = 40;

// ── Story Arc Advisor — right-side floating glass card ────────

function StoryArcAdvisor({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Selected counter */}
      <div style={{
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.6)',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
      } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[var(--pl-muted)]">
            Selected
          </span>
          <span className="text-[1.3rem] font-heading font-semibold text-[var(--pl-ink)] tabular-nums">
            {count} <span className="text-[0.8rem] text-[var(--pl-muted)] font-body">/ {max}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: 'var(--pl-olive)' }}
          />
        </div>
        {count > 0 && count < 10 && (
          <p className="text-[0.68rem] text-[var(--pl-muted)] mt-3 flex items-center gap-1.5">
            <Sparkles size={10} className="text-[var(--pl-gold)]" />
            Add more for a richer story
          </p>
        )}
      </div>

      {/* Story quality card */}
      {count >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.5)',
            padding: '20px',
          } as React.CSSProperties}
        >
          <h3 className="font-heading text-[0.92rem] font-semibold text-[var(--pl-ink)] mb-2 flex items-center gap-2">
            Story Arc
            <Sparkles size={12} className="text-[var(--pl-gold)]" />
          </h3>
          <p className="text-[0.78rem] text-[var(--pl-muted)] leading-relaxed">
            Great selection — your story has a rich emotional range.
          </p>
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
    <div className="flex flex-col">
      {/* Photo browser */}
      <div className="min-h-[300px]">
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
          className="flex items-center gap-3 mx-auto mt-6 px-5 py-3.5 max-w-[480px] rounded-xl"
          style={{
            background: 'rgba(163,177,138,0.08)',
            border: '1px solid rgba(163,177,138,0.15)',
          }}
        >
          <ImagePlus size={16} className="text-[var(--pl-olive)] flex-shrink-0" />
          <p className="text-[var(--pl-ink-soft)] text-[0.85rem] leading-snug m-0">
            Choose the photos that will become chapters of your story.
          </p>
        </motion.div>
      )}

      {/* Bottom action bar — glass style */}
      <div
        className="mt-8 px-5 py-4 flex items-center justify-between gap-4 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.5)',
        } as React.CSSProperties}
      >
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.78rem] font-medium bg-transparent cursor-pointer transition-colors"
            style={{
              color: 'var(--pl-muted)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <ArrowLeft size={13} />
            Back
          </button>
        ) : <div />}

        <span className="text-[0.68rem] font-semibold text-[var(--pl-muted)] hidden sm:block">
          {count > 0 ? `${count} memories selected` : 'Awaiting selection'}
        </span>

        <motion.button
          onClick={handleContinue}
          disabled={count === 0}
          whileHover={count > 0 ? { scale: 1.02 } : {}}
          whileTap={count > 0 ? { scale: 0.98 } : {}}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full border-none cursor-pointer text-[0.75rem] font-bold uppercase tracking-[0.06em] transition-all"
          style={{
            background: count > 0 ? 'var(--pl-olive)' : 'rgba(0,0,0,0.04)',
            color: count > 0 ? 'white' : 'var(--pl-muted)',
            boxShadow: count > 0 ? '0 4px 16px rgba(163,177,138,0.3)' : 'none',
          }}
        >
          Continue
          {count > 0 ? <ArrowRight size={13} /> : <Lock size={11} />}
        </motion.button>
      </div>
    </div>
  );
}

export { StoryArcAdvisor };
