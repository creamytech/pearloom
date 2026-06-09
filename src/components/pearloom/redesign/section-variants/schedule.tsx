'use client';
/* eslint-disable no-restricted-syntax */

/* Schedule section variants — timeline / stepper / numbered.
   The 'cards' default lives inline in ThemedSite. Each variant
   takes a ScheduleVariantCtx and renders the section body
   (the TSection wrapper + RSVP CTA stay in ThemedSite). */

import type { CSSProperties } from 'react';
import type { ScheduleVariantCtx, ScheduleRow as ScheduleRowBase } from './types';
import { VariantSectionHead } from './_section-head';
import { InlineEdit } from '../InlineEdit';

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

/* ─── ScheduleTimeline — vertical rail with dotted milestones. ── */

export function ScheduleTimeline({ ctx }: { ctx: ScheduleVariantCtxEditable }) {
  const { C, pad } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 600, margin: '0 auto', paddingLeft: 30, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--t-line)' }} />
        {C.rows.map((row, i) => (
          <div key={i} className="pl8-schedule-row" style={{ position: "relative", marginBottom: Math.round(24 * pad) }}>
            <div style={{ position: 'absolute', left: -30, top: 4, width: 16, height: 16, background: 'var(--t-accent)', borderRadius: 999 }} />
            <div style={{ fontFamily: 'var(--t-mono)', fontSize: 13, textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 4 }}>
              {row.t}{row.m ? ' ' + row.m : ''}
            </div>
            <div style={{ fontFamily: 'var(--t-display)', fontSize: 16, color: 'var(--t-ink)', marginBottom: 2 }}>{row.l}</div>
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)' }}>{row.s}</div>
            <RowNote ctx={ctx} i={i} row={row} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── ScheduleStepper — horizontal numbered circles + connectors ── */

export function ScheduleStepper({ ctx }: { ctx: ScheduleVariantCtxEditable }) {
  const { C, pad } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 0, minWidth: 'min-content', padding: `0 ${Math.round(16 * pad)}px` }}>
          {C.rows.map((row, i) => (
            <div key={i} className="pl8-schedule-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                <div style={{ width: 44, height: 44, background: 'var(--t-accent)', color: 'var(--t-accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15, borderRadius: 999 }}>
                  {i + 1}
                </div>
                <div style={{ fontFamily: 'var(--t-mono)', fontSize: 13, textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 10 }}>
                  {row.t}{row.m ? ' ' + row.m : ''}
                </div>
                <div style={{ fontFamily: 'var(--t-display)', fontSize: 16, color: 'var(--t-ink)', marginTop: 4, textAlign: 'center' }}>{row.l}</div>
                <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 2, textAlign: 'center' }}>{row.s}</div>
                <RowNote ctx={ctx} i={i} row={row} style={{ textAlign: 'center', maxWidth: 150 }} />
              </div>
              {i < C.rows.length - 1 && (
                <div style={{ width: 50, height: 2, background: 'var(--t-line)', marginTop: 21 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── ScheduleNumbered — zero-padded numeral list. ───────────── */

export function ScheduleNumbered({ ctx }: { ctx: ScheduleVariantCtxEditable }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {C.rows.map((row, i) => (
          <div key={i} className="pl8-schedule-row" style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--t-line-soft)', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'var(--t-display)', fontSize: 36, color: 'var(--t-ink-muted)', lineHeight: 1 }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--t-display)', fontSize: 14.5, color: 'var(--t-ink)' }}>{row.l}</div>
              <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{row.s}</div>
              <RowNote ctx={ctx} i={i} row={row} style={{ fontSize: 11 }} />
            </div>
            <div style={{ fontFamily: 'var(--t-mono)', fontSize: 13, textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>
              {row.t}{row.m ? ' ' + row.m : ''}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
