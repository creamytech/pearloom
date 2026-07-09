'use client';

/* ─── DesignDoorDeck — the phone Design surface ──────────────────
   Extracted from PropertyRail 2026-07-09 and made RICH (owner:
   "the design panel on mobile we should make it rich beautiful
   cards like the sections in the mobile editor"). Each door is a
   full snap card in the sheet's deck grammar, led by a live
   preview pressed from the SITE'S OWN resolved look — the theme
   card wears the real paper/ink/display face, Colors shows the
   actual swatches, Fonts sets real specimens, Menu draws the
   current nav variant's schematic. Tapping drills into just that
   rung (ThemePickerBody's door prop) with a back chevron home.

   Mounted in TWO places, phones only by construction:
   · PropertyRail's Design tab (the props sheet)
   · the theme sheet (EditorRedesign) — with `header` for the
     SITE LOOK masthead + CompareHold the old ThemeRail carried.

   Chrome tokens for the card furniture; the PREVIEWS deliberately
   read the site's --t-* values as data (inline colors/fonts) the
   way thumbnails do — they're content, not chrome. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { getTheme } from '../site/themes';
import { SectionPanelShell } from '../editor/panels/_section-atoms';
import { ThemePickerBody, type DesignDoorId } from './ThemePickerBody';
import { CompareHold } from './CompareHold';
import { LAYOUTS, readVariant } from './layouts';
import { VariantThumb } from './variant-thumb';

const DESIGN_DOORS: ReadonlyArray<{ id: DesignDoorId; label: string; blurb: string }> = [
  { id: 'theme',      label: 'Theme',          blurb: 'One pick dresses the whole site' },
  { id: 'colors',     label: 'Colors',         blurb: 'Accent, paper & ink' },
  { id: 'fonts',      label: 'Fonts',          blurb: 'Display & body pairing' },
  { id: 'paper',      label: 'Paper',          blurb: 'Texture & grain strength' },
  { id: 'layout',     label: 'Layout & cards', blurb: 'Page feel + card styles' },
  { id: 'background', label: 'Background',     blurb: 'Wallpaper behind the paper' },
  { id: 'motion',     label: 'Motion',         blurb: 'How things arrive & move' },
  { id: 'menu',       label: 'Menu & footer',  blurb: 'How guests get around' },
  { id: 'finetune',   label: 'Fine-tune',      blurb: 'Voice, spacing, motifs' },
];

function designDoorState(id: DesignDoorId, manifest: StoryManifest): string {
  const loose = manifest as unknown as {
    themeId?: string; theme?: { id?: string };
    texture?: string; kitId?: string; siteLayout?: string;
  };
  switch (id) {
    case 'theme': {
      const t = getTheme(loose.themeId ?? loose.theme?.id);
      return t?.name ?? 'House theme';
    }
    case 'paper':
      return loose.texture ? loose.texture.charAt(0).toUpperCase() + loose.texture.slice(1) : 'Natural';
    case 'layout':
      return loose.kitId ? `${loose.kitId.charAt(0).toUpperCase()}${loose.kitId.slice(1)} cards` : 'Classic';
    case 'menu': {
      const nav = readVariant(manifest, 'nav');
      const label = (LAYOUTS.nav ?? []).find((v) => v.id === nav)?.label;
      return label ?? 'Split';
    }
    default:
      return '';
  }
}

/* The site's resolved --t-* bag — same chain the canvas uses
   (themeVars override wins over the named theme's values). Read as
   plain data for the previews. */
function siteVars(manifest: StoryManifest): Record<string, string> {
  const loose = manifest as unknown as {
    themeId?: string; theme?: { id?: string }; themeVars?: Record<string, string>;
  };
  const t = getTheme(loose.themeId ?? loose.theme?.id);
  return { ...((t?.vars as Record<string, string> | undefined) ?? {}), ...(loose.themeVars ?? {}) };
}

const PREVIEW_FRAME: React.CSSProperties = {
  height: 78,
  borderRadius: 10,
  border: '1px solid var(--line-soft)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--card)',
};

/** The live preview atop each door card. */
function DoorPreview({ id, manifest }: { id: DesignDoorId; manifest: StoryManifest }) {
  const v = siteVars(manifest);
  const paper = v['--t-paper'] ?? 'var(--cream)';
  const ink = v['--t-ink'] ?? 'var(--ink)';
  const inkSoft = v['--t-ink-soft'] ?? 'var(--ink-soft)';
  const accent = v['--t-accent'] ?? 'var(--sage-deep)';
  const accentBg = v['--t-accent-bg'] ?? 'var(--sage-bg)';
  const gold = v['--t-gold'] ?? accent;
  const display = v['--t-display'] ?? 'Georgia, serif';
  const body = v['--t-body'] ?? 'inherit';

  switch (id) {
    case 'theme': {
      /* A miniature of the site's own opening — real paper, real
         faces, the host's names when we have them. */
      const names = (manifest as unknown as { names?: [string, string] }).names;
      const title = names?.filter(Boolean).join(' & ') || 'Your names';
      return (
        <div style={{ ...PREVIEW_FRAME, background: paper, flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: display, fontSize: 17, color: ink, lineHeight: 1.1, maxWidth: '86%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          <span aria-hidden style={{ width: 28, height: 1, background: gold }} />
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 8, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: inkSoft }}>
            The day itself
          </span>
        </div>
      );
    }
    case 'colors':
      return (
        <div style={{ ...PREVIEW_FRAME, gap: 9 }}>
          {[paper, v['--t-section'] ?? paper, v['--t-card'] ?? paper, accent, gold, ink].map((c, i) => (
            <span key={i} aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '1px solid var(--line)', flexShrink: 0 }} />
          ))}
        </div>
      );
    case 'fonts':
      return (
        <div style={{ ...PREVIEW_FRAME, background: paper, gap: 18 }}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontFamily: display, fontSize: 30, lineHeight: 1, color: ink }}>Aa</span>
            <span style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: inkSoft }}>Display</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontFamily: body, fontSize: 22, lineHeight: 1.25, color: inkSoft }}>Aa</span>
            <span style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: inkSoft }}>Body</span>
          </span>
        </div>
      );
    case 'paper':
      /* The site's paper with a laid-grain suggestion. */
      return (
        <div style={{ ...PREVIEW_FRAME, background: paper, position: 'relative' }}>
          <svg aria-hidden width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
            {[14, 30, 46, 62].map((y) => (
              <path key={y} d={`M 0 ${y} q 40 -3 80 0 t 80 0 t 80 0 t 80 0 t 80 0`} fill="none" stroke={inkSoft} strokeWidth="0.7" opacity="0.4" />
            ))}
          </svg>
          <span style={{ position: 'relative', fontFamily: display, fontStyle: 'italic', fontSize: 15, color: inkSoft }}>
            {designDoorState('paper', manifest)}
          </span>
        </div>
      );
    case 'layout':
      /* The page's real bones — current variants, real schematics. */
      return (
        <div style={{ ...PREVIEW_FRAME, gap: 10 }}>
          {(['story', 'details', 'schedule'] as const).map((s) => (
            <VariantThumb key={s} section={s} variant={readVariant(manifest, s)} size="chip" />
          ))}
        </div>
      );
    case 'background':
      return (
        <div style={{ ...PREVIEW_FRAME, background: `radial-gradient(circle at 30% 25%, ${accentBg}, ${paper} 70%)` }}>
          <span aria-hidden style={{ width: 44, height: 30, borderRadius: 6, background: paper, border: '1px solid var(--line)', boxShadow: '0 3px 10px rgba(40,28,12,0.12)' }} />
        </div>
      );
    case 'motion':
      /* The two-strand thread mid-weave — the motion language. */
      return (
        <div style={PREVIEW_FRAME}>
          <svg aria-hidden width="70%" height="40" viewBox="0 0 200 40">
            <path d="M 4 20 q 25 -14 50 0 t 50 0 t 50 0" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 4 24 q 25 14 50 0 t 50 0 t 50 0" fill="none" stroke={gold} strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1 5" />
            <circle cx="158" cy="20" r="3.4" fill={gold} />
          </svg>
        </div>
      );
    case 'menu':
      /* The current menu bar, drawn. */
      return (
        <div style={{ ...PREVIEW_FRAME, gap: 12 }}>
          <VariantThumb section="nav" variant={readVariant(manifest, 'nav')} size="card" />
          <VariantThumb section="footer" variant={readVariant(manifest, 'footer')} size="chip" />
        </div>
      );
    case 'finetune':
    default:
      /* Three quiet dials. */
      return (
        <div style={{ ...PREVIEW_FRAME, flexDirection: 'column', gap: 9 }}>
          {[0.35, 0.62, 0.48].map((p, i) => (
            <span key={i} style={{ position: 'relative', width: '58%', height: 2, borderRadius: 2, background: 'var(--line)' }}>
              <span aria-hidden style={{ position: 'absolute', left: `${p * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 9, height: 9, borderRadius: '50%', background: gold, border: '1px solid var(--card)' }} />
            </span>
          ))}
        </div>
      );
  }
}

export function DesignDoorDeck({
  manifest, onChange, onOpenShop, onOpenDecor, header = false,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  onOpenShop: () => void;
  onOpenDecor: () => void;
  /** The theme sheet's masthead (SITE LOOK · Design · CompareHold).
   *  PropertyRail's Design tab brings its own chrome — omit it. */
  header?: boolean;
}) {
  const [door, setDoor] = useState<DesignDoorId | null>(null);
  if (door) {
    const meta = DESIGN_DOORS.find((d) => d.id === door);
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <button
          type="button"
          onClick={() => setDoor(null)}
          className="pl-hit44"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px 8px', border: 'none', background: 'transparent',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <Icon name="arrow-left" size={14} color="var(--ink-soft)" />
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--lavender-ink)' }}>
            {meta?.label ?? 'Design'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', marginLeft: 'auto' }}>All design</span>
        </button>
        <ThemePickerBody
          manifest={manifest}
          onChange={onChange}
          onOpenShop={onOpenShop}
          onOpenDecor={onOpenDecor}
          door={door}
        />
      </div>
    );
  }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {header && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 16px 2px', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink)' }}>
            Site look
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 19, color: 'var(--lavender-ink)' }}>
            Design
          </span>
          <span style={{ marginLeft: 'auto' }}><CompareHold /></span>
        </div>
      )}
      <SectionPanelShell>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DESIGN_DOORS.map((d) => {
            const state = designDoorState(d.id, manifest);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDoor(d.id)}
                className="lift"
                style={{
                  /* Top-anchored — the sheet may be resting at its
                     half stop, where only the upper part of the card
                     is on screen; centered content sank below the
                     fold there. */
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 7,
                  textAlign: 'left', cursor: 'pointer',
                  background: 'transparent', border: 'none', padding: 0,
                  minHeight: 150,
                }}
              >
                <DoorPreviewBlock id={d.id} manifest={manifest} />
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 21, lineHeight: 1.1, color: 'var(--ink)' }}>
                    {d.label}
                  </span>
                  {state && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {state}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{d.blurb}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--peach-ink)' }}>
                  {state ? 'Change it' : 'Open'} <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
                </span>
              </button>
            );
          })}
        </div>
      </SectionPanelShell>
    </div>
  );
}

/* Full-width wrapper so the preview stretches across the card. */
function DoorPreviewBlock({ id, manifest }: { id: DesignDoorId; manifest: StoryManifest }) {
  return (
    <span style={{ display: 'block', width: '100%' }}>
      <DoorPreview id={id} manifest={manifest} />
    </span>
  );
}
