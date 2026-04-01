'use client';

import { useState } from 'react';
import { ArrowRight, ImagePlus, Lock, Lightbulb } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { Button } from '@/components/ui';
import type { GooglePhotoMetadata } from '@/types';

interface PhotosStepProps {
  selectedPhotos: GooglePhotoMetadata[];
  onPhotosSelected: (photos: GooglePhotoMetadata[]) => void;
  onContinue: () => void;
}

export function PhotosStep({ selectedPhotos, onPhotosSelected, onContinue }: PhotosStepProps) {
  const [attemptedContinue, setAttemptedContinue] = useState(false);

  const handleContinue = () => {
    if (selectedPhotos.length === 0) {
      setAttemptedContinue(true);
      return;
    }
    onContinue();
  };

  return (
    <div>
      {/* Photo count */}
      {selectedPhotos.length > 0 && (
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 text-[var(--pl-olive)] text-[0.9rem] font-medium">
            <ImagePlus size={15} />
            {selectedPhotos.length} / 30 photos selected
          </span>
        </div>
      )}

      <PhotoBrowser
        onSelectionChange={onPhotosSelected}
        maxSelection={30}
      />

      {/* Pro tip — fills dead space below the card */}
      {selectedPhotos.length === 0 && (
        <div className="flex items-center gap-3 mx-auto mt-8 px-5 py-4 max-w-[520px] bg-[var(--pl-olive-mist)] rounded-[var(--pl-radius-md)] border border-[rgba(163,177,138,0.2)]">
          <Lightbulb size={18} className="text-[var(--pl-olive)] flex-shrink-0" />
          <p className="text-[var(--pl-ink)] text-[0.9rem] leading-relaxed m-0">
            <strong>Pro tip:</strong> Select 10–30 of your favorite photos for the best results. Mix close-ups, group shots, and scenic moments.
          </p>
        </div>
      )}

      {/* Sticky continue bar */}
      <div className="sticky bottom-4 mt-8 p-3 bg-white rounded-[var(--pl-radius-md)] border border-[var(--pl-divider)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={selectedPhotos.length === 0}
          className="w-full min-h-[48px]"
          icon={selectedPhotos.length > 0 ? <ArrowRight size={16} /> : <Lock size={14} />}
        >
          {selectedPhotos.length > 0
            ? `Continue with ${selectedPhotos.length} photo${selectedPhotos.length === 1 ? '' : 's'}`
            : 'Select photos to continue'}
        </Button>
        {selectedPhotos.length === 0 && (
          <p className="text-center mt-2 text-[var(--pl-muted)] text-[0.82rem]">
            {attemptedContinue ? 'Select at least 1 photo to continue' : 'Choose your photos above to proceed'}
          </p>
        )}
      </div>
    </div>
  );
}
