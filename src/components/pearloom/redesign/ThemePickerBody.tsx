'use client';

/* eslint-disable no-restricted-syntax */
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

import { useState, useRef, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import { getTheme, type Theme } from '../site/themes';
import { ThemePackPicker } from '../editor/panels/ThemePackPicker';
import { pearErrorMessage } from './PearAssist';

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  onOpenShop: () => void;
  onOpenDecor: () => void;
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

export function ThemePickerBody({ manifest, onChange, onOpenShop, onOpenDecor }: Props) {
  const themeId = ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string } }).theme?.id);
  const theme = getTheme(themeId);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EventTypeChip manifest={manifest} onChange={onChange} />
      <GenerateCard manifest={manifest} onChange={onChange} />
      {/* Recommended themes — already lives at the right shape after
          earlier ThemePackPicker rewrite (Aa/and tiles + ★ Pick badge
          + ✓ active checkmark + corner motif + footer). */}
      <ThemePackPicker manifest={manifest} onChange={onChange} />

      <SiteLayoutPick manifest={manifest} onChange={onChange} />
      <KitPick manifest={manifest} onChange={onChange} />

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

      <MatchMyPhotos manifest={manifest} onChange={onChange} />

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
          window.dispatchEvent(new CustomEvent('pearloom:open-command-palette'));
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
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t style that one — try again?');
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
      onChange(next as unknown as StoryManifest);
      setRationale(data.rationale ?? 'Pear styled your site.');
    } catch (e) {
      console.error('[theme-picker] look-from-story error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t style that one — try again?'));
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
          <div style={{ padding: '8px 10px', borderRadius: 9, background: 'rgba(122,45,45,0.10)', fontSize: 11.5, color: '#7A2D2D' }}>
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
  const set = (id: string) => onChange({ ...(manifest as unknown as Record<string, unknown>), siteLayout: id } as unknown as StoryManifest);
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
              onClick={() => set(o.id)}
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

const KITS = [
  { id: 'classic',   label: 'Classic',   blurb: 'Theme-native cards & rules' },
  { id: 'ticket',    label: 'Ticket',    blurb: 'Perforated stubs · monospace' },
  { id: 'plate',     label: 'Plate',     blurb: 'Engraved frames · Roman' },
  { id: 'scrapbook', label: 'Scrapbook', blurb: 'Taped, tilted, handwritten' },
  { id: 'index',     label: 'Index',     blurb: 'Ruled cards · red margin' },
  { id: 'minimal',   label: 'Minimal',   blurb: 'Hairlines · big numerals' },
  { id: 'arch',      label: 'Arch',      blurb: 'Arched cards · soft domes' },
  { id: 'stamp',     label: 'Stamp',     blurb: 'Postage frames · postmarks' },
  { id: 'deco',      label: 'Deco',      blurb: 'Gold frames · geometric' },
  { id: 'gallery',   label: 'Gallery',   blurb: 'Museum mats · exhibit numbers' },
  { id: 'menu',      label: 'Tasting Menu', blurb: 'Gold rules · dotted leaders' },
];

function KitPick({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const value = manifest.kitId ?? 'classic';
  const set = (id: string) => onChange({ ...manifest, kitId: id } as StoryManifest);
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 4 }}>
        Component kit
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 9 }}>
        How cards, dividers, schedule &amp; badges are drawn.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {KITS.map((k) => {
          const on = value === k.id || (!value && k.id === 'classic');
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => set(k.id)}
              className="lift"
              style={{
                textAlign: 'left', padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                background: on ? 'var(--ink)' : 'var(--card)',
                border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: on ? 'var(--cream)' : 'var(--ink)' }}>
                {k.label}
              </div>
              <div style={{ fontSize: 9.5, lineHeight: 1.3, color: on ? 'rgba(248,241,228,0.72)' : 'var(--ink-muted)', marginTop: 1 }}>
                {k.blurb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Fine-tune section — prototype L843-881 ──────────────────── */

function FineTune({ theme, manifest, onChange }: { theme: Theme; manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const voice = (manifest as unknown as { voiceOverride?: string }).voiceOverride ?? 'classic';
  const density = manifest.density ?? 'comfortable';
  const intensity = (manifest as unknown as { textureIntensity?: number }).textureIntensity ?? 1;
  const motifsOn = (manifest as unknown as { motifsEnabled?: boolean }).motifsEnabled ?? true;

  const setVoice = (v: string) => onChange({ ...(manifest as unknown as Record<string, unknown>), voiceOverride: v } as unknown as StoryManifest);
  const setDensity = (v: string) => onChange({ ...manifest, density: v as 'cozy' | 'comfortable' | 'spacious' });
  const setIntensity = (v: number) => onChange({ ...(manifest as unknown as Record<string, unknown>), textureIntensity: v } as unknown as StoryManifest);
  const setMotifs = (v: boolean) => onChange({ ...(manifest as unknown as Record<string, unknown>), motifsEnabled: v } as unknown as StoryManifest);

  const textureLabel = ({
    linen: 'Linen weave',
    watercolor: 'Watercolor washes',
    cotton: 'Cotton tooth',
    velvet: 'Velvet sheen',
    paper: 'Paper grain',
    none: 'Texture',
  } as Record<string, string>)[theme.texture] ?? 'Paper grain';

  const intensityLabel = intensity <= 0.01 ? 'Off'
    : intensity < 0.6 ? 'Faint'
    : intensity < 1.05 ? 'Natural'
    : intensity < 1.35 ? 'Rich' : 'Bold';

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        Fine-tune · {theme.name}
      </div>

      <PickRow label="Voice">
        <Segmented value={voice} setValue={setVoice} options={[
          { id: 'classic', label: 'Classic' },
          { id: 'playful', label: 'Playful' },
          { id: 'poetic', label: 'Poetic' },
        ]} />
      </PickRow>

      <PickRow label="Spacing">
        <Segmented value={density} setValue={setDensity} options={[
          { id: 'cozy', label: 'Cozy' },
          { id: 'comfortable', label: 'Comfy' },
          { id: 'spacious', label: 'Airy' },
        ]} />
      </PickRow>

      {theme.texture !== 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{textureLabel}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>{intensityLabel}</span>
          </div>
          <Slider value={intensity} setValue={setIntensity} min={0} max={1.5} step={0.05} />
        </div>
      )}

      {theme.motif !== 'none' && (
        <PickRow label="Motifs">
          <Toggle on={motifsOn} set={setMotifs} />
        </PickRow>
      )}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: pass ? 'var(--sage-deep)' : '#b4543a' }}>
        <Icon name={pass ? 'check' : 'eye-off'} size={13} color={pass ? 'var(--sage-deep)' : '#b4543a'} />
        {pass ? `Text contrast AA · ${ratio.toFixed(1)}:1` : `Low contrast · ${ratio.toFixed(1)}:1`}
      </div>
      {highTex && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'color-mix(in oklab, var(--gold) 16%, var(--cream))' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>High texture can reduce legibility</span>
          <button
            type="button"
            onClick={() => onChange({ ...(manifest as unknown as Record<string, unknown>), textureIntensity: 0.7 } as unknown as StoryManifest)}
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
    } catch (e) {
      console.error('[theme-picker] photo palette error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t read that photo — try another?'));
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
        <div style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11.5, color: '#7A2D2D' }}>
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
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'left 160ms ease' }} />
    </button>
  );
}

function Slider({ value, setValue, min, max, step }: { value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(parseFloat(e.target.value))}
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
