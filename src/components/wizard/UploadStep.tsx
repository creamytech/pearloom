'use client';

import { ArrowLeft } from 'lucide-react';
import { LocalUploader } from '@/components/dashboard/local-uploader';
import { Button } from '@/components/ui';
import type { GooglePhotoMetadata } from '@/types';

interface UploadStepProps {
  onUploadComplete: (photos: GooglePhotoMetadata[]) => void;
  onBack: () => void;
}

export function UploadStep({ onUploadComplete, onBack }: UploadStepProps) {
  return (
    <div className="pb-8" style={{
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.5)',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
      padding: '2rem',
    } as React.CSSProperties}>
      <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={14} />} className="mb-8">
        Back to Google Photos
      </Button>
      <LocalUploader onUploadComplete={onUploadComplete} />
    </div>
  );
}
