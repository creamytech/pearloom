'use client';

import { ArrowLeft } from 'lucide-react';
import { GuestManager } from '@/components/dashboard/guest-manager';

interface GuestsStepProps {
  siteId: string;
  onBack: () => void;
}

export function GuestsStep({ siteId, onBack }: GuestsStepProps) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[0.9rem] text-[var(--eg-muted)] mb-8 bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to My Sites
      </button>
      <GuestManager siteId={siteId} />
    </div>
  );
}
