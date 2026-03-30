'use client';

import { ArrowLeft } from 'lucide-react';
import { GuestManager } from '@/components/dashboard/guest-manager';
import { Button } from '@/components/ui';

interface GuestsStepProps {
  siteId: string;
  onBack: () => void;
}

export function GuestsStep({ siteId, onBack }: GuestsStepProps) {
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={14} />} className="mb-8">
        Back to My Sites
      </Button>
      <GuestManager siteId={siteId} />
    </div>
  );
}
