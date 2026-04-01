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
    pending:  { bg: 'rgba(255,193,7,0.18)',  color: '#b8860b', label: 'Pending' },
    approved: { bg: 'rgba(76,175,80,0.18)',  color: '#2e7d32', label: 'Approved' },
    rejected: { bg: 'rgba(244,67,54,0.18)',  color: '#c62828', label: 'Rejected' },
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
    background: activeTab === tab ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.45)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            Guest Photos
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            Review and approve photos shared by guests
          </p>
        </div>
        {pendingCount > 0 && (
          <span style={{
            background: '#f59e0b', color: '#000',
            borderRadius: '999px', padding: '2px 8px',
            fontSize: '0.72rem', fontWeight: 800,
          }}>
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '0.25rem' }}>
        {(['pending', 'approved', 'rejected'] as FilterTab[]).map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: '5px', background: '#f59e0b', color: '#000', borderRadius: '999px', padding: '1px 5px', fontSize: '0.65rem' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
            Loading photos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
            No {activeTab} photos
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {filtered.map(photo => (
              <div key={photo.id} style={{ borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo by ${photo.uploaderName}`}
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {photo.uploaderName}
                  </div>
                  {photo.caption && (
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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
                          background: 'rgba(76,175,80,0.25)', color: '#4caf50',
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
                          background: 'rgba(244,67,54,0.25)', color: '#f44336',
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
