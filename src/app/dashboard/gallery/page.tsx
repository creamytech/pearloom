'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/gallery/page.tsx
// Dashboard photo gallery — browse all photos across all sites.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

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
    <DashboardShell eyebrow="Gallery">
      <div
            style={{
              display: 'flex', flexDirection: 'column',
            }}
          >
        {/* Editorial header */}
        <div
          style={{
            marginBottom: 32,
            paddingBottom: 24,
            borderBottom: '1px solid var(--pl-divider)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="pl-overline" style={{ marginBottom: 14 }}>
              Gallery · Every frame
            </div>
            <h1
              className="pl-display"
              style={{
                margin: 0,
                fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
                color: 'var(--pl-ink)',
                lineHeight: 1.05,
              }}
            >
              {photos.length > 0 ? (
                <>
                  {photos.length.toLocaleString()}{' '}
                  <em
                    style={{
                      fontStyle: 'italic',
                      color: 'var(--pl-olive)',
                      fontVariationSettings:
                        '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    moments
                  </em>
                  .
                </>
              ) : (
                <>
                  Every{' '}
                  <em
                    style={{
                      fontStyle: 'italic',
                      color: 'var(--pl-olive)',
                      fontVariationSettings:
                        '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    frame
                  </em>
                  .
                </>
              )}
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                color: 'var(--pl-muted)',
                fontSize: '0.95rem',
                lineHeight: 1.55,
                maxWidth: '52ch',
              }}
            >
              Every photo from every site, in one room. Upload new ones and
              they go straight into your next celebration.
            </p>
          </div>
          <div>
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--pl-radius-full)',
                background: 'var(--pl-ink)',
                color: 'var(--pl-cream)',
                border: 'none',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
                transition: 'transform 150ms, opacity 150ms',
              }}
            >
              {uploading ? (
                <Loader2
                  size={14}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              ) : (
                <Upload size={14} />
              )}
              {uploading ? 'Uploading…' : 'Upload photos'}
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
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              border: '1px dashed var(--pl-divider)',
              borderRadius: 'var(--pl-radius-lg)',
              background: 'var(--pl-cream-deep)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'var(--pl-olive-mist)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImageIcon size={26} style={{ color: 'var(--pl-olive)' }} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontSize: '1.3rem',
                color: 'var(--pl-ink)',
                margin: '0 0 6px',
              }}
            >
              No photos yet
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--pl-muted)',
                maxWidth: 360,
                margin: '0 auto 22px',
              }}
            >
              Create a site and upload photos to see them here.
            </p>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--pl-radius-full)',
                background: 'var(--pl-ink)',
                color: 'var(--pl-cream)',
                textDecoration: 'none',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Create a site
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
      </div>
    </DashboardShell>
  );
}
