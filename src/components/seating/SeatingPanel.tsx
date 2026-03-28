'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/seating/SeatingPanel.tsx
// Right-side panel: guest list, selected table details, constraints
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type { Guest, SeatingTable, SeatingConstraint, ConstraintType } from '@/types';
import { GuestChip } from './GuestChip';
import { Search, X, Trash2, ChevronDown, Users, Sliders, MessageSquare } from 'lucide-react';

export interface SeatingPanelProps {
  siteId: string;
  guests: Guest[];
  tables: SeatingTable[];
  selectedTableId?: string;
  onAssign: (guestId: string, seatId: string) => void;
  onUnassignAll: (tableId: string) => void;
  onTableUpdate: (tableId: string, updates: Partial<SeatingTable>) => void;
  onTableDelete: (tableId: string) => void;
}

type GuestFilter = 'all' | 'unassigned' | 'assigned' | 'rsvpd';
type PanelTab = 'guests' | 'table' | 'constraints';

const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  must_sit_together: 'Keep Together',
  must_not_sit_together: 'Keep Apart',
  near_exit: 'Near Exit',
  near_dance_floor: 'Near Dance Floor',
  avoid_table: 'Avoid Table',
  prefer_table: 'Prefer Table',
  custom: 'Custom',
};

const CONSTRAINT_COLORS: Record<ConstraintType, string> = {
  must_sit_together: '#A3B18A',
  must_not_sit_together: '#ef4444',
  near_exit: '#D6C6A8',
  near_dance_floor: '#6D597A',
  avoid_table: '#C8A47A',
  prefer_table: '#A3B18A',
  custom: '#9A9488',
};

function parseConstraintText(text: string): { type: ConstraintType; description: string } {
  const lower = text.toLowerCase();
  if (lower.includes('together') || lower.includes('same table')) {
    return { type: 'must_sit_together', description: text };
  }
  if (lower.includes('apart') || lower.includes('separate') || lower.includes('not sit')) {
    return { type: 'must_not_sit_together', description: text };
  }
  if (lower.includes('exit') || lower.includes('door') || lower.includes('wheelchair') || lower.includes('accessible')) {
    return { type: 'near_exit', description: text };
  }
  if (lower.includes('dance') || lower.includes('floor')) {
    return { type: 'near_dance_floor', description: text };
  }
  return { type: 'custom', description: text };
}

// ─── Sub-component: Guests Tab ────────────────────────────────

function GuestsTab({
  guests,
  tables,
  onDragStart,
}: {
  guests: Guest[];
  tables: SeatingTable[];
  onDragStart: (e: React.DragEvent, guestId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');

  // Build set of assigned guest IDs
  const assignedIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of tables) {
      for (const s of t.seats ?? []) {
        if (s.guestId) set.add(s.guestId);
      }
    }
    return set;
  }, [tables]);

  const filtered = useMemo(() => {
    let list = guests;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q));
    }
    if (filter === 'unassigned') list = list.filter(g => !assignedIds.has(g.id));
    if (filter === 'assigned') list = list.filter(g => assignedIds.has(g.id));
    if (filter === 'rsvpd') list = list.filter(g => g.status === 'attending');

    // Unassigned first
    return [...list].sort((a, b) => {
      const aA = assignedIds.has(a.id) ? 1 : 0;
      const bA = assignedIds.has(b.id) ? 1 : 0;
      return aA - bA || a.name.localeCompare(b.name);
    });
  }, [guests, query, filter, assignedIds]);

  const FILTERS: { key: GuestFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'assigned', label: 'Seated' },
    { key: 'rsvpd', label: "RSVP'd" },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--eg-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search guests…"
          style={{
            width: '100%',
            paddingLeft: '2rem',
            paddingRight: query ? '2rem' : '0.75rem',
            paddingTop: '0.45rem',
            paddingBottom: '0.45rem',
            borderRadius: '0.75rem',
            border: '1.5px solid var(--eg-divider)',
            background: 'rgba(255,255,255,0.7)',
            fontSize: '0.82rem',
            fontFamily: 'var(--eg-font-body)',
            outline: 'none',
            color: 'var(--eg-fg)',
            boxSizing: 'border-box',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--eg-muted)', padding: 0, display: 'flex' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '1rem',
              border: filter === f.key ? '1.5px solid var(--eg-accent)' : '1.5px solid var(--eg-divider)',
              background: filter === f.key ? 'var(--eg-accent)' : 'transparent',
              color: filter === f.key ? '#fff' : 'var(--eg-muted)',
              fontSize: '0.72rem',
              fontFamily: 'var(--eg-font-body)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Guest list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--eg-muted)', fontSize: '0.82rem', textAlign: 'center', marginTop: '2rem', fontFamily: 'var(--eg-font-body)' }}>
            No guests found
          </p>
        )}
        {filtered.map(g => (
          <GuestChip
            key={g.id}
            guest={g}
            isAssigned={assignedIds.has(g.id)}
            onDragStart={onDragStart}
            draggable={!assignedIds.has(g.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-component: Selected Table Tab ───────────────────────

function TableTab({
  table,
  onUpdate,
  onDelete,
  onUnassignAll,
}: {
  table: SeatingTable;
  onUpdate: (updates: Partial<SeatingTable>) => void;
  onDelete: () => void;
  onUnassignAll: () => void;
}) {
  const [labelEdit, setLabelEdit] = useState(table.label);
  const [notesEdit, setNotesEdit] = useState(table.notes ?? '');

  const seats = table.seats ?? [];
  const assignedSeats = seats.filter(s => s.guest);

  const SHAPES = ['round', 'rectangular', 'banquet', 'square'] as const;
  const CAPACITIES = [2, 4, 6, 8, 10, 12, 16, 20];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Label */}
      <div>
        <label style={labelStyle}>Table Name</label>
        <input
          value={labelEdit}
          onChange={e => setLabelEdit(e.target.value)}
          onBlur={() => onUpdate({ label: labelEdit })}
          style={inputStyle}
        />
      </div>

      {/* Shape */}
      <div>
        <label style={labelStyle}>Shape</label>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {SHAPES.map(s => (
            <button
              key={s}
              onClick={() => onUpdate({ shape: s })}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '0.75rem',
                border: table.shape === s ? '1.5px solid var(--eg-accent)' : '1.5px solid var(--eg-divider)',
                background: table.shape === s ? 'var(--eg-accent)' : 'transparent',
                color: table.shape === s ? '#fff' : 'var(--eg-muted)',
                fontSize: '0.72rem',
                fontFamily: 'var(--eg-font-body)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label style={labelStyle}>Capacity</label>
        <div style={{ position: 'relative' }}>
          <select
            value={table.capacity}
            onChange={e => onUpdate({ capacity: parseInt(e.target.value) })}
            style={{ ...inputStyle, appearance: 'none', paddingRight: '2rem' }}
          >
            {CAPACITIES.map(c => <option key={c} value={c}>{c} seats</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--eg-muted)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Reserved toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          id="reserved-toggle"
          checked={table.isReserved}
          onChange={e => onUpdate({ isReserved: e.target.checked })}
          style={{ accentColor: 'var(--eg-accent)' }}
        />
        <label htmlFor="reserved-toggle" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Reserved table</label>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notesEdit}
          onChange={e => setNotesEdit(e.target.value)}
          onBlur={() => onUpdate({ notes: notesEdit })}
          rows={3}
          placeholder="e.g. Near the stage, family table…"
          style={{ ...inputStyle, resize: 'vertical', minHeight: '4rem' }}
        />
      </div>

      {/* Seat list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Seats — {assignedSeats.length}/{seats.length}
          </label>
          {assignedSeats.length > 0 && (
            <button onClick={onUnassignAll} style={ghostBtnStyle}>
              Unassign all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '12rem', overflowY: 'auto' }}>
          {seats.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', fontFamily: 'var(--eg-font-body)', width: '1.5rem', flexShrink: 0 }}>
                {s.seatNumber}
              </span>
              {s.guest ? (
                <GuestChip guest={s.guest} isAssigned draggable={false} />
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', fontStyle: 'italic', fontFamily: 'var(--eg-font-body)' }}>Empty</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.75rem',
          border: '1.5px solid #fca5a5',
          background: 'transparent',
          color: '#ef4444',
          fontSize: '0.78rem',
          fontFamily: 'var(--eg-font-body)',
          cursor: 'pointer',
          marginTop: '0.5rem',
        }}
      >
        <Trash2 size={13} /> Delete Table
      </button>
    </div>
  );
}

// ─── Sub-component: Constraints Tab ───────────────────────────

function ConstraintsTab({ siteId }: { siteId: string }) {
  const [input, setInput] = useState('');
  const [constraints, setConstraints] = useState<SeatingConstraint[]>([]);
  const [saving, setSaving] = useState(false);

  void siteId; // will be used for persistence

  const handleAdd = async () => {
    if (!input.trim()) return;
    setSaving(true);
    const parsed = parseConstraintText(input);
    const newConstraint: SeatingConstraint = {
      id: `local-${Date.now()}`,
      userId: '',
      type: parsed.type,
      description: parsed.description,
      priority: 1,
    };
    setConstraints(prev => [...prev, newConstraint]);
    setInput('');
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    setConstraints(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', fontFamily: 'var(--eg-font-body)', lineHeight: 1.5 }}>
        Describe seating preferences in plain language. Pearloom will parse them into placement rules.
      </p>

      {/* Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`e.g. "Keep the Johnson family together"\n"Sarah and Mark should not sit at the same table"\n"Grandma needs to be near the exit"`}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || saving}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'var(--eg-accent)',
            color: '#fff',
            fontSize: '0.82rem',
            fontFamily: 'var(--eg-font-body)',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            opacity: input.trim() ? 1 : 0.5,
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Add Constraint'}
        </button>
      </div>

      {/* Constraint list */}
      {constraints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={labelStyle}>Saved Constraints</label>
          {constraints.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.7)',
                border: '1.5px solid var(--eg-divider)',
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem',
                  background: CONSTRAINT_COLORS[c.type] + '33',
                  color: CONSTRAINT_COLORS[c.type],
                  flexShrink: 0,
                  marginTop: '0.1rem',
                }}
              >
                {CONSTRAINT_LABELS[c.type]}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)', flex: 1, lineHeight: 1.4 }}>
                {c.description}
              </span>
              <button
                onClick={() => handleDelete(c.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--eg-muted)', padding: 0, display: 'flex', flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {constraints.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', fontStyle: 'italic', textAlign: 'center', fontFamily: 'var(--eg-font-body)' }}>
          No constraints yet. Add one above.
        </p>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--eg-muted)',
  fontFamily: 'var(--eg-font-body)',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.75rem',
  borderRadius: '0.75rem',
  border: '1.5px solid var(--eg-divider)',
  background: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem',
  fontFamily: 'var(--eg-font-body)',
  outline: 'none',
  color: 'var(--eg-fg)',
  boxSizing: 'border-box',
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--eg-muted)',
  fontSize: '0.72rem',
  fontFamily: 'var(--eg-font-body)',
  textDecoration: 'underline',
  padding: 0,
};

// ─── Main Panel ───────────────────────────────────────────────

export function SeatingPanel({
  siteId,
  guests,
  tables,
  selectedTableId,
  onAssign,
  onUnassignAll,
  onTableUpdate,
  onTableDelete,
}: SeatingPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(selectedTableId ? 'table' : 'guests');

  const selectedTable = tables.find(t => t.id === selectedTableId);

  // Auto-switch to table tab when a table is selected
  const effectiveTab = selectedTable && activeTab === 'guests' && selectedTableId ? 'table' : activeTab;

  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('guestId', guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const TABS: { key: PanelTab; label: string; icon: React.ReactNode }[] = [
    { key: 'guests', label: 'Guests', icon: <Users size={13} /> },
    { key: 'table', label: 'Table', icon: <Sliders size={13} /> },
    { key: 'constraints', label: 'Rules', icon: <MessageSquare size={13} /> },
  ];

  void onAssign; // used by parent; guest assignment is done via drag

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--eg-bg)',
        borderLeft: '1px solid var(--eg-divider)',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--eg-divider)',
          padding: '0 0.5rem',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            disabled={tab.key === 'table' && !selectedTable}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              padding: '0.75rem 0.25rem',
              background: 'none',
              border: 'none',
              borderBottom: effectiveTab === tab.key ? '2px solid var(--eg-accent)' : '2px solid transparent',
              color: effectiveTab === tab.key ? 'var(--eg-accent)' : tab.key === 'table' && !selectedTable ? 'var(--eg-divider)' : 'var(--eg-muted)',
              fontSize: '0.75rem',
              fontFamily: 'var(--eg-font-body)',
              fontWeight: effectiveTab === tab.key ? 600 : 400,
              cursor: tab.key === 'table' && !selectedTable ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s',
              marginBottom: '-1px',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {effectiveTab === 'guests' && (
          <GuestsTab guests={guests} tables={tables} onDragStart={handleDragStart} />
        )}
        {effectiveTab === 'table' && selectedTable && (
          <TableTab
            table={selectedTable}
            onUpdate={updates => onTableUpdate(selectedTable.id, updates)}
            onDelete={() => onTableDelete(selectedTable.id)}
            onUnassignAll={() => onUnassignAll(selectedTable.id)}
          />
        )}
        {effectiveTab === 'table' && !selectedTable && (
          <p style={{ color: 'var(--eg-muted)', fontSize: '0.82rem', textAlign: 'center', marginTop: '2rem', fontFamily: 'var(--eg-font-body)' }}>
            Select a table on the canvas to edit it.
          </p>
        )}
        {effectiveTab === 'constraints' && <ConstraintsTab siteId={siteId} />}
      </div>
    </div>
  );
}
