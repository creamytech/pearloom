'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/guest-manager.tsx
// Premium guest list and RSVP tracking dashboard.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
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
  attending: { label: 'Attending', color: '#3d7a4a', bg: 'rgba(163,177,138,0.15)' },
  declined: { label: 'Declined', color: '#b91c1c', bg: 'rgba(239,68,68,0.08)' },
  pending: { label: 'Pending', color: '#92400e', bg: 'rgba(245,158,11,0.10)' },
};

interface GuestManagerProps {
  siteId: string;
  /** Optional share URL for the empty state */
  shareUrl?: string;
}

export function GuestManager({ siteId, shareUrl }: GuestManagerProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Guest['status']>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', email: '', plusOne: false });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => { fetchGuests(); }, [siteId]);

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guests?siteId=${siteId}`);
      const data = await res.json();
      setGuests(data.guests || []);
    } catch (e) {
      console.error('Failed to fetch guests', e);
    } finally {
      setLoading(false);
    }
  };

  const addGuest = async () => {
    if (!newGuest.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...newGuest }),
      });
      const data = await res.json();
      if (data.guest) {
        setGuests((prev) => [...prev, data.guest]);
        setNewGuest({ name: '', email: '', plusOne: false });
        setAddOpen(false);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const deleteGuest = async (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/guests/${id}?siteId=${siteId}`, { method: 'DELETE' }).catch(console.error);
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

  const inputBase: React.CSSProperties = {
    padding: '0.7rem 1rem',
    borderRadius: '0.65rem',
    border: '1.5px solid rgba(0,0,0,0.08)',
    outline: 'none',
    fontSize: 'max(16px, 0.9rem)',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--eg-font-body)',
    color: 'var(--eg-fg)',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: `${stats.total} total`, color: 'var(--eg-fg)', bg: 'rgba(0,0,0,0.05)' },
          { label: `${stats.attending} attending`, color: '#3d7a4a', bg: 'rgba(163,177,138,0.15)' },
          { label: `${stats.declined} declined`, color: '#b91c1c', bg: 'rgba(239,68,68,0.08)' },
          { label: `${stats.pending} pending`, color: '#92400e', bg: 'rgba(245,158,11,0.10)' },
          ...(stats.plusOnes > 0
            ? [{ label: `${stats.plusOnes} plus ones`, color: 'var(--eg-accent)', bg: 'rgba(163,177,138,0.10)' }]
            : []),
        ].map((s) => (
          <span
            key={s.label}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0.3rem 0.8rem', borderRadius: '100px',
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
          <Search size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--eg-muted)', pointerEvents: 'none' }} />
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, paddingLeft: '2.5rem' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--eg-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
          />
        </div>

        {/* Status filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            style={{
              padding: '0.7rem 2.5rem 0.7rem 1rem',
              borderRadius: '0.65rem',
              border: '1.5px solid rgba(0,0,0,0.08)',
              background: '#fff', fontSize: 'max(16px, 0.85rem)',
              fontWeight: 600, appearance: 'none', cursor: 'pointer',
              fontFamily: 'var(--eg-font-body)', color: 'var(--eg-fg)',
            }}
          >
            <option value="all">All Guests</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--eg-muted)' }} />
        </div>

        <button
          onClick={fetchGuests}
          style={{ padding: '0.7rem', borderRadius: '0.65rem', border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', display: 'flex', color: 'var(--eg-muted)', transition: 'background 0.15s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <RefreshCw size={15} />
        </button>

        <button
          onClick={exportCsv}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.7rem 1rem', borderRadius: '0.65rem',
            border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <Download size={14} />
          Export CSV
        </button>

        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.7rem 1.25rem', borderRadius: '0.65rem',
            background: 'var(--eg-fg)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
            fontFamily: 'var(--eg-font-body)',
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
              overflow: 'hidden', background: '#fff',
              borderRadius: '0.75rem',
              border: '1px solid rgba(0,0,0,0.06)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}
              className="add-guest-grid"
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>
                  Guest Name *
                </label>
                <input
                  placeholder="Full Name"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest((p) => ({ ...p, name: e.target.value }))}
                  style={inputBase}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--eg-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest((p) => ({ ...p, email: e.target.value }))}
                  style={inputBase}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--eg-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', paddingBottom: '0.1rem' }}>
                <input
                  type="checkbox"
                  checked={newGuest.plusOne}
                  onChange={(e) => setNewGuest((p) => ({ ...p, plusOne: e.target.checked }))}
                  style={{ accentColor: 'var(--eg-accent)' }}
                />
                +1 Allowed
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={addGuest}
                  disabled={saving || !newGuest.name.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.7rem 1.1rem', borderRadius: '0.65rem',
                    background: 'var(--eg-accent)', color: '#fff',
                    border: 'none', cursor: saving || !newGuest.name.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '0.8rem', opacity: !newGuest.name.trim() ? 0.5 : 1,
                    fontFamily: 'var(--eg-font-body)',
                  }}
                >
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                  Add
                </button>
                <button
                  onClick={() => setAddOpen(false)}
                  style={{ padding: '0.7rem', borderRadius: '0.65rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', display: 'flex', color: 'var(--eg-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guest Table / Cards ── */}
      <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Table header (desktop) */}
        <div
          className="guest-table-header"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px 110px 70px 120px 36px',
            padding: '0.75rem 1.25rem',
            background: 'rgba(0,0,0,0.015)',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--eg-muted)',
          }}
        >
          <span>Guest</span>
          <span>Email</span>
          <span>Status</span>
          <span>+1</span>
          <span>Responded</span>
          <span />
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 size={24} color="var(--eg-muted)" style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 && guests.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Users size={40} color="rgba(0,0,0,0.1)" style={{ margin: '0 auto 1.25rem' }} />
            <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.3rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--eg-fg)' }}>
              No RSVPs yet
            </h4>
            <p style={{ color: 'var(--eg-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '320px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
              Share your site to start collecting responses from your guests.
            </p>
            {shareUrl && (
              <button
                onClick={copyShareLink}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem', borderRadius: '100px',
                  background: copiedShare ? 'rgba(34,197,94,0.1)' : 'rgba(163,177,138,0.1)',
                  color: copiedShare ? '#16a34a' : 'var(--eg-accent)',
                  border: `1px solid ${copiedShare ? 'rgba(34,197,94,0.2)' : 'rgba(163,177,138,0.2)'}`,
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  fontFamily: 'var(--eg-font-body)', transition: 'all 0.2s',
                }}
              >
                {copiedShare ? <Check size={15} /> : <Share2 size={15} />}
                {copiedShare ? 'Link Copied!' : 'Copy Site Link'}
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--eg-muted)', fontSize: '0.875rem' }}>No guests match your search.</p>
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
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 180px 110px 70px 120px 36px',
                    padding: '0.875rem 1.25rem',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.008)',
                    transition: 'background 0.12s',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.04)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.008)'; }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--eg-fg)' }}>{guest.name}</div>
                    {guest.songRequest && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--eg-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                        Song: {guest.songRequest}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {guest.email || '—'}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.22rem 0.7rem', borderRadius: '100px',
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
                      background: sc.bg, color: sc.color,
                    }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: guest.plusOne ? 'var(--eg-accent)' : 'var(--eg-muted)', fontWeight: guest.plusOne ? 600 : 400 }}>
                    {guest.plusOne ? 'Yes' : '—'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--eg-muted)' }}>
                    {guest.respondedAt ? new Date(guest.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGuest(guest.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.4)', display: 'flex', padding: '0.25rem', transition: 'color 0.15s' }}
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
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>+1 Name</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--eg-fg)' }}>{guest.plusOneName}</p>
                          </div>
                        )}
                        {guest.mealPreference && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Meal</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--eg-fg)' }}>{guest.mealPreference}</p>
                          </div>
                        )}
                        {guest.dietaryRestrictions && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dietary</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--eg-fg)' }}>{guest.dietaryRestrictions}</p>
                          </div>
                        )}
                        {guest.songRequest && (
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Song Request</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--eg-fg)', fontStyle: 'italic' }}>{guest.songRequest}</p>
                          </div>
                        )}
                        {guest.message && (
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Message</span>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--eg-muted)' }}>
                              &ldquo;{guest.message}&rdquo;
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

      {filtered.length > 0 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', textAlign: 'center' }}>
          Showing {filtered.length} of {guests.length} guests
        </p>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
