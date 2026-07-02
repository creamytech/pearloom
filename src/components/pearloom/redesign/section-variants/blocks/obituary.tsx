'use client';

/* Obituary section — a life, remembered.

   THE MOST SENSITIVE SURFACE IN THE PRODUCT. Restraint is the
   design: ink and paper carry everything; gold appears only as
   1px hairlines and the middot between dates (BRAND.md §5 —
   punctuation, never a surface). No motion, no color flourish,
   no chips. The display face does the honoring.

   Data: manifest.memorial.obituary  — the SAME field the Memorial
   tool (MemorialPanel "Obituary" group) edits. ObituaryPanel is a
   thin editor over it.
     { dates?, body? }

   Inline editing: BlockSectionProps only threads onEditCopy
   (a manifest.copy.<key> writer). The remembrance body + dates
   live at manifest.memorial.obituary.* — a different store — so
   wiring them to onEditCopy would silently fork the text away
   from the Memorial workspace. Body + dates therefore stay
   panel-edited; the eyebrow/title stay inline-editable via
   VariantSectionHead (those genuinely are copy overrides).

   Variants (layouts.ts): letter (default) | columns. */

import type { CSSProperties } from 'react';
import { VariantSectionHead } from '../_section-head';
import { OliveSprig } from '../../../site/MotifScatter';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ObituaryData { dates?: string; body?: string }

export function readObituary(manifest: BlockSectionProps['manifest']): ObituaryData {
  const loose = manifest as unknown as { memorial?: { obituary?: ObituaryData } };
  return loose.memorial?.obituary ?? {};
}

const MONO = 'var(--t-mono, var(--pl-font-mono, ui-monospace, monospace))';
const GOLD = 'var(--t-gold, var(--gold, #C19A4B))';

/** Split the host's free-form dates string into segments so the
 *  separators render as gold middots regardless of what the host
 *  typed ('1948 · 2026', 'March 12, 1942 — April 8, 2026',
 *  '1948 - 2026'). Plain hyphens inside words are left alone —
 *  only spaced hyphens, en/em dashes and middots split. */
export function splitDates(dates: string): string[] {
  return dates
    .split(/\s*(?:—|–|·)\s*|\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Dates line — mono caps, generous tracking, gold middot between
 *  segments. The single allowed glyph of color on this surface. */
function DatesLine({ dates, style }: { dates: string; style?: CSSProperties }) {
  const segments = splitDates(dates);
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color: 'var(--t-ink-soft)',
        ...style,
      }}
    >
      {segments.map((seg, i) => (
        <span key={i}>
          {i > 0 && (
            <span aria-hidden style={{ color: GOLD, padding: '0 0.7em' }}>·</span>
          )}
          {seg}
        </span>
      ))}
    </div>
  );
}

/** Closing mark — a pair of gold hairlines around a muted-ink
 *  sprig. The quiet full stop at the end of the remembrance. */
function ClosingMark() {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        marginTop: 40,
      }}
    >
      <span style={{ width: 64, height: 1, background: GOLD, opacity: 0.5 }} />
      <OliveSprig size={34} color="var(--t-ink-muted)" berry={GOLD} style={{ opacity: 0.85 }} />
      <span style={{ width: 64, height: 1, background: GOLD, opacity: 0.5 }} />
    </div>
  );
}

function paragraphs(body: string): string[] {
  return body.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
}

const BODY_STYLE: CSSProperties = {
  fontFamily: 'var(--t-display)',
  fontSize: 17,
  lineHeight: 1.85,
  color: 'var(--t-ink)',
  margin: 0,
};

/* ─── Letter — single measured column, drop-cap opening. ─────── */

function ObituaryLetter({ dates, body }: { dates?: string; body: string }) {
  const paras = paragraphs(body);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {dates?.trim() && (
        <DatesLine dates={dates} style={{ textAlign: 'center', marginBottom: 30 }} />
      )}
      <div style={{ textAlign: 'left' }}>
        {paras.map((p, i) => {
          if (i === 0) {
            /* Drop cap — the story letter variant's pressed-in
               opening, hand-rolled (the .pl-dropcap utility binds
               ::first-letter, which inline styles can't reach). */
            const cap = p.charAt(0);
            const rest = p.slice(1);
            return (
              <p key={i} style={BODY_STYLE}>
                <span
                  style={{
                    float: 'left',
                    fontFamily: 'var(--t-display)',
                    fontStyle: 'italic',
                    fontSize: 60,
                    lineHeight: 0.78,
                    padding: '8px 12px 0 0',
                    color: 'var(--t-ink)',
                  }}
                >
                  {cap}
                </span>
                {rest}
              </p>
            );
          }
          return (
            <p key={i} style={{ ...BODY_STYLE, marginTop: 20 }}>
              {p}
            </p>
          );
        })}
      </div>
      <ClosingMark />
    </div>
  );
}

/* ─── Columns — newspaper two-column setting. ────────────────── */

function ObituaryColumns({ dates, body }: { dates?: string; body: string }) {
  const paras = paragraphs(body);
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {dates?.trim() && (
        <DatesLine dates={dates} style={{ textAlign: 'center', marginBottom: 22 }} />
      )}
      {/* Header rule — gold hairline across the measure, the
          newspaper's separation between masthead and setting. */}
      <div aria-hidden style={{ height: 1, background: GOLD, opacity: 0.45, marginBottom: 28 }} />
      <div
        style={{
          /* columnWidth lets narrow viewports collapse to a single
             column; columnCount caps the wide setting at two. */
          columnCount: 2,
          columnWidth: 280,
          columnGap: 44,
          columnRule: '1px solid var(--t-line)',
          textAlign: 'justify',
          hyphens: 'auto',
        }}
      >
        {paras.map((p, i) => (
          <p
            key={i}
            style={{
              ...BODY_STYLE,
              fontSize: 15,
              lineHeight: 1.78,
              marginTop: i === 0 ? 0 : 16,
            }}
          >
            {p}
          </p>
        ))}
      </div>
      <ClosingMark />
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function ObituarySection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const data = readObituary(manifest);
  const body = data.body?.trim() ?? '';
  const empty = !body;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'obituaryEyebrow', 'In loving memory')}
        title={blockCopy(manifest, 'obituaryTitle', 'A life, remembered')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('obituaryEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('obituaryTitle', v) : undefined}
        /* The dates line + closing sprig carry the ornament here —
           the default sprig divider under the title would double it. */
        divider="none"
        marginBottom={30}
      />
      {empty ? (
        <BlockEmpty hint="Write the remembrance in the Obituary panel (or the Memorial workspace)." />
      ) : variant === 'columns' ? (
        <ObituaryColumns dates={data.dates} body={body} />
      ) : (
        <ObituaryLetter dates={data.dates} body={body} />
      )}
    </BlockFrame>
  );
}
