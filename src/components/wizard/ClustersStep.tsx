'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClusterReview } from '@/components/dashboard/cluster-review';
import { colors, shadow, radius, opacity } from '@/lib/design-tokens';
import type { GooglePhotoMetadata, PhotoCluster } from '@/types';

interface ClustersStepProps {
  photos: GooglePhotoMetadata[];
  onConfirm: (clusters: PhotoCluster[]) => void;
  onBack: () => void;
}

export function ClustersStep({ photos, onConfirm, onBack }: ClustersStepProps) {
  return (
    <ErrorBoundary>
      {/* Premium cluster container */}
      <div
        className="rounded-3xl p-6 sm:p-8"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.6) 0%, ${colors.cream} 100%)`,
          boxShadow: `${shadow.md}, inset 0 1px 0 rgba(255,255,255,0.7)`,
          border: `1px solid ${colors.divider}`,
        }}
      >
        {/* Accent bar at top */}
        <div
          className="h-1 w-16 rounded-full mx-auto mb-6"
          style={{ background: `linear-gradient(90deg, ${colors.olive}, ${colors.gold})` }}
        />
        <ClusterReview
          photos={photos}
          onConfirm={onConfirm}
          onBack={onBack}
        />
      </div>
    </ErrorBoundary>
  );
}
