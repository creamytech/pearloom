'use client';

/* ─────────────────────────────────────────────────────────────
   WizardSectionChooser — "What should your site hold?"

   The wizard's Sections step (Look phase, after Photos, before
   Vibe). A table of contents laid out on paper: every section the
   occasion suggests, pre-checked to its smart defaults, each with a
   one-tap layout chooser marked with Pear's recommended variant.

   Pure UI over `wizardSectionsFor(occasion)` (the derived section
   catalog, Wave 1). Writes `st.sectionPicks = { on, layouts }` — the
   exact shape `applySectionPicks` consumes. A host who touches
   nothing leaves `sectionPicks` undefined → handleFinish falls back
   to the essentials (identical to today). "Let Pear decide" makes
   that explicit and moves on.

   BRAND: paper ground · thread dividers · Fraunces labels · mono-caps
   eyebrows with a gold rule · the pearl as the "on" atom. Chrome
   tokens only (this is wizard chrome, never a site's --t-* bag).
   ───────────────────────────────────────────────────────────── */

import { useMemo, useState, type CSSProperties } from 'react';
import {
  wizardSectionsFor,
  type WizardSectionOffer,
  type SectionPicks,
} from '@/lib/event-os/wizard-sections';
import { Thread } from '@/components/brand/Thread';
import { VariantThumb } from '../redesign/variant-thumb';
import { PearlDot, Sparkle } from '../motifs';

// ── Layout chooser row ───────────────────────────────────────

function LayoutChooserRow({
  offer,
  current,
  open,
  onToggleOpen,
  onPick,
}: {
  offer: WizardSectionOffer;
  current: string;
  open: boolean;
  onToggleOpen: () => void;
  onPick: (variant: string) => void;
}) {
  if (offer.variants.length < 2) return null;
  const currentLabel =
    offer.variants.find((v) => v.id === current)?.label ?? current;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="wzsec-layout-pill"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px solid var(--line)',
          background: 'var(--card, #FBF7EE)',
          color: 'var(--ink-soft)',
          fontSize: 11.5,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          minHeight: 30,
        }}
      >
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
        <span>{currentLabel}</span>
        {offer.recommended === current && <PearlDot size={9} />}
      </button>

      {open && (
        <div
          className="wzsec-strip"
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {offer.variants.map((v) => {
            const on = v.id === current;
            const recommended = offer.recommended === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onPick(v.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: 8,
                  borderRadius: 12,
                  border: on ? '2px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line)',
                  background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card, #FBF7EE)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  minWidth: 64,
                  fontFamily: 'inherit',
                }}
              >
                <VariantThumb section={offer.section} variant={v.id} size="chip" />
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {v.label}
                  {recommended && <PearlDot size={8} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────

function SectionCard({
  offer,
  on,
  variant,
  pinned,
  chooserOpen,
  onToggle,
  onToggleChooser,
  onPickVariant,
}: {
  offer: WizardSectionOffer;
  on: boolean;
  variant: string;
  pinned: boolean;
  chooserOpen: boolean;
  onToggle: () => void;
  onToggleChooser: () => void;
  onPickVariant: (variant: string) => void;
}) {
  const active = on || pinned;
  /* Cards stay PAPER in both states (BRAND §9 — glass and washes are
     chrome, surfaces are paper). "On" reads as a bound page: solid
     hairline, full ink, gold pearl. "Set aside" reads as exactly
     that — a dashed keyline and faded ink, still on the table. */
  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: 12,
    borderRadius: 14,
    border: active ? '1px solid var(--line)' : '1px dashed var(--line)',
    background: 'var(--card, #FBF7EE)',
    boxShadow: active ? '0 1px 3px rgba(40,28,12,0.07)' : 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
  };

  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={pinned ? undefined : onToggle}
        aria-pressed={pinned ? undefined : on}
        aria-label={`${offer.label}${pinned ? ' (always on)' : on ? ' — on' : ' — off'}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          cursor: pinned ? 'default' : 'pointer',
          fontFamily: 'inherit',
          width: '100%',
          minHeight: 48,
        }}
      >
        <span style={{ opacity: active ? 1 : 0.45, transition: 'opacity 160ms ease', display: 'flex', flexShrink: 0 }}>
          <VariantThumb section={offer.section} variant={variant} />
        </span>
        <div style={{ flex: 1, minWidth: 0, opacity: active ? 1 : 0.6, transition: 'opacity 160ms ease' }}>
          <div
            className="display"
            style={{ fontSize: 18, lineHeight: 1.15, color: 'var(--ink)', fontWeight: 600 }}
          >
            {offer.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: active ? 'var(--sage-deep, #5C6B3F)' : 'var(--ink-muted)',
              fontStyle: active ? 'normal' : 'italic',
              marginTop: 2,
            }}
          >
            {pinned ? 'Always on' : active ? 'On your site' : 'Set aside'}
          </div>
        </div>
        {/* The pearl is the on/off atom (BRAND §3). */}
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            border: active ? 'none' : '1.5px solid var(--line)',
            background: active
              ? 'radial-gradient(circle at 34% 30%, #F4E4B8, var(--pl-gold, #C19A4B) 72%)'
              : 'transparent',
            boxShadow: active ? '0 1px 3px rgba(120,90,20,0.3)' : 'none',
          }}
        >
          {pinned && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pl-cream, #FDFAF0)' }} />
          )}
        </span>
      </button>

      {/* Layout chooser only when the section is on (or pinned). */}
      {active && (
        <LayoutChooserRow
          offer={offer}
          current={variant}
          open={chooserOpen}
          onToggleOpen={onToggleChooser}
          onPick={onPickVariant}
        />
      )}
    </div>
  );
}

// ── Group ────────────────────────────────────────────────────

function SectionGroup({
  eyebrow,
  offers,
  fold,
  render,
}: {
  eyebrow: string;
  offers: WizardSectionOffer[];
  /** Show at most this many before a "Show N more" fold (0 = no fold). */
  fold: number;
  render: (offer: WizardSectionOffer) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  if (offers.length === 0) return null;
  const folded = fold > 0 && offers.length > fold && !expanded;
  const shown = folded ? offers.slice(0, fold) : offers;
  const hiddenCount = offers.length - fold;

  return (
    <div style={{ marginBottom: 26 }}>
      <div
        className="wzsec-sticky-head"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: 'linear-gradient(var(--cream, #F5EFE2) 72%, transparent)',
          paddingTop: 6,
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10.5,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--pl-olive, #5C6B3F)',
          }}
        >
          {eyebrow}
        </div>
        <Thread variant="straight" height={6} weight={1} style={{ marginTop: 6 }} />
      </div>

      {/* Two-up on desktop halves the table-of-contents scroll; the
          cards fall back to one column on phones. align-start keeps
          an open layout chooser from stretching its row-mate. */}
      <div
        className="pl-cascade-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          alignItems: 'start',
          gap: 10,
          marginTop: 12,
        }}
      >
        {shown.map(render)}
      </div>

      {folded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            marginTop: 12,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink-soft)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Show {hiddenCount} more
        </button>
      )}
    </div>
  );
}

// ── The chooser ──────────────────────────────────────────────

export function WizardSectionChooser({
  occasion,
  occasionLabel,
  edition,
  value,
  onChange,
  onSkip,
}: {
  occasion: string;
  /** Friendly occasion noun for the subhead ("a wedding"). */
  occasionLabel: string;
  edition?: string;
  value: SectionPicks | undefined;
  onChange: (next: SectionPicks) => void;
  /** "Let Pear decide" — writes the essentials default + advances. */
  onSkip: () => void;
}) {
  const offers = useMemo(() => wizardSectionsFor(occasion, edition), [occasion, edition]);

  // Baseline: every essential ON, every offer at its default variant.
  const baseline = useMemo<SectionPicks>(() => {
    const on: string[] = [];
    const layouts: Record<string, string> = {};
    for (const o of offers) {
      if (o.defaultOn) on.push(o.section);
      layouts[o.section] = o.variant;
    }
    return { on, layouts };
  }, [offers]);

  // Derive the current picks from the host's saved value over the
  // baseline — pure, no effect. The pre-checked state is real; the
  // first toggle persists the whole set through onChange.
  const current = useMemo<SectionPicks>(
    () => ({
      on: value?.on ?? baseline.on,
      layouts: { ...baseline.layouts, ...(value?.layouts ?? {}) },
    }),
    [value, baseline],
  );

  const [openChooser, setOpenChooser] = useState<string | null>(null);

  const essentials = offers.filter((o) => o.group === 'essential');
  const optional = offers.filter((o) => o.group === 'optional');
  const onSet = new Set(current.on);

  // Has the host diverged from Pear's baseline (essentials on, every
  // section at its recommended/default variant)? Only then do we
  // offer "Reset to Pear's picks" — a quiet undo for over-editing.
  const diverged = useMemo(() => {
    if ([...current.on].sort().join('|') !== [...baseline.on].sort().join('|')) return true;
    return offers.some((o) => (current.layouts[o.section] ?? o.variant) !== o.variant);
  }, [current, baseline, offers]);

  function reset() {
    onChange({ on: [...baseline.on], layouts: { ...baseline.layouts } });
    setOpenChooser(null);
  }

  function toggle(section: string) {
    const nextOn = onSet.has(section)
      ? current.on.filter((s) => s !== section)
      : [...current.on, section];
    onChange({ on: nextOn, layouts: current.layouts });
  }

  function pickVariant(section: string, variant: string) {
    onChange({ on: current.on, layouts: { ...current.layouts, [section]: variant } });
    setOpenChooser(null);
  }

  const cardFor = (offer: WizardSectionOffer) => {
    const pinned = offer.section === 'hero';
    return (
      <SectionCard
        key={offer.section}
        offer={offer}
        on={onSet.has(offer.section)}
        variant={current.layouts[offer.section] ?? offer.variant}
        pinned={pinned}
        chooserOpen={openChooser === offer.section}
        onToggle={() => toggle(offer.section)}
        onToggleChooser={() =>
          setOpenChooser((cur) => (cur === offer.section ? null : offer.section))
        }
        onPickVariant={(v) => pickVariant(offer.section, v)}
      />
    );
  };

  // "Quiet site" — host turned every non-hero section off.
  const anyBodyOn = current.on.some((s) => s !== 'hero');

  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--pl-olive, #5C6B3F)',
          marginBottom: 8,
        }}
      >
        <Sparkle size={11} color="var(--gold)" /> The table of contents
      </div>

      <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03 }}>
        What should your site{' '}
        <span className="display-italic pl-letterpress" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>
          hold?
        </span>
      </h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 6px', lineHeight: 1.5 }}>
        Pear picked what fits {occasionLabel}. Tap to add or set aside — you can change everything later.
      </p>
      <p style={{ color: 'var(--ink-muted)', fontSize: 12.5, margin: '0 0 22px' }}>
        Every essential is already picked. Just glance and continue.
      </p>

      <SectionGroup eyebrow="Essentials" offers={essentials} fold={8} render={cardFor} />
      <SectionGroup eyebrow="Nice to have" offers={optional} fold={4} render={cardFor} />

      {!anyBodyOn && (
        <p
          style={{
            color: 'var(--ink-soft)',
            fontSize: 13.5,
            margin: '2px 0 20px',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          A quiet site — just your opening. Add a thread any time.
        </p>
      )}

      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-soft)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            padding: '4px 0',
          }}
        >
          Let Pear decide →
        </button>
        {diverged && (
          <button
            type="button"
            onClick={reset}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Reset to Pear’s picks
          </button>
        )}
      </div>

      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          :global(.wzsec-strip) {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </>
  );
}
