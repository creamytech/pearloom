'use client';

/* ========================================================================
   Seating arranger — drag guests onto tables, save assignments to the
   manifest. Auto-solver greedily fills every open seat, table by
   table, respecting each table's capacity.
   ======================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { DashLayout } from '../dash/DashShell';
import { PLHead } from '../dash/PLChrome';
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

// Neutral starter tables — no wedding-shaped "family/friends" group
// tags (meaningless for a reunion, retirement, or memorial). The
// host renames/regroups as they like; the plan persists to the
// manifest so it survives reloads.
const DEFAULT_TABLES: Table[] = [
  { id: 't-1', name: 'Table 1', capacity: 8 },
  { id: 't-2', name: 'Table 2', capacity: 8 },
  { id: 't-3', name: 'Table 3', capacity: 8 },
  { id: 't-4', name: 'Table 4', capacity: 8 },
];

interface SeatingPlan {
  tables?: Table[];
  assignments?: Record<string, string>;
}

export function SeatingArrangerPage() {
  const { site } = useSelectedSite();
  // Locally-mutable guest state. Fetched once per siteId; the
  // user then drag-drops to assign table_id, which mutates this
  // state directly via setGuests below.
  const [guests, setGuests] = useState<Guest[]>([]);
  // Tag the most-recent fetched siteId. `loading` is a render-
  // time derivation of "fetched siteId doesn't match current"
  // — no setLoading-in-effect cascade.
  const [fetchedSiteId, setFetchedSiteId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>(DEFAULT_TABLES);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  /* Tap-to-seat — the touch path. HTML5 drag never fires on
     phones/tablets, so seating was impossible there. Tap a guest
     to arm them, then tap a table (or the unseated panel) to
     place. Desktop keeps drag; this rides alongside. */
  const [armedId, setArmedId] = useState<string | null>(null);
  // Persistence — the plan (tables + assignments) saves to the site
  // manifest (manifest.seatingPlan) so it survives reloads. `hydrated`
  // gates the save effect so loading a site never triggers a write;
  // `lastSaved` dedupes so we only PATCH on a real change.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');

  // Pull guests via /api/rsvp, then overlay the saved seating plan
  // (tables + assignments) from the site manifest. One effect so the
  // hydration snapshot is consistent and we can seed lastSaved.
  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;
    const currentSiteId = site.id;
    hydratedRef.current = false;
    const plan = (site.manifest as { seatingPlan?: SeatingPlan } | null)?.seatingPlan;
    const savedTables = Array.isArray(plan?.tables) && plan!.tables!.length > 0 ? plan!.tables! : DEFAULT_TABLES;
    const savedAssignments = plan?.assignments && typeof plan.assignments === 'object' ? plan.assignments : {};
    fetch(`/api/rsvp?siteId=${encodeURIComponent(currentSiteId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { guests?: Array<Record<string, unknown>> } | null) => {
        if (cancelled) return;
        const next = !data || !Array.isArray(data.guests)
          ? []
          : data.guests.map((g, i): Guest => {
              const id = String(g.id ?? `g-${i}`);
              // Saved assignment wins; fall back to any legacy table_id
              // the RSVP row carried.
              const savedTable = savedAssignments[id];
              return {
                id,
                name: String(g.name ?? g.full_name ?? 'Unnamed'),
                email: typeof g.email === 'string' ? g.email : null,
                attending: typeof g.attending === 'string' ? (g.attending as Guest['attending']) : null,
                meal: typeof g.meal_preference === 'string' ? g.meal_preference : null,
                table_id: savedTable ?? (typeof g.table_id === 'string' ? g.table_id : ''),
              };
            });
        setTables(savedTables);
        setGuests(next);
        setFetchedSiteId(currentSiteId);
        // Seed lastSaved with the exact hydrated plan so the save
        // effect doesn't immediately re-write what we just loaded.
        const assignments: Record<string, string> = {};
        for (const g of next) if (g.table_id) assignments[g.id] = g.table_id;
        lastSavedRef.current = JSON.stringify({ tables: savedTables, assignments });
        hydratedRef.current = true;
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [site?.id, site?.manifest]);

  // Debounced save of the plan to the manifest. Skips until hydrated
  // and only fires when the plan actually changed.
  useEffect(() => {
    if (!hydratedRef.current || !site?.id) return;
    const assignments: Record<string, string> = {};
    for (const g of guests) if (g.table_id) assignments[g.id] = g.table_id;
    const snapshot = JSON.stringify({ tables, assignments });
    if (snapshot === lastSavedRef.current) return;
    const currentSiteId = site.id;
    const t = window.setTimeout(() => {
      lastSavedRef.current = snapshot;
      setSaveState('saving');
      fetch('/api/sites/seating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: currentSiteId, seatingPlan: { tables, assignments } }),
      })
        .then((r) => setSaveState(r.ok ? 'saved' : 'idle'))
        .catch(() => setSaveState('idle'));
    }, 900);
    return () => window.clearTimeout(t);
  }, [tables, guests, site?.id]);

  const loading = !!site?.id && fetchedSiteId !== site.id;

  const unseated = guests.filter((g) => !g.table_id && g.attending !== 'no');
  const byTable: Record<string, Guest[]> = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    for (const t of tables) map[t.id] = [];
    for (const g of guests) {
      if (g.table_id && map[g.table_id]) map[g.table_id].push(g);
    }
    return map;
  }, [guests, tables]);

  // Kitchen count — RSVP meal answers rolled up across everyone
  // who's coming. This is the number caterers actually ask for;
  // hosts shouldn't have to re-derive it from the guest list.
  const mealCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let unstated = 0;
    for (const g of guests) {
      if (g.attending === 'no') continue;
      const meal = (g.meal ?? '').trim();
      if (meal) counts.set(meal, (counts.get(meal) ?? 0) + 1);
      else unstated += 1;
    }
    return { entries: [...counts.entries()].sort((a, b) => b[1] - a[1]), unstated };
  }, [guests]);

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

  /* Tap path: tapping a chip arms/disarms it; tapping a table (or
     the unseated panel) places the armed guest there. A table at
     capacity won't accept (mirrors the drop guard). */
  function tapGuest(id: string) {
    setArmedId((cur) => (cur === id ? null : id));
  }
  function tapTarget(tableId: string) {
    if (!armedId) return;
    if (tableId) {
      const seated = guests.filter((g) => g.table_id === tableId).length;
      const cap = tables.find((t) => t.id === tableId)?.capacity ?? Infinity;
      if (seated >= cap) return;
    }
    assign(armedId, tableId);
    setArmedId(null);
  }

  function autoSolve() {
    // Greedy fill: every guest who hasn't declined gets a seat,
    // table by table, up to each table's capacity. Overflow stays
    // unseated — add a table and run it again.
    const seatMap = new Map<string, string>();
    const tableLoad = new Map<string, number>(tables.map((t) => [t.id, 0]));
    for (const g of guests) {
      if (g.attending === 'no') continue;
      for (const t of tables) {
        const used = tableLoad.get(t.id) ?? 0;
        if (used >= t.capacity) continue;
        seatMap.set(g.id, t.id);
        tableLoad.set(t.id, used + 1);
        break;
      }
    }
    setGuests((gs) => gs.map((g) => ({ ...g, table_id: seatMap.get(g.id) ?? g.table_id ?? '' })));
  }

  return (
    <DashLayout active="seating" hideTopbar>
      <div className="pl8" style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1240, margin: '0 auto' }}>
        <PLHead
          pre="Day-of"
          title="Seating"
          italic="arranger."
          sub="Drag or tap guests onto tables. Auto-solve fills every open seat, table by table, up to each table's capacity."
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={autoSolve} disabled={!guests.length}>
                <Pear size={12} tone="cream" shadow={false} /> Auto-solve
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={addTable}>
                <Icon name="plus" size={12} /> Add table
              </button>
            </div>
          }
          style={{ marginBottom: 18 }}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}>
          <span>{guests.length} guests · {tables.length} tables · {unseated.length} unseated</span>
          <span aria-live="polite" style={{ color: saveState === 'saving' ? 'var(--ink-muted)' : 'var(--sage-deep)', fontWeight: 700 }}>
            {saveState === 'saving' ? '· Saving…' : saveState === 'saved' ? '· Saved' : ''}
          </span>
        </div>

        {/* Kitchen count — only when at least one meal answer
            exists, so wedding-shaped events get it and events
            without a meal question never see an empty strip. */}
        {mealCounts.entries.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 18,
              padding: '10px 14px',
              background: 'var(--card)',
              border: '1px solid var(--card-ring)',
              borderRadius: 12,
            }}
          >
            <span style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              Kitchen count
            </span>
            {mealCounts.entries.map(([meal, n]) => (
              <span
                key={meal}
                style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                  background: 'var(--sage-tint, rgba(122,138,79,0.12))',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 999, padding: '4px 11px',
                }}
              >
                {meal} · {n}
              </span>
            ))}
            {mealCounts.unstated > 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                {mealCounts.unstated} not stated yet
              </span>
            )}
          </div>
        )}

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
            onClick={() => tapTarget('')}
          >
            <div style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 10 }}>
              Unseated · {unseated.length}
            </div>
            {/* Tap-to-seat hint — appears while a guest is armed, the
                touch path's only affordance. */}
            {armedId && (
              <div style={{ fontSize: 11.5, color: 'var(--sage-deep)', background: 'var(--sage-tint, rgba(122,138,79,0.12))', borderRadius: 8, padding: '7px 10px', marginBottom: 8, lineHeight: 1.4 }}>
                Tap a table to seat {guests.find((g) => g.id === armedId)?.name ?? 'them'} — or tap their name again to cancel.
              </div>
            )}
            {loading && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Threading guests…</div>}
            {!loading && unseated.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Everyone seated. Tap or drag a name out to unseat.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unseated.map((g) => (
                <GuestChip key={g.id} guest={g} armed={armedId === g.id} onTap={() => tapGuest(g.id)} onDragStart={() => setDraggingId(g.id)} onDragEnd={() => setDraggingId(null)} />
              ))}
            </div>
          </div>

          {/* Tables grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, alignContent: 'start' }}>
            {tables.map((t) => {
              const seated = byTable[t.id] ?? [];
              const full = seated.length >= t.capacity;
              // Per-table kitchen line — "Chicken ×4 · Fish ×2".
              const tableMeals = (() => {
                const m = new Map<string, number>();
                for (const g of seated) {
                  const meal = (g.meal ?? '').trim();
                  if (meal) m.set(meal, (m.get(meal) ?? 0) + 1);
                }
                return [...m.entries()].sort((a, b) => b[1] - a[1]);
              })();
              return (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--cream-2)',
                    // Armed (tap mode) or dragging both light up open
                    // tables as drop targets.
                    border: `1.5px ${(draggingId || armedId) && !full ? 'dashed' : 'solid'} ${full ? '#7A2D2D' : ((draggingId || armedId) ? 'var(--sage-deep)' : 'var(--line)')}`,
                    borderRadius: 14,
                    padding: 12,
                    minHeight: 180,
                    transition: 'border-color 220ms',
                    cursor: armedId && !full ? 'pointer' : 'default',
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
                  onClick={() => tapTarget(t.id)}
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
                  {tableMeals.length > 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginBottom: 8 }}>
                      {tableMeals.map(([meal, n]) => `${meal} ×${n}`).join(' · ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {seated.map((g) => (
                      <GuestChip key={g.id} guest={g} armed={armedId === g.id} onTap={() => tapGuest(g.id)} onDragStart={() => setDraggingId(g.id)} onDragEnd={() => setDraggingId(null)} />
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

function GuestChip({ guest, armed, onTap, onDragStart, onDragEnd }: { guest: Guest; armed?: boolean; onTap?: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-pressed={armed}
      onClick={(e) => { e.stopPropagation(); onTap?.(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap?.(); } }}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', guest.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        background: armed ? 'var(--sage-deep)' : 'var(--card)',
        border: `1.5px solid ${armed ? 'var(--sage-deep)' : 'var(--line)'}`,
        fontSize: 12.5,
        color: armed ? 'var(--cream)' : 'var(--ink)',
        cursor: 'grab',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        minHeight: 36,
        alignItems: 'center',
      }}
      title={armed ? 'Tap a table to seat — or tap again to cancel' : (guest.email ?? '')}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.name}</span>
      {guest.meal && <span style={{ fontSize: 10, color: armed ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)' }}>{guest.meal[0]?.toUpperCase()}</span>}
    </div>
  );
}
