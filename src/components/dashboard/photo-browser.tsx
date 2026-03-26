'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/dashboard/photo-browser.tsx
// Google Photos grid browser with selection
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ImageOff, RefreshCw } from 'lucide-react';
import type { GooglePhotoMetadata } from '@/types';

interface PhotoBrowserProps {
  onSelectionChange: (photos: GooglePhotoMetadata[]) => void;
  maxSelection?: number;
}

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-[var(--eg-accent)]" />
        <p className="text-[var(--eg-muted)] text-sm">loading your photos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <ImageOff size={48} className="text-[var(--eg-muted)]" />
        <p className="text-[var(--eg-fg)] font-medium">{error}</p>
        <button
          onClick={fetchPhotos}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--eg-accent)] text-white
                     text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw size={16} />
          retry
        </button>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <ImageOff size={48} className="text-[var(--eg-muted)]" />
        <p className="text-[var(--eg-fg)]">no photos found in your google photos library.</p>
        <p className="text-[var(--eg-muted)] text-sm">
          make sure your google photos account has images.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--eg-muted)]">
          {selected.size} / {maxSelection} selected · {photos.length} photos available
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs px-3 py-1.5 rounded-full border border-black/10
                       hover:bg-black/5 transition-colors cursor-pointer"
          >
            select first {maxSelection}
          </button>
          <button
            onClick={clearSelection}
            className="text-xs px-3 py-1.5 rounded-full border border-black/10
                       hover:bg-black/5 transition-colors cursor-pointer"
          >
            clear
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
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
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer
                            border-2 transition-all duration-200
                            ${isSelected
                              ? 'border-[var(--eg-accent)] ring-2 ring-[var(--eg-accent)]/30'
                              : 'border-transparent hover:border-black/10'
                            }`}
              >
                <img
                  src={`${photo.baseUrl}=w300-h300-c`}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selection overlay */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-[var(--eg-accent)]/20 flex items-center justify-center"
                  >
                    <div className="w-6 h-6 rounded-full bg-[var(--eg-accent)] flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  </motion.div>
                )}

                {/* Date label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent
                                p-1.5 text-[10px] text-white/80 truncate">
                  {new Date(photo.creationTime).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
