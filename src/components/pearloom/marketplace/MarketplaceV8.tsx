'use client';

/* ========================================================================
   PEARLOOM MARKETPLACE V8
   The starting-points gallery for every occasion Pearloom supports.
   Left: occasion sidebar grouped into Weddings / Milestones / Family /
         Ceremonies & faith / Memorials & reunions / Your story.
   Right: hero → vibe + palette filter chips → featured row → full grid.
   Each tile renders a miniature version of the site using the template's
   palette + layout. Clicking opens /wizard/new?template=<id>.
   ======================================================================== */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Footbar, TopNav } from '../chrome';
import { Blob, Icon, Pear, Sparkle, Squiggle } from '../motifs';
import {
  OCCASION_GROUPS,
  OCCASION_LABELS,
  PALETTE_SWATCHES,
  TEMPLATES,
  type OccasionGroup,
  type Template,
  type TemplatePalette,
  type TemplateVibe,
} from './templates-data';
import { TemplatePreview } from './TemplatePreview';

const ALL_VIBES: TemplateVibe[] = [
  'Warm',
  'Editorial',
  'Playful',
  'Quiet',
  'Groovy',
  'Black tie',
  'Outdoorsy',
  'Intimate',
  'Romantic',
  'Modern',
  'Handwritten',
];

const ALL_PALETTES: TemplatePalette[] = [
  'groovy-garden',
  'cream-sage',
  'warm-linen',
  'olive-gold',
  'lavender-ink',
  'dusk-meadow',
  'peach-cream',
];

const PALETTE_LABELS: Record<TemplatePalette, string> = {
  'groovy-garden': 'Groovy Garden',
  'dusk-meadow': 'Dusk Meadow',
  'warm-linen': 'Warm Linen',
  'olive-gold': 'Olive & Gold',
  'lavender-ink': 'Lavender & Ink',
  'cream-sage': 'Cream & Sage',
  'peach-cream': 'Peach Cream',
};

export function MarketplaceV8() {
  const [group, setGroup] = useState<string>('all');
  const [occasion, setOccasion] = useState<string | null>(null);
  const [vibes, setVibes] = useState<TemplateVibe[]>([]);
  const [palette, setPalette] = useState<TemplatePalette | null>(null);
  const [q, setQ] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);

  function toggleVibe(v: TemplateVibe) {
    setVibes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  const visibleGroups: OccasionGroup[] = group === 'all' ? OCCASION_GROUPS : OCCASION_GROUPS.filter((g) => g.id === group);

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => {
      if (group !== 'all') {
        const inGroup = visibleGroups.some((g) => g.occasions.includes(t.occasion));
        if (!inGroup) return false;
      }
      if (occasion && t.occasion !== occasion) return false;
      if (vibes.length > 0 && !vibes.some((v) => t.vibes.includes(v))) return false;
      if (palette && t.palette !== palette) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (
          !t.name.toLowerCase().includes(needle) &&
          !t.description.toLowerCase().includes(needle) &&
          !(OCCASION_LABELS[t.occasion] ?? '').toLowerCase().includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [group, occasion, vibes, palette, q, visibleGroups]);

  const featured = filtered.filter((t) => t.featured);
  const rest = filtered.filter((t) => !t.featured);

  const activeOccasionCount = filtered.length;
  const totalTemplates = TEMPLATES.length;

  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopNav active="Templates" />

      {/* ── Hero ─────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '72px 32px 32px', overflow: 'hidden' }}>
        <Blob tone="lavender" size={380} opacity={0.5} style={{ position: 'absolute', top: -80, left: -80 }} />
        <Blob tone="peach" size={320} opacity={0.45} style={{ position: 'absolute', top: 40, right: -80 }} />
        <Blob tone="sage" size={260} opacity={0.4} style={{ position: 'absolute', bottom: -60, left: '40%' }} />
        <Squiggle variant={2} width={220} style={{ position: 'absolute', top: 120, right: 260, transform: 'rotate(-12deg)' }} />

        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(61,74,31,0.12)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              marginBottom: 20,
            }}
          >
            <Icon name="sparkles" size={12} /> {totalTemplates} lovingly designed templates
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(56px, 8vw, 96px)', margin: 0, lineHeight: 0.96 }}>
            Start from a <span className="display-italic">story</span>
            <br />
            that feels like <span className="display-italic">yours.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', maxWidth: 620, margin: '22px auto 0', lineHeight: 1.55 }}>
            Every template is a full site — pages, flow, tone, and type — ready for your people, photos, and moments.
          </p>
          <div style={{ marginTop: 26, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/wizard/new" className="btn btn-primary">
              Start from scratch <Icon name="arrow-right" size={13} />
            </Link>
            <Link href="/wizard/new?mode=pear" className="btn btn-outline">
              <Icon name="wand" size={13} /> Describe it to Pear
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sticky filter bar ─────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(253, 250, 240, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--line-soft)',
          borderBottom: '1px solid var(--line-soft)',
          padding: '14px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            gap: 18,
          }}
          className="pl8-mkt-filterbar"
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setGroup('all');
                setOccasion(null);
              }}
              style={groupChipStyle(group === 'all' && !occasion)}
            >
              <Icon name="sparkles" size={12} /> All occasions{' '}
              <span style={{ opacity: 0.55, fontWeight: 400 }}>{totalTemplates}</span>
            </button>
            {OCCASION_GROUPS.map((g) => {
              const count = TEMPLATES.filter((t) => g.occasions.includes(t.occasion)).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGroup(g.id);
                    setOccasion(null);
                  }}
                  style={groupChipStyle(group === g.id)}
                >
                  {g.label} <span style={{ opacity: 0.55, fontWeight: 400 }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Icon
                name="search"
                size={14}
                color="var(--ink-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search templates…"
                style={{
                  padding: '10px 14px 10px 36px',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: 'var(--cream-2)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  width: 240,
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Secondary row: vibe chips + palette */}
        <div style={{ maxWidth: 1280, margin: '12px auto 0', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
              }}
            >
              Vibe
            </span>
            {ALL_VIBES.map((v) => {
              const on = vibes.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleVibe(v)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    background: on ? 'var(--peach-bg)' : 'transparent',
                    border: on ? '1px solid var(--peach-2)' : '1px solid var(--line)',
                    color: on ? 'var(--peach-ink)' : 'var(--ink-soft)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {v}
                </button>
              );
            })}
            {vibes.length > 0 && (
              <button
                type="button"
                onClick={() => setVibes([])}
                style={{
                  fontSize: 11.5,
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Clear vibes
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
              }}
            >
              Palette
            </span>
            {ALL_PALETTES.map((p) => {
              const on = palette === p;
              const colors = PALETTE_SWATCHES[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPalette(on ? null : p)}
                  aria-label={PALETTE_LABELS[p]}
                  title={PALETTE_LABELS[p]}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px 4px 4px',
                    borderRadius: 999,
                    border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                    background: on ? 'var(--cream-2)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  <span style={{ display: 'flex' }}>
                    {colors.slice(0, 4).map((c, i) => (
                      <span
                        key={i}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: c,
                          marginLeft: i === 0 ? 0 : -4,
                          border: '1.5px solid var(--paper)',
                        }}
                      />
                    ))}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: on ? 'var(--ink)' : 'var(--ink-soft)' }}>
                    {PALETTE_LABELS[p]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Layout: occasion sidebar + template grid ───── */}
      <div
        className="pl8-mkt-layout"
        style={{ display: 'grid', gridTemplateColumns: '240px 1fr', maxWidth: 1320, margin: '0 auto', padding: '32px 32px 60px', gap: 32 }}
      >
        <aside className="pl8-mkt-sidebar" style={{ position: 'sticky', top: 156, alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 12 }}>
            Browse
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {visibleGroups.map((g) => (
              <div key={g.id}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{g.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {g.occasions.map((occ) => {
                    const count = TEMPLATES.filter((t) => t.occasion === occ).length;
                    if (count === 0) return null;
                    const on = occasion === occ;
                    return (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => setOccasion(on ? null : occ)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: on ? 'var(--ink)' : 'transparent',
                          color: on ? 'var(--cream)' : 'var(--ink-soft)',
                          border: 0,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: on ? 600 : 500,
                          fontFamily: 'var(--font-ui)',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ flex: 1 }}>{OCCASION_LABELS[occ]}</span>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {(occasion || vibes.length || palette || q) && (
            <button
              type="button"
              onClick={() => {
                setOccasion(null);
                setVibes([]);
                setPalette(null);
                setQ('');
              }}
              style={{
                marginTop: 22,
                padding: '8px 14px',
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                color: 'var(--ink-soft)',
                background: 'transparent',
                border: '1px dashed var(--line)',
                borderRadius: 999,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Clear all filters
            </button>
          )}
        </aside>

        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <h2 className="display" style={{ fontSize: 30, margin: 0 }}>
              {occasion
                ? OCCASION_LABELS[occasion]
                : group === 'all'
                  ? 'The whole library'
                  : OCCASION_GROUPS.find((g) => g.id === group)?.label}
              <span style={{ fontSize: 15, color: 'var(--ink-muted)', marginLeft: 10, fontWeight: 400 }}>
                {activeOccasionCount} {activeOccasionCount === 1 ? 'template' : 'templates'}
              </span>
            </h2>
          </div>

          {featured.length > 0 && !occasion && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkle size={12} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--peach-ink)',
                    textTransform: 'uppercase',
                  }}
                >
                  Featured this month
                </span>
              </div>
              <div className="pl8-mkt-grid pl8-mkt-grid-lg">
                {featured.map((t) => (
                  <TemplateTile
                    key={t.id}
                    t={t}
                    size="lg"
                    hovered={hovered === t.id}
                    onHover={(on) => setHovered(on ? t.id : null)}
                  />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <div className="pl8-mkt-grid pl8-mkt-grid-md">
                {rest.map((t) => (
                  <TemplateTile
                    key={t.id}
                    t={t}
                    size="md"
                    hovered={hovered === t.id}
                    onHover={(on) => setHovered(on ? t.id : null)}
                  />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div
              style={{
                padding: 56,
                textAlign: 'center',
                background: 'var(--cream-2)',
                border: '1.5px dashed var(--line)',
                borderRadius: 20,
              }}
            >
              <Pear size={72} tone="sage" sparkle />
              <div className="display" style={{ fontSize: 28, marginTop: 14 }}>
                Nothing quite fits.
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 4 }}>
                Try different vibes or a different palette, or let Pear sketch one for you.
              </p>
              <Link href="/wizard/new?mode=pear" className="btn btn-primary" style={{ marginTop: 16 }}>
                <Icon name="wand" size={13} /> Describe it to Pear
              </Link>
            </div>
          )}

          {/* Pear custom sketch */}
          <section style={{ marginTop: 56 }}>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(125deg, var(--sage-tint) 0%, var(--peach-bg) 65%, var(--lavender-bg) 100%)',
                borderRadius: 28,
                padding: '40px 48px',
                border: '1px solid var(--card-ring)',
                display: 'grid',
                gridTemplateColumns: '1fr 180px',
                alignItems: 'center',
                gap: 24,
              }}
            >
              <Squiggle variant={1} width={240} style={{ position: 'absolute', top: 28, right: 220, opacity: 0.5 }} />
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--peach-ink)',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="wand" size={12} /> Can't find the right fit?
                </div>
                <h3 className="display" style={{ fontSize: 'clamp(32px, 4vw, 44px)', margin: '0 0 10px' }}>
                  Tell Pear what you're <span className="display-italic">imagining.</span>
                </h3>
                <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 520, margin: '0 0 18px' }}>
                  Describe the event, the feeling, the people. Pear will sketch a template just for you — layout, tone,
                  palette, and all.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/wizard/new?mode=pear" className="btn btn-primary">
                    Describe my event <Icon name="arrow-right" size={13} />
                  </Link>
                  <Link href="/wizard/new?mode=voice" className="btn btn-outline">
                    <Icon name="mic" size={13} /> Or just talk
                  </Link>
                </div>
              </div>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <Pear size={140} tone="sage" sparkle />
              </div>
            </div>
          </section>
        </main>
      </div>

      <Footbar />
    </div>
  );
}

function groupChipStyle(active: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 999,
    background: active ? 'var(--ink)' : 'var(--card)',
    color: active ? 'var(--cream)' : 'var(--ink)',
    border: active ? '1px solid var(--ink)' : '1px solid var(--line)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  } as const;
}

/* ---------- Tile ---------- */
function TemplateTile({
  t,
  size,
  hovered,
  onHover,
}: {
  t: Template;
  size: 'md' | 'lg';
  hovered: boolean;
  onHover: (on: boolean) => void;
}) {
  const aspect = size === 'lg' ? '4/5' : '3/4';
  return (
    <Link
      href={`/wizard/new?template=${t.id}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform .22s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'block',
      }}
    >
      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid var(--card-ring)',
          boxShadow: hovered ? '0 24px 50px rgba(61,74,31,0.18)' : '0 8px 22px rgba(61,74,31,0.08)',
          transition: 'box-shadow .22s ease',
          aspectRatio: aspect,
        }}
      >
        <TemplatePreview template={t} small={size !== 'lg'} />

        {hovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(61,74,31,0) 55%, rgba(61,74,31,0.78) 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <span
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--cream)', color: 'var(--ink)', flex: 1, justifyContent: 'center' }}
              >
                Use this template <Icon name="arrow-right" size={12} />
              </span>
            </div>
          </div>
        )}

        {t.featured && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
              }}
            >
              <Sparkle size={10} /> Featured
            </span>
          </div>
        )}

        {/* Occasion badge */}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.9)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
            }}
          >
            {OCCASION_LABELS[t.occasion]}
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>
            {t.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t.layout}
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45, margin: '0 0 10px' }}>{t.description}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {t.vibes.slice(0, 3).map((v) => (
            <span key={v} className="pill" style={{ fontSize: 10.5, padding: '3px 9px' }}>
              {v}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
