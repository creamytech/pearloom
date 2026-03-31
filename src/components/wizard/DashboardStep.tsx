'use client';

import { UserSites } from '@/components/dashboard/user-sites';
import { Card, Button } from '@/components/ui';
import { colors, shadow, radius, opacity } from '@/lib/design-tokens';
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
        <Card
          variant="outlined"
          className="flex items-center justify-between gap-4 flex-wrap mb-8 px-6 py-5"
          style={{
            borderColor: `${colors.gold}`,
            background: `linear-gradient(135deg, #FFFBF0 0%, ${colors.gold}${opacity.subtle} 100%)`,
            boxShadow: `${shadow.sm}, inset 0 1px 0 rgba(255,255,255,0.8)`,
            borderRadius: radius.xl,
          }}
        >
          {/* Browser-style address bar mockup for the draft */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="flex items-center gap-1.5 shrink-0"
              aria-hidden
            >
              <span className="w-[10px] h-[10px] rounded-full" style={{ background: '#FF6058' }} />
              <span className="w-[10px] h-[10px] rounded-full" style={{ background: '#FFBE2F' }} />
              <span className="w-[10px] h-[10px] rounded-full" style={{ background: '#28C840' }} />
            </div>
            <div
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-[0.82rem] truncate"
              style={{
                background: 'rgba(255,255,255,0.7)',
                border: `1px solid ${colors.divider}`,
                color: colors.muted,
                fontFamily: 'monospace',
              }}
            >
              {draftBanner.coupleNames[0] && draftBanner.coupleNames[1]
                ? `pearloom.com/${draftBanner.coupleNames[0].toLowerCase()}-and-${draftBanner.coupleNames[1].toLowerCase()}`
                : 'pearloom.com/your-site'}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResumeDraft}
              className="underline underline-offset-2 text-[var(--eg-accent)] min-h-[44px]"
            >
              Continue where you left off
            </Button>
            <span className="text-[0.78rem]" style={{ color: colors.gold }}>or</span>
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
