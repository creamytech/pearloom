'use client';

/* Dev-only QA sheet — every motif, monogram frame, and divider in
   one scroll. See page.tsx for the production gate. */

import { Motif, type MotifKind } from '@/components/pearloom/site/MotifScatter';
import { Monogram, type MonogramFrame } from '@/components/pearloom/site/Monogram';
import { KDivider } from '@/components/pearloom/redesign/ThemedSite';

const MOTIFS: MotifKind[] = [
  'olive', 'bloom', 'pressed', 'lemon', 'sun', 'wheat', 'fern', 'shell',
  'citrus', 'laurel', 'deco-fan', 'palm', 'mountain', 'wave-curl', 'rose',
  'crescent', 'dove', 'arrows', 'pinecone', 'butterfly',
  'magnolia', 'gingko', 'champagne', 'lantern', 'compass', 'peony', 'vine',
  'starburst', 'ribbon', 'hummingbird',
  'orchid', 'monstera', 'holly', 'cherry-blossom', 'anchor', 'disco',
];

const FRAMES: MonogramFrame[] = [
  'none', 'ring', 'diamond', 'laurel', 'shield', 'oval', 'arch', 'sprig',
  'seal', 'banner', 'stitch', 'pearls', 'fan', 'garland', 'lozenge', 'corners',
  'wreath', 'gate', 'halo', 'tag',
];

const DIVIDERS = [
  'rule', 'sprig', 'brush', 'dot', 'deckle', 'wave', 'arrow', 'seal', 'bow',
  'diamond', 'morse', 'thread', 'vine', 'stars', 'scallop',
];

const label: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono, monospace)',
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--pl-muted, #6F6557)',
};

const h2: React.CSSProperties = {
  fontFamily: 'var(--pl-font-display, Fraunces, serif)',
  fontSize: 28,
  margin: '48px 0 20px',
  color: 'var(--pl-ink, #0E0D0B)',
};

export function DecorGalleryClient() {
  return (
    <main
      style={{
        background: 'var(--pl-cream, #F5EFE2)',
        minHeight: '100vh',
        padding: '48px clamp(20px, 5vw, 64px) 96px',
        color: 'var(--pl-ink, #0E0D0B)',
        /* The decor components bind to the live-site --t-* vocabulary;
           outside a themed site those vars are unset, so pin the
           brand-default pass here. */
        ['--t-accent' as string]: '#5C6B3F',
        ['--t-accent-ink' as string]: '#363F22',
        ['--t-gold' as string]: '#C19A4B',
        ['--t-line' as string]: '#D8CFB8',
        ['--t-ink' as string]: '#0E0D0B',
        ['--t-paper' as string]: '#FBF7EE',
        ['--t-display' as string]: "'Fraunces', Georgia, serif",
      }}
    >
      <div style={label}>DEV · DECOR GALLERY</div>
      <h1 style={{ ...h2, fontSize: 40, margin: '8px 0 4px' }}>The decor library, on one sheet.</h1>
      <p style={{ maxWidth: 560, color: 'var(--pl-ink-soft, #3A332C)', fontSize: 14 }}>
        Every motif, monogram frame, and divider, including the 2026-06-09 collection.
        Colors bind to the theme tokens, so this sheet shows the brand-default olive/gold pass.
      </p>

      <h2 style={h2} id="motifs">Motifs ({MOTIFS.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
        {MOTIFS.map((m) => (
          <div
            key={m}
            data-motif={m}
            style={{
              background: 'var(--pl-cream-card, #FBF7EE)',
              border: '1px solid var(--pl-divider, #D8CFB8)',
              borderRadius: 12,
              padding: 14,
              display: 'grid',
              placeItems: 'center',
              gap: 10,
              minHeight: 120,
            }}
          >
            <Motif kind={m} size={64} />
            <div style={label}>{m}</div>
          </div>
        ))}
      </div>

      <h2 style={h2} id="monograms">Monogram frames ({FRAMES.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        {FRAMES.map((f) => (
          <div
            key={f}
            data-frame={f}
            style={{
              background: 'var(--pl-cream-card, #FBF7EE)',
              border: '1px solid var(--pl-divider, #D8CFB8)',
              borderRadius: 12,
              padding: 12,
              display: 'grid',
              placeItems: 'center',
              gap: 8,
            }}
          >
            <Monogram initials="A & J" frame={f} size={150} withCard={false} ariaHidden />
            <div style={label}>{f}</div>
          </div>
        ))}
      </div>

      <h2 style={h2} id="dividers">Dividers ({DIVIDERS.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {DIVIDERS.map((d) => (
          <div
            key={d}
            data-divider={d}
            style={{
              background: 'var(--pl-cream-card, #FBF7EE)',
              border: '1px solid var(--pl-divider, #D8CFB8)',
              borderRadius: 12,
              padding: '26px 18px 14px',
              display: 'grid',
              gap: 16,
            }}
          >
            <KDivider look={d} width={200} />
            <div style={{ ...label, textAlign: 'center' }}>{d}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
