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
    <div className="pb-8">
      <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={14} />} className="mb-8">
        Back to Google Photos
      </Button>
      <LocalUploader onUploadComplete={onUploadComplete} />
    </div>
  );
}
