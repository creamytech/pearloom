'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/PhotoModerationPanel.tsx
// Dashboard panel for couple to approve/reject guest photos.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import type { GuestPhoto } from '@/types';

interface PhotoModerationPanelProps {
  siteId: string;
}

type FilterTab = 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: GuestPhoto['status'] }) {
  const styles: Record<GuestPhoto['status'], { bg: string; color: string; label: string }> = {
    pending:  { bg: 'color-mix(in oklab, var(--pl-gold) 22%, transparent)',  color: 'var(--pl-gold)',                                              label: 'Pending' },
    approved: { bg: 'color-mix(in oklab, var(--pl-olive) 22%, transparent)', color: 'color-mix(in oklab, var(--pl-olive) 70%, var(--pl-ink))',     label: 'Approved' },
    rejected: { bg: 'color-mix(in oklab, var(--pl-plum) 22%, transparent)',  color: 'var(--pl-plum)',                                              label: 'Rejected' },
  };
  const s = styles[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '0.7rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export function PhotoModerationPanel({ siteId }: PhotoModerationPanelProps) {
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [moderating, setModerating] = useState<Set<string>>(new Set());

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all statuses in parallel
      const [pending, approved, rejected] = await Promise.all([
        fetch(`/api/guest-photos?siteId=${encodeURIComponent(siteId)}&status=pending`).then(r => r.json()) as Promise<{ photos: GuestPhoto[] }>,
        fetch(`/api/guest-photos?siteId=${encodeURIComponent(siteId)}&status=approved`).then(r => r.json()) as Promise<{ photos: GuestPhoto[] }>,
        fetch(`/api/guest-photos?siteId=${encodeURIComponent(siteId)}&status=rejected`).then(r => r.json()) as Promise<{ photos: GuestPhoto[] }>,
      ]);
      setPhotos([
        ...(pending.photos || []),
        ...(approved.photos || []),
        ...(rejected.photos || []),
      ]);
    } catch (err) {
      console.error('[PhotoModerationPanel] Failed to fetch photos:', err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const moderate = async (photoId: string, action: 'approved' | 'rejected') => {
    setModerating(prev => new Set(prev).add(photoId));
    try {
      const res = await fetch('/api/guest-photos/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, action }),
      });
      if (res.ok) {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status: action } : p));
      }
    } catch (err) {
      console.error('[PhotoModerationPanel] Moderation failed:', err);
    } finally {
      setModerating(prev => { const s = new Set(prev); s.delete(photoId); return s; });
    }
  };

  const pendingCount = photos.filter(p => p.status === 'pending').length;
  const filtered = photos.filter(p => p.status === activeTab);

  const tabStyle = (tab: FilterTab): React.CSSProperties => ({
    padding: '0.45rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    background: activeTab === tab ? 'rgba(0,0,0,0.07)' : 'transparent',
    color: activeTab === tab ? 'var(--pl-ink)' : 'var(--pl-muted)',
    transition: 'all var(--pl-dur-instant)',
  });

  return (
    <div style={{ background: 'rgba(163,177,138,0.05)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--pl-ink)' }}>
            Guest Photos
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--pl-ink-soft)' }}>
            Review and approve photos shared by guests
          </p>
        </div>
        {pendingCount > 0 && (
          <span style={{
            background: 'var(--pl-gold)', color: 'var(--pl-ink)',
            borderRadius: '999px', padding: '2px 8px',
            fontSize: '0.72rem', fontWeight: 800,
          }}>
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '0.25rem' }}>
        {(['pending', 'approved', 'rejected'] as FilterTab[]).map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: '5px', background: 'var(--pl-gold)', color: 'var(--pl-ink)', borderRadius: '999px', padding: '1px 5px', fontSize: '0.65rem' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pl-muted)', fontSize: '0.85rem' }}>
            Loading photos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pl-muted)', fontSize: '0.85rem' }}>
            No {activeTab} photos
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {filtered.map(photo => (
              <div key={photo.id} style={{ borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo by ${photo.uploaderName}`}
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--pl-ink)', fontWeight: 600, marginBottom: '3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {photo.uploaderName}
                  </div>
                  {photo.caption && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--pl-muted)', marginBottom: '5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {photo.caption}
                    </div>
                  )}
                  <StatusBadge status={photo.status} />
                  {photo.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <button
                        onClick={() => moderate(photo.id, 'approved')}
                        disabled={moderating.has(photo.id)}
                        title="Approve"
                        style={{
                          flex: 1, padding: '4px 0', border: 'none', borderRadius: '5px',
                          background: 'color-mix(in oklab, var(--pl-olive) 24%, transparent)', color: 'var(--pl-olive)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: moderating.has(photo.id) ? 0.5 : 1,
                        }}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => moderate(photo.id, 'rejected')}
                        disabled={moderating.has(photo.id)}
                        title="Reject"
                        style={{
                          flex: 1, padding: '4px 0', border: 'none', borderRadius: '5px',
                          background: 'color-mix(in oklab, var(--pl-plum) 24%, transparent)', color: 'var(--pl-plum)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: moderating.has(photo.id) ? 0.5 : 1,
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
