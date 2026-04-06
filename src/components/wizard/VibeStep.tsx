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
  const [showMoodBoard, setShowMoodBoard] = useState(true);
  const [moodVibeWords, setMoodVibeWords] = useState<string | undefined>(undefined);

  const handleMoodBoardComplete = (vibeWords: string) => {
    setMoodVibeWords(vibeWords || undefined);
    setShowMoodBoard(false);
  };

  const handleMoodBoardSkip = () => {
    setShowMoodBoard(false);
  };

  return (
    <div className="pb-8">
      {showMoodBoard ? (
        <div className="max-w-[680px] mx-auto">
          <MoodBoardSwipe
            onComplete={handleMoodBoardComplete}
            onSkip={handleMoodBoardSkip}
          />
        </div>
      ) : (
        <div className="flex gap-8">
          {/* Left: form + occasion + mood */}
          <div className="flex-1 min-w-0">
            <div className="max-w-[560px]">
              <VibeInput
                onSubmit={onSubmit}
                initialNames={coupleNames[0] ? coupleNames : undefined}
                initialVibe={moodVibeWords ?? vibeString ?? undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Back button — mobile friendly */}
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
