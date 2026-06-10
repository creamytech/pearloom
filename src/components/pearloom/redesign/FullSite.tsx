'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L314-579 FullSite.

   This is the IN-EDITOR canvas content — a stylised stand-in for the
   published site that gives the host a sense of layout + decoration
   without rendering the full themed-site engine. Each <section> wraps
   in SectionFrame which paints the lavender outline / hover dash /
   active label-chip when the host clicks/hovers.

   Real preview (full themed-site) is reachable via the topbar's
   Preview pill, which switches the canvas to ThemedSiteRenderer. */

import { type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Blob, Icon, Pear, Squiggle } from '../motifs';
import { AmbientThread } from '../ambient';
import { getTheme, themeRootStyle, type Density } from '../site/themes';
import { TextureFilters } from '../site/TextureFilters';
import type { SectionId } from './EditorRedesign';

type AccentTone = 'lavender' | 'peach' | 'sage' | 'cream';

interface Props {
  active: SectionId;
  hover: SectionId;
  setActive: (id: SectionId) => void;
  setHover: (id: SectionId) => void;
  editable: boolean;
  manifest: StoryManifest;
  names: [string, string];
}

export function FullSite({ active, hover, setActive, setHover, editable, manifest, names }: Props) {
  /* Resolve active theme — host pick → manifest.themeId → default.
     Spreads the theme's full --t-* token bag onto a root wrapper
     so every section's var(--t-paper) / var(--t-accent) / etc.
     reads the host's picked theme. This is what makes theme/color
     picks visually repaint the canvas. */
  const themeId =
    ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string } }).theme?.id);
  const theme = getTheme(themeId);
  const density = (manifest.density ?? 'comfortable') as Density;
  const themeStyle = themeRootStyle(theme, density);

  /* The hero accent BG follows the theme's --t-accent-bg when set,
     falling back to the prototype's lavender wash. */
  const accent: AccentTone = 'lavender';
  const accentBg = (theme.vars['--t-accent-bg'] as string | undefined) || ACCENT_BG[accent];
  const padScale = { cozy: 0.7, comfortable: 1, spacious: 1.3 }[density];
  /* Theme display font wins over the chrome default. */
  const headFont = (theme.vars['--t-display'] as string | undefined) || 'var(--font-display)';
  /* Color override priority: manifest.theme.colors (production
     ColorTokenInspector palette) → manifest.themeVars (applied
     pack's full --t-* bag) → 6-base-theme catalog vars. */
  const hostColors = ((manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors) ?? {};
  const packVars = ((manifest as unknown as { themeVars?: Record<string, string> }).themeVars) ?? {};
  const pick = (...candidates: Array<string | undefined>) =>
    candidates.find((c): c is string => Boolean(c));
  const themeInk = pick(hostColors.foreground, packVars['--t-ink'], theme.vars['--t-ink']) || 'var(--ink)';
  const themeInkSoft = pick(packVars['--t-ink-soft'], theme.vars['--t-ink-soft']) || 'var(--ink-soft)';
  const themeInkMuted = pick(hostColors.muted, packVars['--t-ink-muted'], theme.vars['--t-ink-muted']) || 'var(--ink-muted)';
  const themeAccent = pick(hostColors.accent, packVars['--t-accent'], theme.vars['--t-accent']) || 'var(--peach-ink)';
  const themePaper = pick(hostColors.background, packVars['--t-paper'], theme.vars['--t-paper']) || 'var(--paper)';
  const themeSection = pick(packVars['--t-section'], theme.vars['--t-section']) || 'var(--cream-2)';
  const themeCard = pick(hostColors.cardBg, packVars['--t-card'], theme.vars['--t-card']) || 'var(--card)';
  const themeGold = pick(packVars['--t-gold'], theme.vars['--t-gold']) || 'var(--gold)';
  const themeLineSoft = pick(packVars['--t-line-soft'], theme.vars['--t-line-soft']) || 'var(--line-soft)';
  const themeRsvp = pick(packVars['--t-rsvp'], theme.vars['--t-rsvp']) || themeInk;
  const themeRsvpInk = pick(packVars['--t-rsvp-ink'], theme.vars['--t-rsvp-ink']) || themePaper;

  /* Host-visible toggles that the prototype's tweaks panel exposes.
     Texture intensity 0 → off; motifsOn=false suppresses every
     decorative shape (Blob, Squiggle, photo strip rotation glyphs). */
  const textureIntensity = (manifest as unknown as { textureIntensity?: number }).textureIntensity ?? 1;
  const motifsOn = (manifest as unknown as { motifsEnabled?: boolean }).motifsEnabled ?? true;
  /* Texture overlay style — a quiet noise filter painted on top of
     the canvas root when intensity > 0. The handoff TextureLayer in
     shared/themes.jsx does the same with feTurbulence. We use a
     cheap SVG-data-url version for the canvas preview. */
  const texturePaint = textureIntensity > 0
    ? `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.90 0 0 0 0 0.78 0 0 0 ${0.06 * textureIntensity} 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`
    : 'none';

  /* Filter UUID-like strings out of names — the slug "F7d9a3b2"
     was leaking into the H1 as a couple name. Hex-only / pure-
     numeric / 'couple' = reject; fall back to prototype defaults. */
  const isUuidLike = (s: string): boolean =>
    /^[0-9a-f]{4,}$/i.test(s) || /^\d+$/.test(s) || s.toLowerCase() === 'couple';
  const cleanA = names[0] && !isUuidLike(names[0]) ? names[0] : '';
  const cleanB = names[1] && !isUuidLike(names[1]) ? names[1] : '';
  const nameA = cleanA || 'Scott';
  const nameB = cleanB || 'Shauna';
  /* Date formatter — accepts ISO ("2027-04-27") or pre-formatted
     strings ("Monday, April 26, 2027") and always renders the long
     human form the handoff hero uses. */
  const rawDate = (manifest as unknown as { logistics?: { date?: string } }).logistics?.date;
  const date = formatHeroDate(rawDate) || 'Monday, April 26, 2027';
  const venue = (manifest as unknown as { logistics?: { venue?: string } }).logistics?.venue || 'Casa Chorro';
  const place = (manifest as unknown as { logistics?: { place?: string } }).logistics?.place || 'Santorini, Greece';

  return (
    <div
      data-pl-texture={theme.texture}
      data-pl-density={density}
      onMouseLeave={() => setHover(null)}
      style={{
        ...themeStyle,
        background: themePaper,
        position: 'relative',
        ['--pl-texture-intensity' as string]: String(textureIntensity),
      }}
    >
      {/* SVG filter defs for the per-texture <feTurbulence> filters
          referenced by data-pl-texture CSS layers (linen / watercolor
          / paper / cotton / velvet / etc.). Mounted once; transparent
          and pointer-events: none. */}
      <TextureFilters />
      {/* Texture overlay — quiet grain layer painted across the
          canvas root with the theme's natural texture applied as a
          mix-blend overlay. Driven by data-pl-texture CSS in
          pearloom.css. The local backgroundImage falls through for
          themes whose texture isn't in the .pl8-guest CSS map. */}
      {textureIntensity > 0 && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: texturePaint,
            mixBlendMode: 'soft-light',
            opacity: textureIntensity * 0.55,
            zIndex: 1,
          }}
        />
      )}
      {/* Sub-nav — prototype L332-347. */}
      <SectionFrame id="nav" label="Site nav" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable} hideHandle>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 18, padding: '14px 32px',
            fontSize: 12.5, color: themeInkSoft,
            borderBottom: `1px solid ${themeLineSoft}`,
            background: themePaper,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pear size={22} tone="sage" shadow={false} />
            <span style={{ fontFamily: headFont, fontStyle: 'italic', fontSize: 16, color: themeInk }}>
              {nameA} &amp; {nameB}
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 18, opacity: 0.85 }}>
            {['Story', 'Details', 'Schedule', 'Travel', 'Registry', 'Gallery'].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 999, background: themeInk, color: themePaper, fontSize: 11.5, fontWeight: 600 }}>
            RSVP
          </span>
        </div>
      </SectionFrame>

      {/* Hero — prototype L350-374, the screenshot-iconic centerpiece. */}
      <SectionFrame id="hero" label="Hero" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            padding: `${56 * padScale}px 32px ${48 * padScale}px`,
            background: accentBg,
            overflow: 'hidden',
          }}
        >
          {/* Decorative blobs + squiggle — suppressed when motifsOn=false
              per the prototype's tweaks panel Motifs toggle. */}
          {motifsOn && (
            <>
              <Blob tone={accent} size={360} opacity={0.5} style={{ position: 'absolute', top: -80, left: -80 }} />
              <Blob tone="peach" size={280} opacity={0.5} style={{ position: 'absolute', bottom: -60, right: -40 }} />
              <AmbientThread size={170} accent={themeGold} style={{ position: 'absolute', top: 54, right: 74, opacity: 0.1, transform: 'rotate(-6deg)' }} />
            </>
          )}

          <div style={{ position: 'relative' }}>
            {/* SAVE THE DATE eyebrow — handoff themed-site.jsx hero L341-345. */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: theme.vars['--t-eyebrow-ls'] ?? '0.18em',
                textTransform: 'uppercase',
                color: themeAccent,
                marginBottom: 10,
              }}
            >
              Save the date
            </div>
            <div style={{ fontFamily: headFont, fontStyle: 'italic', fontSize: 18, color: themeInkSoft, marginBottom: 14 }}>
              together, at last
            </div>
            <h1 style={{ fontFamily: headFont, fontSize: 84, lineHeight: 0.95, margin: 0, letterSpacing: '-0.02em', fontWeight: Number(theme.vars['--t-display-wght'] ?? 600), color: themeInk }}>
              {nameA}
              <span style={{ fontStyle: 'italic', fontFamily: headFont, fontSize: 64, color: themeInkSoft, margin: '0 12px' }}>
                and
              </span>
              {nameB}
            </h1>
            <div style={{ marginTop: 22, fontSize: 14, color: themeInkSoft, display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={13} color={themeAccent} /> {date}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="pin" size={13} color={themeAccent} /> {venue} · {place}
              </span>
            </div>
            {/* Horizontal hairline with center dot — handoff hero
                divider between location and RSVP buttons. */}
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.6 }}>
              <span style={{ flex: 0.18, height: 1, background: themeInkSoft }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: themeAccent }} />
              <span style={{ flex: 0.18, height: 1, background: themeInkSoft }} />
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '11px 24px', borderRadius: 999, background: themePaper, color: themeInk, fontSize: 13, fontWeight: 700, border: `1px solid ${themeInkSoft}` }}>
                RSVP →
              </span>
              <span style={{ padding: '11px 24px', borderRadius: 999, background: 'transparent', border: `1px solid ${themeInkSoft}`, fontSize: 13, fontWeight: 600, color: themeInkSoft }}>
                Learn more
              </span>
            </div>
            <PhotoStrip />
          </div>
        </div>
      </SectionFrame>

      {/* Story — handoff themed-site.jsx hero story section. */}
      <SectionFrame id="story" label="Our story" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 80px`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center', background: themePaper }}>
          <PhotoPlaceholder tone="warm" aspect="4/5" style={{ borderRadius: 12 }} />
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: theme.vars['--t-eyebrow-ls'] ?? '0.18em',
                textTransform: 'uppercase',
                color: themeAccent,
                marginBottom: 8,
              }}
            >
              Our story
            </div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: 0, lineHeight: 1, fontWeight: 600, color: themeInk }}>
              How we{' '}
              <span style={{ fontStyle: 'italic', color: themeInkSoft }}>met</span>
            </h2>
            <p style={{ marginTop: 16, fontSize: 14.5, color: themeInkSoft, lineHeight: 1.6 }}>
              We met on an ordinary Tuesday and spent the evening arguing, fondly,
              about whether olives belong on pizza. Ten years later, we would be
              honoured to have you with us as we marry — there is no story we would
              rather tell, and no one we would rather tell it to.
            </p>
          </div>
        </div>
      </SectionFrame>

      {/* Details — prototype L395-411. */}
      <SectionFrame id="details" label="Details" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${36 * padScale}px 32px`, background: themeSection }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 760, marginInline: 'auto' }}>
            {[
              { icon: 'sparkles', l: 'Dress code', v: 'Garden formal' },
              { icon: 'users', l: 'Kids welcome', v: 'Ages 10 +' },
              { icon: 'gift', l: 'Gifts', v: 'Your presence is enough' },
            ].map((d) => (
              <div key={d.l} style={{ background: themeCard, borderRadius: 12, padding: 18, border: `1px solid ${themeLineSoft}` }}>
                <Icon name={d.icon} size={18} color={themeGold} />
                <div className="eyebrow" style={{ marginTop: 10, marginBottom: 4, color: themeInkMuted }}>{d.l}</div>
                <div style={{ fontFamily: headFont, fontSize: 18, fontWeight: 600, color: themeInk }}>{d.v}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Schedule — prototype L414-435. */}
      <SectionFrame id="schedule" label="Schedule" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px`, background: themePaper }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="eyebrow" style={{ color: themeAccent }}>THE DAY · APRIL 26</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: '6px 0 0', lineHeight: 1, fontWeight: 600, color: themeInk }}>
              The day, in moments
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 880, marginInline: 'auto' }}>
            {[
              { t: '4:30 pm', l: 'Ceremony', s: 'Olive grove' },
              { t: '5:30 pm', l: 'Cocktails', s: 'Terrace bar' },
              { t: '7:00 pm', l: 'Dinner', s: 'Long table' },
              { t: '9:00 pm', l: 'Dancing', s: 'Until late' },
            ].map((s) => (
              <div key={s.t} style={{ padding: 16, background: themeCard, borderRadius: 12, border: `1px solid ${themeLineSoft}`, textAlign: 'center' }}>
                <div style={{ fontFamily: headFont, fontSize: 20, fontWeight: 600, color: themeInk }}>{s.t}</div>
                <div style={{ fontSize: 13, color: themeInk, marginTop: 4, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 11.5, color: themeInkMuted, marginTop: 2 }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Travel — prototype L438-462. */}
      <SectionFrame id="travel" label="Travel" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px`, background: accentBg }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow" style={{ color: themeAccent }}>GETTING THERE</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: '6px 0 0', fontWeight: 600, color: themeInk }}>
              Where to stay
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, maxWidth: 760, marginInline: 'auto' }}>
            {[
              { name: 'Cosmos Suites', sub: '8-min walk · room block code SS27', tone: 'warm' },
              { name: 'Andronis Boutique', sub: '12-min walk · cliffside', tone: 'lavender' },
            ].map((h) => (
              <div key={h.name} style={{ background: themeCard, borderRadius: 12, padding: 14, display: 'flex', gap: 14, border: `1px solid ${themeLineSoft}` }}>
                <div style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <PhotoPlaceholder tone={h.tone as PhotoTone} aspect="1/1" />
                </div>
                <div>
                  <div style={{ fontFamily: headFont, fontSize: 18, fontWeight: 600, color: themeInk }}>{h.name}</div>
                  <div style={{ fontSize: 12.5, color: themeInkMuted, marginTop: 4 }}>{h.sub}</div>
                  <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px', borderRadius: 999, background: themeSection, fontSize: 11.5, fontWeight: 600, color: themeInkSoft }}>
                    Book →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Registry — prototype L465-477. */}
      <SectionFrame id="registry" label="Registry" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px`, textAlign: 'center', background: themePaper }}>
          <div className="eyebrow" style={{ color: themeAccent }}>REGISTRY</div>
          <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 14px', fontWeight: 600, color: themeInk }}>
            Your presence is the gift
          </h2>
          <div style={{ fontSize: 14, color: themeInkSoft, maxWidth: 460, margin: '0 auto 22px' }}>
            If you&apos;d like to celebrate further, we&apos;ve put a few things together.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {['Honeyfund', 'Crate & Barrel', 'Zola'].map((s) => (
              <span key={s} style={{ padding: '12px 22px', borderRadius: 12, background: themeCard, border: `1px solid ${themeLineSoft}`, fontSize: 13, fontWeight: 600, color: themeInk }}>
                {s} ↗
              </span>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Gallery — prototype L481-493. */}
      <SectionFrame id="gallery" label="Gallery" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${36 * padScale}px 32px`, background: themeSection }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow" style={{ color: themeAccent }}>GALLERY</div>
            <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 0', fontWeight: 600, color: themeInk }}>
              A few favorites
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 920, marginInline: 'auto' }}>
            {(['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream', 'warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'] as PhotoTone[]).map((t, i) => (
              <PhotoPlaceholder key={i} tone={t} aspect="1/1" style={{ borderRadius: 8 }} />
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* RSVP — prototype L496-502. Theme defines --t-rsvp + --t-rsvp-ink
          so dark themes (Midnight Velvet) get gold on inky velvet,
          editorial gets pure black on bone, etc. */}
      <SectionFrame id="rsvp" label="RSVP" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${56 * padScale}px 32px`, textAlign: 'center', background: themeRsvp, color: themeRsvpInk }}>
          <div className="eyebrow" style={{ color: themeRsvpInk, opacity: 0.6 }}>RSVP BY APRIL 28</div>
          <h2 style={{ fontFamily: headFont, fontSize: 44, margin: '8px 0 6px', color: themeRsvpInk, fontWeight: 600 }}>
            Save your seat
          </h2>
          <div style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 18 }}>
            It takes about 90 seconds. Pear will follow up if anyone forgets.
          </div>
          <span style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: themeRsvpInk, color: themeRsvp, fontSize: 14, fontWeight: 700 }}>
            Reply now →
          </span>
        </div>
      </SectionFrame>

      {/* FAQ — prototype L506-525. */}
      <SectionFrame id="faq" label="FAQ" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px`, background: themePaper }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow" style={{ color: themeAccent }}>QUESTIONS &amp; ANSWERS</div>
            <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 0', fontWeight: 600, color: themeInk }}>
              The little things
            </h2>
          </div>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              "What's the dress code, really?",
              'Can I bring a plus-one?',
              'Are kids welcome at the ceremony?',
              'Where should I stay in Santorini?',
            ].map((q, i) => (
              <div key={i} style={{ padding: '12px 16px', background: themeCard, border: `1px solid ${themeLineSoft}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5, color: themeInk }}>{q}</span>
                <Icon name="chev-down" size={13} color={themeInkMuted} />
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>
    </div>
  );
}

/* "2027-04-27" / "2027-04-27T..." → "Tuesday, April 27, 2027".
   Pre-formatted strings ("Monday, April 26, 2027") pass through. */
function formatHeroDate(raw: string | undefined): string {
  if (!raw) return '';
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (!iso) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const ACCENT_BG: Record<AccentTone, string> = {
  lavender: 'var(--lavender-bg)',
  peach: 'var(--peach-bg)',
  sage: 'var(--sage-tint)',
  cream: 'var(--cream-2)',
};

/* ─── SectionFrame — prototype L531-579 verbatim. ────────────────── */

function SectionFrame({
  id, label, children, active, hover, setActive, setHover, editable, hideHandle,
}: {
  id: Exclude<SectionId, null>;
  label: string;
  children: ReactNode;
  active: SectionId;
  hover: SectionId;
  setActive: (id: SectionId) => void;
  setHover: (id: SectionId) => void;
  editable: boolean;
  hideHandle?: boolean;
}) {
  const isActive = active === id;
  const isHover = hover === id && !isActive;
  return (
    <div
      onMouseEnter={() => setHover(id)}
      onClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        setActive(id);
      }}
      style={{ position: 'relative', cursor: editable ? 'pointer' : 'default' }}
    >
      {children}
      {editable && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 4,
              borderRadius: 6,
              outline: isActive ? '2px solid var(--lavender-2)' : isHover ? '1.5px dashed var(--lavender-2)' : 'none',
              outlineOffset: -2,
              pointerEvents: 'none',
              transition: 'outline-color var(--pl-dur-fast) var(--pl-ease-emphasis)',
            }}
          />
          {(isActive || isHover) && !hideHandle && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 12,
                padding: '4px 10px',
                borderRadius: 6,
                background: isActive ? 'var(--lavender-2)' : 'rgba(196,181,217,0.85)',
                color: 'var(--ink)',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                zIndex: 2,
                boxShadow: isActive ? '0 4px 12px rgba(61,74,31,0.15)' : 'none',
              }}
            >
              <GripDots />
              {label}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GripDots({ color = 'var(--ink)' }: { color?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 16" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={(i % 2) * 6 + 2} cy={Math.floor(i / 2) * 5 + 3} r="1.2" fill={color} />
      ))}
    </svg>
  );
}

/* ─── PhotoPlaceholder — prototype motifs.jsx L342-380. ─────────── */

type PhotoTone = 'lavender' | 'peach' | 'sage' | 'cream' | 'warm' | 'field' | 'dusk';

const PHOTO_BGS: Record<PhotoTone, string> = {
  lavender: 'linear-gradient(135deg, #D7CCE5, #B7A4D0)',
  peach: 'linear-gradient(135deg, #F7DDC2, #EAB286)',
  sage: 'linear-gradient(135deg, #E3E6C8, #8B9C5A)',
  cream: 'linear-gradient(135deg, #F3E9D4, #E0D3B3)',
  warm: 'linear-gradient(135deg, #F0C9A8, #C4B5D9)',
  field: 'linear-gradient(160deg, #CBD29E 0%, #8B9C5A 55%, #F0C9A8 100%)',
  dusk: 'linear-gradient(200deg, #C4B5D9 0%, #F0C9A8 70%, #CBD29E 100%)',
};

function PhotoPlaceholder({ tone = 'lavender', aspect = '1 / 1', style = {} }: { tone?: PhotoTone; aspect?: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: aspect,
        background: PHOTO_BGS[tone] ?? PHOTO_BGS.lavender,
        ...style,
      }}
    />
  );
}

/* ─── PhotoStrip — 4 large photo cards in a row beneath the hero
   buttons. Matches the handoff themed-site.jsx hero photo grid. */

function PhotoStrip() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        marginTop: 40,
        maxWidth: 940,
        marginInline: 'auto',
      }}
    >
      {(['warm', 'lavender', 'peach', 'sage'] as PhotoTone[]).map((t, i) => (
        <div
          key={i}
          style={{
            aspectRatio: '3 / 4',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
          }}
        >
          <PhotoPlaceholder tone={t} aspect="3/4" />
        </div>
      ))}
    </div>
  );
}
