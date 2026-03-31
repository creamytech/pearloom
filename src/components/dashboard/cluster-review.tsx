'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/cluster-review.tsx
// Step between photo selection and vibe entry.
// Shows the photo clusters (grouped by date) and lets users
// manually enter a location for any clusters missing GPS data.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Camera, Pencil, Check, Loader2, Scissors, Merge } from 'lucide-react';
import type { GooglePhotoMetadata, PhotoCluster, GeoLocation } from '@/types';
import { clusterPhotos } from '@/lib/google-photos';

interface ClusterReviewProps {
  photos: GooglePhotoMetadata[];
  onConfirm: (clusters: PhotoCluster[]) => void;
  onBack: () => void;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (s.toDateString() === e.toDateString()) return fmt(s);
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${fmt(e)}`;
  }
  return `${fmt(s)} – ${fmt(e)}`;
}

export function ClusterReview({ photos, onConfirm, onBack }: ClusterReviewProps) {
  const [clusters, setClusters] = useState<PhotoCluster[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draftLocation, setDraftLocation] = useState('');
  const [geocoding, setGeocoding] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    // Cluster the photos whenever the photo set changes
    // Default gap: 2 days — consecutive days at different locations stay separate
    const built = clusterPhotos(photos, 2);
    setClusters(built);
  }, [photos]);

  const setClusterNote = (idx: number, note: string) => {
    setClusters(prev => prev.map((c, i) => i === idx ? { ...c, note } : c));
  };

  // ── Split a cluster into two at a specific photo boundary ──
  const splitCluster = useCallback((clusterIdx: number, splitAfterPhotoIdx: number) => {
    setClusters(prev => {
      const cluster = prev[clusterIdx];
      if (!cluster || splitAfterPhotoIdx < 0 || splitAfterPhotoIdx >= cluster.photos.length - 1) return prev;

      const photosA = cluster.photos.slice(0, splitAfterPhotoIdx + 1);
      const photosB = cluster.photos.slice(splitAfterPhotoIdx + 1);

      const buildMiniCluster = (photos: GooglePhotoMetadata[]): PhotoCluster => {
        const dates = photos.map(p => new Date(p.creationTime).getTime());
        const geoPhotos = photos.filter(p => p.location && (p.location.latitude || p.location.longitude));
        let location: GeoLocation | null = null;
        if (geoPhotos.length > 0) {
          const avgLat = geoPhotos.reduce((s, p) => s + (p.location?.latitude ?? 0), 0) / geoPhotos.length;
          const avgLng = geoPhotos.reduce((s, p) => s + (p.location?.longitude ?? 0), 0) / geoPhotos.length;
          location = { lat: avgLat, lng: avgLng, label: '' };
        }
        return {
          startDate: new Date(Math.min(...dates)).toISOString(),
          endDate: new Date(Math.max(...dates)).toISOString(),
          location: location || cluster.location,
          photos,
        };
      };

      const next = [...prev];
      next.splice(clusterIdx, 1, buildMiniCluster(photosA), buildMiniCluster(photosB));
      return next;
    });
  }, []);

  // ── Merge a cluster with the next one ──
  const mergeWithNext = useCallback((clusterIdx: number) => {
    setClusters(prev => {
      if (clusterIdx >= prev.length - 1) return prev;
      const a = prev[clusterIdx];
      const b = prev[clusterIdx + 1];
      const mergedPhotos = [...a.photos, ...b.photos].sort(
        (x, y) => new Date(x.creationTime).getTime() - new Date(y.creationTime).getTime()
      );
      const dates = mergedPhotos.map(p => new Date(p.creationTime).getTime());
      const merged: PhotoCluster = {
        startDate: new Date(Math.min(...dates)).toISOString(),
        endDate: new Date(Math.max(...dates)).toISOString(),
        location: a.location || b.location,
        photos: mergedPhotos,
        note: [a.note, b.note].filter(Boolean).join('. ') || undefined,
      };
      const next = [...prev];
      next.splice(clusterIdx, 2, merged);
      return next;
    });
  }, []);

  const setClusterLabel = (idx: number, label: string) => {
    setClusters(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const loc: GeoLocation = c.location
        ? { ...c.location, label }
        : { lat: 0, lng: 0, label };
      return { ...c, location: loc };
    }));
  };

  const handleEditSave = (idx: number) => {
    const label = draftLocation.trim();
    if (label) setClusterLabel(idx, label);
    setEditingIdx(null);
    setDraftLocation('');
  };

  const handleGeocodeFromText = async (idx: number, text: string) => {
    if (!text.trim()) return;
    setGeocoding(idx);
    try {
      // Use Nominatim to get lat/lng from the human-entered location name
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text.trim())}&format=json&limit=1`,
        { headers: { 'User-Agent': 'pearloom/1.0' } }
      );
      const data = await res.json();
      if (data?.[0]) {
        const { lat, lon, display_name } = data[0];
        // Use the first component of display_name (city/place) as label
        const label = text.trim(); // keep what user typed — cleaner than full OSM name
        setClusters(prev => prev.map((c, i) => {
          if (i !== idx) return c;
          return {
            ...c,
            location: {
              lat: parseFloat(lat),
              lng: parseFloat(lon),
              label,
            },
          };
        }));
      } else {
        // Geocode failed — just save label with zero coords
        setClusterLabel(idx, text.trim());
      }
    } catch {
      setClusterLabel(idx, text.trim());
    } finally {
      setGeocoding(null);
    }
  };

  const allLocationsSet = clusters.every(c => c.location?.label);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--eg-accent-light)', color: 'var(--eg-accent)',
          padding: '0.4rem 1.1rem', borderRadius: '100px',
          fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em',
          marginBottom: '1.25rem',
        }}>
          <Calendar size={13} /> {clusters.length} memory group{clusters.length !== 1 ? 's' : ''} detected
        </div>
        <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 600 }}>
          Where were these taken?
        </h3>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          We grouped your photos by trip or event. Add a location to any group that&apos;s missing one — the AI uses this to write richer stories.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
        {clusters.map((cluster, idx) => {
          const hasLocation = !!(cluster.location?.label);
          const isEditing = editingIdx === idx;
          const isGeocoding = geocoding === idx;
          const coverPhoto = cluster.photos[0];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: 'var(--eg-bg)',
                borderRadius: '1rem',
                border: hasLocation ? '1.5px solid rgba(163,177,138,0.35)' : '1.5px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                transition: 'border-color 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                {/* Thumbnail strip */}
                <div style={{
                  width: '80px', flexShrink: 0,
                  display: 'grid',
                  gridTemplateRows: cluster.photos.length > 1 ? '1fr 1fr' : '1fr',
                  gridTemplateColumns: '1fr',
                  overflow: 'hidden',
                }}>
                  {cluster.photos.slice(0, 2).map((p, pi) => (
                    <div key={pi} style={{ overflow: 'hidden', background: '#f0ebe4' }}>
                      <img
                        src={p.baseUrl
                          ? (p.baseUrl.includes('googleusercontent.com')
                            ? `/api/photos/proxy?url=${encodeURIComponent(p.baseUrl)}&w=120&h=120`
                            : p.baseUrl)
                          : ''}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '1.25rem 1.5rem' }}>
                  {/* Date range + photo count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--eg-muted)', fontWeight: 500 }}>
                      <Calendar size={13} />
                      {formatDateRange(cluster.startDate, cluster.endDate)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--eg-muted)' }}>
                      <Camera size={12} />
                      {cluster.photos.length} photo{cluster.photos.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Location */}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <MapPin size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--eg-accent)', opacity: 0.6 }} />
                        <input
                          autoFocus
                          type="text"
                          value={draftLocation}
                          onChange={e => setDraftLocation(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleGeocodeFromText(idx, draftLocation).then(() => setEditingIdx(null));
                            }
                            if (e.key === 'Escape') { setEditingIdx(null); setDraftLocation(''); }
                          }}
                          placeholder="City, Country (e.g. Santorini, Greece)"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                            borderRadius: '0.5rem', border: '1.5px solid var(--eg-accent)',
                            fontSize: 'max(16px, 0.9rem)', fontFamily: 'var(--eg-font-body)',
                            outline: 'none', background: 'var(--eg-bg)',
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          handleGeocodeFromText(idx, draftLocation).then(() => setEditingIdx(null));
                        }}
                        disabled={isGeocoding}
                        style={{
                          padding: '0.6rem 1rem', borderRadius: '0.5rem',
                          background: 'var(--eg-accent)', color: 'var(--eg-bg)',
                          border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem',
                          flexShrink: 0,
                        }}
                      >
                        {isGeocoding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingIdx(null); setDraftLocation(''); }}
                        style={{ padding: '0.6rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', color: 'var(--eg-muted)', fontSize: '0.85rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        {hasLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--eg-fg)' }}>
                            <MapPin size={14} color="var(--eg-accent)" />
                            {cluster.location!.label}
                            {cluster.location!.lat !== 0 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', fontWeight: 400, marginLeft: '0.25rem' }}>
                                (GPS verified)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--eg-muted)', fontStyle: 'italic' }}>
                            <MapPin size={14} style={{ opacity: 0.4 }} />
                            No location detected — add one for a richer story
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingIdx(idx);
                          setDraftLocation(cluster.location?.label ?? '');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.9rem', borderRadius: '100px',
                          border: '1px solid rgba(0,0,0,0.1)', background: hasLocation ? 'rgba(163,177,138,0.08)' : '#f5f5f5',
                          color: hasLocation ? 'var(--eg-accent)' : 'var(--eg-muted)',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.2s ease', flexShrink: 0,
                        }}
                      >
                        <Pencil size={11} />
                        {hasLocation ? 'Edit' : 'Add Location'}
                      </button>
                    </div>
                  )}

                  {/* Split / Merge controls */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                    {cluster.photos.length >= 2 && (
                      <button
                        onClick={() => {
                          // Split at the midpoint by default
                          const mid = Math.floor(cluster.photos.length / 2) - 1;
                          splitCluster(idx, mid);
                        }}
                        title="Split this group into two"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.35rem 0.7rem', borderRadius: '100px',
                          border: '1px solid rgba(0,0,0,0.08)', background: '#f9f9f9',
                          color: 'var(--eg-muted)', fontSize: '0.75rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <Scissors size={11} /> Split
                      </button>
                    )}
                    {idx < clusters.length - 1 && (
                      <button
                        onClick={() => mergeWithNext(idx)}
                        title="Merge with the group below"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.35rem 0.7rem', borderRadius: '100px',
                          border: '1px solid rgba(0,0,0,0.08)', background: '#f9f9f9',
                          color: 'var(--eg-muted)', fontSize: '0.75rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <Merge size={11} /> Merge with next
                      </button>
                    )}
                  </div>

                  {/* Note / blurb field */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={draftNotes[idx] ?? cluster.note ?? ''}
                        onChange={e => {
                          const val = e.target.value.slice(0, 120);
                          setDraftNotes(prev => ({ ...prev, [idx]: val }));
                          setClusterNote(idx, val);
                        }}
                        placeholder="e.g. Our first trip abroad, hiking in the mountains"
                        maxLength={120}
                        rows={1}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1.5px solid rgba(0,0,0,0.08)',
                          fontSize: 'max(16px, 0.9rem)',
                          fontFamily: 'var(--eg-font-body)',
                          color: 'var(--eg-fg)',
                          outline: 'none',
                          resize: 'none',
                          background: '#fafafa',
                          lineHeight: 1.5,
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', fontWeight: 500 }}>
                        What was happening here?
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)' }}>
                        {120 - ((draftNotes[idx] ?? cluster.note ?? '').length)} remaining
                      </span>
                    </div>
                  </div>
                </div>

                {/* Done indicator */}
                {hasLocation && !isEditing && (
                  <div style={{
                    width: '4px', alignSelf: 'stretch',
                    background: 'var(--eg-accent)', borderRadius: '0 1rem 1rem 0',
                    opacity: 0.6,
                  }} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.9rem 1.75rem', borderRadius: '0.75rem',
            border: '1px solid rgba(0,0,0,0.1)', background: 'var(--eg-bg)',
            color: 'var(--eg-fg)', fontSize: '0.95rem', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'var(--eg-bg)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
        >
          ← Back
        </button>
        <button
          onClick={() => onConfirm(clusters)}
          style={{
            flex: 1, padding: '1rem 1.5rem', borderRadius: '0.75rem',
            background: 'var(--eg-fg)', color: 'var(--eg-bg)',
            border: 'none', fontSize: '0.95rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.5rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            transition: 'opacity 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.16)'; }}
          onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; }}
        >
          Continue to Set Your Vibe →
        </button>
      </div>

      {!allLocationsSet && (
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--eg-muted)', marginTop: '1rem', opacity: 0.7 }}>
          Tip: Adding locations helps the AI write more personal, geographically-detailed stories for each chapter.
        </p>
      )}
    </div>
  );
}
