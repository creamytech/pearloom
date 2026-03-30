'use client';

import { ArrowLeft } from 'lucide-react';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { Button } from '@/components/ui';
import type { VibeFormData } from '@/lib/wizard-state';

interface VibeStepProps {
  coupleNames: [string, string];
  vibeString: string;
  onSubmit: (data: VibeFormData) => void;
  onBack: () => void;
}

export function VibeStep({ coupleNames, vibeString, onSubmit, onBack }: VibeStepProps) {
  return (
    <div className="pb-8">
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={14} />}
        className="mb-8"
        onClick={() => {
          const hasData = coupleNames[0] || coupleNames[1] || vibeString;
          if (hasData && !confirm('You\'ll lose your progress. Go back anyway?')) return;
          onBack();
        }}
      >
        Back to photos
      </Button>
      <VibeInput
        onSubmit={onSubmit}
        initialNames={coupleNames[0] ? coupleNames : undefined}
        initialVibe={vibeString || undefined}
      />
    </div>
  );
}
