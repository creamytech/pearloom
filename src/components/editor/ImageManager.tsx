'use client';

import React, { useState, useRef } from 'react';
import { Plus, X, Camera, Upload, Loader2 } from 'lucide-react';
import { LoomThreadIcon } from '@/components/icons/PearloomIcons';
import { lbl } from './editor-utils';
import { PhotoReposition } from './PhotoReposition';
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
        const formData = new FormData();
        formData.append('file', file);
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <label style={lbl}>Photos ({images.length})</label>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 12px', borderRadius: '5px', border: '1px solid rgba(163,177,138,0.4)',
            background: 'rgba(163,177,138,0.15)', color: 'var(--eg-accent, #A3B18A)',
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e.target.files)}
      />

      {/* Photo grid */}
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
          border: isDragging ? '2px dashed rgba(163,177,138,0.7)' : '2px dashed transparent',
          background: isDragging ? 'rgba(163,177,138,0.08)' : 'transparent',
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
            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
            background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--eg-accent, #A3B18A)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
        >
          <Camera size={20} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Add photos</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {images.map((img, i) => (
            <div key={img.id || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--eg-plum, #6D597A)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
              >
                <X size={10} />
              </button>
              {/* Cover badge */}
              {i === 0 && (
                <div style={{
                  position: 'absolute', bottom: '4px', left: '4px',
                  background: 'rgba(163,177,138,0.9)', color: '#fff',
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
              border: '2px dashed rgba(255,255,255,0.1)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)', transition: 'all 0.15s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--eg-accent, #A3B18A)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{
          marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px',
          background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)',
          color: '#fca5a5', fontSize: '0.78rem', lineHeight: 1.4,
        }}>
          Upload failed: {uploadError}
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
              border: '1px solid rgba(163,177,138,0.3)',
              background: generatingCaptions ? 'rgba(255,255,255,0.04)' : 'rgba(163,177,138,0.1)',
              color: generatingCaptions ? 'rgba(255,255,255,0.4)' : 'var(--eg-accent, #A3B18A)',
              fontSize: '0.82rem', fontWeight: 700, cursor: generatingCaptions ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
            onMouseOver={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)'; }}
            onMouseOut={e => { if (!generatingCaptions) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.1)'; }}
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
