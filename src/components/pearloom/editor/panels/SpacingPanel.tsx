'use client';

/* ========================================================================
   SpacingPanel — host control over the global spacing + radius rhythm.

     • Section spacing (cozy / comfortable / spacious / lush) — controls
       the vertical breathing room between sections.
     • Card radius (sharp / soft / rounded / pillow) — controls how
       round the card corners are across the published site.
     • Photo radius (sharp / soft / rounded / circle) — independent
       control for image tiles + polaroids.

   All three write to manifest.theme.spacing / theme.radius so the
   renderer can read them via CSS-var overrides. The current
   SiteV8Renderer already understands `manifest.spacing` (cozy/etc.)
   so this panel keeps that legacy field in sync.
   ======================================================================== */

import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';

const SECTION_SPACING = [
  { id: 'cozy',        label: 'Cozy',        rem: 3 },
  { id: 'comfortable', label: 'Comfortable', rem: 5 },
  { id: 'spacious',    label: 'Spacious',    rem: 7 },
  { id: 'lush',        label: 'Lush',        rem: 9 },
] as const;

const RADIUS_SCALE = [
  { id: 'sharp',  label: 'Sharp',  px: 0 },
  { id: 'soft',   label: 'Soft',   px: 6 },
  { id: 'rounded', label: 'Rounded', px: 14 },
  { id: 'pillow', label: 'Pillow', px: 24 },
] as const;

const PHOTO_RADIUS = [
  { id: 'sharp',  label: 'Sharp',  px: 0 },
  { id: 'soft',   label: 'Soft',   px: 8 },
  { id: 'rounded', label: 'Rounded', px: 18 },
  { id: 'circle', label: 'Circle', px: 9999 },
] as const;

export function SpacingPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const theme = (manifest as unknown as {
    theme?: { spacing?: string; cardRadius?: string; photoRadius?: string };
    spacing?: string;
  });
  const sectionSpacing = theme.theme?.spacing ?? theme.spacing ?? 'comfortable';
  const cardRadius = theme.theme?.cardRadius ?? 'rounded';
  const photoRadius = theme.theme?.photoRadius ?? 'soft';

  function setSpacing(id: string) {
    const existing = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    onChange({
      ...manifest,
      spacing: id, // legacy mirror so SiteV8Renderer keeps reading it
      theme: { ...existing, spacing: id },
    } as unknown as StoryManifest);
  }
  function setCard(id: string) {
    const existing = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    onChange({
      ...manifest,
      theme: { ...existing, cardRadius: id },
    } as unknown as StoryManifest);
  }
  function setPhoto(id: string) {
    const existing = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    onChange({
      ...manifest,
      theme: { ...existing, photoRadius: id },
    } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="Spacing & shape"
      hint="The rhythm of the page — how much air sits between sections, and how round corners feel."
    >
      <Group label="Section spacing">
        <SegmentedRow
          value={sectionSpacing}
          options={SECTION_SPACING.map((s) => ({ value: s.id, label: s.label }))}
          onChange={setSpacing}
        />
      </Group>
      <Group label="Card corners">
        <SegmentedRow
          value={cardRadius}
          options={RADIUS_SCALE.map((r) => ({ value: r.id, label: r.label }))}
          onChange={setCard}
          renderPreview={(opt) => {
            const px = RADIUS_SCALE.find((r) => r.id === opt.value)?.px ?? 12;
            return (
              <span
                aria-hidden
                style={{
                  display: 'block',
                  width: 28,
                  height: 18,
                  background: 'var(--ink, #18181B)',
                  borderRadius: px,
                  margin: '4px auto 0',
                  opacity: 0.85,
                }}
              />
            );
          }}
        />
      </Group>
      <Group label="Photo corners">
        <SegmentedRow
          value={photoRadius}
          options={PHOTO_RADIUS.map((r) => ({ value: r.id, label: r.label }))}
          onChange={setPhoto}
          renderPreview={(opt) => {
            const px = PHOTO_RADIUS.find((r) => r.id === opt.value)?.px ?? 8;
            return (
              <span
                aria-hidden
                style={{
                  display: 'block',
                  width: 22,
                  height: 22,
                  background: 'var(--peach-2, #EAB286)',
                  borderRadius: px === 9999 ? '50%' : px,
                  margin: '4px auto 0',
                }}
              />
            );
          }}
        />
      </Group>
    </PanelSection>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function SegmentedRow<T extends string>({
  value,
  options,
  onChange,
  renderPreview,
}: {
  value: string;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  renderPreview?: (opt: { value: T; label: string }) => React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 6 }}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '8px 6px',
              borderRadius: 8,
              background: on ? 'var(--ink)' : 'var(--card)',
              color: on ? 'var(--cream)' : 'var(--ink)',
              border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
              fontSize: 11.5,
              fontWeight: on ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            {opt.label}
            {renderPreview?.(opt)}
          </button>
        );
      })}
    </div>
  );
}
