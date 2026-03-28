'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/photo-gallery.tsx
// Guest photo gallery with upload + masonry grid + lightbox
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Camera, Loader2, ImagePlus } from 'lucide-react';
import type { GalleryPhoto } from '@/types';

interface PhotoGalleryProps {
  siteId: string;
}

export function PhotoGallery({ siteId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
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

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', uploadName || 'Guest');
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
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  return (
    <div>
      {/* Upload area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed rgba(0,0,0,0.1)',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          cursor: 'pointer',
          background: '#fff',
          transition: 'border-color 0.3s',
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
            <Loader2 size={32} color="#b8926a" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <ImagePlus size={32} color="#8c8c8c" />
          )}
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--eg-fg)' }}>
              {uploading ? 'Uploading...' : 'Drop photos here or click to upload'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>
              JPG, PNG, WebP · Max 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Name input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem',
      }}>
        <Camera size={16} color="#8c8c8c" />
        <input
          type="text"
          value={uploadName}
          onChange={(e) => setUploadName(e.target.value)}
          placeholder="Your name (so we know who took these gems)"
          style={{
            flex: 1, padding: '0.6rem 0.85rem', borderRadius: '0.75rem',
            border: '1.5px solid rgba(0,0,0,0.08)', fontSize: '0.9rem',
            background: '#fff', outline: 'none', fontFamily: 'var(--eg-font-body)',
            color: 'var(--eg-fg)',
          }}
        />
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 size={24} color="#8c8c8c" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Upload size={48} color="#8c8c8c" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ color: '#8c8c8c' }}>No photos yet — be the first to share!</p>
        </div>
      ) : (
        <div style={{
          columns: '3 200px',
          gap: '0.75rem',
        }}>
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                breakInside: 'avoid',
                marginBottom: '0.75rem',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => setLightboxPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={photo.caption || `Uploaded by ${photo.uploadedBy}`}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '0.75rem',
                  transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxPhoto(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                padding: '0.5rem', background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', zIndex: 10,
              }}
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption || ''}
              style={{
                maxWidth: '100%', maxHeight: '90vh',
                objectFit: 'contain', borderRadius: '0.75rem',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxPhoto.uploadedBy && (
              <p style={{
                position: 'absolute', bottom: '1.5rem',
                color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem',
              }}>
                Uploaded by {lightboxPhoto.uploadedBy}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
