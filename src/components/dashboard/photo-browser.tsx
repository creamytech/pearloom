'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/photo-browser.tsx
// High-Fidelity Google Photos grid browser
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ImageOff, RefreshCw, AlertCircle } from 'lucide-react';
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

export function PhotoBrowser({ onSelectionChange, maxSelection = 30 }: PhotoBrowserProps) {
  const [photos, setPhotos] = useState<GooglePhotoMetadata[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/photos?limit=200');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch photos');
      }
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const togglePhoto = (photo: GooglePhotoMetadata) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else if (next.size < maxSelection) {
        next.add(photo.id);
      }

      // Notify parent
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

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} color="var(--eg-accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Syncing Library</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem' }}>Connecting to your Google Photos...</p>
      </div>
    );
  }

  // ── ERROR STATE (Specifically designed for the 403 API Error) ──
  if (error) {
    const isForbidden = error.toLowerCase().includes('403') || error.toLowerCase().includes('forbidden');
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#fef2f2', border: '2px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isForbidden ? <AlertCircle size={32} color="#dc2626" /> : <ImageOff size={32} color="#dc2626" />}
          </div>
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '1rem', color: '#1a1a1a' }}>
          {isForbidden ? 'Connection Blocked' : 'Upload Interrupted'}
        </h3>
        
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          {isForbidden ? (
            <>
              Your Google account is blocking access. You must enable the Google Photos Library API, add your email as a test user, AND Sign Out to request a new token.
              <br/><br/>
              <span style={{ fontSize: '0.85rem', color: '#b91c1c', background: '#fee2e2', padding: '0.5rem', borderRadius: '0.5rem', display: 'block', wordBreak: 'break-word' }}>
                <strong>Google says:</strong> {error}
              </span>
            </>
          ) : error}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {isForbidden && (
            <button
              onClick={() => signOut()}
              style={{ ...btnPrimaryStyle, background: '#dc2626' }}
            >
              Sign Out & Reconnect
            </button>
          )}
          <button onClick={fetchPhotos} style={btnPrimaryStyle}>
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
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '1rem' }}>No Photos Found</h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          We couldn't locate any images in the connected Google Photos library. Please ensure the account has uploaded media.
        </p>
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
            {selected.size} / {maxSelection} photos selected <span style={{ opacity: 0.5 }}>• {photos.length} total</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={selectAll}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            Select Best {maxSelection}
          </button>
          <button
            onClick={clearSelection}
            style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            Clear All
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
