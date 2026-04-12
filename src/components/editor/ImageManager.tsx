'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Camera, Upload, Loader2, LayoutGrid, Share2, ImageIcon } from 'lucide-react';
import { LoomThreadIcon, PearIcon } from '@/components/icons/PearloomIcons';
import { lbl } from './editor-utils';
import { PhotoReposition } from './PhotoReposition';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { GalleryPicker } from './GalleryPicker';
import { useEditor } from '@/lib/editor-state';
import type { ChapterImage, Chapter } from '@/types';

// ── Smart Photo Placement Suggestion ─────────────────────────
interface PlacementSuggestion {
  chapterTitle: string;
  chapterId: string;
  message: string;
}

function computePlacementSuggestion(
  currentChapterTitle: string | undefined,
  currentImages: ChapterImage[],
  allChapters: Chapter[],
): PlacementSuggestion | null {
  if (!allChapters || allChapters.length <= 1) return null;
  // If the current chapter had 0 photos before and another chapter shares a similar date,
  // suggest moving the photo there.
  if (currentImages.length === 1) {
    // Just added the first photo — check if another chapter with the same date range has photos
    const currentChapter = allChapters.find(c => c.title === currentChapterTitle);
    if (currentChapter) {
      const currentDate = currentChapter.date?.slice(0, 7); // YYYY-MM
      const sibling = allChapters.find(
        c => c.id !== currentChapter.id && c.date?.slice(0, 7) === currentDate && c.images && c.images.length > 0
      );
      if (sibling) {
        return {
          chapterTitle: sibling.title,
          chapterId: sibling.id,
          message: `This looks like it could fit in '${sibling.title}' — move it there?`,
        };
      }
    }
  }
  // If all chapters have photos, just confirm
  const allHavePhotos = allChapters.every(c => c.images && c.images.length > 0);
  if (allHavePhotos && currentChapterTitle) {
    return {
      chapterTitle: currentChapterTitle,
      chapterId: '',
      message: `Added to ${currentChapterTitle}`,
    };
  }
  return null;
}

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { pick: pickGooglePhotos, state: gpState, error: gpError } = useGooglePhotosPicker();

  // Smart placement suggestion state
  const [suggestion, setSuggestion] = useState<PlacementSuggestion | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevImageCount = useRef(images.length);
  const { manifest } = useEditor();

  const showSuggestion = useCallback((s: PlacementSuggestion) => {
    setSuggestion(s);
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    suggestionTimer.current = setTimeout(() => setSuggestion(null), 5000);
  }, []);

  // Detect when photos are added and compute a suggestion
  useEffect(() => {
    if (images.length > prevImageCount.current) {
      const s = computePlacementSuggestion(chapterTitle, images, manifest.chapters || []);
      if (s) showSuggestion(s);
    }
    prevImageCount.current = images.length;
  }, [images.length, chapterTitle, manifest.chapters, showSuggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (suggestionTimer.current) clearTimeout(suggestionTimer.current); };
  }, []);

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
                  background: viewMode === 'grid' ? 'rgba(24,24,27,0.08)' : 'transparent',
                  color: viewMode === 'grid' ? '#18181B' : '#3F3F46',
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
                  background: viewMode === 'constellation' ? 'rgba(24,24,27,0.08)' : 'transparent',
                  color: viewMode === 'constellation' ? '#18181B' : '#3F3F46',
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
              background: 'rgba(0,0,0,0.04)', color: '#3F3F46',
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
            onClick={() => setGalleryOpen(true)}
            title="Choose from Gallery"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '5px', border: '1px solid #E4E4E7',
              background: 'rgba(24,24,27,0.04)', color: '#18181B',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              minHeight: '32px', transition: 'all 0.15s',
            }}
          >
            <LayoutGrid size={10} />
            Gallery
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 12px', borderRadius: '5px', border: '1px solid #E4E4E7',
              background: 'rgba(24,24,27,0.08)', color: '#18181B',
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

      <GalleryPicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          const newImage: ChapterImage = {
            id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url,
            alt: 'Gallery photo',
            width: 0,
            height: 0,
          };
          onUpdate([...images, newImage]);
        }}
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
          border: isDragging ? '2px dashed #71717A' : '2px dashed transparent',
          background: isDragging ? 'rgba(24,24,27,0.04)' : 'transparent',
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
              border: '2px dashed #E4E4E7', borderRadius: '10px',
              background: 'transparent', cursor: 'pointer', color: '#71717A',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; (e.currentTarget as HTMLElement).style.color = '#18181B'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
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
                    transition: 'background 0.15s',
                    zIndex: 2,
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#71717A'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
                >
                  <X size={10} />
                </button>
                {/* Cover badge */}
                {i === 0 && (
                  <div style={{
                    position: 'absolute', bottom: '4px', left: '4px',
                    background: '#18181B', color: '#fff',
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
                border: '2px dashed #E4E4E7', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#71717A', transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; (e.currentTarget as HTMLElement).style.color = '#18181B'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
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
                        stroke="rgba(24,24,27,0.04)"
                        strokeWidth={4}
                      />
                      {/* Sharp line */}
                      <line
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="rgba(24,24,27,0.1)"
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
                        border: '2px solid #71717A',
                        boxShadow: '0 2px 12px #E4E4E7',
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
                        border: '1.5px solid #71717A',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        transition: 'background 0.15s',
                        zIndex: 2,
                        padding: 0,
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#71717A'; }}
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
                border: '2px dashed #E4E4E7', background: 'transparent',
                cursor: 'pointer', color: '#71717A', transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; (e.currentTarget as HTMLElement).style.color = '#18181B'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
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
              border: '1px solid #E4E4E7',
              background: generatingCaptions ? 'rgba(24,24,27,0.04)' : 'rgba(24,24,27,0.06)',
              color: generatingCaptions ? '#3F3F46' : '#18181B',
              fontSize: '0.82rem', fontWeight: 700, cursor: generatingCaptions ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
            onMouseOver={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'rgba(24,24,27,0.1)'; }}
            onMouseOut={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'rgba(24,24,27,0.06)'; }}
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

      {/* Smart Photo Placement Suggestion Toast */}
      {suggestion && (
        <div style={{
          marginTop: '0.6rem',
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(24,24,27,0.12)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          fontSize: '0.76rem', lineHeight: 1.4,
          color: 'var(--pl-ink-soft, #3D3530)',
          animation: 'fadeIn 0.2s ease-out',
        } as React.CSSProperties}>
          <span style={{ flex: 1 }}>{suggestion.message}</span>
          <button
            onClick={() => setSuggestion(null)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '18px', height: '18px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
              color: '#71717A', flexShrink: 0, padding: 0,
            }}
          >
            <X size={10} />
          </button>
          <PearIcon size={14} color="#18181B" style={{ flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}
