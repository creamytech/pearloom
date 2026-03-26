'use client';

// ─────────────────────────────────────────────────────────────
// everglow / app/dashboard/gallery/page.tsx — Gallery management
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image, Trash2, Download, Loader2 } from 'lucide-react';
import type { GalleryPhoto } from '@/types';

export default function GalleryDashboard() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gallery')
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.photos || []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2
            className="text-3xl font-semibold mb-2 tracking-tight"
            style={{ fontFamily: 'var(--eg-font-heading)' }}
          >
            Photo Gallery
          </h2>
          <p className="text-[var(--eg-muted)]">{photos.length} photos uploaded by guests.</p>
        </div>
        <a
          href="/photos"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10
                     text-sm text-[var(--eg-muted)] hover:text-[var(--eg-fg)] transition-colors"
        >
          <Image size={16} />
          View Gallery
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[var(--eg-muted)]" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-[var(--eg-muted)]">
          <Image size={48} className="mx-auto mb-4 opacity-30" />
          <p>No guest photos yet.</p>
          <p className="text-sm mt-3">Share the photos page link with your guests:</p>
          <p className="text-sm font-mono bg-black/5 inline-block px-4 py-2 rounded-lg mt-2">
            {typeof window !== 'undefined' ? `${window.location.origin}/photos` : '/photos'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square rounded-lg overflow-hidden relative group"
            >
              <img
                src={photo.url}
                alt={photo.caption || `by ${photo.uploadedBy}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-end p-2">
                <p className="text-white text-xs truncate">📸 {photo.uploadedBy}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
