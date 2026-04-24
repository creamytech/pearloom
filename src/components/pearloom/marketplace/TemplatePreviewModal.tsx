'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketplace/TemplatePreviewModal.tsx
//
// Full-site preview modal. Previously this rendered a hand-coded
// mock that visually *didn't match* what SiteV8Renderer actually
// produces — the user saw one thing in the preview and got a
// different site in the editor.
//
// Now: we seed a plausible manifest for the template and mount
// the real <SiteV8Renderer> inside the scroll pane. What you see
// here is exactly what the editor will render on day one.
//
// The left pane is the real site. The right pane keeps a slim
// meta summary + CTA to start the wizard with the template.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Icon, Sparkle } from '../motifs';
import type { Template } from './templates-data';
import { findMatchingSiteTemplate } from './template-matcher';
import { resolveTemplateDesign } from './template-themes';
import { seedPreviewManifest } from './seed-preview-manifest';
import { SiteV8Renderer } from '../site/SiteV8Renderer';

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

  // Inject Google Fonts for the template's font pair so the
  // seeded manifest's --font-display / --font-sans CSS vars
  // resolve to real glyphs inside the preview.
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

  const site = useMemo(() => (template ? findMatchingSiteTemplate(template) : null), [template]);
  const seed = useMemo(() => (template ? seedPreviewManifest(template) : null), [template]);
  const design = useMemo(() => (template ? resolveTemplateDesign(template.id) : null), [template]);

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

  if (!open || !template || !portalTarget || !seed || !design) return null;

  const fontHeading = design.fonts.heading;
  const fontBody = design.fonts.body;
  const headingStack = `"${fontHeading}", Georgia, serif`;
  const swatches = [
    design.theme.background,
    design.theme.accentLight,
    design.theme.accent,
    design.theme.foreground,
  ];

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
          maxWidth: 1180,
          height: 'min(780px, calc(100vh - 48px))',
          background: 'var(--cream, #FDFAF0)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(14,13,11,0.35)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 0.8fr)',
        }}
      >
        {/* ── LEFT: real SiteV8Renderer scroll pane ── */}
        <div
          style={{
            background: 'var(--paper, #FDFAF0)',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          <SiteV8Renderer
            manifest={seed.manifest}
            names={seed.names}
            siteSlug={seed.slug}
            prettyUrl={seed.prettyUrl}
          />
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
                color: design.theme.accent,
                marginBottom: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkle size={11} /> Live preview
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
              {swatches.map((c, i) => (
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
