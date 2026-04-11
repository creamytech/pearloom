'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/PhotoDropZone.tsx
//
// Direct photo upload for users who don't keep their memories
// in Google Photos. Drag files in, click to pick, or pick from
// the clipboard — the component reads each file as base64,
// POSTs a batch to /api/photos/upload, and hands the resulting
// GooglePhotoMetadata-shaped photos back to the wizard so the
// rest of the flow (clustering, generation, mirroring) works
// without any code changes.
//
// Sits alongside the Google Photos button as a second entry
// point on the photos step. Users who already live on Google
// Photos keep the old flow; everyone else gets unblocked.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

export interface UploadedPhotoMeta {
  id: string;
  filename: string;
  mimeType: string;
  creationTime: string;
  width: number;
  height: number;
  baseUrl: string;
  description: string;
}

export interface PhotoDropZoneProps {
  /** Called with the list of successfully uploaded photos. */
  onPhotosUploaded: (photos: UploadedPhotoMeta[]) => void;
  /** Max photos to accept in one batch. Default 25. */
  maxPhotos?: number;
  /** Max per-file size in bytes. Default 12 MB. */
  maxBytesPerPhoto?: number;
  /** Visual style — dark variant for dark-vibe themes. */
  dark?: boolean;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

const DEFAULT_MAX_PHOTOS = 25;
const DEFAULT_MAX_BYTES = 12 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width || 1200, height: img.height || 1200 });
    img.onerror = () => resolve({ width: 1200, height: 1200 });
    img.src = dataUrl;
  });
}

export function PhotoDropZone({
  onPhotosUploaded,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  maxBytesPerPhoto = DEFAULT_MAX_BYTES,
  dark = false,
}: PhotoDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentBorder = dark
    ? 'rgba(255,255,255,0.25)'
    : 'rgba(163,177,138,0.35)';
  const activeBorder = 'var(--pl-olive, #A3B18A)';
  const cardBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.45)';
  const textColor = dark ? '#FAF7F2' : 'var(--pl-ink-soft)';
  const mutedColor = dark ? 'rgba(250,247,242,0.6)' : 'var(--pl-muted)';

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setError(null);
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      setError('Please drop image files only.');
      return;
    }

    const available = maxPhotos - pending.length;
    const accepted = files.slice(0, available);
    if (files.length > available) {
      setError(`Only ${available} more photo${available === 1 ? '' : 's'} can be added.`);
    }

    const oversized = accepted.find((f) => f.size > maxBytesPerPhoto);
    if (oversized) {
      setError(
        `${oversized.name} is too large (max ${Math.round(maxBytesPerPhoto / (1024 * 1024))} MB).`,
      );
      return;
    }

    // Create local previews so the user sees the thumbnails
    // immediately while the upload runs in the background.
    const newPending: PendingFile[] = await Promise.all(
      accepted.map(async (file) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    );
    setPending((prev) => [...prev, ...newPending]);
  }, [maxPhotos, pending.length, maxBytesPerPhoto]);

  const removePending = useCallback((id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const startUpload = useCallback(async () => {
    if (pending.length === 0 || uploading) return;
    setUploading(true);
    setError(null);

    try {
      // Read every file to base64 + measure dimensions in parallel.
      const payload = await Promise.all(
        pending.map(async (p) => {
          const [base64, dims] = await Promise.all([
            readAsDataUrl(p.file),
            loadImageDimensions(URL.createObjectURL(p.file)),
          ]);
          return {
            id: p.id,
            filename: p.file.name,
            mimeType: p.file.type || 'image/jpeg',
            base64,
            capturedAt: p.file.lastModified
              ? new Date(p.file.lastModified).toISOString()
              : undefined,
            width: dims.width,
            height: dims.height,
          };
        }),
      );

      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }

      const data = (await res.json()) as {
        photos: UploadedPhotoMeta[];
        failures: Array<{ index: number; error: string }>;
      };

      if (data.failures.length > 0) {
        setError(
          `${data.failures.length} photo${data.failures.length === 1 ? '' : 's'} couldn\u2019t upload.`,
        );
      }

      if (data.photos.length > 0) {
        onPhotosUploaded(data.photos);
        setUploadedCount((n) => n + data.photos.length);
        // Release object URLs so we don't leak memory when the
        // user comes back for another batch.
        pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPending([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [pending, uploading, onPhotosUploaded]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
      }}
    >
      {/* Drop area */}
      <motion.label
        htmlFor="pear-photo-upload-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        whileHover={{ y: -1 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '24px 18px',
          borderRadius: 18,
          border: `1.5px dashed ${dragOver ? activeBorder : accentBorder}`,
          background: dragOver
            ? 'rgba(163,177,138,0.12)'
            : cardBg,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          textAlign: 'center',
          minHeight: 128,
        }}
      >
        <UploadCloud
          size={28}
          color={dragOver ? 'var(--pl-olive)' : 'var(--pl-muted)'}
        />
        <div
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: textColor,
          }}
        >
          {dragOver ? 'Drop to add' : 'Drop photos here'}
        </div>
        <div
          style={{
            fontSize: '0.68rem',
            color: mutedColor,
            lineHeight: 1.4,
            maxWidth: 280,
          }}
        >
          Or click to browse from your device. Up to {maxPhotos} photos,{' '}
          {Math.round(maxBytesPerPhoto / (1024 * 1024))} MB each.
        </div>
        <input
          ref={inputRef}
          id="pear-photo-upload-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            // Reset so the same file can be picked again
            e.target.value = '';
          }}
        />
      </motion.label>

      {/* Pending thumbnails */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
              gap: 6,
              padding: 8,
              borderRadius: 14,
              background: cardBg,
              border: `1px solid ${accentBorder}`,
            }}
          >
            {pending.map((p) => (
              <div
                key={p.id}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `1px solid ${accentBorder}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt={p.file.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  disabled={uploading}
                  aria-label={`Remove ${p.file.name}`}
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    cursor: uploading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: uploading ? 0.4 : 1,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 10,
            background: 'rgba(185,28,28,0.08)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: '#b91c1c',
            fontSize: '0.7rem',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons — only visible once something is pending */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
              setPending([]);
              setError(null);
            }}
            disabled={uploading}
            style={{
              flex: 1,
              minHeight: 40,
              padding: '0 14px',
              borderRadius: 100,
              background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${accentBorder}`,
              fontSize: '0.76rem',
              fontWeight: 600,
              color: mutedColor,
              cursor: uploading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              opacity: uploading ? 0.5 : 1,
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={startUpload}
            disabled={uploading}
            style={{
              flex: 1.6,
              minHeight: 40,
              padding: '0 16px',
              borderRadius: 100,
              background: 'var(--pl-olive, #A3B18A)',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#fff',
              cursor: uploading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            {uploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                  }}
                />
                Uploading…
              </>
            ) : (
              <>
                <ImageIcon size={13} />
                Upload {pending.length}
              </>
            )}
          </button>
        </div>
      )}

      {uploadedCount > 0 && pending.length === 0 && !uploading && (
        <div
          style={{
            fontSize: '0.7rem',
            color: mutedColor,
            textAlign: 'center',
          }}
        >
          {uploadedCount} photo{uploadedCount === 1 ? '' : 's'} uploaded
        </div>
      )}
    </div>
  );
}
