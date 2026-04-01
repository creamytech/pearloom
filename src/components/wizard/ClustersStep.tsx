'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClusterReview } from '@/components/dashboard/cluster-review';
import type { GooglePhotoMetadata, PhotoCluster } from '@/types';

interface ClustersStepProps {
  photos: GooglePhotoMetadata[];
  onConfirm: (clusters: PhotoCluster[]) => void;
  onBack: () => void;
}

export function ClustersStep({ photos, onConfirm, onBack }: ClustersStepProps) {
  return (
    <ErrorBoundary>
      <div className="p-6 sm:p-8 bg-white rounded-[var(--pl-radius-md)] border border-[var(--pl-divider)] shadow-[var(--pl-shadow-sm)]">
        <ClusterReview
          photos={photos}
          onConfirm={onConfirm}
          onBack={onBack}
        />
      </div>
    </ErrorBoundary>
  );
}
