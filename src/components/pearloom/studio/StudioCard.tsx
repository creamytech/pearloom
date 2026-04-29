'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioCard.tsx
//
// CardFront, CardBack, CardEnvelope — the three views the canvas
// flips between. Each renders at 5×7 (front + back) or A7
// (envelope). Background of the card uses the active palette.
// ─────────────────────────────────────────────────────────────

import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';
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
  nameB: string;
  monogram: string;
  /** Couple photo URL — used by the photo layout. */
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
}

export function CardFront(props: CardProps) {
  const { palette, font, content, layout, motif, type, nameA, nameB, photoUrl, monogram, customMotifUrl } = props;
  const w = 420, h = 588;
  const isDark = palette.id === 'twilight';
  return (
    <div className="pl-studio-card-shadow" style={{
      width: w, height: h,
      background: palette.paper,
      color: palette.ink,
      borderRadius: 6,
      padding: 36,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {!isDark && <PaperTexture />}

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
  const { palette, font, type, monogram, siteUrl, rsvpDeadline, nameA, nameB } = props;
  const w = 420, h = 588;
  return (
    <div className="pl-studio-card-shadow" style={{
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
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 22, color: palette.accent, fontWeight: 600 }}>{monogram}</div>
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
                {['Joyfully accepts', 'Regretfully declines'].map(opt => (
                  <div key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font.display, fontSize: 13, color: palette.ink }}>
                    <div style={{ width: 14, height: 14, border: `1.5px solid ${palette.accent}`, borderRadius: 3 }} />
                    {opt}
                  </div>
                ))}
              </div>
            </div>
            <Field label="Meal preference" value="" font={font} palette={palette} sub="Beef · Fish · Vegetarian · Vegan" />
            <Field label="Song that’d get you on the floor" value="" font={font} palette={palette} />
            <div style={{ marginTop: 'auto', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
              {siteUrl ? `Or RSVP at ${siteUrl}` : 'RSVP via the QR on your envelope'}
            </div>
          </div>
        )}

        {type === 'std' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <DetailRow label="Ceremony" value="—" font={font} palette={palette} />
            <DetailRow label="Reception" value="—" font={font} palette={palette} />
            <DetailRow label="Dress code" value="Garden formal" font={font} palette={palette} />
            <DetailRow label="Stay nearby" value="Hotel block details to follow" font={font} palette={palette} />
            <DetailRow label="Live updates" value={siteUrl ?? 'pearloom.com'} font={font} palette={palette} />
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: palette.accent }}>
                we can’t wait
              </div>
              <div style={{ width: 60, height: 60, background: '#fff', display: 'grid', placeItems: 'center', borderRadius: 4, padding: 4 }}>
                <QRGlyph color={palette.ink} />
              </div>
            </div>
          </div>
        )}

        {type === 'thanks' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: palette.ink, lineHeight: 1.4 }}>
              Dear [Guest first name],
            </div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: palette.ink, opacity: 0.85, lineHeight: 1.45 }}>
              Thank you for the [gift], and even more for being there. Every photo on the wall has you in it somewhere, and we keep coming back to that. With all our love —
            </div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 28, color: palette.accent, marginTop: 4 }}>
              {nameA} & {nameB}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
                {siteUrl ? `Photos at ${siteUrl}` : 'Photos on the site'}
              </div>
              <div style={{ width: 56, height: 56, background: '#fff', display: 'grid', placeItems: 'center', borderRadius: 4, padding: 3 }}>
                <QRGlyph color={palette.ink} />
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
  const { palette, font, motif, monogram, returnAddress, nameA, nameB } = props;
  const w = 540, h = 380;
  const ret = returnAddress ?? { name: `${nameA} & ${nameB}`, line1: '', line2: '' };
  return (
    <div style={{ width: w, height: h, position: 'relative' }} className="pl-studio-card-shadow">
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
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: palette.ink, opacity: 0.85 }}>
          [Guest first name] [Guest last name]
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: palette.ink, opacity: 0.7 }}>
          [Guest street]
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: palette.ink, opacity: 0.7 }}>
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
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%) rotate(-6deg)' }}>
          <svg viewBox="0 0 80 80" width={56} height={56}>
            <circle cx="40" cy="40" r="32" fill="#C97A6E" />
            <circle cx="40" cy="40" r="32" fill="url(#waxE)" opacity="0.45" />
            <text x="40" y="48" textAnchor="middle" fontSize="20" fontFamily="Fraunces" fill="rgba(255,255,255,0.75)" fontStyle="italic" fontWeight="700">{monogram}</text>
            <defs><radialGradient id="waxE" cx="35%" cy="35%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#000" /></radialGradient></defs>
          </svg>
        </div>
      )}

      <svg viewBox="0 0 200 60" width={140} height={42} style={{ position: 'absolute', top: 30, right: 92, opacity: 0.35 }}>
        <circle cx="30" cy="30" r="22" fill="none" stroke={palette.ink} strokeWidth="1.2" />
        <text x="30" y="28" textAnchor="middle" fontSize="6" fontFamily="Inter" fontWeight="700" fill={palette.ink}>POSTMARK</text>
        <text x="30" y="36" textAnchor="middle" fontSize="6" fontFamily="Inter" fontWeight="700" fill={palette.ink}>STAMPED</text>
        <line x1="55" y1="22" x2="180" y2="22" stroke={palette.ink} strokeWidth="1.1" />
        <line x1="55" y1="30" x2="180" y2="30" stroke={palette.ink} strokeWidth="1.1" />
        <line x1="55" y1="38" x2="180" y2="38" stroke={palette.ink} strokeWidth="1.1" />
      </svg>
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
