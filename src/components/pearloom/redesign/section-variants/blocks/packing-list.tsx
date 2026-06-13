'use client';

/* Packing list section — what to bring.

   Data: manifest.bachelor.packing[]  — the SAME field the Weekend
   planner tool (BachelorPanel) edits. PackingListPanel is a thin
   editor over it.
     { id, item, category? }   (category groups; blank → "Essentials")

   Per-guest check-offs are PORTED from the legacy PackingListBlock
   (src/components/site/PackingListBlock.tsx) and keep its contract:
     - localStorage ONLY, key `pearloom:packing:<siteSlug>`, value a
       JSON string[] of checked item labels.
     - DELIBERATELY never server-synced — a packing tick is "did *I*
       pack sunscreen?", personal to the device. Do not "fix" this by
       adding sync (documented in the legacy block + the 2026-04-23
       event-OS migration, which excludes packingList on purpose).
     - Editor canvas: checks disabled + a "guests check these off
       privately" chip so hosts know the affordance exists.

   Variants (layouts.ts):
     checklist — grouped checklist column with the guest's personal
                 check-offs and a transform/opacity check pop.
     grid      — category cards with item chips; a check fills the
                 chip with the accent. */

import { useState, type CSSProperties } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface PackingRowData { id?: string; item?: string; category?: string }

export function readPacking(manifest: BlockSectionProps['manifest']): PackingRowData[] {
  const loose = manifest as unknown as { bachelor?: { packing?: PackingRowData[] } };
  return Array.isArray(loose.bachelor?.packing) ? loose.bachelor.packing : [];
}

/* ─── per-guest check-off store (legacy key shape, by design) ─── */

function packingStoreKey(manifest: BlockSectionProps['manifest']): string {
  const slug = (manifest.subdomain ?? '').trim() || 'default';
  return `pearloom:packing:${slug}`;
}

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

/* Check-pop keyframes — transform/opacity only (compositor-safe),
   killed under prefers-reduced-motion. The glyph mounts when an item
   becomes checked, so the entrance animation IS the check animation. */
const PACK_POP_CSS = `
@keyframes pl8-pack-pop {
  from { opacity: 0; transform: scale(0.4); }
  60%  { transform: scale(1.18); }
  to   { opacity: 1; transform: scale(1); }
}
.pl8-pack-pop { animation: pl8-pack-pop 260ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .pl8-pack-pop { animation: none; }
}
`;

function CheckGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="pl8-pack-pop"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--t-accent-ink)"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

interface PackGroup { cat: string; items: Array<{ label: string }> }

function groupItems(items: PackingRowData[]): PackGroup[] {
  const map = new Map<string, Array<{ label: string }>>();
  for (const row of items) {
    const label = (row.item ?? '').trim();
    if (!label) continue;
    const cat = (row.category ?? '').trim() || 'Essentials';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push({ label });
  }
  return [...map.entries()].map(([cat, list]) => ({ cat, items: list }));
}

/* ─── section ─────────────────────────────────────────────────── */

export function PackingListSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const storeKey = packingStoreKey(manifest);
  /* Lazy init reads localStorage once on mount — same pattern as the
     legacy block; storeKey is stable for the section's lifetime. */
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(storeKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const items = readPacking(manifest).filter((p) => (p.item ?? '').trim());
  const empty = items.length === 0;
  if (empty && !editable) return null;

  const toggle = (label: string) => {
    if (editable) return; /* host canvas never mutates a guest store */
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storeKey, JSON.stringify([...next]));
        } catch { /* ignore quota / private-mode failures */ }
      }
      return next;
    });
  };

  const groups = groupItems(items);
  const packedCount = items.filter((p) => checked.has((p.item ?? '').trim())).length;

  return (
    <BlockFrame pad={pad}>
      <style>{PACK_POP_CSS}</style>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'packingListEyebrow', 'Be ready')}
        title={blockCopy(manifest, 'packingListTitle', 'What to bring')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('packingListEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('packingListTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add items in the Packing list panel (or the Weekend planner)." />
      ) : (
        <>
          {editable && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <span
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px dashed var(--t-line)',
                  background: 'var(--t-card)',
                  fontFamily: MONO,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--t-ink-muted)',
                }}
              >
                Guests check these off privately — on their own device
              </span>
            </div>
          )}
          {variant === 'grid' ? (
            <PackingGrid groups={groups} checked={checked} toggle={toggle} editable={editable} />
          ) : (
            <PackingChecklist groups={groups} checked={checked} toggle={toggle} editable={editable} />
          )}
          {!editable && packedCount > 0 && (
            <div
              style={{
                marginTop: 18,
                textAlign: 'center',
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--t-ink-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {packedCount} of {items.length} packed
            </div>
          )}
        </>
      )}
    </BlockFrame>
  );
}

interface VariantProps {
  groups: PackGroup[];
  checked: Set<string>;
  toggle: (label: string) => void;
  editable: boolean;
}

/* ─── checklist — grouped column with personal ticks ──────────── */

function PackingChecklist({ groups, checked, toggle, editable }: VariantProps) {
  /* When the host never used categories, skip the lone "Essentials"
     header so the single card reads clean. */
  const soloEssentials = groups.length === 1 && groups[0].cat === 'Essentials';
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map((group) => (
        <div
          key={group.cat}
          style={{
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 14px)',
            overflow: 'hidden',
          }}
        >
          {!soloEssentials && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 18px',
                borderBottom: '1px solid var(--t-line-soft)',
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--t-accent-ink)',
                }}
              >
                {group.cat}
              </span>
              <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--t-gold)', opacity: 0.7 }} />
            </div>
          )}
          <div style={{ padding: '4px 18px' }}>
            {group.items.map(({ label }, i) => {
              const on = checked.has(label);
              return (
                <button
                  key={`${label}-${i}`}
                  type="button"
                  onClick={() => toggle(label)}
                  disabled={editable}
                  aria-pressed={on}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 0',
                    background: 'transparent',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
                    cursor: editable ? 'default' : 'pointer',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: 5,
                      border: `1.5px solid ${on ? 'var(--t-accent)' : 'var(--t-line)'}`,
                      background: on ? 'var(--t-accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {on && <CheckGlyph />}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: on ? 'var(--t-ink-soft)' : 'var(--t-ink)',
                      textDecoration: on ? 'line-through' : 'none',
                      textDecorationColor: 'var(--t-ink-muted)',
                      minWidth: 0,
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── grid — category cards with chip fills ───────────────────── */

function PackingGrid({ groups, checked, toggle, editable }: VariantProps) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 14,
      }}
    >
      {groups.map((group) => (
        <div
          key={group.cat}
          style={{
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 14px)',
            padding: '16px 16px 18px',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--t-accent-ink)',
              marginBottom: 12,
            }}
          >
            {group.cat}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {group.items.map(({ label }, i) => {
              const on = checked.has(label);
              const chip: CSSProperties = on
                ? { background: 'var(--t-accent)', color: 'var(--t-accent-ink)', border: '1px solid var(--t-accent)' }
                : { background: 'var(--t-paper)', color: 'var(--t-ink)', border: '1px solid var(--t-line)' };
              return (
                <button
                  key={`${label}-${i}`}
                  type="button"
                  onClick={() => toggle(label)}
                  disabled={editable}
                  aria-pressed={on}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: editable ? 'default' : 'pointer',
                    ...chip,
                  }}
                >
                  {on && <CheckGlyph size={10} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
