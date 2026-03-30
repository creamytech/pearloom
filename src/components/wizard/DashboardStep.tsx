'use client';

import { UserSites } from '@/components/dashboard/user-sites';
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
      {/* Draft resume banner */}
      {draftBanner && (
        <div
          className="flex items-center justify-between gap-4 flex-wrap mb-6 px-5 py-3.5"
          style={{
            background: '#FFFBF0',
            border: '1px solid #D4A847',
            borderRadius: '0.75rem',
          }}
        >
          <span className="text-[0.88rem] leading-snug" style={{ color: '#5C4A1A' }}>
            You have an unfinished site
          </span>
          <div className="flex gap-3 items-center flex-shrink-0">
            <button
              onClick={onResumeDraft}
              className="text-[0.85rem] font-semibold bg-transparent border-none cursor-pointer p-0 underline underline-offset-2"
              style={{ color: '#6B7B3A' }}
            >
              Continue where you left off
            </button>
            <span className="text-[0.8rem]" style={{ color: '#C4A050' }}>or</span>
            <button
              onClick={onDismissDraft}
              className="text-[0.85rem] bg-transparent border-none cursor-pointer p-0"
              style={{ color: '#9A9488' }}
            >
              Start fresh
            </button>
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
