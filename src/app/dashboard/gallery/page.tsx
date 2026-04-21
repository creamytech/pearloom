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
import { BlurFade, CurvedText, GrooveBlob } from '@/components/brand/groove';

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
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <GrooveBlob
          palette="orchard"
          size={400}
          blur={80}
          opacity={0.24}
          style={{ position: 'absolute', top: '-100px', right: '-80px', zIndex: 0, pointerEvents: 'none' }}
        />
        <BlurFade>
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
          <div
            aria-hidden
            style={{
              marginBottom: 4,
              marginLeft: -6,
              color: 'var(--pl-groove-terra)',
            }}
          >
            <CurvedText
              variant="wave"
              width={260}
              amplitude={10}
              fontFamily='var(--pl-font-body)'
              fontSize={14}
              fontWeight={500}
              letterSpacing={1.5}
              aria-label="The Reel · Gallery"
            >
              ✦  The Reel · Gallery  ✦
            </CurvedText>
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
                fontFamily: 'var(--pl-font-body)',
                fontWeight: 700,
                fontSize: 'clamp(2rem, 4.2vw, 2.8rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--pl-groove-ink)',
              }}>
                {photos.length > 0 ? 'The moments' : 'Every frame'}
              </h1>
              <p style={{
                margin: '14px 0 0',
                fontFamily: 'var(--pl-font-body)',
                fontSize: 'clamp(0.96rem, 1.2vw, 1.06rem)',
                lineHeight: 1.6,
                color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                maxWidth: 480,
              }}>
                A single room for every photograph across your sites. Upload new ones — they file themselves for your next celebration.
              </p>
              {photos.length > 0 && (
                <div style={{
                  marginTop: 12,
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: 'var(--pl-groove-plum)',
                }}>
                  {photos.length.toLocaleString()} frames
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => uploadRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 22px',
                  borderRadius: 'var(--pl-groove-radius-pill)',
                  background: 'var(--pl-groove-blob-sunrise)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 6px 18px rgba(139,74,106,0.24), 0 2px 6px rgba(43,30,20,0.08)',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  letterSpacing: '-0.005em',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  transition: 'transform var(--pl-dur-fast) var(--pl-groove-ease-squish)',
                }}
                onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {uploading ? (
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Upload size={15} strokeWidth={2} />
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
        </BlurFade>

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
            borderRadius: 'var(--pl-groove-radius-blob)',
            background: 'color-mix(in oklab, var(--pl-groove-butter) 16%, var(--pl-groove-cream))',
            border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
          }}>
            <div style={{
              width: 84, height: 84,
              borderRadius: 'var(--pl-groove-radius-blob)',
              background: 'var(--pl-groove-blob-sunrise)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 22px',
              boxShadow: '0 14px 36px rgba(139,74,106,0.22)',
            }}>
              <ImageIcon size={32} style={{ color: '#fff' }} />
            </div>
            <h3 style={{
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: '1.6rem',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
              margin: '0 0 12px',
            }}>
              The reel is empty
            </h3>
            <p style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.96rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
              maxWidth: 400,
              margin: '0 auto 24px',
            }}>
              Create a site, upload a photograph, or simply begin — your moments will file themselves here.
            </p>
            <Link href="/dashboard" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 'var(--pl-groove-radius-pill)',
              background: 'var(--pl-groove-blob-sunrise)',
              color: '#fff',
              textDecoration: 'none',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.92rem',
              fontWeight: 600,
              boxShadow: '0 6px 18px rgba(139,74,106,0.24), 0 2px 6px rgba(43,30,20,0.08)',
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
                  borderRadius: 'var(--pl-radius-lg)',
                  background: 'color-mix(in oklab, var(--pl-groove-butter) 12%, var(--pl-groove-cream))',
                  border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 16%, transparent)',
                  transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-base) var(--pl-ease-out), transform var(--pl-dur-base) var(--pl-groove-ease-bloom)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'color-mix(in oklab, var(--pl-groove-plum) 42%, transparent)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(43,30,20,0.06), 0 20px 44px color-mix(in oklab, var(--pl-groove-plum) 20%, transparent)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'color-mix(in oklab, var(--pl-groove-terra) 16%, transparent)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(photo.url)}&w=400&h=400` : photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />

                {/* Hover caption — groove overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end"
                  style={{
                    background: 'linear-gradient(to top, rgba(43,30,20,0.82) 0%, rgba(43,30,20,0.40) 40%, transparent 75%)',
                    padding: '12px 14px 14px',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    color: 'color-mix(in oklab, var(--pl-groove-butter) 60%, #fff)',
                    marginBottom: 4,
                  }}>
                    {photo.siteName}
                  </span>
                  <span style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    lineHeight: 1.2,
                    letterSpacing: '-0.005em',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {photo.alt || 'Untitled moment'}
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
