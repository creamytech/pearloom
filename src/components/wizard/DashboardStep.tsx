'use client';

import { UserSites } from '@/components/dashboard/user-sites';
import { Card, Button } from '@/components/ui';
import type { StoryManifest } from '@/types';

interface DashboardStepProps {
  draftBanner: { savedAt: number; coupleNames: [string, string]; vibeString: string; step: string } | null;
  onResumeDraft: () => void;
  onDismissDraft: () => void;
  onStartNew: () => void;
  onEditSite: (site: { manifest: StoryManifest; domain: string; names?: [string, string] }) => void;
  onManageGuests: (site: { domain: string }) => void;
}

export function DashboardStep({
  draftBanner,
  onResumeDraft,
  onDismissDraft,
  onStartNew,
  onEditSite,
  onManageGuests,
}: DashboardStepProps) {
  return (
    <>
      {draftBanner && (
        <Card variant="outlined" className="flex items-center justify-between gap-4 flex-wrap mb-6 px-5 py-3.5 border-[var(--eg-gold)] bg-[#FFFBF0]">
          <span className="text-[0.88rem] leading-snug text-[#5C4A1A]">
            You have an unfinished site
          </span>
          <div className="flex gap-3 items-center flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onResumeDraft} className="underline underline-offset-2 text-[var(--eg-accent)]">
              Continue where you left off
            </Button>
            <span className="text-[0.78rem] text-[var(--eg-gold)]">or</span>
            <Button variant="ghost" size="sm" onClick={onDismissDraft} className="text-[var(--eg-muted)]">
              Start fresh
            </Button>
          </div>
        </Card>
      )}
      <UserSites
        onStartNew={onStartNew}
        onEditSite={onEditSite}
        onManageGuests={onManageGuests}
      />
    </>
  );
}
