'use client';

import { pearWorking } from './PearLoomFx';
import { KIT_CATALOG, TEXTURE_CATALOG } from '@/lib/site-look/look-catalog';

 
/* LITERAL PORT of handoff/shared/themes.jsx L820-933 ThemePicker body.

   The right-rail content when no section is selected. Order:
     1. Event-type chip
     2. Generate-from-story peach card
     3. Recommended-for-{event} theme grid (ThemePackPicker)
     4. Layout · whole-page feel (Classic / Invitation / Split)
     5. Component Kit grid (9 kits)
     6. Fine-tune · {THEME NAME}: Voice / Spacing / Texture / Motifs
        / Use my photos
     7. Legibility note (AA contrast)
     8. Theme Shop dark-pill CTA
     9. Decor Library gradient CTA
    10. Match my photos
    11. Saved looks
    12. Matching Save-the-Date link

   This replaces the production ThemePanel which carries a lot of
   production-specific chrome (SiteLookHeader, OwnedPacksSection,
   EditionPicker, Advanced disclosure) the prototype doesn't show.
*/

import { useState, useRef, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import { getTheme, type Theme } from '../site/themes';
import { WALLPAPERS } from '@/lib/site-look/wallpapers';
import { ThemePackPicker } from '../editor/panels/ThemePackPicker';
import { COMMAND_PALETTE_OPEN_EVENT } from '../editor/CommandPalette';
import { pearErrorMessage } from './PearAssist';
import { fireUndoable } from './UndoToast';
import { PlColorPicker } from './PlColorPicker';
import { StoreFonts } from '@/lib/theme-store/fonts';
import { LAYOUTS, readVariant, recommendedVariantFor } from './layouts';
import { VariantThumb } from './variant-thumb';
import { useCanvasTryOn, expandThemeVarsForPreview, findCanvasRoot } from './design-tryon';
import { announceDesignChange } from './design-feedback';

/** One rung of the Design ladder, renderable alone (EDITOR-RAILS-PLAN
 *  DK.3): the phone Design tab shows a deck of DOORS, each opening
 *  exactly one of these instead of the whole 6-screen ladder. */
export type DesignDoorId =
  | 'theme' | 'colors' | 'fonts' | 'paper' | 'layout'
  | 'background' | 'motion' | 'menu' | 'finetune';

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  onOpenShop: () => void;
  onOpenDecor: () => void;
  /** Which slice of the look to render. The v2 editor splits the
   *  right rail into a Design tab (everything but motion) and a
   *  Motion tab (Atelier kits only). 'inline' (default) keeps the
   *  motion picker in the flow — used by the mobile Theme sheet. */
  motion?: 'inline' | 'hidden' | 'only';
  /** Render ONLY this ladder rung (no jump chips, no CTAs) — the
   *  body behind one phone Design door. Desktop never sets it. */
  door?: DesignDoorId;
}

/* Texture → 6-theme catalog id mapping. /api/look/from-story
   returns Edition + texture; we map to the prototype theme id so
   the canvas re-paints with the right theme tokens. */
const TEXTURE_TO_THEME_ID: Record<string, string> = {
  linen: 'santorini',
  watercolor: 'tuscan',
  paper: 'garden',
  cotton: 'coastal',
  velvet: 'midnight',
  none: 'editorial',
  kraft: 'garden',
  canvas: 'santorini',
  marble: 'editorial',
  gilded: 'midnight',
};

export function ThemePickerBody({ manifest, onChange, onOpenShop, onOpenDecor, motion = 'inline', door }: Props) {
  const themeId = ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string } }).theme?.id);
  const theme = getTheme(themeId);

  /* Motion tab — render ONLY the Atelier kit panel (the v2 editor's
     dedicated ✦ Motion tab). */
  if (motion === 'only') {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MotionKitPick manifest={manifest} onChange={onChange} />
      </div>
    );
  }

  /* TRY-ANYTHING-SAFELY — ThemePackPicker calls onChange exactly
     once per pack apply (it rewrites themeId + clears every
     pack-write field). Wrap that call: snapshot the manifest as it
     was before the apply, then fire `pearloom:undoable` so the
     host's old look is one tap away. Undo-after, never
     confirm-before. */
  const applyPackWithUndo = (next: StoryManifest) => {
    pearWorking('done', undefined, 'theme');
    const prior = manifest;
    onChange(next);
    fireUndoable('Pack applied, your old look is one tap away', () => onChange(prior));
  };

  /* One door only (DK.3) — the body behind a phone Design door.
     No jump chips, no CTAs, no sibling rungs: the door named it,
     this renders it. */
  if (door) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <StoreFonts />
        {door === 'theme' && (
          <>
            <GenerateCard manifest={manifest} onChange={onChange} />
            <MatchMyPhotos manifest={manifest} onChange={onChange} />
            <ThemePackPicker manifest={manifest} onChange={applyPackWithUndo} />
          </>
        )}
        {door === 'colors' && <ColorsPick theme={theme} manifest={manifest} onChange={onChange} />}
        {door === 'fonts' && <FontsPick theme={theme} manifest={manifest} onChange={onChange} />}
        {door === 'paper' && <TexturePick theme={theme} manifest={manifest} onChange={onChange} />}
        {door === 'layout' && (
          <>
            <SiteLayoutPick manifest={manifest} onChange={onChange} />
            <KitPick theme={theme} manifest={manifest} onChange={onChange} />
          </>
        )}
        {door === 'background' && <LivingBackgroundPick manifest={manifest} onChange={onChange} />}
        {door === 'motion' && <MotionKitPick manifest={manifest} onChange={onChange} />}
        {door === 'menu' && (
          <>
            <NavPick manifest={manifest} onChange={onChange} />
            <FooterPick manifest={manifest} onChange={onChange} />
          </>
        )}
        {door === 'finetune' && (
          <>
            <FineTune theme={theme} manifest={manifest} onChange={onChange} />
            <LegibilityNote manifest={manifest} theme={theme} onChange={onChange} />
          </>
        )}
      </div>
    );
  }

  /* ── The altitude ladder (reordered 2026-07-08) ─────────────────
     One 6.4-screen scroll used to bury Colors + Fonts (the two
     most-wanted tweaks) under 26 layout/card-style diagrams. Order
     now falls from "one pick changes everything" to polish:
       Pear picks → Themes → Colors → Fonts → Paper → Layout &
       cards → atmosphere (background + motion) → Menu & footer →
       Fine-tune → cross-links.
     The sticky chip row up top jumps to each rung — a table of
     contents for the scroll. Anchor ids pl-dz-*; scrollMarginTop
     clears the sticky chips. */
  const anchor: CSSProperties = {
    /* scrollMarginTop clears the sticky chip row at its two-row
       wrap (the 360px rail wraps the six chips onto two lines). */
    display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 92,
  };
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <JumpChips />
      <EventTypeChip manifest={manifest} onChange={onChange} />
      {/* "Let Pear pick" — both hands-off entries side by side:
          describe the look in words, or hand her a photo. */}
      <GenerateCard manifest={manifest} onChange={onChange} />
      <MatchMyPhotos manifest={manifest} onChange={onChange} />
      {/* Recommended themes — already lives at the right shape after
          earlier ThemePackPicker rewrite (Aa/and tiles + ★ Pick badge
          + ✓ active checkmark + corner motif + footer). */}
      <div id="pl-dz-theme" style={anchor}>
        <ThemePackPicker manifest={manifest} onChange={applyPackWithUndo} />
      </div>

      <div id="pl-dz-colors" style={anchor}>
        <ColorsPick theme={theme} manifest={manifest} onChange={onChange} />
      </div>
      <div id="pl-dz-fonts" style={anchor}>
        <FontsPick theme={theme} manifest={manifest} onChange={onChange} />
      </div>
      <div id="pl-dz-paper" style={anchor}>
        <TexturePick theme={theme} manifest={manifest} onChange={onChange} />
      </div>

      <div id="pl-dz-layout" style={anchor}>
        <SiteLayoutPick manifest={manifest} onChange={onChange} />
        <KitPick theme={theme} manifest={manifest} onChange={onChange} />
      </div>

      <LivingBackgroundPick manifest={manifest} onChange={onChange} />
      {motion === 'inline' && <MotionKitPick manifest={manifest} onChange={onChange} />}

      <div id="pl-dz-menu" style={anchor}>
        <NavPick manifest={manifest} onChange={onChange} />
        <FooterPick manifest={manifest} onChange={onChange} />
      </div>

      <FineTune theme={theme} manifest={manifest} onChange={onChange} />

      <LegibilityNote manifest={manifest} theme={theme} onChange={onChange} />

      {/* Theme Shop CTA — ink-on-cream with gold sparkle. */}
      <button
        type="button"
        onClick={onOpenShop}
        className="lift pl8"
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '13px 15px', borderRadius: 13, width: '100%',
          cursor: 'pointer', background: 'var(--ink)', color: 'var(--cream)',
          border: 'none', textAlign: 'left',
        }}
      >
        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="sparkles" size={17} color="var(--gold)" />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>Theme Shop</span>
          <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>60+ premium packs · try live</span>
        </span>
        <Icon name="arrow-up" size={15} color="var(--cream)" />
      </button>

      {/* Decor Library CTA — gradient lavender→peach. */}
      <button
        type="button"
        onClick={onOpenDecor}
        className="lift"
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '13px 15px', borderRadius: 13, width: '100%', cursor: 'pointer',
          background: 'linear-gradient(120deg, var(--lavender-bg), var(--peach-bg))',
          border: '1px solid var(--line-soft)', textAlign: 'left',
        }}
      >
        <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--card)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(61,74,31,0.08)' }}>
          <Icon name="sparkles" size={18} color="var(--lavender-ink)" />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Decor Library</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)' }}>Motifs, dividers, patterns &amp; monograms</span>
        </span>
        <Icon name="arrow-right" size={15} color="var(--ink-soft)" />
      </button>

      {/* Matching Save-the-Date — dark pill linking to Studio. */}
      <a
        href="/dashboard/invite"
        className="lift"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 12,
          background: 'var(--ink)', color: 'var(--cream)', textDecoration: 'none',
        }}
      >
        <Icon name="send" size={16} color="var(--cream)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Matching Save-the-Date</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Same theme, print-ready card &amp; envelope</div>
        </div>
        <Icon name="arrow-right" size={14} color="var(--cream)" />
      </a>
    </div>
  );
}

/* ─── JumpChips — the Design tab's table of contents ──────────────
   The scroll is ~6 screens; these sticky chips name its rungs and
   jump to them. Anchors are the pl-dz-* wrappers in the body. */

const JUMP_CHIPS: Array<[string, string]> = [
  ['pl-dz-theme', 'Themes'],
  ['pl-dz-colors', 'Colors'],
  ['pl-dz-fonts', 'Fonts'],
  ['pl-dz-paper', 'Paper'],
  ['pl-dz-layout', 'Layout'],
  ['pl-dz-menu', 'Menu'],
];

function JumpChips() {
  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 5,
        margin: '0 -18px', padding: '11px 18px 9px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--line-soft)',
        display: 'flex', flexWrap: 'wrap', gap: 5,
      }}
    >
      {JUMP_CHIPS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => jump(id)}
          style={{
            padding: '4px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            border: '1px solid var(--line)', background: 'transparent',
            color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Event-type chip — prototype L1078-1090 condensed. ─────────── */

function EventTypeChip({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  void onChange;
  const occasion = ((manifest as unknown as { occasion?: string }).occasion) ?? 'wedding';
  const label = occasion.charAt(0).toUpperCase() + occasion.slice(1);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 7 }}>
        Event type
      </div>
      <button
        type="button"
        className="lift"
        onClick={() => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
        }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 13px', borderRadius: 11,
          background: 'var(--cream-2)', border: '1px solid var(--line)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--card)', border: '1px solid var(--line-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="heart-icon" size={15} color="var(--ink-soft)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Weddings &amp; love</div>
        </div>
        <Icon name="chev-down" size={14} color="var(--ink-muted)" />
      </button>
    </div>
  );
}

/* ─── Generate-from-story — prototype L1158-1185 condensed. ─────── */

function GenerateCard({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const examples = [
    'July wedding in Santorini',
    'Black-tie evening gala',
    'Tuscan vineyard',
  ];

  async function design(q?: string) {
    const query = (q ?? text).trim();
    if (!query) return;
    if (q) setText(q);
    setBusy(true); setErr(null); setRationale(null);
    try {
      const res = await fetch('/api/look/from-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[theme-picker] look-from-story failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t style that one, try again?');
      }
      const data = await res.json() as {
        occasion?: string;
        edition?: string;
        texture?: string;
        voiceOverride?: string;
        density?: 'cozy' | 'comfortable' | 'spacious';
        textureIntensity?: number;
        rationale?: string;
      };
      /* Patch manifest with the suggested look. The texture maps to
         the 6-theme catalog id so ThemedSite repaints; the rest land
         on their canonical manifest paths the right-rail Fine-tune
         section already reads. */
      const themeId = data.texture && TEXTURE_TO_THEME_ID[data.texture]
        ? TEXTURE_TO_THEME_ID[data.texture]
        : undefined;
      const next = { ...(manifest as unknown as Record<string, unknown>) };
      if (themeId) next.themeId = themeId;
      if (data.occasion) next.occasion = data.occasion;
      if (data.edition) next.edition = data.edition;
      if (data.voiceOverride) next.voiceOverride = data.voiceOverride;
      if (data.density) next.density = data.density;
      if (typeof data.textureIntensity === 'number') {
        next.textureIntensity = Math.max(0, Math.min(1.5, data.textureIntensity));
      }
      /* Generate-from-story rewrites theme + voice + density in one
         go — as transformative as a pack apply, so it gets the same
         undo-after treatment. */
      const prior = manifest;
      onChange(next as unknown as StoryManifest);
      fireUndoable('Pear restyled your site, your old look is one tap away', () => onChange(prior));
      announceDesignChange('theme', 'Drafted by Pear');
      setRationale(data.rationale ?? 'Pear styled your site.');
    } catch (e) {
      console.error('[theme-picker] look-from-story error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t style that one, try again?'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(198,112,61,0.28)' }}>
      <div style={{ padding: '11px 13px', background: 'var(--peach-bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pear size={22} tone="sage" sparkle shadow={false} />
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)' }}>
          Generate a look from your story
        </div>
      </div>
      <div style={{ padding: 13, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="e.g. Sunset wedding in Santorini, lots of olive groves, relaxed and warm…"
          disabled={busy}
          style={{
            width: '100%', padding: '9px 11px', borderRadius: 9,
            border: '1px solid var(--line)', background: 'var(--cream-2)',
            fontSize: 12.5, color: 'var(--ink)', resize: 'vertical',
            fontFamily: 'inherit', lineHeight: 1.45, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => design(ex)}
              disabled={busy}
              style={{
                padding: '4px 9px', borderRadius: 999,
                background: 'var(--cream-2)', border: '1px solid var(--line-soft)',
                fontSize: 10.5, color: 'var(--ink-soft)', cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => design()}
          disabled={busy || !text.trim()}
          className="btn btn-primary btn-sm"
          style={{ justifyContent: 'center', width: '100%', opacity: busy ? 0.7 : 1, gap: 8 }}
        >
          {busy ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cream)', animation: 'pl-dot-pulse 1.4s ease-in-out infinite' }} />
              Pear is designing…
            </>
          ) : (
            <>
              <Icon name="sparkles" size={13} color="var(--cream)" /> Design my site
            </>
          )}
        </button>
        {rationale && !busy && (
          <div style={{ display: 'flex', gap: 7, padding: '8px 10px', borderRadius: 9, background: 'var(--sage-tint)', fontSize: 11.5, color: 'var(--sage-deep)', alignItems: 'flex-start' }}>
            <Icon name="check" size={13} color="var(--sage-deep)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span><b>Done.</b> {rationale}</span>
          </div>
        )}
        {err && (
          <div style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--pl-chrome-danger-soft, rgba(122,45,45,0.10))', fontSize: 11.5, color: 'var(--pl-chrome-danger, #7A2D2D)' }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SiteLayoutPick — prototype L1017-1068 verbatim. ───────────── */

function SiteLayoutPick({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const value = (manifest as unknown as { siteLayout?: string }).siteLayout ?? 'stacked';
  const set = (id: string, label: string) => {
    onChange({ ...(manifest as unknown as Record<string, unknown>), siteLayout: id } as unknown as StoryManifest);
    announceDesignChange('layout', label);
  };
  /* 3 originals + 5 new full-page layouts. Same id / label / sub
     copy as the canonical SiteLayoutPicker so both pickers stay
     in sync; ThemedSite handles the canvas dispatch for all of
     these, and pearloom.css carries the mobile breakpoints. */
  const opts = [
    { id: 'stacked',   label: 'Classic',   sub: 'Full scroll' },
    { id: 'boxed',     label: 'Invitation',sub: 'Card on a mat' },
    { id: 'split',     label: 'Split',     sub: 'Sidebar lockup' },
    { id: 'magazine',  label: 'Magazine',  sub: 'Two-column spread' },
    { id: 'zine',      label: 'Zine',      sub: 'Tilted hand-cut pages' },
    { id: 'storybook', label: 'Storybook', sub: 'Paged with folios' },
    { id: 'gallery',   label: 'Gallery',   sub: 'Narrow column, big air' },
    { id: 'postcard',  label: 'Postcard',  sub: 'Keepsake card frame' },
  ];
  const Diagram = ({ id, on }: { id: string; on: boolean }) => {
    const c = on ? 'var(--cream)' : 'var(--ink-muted)';
    const cSoft = on ? 'rgba(248,241,228,0.6)' : 'rgba(14,13,11,0.45)';
    const bg = on ? 'rgba(248,241,228,0.22)' : 'var(--cream-2)';
    const tile: React.CSSProperties = { height: 38, borderRadius: 5, background: bg, position: 'relative', overflow: 'hidden' };
    if (id === 'boxed') {
      return (
        <div style={{ ...tile, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: '60%', height: '64%', borderRadius: 3, border: `1.5px solid ${c}`, display: 'flex', flexDirection: 'column', gap: 2, padding: 3 }}>
            <div style={{ height: 3, background: c, borderRadius: 1 }} />
            <div style={{ height: 3, width: '70%', background: c, borderRadius: 1, opacity: 0.6 }} />
          </div>
        </div>
      );
    }
    if (id === 'split') {
      return (
        <div style={{ ...tile, display: 'flex', gap: 3, padding: 5 }}>
          <div style={{ width: '38%', background: c, borderRadius: 2 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 4, background: c, borderRadius: 1, opacity: 0.6 }} />
            <div style={{ height: 4, background: c, borderRadius: 1, opacity: 0.6 }} />
            <div style={{ height: 4, width: '60%', background: c, borderRadius: 1, opacity: 0.6 }} />
          </div>
        </div>
      );
    }
    if (id === 'magazine') {
      /* Hero band on top, then 2-col spread below. */
      return (
        <div style={{ ...tile, display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
          <div style={{ height: 8, background: c, borderRadius: 1, opacity: 0.6 }} />
          <div style={{ flex: 1, display: 'flex', gap: 3 }}>
            <div style={{ flex: 1, background: c, borderRadius: 1, opacity: 0.55 }} />
            <div style={{ flex: 1, background: c, borderRadius: 1, opacity: 0.55 }} />
          </div>
        </div>
      );
    }
    if (id === 'zine') {
      /* Three tilted pages stacked, alternating depth. */
      return (
        <div style={tile}>
          <div style={{ position: 'absolute', inset: '4px 8px', background: c, borderRadius: 2, opacity: 0.4, transform: 'rotate(-2deg)' }} />
          <div style={{ position: 'absolute', inset: '8px 5px', background: c, borderRadius: 2, opacity: 0.6, transform: 'rotate(1.5deg)' }} />
          <div style={{ position: 'absolute', inset: '12px 9px', background: c, borderRadius: 2, opacity: 0.85, transform: 'rotate(-0.8deg)' }} />
        </div>
      );
    }
    if (id === 'storybook') {
      /* Hero strip + 2 paged rows with tiny folio dots. */
      return (
        <div style={{ ...tile, display: 'flex', flexDirection: 'column', padding: 4, gap: 2 }}>
          <div style={{ height: 8, background: c, borderRadius: 1, opacity: 0.7 }} />
          <div style={{ height: 1, background: cSoft, margin: '1px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: cSoft }} />
            <div style={{ flex: 1, height: 3, background: c, borderRadius: 1, opacity: 0.55 }} />
          </div>
          <div style={{ height: 1, background: cSoft, margin: '1px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: cSoft }} />
            <div style={{ flex: 1, height: 3, background: c, borderRadius: 1, opacity: 0.55 }} />
          </div>
        </div>
      );
    }
    if (id === 'gallery') {
      /* Hero full-bleed + narrow centered content + right-edge dots. */
      return (
        <div style={tile}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 11, background: c, opacity: 0.6 }} />
          <div style={{ position: 'absolute', left: '32%', right: '20%', top: 16, height: 2, background: c, borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: '34%', right: '22%', top: 21, height: 2, background: c, borderRadius: 1, opacity: 0.55 }} />
          <div style={{ position: 'absolute', left: '32%', right: '20%', top: 26, height: 8, background: c, borderRadius: 1, opacity: 0.5 }} />
          {/* Sticky right-edge dots. */}
          <span style={{ position: 'absolute', right: 5, top: 18, width: 2, height: 2, borderRadius: '50%', background: c }} />
          <span style={{ position: 'absolute', right: 5, top: 23, width: 2, height: 2, borderRadius: '50%', background: cSoft }} />
          <span style={{ position: 'absolute', right: 5, top: 28, width: 2, height: 2, borderRadius: '50%', background: cSoft }} />
        </div>
      );
    }
    if (id === 'postcard') {
      /* Outer dark mat + inner postcard card + tilted stamp. */
      return (
        <div style={{ ...tile, background: on ? 'rgba(248,241,228,0.22)' : 'rgba(14,13,11,0.55)', display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'relative', width: '76%', height: '74%', background: on ? 'rgba(248,241,228,0.95)' : 'var(--cream)', borderRadius: 2, padding: 3 }}>
            {/* Stamp top-right. */}
            <div style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 7, background: on ? 'var(--ink)' : 'var(--peach-bg)', border: `0.5px dashed ${on ? 'var(--cream)' : 'var(--peach-ink)'}`, transform: 'rotate(6deg)' }} />
            <div style={{ height: 2, background: on ? 'var(--ink)' : 'var(--ink-muted)', borderRadius: 1, marginBottom: 2 }} />
            <div style={{ height: 2, width: '60%', background: on ? 'var(--ink)' : 'var(--ink-muted)', borderRadius: 1, opacity: 0.55 }} />
          </div>
        </div>
      );
    }
    /* stacked (default) */
    return (
      <div style={{ ...tile, display: 'flex', flexDirection: 'column', gap: 3, padding: 6 }}>
        <div style={{ height: 6, background: c, borderRadius: 1 }} />
        <div style={{ height: 5, background: c, borderRadius: 1, opacity: 0.6 }} />
        <div style={{ height: 5, width: '80%', background: c, borderRadius: 1, opacity: 0.6 }} />
      </div>
    );
  };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 9 }}>
        Layout · whole-page feel
      </div>
      {/* 8 layouts in a 3-col grid → 2 rows of 3 + a third row of 2.
          Flexes down to 2 cols on narrow rails via the auto-fit
          fallback below; the inline editor rail is always wide
          enough for 3, but the LookEngine rail can run tighter. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {opts.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => set(o.id, o.label)}
              className="lift"
              style={{
                padding: 6, borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                background: on ? 'var(--ink)' : 'var(--card)',
                border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
              }}
            >
              <Diagram id={o.id} on={on} />
              <div style={{ fontSize: 11.5, fontWeight: 700, color: on ? 'var(--cream)' : 'var(--ink)', marginTop: 6 }}>
                {o.label}
              </div>
              <div style={{ fontSize: 9.5, color: on ? 'rgba(248,241,228,0.7)' : 'var(--ink-muted)' }}>
                {o.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── KitPick — prototype L993-1013 (9-kit grid). ──────────────── */

/* The kit catalog is shared with the wizard's fitting room —
   lib/site-look/look-catalog.ts is the one list. */
const KITS = KIT_CATALOG;

/* Host-palette swatch set for the living kit miniatures — the
   host's own paper/ink/accent, not a stock preview. themeVars
   (pack or Colors-pick overrides) win over the catalog theme. */
interface KitPalette { paper: string; ink: string; accent: string; gold: string; line: string }

function kitPaletteFor(theme: Theme, manifest: StoryManifest): KitPalette {
  const o = ((manifest as unknown as { themeVars?: Record<string, string> }).themeVars) ?? {};
  const v = (token: string, fallback: string): string =>
    (typeof o[token] === 'string' && o[token]) || theme.vars[token] || fallback;
  return {
    paper: v('--t-paper', '#FBF7EE'),
    ink: v('--t-ink', '#2A2418'),
    accent: v('--t-accent', '#5C6B3F'),
    gold: v('--t-gold', '#C19A4B'),
    line: v('--t-line', 'rgba(42,36,24,0.16)'),
  };
}

/* KitMini — a tiny card drawn in the host's palette with the one
   gesture that names the kit (perforation, engraved frame, tape,
   red margin, punched hole…). Cheap divs only; no photos. */
function KitMini({ id, p }: { id: string; p: KitPalette }) {
  const frame: React.CSSProperties = {
    position: 'relative', height: 34, borderRadius: 5, overflow: 'hidden',
    background: p.paper, border: `1px solid ${p.line}`,
  };
  const line = (w: string, top: number, opacity = 1, color = p.ink): React.CSSProperties => ({
    position: 'absolute', left: 8, top, width: w, height: 2, borderRadius: 1, background: color, opacity,
  });
  /* Base body — a title line + a soft line; kits decorate around it. */
  const body = (
    <>
      <span style={line('44%', 9)} />
      <span style={line('62%', 16, 0.45)} />
    </>
  );
  switch (id) {
    case 'ticket':
      return (
        <div style={{ ...frame, borderStyle: 'dashed' }}>
          <span style={{ position: 'absolute', left: -5, top: '50%', width: 10, height: 10, marginTop: -5, borderRadius: '50%', background: 'var(--card)', border: `1px solid ${p.line}` }} />
          <span style={{ position: 'absolute', right: -5, top: '50%', width: 10, height: 10, marginTop: -5, borderRadius: '50%', background: 'var(--card)', border: `1px solid ${p.line}` }} />
          {body}
        </div>
      );
    case 'plate':
      return (
        <div style={frame}>
          <span style={{ position: 'absolute', inset: 3, border: `1px solid ${p.ink}`, borderRadius: 2, opacity: 0.6 }} />
          <span style={{ position: 'absolute', inset: 6, border: `1px solid ${p.ink}`, borderRadius: 1, opacity: 0.3 }} />
          <span style={{ ...line('38%', 15), left: '31%' }} />
        </div>
      );
    case 'scrapbook':
      return (
        <div style={{ ...frame, background: 'transparent', border: 'none', overflow: 'visible' }}>
          <span style={{ position: 'absolute', inset: '2px 6px', background: p.paper, border: `1px solid ${p.line}`, borderRadius: 3, transform: 'rotate(-2deg)', boxShadow: '0 1px 3px rgba(14,13,11,0.12)' }} />
          <span style={{ position: 'absolute', left: '38%', top: -2, width: 22, height: 7, background: p.gold, opacity: 0.45, transform: 'rotate(3deg)' }} />
          <span style={{ ...line('40%', 13), transform: 'rotate(-2deg)' }} />
        </div>
      );
    case 'index':
      return (
        <div style={frame}>
          <span style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 1, background: p.accent, opacity: 0.7 }} />
          <span style={line('46%', 9, 1)} />
          <span style={{ position: 'absolute', left: 8, right: 8, top: 16, height: 1, background: p.line }} />
          <span style={{ position: 'absolute', left: 8, right: 8, top: 24, height: 1, background: p.line }} />
        </div>
      );
    case 'minimal':
      return (
        <div style={{ ...frame, border: 'none', background: 'transparent' }}>
          <span style={{ position: 'absolute', left: 8, right: 8, top: 4, height: 1, background: p.ink, opacity: 0.7 }} />
          <span style={{ position: 'absolute', left: 8, top: 9, fontSize: 13, lineHeight: 1, fontWeight: 700, color: p.ink }}>01</span>
          <span style={line('40%', 26, 0.45)} />
        </div>
      );
    case 'arch':
      return (
        <div style={{ ...frame, background: 'transparent', border: 'none' }}>
          <span style={{ position: 'absolute', left: '26%', right: '26%', top: 2, bottom: 0, background: p.paper, border: `1px solid ${p.line}`, borderRadius: '50px 50px 4px 4px' }} />
          <span style={{ ...line('26%', 18), left: '37%' }} />
        </div>
      );
    case 'stamp':
      return (
        <div style={{ ...frame, border: `1px dashed ${p.accent}`, outline: `1px solid ${p.line}`, outlineOffset: 2 }}>
          {body}
          <span style={{ position: 'absolute', right: 6, top: 6, width: 9, height: 11, border: `1px solid ${p.accent}`, opacity: 0.6, transform: 'rotate(6deg)' }} />
        </div>
      );
    case 'deco':
      return (
        <div style={{ ...frame, border: `1px solid ${p.gold}` }}>
          <span style={{ position: 'absolute', inset: 3, border: `1px solid ${p.gold}`, opacity: 0.5 }} />
          <span style={{ position: 'absolute', left: '46%', top: 5, width: 6, height: 6, background: p.gold, transform: 'rotate(45deg)' }} />
          <span style={{ ...line('34%', 20), left: '33%' }} />
        </div>
      );
    case 'gallery':
      return (
        <div style={{ ...frame, background: 'var(--card)' }}>
          <span style={{ position: 'absolute', inset: 5, background: p.paper, border: `1px solid ${p.ink}`, opacity: 0.85 }} />
          <span style={{ position: 'absolute', right: 8, bottom: 7, fontSize: 7, color: p.ink, opacity: 0.7 }}>No. 3</span>
        </div>
      );
    case 'menu':
      return (
        <div style={frame}>
          <span style={{ position: 'absolute', left: 8, right: 8, top: 6, height: 1, background: p.gold }} />
          <span style={line('26%', 12)} />
          <span style={{ position: 'absolute', left: '42%', right: 22, top: 13, borderBottom: `1px dotted ${p.ink}`, opacity: 0.5 }} />
          <span style={{ position: 'absolute', right: 8, top: 12, width: 8, height: 2, background: p.ink, opacity: 0.8 }} />
          <span style={{ position: 'absolute', left: 8, right: 8, bottom: 6, height: 1, background: p.gold }} />
        </div>
      );
    case 'glass':
      return (
        <div style={{ ...frame, background: `linear-gradient(120deg, ${p.accent}, ${p.gold})` }}>
          <span style={{ position: 'absolute', inset: 5, borderRadius: 4, background: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.5)' }} />
          <span style={{ ...line('40%', 14, 0.8, p.paper), left: 12 }} />
        </div>
      );
    case 'boarding-pass':
      return (
        <div style={frame}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: p.accent }} />
          <span style={{ position: 'absolute', right: '26%', top: 0, bottom: 0, borderLeft: `1px dashed ${p.line}` }} />
          <span style={{ ...line('34%', 9), left: 14 }} />
          <span style={{ ...line('26%', 16, 0.45), left: 14 }} />
        </div>
      );
    case 'marquee':
      return (
        <div style={{ ...frame, background: p.ink }}>
          {[8, 20, 32, 44, 56, 68].map((x) => (
            <span key={x} style={{ position: 'absolute', left: `${x}%`, top: 4, width: 3, height: 3, borderRadius: '50%', background: p.gold, boxShadow: `0 0 4px ${p.gold}` }} />
          ))}
          <span style={{ ...line('44%', 16, 1, p.paper) }} />
        </div>
      );
    case 'chalkboard':
      return (
        <div style={{ ...frame, background: '#2E3230', border: `2px solid ${p.gold}` }}>
          <span style={{ ...line('44%', 10, 0.9, '#F2EFE6') }} />
          <span style={{ ...line('30%', 18, 0.5, '#F2EFE6') }} />
        </div>
      );
    case 'nursery':
      return (
        <div style={{ ...frame, borderRadius: 14, background: `color-mix(in srgb, ${p.accent} 14%, ${p.paper})`, border: 'none', boxShadow: `inset 0 0 0 1px ${p.line}` }}>
          <span style={{ ...line('38%', 13), left: 12, borderRadius: 2 }} />
        </div>
      );
    case 'kraft':
      return (
        <div style={{ ...frame, background: '#D9C7A7', border: `1px dashed ${p.ink}` }}>
          <span style={{ ...line('44%', 9, 0.8) }} />
          <span style={{ ...line('60%', 16, 0.4) }} />
        </div>
      );
    case 'memoriam':
      return (
        <div style={frame}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: p.ink }} />
          <span style={{ ...line('44%', 9), left: 10 }} />
          <span style={{ ...line('58%', 16, 0.4), left: 10 }} />
        </div>
      );
    case 'certificate':
      return (
        <div style={{ ...frame, border: `2px solid ${p.gold}` }}>
          <span style={{ position: 'absolute', inset: 3, border: `1px solid ${p.gold}`, opacity: 0.5 }} />
          <span style={{ ...line('36%', 10), left: '32%' }} />
          <span style={{ position: 'absolute', right: 7, bottom: 5, width: 9, height: 9, borderRadius: '50%', background: p.gold }} />
        </div>
      );
    case 'luggage-tag':
      return (
        <div style={{ ...frame, background: '#E4D3AE', borderRadius: '5px 12px 12px 5px' }}>
          <span style={{ position: 'absolute', left: 6, top: '50%', width: 7, height: 7, marginTop: -4, borderRadius: '50%', background: 'var(--card)', border: `1px solid ${p.ink}` }} />
          <span style={{ ...line('38%', 10), left: 18 }} />
          <span style={{ ...line('26%', 17, 0.45), left: 18 }} />
        </div>
      );
    case 'linen-press':
      return (
        <div style={{ ...frame, boxShadow: `inset 0 0 0 3px ${p.paper}, inset 0 0 0 4px ${p.line}` }}>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, ${p.line} 0 1px, transparent 1px 4px)`, opacity: 0.4 }} />
          {body}
        </div>
      );
    case 'wax-seal':
      return (
        <div style={frame}>
          {body}
          <span style={{ position: 'absolute', right: 6, bottom: 4, width: 12, height: 12, borderRadius: '50%', background: p.accent, boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${p.accent} 70%, ${p.ink})` }} />
        </div>
      );
    case 'pennant':
      return (
        <div style={{ ...frame, clipPath: 'polygon(0 0, 100% 0, 100% 72%, 88% 100%, 76% 72%, 64% 100%, 52% 72%, 40% 100%, 28% 72%, 16% 100%, 4% 72%, 0 100%)' }}>
          <span style={line('44%', 8)} />
        </div>
      );
    case 'embossed':
      return (
        <div style={{ ...frame, border: 'none', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.7), inset -1px -1px 2px rgba(14,13,11,0.18)' }}>
          <span style={{ ...line('44%', 13, 0.5) }} />
        </div>
      );
    default: /* classic */
      return (
        <div style={{ ...frame, borderRadius: 7 }}>
          <span style={{ position: 'absolute', left: 8, top: 6, width: 14, height: 1, background: p.gold }} />
          <span style={line('44%', 11)} />
          <span style={line('60%', 18, 0.45)} />
        </div>
      );
  }
}

function KitPick({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const value = manifest.kitId ?? 'classic';
  const tryOn = useCanvasTryOn();
  const palette = kitPaletteFor(theme, manifest);
  /* 24 kits was the single biggest wall in the Design scroll. Show
     the first six; the rest fold behind "Show all". Opens expanded
     when the site's current kit lives in the folded tail so the
     active card is never hidden. */
  const [showAllKits, setShowAllKits] = useState(
    () => KITS.findIndex((k) => k.id === value) >= 6,
  );
  const visibleKits = showAllKits ? KITS : KITS.slice(0, 6);
  const set = (id: string, label: string) => {
    tryOn.commit();
    onChange({ ...manifest, kitId: id } as StoryManifest);
    announceDesignChange('kit', label);
  };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 4 }}>
        Card style
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 9 }}>
        How cards, dividers, schedule &amp; badges are drawn. Hover to try one on your site.
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}
        onMouseLeave={() => tryOn.cancel()}
      >
        {visibleKits.map((k) => {
          const on = value === k.id || (!value && k.id === 'classic');
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => set(k.id, k.label)}
              onMouseEnter={() => tryOn.preview({ attrs: { 'data-pl-kit': k.id } })}
              onFocus={() => tryOn.preview({ attrs: { 'data-pl-kit': k.id } })}
              onBlur={() => tryOn.cancel()}
              aria-pressed={on}
              className="lift"
              style={{
                textAlign: 'left', padding: '8px 10px 9px', borderRadius: 9, cursor: 'pointer',
                background: on ? 'var(--cream-2)' : 'var(--card)',
                border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
              }}
            >
              <KitMini id={k.id} p={palette} />
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginTop: 7 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 9.5, lineHeight: 1.3, color: 'var(--ink-muted)', marginTop: 1 }}>
                {k.blurb}
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setShowAllKits((v) => !v)}
        aria-expanded={showAllKits}
        style={{
          marginTop: 8, width: '100%', padding: '7px 10px', borderRadius: 8,
          border: '1px dashed var(--line)', background: 'transparent',
          color: 'var(--ink-muted)', fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {showAllKits ? 'Show fewer styles' : `Show all ${KITS.length} styles`}
      </button>
    </div>
  );
}

/* ─── MotionKitPick — the Atelier · Motion panel (v2 editor.jsx
   MotionTab L395-230). Eight animated finishes that share the
   kitId field with the static kits; the motion layer only comes
   alive when Atelier is unlocked for this site (manifest.atelier
   → data-pl-premium on the renderer root). Selecting a motion kit
   always paints its STATIC base on the canvas; unlocking sets it
   in motion. ────────────────────────────────────────────────── */

const MOTION_KITS = [
  /* id 'neon' kept for data compat; the LABEL follows BRAND §10
     (neon is out of the Pearloom vocabulary — the finish itself is
     an occasion-scoped host opt-in). */
  { id: 'neon',          name: 'After Dark',    desc: 'Tube-light flicker + glow',               for: 'Bachelor/ette · NYE · galas',         sw: ['#15131C', '#B9A6E0'] },
  { id: 'marquee-live',  name: 'Marquee Live',  desc: 'Bulb lights, pulsing',                    for: 'Birthdays · theatre',                 sw: ['#FFFEF7', '#C19A4B'] },
  { id: 'aurora-glass',  name: 'Aurora Glass',  desc: 'Light drifting behind frosted glass',     for: 'Evening weddings',                    sw: ['#1A1B2E', '#B9A6E0'] },
  { id: 'gold-foil',     name: 'Gold Foil',     desc: 'A sheen sweeping the edges',              for: 'Deco · anniversaries',                sw: ['#14110C', '#C9A24B'] },
  { id: 'confetti',      name: 'Confetti',      desc: 'Slow falling flecks',                     for: 'Parties · reveals',                   sw: ['#FFFEF7', '#D9A89E'] },
  { id: 'candlelight',   name: 'Candlelight',   desc: 'A gentle warm flame',                     for: 'Memorials · vigils',                  sw: ['#FCF4EE', '#C19A4B'] },
  { id: 'pressed-bloom', name: 'Pressed Bloom', desc: 'A swaying pressed flower',                for: 'Garden · baby · bridal',              sw: ['#FDFAF0', '#B7A4D0'] },
  { id: 'vinyl',         name: 'Vinyl',         desc: 'A spinning record',                       for: 'Milestone birthdays · music',         sw: ['#FFFEF7', '#5C6B3F'] },
];

function MotionKitPick({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const premium = !!(manifest as unknown as { atelier?: boolean }).atelier;
  const value = manifest.kitId ?? 'classic';
  const setKit = (id: string, name: string) => {
    onChange({ ...manifest, kitId: id } as StoryManifest);
    announceDesignChange('kit', name);
  };
  const setPremium = (v: boolean) => onChange({ ...(manifest as unknown as Record<string, unknown>), atelier: v } as unknown as StoryManifest);
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 9 }}>
        ✦ Motion · Atelier
      </div>
      {/* Hero upsell banner */}
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14, background: 'linear-gradient(135deg, #2A2416, #4A3A1C)', padding: '16px 14px', position: 'relative' }}>
        {/* .pl-atelier-sheen — class, not inline animation, so the
            sweep sits behind the reduced-motion media guard. */}
        <div aria-hidden className="pl-atelier-sheen" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E6C877', marginBottom: 7 }}>✦ Atelier · Motion</div>
          <div className="display" style={{ fontSize: 20, color: '#FBF1DC', lineHeight: 1.1, marginBottom: 6 }}>{premium ? 'Your site is alive.' : 'Bring your site to life.'}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(243,236,217,0.75)', lineHeight: 1.5, marginBottom: 13 }}>
            {premium ? 'Every motion kit is unlocked for this site. Tap one to apply it.' : 'Eight living finishes, neon, foil, candlelight and more. One unlock, this site forever.'}
          </div>
          {/* NOTE the $19 unlock is the pre-checkout stub phase theme
              packs shipped through — real checkout lands via the same
              Stripe path (pl-store-owned + the publish paywall). Until
              then the click enables motion for THIS site. Once on, the
              button is an explicit toggle — the old "Manage" label
              silently revoked the unlock on click. */}
          <button
            type="button"
            onClick={() => setPremium(!premium)}
            className="lift"
            style={{ padding: '9px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, background: premium ? 'rgba(251,241,220,0.16)' : '#E6C877', color: premium ? '#FBF1DC' : '#241a08' }}
          >
            {premium ? 'Turn motion off' : 'Unlock Atelier, $19'}
          </button>
        </div>
      </div>
      {/* Motion kit cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MOTION_KITS.map((k) => {
          const on = value === k.id;
          return (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 9, borderRadius: 11, border: on ? '1px solid var(--gold)' : '1px solid var(--line)', background: on ? 'color-mix(in srgb, var(--gold) 12%, var(--card))' : 'var(--card)' }}>
              <span aria-hidden style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `linear-gradient(135deg, ${k.sw[0]}, ${k.sw[1]})`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)', position: 'relative' }}>
                {!premium && <span style={{ position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: '50%', background: 'var(--gold)', color: '#241a08', fontSize: 8, display: 'grid', placeItems: 'center', fontWeight: 800 }}>✦</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{k.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.3 }}>{k.desc}</div>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginTop: 3 }}>{k.for}</div>
              </div>
              <button
                type="button"
                onClick={() => setKit(k.id, k.name)}
                className="lift"
                style={{ padding: '6px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0, border: on ? '1px solid var(--gold)' : '1px solid var(--line)', background: on ? 'var(--gold)' : 'transparent', color: on ? '#241a08' : 'var(--ink)' }}
              >
                {on ? (premium ? 'On' : 'Preview') : 'Apply'}
              </button>
            </div>
          );
        })}
      </div>
      {!premium && (
        <div style={{ fontSize: 10.5, color: 'var(--gold-ink, var(--ink-muted))', fontStyle: 'italic', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Applying shows the still preview on your canvas. Unlock to set it in motion.
        </div>
      )}
    </div>
  );
}

/* LivingBackgroundPick — the v2 interactive shader wallpapers. Writes
   manifest.background (a WallpaperId, or undefined for None); the
   renderer mounts <LivingBackground /> behind the site when set. */
function LivingBackgroundPick({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const value = ((manifest as unknown as { background?: string }).background) ?? 'none';
  const set = (id: string, label: string) => {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      background: id === 'none' ? undefined : id,
    } as unknown as StoryManifest);
    announceDesignChange('background', label);
  };
  const tile = (key: string, label: string, grad: string | null, on: boolean) => (
    <button
      key={key}
      type="button"
      onClick={() => set(key, label)}
      className="lift"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        padding: '7px 9px', borderRadius: 9, cursor: 'pointer',
        background: on ? 'var(--ink)' : 'var(--card)',
        border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
      }}
    >
      <span aria-hidden style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: grad ?? 'var(--cream-3)', border: grad ? 'none' : '1px dashed var(--line)' }} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? 'var(--cream)' : 'var(--ink)' }}>{label}</span>
    </button>
  );
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 4 }}>
        Living background
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 9 }}>
        An animated shader ground that drifts behind your site and leans toward a guest&rsquo;s cursor.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {tile('none', 'None', null, value === 'none')}
        {WALLPAPERS.map((w) => tile(w.id, w.name, w.grad, value === w.id))}
      </div>
    </div>
  );
}

/* ─── FooterPick — the v2 site-renderer Footer treatment
   (signature / columns / minimal). SEL.2: writes
   manifest.layouts.footer (the canvas chip + FooterPanel's field);
   readVariant honors legacy manifest.footerVariant rows. ────────── */

const FOOTERS = [
  { id: 'signature', label: 'Signature', blurb: 'Sprig · names · date · place' },
  { id: 'columns',   label: 'Columns',   blurb: 'Names left · nav links right' },
  { id: 'minimal',   label: 'Minimal',   blurb: 'One quiet centered line' },
];

function FooterPick({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const value = readVariant(manifest, 'footer');
  const set = (id: string, label: string) => {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      layouts: {
        ...((manifest as unknown as { layouts?: Record<string, string> }).layouts ?? {}),
        footer: id,
      },
    } as unknown as StoryManifest);
    announceDesignChange('footer', label);
  };
  const rec = recommendedVariantFor('footer', (manifest as unknown as { occasion?: string }).occasion);
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 4 }}>
        Footer
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 9 }}>
        How your site signs off at the bottom of every page.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
        {FOOTERS.map((f) => {
          const on = value === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => set(f.id, f.label)}
              className="lift"
              title={f.id === rec ? `${f.blurb} · Recommended for this occasion` : f.blurb}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                textAlign: 'center', padding: '8px 6px', borderRadius: 9, cursor: 'pointer',
                background: on ? 'var(--sage-tint)' : 'var(--card)',
                border: on ? '1.5px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line)',
              }}
            >
              <VariantThumb section="footer" variant={f.id} size="chip" />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--ink)' }}>
                {f.label}
                {f.id === rec && <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── NavPick — the site menu (desktop + phone). The v2 DesignTab
   exposes both nav axes; production reads manifest.layouts.nav /
   .navMobile. "Menu" is the brand-plain label (BRAND §7). ───────── */

/* Options + active values come from the layouts registry (LAYOUTS +
   readVariant), never a local copy — a new nav variant or a changed
   default would silently desync a hardcoded list, highlighting one
   chip while the canvas renders another. */
const NAV_DESKTOP = LAYOUTS.nav ?? [];
const NAV_PHONE = LAYOUTS.navMobile ?? [];

function NavPick({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const layouts = ((manifest as unknown as { layouts?: Record<string, string> }).layouts) ?? {};
  const desktop = readVariant(manifest, 'nav');
  const phone = readVariant(manifest, 'navMobile');
  const set = (key: 'nav' | 'navMobile', id: string, label: string) => {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      layouts: { ...layouts, [key]: id },
    } as unknown as StoryManifest);
    /* The phone menu doesn't paint on a desktop canvas — say so
       instead of pulsing a nav that didn't change. */
    announceDesignChange('menu', key === 'navMobile' ? `${label} (phone)` : label);
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 7 };
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  /* Schematic cards, not text chips (LAY.2) — the same VariantThumb
     drawings the canvas popover and wizard use, with the gold
     occasion pearl. */
  const chipRow = (opts: { id: string; label: string }[], value: string, key: 'nav' | 'navMobile') => {
    const rec = recommendedVariantFor(key, occasion);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {opts.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => set(key, o.id, o.label)}
              className="lift"
              title={o.id === rec ? `${o.label} · Recommended for this occasion` : o.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '8px 4px', borderRadius: 9, cursor: 'pointer',
                border: on ? '1.5px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line)',
                background: on ? 'var(--sage-tint)' : 'var(--card)',
              }}
            >
              <VariantThumb section={key} variant={o.id} size="chip" />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, lineHeight: 1.15, color: 'var(--ink-soft)', textAlign: 'center' }}>
                {o.label}
                {o.id === rec && <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />}
              </span>
            </button>
          );
        })}
      </div>
    );
  };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={labelStyle}>Menu, desktop</div>
      {chipRow(NAV_DESKTOP, desktop, 'nav')}
      <div style={{ ...labelStyle, marginTop: 14 }}>Menu, phone</div>
      {chipRow(NAV_PHONE, phone, 'navMobile')}
    </div>
  );
}

/* ─── Fine-tune section — prototype L843-881 ──────────────────── */

/* Host-worded grain strength — shared by the slider label, the
   commit beacon, and the Soften nudge. */
function intensityLabelFor(v: number): string {
  return v <= 0.01 ? 'Off'
    : v < 0.6 ? 'Faint'
    : v < 1.05 ? 'Natural'
    : v < 1.35 ? 'Rich' : 'Bold';
}

function FineTune({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const voice = (manifest as unknown as { voiceOverride?: string }).voiceOverride ?? 'classic';
  /* Solemn occasions ignore the voice on purpose (occasion-copy:
     a playful memorial is not a thing we ship) — hide the knob
     rather than offer a control that does nothing. */
  const occ = (manifest as unknown as { occasion?: string }).occasion;
  const solemnSite = occ === 'memorial' || occ === 'funeral';
  const density = manifest.density ?? 'comfortable';
  const motifsOn = (manifest as unknown as { motifsEnabled?: boolean }).motifsEnabled ?? true;

  const setVoice = (v: string) => onChange({ ...(manifest as unknown as Record<string, unknown>), voiceOverride: v } as unknown as StoryManifest);
  const setDensity = (v: string) => {
    onChange({ ...manifest, density: v as 'cozy' | 'comfortable' | 'spacious' });
    announceDesignChange('spacing', ({ cozy: 'Cozy', comfortable: 'Comfy', spacious: 'Airy' } as Record<string, string>)[v] ?? v);
  };
  const setMotifs = (v: boolean) => {
    onChange({ ...(manifest as unknown as Record<string, unknown>), motifsEnabled: v } as unknown as StoryManifest);
    announceDesignChange('motifs', v ? 'On' : 'Off');
  };

  /* (The grain slider moved to TexturePick 2026-07-08 — texture
     material + strength are one "Paper" concept, and the two used
     to sit two scroll-screens apart.) */

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        Fine-tune · {theme.name}
      </div>

      {!solemnSite && (
        <PickRow label="Voice">
          <Segmented value={voice} setValue={setVoice} options={[
            { id: 'classic', label: 'Classic' },
            { id: 'playful', label: 'Playful' },
            { id: 'poetic', label: 'Poetic' },
          ]} />
        </PickRow>
      )}

      <PickRow label="Spacing">
        <Segmented value={density} setValue={setDensity} options={[
          { id: 'cozy', label: 'Cozy' },
          { id: 'comfortable', label: 'Comfy' },
          { id: 'spacious', label: 'Airy' },
        ]} />
      </PickRow>

      {theme.motif !== 'none' && (
        <PickRow label="Decorations">
          <Toggle on={motifsOn} set={setMotifs} />
        </PickRow>
      )}
    </div>
  );
}

/* ─── GrainRow — texture strength, inside the Paper group ─────────
   Lifted out of FineTune (2026-07-08): material + strength are one
   concept. Dragging previews imperatively (the texture layers'
   wrapper opacity scales toward the dragged value) and the manifest
   commits ONCE on release — one undo entry, one save; per-pixel
   manifest writes used to wipe the 50-entry undo stack. */
function GrainRow({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const intensity = (manifest as unknown as { textureIntensity?: number }).textureIntensity ?? 1;
  const textureOverride = (manifest as unknown as { texture?: string }).texture;
  const effectiveTexture = textureOverride && textureOverride !== '' ? textureOverride : theme.texture;

  const [draftIntensity, setDraftIntensity] = useState<number | null>(null);
  const shownIntensity = draftIntensity ?? intensity;
  const previewIntensity = (v: number) => {
    setDraftIntensity(v);
    const root = findCanvasRoot();
    if (!root) return;
    /* Wrapper opacity can only scale DOWN from the committed
       strength (opacity clamps at 1) — increases read at commit.
       The label above the slider tracks the drag either way. */
    const ratio = intensity > 0 ? Math.min(1, v / intensity) : 0;
    root.querySelectorAll<HTMLElement>('.pl8-texture-layer').forEach((el) => {
      el.style.opacity = String(ratio);
    });
  };
  const commitIntensity = (v: number) => {
    setDraftIntensity(null);
    const root = findCanvasRoot();
    root?.querySelectorAll<HTMLElement>('.pl8-texture-layer').forEach((el) => {
      el.style.removeProperty('opacity');
    });
    if (v === intensity) return;
    onChange({ ...(manifest as unknown as Record<string, unknown>), textureIntensity: v } as unknown as StoryManifest);
    announceDesignChange('grain', intensityLabelFor(v));
  };

  if (effectiveTexture === 'none') return null;

  const textureLabel = ({
    linen: 'Linen weave',
    watercolor: 'Watercolor washes',
    cotton: 'Cotton tooth',
    velvet: 'Velvet sheen',
    paper: 'Paper grain',
    none: 'Texture',
    canvas: 'Canvas weave',
    kraft: 'Kraft paper',
    vellum: 'Vellum sheet',
    letterpress: 'Letterpress',
    newsprint: 'Newsprint',
    marble: 'Marble vein',
    gilded: 'Gilded leaf',
  } as Record<string, string>)[effectiveTexture] ?? 'Paper grain';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{textureLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>{intensityLabelFor(shownIntensity)}</span>
      </div>
      <Slider value={shownIntensity} setValue={previewIntensity} onCommit={commitIntensity} min={0} max={1.5} step={0.05} />
    </div>
  );
}

/* ─── LegibilityNote — prototype L940-960. ────────────────────── */

function LegibilityNote({ manifest, theme, onChange }: { manifest: StoryManifest; theme: Theme; onChange: (m: StoryManifest) => void }) {
  const intensity = (manifest as unknown as { textureIntensity?: number }).textureIntensity ?? 1;
  const ratio = contrastRatio(theme.vars['--t-ink'], theme.vars['--t-paper']);
  const pass = ratio >= 4.5;
  const highTex = intensity > 1.1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: pass ? 'var(--sage-deep)' : 'var(--pl-chrome-danger, #b4543a)' }}>
        <Icon name={pass ? 'check' : 'eye-off'} size={13} color={pass ? 'var(--sage-deep)' : 'var(--pl-chrome-danger, #b4543a)'} />
        {pass ? `Text contrast AA · ${ratio.toFixed(1)}:1` : `Low contrast · ${ratio.toFixed(1)}:1`}
      </div>
      {highTex && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'color-mix(in oklab, var(--gold) 16%, var(--cream))' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>High texture can reduce legibility</span>
          <button
            type="button"
            onClick={() => {
              onChange({ ...(manifest as unknown as Record<string, unknown>), textureIntensity: 0.7 } as unknown as StoryManifest);
              announceDesignChange('grain', intensityLabelFor(0.7));
            }}
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', padding: '3px 9px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', cursor: 'pointer' }}
          >
            Soften
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── MatchMyPhotos — prototype L1188-1228 stub. ─────────────── */

function MatchMyPhotos({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [swatches, setSwatches] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true); setErr(null);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const palette: string[] = await new Promise((resolve, reject) => {
        img.onload = () => {
          try { resolve(extractPalette(img, 6)); }
          catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('Could not read that image'));
        img.src = url;
      });
      URL.revokeObjectURL(url);
      setSwatches(palette);
      /* Patch manifest.theme.colors with palette[0] as accent,
         palette[1] as accentLight, etc. The renderer reads these and
         repaints. */
      const next = { ...(manifest as unknown as Record<string, unknown>) };
      const existingTheme = (next.theme as Record<string, unknown> | undefined) ?? {};
      const existingColors = (existingTheme.colors as Record<string, string> | undefined) ?? {};
      next.theme = {
        ...existingTheme,
        colors: {
          ...existingColors,
          accent: palette[0] ?? existingColors.accent,
          accentLight: palette[1] ?? existingColors.accentLight,
          muted: palette[2] ?? existingColors.muted,
          cardBg: palette[3] ?? existingColors.cardBg,
        },
      };
      onChange(next as unknown as StoryManifest);
      announceDesignChange('colors', 'From your photo');
    } catch (e) {
      console.error('[theme-picker] photo palette error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t read that photo, try another?'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        Match my photos
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
        Pear pulls the palette from a photo and retints this theme.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = '';
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn btn-outline btn-sm"
          style={{ fontSize: 12 }}
        >
          <Icon name="image" size={13} /> {busy ? 'Reading…' : 'Upload a photo'}
        </button>
        {swatches.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {swatches.map((c, i) => (
                <span key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10)' }} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSwatches([])}
              title="Clear palette"
              style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer' }}
            >
              <Icon name="close" size={12} color="var(--ink-soft)" />
            </button>
          </>
        )}
      </div>
      {err && (
        <div style={{ padding: '6px 10px', borderRadius: 7, background: 'var(--pl-chrome-danger-soft, rgba(122,45,45,0.08))', fontSize: 11.5, color: 'var(--pl-chrome-danger, #7A2D2D)' }}>
          {err}
        </div>
      )}
    </div>
  );
}

/* extractPalette — quantize an image to N dominant colors using a
   48x48 canvas downsample + RGB bucket histogram. Cheap, client-side,
   matches handoff's PaletteFromPhotos approach. */
function extractPalette(img: HTMLImageElement, count: number): string[] {
  const SIZE = 48;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  /* Quantize each pixel to a 6-step-per-channel grid (216 colors). */
  const step = (v: number): number => Math.round(v / 51) * 51;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 100) continue;
    const r = step(data[i]); const g = step(data[i + 1]); const b = step(data[i + 2]);
    /* Ignore near-white / near-black so we get accent-y swatches. */
    const sum = r + g + b;
    if (sum > 720 || sum < 60) continue;
    const key = `${r}-${g}-${b}`;
    const cur = buckets.get(key);
    if (cur) { cur.r += r; cur.g += g; cur.b += b; cur.n += 1; }
    else buckets.set(key, { r, g, b, n: 1 });
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, count);
  return sorted.map(({ r, g, b, n }) => {
    const ar = Math.round(r / n); const ag = Math.round(g / n); const ab = Math.round(b / n);
    return `#${[ar, ag, ab].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  });
}

/* ─── shared atoms ────────────────────────────────────────── */

/* ─── ColorsPick — manual color overrides on themeVars ──────────
   Five host-facing tokens (Paper / Ink / Accent / Soft / Gold) as
   native color wells. Each pick also recomputes the DEPENDENT
   tones (section wash, card, accent-bg/ink, ink-soft/muted, hairlines,
   RSVP plate) with the same mixing math the wizard's
   themeVarsFromPalette uses, so a single bold accent pick never
   strands an unreadable button. Writes manifest.themeVars — the
   exact bag Theme Store packs write — so the renderer needs no new
   read path and pack picks keep winning until the host re-tweaks. */

const EDITABLE_COLORS: Array<[token: string, label: string]> = [
  ['--t-paper', 'Paper'],
  ['--t-ink', 'Ink'],
  ['--t-accent', 'Accent'],
  ['--t-accent-2', 'Soft'],
  ['--t-gold', 'Gold'],
];

function cpHex(v: unknown): string | null {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : null;
}
function cpRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function cpMix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = cpRgb(a); const [br, bg, bb] = cpRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`.toUpperCase();
}
function cpRgba(hex: string, alpha: number): string {
  const [r, g, b] = cpRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Tones derived from the three structural picks. */
function deriveDependentVars(paper: string, ink: string, accent: string): Record<string, string> {
  return {
    '--t-section': cpMix(paper, accent, 0.10),
    '--t-card': cpMix(paper, '#FFFFFF', 0.5),
    '--t-ink-soft': cpMix(ink, paper, 0.28),
    '--t-ink-muted': cpMix(ink, paper, 0.52),
    '--t-accent-bg': cpMix(paper, accent, 0.16),
    '--t-accent-ink': cpMix(accent, '#14120E', 0.3),
    '--t-line': cpRgba(ink, 0.16),
    '--t-line-soft': cpRgba(ink, 0.08),
    '--t-rsvp': ink,
    '--t-rsvp-ink': paper,
  };
}

/* nextThemeVarsFor — the themeVars bag a pick of `token = hex`
   commits: the pick itself, plus recomputed dependent tones when
   a structural color (paper/ink/accent) moved. Pure — shared by
   the manifest commit AND the live drag preview so they can never
   disagree. */
export function nextThemeVarsFor(
  overrides: Record<string, string>,
  resolved: (token: string) => string,
  token: string,
  hex: string,
): Record<string, string> {
  const next = { ...overrides, [token]: hex.toUpperCase() };
  const paper = token === '--t-paper' ? hex : resolved('--t-paper');
  const ink = token === '--t-ink' ? hex : resolved('--t-ink');
  const accent = token === '--t-accent' ? hex : resolved('--t-accent');
  /* Recompute dependents only when a structural color moved —
     Soft + Gold are leaf accents with no derived tones. */
  if (token === '--t-paper' || token === '--t-ink' || token === '--t-accent') {
    Object.assign(next, deriveDependentVars(paper, ink, accent));
    /* Keep explicit picks for tokens the host set directly. */
    for (const [t] of EDITABLE_COLORS) {
      if (cpHex(overrides[t])) next[t] = overrides[t];
    }
    next[token] = hex.toUpperCase();
  }
  return next;
}

function ColorsPick({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const overrides = ((manifest as unknown as { themeVars?: Record<string, string> }).themeVars) ?? {};
  const resolved = (token: string): string =>
    cpHex(overrides[token]) ?? cpHex((theme.vars as Record<string, unknown>)[token]) ?? '#888888';

  /* Mount snapshot — "Reset" returns to whatever the host walked in
     with (theme default OR an applied pack), not to a guess. */
  const [initialVars] = useState<Record<string, string> | undefined>(
    () => (manifest as unknown as { themeVars?: Record<string, string> }).themeVars,
  );
  const dirty = JSON.stringify(overrides) !== JSON.stringify(initialVars ?? {}) && Object.keys(overrides).length > 0;

  /* Live drag preview — the picker paints the canvas root
     imperatively per move (vars + the alias/literal expansion so
     it looks exactly like the commit); the manifest is written
     ONCE on release, so a drag is one undo entry + one autosave,
     not hundreds of full canvas re-renders. */
  const tryOn = useCanvasTryOn();
  const previewColor = (token: string, hex: string) => {
    if (!cpHex(hex)) return;
    tryOn.preview(expandThemeVarsForPreview(nextThemeVarsFor(overrides, resolved, token, hex)));
  };
  const setColor = (token: string, hex: string, label: string) => {
    const next = nextThemeVarsFor(overrides, resolved, token, hex);
    tryOn.commit();
    onChange({ ...(manifest as unknown as Record<string, unknown>), themeVars: next } as unknown as StoryManifest);
    announceDesignChange('colors', label);
  };

  const reset = () => {
    const loose = { ...(manifest as unknown as Record<string, unknown>) };
    if (initialVars && Object.keys(initialVars).length > 0) loose.themeVars = initialVars;
    else delete loose.themeVars;
    onChange(loose as unknown as StoryManifest);
  };

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
          Colors
        </div>
        {dirty && (
          <button
            type="button"
            onClick={reset}
            style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            Reset
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {EDITABLE_COLORS.map(([token, label]) => (
          <div key={token} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* Custom picker — the OS color dialog ignored our type
                and spacing entirely ("we went full custom UI"). */}
            <PlColorPicker
              value={resolved(token)}
              onChange={(hex) => setColor(token, hex, label)}
              onPreview={(hex) => previewColor(token, hex)}
              label={label}
              swatchStyle={{ width: '100%', aspectRatio: '1.4/1' }}
            />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        Paper, ink and accent re-mix the washes, hairlines and buttons with them, the site stays readable.
      </div>
    </div>
  );
}

/* ─── FontsPick — type pairings with live hover preview ─────────
   Writes manifest.themeVars['--t-display' / '--t-body'] — the
   exact slots Theme Store packs write, so the renderer needs no
   new read path. HOVERING a pair paints it straight onto the
   canvas root's CSS vars (imperative, transient — restored on
   leave); clicking commits. The faces themselves ride the same
   <StoreFonts /> stylesheet the pack catalog loads. */

const FONT_PAIRS: Array<{ id: string; name: string; sub: string; display: string; body: string }> = [
  { id: 'fraunces',  name: 'Fraunces',  sub: 'with Inter',      display: "'Fraunces', Georgia, serif",           body: "'Inter', sans-serif" },
  { id: 'playfair',  name: 'Playfair',  sub: 'with Inter',      display: "'Playfair Display', Georgia, serif",   body: "'Inter', sans-serif" },
  { id: 'cormorant', name: 'Cormorant', sub: 'with Jost',       display: "'Cormorant Garamond', Georgia, serif", body: "'Jost', sans-serif" },
  { id: 'italiana',  name: 'Italiana',  sub: 'with Inter',      display: "'Italiana', Georgia, serif",           body: "'Inter', sans-serif" },
  { id: 'marcellus', name: 'Marcellus', sub: 'with Jost',       display: "'Marcellus', Georgia, serif",          body: "'Jost', sans-serif" },
  { id: 'ebgaramond', name: 'EB Garamond', sub: 'with DM Sans', display: "'EB Garamond', Georgia, serif",        body: "'DM Sans', sans-serif" },
  { id: 'bodoni',    name: 'Bodoni',    sub: 'with DM Sans',    display: "'Bodoni Moda', Georgia, serif",        body: "'DM Sans', sans-serif" },
  { id: 'cinzel',    name: 'Cinzel',    sub: 'with Tenor Sans', display: "'Cinzel', Georgia, serif",             body: "'Tenor Sans', sans-serif" },
  { id: 'grotesk',   name: 'Grotesk',   sub: 'with Inter',      display: "'Space Grotesk', sans-serif",          body: "'Inter', sans-serif" },
];

function FontsPick({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  void theme;
  const overrides = ((manifest as unknown as { themeVars?: Record<string, string> }).themeVars) ?? {};
  const activeDisplay = overrides['--t-display'];
  const hasOverride = !!activeDisplay || !!overrides['--t-body'];

  /* Transient hover preview — the shared canvas try-on (was a
     bespoke previewRef here; that pattern graduated into
     useCanvasTryOn and this call site now rides it, gaining the
     --font-display alias + literal font-family expansion). */
  const tryOn = useCanvasTryOn();
  const startPreview = (display: string, body: string) => {
    tryOn.preview(expandThemeVarsForPreview({ '--t-display': display, '--t-body': body }));
  };

  const commit = (pair: (typeof FONT_PAIRS)[number]) => {
    /* The committed manifest re-renders the root with these exact
       vars — keep the paint, drop the snapshot. */
    tryOn.commit();
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      themeVars: { ...overrides, '--t-display': pair.display, '--t-body': pair.body },
    } as unknown as StoryManifest);
    announceDesignChange('fonts', pair.name);
  };
  const reset = () => {
    const next = { ...overrides };
    delete next['--t-display'];
    delete next['--t-body'];
    const loose = { ...(manifest as unknown as Record<string, unknown>) };
    if (Object.keys(next).length > 0) loose.themeVars = next;
    else delete loose.themeVars;
    tryOn.cancel();
    onChange(loose as unknown as StoryManifest);
    announceDesignChange('fonts', 'Match theme');
  };

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <StoreFonts />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
          Fonts
        </div>
        {hasOverride && (
          <button
            type="button"
            onClick={reset}
            style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            Match theme
          </button>
        )}
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}
        onMouseLeave={() => tryOn.cancel()}
      >
        {FONT_PAIRS.map((pair) => {
          const on = activeDisplay === pair.display;
          return (
            <button
              key={pair.id}
              type="button"
              aria-pressed={on}
              onMouseEnter={() => startPreview(pair.display, pair.body)}
              onFocus={() => startPreview(pair.display, pair.body)}
              onBlur={() => tryOn.cancel()}
              onClick={() => commit(pair)}
              style={{
                padding: '9px 6px 7px',
                borderRadius: 10,
                border: on ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                background: on ? 'var(--cream-2)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            >
              <span style={{ display: 'block', fontFamily: pair.display, fontSize: 19, lineHeight: 1, color: 'var(--ink)' }}>
                Aa
              </span>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink)', marginTop: 5 }}>
                {pair.name}
              </span>
              <span style={{ display: 'block', fontFamily: pair.body, fontSize: 9.5, color: 'var(--ink-muted)', marginTop: 1 }}>
                {pair.sub}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        Hover to try a pairing on your live site, click to keep it.
      </div>
    </div>
  );
}

/* ─── TexturePick — manual paper material ───────────────────────
   Writes manifest.texture (the same field Theme Store packs write);
   the grain slider in Fine-tune controls its strength. "None" is a
   real override — ThemedSite honors it instead of falling back to
   the theme's material. */

const TEXTURE_OPTIONS = TEXTURE_CATALOG;

function TexturePick({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const override = (manifest as unknown as { texture?: string }).texture;
  const active = override && override !== '' ? override : theme.texture;
  const set = (id: string, label: string) => {
    onChange({ ...(manifest as unknown as Record<string, unknown>), texture: id } as unknown as StoryManifest);
    announceDesignChange('texture', label);
  };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
          Paper texture
        </div>
        {override && override !== theme.texture && (
          <button
            type="button"
            onClick={() => {
              const loose = { ...(manifest as unknown as Record<string, unknown>) };
              delete loose.texture;
              onChange(loose as unknown as StoryManifest);
            }}
            style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            Match theme
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {TEXTURE_OPTIONS.map((o) => {
          const on = o.id === active;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => set(o.id, o.label)}
              aria-pressed={on}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: on ? '1px solid var(--ink)' : '1px solid var(--line)',
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {/* Strength — one Paper group: material chips + the grain
          slider together (was two scroll-screens apart). Slide to
          0 to turn any material off. */}
      <GrainRow theme={theme} manifest={manifest} onChange={onChange} />
    </div>
  );
}

function PickRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 30 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', maxWidth: 220 }}>{children}</div>
    </div>
  );
}

function Segmented({ value, setValue, options }: { value: string; setValue: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--cream-2)', borderRadius: 8, width: '100%' }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setValue(o.id)}
            style={{
              flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--cream)' : 'var(--ink-soft)',
              border: 0, cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      style={{
        width: 38, height: 22, borderRadius: 999,
        background: on ? 'var(--sage)' : 'var(--cream-3)',
        position: 'relative', border: 'none', cursor: 'pointer',
      }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'left var(--pl-dur-fast) ease' }} />
    </button>
  );
}

function Slider({ value, setValue, onCommit, min, max, step }: { value: number; setValue: (v: number) => void; /** Fires once on release (pointer up / key up / blur), lets callers preview during the drag and write the manifest a single time. */ onCommit?: (v: number) => void; min: number; max: number; step: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  const commit = onCommit
    ? (e: { currentTarget: HTMLInputElement }) => onCommit(parseFloat(e.currentTarget.value))
    : undefined;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(parseFloat(e.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      onBlur={commit}
      style={{
        width: '100%', height: 6, borderRadius: 999, appearance: 'none',
        WebkitAppearance: 'none',
        background: `linear-gradient(90deg, var(--ink) 0 ${pct}%, var(--cream-3) ${pct}% 100%)`,
        cursor: 'pointer', outline: 'none',
      }}
    />
  );
}

function hx(hex: string): [number, number, number] {
  const m = (hex || '#000').replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [parseInt(n.slice(0, 2), 16) || 0, parseInt(n.slice(2, 4), 16) || 0, parseInt(n.slice(4, 6), 16) || 0];
}
function lum(hex: string): number {
  const c = hx(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(a: string, b: string): number {
  const l1 = lum(a), l2 = lum(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
