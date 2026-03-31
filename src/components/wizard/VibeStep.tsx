'use client';

import { ArrowLeft } from 'lucide-react';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { Button } from '@/components/ui';
import { colors, text } from '@/lib/design-tokens';
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
        className="mb-8 min-h-[44px]"
        onClick={() => {
          const hasData = coupleNames[0] || coupleNames[1] || vibeString;
          if (hasData && !confirm('You\'ll lose your progress. Go back anyway?')) return;
          onBack();
        }}
      >
        Back to locations
      </Button>

      <div className="max-w-[680px] mx-auto">
        <VibeInput
          onSubmit={onSubmit}
          initialNames={coupleNames[0] ? coupleNames : undefined}
          initialVibe={vibeString || undefined}
        />
      </div>

      <p
        className="text-center mt-6"
        style={{ color: colors.muted, fontSize: text.sm }}
      >
        Describe your wedding aesthetic in a few words -- we will handle the rest.
      </p>
    </div>
  );
}
