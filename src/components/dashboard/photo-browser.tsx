'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/photo-browser.tsx
// Google Photos Picker API Flow + Device Upload fallback
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ImageOff, RefreshCw, AlertCircle, ExternalLink, Clock, Upload, X } from 'lucide-react';
import type { GooglePhotoMetadata } from '@/types';
import { colors as C, text, card } from '@/lib/design-tokens';
import { Button } from '@/components/ui';

interface PhotoBrowserProps {
  onSelectionChange: (photos: GooglePhotoMetadata[]) => void;
  maxSelection?: number;
}

const cardStyle: React.CSSProperties = {
  padding: '2.5rem 2rem',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '20px',
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: 'blur(20px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 24px rgba(43,30,20,0.06), inset 0 1px 0 rgba(255,255,255,0.4)',
} as React.CSSProperties;


type BrowserState = 'idle' | 'creating-session' | 'waiting-for-picker' | 'fetching' | 'done' | 'error' | 'session-expired' | 'device-selecting' | 'device-uploading';

// How long after the popup closes we keep polling (user may have picked without closing cleanly)
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes — photo libraries are large, give plenty of time

// Hard cap: stop polling after this long regardless (Google session expires ~1h)
const MAX_POLL_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function PhotoBrowser({ onSelectionChange, maxSelection = 30 }: PhotoBrowserProps) {
  const { data: session } = useSession();
  const isGoogleUser = session?.provider === 'google' || !!session?.accessToken;
  const [photos, setPhotos] = useState<GooglePhotoMetadata[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<BrowserState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pickerUri, setPickerUri] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // Tick counter so user can see how long they've been waiting
  useEffect(() => {
    if (state === 'waiting-for-picker') {
      setWaitSeconds(0);
      tickRef.current = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    } else {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const doFetch = useCallback(async (sid: string) => {
    setState('fetching');
    const fetchRes = await fetch(`/api/photos?action=fetch&sessionId=${sid}&limit=200`);
    if (!fetchRes.ok) {
      const fetchErr = await fetchRes.json();
      throw new Error(fetchErr.error || 'Failed to fetch picked photos');
    }
    const fetchData = await fetchRes.json();
    const fetchedPhotos: GooglePhotoMetadata[] = (fetchData.photos ?? []).filter(
      (p: GooglePhotoMetadata) => p && p.id && p.creationTime
    );
    setPhotos(fetchedPhotos);
    setState('done');

    if (fetchedPhotos.length <= maxSelection) {
      const allIds = new Set<string>(fetchedPhotos.map((p: GooglePhotoMetadata) => p.id).filter(Boolean));
      setSelected(allIds);
      onSelectionChange(fetchedPhotos);
    }
  }, [maxSelection, onSelectionChange]);

  // ── Launch the Picker flow ──
  const startPickerFlow = useCallback(async () => {
    stopPolling();
    setState('creating-session');
    setError(null);
    setPhotos([]);
    setSelected(new Set());
    setWaitSeconds(0);

    try {
      const res = await fetch('/api/photos?action=create-session');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create picker session');
      }
      const session = await res.json();
      const uri = session.pickerUri + '/autoclose';
      setPickerUri(uri);
      setSessionId(session.id);

      // Open the Google Photos picker popup
      const popup = window.open(uri, 'google-photos-picker', 'width=900,height=700');
      setState('waiting-for-picker');
      pollStartRef.current = Date.now();

      let popupClosedAt: number | null = null;

      pollRef.current = setInterval(async () => {
        // Hard timeout — Google sessions expire around 1 hour
        if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
          stopPolling();
          setState('session-expired');
          return;
        }

        try {
          const pollRes = await fetch(`/api/photos?action=poll&sessionId=${session.id}`);
          if (!pollRes.ok) return; // silently retry on network hiccup

          const pollData = await pollRes.json();

          if (pollData.mediaItemsSet) {
            stopPolling();
            await doFetch(session.id);
            return;
          }

          // Track popup close time — but keep polling for GRACE_PERIOD_MS
          if (popup && popup.closed && !popupClosedAt) {
            popupClosedAt = Date.now();
          }

          // Only give up if popup has been closed long enough WITH no selection
          if (popupClosedAt && (Date.now() - popupClosedAt > GRACE_PERIOD_MS)) {
            stopPolling();
            setState('idle'); // user closed without picking
          }
        } catch (pollErr) {
          console.warn('Polling error (will retry):', pollErr);
        }
      }, 2500);

    } catch (err) {
      stopPolling();
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to start Google Photos picker');
    }
  }, [stopPolling, doFetch]);

  // ── Manual "I'm done picking" trigger ──
  const handleDonePicking = useCallback(async () => {
    if (!sessionId) return;
    stopPolling();
    try {
      await doFetch(sessionId);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    }
  }, [sessionId, stopPolling, doFetch]);

  const togglePhoto = (photo: GooglePhotoMetadata) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else if (next.size < maxSelection) {
        next.add(photo.id);
      }
      const selectedPhotos = photos.filter((p) => next.has(p.id));
      onSelectionChange(selectedPhotos);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(photos.slice(0, maxSelection).map((p) => p.id));
    setSelected(all);
    onSelectionChange(photos.slice(0, maxSelection));
  };

  const clearSelection = () => {
    setSelected(new Set());
    onSelectionChange([]);
  };

  const formatWaitTime = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  // ── Device upload state ──
  const [deviceFiles, setDeviceFiles] = useState<File[]>([]);
  const [devicePreviews, setDevicePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const deviceInputRef = useRef<HTMLInputElement>(null);

  const handleDeviceFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      // iOS reports HEIC files with type='' — accept those too rather than silently dropping
      const typeOk = f.type.startsWith('image/') || f.type === '' || f.type === 'image/heic' || f.type === 'image/heif';
      return typeOk && f.size < 50 * 1024 * 1024; // 50 MB cap
    });
    const capped = valid.slice(0, maxSelection);
    setDeviceFiles(capped);
    const previews = capped.map(f => URL.createObjectURL(f));
    setDevicePreviews(previews);
    if (capped.length > 0) setState('device-selecting');
  }, [maxSelection]);

  const handleDeviceUpload = useCallback(async () => {
    if (!deviceFiles.length) return;
    setState('device-uploading');
    setUploadProgress({ done: 0, total: deviceFiles.length });

    const results: (GooglePhotoMetadata | null)[] = new Array(deviceFiles.length).fill(null);
    let doneCount = 0;

    // Upload one file with up to 2 retries
    const uploadOne = async (file: File, index: number) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const dims = await new Promise<{ w: number; h: number }>((res) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => { res({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
            img.onerror = () => { res({ w: 0, h: 0 }); URL.revokeObjectURL(url); };
            img.src = url;
          });

          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({ error: `HTTP ${uploadRes.status}` }));
            throw new Error(errData.error || `HTTP ${uploadRes.status}`);
          }
          const uploadData = await uploadRes.json();
          if (uploadData.publicUrl) {
            results[index] = {
              id: `device-${Date.now()}-${index}`,
              filename: file.name,
              mimeType: file.type || 'image/jpeg',
              creationTime: new Date(file.lastModified || Date.now()).toISOString(),
              width: dims.w,
              height: dims.h,
              baseUrl: uploadData.publicUrl,
              location: undefined,
            };
            break; // success — stop retrying
          }
        } catch (err) {
          if (attempt < 2) {
            // Brief back-off before retry (0.8s, 1.6s)
            await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          } else {
            console.error(`[PhotoBrowser] ${file.name} failed after 3 attempts:`, err);
          }
        }
      }
      doneCount++;
      setUploadProgress({ done: doneCount, total: deviceFiles.length });
    };

    // Upload in batches of 3 concurrent to stay fast but not overwhelm mobile network
    const CONCURRENCY = 3;
    for (let i = 0; i < deviceFiles.length; i += CONCURRENCY) {
      await Promise.all(
        deviceFiles.slice(i, i + CONCURRENCY).map((f, j) => uploadOne(f, i + j))
      );
    }

    // Clean up preview URLs
    devicePreviews.forEach(url => URL.revokeObjectURL(url));

    const successful = results.filter((r): r is GooglePhotoMetadata => r !== null);
    const failCount = deviceFiles.length - successful.length;

    if (successful.length > 0) {
      setPhotos(successful);
      setSelected(new Set(successful.map(p => p.id)));
      onSelectionChange(successful);
      if (failCount > 0) {
        // Partial success — show the grid so they can continue, but surface the failure count
        setError(`${failCount} photo${failCount > 1 ? 's' : ''} failed to upload and were skipped.`);
      }
      setState('done');
    } else {
      setState('error');
      setError('No photos could be uploaded. Check your connection and try again.');
    }
  }, [deviceFiles, devicePreviews, onSelectionChange]);

  // ── IDLE ──
  if (state === 'idle') {
    return (
      <div style={cardStyle}>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.5rem', color: 'var(--pl-ink-soft)', fontWeight: 400 }}>
          Add your photos
        </h3>
        <p style={{ color: 'var(--pl-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2.5rem' }}>
          Select the memories you want to feature — from Google Photos or straight from your device.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 420, margin: '0 auto' }}>
          {/* Google Photos — only shown for Google-signed-in users */}
          {isGoogleUser && (<motion.button
            onClick={startPickerFlow}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '16px 20px', borderRadius: '16px', border: 'none',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(43,30,20,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderBottom: '1px solid rgba(255,255,255,0.6)',
            } as React.CSSProperties}
          >
            <span style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L29.5 14.5H18.5L24 4Z" fill="#EA4335"/>
                <path d="M4 34.5L14.5 29V40L4 34.5Z" fill="#4285F4"/>
                <path d="M44 34.5L33.5 40V29L44 34.5Z" fill="#34A853"/>
                <path d="M24 44L18.5 33.5H29.5L24 44Z" fill="#FBBC05"/>
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--pl-ink)', letterSpacing: '0.02em' }}>GOOGLE PHOTOS</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 400, marginTop: '2px' }}>Browse your synced library</div>
            </div>
            <ExternalLink size={14} style={{ color: 'var(--pl-muted)', opacity: 0.4 }} />
          </motion.button>

          )}

          {/* Divider — only if both options shown */}
          {isGoogleUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.06)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontStyle: 'italic' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.06)' }} />
            </div>
          )}

          {/* Device upload — organic glass card */}
          <motion.button
            onClick={() => deviceInputRef.current?.click()}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '16px 20px', borderRadius: '16px', border: 'none',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(43,30,20,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderBottom: '1px solid rgba(255,255,255,0.6)',
            } as React.CSSProperties}
          >
            <span style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(163,177,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Upload size={18} color="var(--pl-olive)" />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--pl-ink)', letterSpacing: '0.02em' }}>UPLOAD FROM DEVICE</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 400, marginTop: '2px' }}>iPhone, Android, computer — any photos</div>
            </div>
          </motion.button>
          <input
            ref={deviceInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleDeviceFileSelect(e.target.files)}
          />
        </div>
      </div>
    );
  }

  // ── DEVICE SELECTING (previewing files before upload) ──
  if (state === 'device-selecting') {
    return (
      <div style={{ ...cardStyle, maxWidth: 640 }}>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: text.xl, marginBottom: '0.5rem' }}>
          {deviceFiles.length} photo{deviceFiles.length !== 1 ? 's' : ''} selected
        </h3>
        <p style={{ color: C.muted, fontSize: text.base, marginBottom: '1.5rem' }}>
          Looking good. Click &ldquo;Upload &amp; Continue&rdquo; to add these to your story.
        </p>

        {/* Thumbnail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: '1.5rem', maxHeight: 320, overflowY: 'auto' }}>
          {devicePreviews.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: card.radius, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => {
                  const nextFiles = deviceFiles.filter((_, fi) => fi !== i);
                  const nextPreviews = devicePreviews.filter((_, pi) => pi !== i);
                  URL.revokeObjectURL(devicePreviews[i]);
                  setDeviceFiles(nextFiles);
                  setDevicePreviews(nextPreviews);
                  if (nextFiles.length === 0) setState('idle');
                }}
                style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <X size={11} color="#fff" />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Button
            variant="secondary" size="lg"
            onClick={() => deviceInputRef.current?.click()}
          >
            Add more
          </Button>
          <Button variant="accent" size="lg" onClick={handleDeviceUpload}>
            <Upload size={15} /> Upload &amp; Continue
          </Button>
        </div>
        <input
          ref={deviceInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (!e.target.files) return;
            const extra = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            const combined = [...deviceFiles, ...extra].slice(0, maxSelection);
            setDeviceFiles(combined);
            setDevicePreviews([...devicePreviews, ...extra.map(f => URL.createObjectURL(f))].slice(0, maxSelection));
          }}
        />
      </div>
    );
  }

  // ── DEVICE UPLOADING ──
  if (state === 'device-uploading') {
    const pct = uploadProgress.total > 0 ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0;
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '50%', background: `${C.olive}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={28} color={C.olive} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Uploading your photos...
        </h3>
        <p style={{ color: C.muted, fontSize: '1rem', marginBottom: '1.5rem' }}>
          {uploadProgress.done} of {uploadProgress.total} uploaded
        </p>
        <div style={{ width: '100%', maxWidth: 320, height: 6, background: `${C.olive}22`, borderRadius: 100, overflow: 'hidden', margin: '0 auto' }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', background: C.olive, borderRadius: 100 }}
          />
        </div>
      </div>
    );
  }

  // ── CREATING SESSION ──
  if (state === 'creating-session') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: `${C.olive}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} color={C.olive} style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Connecting...</h3>
        <p style={{ color: C.muted, fontSize: '1.05rem' }}>Setting up secure connection to Google Photos...</p>
      </div>
    );
  }

  // ── WAITING FOR PICKER ──
  if (state === 'waiting-for-picker') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '5rem', height: '5rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: `${C.olive}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={32} color={C.olive} style={{ animation: 'spin 2s linear infinite' }} />
            </div>
            {/* Live wait timer */}
            <div style={{
              position: 'absolute', bottom: '-0.5rem', right: '-0.5rem',
              background: C.olive, color: '#fff', borderRadius: '100px',
              fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px',
              display: 'flex', alignItems: 'center', gap: '2px',
            }}>
              <Clock size={9} /> {formatWaitTime(waitSeconds)}
            </div>
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', marginBottom: '0.75rem', color: 'var(--pl-ink-soft)', fontWeight: 400 }}>
          Pick your favorites...
        </h3>
        <p style={{ color: 'var(--pl-muted)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 0.75rem' }}>
          A Google Photos window should be open. Browse your library, select the photos you love, then come back here.
        </p>
        <p style={{ color: 'var(--pl-olive)', fontSize: '0.78rem', fontWeight: 600, margin: '0 auto 1.5rem' }}>
          ✦ Take your time — we&apos;ll wait as long as you need
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          {pickerUri && (
            <Button
              variant="primary" size="lg"
              onClick={() => window.open(pickerUri, 'google-photos-picker', 'width=900,height=700')}
            >
              <ExternalLink size={16} /> Reopen Picker Window
            </Button>
          )}

          {/* Manual "I'm done" button — for when popup auto-close doesn't fire reliably */}
          <Button variant="accent" size="lg" onClick={handleDonePicking}>
            <Check size={16} /> I&apos;m Done — Load My Photos
          </Button>

          <button
            onClick={() => { stopPolling(); setState('idle'); }}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.25rem' }}
          >
            Cancel
          </button>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.78rem', color: 'rgba(0,0,0,0.3)' }}>
          If Google Photos closes but nothing loads, click &ldquo;I&apos;m Done&rdquo; to manually trigger photo loading.
        </p>
      </div>
    );
  }

  // ── FETCHING ──
  if (state === 'fetching') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: `${C.olive}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} color={C.olive} style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Loading Your Photos</h3>
        <p style={{ color: C.muted, fontSize: '1.05rem' }}>Fetching your selected memories from Google...</p>
      </div>
    );
  }

  // ── SESSION EXPIRED ──
  if (state === 'session-expired') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#fef9e7', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={32} color="#d97706" />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '2rem', marginBottom: '1rem', color: '#2B2B2B' }}>
          Session Timed Out
        </h3>
        <p style={{ color: C.muted, fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          The Google Photos connection expired after 30 minutes. Start a new session and pick your photos again — it only takes a moment.
        </p>
        <Button variant="primary" size="lg" onClick={startPickerFlow}>
          <RefreshCw size={18} /> Start New Picker Session
        </Button>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (state === 'error') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#fef2f2', border: '2px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={32} color="#dc2626" />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '2rem', marginBottom: '1rem', color: '#2B2B2B' }}>
          Connection Error
        </h3>
        <p style={{ color: C.muted, fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="danger" size="lg" onClick={() => signOut()}>
            Sign Out &amp; Reconnect
          </Button>
          <Button variant="primary" size="lg" onClick={() => { stopPolling(); startPickerFlow(); }}>
            <RefreshCw size={18} /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ── EMPTY STATE ──
  if (!photos.length) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: `${C.olive}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageOff size={32} color={C.olive} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '2rem', marginBottom: '1rem' }}>No Photos Loaded</h3>
        <p style={{ color: C.muted, fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          No photos were loaded from the picker. If you selected photos in Google Photos, click &ldquo;Try Loading Again&rdquo; below.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {sessionId && (
            <Button variant="primary" size="lg" onClick={handleDonePicking}>
              <RefreshCw size={18} /> Try Loading Again
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={() => { stopPolling(); startPickerFlow(); }}>
            Open Picker Again
          </Button>
        </div>
      </div>
    );
  }

  // ── GRID GALLERY ──
  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* Partial-upload failure banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: '#fff7ed', border: '1px solid #fed7aa',
          borderRadius: card.radius, fontSize: text.sm, color: '#92400e',
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Select Best Memories</h3>
          <p style={{ fontSize: '0.95rem', color: C.muted }}>
            {selected.size} / {maxSelection} photos selected <span style={{ opacity: 0.5 }}>• {photos.length} total from picker</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={selectAll}
            style={{ padding: '0.5rem 1rem', borderRadius: '100px', border: card.border, background: card.bg, fontSize: text.sm, fontWeight: 500, cursor: 'pointer', height: '2.25rem', boxSizing: 'border-box' }}
          >
            Select All ({Math.min(photos.length, maxSelection)})
          </button>
          <button
            onClick={clearSelection}
            style={{ padding: '0.5rem 1rem', borderRadius: '100px', border: card.border, background: card.bg, fontSize: text.sm, fontWeight: 500, cursor: 'pointer', height: '2.25rem', boxSizing: 'border-box' }}
          >
            Clear All
          </button>
          <button
            onClick={() => { stopPolling(); startPickerFlow(); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '100px', border: card.border, background: card.bg, fontSize: text.sm, fontWeight: 500, cursor: 'pointer', height: '2.25rem', boxSizing: 'border-box' }}
          >
            <RefreshCw size={14} style={{ marginRight: '0.25rem' }} /> Re-pick
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <AnimatePresence>
          {photos.map((photo) => {
            if (!photo?.id) return null;
            const isSelected = selected.has(photo.id);
            let dateLabel = '';
            try {
              if (photo.creationTime) {
                dateLabel = new Date(photo.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              }
            } catch { dateLabel = ''; }
            return (
              <motion.button
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => togglePhoto(photo)}
                style={{
                  position: 'relative', aspectRatio: '1', borderRadius: card.radius, overflow: 'hidden', cursor: 'pointer', padding: 0,
                  border: isSelected ? `2px solid ${C.olive}` : card.border,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected ? card.shadowHover : card.shadow,
                }}
              >
                <img
                  src={photo.baseUrl
                    ? (photo.baseUrl.includes('googleusercontent.com')
                      ? `/api/photos/proxy?url=${encodeURIComponent(photo.baseUrl)}&w=300&h=300`
                      : photo.baseUrl)
                    : ''}
                  alt={photo.filename || 'Photo'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f0ebe4' }}
                  loading="lazy"
                />
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ position: 'absolute', inset: 0, background: 'rgba(163,177,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: C.olive, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <Check size={16} color="#fff" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {dateLabel && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                    padding: '1rem 0.5rem 0.5rem', fontSize: '0.7rem', color: '#fff', fontWeight: 500,
                  }}>
                    {dateLabel}
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
