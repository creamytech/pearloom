'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/guest-manager.tsx
// Full guest list CRUD + RSVP tracking dashboard for site owners
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, Check, X, Download,
  Search, ChevronDown, Loader2, RefreshCw
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
  message?: string;
  respondedAt?: string;
}

const STATUS_CONFIG = {
  attending: { label: 'Attending', color: '#10b981', bg: '#f0fdf4' },
  declined: { label: 'Declined', color: '#ef4444', bg: '#fef2f2' },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
};

interface GuestManagerProps {
  siteId: string;
}

export function GuestManager({ siteId }: GuestManagerProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Guest['status']>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', email: '', plusOne: false });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchGuests();
  }, [siteId]);

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
        setGuests(prev => [...prev, data.guest]);
        setNewGuest({ name: '', email: '', plusOne: false });
        setAddOpen(false);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const deleteGuest = async (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id));
    await fetch(`/api/guests/${id}?siteId=${siteId}`, { method: 'DELETE' }).catch(console.error);
  };

  const exportCsv = () => {
    const header = 'Name,Email,Status,Plus One,Plus One Name,Meal,Dietary,Message,Responded';
    const rows = filtered.map(g =>
      [g.name, g.email || '', g.status, g.plusOne ? 'Yes' : 'No', g.plusOneName || '',
        g.mealPreference || '', g.dietaryRestrictions || '', g.message || '', g.respondedAt || ''].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `guest-list-${siteId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = guests.filter(g => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: guests.length,
    attending: guests.filter(g => g.status === 'attending').length,
    declined: guests.filter(g => g.status === 'declined').length,
    pending: guests.filter(g => g.status === 'pending').length,
    plusOnes: guests.filter(g => g.plusOne && g.status === 'attending').length,
  };

  const inputStyle = {
    padding: '0.7rem 1rem', borderRadius: '0.6rem',
    border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
    fontSize: '0.9rem', background: 'rgba(0,0,0,0.02)',
    width: '100%', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Total Invited', value: stats.total, color: 'var(--eg-fg)' },
          { label: 'Attending', value: stats.attending, color: '#10b981' },
          { label: 'Declined', value: stats.declined, color: '#ef4444' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Total Heads', value: stats.attending + stats.plusOnes, color: 'var(--eg-accent)' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color, fontFamily: 'var(--eg-font-heading)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginTop: '0.25rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--eg-muted)' }} />
          <input
            placeholder="Search guests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Status filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            style={{ padding: '0.7rem 2.5rem 0.7rem 1rem', borderRadius: '0.6rem', border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff', fontSize: '0.85rem', fontWeight: 600, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Guests</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--eg-muted)' }} />
        </div>

        <button onClick={fetchGuests} style={{ padding: '0.7rem', borderRadius: '0.6rem', border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', display: 'flex' }}>
          <RefreshCw size={16} color="var(--eg-muted)" />
        </button>

        <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1rem', borderRadius: '0.6rem', border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          <Download size={14} />
          Export CSV
        </button>

        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.7rem 1.25rem', borderRadius: '0.6rem',
            background: 'var(--eg-fg)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
          }}
        >
          <Plus size={16} />
          Add Guest
        </button>
      </div>

      {/* Add Guest Form */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', background: '#fff', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>Guest Name *</label>
                <input placeholder="Full Name" value={newGuest.name} onChange={e => setNewGuest(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>Email</label>
                <input type="email" placeholder="email@example.com" value={newGuest.email} onChange={e => setNewGuest(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0.7rem 0' }}>
                <input type="checkbox" checked={newGuest.plusOne} onChange={e => setNewGuest(p => ({ ...p, plusOne: e.target.checked }))} />
                +1 Allowed
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={addGuest} disabled={saving || !newGuest.name.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.1rem', borderRadius: '0.6rem', background: 'var(--eg-accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Add
                </button>
                <button onClick={() => setAddOpen(false)} style={{ padding: '0.7rem', borderRadius: '0.6rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest List */}
      <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 180px 120px 90px 36px',
          padding: '0.75rem 1.25rem', background: 'rgba(0,0,0,0.02)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--eg-muted)',
        }}>
          <span>Guest</span>
          <span>Email</span>
          <span>Status</span>
          <span>+1</span>
          <span></span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 size={24} color="var(--eg-muted)" className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Users size={32} color="rgba(0,0,0,0.15)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem' }}>
              {search ? 'No guests match your search.' : 'No guests yet. Add your first guest above.'}
            </p>
          </div>
        ) : (
          filtered.map((guest, i) => {
            const sc = STATUS_CONFIG[guest.status];
            const isExpanded = expandedId === guest.id;
            return (
              <div key={guest.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : guest.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 180px 120px 90px 36px',
                    padding: '0.9rem 1.25rem', alignItems: 'center',
                    cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.01)',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                  onMouseOut={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.01)')}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)' }}>{guest.name}</div>
                    {guest.respondedAt && <div style={{ fontSize: '0.7rem', color: 'var(--eg-muted)', marginTop: '0.15rem' }}>Responded {new Date(guest.respondedAt).toLocaleDateString()}</div>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.email || '—'}</div>
                  <div>
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: guest.plusOne ? '#10b981' : 'var(--eg-muted)' }}>
                    {guest.plusOne ? '✓ Yes' : '—'}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteGuest(guest.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', display: 'flex', padding: '0.25rem' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded row */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {guest.plusOneName && <div><span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>+1 Name</span><p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{guest.plusOneName}</p></div>}
                        {guest.mealPreference && <div><span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Meal</span><p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{guest.mealPreference}</p></div>}
                        {guest.dietaryRestrictions && <div><span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dietary</span><p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{guest.dietaryRestrictions}</p></div>}
                        {guest.message && <div style={{ flex: 1 }}><span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--eg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Message</span><p style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--eg-muted)' }}>&ldquo;{guest.message}&rdquo;</p></div>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', textAlign: 'center' }}>
        {filtered.length} of {guests.length} guests shown
      </p>
    </div>
  );
}
