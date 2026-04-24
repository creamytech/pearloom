'use client';

/* ========================================================================
   TemplatePreview — a miniature, stylized render of a site based on the
   template's palette + layout. Designed to look gorgeous at small sizes.
   ======================================================================== */

import { Pear, Sparkle, Squiggle } from '../motifs';
import type { Template, TemplateLayout, TemplatePalette } from './templates-data';
import { resolveTemplateDesign } from './template-themes';

type Tone = { deep: string; mid: string; soft: string; paper: string; ink: string; accent: string };

// Legacy token fallback for any template that somehow has no
// bespoke design spec. The curated per-template palettes live in
// template-themes.ts and are what the tile actually renders with.
const PALETTE_TONES: Record<TemplatePalette, Tone> = {
  'groovy-garden': { deep: '#3D4A1F', mid: '#8B9C5A', soft: '#CBD29E', paper: '#F3E9D4', ink: '#3D4A1F', accent: '#EAB286' },
  'dusk-meadow': { deep: '#6B5A8C', mid: '#B7A4D0', soft: '#D7CCE5', paper: '#F3E9D4', ink: '#4A3F6B', accent: '#CBD29E' },
  'warm-linen': { deep: '#8B4720', mid: '#EAB286', soft: '#F7DDC2', paper: '#F3E9D4', ink: '#8B4720', accent: '#C6703D' },
  'olive-gold': { deep: '#3D4A1F', mid: '#6d7d3f', soft: '#CBD29E', paper: '#F3E9D4', ink: '#3D4A1F', accent: '#D4A95D' },
  'lavender-ink': { deep: '#6B5A8C', mid: '#B7A4D0', soft: '#D7CCE5', paper: '#EDE0C5', ink: '#3D4A1F', accent: '#B89244' },
  'cream-sage': { deep: '#6d7d3f', mid: '#8B9C5A', soft: '#E3E6C8', paper: '#F3E9D4', ink: '#3D4A1F', accent: '#D4A95D' },
  'peach-cream': { deep: '#C6703D', mid: '#EAB286', soft: '#F7DDC2', paper: '#F3E9D4', ink: '#8B4720', accent: '#6B5A8C' },
};

export function TemplatePreview({ template, small = false }: { template: Template; small?: boolean }) {
  // Resolve the bespoke design first — falls back to palette-token
  // tones for any template without a curated entry.
  const design = resolveTemplateDesign(template.id);
  const tone = PALETTE_TONES[template.palette];
  const t: Tone = design
    ? {
        deep: design.theme.foreground,
        mid: design.theme.accent,
        soft: design.theme.accentLight,
        paper: design.theme.background,
        ink: design.theme.foreground,
        accent: design.theme.accent,
      }
    : tone;
  const name = template.heroWord ?? template.name;
  const sub = template.heroScript ?? 'a day worth keeping';
  const scale = small ? 0.78 : 1;
  const fontHeading = design?.fonts?.heading ?? 'Fraunces';
  // Tile uses the family name so tiles where the browser has the
  // font cached render in-voice; otherwise falls through to serif
  // (acceptable for a miniature). The modal preview loads fonts
  // via <link> so the full-size preview always shows true type.
  const headingStack = `"${fontHeading}", Georgia, serif`;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `linear-gradient(155deg, ${t.paper}, ${t.soft})`,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: t.soft, opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: t.mid, opacity: 0.35 }} />

      <div style={{ position: 'relative', padding: small ? 14 : 18, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Mini nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.55)',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Pear size={12} tone="sage" shadow={false} />
            <div style={{ width: 26, height: 3, borderRadius: 2, background: t.ink, opacity: 0.8 }} />
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: 14, height: 2.5, borderRadius: 1.5, background: t.ink, opacity: 0.35 }} />
            ))}
          </div>
          <div style={{ width: 28, height: 10, borderRadius: 4, background: t.deep }} />
        </div>

        {/* Hero body */}
        <LayoutBody layout={template.layout} tone={t} name={name} sub={sub} scale={scale} headingStack={headingStack} />

        {/* Footer strip */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            {[t.deep, t.mid, t.soft, t.accent].map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, color: t.ink, opacity: 0.55, letterSpacing: '0.14em' }}>PEARLOOM</div>
        </div>
      </div>
    </div>
  );
}

function LayoutBody({
  layout,
  tone: t,
  name,
  sub,
  scale,
  headingStack,
}: {
  layout: TemplateLayout;
  tone: Tone;
  name: string;
  sub: string;
  scale: number;
  headingStack: string;
}) {
  const nameFontSize = Math.round(32 * scale);
  const subFontSize = Math.round(16 * scale);

  switch (layout) {
    case 'timeline':
      return (
        <div style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
          <div style={{ fontFamily: headingStack, fontSize: nameFontSize, color: t.ink, lineHeight: 1, fontWeight: 600 }}>
            {name.split(' ')[0]}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-script)',
              fontSize: subFontSize,
              color: t.deep,
              marginTop: 2,
            }}
          >
            {sub}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center', position: 'relative' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: i === 2 ? t.accent : 'rgba(255,255,255,0.75)',
                    border: `1.5px solid ${t.deep}`,
                  }}
                />
                <div style={{ width: 22, height: 22, borderRadius: 3, background: i === 2 ? t.mid : t.soft }} />
              </div>
            ))}
            <svg
              style={{ position: 'absolute', top: 8, left: 10, right: 10, width: 'calc(100% - 20px)', height: 2 }}
              preserveAspectRatio="none"
              viewBox="0 0 200 2"
            >
              <path d="M 0 1 L 200 1" stroke={t.deep} strokeWidth="0.6" strokeDasharray="2 3" />
            </svg>
          </div>
        </div>
      );
    case 'magazine':
      return (
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: headingStack,
              fontSize: nameFontSize - 2,
              color: t.ink,
              fontWeight: 600,
              lineHeight: 0.95,
            }}
          >
            {name.split(' ').slice(0, 2).join(' ')}
          </div>
          <div
            style={{
              fontFamily: headingStack,
              fontStyle: 'italic',
              fontSize: Math.round(18 * scale),
              color: t.deep,
              marginTop: 4,
            }}
          >
            {sub}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '40% 1fr', gap: 8 }}>
            <div style={{ height: 50, borderRadius: 4, background: t.mid }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 2, borderRadius: 1, background: t.ink, opacity: 0.35 }} />
              ))}
            </div>
          </div>
        </div>
      );
    case 'filmstrip':
      return (
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-script)', fontSize: Math.round(20 * scale), color: t.ink, textAlign: 'center', marginBottom: 10 }}>
            {sub}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {[t.deep, t.mid, t.accent, t.soft].map((c, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 3,
                  background: c,
                  transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
        </div>
      );
    case 'bento':
      return (
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: headingStack, fontSize: Math.round(20 * scale), color: t.ink, marginBottom: 8, textAlign: 'center' }}>
            {name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: Math.round(18 * scale), gap: 4 }}>
            <div style={{ gridColumn: 'span 2', gridRow: 'span 2', background: t.accent, borderRadius: 4 }} />
            <div style={{ background: t.deep, borderRadius: 4 }} />
            <div style={{ background: t.soft, borderRadius: 4 }} />
            <div style={{ gridColumn: 'span 2', background: t.mid, borderRadius: 4 }} />
            <div style={{ background: t.deep, borderRadius: 4 }} />
          </div>
        </div>
      );
    case 'parallax':
      return (
        <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 8,
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: t.deep,
              opacity: 0.22,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: t.accent,
              opacity: 0.35,
            }}
          />
          <div style={{ marginTop: 28, fontFamily: headingStack, fontSize: nameFontSize - 6, color: t.ink, position: 'relative', fontWeight: 600 }}>
            {name.split(' ')[0]}
          </div>
          <div style={{ fontFamily: 'var(--font-script)', fontSize: subFontSize, color: t.ink, opacity: 0.7, position: 'relative' }}>
            {sub}
          </div>
        </div>
      );
    case 'kenburns':
      return (
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 8,
              background: `linear-gradient(145deg, ${t.deep}, ${t.accent})`,
              opacity: 0.92,
            }}
          />
          <Squiggle
            variant={1}
            width={70}
            height={22}
            stroke={t.soft}
            style={{ position: 'absolute', top: 8, right: 10, opacity: 0.75 }}
          />
          <Sparkle size={14} color={t.soft} style={{ position: 'absolute', bottom: 10, left: 10, opacity: 0.85 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: t.soft }}>
            <div>
              <div style={{ fontFamily: headingStack, fontSize: nameFontSize - 2, textAlign: 'center', lineHeight: 1 }}>
                {name.split(' ')[0]}
              </div>
              <div style={{ fontFamily: 'var(--font-script)', fontSize: subFontSize, textAlign: 'center', opacity: 0.92, marginTop: 2 }}>
                {sub}
              </div>
            </div>
          </div>
        </div>
      );
    case 'mosaic':
      return (
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: headingStack,
              fontSize: Math.round(18 * scale),
              color: t.ink,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridAutoRows: Math.round(16 * scale), gap: 3 }}>
            {[t.deep, t.mid, t.accent, t.soft, t.deep, t.soft, t.accent, t.mid, t.deep, t.soft].map((c, i) => (
              <div key={i} style={{ background: c, borderRadius: 2 }} />
            ))}
          </div>
        </div>
      );
  }
}
