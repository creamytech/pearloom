'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/local-uploader.tsx
// High-Fidelity Local File Uploader (Supabase Storage)
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, X, Loader2, ArrowRight } from 'lucide-react';
import type { GooglePhotoMetadata } from '@/types';

interface LocalUploaderProps {
  onUploadComplete: (photos: GooglePhotoMetadata[]) => void;
  maxFiles?: number;
}

export function LocalUploader({ onUploadComplete, maxFiles = 30 }: LocalUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validImages = filesArray.filter(f => f.type.startsWith('image/'));
      
      if (validImages.length + selectedFiles.length > maxFiles) {
        setError(`You can only upload up to ${maxFiles} photos at once.`);
        return;
      }
      
      setError(null);
      setSelectedFiles(prev => [...prev, ...validImages]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setError(null);
    setProgress(0);

    const uploadedPhotos: GooglePhotoMetadata[] = [];
    let completedCount = 0;

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(error || `HTTP ${res.status}`);
        }

        const { filename, publicUrl } = await res.json();

        uploadedPhotos.push({
          id: filename,
          filename: file.name,
          mimeType: file.type,
          creationTime: new Date().toISOString(),
          width: 1920,
          height: 1080,
          baseUrl: publicUrl,
        });

        completedCount++;
        setProgress(Math.round((completedCount / selectedFiles.length) * 100));
      }

      onUploadComplete(uploadedPhotos);
    } catch (err: unknown) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', background: '#fff', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.02)' }}>
      <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>Upload Photos Directly</h2>
      <p style={{ color: 'var(--eg-muted)', marginBottom: '2rem' }}>
        Select your favorite high-quality images. The Pearloom AI will parse them.
      </p>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '3rem 2rem', border: '2px dashed rgba(0,0,0,0.1)', borderRadius: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', transition: 'background 0.2s', cursor: 'pointer' }}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
        />
        <UploadCloud size={48} style={{ margin: '0 auto', color: 'var(--eg-accent)', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem' }}>Click or drag to upload</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem' }}>Supports JPG, PNG, HEIC (Max {maxFiles} files)</p>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ fontWeight: 500, marginBottom: '1rem' }}>Selected Files ({selectedFiles.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {selectedFiles.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  disabled={isUploading}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isUploading ? (
              <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--eg-accent)', transition: 'width 0.3s ease' }} />
              </div>
            ) : null}

            <button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '1rem 2rem', borderRadius: '2rem',
                background: 'var(--eg-fg)', color: '#fff', fontSize: '1rem',
                fontWeight: 500, cursor: 'pointer', border: 'none',
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Uploading {progress}%
                </>
              ) : (
                <>
                  Generate Timeline <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
