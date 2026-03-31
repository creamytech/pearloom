'use client';

import { UserSites } from '@/components/dashboard/user-sites';
import { Button } from '@/components/ui';
import { colors, text, card } from '@/lib/design-tokens';
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
        <div
          className="flex items-center justify-between gap-4 flex-wrap mb-8 px-6 py-5"
          style={{
            background: card.bg,
            borderRadius: card.radius,
            boxShadow: card.shadow,
            border: card.border,
            borderLeft: `3px solid ${colors.olive}`,
          }}
        >
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: text.base, color: colors.ink, fontWeight: 500 }}>
              You have an unsaved draft
            </p>
            <p style={{ fontSize: text.sm, color: colors.muted }}>
              {draftBanner.coupleNames[0] && draftBanner.coupleNames[1]
                ? `${draftBanner.coupleNames[0]} & ${draftBanner.coupleNames[1]}`
                : 'Untitled draft'}
              {draftBanner.vibeString ? ` \u2014 ${draftBanner.vibeString}` : ''}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResumeDraft}
              className="min-h-[44px]"
              style={{ color: colors.olive, fontWeight: 500 }}
            >
              Continue where you left off
            </Button>
            <span style={{ color: colors.muted, fontSize: text.sm }}>or</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissDraft}
              className="min-h-[44px]"
              style={{ color: colors.muted }}
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
