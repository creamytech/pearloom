'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioLayouts.tsx
//
// Five front-of-card layouts plus the motif overlay. Each takes
// the resolved palette + font pair + content (eyebrow, headline,
// body lines, cta) and renders a 5×7 (420×588) card.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';
import { Stamp } from '../motifs';

/** The copy fields a host can edit straight on the canvas (SV.4).
 *  headline + line3 stay locked to the manifest. */
export type EditableCopyField = 'eyebrow' | 'line2' | 'line4' | 'cta' | 'scriptBody';

interface LayoutProps {
  content: StudioContent;
  palette: StudioPalette;
  font: StudioFontPair;
  type: StationeryType;
  nameA: string;
  /** Empty on solo occasions — layouts render one name, no amp. */
  nameB: string;
  amp?: string;
  /** Cover photo URL — used by the photo layout. Falls back to
   *  a tonal placeholder when not set. */
  photoUrl?: string | null;
  /** Present on the live canvas only — click-to-edit writes into
   *  the per-type copyOverrides slice (SV.4). Press sheet + send
   *  previews render read-only. */
  onEditCopy?: (field: EditableCopyField, value: string) => void;
  /** Names size multiplier (SV.4) — 0.85 / 1 / 1.18. */
  headlineScale?: number;
}

const AMP_DEFAULT = 'and';

/** Click-to-edit text on the canvas (SV.4). Uncontrolled while
 *  focused; commits on blur into copyOverrides. Clearing the text
 *  restores the built-in copy (the merge treats '' as unset), so
 *  an element can never silently vanish from an inline edit —
 *  hiding is the rail's explicit toggle. */
export function Editable({ field, value, onEdit }: {
  field: EditableCopyField;
  value: string;
  onEdit?: (field: EditableCopyField, value: string) => void;
}) {
  if (!onEdit) return <>{value}</>;
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label="Edit this line"
      className="pl-studio-editable"
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? '').trim();
        if (next !== value) onEdit(field, next);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.currentTarget.textContent = value; e.currentTarget.blur(); }
      }}
      style={{ outline: 'none', cursor: 'text', borderRadius: 2 }}
    >
      {value}
    </span>
  );
}

export function ClassicLayout({ content, palette, font, type, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {content.eyebrow && (
          <>
            <Rule color={palette.accent} width={48} />
            <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, color: palette.ink, opacity: 0.7 }}>
              <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
            </div>
            <Rule color={palette.accent} width={48} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal',
          fontWeight: font.weight, fontSize: Math.round(56 * headlineScale), lineHeight: 0.95, letterSpacing: '-0.02em',
          color: palette.ink,
        }}>
          {nameA}
          {nameB && (
            <>
              <div style={{ fontSize: Math.round(36 * headlineScale), fontStyle: 'italic', color: palette.accent, fontWeight: 400, margin: '4px 0', letterSpacing: '0.04em' }}>{amp}</div>
              {nameB}
            </>
          )}
        </div>
        {content.line2 && (
          <div style={{ fontFamily: font.ui, fontSize: 13, color: palette.ink, opacity: 0.85, marginTop: 6, fontStyle: type === 'thanks' ? 'italic' : 'normal' }}>
            <Editable field="line2" value={content.line2} onEdit={onEditCopy} />
          </div>
        )}
        <Rule color={palette.accent} width={120} />
        <div style={{ fontFamily: font.display, fontSize: 16, color: palette.ink, letterSpacing: '0.02em', fontWeight: 500 }}>
          {content.line3}
        </div>
        {content.line4 && (
          <div style={{ fontFamily: font.ui, fontSize: 11.5, color: palette.ink, opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
            <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
        {content.cta && <Editable field="cta" value={content.cta} onEdit={onEditCopy} />}
      </div>
    </div>
  );
}

export function AsymLayout({ content, palette, font, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', zIndex: 2 }}>
      {content.eyebrow && (
        <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: palette.ink, opacity: 0.7, fontWeight: 600 }}>
          <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, right: 0, fontSize: 10, color: palette.ink, opacity: 0.6, fontFamily: font.display, fontStyle: 'italic' }}>
        no. 01
      </div>

      <div style={{ position: 'absolute', top: '32%', left: 0, transform: 'translateY(-50%)' }}>
        <div style={{
          fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal',
          fontWeight: font.weight, fontSize: Math.round(70 * headlineScale), lineHeight: 0.92, letterSpacing: '-0.03em', color: palette.ink,
        }}>
          {nameA}
          {nameB && (
            <>
              <br />
              <span style={{ fontStyle: 'italic', color: palette.accent, fontWeight: 400, fontSize: Math.round(56 * headlineScale) }}>{amp}</span><br />
              {nameB}
            </>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Rule color={palette.accent} width="100%" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>The day</div>
            <div style={{ fontFamily: font.display, fontSize: 16, color: palette.ink, fontWeight: 500 }}>{content.line3}</div>
          </div>
          {content.line4 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>The place</div>
              <div style={{ fontFamily: font.display, fontSize: 16, color: palette.ink, fontWeight: 500 }}>
                <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PhotoLayout({ content, palette, font, photoUrl, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  const photoBg = photoUrl
    ? `center/cover no-repeat url("${photoUrl}")`
    : `linear-gradient(135deg, ${palette.accent}, ${palette.accent2})`;
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', zIndex: 2, gap: 16, margin: -36, padding: 0 }}>
      <div style={{ height: '62%', background: photoBg }} />
      <div style={{ padding: '0 36px 36px', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', flex: 1 }}>
        {content.eyebrow && <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: palette.ink, opacity: 0.65, fontWeight: 600, marginBottom: 4 }}><Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} /></div>}
        <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(40 * headlineScale), lineHeight: 1, color: palette.ink, letterSpacing: '-0.02em' }}>
          {nameA}{nameB && <> <span style={{ fontStyle: 'italic', color: palette.accent, fontSize: Math.round(30 * headlineScale) }}>{amp}</span> {nameB}</>}
        </div>
        <div style={{ fontFamily: font.display, fontSize: 13, color: palette.ink, fontWeight: 500, marginTop: 8 }}>{content.line3}</div>
        {content.line4 && <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.ink, opacity: 0.6, fontWeight: 600 }}><Editable field="line4" value={content.line4} onEdit={onEditCopy} /></div>}
      </div>
    </div>
  );
}

export function ScriptLayout({ content, palette, font, nameA, nameB, onEditCopy }: LayoutProps) {
  const script = font.id === 'site' ? 'var(--t-script, "Caveat", cursive)' : "'Caveat', cursive";
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, zIndex: 2 }}>
      <div style={{ fontFamily: script, fontSize: 32, color: palette.ink, lineHeight: 1.15 }}>
        Dearest friend,
      </div>
      <div style={{ fontFamily: script, fontSize: 24, color: palette.ink, opacity: 0.85, lineHeight: 1.3 }}>
        <Editable field="scriptBody" value={content.scriptBody} onEdit={onEditCopy} />
      </div>
      <div style={{ marginTop: 14, fontFamily: script, fontSize: 28, color: palette.accent }}>
        , {nameB ? `${nameA} & ${nameB}` : nameA}
      </div>
      <div style={{ marginTop: 'auto', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
        {content.line3}
      </div>
    </div>
  );
}

export function MinimalLayout({ content, palette, font, nameA, nameB, headlineScale = 1 }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 2, gap: 18 }}>
      <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(48 * headlineScale), lineHeight: 1, color: palette.ink, letterSpacing: '-0.02em' }}>
        {nameA}{nameB && <> <span style={{ color: palette.accent }}>&</span> {nameB}</>}
      </div>
      <Rule color={palette.accent} width={80} />
      <div style={{ fontSize: 11.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: palette.ink, opacity: 0.7, fontWeight: 600 }}>
        {content.line3}
      </div>
    </div>
  );
}


/* ── SV.5 layouts (STUDIO-PLAN, 2026-07-09) ──────────────────── */

/** Crest — the site's crest hero, miniaturized: monogram in a
 *  double hairline ring, quiet centered type. The solemn
 *  recommendation (memorial / funeral). */
export function CrestLayout({ content, palette, font, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1, monogram }: LayoutProps & { monogram?: string }) {
  const mono = monogram ?? `${(nameA[0] ?? '').toUpperCase()}${nameB ? `&${(nameB[0] ?? '').toUpperCase()}` : ''}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', textAlign: 'center', position: 'relative', zIndex: 2, paddingTop: 6 }}>
      <svg viewBox="0 0 90 90" width={82} height={82} aria-hidden>
        <circle cx="45" cy="45" r="42" fill="none" stroke={palette.accent} strokeWidth="1.2" />
        <circle cx="45" cy="45" r="35.5" fill="none" stroke={palette.accent} strokeWidth="0.6" opacity="0.7" />
        <text x="45" y="54" textAnchor="middle" fontSize="24" fontFamily={font.display} fill={palette.accent} fontStyle="italic" fontWeight="600">{mono}</text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {content.eyebrow && (
          <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, color: palette.ink, opacity: 0.65 }}>
            <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
          </div>
        )}
        <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(44 * headlineScale), lineHeight: 1.05, letterSpacing: '-0.01em', color: palette.ink }}>
          {nameA}{nameB && <> <span style={{ fontStyle: 'italic', color: palette.accent, fontWeight: 400 }}>{amp}</span> {nameB}</>}
        </div>
        {content.line2 && (
          <div style={{ fontFamily: font.ui, fontSize: 12.5, color: palette.ink, opacity: 0.8 }}>
            <Editable field="line2" value={content.line2} onEdit={onEditCopy} />
          </div>
        )}
        <Rule color={palette.accent} width={64} />
        <div style={{ fontFamily: font.display, fontSize: 15, color: palette.ink, fontWeight: 500 }}>{content.line3}</div>
        {content.line4 && (
          <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.65, fontWeight: 600 }}>
            <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
        {content.cta && <Editable field="cta" value={content.cta} onEdit={onEditCopy} />}
      </div>
    </div>
  );
}

/** Split — two columns on a center hairline: the names hold the
 *  left page, the day holds the right. Reads like a spread. */
export function SplitLayout({ content, palette, font, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
        {content.eyebrow && (
          <div style={{ fontSize: 8.5, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 600, color: palette.ink, opacity: 0.65 }}>
            <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
          </div>
        )}
        <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(40 * headlineScale), lineHeight: 1, letterSpacing: '-0.02em', color: palette.ink }}>
          {nameA}
          {nameB && (
            <>
              <div style={{ fontSize: Math.round(26 * headlineScale), fontStyle: 'italic', color: palette.accent, fontWeight: 400, margin: '2px 0' }}>{amp}</div>
              {nameB}
            </>
          )}
        </div>
      </div>
      <div style={{ background: palette.accent, opacity: 0.45 }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <div>
          <div style={{ fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>The day</div>
          <div style={{ fontFamily: font.display, fontSize: 15, color: palette.ink, fontWeight: 500, lineHeight: 1.3 }}>{content.line3}</div>
        </div>
        {content.line4 && (
          <div>
            <div style={{ fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>The place</div>
            <div style={{ fontFamily: font.display, fontSize: 15, color: palette.ink, fontWeight: 500, lineHeight: 1.3 }}>
              <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
            </div>
          </div>
        )}
        {content.cta && (
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, lineHeight: 1.6 }}>
            <Editable field="cta" value={content.cta} onEdit={onEditCopy} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Border — a full hairline frame with the eyebrow set INTO the
 *  top rule, everything centered inside. Formal stationery. */
export function FrameLayout({ content, palette, font, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', zIndex: 2 }}>
      <div style={{ position: 'absolute', inset: 6, border: `1px solid ${palette.accent}`, opacity: 0.55 }} />
      {content.eyebrow && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -44%)', background: palette.paper, padding: '2px 12px', fontSize: 8.5, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600, color: palette.ink, opacity: 0.8, whiteSpace: 'nowrap' }}>
          <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
        </div>
      )}
      <div style={{ position: 'absolute', inset: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
        <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(46 * headlineScale), lineHeight: 1, letterSpacing: '-0.01em', color: palette.ink }}>
          {nameA}
          {nameB && (
            <>
              <div style={{ fontSize: Math.round(30 * headlineScale), fontStyle: 'italic', color: palette.accent, fontWeight: 400, margin: '4px 0' }}>{amp}</div>
              {nameB}
            </>
          )}
        </div>
        {content.line2 && (
          <div style={{ fontFamily: font.ui, fontSize: 12.5, color: palette.ink, opacity: 0.8 }}>
            <Editable field="line2" value={content.line2} onEdit={onEditCopy} />
          </div>
        )}
        <Rule color={palette.accent} width={72} />
        <div style={{ fontFamily: font.display, fontSize: 15, color: palette.ink, fontWeight: 500 }}>{content.line3}</div>
        {content.line4 && (
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.65, fontWeight: 600 }}>
            <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
          </div>
        )}
      </div>
      {content.cta && (
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translate(-50%, 40%)', background: palette.paper, padding: '2px 12px', fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.ink, opacity: 0.7, fontWeight: 600, whiteSpace: 'nowrap' }}>
          <Editable field="cta" value={content.cta} onEdit={onEditCopy} />
        </div>
      )}
    </div>
  );
}

/** Full photo — the photograph IS the card; type settles onto a
 *  quiet ink scrim at the foot. Falls back to an accent wash
 *  when the site has no cover photo yet. */
export function FullPhotoLayout({ content, palette, font, photoUrl, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  const photoBg = photoUrl
    ? `center/cover no-repeat url("${photoUrl}")`
    : `linear-gradient(160deg, ${palette.accent}, ${palette.accent2})`;
  return (
    <div style={{ position: 'relative', height: '100%', zIndex: 2, margin: -36 }}>
      <div style={{ position: 'absolute', inset: 0, background: photoBg }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,13,11,0) 42%, rgba(14,13,11,0.62) 100%)' }} />
      <div style={{ position: 'absolute', left: 28, right: 28, bottom: 26, display: 'flex', flexDirection: 'column', gap: 6, color: '#FBF7EE' }}>
        {content.eyebrow && (
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.85 }}>
            <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
          </div>
        )}
        <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(42 * headlineScale), lineHeight: 1, letterSpacing: '-0.02em' }}>
          {nameA}{nameB && <> <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{amp}</span> {nameB}</>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 2 }}>
          <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 500 }}>{content.line3}</div>
          {content.line4 && (
            <div style={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85, fontWeight: 600 }}>
              <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ticket — a stub on the left behind a perforation line, the
 *  card proper on the right. The playful recommendation. */
export function TicketLayout({ content, palette, font, nameA, nameB, amp = AMP_DEFAULT, onEditCopy, headlineScale = 1 }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', zIndex: 2, display: 'grid', gridTemplateColumns: '64px 1fr', margin: -36 }}>
      <div style={{ borderRight: `1.5px dashed ${palette.accent}`, background: palette.accent2, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9 }}>
        <div style={{ transform: 'rotate(180deg)', writingMode: 'vertical-rl' as const, fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', fontWeight: 700, color: palette.ink, opacity: 0.75, whiteSpace: 'nowrap' }}>
          {content.stamp} · {content.line3}
        </div>
      </div>
      <div style={{ padding: '34px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {content.eyebrow ? (
            <div style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, color: palette.ink, opacity: 0.7 }}>
              <Editable field="eyebrow" value={content.eyebrow} onEdit={onEditCopy} />
            </div>
          ) : <span />}
          <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono, ui-monospace, monospace)', color: palette.ink, opacity: 0.55, letterSpacing: '0.1em' }}>№ 001</div>
        </div>
        <div>
          <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: Math.round(48 * headlineScale), lineHeight: 0.98, letterSpacing: '-0.02em', color: palette.ink }}>
            {nameA}
            {nameB && (
              <>
                <div style={{ fontSize: Math.round(30 * headlineScale), fontStyle: 'italic', color: palette.accent, fontWeight: 400, margin: '2px 0' }}>{amp}</div>
                {nameB}
              </>
            )}
          </div>
          {content.line2 && (
            <div style={{ fontFamily: font.ui, fontSize: 12, color: palette.ink, opacity: 0.8, marginTop: 10 }}>
              <Editable field="line2" value={content.line2} onEdit={onEditCopy} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Rule color={palette.accent} width="100%" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: font.display, fontSize: 14, color: palette.ink, fontWeight: 500 }}>{content.line3}</div>
            {content.line4 && (
              <div style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.ink, opacity: 0.65, fontWeight: 600, textAlign: 'right' }}>
                <Editable field="line4" value={content.line4} onEdit={onEditCopy} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Rule({ color, width = 60, height = 1 }: { color: string; width?: number | string; height?: number }) {
  return <div style={{ width, height, background: color, opacity: 0.6 }} />;
}

export function PaperTexture() {
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} width="100%" height="100%">
      <defs>
        <filter id="paper-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0.95   0 0 0 0 0.92   0 0 0 0 0.85   0 0 0 0.06 0" />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#paper-noise)" />
    </svg>
  );
}

/** Resolve the host's mark-ink pick ('ink' | 'accent' | 'gold',
 *  SV.3) to a concrete color; null = each mark's own default. */
function markInkColor(pick: string | null | undefined, palette: StudioPalette): string | null {
  if (pick === 'ink') return palette.ink;
  if (pick === 'accent') return palette.accent;
  if (pick === 'gold') return 'var(--t-gold, #C19A4B)';
  return null;
}

export function MotifOverlay({
  motif,
  palette,
  stampText,
  monogram,
  customUrl,
  markInk,
  postmarkDate,
}: {
  motif: string;
  palette: StudioPalette;
  stampText: string;
  monogram: string;
  /** AI-generated motif URL — when set, the host generated a
   *  custom motif via the asset palette and dragged it into the
   *  card. Renders as a positioned image instead of the SVG glyph. */
  customUrl?: string | null;
  /** Which ink the mark is stamped in ('ink' | 'accent' | 'gold');
   *  null keeps each mark's own default (SV.3). */
  markInk?: string | null;
  /** The event date — the 'postmark' mark cancels with it, the
   *  same date the envelope + Sealed Arrival wear. */
  postmarkDate?: { dayLine: string; year: string } | null;
}): ReactNode {
  const inkPick = markInkColor(markInk, palette);
  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt=""
        style={{ position: 'absolute', top: 16, right: 16, width: 100, height: 100, objectFit: 'contain', zIndex: 3 }}
      />
    );
  }
  if (motif === 'stamp') {
    return (
      <div style={{ position: 'absolute', top: 16, right: 16, transform: 'rotate(8deg)', zIndex: 3 }}>
        <Stamp
          size={70}
          tone={palette.id === 'sage' ? 'sage' : palette.id === 'peach' ? 'peach' : 'lavender'}
          // Explicit mark ink wins; dark papers (twilight) fall back
          // to the palette's light accent so the mark stays legible.
          inkColor={inkPick ?? (palette.id === 'twilight' ? palette.accent : undefined)}
          text={stampText}
          icon="heart"
          rotation={0}
        />
      </div>
    );
  }
  if (motif === 'postmark') {
    /* The dated postmark — the same cancel the envelope + the
       site's Sealed Arrival wear, pressed on the card front. */
    const ink = inkPick ?? (palette.id === 'twilight' ? palette.accent : palette.ink);
    return (
      <svg viewBox="0 0 80 80" width={74} height={74} style={{ position: 'absolute', top: 16, right: 16, zIndex: 3, opacity: 0.75, transform: 'rotate(6deg)' }}>
        <circle cx="40" cy="40" r="37" fill="none" stroke={ink} strokeWidth="1.3" />
        <circle cx="40" cy="40" r="33.5" fill="none" stroke={ink} strokeWidth="0.5" />
        {postmarkDate ? (
          <>
            <text x="40" y="30" textAnchor="middle" fontSize="6" fontFamily="var(--font-mono, ui-monospace, monospace)" fontWeight="600" letterSpacing="1.4" fill={ink}>PEARLOOM POST</text>
            <text x="40" y="44" textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono, ui-monospace, monospace)" fontWeight="600" letterSpacing="1" fill={ink}>{postmarkDate.dayLine}</text>
            <text x="40" y="56" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono, ui-monospace, monospace)" fontWeight="600" letterSpacing="2" fill={ink}>{postmarkDate.year}</text>
          </>
        ) : (
          <text x="40" y="44" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono, ui-monospace, monospace)" fontWeight="600" letterSpacing="1.6" fill={ink}>PEARLOOM</text>
        )}
      </svg>
    );
  }
  if (motif === 'seal') {
    /* The monogram seal — the crest, miniaturized: double hairline
       ring, display-italic initials, paper showing through. */
    const ink = inkPick ?? palette.accent;
    return (
      <svg viewBox="0 0 80 80" width={70} height={70} style={{ position: 'absolute', top: 16, right: 16, zIndex: 3, opacity: 0.9 }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke={ink} strokeWidth="1.4" />
        <circle cx="40" cy="40" r="30.5" fill="none" stroke={ink} strokeWidth="0.6" opacity="0.7" />
        <text x="40" y="48" textAnchor="middle" fontSize="21" fontFamily="var(--t-display, 'Fraunces', Georgia, serif)" fill={ink} fontStyle="italic" fontWeight="600">{monogram}</text>
      </svg>
    );
  }
  if (motif === 'leaves') {
    const leaf = inkPick ?? palette.accent;
    return (
      <svg viewBox="0 0 200 200" width={140} height={140} style={{ position: 'absolute', bottom: -10, left: -10, opacity: 0.85, zIndex: 3 }}>
        <path d="M30 170 Q 60 100, 120 110 Q 170 120, 180 60" stroke={leaf} strokeWidth="1.5" fill="none" />
        <ellipse cx="55" cy="135" rx="14" ry="6" fill={leaf} transform="rotate(-30 55 135)" />
        <ellipse cx="85" cy="115" rx="14" ry="6" fill={leaf} transform="rotate(15 85 115)" />
        <ellipse cx="125" cy="105" rx="14" ry="6" fill={leaf} transform="rotate(-10 125 105)" />
        <ellipse cx="160" cy="80" rx="12" ry="5" fill={leaf} transform="rotate(40 160 80)" />
      </svg>
    );
  }
  if (motif === 'tape') {
    return (
      <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-4deg)', width: 90, height: 22, background: 'rgba(234,178,134,0.55)', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', zIndex: 3 }} />
    );
  }
  if (motif === 'monogram') {
    return (
      <div style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--t-display, "Fraunces", serif)', fontStyle: 'italic', fontSize: 28, color: inkPick ?? palette.accent, fontWeight: 600, zIndex: 3 }}>
        {monogram}
      </div>
    );
  }
  if (motif === 'wax') {
    /* Wax keeps its FILL — it's a physical material, not ink;
       the ink pick chooses the wax color instead. */
    const wax = inkPick ?? palette.accent;
    return (
      <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 3 }}>
        <svg viewBox="0 0 60 60" width={60} height={60}>
          <circle cx="30" cy="30" r="22" fill={wax} />
          <circle cx="30" cy="30" r="22" fill="url(#wax2)" opacity="0.45" />
          <text x="30" y="36" textAnchor="middle" fontSize="14" fontFamily="Georgia, serif" fill="rgba(255,255,255,0.75)" fontStyle="italic" fontWeight="700">{monogram}</text>
          <defs><radialGradient id="wax2" cx="35%" cy="35%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#000" /></radialGradient></defs>
        </svg>
      </div>
    );
  }
  // 'doodle' (the squiggle) is retired — persisted picks render
  // clean, same as 'none' (owner call, 2026-07-09).
  return null;
}
