'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/photo-gallery.tsx
// Premium guest photo gallery — masonry grid, hover overlays,
// drag-and-drop upload, lightbox with prev/next navigation.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import type { GalleryPhoto } from '@/types';

interface PhotoGalleryProps {
  siteId: string;
}

// Skeleton placeholder for a single photo slot
function PhotoSkeleton({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: '0.875rem',
        marginBottom: '0.75rem',
        background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s ease-in-out infinite',
        breakInside: 'avoid',
      }}
    />
  );
}

export function PhotoGallery({ siteId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploadName, setUploadName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/gallery?siteId=${encodeURIComponent(siteId)}`);
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch {
      console.error('Failed to fetch gallery');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', uploadName.trim() || 'Guest');
      formData.append('siteId', siteId);
      const res = await fetch('/api/gallery', { method: 'POST', body: formData });
      return res.json();
    });
    await Promise.all(uploadPromises);
    setUploading(false);
    fetchPhotos();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  // Lightbox navigation
  const prevPhoto = () => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i));
  const nextPhoto = () => setLightboxIdx((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIdx]);

  const lightboxPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  return (
    <div>

      {/* ── Name input ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Camera size={16} color="var(--eg-muted)" />
        <input
          type="text"
          value={uploadName}
          onChange={(e) => setUploadName(e.target.value)}
          placeholder="Your name (so we know who took these gems)"
          style={{
            flex: 1, padding: '0.65rem 0.9rem', borderRadius: '0.75rem',
            border: '1.5px solid rgba(0,0,0,0.08)',
            fontSize: 'max(16px, 0.9rem)',
            background: '#fff', outline: 'none',
            fontFamily: 'var(--eg-font-body)',
            color: 'var(--eg-fg)',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--eg-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
        />
      </div>

      {/* ── Upload drop zone ── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--eg-accent)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: '1.25rem',
          padding: '2.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          cursor: 'pointer',
          background: dragOver ? 'rgba(163,177,138,0.06)' : 'rgba(245,241,232,0.5)',
          transition: 'border-color 0.25s, background 0.25s, transform 0.2s',
          transform: dragOver ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {uploading ? (
            <Loader2
              size={32}
              color="var(--eg-accent)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          ) : (
            <div
              style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: dragOver ? 'rgba(163,177,138,0.15)' : 'rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.25s',
                animation: dragOver ? 'pulse-zone 1s ease-in-out infinite' : 'none',
              }}
            >
              <Upload size={22} color={dragOver ? 'var(--eg-accent)' : 'var(--eg-muted)'} />
            </div>
          )}
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--eg-fg)' }}>
              {uploading ? 'Uploading...' : dragOver ? 'Drop to upload' : 'Drop photos here or tap to upload'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.25rem' }}>
              JPG, PNG, WebP &middot; Max 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* ── Gallery grid ── */}
      {loading ? (
        /* Loading skeletons */
        <div style={{ columns: '3 200px', gap: '0.75rem' }}>
          {[180, 240, 160, 280, 200, 220].map((h, i) => (
            <PhotoSkeleton key={i} height={h} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Upload size={48} color="rgba(0,0,0,0.12)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--eg-muted)', fontSize: '0.925rem' }}>
            No photos yet — be the first to share a moment.
          </p>
        </div>
      ) : (
        /* Masonry grid */
        <div
          style={{
            columns: '3 200px',
            gap: '0.75rem',
          }}
          className="photo-masonry pl-scroll-fade-up"
        >
          {photos.map((photo, idx) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.5) }}
              style={{
                breakInside: 'avoid',
                marginBottom: '0.75rem',
                borderRadius: '0.875rem',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                display: 'block',
              }}
              onClick={() => setLightboxIdx(idx)}
              whileHover="hovered"
            >
              <img
                src={photo.url}
                alt={photo.caption || `Photo by ${photo.uploadedBy}`}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '0.875rem',
                }}
                loading="lazy"
              />

              {/* Hover overlay */}
              <motion.div
                variants={{
                  hovered: { opacity: 1 },
                }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                  borderRadius: '0.875rem',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '1rem',
                }}
              >
                <motion.div
                  variants={{ hovered: { opacity: 1, y: 0 } }}
                  initial={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  {photo.uploadedBy && (
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', fontWeight: 600 }}>
                      {photo.uploadedBy}
                    </p>
                  )}
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', marginTop: '0.15rem' }}>
                    {new Date(photo.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxPhoto && lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxIdx(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                padding: '0.5rem', background: 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '50%',
                color: 'rgba(255,255,255,0.8)', cursor: 'pointer', zIndex: 10,
                display: 'flex', transition: 'background 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <X size={20} />
            </button>

            {/* Prev */}
            {lightboxIdx > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  padding: '0.75rem', background: 'rgba(255,255,255,0.1)',
                  border: 'none', borderRadius: '50%',
                  color: 'rgba(255,255,255,0.8)', cursor: 'pointer', zIndex: 10,
                  display: 'flex', transition: 'background 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Next */}
            {lightboxIdx < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  padding: '0.75rem', background: 'rgba(255,255,255,0.1)',
                  border: 'none', borderRadius: '50%',
                  color: 'rgba(255,255,255,0.8)', cursor: 'pointer', zIndex: 10,
                  display: 'flex', transition: 'background 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <ChevronRight size={22} />
              </button>
            )}

            {/* Image with swipe gestures */}
            <AnimatePresence mode="wait">
              <motion.img
                key={lightboxPhoto.id}
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_: unknown, info: { offset: { x: number } }) => {
                  if (info.offset.x < -80 && lightboxIdx < photos.length - 1) nextPhoto();
                  else if (info.offset.x > 80 && lightboxIdx > 0) prevPhoto();
                }}
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || ''}
                style={{
                  maxWidth: '100%', maxHeight: '85vh',
                  objectFit: 'contain', borderRadius: '0.75rem',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
                  touchAction: 'pan-y',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </AnimatePresence>

            {/* Caption row */}
            <div
              style={{
                position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                pointerEvents: 'none',
              }}
            >
              {lightboxPhoto.uploadedBy && (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
                  {lightboxPhoto.uploadedBy}
                </p>
              )}
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
                {lightboxIdx + 1} / {photos.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-zone {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @media (max-width: 640px) {
          .photo-masonry { columns: 2 !important; }
        }
      `}</style>
    </div>
  );
}
