'use client';

/* ========================================================================
   PEARLOOM — TEMPLATES GALLERY (v8 handoff port)
   ======================================================================== */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Blob, Icon, Pear, Sparkle, Squiggle } from '../motifs';
import { Footbar, TopNav } from '../chrome';

type Layout = 'timeline' | 'magazine' | 'filmstrip' | 'bento' | 'parallax' | 'kenburns';

type Template = {
  id: number;
  name: string;
  cat: string;
  vibes: string[];
  tones: string[];
  description: string;
  layout: Layout;
  featured?: boolean;
};

const TPL_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'sparkles', count: 64 },
  { id: 'wedding', label: 'Weddings', icon: 'heart-icon', count: 18 },
  { id: 'milestone', label: 'Milestones', icon: 'star', count: 12 },
  { id: 'gathering', label: 'Gatherings', icon: 'users', count: 14 },
  { id: 'memorial', label: 'Memorials', icon: 'leaf', count: 7 },
  { id: 'travel', label: 'Trips', icon: 'compass', count: 8 },
  { id: 'soft', label: 'Soft launches', icon: 'moon', count: 5 },
];

const TPL_VIBES = ['Warm', 'Editorial', 'Playful', 'Quiet', 'Groovy', 'Black tie', 'Outdoorsy'];

const TEMPLATES: Template[] = [
  { id: 1, name: 'Wildflower Barn', cat: 'wedding', vibes: ['Warm', 'Outdoorsy'], tones: ['sage', 'peach'], description: 'Garden-party wedding with a handwritten throughline.', layout: 'timeline', featured: true },
  { id: 2, name: 'Pearl District', cat: 'wedding', vibes: ['Editorial', 'Black tie'], tones: ['lavender', 'ink'], description: 'A magazine spread for your city-hall-to-rooftop day.', layout: 'magazine', featured: true },
  { id: 3, name: 'Cabin Weekend', cat: 'gathering', vibes: ['Quiet', 'Outdoorsy'], tones: ['sage', 'cream'], description: 'For long weekends with 20 of your favorite people.', layout: 'filmstrip', featured: true },
  { id: 4, name: 'Eighty Candles', cat: 'milestone', vibes: ['Warm', 'Playful'], tones: ['peach', 'cream'], description: 'Birthday site with room for everyone’s stories.', layout: 'bento' },
  { id: 5, name: 'In Memory, Arthur', cat: 'memorial', vibes: ['Quiet'], tones: ['cream', 'sage'], description: 'A soft, slow place to gather around a life well-lived.', layout: 'parallax' },
  { id: 6, name: 'The Tuscany Trip', cat: 'travel', vibes: ['Warm', 'Editorial'], tones: ['peach', 'lavender'], description: 'Itinerary + photo journal for 12 travelers.', layout: 'timeline' },
  { id: 7, name: 'The New Apartment', cat: 'soft', vibes: ['Playful'], tones: ['lavender', 'peach'], description: 'Housewarming invite with a proper welcome.', layout: 'bento' },
  { id: 8, name: 'Ceremony — 70s', cat: 'wedding', vibes: ['Groovy', 'Playful'], tones: ['peach', 'sage'], description: 'Loopy type, warm tones, plenty of daisies.', layout: 'kenburns' },
  { id: 9, name: 'Graduation Weekend', cat: 'milestone', vibes: ['Warm'], tones: ['sage', 'lavender'], description: 'Two days of family, four years of stories.', layout: 'filmstrip' },
  { id: 10, name: 'Quarterly Retreat', cat: 'gathering', vibes: ['Editorial', 'Quiet'], tones: ['cream', 'ink'], description: 'Offsite agenda that’s actually nice to read.', layout: 'magazine' },
  { id: 11, name: 'A Life, Remembered', cat: 'memorial', vibes: ['Quiet'], tones: ['lavender'], description: 'A shared guestbook, photos, and his favorite songs.', layout: 'parallax' },
  { id: 12, name: 'Hen Weekend, Big Sur', cat: 'gathering', vibes: ['Playful', 'Outdoorsy'], tones: ['peach', 'sage'], description: 'Three days, one van, a lot of snacks.', layout: 'bento' },
];

function TemplateTile({ t, size = 'md' }: { t: Template; size?: 'md' | 'lg' }) {
  const [hovered, setHovered] = useState(false);
  const aspectMap = { lg: '4/5', md: '3/4', sm: '1/1' };
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform .22s ease',
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
          aspectRatio: aspectMap[size],
          background: `linear-gradient(155deg, var(--${t.tones[0]}-bg) 0%, var(--${t.tones[1] || t.tones[0]}-bg) 100%)`,
        }}
      >
        <TemplatePreviewArt tones={t.tones} layout={t.layout} name={t.name} />

        {hovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(61,74,31,0) 55%, rgba(61,74,31,0.78) 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <Link
                href={`/wizard/new?template=${t.id}`}
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--cream)', color: 'var(--ink)', flex: 1, justifyContent: 'center' }}
              >
                Use this template <Icon name="arrow-right" size={12} />
              </Link>
              <button
                type="button"
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  color: 'var(--cream)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  cursor: 'pointer',
                }}
              >
                <Icon name="eye" size={14} />
              </button>
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
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(6px)',
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
      </div>

      <div style={{ padding: '14px 4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>
            {t.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.layout}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45, margin: '0 0 10px' }}>{t.description}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {t.vibes.map((v) => (
            <span key={v} className="pill" style={{ fontSize: 10.5, padding: '3px 9px' }}>
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplatePreviewArt({ tones, layout, name }: { tones: string[]; layout: Layout; name: string }) {
  const primary = tones[0] ?? 'sage';
  const accent = tones[1] ?? tones[0] ?? 'peach';
  const colorMap: Record<string, { deep: string; bg: string; ink: string }> = {
    sage: { deep: '#8B9C5A', bg: '#E3E6C8', ink: '#3D4A1F' },
    peach: { deep: '#EAB286', bg: '#F7DDC2', ink: '#8B4720' },
    lavender: { deep: '#B7A4D0', bg: '#D7CCE5', ink: '#4A3F6B' },
    cream: { deep: '#E0D3B3', bg: '#F3E9D4', ink: '#3D4A1F' },
    ink: { deep: '#3D4A1F', bg: '#6D7D3F', ink: '#F3E9D4' },
  };
  const p = colorMap[primary] ?? colorMap.sage;
  const a = colorMap[accent] ?? colorMap.peach;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.6)',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.deep }} />
          <div style={{ width: 40, height: 3, borderRadius: 2, background: p.ink, opacity: 0.8 }} />
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ width: 18, height: 2.5, borderRadius: 1.5, background: p.ink, opacity: 0.35 }} />
          ))}
        </div>
        <div style={{ width: 32, height: 10, borderRadius: 4, background: p.deep }} />
      </div>

      {layout === 'timeline' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: p.ink, lineHeight: 1 }}>
            {name.split(' ')[0]}
          </div>
          <div style={{ fontFamily: 'var(--font-script)', fontSize: 20, color: a.deep, marginTop: 2 }}>
            &amp; their day
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: i === 2 ? a.deep : 'rgba(255,255,255,0.6)',
                    border: `1.5px solid ${p.deep}`,
                  }}
                />
                <div style={{ width: 20, height: 2, background: p.deep, opacity: 0.4 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {layout === 'magazine' && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: p.ink, fontWeight: 600, lineHeight: 0.95 }}>
            A big
            <br />
            headline
            <br />
            here.
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, height: 30, borderRadius: 4, background: a.deep }} />
            <div style={{ flex: 2 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 2, borderRadius: 1, background: p.ink, opacity: 0.4, marginBottom: 4 }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {layout === 'filmstrip' && (
        <div>
          <div style={{ fontFamily: 'var(--font-script)', fontSize: 24, color: p.ink, textAlign: 'center', marginBottom: 10 }}>
            together again
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {[a.deep, p.deep, a.bg, p.bg].map((c, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 3,
                  background: c,
                  transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {layout === 'bento' && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.ink, marginBottom: 8, textAlign: 'center' }}>
            You&apos;re invited
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: 22, gap: 4 }}>
            <div style={{ gridColumn: 'span 2', gridRow: 'span 2', background: a.deep, borderRadius: 4 }} />
            <div style={{ background: p.deep, borderRadius: 4 }} />
            <div style={{ background: p.bg, borderRadius: 4 }} />
            <div style={{ gridColumn: 'span 2', background: a.bg, borderRadius: 4 }} />
            <div style={{ background: p.deep, borderRadius: 4 }} />
          </div>
        </div>
      )}

      {layout === 'parallax' && (
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, width: 60, height: 60, borderRadius: '50%', background: p.deep, opacity: 0.3 }} />
          <div style={{ position: 'absolute', top: 70, right: 24, width: 50, height: 50, borderRadius: '50%', background: a.deep, opacity: 0.4 }} />
          <div style={{ marginTop: 34, fontFamily: 'var(--font-display)', fontSize: 26, color: p.ink, position: 'relative' }}>
            In memory
          </div>
          <div style={{ fontFamily: 'var(--font-script)', fontSize: 18, color: p.ink, opacity: 0.6, position: 'relative' }}>
            of a life well-lived
          </div>
        </div>
      )}

      {layout === 'kenburns' && (
        <div style={{ height: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `linear-gradient(145deg, ${p.deep}, ${a.deep})`, opacity: 0.85 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: p.bg }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, textAlign: 'center' }}>Groovy</div>
              <div style={{ fontFamily: 'var(--font-script)', fontSize: 20, textAlign: 'center', opacity: 0.9 }}>celebration</div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 18,
          right: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {[p.deep, a.deep, p.bg, a.bg].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ fontSize: 8, fontWeight: 700, color: p.ink, opacity: 0.5, letterSpacing: '0.12em' }}>PEARLOOM</div>
      </div>
    </div>
  );
}

export function TemplatesV8() {
  const [cat, setCat] = useState('all');
  const [vibes, setVibes] = useState<string[]>([]);
  const [q, setQ] = useState('');

  const toggleVibe = (v: string) => setVibes((vs) => (vs.includes(v) ? vs.filter((x) => x !== v) : [...vs, v]));

  const filtered = useMemo(
    () =>
      TEMPLATES.filter((t) => cat === 'all' || t.cat === cat)
        .filter((t) => vibes.length === 0 || vibes.some((v) => t.vibes.includes(v)))
        .filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.description.toLowerCase().includes(q.toLowerCase())),
    [cat, vibes, q]
  );
  const featured = filtered.filter((t) => t.featured);
  const rest = filtered.filter((t) => !t.featured);

  return (
    <div className="pl8" style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <TopNav active="Templates" />

      <section className="pl8-templates-hero" style={{ position: 'relative', padding: '72px 32px 48px', overflow: 'hidden' }}>
        <Blob tone="lavender" size={380} opacity={0.5} style={{ position: 'absolute', top: -80, left: -80 }} />
        <Blob tone="peach" size={320} opacity={0.45} style={{ position: 'absolute', top: 40, right: -80 }} />
        <Squiggle variant={2} width={200} style={{ position: 'absolute', top: 120, right: 260, transform: 'rotate(-12deg)' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
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
            <Icon name="sparkles" size={12} /> 64 lovingly designed templates
          </div>
          <h1 className="display" style={{ fontSize: 92, margin: 0, lineHeight: 0.98 }}>
            Start from a <span className="display-italic">story</span>
            <br />
            that feels like <span className="display-italic">yours.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', maxWidth: 560, margin: '22px auto 0', lineHeight: 1.55 }}>
            Every template is a full site — pages, flow, tone, and type — ready to fill with your own people, photos, and moments.
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

      <div
        className="pl8-filter-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(247, 242, 228, 0.9)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--line-soft)',
          borderBottom: '1px solid var(--line-soft)',
          padding: '14px 32px',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TPL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: cat === c.id ? 'var(--ink)' : 'var(--card)',
                  color: cat === c.id ? 'var(--cream)' : 'var(--ink)',
                  border: cat === c.id ? 'none' : '1px solid var(--line)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Icon name={c.icon} size={12} /> {c.label}
                <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{c.count}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Icon
                name="search"
                size={14}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                color="var(--ink-muted)"
              />
              <input
                placeholder="Search templates…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  padding: '10px 14px 10px 36px',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  background: 'var(--cream-2)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  width: 220,
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1240, margin: '10px auto 0', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              marginRight: 6,
            }}
          >
            Vibe
          </span>
          {TPL_VIBES.map((v) => (
            <button
              key={v}
              onClick={() => toggleVibe(v)}
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: vibes.includes(v) ? 'var(--peach-bg)' : 'transparent',
                border: vibes.includes(v) ? '1px solid var(--peach-2)' : '1px solid var(--line)',
                color: vibes.includes(v) ? 'var(--peach-ink)' : 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              {v}
            </button>
          ))}
          {vibes.length > 0 && (
            <button
              onClick={() => setVibes([])}
              style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginLeft: 6, background: 'transparent', border: 0, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {featured.length > 0 && (
        <section style={{ padding: '48px 32px 24px' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--peach-ink)',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkle size={11} /> Featured this month
                </div>
                <h2 className="display" style={{ fontSize: 36, margin: 0 }}>
                  Ones we&apos;re leaning on
                </h2>
              </div>
            </div>
            <div className="pl8-cols-3" style={{ gap: 24 }}>
              {featured.map((t) => (
                <TemplateTile key={t.id} t={t} size="lg" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: '24px 32px 80px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
            <h2 className="display" style={{ fontSize: 30, margin: 0 }}>
              {cat === 'all' ? 'The whole library' : TPL_CATEGORIES.find((c) => c.id === cat)?.label}
              <span style={{ fontSize: 15, color: 'var(--ink-muted)', marginLeft: 10, fontWeight: 400 }}>
                {rest.length + featured.length} {rest.length + featured.length === 1 ? 'template' : 'templates'}
              </span>
            </h2>
          </div>
          <div className="pl8-cols-4">
            {rest.map((t) => (
              <TemplateTile key={t.id} t={t} size="md" />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
              <Pear size={60} tone="sage" />
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>Nothing quite fits.</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Try different vibes, or let Pear sketch one for you.</div>
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: '40px 32px 100px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div
            className="pl8-pear-offer"
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(125deg, var(--sage-tint) 0%, var(--peach-bg) 65%, var(--lavender-bg) 100%)',
              borderRadius: 28,
              padding: '48px 56px',
              border: '1px solid var(--card-ring)',
              display: 'grid',
              gridTemplateColumns: '1fr 200px',
              alignItems: 'center',
              gap: 30,
            }}
          >
            <Squiggle variant={1} width={280} style={{ position: 'absolute', top: 30, right: 260, opacity: 0.6 }} />
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--peach-ink)',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="wand" size={12} /> Can&apos;t find the right fit?
              </div>
              <h3 className="display" style={{ fontSize: 44, margin: '0 0 10px' }}>
                Tell Pear what you&apos;re <span className="display-italic">imagining.</span>
              </h3>
              <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 480, margin: '0 0 18px' }}>
                Describe the event, the feeling, the people. Pear will sketch a template just for you — layout, tone, palette, and all.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
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
        </div>
      </section>

      <Footbar />
    </div>
  );
}
