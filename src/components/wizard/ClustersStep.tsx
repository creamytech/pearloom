'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClusterReview } from '@/components/dashboard/cluster-review';
import { card } from '@/lib/design-tokens';
import type { GooglePhotoMetadata, PhotoCluster } from '@/types';

interface ClustersStepProps {
  photos: GooglePhotoMetadata[];
  onConfirm: (clusters: PhotoCluster[]) => void;
  onBack: () => void;
}

export function ClustersStep({ photos, onConfirm, onBack }: ClustersStepProps) {
  return (
    <ErrorBoundary>
      <div
        className="p-6 sm:p-8"
        style={{
          background: card.bg,
          borderRadius: card.radius,
          border: card.border,
          boxShadow: card.shadow,
        }}
      >
        <ClusterReview
          photos={photos}
          onConfirm={onConfirm}
          onBack={onBack}
        />
      </div>
    </ErrorBoundary>
  );
}
