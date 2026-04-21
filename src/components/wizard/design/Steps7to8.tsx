'use client';

// Steps 7-8: Photos drop zone, then per-photo Review (caption + place).
// Photos fuel Pass 2 (palette) and get clustered into chapters; captions
// become the voice anchors for Pass 1.

import { useCallback, useRef, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Leaf } from '../../marketing/design/DesignAtoms';
import { Scene, SceneDeco, StepHead, StepNav } from './WizardShell';
import type { PhotoEntry, StepProps } from './wizardAnswers';

// ── Step 7: PHOTOS drop zone ─────────────────────────────────
export function StepPhotos({ answers, set, next, back, skip, dark }: StepProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = answers.photos ?? [];

  const ingest = useCallback(
    (files: FileList | File[]) => {
      const incoming: PhotoEntry[] = [];
      Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, 40)
        .forEach((f) => {
          const id = `${f.name}-${f.size}-${f.lastModified}`;
          if (photos.some((p) => p.id === id)) return;
          const url = URL.createObjectURL(f);
          incoming.push({ id, url });
        });
      if (incoming.length) set({ photos: [...photos, ...incoming] });
    },
    [photos, set],
  );

  const remove = (id: string) => set({ photos: photos.filter((p) => p.id !== id) });

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
          if (e.dataTransfer?.files?.length) ingest(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
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
          cursor: 'pointer',
          transition: 'all 200ms',
          minHeight: photos.length ? 'auto' : 260,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.length) ingest(e.target.files);
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
              Drop photos here
            </div>
            <div
              style={{
                fontSize: 13,
                color: dark ? 'rgba(244,236,216,0.7)' : PD.inkSoft,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Or click. Up to 40. JPG, PNG, HEIC.
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
                <img
                  src={p.url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 14,
                    display: 'block',
                  }}
                />
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

      {photos.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 11.5,
            color: dark ? 'rgba(244,236,216,0.7)' : PD.inkSoft,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          <Leaf size={10} color={PD.olive} />
          {photos.length} photo{photos.length === 1 ? '' : 's'} added
        </div>
      )}

      <StepNav onBack={back} onNext={next} onSkip={skip} nextDisabled={photos.length === 0} />
    </Scene>
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
            <img
              src={active.url}
              alt=""
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
            <img
              src={p.url}
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
