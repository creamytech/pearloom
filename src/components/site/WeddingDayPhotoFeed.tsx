'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/WeddingDayPhotoFeed.tsx
// Real-time guest photo upload + display widget.
// Shown only on or after the wedding date.
// Polls /api/wedding-day every 30 seconds for new photos.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';
import { getSupabaseBrowser } from '@/lib/supabase-realtime';

interface WeddingDayPhoto {
  id: string;
  url: string;
  uploadedBy: string;
  caption?: string;
  uploadedAt: string;
}

interface WeddingDayPhotoFeedProps {
  siteId: string;
  vibeSkin: VibeSkin;
}

const POLL_INTERVAL_MS = 30_000;

export function WeddingDayPhotoFeed({ siteId, vibeSkin }: WeddingDayPhotoFeedProps) {
  const { accent, foreground, card, muted, background, ink } = vibeSkin.palette;
  const { heading, body } = vibeSkin.fonts;

  const [photos, setPhotos] = useState<WeddingDayPhoto[]>([]);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/wedding-day?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.photos)) {
        setPhotos(data.photos);
      }
    } catch {
      // Silently fail — don't disrupt the page
    }
  }, [siteId]);

  // Initial fetch + Realtime subscription (with polling fallback).
  useEffect(() => {
    fetchPhotos();

    const sb = getSupabaseBrowser();
    if (sb) {
      const channel = sb
        .channel(`wedding-day-${siteId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'wedding_day_photos', filter: `site_id=eq.${siteId}` },
          () => { fetchPhotos(); },
        )
        .subscribe();
      const onFocus = () => fetchPhotos();
      window.addEventListener('focus', onFocus);
      return () => {
        sb.removeChannel(channel);
        window.removeEventListener('focus', onFocus);
      };
    }

    const timer = setInterval(fetchPhotos, POLL_INTERVAL_MS);
    const onFocus = () => fetchPhotos();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchPhotos, siteId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setUploadError(null);
    setUploadSuccess(false);
    if (selected) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string ?? null);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError('Please choose a photo to share.');
      return;
    }
    if (!name.trim()) {
      setUploadError('Please enter your name.');
      return;
    }
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('siteId', siteId);
      formData.append('name', name.trim());
      formData.append('caption', caption.trim());
      formData.append('image', file);

      const res = await fetch('/api/wedding-day', { method: 'POST', body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();

      // Optimistically prepend the new photo
      if (data.photo) {
        setPhotos((prev) => [data.photo, ...prev]);
      }

      setUploadSuccess(true);
      setName('');
      setCaption('');
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '0.5rem',
    border: `1.5px solid ${muted}44`,
    background: background,
    color: ink,
    fontFamily: `"${body}", sans-serif`,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <section
      style={{
        padding: '5rem 2rem',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* Section heading */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>
          {vibeSkin.accentSymbol || '📷'}
        </div>
        <h2
          style={{
            fontFamily: `"${heading}", serif`,
            fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
            fontWeight: 600,
            color: ink,
            margin: 0,
            marginBottom: '0.5rem',
          }}
        >
          Share a Photo from Today
        </h2>
        <p style={{ color: muted, fontFamily: `"${body}", sans-serif`, fontSize: '1rem', margin: 0 }}>
          Help us capture every beautiful moment — upload a photo from the celebration.
        </p>
      </div>

      {/* Upload form */}
      <div
        style={{
          background: card,
          borderRadius: '1.25rem',
          padding: '2rem',
          marginBottom: '3.5rem',
          boxShadow: `0 4px 24px ${accent}18`,
          border: `1px solid ${muted}22`,
          maxWidth: '560px',
          margin: '0 auto 3.5rem',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${filePreview ? accent : muted + '88'}`,
              borderRadius: '0.875rem',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: filePreview ? 'transparent' : `${accent}08`,
              transition: 'border-color var(--pl-dur-fast)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {filePreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={filePreview}
                alt="Preview"
                style={{ maxHeight: 180, maxWidth: '100%', borderRadius: '0.5rem', objectFit: 'contain' }}
              />
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                <p style={{ color: muted, fontFamily: `"${body}", sans-serif`, fontSize: '0.9rem', margin: 0 }}>
                  Click to choose a photo
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-label="Choose photo to upload"
            />
          </div>

          <input
            type="text"
            placeholder="Your name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputBase}
            maxLength={80}
            required
            aria-label="Your name"
          />

          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={inputBase}
            maxLength={200}
            aria-label="Caption"
          />

          {uploadError && (
            <p style={{ color: '#E74C3C', fontFamily: `"${body}", sans-serif`, fontSize: '0.875rem', margin: 0 }}>
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p style={{ color: '#27AE60', fontFamily: `"${body}", sans-serif`, fontSize: '0.875rem', margin: 0 }}>
              Photo shared! Thank you 🎉
            </p>
          )}

          <button
            type="submit"
            disabled={uploading}
            style={{
              padding: '0.75rem 1.5rem',
              background: uploading ? muted : accent,
              color: background,
              border: 'none',
              borderRadius: '0.625rem',
              fontFamily: `"${body}", sans-serif`,
              fontWeight: 600,
              fontSize: '1rem',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'background var(--pl-dur-fast)',
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? 'Uploading…' : 'Share Photo'}
          </button>
        </form>
      </div>

      {/* Masonry photo grid */}
      {photos.length > 0 && (
        <div
          style={{
            columns: 'var(--feed-cols, 2)',
            gap: '16px',
          }}
        >
          {/* Responsive columns via a style tag */}
          <style>{`
            @media (min-width: 768px) { :root { --feed-cols: 3; } }
            @media (max-width: 767px) { :root { --feed-cols: 2; } }
          `}</style>

          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                breakInside: 'avoid',
                marginBottom: '16px',
                background: '#fff',
                borderRadius: '4px',
                padding: '10px 10px 14px',
                boxShadow: `0 4px 14px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)`,
                display: 'inline-block',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || `Photo by ${photo.uploadedBy}`}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '2px',
                  objectFit: 'cover',
                }}
              />
              <div style={{ marginTop: '10px' }}>
                <p
                  style={{
                    fontFamily: `"${heading}", serif`,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: ink,
                    margin: 0,
                    marginBottom: caption ? '0.2rem' : 0,
                  }}
                >
                  {photo.uploadedBy}
                </p>
                {photo.caption && (
                  <p
                    style={{
                      fontFamily: `"${body}", sans-serif`,
                      fontSize: '0.8rem',
                      color: muted,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            color: muted,
            fontFamily: `"${body}", sans-serif`,
            fontSize: '0.95rem',
          }}
        >
          No photos yet — be the first to share a moment!
        </p>
      )}
    </section>
  );
}
