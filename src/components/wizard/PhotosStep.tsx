'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, ImagePlus, Lock, Sparkles, Save } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import type { GooglePhotoMetadata } from '@/types';

const MAX_PHOTOS = 40;

// ── Story Arc Advisor — right-side glass panel ────────────────

function StoryArcAdvisor({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(245,241,232,0.06)',
          border: '1px solid rgba(245,241,232,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(200,180,140,0.5)' }}>
            Selected
          </span>
          <span className="text-[1.4rem] font-heading font-semibold tabular-nums" style={{ color: 'rgba(245,241,232,0.9)' }}>
            {count} <span className="text-[0.85rem] font-body" style={{ color: 'rgba(245,241,232,0.3)' }}>/ {max}</span>
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(245,241,232,0.06)' }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, rgba(200,180,140,0.6), rgba(200,180,140,0.9))' }}
          />
        </div>
        {count > 0 && count < 10 && (
          <p className="text-[0.7rem] mt-3 flex items-center gap-1.5" style={{ color: 'rgba(200,180,140,0.5)' }}>
            <Sparkles size={10} />
            Add more for a richer story
          </p>
        )}
      </div>

      {count >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(245,241,232,0.04)',
            border: '1px solid rgba(245,241,232,0.06)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-heading text-[0.95rem] font-semibold" style={{ color: 'rgba(245,241,232,0.8)' }}>
              Story Arc
            </h3>
            <Sparkles size={14} style={{ color: 'rgba(200,180,140,0.6)' }} />
          </div>
          <p className="text-[0.78rem] leading-relaxed" style={{ color: 'rgba(245,241,232,0.4)' }}>
            Great selection — your story has a rich emotional range with warm, intimate moments.
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
          className="flex items-center gap-3 mx-auto mt-6 px-5 py-3.5 max-w-[480px] rounded-xl"
          style={{
            background: 'rgba(200,180,140,0.08)',
            border: '1px solid rgba(200,180,140,0.12)',
          }}
        >
          <ImagePlus size={16} style={{ color: 'rgba(200,180,140,0.6)', flexShrink: 0 }} />
          <p className="text-[0.85rem] leading-snug m-0" style={{ color: 'rgba(245,241,232,0.5)' }}>
            Choose the photos that will become chapters of your story.
          </p>
        </motion.div>
      )}

      {/* Bottom action bar — cinematic dark glass */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="sticky bottom-0 mt-8 px-5 py-4 flex items-center justify-between gap-4"
        style={{
          background: 'rgba(26,24,20,0.85)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          borderTop: '1px solid rgba(200,180,140,0.1)',
          borderRadius: '16px 16px 0 0',
        } as React.CSSProperties}
      >
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[0.75rem] font-medium bg-transparent border-none cursor-pointer"
            style={{ color: 'rgba(245,241,232,0.35)' }}
          >
            <ArrowLeft size={13} />
            Back
          </button>
        ) : <div />}

        <div className="flex items-center gap-2 text-[0.68rem]" style={{ color: 'rgba(245,241,232,0.25)' }}>
          <span className="font-semibold uppercase tracking-[0.08em]" style={{ color: 'rgba(200,180,140,0.4)' }}>
            {count > 0 ? `${count} memories selected` : 'Awaiting selection'}
          </span>
        </div>

        <motion.button
          onClick={handleContinue}
          disabled={count === 0}
          whileHover={count > 0 ? { scale: 1.02, y: -1 } : {}}
          whileTap={count > 0 ? { scale: 0.98 } : {}}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full border-none cursor-pointer text-[0.78rem] font-bold tracking-[0.04em] transition-all"
          style={{
            background: count > 0
              ? 'linear-gradient(135deg, rgba(200,180,140,0.9), rgba(180,160,120,0.95))'
              : 'rgba(245,241,232,0.06)',
            color: count > 0 ? '#1a1814' : 'rgba(245,241,232,0.2)',
            boxShadow: count > 0 ? '0 4px 20px rgba(200,180,140,0.25)' : 'none',
          }}
        >
          {count > 0 ? <ArrowRight size={14} /> : <Lock size={11} />}
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}

export { StoryArcAdvisor };
