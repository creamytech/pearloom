'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest, GuestPhoto } from '@/types';
import { LiveQROverlay } from './LiveQROverlay';

interface LivePhotoWallProps {
  domain: string;
  manifest: StoryManifest;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export function LivePhotoWall({ domain, manifest }: LivePhotoWallProps) {
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());

  // Load initial photos
  useEffect(() => {
    fetch(`/api/guest-photos?siteId=${encodeURIComponent(domain)}`)
      .then(res => res.json())
      .then(data => {
        if (data.photos) setPhotos(data.photos);
      })
      .catch(console.error);
  }, [domain]);

  // Subscribe to Supabase Realtime
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const channel = client
      .channel(`live-photos-${domain}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_photos',
          filter: `site_id=eq.${domain}`,
        },
        (payload) => {
          if (payload.new.status === 'approved') {
            const newPhoto = payload.new as GuestPhoto;
            setPhotos(prev => [newPhoto, ...prev]);
            setNewPhotoIds(prev => new Set(prev).add(newPhoto.id));
            // Remove the glow after 3 seconds
            setTimeout(() => {
              setNewPhotoIds(prev => {
                const next = new Set(prev);
                next.delete(newPhoto.id);
                return next;
              });
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [domain]);

  const coupleName1 = manifest.coupleNames?.[0] ?? '';
  const coupleName2 = manifest.coupleNames?.[1] ?? '';
  const displayName = coupleName1 && coupleName2
    ? `${coupleName1} & ${coupleName2}`
    : coupleName1 || coupleName2 || 'Our Celebration';

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#0E0B12',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
          background: 'linear-gradient(to bottom, rgba(14,11,18,0.9) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: '1.5rem',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.92)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {displayName}
          </p>
          <p
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.45)',
              margin: '4px 0 0',
              letterSpacing: '0.08em',
            }}
          >
            Live Wall
          </p>
        </div>
      </div>

      {/* Masonry photo grid */}
      <div
        style={{
          padding: '100px 20px 80px',
          columns: '3',
          columnGap: '12px',
        }}
        className="live-wall-grid"
      >
        <AnimatePresence>
          {photos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isNew={newPhotoIds.has(photo.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom instruction strip */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '16px 28px',
          background: 'linear-gradient(to top, rgba(14,11,18,0.95) 0%, transparent 100%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.45)',
            margin: 0,
            letterSpacing: '0.06em',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
          }}
        >
          Share your memories — scan to upload
        </p>
      </div>

      {/* QR Overlay */}
      <LiveQROverlay domain={domain} />

      <style>{`
        @media (max-width: 900px) {
          .live-wall-grid { columns: 2 !important; }
        }
        @media (max-width: 480px) {
          .live-wall-grid { columns: 1 !important; }
        }
      `}</style>
    </div>
  );
}

function PhotoCard({ photo, isNew }: { photo: GuestPhoto; isNew: boolean }) {
  return (
    <motion.div
      layout
      initial={{ y: 60, opacity: 0, scale: 0.92 }}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1,
        boxShadow: isNew
          ? '0 0 0 2px #D4AF37, 0 0 30px rgba(212,175,55,0.6)'
          : '0 4px 20px rgba(0,0,0,0.5)',
      }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      whileHover={{ scale: 1.02 }}
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
        breakInside: 'avoid',
        cursor: 'default',
        position: 'relative',
      }}
    >
      <img
        src={photo.url}
        alt={photo.caption || `Photo by ${photo.uploaderName}`}
        style={{
          width: '100%',
          display: 'block',
          objectFit: 'cover',
        }}
        loading="lazy"
      />
      {(photo.caption || photo.uploaderName) && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(14,11,18,0.85)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {photo.caption && (
            <p
              style={{
                margin: 0,
                fontSize: '0.82rem',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.4,
              }}
            >
              {photo.caption}
            </p>
          )}
          {photo.uploaderName && (
            <p
              style={{
                margin: photo.caption ? '4px 0 0' : 0,
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              — {photo.uploaderName}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
