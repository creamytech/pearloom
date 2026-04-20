'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / GalleryPicker.tsx — Full-screen modal gallery picker
// Shows all user photos across all sites; lets user pick one.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon } from 'lucide-react';

interface PhotoItem {
  id: string;
  url: string;
  alt: string;
  siteName: string;
  siteId: string;
}

export interface GalleryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function GalleryPicker({ open, onClose, onSelect }: GalleryPickerProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Load photos from all user sites
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    async function loadPhotos() {
      try {
        const res = await fetch('/api/sites');
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        const sites = data.sites || [];

        const allPhotos: PhotoItem[] = [];
        const seen = new Set<string>();
        const push = (url: string, alt: string, siteName: string, siteId: string) => {
          if (!url || seen.has(url)) return;
          seen.add(url);
          allPhotos.push({
            id: `${siteId}-${allPhotos.length}`,
            url,
            alt,
            siteName,
            siteId,
          });
        };
        for (const site of sites) {
          const manifest = site.manifest;
          if (!manifest) continue;
          const name = site.names?.[0] || site.domain;

          // Cover photo
          if (manifest.coverPhoto) {
            push(manifest.coverPhoto, 'Cover photo', name, site.domain);
          }
          // Hero slideshow
          for (const url of (manifest.heroSlideshow || [])) {
            push(url, 'Hero slideshow', name, site.domain);
          }
          // Chapter images
          for (const chapter of (manifest.chapters || [])) {
            for (const img of (chapter.images || [])) {
              push(img.url, img.alt || chapter.title || '', name, site.domain);
            }
          }
        }
        if (!cancelled) setPhotos(allPhotos);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPhotos();
    return () => { cancelled = true; };
  }, [open]);

  // Filter by site name
  const filtered = useMemo(() => {
    if (!filter.trim()) return photos;
    const q = filter.toLowerCase();
    return photos.filter(
      p => p.siteName.toLowerCase().includes(q) || p.alt.toLowerCase().includes(q),
    );
  }, [photos, filter]);

  const handleSelect = useCallback((url: string) => {
    onSelect(url);
    onClose();
  }, [onSelect, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--z-max)',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '85dvh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--pl-radius-lg)',
              background: '#FFFFFF',
              boxShadow: '0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
              border: '1px solid #E4E4E7',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              flexShrink: 0,
            }}>
              <h2 style={{
                margin: 0,
                fontFamily: 'inherit',
                fontStyle: 'normal',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--pl-ink, #2B1E14)',
              }}>
                Your Photo Gallery
              </h2>
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--pl-radius-md)',
                  border: 'none',
                  background: 'rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  color: 'var(--pl-ink-soft, #5A4D42)',
                  transition: 'background var(--pl-dur-instant)',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.08)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search / filter bar */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--pl-radius-lg)',
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <Search size={14} style={{ color: '#71717A', flexShrink: 0 }} />
                <input
                  type="text"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Filter by site name or alt text..."
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '0.8rem',
                    color: 'var(--pl-ink, #2B1E14)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Photo grid — scrollable */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
            }}>
              {loading ? (
                /* Skeleton grid */
                <div className="gallery-picker-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}>
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 'var(--pl-radius-lg)',
                        background: 'rgba(0,0,0,0.06)',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                /* Empty state */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--pl-radius-lg)',
                    background: 'rgba(24,24,27,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}>
                    <ImageIcon size={24} style={{ color: '#18181B' }} />
                  </div>
                  <p style={{
                    fontSize: '0.8rem',
                    color: '#71717A',
                    maxWidth: '280px',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {photos.length === 0
                      ? 'No photos yet. Upload photos to your sites to build your gallery.'
                      : 'No photos match your filter.'}
                  </p>
                </div>
              ) : (
                /* Photo grid */
                <div className="gallery-picker-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}>
                  {filtered.map((photo, i) => (
                    <motion.button
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      onClick={() => handleSelect(photo.url)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 'var(--pl-radius-lg)',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.06)',
                        background: 'rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'block',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          photo.url.includes('googleusercontent')
                            ? `/api/photos/proxy?url=${encodeURIComponent(photo.url)}&w=300&h=300`
                            : photo.url
                        }
                        alt={photo.alt}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform var(--pl-dur-base)',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      />
                      {/* Hover overlay */}
                      <div
                        className="gallery-picker-overlay"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
                          opacity: 0,
                          transition: 'opacity var(--pl-dur-fast)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: '10px',
                          pointerEvents: 'none',
                        }}
                      >
                        <p style={{
                          margin: 0,
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {photo.alt}
                        </p>
                        <p style={{
                          margin: 0,
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.58rem',
                        }}>
                          {photo.siteName}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Responsive grid + hover overlay styles */}
          <style>{`
            @media (min-width: 640px) {
              .gallery-picker-grid {
                grid-template-columns: repeat(4, 1fr) !important;
              }
            }
            @media (min-width: 1024px) {
              .gallery-picker-grid {
                grid-template-columns: repeat(5, 1fr) !important;
              }
            }
            button:hover .gallery-picker-overlay {
              opacity: 1 !important;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
