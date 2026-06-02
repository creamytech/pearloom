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
  const accent: AccentTone = 'lavender';
  const accentBg = ACCENT_BG[accent];
  const density = manifest.density ?? 'comfortable';
  const padScale = { cozy: 0.7, comfortable: 1, spacious: 1.3 }[density];
  const headFont = 'var(--font-display)';

  const nameA = names[0] || 'Scott';
  const nameB = names[1] || 'Shauna';
  const date = (manifest as unknown as { logistics?: { date?: string } }).logistics?.date || 'Monday, April 26, 2027';
  const venue = (manifest as unknown as { logistics?: { venue?: string } }).logistics?.venue || 'Casa Chorro';
  const place = (manifest as unknown as { logistics?: { place?: string } }).logistics?.place || 'Santorini, Greece';

  return (
    <div onMouseLeave={() => setHover(null)} style={{ background: 'var(--paper)' }}>
      {/* Sub-nav — prototype L332-347. */}
      <SectionFrame id="nav" label="Site nav" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable} hideHandle>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 18, padding: '14px 32px',
            fontSize: 12.5, color: 'var(--ink-soft)',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pear size={22} tone="sage" shadow={false} />
            <span className="display-italic" style={{ fontSize: 16, color: 'var(--ink)' }}>
              {nameA} &amp; {nameB}
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 18, opacity: 0.85 }}>
            {['Story', 'Details', 'Schedule', 'Travel', 'Registry', 'Gallery'].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 11.5, fontWeight: 600 }}>
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
          {/* Decorative blobs + squiggle. The arches users see. */}
          <Blob tone={accent} size={360} opacity={0.5} style={{ position: 'absolute', top: -80, left: -80 }} />
          <Blob tone="peach" size={280} opacity={0.5} style={{ position: 'absolute', bottom: -60, right: -40 }} />
          <Squiggle variant={1} width={180} stroke="var(--gold-line)" style={{ position: 'absolute', top: 60, right: 80, opacity: 0.6, transform: 'rotate(-8deg)' }} />

          <div style={{ position: 'relative' }}>
            <div className="display-italic" style={{ fontSize: 18, color: 'var(--ink-soft)' }}>
              together, finally
            </div>
            <h1 style={{ fontFamily: headFont, fontSize: 84, lineHeight: 0.95, margin: '14px 0 0', letterSpacing: '-0.02em', fontWeight: 600 }}>
              {nameA}
              <span className="display-italic" style={{ fontSize: 64, color: 'var(--ink-soft)', margin: '0 12px' }}>
                and
              </span>
              {nameB}
            </h1>
            <div style={{ marginTop: 22, fontSize: 14, color: 'var(--ink-soft)', display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={13} /> {date}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="pin" size={13} /> {venue} · {place}
              </span>
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 13, fontWeight: 600 }}>
                RSVP by April 28 →
              </span>
              <span style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600 }}>
                Read our story
              </span>
            </div>
            <PhotoStrip />
          </div>
        </div>
      </SectionFrame>

      {/* Story — prototype L377-392. */}
      <SectionFrame id="story" label="Our story" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 80px`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center' }}>
          <PhotoPlaceholder tone="warm" aspect="4/5" style={{ borderRadius: 12 }} />
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>OUR STORY</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: 0, lineHeight: 1, fontWeight: 600 }}>
              How we got here
            </h2>
            <p style={{ marginTop: 16, fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              Two strangers on a Tuesday, an argument about whether olives belong on
              pizza, and a long walk that turned into ten years. We can&apos;t imagine a
              wedding without you in it — and we couldn&apos;t imagine our story without
              each other.
            </p>
          </div>
        </div>
      </SectionFrame>

      {/* Details — prototype L395-411. */}
      <SectionFrame id="details" label="Details" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${36 * padScale}px 32px`, background: 'var(--cream-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 760, marginInline: 'auto' }}>
            {[
              { icon: 'sparkles', l: 'Dress code', v: 'Garden formal' },
              { icon: 'users', l: 'Kids welcome', v: 'Ages 10 +' },
              { icon: 'gift', l: 'Gifts', v: 'Your presence is enough' },
            ].map((d) => (
              <div key={d.l} style={{ background: 'var(--card)', borderRadius: 12, padding: 18, border: '1px solid var(--line-soft)' }}>
                <Icon name={d.icon} size={18} color="var(--gold)" />
                <div className="eyebrow" style={{ marginTop: 10, marginBottom: 4 }}>{d.l}</div>
                <div style={{ fontFamily: headFont, fontSize: 18, fontWeight: 600 }}>{d.v}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Schedule — prototype L414-435. */}
      <SectionFrame id="schedule" label="Schedule" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px` }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="eyebrow">THE DAY · APRIL 26</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: '6px 0 0', lineHeight: 1, fontWeight: 600 }}>
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
              <div key={s.t} style={{ padding: 16, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line-soft)', textAlign: 'center' }}>
                <div style={{ fontFamily: headFont, fontSize: 20, fontWeight: 600 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Travel — prototype L438-462. */}
      <SectionFrame id="travel" label="Travel" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px`, background: accentBg }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>GETTING THERE</div>
            <h2 style={{ fontFamily: headFont, fontSize: 36, margin: '6px 0 0', fontWeight: 600 }}>
              Where to stay
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, maxWidth: 760, marginInline: 'auto' }}>
            {[
              { name: 'Cosmos Suites', sub: '8-min walk · room block code SS27', tone: 'warm' },
              { name: 'Andronis Boutique', sub: '12-min walk · cliffside', tone: 'lavender' },
            ].map((h) => (
              <div key={h.name} style={{ background: 'var(--card)', borderRadius: 12, padding: 14, display: 'flex', gap: 14, border: '1px solid var(--line-soft)' }}>
                <div style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <PhotoPlaceholder tone={h.tone as PhotoTone} aspect="1/1" />
                </div>
                <div>
                  <div style={{ fontFamily: headFont, fontSize: 18, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4 }}>{h.sub}</div>
                  <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px', borderRadius: 999, background: 'var(--cream-2)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
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
        <div style={{ padding: `${44 * padScale}px 32px`, textAlign: 'center' }}>
          <div className="eyebrow">REGISTRY</div>
          <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 14px', fontWeight: 600 }}>
            Your presence is the gift
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 22px' }}>
            If you&apos;d like to celebrate further, we&apos;ve put a few things together.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {['Honeyfund', 'Crate & Barrel', 'Zola'].map((s) => (
              <span key={s} style={{ padding: '12px 22px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600 }}>
                {s} ↗
              </span>
            ))}
          </div>
        </div>
      </SectionFrame>

      {/* Gallery — prototype L481-493. */}
      <SectionFrame id="gallery" label="Gallery" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${36 * padScale}px 32px`, background: 'var(--cream-2)' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow">GALLERY</div>
            <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 0', fontWeight: 600 }}>
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

      {/* RSVP — prototype L496-502. */}
      <SectionFrame id="rsvp" label="RSVP" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${56 * padScale}px 32px`, textAlign: 'center', background: 'var(--ink)', color: 'var(--cream)' }}>
          <div className="eyebrow" style={{ color: 'rgba(248,241,228,0.6)' }}>RSVP BY APRIL 28</div>
          <h2 style={{ fontFamily: headFont, fontSize: 44, margin: '8px 0 6px', color: 'var(--cream)', fontWeight: 600 }}>
            Save your seat
          </h2>
          <div style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 18 }}>
            It takes about 90 seconds. Pear will follow up if anyone forgets.
          </div>
          <span style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: 'var(--cream)', color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>
            Reply now →
          </span>
        </div>
      </SectionFrame>

      {/* FAQ — prototype L506-525. */}
      <SectionFrame id="faq" label="FAQ" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
        <div style={{ padding: `${44 * padScale}px 32px` }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="eyebrow">QUESTIONS &amp; ANSWERS</div>
            <h2 style={{ fontFamily: headFont, fontSize: 32, margin: '6px 0 0', fontWeight: 600 }}>
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
              <div key={i} style={{ padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5 }}>{q}</span>
                <Icon name="chev-down" size={13} color="var(--ink-muted)" />
              </div>
            ))}
          </div>
        </div>
      </SectionFrame>
    </div>
  );
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
              transition: 'outline-color 180ms cubic-bezier(0.16,1,0.3,1)',
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

/* ─── PhotoStrip — prototype L601-616. The 5 tilted circles in hero. ── */

function PhotoStrip() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28 }}>
      {(['warm', 'sage', 'peach', 'lavender', 'dusk'] as PhotoTone[]).map((t, i) => (
        <div
          key={i}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--paper)',
            boxShadow: '0 2px 8px rgba(61,74,31,0.15)',
            transform: `rotate(${(i - 2) * 3}deg) translateY(${Math.abs(i - 2) * -2}px)`,
          }}
        >
          <PhotoPlaceholder tone={t} aspect="1/1" />
        </div>
      ))}
    </div>
  );
}
