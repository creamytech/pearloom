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
import { readVariant } from './layouts';
import type { SectionId } from './EditorRedesign';
import { InlineEdit } from './InlineEdit';
/* Per-section layout variants — each section block dispatches via
   ctx.variants.<section> to one of these. Default ('tiles', 'cards',
   'centered', 'accordion', 'grid', 'rows', 'sidebyside') stays
   baked into the block below. */
import { RsvpSplit, RsvpBanner, RsvpMinimal } from './section-variants/rsvp';
import { DetailsIconRow, DetailsAccordion, DetailsBento } from './section-variants/details';
import { ScheduleTimeline, ScheduleStepper, ScheduleNumbered } from './section-variants/schedule';
import { GalleryMasonry, GallerySlideshow, GalleryPolaroid } from './section-variants/gallery';
import { FaqTwocol, FaqNumbered, FaqCards } from './section-variants/faq';
import { TravelMap, TravelTable, TravelCarousel } from './section-variants/travel';
import { RegistryChips, RegistryProgress, RegistryLogoWall } from './section-variants/registry';
import { StoryZigzag } from './section-variants/story';
import {
  NavCentered,
  NavSplit,
  NavSerifBlock,
  NavMinimalText,
  NavIconic,
} from './section-variants/nav';
import {
  NavMobileOverlay,
  NavMobileSlideIn,
  NavMobileBottomSheet,
  NavMobilePill,
} from './section-variants/nav-mobile';
import { useIsMobile, useActiveSection } from './use-nav-hooks';

interface Props {
  /* Editor-only props — optional so PublishedSiteShell can mount
     this exact component in published mode without supplying any
     editor wiring. Defaults map to "nothing selected, nothing
     hovered, nothing editable". */
  active?: SectionId;
  hover?: SectionId;
  setActive?: (id: SectionId) => void;
  setHover?: (id: SectionId) => void;
  editable?: boolean;
  manifest: StoryManifest;
  names: [string, string];
  /* Editor "mobile preview" pill renders the canvas inside a
     390px-wide device frame on a desktop-width window. Without
     this signal, useIsMobile() reads the browser viewport (~1920px)
     and the canvas falls back to the desktop nav. Pass
     forceMobile={true} from EditorCanvas when mode === 'mobile' so
     the mobile drawer variants actually paint inside the device
     frame. Published guests don't pass this — useIsMobile() decides
     based on their real viewport. */
  forceMobile?: boolean;
  /* Round R inline-edit wiring — when set, click-to-edit text on
     the canvas (tagline / story / details values / etc) routes
     writes through the bridge's editField. PublishedSiteShell
     omits both so guests never see edit chrome. */
  onEditField?: (patch: (m: StoryManifest) => StoryManifest) => void;
  onEditNames?: (next: [string, string]) => void;
}

/* ─── Top-level shell — handoff themed-site.jsx L106-218. ────── */

const noop = () => {};

export function ThemedSite({
  active = null,
  hover = null,
  setActive = noop,
  setHover = noop,
  editable = false,
  manifest,
  names,
  forceMobile = false,
  onEditField,
  onEditNames,
}: Props) {
  /* Edit-write helpers for InlineEdit components. patchManifest
     writes a top-level (or nested via dot path) field; patchNames
     writes the names tuple. Both no-op when the editor hasn't
     supplied a write path (i.e. PublishedSiteShell mode). */
  const patchTagline = onEditField
    ? (next: string) => onEditField((m) => ({ ...(m as unknown as Record<string, unknown>), tagline: next } as unknown as StoryManifest))
    : undefined;
  /* Generic manifest.copy.<key> writer — used by every editable
     eyebrow / lead / CTA / button label on the canvas. Empty
     strings clear the override (so the default voice copy
     re-takes the slot). */
  const patchCopy = onEditField
    ? (key: string, next: string) => onEditField((m) => {
        const loose = m as unknown as Record<string, unknown>;
        const cur = (loose.copy as Record<string, string> | undefined) ?? {};
        const nextCopy: Record<string, string> = { ...cur };
        if (next.trim()) nextCopy[key] = next;
        else delete nextCopy[key];
        return { ...loose, copy: nextCopy } as unknown as StoryManifest;
      })
    : undefined;
  const patchStoryField = onEditField
    ? (field: 'headline' | 'body', next: string) => onEditField((m) => {
        const loose = m as unknown as Record<string, unknown>;
        const story = (loose.storySection as Record<string, unknown> | undefined) ?? {};
        return { ...loose, storySection: { ...story, [field]: next } } as unknown as StoryManifest;
      })
    : undefined;
  const patchDetailsCard = onEditField
    ? (idx: number, half: 'l' | 'v', next: string) => onEditField((m) => {
        const loose = m as unknown as Record<string, unknown>;
        const cards = Array.isArray(loose.detailsCards)
          ? [...(loose.detailsCards as Array<[string, string]>)]
          : [];
        const cur = cards[idx] ?? ['', ''];
        cards[idx] = half === 'l' ? [next, cur[1] ?? ''] : [cur[0] ?? '', next];
        return { ...loose, detailsCards: cards } as unknown as StoryManifest;
      })
    : undefined;
  const patchEvent = onEditField
    ? (idx: number, field: 'name' | 'time' | 'venue', next: string) => onEditField((m) => {
        const loose = m as unknown as Record<string, unknown>;
        const events = Array.isArray(loose.events) ? [...(loose.events as Array<Record<string, unknown>>)] : [];
        const cur = events[idx] ?? {};
        events[idx] = { ...cur, [field]: next };
        return { ...loose, events } as unknown as StoryManifest;
      })
    : undefined;
  const patchA = onEditNames ? (a: string) => onEditNames([a, names[1] ?? '']) : undefined;
  const patchB = onEditNames ? (b: string) => onEditNames([names[0] ?? '', b]) : undefined;
  const themeId = ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string } }).theme?.id);
  const theme = getTheme(themeId);
  /* When a Theme Store pack has been applied, manifest.themeVars
     carries the pack's full --t-* bag. We override theme.vars with
     it so the pack's palette / fonts / radii / shadows actually
     paint — without this override, getTheme() falls back to the
     default 'garden' theme whenever themeId is a pack id (e.g.
     'santorini-linen') instead of one of the 6 base theme ids. */
  const themeVarsOverride = (manifest as unknown as { themeVars?: Record<string, string> }).themeVars;
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
  /* Theme Store packs write manifest.texture to override the base
     theme's static texture. Reading here so every TextureLayer
     mount AND the watercolor-wash hero check pick up the pack
     override instead of staying stuck on the base theme's
     default. */
  const textureOverride = ((manifest as unknown as { texture?: string }).texture);
  const effectiveTexture = (typeof textureOverride === 'string' && textureOverride !== 'none' && textureOverride !== '')
    ? textureOverride
    : theme.texture;
  const showWashHero = textureIntensity > 0 && effectiveTexture === 'watercolor';

  /* Section copy + content — pulls from manifest with prototype
     fallbacks. Keeps the renderer data-driven per handoff L141-153. */
  const C = buildCopy(theme, manifest, { nameA, nameB, date, place: `${venue} · ${place}` });
  /* Per-section layout variants — manifest.layouts[section] overrides
     the per-section default. PropertyRail's Layout tab writes here. */
  const variants = {
    hero: readVariant(manifest, 'hero'),
    story: readVariant(manifest, 'story'),
    details: readVariant(manifest, 'details'),
    schedule: readVariant(manifest, 'schedule'),
    travel: readVariant(manifest, 'travel'),
    registry: readVariant(manifest, 'registry'),
    gallery: readVariant(manifest, 'gallery'),
    faq: readVariant(manifest, 'faq'),
    rsvp: readVariant(manifest, 'rsvp'),
  };
  const coverPhoto = ((manifest as unknown as { coverPhoto?: string }).coverPhoto) || undefined;
  const edit: SectionCtx['edit'] = onEditField || onEditNames ? {
    tagline: patchTagline,
    storyHeadline: patchStoryField ? (v) => patchStoryField('headline', v) : undefined,
    storyBody: patchStoryField ? (v) => patchStoryField('body', v) : undefined,
    detailsValue: patchDetailsCard ? (i, v) => patchDetailsCard(i, 'v', v) : undefined,
    detailsLabel: patchDetailsCard ? (i, v) => patchDetailsCard(i, 'l', v) : undefined,
    eventName: patchEvent ? (i, v) => patchEvent(i, 'name', v) : undefined,
    eventTime: patchEvent ? (i, v) => patchEvent(i, 'time', v) : undefined,
    eventVenue: patchEvent ? (i, v) => patchEvent(i, 'venue', v) : undefined,
    nameA: patchA,
    nameB: patchB,
    copy: patchCopy,
  } : undefined;
  const ctx: SectionCtx = { theme, pad, editable, motif, motifsOn, textureIntensity, showWashHero, dividerLook, variants, C, coverPhoto, edit };

  /* Hidden sections — host can hide any non-essential section via
     the "Hide on the site" toggle at the bottom of each panel.
     Stored as manifest.hiddenSections: SectionKind[]. The hero is
     never hidden (a site without a hero is broken). */
  const hidden = (((manifest as unknown as { hiddenSections?: string[] }).hiddenSections) ?? []) as SectionKind[];
  const sections: SectionKind[] = (['hero', 'story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq'] as SectionKind[])
    .filter((s) => s === 'hero' || !hidden.includes(s));
  /* navItems carry section id + label so the nav can render real
     anchors that scroll to the right block. Excludes 'hero' and
     'rsvp' from the link list (hero is the top of the page, rsvp
     gets its own dedicated CTA button). */
  const navItems = sections.filter((s) => s !== 'hero' && s !== 'rsvp').map((s) => ({ id: s, label: SECTION_LABEL[s] }));
  const headline = C.subject.type === 'solo' ? C.subject.a : `${C.subject.a} & ${C.subject.b}`;

  /* Smooth-scroll handler — every nav link + the RSVP CTA call this
     with a section id. Uses document.getElementById because the
     id={id} attribute now lives on every TSection's outer div. */
  const scrollToSection = (sectionId: string) => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const rootStyle: CSSProperties = {
    ...themeRootStyle(theme, density, themeVarsOverride ?? null),
    position: 'relative',
    /* Decor color override → --t-motif scope var that the motif
       SVGs read for their fill (handoff L176). */
    ...(decor.color ? { ['--t-motif' as string]: `var(${decor.color})` } : {}),
  };

  /* Viewport detection + active-section tracking for the nav variant
     dispatch. useIsMobile is SSR-safe (false on first render, hydrates
     after mount); useActiveSection observes each section's id and
     returns the one most-in-view so nav links can highlight the
     current section. forceMobile (set by the editor's mobile preview
     pill) wins so the mobile drawer variants paint in the 390px
     device frame even when the browser viewport is desktop-width. */
  const realIsMobile = useIsMobile();
  const isMobile = forceMobile || realIsMobile;
  const activeId = useActiveSection(sections.map(String));

  /* Variant ids — manifest.layouts.nav / manifest.layouts.navMobile
     override the per-section defaults registered in layouts.ts. */
  const navVariant = readVariant(manifest, 'nav');
  const navMobileVariant = readVariant(manifest, 'navMobile');

  const onNavClick = (id: string) => scrollToSection(id);
  const onCtaClick = () => {
    scrollToSection('rsvp');
    /* Dispatch 'pl-open-rsvp' so PublishedSiteShell's GuestRsvpModal
       opens too. */
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
    }
  };

  /* Mobile nav variants type activeId as `string | undefined`; the
     hook returns `string | null`. Pre-normalize so both prop shapes
     are satisfied without `as` casts at the call site. */
  const sharedDesktopNavProps = {
    headline,
    navItems,
    cta: C.cta,
    onNavClick,
    onCtaClick,
    activeId,
  };
  const sharedMobileNavProps = {
    headline,
    navItems,
    cta: C.cta,
    onNavClick,
    onCtaClick,
    activeId: activeId ?? undefined,
  };

  const renderNavVariant = () => {
    if (isMobile) {
      switch (navMobileVariant) {
        case 'overlay':      return <NavMobileOverlay {...sharedMobileNavProps} />;
        case 'bottom-sheet': return <NavMobileBottomSheet {...sharedMobileNavProps} />;
        case 'pill':         return <NavMobilePill {...sharedMobileNavProps} />;
        case 'slide-in':
        default:             return <NavMobileSlideIn {...sharedMobileNavProps} />;
      }
    }
    switch (navVariant) {
      case 'centered':     return <NavCentered {...sharedDesktopNavProps} sticky />;
      case 'serif-block':  return <NavSerifBlock {...sharedDesktopNavProps} sticky />;
      case 'minimal-text': return <NavMinimalText {...sharedDesktopNavProps} sticky />;
      case 'iconic':       return <NavIconic {...sharedDesktopNavProps} sticky />;
      case 'split':
      default:             return <NavSplit {...sharedDesktopNavProps} sticky />;
    }
  };

  const navEl = (
    <TSection id="nav" label="Site nav" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable} hideHandle>
      {renderNavVariant()}
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
      <div onMouseLeave={() => setHover(null)} style={rootStyle} data-pl-texture={effectiveTexture} data-pl-kit={kitId} className="pl8-guest">
        <TextureFilters />
        {decor.pattern && decor.pattern !== 'none' && <PatternLayer pattern={decor.pattern} intensity={1} />}
        <TextureLayer texture={textureIntensity > 0 ? effectiveTexture : "none"} intensity={textureIntensity} />
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(290px, 35%) 1fr', alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
            <SidebarHero
              ctx={ctx}
              headline={headline}
              navItems={navItems}
              scrollToSection={scrollToSection}
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
        data-pl-texture={effectiveTexture}
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
          <TextureLayer texture={textureIntensity > 0 ? effectiveTexture : "none"} intensity={textureIntensity} />
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
    <div onMouseLeave={() => setHover(null)} style={rootStyle} data-pl-texture={effectiveTexture} data-pl-kit={kitId} className="pl8-guest">
      <TextureFilters />
      {decor.pattern && decor.pattern !== 'none' && <PatternLayer pattern={decor.pattern} intensity={1} />}
      <TextureLayer texture={textureIntensity > 0 ? effectiveTexture : "none"} intensity={textureIntensity} />
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
  ctx, headline, navItems, scrollToSection, active, hover, setActive, setHover, editable,
}: {
  ctx: SectionCtx;
  headline: string;
  navItems: { id: string; label: string }[];
  scrollToSection: (id: string) => void;
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
            ) : (
              C.subject.a
            )}
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
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }}
              style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              scrollToSection('rsvp');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
              }
            }}
            style={{
              padding: '11px 20px', fontSize: 13, fontWeight: 700,
              background: 'var(--t-accent)', color: 'var(--t-accent-ink, var(--t-paper))',
              border: 'none', borderRadius: 999, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            {C.cta} <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </button>
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
  switch (ctx.variants.hero) {
    case 'split':       return <HeroSplit ctx={ctx} />;
    case 'minimal':     return <HeroMinimal ctx={ctx} />;
    case 'fullbleed':   return <HeroFullbleed ctx={ctx} />;
    case 'typographic': return <HeroTypographic ctx={ctx} />;
    case 'postcard':    return <HeroPostcard ctx={ctx} />;
    default:            return <HeroCentered ctx={ctx} />;
  }
}

/* Default: centered (original). */
function HeroCentered({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, editable, C, motif, motifsOn, showWashHero, edit } = ctx;
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
        <InlineEdit
          as="div"
          value={C.lead}
          onChange={edit?.copy ? (v) => edit.copy?.('heroLead', v) : undefined}
          editable={editable && !!edit?.copy}
          placeholder="A small forever"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }}
        />
        {(C.tagline || editable) && (
          <InlineEdit
            as="div"
            value={C.tagline ?? ''}
            onChange={edit?.tagline}
            editable={editable && !!edit?.tagline}
            placeholder="Click to add a tagline"
            style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', fontWeight: isEditorial ? 600 : 400, marginTop: 8 }}
          />
        )}
        {C.milestone && (
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            fontSize: 11.5, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--t-accent-ink)',
            marginTop: 14,
          }}>
            {C.milestone}
          </div>
        )}
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(74px * var(--t-hero-scale))', lineHeight: 0.96, margin: '12px 0 0', letterSpacing: isEditorial ? '-0.045em' : '-0.02em', color: 'var(--t-ink)' }}>
          <InlineEdit as="span" value={C.subject.a} onChange={edit?.nameA} editable={editable && !!edit?.nameA} placeholder="First name" />
          {C.subject.type === 'couple' && <>
            <span style={{ fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 }}>
              {isEditorial ? '×' : 'and'}
            </span>
            <InlineEdit as="span" value={C.subject.b} onChange={edit?.nameB} editable={editable && !!edit?.nameB} placeholder="Second name" />
          </>}
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
          <TButton variant="primary" href={C.ctaHref}>
            <InlineEdit
              as="span"
              value={C.cta}
              onChange={edit?.copy ? (v) => edit.copy?.('heroCta', v) : undefined}
              editable={editable && !!edit?.copy}
              placeholder="RSVP"
            />
            <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
          <TButton variant="outline" href={C.ctaSecondaryHref}>
            <InlineEdit
              as="span"
              value={C.ctaSecondary ?? 'Learn more'}
              onChange={edit?.copy ? (v) => edit.copy?.('heroCtaSecondary', v) : undefined}
              editable={editable && !!edit?.copy}
              placeholder="Learn more"
            />
          </TButton>
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

/* HeroSplit — handoff L286-298. Type left / photo right grid. */
function HeroSplit({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif, motifsOn, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  return (
    <div style={{ position: 'relative', padding: `${56 * pad}px 56px`, background: 'var(--t-section)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 44, alignItems: 'center' }}>
      {motifsOn && <MotifScatter motif={motif} density="sparse" />}
      <div style={{ position: 'relative', textAlign: 'left' }}>
        <InlineEdit as="div" value={C.lead} onChange={edit?.copy ? (v) => edit.copy?.('heroLead', v) : undefined} editable={editable && !!edit?.copy} placeholder="A small forever" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }} />
        {(C.tagline || editable) && (
          <InlineEdit as="div" value={C.tagline ?? ''} onChange={edit?.tagline} editable={editable && !!edit?.tagline} placeholder="Click to add a tagline" style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', marginTop: 8 }} />
        )}
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(60px * var(--t-hero-scale))', lineHeight: 0.96, margin: '12px 0 0', letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>
          <InlineEdit as="span" value={C.subject.a} onChange={edit?.nameA} editable={editable && !!edit?.nameA} placeholder="First name" />
          {C.subject.type === 'couple' && <>
            <span style={{ fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 }}>{isEditorial ? '×' : 'and'}</span>
            <InlineEdit as="span" value={C.subject.b} onChange={edit?.nameB} editable={editable && !!edit?.nameB} placeholder="Second name" />
          </>}
        </h1>
        <div style={{ marginTop: 18, display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="calendar" size={14} color="var(--t-accent)" /> {C.meta.date}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="pin" size={14} color="var(--t-accent)" /> {C.meta.place}</span>
        </div>
        <div style={{ marginTop: 16 }}><KDivider look={ctx.dividerLook} width={180} style={{ marginLeft: 0 }} /></div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <TButton variant="primary" href={C.ctaHref}>
            <InlineEdit as="span" value={C.cta} onChange={edit?.copy ? (v) => edit.copy?.('heroCta', v) : undefined} editable={editable && !!edit?.copy} placeholder="RSVP" />
            <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
          <TButton variant="outline" href={C.ctaSecondaryHref}>
            <InlineEdit as="span" value={C.ctaSecondary ?? 'Learn more'} onChange={edit?.copy ? (v) => edit.copy?.('heroCtaSecondary', v) : undefined} editable={editable && !!edit?.copy} placeholder="Learn more" />
          </TButton>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        {ctx.coverPhoto ? (
          /* Real cover photo from manifest.coverPhoto wins over the
             tone placeholder when the host has uploaded one. */
          <div
            style={{
              aspectRatio: '3/4',
              borderRadius: 'var(--t-radius)',
              background: `var(--t-section) center / cover no-repeat url("${ctx.coverPhoto.replace(/"/g, '%22')}")`,
            }}
          />
        ) : (
          <PhotoPlaceholder tone="warm" aspect="3/4" style={{ borderRadius: 'var(--t-radius)' }} />
        )}
      </div>
    </div>
  );
}

/* HeroMinimal — handoff L299-308. Left-aligned, no photos. */
function HeroMinimal({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  return (
    <div style={{ position: 'relative', padding: `${72 * pad}px 56px ${56 * pad}px`, background: 'var(--t-section)', overflow: 'hidden', textAlign: 'left' }}>
      <div style={{ maxWidth: 840 }}>
        <InlineEdit as="div" value={C.lead} onChange={edit?.copy ? (v) => edit.copy?.('heroLead', v) : undefined} editable={editable && !!edit?.copy} placeholder="A small forever" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }} />
        {(C.tagline || editable) && (
          <InlineEdit as="div" value={C.tagline ?? ''} onChange={edit?.tagline} editable={editable && !!edit?.tagline} placeholder="Click to add a tagline" style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', marginTop: 8 }} />
        )}
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(78px * var(--t-hero-scale))', lineHeight: 0.96, margin: '12px 0 0', letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>
          <InlineEdit as="span" value={C.subject.a} onChange={edit?.nameA} editable={editable && !!edit?.nameA} placeholder="First name" />
          {C.subject.type === 'couple' && <>
            <span style={{ fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 }}>{isEditorial ? '×' : 'and'}</span>
            <InlineEdit as="span" value={C.subject.b} onChange={edit?.nameB} editable={editable && !!edit?.nameB} placeholder="Second name" />
          </>}
        </h1>
        <div style={{ marginTop: 18, display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="calendar" size={14} color="var(--t-accent)" /> {C.meta.date}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="pin" size={14} color="var(--t-accent)" /> {C.meta.place}</span>
        </div>
        <div style={{ marginTop: 18 }}><KDivider look={ctx.dividerLook} width={200} style={{ marginLeft: 0 }} /></div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <TButton variant="primary" href={C.ctaHref}>
            <InlineEdit as="span" value={C.cta} onChange={edit?.copy ? (v) => edit.copy?.('heroCta', v) : undefined} editable={editable && !!edit?.copy} placeholder="RSVP" />
            <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
          <TButton variant="outline" href={C.ctaSecondaryHref}>
            <InlineEdit as="span" value={C.ctaSecondary ?? 'Learn more'} onChange={edit?.copy ? (v) => edit.copy?.('heroCtaSecondary', v) : undefined} editable={editable && !!edit?.copy} placeholder="Learn more" />
          </TButton>
        </div>
      </div>
    </div>
  );
}

/* HeroFullbleed — handoff L310-324. Photo behind dark scrim. */
function HeroFullbleed({ ctx }: { ctx: SectionCtx }) {
  const { theme, C, coverPhoto, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  return (
    <div style={{ position: 'relative', minHeight: 460, display: 'grid', placeItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {coverPhoto ? (
          <div style={{ height: '100%', width: '100%', background: `center / cover no-repeat url("${coverPhoto.replace(/"/g, '%22')}")` }} />
        ) : (
          <PhotoPlaceholder tone="dusk" aspect="auto" style={{ height: '100%' }} />
        )}
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.5))' }} />
      <div style={{ position: 'relative', color: '#fff', padding: '40px 24px' }}>
        <InlineEdit as="div" value={C.lead} onChange={edit?.copy ? (v) => edit.copy?.('heroLead', v) : undefined} editable={editable && !!edit?.copy} placeholder="A small forever" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 8 }} />
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(76px * var(--t-hero-scale))', lineHeight: 0.96, margin: 0, color: '#fff' }}>
          <InlineEdit as="span" value={C.subject.a} onChange={edit?.nameA} editable={editable && !!edit?.nameA} placeholder="First name" />
          {C.subject.type === 'couple' && <>
            <span style={{ fontStyle: 'italic', fontSize: '0.7em', margin: '0 0.16em', opacity: 0.85 }}>{isEditorial ? '×' : 'and'}</span>
            <InlineEdit as="span" value={C.subject.b} onChange={edit?.nameB} editable={editable && !!edit?.nameB} placeholder="Second name" />
          </>}
        </h1>
        <div style={{ marginTop: 14, fontSize: 14.5, opacity: 0.92 }}>{C.meta.date} · {C.meta.place}</div>
        <div style={{ marginTop: 22 }}>
          <TButton variant="primary" href={C.ctaHref}>
            <InlineEdit as="span" value={C.cta} onChange={edit?.copy ? (v) => edit.copy?.('heroCta', v) : undefined} editable={editable && !!edit?.copy} placeholder="RSVP" />
            <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
        </div>
      </div>
    </div>
  );
}

/* HeroTypographic — handoff L326-338. Names stacked, huge type. */
function HeroTypographic({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif, motifsOn, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  return (
    <div style={{ position: 'relative', padding: `${78 * pad}px 48px ${60 * pad}px`, background: 'var(--t-section)', overflow: 'hidden', textAlign: 'center' }}>
      {motifsOn && <MotifScatter motif={motif} density="sparse" />}
      <div style={{ position: 'relative' }}>
        <InlineEdit as="div" value={C.lead} onChange={edit?.copy ? (v) => edit.copy?.('heroLead', v) : undefined} editable={editable && !!edit?.copy} placeholder="A small forever" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }} />
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(108px * var(--t-hero-scale))', lineHeight: 0.86, margin: '6px 0', letterSpacing: '-0.03em', color: 'var(--t-ink)' }}>
          <InlineEdit as="span" value={C.subject.a} onChange={edit?.nameA} editable={editable && !!edit?.nameA} placeholder="First name" />
          {C.subject.type === 'couple' && <>
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}>{isEditorial ? '×' : '&'}</span>
            <br />
            <InlineEdit as="span" value={C.subject.b} onChange={edit?.nameB} editable={editable && !!edit?.nameB} placeholder="Second name" />
          </>}
        </h1>
        <div style={{ marginTop: 18, display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="calendar" size={14} color="var(--t-accent)" /> {C.meta.date}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="pin" size={14} color="var(--t-accent)" /> {C.meta.place}</span>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <TButton variant="primary" href={C.ctaHref}>
            <InlineEdit as="span" value={C.cta} onChange={edit?.copy ? (v) => edit.copy?.('heroCta', v) : undefined} editable={editable && !!edit?.copy} placeholder="RSVP" />
            <Icon name="arrow-right" size={13} color="var(--t-paper)" />
          </TButton>
        </div>
      </div>
    </div>
  );
}

/* HeroPostcard — handoff L340-349. Card on a tinted mat. */
function HeroPostcard({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif, motifsOn, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  return (
    <div style={{ position: 'relative', padding: `${48 * pad}px 40px`, background: 'color-mix(in oklab, var(--t-ink) 8%, var(--t-section))', overflow: 'hidden' }}>
      <div style={{ maxWidth: 720, marginInline: 'auto', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)', border: '1px solid var(--t-line)', padding: `${40 * pad}px 40px`, textAlign: 'center', position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 10, border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius)', pointerEvents: 'none' }} />
        {motifsOn && <MotifScatter motif={motif} density="sparse" />}
        <div style={{ position: 'relative' }}>
          <InlineEdit as="div" value={C.lead} onChange={edit?.copy ? (v) => edit.copy?.('heroLead', v) : undefined} editable={editable && !!edit?.copy} placeholder="A small forever" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }} />
          {(C.tagline || editable) && (
            <InlineEdit as="div" value={C.tagline ?? ''} onChange={edit?.tagline} editable={editable && !!edit?.tagline} placeholder="Click to add a tagline" style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', marginTop: 8 }} />
          )}
          <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(58px * var(--t-hero-scale))', lineHeight: 0.96, margin: '12px 0 0', letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>
            <InlineEdit as="span" value={C.subject.a} onChange={edit?.nameA} editable={editable && !!edit?.nameA} placeholder="First name" />
            <span style={{ fontStyle: isEditorial ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 }}>{isEditorial ? '×' : 'and'}</span>
            <InlineEdit as="span" value={C.subject.b} onChange={edit?.nameB} editable={editable && !!edit?.nameB} placeholder="Second name" />
          </h1>
          <div style={{ marginTop: 18, display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="calendar" size={14} color="var(--t-accent)" /> {C.meta.date}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="pin" size={14} color="var(--t-accent)" /> {C.meta.place}</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}><KDivider look={ctx.dividerLook} width={180} /></div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <TButton variant="primary" href={C.ctaHref}>
              <InlineEdit as="span" value={C.cta} onChange={edit?.copy ? (v) => edit.copy?.('heroCta', v) : undefined} editable={editable && !!edit?.copy} placeholder="RSVP" />
              <Icon name="arrow-right" size={13} color="var(--t-paper)" />
            </TButton>
            <TButton variant="outline" href={C.ctaSecondaryHref}>
              <InlineEdit as="span" value={C.ctaSecondary ?? 'Learn more'} onChange={edit?.copy ? (v) => edit.copy?.('heroCtaSecondary', v) : undefined} editable={editable && !!edit?.copy} placeholder="Learn more" />
            </TButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── StoryBlock — handoff L366-456 sidebyside default. ──────── */

function StoryBlock({ ctx }: { ctx: SectionCtx }) {
  if (ctx.variants.story === 'zigzag') {
    const { pad, C, editable } = ctx;
    return <div style={{ padding: `${44 * pad}px 32px`, background: 'var(--t-paper)' }}><StoryZigzag ctx={{ C: C.story, pad, editable, cta: C.cta }} /></div>;
  }
  switch (ctx.variants.story) {
    case 'stacked':  return <StoryStacked ctx={ctx} />;
    case 'quote':    return <StoryQuote ctx={ctx} />;
    case 'timeline': return <StoryTimeline ctx={ctx} />;
    case 'letter':   return <StoryLetter ctx={ctx} />;
    default:         return <StorySideBySide ctx={ctx} />;
  }
}

function StorySideBySide({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif, editable, edit } = ctx;
  void theme;
  const heroPhoto = C.story.chapterImages?.[0];
  return (
    <div style={{ position: 'relative', padding: `${48 * pad}px 72px`, display: 'grid', gridTemplateColumns: '0.85fr 1fr', gap: 44, alignItems: 'center', background: 'var(--t-paper)' }}>
      <div style={{ position: 'relative' }}>
        {heroPhoto ? (
          <div style={{ aspectRatio: '4/5', background: `var(--t-section) center / cover no-repeat url("${heroPhoto.replace(/"/g, '%22')}")`, borderRadius: 'var(--t-radius)' }} />
        ) : (
          <PhotoPlaceholder tone="warm" aspect="4/5" />
        )}
        {motif !== 'none' && (
          <div style={{ position: 'absolute', bottom: -18, right: -14, zIndex: 2 }} aria-hidden>
            <Motif kind={motif} size={70} />
          </div>
        )}
      </div>
      <div>
        <InlineEdit
          as="div"
          value={C.story.eyebrow}
          onChange={edit?.copy ? (v) => edit.copy?.('storyEyebrow', v) : undefined}
          editable={editable && !!edit?.copy}
          placeholder="Two threads, one weave"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}
        />
        <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
          <InlineEdit
            as="span"
            value={[C.story.title, C.story.italic].filter(Boolean).join(' ').trim()}
            onChange={edit?.storyHeadline}
            editable={editable && !!edit?.storyHeadline}
            placeholder="How we got here"
          />
        </h2>
        <InlineEdit
          as="div"
          value={C.story.body}
          onChange={edit?.storyBody}
          editable={editable && !!edit?.storyBody}
          multiline
          placeholder="Click to write your story…"
          style={{ marginTop: 16, fontSize: 15, color: 'var(--t-ink-soft)', lineHeight: 1.65 }}
        />
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

/* Story variants — handoff L388-446. */

function StoryStacked({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, editable, edit } = ctx;
  const heroPhoto = C.story.chapterImages?.[0];
  return (
    <div style={{ padding: `${48 * pad}px 72px`, textAlign: 'center', maxWidth: 760, marginInline: 'auto', background: 'var(--t-paper)' }}>
      <div style={{ marginInline: 'auto', maxWidth: 520, marginBottom: 26 }}>
        {heroPhoto ? (
          <div style={{ aspectRatio: '16/9', background: `var(--t-section) center / cover no-repeat url("${heroPhoto.replace(/"/g, '%22')}")`, borderRadius: 'var(--t-radius)' }} />
        ) : (
          <PhotoPlaceholder tone="warm" aspect="16/9" style={{ borderRadius: 'var(--t-radius)' }} />
        )}
      </div>
      <InlineEdit
        as="div"
        value={C.story.eyebrow}
        onChange={edit?.copy ? (v) => edit.copy?.('storyEyebrow', v) : undefined}
        editable={editable && !!edit?.copy}
        placeholder="Two threads, one weave"
        style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}
      />
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
        {C.story.title}
        {C.story.italic && <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {C.story.italic}</span>}
      </h2>
      <p style={{ marginTop: 16, fontSize: 15, color: 'var(--t-ink-soft)', lineHeight: 1.65 }}>{C.story.body}</p>
    </div>
  );
}

function StoryQuote({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif, motifsOn, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  const heroPhoto = C.story.chapterImages?.[0];
  return (
    <div style={{ position: 'relative', padding: `${56 * pad}px 72px`, textAlign: 'center', maxWidth: 880, marginInline: 'auto', background: 'var(--t-paper)' }}>
      {motifsOn && <MotifScatter motif={motif} density="sparse" />}
      {heroPhoto && (
        /* Decorative cover above the quote — small + centered so it
           sits as a deckle motif rather than dominating the pull. */
        <div style={{ position: 'relative', marginInline: 'auto', marginBottom: 24, maxWidth: 320, aspectRatio: '4/3', background: `var(--t-section) center / cover no-repeat url("${heroPhoto.replace(/"/g, '%22')}")`, borderRadius: 'var(--t-radius)' }} />
      )}
      <div style={{ position: 'relative' }}>
        <InlineEdit
          as="div"
          value={C.story.eyebrow}
          onChange={edit?.copy ? (v) => edit.copy?.('storyEyebrow', v) : undefined}
          editable={editable && !!edit?.copy}
          placeholder="Two threads, one weave"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 16 }}
        />
        <blockquote style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontWeight: 'var(--t-display-wght)', fontSize: 28, lineHeight: 1.32, margin: 0, color: 'var(--t-ink)', letterSpacing: '-0.01em' }}>{C.story.body}</blockquote>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}><KDivider look={ctx.dividerLook} width={160} /></div>
      </div>
    </div>
  );
}

function StoryTimeline({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, editable, edit } = ctx;
  const items = C.story.chips && C.story.chips.length > 0 ? C.story.chips : ['We met', 'We fell', 'We knew'];
  return (
    <div style={{ padding: `${52 * pad}px 56px`, maxWidth: 760, marginInline: 'auto', background: 'var(--t-paper)' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <InlineEdit
          as="div"
          value={C.story.eyebrow}
          onChange={edit?.copy ? (v) => edit.copy?.('storyEyebrow', v) : undefined}
          editable={editable && !!edit?.copy}
          placeholder="Two threads, one weave"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}
        />
        <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, color: 'var(--t-ink)' }}>
          {C.story.title}
          {C.story.italic && <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {C.story.italic}</span>}
        </h2>
      </div>
      <div style={{ position: 'relative', paddingLeft: 30 }}>
        <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--t-line)' }} />
        {items.map((it, i) => {
          /* Per-row content from manifest.chapters[i] when set:
             photo, title (overrides chip eyebrow), body. Falls back
             to the chip eyebrow + shared body for chapters with
             nothing authored — keeps existing manifests rendering
             unchanged. */
          const photo = C.story.chapterImages?.[i];
          const chapterTitle = C.story.chapterTitles?.[i];
          const chapterBody = C.story.chapterBodies?.[i];
          /* Eyebrow stays the chip text; title rendered below as a
             separate display-font line when the host wrote a
             chapter-specific title. */
          const eyebrowText = it;
          const bodyText = chapterBody || C.story.body;
          return (
            <div key={i} style={{ position: 'relative', paddingBottom: i < items.length - 1 ? 22 : 0 }}>
              <span style={{ position: 'absolute', left: -30, top: 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--t-accent)', border: '3px solid var(--t-paper)' }} />
              <div style={{ fontFamily: 'var(--t-mono)', fontSize: 11, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)' }}>{eyebrowText}</div>
              {chapterTitle && (
                <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 22, color: 'var(--t-ink)', marginTop: 3, lineHeight: 1.15 }}>{chapterTitle}</div>
              )}
              {photo && (
                <div style={{ marginTop: chapterTitle ? 10 : 8, aspectRatio: '16/9', maxWidth: 480, background: `var(--t-section) center / cover no-repeat url("${photo.replace(/"/g, '%22')}")`, borderRadius: 'var(--t-radius)' }} />
              )}
              <div style={{ fontSize: 13.5, color: 'var(--t-ink-soft)', lineHeight: 1.55, marginTop: photo ? 6 : 3 }}>{bodyText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoryLetter({ ctx }: { ctx: SectionCtx }) {
  const { theme, pad, C, motif, motifsOn, editable, edit } = ctx;
  const isEditorial = theme.id === 'editorial';
  const heroPhoto = C.story.chapterImages?.[0];
  return (
    <div style={{ position: 'relative', padding: `${52 * pad}px 40px`, background: 'var(--t-section)' }}>
      {motifsOn && <MotifScatter motif={motif} density="sparse" />}
      <div style={{ position: 'relative', maxWidth: 640, marginInline: 'auto', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)', border: '1px solid var(--t-line)', padding: '40px 46px', textAlign: 'center' }}>
        <InlineEdit
          as="div"
          value={C.story.eyebrow}
          onChange={edit?.copy ? (v) => edit.copy?.('storyEyebrow', v) : undefined}
          editable={editable && !!edit?.copy}
          placeholder="Two threads, one weave"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 14 }}
        />
        {heroPhoto && (
          /* Small framed photo as a "stamp" at the top of the letter
             card — keeps the editorial-letter feel while warming the
             card with a real image. */
          <div style={{ marginInline: 'auto', marginBottom: 16, width: 96, height: 96, borderRadius: '50%', background: `var(--t-section) center / cover no-repeat url("${heroPhoto.replace(/"/g, '%22')}")`, border: '3px solid var(--t-paper)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
        )}
        <p style={{ fontFamily: 'var(--t-display)', fontStyle: isEditorial ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink)', lineHeight: 1.6, textAlign: 'left' }}>{C.story.body}</p>
        <div style={{ fontFamily: 'var(--t-script)', fontSize: 30, color: 'var(--t-accent-ink)', marginTop: 14, textAlign: 'right' }}>
          {C.subject.type === 'solo' ? C.subject.a : <>{C.subject.a} &amp; {C.subject.b}</>}
        </div>
      </div>
    </div>
  );
}

/* ─── DetailsBlock — handoff L459-508 tiles default. ─────────── */

function DetailsBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, motif, editable, variants } = ctx;
  /* Variant dispatch — fall through to default 'tiles' block. */
  const sub = { C: C.details, pad, editable, cta: C.cta };
  if (variants.details === 'iconrow')   return <div style={{ position: 'relative', padding: `${44 * pad}px 40px`, background: 'var(--t-section)' }}><MotifScatter motif={motif} density="sparse" /><DetailsIconRow ctx={sub} /></div>;
  if (variants.details === 'accordion') return <div style={{ position: 'relative', padding: `${44 * pad}px 40px`, background: 'var(--t-section)' }}><MotifScatter motif={motif} density="sparse" /><DetailsAccordion ctx={sub} /></div>;
  if (variants.details === 'bento')     return <div style={{ position: 'relative', padding: `${44 * pad}px 40px`, background: 'var(--t-section)' }}><MotifScatter motif={motif} density="sparse" /><DetailsBento ctx={sub} /></div>;
  return (
    <div style={{ position: 'relative', padding: `${44 * pad}px 40px`, background: 'var(--t-section)' }}>
      <MotifScatter motif={motif} density="sparse" />
      <TSectionHead
        eyebrow={C.details.eyebrow}
        title={C.details.title}
        italic={C.details.italic}
        editable={editable}
        onEditEyebrow={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('detailsEyebrow', v) : undefined}
        onEditTitle={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('detailsTitle', v) : undefined}
        eyebrowPlaceholder="The fine print"
        titlePlaceholder="Everything you should know"
      />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, maxWidth: 760, marginInline: 'auto' }}>
        {C.details.items.map((d, i) => (
          <div key={`${i}-${d.l}`} style={{ background: 'var(--t-card)', borderRadius: 'var(--t-radius)', padding: 18, border: '1px solid var(--t-line-soft)' }}>
            <Icon name={d.icon} size={18} color="var(--t-gold)" />
            <InlineEdit
              as="div"
              value={d.l}
              onChange={ctx.edit?.detailsLabel ? (v) => ctx.edit?.detailsLabel?.(i, v) : undefined}
              editable={editable && !!ctx.edit?.detailsLabel}
              placeholder="Label"
              style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 10, marginBottom: 4 }}
            />
            <InlineEdit
              as="div"
              value={d.v}
              onChange={ctx.edit?.detailsValue ? (v) => ctx.edit?.detailsValue?.(i, v) : undefined}
              editable={editable && !!ctx.edit?.detailsValue}
              placeholder="Value"
              style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18, color: 'var(--t-ink)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ScheduleBlock — handoff L511-565 cards default. ────────── */

function ScheduleBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, editable, variants } = ctx;
  const sub = { C: C.schedule, pad, editable, cta: C.cta };
  if (variants.schedule === 'timeline') return <div style={{ padding: `${48 * pad}px 40px`, background: 'var(--t-paper)' }}><ScheduleTimeline ctx={sub} /></div>;
  if (variants.schedule === 'stepper')  return <div style={{ padding: `${48 * pad}px 40px`, background: 'var(--t-paper)' }}><ScheduleStepper ctx={sub} /></div>;
  if (variants.schedule === 'numbered') return <div style={{ padding: `${48 * pad}px 40px`, background: 'var(--t-paper)' }}><ScheduleNumbered ctx={sub} /></div>;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, background: 'var(--t-paper)' }}>
      <TSectionHead
        eyebrow={C.schedule.eyebrow}
        title={C.schedule.title}
        italic={C.schedule.italic}
        editable={editable}
        onEditEyebrow={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('scheduleEyebrow', v) : undefined}
        onEditTitle={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('scheduleTitle', v) : undefined}
        eyebrowPlaceholder="The day"
        titlePlaceholder="In moments"
      />
      {(() => {
        /* Multi-day rendering — when any row has a day>1, group
           the rows under "Day N" headers. Single-day events
           render exactly like before (one flat grid). */
        const rows = C.schedule.rows;
        const hasMultiDay = rows.some((r) => r.day && r.day > 1);
        if (!hasMultiDay) return null;
        const byDay = new Map<number, typeof rows>();
        rows.forEach((r, i) => {
          const d = r.day ?? 1;
          const arr = byDay.get(d) ?? [];
          arr.push({ ...r, /* preserve original i for inline-edit handlers */ } as typeof rows[number]);
          byDay.set(d, arr);
          void i;
        });
        const days = Array.from(byDay.keys()).sort((a, b) => a - b);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880, marginInline: 'auto' }}>
            {days.map((d) => {
              const dayRows = byDay.get(d) ?? [];
              return (
                <div key={d}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    marginBottom: 12,
                  }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
                    <div style={{
                      fontFamily: 'var(--t-mono)',
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: 'var(--t-eyebrow-ls)',
                      textTransform: 'uppercase',
                      color: 'var(--t-accent-ink)',
                      whiteSpace: 'nowrap',
                    }}>
                      Day {d}
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {dayRows.map((r, i) => (
                      <div key={`${d}-${i}`} className="pl8-schedule-row" style={{ padding: 16, background: 'var(--t-card)', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line-soft)', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)' as React.CSSProperties['fontWeight'], fontSize: 20, color: 'var(--t-ink)' }}>{r.t}</div>
                        <div style={{ fontSize: 13, color: 'var(--t-ink)', marginTop: 4, fontWeight: 600 }}>{r.l}</div>
                        <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', marginTop: 4 }}>{r.s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      {/* Single-day grid — only renders when there are NO multi-day
          rows. minmax(180px, 1fr) is the single-card minimum
          width before the grid wraps. */}
      <div style={{
        display: C.schedule.rows.some((r) => r.day && r.day > 1) ? 'none' : 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, maxWidth: 880, marginInline: 'auto',
      }}>
        {C.schedule.rows.map((r, i) => (
          <div key={i} className="pl8-schedule-row" style={{ padding: 16, background: 'var(--t-card)', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line-soft)', textAlign: 'center' }}>
            <InlineEdit
              as="div"
              value={r.t}
              onChange={ctx.edit?.eventTime ? (v) => ctx.edit?.eventTime?.(i, v) : undefined}
              editable={editable && !!ctx.edit?.eventTime}
              placeholder="Time"
              style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20, color: 'var(--t-ink)' }}
            />
            <InlineEdit
              as="div"
              value={r.l}
              onChange={ctx.edit?.eventName ? (v) => ctx.edit?.eventName?.(i, v) : undefined}
              editable={editable && !!ctx.edit?.eventName}
              placeholder="What's happening"
              style={{ fontSize: 13, color: 'var(--t-ink)', marginTop: 4, fontWeight: 600 }}
            />
            <InlineEdit
              as="div"
              value={r.s}
              onChange={ctx.edit?.eventVenue ? (v) => ctx.edit?.eventVenue?.(i, v) : undefined}
              editable={editable && !!ctx.edit?.eventVenue}
              placeholder="Where"
              style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 2 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TravelBlock — handoff L572-647 rows default. ───────────── */

function TravelBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, motif, editable, variants } = ctx;
  const sub = { C: C.travel, pad, editable, cta: C.cta };
  if (variants.travel === 'map')      return <div style={{ position: 'relative', padding: `${48 * pad}px 40px`, background: 'var(--t-section)' }}><MotifScatter motif={motif} density="sparse" /><TravelMap ctx={sub} /></div>;
  if (variants.travel === 'table')    return <div style={{ position: 'relative', padding: `${48 * pad}px 40px`, background: 'var(--t-section)' }}><MotifScatter motif={motif} density="sparse" /><TravelTable ctx={sub} /></div>;
  if (variants.travel === 'carousel') return <div style={{ position: 'relative', padding: `${48 * pad}px 40px`, background: 'var(--t-section)' }}><MotifScatter motif={motif} density="sparse" /><TravelCarousel ctx={sub} /></div>;
  return (
    <div style={{ position: 'relative', padding: `${48 * pad}px 40px`, background: 'var(--t-section)' }}>
      <MotifScatter motif={motif} density="sparse" />
      <TSectionHead
        eyebrow={C.travel.eyebrow}
        title={C.travel.title}
        italic={C.travel.italic}
        editable={editable}
        onEditEyebrow={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('travelEyebrow', v) : undefined}
        onEditTitle={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('travelTitle', v) : undefined}
        eyebrowPlaceholder="Getting there"
        titlePlaceholder="Where to stay"
      />
      {C.travel.intro && (
        <div style={{ maxWidth: 560, marginInline: 'auto', textAlign: 'center', fontSize: 14.5, color: 'var(--t-ink-soft)', lineHeight: 1.6, marginBottom: 24 }}>
          {C.travel.intro}
        </div>
      )}
      <div style={{ position: 'relative', maxWidth: 820, marginInline: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {C.travel.hotels.map((h, i) => (
            <div key={i} className="pl8-hotel-row" style={{ background: 'var(--t-card)', borderRadius: 'var(--t-radius-lg)', overflow: 'hidden', border: '1px solid var(--t-line-soft)', boxShadow: 'var(--t-shadow)' }}>
              <div style={{ aspectRatio: '16/9' }}>
                {h.photoUrl ? (
                  /* Real Google Places photo from manifest.travelInfo.hotels[].photoUrl
                     wins over the gradient placeholder when present. */
                  <div style={{ height: '100%', width: '100%', background: `var(--t-section) center / cover no-repeat url("${h.photoUrl.replace(/"/g, '%22')}")` }} />
                ) : (
                  <PhotoPlaceholder tone={h.tone} aspect="16/9" />
                )}
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
  const { pad, C, editable, variants } = ctx;
  const sub = { C: C.registry, pad, editable, cta: C.cta };
  if (variants.registry === 'chips')    return <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}><RegistryChips ctx={sub} /></div>;
  if (variants.registry === 'progress') return <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}><RegistryProgress ctx={sub} /></div>;
  if (variants.registry === 'logowall') return <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}><RegistryLogoWall ctx={sub} /></div>;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}>
      <TSectionHead
        eyebrow={C.registry.eyebrow}
        title={C.registry.title}
        italic={C.registry.italic}
        editable={editable}
        onEditEyebrow={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('registryEyebrow', v) : undefined}
        onEditTitle={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('registryTitle', v) : undefined}
        eyebrowPlaceholder="Registry"
        titlePlaceholder="Your presence is the gift"
      />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.registry.body}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {C.registry.stores.map((s, i) => {
          const pillStyle: CSSProperties = {
            padding: '12px 22px', borderRadius: 'var(--t-radius)',
            background: 'var(--t-card)', border: '1px solid var(--t-line)',
            fontSize: 13, fontWeight: 600, color: 'var(--t-ink)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            textDecoration: 'none',
            transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1), border-color 180ms',
          };
          if (s.url) {
            return (
              <a key={`${s.name}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" style={pillStyle}>
                {s.name} <Icon name="arrow-ur" size={12} color="var(--t-accent-ink)" />
              </a>
            );
          }
          return (
            <span key={`${s.name}-${i}`} style={pillStyle}>
              {s.name} <Icon name="arrow-ur" size={12} color="var(--t-accent-ink)" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── GalleryBlock — handoff grid variant. ───────────────────── */

function GalleryBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, editable, variants } = ctx;
  const sub = { C: C.gallery, pad, editable, cta: C.cta };
  if (variants.gallery === 'masonry')   return <div style={{ padding: `${36 * pad}px 32px`, background: 'var(--t-section)' }}><GalleryMasonry ctx={sub} /></div>;
  if (variants.gallery === 'slideshow') return <div style={{ padding: `${36 * pad}px 32px`, background: 'var(--t-section)' }}><GallerySlideshow ctx={sub} /></div>;
  if (variants.gallery === 'polaroid')  return <div style={{ padding: `${36 * pad}px 32px`, background: 'var(--t-section)' }}><GalleryPolaroid ctx={sub} /></div>;
  return (
    <div style={{ padding: `${36 * pad}px 32px`, background: 'var(--t-section)' }}>
      <TSectionHead
        eyebrow={C.gallery.eyebrow}
        title={C.gallery.title}
        italic={C.gallery.italic}
        editable={editable}
        onEditEyebrow={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('galleryEyebrow', v) : undefined}
        onEditTitle={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('galleryTitle', v) : undefined}
        eyebrowPlaceholder="Gallery"
        titlePlaceholder="A few favorites"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, maxWidth: 920, marginInline: 'auto' }}>
        {C.gallery.photos && C.gallery.photos.length > 0
          /* Render the host's uploaded photos as cover-image
             squares; the gradient placeholders fall away entirely
             once any photo is set. */
          ? C.gallery.photos.map((url, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1/1',
                  background: `var(--t-section) center / cover no-repeat url("${url.replace(/"/g, '%22')}")`,
                  borderRadius: 8,
                }}
              />
            ))
          : C.gallery.tones.map((t, i) => (
              <PhotoPlaceholder key={i} tone={t} aspect="1/1" style={{ borderRadius: 8 }} />
            ))}
      </div>
    </div>
  );
}

/* ─── RsvpBlock — handoff centered (dark inverse). ───────────── */

function RsvpBlock({ ctx }: { ctx: SectionCtx }) {
  const { pad, C, editable, variants } = ctx;
  const sub = { C: C.rsvp, pad, editable, cta: C.cta };
  if (variants.rsvp === 'split')   return <RsvpSplit ctx={sub} />;
  if (variants.rsvp === 'banner')  return <RsvpBanner ctx={sub} />;
  if (variants.rsvp === 'minimal') return <RsvpMinimal ctx={sub} />;
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
  const { pad, C, editable, variants } = ctx;
  const sub = { C: C.faq, pad, editable, cta: C.cta };
  if (variants.faq === 'twocol')   return <div style={{ padding: `${48 * pad}px 32px`, background: 'var(--t-paper)' }}><FaqTwocol ctx={sub} /></div>;
  if (variants.faq === 'numbered') return <div style={{ padding: `${48 * pad}px 32px`, background: 'var(--t-paper)' }}><FaqNumbered ctx={sub} /></div>;
  if (variants.faq === 'cards')    return <div style={{ padding: `${48 * pad}px 32px`, background: 'var(--t-paper)' }}><FaqCards ctx={sub} /></div>;
  return (
    <div style={{ padding: `${48 * pad}px 32px`, background: 'var(--t-paper)' }}>
      <TSectionHead
        eyebrow={C.faq.eyebrow}
        title={C.faq.title}
        italic={C.faq.italic}
        editable={editable}
        onEditEyebrow={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('faqEyebrow', v) : undefined}
        onEditTitle={ctx.edit?.copy ? (v) => ctx.edit?.copy?.('faqTitle', v) : undefined}
        eyebrowPlaceholder="Questions & answers"
        titlePlaceholder="The little things"
      />
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

function TSectionHead({ eyebrow, title, italic, editable, onEditEyebrow, onEditTitle, eyebrowPlaceholder, titlePlaceholder }: {
  eyebrow: string;
  title: string;
  italic?: string;
  /** When set, the eyebrow becomes click-to-edit and writes through
   *  onEditEyebrow. Same for title — see onEditTitle. */
  editable?: boolean;
  onEditEyebrow?: (v: string) => void;
  /** Title + italic edit together as one composite string. On commit
   *  the canvas runs splitHeading() server-side so the italic accent
   *  word still renders italicized. Passing "Where to stay" → renders
   *  "Where to <em>stay</em>". */
  onEditTitle?: (v: string) => void;
  eyebrowPlaceholder?: string;
  titlePlaceholder?: string;
}) {
  const fullTitle = [title, italic].filter(Boolean).join(' ');
  return (
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <InlineEdit
        as="div"
        value={eyebrow}
        onChange={onEditEyebrow}
        editable={!!editable && !!onEditEyebrow}
        placeholder={eyebrowPlaceholder ?? 'Section eyebrow'}
        style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}
      />
      {editable && onEditTitle ? (
        /* Edit mode — single composite string; canvas re-splits on
           commit. Loses the live italic styling while typing, but
           the styling re-applies as soon as the host commits. */
        <InlineEdit
          as="h2"
          value={fullTitle}
          onChange={onEditTitle}
          editable={true}
          placeholder={titlePlaceholder ?? 'Section title'}
          style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 40, margin: 0, lineHeight: 1.0, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}
        />
      ) : (
        <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 40, margin: 0, lineHeight: 1.0, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
          {title}
          {italic && <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {italic}</span>}
        </h2>
      )}
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
      id={id}
      data-section-id={id}
      onMouseEnter={() => setHover(id)}
      onClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        setActive(id);
      }}
      style={{ position: 'relative', cursor: editable ? 'pointer' : 'default', scrollMarginTop: 80 }}
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

function TButton({
  variant = 'primary',
  children,
  style,
  href,
}: {
  variant?: 'primary' | 'outline' | 'link';
  children: ReactNode;
  style?: CSSProperties;
  /** Where the button navigates. '#section' scrolls to a section,
   *  'https://...' is an external link, '' renders a plain <span>
   *  (decorative). 'rsvp-modal' is a sentinel handled by the
   *  parent — we render an <a href="#rsvp"> fallback. */
  href?: string;
}) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 22px', borderRadius: 999,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 0, transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
    fontFamily: 'inherit', textDecoration: 'none',
  };
  const visual: CSSProperties =
    variant === 'primary'
      ? { background: 'var(--t-ink)', color: 'var(--t-paper)' }
      : variant === 'outline'
        ? { background: 'transparent', color: 'var(--t-ink)', border: '1px solid var(--t-line)' }
        : { background: 'transparent', color: 'var(--t-accent-ink)', padding: '10px 0' };
  const combined = { ...base, ...visual, ...style };

  /* No link OR explicit "none-link" sentinel (host picked "No
     link" in the panel) → render as <span>. */
  if (!href || href === 'none-link') {
    return <span style={combined}>{children}</span>;
  }
  /* In-site anchor — let the browser handle the hash scroll. The
     rsvp-modal sentinel falls through to #rsvp in case the modal
     isn't mounted on the current page variant. */
  const resolvedHref = href === 'rsvp-modal' ? '#rsvp' : href;
  const isExternal = /^https?:\/\//.test(resolvedHref);
  return (
    <a
      href={resolvedHref}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={combined}
    >
      {children}
    </a>
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
  /** Per-section layout variant resolved from manifest.layouts[section]
   *  with default fallback. Used by the section blocks to dispatch. */
  variants: {
    hero: string;
    story: string;
    details: string;
    schedule: string;
    travel: string;
    registry: string;
    gallery: string;
    faq: string;
    rsvp: string;
  };
  C: Copy;
  /** Host-uploaded cover photo URL (manifest.coverPhoto). When set,
   *  hero variants render it instead of the gradient placeholder. */
  coverPhoto?: string;
  /** Round R inline-edit handlers — when set on the canvas (editor
   *  mode only), section blocks render InlineEdit-wrapped text that
   *  writes through these callbacks. Each is undefined in published
   *  mode so guests see plain text with no edit chrome. */
  edit?: {
    tagline?: (v: string) => void;
    storyHeadline?: (v: string) => void;
    storyBody?: (v: string) => void;
    detailsValue?: (idx: number, v: string) => void;
    detailsLabel?: (idx: number, v: string) => void;
    eventName?: (idx: number, v: string) => void;
    eventTime?: (idx: number, v: string) => void;
    eventVenue?: (idx: number, v: string) => void;
    nameA?: (v: string) => void;
    nameB?: (v: string) => void;
    /** Generic manifest.copy.<key> writer. Used for every editable
     *  eyebrow / lead / CTA / button-label slot on the canvas. */
    copy?: (key: string, v: string) => void;
  };
}

interface Copy {
  subject: { type: 'couple' | 'solo'; a: string; b: string };
  lead: string;
  tagline: string;
  cta: string;
  /** Where the primary CTA navigates. '#section' anchor, full URL,
   *  or '' for no link. From manifest.copy.heroCtaHref (default
   *  '#rsvp' when blank — matches the legacy hardcoded behaviour). */
  ctaHref?: string;
  /** Secondary CTA label ("Learn more" default). Host-overridable
   *  via manifest.copy.heroCtaSecondary. */
  ctaSecondary?: string;
  /** Where the secondary CTA navigates. From manifest.copy.heroCtaSecondaryHref
   *  (default '#story' when blank). */
  ctaSecondaryHref?: string;
  /** Optional milestone marker (Turning 40 / 10 years / Class of '95).
   *  Renders as a small badge above the names. Empty / missing → not
   *  rendered. */
  milestone?: string;
  meta: { date: string; place: string };
  story: {
    eyebrow: string;
    title: string;
    italic?: string;
    body: string;
    chips?: string[];
    /** Up to 3 host-uploaded chapter photos. Variants that render
     *  per-chapter cards (timeline / zigzag) read these instead of
     *  the gradient PhotoPlaceholder when set. */
    chapterImages?: (string | undefined)[];
    /** Per-chapter titles. When set, multi-chapter variants use
     *  these instead of the shared C.story.title for each card. */
    chapterTitles?: (string | undefined)[];
    /** Per-chapter body text. When set, multi-chapter variants
     *  use these instead of the shared C.story.body. */
    chapterBodies?: (string | undefined)[];
  };
  details: { eyebrow: string; title: string; italic?: string; items: { l: string; v: string; icon: string }[] };
  schedule: { eyebrow: string; title: string; italic?: string; rows: { t: string; l: string; s: string; day?: number }[] };
  travel: { eyebrow: string; title: string; italic?: string; intro?: string; hotels: { name: string; price: string; rating: number; reviews: number; dist: string; tone: PhotoTone; blurb: string; amenities: string[]; photoUrl?: string; bookingUrl?: string }[] };
  registry: {
    eyebrow: string; title: string; italic?: string; body: string;
    /** Rich registry stores — name + optional URL. The renderer
     *  wraps each in <a href> when a URL is present, otherwise
     *  shows a plain pill. Legacy string[] entries from old
     *  manifests are normalized to { name } in buildCopy. */
    stores: { name: string; url?: string }[];
  };
  gallery: {
    eyebrow: string;
    title: string;
    italic?: string;
    tones: PhotoTone[];
    /** Host-uploaded photo URLs (manifest.galleryImages[]). When
     *  non-empty, the canvas renders these instead of the gradient
     *  tone placeholders. */
    photos?: string[];
  };
  rsvp: { eyebrow: string; title: string; body: string };
  faq: { eyebrow: string; title: string; italic?: string; questions: string[]; qa?: { q: string; a?: string }[] };
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
  const faqsRaw = (loose.faqs as Array<{ question?: string; answer?: string }> | undefined) ?? [];
  /* manifest.registryStores may be legacy string[] OR new
     { name, url? }[]. Normalize to the rich shape for buildCopy. */
  const registryStoresRaw = (() => {
    const raw = loose.registryStores as Array<string | { name?: string; url?: string }> | undefined;
    if (!raw) return undefined;
    return raw
      .map((entry) => typeof entry === 'string'
        ? { name: entry }
        : { name: entry.name ?? '', url: entry.url })
      .filter((entry) => entry.name.trim().length > 0);
  })();
  const registryIntro = (loose.registryIntro as string | undefined);
  const rsvpDeadline = (loose.rsvpDeadline as string | undefined);
  const tagline = (loose.tagline as string | undefined);
  /* DetailsPanel writes manifest.kidsWelcome / adultsOnly booleans.
     The host's intent is binary — either kids are welcome or it's an
     adults-only evening. We surface the active one as a synthesized
     "Kids" card when the host hasn't authored their own detailsCards.
     `kidsWelcomeRaw === undefined` means the panel was never opened
     (preserve the cream default "Kids welcome · Ages 10 +"). */
  const kidsWelcomeRaw = loose.kidsWelcome as boolean | undefined;
  const adultsOnlyRaw = loose.adultsOnly as boolean | undefined;
  const occasion = (loose.occasion as string | undefined) ?? 'wedding';
  const voiceKey = ((loose.voiceOverride as string | undefined) ?? 'classic') as keyof typeof VOICE_COPY;
  const V = VOICE_COPY[voiceKey] ?? VOICE_COPY.classic;

  const occasionDate = formatHeroDate(rsvpDeadline) || args.date;
  const isWedding = occasion === 'wedding';
  /* Host-authored copy overrides for every visible label on the
     canvas — eyebrows, CTAs, section titles. Each falls through
     to the voice-defaulted V.* or hardcoded value when unset so
     existing manifests render unchanged. Round T wires HeroPanel
     + section panels to write here. */
  const copyOverrides = (loose.copy as Record<string, string> | undefined) ?? {};
  const co = (key: string, fallback: string): string => {
    const v = copyOverrides[key];
    return typeof v === 'string' && v.trim() ? v : fallback;
  };
  /* Section titles ship as a (head, italic) tuple — see splitHeading
     below. Hosts override the whole string via manifest.copy.<section>Title;
     we splitHeading() the override at read time so the italic part
     still renders italicized. Pass the original fallback head/italic
     so unset overrides preserve the existing default exactly. */
  const coTitle = (key: string, fallbackHead: string, fallbackItalic?: string): { head: string; italic: string } => {
    const v = copyOverrides[key];
    if (typeof v === 'string' && v.trim()) return splitHeading(v);
    return { head: fallbackHead, italic: fallbackItalic ?? '' };
  };

  return {
    subject: (() => {
      /* Solo-honoree mode — set in the editor's Hero panel and
         stored under manifest.subject.kind. When 'solo', the
         renderer suppresses the second name + '&' glyph. */
      const sub = (loose.subject as { kind?: 'couple' | 'solo' } | undefined);
      const kind = sub?.kind === 'solo' ? 'solo' as const : 'couple' as const;
      return { type: kind, a: args.nameA, b: kind === 'solo' ? '' : args.nameB };
    })(),
    lead: co('heroLead', V.lead),
    tagline: tagline || V.tagline,
    cta: co('heroCta', 'RSVP'),
    ctaHref: co('heroCtaHref', '#rsvp'),
    ctaSecondary: co('heroCtaSecondary', 'Learn more'),
    ctaSecondaryHref: co('heroCtaSecondaryHref', '#story'),
    milestone: (() => {
      /* Read manifest.milestone and format per kind. */
      const ms = loose.milestone as { kind?: string; value?: string } | undefined;
      if (!ms || !ms.value || !ms.kind) return '';
      const v = ms.value.trim();
      if (!v) return '';
      switch (ms.kind) {
        case 'turning':   return `Turning ${v}`;
        case 'years':     return `${v} years`;
        case 'class-of':  return `Class of ${v}`;
        case 'in-memory': return v;
        case 'custom':    return v;
        default:          return v;
      }
    })(),
    meta: { date: args.date, place: args.place },
    story: (() => {
      /* Pull up to 3 chapter photos + titles + bodies from the
         canonical manifest.chapters[] path. StoryPanel writes here
         when the host fills in a chapter slot. */
      const chapters = (loose.chapters as Array<{ title?: string; description?: string; images?: Array<{ url?: string }> }> | undefined) ?? [];
      const chapterImages = [0, 1, 2].map((i) => chapters[i]?.images?.[0]?.url || undefined);
      const chapterTitles = [0, 1, 2].map((i) => (chapters[i]?.title || '').trim() || undefined);
      const chapterBodies = [0, 1, 2].map((i) => (chapters[i]?.description || '').trim() || undefined);
      return {
        eyebrow: co('storyEyebrow', V.storyEyebrow),
        title: storySection.headline ? splitHeading(storySection.headline).head : V.storyTitle,
        italic: storySection.headline ? splitHeading(storySection.headline).italic : V.storyItalic,
        body: storySection.body || 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.',
        chips: Array.isArray(storySection.chips) ? storySection.chips : undefined,
        chapterImages: chapterImages.some(Boolean) ? chapterImages : undefined,
        chapterTitles: chapterTitles.some(Boolean) ? chapterTitles : undefined,
        chapterBodies: chapterBodies.some(Boolean) ? chapterBodies : undefined,
      };
    })(),
    details: (() => {
      const t = coTitle('detailsTitle', 'Everything you', 'should know');
      return {
      eyebrow: co('detailsEyebrow', 'The fine print'),
      title: t.head,
      italic: t.italic,
      items: detailsCards.length > 0
        ? detailsCards
            /* Drop entries where both halves are empty — old manifests
               accumulated stray empty rows during testing and they
               rendered as ghost cards on the canvas. */
            .filter(([l, v]) => (l ?? '').trim() !== '' || (v ?? '').trim() !== '')
            .slice(0, 3)
            .map(([l, v], i) => ({
              l: l ?? '',
              v: v ?? '',
              icon: ['sparkles', 'users', 'gift'][i] ?? 'sparkles',
            }))
        : [
            { l: 'Dress code', v: 'Garden formal', icon: 'sparkles' },
            /* Kids card responds to DetailsPanel's binary toggles.
               kidsWelcome=true wins; adultsOnly=true forces an
               adults-only label; neither set leaves the cream default. */
            kidsWelcomeRaw === true
              ? { l: 'Kids welcome', v: 'All ages — bring the little ones', icon: 'users' }
              : adultsOnlyRaw === true
                ? { l: 'Adults-only evening', v: 'Reception is 18+', icon: 'users' }
                : { l: 'Kids welcome', v: 'Ages 10 +', icon: 'users' },
            { l: 'Gifts', v: 'Your presence is enough', icon: 'gift' },
          ],
      };
    })(),
    schedule: (() => {
      const t = coTitle('scheduleTitle', 'In', 'moments');
      return {
      eyebrow: co('scheduleEyebrow', 'The day'),
      title: t.head,
      italic: t.italic,
      /* Multi-day events: when any event has day>1, render ALL
         rows (not just first 4) so guests see the full weekend.
         Otherwise keep the legacy 4-row cap. */
      rows: eventsRaw.length > 0
        ? (() => {
            const hasMultiDay = eventsRaw.some((e) => (e as { day?: number }).day && (e as { day?: number }).day! > 1);
            const list = hasMultiDay ? eventsRaw : eventsRaw.slice(0, 4);
            return list.map((e) => ({
              t: e.time ?? '',
              l: e.name ?? '',
              s: e.venue ?? e.description ?? '',
              day: (e as { day?: number }).day,
            }));
          })()
        : [
            { t: '4:30 pm', l: 'Ceremony', s: 'Olive grove' },
            { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
            { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
            { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
          ],
      };
    })(),
    travel: (() => {
      /* Read host-authored hotels from manifest.travelInfo.hotels[]
         (the canonical HotelBlock schema, populated by TravelPanel's
         Google Places search). Map each HotelBlock onto the renderer's
         compact shape with sensible fallbacks so old manifests or
         partial Places hits still display cleanly. Only fall through
         to the canned Santorini sample pair when the host has zero
         hotels saved. */
      const hostHotels = manifest.travelInfo?.hotels ?? [];
      const TONES: PhotoTone[] = ['warm', 'lavender', 'sage', 'peach', 'dusk', 'cream'];
      const mapped = hostHotels.map((h, i) => ({
        name: h.name || 'Hotel',
        price: h.priceLevel || (h.priceRange?.start && h.priceRange?.end
          ? `${h.priceRange.currency ?? '$'}${h.priceRange.start}–${h.priceRange.end}`
          : '—'),
        rating: typeof h.rating === 'number' ? h.rating : 0,
        reviews: typeof h.ratingCount === 'number' ? h.ratingCount : 0,
        dist: h.distance || '',
        tone: TONES[i % TONES.length],
        blurb: h.description || h.notes || h.address || '',
        amenities: h.amenities
          ? h.amenities.split(/[·,]/).map((s) => s.trim()).filter(Boolean)
          : [],
        photoUrl: h.photoUrl || h.photoUrls?.[0],
        bookingUrl: h.bookingUrl,
      }));
      const t = coTitle('travelTitle', 'Where to', 'stay');
      return {
        eyebrow: co('travelEyebrow', 'Getting there'),
        title: t.head,
        italic: t.italic,
        /* Host-authored arrival blurb from TravelPanel — populated
           when the host has typed into the "Getting there" field;
           otherwise undefined so the default travel section stays
           visually unchanged. */
        intro: manifest.travelInfo?.directions || undefined,
        hotels: mapped.length > 0 ? mapped : [
          { name: 'Cosmos Suites', price: '$$$', rating: 4.8, reviews: 412, dist: '8-min walk', tone: 'warm' as PhotoTone, blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.', amenities: ['Caldera view', 'Pool', 'Breakfast'] },
          { name: 'Andronis Boutique', price: '$$$$', rating: 4.9, reviews: 286, dist: '12-min walk', tone: 'lavender' as PhotoTone, blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.', amenities: ['Spa', 'Infinity pool', 'Fine dining'] },
        ],
      };
    })(),
    registry: (() => {
      const t = coTitle('registryTitle', 'Your presence is', 'the gift');
      return {
      eyebrow: co('registryEyebrow', 'Registry'),
      title: t.head,
      italic: t.italic,
      body: registryIntro || "If you'd like to celebrate further, we've put a few things together.",
      stores: registryStoresRaw && registryStoresRaw.length > 0
        ? registryStoresRaw.slice(0, 6)
        : [{ name: 'Honeymoon fund' }, { name: 'Crate & Barrel' }, { name: 'Zola' }],
      };
    })(),
    gallery: (() => {
      const t = coTitle('galleryTitle', 'A few', 'favorites');
      /* Host-uploaded gallery photos from manifest.galleryImages[].
         When set, canvas renders these instead of tone gradients. */
      const galleryPhotos = (loose.galleryImages as string[] | undefined) ?? [];
      return {
        eyebrow: co('galleryEyebrow', 'Gallery'),
        title: t.head,
        italic: t.italic,
        tones: galleryTones && galleryTones.length > 0
          ? galleryTones
          : (['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream', 'warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'] as PhotoTone[]),
        photos: galleryPhotos.length > 0 ? galleryPhotos : undefined,
      };
    })(),
    rsvp: (() => {
      const t = coTitle('rsvpTitle', isWedding ? V.rsvpTitle : 'Reply by the date', '');
      return {
      eyebrow: co('rsvpEyebrow', rsvpDeadline ? `RSVP by ${formatHeroDate(rsvpDeadline) || rsvpDeadline}` : 'RSVP by April 28'),
      title: t.head,
      body: co('rsvpBody', 'It takes about 90 seconds. Pear will follow up if anyone forgets.'),
      };
    })(),
    faq: (() => {
      const t = coTitle('faqTitle', 'The', 'little things');
      return {
      eyebrow: co('faqEyebrow', 'Questions & answers'),
      title: t.head,
      italic: t.italic,
      questions: faqsRaw.length > 0
        ? faqsRaw.slice(0, 6).map((q) => q.question ?? '').filter(Boolean)
        : [
            "What's the dress code, really?",
            'Can I bring a plus-one?',
            'Are kids welcome at the ceremony?',
            'Where should I stay in Santorini?',
          ],
      /* qa[] carries the host-authored answers (FaqPanel writes
         manifest.faqs[].answer). Variants twocol/numbered/cards
         read ctx.C.qa[i].a and fall through to placeholder when
         empty. Without this, answers were silently dropped. */
      qa: faqsRaw.length > 0
        ? faqsRaw.slice(0, 6).map((q) => ({ q: q.question ?? '', a: q.answer ?? '' }))
        : undefined,
      };
    })(),
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
