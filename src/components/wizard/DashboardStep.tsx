'use client';

import { UserSites } from '@/components/dashboard/user-sites';
import type { StoryManifest } from '@/types';

interface DashboardStepProps {
  onStartNew: () => void;
  onQuickStart?: () => void;
  onOpenTemplates?: () => void;
  onEditSite: (site: { manifest: StoryManifest; domain: string; names?: [string, string] }) => void;
  userName?: string;
}

export function DashboardStep({
  onStartNew,
  onQuickStart,
  onOpenTemplates,
  onEditSite,
  userName,
}: DashboardStepProps) {
  return (
    <UserSites
      onStartNew={onStartNew}
      onQuickStart={onQuickStart}
      onOpenTemplates={onOpenTemplates}
      onEditSite={onEditSite}
      userName={userName}
    />
  );
}
