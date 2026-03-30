'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/seating/TableObject.tsx
// Draggable table object for the seating canvas
// Renders round/rectangular shapes with radial seat arrangement
// ─────────────────────────────────────────────────────────────

import { useRef, useState, useCallback } from 'react';
import type { SeatingTable, Seat } from '@/types';
import { GuestChip } from './GuestChip';

export interface TableObjectProps {
  table: SeatingTable;
  seats: Seat[];
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onSeatDrop: (seatId: string, guestId: string) => void;
  scale?: number;
}

const TABLE_RADIUS = 64; // px for round tables (at 1x scale)
const SEAT_RADIUS = 13; // seat circle radius
const RECT_W = 160;
const RECT_H = 80;

function colorFromName(name: string): string {
  const COLORS = ['#A3B18A','#8FA876','#D6C6A8','#6D597A','#C8A47A','#7A9BB3','#B38A8A','#8AB38A'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SeatCircle({
  seat,
  cx,
  cy,
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  seat: Seat;
  cx: number;
  cy: number;
  isDragOver: boolean;
  onDrop: (seatId: string, guestId: string) => void;
  onDragOver: (seatId: string) => void;
  onDragLeave: () => void;
}) {
  const guest = seat.guest;
  const r = SEAT_RADIUS;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(seat.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const guestId = e.dataTransfer.getData('guestId');
    if (guestId) onDrop(seat.id, guestId);
  };

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      style={{ cursor: 'default' }}
    >
      <circle
        r={r}
        fill={guest ? colorFromName(guest.name) : isDragOver ? 'rgba(163,177,138,0.35)' : 'rgba(245,241,232,0.9)'}
        stroke={isDragOver ? '#A3B18A' : guest ? 'rgba(255,255,255,0.6)' : '#D6C6A8'}
        strokeWidth={isDragOver ? 2 : 1}
        style={{ transition: 'fill 0.15s, stroke 0.15s' }}
      />
      {guest && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7"
          fontWeight="700"
          fill="#fff"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {initials(guest.name)}
        </text>
      )}
      {!guest && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fill="#9A9488"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {seat.seatNumber}
        </text>
      )}
    </g>
  );
}

export function TableObject({
  table,
  seats,
  isSelected,
  onSelect,
  onMove,
  onSeatDrop,
  scale = 1,
}: TableObjectProps) {
  const dragRef = useRef<{ startX: number; startY: number; tableX: number; tableY: number } | null>(null);
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [dragOverSeat, setDragOverSeat] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const assignedCount = seats.filter(s => s.guest).length;
  const hasConflict = assignedCount > table.capacity;

  // ── Pointer drag for moving table ──────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag on primary pointer, left button
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tableX: table.x,
      tableY: table.y,
    };
    setIsDraggingTable(false);
  }, [onSelect, table.x, table.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / scale;
    const dy = (e.clientY - dragRef.current.startY) / scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDraggingTable(true);
      onMove(dragRef.current.tableX + dx, dragRef.current.tableY + dy);
    }
  }, [onMove, scale]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDraggingTable(false);
  }, []);

  // ── Canvas-level drag-over for table drop zone ─────────────
  const onTableDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(true);
  };
  const onTableDragLeave = () => setIsDropTarget(false);
  const onTableDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    // Find first empty seat
    const empty = seats.find(s => !s.guest);
    if (!empty) return;
    const guestId = e.dataTransfer.getData('guestId');
    if (guestId) onSeatDrop(empty.id, guestId);
  };

  const isRound = table.shape === 'round';
  const isRect = table.shape === 'rectangular' || table.shape === 'banquet';

  // SVG viewBox dimensions
  const pad = SEAT_RADIUS + 6;
  let svgW: number;
  let svgH: number;
  let tableBody: React.ReactNode;
  let seatNodes: React.ReactNode[] = [];

  if (isRound) {
    const R = TABLE_RADIUS;
    svgW = (R + pad) * 2;
    svgH = (R + pad) * 2;
    const cx = svgW / 2;
    const cy = svgH / 2;

    tableBody = (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill={isDropTarget ? 'rgba(163,177,138,0.15)' : '#F5F1E8'}
          stroke={isSelected ? '#A3B18A' : '#D6C6A8'}
          strokeWidth={isSelected ? 2.5 : 1.5}
          style={{ transition: 'fill 0.15s' }}
        />
        {/* Table label */}
        <text
          x={cx}
          y={cy - 7}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="600"
          fill="#2B2B2B"
          fontFamily="var(--eg-font-heading)"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {table.label}
        </text>
        {/* Capacity */}
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fill="#9A9488"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {assignedCount}/{table.capacity}
        </text>
      </>
    );

    // Radial seat placement
    seatNodes = seats.map((seat, i) => {
      const angle = (2 * Math.PI * i) / seats.length - Math.PI / 2;
      const seatCx = cx + (R + SEAT_RADIUS + 4) * Math.cos(angle);
      const seatCy = cy + (R + SEAT_RADIUS + 4) * Math.sin(angle);
      return (
        <SeatCircle
          key={seat.id}
          seat={seat}
          cx={seatCx}
          cy={seatCy}
          isDragOver={dragOverSeat === seat.id}
          onDrop={onSeatDrop}
          onDragOver={setDragOverSeat}
          onDragLeave={() => setDragOverSeat(null)}
        />
      );
    });

  } else if (isRect) {
    // Rectangular / banquet table
    const W = RECT_W;
    const H = RECT_H;
    svgW = W + pad * 2;
    svgH = H + pad * 2;
    const ox = pad;
    const oy = pad;

    tableBody = (
      <>
        <rect
          x={ox}
          y={oy}
          width={W}
          height={H}
          rx={8}
          fill={isDropTarget ? 'rgba(163,177,138,0.15)' : '#F5F1E8'}
          stroke={isSelected ? '#A3B18A' : '#D6C6A8'}
          strokeWidth={isSelected ? 2.5 : 1.5}
          style={{ transition: 'fill 0.15s' }}
        />
        <text
          x={ox + W / 2}
          y={oy + H / 2 - 7}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="600"
          fill="#2B2B2B"
          fontFamily="var(--eg-font-heading)"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {table.label}
        </text>
        <text
          x={ox + W / 2}
          y={oy + H / 2 + 9}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fill="#9A9488"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {assignedCount}/{table.capacity}
        </text>
      </>
    );

    // Seats along long sides
    const half = Math.ceil(seats.length / 2);
    seatNodes = seats.map((seat, i) => {
      const isTop = i < half;
      const idx = isTop ? i : i - half;
      const count = isTop ? half : seats.length - half;
      const spacing = W / (count + 1);
      const seatCx = ox + spacing * (idx + 1);
      const seatCy = isTop
        ? oy - SEAT_RADIUS - 4
        : oy + H + SEAT_RADIUS + 4;

      return (
        <SeatCircle
          key={seat.id}
          seat={seat}
          cx={seatCx}
          cy={seatCy}
          isDragOver={dragOverSeat === seat.id}
          onDrop={onSeatDrop}
          onDragOver={setDragOverSeat}
          onDragLeave={() => setDragOverSeat(null)}
        />
      );
    });

  } else {
    // Square table fallback
    const S = 100;
    svgW = S + pad * 2;
    svgH = S + pad * 2;
    const ox = pad;
    const oy = pad;

    tableBody = (
      <rect
        x={ox} y={oy} width={S} height={S} rx={6}
        fill="#F5F1E8"
        stroke={isSelected ? '#A3B18A' : '#D6C6A8'}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
    );

    seatNodes = seats.map((seat, i) => {
      const angle = (2 * Math.PI * i) / seats.length - Math.PI / 2;
      const R2 = (S / 2) + SEAT_RADIUS + 4;
      const seatCx = ox + S / 2 + R2 * Math.cos(angle);
      const seatCy = oy + S / 2 + R2 * Math.sin(angle);
      return (
        <SeatCircle
          key={seat.id}
          seat={seat}
          cx={seatCx}
          cy={seatCy}
          isDragOver={dragOverSeat === seat.id}
          onDrop={onSeatDrop}
          onDragOver={setDragOverSeat}
          onDragLeave={() => setDragOverSeat(null)}
        />
      );
    });
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: table.x,
        top: table.y,
        transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`,
        cursor: isDraggingTable ? 'grabbing' : 'grab',
        userSelect: 'none',
        zIndex: isSelected ? 10 : 1,
        filter: isDraggingTable ? 'drop-shadow(0 8px 20px rgba(43,43,43,0.18))' : 'none',
        transition: isDraggingTable ? 'none' : 'filter 0.15s',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDragOver={onTableDragOver}
      onDragLeave={onTableDragLeave}
      onDrop={onTableDrop}
    >
      <svg
        width={svgW}
        height={svgH}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {tableBody}
        {seatNodes}

        {/* Conflict indicator */}
        {hasConflict && (
          <circle cx={svgW - 8} cy={8} r={6} fill="#ef4444" />
        )}

        {/* Reserved badge */}
        {table.isReserved && (
          <text
            x={svgW / 2}
            y={svgH - 4}
            textAnchor="middle"
            fontSize="7"
            fill="#9A9488"
            fontStyle="italic"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            reserved
          </text>
        )}
      </svg>

      {/* Drag chip shown when dragging table */}
      {isDraggingTable && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(163,177,138,0.2)',
            borderRadius: '50%',
            width: '2rem',
            height: '2rem',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
