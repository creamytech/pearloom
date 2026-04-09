'use client';

import { useState } from 'react';
import {
  ArrowLeft,
} from 'lucide-react';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { Button } from '@/components/ui';
import { MoodBoardSwipe } from './MoodBoardSwipe';
import type { VibeFormData } from '@/lib/wizard-state';





interface VibeStepProps {
  coupleNames: [string, string];
  vibeString: string;
  onSubmit: (data: VibeFormData) => void;
  onBack: () => void;
}

export function VibeStep({ coupleNames, vibeString, onSubmit, onBack }: VibeStepProps) {
  // Skip MoodBoardSwipe — it was a duplicate vibe question.
  // The VibeInput already has mood/vibe selection built in.
  return (
    <div className="pb-8">
      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          <div className="max-w-[560px]">
            <VibeInput
              onSubmit={onSubmit}
              initialNames={coupleNames[0] ? coupleNames : undefined}
              initialVibe={vibeString ?? undefined}
            />
          </div>
        </div>
      </div>

      {/* Back button */}
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
