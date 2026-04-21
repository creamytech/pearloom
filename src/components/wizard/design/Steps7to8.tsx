'use client';

// Steps 7-8: Photos (upload + Google picker) and per-photo Review.
// Files selected locally go through /api/photos/upload which writes
// them to R2 and returns GooglePhotoMetadata-shaped records. The
// Google Photos picker uses the existing useGooglePhotosPicker
// hook. Both sources end up in the same `answers.photos` array
// with the same shape.

import { useCallback, useRef, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Leaf } from '../../marketing/design/DesignAtoms';
import { Scene, SceneDeco, StepHead, StepNav } from './WizardShell';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import type { PhotoEntry, StepProps } from './wizardAnswers';

interface UploadedPhotoMeta {
  id: string;
  filename: string;
  mimeType: string;
  creationTime: string;
  width: number;
  height: number;
  baseUrl: string;
  description?: string;
}

const MAX_PHOTOS = 40;
const MAX_BYTES_PER_PHOTO = 12 * 1024 * 1024; // matches /api/photos/upload

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error('FileReader error'));
    r.readAsDataURL(file);
  });
}

function imageDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width || 1200, height: img.height || 1200 });
    img.onerror = () => resolve({ width: 1200, height: 1200 });
    img.src = dataUrl;
  });
}

// ── Step 7: PHOTOS ────────────────────────────────────────────
export function StepPhotos({ answers, set, next, back, skip, dark }: StepProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = answers.photos ?? [];
  const picker = useGooglePhotosPicker();

  const addPhotos = useCallback(
    (incoming: PhotoEntry[]) => {
      if (incoming.length === 0) return;
      const existing = new Set(photos.map((p) => p.id));
      const deduped = incoming.filter((p) => !existing.has(p.id));
      if (deduped.length === 0) return;
      set({ photos: [...photos, ...deduped] });
    },
    [photos, set],
  );

  const uploadLocal = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) return;

      const oversized = images.find((f) => f.size > MAX_BYTES_PER_PHOTO);
      if (oversized) {
        setError(`${oversized.name} is too large (max 12MB)`);
        return;
      }
      const slotsLeft = MAX_PHOTOS - photos.length;
      const batch = images.slice(0, slotsLeft);
      if (images.length > slotsLeft) {
        setError(`Only ${slotsLeft} more can be added (cap is ${MAX_PHOTOS})`);
      } else {
        setError(null);
      }

      setUploading(true);
      try {
        const payload = await Promise.all(
          batch.map(async (file) => {
            const [base64, dims] = await Promise.all([
              readAsDataUrl(file),
              readAsDataUrl(file).then(imageDims),
            ]);
            return {
              id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              filename: file.name,
              mimeType: file.type || 'image/jpeg',
              base64,
              capturedAt: file.lastModified
                ? new Date(file.lastModified).toISOString()
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
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed (${res.status})`);
        }
        const data = (await res.json()) as {
          photos: UploadedPhotoMeta[];
          failures?: Array<{ index: number; error: string }>;
        };
        if (data.failures?.length) {
          setError(`${data.failures.length} photo${data.failures.length === 1 ? '' : 's'} didn’t upload`);
        }
        addPhotos(
          data.photos.map((p) => ({
            id: p.id,
            baseUrl: p.baseUrl,
            filename: p.filename,
            mimeType: p.mimeType,
            creationTime: p.creationTime,
            width: p.width,
            height: p.height,
            description: p.description,
            source: 'upload' as const,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [photos.length, addPhotos],
  );

  const importGoogle = useCallback(() => {
    picker.pick((picked: PickedPhoto[]) => {
      addPhotos(
        picked.map((p) => ({
          id: p.id,
          baseUrl: p.baseUrl,
          filename: p.filename,
          mimeType: p.mimeType,
          creationTime: new Date().toISOString(),
          width: p.width || 1200,
          height: p.height || 1200,
          source: 'google' as const,
        })),
      );
    });
  }, [picker, addPhotos]);

  const remove = (id: string) => set({ photos: photos.filter((p) => p.id !== id) });

  const pickerBusy =
    picker.state === 'creating' ||
    picker.state === 'waiting' ||
    picker.state === 'fetching';

  return (
    <Scene deco={<SceneDeco variant="rose-br" />} dark={dark}>
      <StepHead stepKey="photos" dark={dark} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer?.files?.length) {
            uploadLocal(Array.from(e.dataTransfer.files));
          }
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        style={{
          border: `2px dashed ${dragging ? PD.olive : 'rgba(31,36,24,0.22)'}`,
          background: dragging
            ? dark
              ? 'rgba(107,122,58,0.18)'
              : 'rgba(107,122,58,0.08)'
            : dark
            ? 'rgba(244,236,216,0.05)'
            : PD.paperCard,
          borderRadius: 24,
          padding: photos.length ? '24px' : '64px 32px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 200ms',
          minHeight: photos.length ? 'auto' : 260,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.length) uploadLocal(Array.from(e.target.files));
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
        {photos.length === 0 ? (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${PD.gold}, ${PD.oliveDeep})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: PD.paper,
                fontSize: 24,
                marginBottom: 8,
              }}
              aria-hidden
            >
              ↑
            </div>
            <div style={{ ...DISPLAY_STYLE, fontSize: 24, color: dark ? PD.paper : PD.ink }}>
              {uploading ? 'Reading the photos…' : 'Drop photos here'}
            </div>
            <div
              style={{
                fontSize: 13,
                color: dark ? 'rgba(244,236,216,0.7)' : PD.inkSoft,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Or click. Up to {MAX_PHOTOS}. JPG, PNG, HEIC.
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
              width: '100%',
            }}
          >
            {photos.map((p) => (
              <div
                key={p.id}
                style={{ position: 'relative', aspectRatio: '1 / 1' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.baseUrl}
                  alt={p.filename || ''}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 14,
                    display: 'block',
                  }}
                />
                {p.source === 'google' && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 6,
                      top: 6,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(31,36,24,0.72)',
                      color: PD.paper,
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--pl-font-mono)',
                    }}
                  >
                    Google
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p.id);
                  }}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: 'rgba(31,36,24,0.82)',
                    color: PD.paper,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 14,
                border: '2px dashed rgba(31,36,24,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: dark ? 'rgba(244,236,216,0.55)' : PD.inkSoft,
              }}
            >
              +
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={importGoogle}
          disabled={pickerBusy || uploading || photos.length >= MAX_PHOTOS}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            color: dark ? PD.paper : PD.ink,
            border: '1px solid rgba(31,36,24,0.22)',
            borderRadius: 999,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: pickerBusy || uploading ? 'wait' : 'pointer',
            opacity: pickerBusy || uploading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          <GoogleGlyph />
          {picker.state === 'waiting' || picker.state === 'creating'
            ? 'Opening Google Photos…'
            : picker.state === 'fetching'
            ? 'Fetching picks…'
            : 'Pick from Google Photos'}
        </button>
        {photos.length > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11.5,
              color: dark ? 'rgba(244,236,216,0.7)' : PD.inkSoft,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            <Leaf size={10} color={PD.olive} />
            {photos.length} photo{photos.length === 1 ? '' : 's'} added
          </span>
        )}
      </div>

      {(error || picker.error) && (
        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 12.5,
            color: PD.terra,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {error || picker.error}
        </div>
      )}

      {/* Photos are required — the pipeline can't generate without at
          least one, so no skip here. */}
      <StepNav onBack={back} onNext={next} nextDisabled={photos.length === 0} />
    </Scene>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ── Step 8: PHOTO REVIEW — caption + place ───────────────────
export function StepPhotoReview({ answers, set, next, back, skip, dark }: StepProps) {
  const photos = answers.photos ?? [];
  const [idx, setIdx] = useState(0);
  const active = photos[idx];

  const update = (patch: Partial<PhotoEntry>) => {
    if (!active) return;
    const updated = photos.map((p) => (p.id === active.id ? { ...p, ...patch } : p));
    set({ photos: updated });
  };

  if (photos.length === 0) {
    return (
      <Scene deco={<SceneDeco variant="rose-br" />} dark={dark}>
        <StepHead stepKey="photoreview" dark={dark} />
        <div
          style={{
            maxWidth: 560,
            textAlign: 'center',
            margin: '20px auto',
            fontFamily: '"Fraunces", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 18,
            color: dark ? 'rgba(244,236,216,0.7)' : PD.inkSoft,
          }}
        >
          No photos yet. Skip ahead — the rest of the site still holds without them.
        </div>
        <StepNav onBack={back} onNext={next} onSkip={skip} />
      </Scene>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1.5px solid rgba(31,36,24,0.2)',
    outline: 'none',
    padding: '8px 2px',
    fontFamily: '"Fraunces", Georgia, serif',
    fontStyle: 'italic',
    fontSize: 18,
    color: dark ? PD.paper : PD.ink,
  };

  return (
    <Scene deco={<SceneDeco variant="rose-br" />} dark={dark}>
      <StepHead stepKey="photoreview" dark={dark} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 28, alignItems: 'start' }}>
        {/* Photo stack */}
        <div
          style={{
            background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
            border: '1px solid rgba(31,36,24,0.1)',
            borderRadius: 22,
            padding: 16,
          }}
        >
          {active && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.baseUrl}
              alt={active.filename || ''}
              style={{
                width: '100%',
                aspectRatio: '4 / 5',
                objectFit: 'cover',
                borderRadius: 14,
                display: 'block',
              }}
            />
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}
          >
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              style={{
                background: 'transparent',
                border: '1px solid rgba(31,36,24,0.15)',
                borderRadius: 999,
                padding: '7px 12px',
                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                opacity: idx === 0 ? 0.35 : 1,
                fontFamily: 'inherit',
                color: dark ? PD.paper : PD.ink,
                fontSize: 12,
              }}
            >
              ← prev
            </button>
            <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
              {idx + 1} / {photos.length}
            </div>
            <button
              onClick={() => setIdx((i) => Math.min(photos.length - 1, i + 1))}
              disabled={idx >= photos.length - 1}
              style={{
                background: 'transparent',
                border: '1px solid rgba(31,36,24,0.15)',
                borderRadius: 999,
                padding: '7px 12px',
                cursor: idx >= photos.length - 1 ? 'not-allowed' : 'pointer',
                opacity: idx >= photos.length - 1 ? 0.35 : 1,
                fontFamily: 'inherit',
                color: dark ? PD.paper : PD.ink,
                fontSize: 12,
              }}
            >
              next →
            </button>
          </div>
        </div>

        {/* Caption + place */}
        <div
          style={{
            background: dark ? 'rgba(244,236,216,0.05)' : PD.paperCard,
            border: '1px solid rgba(31,36,24,0.1)',
            borderRadius: 22,
            padding: '26px 28px',
            display: 'grid',
            gap: 20,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>A LINE IF YOU HAVE ONE</span>
            <input
              value={active?.note ?? ''}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="The morning he asked…"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>WHERE</span>
            <input
              value={active?.location ?? ''}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="Big Sur"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>WHEN (OPTIONAL)</span>
            <input
              value={active?.date ?? ''}
              onChange={(e) => update({ date: e.target.value })}
              placeholder="Summer 2022"
              style={inputStyle}
            />
          </label>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              opacity: 0.6,
              fontFamily: 'var(--pl-font-body)',
              color: dark ? PD.paper : PD.ink,
            }}
          >
            A line for the ones that matter. Skip the rest.
          </div>
        </div>
      </div>

      {/* Quick ribbon */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 24,
          overflowX: 'auto',
          paddingBottom: 6,
        }}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIdx(i)}
            style={{
              width: 60,
              height: 60,
              borderRadius: 10,
              border: `2px solid ${i === idx ? PD.olive : 'transparent'}`,
              padding: 0,
              flexShrink: 0,
              cursor: 'pointer',
              background: 'transparent',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.baseUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>

      <StepNav onBack={back} onNext={next} onSkip={skip} />
    </Scene>
  );
}
