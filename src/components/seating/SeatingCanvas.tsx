'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/seating/SeatingCanvas.tsx
// Main 2D canvas for the seating chart editor
// Scrollable, zoomable, dot-grid background, draggable tables
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SeatingTable, Guest } from '@/types';
import { TableObject } from './TableObject';
import { SeatingPanel } from './SeatingPanel';
import {
  Plus, ZoomIn, ZoomOut, Maximize2, LayoutGrid,
  Trash2, ChevronDown,
} from 'lucide-react';

export interface SeatingCanvasProps {
  siteId: string;
  spaceId?: string;
}

// ─── Table template presets ────────────────────────────────────

interface TablePreset {
  label: string;
  shape: SeatingTable['shape'];
  capacity: number;
}

const TABLE_PRESETS: TablePreset[] = [
  { label: 'Round (8)', shape: 'round', capacity: 8 },
  { label: 'Round (6)', shape: 'round', capacity: 6 },
  { label: 'Round (10)', shape: 'round', capacity: 10 },
  { label: 'Rectangular (8)', shape: 'rectangular', capacity: 8 },
  { label: 'Rectangular (12)', shape: 'rectangular', capacity: 12 },
  { label: 'Banquet (16)', shape: 'banquet', capacity: 16 },
  { label: 'Sweetheart (2)', shape: 'rectangular', capacity: 2 },
];

// ─── Canvas constants ─────────────────────────────────────────

const CANVAS_W = 1600;
const CANVAS_H = 1100;
const ROOM_MARGIN = 60; // room border inset
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.0;

// ─── Debounce helper ──────────────────────────────────────────

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Main Component ───────────────────────────────────────────

export function SeatingCanvas({ siteId, spaceId }: SeatingCanvasProps) {
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Undo/Redo history ─────────────────────────────────────────
  const [history, setHistory] = useState<SeatingTable[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  // Keep refs so callbacks always see latest values without stale-closure issues
  const historyIndexRef = useRef(historyIndex);
  const tablesRef = useRef(tables);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  void spaceId;

  // ── Push snapshot to history ──────────────────────────────────
  const pushHistory = useCallback((snapshot: SeatingTable[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndexRef.current + 1);
      trimmed.push(snapshot);
      return trimmed.slice(-30); // keep last 30 snapshots
    });
    setHistoryIndex(prev => Math.min(prev + 1, 29));
  }, []);

  // ── Load data ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/seating?siteId=${encodeURIComponent(siteId)}`);
        const data = await res.json() as { tables: SeatingTable[]; guests: Guest[] };
        setTables(data.tables ?? []);
        setGuests(data.guests ?? []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load seating data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [siteId]);

  // ── Zoom via Cmd+scroll ─────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Pan via middle mouse or space+drag ─────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or space+left
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Deselect on canvas click ────────────────────────────────
  const handleCanvasClick = useCallback(() => {
    setSelectedTableId(undefined);
  }, []);

  // ── Add table ───────────────────────────────────────────────
  const addTable = useCallback(async (preset: TablePreset) => {
    setShowAddMenu(false);
    const tableCount = tables.length;
    // Grid placement: 200px apart
    const col = tableCount % 5;
    const row = Math.floor(tableCount / 5);
    const x = ROOM_MARGIN + 100 + col * 200;
    const y = ROOM_MARGIN + 100 + row * 200;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newTable: SeatingTable = {
      id: tempId,
      spaceId: spaceId ?? '',
      userId: '',
      label: `Table ${tableCount + 1}`,
      shape: preset.shape,
      capacity: preset.capacity,
      x,
      y,
      rotation: 0,
      isReserved: false,
      seats: Array.from({ length: preset.capacity }, (_, i) => ({
        id: `${tempId}-s${i + 1}`,
        tableId: tempId,
        seatNumber: i + 1,
      })),
    };
    setTables(prev => [...prev, newTable]);
    setSelectedTableId(tempId);

    try {
      const res = await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-table',
          siteId,
          label: newTable.label,
          shape: preset.shape,
          capacity: preset.capacity,
          x,
          y,
        }),
      });
      const data = await res.json() as { table: SeatingTable };
      if (data.table) {
        setTables(prev => prev.map(t => t.id === tempId ? data.table : t));
        setSelectedTableId(data.table.id);
      }
    } catch (err) {
      console.error('Failed to create table:', err);
    }
  }, [tables.length, siteId, spaceId]);

  // ── Move table (optimistic + debounced save) ────────────────
  const saveTablePosition = useDebouncedCallback(
    useCallback(async (id: string, x: number, y: number) => {
      setSaving(true);
      try {
        await fetch('/api/seating', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, x, y }),
        });
      } catch (err) {
        console.error('Failed to save table position:', err);
      } finally {
        setSaving(false);
      }
    }, []),
    500
  );

  const handleTableMove = useCallback((id: string, x: number, y: number) => {
    // Clamp to canvas bounds
    const clampedX = Math.max(ROOM_MARGIN, Math.min(CANVAS_W - ROOM_MARGIN, x));
    const clampedY = Math.max(ROOM_MARGIN, Math.min(CANVAS_H - ROOM_MARGIN, y));
    pushHistory(tablesRef.current);
    setTables(prev => prev.map(t => t.id === id ? { ...t, x: clampedX, y: clampedY } : t));
    void saveTablePosition(id, clampedX, clampedY);
  }, [saveTablePosition, pushHistory]);

  // ── Seat drop (guest assignment) ───────────────────────────
  const handleSeatDrop = useCallback(async (seatId: string, guestId: string) => {
    // Optimistic update
    pushHistory(tablesRef.current);
    setTables(prev => prev.map(t => ({
      ...t,
      seats: (t.seats ?? []).map(s =>
        s.id === seatId
          ? { ...s, guestId, guest: guests.find(g => g.id === guestId) }
          : s
      ),
    })));

    try {
      await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', seatId, guestId }),
      });
    } catch (err) {
      console.error('Failed to assign guest:', err);
    }
  }, [guests, pushHistory]);

  // ── Unassign all from table ─────────────────────────────────
  const handleUnassignAll = useCallback(async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, seats: (t.seats ?? []).map(s => ({ ...s, guestId: undefined, guest: undefined })) }
        : t
    ));

    // Unassign all seats
    await Promise.all(
      (table.seats ?? []).filter(s => s.guestId).map(s =>
        fetch('/api/seating', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unassign', seatId: s.id }),
        }).catch(err => console.error('Unassign error:', err))
      )
    );
  }, [tables]);

  // ── Update table props ──────────────────────────────────────
  const handleTableUpdate = useCallback(async (tableId: string, updates: Partial<SeatingTable>) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    try {
      await fetch('/api/seating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, ...updates }),
      });
    } catch (err) {
      console.error('Failed to update table:', err);
    }
  }, []);

  // ── Delete table ────────────────────────────────────────────
  const handleTableDelete = useCallback(async (tableId: string) => {
    pushHistory(tablesRef.current);
    setTables(prev => prev.filter(t => t.id !== tableId));
    setSelectedTableId(undefined);
    try {
      await fetch(`/api/seating?id=${encodeURIComponent(tableId)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  }, [pushHistory]);

  // ── Auto-arrange ────────────────────────────────────────────
  const handleAutoArrange = useCallback(async () => {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const spacingX = Math.min(220, (CANVAS_W - ROOM_MARGIN * 2) / cols);
    const spacingY = Math.min(220, (CANVAS_H - ROOM_MARGIN * 2) / Math.ceil(tables.length / cols));

    const updated = tables.map((t, i) => ({
      ...t,
      x: ROOM_MARGIN + 100 + (i % cols) * spacingX,
      y: ROOM_MARGIN + 100 + Math.floor(i / cols) * spacingY,
    }));
    setTables(updated);

    // Batch save positions
    await Promise.all(updated.map(t =>
      fetch('/api/seating', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, x: t.x, y: t.y }),
      }).catch(() => null)
    ));
  }, [tables]);

  // ── Fit to screen ───────────────────────────────────────────
  const handleFitScreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const scaleX = (width - 40) / CANVAS_W;
    const scaleY = (height - 40) / CANVAS_H;
    const newZoom = Math.min(scaleX, scaleY, MAX_ZOOM);
    setZoom(newZoom);
    setPan({ x: 20, y: 20 });
  }, []);

  // ── Undo / Redo keyboard shortcuts ────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isUndo = (e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey;
      const isRedo = (e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));
      if (!isUndo && !isRedo) return;
      e.preventDefault();
      setHistory(prevHistory => {
        setHistoryIndex(prevIdx => {
          if (isUndo && prevIdx > 0) {
            const snapshot = prevHistory[prevIdx - 1];
            setTables(snapshot);
            return prevIdx - 1;
          }
          if (isRedo && prevIdx < prevHistory.length - 1) {
            const snapshot = prevHistory[prevIdx + 1];
            setTables(snapshot);
            return prevIdx + 1;
          }
          return prevIdx;
        });
        return prevHistory;
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(prevHistory => {
      setHistoryIndex(prevIdx => {
        if (prevIdx > 0) {
          setTables(prevHistory[prevIdx - 1]);
          return prevIdx - 1;
        }
        return prevIdx;
      });
      return prevHistory;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(prevHistory => {
      setHistoryIndex(prevIdx => {
        if (prevIdx < prevHistory.length - 1) {
          setTables(prevHistory[prevIdx + 1]);
          return prevIdx + 1;
        }
        return prevIdx;
      });
      return prevHistory;
    });
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ── Derived stats ────────────────────────────────────────────
  const totalSeats = tables.reduce((n, t) => n + t.capacity, 0);
  const assignedSeats = tables.reduce((n, t) => n + (t.seats ?? []).filter(s => s.guestId).length, 0);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--eg-bg)', overflow: 'hidden' }}>

      {/* ── Canvas area ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderBottom: '1px solid var(--eg-divider)',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          {/* Add Table dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu(v => !v)}
              style={toolbarBtnStyle}
            >
              <Plus size={14} /> Add Table <ChevronDown size={12} />
            </button>
            {showAddMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.25rem)',
                  left: 0,
                  zIndex: 100,
                  background: '#fff',
                  border: '1.5px solid var(--eg-divider)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 8px 24px rgba(43,43,43,0.1)',
                  minWidth: '160px',
                  overflow: 'hidden',
                }}
              >
                {TABLE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => addTable(p)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.55rem 0.9rem',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--eg-font-body)',
                      color: 'var(--eg-fg)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--eg-accent-light)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-arrange */}
          <button onClick={handleAutoArrange} style={toolbarBtnStyle} title="Space tables evenly">
            <LayoutGrid size={14} /> Auto-arrange
          </button>

          <div style={{ width: '1px', height: '1.5rem', background: 'var(--eg-divider)', margin: '0 0.25rem' }} />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{ ...toolbarBtnStyle, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }}
          >
            ⌘Z
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            style={{ ...toolbarBtnStyle, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }}
          >
            ⌘⇧Z
          </button>

          <div style={{ width: '1px', height: '1.5rem', background: 'var(--eg-divider)', margin: '0 0.25rem' }} />

          {/* Zoom controls */}
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.1))} style={iconBtnStyle} title="Zoom in">
            <ZoomIn size={15} />
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', fontFamily: 'var(--eg-font-body)', minWidth: '3rem', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.1))} style={iconBtnStyle} title="Zoom out">
            <ZoomOut size={15} />
          </button>
          <button onClick={handleFitScreen} style={iconBtnStyle} title="Fit to screen">
            <Maximize2 size={14} />
          </button>

          <div style={{ width: '1px', height: '1.5rem', background: 'var(--eg-divider)', margin: '0 0.25rem' }} />

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', fontFamily: 'var(--eg-font-body)' }}>
              {tables.length} {tables.length === 1 ? 'table' : 'tables'} · {totalSeats} seats · {assignedSeats} assigned
            </span>
            {totalSeats > 0 && (
              <div style={{ marginTop: '4px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((assignedSeats / totalSeats) * 100)}%`,
                  background: 'rgba(163,177,138,0.8)',
                  borderRadius: '100px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}
          </div>

          {saving && (
            <span style={{ fontSize: '0.72rem', color: 'var(--eg-accent)', fontFamily: 'var(--eg-font-body)', marginLeft: 'auto' }}>
              Saving…
            </span>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            background: '#1A1714',
            cursor: isPanning.current ? 'grabbing' : 'default',
            position: 'relative',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
        >
          {/* Transformed canvas container */}
          <div
            style={{
              position: 'absolute',
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: CANVAS_W,
              height: CANVAS_H,
            }}
          >
            {/* Dot grid background */}
            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              <defs>
                <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.08)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dot-grid)" />
            </svg>

            {/* Room boundary */}
            <div
              style={{
                position: 'absolute',
                left: ROOM_MARGIN,
                top: ROOM_MARGIN,
                width: CANVAS_W - ROOM_MARGIN * 2,
                height: CANVAS_H - ROOM_MARGIN * 2,
                border: '2px dashed rgba(255,255,255,0.12)',
                borderRadius: '12px',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: ROOM_MARGIN + 8,
                top: ROOM_MARGIN + 6,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--eg-font-body)',
                pointerEvents: 'none',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Reception Hall
            </span>

            {/* Loading state */}
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--eg-font-body)', fontSize: '0.9rem' }}>
                  Loading seating chart…
                </p>
              </div>
            )}

            {/* Error state */}
            {!loading && loadError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <p style={{ color: 'rgba(239,68,68,0.8)', fontFamily: 'var(--eg-font-body)', fontSize: '0.9rem', maxWidth: '280px', textAlign: 'center' }}>
                  {loadError}
                </p>
                <button
                  onClick={() => { setLoadError(null); setLoading(true); }}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '0.6rem', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.8)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--eg-font-body)' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && tables.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem', margin: 0 }}>
                  Your canvas is empty
                </p>
                <p style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--eg-font-body)', fontSize: '0.82rem', margin: 0 }}>
                  Add your first table to start building your seating layout.
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddMenu(true); }}
                  style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid rgba(163,177,138,0.45)',
                    background: 'rgba(163,177,138,0.1)',
                    color: 'rgba(163,177,138,0.85)',
                    fontSize: '0.82rem',
                    fontFamily: 'var(--eg-font-body)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(163,177,138,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(163,177,138,0.7)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(163,177,138,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(163,177,138,0.45)';
                  }}
                >
                  <Plus size={13} />
                  Add your first table
                </button>
              </div>
            )}

            {/* Tables */}
            {tables.map(table => (
              <TableObject
                key={table.id}
                table={table}
                seats={table.seats ?? []}
                isSelected={selectedTableId === table.id}
                onSelect={() => setSelectedTableId(table.id)}
                onMove={(x, y) => handleTableMove(table.id, x, y)}
                onSeatDrop={handleSeatDrop}
                scale={zoom}
              />
            ))}
          </div>

          {/* Zoom hint */}
          <div style={{
            position: 'absolute', bottom: '0.75rem', left: '1rem',
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)',
            fontFamily: 'var(--eg-font-body)', pointerEvents: 'none',
          }}>
            Cmd+scroll to zoom · Alt+drag to pan
          </div>
        </div>
      </div>

      {/* ── Side panel ─────────────────────────────────────── */}
      <div style={{ width: '280px', flexShrink: 0, borderLeft: '1px solid var(--eg-divider)', display: 'flex', flexDirection: 'column' }}>
        <SeatingPanel
          siteId={siteId}
          guests={guests}
          tables={tables}
          selectedTableId={selectedTableId}
          onAssign={handleSeatDrop}
          onUnassignAll={handleUnassignAll}
          onTableUpdate={handleTableUpdate}
          onTableDelete={handleTableDelete}
        />
      </div>
    </div>
  );
}

// ─── Shared toolbar styles ────────────────────────────────────

const toolbarBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.75rem',
  border: '1.5px solid var(--eg-divider)',
  background: 'rgba(255,255,255,0.7)',
  color: 'var(--eg-fg)',
  fontSize: '0.78rem',
  fontFamily: 'var(--eg-font-body)',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2rem',
  height: '2rem',
  borderRadius: '0.6rem',
  border: '1.5px solid var(--eg-divider)',
  background: 'rgba(255,255,255,0.7)',
  color: 'var(--eg-muted)',
  cursor: 'pointer',
  transition: 'background 0.15s',
};
