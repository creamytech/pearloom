'use client';

import { GenerationProgress } from '@/components/dashboard/generation-progress';
import type { GooglePhotoMetadata } from '@/types';

interface GeneratingStepProps {
  step: number;
  photos: GooglePhotoMetadata[];
  names: [string, string];
  vibeString: string;
  occasion: string;
  onCancel: () => void;
}

export function GeneratingStep({ step, photos, names, vibeString, occasion, onCancel }: GeneratingStepProps) {
  return (
    <GenerationProgress
      step={step}
      photos={photos}
      names={names}
      vibeString={vibeString}
      occasion={occasion}
      onCancel={onCancel}
    />
  );
}
