'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketplace/TemplatePreviewModal.tsx
//
// Full-site preview modal. Opens when the user clicks a tile on
// /templates and renders a scrollable miniature of the template
// stack — hero → story → event → photos → rsvp → footer — with
// the tile's actual palette and (when available) the real
// SITE_TEMPLATES motif + poetry data.
//
// IMPORTANT — this component mounts into document.body via a
// portal. The marketplace wrapper uses `.pl8 { overflow-x:
// hidden }` which can clip `position: fixed` children when any
// ancestor creates a containing block (transform, filter,
// backdrop-filter, etc.). Portaling out avoids that entirely.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Blob, Icon, Pear, Sparkle, Squiggle } from '../motifs';
import type { Template, TemplatePalette } from './templates-data';
import { findMatchingSiteTemplate } from './template-matcher';
import { resolveTemplateDesign } from './template-themes';

interface PaletteTones {
  paper: string;
  cardBg: string;
  ink: string;
  inkSoft: string;
  accent: string;
  accentLight: string;
  deep: string;
  mid: string;
  soft: string;
}

// Marketplace palette IDs → tone swatches matching what the v8 tile uses.
// Kept local so this file is self-contained and the preview stays stable
// even if TemplatePreview.tsx is refactored.
const PALETTE_TONES: Record<TemplatePalette, PaletteTones> = {
  'groovy-garden': { paper: '#F4F7F1', cardBg: '#FFFFFF', ink: '#1E2A1A', inkSoft: '#4A5642', accent: '#6A8F5A', accentLight: '#DDEBD4', deep: '#3D4A1F', mid: '#8B9C5A', soft: '#CBD29E' },
  'dusk-meadow':   { paper: '#F5F1E6', cardBg: '#FFFDF8', ink: '#3A2F52', inkSoft: '#6B5A8C', accent: '#9F86C8', accentLight: '#E0D5F0', deep: '#4A3F6B', mid: '#B7A4D0', soft: '#D7CCE5' },
  'warm-linen':    { paper: '#F3E9D4', cardBg: '#FFFAEE', ink: '#5B3520', inkSoft: '#8B4720', accent: '#C6703D', accentLight: '#F4D8BE', deep: '#8B4720', mid: '#EAB286', soft: '#F7DDC2' },
  'olive-gold':    { paper: '#F5F2E5', cardBg: '#FFFEF6', ink: '#2B341A', inkSoft: '#4A5431', accent: '#D4A95D', accentLight: '#E9E0C6', deep: '#3D4A1F', mid: '#6D7D3F', soft: '#CBD29E' },
  'lavender-ink':  { paper: '#EDE7F5', cardBg: '#FBF9FE', ink: '#1F1A2E', inkSoft: '#3E3356', accent: '#7B5FB0', accentLight: '#D8CCEA', deep: '#2A2340', mid: '#6B5A8C', soft: '#C0B2D6' },
  'cream-sage':    { paper: '#F3EFE3', cardBg: '#FFFCF4', ink: '#2E3620', inkSoft: '#50583E', accent: '#8B9C5A', accentLight: '#DAE0C4', deep: '#3D4A1F', mid: '#6D7D3F', soft: '#CBD29E' },
  'peach-cream':   { paper: '#FAEDD6', cardBg: '#FFF8EB', ink: '#5C2E18', inkSoft: '#8B4720', accent: '#E89261', accentLight: '#F9D6BB', deep: '#8B4720', mid: '#EAB286', soft: '#F7DDC2' },
};

interface Props {
  open: boolean;
  template: Template | null;
  onClose: () => void;
}

export function TemplatePreviewModal({ open, template, onClose }: Props) {
  // Portal target — document.body, resolved once mounted so SSR
  // doesn't try to touch `document`.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(typeof document !== 'undefined' ? document.body : null);
  }, []);

  // Inject a Google Fonts <link> for the current template's font
  // pair so the modal preview renders in true type. One link per
  // unique pair; removed when the modal closes. Kept out of
  // next/font because the font list is dynamic (56 templates ×
  // whatever pairings we ship).
  useEffect(() => {
    if (!open || !template) return;
    const design = resolveTemplateDesign(template.id);
    const families = [design.fonts.heading, design.fonts.body]
      .filter((f, i, arr) => f && arr.indexOf(f) === i)
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
      .join('&');
    if (!families) return;
    const id = `pearloom-template-fonts-${template.id}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
    return () => {
      // Leave the link in place — other modals may use the same
      // families and re-fetching is wasteful. Browser caches anyway.
    };
  }, [open, template]);

  // Lookup the rich SITE_TEMPLATES entry via the marketplace matcher.
  // When found, it gives us real hero copy and motif data; otherwise
  // we render with marketplace-level fallback copy.
  const site = useMemo(() => (template ? findMatchingSiteTemplate(template) : null), [template]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );
  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!open || !template || !portalTarget) return null;

  // Bespoke design spec — actual palette + font pair the template
  // will render with in the editor. Trumps the palette-token tones.
  const design = resolveTemplateDesign(template.id);
  const legacyTones = PALETTE_TONES[template.palette] ?? PALETTE_TONES['groovy-garden'];
  const tones: PaletteTones = {
    paper: design.theme.background,
    cardBg: design.theme.cardBg ?? design.theme.background,
    ink: design.theme.foreground,
    inkSoft: design.theme.muted,
    accent: design.theme.accent,
    accentLight: design.theme.accentLight,
    deep: design.theme.foreground,
    mid: design.theme.accent,
    soft: design.theme.accentLight,
  };
  // Silence unused legacy fallback (kept around in case data drifts).
  void legacyTones;
  const fontHeading = design.fonts.heading;
  const fontBody = design.fonts.body;
  const headingStack = `"${fontHeading}", Georgia, serif`;
  const bodyStack = `"${fontBody}", system-ui, -apple-system, sans-serif`;
  // Prefer the real SITE_TEMPLATE poetry when we found a match.
  const heroName = template.heroWord ?? template.name;
  const heroScript = site?.poetry?.heroTagline ?? template.heroScript ?? template.tagline ?? 'a day worth keeping';
  const welcome = site?.poetry?.welcomeStatement ?? template.description;
  const closing = site?.poetry?.closingLine ?? 'with love · made on Pearloom';
  const stampText = site?.motifs?.stamp?.text ?? 'SAVE · THE · DATE';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${template.name} preview`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(14,13,11,0.58)',
        backdropFilter: 'blur(6px)',
        // Flex (not grid) so the child's width: 100%/maxWidth resolves
        // against a concrete parent — `display:grid; placeItems:center`
        // without grid-template-columns creates a circular width
        // reference that collapses the card to 0 on some browsers.
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        overflowY: 'auto',
        animation: 'pear-modal-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pl8"
        style={{
          width: '100%',
          maxWidth: 1080,
          height: 'min(720px, calc(100vh - 48px))',
          background: 'var(--cream, #FDFAF0)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(14,13,11,0.35)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.9fr)',
        }}
      >
        {/* ── LEFT: site preview (scroll) ── */}
        <div
          style={{
            background: tones.paper,
            color: tones.ink,
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            padding: 0,
          }}
        >
          {/* Hero */}
          <div
            style={{
              position: 'relative',
              padding: '56px 40px 48px',
              overflow: 'hidden',
              background: `linear-gradient(160deg, ${tones.paper} 0%, ${tones.soft} 100%)`,
            }}
          >
            <Blob tone="lavender" size={280} opacity={0.35} seed={0} style={{ position: 'absolute', top: -80, left: -80 }} />
            <Blob tone="peach" size={220} opacity={0.32} seed={1} style={{ position: 'absolute', top: 40, right: -60 }} />
            <Squiggle variant={1} width={180} stroke={tones.accent} style={{ position: 'absolute', bottom: 60, left: 60, opacity: 0.55 }} />

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: tones.accent,
                  marginBottom: 10,
                }}
              >
                {stampText}
              </div>
              <div
                style={{
                  fontFamily: headingStack,
                  fontSize: 'clamp(42px, 5vw, 60px)',
                  lineHeight: 1.02,
                  margin: 0,
                  color: tones.ink,
                  fontWeight: 500,
                }}
              >
                {heroName}
              </div>
              <div
                style={{
                  fontFamily: headingStack,
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  fontStyle: 'italic',
                  color: tones.inkSoft,
                  marginTop: 10,
                  maxWidth: 520,
                }}
              >
                {heroScript}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <MiniButton tones={tones} filled>
                  RSVP
                </MiniButton>
                <MiniButton tones={tones}>View details</MiniButton>
              </div>
            </div>
          </div>

          {/* Divider */}
          <SectionRule tones={tones} />

          {/* Story teaser */}
          <section style={{ padding: '36px 40px', fontFamily: bodyStack }}>
            <MiniEyebrow tones={tones}>Our story</MiniEyebrow>
            <div
              style={{ fontFamily: headingStack, fontSize: 24, marginTop: 4, marginBottom: 10, color: tones.ink, fontStyle: 'italic' }}
            >
              {welcome.slice(0, 80)}
              {welcome.length > 80 ? '…' : ''}
            </div>
            <StoryShimmer tones={tones} />
          </section>

          <SectionRule tones={tones} />

          {/* Event strip */}
          <section style={{ padding: '36px 40px' }}>
            <MiniEyebrow tones={tones}>The day</MiniEyebrow>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginTop: 10,
              }}
            >
              {['Ceremony', 'Reception', 'Brunch'].map((label, i) => (
                <div
                  key={label}
                  style={{
                    background: tones.cardBg,
                    border: `1px solid ${tones.accentLight}`,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      fontSize: 9,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: tones.accent,
                      marginBottom: 6,
                    }}
                  >
                    Stage 0{i + 1}
                  </div>
                  <div style={{ fontFamily: headingStack, fontSize: 16, fontStyle: 'italic', color: tones.ink }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: tones.inkSoft, marginTop: 4 }}>
                    {i === 0 ? 'Saturday · 4pm' : i === 1 ? 'Saturday · 6pm' : 'Sunday · 10am'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <SectionRule tones={tones} />

          {/* Photo grid */}
          <section style={{ padding: '36px 40px' }}>
            <MiniEyebrow tones={tones}>Moments</MiniEyebrow>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginTop: 10,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1 / 1',
                    background: i % 2 === 0 ? tones.mid : tones.soft,
                    borderRadius: 8,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
          </section>

          <SectionRule tones={tones} />

          {/* Closing */}
          <section style={{ padding: '36px 40px 56px', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: headingStack,
                fontStyle: 'italic',
                fontSize: 20,
                color: tones.inkSoft,
                maxWidth: 520,
                margin: '0 auto',
                lineHeight: 1.4,
              }}
            >
              {closing}
            </div>
          </section>
        </div>

        {/* ── RIGHT: meta + CTA ── */}
        <div
          style={{
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--cream, #FDFAF0)',
            borderLeft: '1px solid var(--line, rgba(61,74,31,0.14))',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            style={{
              alignSelf: 'flex-end',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid var(--line, rgba(61,74,31,0.14))',
              background: 'var(--cream, #FDFAF0)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 18,
              lineHeight: 1,
              color: 'var(--ink, #18181B)',
            }}
          >
            ×
          </button>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tones.accent,
                marginBottom: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkle size={11} color="var(--gold, #C19A4B)" />
              Live preview
            </div>
            <h3
              style={{
                fontFamily: headingStack,
                fontSize: 28,
                margin: 0,
                lineHeight: 1.1,
                color: 'var(--ink, #18181B)',
                fontWeight: 500,
              }}
            >
              {template.name}
            </h3>
            <div
              style={{
                fontFamily: headingStack,
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--ink-soft, #4A5642)',
                marginTop: 6,
              }}
            >
              {site?.tagline ?? template.description}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line, rgba(61,74,31,0.14))' }} />

          <MetaRow label="Occasion" value={template.occasion.replace(/-/g, ' ')} />
          <MetaRow label="Layout" value={template.layout} />
          <MetaRow label="Palette" value={design.tone ?? template.palette.replace(/-/g, ' ')} />
          <MetaRow label="Typography" value={`${fontHeading} / ${fontBody}`} />
          <MetaRow label="Vibes" value={template.vibes.join(' · ')} />

          {/* Palette swatch */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
                marginBottom: 8,
              }}
            >
              Color plan
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[tones.paper, tones.accent, tones.mid, tones.deep, tones.ink].map((c, i) => (
                <div
                  key={i}
                  title={c}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: c,
                    border: '1.5px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 6px rgba(14,13,11,0.12)',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <Link
            href={`/wizard/new?template=${template.id}`}
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
          >
            Use this template <Icon name="arrow-right" size={12} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ justifyContent: 'center' }}
          >
            Keep browsing
          </button>
          {!site && (
            <div
              style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 9.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
                textAlign: 'center',
                marginTop: -4,
              }}
            >
              <Pear size={10} tone="sage" shadow={false} /> preview built from tile palette
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pear-modal-in {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    portalTarget,
  );
}

function SectionRule({ tones }: { tones: PaletteTones }) {
  return (
    <div style={{ padding: '0 40px' }}>
      <div style={{ height: 1, background: tones.accentLight, opacity: 0.8 }} />
    </div>
  );
}

function MiniEyebrow({ children, tones }: { children: React.ReactNode; tones: PaletteTones }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 9.5,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: tones.accent,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function MiniButton({ children, tones, filled }: { children: React.ReactNode; tones: PaletteTones; filled?: boolean }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: '8px 14px',
        borderRadius: 999,
        fontWeight: 600,
        background: filled ? tones.ink : 'transparent',
        color: filled ? tones.paper : tones.ink,
        border: filled ? 'none' : `1px solid ${tones.ink}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function StoryShimmer({ tones }: { tones: PaletteTones }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
      {[86, 92, 74].map((w, i) => (
        <div
          key={i}
          style={{
            height: 10,
            width: `${w}%`,
            background: tones.mid,
            opacity: 0.28,
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, #6F6557)',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink, #18181B)', textTransform: 'capitalize', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
