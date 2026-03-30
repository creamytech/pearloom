'use client';

import { ArrowLeft } from 'lucide-react';
import { VibeInput } from '@/components/dashboard/vibe-input';
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
      <button
        onClick={() => {
          const hasData = coupleNames[0] || coupleNames[1] || vibeString;
          if (hasData && !confirm('You\'ll lose your progress. Go back anyway?')) return;
          onBack();
        }}
        className="flex items-center gap-1.5 text-[0.9rem] text-[var(--eg-muted)] mb-8 bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to photos
      </button>
      <VibeInput
        onSubmit={onSubmit}
        initialNames={coupleNames[0] ? coupleNames : undefined}
        initialVibe={vibeString || undefined}
      />
    </div>
  );
}
