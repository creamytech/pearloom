'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { Button } from '@/components/ui';
import type { GooglePhotoMetadata } from '@/types';

interface PhotosStepProps {
  selectedPhotos: GooglePhotoMetadata[];
  onPhotosSelected: (photos: GooglePhotoMetadata[]) => void;
  onContinue: () => void;
  onLocalUpload: () => void;
}

export function PhotosStep({ selectedPhotos, onPhotosSelected, onContinue, onLocalUpload }: PhotosStepProps) {
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
      <PhotoBrowser
        onSelectionChange={onPhotosSelected}
        maxSelection={30}
      />

      <div className="text-center mt-10">
        <p className="text-[var(--eg-muted)] text-[0.95rem] mb-4">
          Google Photos refusing to sync?
        </p>
        <Button variant="secondary" size="md" onClick={onLocalUpload}>
          Bypass API and Upload Locally
        </Button>
      </div>

      <div className="sticky bottom-4 mt-8">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={selectedPhotos.length === 0}
          className="w-full"
          icon={<ArrowRight size={16} />}
        >
          {selectedPhotos.length > 0
            ? `Continue with ${selectedPhotos.length} photos`
            : 'Select photos to continue'}
        </Button>
        {attemptedContinue && selectedPhotos.length === 0 && (
          <p className="text-center mt-2.5 text-[0.88rem] text-[var(--eg-muted)]">
            Select at least 1 photo to continue
          </p>
        )}
      </div>
    </div>
  );
}
