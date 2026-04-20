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
  LayoutGrid, ExternalLink, Plus, Circle, Square,
  RefreshCw, Sparkles,
} from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import { useEditor } from '@/lib/editor-state';
import { logEditorError } from '@/lib/editor-log';
import {
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';
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
  { label: 'Banquet (16)',    shape: 'banquet',     capacity: 16 },
];

interface SeatingEditorPanelProps {
  siteId: string;
}

const eyebrowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  fontSize: panelText.label,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.wider,
  textTransform: 'uppercase',
  color: '#71717A',
  fontFamily: 'inherit',
  lineHeight: panelLineHeight.tight,
};

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
    } catch (err) {
      logEditorError('SeatingEditorPanel: load seating data', err);
    }
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
    } catch (err) {
      logEditorError('SeatingEditorPanel: add table', err);
    }
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
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#71717A',
        fontSize: panelText.body,
        fontFamily: 'inherit',
        lineHeight: panelLineHeight.snug,
      }}>
        Loading seating…
      </div>
    );
  }

  const fillPct = stats.totalSeats > 0 ? Math.round((stats.assignedSeats / stats.totalSeats) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={eyebrowStyle}>
          <LayoutGrid size={12} /> Seating Chart
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          title="Refresh"
          style={{
            width: '24px', height: '24px', borderRadius: 'var(--pl-radius-sm)',
            border: 'none', background: 'transparent',
            color: '#71717A',
            cursor: refreshing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'pl-spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* AI Arrange button */}
      <motion.button
        onClick={handleAIArrange}
        disabled={optimizing}
        whileHover={!optimizing ? { y: -1 } : {}}
        whileTap={!optimizing ? { scale: 0.98 } : {}}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px 12px',
          borderRadius: 'var(--pl-radius-md)',
          border: 'none',
          background: optimizing ? '#E4E4E7' : '#18181B',
          color: optimizing ? '#71717A' : '#FFFFFF',
          cursor: optimizing ? 'default' : 'pointer',
          fontSize: panelText.body,
          fontWeight: panelWeight.bold,
          fontFamily: 'inherit',
          lineHeight: panelLineHeight.tight,
          transition: 'all var(--pl-dur-instant)',
        }}
      >
        <Sparkles size={13} style={{ animation: optimizing ? 'pl-spin 1s linear infinite' : 'none' }} />
        {optimizing ? 'Optimizing…' : 'AI Arrange'}
      </motion.button>

      {/* Optimize feedback */}
      {optimizeMsg && (
        <p style={{
          margin: '-6px 0 0',
          fontSize: panelText.hint,
          color: '#3F3F46',
          fontFamily: 'inherit',
          lineHeight: panelLineHeight.snug,
          textAlign: 'center',
        }}>
          {optimizeMsg}
        </p>
      )}
      {optimizeError && (
        <p style={{
          margin: '-6px 0 0',
          fontSize: panelText.hint,
          color: '#b34747',
          fontWeight: panelWeight.semibold,
          fontFamily: 'inherit',
          lineHeight: panelLineHeight.snug,
          textAlign: 'center',
        }}>
          {optimizeError}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {[
          { label: 'Tables', value: stats.tables, accent: '#71717A' },
          { label: 'Total seats', value: stats.totalSeats, accent: '#71717A' },
          { label: 'Assigned', value: stats.assignedSeats, accent: '#71717A' },
          { label: 'Unassigned', value: stats.unassignedGuests, accent: stats.unassignedGuests > 0 ? '#C97E3F' : '#71717A' },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{
            padding: '10px 12px',
            borderRadius: 'var(--pl-radius-lg)',
            background: '#FAFAFA',
            border: '1px solid #E4E4E7',
          }}>
            <div style={{
              fontSize: panelText.meta,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.wider,
              textTransform: 'uppercase',
              color: '#71717A',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
            }}>
              {label}
            </div>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: panelWeight.heavy,
              color: accent,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              marginTop: '4px',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Fill bar */}
      {stats.totalSeats > 0 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}>
            <span style={{
              fontSize: panelText.hint,
              color: '#71717A',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
            }}>
              Seat fill
            </span>
            <span style={{
              fontSize: panelText.hint,
              color: '#18181B',
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
            }}>
              {fillPct}%
            </span>
          </div>
          <div style={{
            height: '6px',
            borderRadius: 'var(--pl-radius-xs)',
            background: '#E4E4E7',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${fillPct}%`, borderRadius: 'var(--pl-radius-xs)',
              background: fillPct >= 90 ? '#e87a7a' : '#18181B',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Open full editor button */}
      <motion.button
        onClick={openFullEditor}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px 12px',
          borderRadius: 'var(--pl-radius-md)',
          border: '1px solid #E4E4E7',
          background: '#F4F4F5',
          color: '#18181B',
          cursor: 'pointer',
          fontSize: panelText.body,
          fontWeight: panelWeight.bold,
          fontFamily: 'inherit',
          lineHeight: panelLineHeight.tight,
          transition: 'all var(--pl-dur-instant)',
        }}
      >
        <LayoutGrid size={13} /> Open Full Editor <ExternalLink size={11} />
      </motion.button>

      {/* Tables list */}
      {tables.length > 0 && (
        <SidebarSection title={`Tables (${tables.length})`} defaultOpen={false}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
          }}>
            {tables.map(table => {
              const ShapeIcon = SHAPE_ICON[table.shape] || Circle;
              const assigned = (table.seats || []).filter(s => s.guestId).length;
              const full = assigned === table.capacity;
              return (
                <div
                  key={table.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--pl-radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                  }}
                >
                  <ShapeIcon size={12} color={table.isReserved ? '#D6C6A8' : '#71717A'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: panelText.body,
                      fontWeight: panelWeight.semibold,
                      color: '#18181B',
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.tight,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {table.label}
                      {table.isReserved && (
                        <span style={{
                          color: '#71717A',
                          marginLeft: '6px',
                          fontSize: panelText.meta,
                          fontWeight: panelWeight.bold,
                          letterSpacing: panelTracking.wide,
                          textTransform: 'uppercase',
                        }}>
                          Reserved
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: panelText.hint,
                    fontWeight: panelWeight.bold,
                    color: full ? '#18181B' : '#71717A',
                    fontFamily: 'inherit',
                    lineHeight: panelLineHeight.tight,
                    flexShrink: 0,
                  }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TABLE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handleAddTable(preset)}
              disabled={addingTable}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--pl-radius-md)',
                border: '1px solid #E4E4E7',
                background: '#FFFFFF',
                color: '#18181B',
                cursor: addingTable ? 'default' : 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                textAlign: 'left',
                transition: 'all var(--pl-dur-instant)',
              }}
            >
              {preset.shape === 'round' ? <Circle size={12} color="#71717A" /> : <Square size={12} color="#71717A" />}
              {preset.label}
            </button>
          ))}
        </div>
      </SidebarSection>

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
