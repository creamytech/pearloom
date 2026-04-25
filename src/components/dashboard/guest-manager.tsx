'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/guest-manager.tsx
// Premium guest list and RSVP tracking dashboard.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { CustomSelect } from '@/components/ui/custom-select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, Check, X, Download,
  Search, ChevronDown, Loader2, RefreshCw, Share2,
} from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email?: string;
  status: 'attending' | 'declined' | 'pending';
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  songRequest?: string;
  message?: string;
  respondedAt?: string;
}

const STATUS_CONFIG: Record<Guest['status'], { label: string; color: string; bg: string }> = {
  attending: { label: 'Attending', color: 'var(--pl-olive)', bg: 'rgba(163,177,138,0.15)' },
  declined: { label: 'Declined', color: 'var(--pl-ink-soft)', bg: 'rgba(239,68,68,0.08)' },
  pending: { label: 'Pending', color: 'var(--pl-ink-soft)', bg: 'rgba(245,158,11,0.10)' },
};

interface GuestManagerProps {
  siteId: string;
  /** Optional share URL for the empty state */
  shareUrl?: string;
}

export function GuestManager({ siteId, shareUrl }: GuestManagerProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Guest['status']>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', email: '', plusOne: false });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchGuests(); }, [siteId]);

  const fetchGuests = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/guests?siteId=${siteId}`);
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setGuests(data.guests || []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load guest list. Try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const addGuest = async () => {
    if (!newGuest.name.trim()) return;
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...newGuest }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Failed to add guest. Please try again.');
        setTimeout(() => setAddError(null), 6000);
      } else if (data.guest) {
        setGuests((prev) => [...prev, data.guest]);
        setNewGuest({ name: '', email: '', plusOne: false });
        setAddOpen(false);
      }
    } catch {
      setAddError('Network error. Please check your connection and try again.');
      setTimeout(() => setAddError(null), 6000);
    } finally {
      setSaving(false);
    }
  };

  const deleteGuest = async (id: string) => {
    setDeleteError(null);
    const snapshot = guests;
    setGuests((prev) => prev.filter((g) => g.id !== id));
    try {
      const res = await fetch(`/api/guests/${id}?siteId=${siteId}`, { method: 'DELETE' });
      if (!res.ok) {
        setGuests(snapshot); // rollback
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || 'Failed to delete guest. Please try again.');
        setTimeout(() => setDeleteError(null), 6000);
      }
    } catch {
      setGuests(snapshot); // rollback
      setDeleteError('Network error. The guest was not deleted.');
      setTimeout(() => setDeleteError(null), 6000);
    }
  };

  const filtered = guests.filter((g) => {
    const matchSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: guests.length,
    attending: guests.filter((g) => g.status === 'attending').length,
    declined: guests.filter((g) => g.status === 'declined').length,
    pending: guests.filter((g) => g.status === 'pending').length,
    plusOnes: guests.filter((g) => g.plusOne && g.status === 'attending').length,
  };

  const exportCsv = () => {
    const header = 'Name,Email,Status,Plus One,Plus One Name,Meal,Dietary,Song Request,Message,Responded';
    const rows = filtered.map((g) =>
      [
        g.name, g.email || '', g.status,
        g.plusOne ? 'Yes' : 'No', g.plusOneName || '',
        g.mealPreference || '', g.dietaryRestrictions || '',
        g.songRequest || '', g.message || '', g.respondedAt || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guest-list-${siteId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const bulkUpdateStatus = useCallback(async (status: 'attending' | 'declined' | 'pending') => {
    const ids = Array.from(selectedIds);
    // Optimistic update
    setGuests(prev => prev.map(g => ids.includes(g.id) ? { ...g, status } : g));
    setSelectedIds(new Set());
    // Persist
    await Promise.all(ids.map(id =>
      fetch(`/api/guests?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    ));
  }, [selectedIds]);

  const inputBase: React.CSSProperties = {
    padding: '0.7rem 1rem',
    borderRadius: 'var(--pl-radius-lg)',
    border: '1px solid rgba(255,255,255,0.4)',
    outline: 'none',
    fontSize: 'max(16px, 0.9rem)',
    background: 'rgba(255,255,255,0.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--pl-font-body)',
    color: 'var(--pl-ink)',
    transition: 'border-color var(--pl-dur-fast)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: `${stats.total} total`, color: 'var(--pl-ink)', bg: 'rgba(255,255,255,0.45)' },
          { label: `${stats.attending} attending`, color: 'var(--pl-olive)', bg: 'rgba(163,177,138,0.15)' },
          { label: `${stats.declined} declined`, color: 'var(--pl-ink-soft)', bg: 'rgba(239,68,68,0.08)' },
          { label: `${stats.pending} pending`, color: 'var(--pl-ink-soft)', bg: 'rgba(245,158,11,0.10)' },
          ...(stats.plusOnes > 0
            ? [{ label: `${stats.plusOnes} plus ones`, color: 'var(--pl-olive)', bg: 'rgba(163,177,138,0.10)' }]
            : []),
        ].map((s) => (
          <span
            key={s.label}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0.3rem 0.8rem', borderRadius: 'var(--pl-radius-full)',
              fontSize: '0.75rem', fontWeight: 700,
              color: s.color, background: s.bg,
            }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: '1 1 200px', position: 'relative', minWidth: '160px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-muted)', pointerEvents: 'none' }} />
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, paddingLeft: '2.5rem' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
          />
        </div>

        {/* Status filter */}
        <div style={{ minWidth: 160 }}>
          <CustomSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as typeof filterStatus)}
            options={[
              { value: 'all',       label: 'All guests' },
              { value: 'attending', label: 'Attending' },
              { value: 'declined',  label: 'Declined' },
              { value: 'pending',   label: 'Pending' },
            ]}
          />
        </div>

        <button
          onClick={fetchGuests}
          aria-label="Refresh guest list"
          style={{ padding: '0.7rem', borderRadius: 'var(--pl-radius-lg)', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', color: 'var(--pl-muted)', transition: 'background var(--pl-dur-instant)' } as React.CSSProperties}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
        >
          <RefreshCw size={15} />
        </button>

        <button
          onClick={exportCsv}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.7rem 1rem', borderRadius: 'var(--pl-radius-lg)',
            border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-body)',
            transition: 'background var(--pl-dur-instant)',
          } as React.CSSProperties}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
        >
          <Download size={14} />
          Export CSV
        </button>

        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.7rem 1.25rem', borderRadius: 'var(--pl-radius-lg)',
            background: 'var(--pl-olive)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          <Plus size={15} />
          Add Guest
        </button>
      </div>

      {/* ── Add Guest form ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 'var(--pl-radius-xl)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
              padding: '1.5rem',
            } as React.CSSProperties}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}
              className="add-guest-grid"
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.4rem' }}>
                  Guest Name *
                </label>
                <input
                  placeholder="Full Name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest((p) => ({ ...p, name: e.target.value }))}
                  style={inputBase}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.4rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest((p) => ({ ...p, email: e.target.value }))}
                  style={inputBase}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '0.1rem' }}>
                <Switch
                  checked={newGuest.plusOne}
                  onChange={(checked) => setNewGuest((p) => ({ ...p, plusOne: checked }))}
                  label="+1 Allowed"
                />
              </div>
              {addError && (
                <div style={{ gridColumn: '1 / -1', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 'var(--pl-radius-lg)', fontSize: '0.8rem', color: 'var(--pl-ink-soft)' } as React.CSSProperties}>
                  {addError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={addGuest}
                  disabled={saving || !newGuest.name.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.7rem 1.1rem', borderRadius: '0.65rem',
                    background: 'var(--pl-olive)', color: '#fff',
                    border: 'none', cursor: saving || !newGuest.name.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '0.8rem', opacity: !newGuest.name.trim() ? 0.5 : 1,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                  Add
                </button>
                <button
                  onClick={() => setAddOpen(false)}
                  style={{ padding: '0.7rem', borderRadius: 'var(--pl-radius-lg)', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', color: 'var(--pl-muted)' } as React.CSSProperties}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk action toolbar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 'var(--pl-radius-xl)', padding: '0.75rem 1rem',
          boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {selectedIds.size} selected
          </span>
          {(['attending', 'declined', 'pending'] as const).map(status => (
            <button
              key={status}
              onClick={() => bulkUpdateStatus(status)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: 'var(--pl-radius-lg)',
                background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              Mark {status}
            </button>
          ))}
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Guest Table / Cards ── */}
      <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 'var(--pl-radius-xl)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', overflow: 'hidden' } as React.CSSProperties}>
        {/* Table header (desktop) */}
        <div
          className="guest-table-header"
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 180px 110px 70px 120px 36px',
            padding: '0.75rem 1.25rem',
            background: 'rgba(255,255,255,0.25)',
            borderBottom: '1px solid rgba(255,255,255,0.3)',
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--pl-muted)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              className="accent-olive cursor-pointer w-4 h-4 rounded"
              checked={filtered.length > 0 && filtered.every(g => selectedIds.has(g.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set(filtered.map(g => g.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
            />
          </span>
          <span>Guest</span>
          <span>Email</span>
          <span>Status</span>
          <span>+1</span>
          <span>Responded</span>
          <span />
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 size={24} color="var(--pl-muted)" style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : fetchError ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--pl-ink-soft)', fontSize: '0.875rem', marginBottom: '1rem' }}>{fetchError}</p>
            <button onClick={fetchGuests} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: 'var(--pl-radius-lg)', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-body)' } as React.CSSProperties}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : filtered.length === 0 && guests.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Users size={40} color="rgba(0,0,0,0.1)" style={{ margin: '0 auto 1.25rem' }} />
            <h4 style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.3rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--pl-ink)' }}>
              No RSVPs yet
            </h4>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '320px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
              Share your site to start collecting responses from your guests.
            </p>
            {shareUrl && (
              <button
                onClick={copyShareLink}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem', borderRadius: 'var(--pl-radius-full)',
                  background: copiedShare ? 'rgba(34,197,94,0.1)' : 'rgba(163,177,138,0.1)',
                  color: copiedShare ? '#16a34a' : 'var(--pl-olive)',
                  border: `1px solid ${copiedShare ? 'rgba(34,197,94,0.2)' : 'rgba(163,177,138,0.2)'}`,
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  fontFamily: 'var(--pl-font-body)', transition: 'all var(--pl-dur-fast)',
                }}
              >
                {copiedShare ? <Check size={15} /> : <Share2 size={15} />}
                {copiedShare ? 'Link Copied!' : 'Copy Site Link'}
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.875rem' }}>No guests match your search.</p>
          </div>
        ) : (
          filtered.map((guest, i) => {
            const sc = STATUS_CONFIG[guest.status];
            const isExpanded = expandedId === guest.id;

            return (
              <div key={guest.id}>
                {/* Desktop table row */}
                <div
                  className="guest-table-row"
                  onClick={() => setExpandedId(isExpanded ? null : guest.id)}
                  role="button"
                  aria-expanded={isExpanded}
                  aria-label="Show guest details"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 180px 110px 70px 120px 36px',
                    padding: '0.875rem 1.25rem',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.1)',
                    transition: 'background var(--pl-dur-instant)',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.1)'; }}
                >
                  <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      className="accent-olive cursor-pointer w-4 h-4 rounded"
                      checked={selectedIds.has(guest.id)}
                      onChange={(e) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(guest.id);
                          else next.delete(guest.id);
                          return next;
                        });
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pl-ink)' }}>{guest.name}</div>
                    {guest.songRequest && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                        Song: {guest.songRequest}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pl-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {guest.email ? (
                      <a
                        href={`mailto:${guest.email}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          borderBottom: '1px dotted rgba(0,0,0,0.25)',
                          transition: 'border-color var(--pl-dur-instant)',
                        }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--pl-olive, #5C6B3F)'; }}
                        onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderBottomColor = 'rgba(0,0,0,0.25)'; }}
                      >
                        {guest.email}
                      </a>
                    ) : '—'}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.22rem 0.7rem', borderRadius: 'var(--pl-radius-full)',
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
                      background: sc.bg, color: sc.color,
                    }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: guest.plusOne ? 'var(--pl-olive)' : 'var(--pl-muted)', fontWeight: guest.plusOne ? 600 : 400 }}>
                    {guest.plusOne ? 'Yes' : '—'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)' }}>
                    {guest.respondedAt ? new Date(guest.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGuest(guest.id); }}
                    aria-label={`Delete ${guest.name}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.4)', display: 'flex', padding: '0.25rem', transition: 'color var(--pl-dur-instant)' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.4)'; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden', background: 'rgba(163,177,138,0.04)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {guest.plusOneName && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--pl-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>+1 Name</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--pl-ink)' }}>{guest.plusOneName}</p>
                          </div>
                        )}
                        {guest.mealPreference && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--pl-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Meal</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--pl-ink)' }}>{guest.mealPreference}</p>
                          </div>
                        )}
                        {guest.dietaryRestrictions && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--pl-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dietary</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--pl-ink)' }}>{guest.dietaryRestrictions}</p>
                          </div>
                        )}
                        {guest.songRequest && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--pl-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Song Request</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--pl-ink)', fontStyle: 'italic' }}>{guest.songRequest}</p>
                          </div>
                        )}
                        {guest.message && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.5 }}>
                              Message
                            </span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--pl-ink)', lineHeight: 1.5 }}>
                              "{guest.message}"
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {deleteError && (
        <div style={{ padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 'var(--pl-radius-xl)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', fontSize: '0.8rem', color: 'var(--pl-ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' } as React.CSSProperties}>
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-ink-soft)', padding: 0, fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', textAlign: 'center' }}>
          Showing {filtered.length} of {guests.length} guests
        </p>
      )}

      <style>{`
        }
        @media (max-width: 768px) {
          .guest-table-header { display: none !important; }
          .guest-table-row {
            grid-template-columns: 1fr auto !important;
            grid-template-rows: auto auto;
          }
          .add-guest-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
