'use client';

// ─────────────────────────────────────────────────────────────
// ThemedSiteRenderer — direct port of the Editor Redesign
// prototype's themed-site.jsx, augmented with Pearloom data
// integration.
//
// This is a PARALLEL renderer to SiteV8Renderer — not a
// replacement. Sites pick which renderer via:
//   manifest.renderer === 'themed' → this component
//   anything else (default)        → SiteV8Renderer
//
// The host can flip the renderer field from the editor to
// preview their site in the prototype's exact structural style
// without losing the existing v8 site (which has months of
// features the prototype doesn't have: RSVP form, Guestbook,
// Spotify embed, photo wall moderation, day-of broadcast,
// edit-mode chrome, etc.).
//
// Goal: visible parity with the prototype's rendered output for
// the 8 core sections (hero / story / details / schedule /
// travel / registry / gallery / rsvp / faq). Each section is a
// thin Pearloom-data-aware port of the corresponding prototype
// section block, using the themed primitives (TButton / TCard /
// KDivider / TPhoto / MotifScatter) that the prototype composes.
//
// SCAFFOLD STATUS (this commit): structure + Hero block. Story
// / Details / Schedule / Travel / Registry / Gallery / RSVP /
// FAQ blocks are stubs that mark the slot — they'll be ported
// in subsequent commits.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { MotifScatter, type MotifKind } from './MotifScatter';
import { TextureFilters } from './TextureFilters';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  /** When true, sections with empty data render an editable
   *  placeholder ("Add your first chapter →") instead of
   *  returning null. Editor canvas passes true; the public site
   *  passes false / undefined so guests never see scaffolding. */
  editMode?: boolean;
}

/* Per-Edition motif kind — mirrors HeroPostcard / SiteV8Renderer
   mapping. Source of truth for which decoration each Edition
   wears. */
const EDITION_MOTIF: Record<string, MotifKind> = {
  almanac: 'pressed',
  cinema: 'none',
  'postcard-box': 'olive',
  'linen-folder': 'olive',
  quiet: 'none',
};

export function ThemedSiteRenderer({ manifest, names, siteSlug, editMode = false }: Props) {
  const [n1, n2] = names;
  const edition = manifest.edition ?? 'almanac';
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const voice = eventType?.voice ?? 'celebratory';
  const activeEdition = resolveEdition({ edition, occasion, voice });
  /* Motifs honor the Fine-tune toggle. When motifsEnabled is
     explicitly false, every section's MotifScatter receives
     'none' so no decorative shapes render. Default = true so
     existing sites are unchanged. */
  const motifsOn = manifest.motifsEnabled ?? true;
  const motif: MotifKind = motifsOn ? (EDITION_MOTIF[edition] ?? 'pressed') : 'none';
  const texture = manifest.texture ?? 'smooth';
  const density = manifest.density ?? 'comfortable';
  const intensity = manifest.textureIntensity ?? 1;

  /* Themed shell — emits the same data attributes SiteV8Renderer
     does so all the per-Edition / per-texture / per-kit CSS
     already shipped applies here too.

     CRITICAL: the activeEdition.recommendedTheme is STAMPED onto
     the root as CSS variables. Without this, every Edition
     rendered the same default cream-and-peach because the CSS
     was reading from fallbacks that never flipped. Now Cinema
     gets dark paper + gold accent, Coastal Ink gets navy + sea-
     glass, etc. Host's manifest.theme.colors WINS over the
     Edition defaults when set (per the read-time fallback
     contract). */
  const recTheme = activeEdition.recommendedTheme ?? {};
  const recColors = recTheme.colors ?? {};
  const recFonts = recTheme.fonts ?? {};
  /* Read host theme overrides — they win over the Edition. */
  const hostColors =
    ((manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors) ?? {};
  const hostFonts =
    ((manifest as unknown as { theme?: { fonts?: Record<string, string> } }).theme?.fonts) ?? {};
  /* Final values: host > Edition recommended > prototype default */
  const paper = hostColors.background ?? recColors.background ?? '#F5EFE2';
  const ink = hostColors.foreground ?? recColors.foreground ?? '#0E0D0B';
  const accent = hostColors.accent ?? recColors.accent ?? '#C6703D';
  const accentLight = hostColors.accentLight ?? recColors.accentLight ?? 'rgba(198,112,61,0.10)';
  const inkSoft = hostColors.muted ?? recColors.muted ?? '#3A332C';
  const cardBg = hostColors.cardBg ?? recColors.cardBg ?? '#FBF7EE';
  const displayFamily = hostFonts.heading ?? recFonts.heading ?? 'Fraunces';
  const bodyFamily = hostFonts.body ?? recFonts.body ?? 'Inter';
  /* Map cardRadius enum to actual px — matches the prototype's
     theme registry where each value reads as a distinct shape. */
  const cardRadiusPx = (() => {
    switch (recTheme.cardRadius) {
      case 'sharp': return '3px';
      case 'soft': return '8px';
      case 'rounded': return '14px';
      case 'pillow': return '24px';
      default: return '12px';
    }
  })();
  const displayWeight = recTheme.displayWeight ?? 600;
  const heroScale = recTheme.heroScale ?? 1;
  const eyebrowLs = recTheme.eyebrowSpacing ?? '0.22em';
  const cardShadow = recTheme.cardShadow ?? '0 4px 14px rgba(75,65,52,0.10)';

  const shellStyle: React.CSSProperties = {
    background: paper,
    color: ink,
    minHeight: '100vh',
    position: 'relative',
    fontFamily: bodyFamily,
    /* Edition-driven CSS vars — every section reads these. */
    ['--paper' as string]: paper,
    ['--ink' as string]: ink,
    ['--ink-soft' as string]: inkSoft,
    ['--ink-muted' as string]: '#6F6557',
    ['--peach-ink' as string]: accent,
    ['--peach-bg' as string]: accentLight,
    ['--card' as string]: cardBg,
    ['--cream' as string]: paper,
    ['--cream-2' as string]: cardBg,
    ['--line' as string]: 'rgba(14,13,11,0.16)',
    ['--line-soft' as string]: 'rgba(14,13,11,0.08)',
    ['--gold' as string]: '#B8935A',
    ['--font-display' as string]: `"${displayFamily}", Georgia, serif`,
    ['--font-ui' as string]: `"${bodyFamily}", system-ui, sans-serif`,
    /* Per-edition typography + chrome multipliers */
    ['--pl-display-wght' as string]: String(displayWeight),
    ['--pl-hero-scale' as string]: String(heroScale),
    ['--pl-eyebrow-ls' as string]: eyebrowLs,
    ['--pl-card-radius' as string]: cardRadiusPx,
    ['--pl-card-shadow' as string]: cardShadow,
    /* Density + texture multipliers */
    ['--pl-texture-intensity' as string]: String(intensity),
    ['--pl-density-scale' as string]: String(
      density === 'cozy' ? 0.7 : density === 'spacious' ? 1.3 : 1,
    ),
  };

  return (
    <div
      className="pl8-guest"
      data-pl-edition={activeEdition.id}
      data-pl-texture={texture}
      data-pl-density={density}
      data-pl-kit={manifest.kitId ?? 'classic'}
      data-pl-page-layout={manifest.pageLayout ?? 'classic'}
      style={shellStyle}
    >
      <TextureFilters />

      {/* Sub-nav — port of the prototype's themed-site.jsx nav.
          Sticky at top with brand left, section links center,
          RSVP pill right. Reads manifest to auto-hide links
          whose target section is empty. */}
      <ThemedNav manifest={manifest} names={[n1, n2]} />

      {/* Section stack — prototype's ThemedSite renders sections
          in event.sections order. For the scaffold pass we render
          the canonical 8 in the prototype's default order. */}
      <ThemedHero manifest={manifest} names={[n1, n2]} motif={motif} />

      {/* Section stack in the prototype's default order. Each
          section returns null when its data is empty AND we're
          not in editMode. In editMode, an editable placeholder
          renders instead so the host sees scaffolding for every
          section they could fill. */}
      <ThemedCountdown manifest={manifest} editMode={editMode} />
      <ThemedStory manifest={manifest} motif={motif} editMode={editMode} />
      {/* PullQuote removed — not in the design prototype; the
          story chapters carry the editorial rhythm on their own. */}
      <ThemedWeddingParty manifest={manifest} />
      <ThemedDetails manifest={manifest} motif={motif} editMode={editMode} />
      <ThemedSchedule manifest={manifest} editMode={editMode} />
      <ThemedMap manifest={manifest} />
      <ThemedTravel manifest={manifest} motif={motif} editMode={editMode} />
      <ThemedRegistry manifest={manifest} editMode={editMode} />
      <ThemedGallery manifest={manifest} editMode={editMode} />
      <ThemedSpotify manifest={manifest} />
      <ThemedHashtag manifest={manifest} />
      <ThemedRsvp manifest={manifest} />
      <ThemedFaq manifest={manifest} editMode={editMode} />

      <ThemedFooter siteSlug={siteSlug} names={[n1, n2]} manifest={manifest} />
    </div>
  );
}

/* ─── ThemedNav — sticky sub-nav with brand italic + dotted-
   underline section links + peach RSVP pill. The prototype shows
   all seven section links unconditionally so the page always
   reads as a complete editorial spread; we mirror that — earlier
   auto-hide was over-aggressive and left the nav empty on every
   freshly-wired site. ─── */
function ThemedNav({ manifest: _manifest, names }: { manifest: StoryManifest; names: [string, string] }) {
  const [n1, n2] = names;
  const brand = n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'Our celebration');
  const visibleLinks: Array<[string, string]> = [
    ['Story',    'our-story'],
    ['Details',  'details'],
    ['Schedule', 'schedule'],
    ['Travel',   'travel'],
    ['Registry', 'registry'],
    ['Gallery',  'gallery'],
    ['FAQ',      'faq'],
  ];
  return (
    <header
      className="pl8-themed-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--paper, #F5EFE2)',
        borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '14px 32px',
        fontSize: 12.5,
        color: 'var(--ink-soft, #3A332C)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <a
        href="#top"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 200,
          textDecoration: 'none',
        }}
      >
        <span
          className="display-italic"
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--ink, #0E0D0B)',
            letterSpacing: '-0.01em',
          }}
        >
          {brand}
        </span>
      </a>
      <nav
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 22,
          opacity: 0.95,
        }}
      >
        {visibleLinks.map(([label, anchor]: [string, string]) => (
          <a
            key={label}
            href={`#${anchor}`}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              padding: '4px 2px',
              borderBottom: '1px dotted transparent',
              transition: 'border-color 180ms ease, color 180ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)';
              e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
              e.currentTarget.style.color = '';
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <a
        href="#rsvp"
        style={{
          padding: '7px 16px',
          borderRadius: 999,
          background: 'var(--peach-ink, #C6703D)',
          color: 'var(--cream, #FBF7EE)',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textDecoration: 'none',
        }}
      >
        RSVP
      </a>
    </header>
  );
}

/* ───── EmptyStateCallout ──────────────────────────────────
   Editorial-but-clearly-scaffolding placeholder rendered in
   editMode for sections whose data is empty. Tells the host
   what would appear here and how to add it. Public site never
   sees this — it's gated on the editMode prop in each section. */
function EmptyStateCallout({
  eyebrow,
  title,
  italic,
  body,
  cta,
  background = 'var(--paper, #F5EFE2)',
  id,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  body: string;
  cta: string;
  background?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background,
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '36px 32px',
          background: 'var(--card, #FBF7EE)',
          border: '1.5px dashed var(--line, rgba(14,13,11,0.20))',
          borderRadius: 'var(--pl-card-radius, 14px)',
          textAlign: 'center',
        }}
      >
        <div
          className="eyebrow"
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 'clamp(28px, 4cqw, 38px)',
            fontWeight: 'var(--pl-display-wght, 600)',
            margin: 0,
            lineHeight: 1.04,
            letterSpacing: '-0.015em',
          }}
        >
          {title}
          {italic && (
            <>
              {' '}
              <span style={{ fontStyle: 'italic', color: 'var(--ink-soft, #3A332C)' }}>{italic}</span>
            </>
          )}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink-soft, #3A332C)',
            margin: '16px auto 22px',
            maxWidth: 460,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
        <span
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 999,
            background: 'var(--peach-bg, rgba(198,112,61,0.10))',
            color: 'var(--peach-ink, #C6703D)',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {cta} →
        </span>
      </div>
    </section>
  );
}

/* ─── ThemedHero — port of HeroBlock centered variant with the
   prototype's 3-arch photo strip below the CTAs. The arches read
   as a triptych — first three chapter photos rendered into top-
   rounded frames matching the prototype's hero. ─── */
function ThemedHero({ manifest, names, motif }: { manifest: StoryManifest; names: [string, string]; motif: MotifKind }) {
  /* Name resolution — fall back through (provided → coupleId
     split → 'Your' / 'Celebration') so a freshly-generated site
     without explicit names doesn't render with empty placeholders
     in the middle of the H1. */
  const coupleSplit = ((manifest as unknown as { coupleId?: string }).coupleId ?? '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  const n1 = (names[0] && names[0] !== 'Your' ? names[0] : (coupleSplit[0] ?? names[0] ?? 'Your'));
  const n2 = (names[1] && names[1] !== 'Partner' ? names[1] : (coupleSplit[1] ?? names[1] ?? 'Celebration'));
  const dateStr = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const place = manifest.logistics?.venueAddress ?? '';
  /* Eyebrow — host's heroKicker wins, then prototype default. */
  const heroKicker =
    (manifest as unknown as { heroKicker?: string }).heroKicker?.trim() || 'Save the date';
  /* Tagline — first sentence of poetry.heroTagline so it reads as
     a short italic line, not a paragraph. */
  const heroCopyFull =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  const tagline = heroCopyFull.split(/[.!?]\s/, 2)[0];
  /* First three photos for the arch strip — fallback to chapter
     covers. When no real photos exist, the hero falls back to
     three soft-tinted arch placeholders so the iconic 3-arch
     composition still reads. Tones pulled from the Edition's
     accent palette so the placeholders feel theme-coherent
     rather than generic gray. */
  const archPhotos = (manifest.chapters ?? [])
    .flatMap((c) => (c.images ?? []).map((i) => i.url))
    .filter((u): u is string => !!u)
    .slice(0, 3);
  /* Three tones in Edition palette — accentLight / a peach wash /
     a sage wash. When no real photos exist, the placeholder
     fills the 3-arch composition with these tone blocks. */
  const archFallbackTones: [string, string, string] = ['var(--peach-bg, rgba(198,112,61,0.18))', 'var(--peach-ink, #C6703D)', 'var(--peach-bg, rgba(198,112,61,0.10))'];

  return (
    <section
      id="top"
      style={{
        position: 'relative',
        textAlign: 'center',
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px calc(48px * var(--pl-density-scale, 1))',
        background: 'var(--section, var(--paper))',
        overflow: 'hidden',
      }}
    >
      <MotifScatter motif={motif} density="generous" />
      <div style={{ position: 'relative', maxWidth: 980, margin: '0 auto' }}>
        <div
          className="eyebrow"
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            marginBottom: 14,
          }}
        >
          {heroKicker}
        </div>
        {tagline && (
          <div
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 19,
              color: 'var(--ink-soft, #3A332C)',
              margin: '0 0 18px',
            }}
          >
            {tagline}
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 'calc(74px * var(--pl-hero-scale, 1))',
            fontWeight: 'var(--pl-display-wght, 600)',
            lineHeight: 0.96,
            margin: '0 0 22px',
            letterSpacing: '-0.02em',
          }}
        >
          {n1}
          <span
            style={{
              fontStyle: 'italic',
              fontSize: '0.74em',
              color: 'var(--ink-soft, #3A332C)',
              margin: '0 0.18em',
              fontWeight: 400,
            }}
          >
            and
          </span>
          {n2}
        </h1>
        <div
          style={{
            marginTop: 22,
            fontSize: 14,
            color: 'var(--ink-soft, #3A332C)',
            display: 'flex',
            gap: 22,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {dateStr && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="calendar" size={14} color="var(--peach-ink, #C6703D)" />
              {dateStr}
            </span>
          )}
          {venue && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="pin" size={14} color="var(--peach-ink, #C6703D)" />
              {venue}
              {place && ` · ${place}`}
            </span>
          )}
        </div>
        <div
          aria-hidden
          style={{
            marginTop: 22,
            marginInline: 'auto',
            width: 200,
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--gold, #B8935A) 50%, transparent)',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="#rsvp"
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: 'var(--ink, #0E0D0B)',
              color: 'var(--cream, #F5EFE2)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            RSVP →
          </a>
          <a
            href="#our-story"
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: 'var(--card, transparent)',
              border: '1px solid var(--line, rgba(14,13,11,0.16))',
              color: 'var(--ink, #0E0D0B)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Read our story
          </a>
        </div>
        {/* 3-arch photo triptych — the prototype's hero signature.
            Always renders so the hero's composition is preserved.
            Uses real photos when available; otherwise falls back
            to three tone-blocks from the Edition's palette so the
            arches feel theme-coherent rather than empty. */}
        <div
          style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            maxWidth: 760,
            marginInline: 'auto',
          }}
        >
          {[0, 1, 2].map((i) => {
            const url = archPhotos[i];
            return (
              <div
                key={i}
                style={{
                  aspectRatio: '3/4',
                  ...(url
                    ? {
                        backgroundImage: `url(${url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        background: archFallbackTones[i] ?? archFallbackTones[0],
                      }),
                  borderTopLeftRadius: '50% 35%',
                  borderTopRightRadius: '50% 35%',
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  boxShadow: '0 10px 28px rgba(61,74,31,0.14)',
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── ThemedStory — dispatches to a per-Kit chapter renderer.
   Same shape as the schedule dispatch — each kit gives the
   chapter list a distinct visual identity (book-spread / index-
   card / scrapbook / etc.), not just a CSS skin. ─── */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function ThemedStory({ manifest, motif, editMode }: { manifest: StoryManifest; motif: MotifKind; editMode?: boolean }) {
  const chapters = manifest.chapters ?? [];
  if (chapters.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="our-story"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="Our story"
        title="How you got"
        italic="here"
        body="Open the Story panel on the right to add chapters — how you met, the proposal, the moments that matter."
        cta="Add a chapter"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal';
  return (
    <section
      id="our-story"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Our story" title="How we got" italic="here" />
      {kit === 'ticket'    && <StoryTicket chapters={chapters} />}
      {kit === 'plate'     && <StoryPlate chapters={chapters} />}
      {kit === 'scrapbook' && <StoryScrapbook chapters={chapters} />}
      {kit === 'index'     && <StoryIndex chapters={chapters} />}
      {kit === 'minimal'   && <StoryMinimal chapters={chapters} />}
      {kit === 'classic'   && <StoryClassic chapters={chapters} />}
    </section>
  );
}

type Chapter = NonNullable<StoryManifest['chapters']>[number];

/* Classic — alternating photo-left / photo-right book spread. */
function StoryClassic({ chapters }: { chapters: Chapter[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 72, maxWidth: 1080, margin: '0 auto' }}>
      {chapters.map((c, i) => {
        const left = i % 2 === 0;
        const photo = c.images?.[0]?.url;
        const numeral = ROMAN[i] ?? String(i + 1);
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            display: 'grid', gridTemplateColumns: left ? '5fr 1fr 6fr' : '6fr 1fr 5fr',
            alignItems: 'center',
          }}>
            <div style={{ order: left ? 0 : 2 }}>
              {photo ? (
                <div style={{
                  width: '100%', aspectRatio: '4/5',
                  backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  borderRadius: 'var(--pl-card-radius, 12px)',
                  boxShadow: 'var(--pl-card-shadow, 0 14px 36px rgba(61,74,31,0.16))',
                }} />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/5',
                  background: 'var(--cream, #FBF7EE)',
                  borderRadius: 'var(--pl-card-radius, 12px)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--ink-muted, #8A8275)',
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 64, fontStyle: 'italic', opacity: 0.25,
                }}>{numeral}</div>
              )}
            </div>
            <div style={{ order: 1 }} />
            <div style={{ order: left ? 2 : 0 }}>
              <div style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 44, fontWeight: 400, color: 'var(--peach-ink, #C6703D)', opacity: 0.7, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.01em' }}>{numeral}.</div>
              {c.date && <div className="eyebrow" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 14 }}>{c.date}</div>}
              <h3 style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 42, fontWeight: 'var(--pl-display-wght, 600)', margin: 0, lineHeight: 1.02, letterSpacing: '-0.015em' }}>{c.title}</h3>
              {c.description && <p style={{ marginTop: 20, fontSize: 15.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.7 }}>{c.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Ticket — perforated stub cards in a 2-col grid, dashed border,
   monospace date, photo above body. */
function StoryTicket({ chapters }: { chapters: Chapter[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxWidth: 920, margin: '0 auto' }}>
      {chapters.map((c, i) => {
        const photo = c.images?.[0]?.url;
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            background: 'var(--card, #FBF7EE)',
            border: '1.5px dashed var(--ink-soft, #3A332C)',
            borderRadius: 6, position: 'relative', overflow: 'hidden',
          }}>
            <span aria-hidden style={{ position: 'absolute', top: 6, left: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--paper, #F5EFE2)', border: '1px solid var(--ink-soft, #3A332C)' }} />
            <span aria-hidden style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--paper, #F5EFE2)', border: '1px solid var(--ink-soft, #3A332C)' }} />
            {photo && <div style={{ width: '100%', aspectRatio: '16/9', backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1.5px dashed var(--ink-soft, #3A332C)' }} />}
            <div style={{ padding: '20px 22px' }}>
              {c.date && <div style={{ fontFamily: 'Courier New, ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: 'var(--peach-ink, #C6703D)', letterSpacing: '0.04em', marginBottom: 8, textTransform: 'uppercase' }}>{c.date}</div>}
              <h3 style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.1 }}>{c.title}</h3>
              {c.description && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55 }}>{c.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Plate — vertical Roman-numeral list, photo as a small inset
   square on the left, italic display name, hairline separator. */
function StoryPlate({ chapters }: { chapters: Chapter[] }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {chapters.map((c, i) => {
        const photo = c.images?.[0]?.url;
        const numeral = ROMAN[i] ?? String(i + 1);
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            display: 'grid', gridTemplateColumns: '60px 96px 1fr',
            alignItems: 'center', gap: 20,
            paddingBottom: 24, borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          }}>
            <span style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontStyle: 'italic', fontWeight: 400, fontSize: 38,
              color: 'var(--peach-ink, #C6703D)', textAlign: 'right',
              lineHeight: 1,
            }}>{numeral}.</span>
            <div style={{ width: 96, aspectRatio: '1/1', background: photo ? `center/cover no-repeat url(${photo})` : 'var(--cream, #FBF7EE)', borderRadius: 2, boxShadow: 'inset 0 0 0 1px rgba(14,13,11,0.20), inset 0 0 0 4px var(--card, #FBF7EE), inset 0 0 0 5px rgba(14,13,11,0.10)' }} />
            <div>
              {c.date && <div className="eyebrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 6 }}>{c.date}</div>}
              <h3 style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 500, margin: 0, lineHeight: 1.1, color: 'var(--ink, #0E0D0B)' }}>{c.title}</h3>
              {c.description && <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55 }}>{c.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Scrapbook — tilted polaroid cards in a masonry grid with tape
   strips. Photo on top, handwritten-feel title underneath. */
function StoryScrapbook({ chapters }: { chapters: Chapter[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 26, maxWidth: 960, margin: '0 auto' }}>
      {chapters.map((c, i) => {
        const photo = c.images?.[0]?.url;
        const tilt = i % 2 === 0 ? -1.6 : 1.6;
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            background: '#FFFDF7', padding: '12px 12px 22px',
            boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
            borderRadius: 2, position: 'relative',
            transform: `rotate(${tilt}deg)`,
          }}>
            <span aria-hidden style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: 70, height: 16, background: 'color-mix(in oklab, var(--gold, #B8935A) 32%, transparent)' }} />
            {photo && <div style={{ width: '100%', aspectRatio: '4/3', backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ paddingTop: 14, textAlign: 'center' }}>
              {c.date && <div style={{ fontFamily: 'var(--font-display, Caveat, cursive)', fontStyle: 'italic', fontSize: 16, color: 'var(--peach-ink, #C6703D)' }}>{c.date}</div>}
              <h3 style={{ fontFamily: 'var(--font-display, Caveat, cursive)', fontStyle: 'italic', fontSize: 26, fontWeight: 500, margin: '4px 0 0', color: 'var(--ink, #0E0D0B)', lineHeight: 1.1 }}>{c.title}</h3>
              {c.description && <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.5, padding: '0 8px' }}>{c.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Index — ruled index cards, red left margin, blue rule lines,
   numbered date in monospace. */
function StoryIndex({ chapters }: { chapters: Chapter[] }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {chapters.map((c, i) => (
        <div key={c.id ?? i} className="pl8-chapter-row" style={{
          padding: '20px 24px',
          background: 'var(--card, #FBF7EE)',
          borderLeft: '2px solid rgba(199,80,80,0.55)',
          backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 22px, rgba(74,118,196,0.10) 22px 23px)',
          borderRadius: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Courier New, ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: 'var(--ink, #0E0D0B)', minWidth: 36 }}>№{String(i + 1).padStart(2, '0')}</span>
            {c.date && <span style={{ fontFamily: 'Courier New, ui-monospace, monospace', fontSize: 12, color: 'var(--ink-muted, #6F6557)' }}>{c.date}</span>}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.15 }}>{c.title}</h3>
          {c.description && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.65 }}>{c.description}</p>}
        </div>
      ))}
    </div>
  );
}

/* Minimal — oversized numeral + title only, hairline dividers,
   no photos in card. */
function StoryMinimal({ chapters }: { chapters: Chapter[] }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
      {chapters.map((c, i) => (
        <div key={c.id ?? i} className="pl8-chapter-row" style={{
          display: 'grid', gridTemplateColumns: '90px 1fr',
          alignItems: 'baseline', gap: 28,
          paddingBottom: 40,
          borderBottom: i === chapters.length - 1 ? 'none' : '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        }}>
          <span style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 56, fontWeight: 600,
            color: 'var(--ink, #0E0D0B)', lineHeight: 0.92, letterSpacing: '-0.04em',
          }}>{String(i + 1).padStart(2, '0')}</span>
          <div style={{ paddingTop: 8 }}>
            {c.date && <div className="eyebrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 10 }}>{c.date}</div>}
            <h3 style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.1 }}>{c.title}</h3>
            {c.description && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.6 }}>{c.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── ThemedSectionHead — shared centered header (TSectionHead) ─── */
function ThemedSectionHead({ eyebrow, title, italic }: { eyebrow: string; title: string; italic?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
      <div
        className="eyebrow"
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.18em)',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontSize: 'clamp(34px, 5cqw, 52px)',
          fontWeight: 'var(--pl-display-wght, 600)',
          margin: 0,
          lineHeight: 1.04,
        }}
      >
        {title}
        {italic && (
          <>
            {' '}
            <span style={{ fontStyle: 'italic', color: 'var(--ink-soft, #3A332C)' }}>{italic}</span>
          </>
        )}
      </h2>
    </div>
  );
}

/* ─── ThemedDetails — larger feature cards. Each card centers a
   sage-tint icon disc, a small eyebrow label, and the value in
   display font. The icon disc gives each card identity at a
   glance; the grid is tighter (3 cols on wide) so the cards feel
   like a magazine info-graphic, not a tight grid. ─── */
type DetailItem = { icon: string; label: string; value: string; sub?: string };

function ThemedDetails({ manifest, motif, editMode }: { manifest: StoryManifest; motif: MotifKind; editMode?: boolean }) {
  const l = manifest.logistics ?? {};
  const dresscode = l.dresscode;
  const items: DetailItem[] = [];
  if (dresscode) items.push({ icon: 'sparkles', label: 'Dress code', value: dresscode });
  if ((l as { kids?: string }).kids) items.push({ icon: 'users', label: 'Kids', value: String((l as { kids?: string }).kids) });
  if ((manifest as unknown as { registry?: { message?: string } }).registry?.message) {
    items.push({ icon: 'gift', label: 'Gifts', value: (manifest as unknown as { registry?: { message?: string } }).registry?.message ?? '' });
  }
  if ((l as { parking?: string }).parking) items.push({ icon: 'pin', label: 'Parking', value: String((l as { parking?: string }).parking) });
  if (items.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="details"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="What you need to know"
        title="The day,"
        italic="in details"
        body="Dress code · kids · parking · gifts. Open the Details panel to fill in what guests should know before the day."
        cta="Add details"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal';
  return (
    <section
      id="details"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="What you need to know" title="The day," italic="in details" />
      {kit === 'ticket'    && <DetailsTicket items={items} />}
      {kit === 'plate'     && <DetailsPlate items={items} />}
      {kit === 'scrapbook' && <DetailsScrapbook items={items} />}
      {kit === 'index'     && <DetailsIndex items={items} />}
      {kit === 'minimal'   && <DetailsMinimal items={items} />}
      {kit === 'classic'   && <DetailsClassic items={items} />}
    </section>
  );
}

/* DetailsClassic — tile grid. Port of KDetails default branch. */
function DetailsClassic({ items }: { items: DetailItem[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
        gap: 16,
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            ...kitCardStyle('classic', i),
            padding: 20,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--peach-bg, rgba(198,112,61,0.10))',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 12,
            }}
          >
            <Icon name={d.icon} size={18} color="var(--peach-ink, #C6703D)" />
          </div>
          <div
            className="eyebrow"
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              marginBottom: 4,
            }}
          >
            {d.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 20,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {d.value}
          </div>
          {d.sub && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginTop: 3 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* DetailsTicket — single dashed-bordered row spanning the page,
   each item a column separated by dashed verticals. Prototype's
   KDetails ticket branch. */
function DetailsTicket({ items }: { items: DetailItem[] }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        background: 'var(--card, #FBF7EE)',
        border: '1.5px dashed var(--ink-soft, rgba(14,13,11,0.30))',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            padding: '18px 14px',
            textAlign: 'center',
            borderRight: i < items.length - 1 ? '2px dashed var(--ink-soft, rgba(14,13,11,0.30))' : 'none',
          }}
        >
          <Icon name={d.icon} size={17} color="var(--peach-ink, #C6703D)" />
          <div
            style={{
              fontFamily: 'Courier New, ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              margin: '8px 0 3px',
            }}
          >
            {d.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 18,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {d.value}
          </div>
          {d.sub && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* DetailsPlate — vertical "dotted leader" list. Each row is
   label LEFT (uppercase eyebrow) + dotted leader stretching to
   value RIGHT (display font right-aligned). Prototype's
   KDetails plate branch. */
function DetailsPlate({ items }: { items: DetailItem[] }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '15px 4px',
            borderBottom:
              i < items.length - 1
                ? '1px solid var(--line-soft, rgba(14,13,11,0.10))'
                : 'none',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              minWidth: 96,
            }}
          >
            {d.label}
          </span>
          <span
            aria-hidden
            style={{
              flex: 1,
              borderBottom: '1px dotted var(--line-soft, rgba(14,13,11,0.20))',
              transform: 'translateY(-4px)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 18,
              textAlign: 'right',
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {d.value}
            {d.sub && (
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-ui, Inter, sans-serif)',
                  fontWeight: 400,
                  fontSize: 12,
                  color: 'var(--ink-muted, #6F6557)',
                }}
              >
                {d.sub}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* DetailsScrapbook — tilted polaroid mini-cards arranged in a
   flex-wrap row. Tape strip above each, script-font label, then
   display-font value. Prototype's KDetails scrapbook branch. */
function DetailsScrapbook({ items }: { items: DetailItem[] }) {
  const tilts = [-2.5, 1.8, -1.2, 2.4];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 8 }}>
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            width: 168,
            position: 'relative',
            background: '#fffdf7',
            boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
            borderRadius: 2,
            padding: '20px 16px 16px',
            transform: `rotate(${tilts[i % 4]}deg)`,
            marginTop: i % 2 ? 14 : 0,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              transform: 'translateX(-50%) rotate(-4deg)',
              width: 48,
              height: 16,
              background: 'color-mix(in oklab, var(--peach-ink, #C6703D) 32%, transparent)',
            }}
          />
          <Icon name={d.icon} size={18} color="var(--peach-ink, #C6703D)" />
          <div
            style={{
              fontFamily: 'var(--font-script, Caveat, cursive)',
              fontSize: 20,
              color: 'var(--peach-ink, #C6703D)',
              marginTop: 6,
            }}
          >
            {d.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 18,
              marginTop: 2,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {d.value}
          </div>
          {d.sub && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* DetailsIndex — ruled index cards with red-margin + blue rule
   lines. Icon left, mono-uppercase label, then value + subtitle
   inline. Prototype's KDetails index branch. */
function DetailsIndex({ items }: { items: DetailItem[] }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((d) => (
        <div
          key={d.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--card, #FBF7EE)',
            borderRadius: 2,
            borderLeft: '2px solid rgba(199,80,80,0.55)',
            padding: '14px 18px',
            backgroundImage:
              'repeating-linear-gradient(180deg, transparent 0 20px, rgba(74,118,196,0.10) 20px 21px)',
          }}
        >
          <Icon name={d.icon} size={18} color="var(--peach-ink, #C6703D)" />
          <div
            style={{
              minWidth: 96,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
            }}
          >
            {d.label}
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 18,
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              {d.value}
            </span>
            {d.sub && (
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginLeft: 8 }}>
                {d.sub}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* DetailsMinimal — borderless columns separated by hairline
   verticals. Big display-font values centered. Prototype's
   KDetails minimal branch. */
function DetailsMinimal({ items }: { items: DetailItem[] }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            padding: '4px 22px',
            borderLeft: i ? '1px solid var(--line-soft, rgba(14,13,11,0.10))' : 'none',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              marginBottom: 8,
            }}
          >
            {d.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 26,
              lineHeight: 1.05,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {d.value}
          </div>
          {d.sub && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted, #6F6557)', marginTop: 6 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── ThemedSchedule — dispatches to a per-Kit renderer.
   Each kit gives Schedule a fundamentally different structure
   (not just a CSS skin on the same row layout):

     classic    — vertical timeline, peach dot on hairline rule
     ticket     — perforated stub grid (2-col, monospace times,
                  pinhole dots on the corners)
     plate      — vertical Roman-numeral list with dotted leaders
                  reaching to a right-aligned time column
     scrapbook  — masonry of tilted polaroid cards
     index      — ruled red-margin index cards
     minimal    — big oversized numeral + name list, no chrome ─── */
function ThemedSchedule({ manifest, editMode }: { manifest: StoryManifest; editMode?: boolean }) {
  const events = manifest.events ?? [];
  if (events.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="schedule"
        eyebrow="The day"
        title="In"
        italic="moments"
        body="Ceremony · cocktails · dinner · dancing. Open the Schedule panel to add your run of show."
        cta="Add an event"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal';
  return (
    <section
      id="schedule"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="The day" title="In" italic="moments" />
      {kit === 'ticket'    && <ScheduleTicket events={events} />}
      {kit === 'plate'     && <SchedulePlate events={events} />}
      {kit === 'scrapbook' && <ScheduleScrapbook events={events} />}
      {kit === 'index'     && <ScheduleIndex events={events} />}
      {kit === 'minimal'   && <ScheduleMinimal events={events} />}
      {kit === 'classic'   && <ScheduleClassic events={events} />}
    </section>
  );
}

type ScheduleEvent = NonNullable<StoryManifest['events']>[number];

/* Split "4:00 PM" / "16:00" into {t, m} per the prototype's
   schema. The prototype uses .t = "4:00" + .m = "PM" so the
   meridian renders at a smaller size next to the time. Falls
   back gracefully on already-split or 24h values. */
function splitTime(raw: string | undefined | null): { t: string; m: string } {
  if (!raw) return { t: '', m: '' };
  const m = raw.match(/^(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?$/);
  if (m) return { t: m[1], m: (m[2] ?? '').toUpperCase() };
  return { t: raw, m: '' };
}

function ScheduleClassic({ events }: { events: ScheduleEvent[] }) {
  /* Prototype's KSchedule 'list' variant — `92px 1fr` grid with
     display time + AM/PM eyebrow on the left, bold name + muted
     subtitle on the right, hairline border-bottom between rows. */
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '92px 1fr',
              gap: 18,
              alignItems: 'baseline',
              padding: '16px 0',
              borderBottom: i < events.length - 1 ? '1px solid var(--line-soft, rgba(14,13,11,0.08))' : 'none',
            }}
          >
            <div
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 24,
                color: 'var(--peach-ink, #C6703D)',
              }}
            >
              {t}
              {m && (
                <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>{e.name}</div>
              {e.description && (
                <div style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                  {e.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTicket({ events }: { events: ScheduleEvent[] }) {
  /* Prototype's KSchedule ticket — single-column stack of perforated
     stubs. Each row is a 2-col grid with the time block stamped on
     the left (mono, dashed border-right as perforation) and the
     event detail on the right. Pinhole dots sit ON the perforation
     line, top and bottom, in the section paper color so they read
     as punched-through holes. */
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '116px 1fr',
              background: 'var(--card, #FBF7EE)',
              border: '1.5px dashed var(--ink-soft, rgba(14,13,11,0.30))',
              borderRadius: 7,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 10px',
                textAlign: 'center',
                borderRight: '2px dashed var(--ink-soft, rgba(14,13,11,0.30))',
                fontFamily: 'Courier New, ui-monospace, monospace',
              }}
            >
              <div className="pl8-schedule-time" style={{ fontSize: 21, fontWeight: 700, color: 'var(--peach-ink, #C6703D)' }}>
                {t}
              </div>
              {m && (
                <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>{e.name}</div>
              {e.description && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                  {e.description}
                </div>
              )}
            </div>
            {/* Pinholes on the perforation line, punched through to the
                section background. */}
            <span aria-hidden style={{ position: 'absolute', left: 110, top: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--cream-2, #EBE3D2)' }} />
            <span aria-hidden style={{ position: 'absolute', left: 110, bottom: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--cream-2, #EBE3D2)' }} />
          </div>
        );
      })}
    </div>
  );
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function SchedulePlate({ events }: { events: ScheduleEvent[] }) {
  /* Prototype's KSchedule plate — three-column row:
     italic Roman numeral · name + inline " — subtitle" · display
     time + AM/PM. Single hairline border between rows. */
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr auto',
              alignItems: 'baseline',
              gap: 16,
              padding: '16px 4px',
              borderBottom:
                i < events.length - 1
                  ? '1px solid var(--line-soft, rgba(14,13,11,0.10))'
                  : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 20,
                color: 'var(--peach-ink, #C6703D)',
                fontStyle: 'italic',
              }}
            >
              {ROMAN_NUMERALS[i] ?? String(i + 1)}
            </span>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>
                {e.name}
              </span>
              {e.description && (
                <span style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)' }}>
                  {' — '}
                  {e.description}
                </span>
              )}
            </div>
            <span
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 18,
                letterSpacing: '0.02em',
                color: 'var(--ink, #0E0D0B)',
                whiteSpace: 'nowrap',
              }}
            >
              {t}
              {m && (
                <span style={{ fontSize: 11, marginLeft: 2, color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleScrapbook({ events }: { events: ScheduleEvent[] }) {
  /* Prototype's KSchedule scrapbook — `repeat(N, 1fr)` grid up to
     4 columns of tilted polaroids. Tape strip above each card
     (translateY beyond the top edge). Time in script font centered
     at the top of the card content. */
  const cols = Math.min(events.length, 4);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 18,
        maxWidth: 880,
        margin: '0 auto',
        paddingTop: 8,
      }}
    >
      {events.map((e, i) => {
        const { t } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              background: '#fffdf7',
              boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
              borderRadius: 2,
              padding: '20px 14px 16px',
              textAlign: 'center',
              transform: `rotate(${i % 2 ? 1.6 : -1.6}deg)`,
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: -9,
                left: '50%',
                transform: 'translateX(-50%) rotate(-4deg)',
                width: 50,
                height: 16,
                background: 'color-mix(in oklab, var(--peach-ink, #C6703D) 32%, transparent)',
              }}
            />
            <div
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-script, Caveat, cursive)',
                fontSize: 30,
                color: 'var(--peach-ink, #C6703D)',
                lineHeight: 1,
              }}
            >
              {t}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: 'var(--ink, #0E0D0B)' }}>
              {e.name}
            </div>
            {e.description && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                {e.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleIndex({ events }: { events: ScheduleEvent[] }) {
  /* Prototype's KSchedule index — black mono time TAB on the
     left edge (positioned absolute, projects out of the card),
     red left border + blue rule lines as the card bg, content
     offset right to clear the tab. */
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              background: 'var(--card, #FBF7EE)',
              borderRadius: 2,
              borderLeft: '2px solid rgba(199,80,80,0.55)',
              padding: '14px 16px 14px 64px',
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0 21px, rgba(74,118,196,0.10) 21px 22px)',
            }}
          >
            <div
              className="pl8-schedule-time"
              style={{
                position: 'absolute',
                left: 0,
                top: 12,
                padding: '3px 8px',
                background: 'var(--peach-ink, #C6703D)',
                color: 'var(--paper, #F5EFE2)',
                fontFamily: 'Courier New, ui-monospace, monospace',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: '0 4px 4px 0',
              }}
            >
              {t}
              {m}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>{e.name}</div>
            {e.description && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                {e.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleMinimal({ events }: { events: ScheduleEvent[] }) {
  /* Prototype's KSchedule minimal — `auto 1fr` grid, 38px display
     time on the LEFT (line-height 0.9 so it sits tight), content
     RIGHT-ALIGNED on the right with the name + subtitle. Hairline
     border between rows. */
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 22,
              alignItems: 'baseline',
              padding: '20px 0',
              borderBottom:
                i < events.length - 1
                  ? '1px solid var(--line-soft, rgba(14,13,11,0.10))'
                  : 'none',
            }}
          >
            <span
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 38,
                lineHeight: 0.9,
                letterSpacing: '-0.03em',
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              {t}
              {m && (
                <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </span>
              )}
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>{e.name}</div>
              {e.description && (
                <div style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                  {e.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Per-kit card chrome helper. Returns the row container
   style (background, border, radius, shadow, transform) for the
   active kit so Travel + other small-card sections share the
   same visual identity as Schedule/Story/FAQ without each one
   duplicating a 5-case switch. ─── */
function kitCardStyle(kit: string, index = 0): React.CSSProperties {
  switch (kit) {
    case 'ticket':
      return { background: 'var(--card, #FBF7EE)', border: '1.5px dashed var(--ink-soft, #3A332C)', borderRadius: 6, position: 'relative' };
    case 'plate':
      return { background: 'var(--card, #FBF7EE)', borderRadius: 1, boxShadow: 'inset 0 0 0 1px rgba(14,13,11,0.30), inset 0 0 0 4px var(--card, #FBF7EE), inset 0 0 0 5px rgba(14,13,11,0.15)', border: 'none' };
    case 'scrapbook':
      return { background: '#FFFDF7', boxShadow: '0 12px 26px rgba(0,0,0,0.14)', borderRadius: 2, transform: `rotate(${index % 2 === 0 ? -1.2 : 1.2}deg)`, border: 'none' };
    case 'index':
      return { background: 'var(--card, #FBF7EE)', borderLeft: '2px solid rgba(199,80,80,0.55)', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 21px, rgba(74,118,196,0.10) 21px 22px)', borderRadius: 2, border: 'none' };
    case 'minimal':
      return { background: 'transparent', border: 'none', borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))', borderRadius: 0, padding: '20px 0 0' };
    default:
      return { background: 'var(--card, #FBF7EE)', borderRadius: 'var(--pl-card-radius, 14px)', border: '1px solid var(--line-soft, rgba(14,13,11,0.08))', boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))' };
  }
}

/* ─── ThemedTravel — editorial hotel listing. Card chrome
   inherits from the active Kit via kitCardStyle so a "scrapbook"
   site has tilted polaroid hotels and a "ticket" site has
   perforated stubs — same as schedule. ─── */
function ThemedTravel({ manifest, motif, editMode }: { manifest: StoryManifest; motif: MotifKind; editMode?: boolean }) {
  const hotels = manifest.travelInfo?.hotels ?? [];
  if (hotels.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="travel"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="Getting there"
        title="Where to"
        italic="stay"
        body="Drop in hotels, group rates, transit notes. Pear can suggest places near your venue."
        cta="Add a hotel"
      />
    );
  }
  const kit = manifest.kitId ?? 'classic';
  return (
    <section
      id="travel"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Getting there" title="Where to" italic="stay" />
      {/* Port of prototype's TravelBlock (themed-site.jsx ~line
          389): 2-col grid, each card 14px padding flex layout
          with an 84px-square photo placeholder + content block.
          Photo placeholder uses a tone wash so each hotel reads
          visually distinct even without a real image. Booking
          CTA is INLINE (Book ↗) not a pill. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          maxWidth: 780,
          margin: '0 auto',
        }}
      >
        {hotels.map((h, i) => {
          const distance = (h as unknown as { distance?: string }).distance;
          const photoUrl = (h as unknown as { photoUrl?: string }).photoUrl;
          // Tone block fallback when no photo — cycles through the
          // edition's accent tones so each card is distinct.
          const tonePalette = [
            'var(--peach-bg, rgba(198,112,61,0.18))',
            'color-mix(in oklab, var(--peach-ink, #C6703D) 12%, var(--paper, #F5EFE2))',
            'color-mix(in oklab, var(--peach-ink, #C6703D) 22%, var(--paper, #F5EFE2))',
          ];
          return (
            <div
              key={i}
              className="pl8-hotel-row"
              style={{
                ...kitCardStyle(kit, i),
                padding: 14,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              {/* Photo placeholder square — 84x84 with rounded
                  corners. Real photo when manifest provides one,
                  tone block otherwise. */}
              <div
                style={{
                  width: 84,
                  height: 84,
                  flexShrink: 0,
                  borderRadius: 'var(--pl-card-radius, 8px)',
                  ...(photoUrl
                    ? {
                        backgroundImage: `url(${photoUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        background: tonePalette[i % tonePalette.length],
                      }),
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontWeight: 'var(--pl-display-wght, 600)',
                    fontSize: 19,
                    color: 'var(--ink, #0E0D0B)',
                    lineHeight: 1.15,
                  }}
                >
                  {h.name}
                </div>
                {(distance || h.address) && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink-muted, #6F6557)',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {distance ?? h.address}
                  </div>
                )}
                {h.bookingUrl && (
                  <a
                    href={h.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 9,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--peach-ink, #C6703D)',
                      textDecoration: 'none',
                    }}
                  >
                    Book <Icon name="arrow-ur" size={11} color="var(--peach-ink, #C6703D)" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── ThemedRegistry — elegant card row. Each registry entry is
   a substantial card with a peach-tint gift glyph at the top,
   the registry name in display font, and an "Open ↗" pill. The
   message reads as the section's body copy in italic above the
   row. ─── */
function ThemedRegistry({ manifest, editMode }: { manifest: StoryManifest; editMode?: boolean }) {
  const reg = (manifest as unknown as { registry?: { entries?: Array<{ name?: string; label?: string; url: string }>; message?: string } }).registry;
  const entries = reg?.entries ?? [];
  if (entries.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="registry"
        eyebrow="If you're asking"
        title="Registry,"
        italic="gently"
        body="Paste links to your registry, or set up a cash fund. Pear will format the cards in your theme."
        cta="Link a registry"
      />
    );
  }
  return (
    <section
      id="registry"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="If you're asking" title="Registry," italic="gently" />
      {reg?.message && (
        <div
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--ink-soft, #3A332C)',
            maxWidth: 560,
            margin: '0 auto 32px',
            lineHeight: 1.55,
          }}
        >
          {reg.message}
        </div>
      )}
      {/* Registry chips — port of prototype's RegistryBlock (themed-
          site.jsx ~line 412). Each entry is a small KChip-shaped
          row, NOT a substantial card; the prototype's intent is
          that the registry sits as a quiet footnote at the bottom
          of the site, not as a hero feature. Per-kit treatment
          inherits via kitCardStyle for chrome consistency. */}
      <div
        className="pl8-registry-chips"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {entries.map((e, i) => (
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...kitCardStyle(manifest.kitId ?? 'classic', i),
              padding: '11px 18px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            <span>{e.name ?? e.label ?? 'Registry'}</span>
            <Icon name="arrow-ur" size={11} color="var(--peach-ink, #C6703D)" />
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── ThemedGallery — staggered editorial mosaic. The grid uses
   row spans to create a "wall of polaroids" feel — every fourth
   tile spans 2 rows so the wall reads as natural rather than
   uniform. Tones fall back when no photo URL exists so the grid
   still reads. ─── */
function ThemedGallery({ manifest, editMode }: { manifest: StoryManifest; editMode?: boolean }) {
  const photos = manifest.chapters?.flatMap((c) => (c.images ?? []).map((i) => i.url)) ?? [];
  if (photos.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="gallery"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="Along the way"
        title="A few"
        italic="favorites"
        body="Photos from your chapters land here automatically — or upload to the Gallery panel for a curated mosaic."
        cta="Add photos"
      />
    );
  }
  const tones = ['#E8C8B4', '#D8CFB8', '#C4B5D9', '#F4D5CD', '#F0C9A8', '#FBE8D6'];
  return (
    <section
      id="gallery"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="Along the way" title="A few" italic="favorites" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: '130px',
          gap: 10,
          maxWidth: 940,
          margin: '0 auto',
        }}
      >
        {photos.slice(0, 11).map((url, i) => {
          /* Every 3rd tile spans 2 rows; every 5th spans 2 columns.
             Pattern repeats so any-length gallery has visual rhythm. */
          const tallSpan = i % 5 === 0 || i % 5 === 3;
          const wideSpan = i % 7 === 2;
          return (
            <div
              key={i}
              style={{
                gridRow: tallSpan ? 'span 2' : 'span 1',
                gridColumn: wideSpan ? 'span 2' : 'span 1',
                backgroundImage: url ? `url(${url})` : 'none',
                backgroundColor: tones[i % tones.length],
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 'var(--pl-card-radius, 10px)',
                boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))',
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ─── ThemedRsvp — dark CTA section with a cream form-card
   preview inset. The card mocks two minimal fields (name +
   attending pills) so the section looks like a real reply
   surface, not a flat button. Form is presentational — the
   primary action goes to the actual /g/[token] flow. ─── */
function ThemedRsvp({ manifest }: { manifest: StoryManifest }) {
  const deadline = manifest.logistics?.rsvpDeadline;
  return (
    <section
      id="rsvp"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--ink, #0E0D0B)',
        color: 'var(--cream, #F5EFE2)',
        position: 'relative',
      }}
    >
      <div
        className="eyebrow"
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
          textTransform: 'uppercase',
          color: 'rgba(245,239,226,0.55)',
          marginBottom: 12,
        }}
      >
        {deadline ? `RSVP by ${deadline}` : 'RSVP'}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontSize: 'clamp(38px, 5.5cqw, 52px)',
          fontWeight: 'var(--pl-display-wght, 600)',
          margin: '0 0 8px',
          color: 'var(--cream, #F5EFE2)',
          lineHeight: 1.02,
          letterSpacing: '-0.015em',
        }}
      >
        Save your <span style={{ fontStyle: 'italic', opacity: 0.85 }}>seat</span>
      </h2>
      <div
        style={{
          fontSize: 14,
          opacity: 0.7,
          marginBottom: 32,
          fontStyle: 'italic',
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
        }}
      >
        Ninety seconds. We&apos;ll follow up if anyone forgets.
      </div>
      {/* Form-card preview — sits inset on the dark band so the
          section reads as a real reply surface. */}
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          background: 'rgba(245,239,226,0.06)',
          border: '1px solid rgba(245,239,226,0.14)',
          borderRadius: 'var(--pl-card-radius, 14px)',
          padding: '24px 22px',
          textAlign: 'left',
        }}
      >
        <div
          className="eyebrow"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'rgba(245,239,226,0.55)',
            marginBottom: 6,
          }}
        >
          Your name
        </div>
        <div
          style={{
            padding: '11px 14px',
            background: 'rgba(245,239,226,0.04)',
            border: '1px solid rgba(245,239,226,0.12)',
            borderRadius: 8,
            fontSize: 13,
            color: 'rgba(245,239,226,0.45)',
            marginBottom: 18,
          }}
        >
          Type your full name…
        </div>
        <div
          className="eyebrow"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'rgba(245,239,226,0.55)',
            marginBottom: 8,
          }}
        >
          Will you be there
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Joyfully yes', 'Sadly no', 'Maybe'].map((label, i) => (
            <span
              key={label}
              style={{
                flex: 1,
                padding: '10px 0',
                textAlign: 'center',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 8,
                background: i === 0 ? 'var(--peach-ink, #C6703D)' : 'rgba(245,239,226,0.04)',
                color: i === 0 ? 'var(--cream, #FBF7EE)' : 'rgba(245,239,226,0.7)',
                border: i === 0 ? 'none' : '1px solid rgba(245,239,226,0.12)',
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <a
          href="#"
          style={{
            display: 'block',
            marginTop: 22,
            padding: '12px 0',
            textAlign: 'center',
            borderRadius: 999,
            background: 'var(--cream, #F5EFE2)',
            color: 'var(--ink, #0E0D0B)',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          Send your reply →
        </a>
      </div>
    </section>
  );
}

/* ─── ThemedFaq — dispatches to a per-Kit FAQ renderer. Each kit
   keeps the <details>/<summary> contract for accessibility and
   click behaviour but shapes the surrounding card distinctly. */
type FaqItem = NonNullable<StoryManifest['faqs']>[number];
function ThemedFaq({ manifest, editMode }: { manifest: StoryManifest; editMode?: boolean }) {
  const faq = manifest.faqs ?? [];
  if (faq.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="faq"
        eyebrow="Good to know"
        title="The little"
        italic="things"
        body="Open the FAQ panel to add the questions guests will ask. Pear can suggest 6 based on your event."
        cta="Add a question"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal';
  return (
    <section
      id="faq"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="Good to know" title="The little" italic="things" />
      <FaqList faq={faq} kit={kit} />
    </section>
  );
}

function FaqList({ faq, kit }: { faq: FaqItem[]; kit: string }) {
  /* Per-kit container + row styling. Summary/answer markup stays
     constant — only the chrome (background, border, numeral style,
     numeral color) varies. */
  const containerStyle: React.CSSProperties = (() => {
    switch (kit) {
      case 'ticket':    return { maxWidth: 720, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 };
      case 'minimal':   return { maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 };
      default:          return { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720, margin: '0 auto' };
    }
  })();
  return (
    <div style={containerStyle}>
      {faq.map((item, i) => (
        <FaqRow key={item.id ?? i} item={item} index={i} kit={kit} totalCount={faq.length} />
      ))}
    </div>
  );
}

function FaqRow({ item, index, kit, totalCount }: { item: FaqItem; index: number; kit: string; totalCount: number }) {
  /* Per-kit chrome + numeral pattern matches prototype's KFaq.
     The prototype's plate + minimal show a numeral; the other
     kits (ticket / scrapbook / index / classic) show just the
     question + chev with KCard-style chrome around the row. */

  const isPlate = kit === 'plate';
  const isMinimal = kit === 'minimal';

  // Wrapper chrome — for plate + minimal, hairline border between
  // rows; for other kits, kitCardStyle chrome.
  const wrapStyle: React.CSSProperties = isPlate
    ? {
        display: 'flex',
        gap: 16,
        alignItems: 'baseline',
        padding: '16px 4px',
        borderBottom: index < totalCount - 1 ? '1px solid var(--line-soft, rgba(14,13,11,0.10))' : 'none',
      }
    : isMinimal
      ? {
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 18,
          alignItems: 'baseline',
          padding: '18px 0',
          borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        }
      : {
          ...kitCardStyle(kit, index),
          padding: '14px 18px',
        };

  // Numeral content/style per kit (only plate + minimal render
  // a numeral per the prototype).
  let numeral: React.ReactNode = null;
  if (isPlate) {
    numeral = (
      <span
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontWeight: 'var(--pl-display-wght, 600)',
          fontSize: 18,
          color: 'var(--peach-ink, #C6703D)',
          minWidth: 28,
        }}
      >
        {ROMAN_NUMERALS[index] ?? String(index + 1)}
      </span>
    );
  } else if (isMinimal) {
    numeral = (
      <span
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontWeight: 'var(--pl-display-wght, 600)',
          fontSize: 24,
          color: 'var(--ink-muted, #6F6557)',
          minWidth: 40,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
    );
  }

  return (
    <details className="pl8-faq-row" style={wrapStyle}>
      <summary
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink, #0E0D0B)',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          gap: 14,
          alignItems: 'baseline',
          flex: 1,
          width: '100%',
        }}
      >
        {numeral}
        <span style={{ flex: 1, lineHeight: 1.35, fontSize: isPlate || isMinimal ? 15 : 14 }}>
          {item.question}
        </span>
        <Icon name="chev-down" size={14} color="var(--ink-muted, #6F6557)" />
      </summary>
      {item.answer && (
        <p
          style={{
            marginTop: 12,
            marginLeft: isMinimal ? 58 : isPlate ? 44 : 0,
            fontSize: 13.5,
            color: 'var(--ink-soft, #3A332C)',
            lineHeight: 1.65,
          }}
        >
          {item.answer}
        </p>
      )}
    </details>
  );
}

/* ─── ThemedCountdown — big-number countdown to the event date.
   Reads manifest.logistics.date. Shows 4 cells (days / hours /
   minutes / seconds) in display font with mono numerals,
   eyebrow labels beneath. The math is client-side (so SSR
   renders a stable placeholder then ticks once mounted). ─── */
function ThemedCountdown({ manifest, editMode }: { manifest: StoryManifest; editMode?: boolean }) {
  const dateStr = manifest.logistics?.date;
  if (!dateStr) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="countdown"
        eyebrow="Until the day"
        title="Pick a"
        italic="date"
        body="Set the event date in the Hero panel — the countdown updates automatically."
        cta="Set the date"
      />
    );
  }
  const target = new Date(dateStr).getTime();
  if (!Number.isFinite(target)) return null;
  return <CountdownTimer target={target} />;
}

/* CountdownTimer — real React component (the prior version
   used <script dangerouslySetInnerHTML> which React doesn't
   execute when hydrated, so the cells stayed at em-dashes
   forever). useEffect + setInterval ticks the four cells.
   SSR-safe: server renders em-dashes, client takes over on
   mount and fills in live values. */
function CountdownTimer({ target }: { target: number }) {
  const computeRemaining = useMemo(() => {
    return (now: number) => {
      const d = Math.max(0, target - now);
      const dd = Math.floor(d / 86400000);
      const hh = Math.floor((d % 86400000) / 3600000);
      const mm = Math.floor((d % 3600000) / 60000);
      const ss = Math.floor((d % 60000) / 1000);
      return {
        days: String(dd),
        hours: String(hh).padStart(2, '0'),
        minutes: String(mm).padStart(2, '0'),
        seconds: String(ss).padStart(2, '0'),
      };
    };
  }, [target]);
  const [tick, setTick] = useState<{ days: string; hours: string; minutes: string; seconds: string }>({
    days: '—', hours: '—', minutes: '—', seconds: '—',
  });
  useEffect(() => {
    const update = () => setTick(computeRemaining(Date.now()));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [computeRemaining]);
  const cells = [
    { value: tick.days, label: 'Days' },
    { value: tick.hours, label: 'Hours' },
    { value: tick.minutes, label: 'Minutes' },
    { value: tick.seconds, label: 'Seconds' },
  ];
  return (
    <section
      id="countdown"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--paper, #F5EFE2)',
      }}
    >
      <div
        className="eyebrow"
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          marginBottom: 22,
        }}
      >
        Until the day
      </div>
      <div
        data-pl-countdown
        data-target={target}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        {cells.map((c, i) => (
          <div
            key={c.label}
            style={{
              padding: '12px 4px',
              borderLeft: i === 0 ? 'none' : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            }}
          >
            <div
              data-pl-countdown-cell={c.label.toLowerCase()}
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 'clamp(40px, 6cqw, 64px)',
                fontWeight: 'var(--pl-display-wght, 600)',
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </div>
            <div
              className="eyebrow"
              style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
              }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── ThemedPullQuote — full-width italic display quote in the
   middle of the page. Reads manifest.poetry.heroTagline (full
   sentence, not the truncated one in Hero). The block has a
   gold open/close mark to read as a literal pull-quote. ─── */
function ThemedPullQuote({ manifest }: { manifest: StoryManifest }) {
  const heroCopyFull =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  /* Use the SECOND sentence onwards if there is one (the first
     is in Hero). Otherwise skip — don't repeat the hero line. */
  const sentences = heroCopyFull.split(/(?<=[.!?])\s+/);
  const quote = sentences.length > 1 ? sentences.slice(1).join(' ').trim() : '';
  if (!quote) return null;
  return (
    <section
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        aria-hidden
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 72,
          fontWeight: 400,
          color: 'var(--gold, #B8935A)',
          opacity: 0.45,
          lineHeight: 0.6,
          marginBottom: -8,
        }}
      >
        “
      </div>
      <blockquote
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 3cqw, 32px)',
          fontWeight: 400,
          color: 'var(--ink, #0E0D0B)',
          maxWidth: 720,
          margin: '0 auto',
          lineHeight: 1.35,
          letterSpacing: '-0.005em',
          padding: 0,
          border: 0,
        }}
      >
        {quote}
      </blockquote>
      <div
        aria-hidden
        style={{
          width: 80,
          height: 1,
          margin: '24px auto 0',
          background: 'var(--peach-ink, #C6703D)',
          opacity: 0.35,
        }}
      />
    </section>
  );
}

/* ─── ThemedWeddingParty — face cards for honor list. Reads
   manifest.weddingParty (array of { name, role, photo? }). 3-up
   on wide, 2-up on tablet, 1-up on phone. Each card: circular
   photo (or initial monogram), display-font name, eyebrow role.
   Section is hidden if no party is set. ─── */
function ThemedWeddingParty({ manifest }: { manifest: StoryManifest }) {
  const party =
    ((manifest as unknown as { weddingParty?: Array<{ name?: string; role?: string; photo?: string }> })
      .weddingParty) ?? [];
  if (party.length === 0) return null;
  return (
    <section
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--paper))',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="By our side" title="The honor" italic="list" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 28,
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {party.map((p, i) => {
          const name = p.name ?? '—';
          const initial = name.trim().charAt(0).toUpperCase() || '·';
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                aria-hidden
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  margin: '0 auto 14px',
                  backgroundImage: p.photo ? `url(${p.photo})` : 'none',
                  backgroundColor: p.photo ? 'transparent' : 'var(--peach-bg, rgba(198,112,61,0.10))',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: p.photo ? 'block' : 'grid',
                  placeItems: 'center',
                  border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                  boxShadow: 'var(--pl-card-shadow, 0 8px 20px rgba(75,65,52,0.10))',
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: 48,
                  color: 'var(--peach-ink, #C6703D)',
                  fontWeight: 400,
                }}
              >
                {p.photo ? null : initial}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 19,
                  fontWeight: 'var(--pl-display-wght, 600)',
                  color: 'var(--ink, #0E0D0B)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                }}
              >
                {name}
              </div>
              {p.role && (
                <div
                  className="eyebrow"
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
                    textTransform: 'uppercase',
                    color: 'var(--peach-ink, #C6703D)',
                  }}
                >
                  {p.role}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── ThemedMap — venue strip with embedded map iframe and an
   "Open in Maps" CTA. Reads logistics.venueLat / venueLng for a
   precise pin; falls back to a search by venue + address when no
   coords. Uses the OpenStreetMap embed (no API key); production
   can swap to Mapbox if desired. ─── */
function ThemedMap({ manifest }: { manifest: StoryManifest }) {
  const l = manifest.logistics ?? {};
  const lat = (l as { venueLat?: number }).venueLat;
  const lng = (l as { venueLng?: number }).venueLng;
  const venue = l.venue;
  const address = l.venueAddress;
  if (!venue && !address && (lat == null || lng == null)) return null;
  /* Bounding box around the pin — small enough to read as
     "this exact spot." 0.005° ≈ 550m at the equator. */
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const bbox = hasCoords
    ? `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`
    : null;
  const embed = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
    : null;
  const openLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [venue, address].filter(Boolean).join(' '),
      )}`;
  return (
    <section
      id="map"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--paper, #F5EFE2)',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="The place" title="Where it" italic="happens" />
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {/* Map frame */}
        <div
          style={{
            aspectRatio: '5/3',
            borderRadius: 'var(--pl-card-radius, 14px)',
            overflow: 'hidden',
            border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))',
            background: 'var(--cream-2, #EBE3D2)',
          }}
        >
          {embed ? (
            <iframe
              title="Venue map"
              src={embed}
              loading="lazy"
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink-muted, #6F6557)',
                fontStyle: 'italic',
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 16,
              }}
            >
              Find it on Maps
            </div>
          )}
        </div>
        {/* Venue caption */}
        <div>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              marginBottom: 8,
            }}
          >
            Venue
          </div>
          {venue && (
            <div
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 24,
                fontWeight: 'var(--pl-display-wght, 600)',
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {venue}
            </div>
          )}
          {address && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--ink-soft, #3A332C)',
                lineHeight: 1.5,
              }}
            >
              {address}
            </div>
          )}
          <a
            href={openLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 999,
              background: 'var(--peach-bg, rgba(198,112,61,0.10))',
              color: 'var(--peach-ink, #C6703D)',
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Icon name="pin" size={11} color="var(--peach-ink, #C6703D)" />
            Open in Maps ↗
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── ThemedSpotify — soundtrack strip. Reads manifest.spotifyUrl
   (playlist or track) + optional spotifyPlaylistName. Embeds the
   Spotify iframe in a compact card with a playlist eyebrow + the
   playlist name in display font. Renders nothing if no URL set.
   The iframe URL transform: open.spotify.com/playlist/X →
   open.spotify.com/embed/playlist/X. ─── */
function ThemedSpotify({ manifest }: { manifest: StoryManifest }) {
  const url = manifest.spotifyUrl;
  const name = manifest.spotifyPlaylistName;
  if (!url) return null;
  /* Validate + transform the URL. Only known Spotify resource
     paths get the iframe treatment; anything else falls back to
     a "listen on Spotify" card with no embed (avoids the empty-
     iframe ghost we see when the URL is invalid or blocked). */
  const m = url.match(/open\.spotify\.com\/(playlist|track|album|show|episode)\/([A-Za-z0-9]+)/);
  const embedUrl = m
    ? url.replace(/open\.spotify\.com\/(playlist|track|album|show|episode)\//, 'open.spotify.com/embed/$1/')
    : null;
  return (
    <section
      id="soundtrack"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <ThemedSectionHead
        eyebrow="In the air"
        title={name ? 'Our' : 'The'}
        italic={name ?? 'soundtrack'}
      />
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          borderRadius: 'var(--pl-card-radius, 14px)',
          overflow: 'hidden',
          border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))',
          background: 'var(--card, #FBF7EE)',
        }}
      >
        {embedUrl ? (
          <iframe
            title="Soundtrack"
            src={embedUrl}
            width="100%"
            height="232"
            frameBorder="0"
            loading="lazy"
            allow="encrypted-media; clipboard-write"
            style={{ display: 'block', border: 0 }}
          />
        ) : (
          /* Fallback — the URL didn't match a known Spotify
             resource pattern. Render a quiet "listen on Spotify"
             card so the section isn't an empty box. */
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '36px 24px',
              textDecoration: 'none',
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            <Icon name="play" size={16} color="var(--peach-ink, #C6703D)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Listen on Spotify ↗</span>
          </a>
        )}
      </div>
    </section>
  );
}

/* ─── ThemedHashtag — single-line callout for wedding hashtag.
   Reads manifest.hashtags[0]. Renders as a centered band: peach
   "#" prefix + the hashtag in display italic + a small "tap to
   copy" affordance. ─── */
function ThemedHashtag({ manifest }: { manifest: StoryManifest }) {
  const tag = (manifest.hashtags ?? [])[0];
  if (!tag) return null;
  const clean = tag.replace(/^#/, '');
  return (
    <section
      style={{
        padding: 'calc(36px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--paper, #F5EFE2)',
      }}
    >
      <div
        className="eyebrow"
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          marginBottom: 14,
        }}
      >
        Tag your photos
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 4,
          padding: '14px 28px',
          borderRadius: 999,
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--peach-ink, #C6703D)',
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
        }}
      >
        <span
          aria-hidden
          style={{
            fontStyle: 'italic',
            fontSize: 30,
            color: 'var(--peach-ink, #C6703D)',
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          #
        </span>
        <span
          style={{
            fontSize: 26,
            fontWeight: 'var(--pl-display-wght, 600)',
            color: 'var(--ink, #0E0D0B)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {clean}
        </span>
      </div>
    </section>
  );
}

/* ─── ThemedFooter — editorial close. Gold hairline → italic
   brand → small "woven on Pearloom" colophon → date in mono
   eyebrow → back-to-top pill. Reads as the back-cover of a
   bound book rather than a copyright stripe. ─── */
function ThemedFooter({ siteSlug: _siteSlug, names, manifest }: { siteSlug: string; names: [string, string]; manifest: StoryManifest }) {
  const [n1, n2] = names;
  const date = manifest.logistics?.date;
  const venue = manifest.logistics?.venue;
  return (
    <footer
      style={{
        padding: '64px 32px 40px',
        textAlign: 'center',
        background: 'var(--paper, #F5EFE2)',
        position: 'relative',
      }}
    >
      {/* Gold hairline */}
      <div
        aria-hidden
        style={{
          width: 220,
          height: 1,
          margin: '0 auto 36px',
          background: 'linear-gradient(90deg, transparent, var(--gold, #B8935A) 50%, transparent)',
          opacity: 0.6,
        }}
      />
      <span
        className="display-italic"
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 26,
          fontWeight: 500,
          color: 'var(--ink, #0E0D0B)',
          letterSpacing: '-0.01em',
        }}
      >
        {n1 && n2 ? `${n1} & ${n2}` : 'Our celebration'}
      </span>
      {(date || venue) && (
        <div
          className="eyebrow"
          style={{
            marginTop: 14,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'var(--ink-muted, #6F6557)',
          }}
        >
          {[date, venue].filter(Boolean).join(' · ')}
        </div>
      )}
      <a
        href="#top"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 28,
          padding: '8px 18px',
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid var(--line, rgba(14,13,11,0.16))',
          color: 'var(--ink-soft, #3A332C)',
          fontSize: 11.5,
          fontWeight: 600,
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}
      >
        ↑ back to top
      </a>
      <div
        style={{
          marginTop: 36,
          fontSize: 11,
          color: 'var(--ink-muted, #6F6557)',
          fontStyle: 'italic',
        }}
      >
        woven on Pearloom
      </div>
    </footer>
  );
}
