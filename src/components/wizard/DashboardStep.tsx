'use client';

import { UserSites } from '@/components/dashboard/user-sites';
import { Button } from '@/components/ui';
import type { StoryManifest } from '@/types';

interface DashboardStepProps {
  draftBanner: { savedAt: number; coupleNames: [string, string]; vibeString: string; step: string } | null;
  onResumeDraft: () => void;
  onDismissDraft: () => void;
  onStartNew: () => void;
  onEditSite: (site: { manifest: StoryManifest; domain: string; names?: [string, string] }) => void;
  onManageGuests: (site: { manifest: StoryManifest; domain: string; names?: [string, string] }) => void;
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
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8 px-6 py-4 rounded-[var(--pl-radius-md)] bg-white border border-[var(--pl-divider)] border-l-[3px] border-l-[var(--pl-olive)] shadow-[var(--pl-shadow-xs)]">
          <div className="flex-1 min-w-0">
            <p className="text-[0.92rem] font-medium text-[var(--pl-ink)]">
              You have an unsaved draft
            </p>
            <p className="text-[0.82rem] text-[var(--pl-muted)] mt-0.5">
              {draftBanner.coupleNames[0] && draftBanner.coupleNames[1]
                ? `${draftBanner.coupleNames[0]} & ${draftBanner.coupleNames[1]}`
                : 'Untitled draft'}
              {draftBanner.vibeString ? ` — ${draftBanner.vibeString}` : ''}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResumeDraft}
              className="min-h-[44px] text-[var(--pl-olive)] font-medium"
            >
              Continue where you left off
            </Button>
            <span className="text-[var(--pl-muted)] text-[0.82rem]">or</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissDraft}
              className="min-h-[44px] text-[var(--pl-muted)]"
            >
              Start fresh
            </Button>
          </div>
        </div>
      )}
      <UserSites
        onStartNew={onStartNew}
        onEditSite={onEditSite}
        onManageGuests={onManageGuests}
      />
    </>
  );
}
