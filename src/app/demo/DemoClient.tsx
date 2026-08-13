'use client';

// ─────────────────────────────────────────────────────────────
// DemoClient — the /demo showcase site plus "Try the loom", a
// floating panel of the real look dials (motif, placement,
// divider, pattern + strength, texture + grain). Every control
// writes the SAME manifest fields the editor writes
// (motifKind / motifLayout / dividerLook / pattern /
// patternIntensity / texture / textureIntensity), so what a
// visitor plays with here is literally the product, not a mock.
//
// The panel sits bottom-LEFT — bottom-right belongs to the
// StickyRsvpPill the published-site shell mounts.
// ─────────────────────────────────────────────────────────────

import { useDeferredValue, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { DEMO_MANIFEST, DEMO_NAMES } from '@/lib/demo-manifest';
import { MOTIF_LAYOUTS } from '@/lib/site-look/motif-layouts';

/* Curated subsets of the full catalogs (DecorLibraryPanel carries
   all of them) — enough range to show what the loom can do
   without burying a first-time visitor in 36 motif tiles. */
const MOTIFS = [
  { id: 'olive', label: 'Olive' },
  { id: 'laurel', label: 'Laurel' },
  { id: 'shell', label: 'Shell' },
  { id: 'lemon', label: 'Lemon' },
  { id: 'citrus', label: 'Citrus' },
  { id: 'wave-curl', label: 'Wave' },
  { id: 'sun', label: 'Sun' },
  { id: 'palm', label: 'Palm' },
  { id: 'starburst', label: 'Starburst' },
  { id: 'none', label: 'Off' },
] as const;

const DIVIDERS = [
  { id: 'sprig', label: 'Sprig' },
  { id: 'brush', label: 'Brush' },
  { id: 'dot', label: 'Dotted' },
  { id: 'deckle', label: 'Deckle' },
  { id: 'wave', label: 'Wave' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'seal', label: 'Wax seal' },
  { id: 'thread', label: 'Thread' },
  { id: 'stars', label: 'Stars' },
  { id: 'scallop', label: 'Scallop' },
] as const;

const PATTERNS = [
  { id: 'none', label: 'None' },
  { id: 'stripe', label: 'Pinstripe' },
  { id: 'cabana', label: 'Cabana' },
  { id: 'gingham', label: 'Gingham' },
  { id: 'dots', label: 'Polka' },
  { id: 'scallop', label: 'Scallop' },
  { id: 'wave', label: 'Wave' },
  { id: 'terrazzo', label: 'Terrazzo' },
  { id: 'celestial', label: 'Celestial' },
] as const;

const TEXTURES = [
  { id: 'linen', label: 'Linen' },
  { id: 'paper', label: 'Paper' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'velvet', label: 'Velvet' },
] as const;

interface DemoLook {
  motifKind: string;
  motifLayout: string;
  dividerLook: string;
  pattern: string;
  patternIntensity: number;
  texture: string;
  textureIntensity: number;
}

/* Elena & Theo's shipped look — the santorini theme's own picks,
   spelled out so Reset lands exactly where the page first loads. */
const DEFAULT_LOOK: DemoLook = {
  motifKind: 'olive',
  motifLayout: 'scattered',
  dividerLook: 'sprig',
  pattern: 'none',
  patternIntensity: 1,
  texture: 'linen',
  textureIntensity: 1,
};

export default function DemoClient() {
  const [look, setLook] = useState<DemoLook>(DEFAULT_LOOK);
  /* Slider drags re-render the full site — defer the manifest so
     the range input itself never waits on a canvas paint. */
  const deferredLook = useDeferredValue(look);

  const manifest = useMemo<StoryManifest>(() => ({
    ...(DEMO_MANIFEST as unknown as Record<string, unknown>),
    motifKind: deferredLook.motifKind,
    motifLayout: deferredLook.motifLayout,
    dividerLook: deferredLook.dividerLook,
    pattern: deferredLook.pattern,
    patternIntensity: deferredLook.patternIntensity,
    texture: deferredLook.texture,
    textureIntensity: deferredLook.textureIntensity,
  }) as unknown as StoryManifest, [deferredLook]);

  return (
    <>
      <PublishedSiteShell
        manifest={manifest}
        names={DEMO_NAMES}
        siteSlug="demo"
        prettyUrl="pearloom.com/demo"
      />
      <DemoLookPanel look={look} setLook={setLook} />
    </>
  );
}

/* ─── The panel ──────────────────────────────────────────────── */

function DemoLookPanel({ look, setLook }: { look: DemoLook; setLook: (l: DemoLook) => void }) {
  const [open, setOpen] = useState(false);
  const patch = (p: Partial<DemoLook>) => setLook({ ...look, ...p });
  const isDefault = JSON.stringify(look) === JSON.stringify(DEFAULT_LOOK);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Try the editor, restyle this site with your own colors and fonts"
        style={{
          position: 'fixed',
          left: 'clamp(16px, 3vw, 28px)',
          bottom: 'calc(clamp(16px, 3vw, 28px) + env(safe-area-inset-bottom, 0px))',
          zIndex: 'var(--z-toast, 400)' as unknown as number,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 16px',
          borderRadius: 999,
          border: '1px solid var(--pl-divider, #D8CFB8)',
          background: 'var(--pl-cream-card, #FBF7EE)',
          boxShadow: '0 12px 32px -12px rgba(14,13,11,0.35)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span aria-hidden style={{ color: 'var(--pl-gold, #B8935A)', fontSize: 13 }}>✦</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink, #0E0D0B)' }}>
          Try the editor
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted, #6F6557)',
          }}
        >
          live
        </span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Try the editor, restyle this demo site live"
      style={{
        position: 'fixed',
        left: 'clamp(12px, 3vw, 28px)',
        bottom: 'calc(clamp(12px, 3vw, 28px) + env(safe-area-inset-bottom, 0px))',
        zIndex: 'var(--z-toast, 400)' as unknown as number,
        width: 312,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'min(72vh, 640px)',
        overflowY: 'auto',
        background: 'var(--pl-cream-card, #FBF7EE)',
        border: '1px solid var(--pl-divider, #D8CFB8)',
        borderRadius: 16,
        boxShadow: '0 24px 56px -20px rgba(14,13,11,0.4)',
        padding: '14px 16px 16px',
        fontFamily: 'var(--pl-font-body, Geist, system-ui, sans-serif)',
        color: 'var(--pl-ink, #0E0D0B)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span aria-hidden style={{ color: 'var(--pl-gold, #B8935A)', fontSize: 13 }}>✦</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--pl-ink-soft, #3A332C)',
          }}
        >
          Try the editor
        </span>
        <button
          type="button"
          aria-label="Close the panel"
          onClick={() => setOpen(false)}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'transparent',
            color: 'var(--pl-muted, #6F6557)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 2,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--pl-muted, #6F6557)' }}>
        These are the real dials from the editor, restyle Elena &amp; Theo&apos;s site
        and watch it re-weave underneath.
      </p>

      <Group label="Motif">
        <ChipRow
          options={MOTIFS}
          value={look.motifKind}
          onPick={(id) => patch({ motifKind: id })}
        />
      </Group>

      <Group label="Where the motifs live">
        <ChipRow
          options={MOTIF_LAYOUTS.map((l) => ({ id: l.id, label: l.label }))}
          value={look.motifLayout}
          onPick={(id) => patch({ motifLayout: id })}
        />
      </Group>

      <Group label="Dividers">
        <ChipRow
          options={DIVIDERS}
          value={look.dividerLook}
          onPick={(id) => patch({ dividerLook: id })}
        />
      </Group>

      <Group label="Pattern">
        <ChipRow
          options={PATTERNS}
          value={look.pattern}
          onPick={(id) => patch({ pattern: id })}
        />
        {look.pattern !== 'none' && (
          <Slider
            label="Pattern strength"
            value={look.patternIntensity}
            onChange={(v) => patch({ patternIntensity: v })}
          />
        )}
      </Group>

      <Group label="Paper texture">
        <ChipRow
          options={TEXTURES}
          value={look.texture}
          onPick={(id) => patch({ texture: id })}
        />
        <Slider
          label="Grain"
          value={look.textureIntensity}
          onChange={(v) => patch({ textureIntensity: v })}
        />
      </Group>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setLook(DEFAULT_LOOK)}
          disabled={isDefault}
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            border: '1px solid var(--pl-divider, #D8CFB8)',
            background: 'transparent',
            color: isDefault ? 'var(--pl-muted, #6F6557)' : 'var(--pl-ink, #0E0D0B)',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: isDefault ? 'default' : 'pointer',
            opacity: isDefault ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          Reset the look
        </button>
        <a
          href="/wizard"
          className="pl-pearl-accent"
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Weave your own
        </a>
      </div>
    </aside>
  );
}

/* ─── Tiny primitives ────────────────────────────────────────── */

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted, #6F6557)',
          marginBottom: 6,
          paddingBottom: 3,
          borderBottom: '1px solid var(--pl-divider-soft, #E5DCC4)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ChipRow({
  options,
  value,
  onPick,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            aria-pressed={on}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              border: on ? '1px solid var(--pl-ink, #0E0D0B)' : '1px solid var(--pl-divider, #D8CFB8)',
              background: on ? 'var(--pl-ink, #0E0D0B)' : 'transparent',
              color: on ? 'var(--pl-cream, #F5EFE2)' : 'var(--pl-ink-soft, #3A332C)',
              transition: 'background var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease-out), color var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease-out)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-soft, #3A332C)', width: 96, flexShrink: 0 }}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1.5}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--pl-olive, #5C6B3F)' }}
      />
      <span
        style={{
          fontSize: 10,
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          color: 'var(--pl-muted, #6F6557)',
          width: 28,
          textAlign: 'right',
        }}
      >
        {value === 0 ? 'off' : value.toFixed(2).replace(/0$/, '')}
      </span>
    </label>
  );
}
