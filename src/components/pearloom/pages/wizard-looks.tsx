'use client';

// ─────────────────────────────────────────────────────────────
// WizardLooksSection — "The look" picker at the end of the wizard.
//
// Three cards, side by side (they used to stack), each a REAL
// mini-site preview: the host's palette rendered through a full
// look recipe — component kit (ticket stubs / plates / scrapbook
// tape / index rules / hairlines), paper texture at its recipe
// intensity, ornament placement, rhythm. Not three tints of one
// design.
//
// Every card has an expand button (⤢) opening a full-height
// preview with more of the page — hero, schedule rows in the
// kit's real treatment, an RSVP pill — so the host sees what
// they're choosing before Pear presses it.
//
// Recipe 'match' is what generation stamps anyway; picking an
// alternate writes the explicit kit/texture/motif onto the
// manifest at finish (explicit picks win).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from 'react';
import { lookRecipesFor, type LookRecipe } from '@/lib/site-look/look-recipes';
import { themeVarsFromPalette } from '@/lib/site-look/wizard-look';
import { Icon, Sparkle } from '../motifs';

const FALLBACK_VARS: Record<string, string> = {
  '--t-paper': '#F5EFE2', '--t-section': '#EDE7DA', '--t-card': '#FBF7EE',
  '--t-ink': '#0E0D0B', '--t-ink-soft': '#3A332C', '--t-ink-muted': '#6F6557',
  '--t-accent': '#5C6B3F', '--t-accent-2': '#8A9A60', '--t-accent-bg': '#E0DDC9',
  '--t-accent-ink': '#363F22', '--t-gold': '#C19A4B',
  '--t-line': 'rgba(14,13,11,0.16)', '--t-line-soft': 'rgba(14,13,11,0.08)',
  '--t-rsvp': '#0E0D0B', '--t-rsvp-ink': '#F5EFE2',
};

interface VignetteProps {
  recipe: LookRecipe;
  vars: Record<string, string>;
  nameA: string;
  nameB: string;
  dateLabel: string;
  placeLabel: string;
  /** Compact card vs the expanded modal page. */
  expanded?: boolean;
}

/* Kit-true row treatments — the same construction language the
   renderer's [data-pl-kit] CSS gives schedule rows, hand-scaled
   for the vignette so each look reads as a different OBJECT. */
function KitRow({ kit, time, label, i }: { kit: LookRecipe['kitId']; time: string; label: string; i: number }) {
  const base: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', fontSize: 10, color: 'var(--t-ink)',
  };
  const timeEl = (mono = false, big = false) => (
    <span style={{
      fontFamily: mono ? 'ui-monospace, monospace' : big ? 'var(--font-display, Georgia, serif)' : 'inherit',
      fontSize: big ? 13 : 9, fontWeight: 700, color: 'var(--t-accent-ink, var(--t-accent))',
      letterSpacing: mono ? '0.06em' : undefined, flexShrink: 0, minWidth: 38,
    }}>{time}</span>
  );
  const labelEl = (italic = false) => (
    <span style={{ flex: 1, fontWeight: 600, fontStyle: italic ? 'italic' : undefined, fontFamily: italic ? 'var(--font-display, Georgia, serif)' : 'inherit', fontSize: italic ? 11 : 10 }}>{label}</span>
  );
  if (kit === 'ticket') {
    return <div style={{ ...base, border: '1.5px dashed var(--t-accent)', borderRadius: 6, background: 'var(--t-card)' }}>{timeEl(true)}{labelEl()}</div>;
  }
  if (kit === 'plate') {
    return <div style={{ ...base, background: 'var(--t-card)', borderRadius: 8, boxShadow: '0 0 0 1px var(--t-line), inset 0 0 0 2px var(--t-paper), inset 0 0 0 3px var(--t-line-soft)' }}>{timeEl(false, true)}{labelEl(true)}</div>;
  }
  if (kit === 'scrapbook') {
    return (
      <div style={{ ...base, background: 'var(--t-card)', borderRadius: 4, transform: `rotate(${i % 2 ? 1.4 : -1.4}deg)`, boxShadow: '0 2px 6px var(--t-line-soft)', position: 'relative', marginTop: 4 }}>
        <span aria-hidden style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%) rotate(-2deg)', width: 34, height: 9, background: 'var(--t-accent-bg)', opacity: 0.85, borderRadius: 1 }} />
        {timeEl()}{labelEl()}
      </div>
    );
  }
  if (kit === 'index') {
    return <div style={{ ...base, borderLeft: '2px solid #B3402E', background: 'repeating-linear-gradient(transparent, transparent 14px, var(--t-line-soft) 14px, var(--t-line-soft) 15px)', paddingLeft: 12 }}>{timeEl(true)}{labelEl()}</div>;
  }
  if (kit === 'minimal') {
    return <div style={{ ...base, borderBottom: '1px solid var(--t-line)', padding: '7px 2px' }}>{timeEl(false, true)}{labelEl()}</div>;
  }
  return <div style={{ ...base, background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 8 }}>{timeEl()}{labelEl()}</div>;
}

function CornerSprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg width="34" height="34" viewBox="0 0 60 60" aria-hidden style={{ opacity: 0.4, transform: flip ? 'scaleX(-1)' : undefined }}>
      <path d="M30 8 Q 24 26 30 52" fill="none" stroke="var(--t-accent)" strokeWidth="1.4" />
      <ellipse cx="22" cy="24" rx="4" ry="2" fill="var(--t-accent)" opacity={0.8} transform="rotate(-30 22 24)" />
      <ellipse cx="38" cy="32" rx="4" ry="2" fill="var(--t-accent)" opacity={0.7} transform="rotate(30 38 32)" />
      <circle cx="30" cy="42" r="2.4" fill="var(--t-gold)" />
    </svg>
  );
}

function LookVignette({ recipe, vars, nameA, nameB, dateLabel, placeLabel, expanded = false }: VignetteProps) {
  const rows = expanded
    ? [['4:00', 'Ceremony'], ['5:30', 'Cocktails on the lawn'], ['7:00', 'Dinner & toasts'], ['10:00', 'Last dance']]
    : [['4:00', 'Ceremony'], ['7:00', 'Dinner & toasts']];
  const showMarks = recipe.motifLayout !== 'none';
  return (
    <div
      className="pl8-guest"
      data-pl-texture={recipe.texture}
      data-pl-kit={recipe.kitId}
      data-pl-density={recipe.density}
      style={{
        ...(vars as CSSProperties),
        ['--pl-texture-intensity' as string]: String(recipe.textureIntensity),
        position: 'relative', overflow: 'hidden',
        background: 'var(--t-paper)', color: 'var(--t-ink)',
        borderRadius: expanded ? 14 : 10,
        padding: expanded ? '34px 28px 28px' : '20px 14px 16px',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column',
        gap: expanded ? 16 : 9,
        minHeight: expanded ? 480 : 250,
      }}
    >
      {showMarks && recipe.motifLayout !== 'dividers' && (
        <>
          <div style={{ position: 'absolute', top: 6, left: 8 }}><CornerSprig flip /></div>
          <div style={{ position: 'absolute', top: 6, right: 8 }}><CornerSprig /></div>
        </>
      )}
      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: expanded ? 9 : 7.5, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--t-accent-ink, var(--t-accent))' }}>
          We&rsquo;re celebrating
        </div>
        <div style={{ fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)', fontWeight: 600, fontSize: expanded ? 34 : 21, lineHeight: 1.05, marginTop: 4 }}>
          {nameA}
          {nameB && <span style={{ fontStyle: 'italic', fontSize: '0.6em', opacity: 0.7, margin: '0 0.14em', fontWeight: 400 }}>&amp;</span>}
          {nameB}
        </div>
        <div style={{ fontSize: expanded ? 11 : 8.5, color: 'var(--t-ink-soft)', marginTop: 4 }}>
          {dateLabel} · {placeLabel}
        </div>
      </div>
      {/* Divider — the look's seam treatment */}
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <span style={{ width: expanded ? 60 : 34, height: 1, background: 'var(--t-line)' }} />
        {recipe.motifLayout === 'dividers' || recipe.motifLayout === 'scattered'
          ? <CornerSprig />
          : <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--t-gold)' }} />}
        <span style={{ width: expanded ? 60 : 34, height: 1, background: 'var(--t-line)' }} />
      </div>
      {/* Schedule rows — the kit's real construction */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: recipe.kitId === 'scrapbook' ? 7 : 5, textAlign: 'left', position: 'relative', zIndex: 2 }}>
        {rows.map(([t, l], i) => <KitRow key={l} kit={recipe.kitId} time={t} label={l} i={i} />)}
      </div>
      {expanded && (
        <div style={{ textAlign: 'left', fontSize: 10.5, lineHeight: 1.6, color: 'var(--t-ink-soft)', background: 'var(--t-section)', borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ fontWeight: 700, color: 'var(--t-ink)', display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Our story</span>
          Body copy sits on this paper, in this rhythm — every section of your site is built from these same pieces.
        </div>
      )}
      {/* RSVP pill */}
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2 }}>
        <span style={{ display: 'inline-block', padding: expanded ? '9px 22px' : '6px 14px', borderRadius: 999, background: 'var(--t-rsvp)', color: 'var(--t-rsvp-ink)', fontSize: expanded ? 11 : 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          RSVP
        </span>
      </div>
    </div>
  );
}

/* ── The section ─────────────────────────────────────────────── */

export function WizardLooksSection({
  occasion, paletteColors, nameA, nameB, dateLabel, placeLabel, selectedId, onSelect,
}: {
  occasion: string;
  paletteColors: string[] | undefined;
  nameA: string;
  nameB: string;
  dateLabel: string;
  placeLabel: string;
  /** null = nothing picked yet — Pear's match shows as the default. */
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const recipes = lookRecipesFor(occasion);
  const vars = (paletteColors && paletteColors.length >= 2 && themeVarsFromPalette(paletteColors)) || FALLBACK_VARS;
  const effective = selectedId ?? 'match';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedRecipe = recipes.find((r) => r.id === expandedId) ?? null;

  useEffect(() => {
    if (!expandedId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandedId]);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)' }}>
          <Sparkle size={11} color="var(--gold)" /> The look
        </div>
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: '0 0 14px', lineHeight: 1.5 }}>
        Same palette, three different constructions — component kits, paper textures,
        ornament. Tap <Icon name='arrow-ur' size={11} /> to see a look full size.
      </p>
      <div className="pl8-looks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {recipes.map((r) => {
          const on = effective === r.id;
          return (
            <div key={r.id} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                aria-pressed={on}
                style={{
                  display: 'block', width: '100%', padding: 0, textAlign: 'left',
                  borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                  background: 'var(--card, #fff)',
                  border: on ? '2px solid var(--pl-olive, #5C6B3F)' : '1.5px solid var(--line)',
                  boxShadow: on ? '0 0 0 3px var(--pl-olive-mist, #E0DDC9), 0 10px 24px rgba(40,28,12,0.10)' : 'none',
                  transition: 'box-shadow var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease), border-color var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: 6 }}>
                  <LookVignette recipe={r} vars={vars} nameA={nameA} nameB={nameB} dateLabel={dateLabel} placeLabel={placeLabel} />
                </div>
                <div style={{ padding: '4px 12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{r.label}</span>
                    {r.id === 'match' && (
                      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)', background: 'var(--peach-bg, #F4E3D3)', padding: '2px 7px', borderRadius: 999 }}>
                        ★ Pear&rsquo;s pick
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.45 }}>{r.blurb}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpandedId(r.id); }}
                aria-label={`Expand ${r.label} preview`}
                title="See it full size"
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 3,
                  width: 28, height: 28, borderRadius: 8,
                  display: 'grid', placeItems: 'center',
                  background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(3px)',
                  border: '1px solid var(--line)', cursor: 'pointer',
                  color: 'var(--ink-soft)',
                }}
              >
                <Icon name='arrow-ur' size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Expanded preview */}
      {expandedRecipe && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${expandedRecipe.label} preview`}
          onClick={() => setExpandedId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(40,40,30,0.55)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'var(--card, #fff)', borderRadius: 20, padding: 14, boxShadow: '0 32px 80px rgba(14,13,11,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 10px' }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{expandedRecipe.label}</span>
                <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginLeft: 10 }}>{expandedRecipe.blurb}</span>
              </div>
              <button type="button" onClick={() => setExpandedId(null)} aria-label="Close preview" style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer' }}>
                <Icon name="close" size={14} color="var(--ink-soft)" />
              </button>
            </div>
            <LookVignette recipe={expandedRecipe} vars={vars} nameA={nameA} nameB={nameB} dateLabel={dateLabel} placeLabel={placeLabel} expanded />
            <button
              type="button"
              onClick={() => { onSelect(expandedRecipe.id); setExpandedId(null); }}
              className="btn btn-primary pl-pearl-accent"
              style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            >
              Use this look
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 720px) {
          :global(.pl8-looks-grid) {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          :global(.pl8-looks-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
