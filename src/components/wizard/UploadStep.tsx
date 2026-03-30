'use client';

import { ArrowLeft } from 'lucide-react';
import { LocalUploader } from '@/components/dashboard/local-uploader';
import type { GooglePhotoMetadata } from '@/types';

interface UploadStepProps {
  onUploadComplete: (photos: GooglePhotoMetadata[]) => void;
  onBack: () => void;
}

export function UploadStep({ onUploadComplete, onBack }: UploadStepProps) {
  return (
    <div className="pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[0.9rem] text-[var(--eg-muted)] mb-8 bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to Google Photos
      </button>
      <LocalUploader onUploadComplete={onUploadComplete} />
    </div>
  );
}
