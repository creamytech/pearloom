'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';

interface CommunityMemorySubmitProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
  onSubmitted?: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const MAX_CHARS = 400;
const MAX_PHOTO_MB = 5;

export default function CommunityMemorySubmit({
  siteId,
  coupleNames,
  vibeSkin,
  onSubmitted,
}: CommunityMemorySubmitProps) {
  const [guestName, setGuestName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [memoryText, setMemoryText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name1, name2] = coupleNames;
  const palette = vibeSkin.palette;
  const charsLeft = MAX_CHARS - memoryText.length;

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setErrorMsg(`Photo must be under ${MAX_PHOTO_MB}MB.`);
      return;
    }

    setErrorMsg('');
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetForm() {
    setGuestName('');
    setRelationship('');
    setMemoryText('');
    setPhoto(null);
    setPhotoPreview(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validation
    if (!guestName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (memoryText.trim().length < 20) {
      setErrorMsg('Your memory must be at least 20 characters.');
      return;
    }

    setSubmitState('submitting');

    const fd = new FormData();
    fd.append('siteId', siteId);
    fd.append('guestName', guestName.trim());
    fd.append('relationship', relationship.trim());
    fd.append('memoryText', memoryText.trim());
    if (photo) fd.append('photo', photo);

    try {
      const res = await fetch('/api/community-memory', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok || json.error) {
        setErrorMsg(json.error || 'Something went wrong. Please try again.');
        setSubmitState('error');
        return;
      }

      setSubmitState('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setSubmitState('error');
    }
  }

  function handleShareAnother() {
    resetForm();
    setSubmitState('idle');
  }

  // ── Success State ─────────────────────────────────────────
  if (submitState === 'success') {
    return (
      <div
        style={{
          background: 'var(--pl-cream, #F5F1E8)',
          borderRadius: 'var(--pl-radius-2xl)',
          padding: '48px 40px',
          textAlign: 'center',
          maxWidth: 560,
          margin: '0 auto',
          border: `1px solid ${palette.accent2}55`,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>💕</div>
        <h3
          style={{
            fontFamily: vibeSkin.fonts.heading,
            fontSize: 26,
            color: palette.ink,
            fontWeight: 700,
            marginBottom: 12,
            fontStyle: vibeSkin.headingStyle === 'italic-serif' ? 'italic' : 'normal',
          }}
        >
          Thank you! Your memory has been shared 💕
        </h3>
        <p
          style={{
            fontFamily: vibeSkin.fonts.body,
            fontSize: 15,
            color: palette.muted,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          The couple will review it before it appears on their site.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleShareAnother}
            style={{
              background: palette.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--pl-radius-lg)',
              padding: '12px 28px',
              fontFamily: vibeSkin.fonts.body,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Share another memory
          </button>
          {onSubmitted && (
            <button
              onClick={onSubmitted}
              style={{
                background: 'transparent',
                color: palette.muted,
                border: `1.5px solid ${palette.accent2}`,
                borderRadius: 'var(--pl-radius-lg)',
                padding: '12px 28px',
                fontFamily: vibeSkin.fonts.body,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div
      style={{
        background: '#F5F1E8',
        borderRadius: 'var(--pl-radius-2xl)',
        padding: '40px 40px 44px',
        maxWidth: 600,
        margin: '0 auto',
        border: `1px solid ${palette.accent2}44`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
      }}
    >
      <h3
        style={{
          fontFamily: vibeSkin.fonts.heading,
          fontSize: 24,
          color: palette.ink,
          fontWeight: 700,
          marginBottom: 6,
          fontStyle: vibeSkin.headingStyle === 'italic-serif' ? 'italic' : 'normal',
        }}
      >
        Share Your Memory with {name1} &amp; {name2}
      </h3>
      <p
        style={{
          fontFamily: vibeSkin.fonts.body,
          fontSize: 14,
          color: palette.muted,
          marginBottom: 28,
          lineHeight: 1.5,
        }}
      >
        Your memory will appear on their site after review.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Your Name */}
        <div>
          <label style={labelStyle(vibeSkin)}>Your Name</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Sarah Miller"
            required
            maxLength={100}
            style={inputStyle(palette)}
          />
        </div>

        {/* How do you know them */}
        <div>
          <label style={labelStyle(vibeSkin)}>How do you know them?</label>
          <input
            type="text"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder='e.g. "College roommate", "Her sister"'
            maxLength={80}
            style={inputStyle(palette)}
          />
        </div>

        {/* Memory textarea */}
        <div>
          <label style={labelStyle(vibeSkin)}>Your memory</label>
          <textarea
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Tell us about a moment you shared…"
            rows={5}
            required
            style={{
              ...inputStyle(palette),
              resize: 'vertical',
              minHeight: 120,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.65,
              background: 'color-mix(in oklab, var(--pl-cream, #FBF8F2) 70%, var(--pl-cream-card, #ffffff) 30%)', // parchment feel
            }}
          />
          <div
            style={{
              textAlign: 'right',
              fontFamily: vibeSkin.fonts.body,
              fontSize: 12,
              color: charsLeft < 50 ? palette.highlight : palette.muted,
              marginTop: 4,
            }}
          >
            {memoryText.length}/{MAX_CHARS}
          </div>
        </div>

        {/* Photo upload */}
        <div>
          <label style={labelStyle(vibeSkin)}>Add a photo (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'transparent',
                border: `1.5px dashed ${palette.accent2}`,
                borderRadius: 'var(--pl-radius-lg)',
                padding: '10px 20px',
                fontFamily: vibeSkin.fonts.body,
                fontSize: 14,
                color: palette.accent,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>📷</span> Choose photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-label="Upload photo"
            />
            {photoPreview && (
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 'var(--pl-radius-md)',
                    border: `2px solid ${palette.accent2}`,
                  }}
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: palette.highlight,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <p
            style={{
              fontFamily: vibeSkin.fonts.body,
              fontSize: 12,
              color: palette.muted,
              marginTop: 6,
            }}
          >
            Max 5MB — JPG, PNG, or WEBP
          </p>
        </div>

        {/* Error message */}
        {(submitState === 'error' || errorMsg) && (
          <div
            style={{
              background: 'color-mix(in oklab, #EF4444 12%, var(--pl-cream-card, #fff))',
              border: '1px solid color-mix(in oklab, #EF4444 40%, transparent)',
              borderRadius: 'var(--pl-radius-md)',
              padding: '10px 14px',
              fontFamily: vibeSkin.fonts.body,
              fontSize: 14,
              color: 'color-mix(in oklab, #EF4444 85%, var(--pl-ink))',
            }}
          >
            {errorMsg || 'Something went wrong. Please try again.'}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitState === 'submitting'}
          style={{
            background: submitState === 'submitting' ? palette.muted : palette.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--pl-radius-lg)',
            padding: '15px 32px',
            fontFamily: vibeSkin.fonts.body,
            fontSize: 15,
            fontWeight: 700,
            cursor: submitState === 'submitting' ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            marginTop: 4,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {submitState === 'submitting' ? 'Sharing…' : '✨ Share Your Memory'}
        </button>
      </form>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────

function labelStyle(vibeSkin: VibeSkin): React.CSSProperties {
  return {
    display: 'block',
    fontFamily: vibeSkin.fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: vibeSkin.palette.foreground,
    marginBottom: 6,
    letterSpacing: '0.03em',
  };
}

function inputStyle(palette: VibeSkin['palette']): React.CSSProperties {
  return {
    width: '100%',
    background: palette.card,
    border: `1.5px solid ${palette.accent2}66`,
    borderRadius: 'var(--pl-radius-lg)',
    padding: '11px 14px',
    fontFamily: 'inherit',
    fontSize: 15,
    color: palette.foreground,
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.5,
    transition: 'border-color var(--pl-dur-instant)',
  };
}
