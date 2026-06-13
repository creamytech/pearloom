'use client';

/* Program section — the order of the ceremony.

   Data: manifest.memorial.program[]  — the SAME field the Memorial
   tool (MemorialPanel "Order of service" group) edits. The field
   name is historical: it's the canonical order-of-service store
   for EVERY ceremonial occasion (memorial, bar/bat mitzvah,
   quinceañera, baptism). ProgramPanel is a thin editor over it.
     { id, name, detail? }

   Variants (layouts.ts):
     classic    — centered order-of-service: small-caps names, italic
                  details, a single gold middot between entries.
     numbered   — roman-numeral leaders (I. II. III.) left-aligned,
                  with a dotted hairline leader running to the
                  right-aligned detail.
     centerline — a vertical center hairline with entries alternating
                  left / right (ceremony processional feel).

   Typography discipline is deliberate — this section serves solemn
   occasions. No chips, no pills, no playful color. */

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ProgramRowData { id?: string; name?: string; detail?: string }

export function readProgram(manifest: BlockSectionProps['manifest']): ProgramRowData[] {
  const loose = manifest as unknown as { memorial?: { program?: ProgramRowData[] } };
  return Array.isArray(loose.memorial?.program) ? loose.memorial.program : [];
}

/** Classic roman numerals — I, II, III… (used by the numbered layout
 *  and previewed in ProgramPanel). */
export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n < 1) return 'I';
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let v = Math.floor(n);
  for (const [val, sym] of table) {
    while (v >= val) { out += sym; v -= val; }
  }
  return out;
}

const displayName: CSSProperties = {
  fontFamily: 'var(--t-display)',
  fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
  color: 'var(--t-ink)',
  lineHeight: 1.3,
};

const detailStyle: CSSProperties = {
  fontSize: 12.5,
  fontStyle: 'italic',
  color: 'var(--t-ink-soft)',
  lineHeight: 1.55,
};

export function ProgramSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const rows = readProgram(manifest).filter((r) => (r.name ?? '').trim());
  const empty = rows.length === 0;
  if (empty && !editable) return null;

  let body: ReactNode;
  if (variant === 'numbered') body = <ProgramNumbered rows={rows} />;
  else if (variant === 'centerline') body = <ProgramCenterline rows={rows} />;
  else body = <ProgramClassic rows={rows} />;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'programEyebrow', 'Order of service')}
        title={blockCopy(manifest, 'programTitle', 'The program')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('programEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('programTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Build the order of service in the Program panel (or the Memorial workspace)." />
      ) : (
        body
      )}
    </BlockFrame>
  );
}

/* ─── classic — centered, small caps, gold middots between ────── */

function ProgramClassic({ rows }: { rows: ProgramRowData[] }) {
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      {rows.map((row, i) => (
        <Fragment key={row.id ?? i}>
          {i > 0 && (
            <div aria-hidden style={{ color: 'var(--t-gold)', fontSize: 18, lineHeight: 1, padding: '14px 0' }}>
              ·
            </div>
          )}
          <div>
            <div style={{ ...displayName, fontSize: 19, fontVariantCaps: 'small-caps', letterSpacing: '0.05em' }}>
              {row.name}
            </div>
            {row.detail?.trim() && (
              <div style={{ ...detailStyle, marginTop: 4 }}>{row.detail}</div>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/* ─── numbered — roman leaders with dotted hairlines ──────────── */

function ProgramNumbered({ rows }: { rows: ProgramRowData[] }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {rows.map((row, i) => {
        const detail = row.detail?.trim();
        return (
          <div
            key={row.id ?? i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              padding: '13px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--t-display)',
                fontStyle: 'italic',
                fontSize: 15,
                color: 'var(--t-accent-ink)',
                minWidth: 40,
                flexShrink: 0,
              }}
            >
              {toRoman(i + 1)}.
            </span>
            <span style={{ ...displayName, fontSize: 16.5, minWidth: 0 }}>{row.name}</span>
            {detail && (
              <>
                <span
                  aria-hidden
                  style={{ flex: 1, minWidth: 24, borderBottom: '1px dotted var(--t-line)', transform: 'translateY(-3px)' }}
                />
                <span style={{ ...detailStyle, textAlign: 'right', maxWidth: '44%' }}>{detail}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── centerline — processional down a center hairline ────────── */

function ProgramCenterline({ rows }: { rows: ProgramRowData[] }) {
  return (
    <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto', padding: '4px 0' }}>
      <div
        aria-hidden
        style={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: 1, background: 'var(--t-line)', transform: 'translateX(-0.5px)' }}
      />
      {rows.map((row, i) => {
        const left = i % 2 === 0;
        return (
          <div
            key={row.id ?? i}
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 32px minmax(0, 1fr)',
              alignItems: 'center',
              padding: '14px 0',
            }}
          >
            <div
              style={{
                gridColumn: left ? '1' : '3',
                gridRow: '1',
                textAlign: left ? 'right' : 'left',
                minWidth: 0,
              }}
            >
              <div style={{ ...displayName, fontSize: 17 }}>{row.name}</div>
              {row.detail?.trim() && (
                <div style={{ ...detailStyle, marginTop: 3 }}>{row.detail}</div>
              )}
            </div>
            {/* Gold node on the line. */}
            <span
              aria-hidden
              style={{
                gridColumn: '2',
                gridRow: '1',
                justifySelf: 'center',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--t-gold)',
                boxShadow: '0 0 0 3px var(--t-paper)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
