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
        {/* Editorial masthead */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '0.32em', textTransform: 'uppercase',
              color: 'var(--pl-olive)',
            }}>
              The Reel · Gallery
            </span>
            <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.45)' }} />
            <span style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: 'rgba(14,13,11,0.55)',
            }}>
              {photos.length > 0 ? `${photos.length.toLocaleString()} frames` : 'empty reel'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            <div style={{ maxWidth: 560 }}>
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5.2vw, 3.6rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.01em',
                color: 'var(--pl-ink)',
              }}>
                {photos.length > 0 ? 'The moments' : 'Every frame'}
              </h1>
              <p style={{
                margin: '12px 0 0',
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.85rem',
                lineHeight: 1.55,
                color: 'var(--pl-ink-soft)',
                maxWidth: 420,
              }}>
                A single room for every photograph across your sites. Upload new ones — they file themselves for your next celebration.
              </p>
            </div>
            <div>
              <button
                onClick={() => uploadRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 20px',
                  borderRadius: 'var(--pl-radius-md)',
                  background: 'var(--pl-ink)',
                  color: 'var(--pl-cream)',
                  border: '1px solid var(--pl-ink)',
                  boxShadow: '0 0 0 3px rgba(184,147,90,0.18)',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  transition: 'transform 0.18s, box-shadow 0.18s',
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,147,90,0.28), 0 6px 18px rgba(14,13,11,0.18)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,147,90,0.18)';
                }}
              >
                {uploading ? (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Upload size={13} strokeWidth={2} />
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
        </div>

        {/* Gallery grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="aspect-square skeleton"
                style={{ borderRadius: 'var(--pl-radius-sm)', border: '1px solid rgba(14,13,11,0.06)' }}
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            position: 'relative',
            textAlign: 'center',
            padding: '72px 28px',
            border: '1px dashed rgba(184,147,90,0.55)',
            borderRadius: 'var(--pl-radius-xl)',
            background: 'var(--pl-cream-card)',
          }}>
            <span style={{
              position: 'absolute', top: 12, left: 16,
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.48rem', fontWeight: 700,
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'var(--pl-olive)',
            }}>
              Silent frame
            </span>
            <span style={{
              position: 'absolute', top: 12, right: 16,
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.48rem', fontWeight: 700,
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'rgba(14,13,11,0.40)',
            }}>
              № 00
            </span>
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              border: '1px solid rgba(184,147,90,0.55)',
              background: 'rgba(184,147,90,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 0 6px rgba(184,147,90,0.06)',
            }}>
              <ImageIcon size={28} style={{ color: 'var(--pl-ink)' }} />
            </div>
            <h3 style={{
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic', fontWeight: 400,
              fontSize: '2rem', lineHeight: 1.05,
              color: 'var(--pl-ink)',
              margin: '0 0 10px',
            }}>
              The reel is empty
            </h3>
            <p style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.84rem',
              lineHeight: 1.55,
              color: 'var(--pl-ink-soft)',
              maxWidth: 380,
              margin: '0 auto 24px',
            }}>
              Create a site, upload a photograph, or simply begin — your moments will file themselves here.
            </p>
            <Link href="/dashboard" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 22px',
              borderRadius: 'var(--pl-radius-md)',
              background: 'var(--pl-ink)',
              color: 'var(--pl-cream)',
              border: '1px solid var(--pl-ink)',
              boxShadow: '0 0 0 3px rgba(184,147,90,0.18)',
              textDecoration: 'none',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
            }}>
              Create a site
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="group relative aspect-square overflow-hidden cursor-pointer"
                style={{
                  borderRadius: 'var(--pl-radius-sm)',
                  background: 'var(--pl-cream-deep)',
                  border: '1px solid rgba(14,13,11,0.08)',
                  transition: 'border-color 0.2s, box-shadow 0.24s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(184,147,90,0.55)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(14,13,11,0.12), 0 0 0 3px rgba(184,147,90,0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(14,13,11,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(photo.url)}&w=400&h=400` : photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {/* Folio kicker — always visible, subtle */}
                <span
                  className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[2px] pointer-events-none"
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.42rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-cream)',
                    background: 'rgba(14,13,11,0.45)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    opacity: 0.85,
                  }}
                >
                  № {String(i + 1).padStart(3, '0')}
                </span>

                {/* Hover caption — editorial overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end"
                  style={{
                    background: 'linear-gradient(to top, rgba(14,13,11,0.78) 0%, rgba(14,13,11,0.35) 40%, transparent 75%)',
                    padding: '10px 12px 12px',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.42rem',
                    fontWeight: 700,
                    letterSpacing: '0.26em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-gold)',
                    marginBottom: 4,
                  }}>
                    {photo.siteName}
                  </span>
                  <span style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: '0.9rem',
                    lineHeight: 1.15,
                    color: 'var(--pl-cream)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {photo.alt || 'Untitled frame'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
