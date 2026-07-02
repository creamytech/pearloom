'use client';

/* Rooms section — who sleeps where.

   Data: manifest.bachelor.rooms[] — the SAME field the Weekend
   planner tool (BachelorPanel "Rooms" group) owns; RoomsPanel is a
   thin editor over it. Each row:
     { id, name, guests }  — guests is a comma-separated string
   ("Jane, Maya"), split into chips here.

   Variants (layouts.ts): assignments (room cards + guest chips,
   default) | board (one ruled list). */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface RoomRowData { id?: string; name?: string; guests?: string }

export function readRooms(manifest: BlockSectionProps['manifest']): RoomRowData[] {
  const loose = manifest as unknown as { bachelor?: { rooms?: RoomRowData[] } };
  const rooms = Array.isArray(loose.bachelor?.rooms) ? loose.bachelor.rooms : [];
  return rooms.filter((r) => (r.name ?? '').trim() || (r.guests ?? '').trim());
}

function splitGuests(guests?: string): string[] {
  return (guests ?? '').split(/[,;·]/).map((g) => g.trim()).filter(Boolean);
}

const MONO = 'var(--t-mono, var(--pl-font-mono, ui-monospace, monospace))';

function GuestChip({ name }: { name: string }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 11px', borderRadius: 999,
        background: 'var(--t-accent-bg, var(--t-section))',
        color: 'var(--t-accent-ink, var(--t-ink))',
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--t-accent)', flexShrink: 0 }} />
      {name}
    </span>
  );
}

/* ─── assignments — one card per room, guests as chips. ──────── */

function RoomsAssignments({ rooms }: { rooms: RoomRowData[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
      {rooms.map((room, i) => {
        const guests = splitGuests(room.guests);
        return (
          <div
            key={room.id ?? i}
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 'var(--t-radius-lg, 14px)',
              padding: '16px 16px 18px',
              boxShadow: 'var(--t-shadow-sm, none)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: 'var(--t-display)', fontSize: 17, color: 'var(--t-ink)', lineHeight: 1.2 }}>
                {room.name?.trim() || `Room ${i + 1}`}
              </span>
              {guests.length > 0 && (
                <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', flexShrink: 0 }}>
                  {guests.length === 1 ? '1 guest' : `${guests.length} guests`}
                </span>
              )}
            </div>
            {guests.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {guests.map((g) => <GuestChip key={g} name={g} />)}
              </div>
            ) : (
              <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--t-ink-muted)' }}>
                Still open
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── board — a single ruled room / guests ledger. ───────────── */

function RoomsBoard({ rooms }: { rooms: RoomRowData[] }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {rooms.map((room, i) => {
        const guests = splitGuests(room.guests);
        return (
          <div
            key={room.id ?? i}
            style={{
              display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr',
              gap: 18, alignItems: 'baseline',
              padding: '13px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
            }}
          >
            <span style={{ fontFamily: 'var(--t-display)', fontSize: 15.5, color: 'var(--t-ink)' }}>
              {room.name?.trim() || `Room ${i + 1}`}
            </span>
            <span style={{ fontSize: 13, color: guests.length ? 'var(--t-ink-soft)' : 'var(--t-ink-muted)', fontStyle: guests.length ? 'normal' : 'italic', textAlign: 'right' }}>
              {guests.length ? guests.join(' · ') : 'Still open'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function RoomsSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const rooms = readRooms(manifest);
  const empty = rooms.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'roomsEyebrow', 'The house')}
        title={blockCopy(manifest, 'roomsTitle', 'Who sleeps where')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('roomsEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('roomsTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add rooms and who's in them in the Rooms panel (or the Weekend planner)." />
      ) : variant === 'board' ? (
        <RoomsBoard rooms={rooms} />
      ) : (
        <RoomsAssignments rooms={rooms} />
      )}
    </BlockFrame>
  );
}
