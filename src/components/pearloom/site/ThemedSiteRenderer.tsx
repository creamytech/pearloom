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

export function ThemedSiteRenderer({ manifest, names, siteSlug }: Props) {
  const [n1, n2] = names;
  const edition = manifest.edition ?? 'almanac';
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const voice = eventType?.voice ?? 'celebratory';
  const activeEdition = resolveEdition({ edition, occasion, voice });
  const motif: MotifKind = EDITION_MOTIF[edition] ?? 'pressed';
  const texture = manifest.texture ?? 'smooth';
  const density = manifest.density ?? 'comfortable';
  const intensity = manifest.textureIntensity ?? 1;

  /* Themed shell — emits the same data attributes SiteV8Renderer
     does so all the per-Edition / per-texture / per-kit CSS
     already shipped applies here too. */
  const shellStyle: React.CSSProperties = {
    background: 'var(--paper, #F5EFE2)',
    color: 'var(--ink, #0E0D0B)',
    minHeight: '100vh',
    position: 'relative',
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

      {/* Section stack in the prototype's default order.
          Countdown sits between hero and story so guests see the
          date math first. PullQuote breaks the editorial rhythm
          mid-body. WeddingParty sits before details so guests can
          place names to faces. Each section returns null when its
          source data is missing — no empty placeholders. */}
      <ThemedCountdown manifest={manifest} />
      <ThemedStory manifest={manifest} motif={motif} />
      <ThemedPullQuote manifest={manifest} />
      <ThemedWeddingParty manifest={manifest} />
      <ThemedDetails manifest={manifest} motif={motif} />
      <ThemedSchedule manifest={manifest} />
      <ThemedMap manifest={manifest} />
      <ThemedTravel manifest={manifest} motif={motif} />
      <ThemedRegistry manifest={manifest} />
      <ThemedGallery manifest={manifest} />
      <ThemedSpotify manifest={manifest} />
      <ThemedHashtag manifest={manifest} />
      <ThemedRsvp manifest={manifest} />
      <ThemedFaq manifest={manifest} />

      <ThemedFooter siteSlug={siteSlug} names={[n1, n2]} manifest={manifest} />
    </div>
  );
}

/* ─── ThemedNav — sticky sub-nav with brand italic + dotted-
   underline section links + peach RSVP pill. Links auto-hide
   when their target section is empty (no chapters → no Story
   link, no events → no Schedule link, etc.) so guests never
   click a link that scrolls into emptiness. ─── */
function ThemedNav({ manifest, names }: { manifest: StoryManifest; names: [string, string] }) {
  const [n1, n2] = names;
  const brand = n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'Our celebration');
  /* Available section anchors — each tuple is (label, anchor,
     visible-when). Filtering keeps the nav honest. */
  const reg = (manifest as unknown as { registry?: { entries?: unknown[] } }).registry;
  const links: Array<[string, string, boolean]> = [
    ['Story',    'our-story', (manifest.chapters ?? []).length > 0],
    ['Details',  'details',   !!manifest.logistics?.dresscode || !!(manifest.logistics as { kids?: string })?.kids],
    ['Schedule', 'schedule',  (manifest.events ?? []).length > 0],
    ['Travel',   'travel',    (manifest.travelInfo?.hotels ?? []).length > 0],
    ['Registry', 'registry',  (reg?.entries ?? []).length > 0],
    ['Gallery',  'gallery',   (manifest.chapters ?? []).some((c) => (c.images ?? []).length > 0)],
    ['FAQ',      'faq',       (manifest.faqs ?? []).length > 0],
  ];
  const visibleLinks = links.filter(([, , vis]) => vis);
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
        {visibleLinks.map(([label, anchor]) => (
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

/* ─── ThemedHero — port of HeroBlock centered variant with the
   prototype's 3-arch photo strip below the CTAs. The arches read
   as a triptych — first three chapter photos rendered into top-
   rounded frames matching the prototype's hero. ─── */
function ThemedHero({ manifest, names, motif }: { manifest: StoryManifest; names: [string, string]; motif: MotifKind }) {
  const [n1, n2] = names;
  const dateStr = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const place = manifest.logistics?.venueAddress ?? '';
  /* Tagline — first sentence of poetry.heroTagline so it reads as
     a short italic line, not a paragraph. */
  const heroCopyFull =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  const tagline = heroCopyFull.split(/[.!?]\s/, 2)[0];
  /* First three photos for the arch strip — fallback to chapter
     covers, then a single hero image if only one exists. */
  const archPhotos = (manifest.chapters ?? [])
    .flatMap((c) => (c.images ?? []).map((i) => i.url))
    .filter((u): u is string => !!u)
    .slice(0, 3);

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
          Save the date
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
            Each arch is top-rounded (50% radius on the top corners
            only). Renders only when at least 3 photos exist. */}
        {archPhotos.length >= 3 && (
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
            {archPhotos.map((url, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '3/4',
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderTopLeftRadius: '50% 35%',
                  borderTopRightRadius: '50% 35%',
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  boxShadow: '0 10px 28px rgba(61,74,31,0.14)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── ThemedStory — book-spread chapters with Roman numeral chapter
   marks. The prototype's StoryBlock reads as a paginated chapter
   list — each chapter is a Roman-numeral kicker + italic display
   title + body + photo, alternating photo-left/photo-right.
   Photo column is 5/12; text 6/12 with 1/12 gutter on the inside
   so the page reads with breathing room rather than the prior
   50/50 split. ─── */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function ThemedStory({ manifest, motif }: { manifest: StoryManifest; motif: MotifKind }) {
  const chapters = manifest.chapters ?? [];
  if (chapters.length === 0) return null;
  return (
    <section
      id="our-story"
      style={{
        padding: 'calc(64px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Our story" title="How we got" italic="here" />
      {/* Chapter spreads — alternating photo + text with Roman numeral marks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 72, maxWidth: 1080, margin: '0 auto' }}>
        {chapters.map((c, i) => {
          const left = i % 2 === 0;
          const photo = c.images?.[0]?.url;
          const numeral = ROMAN[i] ?? String(i + 1);
          return (
            <div
              key={c.id ?? i}
              style={{
                display: 'grid',
                gridTemplateColumns: left ? '5fr 1fr 6fr' : '6fr 1fr 5fr',
                gap: 0,
                alignItems: 'center',
              }}
            >
              {/* Photo column */}
              <div style={{ order: left ? 0 : 2 }}>
                {photo ? (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4/5',
                      backgroundImage: `url(${photo})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 'var(--pl-card-radius, 12px)',
                      boxShadow: 'var(--pl-card-shadow, 0 14px 36px rgba(61,74,31,0.16))',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4/5',
                      background: 'var(--cream, #FBF7EE)',
                      borderRadius: 'var(--pl-card-radius, 12px)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--ink-muted, #8A8275)',
                      fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                      fontSize: 64,
                      fontStyle: 'italic',
                      opacity: 0.25,
                    }}
                  >
                    {numeral}
                  </div>
                )}
              </div>
              {/* Gutter */}
              <div style={{ order: 1 }} />
              {/* Text column */}
              <div style={{ order: left ? 2 : 0 }}>
                {/* Roman numeral chapter mark — large outline-style
                    so it reads as a book chapter heading, not a
                    label. */}
                <div
                  style={{
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontStyle: 'italic',
                    fontSize: 44,
                    fontWeight: 400,
                    color: 'var(--peach-ink, #C6703D)',
                    opacity: 0.7,
                    lineHeight: 1,
                    marginBottom: 8,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {numeral}.
                </div>
                {c.date && (
                  <div
                    className="eyebrow"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted, #6F6557)',
                      marginBottom: 14,
                    }}
                  >
                    {c.date}
                  </div>
                )}
                <h3
                  style={{
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontSize: 42,
                    fontWeight: 'var(--pl-display-wght, 600)',
                    margin: 0,
                    lineHeight: 1.02,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {c.title}
                </h3>
                {c.description && (
                  <p
                    style={{
                      marginTop: 20,
                      fontSize: 15.5,
                      color: 'var(--ink-soft, #3A332C)',
                      lineHeight: 1.7,
                    }}
                  >
                    {c.description}
                  </p>
                )}
                {c.location?.label && (
                  <div
                    style={{
                      marginTop: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--peach-ink, #C6703D)',
                    }}
                  >
                    <Icon name="pin" size={11} color="var(--peach-ink, #C6703D)" />
                    {c.location.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
function ThemedDetails({ manifest, motif }: { manifest: StoryManifest; motif: MotifKind }) {
  const l = manifest.logistics ?? {};
  const dresscode = l.dresscode;
  const items: Array<{ icon: string; label: string; value: string }> = [];
  if (dresscode) items.push({ icon: 'sparkles', label: 'Dress code', value: dresscode });
  if ((l as { kids?: string }).kids) items.push({ icon: 'users', label: 'Kids', value: String((l as { kids?: string }).kids) });
  if ((manifest as unknown as { registry?: { message?: string } }).registry?.message) {
    items.push({ icon: 'gift', label: 'Gifts', value: (manifest as unknown as { registry?: { message?: string } }).registry?.message ?? '' });
  }
  if ((l as { parking?: string }).parking) items.push({ icon: 'pin', label: 'Parking', value: String((l as { parking?: string }).parking) });
  if (items.length === 0) return null;
  return (
    <section
      id="details"
      style={{
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="What you need to know" title="The day," italic="in details" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
          gap: 22,
          maxWidth: 880,
          margin: '0 auto',
        }}
      >
        {items.map((it) => (
          <div
            key={it.label}
            style={{
              background: 'var(--card, #FBF7EE)',
              borderRadius: 'var(--pl-card-radius, 14px)',
              padding: '28px 22px 24px',
              border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
              boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.08))',
              textAlign: 'center',
            }}
          >
            {/* Icon disc — peach-bg circle with the icon centered.
                Reads as a feature label, not a chip. */}
            <div
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                margin: '0 auto 18px',
                background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name={it.icon} size={24} color="var(--peach-ink, #C6703D)" />
            </div>
            <div
              className="eyebrow"
              style={{
                marginBottom: 8,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1.2,
              }}
            >
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── ThemedSchedule — vertical timeline. Time on the left in
   display font, dot on the rule, event details on the right.
   Reads as a printed program rather than a card grid. The
   timeline rule is a 1px peach hairline running the full
   height. ─── */
function ThemedSchedule({ manifest }: { manifest: StoryManifest }) {
  const events = manifest.events ?? [];
  if (events.length === 0) return null;
  return (
    <section
      id="schedule"
      style={{
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="The day" title="In" italic="moments" />
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Vertical hairline rule — runs full column height behind
            the dots. inset positions it inside the time column
            margin so dots align cleanly. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 16,
            bottom: 16,
            left: 100,
            width: 1,
            background: 'linear-gradient(180deg, transparent 0%, var(--peach-ink, #C6703D) 8%, var(--peach-ink, #C6703D) 92%, transparent 100%)',
            opacity: 0.35,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {events.map((e, i) => (
            <div
              key={e.id ?? i}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 20px 1fr',
                alignItems: 'baseline',
                gap: 0,
              }}
            >
              {/* Time — display font, right-aligned to meet the rule */}
              <div
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 24,
                  fontWeight: 'var(--pl-display-wght, 600)',
                  color: 'var(--ink, #0E0D0B)',
                  textAlign: 'right',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                {e.time}
              </div>
              {/* Dot on the rule */}
              <div style={{ position: 'relative', height: '100%' }}>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 5,
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    background: 'var(--paper, #F5EFE2)',
                    border: '2px solid var(--peach-ink, #C6703D)',
                  }}
                />
              </div>
              {/* Event name + description */}
              <div style={{ paddingLeft: 14, paddingTop: 2 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontSize: 19,
                    fontWeight: 600,
                    color: 'var(--ink, #0E0D0B)',
                    lineHeight: 1.15,
                  }}
                >
                  {e.name}
                </div>
                {e.description && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: 'var(--ink-soft, #3A332C)',
                      lineHeight: 1.55,
                    }}
                  >
                    {e.description}
                  </div>
                )}
                {(e as { location?: string }).location && (
                  <div
                    className="eyebrow"
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 'var(--pl-eyebrow-ls, 0.18em)',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted, #6F6557)',
                    }}
                  >
                    {(e as { location?: string }).location}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── ThemedTravel — editorial hotel listing. Each hotel reads
   as a small editorial card with display-font name, address-as-
   eyebrow, distance label, and a "Book ↗" pill. Single column on
   narrow screens, 2-col on wider. ─── */
function ThemedTravel({ manifest, motif }: { manifest: StoryManifest; motif: MotifKind }) {
  const hotels = manifest.travelInfo?.hotels ?? [];
  if (hotels.length === 0) return null;
  return (
    <section
      id="travel"
      style={{
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Getting there" title="Where to" italic="stay" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          maxWidth: 820,
          margin: '0 auto',
        }}
      >
        {hotels.map((h, i) => {
          const distance = (h as unknown as { distance?: string }).distance;
          return (
            <div
              key={i}
              style={{
                background: 'var(--card, #FBF7EE)',
                borderRadius: 'var(--pl-card-radius, 12px)',
                padding: '22px 22px 20px',
                border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                boxShadow: 'var(--pl-card-shadow, 0 2px 8px rgba(75,65,52,0.08))',
              }}
            >
              {distance && (
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
                  {distance}
                </div>
              )}
              <div
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 24,
                  fontWeight: 'var(--pl-display-wght, 600)',
                  color: 'var(--ink, #0E0D0B)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                {h.name}
              </div>
              {h.address && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: 'var(--ink-soft, #3A332C)',
                    lineHeight: 1.55,
                  }}
                >
                  {h.address}
                </div>
              )}
              {(h as unknown as { groupRate?: string }).groupRate && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: 'var(--ink-muted, #6F6557)',
                  }}
                >
                  {(h as unknown as { groupRate?: string }).groupRate}
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
                  Book ↗
                </a>
              )}
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
function ThemedRegistry({ manifest }: { manifest: StoryManifest }) {
  const reg = (manifest as unknown as { registry?: { entries?: Array<{ name?: string; label?: string; url: string }>; message?: string } }).registry;
  const entries = reg?.entries ?? [];
  if (entries.length === 0) return null;
  return (
    <section
      id="registry"
      style={{
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, ${entries.length === 1 ? '320px' : '1fr'}))`,
          gap: 18,
          maxWidth: 820,
          margin: '0 auto',
          justifyContent: 'center',
        }}
      >
        {entries.map((e, i) => (
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '28px 24px 22px',
              borderRadius: 'var(--pl-card-radius, 14px)',
              background: 'var(--card, #FBF7EE)',
              border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
              boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.08))',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="gift" size={20} color="var(--peach-ink, #C6703D)" />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1.15,
                textAlign: 'center',
              }}
            >
              {e.name ?? e.label ?? 'Registry'}
            </div>
            <span
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--peach-ink, #C6703D)',
              }}
            >
              Open ↗
            </span>
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
function ThemedGallery({ manifest }: { manifest: StoryManifest }) {
  const photos = manifest.chapters?.flatMap((c) => (c.images ?? []).map((i) => i.url)) ?? [];
  if (photos.length === 0) return null;
  const tones = ['#E8C8B4', '#D8CFB8', '#C4B5D9', '#F4D5CD', '#F0C9A8', '#FBE8D6'];
  return (
    <section
      id="gallery"
      style={{
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
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
        padding: 'calc(64px * var(--pl-density-scale, 1)) 32px',
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

/* ─── ThemedFaq — numbered accordion cards. Each row carries an
   italic peach numeral prefix (01 / 02 / 03) that doubles as
   the visual rhythm. Cards keep the same chev-down summary but
   the question type-set is larger so the FAQ feels like real
   reading, not a chip rail. ─── */
function ThemedFaq({ manifest }: { manifest: StoryManifest }) {
  const faq = manifest.faqs ?? [];
  if (faq.length === 0) return null;
  return (
    <section
      id="faq"
      style={{
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="Good to know" title="The little" italic="things" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 680,
          margin: '0 auto',
        }}
      >
        {faq.map((item, i) => {
          const num = String(i + 1).padStart(2, '0');
          return (
            <details
              key={item.id ?? i}
              style={{
                padding: '18px 22px',
                background: 'var(--card, #FBF7EE)',
                border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                borderRadius: 'var(--pl-card-radius, 12px)',
                boxShadow: 'var(--pl-card-shadow, 0 2px 6px rgba(75,65,52,0.05))',
              }}
            >
              <summary
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: 'var(--ink, #0E0D0B)',
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'baseline',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 18,
                    color: 'var(--peach-ink, #C6703D)',
                    opacity: 0.85,
                    minWidth: 24,
                  }}
                >
                  {num}.
                </span>
                <span style={{ flex: 1, lineHeight: 1.35 }}>{item.question}</span>
                <Icon name="chev-down" size={14} color="var(--ink-muted, #6F6557)" />
              </summary>
              {item.answer && (
                <p
                  style={{
                    marginTop: 12,
                    marginLeft: 38,
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
        })}
      </div>
    </section>
  );
}

/* ─── ThemedCountdown — big-number countdown to the event date.
   Reads manifest.logistics.date. Shows 4 cells (days / hours /
   minutes / seconds) in display font with mono numerals,
   eyebrow labels beneath. The math is client-side (so SSR
   renders a stable placeholder then ticks once mounted). ─── */
function ThemedCountdown({ manifest }: { manifest: StoryManifest }) {
  const dateStr = manifest.logistics?.date;
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (!Number.isFinite(target)) return null;
  /* SSR-safe: render -- placeholders, then the client effect
     fills in the live numbers. */
  const cells = [
    { value: '—', label: 'Days' },
    { value: '—', label: 'Hours' },
    { value: '—', label: 'Minutes' },
    { value: '—', label: 'Seconds' },
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
      {/* Inline script — keeps the SSR markup intact while
          letting the cells tick on the client. The script is
          self-cleaning if the cells aren't there. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
  var root=document.querySelector('[data-pl-countdown]');if(!root)return;
  var target=parseInt(root.getAttribute('data-target'),10);if(!target)return;
  var cells={days:root.querySelector('[data-pl-countdown-cell=days]'),hours:root.querySelector('[data-pl-countdown-cell=hours]'),minutes:root.querySelector('[data-pl-countdown-cell=minutes]'),seconds:root.querySelector('[data-pl-countdown-cell=seconds]')};
  function tick(){var d=target-Date.now();if(d<0)d=0;var dd=Math.floor(d/86400000);var hh=Math.floor((d%86400000)/3600000);var mm=Math.floor((d%3600000)/60000);var ss=Math.floor((d%60000)/1000);if(cells.days)cells.days.textContent=String(dd);if(cells.hours)cells.hours.textContent=String(hh).padStart(2,'0');if(cells.minutes)cells.minutes.textContent=String(mm).padStart(2,'0');if(cells.seconds)cells.seconds.textContent=String(ss).padStart(2,'0');}
  tick();setInterval(tick,1000);
})();`,
        }}
      />
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
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
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
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
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
        padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
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
  /* Transform a regular spotify URL into its embed counterpart.
     Pattern: /playlist/, /track/, /album/, /show/, /episode/. */
  const embedUrl = url.replace(
    /open\.spotify\.com\/(playlist|track|album|show|episode)\//,
    'open.spotify.com/embed/$1/',
  );
  return (
    <section
      id="soundtrack"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
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
