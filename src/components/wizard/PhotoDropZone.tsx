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
    ? 'rgba(212,175,55,0.45)'
    : 'rgba(184,147,90,0.45)';
  const activeBorder = dark
    ? 'rgba(212,175,55,0.9)'
    : 'rgba(184,147,90,0.95)';
  const cardBg = dark
    ? 'rgba(22,16,6,0.35)'
    : 'rgba(250,247,242,0.7)';
  const textColor = dark ? '#FAF7F2' : '#18181B';
  const mutedColor = dark ? 'rgba(250,247,242,0.65)' : '#52525B';
  const kickerColor = dark ? 'rgba(212,175,55,0.85)' : 'rgba(184,147,90,0.85)';
  const ruleColor = dark ? 'rgba(212,175,55,0.55)' : 'rgba(184,147,90,0.55)';
  const FONT_DISPLAY = 'var(--pl-font-display, "Fraunces", serif)';
  const FONT_MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

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
      {/* Dossier kicker */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 2px 2px',
      }}>
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color: kickerColor,
        }}>
          Dossier · direct deposit
        </span>
        <span style={{ flex: 1, height: 1, background: ruleColor, opacity: 0.6 }} />
      </div>

      {/* Drop area — editorial plate */}
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
          gap: 10,
          padding: '26px 20px',
          borderRadius: 2,
          border: `1px dashed ${dragOver ? activeBorder : accentBorder}`,
          borderTop: `1.5px solid ${dragOver ? activeBorder : ruleColor}`,
          background: dragOver
            ? (dark ? 'rgba(212,175,55,0.14)' : 'rgba(184,147,90,0.1)')
            : cardBg,
          boxShadow: dragOver
            ? (dark
                ? '0 0 0 3px rgba(212,175,55,0.22)'
                : '0 0 0 3px rgba(184,147,90,0.18)')
            : 'none',
          cursor: 'pointer',
          transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease, box-shadow 180ms ease',
          textAlign: 'center',
          minHeight: 140,
        }}
      >
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: kickerColor,
        }}>
          Plate · {dragOver ? 'ready · set' : 'open for filing'}
        </span>
        <UploadCloud
          size={26}
          strokeWidth={1.5}
          color={dragOver ? activeBorder : ruleColor}
        />
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: '1.15rem',
            fontWeight: 400,
            color: textColor,
            letterSpacing: '-0.005em',
            lineHeight: 1.15,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          {dragOver ? 'release to commit the plate' : 'drop photographs onto the press'}
        </div>
        <div style={{ width: 32, height: 1, background: ruleColor, opacity: 0.6 }} />
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: mutedColor,
            lineHeight: 1.5,
            maxWidth: 300,
          }}
        >
          or click to browse · up to {maxPhotos} plates · {Math.round(maxBytesPerPhoto / (1024 * 1024))} MB each
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
              padding: 10,
              borderRadius: 2,
              borderTop: `1.5px solid ${ruleColor}`,
              borderLeft: `1px solid ${accentBorder}`,
              borderRight: `1px solid ${accentBorder}`,
              borderBottom: `1px solid ${accentBorder}`,
              background: cardBg,
            }}
          >
            {pending.map((p, i) => (
              <div
                key={p.id}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 2,
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
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 4,
                    fontFamily: FONT_MONO,
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    color: '#FAF7F2',
                    textShadow: '0 1px 2px rgba(22,16,6,0.6)',
                    pointerEvents: 'none',
                  }}
                >
                  № {String(i + 1).padStart(2, '0')}
                </span>
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
                    borderRadius: 2,
                    border: '1px solid rgba(250,247,242,0.55)',
                    background: 'rgba(22,16,6,0.62)',
                    color: '#FAF7F2',
                    cursor: uploading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: uploading ? 0.4 : 1,
                  }}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Erratum */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 2,
            background: 'rgba(139,45,45,0.06)',
            borderTop: '1.5px solid rgba(139,45,45,0.65)',
            borderLeft: '1px solid rgba(139,45,45,0.28)',
            borderRight: '1px solid rgba(139,45,45,0.28)',
            borderBottom: '1px solid rgba(139,45,45,0.28)',
            color: '#8B2D2D',
            fontFamily: FONT_MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            lineHeight: 1.55,
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Erratum · {error}</span>
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
              minHeight: 42,
              padding: '0 16px',
              borderRadius: 2,
              background: 'transparent',
              border: `1px solid ${accentBorder}`,
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: mutedColor,
              cursor: uploading ? 'default' : 'pointer',
              opacity: uploading ? 0.5 : 1,
              transition: 'background 180ms ease, border-color 180ms ease',
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={startUpload}
            disabled={uploading}
            style={{
              flex: 1.6,
              minHeight: 42,
              padding: '0 18px',
              borderRadius: 2,
              background: dark ? '#FAF7F2' : '#18181B',
              color: dark ? '#18181B' : '#FAF7F2',
              border: 'none',
              borderTop: `1.5px solid ${dark ? 'rgba(212,175,55,0.85)' : 'rgba(184,147,90,0.95)'}`,
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              cursor: uploading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 0 0 3px rgba(184,147,90,0.22)',
              transition: 'box-shadow 180ms ease',
            }}
          >
            {uploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    border: `1.5px solid ${dark ? 'rgba(22,16,6,0.35)' : 'rgba(250,247,242,0.35)'}`,
                    borderTopColor: dark ? '#18181B' : '#FAF7F2',
                  }}
                />
                Pressing · plates
              </>
            ) : (
              <>
                <ImageIcon size={12} strokeWidth={1.8} />
                File · {String(pending.length).padStart(2, '0')} plate{pending.length === 1 ? '' : 's'}
              </>
            )}
          </button>
        </div>
      )}

      {uploadedCount > 0 && pending.length === 0 && !uploading && (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: kickerColor,
            textAlign: 'center',
            paddingTop: 2,
          }}
        >
          Filed · {String(uploadedCount).padStart(2, '0')} plate{uploadedCount === 1 ? '' : 's'} committed
        </div>
      )}
    </div>
  );
}
