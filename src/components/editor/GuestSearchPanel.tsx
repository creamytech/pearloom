'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/GuestSearchPanel.tsx
//
// Unified search across:
//   • RSVP guest list (from /api/guests)
//   • Manual guest adds
//   • CSV bulk import → POST /api/guests
//   • Quick bulk invite link send
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, UserPlus, Upload, Check, X,
  ChevronDown, Mail, Trash2,
} from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import type { Guest } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  attending: '#A3B18A',
  declined:  '#f87171',
  pending:   '#D6C6A8',
};
const STATUS_ICON: Record<string, string> = {
  attending: '✓',
  declined:  '✕',
  pending:   '?',
};

interface GuestSearchPanelProps {
  siteId: string;
}

export function GuestSearchPanel({ siteId }: GuestSearchPanelProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'declined' | 'pending'>('all');
  // Add guest form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // CSV import
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`);
      if (res.ok) {
        const { guests: data = [] } = await res.json();
        setGuests(data);
      }
    } catch {}
    setLoading(false);
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  const filtered = guests.filter(g => {
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    const matchQuery = !query || g.name.toLowerCase().includes(query.toLowerCase()) ||
      (g.email || '').toLowerCase().includes(query.toLowerCase());
    return matchStatus && matchQuery;
  });

  const counts = {
    attending: guests.filter(g => g.status === 'attending').length,
    declined:  guests.filter(g => g.status === 'declined').length,
    pending:   guests.filter(g => g.status === 'pending').length,
  };

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, name: addName.trim(), email: addEmail.trim() || undefined }),
      });
      if (res.ok) {
        const { guest } = await res.json();
        setGuests(prev => [...prev, guest]);
        setAddName(''); setAddEmail(''); setAddOpen(false);
      }
    } catch {}
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id));
    try { await fetch(`/api/guests?id=${id}`, { method: 'DELETE' }); } catch {}
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setCsvResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      // Parse CSV: name,email (first row may be header)
      const rows: { name: string; email?: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const name = cols[0]; const email = cols[1];
        if (!name || name.toLowerCase() === 'name') continue;
        rows.push({ name, email: email || undefined });
      }
      let added = 0;
      for (const row of rows.slice(0, 200)) {
        try {
          const res = await fetch('/api/guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId, name: row.name, email: row.email }),
          });
          if (res.ok) { added++; }
        } catch {}
      }
      setCsvResult(`Imported ${added} of ${rows.length} guests`);
      await load();
    } catch {
      setCsvResult('Import failed — check file format');
    } finally {
      setCsvLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(214,198,168,0.5)',
      }}>
        <Users size={11} /> Guest List
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {(['all', 'attending', 'declined', 'pending'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '3px 9px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
              border: `1px solid ${statusFilter === s ? (STATUS_COLOR[s] || '#D6C6A8') : 'rgba(255,255,255,0.1)'}`,
              background: statusFilter === s ? `${STATUS_COLOR[s] || '#D6C6A8'}1a` : 'transparent',
              color: statusFilter === s ? (STATUS_COLOR[s] || '#D6C6A8') : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
            }}
          >
            {s === 'all' ? `All (${guests.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof typeof counts]})`}
          </button>
        ))}
      </div>

      {/* Search box */}
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search guests…"
          style={{
            width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px',
          }}>
            <X size={11} />
          </button>
        )}
      </div>

      {/* Guest list */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
            {query ? 'No matches found' : 'No guests yet'}
          </div>
        ) : (
          filtered.map(guest => (
            <div key={guest.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 8px', borderRadius: '7px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                background: `${STATUS_COLOR[guest.status] || '#888'}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800,
                color: STATUS_COLOR[guest.status] || '#888',
              }}>
                {STATUS_ICON[guest.status] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guest.name}
                  {guest.plusOne && guest.plusOneName && (
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> + {guest.plusOneName}</span>
                  )}
                </div>
                {guest.email && (
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.email}</div>
                )}
              </div>
              {guest.mealPreference && (
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>🍽️</div>
              )}
              <button
                onClick={() => handleDelete(guest.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', padding: '2px', flexShrink: 0 }}
                title="Remove guest"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add guest */}
      <SidebarSection title="Add Guest" defaultOpen={false} icon={UserPlus}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="Full name *"
            style={{
              padding: '7px 10px', borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem',
              outline: 'none',
            }}
          />
          <input
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            style={{
              padding: '7px 10px', borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !addName.trim()}
            style={{
              padding: '7px', borderRadius: '7px',
              border: 'none', background: addName.trim() ? 'rgba(163,177,138,0.2)' : 'rgba(255,255,255,0.05)',
              color: addName.trim() ? '#A3B18A' : 'rgba(255,255,255,0.25)',
              cursor: addName.trim() ? 'pointer' : 'default',
              fontSize: '0.78rem', fontWeight: 700,
            }}
          >
            {adding ? 'Adding…' : '+ Add Guest'}
          </button>
        </div>
      </SidebarSection>

      {/* CSV Import */}
      <SidebarSection title="CSV Import" defaultOpen={false} icon={Upload}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Upload a CSV with <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 4px', borderRadius: '3px' }}>name,email</code> columns (up to 200 guests).
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={csvLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '8px', borderRadius: '8px',
              border: '1px dashed rgba(214,198,168,0.2)',
              background: 'transparent', color: 'rgba(214,198,168,0.5)',
              cursor: csvLoading ? 'wait' : 'pointer', fontSize: '0.75rem', fontWeight: 700,
            }}
          >
            <Upload size={12} />
            {csvLoading ? 'Importing…' : 'Choose CSV file'}
          </button>
          {csvResult && (
            <div style={{
              fontSize: '0.7rem', padding: '6px 10px', borderRadius: '6px',
              background: csvResult.includes('failed') ? 'rgba(248,81,73,0.1)' : 'rgba(163,177,138,0.1)',
              color: csvResult.includes('failed') ? '#f87171' : '#A3B18A',
            }}>
              {csvResult}
            </div>
          )}
        </div>
      </SidebarSection>
    </div>
  );
}
