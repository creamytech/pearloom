'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioCard.tsx
//
// CardFront, CardBack, CardEnvelope — the three views the canvas
// flips between. Each renders at 5×7 (front + back) or A7
// (envelope). Background of the card uses the active palette.
// ─────────────────────────────────────────────────────────────

import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';
import { BrandedQR } from '@/components/pearloom/editor/panels/BrandedQR';
import {
  ClassicLayout, AsymLayout, PhotoLayout, ScriptLayout, MinimalLayout,
  PaperTexture, MotifOverlay, Rule,
} from './StudioLayouts';
import { Pear } from '../motifs';

interface CardProps {
  type: StationeryType;
  view: 'front' | 'back' | 'envelope';
  layout: string;
  motif: string;
  palette: StudioPalette;
  font: StudioFontPair;
  content: StudioContent;
  nameA: string;
  /** Empty on solo occasions — cards render one name, no amp. */
  nameB: string;
  monogram: string;
  /** Solemn occasion (memorial / funeral) — softens the back-card
   *  reply options, sign-offs, and flourishes. */
  solemn?: boolean;
  /** Cover photo URL — used by the photo layout. */
  photoUrl?: string | null;
  /** Site URL for the back of save-the-date / thank-you (RSVP +
   *  share). */
  siteUrl?: string;
  /** RSVP deadline string for the invitation back. */
  rsvpDeadline?: string;
  /** Address rendered in envelope return-address corner. */
  returnAddress?: { name: string; line1?: string; line2?: string };
  /** AI-generated motif URL — overrides the SVG glyph if set. */
  customMotifUrl?: string | null;
  /** Paper texture ([data-pl-texture]) — same grain system the
   *  published site wears, so the suite matches the site. */
  texture?: string | null;
  /** The site's resolved --t-* bag (siteThemeRootStyle) — when
   *  present the card renders inside .pl8-guest with the site's
   *  own vars, so the 'site' palette/font (var() references)
   *  resolve and the grain system matches the published site
   *  exactly (ATELIER-PLAN ST.1). */
  themeRoot?: React.CSSProperties;
  /** The event date for the envelope postmark — the SAME stamp
   *  the site's Sealed Arrival wears, so the envelope you print
   *  and the envelope guests open are one designed object
   *  (ATELIER-PLAN ST.2). No date → no postmark. */
  postmarkDate?: { dayLine: string; year: string } | null;
  /** The site's kit — informs the card frame when the card wears
   *  the site (deco corners / arch / classic hairlines). */
  kitId?: string | null;
  /** Save-the-date back details — derived from manifest.events +
   *  manifest.travelInfo. Each is optional; the card falls back to
   *  an em-dash placeholder when missing. */
  ceremonyAt?: string;
  receptionAt?: string;
  dressCode?: string;
  hotelLine?: string;
}

/** The kit's structural personality, folded onto the card as a
 *  quiet frame — only when the card wears the site (themeRoot).
 *  Deco kits get corner brackets, arch kits an arched crown,
 *  everything else the classic double hairline; minimal kits go
 *  frameless. */
function KitFrame({ kitId, accent }: { kitId?: string | null; accent: string }) {
  const kit = kitId ?? 'classic';
  if (kit === 'minimal') return null;
  if (kit === 'deco' || kit === 'gilt' || kit === 'plate') {
    const L = 26;
    const corner = (r: number, x: string, y: string) => (
      <svg key={`${x}${y}`} viewBox="0 0 30 30" width={L} height={L} style={{ position: 'absolute', [x]: 14, [y]: 14, transform: `rotate(${r}deg)`, opacity: 0.55 }}>
        <path d="M 2 28 L 2 2 L 28 2" fill="none" stroke={accent} strokeWidth="1.6" />
        <path d="M 7 28 L 7 7 L 28 7" fill="none" stroke={accent} strokeWidth="0.8" />
      </svg>
    );
    return <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>{[corner(0, 'left', 'top'), corner(90, 'right', 'top'), corner(270, 'left', 'bottom'), corner(180, 'right', 'bottom')]}</div>;
  }
  if (kit === 'arch') {
    return (
      <svg aria-hidden viewBox="0 0 420 588" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', width: '100%', height: '100%', opacity: 0.5 }}>
        <path d="M 24 564 L 24 190 Q 24 40 210 40 Q 396 40 396 190 L 396 564 Z" fill="none" stroke={accent} strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 14, zIndex: 1, pointerEvents: 'none', border: `1px solid ${accent}`, opacity: 0.4 }}>
      <div style={{ position: 'absolute', inset: 4, border: `0.5px solid ${accent}`, opacity: 0.7 }} />
    </div>
  );
}

/** Handwritten passages wear the site's own script face when the
 *  card wears the site ('site' font pair); preset pairs keep the
 *  Studio's Caveat. */
function scriptFont(font: StudioFontPair): string {
  return font.id === 'site' ? 'var(--t-script, "Caveat", cursive)' : "'Caveat', cursive";
}

export function CardFront(props: CardProps) {
  const { palette, font, content, layout, motif, type, nameA, nameB, photoUrl, monogram, customMotifUrl, texture, themeRoot } = props;
  const w = 420, h = 588;
  const isDark = palette.id === 'twilight';
  return (
    <div
      className={texture || themeRoot ? 'pl-studio-card-shadow pl8-guest' : 'pl-studio-card-shadow'}
      data-pl-texture={texture ?? undefined}
      style={{
      ...(themeRoot ?? {}),
      ...(texture ? { ['--pl-texture-intensity' as string]: '1' } : {}),
      width: w, height: h,
      background: palette.paper,
      color: palette.ink,
      borderRadius: 6,
      padding: 36,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {!isDark && <PaperTexture />}
      {themeRoot && <KitFrame kitId={props.kitId} accent={palette.accent} />}

      {layout === 'classic' && <ClassicLayout {...props} />}
      {layout === 'asym' && <AsymLayout {...props} />}
      {layout === 'photo' && <PhotoLayout {...props} photoUrl={photoUrl} />}
      {layout === 'script' && <ScriptLayout {...props} />}
      {layout === 'minimal' && <MinimalLayout {...props} />}

      <MotifOverlay
        motif={motif}
        palette={palette}
        stampText={content.stamp}
        monogram={monogram}
        customUrl={customMotifUrl}
      />
      {/* Used to silence the unused warning when Card-only props
          aren't read by every layout. */}
      <span style={{ display: 'none' }}>{font.name}{type}{nameA}{nameB}</span>
    </div>
  );
}

export function CardBack(props: CardProps) {
  const {
    palette, font, type, monogram, siteUrl, rsvpDeadline, nameA, nameB,
    ceremonyAt, receptionAt, dressCode, hotelLine, texture, solemn, themeRoot,
  } = props;
  const w = 420, h = 588;
  const script = scriptFont(font);
  return (
    <div
      className={texture || themeRoot ? 'pl-studio-card-shadow pl8-guest' : 'pl-studio-card-shadow'}
      data-pl-texture={texture ?? undefined}
      style={{
      ...(themeRoot ?? {}),
      ...(texture ? { ['--pl-texture-intensity' as string]: '1' } : {}),
      width: w, height: h,
      background: palette.paper,
      color: palette.ink,
      borderRadius: 6,
      padding: 32,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <PaperTexture />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 22, color: palette.accent, fontWeight: 600 }}>{monogram}</div>
          <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: palette.ink, opacity: 0.6, fontWeight: 600 }}>
            {type === 'invite' ? 'Reply card' : type === 'std' ? 'The details' : 'A note'}
          </div>
        </div>

        <Rule color={palette.accent} width="100%" />
        <div style={{ height: 8 }} />

        {type === 'invite' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="The favour of a reply by" value={rsvpDeadline ?? '—'} font={font} palette={palette} />
            <Field label="Name(s)" value="" font={font} palette={palette} />
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 6 }}>Will attend</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {(solemn ? ['Will attend', 'Unable to attend'] : ['Joyfully accepts', 'Regretfully declines']).map(opt => (
                  <div key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font.display, fontSize: 13, color: palette.ink }}>
                    <div style={{ width: 14, height: 14, border: `1.5px solid ${palette.accent}`, borderRadius: 3 }} />
                    {opt}
                  </div>
                ))}
              </div>
            </div>
            <Field label="Meal preference" value="" font={font} palette={palette} sub="Beef · Fish · Vegetarian · Vegan" />
            {solemn
              ? <Field label="A memory to share, if you wish" value="" font={font} palette={palette} />
              : <Field label="Song that’d get you on the floor" value="" font={font} palette={palette} />}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
                {siteUrl ? `Or RSVP at ${siteUrl}` : 'RSVP on the site'}
              </div>
              {siteUrl && (
                <div style={{ width: 52, height: 52, background: '#fff', display: 'grid', placeItems: 'center', borderRadius: 4, padding: 3, flexShrink: 0 }}>
                  <BrandedQR value={`https://${siteUrl}`} size={44} dark={palette.ink} light="#ffffff" />
                </div>
              )}
            </div>
          </div>
        )}

        {type === 'std' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Ceremony / Reception rows only when the manifest has
                those events — a birthday or reunion back-card should
                not print wedding-shaped rows with em-dashes. */}
            {ceremonyAt && <DetailRow label="Ceremony" value={ceremonyAt} font={font} palette={palette} />}
            {receptionAt && <DetailRow label="Reception" value={receptionAt} font={font} palette={palette} />}
            {!ceremonyAt && !receptionAt && (
              <DetailRow label="Schedule" value="Details to follow" font={font} palette={palette} />
            )}
            <DetailRow label="Dress code" value={dressCode ?? 'Details to follow'} font={font} palette={palette} />
            <DetailRow label="Stay nearby" value={hotelLine ?? 'Hotel block details to follow'} font={font} palette={palette} />
            <DetailRow label="Live updates" value={siteUrl ?? 'pearloom.com'} font={font} palette={palette} />
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: script, fontSize: 22, color: palette.accent }}>
                {solemn ? 'with love' : 'we can’t wait'}
              </div>
              <div style={{ width: 60, height: 60, background: '#fff', display: 'grid', placeItems: 'center', borderRadius: 4, padding: 4 }}>
                {/* Real QR — encodes the live site so a printed card
                    actually scans. Decorative glyph only when the
                    site has no address yet. */}
                {siteUrl
                  ? <BrandedQR value={`https://${siteUrl}`} size={52} dark={palette.ink} light="#ffffff" />
                  : <QRGlyph color={palette.ink} />}
              </div>
            </div>
          </div>
        )}

        {type === 'thanks' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: script, fontSize: 22, color: palette.ink, lineHeight: 1.4 }}>
              Dear [Guest first name],
            </div>
            <div style={{ fontFamily: script, fontSize: 22, color: palette.ink, opacity: 0.85, lineHeight: 1.45 }}>
              {solemn
                ? 'Thank you for [being there / your kind words]. Your presence meant more than we can say, and we keep coming back to it. With heartfelt thanks, '
                : 'Thank you for the [gift], and even more for being there. Every photo on the wall has you in it somewhere, and we keep coming back to that. With all our love, '}
            </div>
            <div style={{ fontFamily: script, fontSize: 28, color: palette.accent, marginTop: 4 }}>
              {solemn ? `the family of ${nameA}` : nameB ? `${nameA} & ${nameB}` : nameA}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
                {siteUrl ? `Photos at ${siteUrl}` : 'Photos on the site'}
              </div>
              <div style={{ width: 56, height: 56, background: '#fff', display: 'grid', placeItems: 'center', borderRadius: 4, padding: 3 }}>
                {siteUrl
                  ? <BrandedQR value={`https://${siteUrl}`} size={48} dark={palette.ink} light="#ffffff" />
                  : <QRGlyph color={palette.ink} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, sub, font, palette }: { label: string; value: string; sub?: string; font: StudioFontPair; palette: StudioPalette }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ borderBottom: `1px solid ${palette.ink}33`, paddingBottom: 6, fontFamily: font.display, fontSize: 14, color: palette.ink, minHeight: 22 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: palette.ink, opacity: 0.55, marginTop: 4, letterSpacing: '0.04em' }}>{sub}</div>}
    </div>
  );
}

function DetailRow({ label, value, font, palette }: { label: string; value: string; font: StudioFontPair; palette: StudioPalette }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, paddingBottom: 8, borderBottom: `1px dotted ${palette.ink}33` }}>
      <div style={{ width: 84, fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: palette.ink, opacity: 0.6, fontWeight: 600, flexShrink: 0 }}>{label}</div>
      <div style={{ fontFamily: font.display, fontSize: 14, color: palette.ink, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function QRGlyph({ color = '#3D4A1F' }: { color?: string }) {
  return (
    <svg viewBox="0 0 50 50" width="100%" height="100%">
      {Array.from({ length: 100 }).map((_, i) => {
        const x = (i % 10) * 5, y = Math.floor(i / 10) * 5;
        const fill = ((i * 31 + Math.floor(i / 7) * 13) % 7) < 3;
        return fill ? <rect key={i} x={x} y={y} width="4" height="4" fill={color} /> : null;
      })}
      <rect x="0" y="0" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" />
      <rect x="36" y="0" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" />
      <rect x="0" y="36" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function CardEnvelope(props: CardProps) {
  const { palette, font, motif, monogram, returnAddress, nameA, nameB, themeRoot, postmarkDate, siteUrl } = props;
  const w = 540, h = 380;
  const ret = returnAddress ?? { name: nameB ? `${nameA} & ${nameB}` : nameA, line1: '', line2: '' };
  const script = scriptFont(font);
  return (
    <div
      style={{ ...(themeRoot ?? {}), width: w, height: h, position: 'relative' }}
      className={themeRoot ? 'pl-studio-card-shadow pl8-guest' : 'pl-studio-card-shadow'}
    >
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <rect width={w} height={h} fill={palette.accent2} rx="6" />
        <path d={`M0 0 L ${w / 2} ${h * 0.42} L ${w} 0 Z`} fill={palette.accent} opacity="0.25" />
        <path d={`M0 0 L ${w / 2} ${h * 0.42} L ${w} 0`} stroke={palette.ink} strokeWidth="0.5" fill="none" opacity="0.3" />
      </svg>

      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -40%)',
        width: '60%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4,
        zIndex: 2,
      }}>
        <div style={{ fontFamily: script, fontSize: 22, color: palette.ink, opacity: 0.85 }}>
          [Guest first name] [Guest last name]
        </div>
        <div style={{ fontFamily: script, fontSize: 18, color: palette.ink, opacity: 0.7 }}>
          [Guest street]
        </div>
        <div style={{ fontFamily: script, fontSize: 18, color: palette.ink, opacity: 0.7 }}>
          [City, State ZIP]
        </div>
      </div>

      <div style={{ position: 'absolute', top: 14, left: 18, fontSize: 9, color: palette.ink, opacity: 0.65, lineHeight: 1.4, fontFamily: font.ui, letterSpacing: '0.04em' }}>
        <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 11 }}>{ret.name}</div>
        {ret.line1 && <div>{ret.line1}</div>}
        {ret.line2 && <div>{ret.line2}</div>}
      </div>

      <div style={{ position: 'absolute', top: 14, right: 14, transform: 'rotate(4deg)' }}>
        <PostageStamp palette={palette} />
      </div>

      {motif !== 'none' && (
        /* The seal medallion — the SAME object the site's Sealed
           Arrival presses (paper face, hairline ring, display-italic
           initials), so what you print is what they open. */
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%) rotate(-4deg)' }}>
          <svg viewBox="0 0 80 80" width={58} height={58}>
            <circle cx="40" cy="40" r="34" fill={palette.paper} />
            <circle cx="40" cy="40" r="34" fill="none" stroke={palette.accent} strokeWidth="1.4" />
            <circle cx="40" cy="40" r="28" fill="none" stroke={palette.accent} strokeWidth="0.6" opacity="0.55" />
            <text x="40" y="47" textAnchor="middle" fontSize="19" fontFamily={font.display} fill={palette.accent} fontStyle="italic" fontWeight="600">{monogram}</text>
          </svg>
        </div>
      )}

      {/* The postmark — the event date, the same stamp the site's
          Sealed Arrival envelope wears. No date → wavy cancel
          lines only. */}
      <svg viewBox="0 0 200 60" width={140} height={42} style={{ position: 'absolute', top: 30, right: 92, opacity: 0.45, transform: 'rotate(3deg)' }}>
        <circle cx="30" cy="30" r="24" fill="none" stroke={palette.ink} strokeWidth="1.2" />
        <circle cx="30" cy="30" r="20" fill="none" stroke={palette.ink} strokeWidth="0.5" opacity="0.6" />
        {postmarkDate ? (
          <>
            <text x="30" y="22" textAnchor="middle" fontSize="4.6" fontFamily="Inter" fontWeight="700" letterSpacing="0.8" fill={palette.ink}>PEARLOOM POST</text>
            <text x="30" y="32" textAnchor="middle" fontSize="7.5" fontFamily="Inter" fontWeight="700" letterSpacing="0.6" fill={palette.ink}>{postmarkDate.dayLine}</text>
            <text x="30" y="41" textAnchor="middle" fontSize="5.5" fontFamily="Inter" fontWeight="600" letterSpacing="1.2" fill={palette.ink}>{postmarkDate.year}</text>
          </>
        ) : (
          <text x="30" y="33" textAnchor="middle" fontSize="6" fontFamily="Inter" fontWeight="700" fill={palette.ink}>PEARLOOM</text>
        )}
        <path d="M 58 22 Q 90 18, 122 22 T 182 22" fill="none" stroke={palette.ink} strokeWidth="1" />
        <path d="M 58 30 Q 90 26, 122 30 T 182 30" fill="none" stroke={palette.ink} strokeWidth="1" />
        <path d="M 58 38 Q 90 34, 122 38 T 182 38" fill="none" stroke={palette.ink} strokeWidth="1" />
      </svg>

      {/* The site, scannable from the envelope itself. */}
      {siteUrl && (
        <div style={{ position: 'absolute', bottom: 14, right: 14, width: 44, height: 44, background: '#fff', display: 'grid', placeItems: 'center', borderRadius: 3, padding: 2, opacity: 0.92 }}>
          <BrandedQR value={`https://${siteUrl}`} size={38} dark={palette.ink} light="#ffffff" />
        </div>
      )}
    </div>
  );
}

function PostageStamp({ palette }: { palette: StudioPalette }) {
  return (
    <div style={{
      width: 70, height: 84,
      background: palette.paper, padding: 4,
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      backgroundImage: `radial-gradient(circle at 0 50%, transparent 3px, ${palette.paper} 3px), radial-gradient(circle at 100% 50%, transparent 3px, ${palette.paper} 3px), radial-gradient(circle at 50% 0, transparent 3px, ${palette.paper} 3px), radial-gradient(circle at 50% 100%, transparent 3px, ${palette.paper} 3px)`,
      backgroundSize: '8px 100%, 8px 100%, 100% 8px, 100% 8px',
      backgroundRepeat: 'repeat-y, repeat-y, repeat-x, repeat-x',
      backgroundPosition: 'left, right, top, bottom',
    }}>
      <div style={{ width: '100%', height: '100%', background: palette.accent, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4, gap: 2 }}>
        <Pear size={26} tone="ink" shadow={false} />
        <div style={{ fontSize: 7, color: palette.ink, fontWeight: 700, letterSpacing: '0.08em' }}>FOREVER</div>
        <div style={{ fontSize: 6, color: palette.ink, opacity: 0.7, fontFamily: "'Fraunces', serif", fontStyle: 'italic' }}>Pearloom</div>
      </div>
    </div>
  );
}
