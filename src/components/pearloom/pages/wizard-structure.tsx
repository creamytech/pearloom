'use client';

/* ─────────────────────────────────────────────────────────────
   WizardStructureSection — "The structure", on the Palette step.

   The three biggest layout decisions, as tap-able wireframe
   tiles, so the host walks out of setup with a site that's
   ARRANGED the way they imagined — not just dressed:

     · How it reads — one page (single scroll) vs magazine
       (each section its own page) → manifest.siteMode
     · The nav — five real nav variants → manifest.layouts.nav
     · The hero — six real hero variants → manifest.layouts.hero

   Every row leads with "Pear's pick" (no explicit stamp — the
   look recipe / edition defaults ride), so skipping the whole
   thing changes nothing. Explicit picks land on the manifest at
   finish and win everywhere, exactly like the editor's Layout
   tab writes them. Tiles are tiny CSS wireframes, not screenshots
   — they read as ARRANGEMENT, which is the actual decision.
   ───────────────────────────────────────────────────────────── */

import type { CSSProperties } from 'react';
import { Sparkle } from '../motifs';

export interface StructurePicks {
  siteMode?: 'scroll' | 'multi-page';
  navVariant?: string;
  heroVariant?: string;
}

/* ── Wireframe atoms ─────────────────────────────────────────── */

const FRAME: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 6,
  background: 'var(--cream-2, #FBF7EE)',
  border: '1px solid var(--line-soft)',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

function Bar({ w, h = 3, style }: { w: number | string; h?: number; style?: CSSProperties }) {
  return <span aria-hidden style={{ display: 'block', width: w, height: h, borderRadius: 2, background: 'var(--ink-muted)', opacity: 0.55, ...style }} />;
}
function Dot({ style }: { style?: CSSProperties }) {
  return <span aria-hidden style={{ display: 'block', width: 4, height: 4, borderRadius: 99, background: 'var(--pl-olive, #5C6B3F)', ...style }} />;
}

/* Nav wireframes — the bar across the top of the frame. */
function NavWire({ id }: { id: string }) {
  const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 3, padding: '4px 5px', borderBottom: '1px solid var(--line-soft)' };
  if (id === 'centered') {
    return <div style={{ ...row, justifyContent: 'center' }}><Bar w={8} /><Bar w={8} /><Dot style={{ margin: '0 4px' }} /><Bar w={8} /><Bar w={8} /></div>;
  }
  if (id === 'split') {
    return <div style={row}><Dot /><span style={{ flex: 1 }} /><Bar w={8} /><Bar w={8} /><Bar w={12} h={5} style={{ background: 'var(--pl-olive, #5C6B3F)', opacity: 0.9 }} /></div>;
  }
  if (id === 'serif-block') {
    return <div style={{ ...row, flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '4px 6px' }}><Bar w={26} h={5} style={{ opacity: 0.8 }} /><div style={{ display: 'flex', gap: 3 }}><Bar w={7} h={2} /><Bar w={7} h={2} /><Bar w={7} h={2} /></div></div>;
  }
  if (id === 'minimal-text') {
    return <div style={{ ...row, justifyContent: 'center' }}><Bar w={9} h={2} /><Bar w={9} h={2} /><Bar w={9} h={2} /><Bar w={9} h={2} /></div>;
  }
  // iconic
  return <div style={row}><Dot style={{ width: 6, height: 6 }} /><span style={{ flex: 1 }} /><Bar w={7} h={2} /><Bar w={7} h={2} /><Bar w={7} h={2} /></div>;
}

/* Hero wireframes — the body of the frame. */
function HeroWire({ id }: { id: string }) {
  const body: CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5 };
  if (id === 'split') {
    return (
      <div style={{ ...body, gap: 4 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}><Bar w="80%" h={5} style={{ opacity: 0.8 }} /><Bar w="55%" h={3} /></div>
        <div style={{ flex: 1, alignSelf: 'stretch', borderRadius: 3, background: 'var(--pl-olive-mist, #E0DDC9)' }} />
      </div>
    );
  }
  if (id === 'minimal') {
    return <div style={{ ...body, flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}><Bar w="60%" h={6} style={{ opacity: 0.8 }} /><Bar w="34%" h={3} /></div>;
  }
  if (id === 'fullbleed') {
    return (
      <div style={{ ...body, position: 'relative', background: 'var(--pl-olive-mist, #E0DDC9)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent, rgba(14,13,11,0.35))' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}><Bar w={30} h={5} style={{ background: 'var(--cream, #F5EFE2)', opacity: 0.95 }} /><Bar w={18} h={2} style={{ background: 'var(--cream, #F5EFE2)', opacity: 0.7 }} /></div>
      </div>
    );
  }
  if (id === 'typographic') {
    return <div style={{ ...body, flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}><Bar w="92%" h={8} style={{ opacity: 0.85 }} /><Bar w="74%" h={8} style={{ opacity: 0.85 }} /></div>;
  }
  if (id === 'postcard') {
    return (
      <div style={{ ...body }}>
        <div style={{ width: '70%', height: '85%', borderRadius: 3, background: 'var(--card, #fff)', border: '1px solid var(--line-soft)', boxShadow: '0 2px 5px rgba(14,13,11,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Bar w="55%" h={4} style={{ opacity: 0.8 }} /><Bar w="35%" h={2} />
        </div>
      </div>
    );
  }
  // centered
  return <div style={{ ...body, flexDirection: 'column', gap: 3 }}><Bar w="55%" h={6} style={{ opacity: 0.8 }} /><Bar w="32%" h={3} /><Bar w={16} h={6} style={{ background: 'var(--pl-olive, #5C6B3F)', opacity: 0.9, borderRadius: 99, marginTop: 2 }} /></div>;
}

/* Site-mode wireframes. */
function ModeWire({ id }: { id: string }) {
  if (id === 'multi-page') {
    return (
      <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 20, height: 28, borderRadius: 3, border: '1px solid var(--line)', background: 'var(--card, #fff)', display: 'flex', flexDirection: 'column', gap: 2, padding: 3 }}>
            <Bar w="100%" h={3} style={{ opacity: 0.7 }} /><Bar w="70%" h={2} /><Bar w="85%" h={2} />
          </div>
        ))}
      </div>
    );
  }
  // scroll
  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '5px 0' }}>
      <div style={{ width: 26, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Bar w="100%" h={6} style={{ opacity: 0.7 }} />
        <Bar w="100%" h={4} /><Bar w="80%" h={3} /><Bar w="100%" h={4} /><Bar w="90%" h={3} />
      </div>
    </div>
  );
}

/* ── Tile + row scaffolding ──────────────────────────────────── */

function Tile({
  on, label, sub, onClick, children,
}: {
  on: boolean; label: string; sub?: string; onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        display: 'flex', flexDirection: 'column', gap: 5, padding: 6,
        borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        border: on ? '2px solid var(--pl-olive, #5C6B3F)' : '1.5px solid var(--line)',
        background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card)',
        transition: 'border-color 180ms var(--pl-ease-out, ease), background 180ms var(--pl-ease-out, ease)',
        minWidth: 0,
      }}
    >
      {children && <span style={FRAME}>{children}</span>}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{label}</span>
      {sub && <span style={{ fontSize: 9.5, color: 'var(--ink-muted)', lineHeight: 1.3, marginTop: -3 }}>{sub}</span>}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '14px 0 8px' }}>
        {label}
      </div>
      <div className="pl8-structure-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

const NAV_TILES = [
  { id: 'centered', label: 'Centered', sub: 'Logo center, links flank' },
  { id: 'split', label: 'Split', sub: 'Logo left, RSVP right' },
  { id: 'serif-block', label: 'Serif block', sub: 'Display headline' },
  { id: 'minimal-text', label: 'Minimal', sub: 'Links only' },
  { id: 'iconic', label: 'Iconic', sub: 'Glyph + thin rail' },
];

const HERO_TILES = [
  { id: 'centered', label: 'Centered', sub: 'Classic, all eyes middle' },
  { id: 'split', label: 'Split', sub: 'Type left, photo right' },
  { id: 'fullbleed', label: 'Full-bleed', sub: 'Photo behind everything' },
  { id: 'typographic', label: 'Typographic', sub: 'Huge stacked names' },
  { id: 'postcard', label: 'Postcard', sub: 'Card on a tinted mat' },
  { id: 'minimal', label: 'Minimal', sub: 'Quiet, left-aligned' },
];

export function WizardStructureSection({
  picks,
  onChange,
}: {
  picks: StructurePicks;
  onChange: (next: Partial<StructurePicks>) => void;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)' }}>
        <Sparkle size={11} color="var(--gold)" /> The structure
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: '4px 0 0', lineHeight: 1.5 }}>
        How the site is arranged — Pear picks well, but it&rsquo;s your house.
        Tap &ldquo;Pear decides&rdquo; on any row to hand it back.
      </p>

      <Row label="How it reads">
        <Tile on={picks.siteMode === undefined} label="Pear decides" sub="One flowing page"
          onClick={() => onChange({ siteMode: undefined })} />
        <Tile on={picks.siteMode === 'scroll'} label="One page" sub="Everything in one scroll"
          onClick={() => onChange({ siteMode: 'scroll' })}><ModeWire id="scroll" /></Tile>
        <Tile on={picks.siteMode === 'multi-page'} label="Magazine" sub="Each section its own page"
          onClick={() => onChange({ siteMode: 'multi-page' })}><ModeWire id="multi-page" /></Tile>
      </Row>

      <Row label="The nav">
        <Tile on={picks.navVariant === undefined} label="Pear decides" sub="Matched to your look"
          onClick={() => onChange({ navVariant: undefined })} />
        {NAV_TILES.map((t) => (
          <Tile key={t.id} on={picks.navVariant === t.id} label={t.label} sub={t.sub}
            onClick={() => onChange({ navVariant: t.id })}><NavWire id={t.id} /></Tile>
        ))}
      </Row>

      <Row label="The hero">
        <Tile on={picks.heroVariant === undefined} label="Pear decides" sub="Matched to your look"
          onClick={() => onChange({ heroVariant: undefined })} />
        {HERO_TILES.map((t) => (
          <Tile key={t.id} on={picks.heroVariant === t.id} label={t.label} sub={t.sub}
            onClick={() => onChange({ heroVariant: t.id })}><HeroWire id={t.id} /></Tile>
        ))}
      </Row>
    </div>
  );
}
