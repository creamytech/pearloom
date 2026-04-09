'use client';

import { UserSites } from '@/components/dashboard/user-sites';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { StoryManifest } from '@/types';

interface DashboardStepProps {
  draftBanner: { savedAt: number; coupleNames: [string, string]; vibeString: string; step: string } | null;
  onResumeDraft: () => void;
  onDismissDraft: () => void;
  onStartNew: () => void;
  onQuickStart?: () => void;
  onOpenTemplates?: () => void;
  onEditSite: (site: { manifest: StoryManifest; domain: string; names?: [string, string] }) => void;
  onManageGuests: (site: { manifest: StoryManifest; domain: string; names?: [string, string] }) => void;
  userName?: string;
}

export function DashboardStep({
  draftBanner,
  onResumeDraft,
  onDismissDraft,
  onStartNew,
  onQuickStart,
  onOpenTemplates,
  onEditSite,
  onManageGuests,
  userName,
}: DashboardStepProps) {
  return (
    <>
      {draftBanner && (
        <Card
          variant="outlined"
          padding="none"
          className="flex items-center justify-between gap-4 flex-wrap mb-8 px-6 py-4 border-l-[3px] border-l-[var(--pl-olive)]"
          style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', borderLeft: '3px solid var(--pl-olive)' } as React.CSSProperties}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[0.92rem] font-semibold text-[var(--pl-ink)]">
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
              className="min-h-[44px] text-[var(--pl-olive)] font-semibold"
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
        </Card>
      )}
      <UserSites
        onStartNew={onStartNew}
        onQuickStart={onQuickStart}
        onOpenTemplates={onOpenTemplates}
        onEditSite={onEditSite}
        onManageGuests={onManageGuests}
        userName={userName}
      />
    </>
  );
}
