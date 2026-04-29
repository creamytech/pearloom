'use client';

// ─────────────────────────────────────────────────────────────
// GuestUploadClient — the actual upload UI. Mobile-first: one
// big peach button that opens the camera. After upload, switches
// to a "Thanks!" state with a "Add another" affordance.
//
// State machine:
//   idle    → name + photo capture
//   uploading → optimistic preview + spinner
//   sent    → confirmation + "Add another"
//   error   → red strip + retry
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';

interface Props {
  siteId: string; // subdomain — guest-photos API accepts this
  couple: string;
  /** Per-guest token from /upload?t=… When present, the upload
   *  is attributed to the guest's pearloom_guests row so it
   *  surfaces on /g/[token] as their contribution. */
  guestToken: string | null;
  /** Pre-fill the uploader name when we resolved the token to
   *  a guest record server-side. Form stays editable. */
  prefillName: string | null;
}

type Stage = 'idle' | 'uploading' | 'sent' | 'error';

export function GuestUploadClient({ siteId, couple, guestToken, prefillName }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [name, setName] = useState(prefillName ?? '');
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Persist the name across uploads in the same session — the
  // common case is "I take 8 photos in a row." sessionStorage
  // beats localStorage so closing the tab clears it.
  if (typeof window !== 'undefined' && !name) {
    const stored = sessionStorage.getItem('pl-upload-name');
    if (stored) setName(stored);
  }

  function pickFile() {
    if (!name.trim()) {
      setError('Add your name first — the couple wants to know who.');
      return;
    }
    setError(null);
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow same-file re-upload
    if (!file) return;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pl-upload-name', name.trim());
    }

    setPreviewUrl(URL.createObjectURL(file));
    setStage('uploading');
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('siteId', siteId);
      fd.append('uploaderName', name.trim());
      if (caption.trim()) fd.append('caption', caption.trim());
      if (guestToken) fd.append('guestToken', guestToken);
      const r = await fetch('/api/guest-photos', { method: 'POST', body: fd });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Upload failed (${r.status})`);
      }
      setStage('sent');
      setCount((c) => c + 1);
      setCaption('');
    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  function reset() {
    setStage('idle');
    setPreviewUrl(null);
    setError(null);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FBF7EE',
        color: '#0E0D0B',
        fontFamily: 'var(--font-ui), -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '32px 20px 64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#C6703D',
            marginBottom: 6,
          }}
        >
          Photo wall
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 36,
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}
        >
          {stage === 'sent' ? 'Got it. Thanks!' : `Add a photo for ${couple}.`}
        </h1>

        {stage !== 'sent' && (
          <p style={{ fontSize: 14, color: '#3A332C', lineHeight: 1.55, marginTop: 12 }}>
            One tap to open your camera. The photo lands on the live wall after
            the host gives it a quick check.
          </p>
        )}

        {stage === 'sent' && (
          <p style={{ fontSize: 14, color: '#3A332C', lineHeight: 1.55, marginTop: 12 }}>
            {count > 1 ? `${count} photos sent.` : 'Photo sent.'} The wall updates
            after the host approves it. Want to add another?
          </p>
        )}

        {/* Card */}
        <div
          style={{
            marginTop: 28,
            padding: 20,
            background: '#FFFFFF',
            borderRadius: 18,
            boxShadow: '0 20px 48px rgba(14,13,11,0.08)',
            border: '1px solid rgba(14,13,11,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {stage === 'idle' && (
            <>
              <Field label="Your name">
                <input
                  type="text"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Linda Chen"
                  style={inputStyle}
                />
              </Field>
              <Field label="Caption (optional)">
                <input
                  type="text"
                  value={caption}
                  onChange={(ev) => setCaption(ev.target.value)}
                  placeholder="Auntie Rosa lit the candles"
                  maxLength={140}
                  style={inputStyle}
                />
              </Field>
              <button
                type="button"
                onClick={pickFile}
                style={{
                  marginTop: 4,
                  padding: '14px 18px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #C6703D 0%, #E8A07A 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(198,112,61,0.35)',
                }}
              >
                ✦ Take a photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFile}
                style={{ display: 'none' }}
              />
            </>
          )}

          {stage === 'uploading' && previewUrl && (
            <>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: 12,
                  background: `#F5EFE2 center/cover no-repeat url(${previewUrl})`,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(14,13,11,0.4)',
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Threading…
                </div>
              </div>
            </>
          )}

          {stage === 'sent' && previewUrl && (
            <>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: 12,
                  background: `#F5EFE2 center/cover no-repeat url(${previewUrl})`,
                  border: '1.5px solid rgba(139,156,90,0.4)',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(109,125,63,0.94)',
                    color: '#FFFFFF',
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  ✓ Sent
                </span>
              </div>
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: '#0E0D0B',
                  color: '#FBF7EE',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✦ Add another
              </button>
            </>
          )}

          {stage === 'error' && (
            <>
              <div
                style={{
                  padding: 12,
                  background: 'rgba(122,45,45,0.08)',
                  border: '1px solid rgba(122,45,45,0.22)',
                  borderRadius: 10,
                  color: '#7A2D2D',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: '#C6703D',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </>
          )}

          {error && stage === 'idle' && (
            <div
              style={{
                padding: 10,
                background: 'rgba(122,45,45,0.08)',
                border: '1px solid rgba(122,45,45,0.22)',
                borderRadius: 8,
                color: '#7A2D2D',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#8a8671', marginTop: 24, lineHeight: 1.5 }}>
          Photos go to the host first. Anything you don&apos;t want shared, don&apos;t send.
          Pearloom · paper, never plastic.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1.5px solid rgba(14,13,11,0.14)',
  background: '#FBF7EE',
  fontSize: 'max(16px, 0.95rem)', // 16px+ prevents iOS zoom on focus
  color: '#0E0D0B',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, textAlign: 'left' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#6F6557', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
