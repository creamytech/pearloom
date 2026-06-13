'use client';

import { AmbientSprig } from '@/components/pearloom/ambient';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/(shell)/templates/TemplatesBrowser.tsx
//
// Visual-fidelity port of ClaudeDesign/pages/templates.jsx.
//
// Every tile is a REAL themed site vignette (not a screenshot or
// gradient mockup). It reuses the production PackPreview engine
// — same CSS pipeline that paints the live published sites —
// but stamps an occasion-specific eyebrow ("Save the date" /
// "In loving memory" / "The trip" …) so the catalog reads as
// "a story that feels like yours" rather than "a palette
// swatch".
//
// Layout (matching the prototype):
//   • Hero with marketing display headline + Pear CTA
//   • Sticky filter bar (category chips + search + sort)
//   • Vibe pill row
//   • Featured row (3 cards, larger aspect)
//   • Library grid (4-col responsive)
//   • Pear "Tell me what you're imagining" offer block
// ─────────────────────────────────────────────────────────────

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPackById, type Pack } from '@/lib/theme-store/packs';
import { Pear, Squiggle, Wash, Icon } from '@/components/pearloom/motifs';
import { TemplateVignette, type OccasionGroup } from './TemplateVignette';

// ─────────────────────────────────────────────────────────────
// Browse-time categorization. The Theme Store has 11 collections
// keyed off "look" (med / garden / modern / evening …) — useful
// for theme shopping. The Templates browser instead groups by
// the *story shape* a host is starting from, so the wedding
// browser doesn't accidentally surface a memorial vignette.
// ─────────────────────────────────────────────────────────────

interface TemplateRow {
  /** Pack id from theme-store/packs.ts. */
  packId: string;
  /** Display name override (so "Lake Como" reads better than the pack's "Santorini Linen"). */
  name: string;
  /** Browse-time category. */
  cat: OccasionGroup;
  /** Vibe pills shown on the card meta + filter. */
  vibes: readonly string[];
  /** 1-line editorial blurb. */
  description: string;
  /** Layout label shown top-right of the card meta. */
  layout: string;
  /** Featured-row inclusion flag. */
  featured?: boolean;
}

/**
 * Curated cross-cut of the 67 Theme Store packs into 12
 * template tiles. Each row pins a pack to a category and adds
 * the prototype's editorial blurb / vibe / layout copy so the
 * tiles read as a real, hand-edited library rather than an
 * algorithmic dump of the catalog.
 *
 * Adding a tile: pick any pack id from `PACKS`, write a 1-line
 * blurb, and pin it to one of the 6 OccasionGroup buckets.
 */
const TEMPLATE_ROWS: readonly TemplateRow[] = [
  // Featured trio
  {
    packId: 'pressed-garden',
    name: 'Wildflower Barn',
    cat: 'wedding',
    vibes: ['Warm', 'Outdoorsy'],
    description: 'Garden-party wedding with a handwritten throughline.',
    layout: 'Timeline',
    featured: true,
  },
  {
    packId: 'modern-editorial',
    name: 'Pearl District',
    cat: 'wedding',
    vibes: ['Editorial', 'Black tie'],
    description: 'A magazine spread for your city-hall-to-rooftop day.',
    layout: 'Magazine',
    featured: true,
  },
  {
    packId: 'coastal-ink',
    name: 'Cabin Weekend',
    cat: 'gathering',
    vibes: ['Quiet', 'Outdoorsy'],
    description: 'For long weekends with 20 of your favorite people.',
    layout: 'Filmstrip',
    featured: true,
  },

  // Library tiles
  {
    packId: 'amalfi-lemon',
    name: 'Eighty Candles',
    cat: 'milestone',
    vibes: ['Warm', 'Playful'],
    description: "Birthday site with room for everyone's stories.",
    layout: 'Bento',
  },
  {
    packId: 'sage-watercolor',
    name: 'In Memory, Arthur',
    cat: 'memorial',
    vibes: ['Quiet'],
    description: 'A soft, slow place to gather around a life well-lived.',
    layout: 'Parallax',
  },
  {
    packId: 'tuscan-watercolor',
    name: 'The Tuscany Trip',
    cat: 'travel',
    vibes: ['Warm', 'Editorial'],
    description: 'Itinerary + photo journal for 12 travelers.',
    layout: 'Timeline',
  },
  {
    packId: 'confetti-fete',
    name: 'The New Apartment',
    cat: 'soft',
    vibes: ['Playful'],
    description: 'Housewarming invite with a proper welcome.',
    layout: 'Bento',
  },
  {
    packId: 'citrus-grove',
    name: 'Ceremony — 70s',
    cat: 'wedding',
    vibes: ['Groovy', 'Playful'],
    description: 'Loopy type, warm tones, plenty of daisies.',
    layout: 'Ken Burns',
  },
  {
    packId: 'eucalyptus-press',
    name: 'Graduation Weekend',
    cat: 'milestone',
    vibes: ['Warm'],
    description: 'Two days of family, four years of stories.',
    layout: 'Filmstrip',
  },
  {
    packId: 'noir-matte',
    name: 'Quarterly Retreat',
    cat: 'gathering',
    vibes: ['Editorial', 'Quiet'],
    description: "Offsite agenda that's actually nice to read.",
    layout: 'Magazine',
  },
  {
    packId: 'celestial-night',
    name: 'A Life, Remembered',
    cat: 'memorial',
    vibes: ['Quiet'],
    description: 'A shared guestbook, photos, and his favorite songs.',
    layout: 'Parallax',
  },
  {
    packId: 'palm-springs',
    name: 'Hen Weekend, Big Sur',
    cat: 'gathering',
    vibes: ['Playful', 'Outdoorsy'],
    description: 'Three days, one van, a lot of snacks.',
    layout: 'Bento',
  },
  {
    packId: 'english-rose',
    name: 'A Garden in May',
    cat: 'wedding',
    vibes: ['Warm', 'Editorial'],
    description: 'Roses, hand-calligraphed names, a quiet ceremony.',
    layout: 'Magazine',
  },
  {
    packId: 'midnight-velvet',
    name: 'After Hours',
    cat: 'wedding',
    vibes: ['Editorial', 'Black tie'],
    description: 'A late-dinner wedding for the after-dark crowd.',
    layout: 'Cinematic',
  },
  {
    packId: 'provence-lavender',
    name: 'Anniversary in Provence',
    cat: 'milestone',
    vibes: ['Quiet', 'Warm'],
    description: 'Twenty-five years, one lavender field.',
    layout: 'Timeline',
  },
  {
    packId: 'old-world-map',
    name: 'Reunion Roadtrip',
    cat: 'travel',
    vibes: ['Editorial', 'Outdoorsy'],
    description: 'A printed map for the family that scattered.',
    layout: 'Filmstrip',
  },
];

interface CategoryDef {
  id: OccasionGroup | 'all';
  label: string;
  /** Icon name from the motifs/Icon catalog. Strings only —
   *  motifs.Icon takes any string and falls back to a circle. */
  icon: string;
}

const CATEGORIES: readonly CategoryDef[] = [
  { id: 'all', label: 'All', icon: 'sparkles' },
  { id: 'wedding', label: 'Weddings', icon: 'heart-icon' },
  { id: 'milestone', label: 'Milestones', icon: 'star' },
  { id: 'gathering', label: 'Gatherings', icon: 'users' },
  { id: 'memorial', label: 'Memorials', icon: 'leaf' },
  { id: 'travel', label: 'Trips', icon: 'compass' },
  { id: 'soft', label: 'Soft launches', icon: 'moon' },
] as const;

const VIBES = ['Warm', 'Editorial', 'Playful', 'Quiet', 'Groovy', 'Black tie', 'Outdoorsy'] as const;

// ─────────────────────────────────────────────────────────────
// Tile + helpers
// ─────────────────────────────────────────────────────────────

interface HydratedRow extends TemplateRow {
  pack: Pack;
}

function hydrate(rows: readonly TemplateRow[]): HydratedRow[] {
  const out: HydratedRow[] = [];
  for (const row of rows) {
    const pack = getPackById(row.packId);
    if (pack) out.push({ ...row, pack });
  }
  return out;
}

function TemplateTile({
  row,
  size,
  onUse,
}: {
  row: HydratedRow;
  size: 'lg' | 'md';
  onUse: (row: HydratedRow) => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Featured row reads taller; library grid reads as 3:4 cards.
  const aspect = size === 'lg' ? '4 / 5' : '3 / 4';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onUse(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onUse(row);
        }
      }}
      style={{
        position: 'relative',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: aspect,
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid var(--card-ring, var(--pl-divider-soft, #E5DCC4))',
          boxShadow: hovered
            ? '0 24px 50px rgba(61,74,31,0.18)'
            : '0 8px 22px rgba(61,74,31,0.08)',
          transition: 'box-shadow 220ms ease',
          background: 'var(--cream-2, #FBF7EE)',
        }}
      >
        <TemplateVignette pack={row.pack} cat={row.cat} displayName={row.name} />

        {hovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(61,74,31,0) 55%, rgba(61,74,31,0.78) 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUse(row);
                }}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 'var(--pl-radius-full, 999px)',
                  background: 'var(--cream, #F5EFE2)',
                  color: 'var(--ink, #0E0D0B)',
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Use this template
                <Icon name="arrow-right" size={12} color="var(--ink, #0E0D0B)" />
              </button>
              <button
                type="button"
                aria-label="Preview"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  color: 'var(--cream, #F5EFE2)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  cursor: 'pointer',
                }}
              >
                <Icon name="eye" size={14} color="var(--cream, #F5EFE2)" />
              </button>
            </div>
          </div>
        )}

        {row.featured && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(6px)',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              <Icon name="sparkles" size={10} color="var(--gold, #C19A4B)" /> Featured
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 4px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontSize: size === 'lg' ? 24 : 22,
              fontWeight: 600,
              lineHeight: 1.1,
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            {row.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-muted, #6F6557)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {row.layout}
          </div>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-soft, #3A332C)',
            lineHeight: 1.45,
            margin: '0 0 10px',
          }}
        >
          {row.description}
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {row.vibes.map((v) => (
            <span
              key={v}
              style={{
                fontSize: 10.5,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'var(--sage-tint, #E3E6C8)',
                color: 'var(--sage-deep, #6d7d3f)',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

const HYDRATED_ROWS = hydrate(TEMPLATE_ROWS);

export function TemplatesBrowser() {
  const router = useRouter();
  const [cat, setCat] = useState<OccasionGroup | 'all'>('all');
  const [vibes, setVibes] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  const [sortNewest, setSortNewest] = useState(false);

  const toggleVibe = (v: string) =>
    setVibes((vs) => (vs.includes(v) ? vs.filter((x) => x !== v) : [...vs, v]));

  const filtered = useMemo(() => {
    let rows = HYDRATED_ROWS.slice();
    if (cat !== 'all') rows = rows.filter((r) => r.cat === cat);
    if (vibes.length > 0)
      rows = rows.filter((r) => vibes.some((v) => r.vibes.includes(v)));
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.vibes.some((v) => v.toLowerCase().includes(q)),
      );
    }
    if (sortNewest) {
      // "Newest" → pack badges.new first.
      rows = rows
        .slice()
        .sort(
          (a, b) =>
            (b.pack.badges.new ? 1 : 0) - (a.pack.badges.new ? 1 : 0),
        );
    }
    return rows;
  }, [cat, vibes, query, sortNewest]);

  const featured = filtered.filter((r) => r.featured);
  const rest = filtered.filter((r) => !r.featured);
  const totalCount = filtered.length;

  // "Use this template" stashes the chosen pack so the wizard +
  // editor can apply the look on the next render. Same shape as
  // the Theme Store's `pl-applied-pack` payload so downstream
  // consumers don't need a second branch.
  function handleUse(row: HydratedRow) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'pl-applied-pack',
          JSON.stringify({
            id: row.pack.id,
            themeRef: row.pack.themeRef,
            kit: row.pack.kit,
            templateName: row.name,
            cat: row.cat,
          }),
        );
      } catch {
        /* ignore quota errors — wizard will use defaults. */
      }
    }
    router.push('/wizard/new');
  }

  return (
    <div className="pl8-dash-page-enter" style={{ background: 'var(--paper, var(--pl-cream, #F5EFE2))' }}>
      {/* ───── Hero ───── */}
      <section style={heroSection}>
        <Wash tone="lavender" size={380} opacity={0.5} style={{ position: 'absolute', top: -80, left: -80, pointerEvents: 'none' }} />
        <Wash tone="peach" size={320} opacity={0.45} style={{ position: 'absolute', top: 40, right: -80, pointerEvents: 'none' }} />
        <AmbientSprig size={190} style={{ position: 'absolute', top: 110, right: 240, transform: 'rotate(-10deg)', opacity: 0.08, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={heroEyebrow}>
            <Icon name="sparkles" size={12} color="var(--ink-soft, #3A332C)" />
            {HYDRATED_ROWS.length} lovingly designed templates
          </div>
          <h1 style={heroHeadline} className="pl-letterpress">
            Start from a <em style={italicEm}>story</em>
            <br />
            that feels like <em style={italicEm}>yours.</em>
          </h1>
          <p style={heroParagraph}>
            Every template is a full site — pages, flow, tone, and type — ready to fill with your own
            people, photos, and moments.
          </p>
          <div style={heroActions}>
            <Link href="/wizard/new" style={primaryBtn}>
              Start from scratch
              <Icon name="arrow-right" size={13} color="var(--cream, #F5EFE2)" />
            </Link>
            <Link href="/dashboard" style={outlineBtn}>
              <Icon name="wand" size={13} color="var(--ink, #0E0D0B)" /> Describe it to Pear
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Sticky filter bar ───── */}
      <div style={filterBar}>
        <div style={filterBarInner}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => {
              const isActive = cat === c.id;
              const count =
                c.id === 'all'
                  ? HYDRATED_ROWS.length
                  : HYDRATED_ROWS.filter((r) => r.cat === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: isActive ? 'var(--ink, #0E0D0B)' : 'var(--card, #FBF7EE)',
                    color: isActive ? 'var(--cream, #F5EFE2)' : 'var(--ink, #0E0D0B)',
                    border: isActive
                      ? 'none'
                      : '1px solid var(--line, var(--pl-divider, #D8CFB8))',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Icon
                    name={c.icon}
                    size={12}
                    color={isActive ? 'var(--cream, #F5EFE2)' : 'var(--ink, #0E0D0B)'}
                  />
                  {c.label}
                  <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'inline-flex',
                  pointerEvents: 'none',
                }}
              >
                <Icon name="search" size={14} color="var(--ink-muted, #6F6557)" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates…"
                style={searchInput}
              />
            </div>
            <button
              type="button"
              onClick={() => setSortNewest((v) => !v)}
              style={sortBtn}
            >
              <Icon name="sliders" size={13} color="var(--ink, #0E0D0B)" />
              {sortNewest ? 'Newest' : 'Most loved'}
            </button>
          </div>
        </div>
        <div style={vibeRow}>
          <span style={vibeLabel}>Vibe</span>
          {VIBES.map((v) => {
            const isActive = vibes.includes(v);
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
                  background: isActive ? 'var(--peach-bg, #FBE8D6)' : 'transparent',
                  border: isActive
                    ? '1px solid var(--peach-2, #EAB286)'
                    : '1px solid var(--line, var(--pl-divider, #D8CFB8))',
                  color: isActive ? 'var(--peach-ink, #C6703D)' : 'var(--ink-soft, #3A332C)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
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
                color: 'var(--ink-muted, #6F6557)',
                marginLeft: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ───── Featured row ───── */}
      {featured.length > 0 && (
        <section style={{ padding: '48px 32px 24px' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 22,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--peach-ink, #C6703D)',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="sparkles" size={11} color="var(--peach-ink, #C6703D)" />
                  Featured this month
                </div>
                <h2 style={sectionHeading}>Ones we're leaning on</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {featured.map((row) => (
                <TemplateTile key={row.packId} row={row} size="lg" onUse={handleUse} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── Grid ───── */}
      <section style={{ padding: '24px 32px 80px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 22,
            }}
          >
            <h2 style={{ ...sectionHeading, fontSize: 30 }}>
              {cat === 'all' ? 'The whole library' : CATEGORIES.find((c) => c.id === cat)?.label}
              <span
                style={{
                  fontSize: 15,
                  color: 'var(--ink-muted, #6F6557)',
                  marginLeft: 10,
                  fontWeight: 400,
                }}
              >
                {totalCount} {totalCount === 1 ? 'template' : 'templates'}
              </span>
            </h2>
          </div>

          {rest.length > 0 ? (
            <div style={gridContainer}>
              {rest.map((row) => (
                <TemplateTile key={row.packId} row={row} size="md" onUse={handleUse} />
              ))}
            </div>
          ) : (
            filtered.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--ink-soft, #3A332C)',
                }}
              >
                <Pear size={60} tone="sage" />
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>
                  Nothing quite fits.
                </div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  Try different vibes, or let Pear sketch one for you.
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* ───── Pear offer block ───── */}
      <section style={{ padding: '40px 32px 100px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={pearOfferShell}>
            <Squiggle
              width={280}
              height={80}
              variant={1}
              style={{ position: 'absolute', top: 30, right: 260, opacity: 0.6 }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={pearOfferEyebrow}>
                <Icon name="wand" size={12} color="var(--peach-ink, #C6703D)" />
                Can't find the right fit?
              </div>
              <h3 style={pearOfferHeading} className="pl-letterpress">
                Tell Pear what you're <em style={italicEm}>imagining.</em>
              </h3>
              <p style={pearOfferBody}>
                Describe the event, the feeling, the people. Pear will sketch a template just for
                you — layout, tone, palette, and all.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href="/wizard/new" style={primaryBtn}>
                  Describe my event
                  <Icon name="arrow-right" size={13} color="var(--cream, #F5EFE2)" />
                </Link>
                <Link href="/dashboard" style={outlineBtn}>
                  <Icon name="mic" size={13} color="var(--ink, #0E0D0B)" /> Or just talk
                </Link>
              </div>
            </div>
            <div style={{ display: 'grid', placeItems: 'center', zIndex: 1, position: 'relative' }}>
              <Pear size={140} tone="sage" sparkle />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Style objects — pulled out so the JSX above reads as layout,
// not CSS noise. All paths reference site tokens that exist in
// `pearloom.css` + `globals.css`.
// ─────────────────────────────────────────────────────────────

const heroSection: CSSProperties = {
  position: 'relative',
  padding: '72px 32px 48px',
  overflow: 'hidden',
};

const heroEyebrow: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid var(--line-soft, var(--pl-divider-soft, #E5DCC4))',
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft, #3A332C)',
  marginBottom: 20,
};

const heroHeadline: CSSProperties = {
  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
  fontWeight: 600,
  fontSize: 'clamp(48px, 9vw, 92px)',
  margin: 0,
  lineHeight: 0.98,
  letterSpacing: '-0.02em',
  color: 'var(--ink, #0E0D0B)',
};

const italicEm: CSSProperties = {
  fontStyle: 'italic',
  fontWeight: 500,
  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
};

const heroParagraph: CSSProperties = {
  fontSize: 17,
  color: 'var(--ink-soft, #3A332C)',
  maxWidth: 560,
  margin: '22px auto 0',
  lineHeight: 1.55,
};

const heroActions: CSSProperties = {
  marginTop: 26,
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '11px 18px',
  borderRadius: 'var(--pl-radius-full, 999px)',
  background: 'var(--ink, #0E0D0B)',
  color: 'var(--cream, #F5EFE2)',
  border: 'none',
  fontSize: 13.5,
  fontWeight: 600,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: 'inherit',
};

const outlineBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '11px 18px',
  borderRadius: 'var(--pl-radius-full, 999px)',
  background: 'transparent',
  color: 'var(--ink, #0E0D0B)',
  border: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
  fontSize: 13.5,
  fontWeight: 600,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: 'inherit',
};

const filterBar: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  background: 'color-mix(in oklab, var(--paper, #F5EFE2) 92%, transparent)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderTop: '1px solid var(--line-soft, var(--pl-divider-soft, #E5DCC4))',
  borderBottom: '1px solid var(--line-soft, var(--pl-divider-soft, #E5DCC4))',
  padding: '14px 32px',
};

const filterBarInner: CSSProperties = {
  maxWidth: 1240,
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const searchInput: CSSProperties = {
  padding: '10px 14px 10px 36px',
  borderRadius: 10,
  border: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
  background: 'var(--cream-2, var(--pl-cream-card, #FBF7EE))',
  fontSize: 13,
  fontFamily: 'inherit',
  width: 220,
  color: 'var(--ink, #0E0D0B)',
};

const sortBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 13px',
  borderRadius: 999,
  background: 'transparent',
  color: 'var(--ink, #0E0D0B)',
  border: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const vibeRow: CSSProperties = {
  maxWidth: 1240,
  margin: '10px auto 0',
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const vibeLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: 'var(--ink-muted, #6F6557)',
  textTransform: 'uppercase',
  marginRight: 6,
};

const sectionHeading: CSSProperties = {
  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
  fontSize: 36,
  fontWeight: 600,
  margin: 0,
  color: 'var(--ink, #0E0D0B)',
  letterSpacing: '-0.01em',
};

const gridContainer: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 22,
};

const pearOfferShell: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background:
    'linear-gradient(125deg, var(--sage-tint, #E3E6C8) 0%, var(--peach-bg, #FBE8D6) 65%, var(--lavender-bg, #E8E0F0) 100%)',
  borderRadius: 28,
  padding: '48px 56px',
  border: '1px solid var(--card-ring, var(--pl-divider-soft, #E5DCC4))',
  display: 'grid',
  gridTemplateColumns: '1fr 200px',
  alignItems: 'center',
  gap: 30,
};

const pearOfferEyebrow: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'var(--peach-ink, #C6703D)',
  textTransform: 'uppercase',
  marginBottom: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const pearOfferHeading: CSSProperties = {
  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
  fontWeight: 600,
  fontSize: 44,
  margin: '0 0 10px',
  letterSpacing: '-0.01em',
  color: 'var(--ink, #0E0D0B)',
};

const pearOfferBody: CSSProperties = {
  fontSize: 15,
  color: 'var(--ink-soft, #3A332C)',
  lineHeight: 1.6,
  maxWidth: 480,
  margin: '0 0 18px',
};

