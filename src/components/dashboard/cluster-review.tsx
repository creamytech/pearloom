'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/cluster-review.tsx
// Step between photo selection and vibe entry.
// Shows the photo clusters (grouped by date) and lets users
// manually enter a location for any clusters missing GPS data.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Camera, Pencil, Check, Loader2, Scissors, Merge, Sparkles, X, ArrowLeft, ArrowRight } from 'lucide-react';
import type { GooglePhotoMetadata, PhotoCluster, GeoLocation } from '@/types';
import { clusterPhotos } from '@/lib/google-photos';
import { colors as C, text, card } from '@/lib/design-tokens';

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
  const [aiSuggesting, setAiSuggesting] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, { location: string; confidence: string; reason: string; suggestedTitle?: string }>>({});
  const [storyAdvice, setStoryAdvice] = useState<{ arcQuality: string; arcSummary: string; strengths: string[]; suggestions: string[] } | null>(null);
  const [storyAdviceLoading, setStoryAdviceLoading] = useState(false);
  const [storyAdviceDismissed, setStoryAdviceDismissed] = useState(false);

  useEffect(() => {
    // Cluster the photos whenever the photo set changes
    // Default gap: 2 days — consecutive days at different locations stay separate
    const built = clusterPhotos(photos, 2);
    setClusters(built);

    // Auto-resolve locations for all clusters:
    // 1. Reverse-geocode clusters that have GPS coords but no label
    // 2. AI-suggest for clusters with no GPS data at all
    const autoResolve = async () => {
      const updates: { idx: number; location: GeoLocation }[] = [];
      const aiTargets: number[] = [];

      for (let i = 0; i < built.length; i++) {
        const c = built[i];
        if (c.location && c.location.lat !== 0 && c.location.lng !== 0 && !c.location.label) {
          // Has GPS, needs reverse geocode
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${c.location.lat}&lon=${c.location.lng}&format=json&zoom=10`,
              { headers: { 'User-Agent': 'pearloom/1.0' }, signal: AbortSignal.timeout(5000) }
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address ?? {};
              const label = [addr.city || addr.town || addr.village, addr.state || addr.country]
                .filter(Boolean)
                .join(', ');
              if (label) {
                updates.push({ idx: i, location: { ...c.location, label, needsReverseGeocode: false } });
              }
            }
          } catch {}
        } else if (!c.location || (c.location.lat === 0 && c.location.lng === 0 && !c.location.label)) {
          // No GPS at all — queue for AI suggestion
          aiTargets.push(i);
        }
      }

      // Apply GPS reverse-geocode results
      if (updates.length > 0) {
        setClusters(prev => prev.map((c, i) => {
          const u = updates.find(u => u.idx === i);
          return u ? { ...c, location: u.location } : c;
        }));
      }

      // Trigger AI suggestions for clusters without GPS (max 5 at once)
      for (const idx of aiTargets.slice(0, 5)) {
        triggerAiSuggest(idx, built[idx]);
      }
    };

    if (built.length > 0) autoResolve();
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI suggest helper — extracted so it can be called from auto-resolve and button
  const triggerAiSuggest = useCallback(async (idx: number, cluster: PhotoCluster) => {
    if (!cluster) return;
    setAiSuggesting(idx);
    try {
      const res = await fetch('/api/suggest-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: cluster.photos.slice(0, 20).map(p => ({
            filename: p.filename,
            creationTime: p.creationTime,
            cameraMake: p.cameraMake,
            cameraModel: p.cameraModel,
            description: p.description,
            latitude: p.location?.latitude,
            longitude: p.location?.longitude,
          })),
          clusterLabel: cluster.suggestedTitle,
        }),
      });
      const data = await res.json();
      if (data.location) {
        setAiSuggestions(prev => ({ ...prev, [idx]: data }));
      } else {
        setAiSuggestions(prev => ({ ...prev, [idx]: { location: '', confidence: 'low', reason: data.reason || 'Could not determine location' } }));
      }
    } catch {
      setAiSuggestions(prev => ({ ...prev, [idx]: { location: '', confidence: 'low', reason: 'Request failed' } }));
    } finally {
      setAiSuggesting(null);
    }
  }, []);

  // Auto-fetch story arc advice when clusters are ready
  useEffect(() => {
    if (clusters.length >= 2 && !storyAdvice && !storyAdviceLoading && !storyAdviceDismissed) {
      setStoryAdviceLoading(true);
      fetch('/api/story-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusters: clusters.map(c => ({
            startDate: c.startDate, endDate: c.endDate,
            location: c.location, note: c.note,
            photos: c.photos.map(p => ({ filename: p.filename, creationTime: p.creationTime })),
          })),
        }),
      })
        .then(r => r.json())
        .then(data => { if (data.arcQuality) setStoryAdvice(data); })
        .catch(() => {})
        .finally(() => setStoryAdviceLoading(false));
    }
  }, [clusters.length >= 2]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Ask AI to suggest a location based on photo metadata
  const suggestLocation = useCallback(async (idx: number) => {
    const cluster = clusters[idx];
    triggerAiSuggest(idx, cluster);
  }, [clusters, triggerAiSuggest]);

  const acceptSuggestion = (idx: number) => {
    const suggestion = aiSuggestions[idx];
    if (!suggestion?.location) return;
    // Set the label, then geocode to get coords
    setClusterLabel(idx, suggestion.location);
    handleGeocodeFromText(idx, suggestion.location);
    // Also set the suggested title as the cluster note if available
    if (suggestion.suggestedTitle && !clusters[idx]?.note) {
      setClusterNote(idx, suggestion.suggestedTitle);
    }
    setAiSuggestions(prev => { const next = { ...prev }; delete next[idx]; return next; });
  };

  const allLocationsSet = clusters.every(c => c.location?.label);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: 'var(--pl-olive)',
          padding: '0.4rem 1.1rem', borderRadius: '100px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
          fontSize: text.sm, fontWeight: 600, letterSpacing: '0.04em',
          marginBottom: '1.25rem',
        } as React.CSSProperties}>
          <Calendar size={13} /> {clusters.length} memory group{clusters.length !== 1 ? 's' : ''} detected
        </div>
        <h3 style={{ fontFamily: 'var(--pl-font-heading)', fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 600 }}>
          Where were these taken?
        </h3>
        <p style={{ color: 'var(--pl-muted)', fontSize: text.md, lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
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
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: hasLocation ? '1px solid var(--pl-olive)' : '1px solid rgba(255,255,255,0.5)',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
                transition: 'border-color 0.25s ease',
              } as React.CSSProperties}
            >
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                {/* Thumbnail */}
                <div style={{
                  width: '80px', flexShrink: 0,
                  overflow: 'hidden',
                  background: 'var(--pl-cream-deep)',
                }}>
                  <img
                    src={coverPhoto?.baseUrl
                      ? (coverPhoto.baseUrl.includes('googleusercontent.com')
                        ? `/api/photos/proxy?url=${encodeURIComponent(coverPhoto.baseUrl)}&w=160&h=160`
                        : coverPhoto.baseUrl)
                      : ''}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '1.25rem 1.5rem' }}>
                  {/* Date range + photo count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: text.sm, color: 'var(--pl-muted)', fontWeight: 500 }}>
                      <Calendar size={13} />
                      {formatDateRange(cluster.startDate, cluster.endDate)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: text.sm, color: 'var(--pl-muted)' }}>
                      <Camera size={12} />
                      {cluster.photos.length} photo{cluster.photos.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Location */}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <MapPin size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-olive)', opacity: 0.6 }} />
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
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.4)',
                            fontSize: 'max(16px, 0.9rem)', fontFamily: 'var(--pl-font-body)',
                            outline: 'none',
                            background: 'rgba(255,255,255,0.35)',
                            backdropFilter: 'blur(8px)',
                          } as React.CSSProperties}
                        />
                      </div>
                      <button
                        onClick={() => {
                          handleGeocodeFromText(idx, draftLocation).then(() => setEditingIdx(null));
                        }}
                        disabled={isGeocoding}
                        style={{
                          padding: '0.6rem 1rem', borderRadius: '12px',
                          background: 'var(--pl-olive)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: text.sm,
                          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem',
                          flexShrink: 0,
                        }}
                      >
                        {isGeocoding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingIdx(null); setDraftLocation(''); }}
                        style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', color: 'var(--pl-muted)', fontSize: text.sm } as React.CSSProperties}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        {hasLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: text.md, fontWeight: 600, color: 'var(--pl-ink)' }}>
                            <MapPin size={14} color="var(--pl-olive)" />
                            {cluster.location!.label}
                            {cluster.location!.lat !== 0 && (
                              <span style={{ fontSize: text.xs, color: 'var(--pl-muted)', fontWeight: 400, marginLeft: '0.25rem' }}>
                                (GPS verified)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              fontSize: text.sm, color: 'var(--pl-olive-deep)',
                              padding: '0.5rem 0.75rem', borderRadius: '12px',
                              background: 'rgba(163,177,138,0.08)',
                              border: '1px solid rgba(163,177,138,0.15)',
                            }}>
                              <MapPin size={14} style={{ color: 'var(--pl-olive)', flexShrink: 0 }} />
                              Add a location to help AI write a richer story
                            </div>
                            {/* AI suggestion result */}
                            {aiSuggestions[idx] && aiSuggestions[idx].location && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem',
                                padding: '0.5rem 0.75rem', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.4)',
                              } as React.CSSProperties}>
                                <Sparkles size={13} color="var(--pl-olive)" />
                                <span style={{ fontSize: text.sm, color: 'var(--pl-ink)', fontWeight: 500, flex: 1 }}>
                                  {aiSuggestions[idx].location}
                                  <span style={{ fontSize: text.xs, color: 'var(--pl-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>
                                    ({aiSuggestions[idx].confidence})
                                  </span>
                                  {aiSuggestions[idx].suggestedTitle && (
                                    <span style={{ display: 'block', fontSize: text.xs, color: 'var(--pl-olive)', fontWeight: 500, marginTop: '0.15rem', fontStyle: 'italic' }}>
                                      &ldquo;{aiSuggestions[idx].suggestedTitle}&rdquo;
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => acceptSuggestion(idx)}
                                  style={{
                                    padding: '0.3rem 0.7rem', borderRadius: '100px',
                                    background: 'var(--pl-olive)', color: '#fff', border: 'none',
                                    fontSize: text.xs, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                  }}
                                >Accept</button>
                                <button
                                  onClick={() => setAiSuggestions(prev => { const n = { ...prev }; delete n[idx]; return n; })}
                                  style={{
                                    padding: '0.3rem 0.5rem', borderRadius: '100px',
                                    background: 'rgba(255,255,255,0.35)', color: 'var(--pl-muted)',
                                    border: '1px solid rgba(255,255,255,0.4)',
                                    backdropFilter: 'blur(8px)',
                                    fontSize: text.xs, cursor: 'pointer', flexShrink: 0,
                                  } as React.CSSProperties}
                                >Dismiss</button>
                              </div>
                            )}
                            {aiSuggestions[idx] && !aiSuggestions[idx].location && (
                              <div style={{ fontSize: text.xs, color: 'var(--pl-muted)', marginTop: '0.35rem' }}>
                                Could not suggest — please add manually
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        {!hasLocation && !aiSuggestions[idx] && (
                          <button
                            onClick={() => suggestLocation(idx)}
                            disabled={aiSuggesting === idx}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.35rem',
                              padding: '0.45rem 0.9rem', borderRadius: '100px',
                              border: '1px solid rgba(255,255,255,0.5)',
                              background: 'rgba(255,255,255,0.45)',
                              backdropFilter: 'blur(20px)',
                              WebkitBackdropFilter: 'blur(20px)',
                              color: 'var(--pl-olive)',
                              fontSize: text.sm, fontWeight: 600, cursor: 'pointer',
                              transition: 'all var(--pl-dur-fast) var(--pl-ease-out)', flexShrink: 0,
                              opacity: aiSuggesting === idx ? 0.7 : 1,
                              boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
                            } as React.CSSProperties}
                          >
                            {aiSuggesting === idx ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
                            {aiSuggesting === idx ? 'Thinking...' : 'AI Suggest'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingIdx(idx);
                            setDraftLocation(cluster.location?.label ?? '');
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.45rem 0.9rem', borderRadius: '100px',
                            border: '1px solid rgba(255,255,255,0.5)',
                            background: 'rgba(255,255,255,0.45)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            color: hasLocation ? 'var(--pl-olive)' : 'var(--pl-muted)',
                            fontSize: text.sm, fontWeight: 600, cursor: 'pointer',
                            transition: 'all var(--pl-dur-fast) var(--pl-ease-out)', flexShrink: 0,
                            boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
                          } as React.CSSProperties}
                        >
                          <Pencil size={11} />
                          {hasLocation ? 'Edit' : 'Manual'}
                        </button>
                      </div>
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
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.4rem 0.85rem', borderRadius: '100px',
                          border: '1px solid rgba(163,177,138,0.25)',
                          background: 'rgba(163,177,138,0.08)',
                          color: 'var(--pl-olive-deep)', fontSize: text.xs, fontWeight: 600,
                          cursor: 'pointer', transition: 'all var(--pl-dur-fast)',
                          minHeight: '28px',
                        }}
                      >
                        <Scissors size={12} /> Split
                      </button>
                    )}
                    {idx < clusters.length - 1 && (
                      <button
                        onClick={() => mergeWithNext(idx)}
                        title="Merge with the group below"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.4rem 0.85rem', borderRadius: '100px',
                          border: '1px solid rgba(163,177,138,0.25)',
                          background: 'rgba(163,177,138,0.08)',
                          color: 'var(--pl-olive-deep)', fontSize: text.xs, fontWeight: 600,
                          cursor: 'pointer', transition: 'all var(--pl-dur-fast)',
                          minHeight: '28px',
                        }}
                      >
                        <Merge size={12} /> Merge with next
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
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.4)',
                          fontSize: 'max(16px, 0.9rem)',
                          fontFamily: 'var(--pl-font-body)',
                          color: 'var(--pl-ink)',
                          outline: 'none',
                          resize: 'none',
                          background: 'rgba(255,255,255,0.35)',
                          backdropFilter: 'blur(8px)',
                          lineHeight: 1.5,
                          transition: 'border-color var(--pl-dur-fast)',
                        } as React.CSSProperties}
                        onFocus={e => { e.target.style.borderColor = 'var(--pl-olive)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--pl-muted)' }}>
                        What was happening here?
                      </label>
                      <span style={{ fontSize: text.xs, color: 'var(--pl-muted)' }}>
                        {120 - ((draftNotes[idx] ?? cluster.note ?? '').length)} remaining
                      </span>
                    </div>
                  </div>
                </div>

                {/* Done indicator */}
                {hasLocation && !isEditing && (
                  <div style={{
                    width: '3px', alignSelf: 'stretch',
                    background: 'var(--pl-olive)', borderRadius: '0 16px 16px 0',
                    opacity: 0.5,
                  }} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Story Arc Advisor */}
      {storyAdvice && !storyAdviceDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: '1.5rem', padding: '1.25rem 1.5rem',
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Sparkles size={14} color="var(--pl-olive)" />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--pl-olive)', textTransform: 'uppercase', letterSpacing: '0.1em' } as React.CSSProperties}>
                Story Arc: {storyAdvice.arcQuality === 'strong' ? 'Excellent' : storyAdvice.arcQuality === 'good' ? 'Good' : 'Could be stronger'}
              </span>
            </div>
            <button
              onClick={() => setStoryAdviceDismissed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', fontSize: text.xs, flexShrink: 0 }}
            >Dismiss</button>
          </div>
          <p style={{ fontSize: text.base, color: 'var(--pl-ink)', marginBottom: '0.5rem', lineHeight: 1.5 }}>{storyAdvice.arcSummary}</p>
          {storyAdvice.suggestions.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: text.sm, color: 'var(--pl-muted)', lineHeight: 1.6 }}>
              {storyAdvice.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </motion.div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.9rem 1.75rem', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: 'var(--pl-ink)', fontSize: text.base, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'background 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
          } as React.CSSProperties}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={() => onConfirm(clusters)}
          style={{
            flex: 1, padding: '1rem 1.5rem', borderRadius: '16px',
            background: 'var(--pl-ink)', color: '#fff',
            border: 'none', fontSize: text.base, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.5rem',
            boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
            transition: 'opacity 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Continue to Set Your Vibe <ArrowRight size={14} />
        </button>
      </div>

      {!allLocationsSet && (
        <p style={{ textAlign: 'center', fontSize: text.sm, color: 'var(--pl-muted)', marginTop: '1rem', opacity: 0.7 }}>
          Tip: Adding locations helps the AI write more personal, geographically-detailed stories for each chapter.
        </p>
      )}
    </div>
  );
}
