'use client';
/* eslint-disable no-restricted-syntax */

/* Schedule section variants — timeline / stepper / numbered.
   The 'cards' default lives inline in ThemedSite. Each variant
   takes a ScheduleVariantCtx and renders the section body
   (the TSection wrapper + RSVP CTA stay in ThemedSite). */

import type { ScheduleVariantCtx } from './types';

/* ─── Shared section head (mirrors ThemedSite's TSectionHead) ── */

function SectionHead({ eyebrow, title, italic }: { eyebrow: string; title: string; italic?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 40, margin: 0, lineHeight: 1.0, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
        {title}
        {italic && <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {italic}</span>}
      </h2>
    </div>
  );
}

/* ─── ScheduleTimeline — vertical rail with dotted milestones. ── */

export function ScheduleTimeline({ ctx }: { ctx: ScheduleVariantCtx }) {
  const { C, pad } = ctx;
  return (
    <>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
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
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── ScheduleStepper — horizontal numbered circles + connectors ── */

export function ScheduleStepper({ ctx }: { ctx: ScheduleVariantCtx }) {
  const { C, pad } = ctx;
  return (
    <>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
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

export function ScheduleNumbered({ ctx }: { ctx: ScheduleVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {C.rows.map((row, i) => (
          <div key={i} className="pl8-schedule-row" style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--t-line-soft)', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'var(--t-display)', fontSize: 36, color: 'var(--t-ink-muted)', lineHeight: 1 }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--t-display)', fontSize: 14.5, color: 'var(--t-ink)' }}>{row.l}</div>
              <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{row.s}</div>
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
