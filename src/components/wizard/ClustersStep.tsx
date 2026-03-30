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
      <ClusterReview
        photos={photos}
        onConfirm={onConfirm}
        onBack={onBack}
      />
    </ErrorBoundary>
  );
}
