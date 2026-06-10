'use client';

/* Cost splitter section — who owes what, settled gently.

   Data: manifest.bachelor.costs[]  — the SAME field the Weekend
   planner tool (BachelorPanel) edits. CostSplitterPanel is a thin
   editor over it; neither duplicates the store.
     { id, label, amount, paidBy? }   (amount = free-form dollar
                                       string; paidBy = display name)
   Optional: manifest.bachelor.splitCount — how many people share the
   bill (written by CostSplitterPanel). Falls back to the number of
   distinct payers when unset.

   Display + math only — NO payment rails. Money via Intl.NumberFormat
   USD (the legacy free-form amount strings carry no currency).

   Variants (layouts.ts):
     ledger — ruled table (item · who paid · total · per-head share in
              tabular figures), accent rule under the totals row, and
              a "settle up" footer with per-person totals.
     cards  — one card per line item with a payer avatar-initial chip,
              plus the same settle-up strip. */

import type { CSSProperties } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface CostRowData { id?: string; label?: string; amount?: string; paidBy?: string }

export function readCosts(manifest: BlockSectionProps['manifest']): CostRowData[] {
  const loose = manifest as unknown as { bachelor?: { costs?: CostRowData[] } };
  return Array.isArray(loose.bachelor?.costs) ? loose.bachelor.costs : [];
}

export function readSplitCount(manifest: BlockSectionProps['manifest']): number {
  const loose = manifest as unknown as { bachelor?: { splitCount?: string | number } };
  const raw = loose.bachelor?.splitCount;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function parseAmount(raw?: string): number {
  return parseFloat((raw ?? '').replace(/[^\d.]/g, '')) || 0;
}

/* USD formatting — whole dollars stay whole ($480); anything with
   cents gets two places ($68.57). */
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatUsd(n: number): string {
  const cents = Math.round(n * 100);
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usdCents.format(cents / 100);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

const monoLabel: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--t-ink-muted)',
};

const tabular: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/* Mobile-first ledger grid — the PAID BY column collapses into a
   subline under the item below 560px. !important beats inline grid. */
const LEDGER_CSS = `
.pl8-ledger .pl8-ledger-row { display: grid; grid-template-columns: minmax(0, 1fr) 84px; gap: 12px; align-items: baseline; }
.pl8-ledger--each .pl8-ledger-row { grid-template-columns: minmax(0, 1fr) 84px 72px; }
.pl8-ledger .pl8-ledger-payer-col { display: none; }
@media (min-width: 560px) {
  .pl8-ledger .pl8-ledger-row { grid-template-columns: minmax(0, 1fr) 120px 84px; }
  .pl8-ledger--each .pl8-ledger-row { grid-template-columns: minmax(0, 1fr) 120px 84px 72px; }
  .pl8-ledger .pl8-ledger-payer-col { display: block; }
  .pl8-ledger .pl8-ledger-payer-sub { display: none; }
}
`;

interface CostMath {
  rows: Array<{ key: string; label: string; amount: number; paidBy: string }>;
  total: number;
  headCount: number;
  perHead: number | null;
  payers: Array<{ name: string; paid: number; net: number | null }>;
}

function computeMath(manifest: BlockSectionProps['manifest'], costs: CostRowData[]): CostMath {
  const rows = costs.map((c, i) => ({
    key: c.id ?? String(i),
    label: c.label?.trim() || 'Untitled cost',
    amount: parseAmount(c.amount),
    paidBy: (c.paidBy ?? '').trim(),
  }));
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const paidTotals = new Map<string, number>();
  for (const r of rows) {
    if (!r.paidBy) continue;
    paidTotals.set(r.paidBy, (paidTotals.get(r.paidBy) ?? 0) + r.amount);
  }
  const headCount = readSplitCount(manifest) || paidTotals.size;
  const perHead = headCount > 0 ? total / headCount : null;
  const payers = [...paidTotals.entries()].map(([name, paid]) => ({
    name,
    paid,
    net: perHead != null ? paid - perHead : null,
  }));
  return { rows, total, headCount, perHead, payers };
}

/* ─── section ─────────────────────────────────────────────────── */

export function CostSplitterSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const costs = readCosts(manifest).filter((c) => (c.label ?? '').trim() || (c.amount ?? '').trim());
  const empty = costs.length === 0;
  if (empty && !editable) return null;
  const math = computeMath(manifest, costs);

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'costSplitterEyebrow', 'The kitty')}
        title={blockCopy(manifest, 'costSplitterTitle', 'Who owes what')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('costSplitterEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('costSplitterTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add line items in the Cost splitter panel (or the Weekend planner)." />
      ) : variant === 'cards' ? (
        <CostCards math={math} />
      ) : (
        <CostLedger math={math} />
      )}
    </BlockFrame>
  );
}

/* ─── settle-up footer — shared by both variants ──────────────── */

function SettleLines({ math }: { math: CostMath }) {
  const { perHead, headCount, payers } = math;
  if (perHead == null && payers.length === 0) return null;
  return (
    <div style={{ textAlign: 'center' }}>
      {perHead != null && (
        <div style={{ ...monoLabel, ...tabular, fontSize: 10, letterSpacing: '0.2em', color: 'var(--t-ink-soft)' }}>
          Split {headCount} ways · {formatUsd(perHead)} each
        </div>
      )}
      {payers.length > 0 && (
        <div
          style={{
            marginTop: perHead != null ? 8 : 0,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '4px 18px',
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--t-ink-soft)',
            lineHeight: 1.6,
          }}
        >
          {payers.map((p) => {
            let settle = '';
            if (p.net != null) {
              if (p.net > 0.005) settle = ` — is owed ${formatUsd(p.net)}`;
              else if (p.net < -0.005) settle = ` — owes ${formatUsd(-p.net)}`;
              else settle = ' — all square';
            }
            return (
              <span key={p.name} style={tabular}>
                {p.name} covered {formatUsd(p.paid)}{settle}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── ledger — ruled table with accent rule + settle footer ───── */

function CostLedger({ math }: { math: CostMath }) {
  const { rows, total, perHead } = math;
  const hasPayers = rows.some((r) => r.paidBy);
  return (
    <div className={`pl8-ledger${perHead != null ? ' pl8-ledger--each' : ''}`} style={{ maxWidth: 620, margin: '0 auto' }}>
      <style>{LEDGER_CSS}</style>
      <div
        style={{
          background: 'var(--t-card)',
          border: '1px solid var(--t-line)',
          borderRadius: 'var(--t-radius-lg, 14px)',
          padding: '6px 22px 18px',
        }}
      >
        {/* Column heads */}
        <div className="pl8-ledger-row" style={{ padding: '12px 0 8px', borderBottom: '1px solid var(--t-line)' }}>
          <span style={monoLabel}>Expense</span>
          {hasPayers && <span className="pl8-ledger-payer-col" style={monoLabel}>Paid by</span>}
          {!hasPayers && <span className="pl8-ledger-payer-col" aria-hidden />}
          <span style={{ ...monoLabel, textAlign: 'right' }}>Total</span>
          {perHead != null && <span style={{ ...monoLabel, textAlign: 'right' }}>Each</span>}
        </div>
        {/* Rows */}
        {rows.map((r, i) => (
          <div
            key={r.key}
            className="pl8-ledger-row"
            style={{ padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)' }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--t-ink)' }}>
                {r.label}
              </span>
              {r.paidBy && (
                <span className="pl8-ledger-payer-sub" style={{ display: 'block', fontSize: 11.5, fontStyle: 'italic', color: 'var(--t-ink-muted)', marginTop: 1 }}>
                  paid by {r.paidBy}
                </span>
              )}
            </span>
            <span className="pl8-ledger-payer-col" style={{ fontSize: 12.5, color: 'var(--t-ink-soft)' }}>
              {r.paidBy || '—'}
            </span>
            <span style={{ ...tabular, fontSize: 14, fontWeight: 600, color: 'var(--t-ink)', textAlign: 'right' }}>
              {formatUsd(r.amount)}
            </span>
            {perHead != null && (
              <span style={{ ...tabular, fontSize: 12.5, color: 'var(--t-ink-soft)', textAlign: 'right' }}>
                {formatUsd(r.amount / math.headCount)}
              </span>
            )}
          </div>
        ))}
        {/* Totals row */}
        <div className="pl8-ledger-row" style={{ padding: '14px 0 12px', borderTop: '1px solid var(--t-line)' }}>
          <span style={{ ...monoLabel, fontSize: 10.5, letterSpacing: '0.16em', color: 'var(--t-ink-soft)' }}>
            Together
          </span>
          <span className="pl8-ledger-payer-col" aria-hidden />
          <span
            style={{
              ...tabular,
              fontFamily: 'var(--t-display)',
              fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
              fontSize: 20,
              color: 'var(--t-ink)',
              textAlign: 'right',
            }}
          >
            {formatUsd(total)}
          </span>
          {perHead != null && (
            <span style={{ ...tabular, fontSize: 13, fontWeight: 700, color: 'var(--t-accent-ink)', textAlign: 'right' }}>
              {formatUsd(perHead)}
            </span>
          )}
        </div>
        {/* Accent rule under the totals row */}
        <div aria-hidden style={{ height: 2, background: 'var(--t-accent)', marginBottom: 14 }} />
        <SettleLines math={math} />
      </div>
    </div>
  );
}

/* ─── cards — per-item cards with payer avatar chips ──────────── */

function CostCards({ math }: { math: CostMath }) {
  const { rows, total } = math;
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.key}
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 'var(--t-radius-lg, 14px)',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-ink)', lineHeight: 1.35 }}>
              {r.label}
            </div>
            <div
              style={{
                ...tabular,
                fontFamily: 'var(--t-display)',
                fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                fontSize: 26,
                color: 'var(--t-ink)',
                lineHeight: 1,
              }}
            >
              {formatUsd(r.amount)}
            </div>
            {r.paidBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                <span
                  aria-hidden
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--t-accent-bg, var(--t-section))',
                    color: 'var(--t-accent-ink)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: MONO,
                    fontSize: 9.5,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials(r.paidBy)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--t-ink-soft)' }}>paid by {r.paidBy}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Settle-up strip */}
      <div
        style={{
          marginTop: 16,
          background: 'var(--t-card)',
          border: '1px solid var(--t-line)',
          borderRadius: 'var(--t-radius-lg, 14px)',
          padding: '16px 22px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ ...monoLabel, fontSize: 10.5, letterSpacing: '0.16em', color: 'var(--t-ink-soft)' }}>
            Together
          </span>
          <span
            style={{
              ...tabular,
              fontFamily: 'var(--t-display)',
              fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
              fontSize: 22,
              color: 'var(--t-ink)',
            }}
          >
            {formatUsd(total)}
          </span>
        </div>
        <div aria-hidden style={{ height: 2, background: 'var(--t-accent)', margin: '10px 0 14px' }} />
        <SettleLines math={math} />
      </div>
    </div>
  );
}
