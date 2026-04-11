'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/gallery/page.tsx
// Dashboard photo gallery — browse all photos across all sites.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Download, Image as ImageIcon, Grid, List, Upload, Loader2 } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPhotos: PhotoItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const safeName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const safeFile = new File([file], safeName, { type: file.type || 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', safeFile);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.publicUrl) {
          newPhotos.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: data.publicUrl,
            alt: file.name.replace(/\.\w+$/, ''),
            siteName: 'Uploaded',
            siteId: 'uploads',
            uploadedAt: new Date().toISOString(),
          });
        }
      } catch {
        // silent
      }
    }
    if (newPhotos.length > 0) {
      setPhotos(prev => [...newPhotos, ...prev]);
    }
    setUploading(false);
  };

  useEffect(() => {
    // Load photos from all user sites
    async function loadPhotos() {
      try {
        const res = await fetch('/api/sites');
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        const sites = data.sites || [];

        const allPhotos: PhotoItem[] = [];
        const seen = new Set<string>();
        const push = (url: string | undefined, alt: string, site: { domain: string; names?: [string, string] }) => {
          if (!url || seen.has(url)) return;
          seen.add(url);
          allPhotos.push({
            id: `${site.domain}-${allPhotos.length}`,
            url,
            alt,
            siteName: site.names?.[0] || site.domain,
            siteId: site.domain,
          });
        };
        for (const site of sites) {
          const manifest = site.manifest;
          if (!manifest) continue;
          // Cover photo — single hero still from the generator
          push(manifest.coverPhoto, site.names?.join(' & ') || site.domain, site);
          // Hero slideshow — every image the wizard pre-uploaded
          for (const url of (manifest.heroSlideshow || [])) {
            push(url, site.names?.join(' & ') || site.domain, site);
          }
          // Chapter photos — the rest of the story
          for (const chapter of (manifest.chapters || [])) {
            for (const img of (chapter.images || [])) {
              push(img.url, img.alt || chapter.title || '', site);
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
    <div className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">
      {/* Dashboard header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--pl-divider)] bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-heading italic text-[1.05rem] font-semibold text-[var(--pl-ink-soft)] no-underline hover:opacity-75 transition-opacity">
            Pearloom
          </Link>
          <span className="hidden sm:block text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
            Gallery
          </span>
        </div>
        <Link href="/dashboard" className="text-[0.72rem] text-[var(--pl-muted)] no-underline flex items-center gap-1 hover:text-[var(--pl-ink)] transition-colors">
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading italic text-[clamp(1.4rem,3vw,2rem)] text-[var(--pl-ink)]">
              Photo Gallery
            </h1>
            <p className="text-[0.82rem] text-[var(--pl-muted)]">
              {photos.length} photos across all your sites
            </p>
          </div>
          <div>
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[0.75rem] font-bold uppercase tracking-[0.08em] no-underline transition-opacity"
              style={{
                background: 'var(--pl-olive-deep, #6B7F5E)',
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {uploading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Upload size={14} />}
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => { handleUpload(e.target.files); e.target.value = ''; }}
            />
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
    </div>
  );
}
