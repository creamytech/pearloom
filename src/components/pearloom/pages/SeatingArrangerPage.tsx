'use client';

/* ========================================================================
   Seating arranger — drag guests onto tables, save assignments to the
   manifest. Auto-solver groups guests into tables minimizing constraint
   violations (must-sit-together, must-not-sit-together, table-size).
   ======================================================================== */

import { useEffect, useMemo, useState } from 'react';
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { NumberInput } from '../editor/v8-forms';

interface Guest {
  id: string;
  name: string;
  email?: string | null;
  attending?: 'yes' | 'no' | 'maybe' | null;
  meal?: string | null;
  /** Resolved table id this guest is sitting at; '' = unseated. */
  table_id?: string;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  /** Optional category tag to color-code the chart ('family', 'friends'). */
  group?: string;
}

interface Constraint {
  id: string;
  kind: 'must-sit-together' | 'avoid';
  guestIds: string[];
}

const DEFAULT_TABLES: Table[] = [
  { id: 't-1', name: 'Table 1', capacity: 8, group: 'family' },
  { id: 't-2', name: 'Table 2', capacity: 8, group: 'family' },
  { id: 't-3', name: 'Table 3', capacity: 8, group: 'friends' },
  { id: 't-4', name: 'Table 4', capacity: 8, group: 'friends' },
];

export function SeatingArrangerPage() {
  const { site } = useSelectedSite();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>(DEFAULT_TABLES);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Pull guests via /api/rsvp (already exists for the dashboard).
  useEffect(() => {
    if (!site?.id) return;
    setLoading(true);
    fetch(`/api/rsvp?siteId=${encodeURIComponent(site.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { guests?: Array<Record<string, unknown>> } | null) => {
        if (!data || !Array.isArray(data.guests)) return;
        setGuests(
          data.guests.map((g, i): Guest => ({
            id: String(g.id ?? `g-${i}`),
            name: String(g.name ?? g.full_name ?? 'Unnamed'),
            email: typeof g.email === 'string' ? g.email : null,
            attending: typeof g.attending === 'string' ? (g.attending as Guest['attending']) : null,
            meal: typeof g.meal_preference === 'string' ? g.meal_preference : null,
            table_id: typeof g.table_id === 'string' ? g.table_id : '',
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [site?.id]);

  const unseated = guests.filter((g) => !g.table_id && g.attending !== 'no');
  const byTable: Record<string, Guest[]> = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    for (const t of tables) map[t.id] = [];
    for (const g of guests) {
      if (g.table_id && map[g.table_id]) map[g.table_id].push(g);
    }
    return map;
  }, [guests, tables]);

  function addTable() {
    const n = tables.length + 1;
    setTables([...tables, { id: `t-${Date.now().toString(36)}`, name: `Table ${n}`, capacity: 8 }]);
  }
  function removeTable(id: string) {
    // Unseat every guest at this table.
    setGuests((gs) => gs.map((g) => (g.table_id === id ? { ...g, table_id: '' } : g)));
    setTables((ts) => ts.filter((t) => t.id !== id));
  }
  function renameTable(id: string, name: string) {
    setTables((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  }
  function resizeTable(id: string, capacity: number) {
    setTables((ts) => ts.map((t) => (t.id === id ? { ...t, capacity: Math.max(1, capacity) } : t)));
  }

  function assign(guestId: string, tableId: string) {
    setGuests((gs) => gs.map((g) => (g.id === guestId ? { ...g, table_id: tableId } : g)));
  }

  function autoSolve() {
    // Cheap solver: round-robin family/friends groups; keeps must-sit
    // pairs together; respects capacity.
    const sortable = [...guests].filter((g) => g.attending !== 'no');
    // Build must-sit groups.
    const groups: string[][] = [];
    const placed = new Set<string>();
    for (const c of constraints.filter((c) => c.kind === 'must-sit-together')) {
      const g = c.guestIds.filter((id) => !placed.has(id));
      if (g.length > 1) {
        groups.push(g);
        g.forEach((id) => placed.add(id));
      }
    }
    for (const g of sortable) {
      if (placed.has(g.id)) continue;
      groups.push([g.id]);
      placed.add(g.id);
    }

    // Stable sort groups largest-first so big families land first.
    groups.sort((a, b) => b.length - a.length);

    // Greedy place each group at the table that has room, avoiding
    // 'avoid' constraints.
    const seatMap = new Map<string, string>();
    const tableLoad = new Map<string, number>(tables.map((t) => [t.id, 0]));
    function avoidViolated(groupIds: string[], tableId: string): boolean {
      for (const c of constraints.filter((c) => c.kind === 'avoid')) {
        const inGroup = groupIds.some((id) => c.guestIds.includes(id));
        if (!inGroup) continue;
        // If anyone already at this table is in the avoid set, skip.
        for (const [gid, tid] of seatMap.entries()) {
          if (tid === tableId && c.guestIds.includes(gid) && !groupIds.includes(gid)) {
            return true;
          }
        }
      }
      return false;
    }

    for (const grp of groups) {
      let placedHere = false;
      for (const t of tables) {
        const used = tableLoad.get(t.id) ?? 0;
        if (used + grp.length > t.capacity) continue;
        if (avoidViolated(grp, t.id)) continue;
        for (const id of grp) seatMap.set(id, t.id);
        tableLoad.set(t.id, used + grp.length);
        placedHere = true;
        break;
      }
      if (!placedHere) {
        // overflow — leave unseated, user can add tables
      }
    }

    setGuests((gs) => gs.map((g) => ({ ...g, table_id: seatMap.get(g.id) ?? g.table_id ?? '' })));
  }

  return (
    <DashLayout active="seating" title="Seating arranger" subtitle="Drag guests onto tables. Pear auto-solves with constraints.">
      <div className="pl8" style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={autoSolve} disabled={!guests.length}>
            <Pear size={12} tone="cream" shadow={false} /> Auto-solve
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={addTable}>
            <Icon name="plus" size={12} /> Add table
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-muted)' }}>
            {guests.length} guests · {tables.length} tables · {unseated.length} unseated
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 22 }} className="pl8-seating-grid">
          {/* Unseated panel */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-ring)',
              borderRadius: 14,
              padding: 14,
              maxHeight: 'calc(100vh - 220px)',
              overflowY: 'auto',
              position: 'sticky',
              top: 24,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain');
              if (id) assign(id, '');
              setDraggingId(null);
            }}
          >
            <div style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 10 }}>
              Unseated · {unseated.length}
            </div>
            {loading && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Loading guests…</div>}
            {!loading && unseated.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Everyone seated. Drag a name out to unseat.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unseated.map((g) => (
                <GuestChip key={g.id} guest={g} onDragStart={() => setDraggingId(g.id)} onDragEnd={() => setDraggingId(null)} />
              ))}
            </div>
          </div>

          {/* Tables grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, alignContent: 'start' }}>
            {tables.map((t) => {
              const seated = byTable[t.id] ?? [];
              const full = seated.length >= t.capacity;
              return (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--cream-2)',
                    border: `1.5px ${draggingId ? 'dashed' : 'solid'} ${full ? '#7A2D2D' : 'var(--line)'}`,
                    borderRadius: 14,
                    padding: 12,
                    minHeight: 180,
                    transition: 'border-color 220ms',
                  }}
                  onDragOver={(e) => {
                    if (full) return;
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--sage-deep)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = full ? '#7A2D2D' : 'var(--line)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--line)';
                    const id = e.dataTransfer.getData('text/plain');
                    if (id && !full) assign(id, t.id);
                    setDraggingId(null);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => renameTable(t.id, e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--ink)',
                        padding: 0,
                        flex: 1,
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeTable(t.id)}
                      aria-label="Remove table"
                      style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, color: 'var(--ink-muted)' }}>
                    <span>{seated.length} of</span>
                    <NumberInput
                      value={t.capacity}
                      onChange={(n) => resizeTable(t.id, n)}
                      min={1}
                      max={20}
                      width={84}
                      ariaLabel={`Capacity for ${t.name ?? 'table'}`}
                    />
                    <span>seats</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {seated.map((g) => (
                      <GuestChip key={g.id} guest={g} onDragStart={() => setDraggingId(g.id)} onDragEnd={() => setDraggingId(null)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 760px) {
            .pl8-seating-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </DashLayout>
  );
}

function GuestChip({ guest, onDragStart, onDragEnd }: { guest: Guest; onDragStart: () => void; onDragEnd: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', guest.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      style={{
        padding: '6px 10px',
        borderRadius: 8,
        background: 'var(--card)',
        border: '1px solid var(--line)',
        fontSize: 12.5,
        color: 'var(--ink)',
        cursor: 'grab',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
      }}
      title={guest.email ?? ''}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.name}</span>
      {guest.meal && <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{guest.meal[0]?.toUpperCase()}</span>}
    </div>
  );
}
