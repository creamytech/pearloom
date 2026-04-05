'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ImagePlus, Lock, Sparkles } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { Button } from '@/components/ui';
import type { GooglePhotoMetadata } from '@/types';

const MAGIC_MESSAGES = [
  'Creating your story…',
  'Finding the best moments…',
  'Building something beautiful…',
  'Weaving your memories together…',
];

interface PhotosStepProps {
  selectedPhotos: GooglePhotoMetadata[];
  onPhotosSelected: (photos: GooglePhotoMetadata[]) => void;
  onContinue: () => void;
}

export function PhotosStep({ selectedPhotos, onPhotosSelected, onContinue }: PhotosStepProps) {
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  const [magicMsgIdx, setMagicMsgIdx] = useState(0);

  // Cycle through magic messages when photos selected
  useEffect(() => {
    if (selectedPhotos.length === 0) return;
    const t = setInterval(() => setMagicMsgIdx(i => (i + 1) % MAGIC_MESSAGES.length), 2800);
    return () => clearInterval(t);
  }, [selectedPhotos.length]);

  const handleContinue = () => {
    if (selectedPhotos.length === 0) {
      setAttemptedContinue(true);
      return;
    }
    onContinue();
  };

  const count = selectedPhotos.length;

  return (
    <div>
      {/* Dynamic feedback bar — shows when photos are selected */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-[rgba(163,177,138,0.08)] to-[rgba(196,169,106,0.06)] border border-[rgba(163,177,138,0.2)]">
              {/* Photo count with pulse */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  key={count}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--pl-olive)] text-white font-bold text-[1rem]"
                >
                  {count}
                </motion.div>
                <div>
                  <p className="text-[var(--pl-ink)] font-semibold text-[0.95rem] leading-tight">
                    {count === 1 ? '1 memory' : `${count} memories`} selected
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={magicMsgIdx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="text-[var(--pl-muted)] text-[0.8rem] flex items-center gap-1"
                    >
                      <Sparkles size={11} className="text-[var(--pl-gold)]" />
                      {MAGIC_MESSAGES[magicMsgIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Mini photo grid preview */}
              <div className="flex items-center gap-1.5">
                {selectedPhotos.slice(0, 5).map((photo, i) => (
                  <motion.div
                    key={photo.id || i}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="w-9 h-9 rounded-lg overflow-hidden border border-white/60 shadow-sm"
                  >
                    {photo.baseUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/photos/proxy?url=${encodeURIComponent(photo.baseUrl)}&w=80&h=80`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--pl-divider)]" />
                    )}
                  </motion.div>
                ))}
                {count > 5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-9 h-9 rounded-lg bg-[var(--pl-olive-mist)] border border-[rgba(163,177,138,0.2)] flex items-center justify-center text-[0.7rem] font-bold text-[var(--pl-olive)]"
                  >
                    +{count - 5}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PhotoBrowser
        onSelectionChange={onPhotosSelected}
        maxSelection={30}
      />

      {/* Hint when empty — brief and inviting */}
      {count === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mx-auto mt-6 px-5 py-3.5 max-w-[480px] bg-[var(--pl-olive-mist)] rounded-xl border border-[rgba(163,177,138,0.2)]"
        >
          <ImagePlus size={16} className="text-[var(--pl-olive)] flex-shrink-0" />
          <p className="text-[var(--pl-ink)] text-[0.88rem] leading-snug m-0">
            Select 10–30 photos for the best results
          </p>
        </motion.div>
      )}

      {/* Sticky continue bar */}
      <div className="sticky bottom-4 mt-6 p-3 bg-white/95 backdrop-blur-sm rounded-2xl border border-[var(--pl-divider)] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={count === 0}
          className="w-full min-h-[52px] text-[0.95rem]"
          icon={count > 0 ? <ArrowRight size={16} /> : <Lock size={14} />}
        >
          {count > 0
            ? `Continue with ${count} photo${count === 1 ? '' : 's'}`
            : 'Select photos to continue'}
        </Button>
        {count === 0 && (
          <p className="text-center mt-2 text-[var(--pl-muted)] text-[0.78rem]">
            {attemptedContinue ? 'Select at least 1 photo' : 'Choose your photos above'}
          </p>
        )}
      </div>
    </div>
  );
}
