'use client';

/* ========================================================================
   PEARLOOM — PUBLISHED EVENT SITE (v8 handoff port)
   Data-driven: reads a StoryManifest + couple names and emits the
   "Alex & Jamie" layout from the handoff mockup.
   ======================================================================== */

import { useMemo, useState } from 'react';
import type { StoryManifest, Chapter } from '@/types';
import {
  Blob,
  Heart,
  Icon,
  Pear,
  PhotoPlaceholder,
  Polaroid,
  PostIt,
  Sparkle,
  Squiggle,
  Stamp,
} from '../motifs';
import { EditorCanvasProvider, useIsEditMode } from '../editor/canvas/EditorCanvasContext';
import { EditableText } from '../editor/canvas/EditableText';

// Callback passed down for inline edits. Parent (CanvasStage)
// owns the manifest and wires each field edit back.
type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

type Tone = 'warm' | 'field' | 'dusk' | 'lavender' | 'peach' | 'sage' | 'cream';

const CHAPTER_TONES: Tone[] = ['lavender', 'sage', 'peach', 'cream', 'lavender', 'peach'];

function fmtEventDate(iso?: string | null): { pretty: string; weekday: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    pretty: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
  };
}

function useCountdown(iso?: string | null) {
  return useMemo(() => {
    if (!iso) return null;
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return null;
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return null;
    const days = Math.floor(diffMs / 86_400_000);
    const hrs = Math.floor((diffMs % 86_400_000) / 3_600_000);
    const min = Math.floor((diffMs % 3_600_000) / 60_000);
    return { days, hrs, min };
  }, [iso]);
}

/* ==================== LANGUAGE SWITCHER ==================== */
const LANGS: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
];

function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('en');
  const [working, setWorking] = useState(false);
  const [original, setOriginal] = useState<Map<Node, string> | null>(null);

  async function translate(lang: string) {
    if (typeof document === 'undefined') return;
    if (lang === 'en' || lang === current) {
      if (original) {
        original.forEach((text, node) => {
          node.nodeValue = text;
        });
        setOriginal(null);
      }
      setCurrent(lang);
      setOpen(false);
      return;
    }

    setWorking(true);
    try {
      const root = document.querySelector('.pl8-guest');
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      const snapshot = original ?? new Map<Node, string>();
      let n: Node | null = walker.nextNode();
      while (n) {
        const t = n as Text;
        const v = (t.nodeValue ?? '').trim();
        if (v.length > 1 && /[a-zA-Z]/.test(v)) {
          nodes.push(t);
          if (!snapshot.has(t)) snapshot.set(t, t.nodeValue ?? '');
        }
        n = walker.nextNode();
      }
      const segments = nodes.map((t) => snapshot.get(t) ?? t.nodeValue ?? '');
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, target: lang }),
      });
      if (!res.ok) throw new Error(`Translate failed (${res.status})`);
      const data = (await res.json()) as { segments?: string[]; translated?: string[] };
      const out = data.segments ?? data.translated ?? [];
      nodes.forEach((t, i) => {
        if (out[i]) t.nodeValue = out[i];
      });
      setOriginal(snapshot);
      setCurrent(lang);
    } catch {
      // silent — leave original text alone
    } finally {
      setWorking(false);
      setOpen(false);
    }
  }

  const currentLabel = LANGS.find((l) => l.code === current)?.label ?? 'English';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(61,74,31,0.14)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ink-soft)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Icon name="globe" size={13} />
        {working ? 'Translating…' : currentLabel}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--cream)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(14,13,11,0.18)',
            padding: 6,
            minWidth: 160,
            zIndex: 60,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => void translate(l.code)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                background: l.code === current ? 'var(--sage-tint)' : 'transparent',
                color: l.code === current ? 'var(--sage-deep)' : 'var(--ink)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'inherit',
                fontWeight: l.code === current ? 600 : 500,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== NAV ==================== */
function EventNav({ names, hasRsvp }: { names: [string, string]; hasRsvp: boolean }) {
  const links = ['Our Story', 'Details', 'Schedule', 'Travel', 'Registry', 'Gallery'];
  const coupleLabel = names.filter(Boolean).join(' & ') || 'Our celebration';
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(247, 242, 228, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(61,74,31,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
        }}
      >
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Pear size={28} tone="sage" shadow={false} />
          <span className="display-italic" style={{ fontSize: 22, color: 'var(--ink)' }}>
            {coupleLabel}
          </span>
        </a>
        <nav style={{ display: 'flex', gap: 22, marginLeft: 'auto' }} className="pl8-site-nav-links">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(' ', '-')}`}
              style={{ fontSize: 13.5, color: 'var(--ink-soft)', fontWeight: 500, textDecoration: 'none' }}
            >
              {l}
            </a>
          ))}
        </nav>
        <LanguageSwitcher />
        {hasRsvp && (
          <a href="#rsvp" className="btn btn-primary btn-sm">
            RSVP <Icon name="arrow-right" size={12} />
          </a>
        )}
      </div>
    </header>
  );
}

/* ==================== COUNTDOWN PILL ==================== */
function CountdownPill({ eventDate }: { eventDate?: string | null }) {
  const c = useCountdown(eventDate);
  if (!c) return null;
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 14,
        padding: '10px 18px',
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(61,74,31,0.12)',
        borderRadius: 999,
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(61,74,31,0.08)',
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink-soft)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Until our day
      </span>
      <div style={{ width: 1, height: 18, background: 'rgba(61,74,31,0.14)' }} />
      {[
        { n: c.days, l: 'days' },
        { n: c.hrs, l: 'hrs' },
        { n: c.min, l: 'min' },
      ].map((b, i, arr) => (
        <div key={b.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'center', minWidth: 28 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, fontWeight: 600 }}>
              {b.n}
            </div>
            <div
              style={{
                fontSize: 9.5,
                color: 'var(--ink-muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {b.l}
            </div>
          </div>
          {i < arr.length - 1 && <span style={{ color: 'var(--ink-muted)', fontWeight: 300, fontSize: 18 }}>:</span>}
        </div>
      ))}
    </div>
  );
}

/* ==================== HERO ==================== */
function HeroSection({
  names,
  manifest,
  onEditField,
  onEditNames,
}: {
  names: [string, string];
  manifest: StoryManifest;
  onEditField?: FieldEditor;
  onEditNames?: (next: [string, string]) => void;
}) {
  const [n1, n2] = names;
  const dateInfo = fmtEventDate(manifest.logistics?.date);
  const venue = manifest.logistics?.venue ?? '';
  const rsvpDeadline = manifest.logistics?.rsvpDeadline;
  const deadlineStr = rsvpDeadline ? new Date(rsvpDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null;
  const heroCopy =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ??
    "We'd love you there. Come celebrate with us — the day will be better for it.";
  const coverPhoto = manifest.coverPhoto;
  const photos = manifest.heroSlideshow ?? (manifest.chapters?.flatMap((c) => (c.images ?? []).slice(0, 1).map((i) => i.url)) ?? []);

  return (
    <section id="top" style={{ position: 'relative', padding: 'clamp(48px, 8vw, 80px) 32px clamp(48px, 8vw, 110px)', overflow: 'hidden' }}>
      <Blob tone="lavender" size={520} opacity={0.55} style={{ position: 'absolute', top: -100, left: -120 }} />
      <Blob tone="peach" size={440} opacity={0.5} style={{ position: 'absolute', top: 80, right: -140 }} />
      <Blob tone="sage" size={380} opacity={0.4} style={{ position: 'absolute', bottom: -120, left: '30%' }} />
      <Squiggle variant={1} width={260} style={{ position: 'absolute', top: 140, right: 200, transform: 'rotate(-14deg)', opacity: 0.8 }} />
      <Squiggle variant={3} width={180} style={{ position: 'absolute', bottom: 140, left: 120, transform: 'rotate(24deg)', opacity: 0.8 }} />

      <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.68)',
              border: '1px solid rgba(61,74,31,0.1)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
            }}
          >
            <Sparkle size={12} /> {dateInfo ? `Together, ${dateInfo.weekday}` : 'Save the date'}
          </span>
        </div>

        <div style={{ textAlign: 'center', position: 'relative' }}>
          <h1
            className="display pl8-hero-names"
            style={{
              fontSize: 'clamp(80px, 14vw, 168px)',
              lineHeight: 0.92,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            <EditableText
              as="span"
              value={n1 || ''}
              onSave={(next) => onEditNames?.([next, n2])}
              placeholder="Your"
              ariaLabel="First host name"
              maxLength={80}
            />
            {n2 || onEditNames ? (
              <>
                {' '}
                <span
                  className="display-italic"
                  style={{ fontSize: 'clamp(60px, 10vw, 132px)', fontWeight: 400, color: 'var(--ink-soft)' }}
                >
                  and
                </span>{' '}
                <EditableText
                  as="span"
                  value={n2 || ''}
                  onSave={(next) => onEditNames?.([n1, next])}
                  placeholder="Partner"
                  ariaLabel="Second host name"
                  maxLength={80}
                />
              </>
            ) : null}
          </h1>
          {dateInfo && (
            <div className="pl8-hide-mobile" style={{ position: 'absolute', top: -20, right: 60, transform: 'rotate(10deg)' }}>
              <Stamp
                size={108}
                tone="peach"
                text={`SAVE THE DATE · ${dateInfo.pretty.toUpperCase()}`}
                icon="heart"
                rotation={0}
              />
            </div>
          )}
          <div className="pl8-hide-mobile" style={{ position: 'absolute', bottom: 10, left: 40, transform: 'rotate(-6deg)' }}>
            <Heart size={32} color="var(--peach-2)" />
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 28,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          {dateInfo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, color: 'var(--ink)' }}>
              <Icon name="calendar" size={16} color="var(--gold)" />
              <span style={{ fontWeight: 600 }}>
                {dateInfo.weekday}, {dateInfo.pretty}
              </span>
            </div>
          )}
          {dateInfo && venue && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-muted)' }} />}
          {venue && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, color: 'var(--ink)' }}>
              <Icon name="pin" size={16} color="var(--gold)" />
              <span style={{ fontWeight: 600 }}>{venue}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', maxWidth: 560, margin: '30px auto 36px' }}>
          <EditableText
            as="p"
            value={heroCopy}
            onSave={(next) =>
              onEditField?.((m) => ({
                ...m,
                poetry: {
                  heroTagline: next,
                  closingLine: m.poetry?.closingLine ?? '',
                  rsvpIntro: m.poetry?.rsvpIntro ?? '',
                  welcomeStatement: m.poetry?.welcomeStatement,
                  milestones: m.poetry?.milestones,
                },
              }))
            }
            placeholder="Add a warm hero tagline…"
            ariaLabel="Hero tagline"
            multiline
            maxLength={280}
            style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-soft)', margin: 0 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#rsvp" className="btn btn-primary">
            {deadlineStr ? `RSVP by ${deadlineStr}` : 'RSVP'}
            <Icon name="arrow-right" size={14} />
          </a>
          <a href="#our-story" className="btn btn-outline">
            Read our story
          </a>
          <CountdownPill eventDate={manifest.logistics?.date} />
        </div>

        {/* Photo strip */}
        <div
          className="pl8-hero-strip"
          style={{
            marginTop: 80,
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr 1fr 1.4fr 1fr',
            gap: 14,
            alignItems: 'end',
          }}
        >
          {[
            { tone: 'warm' as const, aspect: '3/4', mt: 0 },
            { tone: 'field' as const, aspect: '4/5', mt: -30 },
            { tone: 'lavender' as const, aspect: '1/1', mt: 20 },
            { tone: 'dusk' as const, aspect: '5/4', mt: -20 },
            { tone: 'peach' as const, aspect: '4/5', mt: 10 },
          ].map((p, i) => (
            <div
              key={i}
              style={{
                marginTop: p.mt,
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.2}deg)`,
              }}
            >
              <div
                style={{
                  background: '#fff',
                  padding: 8,
                  boxShadow: '0 16px 36px rgba(61,74,31,0.14), 0 1px 2px rgba(0,0,0,0.05)',
                  borderRadius: 2,
                }}
              >
                <PhotoPlaceholder tone={p.tone} aspect={p.aspect} src={i === 2 ? coverPhoto ?? photos[0] : photos[i]} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--ink-muted)', fontSize: 13 }}>
          <Icon name="chev-down" size={14} /> Scroll for our story
        </div>
      </div>
    </section>
  );
}

/* ==================== TIMELINE ==================== */
function TimelineSection({ chapters, onEditField }: { chapters: Chapter[]; onEditField?: FieldEditor }) {
  if (!chapters.length) return null;
  return (
    <section id="our-story" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--peach-ink)',
              textTransform: 'uppercase',
              marginBottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="leaf" size={13} /> Our story so far
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(42px, 6vw, 72px)', margin: 0 }}>
            How we got <span className="display-italic">here</span>
          </h2>
        </div>

        <div style={{ position: 'relative' }} className="pl8-timeline-stack">
          <svg
            className="pl8-timeline-thread"
            style={{ position: 'absolute', top: 20, bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 4 }}
            preserveAspectRatio="none"
            viewBox="0 0 4 1000"
          >
            <path d="M 2 0 L 2 1000" stroke="#D4A95D" strokeWidth="1.5" strokeDasharray="3 6" />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {chapters.map((c, i) => {
              const left = i % 2 === 0;
              const tone = CHAPTER_TONES[i % CHAPTER_TONES.length];
              const isCurrent = i === chapters.length - 1;
              const year = c.date ? new Date(c.date).getFullYear().toString() : String(i + 1);
              return (
                <div
                  key={c.id ?? i}
                  className="pl8-timeline-row"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', alignItems: 'center', gap: 20 }}
                >
                  {left ? (
                    <ChapterCard
                      chapterIndex={i}
                      year={year}
                      title={c.title}
                      place={c.location?.label ?? c.subtitle ?? ''}
                      copy={c.description}
                      tone={tone}
                      src={c.images?.[0]?.url}
                      cur={isCurrent}
                      onEditField={onEditField}
                    />
                  ) : (
                    <div />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: isCurrent ? 'var(--peach-2)' : '#fff',
                        border: isCurrent ? 'none' : '2px solid var(--line)',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 6px 16px rgba(61,74,31,0.1)',
                      }}
                    >
                      {isCurrent ? (
                        <Pear size={28} tone="cream" shadow={false} />
                      ) : (
                        <span className="display" style={{ fontSize: 17, color: 'var(--ink)' }}>
                          {year}
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <div className="display-italic" style={{ fontSize: 18, color: 'var(--peach-ink)' }}>
                        today
                      </div>
                    )}
                  </div>
                  {!left ? (
                    <ChapterCard
                      chapterIndex={i}
                      year={year}
                      title={c.title}
                      place={c.location?.label ?? c.subtitle ?? ''}
                      copy={c.description}
                      tone={tone}
                      src={c.images?.[0]?.url}
                      cur={isCurrent}
                      onEditField={onEditField}
                    />
                  ) : (
                    <div />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChapterCard({
  chapterIndex,
  year,
  title,
  place,
  copy,
  tone,
  cur,
  src,
  onEditField,
}: {
  chapterIndex: number;
  year: string;
  title: string;
  place: string;
  copy: string;
  tone: Tone;
  cur?: boolean;
  src?: string;
  onEditField?: FieldEditor;
}) {
  // Chapter edit helpers — each call patches the nth chapter in
  // the manifest's chapters array with the provided field update.
  const patchChapter = (field: 'title' | 'description' | 'subtitle') => (next: string) => {
    onEditField?.((m) => {
      const chapters = [...(m.chapters ?? [])];
      const ch = chapters[chapterIndex];
      if (!ch) return m;
      chapters[chapterIndex] = { ...ch, [field]: next };
      return { ...m, chapters };
    });
  };
  return (
    <div
      style={{
        background: cur ? 'var(--peach-bg)' : 'var(--card)',
        border: `1px solid ${cur ? 'var(--peach-2)' : 'var(--card-ring)'}`,
        borderRadius: 20,
        padding: 22,
        boxShadow: cur ? '0 16px 30px rgba(234,128,86,0.18)' : '0 4px 12px rgba(61,74,31,0.06)',
        display: 'grid',
        gridTemplateColumns: '1fr 120px',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {[year, place].filter(Boolean).join(' · ')}
        </div>
        <EditableText
          as="div"
          className="display"
          value={title}
          onSave={patchChapter('title')}
          placeholder="Chapter title"
          ariaLabel={`Chapter ${chapterIndex + 1} title`}
          maxLength={120}
          style={{ fontSize: 26, marginBottom: 8 }}
        />
        <EditableText
          as="p"
          value={copy}
          onSave={patchChapter('description')}
          placeholder="Tell the story of this moment…"
          ariaLabel={`Chapter ${chapterIndex + 1} description`}
          multiline
          maxLength={800}
          style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}
        />
      </div>
      <PhotoPlaceholder tone={tone} aspect="1/1" src={src} style={{ borderRadius: 14 }} />
    </div>
  );
}

/* ==================== DETAILS STRIP ==================== */
function DetailsStrip({ manifest }: { manifest: StoryManifest }) {
  const l = manifest.logistics ?? {};
  const dateInfo = fmtEventDate(l.date);
  const time = l.time;
  const dresscode = l.dresscode ?? 'Garden party';
  const notes = l.notes ?? 'Bring a light layer — it cools off after dark.';
  const ceremonyTime = time ?? '4:00 PM';

  const items = [
    {
      t: 'Ceremony',
      v: ceremonyTime,
      s: l.venue ?? 'Our venue',
      icon: 'calendar-check',
      tone: 'lavender' as const,
    },
    {
      t: 'Reception',
      v: 'To follow',
      s: 'Dinner, toasts, dancing',
      icon: 'sparkles',
      tone: 'peach' as const,
    },
    {
      t: 'Dress code',
      v: dresscode,
      s: notes,
      icon: 'type',
      tone: 'sage' as const,
    },
  ];
  void dateInfo;

  return (
    <section
      id="details"
      style={{ padding: 'clamp(48px, 7vw, 80px) 32px', background: 'var(--ink)', color: 'var(--cream)' }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div className="pl8-cols-3" style={{ gap: 28 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(243,233,212,0.08)',
                border: '1px solid rgba(243,233,212,0.18)',
                borderRadius: 20,
                padding: 28,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background:
                    it.tone === 'lavender'
                      ? 'var(--lavender-2)'
                      : it.tone === 'peach'
                        ? 'var(--peach-2)'
                        : 'var(--sage-2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--ink)',
                  marginBottom: 16,
                }}
              >
                <Icon name={it.icon} size={20} />
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                  marginBottom: 6,
                }}
              >
                {it.t}
              </div>
              <div className="display" style={{ fontSize: 34, color: 'var(--cream)', marginBottom: 6 }}>
                {it.v}
              </div>
              <div style={{ fontSize: 14, opacity: 0.82, lineHeight: 1.5 }}>{it.s}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== SCHEDULE ==================== */
function ScheduleSection({ manifest, names }: { manifest: StoryManifest; names: [string, string] }) {
  const dateInfo = fmtEventDate(manifest.logistics?.date);
  const rows = [
    { time: '3:30', title: 'Arrive & settle', d: 'Grab a drink, grab a seat.', tag: 'Welcome' },
    { time: '4:00', title: 'Ceremony', d: 'Forty minutes, give or take a few happy tears.', tag: 'Ceremony', cur: true },
    { time: '4:45', title: 'Cocktail hour', d: 'Signature drinks. Lawn games for the brave.', tag: 'Reception' },
    { time: '6:00', title: 'Dinner', d: 'Family-style, local. Toasts from family.', tag: 'Reception' },
    { time: '8:30', title: 'First dance + open floor', d: 'We’re doing the slow one and the loud one back to back.', tag: 'Party' },
    { time: '10:30', title: 'Late-night bites', d: 'Because you’ll be hungry again, promise.', tag: 'Party' },
    { time: '11:30', title: 'Send-off', d: 'We’ll see you soon. Safe travels.', tag: 'Send-off' },
  ];
  const tagClass: Record<string, string> = {
    Welcome: 'chip-sage',
    Ceremony: 'chip-peach',
    Reception: 'chip-lavender',
    Party: 'chip-gold',
    'Send-off': 'chip-cream',
  };
  void names;

  return (
    <section id="schedule" style={{ padding: 'clamp(48px, 8vw, 100px) 32px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--peach-ink)',
              textTransform: 'uppercase',
              marginBottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="clock" size={13} /> How the day flows
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: 0 }}>
            Schedule {dateInfo && <>for <span className="display-italic">{dateInfo.pretty}</span></>}
          </h2>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--card-ring)', borderRadius: 24, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div
              key={i}
              className="pl8-schedule-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 140px',
                alignItems: 'center',
                gap: 20,
                padding: '22px 28px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
                background: r.cur ? 'var(--peach-bg)' : 'transparent',
              }}
            >
              <div
                className="display"
                style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: r.cur ? 'var(--peach-ink)' : 'var(--ink)' }}
              >
                {r.time}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{r.d}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`chip ${tagClass[r.tag] ?? 'chip-cream'}`} style={{ cursor: 'default' }}>
                  {r.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== TRAVEL ==================== */
function TravelSection({ manifest }: { manifest: StoryManifest }) {
  const venue = manifest.logistics?.venue ?? 'Our venue';
  const address = manifest.logistics?.venueAddress ?? '';
  return (
    <section id="travel" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div className="pl8-cols-2" style={{ gap: 40 }}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--peach-ink)',
                textTransform: 'uppercase',
                marginBottom: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="pin" size={13} /> The venue
            </div>
            <h3 className="display" style={{ fontSize: 'clamp(32px, 4.5vw, 44px)', margin: '0 0 16px' }}>
              {venue}
            </h3>
            {address && (
              <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 20 }}>{address}</p>
            )}
            <div
              style={{
                background: '#E3E6C8',
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid var(--card-ring)',
                aspectRatio: '5/3',
                position: 'relative',
                marginBottom: 14,
              }}
            >
              <svg viewBox="0 0 500 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <rect width="500" height="300" fill="#E3E6C8" />
                <path d="M 0 160 Q 100 140, 180 180 T 500 120" stroke="#CBD29E" strokeWidth="30" fill="none" />
                <path
                  d="M 60 0 L 100 120 L 80 200 L 130 300"
                  stroke="rgba(212,169,93,0.6)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />
                <circle cx="320" cy="150" r="4" fill="#3D4A1F" />
                <circle cx="320" cy="150" r="14" fill="none" stroke="#3D4A1F" strokeWidth="1" strokeDasharray="2 3" />
                <text x="330" y="145" fontSize="11" fill="#3D4A1F" fontFamily="Inter" fontWeight={600}>
                  {venue}
                </text>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="compass" size={13} /> Directions
                </a>
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--peach-ink)',
                textTransform: 'uppercase',
                marginBottom: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="moon" size={13} /> Places to stay
            </div>
            <h3 className="display" style={{ fontSize: 'clamp(32px, 4.5vw, 44px)', margin: '0 0 16px' }}>
              Sleep <span className="display-italic">somewhere lovely</span>
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 20 }}>
              Add hotel blocks and guest accommodations from the editor.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['peach', 'lavender', 'sage'].map((tone, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr',
                    gap: 14,
                    padding: 16,
                    borderRadius: 16,
                    background: 'var(--card)',
                    border: '1px solid var(--card-ring)',
                    alignItems: 'center',
                  }}
                >
                  <PhotoPlaceholder tone={tone as Tone} aspect="1/1" style={{ borderRadius: 12 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Hotel option {i + 1}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                      Edit in your dashboard to add real options.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== REGISTRY ==================== */
function RegistrySection({ manifest }: { manifest: StoryManifest }) {
  const registryLinks = (manifest as unknown as { registry?: Array<{ label: string; url: string }> }).registry ?? [];
  const gifts = registryLinks.length
    ? registryLinks.slice(0, 3).map((r, i) => ({
        name: r.label,
        d: r.url.replace(/^https?:\/\//, '').split('/')[0],
        url: r.url,
        icon: ['gift', 'compass', 'image'][i % 3],
        tone: (['peach', 'sage', 'lavender'] as const)[i % 3],
      }))
    : [
        { name: 'Honeymoon fund', d: 'A trip worth the wait. Thank you, truly.', url: '#', icon: 'compass', tone: 'peach' as const },
        { name: 'A good kitchen', d: 'Pans, knives, the one heavy pot.', url: '#', icon: 'gift', tone: 'sage' as const },
        { name: 'The wall gallery', d: 'Prints, frames, that hallway.', url: '#', icon: 'image', tone: 'lavender' as const },
      ];

  return (
    <section id="registry" style={{ padding: 'clamp(48px, 8vw, 100px) 32px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--peach-ink)',
              textTransform: 'uppercase',
              marginBottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="gift" size={13} /> If you&apos;re asking
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: '0 0 12px' }}>
            Registry, <span className="display-italic">gently</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-soft)', maxWidth: 560, margin: '0 auto', lineHeight: 1.55 }}>
            Your presence really is the gift. But if you&apos;d like to mark the day, here&apos;s where to find us.
          </p>
        </div>

        <div className="pl8-cols-3" style={{ gap: 20 }}>
          {gifts.map((g, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 20,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background:
                    g.tone === 'peach' ? 'var(--peach-bg)' : g.tone === 'sage' ? 'var(--sage-tint)' : 'var(--lavender-bg)',
                  color:
                    g.tone === 'peach' ? 'var(--peach-ink)' : g.tone === 'sage' ? 'var(--sage-deep)' : 'var(--lavender-ink)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name={g.icon} size={24} />
              </div>
              <div className="display" style={{ fontSize: 26 }}>
                {g.name}
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>{g.d}</p>
              <a href={g.url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>
                Contribute <Icon name="arrow-right" size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== GALLERY ==================== */
function GallerySection({ chapters }: { chapters: Chapter[] }) {
  const photos = chapters.flatMap((c) => (c.images ?? []).map((i) => i.url)).filter(Boolean).slice(0, 12);
  const tones: Tone[] = ['warm', 'field', 'dusk', 'lavender', 'peach', 'sage', 'cream', 'warm', 'dusk', 'lavender', 'field', 'peach'];
  const spans = [
    { cs: 'span 2', rs: 'span 2' },
    {},
    {},
    { rs: 'span 2' },
    {},
    { cs: 'span 2' },
    {},
    {},
    {},
    { cs: 'span 2', rs: 'span 2' },
    {},
    {},
  ];

  return (
    <section id="gallery" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          className="pl8-gallery-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 36 }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--peach-ink)',
                textTransform: 'uppercase',
                marginBottom: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="gallery" size={13} /> Along the way
            </div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: 0 }}>
              A few <span className="display-italic">favorites</span>
            </h2>
          </div>
        </div>

        <div
          className="pl8-gallery-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridAutoRows: '180px',
            gap: 14,
          }}
        >
          {tones.map((t, i) => {
            const s = spans[i] ?? {};
            return (
              <div
                key={i}
                style={{
                  gridColumn: s.cs,
                  gridRow: s.rs,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 8px 20px rgba(61,74,31,0.1)',
                }}
              >
                <PhotoPlaceholder tone={t} aspect="auto" src={photos[i]} style={{ height: '100%' }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ==================== FAQ ==================== */
function FaqSection({ manifest }: { manifest: StoryManifest }) {
  const faq = ((manifest as unknown as { faq?: Array<{ id?: string; question: string; answer: string }> }).faq ?? []);
  if (!faq.length) return null;
  return (
    <section id="faq" style={{ padding: 'clamp(48px, 8vw, 100px) 32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--peach-ink)',
              textTransform: 'uppercase',
              marginBottom: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="heart-icon" size={13} /> Good to know
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(38px, 6vw, 60px)', margin: 0 }}>
            Frequently <span className="display-italic">asked.</span>
          </h2>
        </div>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {faq.map((item, i) => (
            <div
              key={item.id ?? i}
              style={{
                padding: '22px 26px',
                borderBottom: i < faq.length - 1 ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <div
                className="display"
                style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}
              >
                {item.question}
              </div>
              <div style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{item.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================== RSVP ==================== */
function RSVPSection({
  names,
  manifest,
  siteSlug,
}: {
  names: [string, string];
  manifest: StoryManifest;
  siteSlug: string;
}) {
  const [guestName, setGuestName] = useState('');
  const [going, setGoing] = useState<'yes' | 'no' | null>(null);
  const [meal, setMeal] = useState<string>('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const mealOptions = (manifest.mealOptions ?? []).map((m) => m.name);
  const meals = mealOptions.length ? mealOptions : ['Short rib', 'Halibut', 'Garden plate'];
  const deadline = manifest.logistics?.rsvpDeadline;
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : 'soon';
  const initials = names.filter(Boolean).map((n) => n[0] ?? '').join(' & ') || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !going) {
      setErrMsg('Please add your name and let us know if you can make it.');
      return;
    }
    setState('submitting');
    setErrMsg(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteSlug,
          guestName,
          attending: going === 'yes',
          mealChoice: meal || undefined,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed (${res.status})`);
      }
      setState('success');
    } catch (err) {
      setState('error');
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <section id="rsvp" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', position: 'relative', overflow: 'hidden' }}>
      <Blob tone="peach" size={460} opacity={0.5} style={{ position: 'absolute', top: -120, left: -140 }} />
      <Blob tone="lavender" size={400} opacity={0.45} style={{ position: 'absolute', bottom: -140, right: -120 }} />

      <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--peach-ink)',
              textTransform: 'uppercase',
              marginBottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="mail" size={13} /> Kindly respond by {deadlineStr}
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(44px, 7vw, 72px)', margin: 0 }}>
            Will you <span className="display-italic">be there?</span>
          </h2>
        </div>

        {state === 'success' ? (
          <div
            style={{
              background: 'var(--sage-tint)',
              border: '1px solid var(--sage-deep)',
              borderRadius: 24,
              padding: 36,
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(61,74,31,0.12)',
            }}
          >
            <Pear size={72} tone="sage" sparkle />
            <div className="display" style={{ fontSize: 34, margin: '14px 0 8px' }}>
              Thank you!
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>
              We&apos;ve logged your RSVP. {going === 'yes' ? "We can't wait to see you." : 'Send our love — we wish you could be there.'}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-ring)',
              borderRadius: 24,
              padding: 36,
              boxShadow: '0 24px 60px rgba(61,74,31,0.12)',
            }}
          >
            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="pl8-rsvp-name"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Find your invite
              </label>
              <div style={{ position: 'relative' }}>
                <Icon
                  name="search"
                  size={16}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  color="var(--ink-muted)"
                />
                <input
                  id="pl8-rsvp-name"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 40px',
                    borderRadius: 12,
                    border: '1.5px solid var(--line)',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    background: 'var(--cream-2)',
                    color: 'var(--ink)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                  display: 'block',
                  marginBottom: 10,
                }}
              >
                Can you make it?
              </label>
              <div className="pl8-cols-2" style={{ gap: 10 }}>
                {[
                  { v: 'yes' as const, t: "Wouldn't miss it", sub: initials ? `See you soon, love ${initials}` : 'See you soon' },
                  { v: 'no' as const, t: 'Sadly, can’t', sub: 'Send our love' },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setGoing(o.v)}
                    aria-pressed={going === o.v}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      textAlign: 'left',
                      background: going === o.v ? 'var(--peach-bg)' : 'var(--cream-2)',
                      border: `1.5px solid ${going === o.v ? 'var(--peach-2)' : 'var(--line)'}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                      <Icon
                        name={o.v === 'yes' ? 'heart-icon' : 'leaf'}
                        size={14}
                        color={o.v === 'yes' ? 'var(--peach-ink)' : 'var(--ink-muted)'}
                      />
                      {o.t}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {going === 'yes' && meals.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-muted)',
                    display: 'block',
                    marginBottom: 10,
                  }}
                >
                  Dinner choice
                </label>
                <div className="pl8-cols-3" style={{ gap: 8 }}>
                  {meals.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMeal(d)}
                      aria-pressed={meal === d}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 12,
                        background: meal === d ? 'var(--ink)' : 'var(--cream-2)',
                        color: meal === d ? 'var(--cream)' : 'var(--ink)',
                        fontSize: 13,
                        fontWeight: 600,
                        border: meal === d ? 'none' : '1.5px solid var(--line)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="pl8-rsvp-note"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                A note for us <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="pl8-rsvp-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Song request? Dietary notes? A note?"
                rows={3}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  background: 'var(--cream-2)',
                  color: 'var(--ink)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {errMsg && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(198,86,61,0.08)',
                  border: '1px solid rgba(198,86,61,0.22)',
                  color: '#7A2D2D',
                  fontSize: 13,
                }}
              >
                {errMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={state === 'submitting'}
              style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
            >
              {state === 'submitting' ? 'Sending…' : (
                <>
                  Send RSVP <Icon name="send" size={14} />
                </>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <PostIt tone="cream" width={280} rotation={2} style={{ display: 'inline-block' }}>
            Thank you for being
            <br />
            in our story, truly.
            {initials && (
              <>
                <br />
                <span style={{ fontSize: 16, color: 'var(--ink-muted)' }}>— {initials}</span>
              </>
            )}
          </PostIt>
        </div>
      </div>
    </section>
  );
}

/* ==================== FOOTER ==================== */
function SiteFooter({
  names,
  prettyUrl,
}: {
  names: [string, string];
  prettyUrl: string;
}) {
  const [n1, n2] = names;
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '60px 32px 32px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div
          className="pl8-site-footer-grid"
          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}
        >
          <div>
            <Pear size={44} tone="cream" shadow={false} />
            <div className="display" style={{ fontSize: 32, marginTop: 14, color: 'var(--cream)' }}>
              {n1 || 'Your'}{' '}
              {n2 && (
                <>
                  <span className="display-italic">&amp;</span> {n2}
                </>
              )}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{prettyUrl}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 14, lineHeight: 1.6, maxWidth: 340 }}>
              Made with love (and Pearloom) by the two of us.
            </div>
          </div>
          {[
            { h: 'The day', l: [['Our story', '#our-story'], ['Schedule', '#schedule'], ['Travel', '#travel'], ['Registry', '#registry']] },
            { h: 'About', l: [['Built on Pearloom', '/'], ['Privacy', '/privacy'], ['Terms', '/terms']] },
          ].map((c) => (
            <div key={c.h}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                  marginBottom: 14,
                }}
              >
                {c.h}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.l.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    style={{ fontSize: 13.5, color: 'var(--cream)', opacity: 0.85, textDecoration: 'none' }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: '1px solid rgba(243,233,212,0.14)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            opacity: 0.6,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>© {year} {(n1 && n2 ? `${n1} & ${n2}` : n1) || 'Pearloom'} · Made with Pearloom</div>
          <a href="/" style={{ color: 'var(--cream)' }}>
            Make one like this
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ==================== RENDERER ==================== */
type SiteBlockKey = 'story' | 'details' | 'schedule' | 'travel' | 'registry' | 'gallery' | 'faq' | 'rsvp';
const DEFAULT_ORDER: SiteBlockKey[] = ['story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'faq', 'rsvp'];

export function SiteV8Renderer({
  manifest,
  names,
  siteSlug,
  prettyUrl,
  // Optional — only passed when rendered inside the editor canvas.
  // Presence of onEditField flips edit-mode chrome on for every
  // EditableText inside the tree.
  onEditField,
  onEditNames,
}: {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  prettyUrl: string;
  /** When provided, enables inline edit mode. Each editable field
   *  calls this with a pure `(manifest) => newManifest` patch. */
  onEditField?: FieldEditor;
  /** Name changes ship outside the manifest (they live on the
   *  editor state), so they get their own callback. */
  onEditNames?: (next: [string, string]) => void;
}) {
  const chapters = manifest.chapters ?? [];
  const hasRsvp = !!manifest.logistics?.date;
  const editMode = Boolean(onEditField);

  const blockOrderRaw =
    (manifest as unknown as { blockOrder?: SiteBlockKey[] }).blockOrder ?? DEFAULT_ORDER;
  const blockOrder: SiteBlockKey[] = blockOrderRaw.filter((k): k is SiteBlockKey =>
    DEFAULT_ORDER.includes(k as SiteBlockKey)
  );
  for (const key of DEFAULT_ORDER) if (!blockOrder.includes(key)) blockOrder.push(key);

  const hidden: Set<SiteBlockKey> = new Set(
    ((manifest as unknown as { hiddenBlocks?: SiteBlockKey[] }).hiddenBlocks ?? []).filter((k): k is SiteBlockKey =>
      DEFAULT_ORDER.includes(k as SiteBlockKey)
    )
  );

  const renderBlock = (key: SiteBlockKey) => {
    if (hidden.has(key)) return null;
    switch (key) {
      case 'story':
        return chapters.length > 0 ? <TimelineSection key="story" chapters={chapters} onEditField={onEditField} /> : null;
      case 'details':
        return <DetailsStrip key="details" manifest={manifest} />;
      case 'schedule':
        return <ScheduleSection key="schedule" manifest={manifest} names={names} />;
      case 'travel':
        return <TravelSection key="travel" manifest={manifest} />;
      case 'registry':
        return <RegistrySection key="registry" manifest={manifest} />;
      case 'gallery':
        return <GallerySection key="gallery" chapters={chapters} />;
      case 'faq':
        return <FaqSection key="faq" manifest={manifest} />;
      case 'rsvp':
        return <RSVPSection key="rsvp" names={names} manifest={manifest} siteSlug={siteSlug} />;
      default:
        return null;
    }
  };

  return (
    <EditorCanvasProvider value={{ editMode }}>
      <div className="pl8-guest" style={{ background: 'var(--paper)', minHeight: '100vh' }}>
        <EventNav names={names} hasRsvp={hasRsvp} />
        <HeroSection names={names} manifest={manifest} onEditField={onEditField} onEditNames={onEditNames} />
        {blockOrder.map(renderBlock)}
        <SiteFooter names={names} prettyUrl={prettyUrl} />
      </div>
    </EditorCanvasProvider>
  );
}
