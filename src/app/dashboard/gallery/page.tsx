'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/gallery/page.tsx
// Dashboard photo gallery — browse all photos across all sites.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Download, Image as ImageIcon, Grid, List } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

interface PhotoItem {
  id: string;
  url: string;
  alt: string;
  siteName: string;
  siteId: string;
  uploadedAt?: string;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load photos from all user sites
    async function loadPhotos() {
      try {
        const res = await fetch('/api/site');
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        const sites = data.sites || [];

        const allPhotos: PhotoItem[] = [];
        for (const site of sites) {
          const manifest = site.manifest;
          if (!manifest?.chapters) continue;
          for (const chapter of manifest.chapters) {
            for (const img of (chapter.images || [])) {
              allPhotos.push({
                id: img.id || `${site.domain}-${allPhotos.length}`,
                url: img.url,
                alt: img.alt || chapter.title || '',
                siteName: site.names?.[0] || site.domain,
                siteId: site.domain,
              });
            }
          }
        }
        setPhotos(allPhotos);
      } catch {} finally {
        setLoading(false);
      }
    }
    loadPhotos();
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--pl-cream)] flex">
      {/* Sidebar — desktop only */}
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-[0.72rem] text-[var(--pl-muted)] no-underline flex items-center gap-1 mb-2 md:hidden">
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <h1 className="font-heading italic text-[clamp(1.4rem,3vw,2rem)] text-[var(--pl-ink)]">
              Photo Gallery
            </h1>
            <p className="text-[0.82rem] text-[var(--pl-muted)]">
              {photos.length} photos across all your sites
            </p>
          </div>
        </div>

        {/* Gallery grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square rounded-[var(--pl-radius-md)] skeleton" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center mx-auto mb-4">
              <ImageIcon size={28} className="text-[var(--pl-olive)]" />
            </div>
            <h3 className="font-heading italic text-xl text-[var(--pl-ink)] mb-2">No photos yet</h3>
            <p className="text-[0.88rem] text-[var(--pl-muted)] max-w-[360px] mx-auto mb-6">
              Create a site and upload photos to see them here.
            </p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--pl-olive-deep)] text-white text-[0.75rem] font-bold uppercase tracking-[0.08em] no-underline">
              Create a Site
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className="group relative aspect-square rounded-[var(--pl-radius-md)] overflow-hidden bg-[var(--pl-cream-deep)] cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(photo.url)}&w=400&h=400` : photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  <p className="text-white text-[0.72rem] font-semibold truncate">{photo.alt}</p>
                  <p className="text-white/60 text-[0.62rem]">{photo.siteName}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
