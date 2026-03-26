'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/photo-browser.tsx
// Google Photos Picker API Flow (March 2025+)
// Opens Google's native picker in a popup, polls for completion,
// then fetches and displays the selected items.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ImageOff, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
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

type BrowserState = 'idle' | 'creating-session' | 'waiting-for-picker' | 'fetching' | 'done' | 'error';

export function PhotoBrowser({ onSelectionChange, maxSelection = 30 }: PhotoBrowserProps) {
  const [photos, setPhotos] = useState<GooglePhotoMetadata[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<BrowserState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pickerUri, setPickerUri] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Launch the Picker flow ──
  const startPickerFlow = useCallback(async () => {
    setState('creating-session');
    setError(null);
    setPhotos([]);
    setSelected(new Set());

    try {
      // Step 1: Create a Picker session
      const res = await fetch('/api/photos?action=create-session');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create picker session');
      }
      const session = await res.json();
      const uri = session.pickerUri + '/autoclose';
      setPickerUri(uri);

      // Step 2: Open the Google Photos picker in a popup
      const popup = window.open(uri, 'google-photos-picker', 'width=900,height=700');
      setState('waiting-for-picker');

      // Step 3: Poll for completion
      const pollIntervalMs = 3000; // 3 seconds
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/photos?action=poll&sessionId=${session.id}`);
          if (!pollRes.ok) return; // silently retry
          const pollData = await pollRes.json();

          if (pollData.mediaItemsSet) {
            // User finished picking! Stop polling.
            if (pollRef.current) clearInterval(pollRef.current);
            setState('fetching');

            // Step 4: Fetch the picked media items
            const fetchRes = await fetch(`/api/photos?action=fetch&sessionId=${session.id}&limit=200`);
            if (!fetchRes.ok) {
              const fetchErr = await fetchRes.json();
              throw new Error(fetchErr.error || 'Failed to fetch picked photos');
            }
            const fetchData = await fetchRes.json();
            const fetchedPhotos = fetchData.photos ?? [];
            setPhotos(fetchedPhotos);
            setState('done');

            // Auto-select all if within limit
            if (fetchedPhotos.length <= maxSelection) {
              const allIds = new Set<string>(fetchedPhotos.map((p: GooglePhotoMetadata) => p.id));
              setSelected(allIds);
              onSelectionChange(fetchedPhotos);
            }
          }

          // If popup was closed by user without selecting, detect and stop
          if (popup && popup.closed && !pollData.mediaItemsSet) {
            if (pollRef.current) clearInterval(pollRef.current);
            setState('idle');
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, pollIntervalMs);

    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to start Google Photos picker');
    }
  }, [maxSelection, onSelectionChange]);

  // Cleanup interval on unmount
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

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

  // ── IDLE: Show "Select from Google Photos" button ──
  if (state === 'idle') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '6rem', height: '6rem', borderRadius: '50%',
            background: 'var(--eg-accent-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
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
          Click below to open Google's secure photo picker. Browse your library and select the memories you want to feature on your site.
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
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} color="var(--eg-accent)" style={{ animation: 'spin 2s linear infinite' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
          Waiting for your selection...
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '450px', margin: '0 auto 2rem' }}>
          A Google Photos window has opened. Browse your library, select your favorite photos, then close the window when you're done.
        </p>
        {pickerUri && (
          <button
            onClick={() => window.open(pickerUri, 'google-photos-picker', 'width=900,height=700')}
            style={{ ...btnPrimaryStyle, background: 'transparent', color: 'var(--eg-fg)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'none' }}
          >
            <ExternalLink size={16} /> Reopen Picker Window
          </button>
        )}
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={() => { stopPolling(); setState('idle'); }}
            style={{ background: 'none', border: 'none', color: 'var(--eg-muted)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Cancel
          </button>
        </div>
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
            Sign Out & Reconnect
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
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '1rem' }}>No Photos Selected</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          You didn't select any photos in the picker. Try again and choose some memories!
        </p>
        <button onClick={() => { stopPolling(); startPickerFlow(); }} style={btnPrimaryStyle}>
          <RefreshCw size={18} /> Open Picker Again
        </button>
      </div>
    );
  }

  // ── GRID GALLERY (after photos are fetched) ──
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
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            Select All ({Math.min(photos.length, maxSelection)})
          </button>
          <button
            onClick={clearSelection}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            Clear All
          </button>
          <button
            onClick={() => { stopPolling(); startPickerFlow(); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            <RefreshCw size={14} style={{ marginRight: '0.25rem' }} /> Re-pick
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <AnimatePresence>
          {photos.map((photo) => {
            const isSelected = selected.has(photo.id);
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
                  src={`${photo.baseUrl}=w300-h300-c`}
                  alt={photo.filename}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />

                {/* Selection overlay */}
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

                {/* Date label */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  padding: '1rem 0.5rem 0.5rem', textAlign: 'left',
                  fontSize: '0.7rem', color: '#fff', fontWeight: 500, letterSpacing: '0.02em',
                }}>
                  {new Date(photo.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
