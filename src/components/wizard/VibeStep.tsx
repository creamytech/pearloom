'use client';

import { ArrowLeft } from 'lucide-react';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { Button } from '@/components/ui';
import { colors, shadow, radius, opacity } from '@/lib/design-tokens';
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

      {/* Premium vibe input wrapper */}
      <div
        className="max-w-[680px] mx-auto rounded-3xl p-8 sm:p-10"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.65) 0%, ${colors.gold}${opacity.subtle} 50%, rgba(255,255,255,0.55) 100%)`,
          backdropFilter: 'blur(12px)',
          boxShadow: `${shadow.md}, inset 0 1px 0 rgba(255,255,255,0.7)`,
          border: `1px solid ${colors.divider}`,
        }}
      >
        <VibeInput
          onSubmit={onSubmit}
          initialNames={coupleNames[0] ? coupleNames : undefined}
          initialVibe={vibeString || undefined}
        />
      </div>

      {/* Olive focus ring hint */}
      <p
        className="text-center mt-6 text-[0.82rem]"
        style={{ color: colors.muted }}
      >
        Describe your wedding aesthetic in a few words -- we will handle the rest.
      </p>
    </div>
  );
}
