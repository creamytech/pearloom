'use client';

import Link from 'next/link';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../design/DesignAtoms';

const TEMPLATES = [
  { k: 'garden', l: 'Garden Editorial', cat: 'Weddings', bg: PD.paperCard, accent: PD.olive },
  { k: 'sunwashed', l: 'Sunwashed', cat: 'Weddings', bg: '#F1E6C8', accent: PD.butter },
  { k: 'keepsake', l: 'Modern Keepsake', cat: 'Weddings', bg: '#EADFC4', accent: PD.stone },
  { k: 'bloom', l: 'Baby in Bloom', cat: 'Baby Shower', bg: '#F0D9D4', accent: PD.rose },
  { k: 'milestone', l: 'Milestone', cat: 'Birthdays', bg: '#E3DCC0', accent: PD.pear },
  { k: 'graduate', l: 'Graduate', cat: 'Graduations', bg: '#DCDFB8', accent: PD.oliveDeep },
];

export function LandingTemplates() {
  return (
    <section id="templates" style={{ padding: '60px 40px', background: PD.paper }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 11,
                color: '#6E5BA8',
                letterSpacing: '0.26em',
                marginBottom: 14,
              }}
            >
              A STARTING POINT FOR EVERY STORY
            </div>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(28px, 3.2vw, 40px)',
                margin: 0,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              Beautiful templates, ready to make your own.
            </h2>
          </div>
          <Link
            href="/marketplace"
            style={{
              color: PD.ink,
              fontSize: 13,
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            Explore all templates <span style={{ fontSize: 14 }}>→</span>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 16,
          }}
          className="pl-templates-rail"
        >
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.k} {...t} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pl-templates-rail) {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pl-templates-rail) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}

function TemplateCard({
  l,
  cat,
  bg,
  accent,
}: {
  l: string;
  cat: string;
  bg: string;
  accent: string;
}) {
  return (
    <Link
      href="/marketplace"
      style={{
        display: 'block',
        background: bg,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(31,36,24,0.06)',
        textDecoration: 'none',
        color: PD.ink,
        aspectRatio: '3 / 4',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 12,
          background: '#FFFEF7',
          borderRadius: 8,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 6px 18px rgba(31,36,24,0.06)',
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontStyle: 'italic',
              fontSize: 22,
              color: accent,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            A &amp; J
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{l}</div>
          <div style={{ fontSize: 10, color: PD.inkSoft, marginTop: 3 }}>{cat}</div>
        </div>
      </div>
    </Link>
  );
}
