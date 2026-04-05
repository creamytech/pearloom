'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SeatingEditorPanel.tsx
//
// Sidebar panel that shows seating summary stats and links
// to the full-page SeatingCanvas at /seating?siteId=xxx.
// Also lets the user add tables directly from the panel.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid, ExternalLink, Plus, Users, Circle, Square,
  RefreshCw, Sparkles,
} from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import { useEditor } from '@/lib/editor-state';
import type { SeatingTable, Guest } from '@/types';

interface SeatingStats {
  tables: number;
  totalSeats: number;
  assignedSeats: number;
  unassignedGuests: number;
}

function computeStats(tables: SeatingTable[], guests: Guest[]): SeatingStats {
  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const assignedSeats = tables.reduce((sum, t) => sum + (t.seats || []).filter(s => s.guestId).length, 0);
  const assignedGuestIds = new Set(
    tables.flatMap(t => (t.seats || []).map(s => s.guestId).filter(Boolean))
  );
  const unassignedGuests = guests.filter(g => g.status === 'attending' && !assignedGuestIds.has(g.id)).length;
  return { tables: tables.length, totalSeats, assignedSeats, unassignedGuests };
}

const SHAPE_ICON: Record<string, React.ElementType> = {
  round: Circle, rectangular: Square, banquet: Square, square: Square,
};

const TABLE_PRESETS: Array<{ label: string; shape: SeatingTable['shape']; capacity: number }> = [
  { label: 'Round (8)',       shape: 'round',       capacity: 8 },
  { label: 'Round (6)',       shape: 'round',       capacity: 6 },
  { label: 'Rectangular (8)', shape: 'rectangular', capacity: 8 },
  { label: 'Sweetheart (2)',  shape: 'rectangular', capacity: 2 },
  { label: 'Banquet (16)',    shape: 'banquet',      capacity: 16 },
];

interface SeatingEditorPanelProps {
  siteId: string;
}

export function SeatingEditorPanel({ siteId }: SeatingEditorPanelProps) {
  const { coupleNames } = useEditor();
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingTable, setAddingTable] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState<string | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!siteId) return;
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(`/api/seating?siteId=${encodeURIComponent(siteId)}`);
      if (res.ok) {
        const { tables: t = [], guests: g = [] } = await res.json();
        setTables(t); setGuests(g);
      }
    } catch {}
    setLoading(false); setRefreshing(false);
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  const stats = computeStats(tables, guests);

  const handleAddTable = async (preset: typeof TABLE_PRESETS[number]) => {
    setAddingTable(true);
    try {
      const res = await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-table',
          siteId,
          label: `Table ${tables.length + 1}`,
          shape: preset.shape,
          capacity: preset.capacity,
          x: 100 + (tables.length % 4) * 200,
          y: 100 + Math.floor(tables.length / 4) * 180,
        }),
      });
      if (res.ok) await load(true);
    } catch {}
    setAddingTable(false);
  };

  const handleAIArrange = async () => {
    setOptimizing(true);
    setOptimizeMsg(null);
    setOptimizeError(null);
    try {
      const res = await fetch('/api/seating/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteId, coupleNames }),
      });
      const data = await res.json() as { assignments?: unknown[]; tablesUpdated?: number; error?: string };
      if (!res.ok || data.error) {
        setOptimizeError(data.error || 'Optimization failed. Please try again.');
      } else {
        setOptimizeMsg(`Guests arranged! Refresh to see the updated seating.`);
        await load(true);
      }
    } catch {
      setOptimizeError('Network error. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };

  const openFullEditor = () => {
    window.open(`/seating?siteId=${encodeURIComponent(siteId)}`, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--pl-muted)', fontSize: '0.8rem' }}>
        Loading seating…
      </div>
    );
  }

  const fillPct = stats.totalSeats > 0 ? Math.round((stats.assignedSeats / stats.totalSeats) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(214,198,168,0.5)',
        }}>
          <LayoutGrid size={11} /> Seating Chart
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', padding: '3px', display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'pl-spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* AI Arrange button */}
      <motion.button
        onClick={handleAIArrange}
        disabled={optimizing}
        whileHover={!optimizing ? { scale: 1.02 } : {}}
        whileTap={!optimizing ? { scale: 0.97 } : {}}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '10px', borderRadius: '9px',
          border: '1px solid rgba(163,177,138,0.3)',
          background: optimizing
            ? 'rgba(163,177,138,0.06)'
            : 'linear-gradient(135deg, rgba(163,177,138,0.18) 0%, rgba(143,200,122,0.12) 100%)',
          color: optimizing ? 'rgba(163,177,138,0.5)' : '#A3B18A',
          cursor: optimizing ? 'default' : 'pointer',
          fontSize: '0.78rem', fontWeight: 700,
          transition: 'all 0.15s',
        }}
      >
        <Sparkles size={13} style={{ animation: optimizing ? 'pl-spin 1s linear infinite' : 'none' }} />
        {optimizing ? 'Optimizing…' : '✦ AI Arrange'}
      </motion.button>

      {/* Optimize feedback */}
      {optimizeMsg && (
        <p style={{ margin: '-6px 0 0', fontSize: '0.72rem', color: '#A3B18A', textAlign: 'center' }}>
          {optimizeMsg}
        </p>
      )}
      {optimizeError && (
        <p style={{ margin: '-6px 0 0', fontSize: '0.72rem', color: '#f87171', textAlign: 'center' }}>
          {optimizeError}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {[
          { label: 'Tables', value: stats.tables, color: '#A3B18A' },
          { label: 'Total seats', value: stats.totalSeats, color: '#D6C6A8' },
          { label: 'Assigned', value: stats.assignedSeats, color: '#A3B18A' },
          { label: 'Unassigned', value: stats.unassignedGuests, color: stats.unassignedGuests > 0 ? '#fbbf24' : '#A3B18A' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '8px 10px', borderRadius: '9px',
            background: `${color}0d`, border: `1px solid ${color}20`,
          }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--pl-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Fill bar */}
      {stats.totalSeats > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--pl-muted)' }}>Seat fill</span>
            <span style={{ fontSize: '0.68rem', color: '#A3B18A', fontWeight: 700 }}>{fillPct}%</span>
          </div>
          <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${fillPct}%`, borderRadius: '3px',
              background: fillPct >= 90 ? '#f87171' : '#A3B18A',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Open full editor button */}
      <motion.button
        onClick={openFullEditor}
        whileHover={{ scale: 1.02, borderColor: 'rgba(214,198,168,0.3)' }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '10px', borderRadius: '9px',
          border: '1px solid rgba(214,198,168,0.15)',
          background: 'rgba(214,198,168,0.05)',
          color: '#D6C6A8', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
        }}
      >
        <LayoutGrid size={13} /> Open Full Seating Editor <ExternalLink size={11} />
      </motion.button>

      {/* Tables list */}
      {tables.length > 0 && (
        <SidebarSection title={`Tables (${tables.length})`} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '200px', overflowY: 'auto' }}>
            {tables.map(table => {
              const ShapeIcon = SHAPE_ICON[table.shape] || Circle;
              const assigned = (table.seats || []).filter(s => s.guestId).length;
              return (
                <div key={table.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '7px',
                  background: 'rgba(163,177,138,0.04)',
                }}>
                  <ShapeIcon size={11} color={table.isReserved ? '#D6C6A8' : 'var(--pl-muted)'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {table.label}
                      {table.isReserved && <span style={{ color: '#D6C6A8', marginLeft: '4px', fontSize: '0.62rem' }}>Reserved</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: assigned === table.capacity ? '#A3B18A' : 'var(--pl-muted)', flexShrink: 0 }}>
                    {assigned}/{table.capacity}
                  </div>
                </div>
              );
            })}
          </div>
        </SidebarSection>
      )}

      {/* Add table */}
      <SidebarSection title="Add Table" defaultOpen={false} icon={Plus}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {TABLE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handleAddTable(preset)}
              disabled={addingTable}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', borderRadius: '7px',
                border: '1px solid rgba(0,0,0,0.05)',
                background: 'rgba(163,177,138,0.04)',
                color: 'var(--pl-ink-soft)', cursor: 'pointer', fontSize: '0.75rem',
                textAlign: 'left',
              }}
            >
              {preset.shape === 'round' ? <Circle size={11} /> : <Square size={11} />}
              {preset.label}
            </button>
          ))}
        </div>
      </SidebarSection>

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
