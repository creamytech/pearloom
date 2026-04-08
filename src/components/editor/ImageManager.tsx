'use client';

import React, { useState, useRef } from 'react';
import { Plus, X, Camera, Upload, Loader2, LayoutGrid, Share2, ImageIcon } from 'lucide-react';
import { LoomThreadIcon } from '@/components/icons/PearloomIcons';
import { lbl } from './editor-utils';
import { PhotoReposition } from './PhotoReposition';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import type { ChapterImage } from '@/types';

export function ImageManager({
  images, onUpdate, imagePosition, onPositionChange,
  chapterTitle, chapterMood, chapterDescription, vibeString,
}: {
  images: ChapterImage[];
  onUpdate: (imgs: ChapterImage[]) => void;
  imagePosition?: { x: number; y: number };
  onPositionChange?: (x: number, y: number) => void;
  chapterTitle?: string;
  chapterMood?: string;
  chapterDescription?: string;
  vibeString?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captionSuccess, setCaptionSuccess] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'constellation'>('grid');
  const { pick: pickGooglePhotos, state: gpState, error: gpError } = useGooglePhotosPicker();

  const handleGooglePhotosPicked = async (photos: PickedPhoto[]) => {
    const newImages: ChapterImage[] = photos
      .filter(p => p.baseUrl)
      .map(p => ({
        id: p.id,
        url: `/api/photos/proxy?url=${encodeURIComponent(p.baseUrl)}&w=1200&h=900`,
        alt: p.filename.replace(/\.\w+$/, '') || 'Photo',
        width: p.width,
        height: p.height,
      }));
    if (newImages.length === 0) return;
    // Add images immediately with proxy URLs (fast preview)
    onUpdate([...images, ...newImages]);
    // Mirror to permanent storage in background so they survive past Google's ~1h expiry
    for (const [i, photo] of photos.entries()) {
      if (!photo.baseUrl?.includes('googleusercontent.com')) continue;
      try {
        const res = await fetch('/api/photos/mirror', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: photo.baseUrl, subdomain: 'draft', key: `img-${Date.now()}-${i}` }),
        });
        const data = await res.json();
        if (data.permanentUrl && data.permanentUrl !== photo.baseUrl) {
          // Update the image URL in place once mirrored
          const updated = [...images, ...newImages];
          const idx = updated.findIndex(img => img.id === photo.id);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], url: data.permanentUrl };
            onUpdate(updated);
          }
        }
      } catch { /* non-fatal — proxy URL still works for now */ }
    }
  };

  const removeImage = (idx: number) => {
    onUpdate(images.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX_MB = 20;
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_MB * 1024 * 1024) {
        alert(`"${f.name}" is too large (max ${MAX_MB}MB). Please compress and try again.`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const results: ChapterImage[] = [];
    for (const file of validFiles) {
      try {
        // Sanitize filename for iOS Safari — special chars cause "string did not match expected pattern"
        const safeName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const safeFile = new File([file], safeName, { type: file.type || 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', safeFile);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.publicUrl) {
          results.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: data.publicUrl,
            alt: file.name.replace(/\.\w+$/, ''),
            width: 0, height: 0,
          });
        } else {
          const msg = data.error || `Upload failed (${res.status})`;
          console.error('[ImageManager] Upload failed:', msg);
          setUploadError(msg);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed — check your connection';
        console.error('[ImageManager] Upload error:', err);
        setUploadError(msg);
      }
    }
    if (results.length > 0) onUpdate([...images, ...results]);
    setUploading(false);
  };

  const handleGenerateCaptions = async () => {
    if (!images.length) return;
    setGeneratingCaptions(true);
    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrls: images.map(img => img.url),
          chapterTitle: chapterTitle || '',
          chapterMood: chapterMood || '',
          chapterDescription: chapterDescription || '',
          vibeString: vibeString || '',
        }),
      });
      const data = await res.json();
      if (data.captions && Array.isArray(data.captions)) {
        const updated = images.map((img, i) => ({ ...img, caption: data.captions[i] || img.caption }));
        onUpdate(updated);
        setCaptionSuccess(true);
        setTimeout(() => setCaptionSuccess(false), 3000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Caption generation failed';
      setCaptionError(msg);
      setTimeout(() => setCaptionError(null), 5000);
    } finally {
      setGeneratingCaptions(false);
    }
  };

  // Compute deterministic constellation positions for each image
  const getConstellationPos = (i: number) => {
    const x = (((i * 137) % 100) * 0.75 + 12.5);
    const y = (((i * 97 + 41) % 100) * 0.75 + 12.5);
    return { x, y };
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <label style={lbl}>Photos ({images.length})</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* View toggle buttons — only shown when there are images */}
          {images.length > 0 && (
            <>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '5px', border: 'none',
                  background: viewMode === 'grid' ? 'var(--pl-olive-15)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-ink-soft)',
                  cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                }}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('constellation')}
                title="Constellation view"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '5px', border: 'none',
                  background: viewMode === 'constellation' ? 'var(--pl-olive-15)' : 'transparent',
                  color: viewMode === 'constellation' ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-ink-soft)',
                  cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Share2 size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => pickGooglePhotos(handleGooglePhotosPicked)}
            disabled={gpState !== 'idle' && gpState !== 'done' && gpState !== 'error'}
            title="Pick from Google Photos"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '5px', border: '1px solid rgba(0,0,0,0.07)',
              background: 'rgba(0,0,0,0.04)', color: 'var(--pl-ink-soft)',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              minHeight: '32px', transition: 'all 0.15s',
            }}
          >
            {gpState === 'waiting' || gpState === 'fetching' || gpState === 'creating'
              ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              : <ImageIcon size={10} />}
            {gpState === 'waiting' ? 'Picking…' : gpState === 'fetching' ? 'Loading…' : 'Google'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 12px', borderRadius: '5px', border: '1px solid var(--pl-olive-40)',
              background: 'var(--pl-olive-15)', color: 'var(--pl-olive, #A3B18A)',
              fontSize: '0.82rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1, minHeight: '32px',
            }}
          >
            {uploading
              ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              : <Upload size={10} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e.target.files)}
      />

      {/* Photo grid / constellation */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = e.dataTransfer.files;
          if (files.length > 0) handleFileUpload(files);
        }}
        style={{
          borderRadius: '10px',
          border: isDragging ? '2px dashed var(--pl-olive)' : '2px dashed transparent',
          background: isDragging ? 'var(--pl-olive-8)' : 'transparent',
          transition: 'border-color 0.2s, background 0.2s',
          padding: isDragging ? '4px' : '0',
        }}
      >
        {images.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '8px', width: '100%', padding: '1.5rem',
              border: '2px dashed rgba(0,0,0,0.06)', borderRadius: '10px',
              background: 'transparent', cursor: 'pointer', color: 'var(--pl-muted)',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-olive-40)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive, #A3B18A)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
          >
            <Camera size={20} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Add photos</span>
          </button>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {images.map((img, i) => (
              <div key={img.id || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                {/* Cover image uses PhotoReposition */}
                {i === 0 && onPositionChange ? (
                  <PhotoReposition
                    src={img.url}
                    alt={img.alt}
                    onPositionChange={onPositionChange}
                    initialX={imagePosition?.x ?? 50}
                    initialY={imagePosition?.y ?? 50}
                    width="100%"
                    height="100%"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
                {/* Remove button */}
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', backdropFilter: 'blur(4px)',
                    transition: 'background 0.15s',
                    zIndex: 2,
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--pl-plum, #6D597A)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
                >
                  <X size={10} />
                </button>
                {/* Cover badge */}
                {i === 0 && (
                  <div style={{
                    position: 'absolute', bottom: '4px', left: '4px',
                    background: 'var(--pl-olive)', color: '#fff',
                    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '2px 5px', borderRadius: '3px',
                    zIndex: 2,
                  }}>Cover</div>
                )}
              </div>
            ))}
            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                aspectRatio: '1', borderRadius: '8px',
                border: '2px dashed rgba(0,0,0,0.06)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--pl-muted)', transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-olive-40)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive, #A3B18A)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          /* Constellation view */
          <div>
            <div
              style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                minHeight: '360px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* SVG connection lines */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {images.map((_, i) => {
                  if (i >= images.length - 1) return null;
                  const { x: x1, y: y1 } = getConstellationPos(i);
                  const { x: x2, y: y2 } = getConstellationPos(i + 1);
                  return (
                    <g key={i}>
                      {/* Soft glow version */}
                      <line
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="var(--pl-olive-8)"
                        strokeWidth={4}
                      />
                      {/* Sharp line */}
                      <line
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="var(--pl-olive-20)"
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Photo nodes */}
              {images.map((img, i) => {
                const { x, y } = getConstellationPos(i);
                return (
                  <div
                    key={img.id || i}
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt}
                      title={img.alt}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--pl-olive)',
                        boxShadow: '0 2px 12px var(--pl-olive-30)',
                        cursor: 'pointer',
                        display: 'block',
                      }}
                    />
                    {/* Remove button */}
                    <button
                      onClick={() => removeImage(i)}
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.75)',
                        border: '1.5px solid var(--pl-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        backdropFilter: 'blur(4px)',
                        transition: 'background 0.15s',
                        zIndex: 2,
                        padding: 0,
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--pl-plum, #6D597A)'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.75)'; }}
                    >
                      <X size={9} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add more button below constellation */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                width: '100%', marginTop: '8px', padding: '7px 12px', borderRadius: '8px',
                border: '2px dashed rgba(0,0,0,0.06)', background: 'transparent',
                cursor: 'pointer', color: 'var(--pl-muted)', transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-olive-40)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive, #A3B18A)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
            >
              <Plus size={14} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Add more photos</span>
            </button>
          </div>
        )}
      </div>

      {/* Upload error */}
      {(uploadError || gpError) && (
        <div style={{
          marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
          background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)',
          color: '#fca5a5', fontSize: '0.78rem', lineHeight: 1.4,
        }}>
          {uploadError ? `Upload failed: ${uploadError}` : gpError}
        </div>
      )}

      {/* Generate Captions button */}
      {images.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={handleGenerateCaptions}
            disabled={generatingCaptions}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '7px 12px', borderRadius: '6px',
              border: '1px solid var(--pl-olive-30)',
              background: generatingCaptions ? 'var(--pl-olive-5)' : 'var(--pl-olive-10)',
              color: generatingCaptions ? 'var(--pl-ink-soft)' : 'var(--pl-olive, #A3B18A)',
              fontSize: '0.82rem', fontWeight: 700, cursor: generatingCaptions ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
            onMouseOver={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'var(--pl-olive-20)'; }}
            onMouseOut={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'var(--pl-olive-10)'; }}
          >
            {generatingCaptions
              ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Generating captions…</>
              : captionSuccess
                ? <><LoomThreadIcon size={10} /> Captions added!</>
                : <><LoomThreadIcon size={10} /> Generate Captions</>}
          </button>
          {captionError && (
            <div style={{
              marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
              background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)',
              color: '#fca5a5', fontSize: '0.78rem', lineHeight: 1.4,
            }}>
              {captionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
