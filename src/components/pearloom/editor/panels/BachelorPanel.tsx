'use client';

/* eslint-disable no-restricted-syntax */
/* BachelorPanel — workspace for bachelor/ette weekends (and
   reunions, friend trips, anything multi-day-friends-only).

   Five groups:
     - Cost splitter   — line items with per-person amount
     - Activity vote   — multi-choice polls
     - Packing list    — checklist by category
     - Rooms           — sleeping arrangements
     - Group chat URL  — paste a WhatsApp/Telegram/iMessage invite

   Writes manifest.bachelor = { costs[], votes[], packing[], rooms[], groupChatUrl } */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, SectionPanelShell } from './_section-atoms';

interface CostRow { id: string; label: string; amount: string }
interface VotePoll { id: string; question: string; options: string[] }
interface PackingRow { id: string; item: string }
interface RoomRow { id: string; name: string; guests: string }

interface BachelorData {
  costs?: CostRow[];
  votes?: VotePoll[];
  packing?: PackingRow[];
  rooms?: RoomRow[];
  groupChatUrl?: string;
}

const DEFAULT_COSTS: CostRow[] = [
  { id: 'c1', label: 'House rental',       amount: '480' },
  { id: 'c2', label: 'Sunday brunch + tip', amount: '52' },
];
const DEFAULT_PACKING: PackingRow[] = [
  { id: 'p1', item: 'Beach towel' },
  { id: 'p2', item: 'Comfortable walking shoes' },
  { id: 'p3', item: 'Something white for night two' },
];
const DEFAULT_ROOMS: RoomRow[] = [
  { id: 'r1', name: 'Master suite',    guests: '' },
  { id: 'r2', name: 'Garden room',     guests: '' },
];

export function BachelorPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const loose = manifest as unknown as { bachelor?: BachelorData };
  const data: BachelorData = loose.bachelor ?? {};
  const costs   = (data.costs && data.costs.length > 0)     ? data.costs   : DEFAULT_COSTS;
  const votes   = data.votes   ?? [];
  const packing = (data.packing && data.packing.length > 0) ? data.packing : DEFAULT_PACKING;
  const rooms   = (data.rooms && data.rooms.length > 0)     ? data.rooms   : DEFAULT_ROOMS;
  const groupChatUrl = data.groupChatUrl ?? '';

  const patch = (next: Partial<BachelorData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...data, ...next },
  } as unknown as StoryManifest);

  const totalCost = costs.reduce((sum, c) => sum + (parseFloat(c.amount.replace(/[^\d.]/g, '')) || 0), 0);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ padding: 12, borderRadius: 10, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.18)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--peach-ink)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Weekend planner
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Cost splitter, polls, packing list, sleeping arrangements, and a single place to drop the group chat link.
          </div>
        </div>

        {/* Cost splitter */}
        <FGroup label={`Cost splitter · $${totalCost.toFixed(0)} total`} hint="Group costs everyone chips in toward.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {costs.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <FInput
                  value={c.label}
                  onChange={(v) => patch({ costs: costs.map((row, idx) => idx === i ? { ...row, label: v } : row) })}
                  placeholder="House rental"
                />
                <div style={{ width: 100, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600 }}>$</span>
                  <input
                    value={c.amount}
                    onChange={(e) => patch({ costs: costs.map((row, idx) => idx === i ? { ...row, amount: e.target.value } : row) })}
                    placeholder="0"
                    inputMode="decimal"
                    style={{
                      width: '100%', padding: '10px 10px 10px 22px',
                      borderRadius: 10, border: '1px solid var(--line)',
                      background: 'var(--cream-2)', fontSize: 13,
                      color: 'var(--ink)', outline: 'none',
                      textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => patch({ costs: costs.filter((_, idx) => idx !== i) })}
                  aria-label="Remove cost"
                  style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
            <AddCard
              label="Add a cost"
              onClick={() => patch({ costs: [...costs, { id: `c-${Date.now().toString(36)}`, label: '', amount: '' }] })}
            />
          </div>
        </FGroup>

        {/* Activity votes */}
        <FGroup label={`Polls · ${votes.length}`} hint="Multi-choice questions for the group. They vote on the site.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {votes.map((poll, i) => (
              <div key={poll.id} style={{
                padding: 10, borderRadius: 11,
                background: 'var(--card)', border: '1px solid var(--line)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <FInput
                  value={poll.question}
                  onChange={(v) => patch({ votes: votes.map((p, idx) => idx === i ? { ...p, question: v } : p) })}
                  icon="sparkles"
                  placeholder="Which bar Friday night?"
                />
                {poll.options.map((opt, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--line)', flexShrink: 0 }} />
                    <input
                      value={opt}
                      onChange={(e) => patch({ votes: votes.map((p, idx) => idx === i ? { ...p, options: p.options.map((o, k) => k === j ? e.target.value : o) } : p) })}
                      placeholder="Option text"
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8,
                        border: '1px solid var(--line-soft)', background: 'transparent',
                        fontSize: 12.5, color: 'var(--ink)', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => patch({ votes: votes.map((p, idx) => idx === i ? { ...p, options: p.options.filter((_, k) => k !== j) } : p) })}
                      aria-label="Remove option"
                      style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => patch({ votes: votes.map((p, idx) => idx === i ? { ...p, options: [...p.options, ''] } : p) })}
                  style={{
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--cream-2)', border: '1px solid var(--line-soft)',
                    fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)',
                    cursor: 'pointer', alignSelf: 'flex-start',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Icon name="plus" size={11} color="var(--ink-soft)" />
                  Add option
                </button>
                <button
                  type="button"
                  onClick={() => patch({ votes: votes.filter((_, idx) => idx !== i) })}
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', alignSelf: 'flex-end',
                  }}
                >
                  Remove poll
                </button>
              </div>
            ))}
            <AddCard
              label="Add a poll"
              onClick={() => patch({ votes: [...votes, { id: `v-${Date.now().toString(36)}`, question: '', options: ['', ''] }] })}
            />
          </div>
        </FGroup>

        {/* Packing list */}
        <FGroup label={`Packing list · ${packing.length}`} hint="What everyone should bring. Guests check items off on the site.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {packing.map((row, i) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--line)', flexShrink: 0 }} />
                <input
                  value={row.item}
                  onChange={(e) => patch({ packing: packing.map((p, idx) => idx === i ? { ...p, item: e.target.value } : p) })}
                  placeholder="Comfortable walking shoes"
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--line-soft)', background: 'transparent',
                    fontSize: 12.5, color: 'var(--ink)', outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => patch({ packing: packing.filter((_, idx) => idx !== i) })}
                  aria-label="Remove item"
                  style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
                >
                  <Icon name="close" size={10} />
                </button>
              </div>
            ))}
            <AddCard
              label="Add an item"
              onClick={() => patch({ packing: [...packing, { id: `p-${Date.now().toString(36)}`, item: '' }] })}
            />
          </div>
        </FGroup>

        {/* Rooms */}
        <FGroup label={`Rooms · ${rooms.length}`} hint="Sleeping arrangements. Assign guests to rooms.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rooms.map((row, i) => (
              <div key={row.id} style={{
                padding: 10, borderRadius: 11,
                background: 'var(--card)', border: '1px solid var(--line)',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <FInput
                  value={row.name}
                  onChange={(v) => patch({ rooms: rooms.map((r, idx) => idx === i ? { ...r, name: v } : r) })}
                  icon="home"
                  placeholder="Master suite"
                />
                <FInput
                  value={row.guests}
                  onChange={(v) => patch({ rooms: rooms.map((r, idx) => idx === i ? { ...r, guests: v } : r) })}
                  icon="user"
                  placeholder="Jane, Maya"
                />
                <button
                  type="button"
                  onClick={() => patch({ rooms: rooms.filter((_, idx) => idx !== i) })}
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', alignSelf: 'flex-end',
                  }}
                >
                  Remove room
                </button>
              </div>
            ))}
            <AddCard
              label="Add a room"
              onClick={() => patch({ rooms: [...rooms, { id: `r-${Date.now().toString(36)}`, name: '', guests: '' }] })}
            />
          </div>
        </FGroup>

        {/* Group chat */}
        <FGroup label="Group chat" hint="One link the whole crew can join. Pasted at the top of the site.">
          <FInput
            value={groupChatUrl}
            onChange={(v) => patch({ groupChatUrl: v })}
            icon="link"
            type="url"
            placeholder="https://chat.whatsapp.com/..."
          />
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default BachelorPanel;
