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

  const nameA = names[0] || 'Scott';
  const nameB = names[1] || 'Shauna';
  const rawDate = (manifest as unknown as { logistics?: { date?: string } }).logistics?.date;
  const date = formatHeroDate(rawDate) || 'Monday, April 26, 2027';
  const venue = (manifest as unknown as { logistics?: { venue?: string } }).logistics?.venue || 'Casa Chorro';
  const place = (manifest as unknown as { logistics?: { place?: string } }).logistics?.place || 'Santorini, Greece';

  const motif: MotifKind = !motifsOn ? 'none' : (theme.motif !== 'none' ? theme.motif : 'olive') as MotifKind;
  const pad = { cozy: 0.74, comfortable: 1, spacious: 1.32 }[density] || 1;
  const showWashHero = textureIntensity > 0 && theme.texture === 'watercolor';

  /* Section copy + content — pulls from manifest with prototype
     fallbacks. Keeps the renderer data-driven per handoff L141-153. */
  const C = buildCopy(theme, { nameA, nameB, date, place: `${venue} · ${place}` });
  const ctx: SectionCtx = { theme, pad, editable, motif, motifsOn, textureIntensity, showWashHero, C };

  const sections: SectionKind[] = ['hero', 'story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq'];
  const navLinks = sections.filter((s) => s !== 'hero' && s !== 'rsvp').map((s) => SECTION_LABEL[s]);
  const headline = `${C.subject.a} & ${C.subject.b}`;

  const rootStyle: CSSProperties = {
    ...themeRootStyle(theme, density),
    position: 'relative',
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

  return (
    <div onMouseLeave={() => setHover(null)} style={rootStyle} data-pl-texture={theme.texture}>
      <TextureFilters />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {navEl}
        {sections.map(sectionEl)}
      </div>
    </div>
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
          <KDivider look={theme.look.divider} width={200} />
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
          <div key={i} style={{ padding: 16, background: 'var(--t-card)', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line-soft)', textAlign: 'center' }}>
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
            <div key={i} style={{ background: 'var(--t-card)', borderRadius: 'var(--t-radius-lg)', overflow: 'hidden', border: '1px solid var(--t-line-soft)', boxShadow: 'var(--t-shadow)' }}>
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
        {(['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream', 'warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'] as PhotoTone[]).map((t, i) => (
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
          <div key={i} style={{ padding: '12px 16px', background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 'var(--t-radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  C: Copy;
}

interface Copy {
  subject: { type: 'couple'; a: string; b: string };
  lead: string;
  tagline: string;
  cta: string;
  meta: { date: string; place: string };
  story: { eyebrow: string; title: string; italic?: string; body: string };
  details: { eyebrow: string; title: string; italic?: string; items: { l: string; v: string; icon: string }[] };
  schedule: { eyebrow: string; title: string; italic?: string; rows: { t: string; l: string; s: string }[] };
  travel: { eyebrow: string; title: string; italic?: string; hotels: { name: string; price: string; rating: number; reviews: number; dist: string; tone: PhotoTone; blurb: string; amenities: string[] }[] };
  registry: { eyebrow: string; title: string; italic?: string; body: string; stores: string[] };
  gallery: { eyebrow: string; title: string; italic?: string };
  rsvp: { eyebrow: string; title: string; body: string };
  faq: { eyebrow: string; title: string; italic?: string; questions: string[] };
}

function buildCopy(theme: Theme, args: { nameA: string; nameB: string; date: string; place: string }): Copy {
  void theme;
  return {
    subject: { type: 'couple', a: args.nameA, b: args.nameB },
    lead: 'Save the date',
    tagline: 'together, at last',
    cta: 'RSVP',
    meta: { date: args.date, place: args.place },
    story: {
      eyebrow: 'Our story',
      title: 'How we',
      italic: 'met',
      body: 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.',
    },
    details: {
      eyebrow: 'The fine print',
      title: 'Everything you',
      italic: 'should know',
      items: [
        { l: 'Dress code', v: 'Garden formal', icon: 'sparkles' },
        { l: 'Kids welcome', v: 'Ages 10 +', icon: 'users' },
        { l: 'Gifts', v: 'Your presence is enough', icon: 'gift' },
      ],
    },
    schedule: {
      eyebrow: 'The day, April 26',
      title: 'In',
      italic: 'moments',
      rows: [
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
      body: "If you'd like to celebrate further, we've put a few things together.",
      stores: ['Honeyfund', 'Crate & Barrel', 'Zola'],
    },
    gallery: { eyebrow: 'Gallery', title: 'A few', italic: 'favorites' },
    rsvp: {
      eyebrow: 'RSVP by April 28',
      title: 'Save your seat',
      body: 'It takes about 90 seconds. Pear will follow up if anyone forgets.',
    },
    faq: {
      eyebrow: 'Questions & answers',
      title: 'The',
      italic: 'little things',
      questions: [
        "What's the dress code, really?",
        'Can I bring a plus-one?',
        'Are kids welcome at the ceremony?',
        'Where should I stay in Santorini?',
      ],
    },
  };
}
