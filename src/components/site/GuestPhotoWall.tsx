'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/GuestPhotoWall.tsx
// Public-facing guest photo upload wall for wedding sites.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload } from 'lucide-react';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { GuestPhoto } from '@/types';

export interface GuestPhotoWallProps {
  siteId: string;
  vibeSkin?: VibeSkin;
  enabled?: boolean;
}

export function GuestPhotoWall({ siteId, vibeSkin, enabled = true }: GuestPhotoWallProps) {
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accent = vibeSkin?.palette?.accent || 'var(--pl-olive, #A3B18A)';
  const headingFont = vibeSkin?.fonts?.heading || 'Playfair Display';

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/guest-photos?siteId=${encodeURIComponent(siteId)}&status=approved`);
      if (res.ok) {
        const data = await res.json() as { photos: GuestPhoto[] };
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error('[GuestPhotoWall] Failed to fetch photos:', err);
    }
  }, [siteId]);

  useEffect(() => {
    if (!enabled) return;
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 30_000);
    return () => clearInterval(interval);
  }, [enabled, fetchPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadError(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploaderName.trim()) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('siteId', siteId);
      formData.append('uploaderName', uploaderName.trim());
      if (caption.trim()) formData.append('caption', caption.trim());

      const res = await fetch('/api/guest-photos', { method: 'POST', body: formData });
      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok) {
        setUploadError(data.error || 'Upload failed. Please try again.');
        return;
      }

      setUploadSuccess(true);
      setShowModal(false);
      setUploaderName('');
      setCaption('');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch {
      setUploadError('Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setUploadError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  if (!enabled) return null;

  return (
    <section
      id="photo-wall"
      style={{
        background: 'var(--pl-cream-deep, var(--pl-cream, #F5F1E8))',
        padding: '5rem 0',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ width: '48px', height: '1px', background: accent, opacity: 0.3 }} />
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.32em', textTransform: 'uppercase' as const, color: accent, fontWeight: 700, opacity: 0.85 }}>
              {vibeSkin?.accentSymbol || '✦'}
            </span>
            <div style={{ width: '48px', height: '1px', background: accent, opacity: 0.3 }} />
          </div>
          <h2
            style={{
              fontFamily: `"${headingFont}", serif`,
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              color: 'var(--pl-ink, #2B2B2B)',
              margin: '0 0 1rem',
              lineHeight: 1.05,
            }}
          >
            Share Your Moments
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '24px', height: '1px', background: accent, opacity: 0.35 }} />
            <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', opacity: 0.5 }} />
            <div style={{ width: '24px', height: '1px', background: accent, opacity: 0.35 }} />
          </div>
          <p style={{ color: 'var(--pl-muted, #9A9488)', fontSize: '1rem', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            Upload a photo from the celebration
          </p>
        </div>

        {/* Upload zone */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              padding: '2rem 3rem',
              border: `2px dashed ${accent}55`,
              borderRadius: '1rem',
              background: `${accent}08`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'var(--pl-ink, #2B2B2B)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}14`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}08`; }}
          >
            <Camera size={32} style={{ color: accent, opacity: 0.75 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.75 }}>Tap to upload</span>
          </button>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                position: 'fixed', bottom: '2rem', right: '2rem',
                background: 'var(--pl-plum, #6D597A)', color: '#fff',
                padding: '1rem 1.5rem', borderRadius: '0.75rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 1000, fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              Photo submitted! It will appear after approval.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div
            style={{
              columns: 'auto 200px',
              columnGap: '12px',
            }}
          >
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                whileHover={{ scale: 1.02 }}
                style={{
                  breakInside: 'avoid',
                  marginBottom: '12px',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  background: 'var(--pl-glass)',
                  cursor: 'default',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo by ${photo.uploaderName}`}
                  loading="lazy"
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                />
                <div style={{ padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', opacity: 0.6, color: 'var(--pl-ink, #2B2B2B)' }}>
                    {photo.uploaderName}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', opacity: 0.5 }}>
            <Camera size={40} style={{ color: accent, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ fontSize: '1rem', color: 'var(--pl-muted, #9A9488)', fontStyle: 'italic' }}>
              Be the first to share a photo!
            </p>
          </div>
        )}
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 1100, backdropFilter: 'blur(4px)',
              }}
            />
            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1200, width: '90%', maxWidth: '480px',
                background: 'var(--pl-cream-card)',
                borderRadius: '1.25rem',
                padding: '2rem',
                boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
                color: 'var(--pl-ink, #2B2B2B)',
              }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontFamily: `"${headingFont}", serif`,
                  fontSize: '1.35rem', fontWeight: 600, fontStyle: 'italic',
                  margin: 0, color: 'var(--pl-ink, #2B2B2B)',
                }}>
                  Share a Photo
                </h3>
                <button
                  onClick={handleCloseModal}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpload}>
                {/* File selection */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${previewUrl ? accent : accent + '55'}`,
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: '1.25rem',
                    background: previewUrl ? 'transparent' : `${accent}08`,
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                  }}
                >
                  {previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '0.5rem', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                      <Upload size={28} style={{ color: accent }} />
                      <span style={{ fontSize: '0.85rem' }}>Click to select a photo</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Max 10MB · JPEG, PNG, WEBP, GIF</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {/* Name field */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                    Your name *
                  </label>
                  <input
                    type="text"
                    value={uploaderName}
                    onChange={e => setUploaderName(e.target.value)}
                    placeholder="Your name"
                    required
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem',
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '0.5rem', fontSize: '0.9rem',
                      background: 'rgba(0,0,0,0.03)',
                      color: 'inherit', boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Caption field */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>
                    Add a caption (optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Add a caption"
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem',
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '0.5rem', fontSize: '0.9rem',
                      background: 'rgba(0,0,0,0.03)',
                      color: 'inherit', boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {uploadError && (
                  <p style={{ color: '#e05757', fontSize: '0.85rem', marginBottom: '1rem', margin: '0 0 1rem' }}>
                    {uploadError}
                  </p>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    style={{
                      flex: 1, padding: '0.7rem 1rem',
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '0.6rem', cursor: 'pointer',
                      background: 'transparent', fontSize: '0.9rem',
                      color: 'inherit', opacity: 0.7,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile || !uploaderName.trim()}
                    style={{
                      flex: 2, padding: '0.7rem 1rem',
                      border: 'none', borderRadius: '0.6rem',
                      cursor: uploading || !selectedFile || !uploaderName.trim() ? 'not-allowed' : 'pointer',
                      background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                      color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                      opacity: uploading || !selectedFile || !uploaderName.trim() ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
