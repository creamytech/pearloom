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
          RSVP pill right. */}
      <ThemedNav names={[n1, n2]} />

      {/* Section stack — prototype's ThemedSite renders sections
          in event.sections order. For the scaffold pass we render
          the canonical 8 in the prototype's default order. */}
      <ThemedHero manifest={manifest} names={[n1, n2]} motif={motif} />

      {/* Story / Details / Schedule / Travel / Registry / Gallery
          / RSVP / FAQ — stub markers for the upcoming ports.
          Each renders a minimal placeholder with the right id +
          structure so the nav links work and the layout's bones
          are correct. */}
      <ThemedStory manifest={manifest} motif={motif} />
      <ThemedDetails manifest={manifest} motif={motif} />
      <ThemedSchedule manifest={manifest} />
      <ThemedTravel manifest={manifest} motif={motif} />
      <ThemedSectionStub id="registry" eyebrow="If you're asking" title="Registry, gently" />
      <ThemedSectionStub id="gallery" eyebrow="Along the way" title="A few favorites" />
      <ThemedSectionStub id="rsvp" eyebrow="Save your seat" title="RSVP" />
      <ThemedSectionStub id="faq" eyebrow="Good to know" title="Frequently asked" />

      <ThemedFooter siteSlug={siteSlug} names={[n1, n2]} />
    </div>
  );
}

/* ─── ThemedNav — port of the prototype's sub-nav ─── */
function ThemedNav({ names }: { names: [string, string] }) {
  const [n1, n2] = names;
  const brand = n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'Our celebration');
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
        <span
          className="display-italic"
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--ink, #0E0D0B)',
          }}
        >
          {brand}
        </span>
      </div>
      <nav
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 18,
          opacity: 0.85,
        }}
      >
        {['Story', 'Details', 'Schedule', 'Travel', 'Registry', 'Gallery', 'FAQ'].map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(' ', '-').replace('story', 'our-story')}`}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {l}
          </a>
        ))}
      </nav>
      <a
        href="#rsvp"
        style={{
          padding: '6px 14px',
          borderRadius: 999,
          background: 'var(--ink, #0E0D0B)',
          color: 'var(--cream, #F5EFE2)',
          fontSize: 11.5,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        RSVP
      </a>
    </header>
  );
}

/* ─── ThemedHero — port of HeroBlock centered variant ─── */
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
      </div>
    </section>
  );
}

/* ─── ThemedStory — port of prototype StoryBlock default variant.
   Photo-left + text-right split per chapter, alternating sides.
   Reads manifest.chapters → renders each one as a clean editorial
   spread. ─── */
function ThemedStory({ manifest, motif }: { manifest: StoryManifest; motif: MotifKind }) {
  const chapters = manifest.chapters ?? [];
  if (chapters.length === 0) return null;
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
      {/* Section header — TSectionHead pattern */}
      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative' }}>
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
          Our story
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 'clamp(36px, 5.5cqw, 56px)',
            fontWeight: 'var(--pl-display-wght, 600)',
            margin: 0,
            lineHeight: 1.04,
          }}
        >
          How we got{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--ink-soft, #3A332C)' }}>here</span>
        </h2>
      </div>
      {/* Chapter spreads — alternating photo + text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 56, maxWidth: 1040, margin: '0 auto' }}>
        {chapters.map((c, i) => {
          const left = i % 2 === 0;
          const photo = c.images?.[0]?.url;
          return (
            <div
              key={c.id ?? i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 44,
                alignItems: 'center',
              }}
            >
              <div style={{ order: left ? 0 : 1 }}>
                {photo ? (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4/5',
                      backgroundImage: `url(${photo})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 'var(--pl-card-radius, 12px)',
                      boxShadow: 'var(--pl-card-shadow, 0 10px 28px rgba(61,74,31,0.12))',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4/5',
                      background: 'var(--cream-2, #EBE3D2)',
                      borderRadius: 'var(--pl-card-radius, 12px)',
                    }}
                  />
                )}
              </div>
              <div style={{ order: left ? 1 : 0 }}>
                {c.date && (
                  <div
                    className="eyebrow"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 'var(--pl-eyebrow-ls, 0.18em)',
                      textTransform: 'uppercase',
                      color: 'var(--peach-ink, #C6703D)',
                      marginBottom: 10,
                    }}
                  >
                    {c.date}
                  </div>
                )}
                <h3
                  style={{
                    fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                    fontSize: 38,
                    fontWeight: 'var(--pl-display-wght, 600)',
                    margin: 0,
                    lineHeight: 1.02,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {c.title}
                </h3>
                {c.description && (
                  <p
                    style={{
                      marginTop: 16,
                      fontSize: 15,
                      color: 'var(--ink-soft, #3A332C)',
                      lineHeight: 1.65,
                    }}
                  >
                    {c.description}
                  </p>
                )}
                {c.location?.label && (
                  <div
                    style={{
                      marginTop: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 999,
                      background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                      color: 'var(--peach-ink, #C6703D)',
                      fontSize: 12,
                      fontWeight: 600,
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

/* ─── ThemedDetails — 3 detail cards in a tight grid (prototype's
   DetailsBlock). Reads manifest.logistics.dresscode +
   logistics.kids + custom details cards. ─── */
function ThemedDetails({ manifest, motif }: { manifest: StoryManifest; motif: MotifKind }) {
  const l = manifest.logistics ?? {};
  const dresscode = l.dresscode;
  const items: Array<{ icon: string; label: string; value: string }> = [];
  if (dresscode) items.push({ icon: 'sparkles', label: 'Dress code', value: dresscode });
  if ((l as { kids?: string }).kids) items.push({ icon: 'users', label: 'Kids', value: String((l as { kids?: string }).kids) });
  if ((manifest as unknown as { registry?: { message?: string } }).registry?.message) {
    items.push({ icon: 'gift', label: 'Gifts', value: (manifest as unknown as { registry?: { message?: string } }).registry?.message ?? '' });
  }
  if (items.length === 0) return null;
  return (
    <section
      id="details"
      style={{
        padding: 'calc(44px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="What you need to know" title="The day," italic="in details" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 18,
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        {items.map((it) => (
          <div
            key={it.label}
            style={{
              background: 'var(--card, #FBF7EE)',
              borderRadius: 'var(--pl-card-radius, 12px)',
              padding: 18,
              border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
              boxShadow: 'var(--pl-card-shadow, 0 1px 3px rgba(75,65,52,0.06))',
            }}
          >
            <Icon name={it.icon} size={18} color="var(--peach-ink, #C6703D)" />
            <div
              className="eyebrow"
              style={{
                marginTop: 10,
                marginBottom: 4,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 'var(--pl-eyebrow-ls, 0.18em)',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
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

/* ─── ThemedSchedule — port of prototype's KSchedule classic.
   4-col centered card grid. Reads manifest.events. ─── */
function ThemedSchedule({ manifest }: { manifest: StoryManifest }) {
  const events = manifest.events ?? [];
  if (events.length === 0) return null;
  return (
    <section
      id="schedule"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="The day" title="In moments" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {events.map((e, i) => (
          <div
            key={e.id ?? i}
            style={{
              padding: '18px 16px',
              background: 'var(--card, #FBF7EE)',
              border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
              borderRadius: 'var(--pl-card-radius, 12px)',
              boxShadow: 'var(--pl-card-shadow, 0 1px 3px rgba(75,65,52,0.06))',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 22,
                fontWeight: 'var(--pl-display-wght, 600)',
                color: 'var(--peach-ink, #C6703D)',
                lineHeight: 1,
              }}
            >
              {e.time}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, color: 'var(--ink, #0E0D0B)' }}>
              {e.name}
            </div>
            {e.description && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                {e.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── ThemedTravel — 2-col hotel grid. ─── */
function ThemedTravel({ manifest, motif }: { manifest: StoryManifest; motif: MotifKind }) {
  const hotels = manifest.travelInfo?.hotels ?? [];
  if (hotels.length === 0) return null;
  return (
    <section
      id="travel"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--section, var(--cream-2, #EBE3D2))',
        position: 'relative',
      }}
    >
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Getting there" title="Where to" italic="stay" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          maxWidth: 780,
          margin: '0 auto',
        }}
      >
        {hotels.map((h, i) => (
          <div
            key={i}
            style={{
              background: 'var(--card, #FBF7EE)',
              borderRadius: 'var(--pl-card-radius, 12px)',
              padding: 14,
              border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
              boxShadow: 'var(--pl-card-shadow, 0 1px 3px rgba(75,65,52,0.06))',
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                flexShrink: 0,
                borderRadius: 8,
                background: 'var(--cream-2, #EBE3D2)',
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 18,
                  fontWeight: 'var(--pl-display-wght, 600)',
                  color: 'var(--ink, #0E0D0B)',
                }}
              >
                {h.name}
              </div>
              {(h.address || (h as unknown as { distance?: string }).distance) && (
                <div style={{ fontSize: 12, color: 'var(--ink-muted, #6F6557)', marginTop: 4 }}>
                  {(h as unknown as { distance?: string }).distance ?? h.address}
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
                  Book ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── ThemedSectionStub — placeholder for sections not yet ported ─── */
function ThemedSectionStub({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <section
      id={id}
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
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
          fontSize: 'clamp(36px, 5.5cqw, 56px)',
          fontWeight: 'var(--pl-display-wght, 600)',
          margin: 0,
          lineHeight: 1.04,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          marginTop: 16,
          color: 'var(--ink-muted, #6F6557)',
          fontStyle: 'italic',
          fontSize: 13,
        }}
      >
        — section port pending —
      </p>
    </section>
  );
}

/* ─── ThemedFooter ─── */
function ThemedFooter({ siteSlug: _siteSlug, names }: { siteSlug: string; names: [string, string] }) {
  const [n1, n2] = names;
  return (
    <footer
      style={{
        padding: '48px 32px',
        textAlign: 'center',
        borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        color: 'var(--ink-muted, #6F6557)',
        fontSize: 12,
      }}
    >
      <span className="display-italic" style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft, #3A332C)' }}>
        {n1 && n2 ? `${n1} & ${n2}` : 'Our celebration'}
      </span>
      <div style={{ marginTop: 6 }}>woven on Pearloom</div>
    </footer>
  );
}
