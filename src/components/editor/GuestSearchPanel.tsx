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
import {
  Search, Users, UserPlus, Upload, X, Trash2,
} from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import { IconMeal } from './EditorIcons';
import { logEditorError } from '@/lib/editor-log';
import {
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';
import type { Guest } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  attending: '#71717A',
  declined:  '#e87a7a',
  pending:   '#D6C6A8',
};
const STATUS_ICON: Record<string, string> = {
  attending: 'Y',
  declined:  'N',
  pending:   '?',
};

interface GuestSearchPanelProps {
  siteId: string;
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #E4E4E7',
  background: '#FFFFFF',
  color: '#18181B',
  fontSize: 'max(16px, 0.8rem)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: panelLineHeight.tight,
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#18181B';
  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
};
const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#E4E4E7';
  e.currentTarget.style.boxShadow = 'none';
};

export function GuestSearchPanel({ siteId }: GuestSearchPanelProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'declined' | 'pending'>('all');
  // Add guest form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
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
    } catch (err) {
      logEditorError('GuestSearchPanel: load guests', err);
    }
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
        setAddName(''); setAddEmail('');
      }
    } catch (err) {
      logEditorError('GuestSearchPanel: add guest', err);
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id));
    try { await fetch(`/api/guests?id=${id}`, { method: 'DELETE' }); } catch (err) { logEditorError('GuestSearchPanel: delete guest', err); }
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
        } catch (err) { logEditorError('GuestSearchPanel: CSV import row', err); }
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
        fontSize: panelText.label,
        fontWeight: panelWeight.bold,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color: '#71717A',
        fontFamily: 'inherit',
        lineHeight: panelLineHeight.tight,
      }}>
        <Users size={12} /> Guest List
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {(['all', 'attending', 'declined', 'pending'] as const).map(s => {
          const isActive = statusFilter === s;
          const accent = STATUS_COLOR[s] || '#18181B';
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                fontSize: panelText.chip,
                fontWeight: isActive ? panelWeight.bold : panelWeight.semibold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                border: isActive
                  ? `2px solid ${s === 'all' ? '#18181B' : accent}`
                  : '1px solid #E4E4E7',
                background: isActive
                  ? (s === 'all' ? '#F4F4F5' : `${accent}15`)
                  : '#FFFFFF',
                color: isActive
                  ? (s === 'all' ? '#18181B' : accent)
                  : '#3F3F46',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? `All (${guests.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof typeof counts]})`}
            </button>
          );
        })}
      </div>

      {/* Search box */}
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: '#71717A', pointerEvents: 'none',
        }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search guests…"
          style={{ ...inputBase, padding: '10px 12px 10px 34px' }}
          onFocus={inputFocus}
          onBlur={inputBlur}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              width: '24px', height: '24px', borderRadius: '6px', border: 'none',
              background: 'transparent', cursor: 'pointer', color: '#71717A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Guest list */}
      <div style={{
        maxHeight: '320px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center', padding: '20px 12px',
            fontSize: panelText.body, color: '#71717A',
            fontFamily: 'inherit', lineHeight: panelLineHeight.snug,
          }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px 16px',
            borderRadius: '12px',
            border: '1.5px dashed #E4E4E7',
            background: '#FAFAFA',
          }}>
            <Users size={22} style={{ color: '#71717A', opacity: 0.5, marginBottom: '8px' }} />
            <div style={{
              fontSize: panelText.itemTitle,
              fontWeight: panelWeight.bold,
              color: '#18181B',
              fontFamily: 'inherit',
              marginBottom: '4px',
              lineHeight: panelLineHeight.tight,
            }}>
              {query ? 'No matches found' : 'No guests yet'}
            </div>
            <div style={{
              fontSize: panelText.hint,
              color: '#71717A',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.snug,
            }}>
              {query ? 'Try a different search.' : 'Add guests manually or import a CSV below.'}
            </div>
          </div>
        ) : (
          filtered.map(guest => (
            <div
              key={guest.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                background: `${STATUS_COLOR[guest.status] || '#71717A'}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: panelText.meta,
                fontWeight: panelWeight.heavy,
                color: STATUS_COLOR[guest.status] || '#71717A',
                fontFamily: 'inherit',
              }}>
                {STATUS_ICON[guest.status] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: '#18181B',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {guest.name}
                  {guest.plusOne && guest.plusOneName && (
                    <span style={{ color: '#71717A', fontWeight: panelWeight.regular }}> + {guest.plusOneName}</span>
                  )}
                </div>
                {guest.email && (
                  <div style={{
                    fontSize: panelText.hint,
                    color: '#71717A',
                    fontFamily: 'inherit',
                    lineHeight: panelLineHeight.tight,
                    marginTop: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {guest.email}
                  </div>
                )}
              </div>
              {guest.mealPreference && (
                <div style={{ display: 'flex', alignItems: 'center', color: '#71717A', flexShrink: 0 }}>
                  <IconMeal size={12} />
                </div>
              )}
              <button
                onClick={() => handleDelete(guest.id)}
                title="Remove guest"
                style={{
                  width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                  background: 'transparent', color: '#71717A', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add guest */}
      <SidebarSection title="Add Guest" defaultOpen={false} icon={UserPlus}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="Full name *"
            style={inputBase}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
          <input
            value={addEmail}
            onChange={e => setAddEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            style={inputBase}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !addName.trim()}
            style={{
              padding: '9px 12px', borderRadius: '8px', border: 'none',
              background: addName.trim() ? '#18181B' : '#E4E4E7',
              color: addName.trim() ? '#FFFFFF' : '#71717A',
              cursor: addName.trim() ? 'pointer' : 'default',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              transition: 'all 0.15s',
            }}
          >
            {adding ? 'Adding…' : '+ Add Guest'}
          </button>
        </div>
      </SidebarSection>

      {/* CSV Import */}
      <SidebarSection title="CSV Import" defaultOpen={false} icon={Upload}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            fontSize: panelText.hint,
            color: '#3F3F46',
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.snug,
          }}>
            Upload a CSV with <code style={{
              background: '#F4F4F5',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: panelText.hint,
              fontFamily: 'monospace',
            }}>name,email</code> columns (up to 200 guests).
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
              padding: '10px', borderRadius: '10px',
              border: '1.5px dashed #E4E4E7',
              background: '#FAFAFA', color: '#18181B',
              cursor: csvLoading ? 'wait' : 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              transition: 'all 0.15s',
            }}
          >
            <Upload size={13} />
            {csvLoading ? 'Importing…' : 'Choose CSV file'}
          </button>
          {csvResult && (
            <div style={{
              fontSize: panelText.hint,
              fontWeight: panelWeight.semibold,
              padding: '8px 10px',
              borderRadius: '8px',
              background: csvResult.includes('failed') ? 'rgba(239,68,68,0.08)' : '#F4F4F5',
              border: `1px solid ${csvResult.includes('failed') ? 'rgba(239,68,68,0.25)' : '#E4E4E7'}`,
              color: csvResult.includes('failed') ? '#b34747' : '#3F3F46',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.snug,
            }}>
              {csvResult}
            </div>
          )}
        </div>
      </SidebarSection>
    </div>
  );
}
