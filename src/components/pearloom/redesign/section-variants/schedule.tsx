'use client';
 

/* Schedule section variants — timeline / stepper / numbered.
   The 'cards' default lives inline in ThemedSite. Each variant
   takes a ScheduleVariantCtx and renders the section body
   (the TSection wrapper + RSVP CTA stay in ThemedSite). */

import type { CSSProperties } from 'react';
import type { ScheduleVariantCtx, ScheduleRow as ScheduleRowBase } from './types';
import { VariantSectionHead } from './_section-head';
import { InlineEdit } from '../InlineEdit';
import { Icon } from '../../motifs';

/* Edit-context extension — the canvas quick-wins tier adds an
   optional per-row description (`d`, the quiet note under the
   time/venue line) plus its writer. Local extension so the shared
   types module stays untouched. Row indices align with
   manifest.events[] (ThemedSite maps them 1:1). */
type ScheduleRow = ScheduleRowBase & { d?: string };
export interface ScheduleVariantCtxEditable extends Omit<ScheduleVariantCtx, 'C'> {
  C: Omit<ScheduleVariantCtx['C'], 'rows'> & { rows: ScheduleRow[] };
  onEditEventDescription?: (idx: number, v: string) => void;
}

function headProps(ctx: ScheduleVariantCtxEditable) {
  return {
    eyebrow: ctx.C.eyebrow, title: ctx.C.title, italic: ctx.C.italic,
    editable: ctx.editable,
    onEditEyebrow: ctx.onEditEyebrow, onEditTitle: ctx.onEditTitle,
    eyebrowPlaceholder: ctx.eyebrowPlaceholder, titlePlaceholder: ctx.titlePlaceholder,
  };
}

/** Quiet one-line note under the time/venue row. InlineEdit with an
 *  "Add a note…" ghost in edit mode; published renders it only when
 *  the host authored one (zero DOM otherwise). */
function RowNote({ ctx, i, row, style }: { ctx: ScheduleVariantCtxEditable; i: number; row: ScheduleRow; style?: CSSProperties }) {
  const noteStyle: CSSProperties = {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: 'var(--t-ink-soft)',
    lineHeight: 1.45,
    marginTop: 3,
    ...style,
  };
  if (ctx.editable && ctx.onEditEventDescription) {
    return (
      <InlineEdit
        as="div"
        value={row.d ?? ''}
        onChange={(v) => ctx.onEditEventDescription?.(i, v)}
        editable
        placeholder="Add a note…"
        className="pl8-inline-ghost"
        style={noteStyle}
      />
    );
  }
  return row.d ? <div style={noteStyle}>{row.d}</div> : null;
}

/** "Directions" link for rows carrying a street address — parity
 *  with the default cards layout (no layout may drop host data). */
function RowDirections({ row, style }: { row: ScheduleRow; style?: CSSProperties }) {
  if (!row.addr) return null;
  return (
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.addr)}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--t-accent-ink)', textDecoration: 'none', ...style }}
    >
      <Icon name="pin" size={10} color="var(--t-accent)" /> Directions
    </a>
  );
}

/** Group rows under Day N when any row carries day > 1 — parity
 *  with the default cards layout's multi-day rendering. Original
 *  indices ride along so inline-edit writers still patch the
 *  right manifest.events[] entry. */
function groupRowsByDay(rows: ScheduleRow[]): {
  multiDay: boolean;
  groups: Array<{ day: number; rows: Array<{ row: ScheduleRow; idx: number }> }>;
} {
  const multiDay = rows.some((r) => r.day && r.day > 1);
  if (!multiDay) {
    return { multiDay, groups: [{ day: 1, rows: rows.map((row, idx) => ({ row, idx })) }] };
  }
  const byDay = new Map<number, Array<{ row: ScheduleRow; idx: number }>>();
  rows.forEach((row, idx) => {
    const d = row.day ?? 1;
    const arr = byDay.get(d) ?? [];
    arr.push({ row, idx });
    byDay.set(d, arr);
  });
  return {
    multiDay,
    groups: Array.from(byDay.keys()).sort((a, b) => a - b).map((day) => ({ day, rows: byDay.get(day)! })),
  };
}

/** Running step-number offset per day group, so numbering continues
 *  across the whole event ("step 5" = the fifth moment of the
 *  weekend) without a mutable render counter. */
function stepOffsetsFor(groups: Array<{ rows: unknown[] }>): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const g of groups) {
    offsets.push(acc);
    acc += g.rows.length;
  }
  return offsets;
}

/** "Day N" hairline rule — mirrors the default layout's header so
 *  the grouping reads the same in every variant. */
function DayRule({ day }: { day: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 12px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
      <div style={{
        fontFamily: 'var(--t-mono)',
        fontSize: 11, fontWeight: 700,
        letterSpacing: 'var(--t-eyebrow-ls)',
        textTransform: 'uppercase',
        color: 'var(--t-accent-ink)',
        whiteSpace: 'nowrap',
      }}>
        Day {day}
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
    </div>
  );
}

/* ─── ScheduleTimeline — vertical rail with dotted milestones. ── */

export function ScheduleTimeline({ ctx }: { ctx: ScheduleVariantCtxEditable }) {
  const { C, pad } = ctx;
  const { multiDay, groups } = groupRowsByDay(C.rows);
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {groups.map((g) => (
          <div key={g.day}>
            {multiDay && <DayRule day={g.day} />}
            <div style={{ paddingLeft: 30, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--t-line)' }} />
              {g.rows.map(({ row, idx }) => (
                <div key={idx} className="pl8-schedule-row" style={{ position: "relative", marginBottom: Math.round(24 * pad) }}>
                  <div style={{ position: 'absolute', left: -30, top: 4, width: 16, height: 16, background: 'var(--t-accent)', borderRadius: 999 }} />
                  <div style={{ fontFamily: 'var(--t-mono)', fontSize: 13, textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 4 }}>
                    {row.t}{row.m ? ' ' + row.m : ''}
                  </div>
                  <div style={{ fontFamily: 'var(--t-display)', fontSize: 16, color: 'var(--t-ink)', marginBottom: 2 }}>{row.l}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)' }}>{row.s}</div>
                  <RowNote ctx={ctx} i={idx} row={row} />
                  <RowDirections row={row} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── ScheduleStepper — horizontal numbered circles + connectors ── */

/** Chunk a day's rows into stepper LINES of at most `size` moments.
 *  One endless horizontal scroll broke past ~5 moments (audit #10);
 *  a long day now wraps onto stacked lines — connectors run within
 *  a line only, and the running step number carries across. */
export function chunkStepperRows<T>(rows: readonly T[], size = 5): T[][] {
  if (rows.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export function ScheduleStepper({ ctx }: { ctx: ScheduleVariantCtxEditable }) {
  const { C, pad } = ctx;
  const { multiDay, groups } = groupRowsByDay(C.rows);
  /* Numbering runs across the whole event, not per day, so "step 5"
     still means the fifth moment of the weekend. Offsets are
     precomputed (React Compiler forbids mutable render counters). */
  const stepOffsets = stepOffsetsFor(groups);
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      {groups.map((g, groupIdx) => (
        <div key={g.day} style={{ maxWidth: 880, margin: '0 auto' }}>
          {multiDay && <DayRule day={g.day} />}
          {chunkStepperRows(g.rows).map((line, lineIdx) => (
            <div key={lineIdx} style={{ overflowX: 'auto', paddingBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 0, minWidth: 'min-content', padding: `0 ${Math.round(16 * pad)}px`, marginTop: lineIdx > 0 ? 18 : 0 }}>
                {line.map(({ row, idx }, li) => {
                  const step = stepOffsets[groupIdx] + lineIdx * 5 + li + 1;
                  return (
                    <div key={idx} className="pl8-schedule-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                        <div style={{ width: 44, height: 44, background: 'var(--t-accent)', color: 'var(--t-accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15, borderRadius: 999 }}>
                          {step}
                        </div>
                        <div style={{ fontFamily: 'var(--t-mono)', fontSize: 13, textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 10 }}>
                          {row.t}{row.m ? ' ' + row.m : ''}
                        </div>
                        <div style={{ fontFamily: 'var(--t-display)', fontSize: 16, color: 'var(--t-ink)', marginTop: 4, textAlign: 'center' }}>{row.l}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 2, textAlign: 'center' }}>{row.s}</div>
                        <RowNote ctx={ctx} i={idx} row={row} style={{ textAlign: 'center', maxWidth: 150 }} />
                        <RowDirections row={row} />
                      </div>
                      {li < line.length - 1 && (
                        <div style={{ width: 50, height: 2, background: 'var(--t-line)', marginTop: 21 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ─── ScheduleNumbered — zero-padded numeral list. ───────────── */

export function ScheduleNumbered({ ctx }: { ctx: ScheduleVariantCtxEditable }) {
  const { C } = ctx;
  const { multiDay, groups } = groupRowsByDay(C.rows);
  const stepOffsets = stepOffsetsFor(groups);
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {groups.map((g, groupIdx) => (
          <div key={g.day}>
            {multiDay && <DayRule day={g.day} />}
            {g.rows.map(({ row, idx }, gi) => {
              const step = stepOffsets[groupIdx] + gi + 1;
              return (
                <div key={idx} className="pl8-schedule-row" style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--t-line-soft)', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'var(--t-display)', fontSize: 36, color: 'var(--t-ink-muted)', lineHeight: 1 }}>
                    {String(step).padStart(2, '0')}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--t-display)', fontSize: 14.5, color: 'var(--t-ink)' }}>{row.l}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{row.s}</div>
                    <RowNote ctx={ctx} i={idx} row={row} style={{ fontSize: 11 }} />
                    <RowDirections row={row} />
                  </div>
                  <div style={{ fontFamily: 'var(--t-mono)', fontSize: 13, textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>
                    {row.t}{row.m ? ' ' + row.m : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
