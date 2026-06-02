'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/themed-site.jsx — the canonical
   handoff canvas. Mounts inside EditorRedesign's canvas in both
   Edit + Preview modes (handoff: same renderer in both).

   Dependencies inlined or imported from production equivalents:
     - getTheme + themeRootStyle from ../site/themes
     - Pear + Icon from ../motifs
     - WatercolorBloom + Motif + MotifScatter from ../site/MotifScatter
     - TextureFilters from ../site/TextureFilters
     - KDivider / TButton / SitePhoto / TSectionHead defined inline
       below (handoff/shared/themes.jsx + kits.jsx atoms ported
       verbatim, scoped to this file).

   Section blocks: HeroBlock (centered/minimal/split/postcard
   variants), StoryBlock (sidebyside default), DetailsBlock (tiles),
   ScheduleBlock (cards), TravelBlock (rows), RegistryBlock (cards),
   GalleryBlock (grid), RsvpBlock (centered), FaqBlock (accordion).
*/

import { type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import { getTheme, themeRootStyle, type Density, type Theme } from '../site/themes';
import { Motif, MotifScatter, WatercolorBloom, type MotifKind } from '../site/MotifScatter';
import { TextureFilters } from '../site/TextureFilters';
import type { SectionId } from './EditorRedesign';

interface Props {
  active: SectionId;
  hover: SectionId;
  setActive: (id: SectionId) => void;
  setHover: (id: SectionId) => void;
  editable: boolean;
  manifest: StoryManifest;
  names: [string, string];
}

/* ─── Top-level shell — handoff themed-site.jsx L106-218. ────── */

export function ThemedSite({ active, hover, setActive, setHover, editable, manifest, names }: Props) {
  const themeId = ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string } }).theme?.id);
  const theme = getTheme(themeId);
  const density = (manifest.density ?? 'comfortable') as Density;
  const motifsOn = (manifest as unknown as { motifsEnabled?: boolean }).motifsEnabled ?? true;
  const textureIntensity = (manifest as unknown as { textureIntensity?: number }).textureIntensity ?? 1;
  const siteLayout = ((manifest as unknown as { siteLayout?: string }).siteLayout) ?? 'stacked';

  /* Decor Library overrides — handoff themed-site.jsx L116-117 +
     L176. Host writes manifest.motifKind / dividerLook / pattern
     / decorColor via the Decor Library drawer; ThemedSite reads
     them and overrides the theme's per-pack defaults. Each falls
     back to the theme's value when not set. */
  const decor = {
    motif: ((manifest as unknown as { motifKind?: string }).motifKind),
    divider: ((manifest as unknown as { dividerLook?: string }).dividerLook),
    pattern: ((manifest as unknown as { pattern?: string }).pattern),
    color: ((manifest as unknown as { decorColor?: string }).decorColor),
  };

  const nameA = names[0] || 'Scott';
  const nameB = names[1] || 'Shauna';
  const rawDate = (manifest as unknown as { logistics?: { date?: string } }).logistics?.date;
  const date = formatHeroDate(rawDate) || 'Monday, April 26, 2027';
  const venue = (manifest as unknown as { logistics?: { venue?: string } }).logistics?.venue || 'Casa Chorro';
  const place = (manifest as unknown as { logistics?: { place?: string } }).logistics?.place || 'Santorini, Greece';

  /* Motif resolution (handoff L116-117):
       host's Decor Library pick wins over theme default; if motifs
       are toggled off entirely, force 'none'. */
  const baseMotif: MotifKind = !motifsOn ? 'none' : (theme.motif !== 'none' ? (theme.motif as MotifKind) : 'olive');
  const motif: MotifKind = decor.motif
    ? (decor.motif === 'none' ? 'none' : (decor.motif as MotifKind))
    : baseMotif;
  const dividerLook = decor.divider || theme.look.divider;
  const pad = { cozy: 0.74, comfortable: 1, spacious: 1.32 }[density] || 1;
  const showWashHero = textureIntensity > 0 && theme.texture === 'watercolor';

  /* Section copy + content — pulls from manifest with prototype
     fallbacks. Keeps the renderer data-driven per handoff L141-153. */
  const C = buildCopy(theme, manifest, { nameA, nameB, date, place: `${venue} · ${place}` });
  const ctx: SectionCtx = { theme, pad, editable, motif, motifsOn, textureIntensity, showWashHero, dividerLook, C };

  const sections: SectionKind[] = ['hero', 'story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq'];
  const navLinks = sections.filter((s) => s !== 'hero' && s !== 'rsvp').map((s) => SECTION_LABEL[s]);
  const headline = `${C.subject.a} & ${C.subject.b}`;

  const rootStyle: CSSProperties = {
    ...themeRootStyle(theme, density),
    position: 'relative',
    /* Decor color override → --t-motif scope var that the motif
       SVGs read for their fill (handoff L176). */
    ...(decor.color ? { ['--t-motif' as string]: `var(${decor.color})` } : {}),
  };

  const navEl = (
    <TSection id="nav" label="Site nav" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable} hideHandle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '15px 36px', fontSize: 12.5, color: 'var(--t-ink-soft)', borderBottom: '1px solid var(--t-line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={22} tone="sage" shadow={false} />
          <span style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 600, fontSize: 18, color: 'var(--t-ink)' }}>
            {headline}
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 20, opacity: 0.85, fontWeight: 500 }}>
          {navLinks.map((l) => <span key={l}>{l}</span>)}
        </div>
        <TButton variant="primary" style={{ padding: '7px 16px', fontSize: 12 }}>{C.cta}</TButton>
      </div>
    </TSection>
  );

  const sectionEl = (kind: SectionKind) => (
    <TSection
      key={kind}
      id={kind}
      label={SECTION_LABEL[kind]}
      active={active}
      hover={hover}
      setActive={setActive}
      setHover={setHover}
      editable={editable}
    >
      {renderKind(kind, ctx)}
    </TSection>
  );

  const kitId = ((manifest as unknown as { kitId?: string }).kitId) ?? 'classic';

  /* siteLayout — Classic stacked (default) / Invitation boxed
     (a card on a tinted mat) / Split sticky-sidebar lockup.
     Handoff themed-site.jsx L181-217 verbatim. */
  if (siteLayout === 'split') {
    return (
      <div onMouseLeave={() => setHover(null)} style={rootStyle} data-pl-texture={theme.texture} data-pl-kit={kitId} className="pl8-guest">
        <TextureFilters />
        {decor.pattern && decor.pattern !== 'none' && <PatternLayer pattern={decor.pattern} intensity={1} />}
        <TextureLayer texture={textureIntensity > 0 ? theme.texture : 'none'} intensity={textureIntensity} />
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(290px, 35%) 1fr', alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
            <SidebarHero
              ctx={ctx}
              headline={headline}
              navLinks={navLinks}
              active={active}
              hover={hover}
              setActive={setActive}
              setHover={setHover}
              editable={editable}
            />
          </div>
          <div style={{ borderLeft: '1px solid var(--t-line-soft)' }}>
            {sections.filter((s) => s !== 'hero').map(sectionEl)}
          </div>
        </div>
      </div>
    );
  }

  if (siteLayout === 'boxed') {
    return (
      <div
        onMouseLeave={() => setHover(null)}
        style={{ ...rootStyle, background: 'color-mix(in oklab, var(--t-ink) 14%, var(--t-section))', padding: '40px 26px' }}
        data-pl-texture={theme.texture}
        data-pl-kit={kitId}
        className="pl8-guest"
      >
        <TextureFilters />
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            position: 'relative',
            background: 'var(--t-paper)',
            borderRadius: 'var(--t-radius-lg)',
            boxShadow: '0 40px 90px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.12)',
            border: '1px solid var(--t-line)',
            overflow: 'hidden',
          }}
        >
          {decor.pattern && decor.pattern !== 'none' && <PatternLayer pattern={decor.pattern} intensity={1} />}
          <TextureLayer texture={textureIntensity > 0 ? theme.texture : 'none'} intensity={textureIntensity} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {navEl}
            {sections.map(sectionEl)}
          </div>
        </div>
      </div>
    );
  }

  /* Classic stacked — default scroll. */
  return (
    <div onMouseLeave={() => setHover(null)} style={rootStyle} data-pl-texture={theme.texture} data-pl-kit={kitId} className="pl8-guest">
      <TextureFilters />
      {decor.pattern && decor.pattern !== 'none' && <PatternLayer pattern={decor.pattern} intensity={1} />}
      <TextureLayer texture={textureIntensity > 0 ? theme.texture : 'none'} intensity={textureIntensity} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {navEl}
        {sections.map(sectionEl)}
      </div>
    </div>
  );
}

/* SidebarHero — handoff L221-253 verbatim. The left lockup panel for
   the SPLIT layout. Hosts the eyebrow, names, divider, date/location,
   nav links, and RSVP CTA in a vertical column. */

function SidebarHero({
  ctx, headline, navLinks, active, hover, setActive, setHover, editable,
}: {
  ctx: SectionCtx;
  headline: string;
  navLinks: string[];
  active: SectionId;
  hover: SectionId;
  setActive: (id: SectionId) => void;
  setHover: (id: SectionId) => void;
  editable: boolean;
}) {
  void headline;
  const { theme, C, motif, motifsOn } = ctx;
  const isCouple = C.subject.type === 'couple';
  const isEditorial = theme.id === 'editorial';
  return (
    <TSection id="hero" label="Hero" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
      <div style={{ position: 'relative', minHeight: 520, background: 'var(--t-section)', padding: '44px 36px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
        {motifsOn && <MotifScatter motif={motif} density="generous" />}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Pear size={24} tone="sage" shadow={false} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-ink-soft)' }}>
            Pearloom
          </span>
        </div>
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          {C.lead && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>
              {C.lead}
            </div>
          )}
          <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 46, lineHeight: 1.0, margin: 0, letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>
            {isCouple ? (
              <>
                {C.subject.a}
                <span style={{ display: 'block', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.7em', fontWeight: 400, color: 'var(--t-ink-soft)' }}>
                  {isEditorial ? '×' : 'and'}
                </span>
                {C.subject.b}
              </>
            ) : null}
          </h1>
          {C.tagline && (
            <div style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 17, color: 'var(--t-ink-soft)', marginTop: 12 }}>
              {C.tagline}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', marginTop: 4 }}>
          <KDivider look={ctx.dividerLook} width={150} style={{ marginLeft: 0 }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, color: 'var(--t-ink-soft)' }}>
          {C.meta.date && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="calendar" size={14} color="var(--t-accent)" /> {C.meta.date}
            </span>
          )}
          {C.meta.place && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="pin" size={14} color="var(--t-accent)" /> {C.meta.place}
            </span>
          )}
        </div>
        <nav style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12.5, fontWeight: 500, color: 'var(--t-ink-soft)' }}>
          {navLinks.map((l) => <span key={l}>{l}</span>)}
        </nav>
        <div style={{ position: 'relative' }}>
          <TButton variant="primary">
            {C.cta} <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
        </div>
      </div>
    </TSection>
  );
}

/* ─── Section renderer dispatch — handoff L141-153 verbatim. ─── */

function renderKind(kind: SectionKind, ctx: SectionCtx): ReactNode {
  switch (kind) {
    case 'hero':     return <HeroBlock ctx={ctx} />;
    case 'story':    return <StoryBlock ctx={ctx} />;
    case 'details':  return <DetailsBlock ctx={ctx} />;
    case 'schedule': return <ScheduleBlock ctx={ctx} />;
    case 'travel':   return <TravelBlock ctx={ctx} />;
    case 'registry': return <RegistryBlock ctx={ctx} />;
    case 'gallery':  return <GalleryBlock ctx={ctx} />;
    case 'rsvp':     return <RsvpBlock ctx={ctx} />;
    case 'faq':      return <FaqBlock ctx={ctx} />;
  }
}

/* ─── HeroBlock — handoff L256-363 centered variant verbatim. ── */

function HeroBlock({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, editable, C, motif, motifsOn, showWashHero } = ctx;
  void editable;
  const isEditorial = theme.id === 'editorial';
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: `${64 * pad}px 40px ${52 * pad}px`, background: 'var(--t-section)', overflow: 'hidden' }}>
      {showWashHero && (
        <WatercolorBloom
          size={520}
          tone="var(--t-accent-bg)"
          tone2="rgba(138,154,107,0.3)"
          style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', opacity: 0.7, pointerEvents: 'none' }}
        />
      )}
      {motifsOn && <MotifScatter motif={motif} density="generous" />}
      <div style={{ position: 'relative', marginInline: 'auto' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }}>
          {C.lead}
        </div>
        {C.tagline && (
          <div style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', fontWeight: isEditorial ? 600 : 400, marginTop: 8 }}>
            {C.tagline}
          </div>
        )}
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(74px * var(--t-hero-scale))', lineHeight: 0.96, margin: '12px 0 0', letterSpacing: isEditorial ? '-0.045em' : '-0.02em', color: 'var(--t-ink)' }}>
          {C.subject.a}
          <span style={{ fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 }}>
            {isEditorial ? '×' : 'and'}
          </span>
          {C.subject.b}
        </h1>
        <div style={{ marginTop: 18, display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="calendar" size={14} color="var(--t-accent)" /> {C.meta.date}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="pin" size={14} color="var(--t-accent)" /> {C.meta.place}
          </span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <KDivider look={ctx.dividerLook} width={200} />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <TButton variant="primary">
            {C.cta} <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
          <TButton variant="outline">Learn more</TButton>
        </div>
        <HeroPhotos />
      </div>
    </div>
  );
}

/* HeroPhotos — handoff L601-616 style: 4 large 3:4 cards. */
function HeroPhotos() {
  return (
    <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 940, marginInline: 'auto' }}>
      {(['warm', 'lavender', 'peach', 'sage'] as PhotoTone[]).map((t, i) => (
        <div key={i} style={{ aspectRatio: '3 / 4', borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' }}>
          <PhotoPlaceholder tone={t} aspect="3/4" />
        </div>
      ))}
    </div>
  );
}

/* ─── StoryBlock — handoff L366-456 sidebyside default. ──────── */

function StoryBlock({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif } = ctx;
  void theme;
  return (
    <div style={{ position: 'relative', padding: `${48 * pad}px 72px`, display: 'grid', gridTemplateColumns: '0.85fr 1fr', gap: 44, alignItems: 'center', background: 'var(--t-paper)' }}>
      <div style={{ position: 'relative' }}>
        <PhotoPlaceholder tone="warm" aspect="4/5" />
        {motif !== 'none' && (
          <div style={{ position: 'absolute', bottom: -18, right: -14, zIndex: 2 }} aria-hidden>
            <Motif kind={motif} size={70} />
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>
          {C.story.eyebrow}
        </div>
        <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
          {C.story.title}
          {C.story.italic && (
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {C.story.italic}</span>
          )}
        </h2>
        <p style={{ marginTop: 16, fontSize: 15, color: 'var(--t-ink-soft)', lineHeight: 1.65 }}>
          {C.story.body}
        </p>
        {C.story.chips && C.story.chips.length > 0 && (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {C.story.chips.map((c, i) => (
              <span key={i} style={{ padding: '6px 13px', borderRadius: 999, background: 'var(--t-accent-bg)', color: 'var(--t-accent-ink)', fontSize: 12, fontWeight: 600 }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── DetailsBlock — handoff L459-508 tiles default. ─────────── */

function DetailsBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, motif } = ctx;
  return (
    <div style={{ position: 'relative', padding: `${44 * pad}px 40px`, background: 'var(--t-section)' }}>
      <MotifScatter motif={motif} density="sparse" />
      <TSectionHead eyebrow={C.details.eyebrow} title={C.details.title} italic={C.details.italic} />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, maxWidth: 760, marginInline: 'auto' }}>
        {C.details.items.map((d) => (
          <div key={d.l} style={{ background: 'var(--t-card)', borderRadius: 'var(--t-radius)', padding: 18, border: '1px solid var(--t-line-soft)' }}>
            <Icon name={d.icon} size={18} color="var(--t-gold)" />
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 10, marginBottom: 4 }}>
              {d.l}
            </div>
            <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18, color: 'var(--t-ink)' }}>
              {d.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ScheduleBlock — handoff L511-565 cards default. ────────── */

function ScheduleBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, background: 'var(--t-paper)' }}>
      <TSectionHead eyebrow={C.schedule.eyebrow} title={C.schedule.title} italic={C.schedule.italic} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 880, marginInline: 'auto' }}>
        {C.schedule.rows.map((r, i) => (
          <div key={i} className="pl8-schedule-row" style={{ padding: 16, background: 'var(--t-card)', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line-soft)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20, color: 'var(--t-ink)' }}>
              {r.t}
            </div>
            <div style={{ fontSize: 13, color: 'var(--t-ink)', marginTop: 4, fontWeight: 600 }}>{r.l}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 2 }}>{r.s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TravelBlock — handoff L572-647 rows default. ───────────── */

function TravelBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, motif } = ctx;
  return (
    <div style={{ position: 'relative', padding: `${48 * pad}px 40px`, background: 'var(--t-section)' }}>
      <MotifScatter motif={motif} density="sparse" />
      <TSectionHead eyebrow={C.travel.eyebrow} title={C.travel.title} italic={C.travel.italic} />
      <div style={{ position: 'relative', maxWidth: 820, marginInline: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {C.travel.hotels.map((h, i) => (
            <div key={i} className="pl8-hotel-row" style={{ background: 'var(--t-card)', borderRadius: 'var(--t-radius-lg)', overflow: 'hidden', border: '1px solid var(--t-line-soft)', boxShadow: 'var(--t-shadow)' }}>
              <div style={{ aspectRatio: '16/9' }}>
                <PhotoPlaceholder tone={h.tone} aspect="16/9" />
              </div>
              <div style={{ padding: 15 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20, color: 'var(--t-ink)' }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--t-ink-muted)', fontWeight: 600 }}>{h.price}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: 12.5, color: 'var(--t-ink-soft)' }}>
                  <Stars r={h.rating} /> <b style={{ color: 'var(--t-ink)' }}>{h.rating}</b>
                  <span style={{ color: 'var(--t-ink-muted)' }}>({h.reviews})</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t-ink-muted)' }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon name="pin" size={11} color="var(--t-accent)" /> {h.dist}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--t-ink-soft)', lineHeight: 1.5, margin: '9px 0 11px' }}>
                  {h.blurb}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {h.amenities.map((a) => (
                    <span key={a} style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-accent-ink)', background: 'var(--t-accent-bg)', padding: '4px 9px', borderRadius: 999 }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── RegistryBlock — handoff L651-712 cards default. ────────── */

function RegistryBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}>
      <TSectionHead eyebrow={C.registry.eyebrow} title={C.registry.title} italic={C.registry.italic} />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.registry.body}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {C.registry.stores.map((s) => (
          <span key={s} style={{ padding: '12px 22px', borderRadius: 'var(--t-radius)', background: 'var(--t-card)', border: '1px solid var(--t-line)', fontSize: 13, fontWeight: 600, color: 'var(--t-ink)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {s} <Icon name="arrow-ur" size={12} color="var(--t-accent-ink)" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── GalleryBlock — handoff grid variant. ───────────────────── */

function GalleryBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${36 * pad}px 32px`, background: 'var(--t-section)' }}>
      <TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 920, marginInline: 'auto' }}>
        {C.gallery.tones.map((t, i) => (
          <PhotoPlaceholder key={i} tone={t} aspect="1/1" style={{ borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

/* ─── RsvpBlock — handoff centered (dark inverse). ───────────── */

function RsvpBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${56 * pad}px 32px`, textAlign: 'center', background: 'var(--t-rsvp)', color: 'var(--t-rsvp-ink)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8, color: 'var(--t-rsvp-ink)' }}>
        {C.rsvp.eyebrow}
      </div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 44, margin: '8px 0 6px', color: 'var(--t-rsvp-ink)' }}>
        {C.rsvp.title}
      </h2>
      <div style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 18, color: 'var(--t-rsvp-ink)' }}>
        {C.rsvp.body}
      </div>
      <span style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: 'var(--t-rsvp-ink)', color: 'var(--t-rsvp)', fontSize: 14, fontWeight: 700 }}>
        {C.cta} →
      </span>
    </div>
  );
}

/* ─── FaqBlock — handoff accordion default. ──────────────────── */

function FaqBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${48 * pad}px 32px`, background: 'var(--t-paper)' }}>
      <TSectionHead eyebrow={C.faq.eyebrow} title={C.faq.title} italic={C.faq.italic} />
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {C.faq.questions.map((q, i) => (
          <div key={i} className="pl8-faq-row" style={{ padding: '12px 16px', background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 'var(--t-radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, color: 'var(--t-ink)' }}>{q}</span>
            <Icon name="chev-down" size={13} color="var(--t-ink-muted)" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TSectionHead — handoff L75-87 verbatim. ────────────────── */

function TSectionHead({ eyebrow, title, italic }: { eyebrow: string; title: string; italic?: string }) {
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

/* ─── TSection — handoff L29-56 verbatim (selection chrome). ── */

function TSection({ id, label, children, active, hover, setActive, setHover, editable, hideHandle }: {
  id: Exclude<SectionId, null>;
  label: string;
  children: ReactNode;
  active: SectionId;
  hover: SectionId;
  setActive: (id: SectionId) => void;
  setHover: (id: SectionId) => void;
  editable: boolean;
  hideHandle?: boolean;
}) {
  const isActive = active === id;
  const isHover = hover === id && !isActive;
  return (
    <div
      onMouseEnter={() => setHover(id)}
      onClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        setActive(id);
      }}
      style={{ position: 'relative', cursor: editable ? 'pointer' : 'default' }}
    >
      {children}
      {editable && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 4, borderRadius: 6,
              outline: isActive ? '2px solid var(--lavender-2)' : isHover ? '1.5px dashed var(--lavender-2)' : 'none',
              outlineOffset: -2, pointerEvents: 'none', zIndex: 4,
              transition: 'outline 180ms cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          {(isActive || isHover) && !hideHandle && (
            <div style={{
              position: 'absolute', top: 8, left: 12, padding: '4px 10px', borderRadius: 6,
              background: isActive ? 'var(--lavender-2)' : 'rgba(196,181,217,0.85)',
              color: '#3D4A1F',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 6, zIndex: 5,
              boxShadow: isActive ? '0 4px 12px rgba(61,74,31,0.15)' : 'none',
              fontFamily: 'Inter, sans-serif',
            }}>
              {label}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── TButton — handoff/shared/themes.jsx variants. ─────────── */

function TButton({ variant = 'primary', children, style }: { variant?: 'primary' | 'outline' | 'link'; children: ReactNode; style?: CSSProperties }) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 22px', borderRadius: 999,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 0, transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
    fontFamily: 'inherit',
  };
  if (variant === 'primary') {
    return (
      <span style={{ ...base, background: 'var(--t-ink)', color: 'var(--t-paper)', ...style }}>
        {children}
      </span>
    );
  }
  if (variant === 'outline') {
    return (
      <span style={{ ...base, background: 'transparent', color: 'var(--t-ink)', border: '1px solid var(--t-line)', ...style }}>
        {children}
      </span>
    );
  }
  return (
    <span style={{ ...base, background: 'transparent', color: 'var(--t-accent-ink)', padding: '10px 0', ...style }}>
      {children}
    </span>
  );
}

/* ─── KDivider — handoff/shared/kits.jsx divider variants. ──── */

function KDivider({ look, width = 170, style = {} }: { look: string; width?: number; style?: CSSProperties }) {
  const wrap: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '0 auto', width, ...style };
  if (look === 'sprig') {
    return (
      <div style={wrap}>
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
        <Motif kind="olive" size={16} />
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
      </div>
    );
  }
  if (look === 'brush') {
    return (
      <div style={wrap}>
        <div style={{ width, height: 4, background: 'var(--t-accent)', borderRadius: 2, opacity: 0.6, transform: 'skewX(-12deg)' }} />
      </div>
    );
  }
  if (look === 'dot') {
    return (
      <div style={wrap}>
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)' }} />
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
      </div>
    );
  }
  if (look === 'deckle') {
    return (
      <div style={wrap}>
        <svg width={width} height="6" viewBox={`0 0 ${width} 6`} aria-hidden>
          <path d={`M0 3 ${Array.from({ length: 14 }).map((_, i) => `L${(i * width) / 14 + width / 28} ${i % 2 ? 5 : 1}`).join(' ')} L${width} 3`} stroke="var(--t-line)" strokeWidth="1" fill="none" />
        </svg>
      </div>
    );
  }
  /* rule (default) */
  return (
    <div style={wrap}>
      <div style={{ width, height: 1, background: 'var(--t-line)' }} />
    </div>
  );
}

/* ─── Stars (Travel ratings). ───────────────────────────────── */

function Stars({ r }: { r: number }) {
  const full = Math.round(r);
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={12} color={i <= full ? 'var(--t-gold)' : 'var(--t-line)'} />
      ))}
    </span>
  );
}

/* ─── PhotoPlaceholder — gradient stand-in for image-slot. ─── */

type PhotoTone = 'lavender' | 'peach' | 'sage' | 'cream' | 'warm' | 'field' | 'dusk';

const PHOTO_BGS: Record<PhotoTone, string> = {
  lavender: 'linear-gradient(135deg, #D7CCE5, #B7A4D0)',
  peach: 'linear-gradient(135deg, #F7DDC2, #EAB286)',
  sage: 'linear-gradient(135deg, #E3E6C8, #8B9C5A)',
  cream: 'linear-gradient(135deg, #F3E9D4, #E0D3B3)',
  warm: 'linear-gradient(135deg, #F0C9A8, #C4B5D9)',
  field: 'linear-gradient(160deg, #CBD29E 0%, #8B9C5A 55%, #F0C9A8 100%)',
  dusk: 'linear-gradient(200deg, #C4B5D9 0%, #F0C9A8 70%, #CBD29E 100%)',
};

function PhotoPlaceholder({ tone = 'lavender', aspect = '1 / 1', style = {} }: { tone?: PhotoTone; aspect?: string; style?: CSSProperties }) {
  return (
    <div style={{ width: '100%', aspectRatio: aspect, background: PHOTO_BGS[tone] ?? PHOTO_BGS.lavender, ...style }} />
  );
}

/* ─── Date formatter. ───────────────────────────────────────── */

function formatHeroDate(raw: string | undefined): string {
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ─── Copy / data — pulls from manifest with prototype fallbacks. ─── */

type SectionKind = 'hero' | 'story' | 'details' | 'schedule' | 'travel' | 'registry' | 'gallery' | 'rsvp' | 'faq';

const SECTION_LABEL: Record<SectionKind, string> = {
  hero: 'Hero', story: 'Our story', details: 'Details', schedule: 'Schedule',
  travel: 'Travel', registry: 'Registry', gallery: 'Gallery', rsvp: 'RSVP', faq: 'FAQ',
};

interface SectionCtx {
  theme: Theme;
  pad: number;
  editable: boolean;
  motif: MotifKind;
  motifsOn: boolean;
  textureIntensity: number;
  showWashHero: boolean;
  /** Decor Library divider override OR theme.look.divider fallback. */
  dividerLook: string;
  C: Copy;
}

interface Copy {
  subject: { type: 'couple'; a: string; b: string };
  lead: string;
  tagline: string;
  cta: string;
  meta: { date: string; place: string };
  story: { eyebrow: string; title: string; italic?: string; body: string; chips?: string[] };
  details: { eyebrow: string; title: string; italic?: string; items: { l: string; v: string; icon: string }[] };
  schedule: { eyebrow: string; title: string; italic?: string; rows: { t: string; l: string; s: string }[] };
  travel: { eyebrow: string; title: string; italic?: string; hotels: { name: string; price: string; rating: number; reviews: number; dist: string; tone: PhotoTone; blurb: string; amenities: string[] }[] };
  registry: { eyebrow: string; title: string; italic?: string; body: string; stores: string[] };
  gallery: { eyebrow: string; title: string; italic?: string; tones: PhotoTone[] };
  rsvp: { eyebrow: string; title: string; body: string };
  faq: { eyebrow: string; title: string; italic?: string; questions: string[] };
}

/* ─── TextureLayer — handoff/shared/themes.jsx L239-351 verbatim.
       Per-theme material grain painted on top of content (zIndex 6).
       Uses SVG filter ids from TextureFilters (t-weave / t-grain /
       t-mottle / t-wash). */

function TextureLayer({ texture, intensity = 1 }: { texture: string; intensity?: number }) {
  if (!texture || texture === 'none') return null;
  const base: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 };

  if (texture === 'linen') {
    return (
      <div aria-hidden style={base}>
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.5 * intensity,
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 2px)`,
          backgroundSize: '2px 2px, 2px 2px',
        }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.4 * intensity, mixBlendMode: 'soft-light' }} />
      </div>
    );
  }
  if (texture === 'paper') {
    return (
      <div aria-hidden style={base}>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.3 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.16 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.1 * intensity, mixBlendMode: 'multiply' }} />
      </div>
    );
  }
  if (texture === 'cotton') {
    return (
      <div aria-hidden style={base}>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.34 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.42 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.16 * intensity, mixBlendMode: 'multiply' }} />
      </div>
    );
  }
  if (texture === 'velvet') {
    return (
      <div aria-hidden style={base}>
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.6 * intensity,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 3px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.16 * intensity,
          background: 'linear-gradient(118deg, transparent 28%, rgba(255,255,255,0.12) 50%, transparent 72%)',
        }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.3 * intensity, mixBlendMode: 'soft-light' }} />
      </div>
    );
  }
  if (texture === 'watercolor') {
    return (
      <div aria-hidden style={{ ...base, overflow: 'hidden' }}>
        <WatercolorWash tone="rgba(194,105,62,0.30)" style={{ top: '-6%', left: '-12%', width: 720, height: 580, mixBlendMode: 'multiply' }} seed={0} opacity={0.7 * intensity} />
        <WatercolorWash tone="rgba(138,154,107,0.34)" style={{ top: '30%', right: '-14%', width: 640, height: 540, mixBlendMode: 'multiply' }} seed={1} opacity={0.7 * intensity} />
        <WatercolorWash tone="rgba(217,154,106,0.30)" style={{ bottom: '-8%', left: '24%', width: 600, height: 500, mixBlendMode: 'multiply' }} seed={2} opacity={0.6 * intensity} />
        <WatercolorWash tone="rgba(201,154,78,0.26)" style={{ top: '52%', left: '-8%', width: 460, height: 420, mixBlendMode: 'multiply' }} seed={1} opacity={0.55 * intensity} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.2 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.08 * intensity, mixBlendMode: 'multiply' }} />
      </div>
    );
  }
  if (texture === 'kraft') {
    return (
      <div aria-hidden style={base}>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.28 * intensity, mixBlendMode: 'multiply' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.3 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.2 * intensity, mixBlendMode: 'multiply' }} />
      </div>
    );
  }
  if (texture === 'canvas') {
    return (
      <div aria-hidden style={base}>
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.55 * intensity,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px)',
          backgroundSize: '3px 3px, 3px 3px',
        }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.35 * intensity, mixBlendMode: 'soft-light' }} />
      </div>
    );
  }
  if (texture === 'marble') {
    return (
      <div aria-hidden style={{ ...base, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: '-20%', filter: 'url(#t-wash)', opacity: 0.5 * intensity, mixBlendMode: 'multiply',
          background: 'repeating-linear-gradient(58deg, transparent 0 26px, color-mix(in oklab, var(--t-ink) 12%, transparent) 26px 27px, transparent 27px 62px), radial-gradient(42% 30% at 30% 24%, color-mix(in oklab, var(--t-ink) 9%, transparent), transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: '-20%', filter: 'url(#t-watercolor)', opacity: 0.4 * intensity, mixBlendMode: 'soft-light',
          background: 'repeating-linear-gradient(58deg, transparent 0 46px, rgba(255,255,255,0.55) 46px 48px, transparent 48px 94px)',
        }} />
      </div>
    );
  }
  if (texture === 'gilded') {
    return (
      <div aria-hidden style={base}>
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.5 * intensity,
          background: 'linear-gradient(120deg, transparent 22%, color-mix(in oklab, var(--t-gold) 62%, transparent) 48%, transparent 64%)',
        }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.18 * intensity, mixBlendMode: 'soft-light' }} />
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.12 * intensity, mixBlendMode: 'multiply' }} />
      </div>
    );
  }
  return null;
}

function WatercolorWash({ tone = 'var(--t-accent-bg)', style = {}, seed = 0, opacity = 0.6 }: { tone?: string; style?: CSSProperties; seed?: number; opacity?: number }) {
  return (
    <div aria-hidden style={{ position: 'absolute', opacity, ...style }}>
      <div style={{
        position: 'absolute', inset: 0,
        filter: 'url(#t-wash)',
        background: `radial-gradient(60% 55% at ${40 + seed * 12}% ${44 - seed * 8}%, ${tone} 0%, transparent 70%), radial-gradient(50% 60% at ${64 - seed * 10}% ${60 + seed * 6}%, ${tone} 0%, transparent 72%)`,
      }} />
    </div>
  );
}

/* ─── PatternLayer — handoff/shared/themes.jsx L360-385 verbatim.
       Decorative print BEHIND content (zIndex 0). Tinted from the
       theme's own accent/gold via color-mix. */

function PatternLayer({ pattern, intensity = 1 }: { pattern: string; intensity?: number }) {
  if (!pattern || pattern === 'none') return null;
  const k = intensity;
  const a = (p: number) => `color-mix(in oklab, var(--t-accent) ${p * k}%, transparent)`;
  const a2 = (p: number) => `color-mix(in oklab, var(--t-accent-2) ${p * k}%, transparent)`;
  const g = (p: number) => `color-mix(in oklab, var(--t-gold) ${p * k}%, transparent)`;
  const ink = (p: number) => `color-mix(in oklab, var(--t-ink) ${p * k}%, transparent)`;
  const base: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 };
  let bg: string | null = null;
  let size: string = 'auto';
  let extra: CSSProperties = {};
  switch (pattern) {
    case 'gingham':  bg = `repeating-linear-gradient(0deg, ${a(13)} 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, ${a(13)} 0 14px, transparent 14px 28px)`; break;
    case 'stripe':   bg = `repeating-linear-gradient(90deg, ${a(12)} 0 10px, transparent 10px 22px)`; break;
    case 'cabana':   bg = `repeating-linear-gradient(90deg, ${a(15)} 0 28px, transparent 28px 56px)`; break;
    case 'diagonal': bg = `repeating-linear-gradient(45deg, ${a(11)} 0 12px, transparent 12px 26px)`; break;
    case 'dots':     bg = `radial-gradient(${a(22)} 22%, transparent 24%)`; size = '20px 20px'; break;
    case 'grid':     bg = `repeating-linear-gradient(0deg, var(--t-line) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, var(--t-line) 0 1px, transparent 1px 26px)`; break;
    case 'deco':     bg = `repeating-linear-gradient(135deg, ${a(13)} 0 14px, transparent 14px 28px, ${g(13)} 28px 42px, transparent 42px 56px)`; break;
    case 'scallop':  bg = `radial-gradient(circle at 50% 0, transparent 11px, ${a(13)} 12px 13px, transparent 14px)`; size = '30px 30px'; break;
    case 'wave':     bg = `radial-gradient(circle at 50% 100%, transparent 13px, ${a(12)} 14px 15px, transparent 16px)`; size = '34px 17px'; break;
    case 'confetti': bg = `radial-gradient(${a(42)} 30%, transparent 32%), radial-gradient(${a2(42)} 30%, transparent 32%), radial-gradient(${g(42)} 30%, transparent 32%)`; size = '46px 46px, 62px 62px, 38px 38px'; extra = { backgroundPosition: '0 0, 18px 24px, 32px 8px' }; break;
    case 'terrazzo': bg = `radial-gradient(${a(34)} 18%, transparent 20%), radial-gradient(${a2(30)} 16%, transparent 18%), radial-gradient(${g(30)} 14%, transparent 16%), radial-gradient(${ink(12)} 12%, transparent 14%)`; size = '52px 52px, 72px 72px, 44px 44px, 90px 90px'; extra = { backgroundPosition: '0 0, 26px 30px, 40px 12px, 60px 50px' }; break;
    case 'celestial':bg = `radial-gradient(${g(75)} 6%, transparent 8%), radial-gradient(rgba(255,255,255,0.65) 5%, transparent 7%), radial-gradient(rgba(255,255,255,0.4) 4%, transparent 6%)`; size = '88px 88px, 118px 118px, 152px 152px'; extra = { backgroundPosition: '0 0, 34px 48px, 86px 24px' }; break;
    default: return null;
  }
  return <div aria-hidden style={{ ...base, backgroundImage: bg, backgroundSize: size, ...extra }} />;
}

/* Voice copy registry — each voice picks the eyebrow/tagline/story
   tone. Matches handoff site-config.jsx COPY map at the field level
   (we focus on hero + story + rsvp where voice is most visible). */
const VOICE_COPY = {
  classic: {
    lead: 'Save the date',
    tagline: 'together, at last',
    storyEyebrow: 'Our story',
    storyTitle: 'How we',
    storyItalic: 'met',
    rsvpTitle: 'Save your seat',
  },
  playful: {
    lead: "It's happening",
    tagline: 'finally putting a ring on it',
    storyEyebrow: 'How we got here',
    storyTitle: 'The (long)',
    storyItalic: 'short of it',
    rsvpTitle: 'Get in here',
  },
  poetic: {
    lead: 'A small forever',
    tagline: 'of all the days, this one',
    storyEyebrow: 'Two threads, one weave',
    storyTitle: 'Where we',
    storyItalic: 'began',
    rsvpTitle: 'Hold this day with us',
  },
} as const;

function buildCopy(theme: Theme, manifest: StoryManifest, args: { nameA: string; nameB: string; date: string; place: string }): Copy {
  void theme;
  /* Loose-typed reads — the right-rail panels write to a wider
     manifest shape than StoryManifest officially declares (tagline,
     storySection, detailsCards, registryIntro, registryStores,
     rsvpDeadline, etc. — every one a field a section panel writes). */
  const loose = manifest as unknown as Record<string, unknown>;
  const storySection = (loose.storySection as { headline?: string; body?: string; chips?: string[] } | undefined) ?? {};
  const galleryTones = (loose.galleryTones as PhotoTone[] | undefined);
  const detailsCards = (loose.detailsCards as Array<[string, string]> | undefined) ?? [];
  const eventsRaw = (loose.events as Array<{ time?: string; name?: string; venue?: string; description?: string }> | undefined) ?? [];
  const faqsRaw = (loose.faqs as Array<{ question?: string }> | undefined) ?? [];
  const registryStoresRaw = (loose.registryStores as string[] | undefined);
  const registryIntro = (loose.registryIntro as string | undefined);
  const rsvpDeadline = (loose.rsvpDeadline as string | undefined);
  const tagline = (loose.tagline as string | undefined);
  const occasion = (loose.occasion as string | undefined) ?? 'wedding';
  const voiceKey = ((loose.voiceOverride as string | undefined) ?? 'classic') as keyof typeof VOICE_COPY;
  const V = VOICE_COPY[voiceKey] ?? VOICE_COPY.classic;

  const occasionDate = formatHeroDate(rsvpDeadline) || args.date;
  const isWedding = occasion === 'wedding';

  return {
    subject: { type: 'couple', a: args.nameA, b: args.nameB },
    lead: V.lead,
    tagline: tagline || V.tagline,
    cta: 'RSVP',
    meta: { date: args.date, place: args.place },
    story: {
      eyebrow: V.storyEyebrow,
      title: storySection.headline ? splitHeading(storySection.headline).head : V.storyTitle,
      italic: storySection.headline ? splitHeading(storySection.headline).italic : V.storyItalic,
      body: storySection.body || 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.',
      chips: Array.isArray(storySection.chips) ? storySection.chips : undefined,
    },
    details: {
      eyebrow: 'The fine print',
      title: 'Everything you',
      italic: 'should know',
      items: detailsCards.length > 0
        ? detailsCards.slice(0, 3).map(([l, v], i) => ({
            l: l ?? '',
            v: v ?? '',
            icon: ['sparkles', 'users', 'gift'][i] ?? 'sparkles',
          }))
        : [
            { l: 'Dress code', v: 'Garden formal', icon: 'sparkles' },
            { l: 'Kids welcome', v: 'Ages 10 +', icon: 'users' },
            { l: 'Gifts', v: 'Your presence is enough', icon: 'gift' },
          ],
    },
    schedule: {
      eyebrow: 'The day',
      title: 'In',
      italic: 'moments',
      rows: eventsRaw.length > 0
        ? eventsRaw.slice(0, 4).map((e) => ({
            t: e.time ?? '',
            l: e.name ?? '',
            s: e.venue ?? e.description ?? '',
          }))
        : [
            { t: '4:30 pm', l: 'Ceremony', s: 'Olive grove' },
            { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
            { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
            { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
          ],
    },
    travel: {
      eyebrow: 'Getting there',
      title: 'Where to',
      italic: 'stay',
      hotels: [
        { name: 'Cosmos Suites', price: '$$$', rating: 4.8, reviews: 412, dist: '8-min walk', tone: 'warm', blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.', amenities: ['Caldera view', 'Pool', 'Breakfast'] },
        { name: 'Andronis Boutique', price: '$$$$', rating: 4.9, reviews: 286, dist: '12-min walk', tone: 'lavender', blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.', amenities: ['Spa', 'Infinity pool', 'Fine dining'] },
      ],
    },
    registry: {
      eyebrow: 'Registry',
      title: 'Your presence is',
      italic: 'the gift',
      body: registryIntro || "If you'd like to celebrate further, we've put a few things together.",
      stores: registryStoresRaw && registryStoresRaw.length > 0
        ? registryStoresRaw.slice(0, 6)
        : ['Honeymoon fund', 'Crate & Barrel', 'Zola'],
    },
    gallery: {
      eyebrow: 'Gallery',
      title: 'A few',
      italic: 'favorites',
      tones: galleryTones && galleryTones.length > 0
        ? galleryTones
        : (['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream', 'warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'] as PhotoTone[]),
    },
    rsvp: {
      eyebrow: rsvpDeadline ? `RSVP by ${formatHeroDate(rsvpDeadline) || rsvpDeadline}` : 'RSVP by April 28',
      title: isWedding ? V.rsvpTitle : 'Reply by the date',
      body: 'It takes about 90 seconds. Pear will follow up if anyone forgets.',
    },
    faq: {
      eyebrow: 'Questions & answers',
      title: 'The',
      italic: 'little things',
      questions: faqsRaw.length > 0
        ? faqsRaw.slice(0, 6).map((q) => q.question ?? '').filter(Boolean)
        : [
            "What's the dress code, really?",
            'Can I bring a plus-one?',
            'Are kids welcome at the ceremony?',
            'Where should I stay in Santorini?',
          ],
    },
  };
}

/* Story headline ("How we met") into ["How we", "met"] so the
   italic accent word reads like the handoff. Falls through to the
   whole heading when no obvious split point exists. */
function splitHeading(s: string): { head: string; italic: string } {
  const parts = s.trim().split(/\s+/);
  if (parts.length <= 1) return { head: s, italic: '' };
  const italic = parts.pop() ?? '';
  return { head: parts.join(' '), italic };
}
