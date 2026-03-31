'use client';

import { useState } from 'react';
import { ArrowRight, Upload, ImagePlus } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { Button } from '@/components/ui';
import { colors, text, card } from '@/lib/design-tokens';
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
      {/* Photo count */}
      {selectedPhotos.length > 0 && (
        <div className="flex justify-center mb-6">
          <span
            className="inline-flex items-center gap-2"
            style={{ color: colors.olive, fontSize: text.base, fontWeight: 500 }}
          >
            <ImagePlus size={15} />
            {selectedPhotos.length} / 30 photos selected
          </span>
        </div>
      )}

      <PhotoBrowser
        onSelectionChange={onPhotosSelected}
        maxSelection={30}
      />

      {/* Local upload fallback */}
      <div
        className="text-center mt-10 py-6 px-6 mx-auto max-w-[480px]"
        style={{
          background: card.bg,
          border: `2px dashed ${colors.divider}`,
          borderRadius: card.radius,
        }}
      >
        <Upload size={22} style={{ color: colors.muted, margin: '0 auto 8px' }} />
        <p className="mb-4" style={{ color: colors.muted, fontSize: text.base }}>
          Google Photos refusing to sync?
        </p>
        <Button variant="secondary" size="md" onClick={onLocalUpload} className="min-h-[44px]">
          Upload from your device
        </Button>
      </div>

      {/* Sticky continue bar */}
      <div
        className="sticky bottom-4 mt-8 p-3"
        style={{
          background: colors.cream,
          borderTop: card.border,
          borderRadius: card.radius,
          boxShadow: card.shadow,
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
          <p className="text-center mt-2.5" style={{ color: colors.plum, fontSize: text.base }}>
            Select at least 1 photo to continue
          </p>
        )}
      </div>
    </div>
  );
}
