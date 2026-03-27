'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/photo-browser.tsx
// Google Photos Picker API Flow
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ImageOff, RefreshCw, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import type { GooglePhotoMetadata } from '@/types';

interface PhotoBrowserProps {
  onSelectionChange: (photos: GooglePhotoMetadata[]) => void;
  maxSelection?: number;
}

const cardStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '0 auto',
};

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  padding: '1rem 2rem', borderRadius: '0.75rem',
  background: 'var(--eg-fg)', color: '#fff', border: 'none',
  fontSize: '1rem', fontWeight: 500, fontFamily: 'var(--eg-font-body)',
  cursor: 'pointer', transition: 'all 0.2s ease',
  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
};

type BrowserState = 'idle' | 'creating-session' | 'waiting-for-picker' | 'fetching' | 'done' | 'error' | 'session-expired';

// How long after the popup closes we keep polling (user may have picked without closing cleanly)
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes — photo libraries are large, give plenty of time

// Hard cap: stop polling after this long regardless (Google session expires ~1h)
const MAX_POLL_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function PhotoBrowser({ onSelectionChange, maxSelection = 30 }: PhotoBrowserProps) {
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

  // ── IDLE ──
  if (state === 'idle') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '6rem', height: '6rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L29.5 14.5H18.5L24 4Z" fill="#EA4335"/>
              <path d="M4 34.5L14.5 29V40L4 34.5Z" fill="#4285F4"/>
              <path d="M44 34.5L33.5 40V29L44 34.5Z" fill="#34A853"/>
              <path d="M24 44L18.5 33.5H29.5L24 44Z" fill="#FBBC05"/>
              <circle cx="24" cy="24" r="6" fill="var(--eg-fg)" opacity="0.15"/>
            </svg>
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
          Select from Google Photos
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '450px', margin: '0 auto 2.5rem' }}>
          Click below to open Google&apos;s secure photo picker. Browse your library and select the memories you want to feature.
        </p>
        <button onClick={startPickerFlow} style={btnPrimaryStyle}>
          <ExternalLink size={18} /> Open Google Photos Picker
        </button>
      </div>
    );
  }

  // ── CREATING SESSION ──
  if (state === 'creating-session') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} color="var(--eg-accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Connecting...</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem' }}>Setting up secure connection to Google Photos...</p>
      </div>
    );
  }

  // ── WAITING FOR PICKER ──
  if (state === 'waiting-for-picker') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '5rem', height: '5rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={32} color="var(--eg-accent)" style={{ animation: 'spin 2s linear infinite' }} />
            </div>
            {/* Live wait timer */}
            <div style={{
              position: 'absolute', bottom: '-0.5rem', right: '-0.5rem',
              background: 'var(--eg-accent)', color: '#fff', borderRadius: '100px',
              fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px',
              display: 'flex', alignItems: 'center', gap: '2px',
            }}>
              <Clock size={9} /> {formatWaitTime(waitSeconds)}
            </div>
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
          Waiting for your selection...
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '450px', margin: '0 auto 1.5rem' }}>
          A Google Photos window is open. Browse your library, select photos, then close the window when done. <strong>Take your time</strong> — we&apos;ll wait up to 30 minutes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          {pickerUri && (
            <button
              onClick={() => window.open(pickerUri, 'google-photos-picker', 'width=900,height=700')}
              style={btnPrimaryStyle}
            >
              <ExternalLink size={16} /> Reopen Picker Window
            </button>
          )}

          {/* Manual "I'm done" button — for when popup auto-close doesn't fire reliably */}
          <button
            onClick={handleDonePicking}
            style={{
              ...btnPrimaryStyle,
              background: 'var(--eg-accent)',
              boxShadow: '0 4px 14px rgba(184,146,106,0.35)',
            }}
          >
            <Check size={16} /> I&apos;m Done — Load My Photos
          </button>

          <button
            onClick={() => { stopPolling(); setState('idle'); }}
            style={{ background: 'none', border: 'none', color: 'var(--eg-muted)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.25rem' }}
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
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} color="var(--eg-accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Loading Your Photos</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem' }}>Fetching your selected memories from Google...</p>
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
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }}>
          Session Timed Out
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          The Google Photos connection expired after 30 minutes. Start a new session and pick your photos again — it only takes a moment.
        </p>
        <button onClick={startPickerFlow} style={btnPrimaryStyle}>
          <RefreshCw size={18} /> Start New Picker Session
        </button>
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
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }}>
          Connection Error
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => signOut()} style={{ ...btnPrimaryStyle, background: '#dc2626' }}>
            Sign Out &amp; Reconnect
          </button>
          <button onClick={() => { stopPolling(); startPickerFlow(); }} style={btnPrimaryStyle}>
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── EMPTY STATE ──
  if (!photos.length) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageOff size={32} color="var(--eg-accent)" />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '1rem' }}>No Photos Loaded</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          No photos were loaded from the picker. If you selected photos in Google Photos, click &ldquo;Try Loading Again&rdquo; below.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {sessionId && (
            <button onClick={handleDonePicking} style={btnPrimaryStyle}>
              <RefreshCw size={18} /> Try Loading Again
            </button>
          )}
          <button onClick={() => { stopPolling(); startPickerFlow(); }} style={{ ...btnPrimaryStyle, background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'var(--eg-fg)', boxShadow: 'none' }}>
            Open Picker Again
          </button>
        </div>
      </div>
    );
  }

  // ── GRID GALLERY ──
  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Select Best Memories</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--eg-muted)' }}>
            {selected.size} / {maxSelection} photos selected <span style={{ opacity: 0.5 }}>• {photos.length} total from picker</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={selectAll}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Select All ({Math.min(photos.length, maxSelection)})
          </button>
          <button
            onClick={clearSelection}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Clear All
          </button>
          <button
            onClick={() => { stopPolling(); startPickerFlow(); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
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
                  position: 'relative', aspectRatio: '1', borderRadius: '0.75rem', overflow: 'hidden', cursor: 'pointer', padding: 0,
                  border: isSelected ? '3px solid var(--eg-accent)' : '3px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected ? '0 8px 24px rgba(184,146,106,0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <img
                  src={photo.baseUrl ? `/api/photos/proxy?url=${encodeURIComponent(photo.baseUrl)}&w=300&h=300` : ''}
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
                      style={{ position: 'absolute', inset: 0, background: 'rgba(184,146,106,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--eg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
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
