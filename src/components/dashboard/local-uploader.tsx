'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/local-uploader.tsx
// Visual photo uploader with grid preview, drag-and-drop,
// per-file progress, and iOS HEIC support.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, Loader2, ArrowRight, ImagePlus, Check, AlertCircle } from 'lucide-react';
import type { GooglePhotoMetadata } from '@/types';
import { colors as C, text, card } from '@/lib/design-tokens';

interface LocalUploaderProps {
  onUploadComplete: (photos: GooglePhotoMetadata[]) => void;
  maxFiles?: number;
}

interface FileEntry {
  file: File;
  preview: string; // object URL for thumbnail
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: { filename: string; publicUrl: string };
}

export function LocalUploader({ onUploadComplete, maxFiles = 30 }: LocalUploaderProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const images = newFiles.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) {
      setGlobalError('No valid image files selected.');
      return;
    }

    setFiles(prev => {
      const total = prev.length + images.length;
      if (total > maxFiles) {
        setGlobalError(`Maximum ${maxFiles} photos. You have ${prev.length}, tried to add ${images.length}.`);
        return prev;
      }
      setGlobalError(null);
      return [
        ...prev,
        ...images.map(f => ({
          file: f,
          preview: URL.createObjectURL(f),
          status: 'pending' as const,
        })),
      ];
    });
  }, [maxFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = ''; // allow re-selecting same files
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, [addFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const entry = prev[index];
      if (entry.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const completedCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const progress = files.length > 0 ? Math.round((completedCount / files.length) * 100) : 0;

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setGlobalError(null);

    const uploadedPhotos: GooglePhotoMetadata[] = [];
    const BASE_DATE = new Date();

    // Upload each file independently — don't stop on individual failures
    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.status === 'done') {
        // Already uploaded (retry scenario) — collect result
        if (entry.result) {
          uploadedPhotos.push(buildPhotoMeta(entry, i, BASE_DATE));
        }
        continue;
      }

      // Mark uploading
      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'uploading', error: undefined } : f));

      try {
        const formData = new FormData();
        formData.append('file', entry.file);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const result = await res.json();
        setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'done', result } : f));
        uploadedPhotos.push(buildPhotoMeta({ ...entry, result }, i, BASE_DATE));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'error', error: msg } : f));
        // Continue to next file — don't stop
      }
    }

    setIsUploading(false);

    if (uploadedPhotos.length > 0) {
      onUploadComplete(uploadedPhotos);
    } else {
      setGlobalError('All uploads failed. Please check your connection and try again.');
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem', color: C.ink }}>
          Upload Your Photos
        </h2>
        <p style={{ color: C.muted, fontSize: text.md, lineHeight: 1.6 }}>
          Select your favorite moments. We support JPG, PNG, WebP, and HEIC.
        </p>
      </div>

      {/* Error banner */}
      {globalError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.85rem 1.25rem', background: '#fef2f2', color: '#dc2626',
            borderRadius: card.radius, marginBottom: '1.25rem', fontSize: text.sm,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            border: '1px solid rgba(220,38,38,0.15)',
          }}
        >
          <AlertCircle size={16} />
          {globalError}
        </motion.div>
      )}

      {/* Drop zone */}
      <motion.div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        animate={{
          borderColor: isDragging ? C.olive : 'rgba(0,0,0,0.1)',
          background: isDragging ? `${C.olive}0A` : 'rgba(0,0,0,0.02)',
        }}
        style={{
          position: 'relative', overflow: 'hidden',
          padding: files.length > 0 ? '1.5rem' : '3.5rem 2rem',
          border: '2px dashed rgba(0,0,0,0.1)',
          borderRadius: card.radius, textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ display: 'none' }}
        />

        {files.length === 0 ? (
          /* Empty state */
          <div>
            <UploadCloud size={44} style={{ margin: '0 auto', color: C.olive, marginBottom: '1rem', opacity: 0.7 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.35rem', color: C.ink }}>
              Drop photos here or tap to browse
            </h3>
            <p style={{ color: C.muted, fontSize: text.sm }}>
              JPG, PNG, WebP, HEIC — up to {maxFiles} photos, 20MB each
            </p>
          </div>
        ) : (
          /* Photo grid */
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '0.5rem', marginBottom: '1rem',
            }}>
              <AnimatePresence>
                {files.map((entry, i) => (
                  <motion.div
                    key={`${entry.file.name}-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'relative', aspectRatio: '1', borderRadius: '0.5rem',
                      overflow: 'hidden',
                      border: entry.status === 'error'
                        ? '2px solid rgba(220,38,38,0.4)'
                        : entry.status === 'done'
                        ? `2px solid ${C.olive}66`
                        : '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.preview}
                      alt={entry.file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />

                    {/* Status overlay */}
                    {entry.status === 'uploading' && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Loader2 size={20} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                    {entry.status === 'done' && (
                      <div style={{
                        position: 'absolute', bottom: '4px', right: '4px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: C.olive, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={12} color="#fff" />
                      </div>
                    )}
                    {entry.status === 'error' && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(220,38,38,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <AlertCircle size={18} color="#dc2626" />
                      </div>
                    )}

                    {/* Remove button */}
                    {!isUploading && (
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(i); }}
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', border: 'none',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff', opacity: 0,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => { (e.target as HTMLElement).style.opacity = '1'; }}
                        onMouseOut={e => { (e.target as HTMLElement).style.opacity = '0'; }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add more button */}
              {!isUploading && files.length < maxFiles && (
                <div
                  style={{
                    aspectRatio: '1', borderRadius: '0.5rem',
                    border: '2px dashed rgba(0,0,0,0.08)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: '0.25rem',
                    color: C.muted, fontSize: text.xs,
                  }}
                >
                  <ImagePlus size={18} />
                  <span>Add more</span>
                </div>
              )}
            </div>

            {/* Count + errors */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: text.sm, color: C.muted }}>
              <span>{files.length} photo{files.length !== 1 ? 's' : ''} selected</span>
              {errorCount > 0 && <span style={{ color: '#dc2626' }}>{errorCount} failed</span>}
            </div>
          </div>
        )}
      </motion.div>

      {/* Upload button + progress */}
      {files.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          {/* Progress bar (during upload) */}
          {isUploading && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%', background: C.olive, borderRadius: '2px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: text.xs, color: C.muted }}>
                <span>Uploading {completedCount} of {files.length}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || files.every(f => f.status === 'done')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '1rem 2rem', borderRadius: card.radius,
              background: C.ink, color: '#fff', fontSize: text.base,
              fontWeight: 600, cursor: isUploading ? 'wait' : 'pointer', border: 'none',
              transition: 'opacity 0.2s, box-shadow 0.2s',
              boxShadow: card.shadow,
              opacity: isUploading ? 0.7 : 1,
            }}
          >
            {isUploading ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading {progress}%</>
            ) : errorCount > 0 ? (
              <><ArrowRight size={18} /> Retry failed &amp; continue</>
            ) : (
              <><ArrowRight size={18} /> Upload &amp; continue</>
            )}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/** Build a GooglePhotoMetadata entry from an upload result */
function buildPhotoMeta(
  entry: FileEntry,
  index: number,
  baseDate: Date,
): GooglePhotoMetadata {
  const fileDate = entry.file.lastModified
    ? new Date(entry.file.lastModified)
    : new Date(baseDate.getTime() - index * 30 * 24 * 60 * 60 * 1000);

  return {
    id: entry.result!.filename,
    filename: entry.file.name,
    mimeType: entry.file.type,
    creationTime: fileDate.toISOString(),
    width: 1920,
    height: 1080,
    baseUrl: entry.result!.publicUrl,
  };
}
