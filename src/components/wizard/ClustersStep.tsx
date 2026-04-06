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
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 2px 12px rgba(43,30,20,0.04)',
          padding: 'clamp(16px, 3vw, 32px)',
        } as React.CSSProperties}
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
