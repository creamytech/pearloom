'use client';

import { useState } from 'react';
import { ArrowRight, Upload, ImagePlus } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { Button } from '@/components/ui';
import { colors, shadow, radius, opacity } from '@/lib/design-tokens';
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
      {/* Photo count badge */}
      {selectedPhotos.length > 0 && (
        <div className="flex justify-center mb-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[0.88rem] font-medium"
            style={{
              background: `${colors.olive}${opacity.light}`,
              color: colors.olive,
              border: `1.5px solid ${colors.olive}${opacity.medium}`,
              boxShadow: shadow.sm,
            }}
          >
            <ImagePlus size={15} />
            <span>{selectedPhotos.length} / 30 photos selected</span>
          </div>
        </div>
      )}

      <PhotoBrowser
        onSelectionChange={onPhotosSelected}
        maxSelection={30}
      />

      {/* Local upload fallback */}
      <div
        className="text-center mt-10 py-6 px-6 rounded-2xl mx-auto max-w-[480px]"
        style={{
          background: `rgba(255,255,255,0.5)`,
          border: `2px dashed ${colors.divider}`,
        }}
      >
        <Upload size={22} style={{ color: colors.muted, margin: '0 auto 8px' }} />
        <p className="text-[var(--eg-muted)] text-[0.92rem] mb-4">
          Google Photos refusing to sync?
        </p>
        <Button variant="secondary" size="md" onClick={onLocalUpload} className="min-h-[44px]">
          Upload from your device
        </Button>
      </div>

      {/* Sticky continue bar */}
      <div
        className="sticky bottom-4 mt-8 p-3 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(16px)',
          boxShadow: shadow.lg,
          border: `1px solid ${colors.divider}`,
        }}
      >
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={selectedPhotos.length === 0}
          className="w-full min-h-[48px]"
          icon={<ArrowRight size={16} />}
        >
          {selectedPhotos.length > 0
            ? `Continue with ${selectedPhotos.length} photo${selectedPhotos.length === 1 ? '' : 's'}`
            : 'Select photos to continue'}
        </Button>
        {attemptedContinue && selectedPhotos.length === 0 && (
          <p className="text-center mt-2.5 text-[0.88rem]" style={{ color: colors.plum }}>
            Select at least 1 photo to continue
          </p>
        )}
      </div>
    </div>
  );
}
