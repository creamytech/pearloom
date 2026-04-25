'use client';

/* ========================================================================
   PEARLOOM — PUBLISHED EVENT SITE (v8 handoff port)
   Data-driven: reads a StoryManifest + couple names and emits the
   "Alex & Jamie" layout from the handoff mockup.
   ======================================================================== */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { SortableChapters } from '../editor/canvas/SortableChapters';
import { HoverToolbar } from '../editor/canvas/HoverToolbar';
import { PhotoDropTarget } from '../editor/canvas/PhotoDropTarget';
import { OccasionDecor } from './OccasionDecor';
import { BroadcastBar } from './BroadcastBar';
import { DecorDivider } from './DecorDivider';
import { LivingAtmosphere, defaultAtmosphereForOccasion, type AtmosphereKind, type AtmosphereIntensity } from './LivingAtmosphere';
import { AmbientAudio } from './AmbientAudio';
import { useHeroParallax } from './useHeroParallax';
import { SectionBackground } from './SectionBackground';
import { ScrollReveal } from './ScrollReveal';
import { isBlockHidden } from './BlockStyleWrapper';
import {
  CalendarAddButton,
  SaveContactButton,
  FloatingCountdown,
  StickyMobileCta,
  OpenInMapsButton,
  PersonalGuestGreeting,
  AskPearFloater,
} from './GuestKit';
import {
  PhotoLightbox,
  usePhotoLightbox,
  TimeZoneCountdown,
  ScrollSpy,
  LiveWallDiscover,
  WeatherWidget,
  GuestPhotoUploader,
  VoiceToastRecorder,
} from './GuestKit2';
import { SectionStamp } from './SectionStamp';
import { StickerLayer } from './StickerLayer';
import { FooterBouquet } from './FooterBouquet';
import { ConfettiBurst } from './ConfettiBurst';
import { ActivityVoteBlock } from '@/components/site/ActivityVoteBlock';
import { AdviceWallBlock } from '@/components/site/AdviceWallBlock';
import { CostSplitterBlock } from '@/components/site/CostSplitterBlock';
import { ItineraryBlock } from '@/components/site/ItineraryBlock';
import { LivestreamBlock } from '@/components/site/LivestreamBlock';
import { ObituaryBlock } from '@/components/site/ObituaryBlock';
import { PackingListBlock } from '@/components/site/PackingListBlock';
import { PrivacyGateBlock } from '@/components/site/PrivacyGateBlock';
import { ProgramBlock } from '@/components/site/ProgramBlock';
import { ToastSignupBlock } from '@/components/site/ToastSignupBlock';
import type { PageBlock } from '@/types';

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
    } catch (err) {
      // Log so we can diagnose translate failures in production
      // without silently stranding the guest on English.
      console.warn('[translate] fell back to original:', err instanceof Error ? err.message : err);
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`pl8-site-nav${scrolled ? ' pl8-site-nav-scrolled' : ''}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: scrolled ? 'rgba(247, 242, 228, 0.96)' : 'rgba(247, 242, 228, 0.78)',
        backdropFilter: scrolled ? 'blur(18px) saturate(160%)' : 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(160%)' : 'blur(12px) saturate(140%)',
        borderBottom: scrolled ? '1px solid rgba(61,74,31,0.10)' : '1px solid transparent',
        boxShadow: scrolled ? '0 8px 24px -16px rgba(14,13,11,0.18)' : 'none',
        transition:
          'background 380ms cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 380ms cubic-bezier(0.22, 1, 0.36, 1), border-color 380ms ease, box-shadow 380ms ease',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: scrolled ? '10px 32px' : '14px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          transition: 'padding 380ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <a
          href="#top"
          className="pl8-site-nav-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            transition: 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(-2deg) translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
        >
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
              style={{
                fontSize: 13.5,
                color: 'var(--ink-soft)',
                fontWeight: 500,
                textDecoration: 'none',
                position: 'relative',
                paddingBottom: 4,
                transition: 'color 220ms ease',
              }}
            >
              {l}
            </a>
          ))}
        </nav>
        <LanguageSwitcher />
        {hasRsvp && (
          <a href="#rsvp" className="btn btn-primary btn-sm pl8-btn-sheen">
            RSVP <Icon name="arrow-right" size={12} />
          </a>
        )}
      </div>
    </header>
  );
}

/* ==================== MEAL BADGES ==================== */
const ALLERGEN_LABEL: Record<string, string> = {
  'nuts': 'nuts',
  'tree-nuts': 'tree nuts',
  'peanuts': 'peanuts',
  'shellfish': 'shellfish',
  'fish': 'fish',
  'eggs': 'eggs',
  'dairy': 'dairy',
  'soy': 'soy',
  'gluten': 'gluten',
  'sesame': 'sesame',
};
const DIETARY_LABEL: Record<string, string> = {
  'vegetarian': 'veg',
  'vegan': 'vegan',
  'gluten-free': 'GF',
  'dairy-free': 'DF',
  'nut-free': 'NF',
  'halal': 'halal',
  'kosher': 'kosher',
};

function MealBadges({
  dietaryTags,
  allergens,
  inverted,
}: {
  dietaryTags?: string[];
  allergens?: string[];
  inverted?: boolean;
}) {
  if (!dietaryTags?.length && !allergens?.length) return null;
  const dietBg = inverted ? 'rgba(243,233,212,0.16)' : 'var(--sage-tint, #E8EDD8)';
  const dietColor = inverted ? 'var(--cream)' : 'var(--sage-deep, #5C6B3F)';
  const warnBg = inverted ? 'rgba(220,140,80,0.28)' : 'rgba(198,112,61,0.14)';
  const warnColor = inverted ? '#FAD6BC' : 'var(--peach-ink, #C6703D)';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {(dietaryTags ?? []).map((tag) => (
        <span
          key={`d-${tag}`}
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 999,
            background: dietBg,
            color: dietColor,
          }}
        >
          {DIETARY_LABEL[tag] ?? tag}
        </span>
      ))}
      {(allergens ?? []).map((a) => (
        <span
          key={`a-${a}`}
          aria-label={`Contains ${ALLERGEN_LABEL[a] ?? a}`}
          title={`Contains ${ALLERGEN_LABEL[a] ?? a}`}
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 999,
            background: warnBg,
            color: warnColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          ⚠ {ALLERGEN_LABEL[a] ?? a}
        </span>
      ))}
    </div>
  );
}

/* ==================== PASSPORT STAMP ====================
   Replaces the round curved-text wax-seal "SAVE THE DATE" stamp,
   which is the most overplayed wedding-template trope of the last
   decade. This version is a passport / visa stamp: thin double-line
   rectangle, ink mono caps, vertical hairlines between segments,
   slight rotation, no peach-coloured fill. Reads as archive, not
   craft-store kitsch. */
function PassportStamp({ dateLabel }: { dateLabel: string }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 16px 8px',
        border: '1.5px solid var(--ink, #18181B)',
        borderRadius: 2,
        color: 'var(--ink)',
        background: 'transparent',
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        boxShadow: 'inset 0 0 0 4px transparent, inset 0 0 0 5px var(--ink)',
        // Inset second border line — the classic passport double-rule.
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}
      >
        Save the date
      </div>
      <div
        aria-hidden
        style={{ width: 56, height: 1, background: 'currentColor', opacity: 0.45 }}
      />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {dateLabel}
      </div>
    </div>
  );
}

/* ==================== COUNTDOWN DISPLAY ====================
   Editorial display version — three Fraunces serif numbers
   separated by hairline rules, with a small italic kicker
   beneath. Reads as type, never as a button. */
function CountdownDisplay({ eventDate }: { eventDate?: string | null }) {
  const c = useCountdown(eventDate);
  if (!c) return null;
  const items: Array<{ n: number; label: string }> = [
    { n: c.days, label: 'days' },
    { n: c.hrs,  label: 'hours' },
    { n: c.min,  label: 'minutes' },
  ];
  return (
    <div
      style={{
        marginTop: 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
        {items.map((it, i) => (
          <div
            key={it.label}
            style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                  fontSize: 48,
                  lineHeight: 1,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(it.n).padStart(2, '0')}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                {it.label}
              </div>
            </div>
            {i < items.length - 1 && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 1,
                  height: 38,
                  background: 'rgba(61,74,31,0.22)',
                  alignSelf: 'flex-start',
                  marginTop: 6,
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--ink-soft)',
        }}
      >
        until our day
      </div>
    </div>
  );
}

/* ==================== COUNTDOWN PILL (legacy) ==================== */
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
  siteSlug,
  onEditField,
  onEditNames,
}: {
  names: [string, string];
  manifest: StoryManifest;
  siteSlug?: string;
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

  // Decor mode — 'occasion' (per-event shape library),
  // 'classic' (the original v8 blobs + squiggles, for templates
  // that ship that look), or 'off' (clean hero).
  const occasionRaw = (manifest as unknown as { occasion?: string }).occasion;
  const decorMode =
    ((manifest as unknown as { decorStyle?: 'classic' | 'occasion' | 'off' }).decorStyle) ??
    'occasion';

  // Living atmosphere — animated background layer. Reads
  // manifest.atmosphere if set, otherwise picks a sensible default
  // for the occasion. Host can override or disable in the editor.
  const atmosphereCfg = (manifest as unknown as {
    atmosphere?: { kind?: string; intensity?: string; sections?: string[]; accent?: string }
  }).atmosphere;
  const atmosphereKind = (atmosphereCfg?.kind as AtmosphereKind | undefined)
    ?? defaultAtmosphereForOccasion(occasionRaw);
  const atmosphereIntensity = (atmosphereCfg?.intensity as AtmosphereIntensity | undefined) ?? 'standard';
  const atmosphereAccent = atmosphereCfg?.accent
    ?? (manifest as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors?.accent;

  // Cursor parallax — subtle drift on the atmosphere layer.
  const parallax = useHeroParallax(8);

  return (
    <section
      ref={parallax.ref as React.RefObject<HTMLElement>}
      id="top"
      style={{ position: 'relative', padding: 'clamp(48px, 8vw, 80px) 32px clamp(48px, 8vw, 110px)', overflow: 'hidden' }}
    >
      {/* Animated atmosphere — sits beneath the static decor so it
          reads as light moving through the paper, not on top of it.
          Cursor parallax drifts the whole layer ~8px. */}
      <div style={{ position: 'absolute', inset: 0, ...parallax.style, zIndex: 0 }} aria-hidden>
        <LivingAtmosphere
          kind={atmosphereKind}
          intensity={atmosphereIntensity}
          accent={atmosphereAccent}
        />
      </div>
      {decorMode === 'classic' && (
        <>
          {/* Two paper washes + a single filigree — restrained
              editorial atmosphere instead of the prior 5-element
              clip-art-y composition. */}
          <Blob tone="lavender" size={560} opacity={0.42} style={{ position: 'absolute', top: -160, left: -160 }} />
          <Blob tone="peach" size={460} opacity={0.32} style={{ position: 'absolute', bottom: -160, right: -160 }} />
          <Squiggle variant={0} width={260} style={{ position: 'absolute', top: 100, right: 180, transform: 'rotate(-6deg)', opacity: 0.55 }} />
        </>
      )}
      {decorMode === 'occasion' && <OccasionDecor occasion={occasionRaw} variant="hero" />}
      {(manifest as unknown as { aiAccentUrl?: string }).aiAccentUrl && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${(manifest as unknown as { aiAccentUrl: string }).aiAccentUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'multiply',
            opacity: 0.38,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
        {/* Chapter-mark kicker — replaces the previous `+ TOGETHER,
            MONDAY` chip. Two hairline rules flank a short italic
            Fraunces phrase, like a book editor's chapter break.
            Far calmer, no clip-art `+`, no rounded pill. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 22,
            color: 'var(--ink-soft)',
          }}
        >
          <span aria-hidden style={{ width: 48, height: 1, background: 'currentColor', opacity: 0.45 }} />
          <EditableText
            as="span"
            value={
              (manifest as unknown as { heroKicker?: string }).heroKicker ??
              (dateInfo ? `together, ${dateInfo.weekday.toLowerCase()}` : 'save the date')
            }
            onSave={(next) =>
              onEditField?.((m) => ({
                ...(m as unknown as Record<string, unknown>),
                heroKicker: next,
              }) as unknown as StoryManifest)
            }
            placeholder="save the date"
            ariaLabel="Hero kicker"
            maxLength={60}
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '0.01em',
              color: 'var(--ink)',
              lineHeight: 1.1,
              textAlign: 'center',
            }}
          />
          <span aria-hidden style={{ width: 48, height: 1, background: 'currentColor', opacity: 0.45 }} />
        </div>

        {manifest.motifs?.stamp?.text && (
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span
              className="pl8-motif-stamp"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                border: '2px solid var(--peach-ink)',
                color: 'var(--peach-ink)',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                borderRadius: 4,
                transform: `rotate(${manifest.motifs.stamp.rotation ?? -3}deg)`,
                background: 'transparent',
              }}
            >
              {manifest.motifs.stamp.text}
            </span>
          </div>
        )}

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
            <div
              className="pl8-hide-mobile"
              style={{ position: 'absolute', top: -8, right: 24, transform: 'rotate(8deg)' }}
            >
              <PassportStamp dateLabel={dateInfo.pretty.toUpperCase()} />
            </div>
          )}
          {manifest.motifs?.heart !== false && (
            <div className="pl8-hide-mobile" style={{ position: 'absolute', bottom: 10, left: 40, transform: 'rotate(-6deg)' }}>
              <Heart size={32} color="var(--peach-2)" />
            </div>
          )}
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
          <HoverToolbar
            context="hero tagline"
            value={heroCopy}
            onResult={(next) =>
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
          >
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
          </HoverToolbar>
        </div>

        {/* TIER 1 — single primary CTA. The only "real" button in the
            hero. Everything else is supporting. */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a
            href="#rsvp"
            className="btn btn-primary pl8-btn-sheen"
            style={{ padding: '14px 28px', fontSize: 15 }}
          >
            {deadlineStr ? `RSVP by ${deadlineStr}` : 'RSVP'}
            <Icon name="arrow-right" size={14} />
          </a>
        </div>

        {/* TIER 2 — secondary actions as a quiet text-link tray with
            middot separators. No more "five pills competing for the
            same attention." */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginTop: 18,
            fontSize: 13,
            color: 'var(--ink-soft)',
          }}
        >
          <a
            href="#our-story"
            style={{
              color: 'var(--ink)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(61,74,31,0.25)',
              paddingBottom: 1,
              transition: 'border-color 200ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(61,74,31,0.25)'; }}
          >
            Read our story
          </a>
          <span aria-hidden style={{ color: 'var(--ink-muted)', opacity: 0.6 }}>·</span>
          <CalendarAddButton domain={siteSlug ?? ''} manifest={manifest} variant="link" />
          <span aria-hidden style={{ color: 'var(--ink-muted)', opacity: 0.6 }}>·</span>
          <SaveContactButton domain={siteSlug ?? ''} manifest={manifest} names={[n1 ?? '', n2 ?? '']} variant="link" />
        </div>

        {/* TIER 3 — countdown becomes its own editorial display, not a
            button. Three Fraunces serif numbers separated by hairline
            rules, with a small italic kicker. Reads as type, never as
            a clickable control. */}
        <CountdownDisplay eventDate={manifest.logistics?.date} />
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <TimeZoneCountdown
            iso={manifest.logistics?.date}
            time={manifest.logistics?.time}
            venueTimeZone={(manifest.logistics as unknown as { venueTimeZone?: string } | undefined)?.venueTimeZone}
          />
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
          ].map((p, i) => {
            const isHeroCover = i === 2;
            const onDrop = (url: string) => {
              if (isHeroCover) {
                onEditField?.((m) => ({ ...m, coverPhoto: url }));
              } else {
                onEditField?.((m) => {
                  const next = [...(m.heroSlideshow ?? [])];
                  next[i] = url;
                  return { ...m, heroSlideshow: next };
                });
              }
            };
            return (
              <div
                key={i}
                style={{
                  marginTop: p.mt,
                  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.2}deg)`,
                }}
              >
                <PhotoDropTarget onDrop={onDrop} label={isHeroCover ? 'Drop to set cover' : 'Drop a photo'}>
                  <div
                    style={{
                      background: '#fff',
                      padding: 8,
                      boxShadow: '0 16px 36px rgba(61,74,31,0.14), 0 1px 2px rgba(0,0,0,0.05)',
                      borderRadius: 2,
                    }}
                  >
                    <PhotoPlaceholder tone={p.tone} aspect={p.aspect} src={isHeroCover ? coverPhoto ?? photos[0] : photos[i]} />
                  </div>
                </PhotoDropTarget>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--ink-muted)', fontSize: 13 }}>
          <Icon name="chev-down" size={14} /> Scroll for our story
        </div>
      </div>
    </section>
  );
}

/* ==================== TIMELINE ==================== */
/**
 * Renders the story section using one of the non-timeline layouts
 * (filmstrip, magazine, bento, kenburns, parallax) so each template
 * keeps its declared format. We re-use the heavy StoryLayout
 * dispatcher from src/components/blocks/StoryLayouts.tsx — the
 * components there have all the per-layout polish (parallax photos,
 * magazine spreads, bento tiles, ken-burns crops).
 */
function StoryVariantSection({
  chapters,
  layout,
  manifest,
}: {
  chapters: Chapter[];
  layout: string;
  manifest?: StoryManifest;
}) {
  // Lazy-load to keep StoryLayouts.tsx out of the initial bundle.
  // It's 76kB and only executes on sites that opt out of timeline.
  const [Comp, setComp] = useState<null | React.ComponentType<{
    type: 'parallax' | 'filmstrip' | 'magazine' | 'timeline' | 'kenburns' | 'bento';
    photos: Array<{ url: string; alt?: string; caption?: string }>;
    title: string;
    subtitle?: string;
    body?: string;
    date?: string;
    location?: string | null;
    index?: number;
    themeFonts?: { heading?: string; body?: string };
  }>>(null);
  useEffect(() => {
    let cancelled = false;
    import('@/components/blocks/StoryLayouts').then((mod) => {
      if (!cancelled) setComp(() => mod.StoryLayout);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // Allowed types — fall back to parallax if the manifest carries
  // something the dispatcher doesn't know.
  const validTypes = ['parallax', 'filmstrip', 'magazine', 'timeline', 'kenburns', 'bento'] as const;
  type ValidType = typeof validTypes[number];
  const safeLayout: ValidType = (validTypes as readonly string[]).includes(layout)
    ? (layout as ValidType)
    : 'parallax';
  const themeFonts = manifest?.theme?.fonts;

  if (!Comp) {
    // Fall back to the timeline render while the chunk loads. Avoids
    // an empty section flash on first navigation.
    return <TimelineSection chapters={chapters} manifest={manifest} />;
  }

  return (
    <section id="our-story" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="our-story" />
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
            <SectionStamp url={manifest?.decorLibrary?.sectionStamps?.story} size={32} />
            <Icon name="leaf" size={13} /> Our story so far
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(42px, 6vw, 72px)', margin: 0 }}>
            How we got <span className="display-italic">here</span>
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
          {chapters.map((c, i) => {
            const photos = (c.images ?? [])
              .filter((img) => img && img.url)
              .map((img) => ({ url: img.url, alt: img.alt, caption: img.caption }));
            return (
              <Comp
                key={c.id ?? i}
                type={safeLayout}
                title={c.title}
                subtitle={c.subtitle ?? c.location?.label ?? ''}
                body={c.description}
                date={c.date}
                location={c.location?.label ?? null}
                index={i}
                photos={photos}
                themeFonts={themeFonts}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ chapters, onEditField, manifest }: { chapters: Chapter[]; onEditField?: FieldEditor; manifest?: StoryManifest }) {
  const edit = useIsEditMode();
  if (!chapters.length && !edit) return null;
  const addChapter = () => {
    onEditField?.((m) => {
      const arr = [...(m.chapters ?? [])];
      const year = new Date().getFullYear();
      arr.push({
        id: `ch-${Date.now()}`,
        title: 'New chapter',
        subtitle: '',
        description: 'Tell the story of this moment.',
        date: `${year}-01-01`,
        images: [],
      } as unknown as Chapter);
      return { ...m, chapters: arr };
    });
  };
  return (
    <section id="our-story" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="our-story" />
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
            <SectionStamp url={manifest?.decorLibrary?.sectionStamps?.story} size={32} />
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

          <SortableChapters
            chapters={chapters}
            onReorder={(next) => onEditField?.((m) => ({ ...m, chapters: next }))}
          >
            {(c, i) => {
              const left = i % 2 === 0;
              const tone = CHAPTER_TONES[i % CHAPTER_TONES.length];
              const isCurrent = i === chapters.length - 1;
              const year = c.date ? new Date(c.date).getFullYear().toString() : String(i + 1);
              return (
                <div
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
            }}
          </SortableChapters>
          {edit && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                type="button"
                onClick={addChapter}
                className="pl8-canvas-add"
                style={{
                  padding: '12px 22px',
                  background: 'var(--card)',
                  border: '1px dashed var(--sage-deep)',
                  borderRadius: 999,
                  color: 'var(--sage-deep)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add a chapter
              </button>
            </div>
          )}
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
  const onChapterPhotoDrop = (url: string) => {
    onEditField?.((m) => {
      const chapters = [...(m.chapters ?? [])];
      const ch = chapters[chapterIndex];
      if (!ch) return m;
      const images = [...((ch.images as Array<{ url: string }> | undefined) ?? [])];
      if (images.length === 0) images.push({ url });
      else images[0] = { ...images[0], url };
      chapters[chapterIndex] = { ...ch, images } as typeof ch;
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
        <HoverToolbar context={`chapter ${chapterIndex + 1}`} value={copy} onResult={patchChapter('description')}>
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
        </HoverToolbar>
      </div>
      <PhotoDropTarget onDrop={onChapterPhotoDrop} label="Drop a photo">
        <PhotoPlaceholder tone={tone} aspect="1/1" src={src} style={{ borderRadius: 14 }} />
      </PhotoDropTarget>
    </div>
  );
}

/* ==================== DETAILS STRIP ==================== */
function DetailsStrip({ manifest }: { manifest: StoryManifest }) {
  const l = manifest.logistics ?? {};
  const dateInfo = fmtEventDate(l.date);
  const events = manifest.events ?? [];

  // Build items from actual manifest data — only surface what the
  // host has filled in. If they haven't set anything, the whole
  // strip hides rather than advertising demo copy.
  type Item = { t: string; v: string; s: string; icon: string; tone: 'lavender' | 'peach' | 'sage' };
  const items: Item[] = [];

  const ceremony = events.find((e) => e.type === 'ceremony');
  if (ceremony) {
    items.push({
      t: 'Ceremony',
      v: ceremony.time || (dateInfo?.pretty ?? ''),
      s: ceremony.venue || l.venue || '',
      icon: 'calendar-check',
      tone: 'lavender',
    });
  } else if (l.time || l.venue) {
    items.push({
      t: 'Ceremony',
      v: l.time ?? (dateInfo?.pretty ?? ''),
      s: l.venue ?? '',
      icon: 'calendar-check',
      tone: 'lavender',
    });
  }

  const reception = events.find((e) => e.type === 'reception');
  if (reception) {
    items.push({
      t: 'Reception',
      v: reception.time || '',
      s: reception.venue || '',
      icon: 'sparkles',
      tone: 'peach',
    });
  }

  if (l.dresscode) {
    items.push({
      t: 'Dress code',
      v: l.dresscode,
      s: l.notes ?? '',
      icon: 'type',
      tone: 'sage',
    });
  }

  if (items.length === 0) return null;
  void dateInfo;

  // Derive a city for the weather lookup. Take the chunk before the
  // first comma in the venue address — most "Address, City, State"
  // formats land on the right token; fall back to venue name.
  const weatherCity = (() => {
    const addr = (l as unknown as { venueAddress?: string }).venueAddress;
    if (addr) {
      const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
      // index 1 is usually city; fall back to 0 then venue.
      return parts[1] ?? parts[0] ?? l.venue;
    }
    return l.venue;
  })();

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
        {weatherCity && l.date && (
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
            <WeatherWidget city={weatherCity} eventDate={l.date} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ==================== SCHEDULE ==================== */
function ScheduleSection({ manifest, names, onEditField }: { manifest: StoryManifest; names: [string, string]; onEditField?: FieldEditor }) {
  const edit = useIsEditMode();
  const dateInfo = fmtEventDate(manifest.logistics?.date);
  const events = manifest.events ?? [];
  // Hide the whole section rather than ship a demo schedule.
  if (events.length === 0 && !edit) return null;
  const addEvent = () => {
    onEditField?.((m) => {
      const arr = [...((m.events ?? []))];
      arr.push({
        id: `evt-${Date.now()}`,
        name: 'New event',
        type: 'other',
        time: '18:00',
        description: '',
        order: arr.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      return { ...m, events: arr };
    });
  };

  const tagFromType: Record<string, string> = {
    ceremony: 'Ceremony',
    reception: 'Reception',
    rehearsal: 'Rehearsal',
    brunch: 'Brunch',
    'welcome-party': 'Welcome',
    other: 'Other',
  };
  const tagClass: Record<string, string> = {
    Welcome: 'chip-sage',
    Ceremony: 'chip-peach',
    Reception: 'chip-lavender',
    Rehearsal: 'chip-cream',
    Brunch: 'chip-gold',
    Other: 'chip-cream',
  };
  // Real host-authored events, ordered by time (or by `order` if the
  // host dragged them in the editor).
  const sorted = [...events].sort((a, b) => {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    if (ao !== bo) return ao - bo;
    return (a.time ?? '').localeCompare(b.time ?? '');
  });
  const rows = sorted.map((e) => ({
    time: e.time ?? '',
    title: e.name,
    d: e.description ?? '',
    tag: tagFromType[e.type] ?? 'Other',
    cur: e.type === 'ceremony',
  }));
  void names;

  return (
    <section id="schedule" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="schedule" />
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.schedule} size={32} />
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
          {edit && (
            <button
              type="button"
              onClick={addEvent}
              className="pl8-canvas-add"
              style={{
                width: '100%',
                padding: '18px 26px',
                background: 'transparent',
                border: 'none',
                borderTop: rows.length ? '1px dashed var(--line-soft)' : 'none',
                color: 'var(--sage-deep)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              + Add an event
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==================== TRAVEL ==================== */
function VenueHero({ venue, address, manifest, onEditField }: { venue: string; address: string; manifest: StoryManifest; onEditField?: FieldEditor }) {
  // Priority order for what we render:
  //   1. Custom photo the user uploaded (manifest.logistics.venuePhoto)
  //   2. Stylized AI rendition (manifest.logistics.venuePhotoStylized)
  //   3. Real Places photo via /api/venue/photo
  //   4. Hand-drawn SVG fallback
  const logistics = manifest.logistics as Record<string, string | undefined> | undefined;
  const customPhoto = logistics?.venuePhoto;
  const stylizedPhoto = logistics?.venuePhotoStylized;
  const showStylized = Boolean(stylizedPhoto && logistics?.venuePhotoMode === 'stylized');
  const query = [venue, address].filter(Boolean).join(', ');
  const photoSrc = showStylized
    ? stylizedPhoto!
    : customPhoto
      ? customPhoto
      : query
        ? `/api/venue/photo?q=${encodeURIComponent(query)}&w=1200&h=800`
        : '';
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const edit = useIsEditMode();

  // Stylize the current venue photo via GPT Image 2 (editorial
  // illustration). Host-only; the output URL persists on manifest
  // so every guest sees the same rendition.
  const [stylizing, setStylizing] = useState(false);
  async function handleStylize() {
    if (!photoSrc || stylizing) return;
    setStylizing(true);
    try {
      // The server route fetches the source photo itself, so we just
      // hand it the absolute URL. (photoSrc may be relative — e.g.
      // `/api/venue/photo?q=…` — so resolve against the page origin.)
      const photoUrl = photoSrc.startsWith('http')
        ? photoSrc
        : `${window.location.origin}${photoSrc.startsWith('/') ? '' : '/'}${photoSrc}`;
      const stylRes = await fetch('/api/photos/stylize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl,
          style: 'watercolor',
        }),
      });
      if (!stylRes.ok) {
        const body = await stylRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Stylize ${stylRes.status}`);
      }
      const data = (await stylRes.json()) as { url?: string };
      if (!data.url) throw new Error('Stylize returned no url');
      onEditField?.((m) => {
        const l = (m.logistics ?? {}) as Record<string, unknown>;
        return {
          ...m,
          logistics: { ...l, venuePhotoStylized: data.url, venuePhotoMode: 'stylized' },
        } as StoryManifest;
      });
    } catch (err) {
      console.error('[venue stylize]', err);
      window.alert(err instanceof Error ? err.message : 'Stylize failed');
    } finally {
      setStylizing(false);
    }
  }

  function togglePhotoMode() {
    onEditField?.((m) => {
      const l = (m.logistics ?? {}) as Record<string, unknown>;
      const next = l.venuePhotoMode === 'stylized' ? 'real' : 'stylized';
      return { ...m, logistics: { ...l, venuePhotoMode: next } } as StoryManifest;
    });
  }

  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : venue
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`
      : '';

  return (
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
      {photoSrc && status !== 'error' && (
        <img
          src={photoSrc}
          alt={`A photo of ${venue}`}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: status === 'ready' ? 1 : 0,
            transition: 'opacity 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      )}
      {/* Soft vignette for legibility of the overlay */}
      {photoSrc && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(14,13,11,0.45), rgba(14,13,11,0) 55%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      {/* Venue label + Maps link */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          right: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: 'rgba(243,233,212,0.94)',
            padding: '6px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: '#3D4A1F',
            boxShadow: '0 4px 10px rgba(61,74,31,0.18)',
          }}
        >
          {venue}
        </div>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 10,
              background: 'var(--ink)',
              color: 'var(--cream)',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 10px rgba(14,13,11,0.25)',
            }}
          >
            <Icon name="compass" size={13} /> Open in Maps
          </a>
        )}
      </div>
      {/* Stylize / un-stylize toggle — edit mode only */}
      {edit && photoSrc && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 6,
            zIndex: 3,
          }}
        >
          {stylizedPhoto && (
            <button
              type="button"
              onClick={togglePhotoMode}
              style={pillBtn()}
            >
              {showStylized ? 'Show real photo' : 'Show stylized'}
            </button>
          )}
          <button
            type="button"
            onClick={handleStylize}
            disabled={stylizing}
            style={pillBtn()}
          >
            {stylizing ? 'Stylizing…' : stylizedPhoto ? 'Re-stylize' : 'Stylize with Pear'}
          </button>
        </div>
      )}
      {/* Fallback SVG when the photo endpoint 404s */}
      {status === 'error' && (
        <svg viewBox="0 0 500 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
          <rect width="500" height="300" fill="#E3E6C8" />
          <path d="M 0 160 Q 100 140, 180 180 T 500 120" stroke="#CBD29E" strokeWidth="30" fill="none" />
          <path d="M 60 0 L 100 120 L 80 200 L 130 300" stroke="rgba(212,169,93,0.6)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
          <circle cx="320" cy="150" r="4" fill="#3D4A1F" />
          <circle cx="320" cy="150" r="14" fill="none" stroke="#3D4A1F" strokeWidth="1" strokeDasharray="2 3" />
        </svg>
      )}
    </div>
  );
}

function pillBtn(): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(14,13,11,0.72)',
    color: '#fff',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function TravelSection({ manifest, onEditField }: { manifest: StoryManifest; onEditField?: FieldEditor }) {
  const edit = useIsEditMode();
  const venue = manifest.logistics?.venue ?? 'Our venue';
  const address = manifest.logistics?.venueAddress ?? '';
  const hotels = manifest.travelInfo?.hotels ?? [];
  const hotelTones: Tone[] = ['peach', 'lavender', 'sage'];
  // Real sites only — no placeholder hotel cards. If nothing is set
  // and we're not in edit mode, just show venue + map.
  const showPlacesToStay = hotels.length > 0 || edit;
  return (
    <section id="travel" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="travel" />
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
              <SectionStamp url={manifest.decorLibrary?.sectionStamps?.travel} size={32} />
              <Icon name="pin" size={13} /> The venue
            </div>
            <h3 className="display" style={{ fontSize: 'clamp(32px, 4.5vw, 44px)', margin: '0 0 16px' }}>
              {venue}
            </h3>
            {address && (
              <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 20 }}>{address}</p>
            )}
            <VenueHero venue={venue} address={address} manifest={manifest} onEditField={onEditField} />
            {address && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <OpenInMapsButton address={address} label="Directions" />
              </div>
            )}
          </div>

          {showPlacesToStay && (
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
              {hotels.length === 0 && edit && (
                <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
                  Nothing yet. Add hotel blocks from the Travel panel.
                </p>
              )}
              {hotels.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {hotels.slice(0, 4).map((h, i) => {
                    const card = (
                      <div
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
                        <PhotoPlaceholder tone={hotelTones[i % hotelTones.length]} aspect="1/1" style={{ borderRadius: 12 }} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{h.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                            {h.address}
                            {h.groupRate ? ` · ${h.groupRate}` : ''}
                            {h.notes ? ` · ${h.notes}` : ''}
                          </div>
                          {h.address && (
                            <div style={{ marginTop: 8 }}>
                              <OpenInMapsButton address={h.address} label="Directions" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    return h.bookingUrl ? (
                      <a
                        key={i}
                        href={h.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {card}
                      </a>
                    ) : (
                      <div key={i}>{card}</div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==================== REGISTRY ==================== */
function RegistrySection({ manifest }: { manifest: StoryManifest }) {
  // Pull from the real manifest shape: registry.entries[] +
  // registry.cashFundUrl / message. When nothing is set, the
  // whole section hides so we never ship "Honeymoon fund / A
  // good kitchen" demo copy.
  type RegistryEntry = { name?: string; label?: string; url: string; note?: string };
  const reg = manifest.registry as undefined | {
    enabled?: boolean;
    entries?: RegistryEntry[];
    cashFundUrl?: string;
    cashFundMessage?: string;
    message?: string;
  };
  const entries = reg?.entries ?? [];
  const hasCashFund = Boolean(reg?.cashFundUrl);
  // Legacy shape — registry sometimes lived as a flat array on the manifest.
  const legacyList = (manifest as unknown as { registry?: Array<{ label: string; url: string }> }).registry;
  const legacyEntries = Array.isArray(legacyList) ? legacyList : [];
  // Dedupe by URL — if the same registry appears in both the new
  // nested shape AND the legacy flat array, we don't want to render
  // it twice. The nested shape wins (has name + note).
  const seenUrls = new Set<string>();
  const combined: Array<{ name: string; d: string; url: string; icon: string; tone: 'peach' | 'sage' | 'lavender' }> = [];
  entries.forEach((e, i) => {
    if (!e.url || seenUrls.has(e.url)) return;
    seenUrls.add(e.url);
    combined.push({
      name: e.name ?? e.label ?? 'Registry',
      d: e.note ?? e.url.replace(/^https?:\/\//, '').split('/')[0],
      url: e.url,
      icon: ['gift', 'compass', 'image'][i % 3],
      tone: (['peach', 'sage', 'lavender'] as const)[i % 3],
    });
  });
  legacyEntries.forEach((r, i) => {
    if (!r.url || seenUrls.has(r.url)) return;
    seenUrls.add(r.url);
    combined.push({
      name: r.label,
      d: r.url.replace(/^https?:\/\//, '').split('/')[0],
      url: r.url,
      icon: ['gift', 'compass', 'image'][i % 3],
      tone: (['peach', 'sage', 'lavender'] as const)[i % 3],
    });
  });
  if (hasCashFund && reg?.cashFundUrl) {
    combined.unshift({
      name: 'Cash fund',
      d: reg.cashFundMessage ?? '',
      url: reg.cashFundUrl,
      icon: 'compass',
      tone: 'peach' as const,
    });
  }
  const gifts = combined.slice(0, 6);
  // No user-provided registry? Don't render demo gifts.
  if (gifts.length === 0) return null;

  return (
    <section id="registry" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="registry" />
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.registry} size={32} />
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
function GallerySection({ chapters, manifest }: { chapters: Chapter[]; manifest?: StoryManifest }) {
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

  // Build lightbox image set from real photos only — placeholder
  // tiles aren't openable.
  const lightboxImages = photos.map((url) => ({ url }));
  const { index, open, close, next, prev } = usePhotoLightbox(lightboxImages);

  return (
    <section id="gallery" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="gallery" />
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
              <SectionStamp url={manifest?.decorLibrary?.sectionStamps?.gallery} size={32} />
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
            const url = photos[i];
            const photoIndex = url ? lightboxImages.findIndex((img) => img.url === url) : -1;
            const clickable = photoIndex >= 0;
            return (
              <div
                key={i}
                onClick={clickable ? () => open(photoIndex) : undefined}
                style={{
                  gridColumn: s.cs,
                  gridRow: s.rs,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 8px 20px rgba(61,74,31,0.1)',
                  cursor: clickable ? 'zoom-in' : 'default',
                  transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseEnter={clickable ? (e) => { e.currentTarget.style.transform = 'scale(1.015)'; } : undefined}
                onMouseLeave={clickable ? (e) => { e.currentTarget.style.transform = 'scale(1)'; } : undefined}
              >
                <PhotoPlaceholder tone={t} aspect="auto" src={url} style={{ height: '100%' }} />
              </div>
            );
          })}
        </div>
      </div>
      <PhotoLightbox images={lightboxImages} index={index} onClose={close} onNext={next} onPrev={prev} />
    </section>
  );
}

/* ==================== FAQ ==================== */
function FaqSection({ manifest, onEditField }: { manifest: StoryManifest; onEditField?: FieldEditor }) {
  type FaqItem = { id?: string; question: string; answer: string };
  const edit = useIsEditMode();
  const faq = ((manifest as unknown as { faq?: FaqItem[] }).faq ?? []);
  if (!faq.length && !edit) return null;
  const patchFaq = (index: number, field: 'question' | 'answer') => (next: string) => {
    onEditField?.((m) => {
      const arr = [...(((m as unknown as { faq?: FaqItem[] }).faq ?? []))];
      const item = arr[index];
      if (!item) return m;
      arr[index] = { ...item, [field]: next };
      return { ...(m as unknown as Record<string, unknown>), faq: arr } as unknown as StoryManifest;
    });
  };
  const addFaq = () => {
    onEditField?.((m) => {
      const arr = [...(((m as unknown as { faq?: FaqItem[] }).faq ?? []))];
      arr.push({ id: `faq-${Date.now()}`, question: 'New question', answer: 'Answer' });
      return { ...(m as unknown as Record<string, unknown>), faq: arr } as unknown as StoryManifest;
    });
  };
  return (
    <section id="faq" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="faq" />
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.faq} size={32} />
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
              <EditableText
                as="div"
                className="display"
                value={item.question}
                onSave={patchFaq(i, 'question')}
                placeholder="Question?"
                ariaLabel={`FAQ ${i + 1} question`}
                maxLength={240}
                style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}
              />
              <EditableText
                as="div"
                value={item.answer}
                onSave={patchFaq(i, 'answer')}
                placeholder="Write the answer here…"
                ariaLabel={`FAQ ${i + 1} answer`}
                multiline
                maxLength={800}
                style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.65 }}
              />
            </div>
          ))}
          {edit && (
            <button
              type="button"
              onClick={addFaq}
              className="pl8-canvas-add"
              style={{
                width: '100%',
                padding: '18px 26px',
                background: 'transparent',
                border: 'none',
                borderTop: faq.length ? '1px dashed var(--line-soft)' : 'none',
                color: 'var(--sage-deep)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              + Add a question
            </button>
          )}
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
  const [plusOneName, setPlusOneName] = useState('');
  const [plusOneUrl, setPlusOneUrl] = useState<string | null>(null);
  const [plusOneBusy, setPlusOneBusy] = useState(false);
  const [plusOneCopied, setPlusOneCopied] = useState(false);

  const mealOptionsRich = (manifest.mealOptions ?? []);
  const mealOptions = mealOptionsRich.map((m) => m.name);
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

  async function mintPlusOne() {
    const name = plusOneName.trim();
    if (!name) return;
    setPlusOneBusy(true);
    try {
      const res = await fetch('/api/rsvp/plus-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          hostGuestName: guestName,
          plusOneName: name,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (data.url) setPlusOneUrl(data.url);
    } catch {} finally {
      setPlusOneBusy(false);
    }
  }

  async function sharePlusOne() {
    if (!plusOneUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `You're invited — ${names.filter(Boolean).join(' & ')}`,
          text: plusOneName ? `Hey ${plusOneName}, you're my +1 — full details inside.` : undefined,
          url: plusOneUrl,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(plusOneUrl);
      setPlusOneCopied(true);
      setTimeout(() => setPlusOneCopied(false), 1800);
    } catch {}
  }

  return (
    <section id="rsvp" style={{ padding: 'clamp(48px, 8vw, 100px) 32px', position: 'relative', overflow: 'hidden' }}>
      <SectionBackground manifest={manifest} sectionId="rsvp" />
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.rsvp} size={32} />
            <Icon name="mail" size={13} /> Kindly respond by {deadlineStr}
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(44px, 7vw, 72px)', margin: 0 }}>
            Will you <span className="display-italic">be there?</span>
          </h2>
        </div>

        <ConfettiBurst active={state === 'success' && going === 'yes'} url={manifest.decorLibrary?.confetti} />

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
            {going === 'yes' && (
              <div
                style={{
                  marginTop: 26,
                  paddingTop: 22,
                  borderTop: '1px dashed rgba(61,74,31,0.25)',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--peach-ink)',
                    marginBottom: 8,
                  }}
                >
                  Bringing someone?
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 12 }}>
                  Send your +1 their own personal invite — opens the site greeted by name with all the details.
                </div>
                {!plusOneUrl ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={plusOneName}
                      onChange={(e) => setPlusOneName(e.target.value)}
                      placeholder="Their name"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--line)',
                        background: 'var(--cream-2)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        color: 'var(--ink)',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={mintPlusOne}
                      disabled={plusOneBusy || !plusOneName.trim()}
                      className="btn btn-primary btn-sm"
                    >
                      {plusOneBusy ? 'Working…' : 'Get their link'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'var(--cream-2)',
                        border: '1px solid var(--line)',
                        fontSize: 12.5,
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        color: 'var(--ink-soft)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {plusOneUrl}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={sharePlusOne} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        {plusOneCopied ? 'Link copied' : (typeof navigator !== 'undefined' && 'share' in navigator) ? `Send to ${plusOneName}` : 'Copy link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPlusOneUrl(null); setPlusOneName(''); }}
                        className="btn btn-outline btn-sm"
                      >
                        Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  {meals.map((d) => {
                    const opt = mealOptionsRich.find((m) => m.name === d);
                    const selected = meal === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setMeal(d)}
                        aria-pressed={selected}
                        style={{
                          padding: '12px 10px',
                          borderRadius: 12,
                          background: selected ? 'var(--ink)' : 'var(--cream-2)',
                          color: selected ? 'var(--cream)' : 'var(--ink)',
                          fontSize: 13,
                          fontWeight: 600,
                          border: selected ? 'none' : '1.5px solid var(--line)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <span>{d}</span>
                        {opt && (
                          <MealBadges
                            dietaryTags={opt.dietaryTags}
                            allergens={opt.allergens}
                            inverted={selected}
                          />
                        )}
                      </button>
                    );
                  })}
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

        {manifest.motifs?.postIt?.text && (
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <PostIt
              tone={(manifest.motifs.postIt.tone as 'sage' | 'peach' | 'lavender' | 'cream' | undefined) ?? 'cream'}
              width={280}
              rotation={manifest.motifs.postIt.rotation ?? 2}
              style={{ display: 'inline-block' }}
            >
              {manifest.motifs.postIt.text}
              {initials && (
                <>
                  <br />
                  <span style={{ fontSize: 16, color: 'var(--ink-muted)' }}>— {initials}</span>
                </>
              )}
            </PostIt>
          </div>
        )}
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

// Event-OS block types that live on manifest.blocks[]. These
// weren't rendered before — hosts could add them in the editor
// but guests never saw them. Now they ship.
const CUSTOM_BLOCK_TYPES = new Set([
  'itinerary',
  'costSplitter',
  'activityVote',
  'toastSignup',
  'adviceWall',
  'tributeWall',
  'obituary',
  'livestream',
  'privacyGate',
  'packingList',
  'program',
  'guestPhotoUpload',
  'voiceToast',
]);

function CustomBlocksRail({ manifest, siteSlug }: { manifest: StoryManifest; siteSlug: string }) {
  const edit = useIsEditMode();
  const blocks = (manifest.blocks ?? []).filter(
    (b): b is PageBlock => Boolean(b) && b.visible !== false && CUSTOM_BLOCK_TYPES.has(b.type)
  );
  if (blocks.length === 0) return null;
  const ordered = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="pl8-custom-blocks">
      {ordered.map((block) => (
        <CustomBlockCase key={block.id} block={block} siteSlug={siteSlug} editMode={edit} />
      ))}
    </div>
  );
}

function CustomBlockCase({ block, siteSlug, editMode }: { block: PageBlock; siteSlug: string; editMode: boolean }) {
  const cfg = (block.config ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof cfg[k] === 'string' ? (cfg[k] as string) : undefined);
  const arr = <T,>(k: string): T[] => (Array.isArray(cfg[k]) ? (cfg[k] as T[]) : []);
  const bg = 'var(--cream-2)';
  const wrap = (node: ReactNode) => (
    <section style={{ background: bg }} data-pl-block={block.type} data-pl-block-id={block.id}>
      {node}
    </section>
  );

  switch (block.type) {
    case 'itinerary': {
      const days = arr<{ label: string; date?: string; slots: { time?: string; title: string; detail?: string; location?: string }[] }>('days');
      if (days.length === 0 && !editMode) return null;
      return wrap(
        <ItineraryBlock
          title={str('title')}
          subtitle={str('subtitle')}
          days={days.length ? days : [{ label: 'Day 1', slots: [] }]}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'costSplitter': {
      const lineItems = arr<{ label: string; amount: number; note?: string }>('lineItems');
      if (lineItems.length === 0 && !editMode) return null;
      return wrap(
        <CostSplitterBlock
          title={str('title')}
          subtitle={str('subtitle')}
          currency={str('currency') ?? 'USD'}
          headcount={typeof cfg.headcount === 'number' ? cfg.headcount : undefined}
          lineItems={lineItems}
          payoutHandle={str('payoutHandle')}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'activityVote': {
      const options = arr<{ id: string; label: string; detail?: string }>('options');
      if (options.length === 0 && !editMode) return null;
      return wrap(
        <ActivityVoteBlock
          title={str('title')}
          subtitle={str('subtitle')}
          question={str('question')}
          storageKey={siteSlug}
          options={options}
          showResults
          siteId={siteSlug}
          blockId={block.id}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'toastSignup': {
      const slots = arr<{ id: string; label: string; detail?: string }>('slots');
      if (slots.length === 0 && !editMode) return null;
      return wrap(
        <ToastSignupBlock
          title={str('title')}
          subtitle={str('subtitle')}
          slots={slots}
          storageKey={siteSlug}
          siteId={siteSlug}
          blockId={block.id}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'adviceWall':
    case 'tributeWall': {
      const rawSeeds = arr<{ id?: string; from?: string; name?: string; body: string; at?: string }>('seeds');
      const seeds = rawSeeds.map((s) => ({ from: s.from ?? s.name ?? 'Anonymous', body: s.body, at: s.at }));
      return wrap(
        <AdviceWallBlock
          title={str('title') ?? (block.type === 'tributeWall' ? 'A tribute wall' : 'Advice for the road ahead')}
          subtitle={str('subtitle')}
          prompt={str('prompt')}
          seeds={seeds}
          storageKey={siteSlug}
          siteId={siteSlug}
          blockId={block.id}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'obituary': {
      const body = str('body');
      if (!body && !editMode) return null;
      return wrap(
        <ObituaryBlock
          name={str('name') ?? ''}
          dates={str('dates')}
          photoUrl={str('photoUrl')}
          body={body ?? ''}
          inMemoryOf={str('inMemoryOf')}
          accent="var(--peach-ink)"
        />
      );
    }
    case 'livestream': {
      const url = str('url');
      if (!url && !editMode) return null;
      return wrap(
        <LivestreamBlock
          title={str('title')}
          subtitle={str('subtitle')}
          startsAt={str('startsAt')}
          url={url ?? ''}
          buttonLabel={str('buttonLabel')}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'privacyGate': {
      return wrap(
        <PrivacyGateBlock
          title={str('title')}
          subtitle={str('subtitle')}
          body={str('body')}
          rules={arr<string>('rules')}
          contact={str('contact')}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'packingList': {
      const items = arr<{ id: string; label: string; category?: string }>('items');
      if (items.length === 0 && !editMode) return null;
      return wrap(
        <PackingListBlock
          title={str('title')}
          subtitle={str('subtitle')}
          items={items}
          storageKey={siteSlug}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'program': {
      const items = arr<{ id: string; time?: string; title: string; detail?: string }>('items');
      if (items.length === 0 && !editMode) return null;
      return wrap(
        <ProgramBlock
          title={str('title')}
          subtitle={str('subtitle')}
          items={items}
          accent="var(--sage-deep)"
        />
      );
    }
    case 'guestPhotoUpload': {
      return wrap(
        <div style={{ padding: 'clamp(40px, 6vw, 72px) 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: '0 0 8px' }}>
                {str('title') ?? 'Share your photos'}
              </h2>
              {(str('subtitle') ?? '') && (
                <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
                  {str('subtitle')}
                </p>
              )}
            </div>
            <GuestPhotoUploader siteSlug={siteSlug} />
          </div>
        </div>
      );
    }
    case 'voiceToast': {
      return wrap(
        <div style={{ padding: 'clamp(40px, 6vw, 72px) 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: '0 0 8px' }}>
                {str('title') ?? 'Send a voice toast'}
              </h2>
              {(str('subtitle') ?? '') && (
                <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
                  {str('subtitle')}
                </p>
              )}
            </div>
            <VoiceToastRecorder
              siteSlug={siteSlug}
              maxSeconds={typeof cfg.maxSeconds === 'number' ? (cfg.maxSeconds as number) : 30}
            />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

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
  // Memoize context value so every EditableText doesn't re-render on
  // every unrelated manifest change. The context value shape is tiny
  // (one boolean), so a stable reference is cheap and meaningful.
  const canvasCtxValue = useMemo(() => ({ editMode }), [editMode]);

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
      case 'story': {
        if (chapters.length === 0 && !editMode) return null;
        // Honour the template's declared layoutFormat so each template
        // ships with its own story treatment (filmstrip, magazine,
        // bento, kenburns, parallax) instead of every site looking
        // the same as the timeline default.
        const layout =
          (manifest.storyLayout as string | undefined) ??
          (manifest.layoutFormat as string | undefined) ??
          'timeline';
        if (layout === 'timeline' || !layout) {
          return <TimelineSection key="story" chapters={chapters} onEditField={onEditField} manifest={manifest} />;
        }
        return <StoryVariantSection key="story" chapters={chapters} layout={layout} manifest={manifest} />;
      }
      case 'details':
        return <DetailsStrip key="details" manifest={manifest} />;
      case 'schedule':
        return <ScheduleSection key="schedule" manifest={manifest} names={names} onEditField={onEditField} />;
      case 'travel':
        return <TravelSection key="travel" manifest={manifest} onEditField={onEditField} />;
      case 'registry':
        return <RegistrySection key="registry" manifest={manifest} />;
      case 'gallery':
        return <GallerySection key="gallery" chapters={chapters} manifest={manifest} />;
      case 'faq':
        return <FaqSection key="faq" manifest={manifest} onEditField={onEditField} />;
      case 'rsvp':
        return <RSVPSection key="rsvp" names={names} manifest={manifest} siteSlug={siteSlug} />;
      default:
        return null;
    }
  };

  // Template theme colors → CSS var overrides. Each site reads its
  // own manifest.theme.colors (seeded by applyTemplateToManifest)
  // and overrides the v8 base palette in-scope so the hero strip,
  // eyebrows, and card surfaces take on the template's actual look.
  const themeColors = (manifest as unknown as {
    theme?: { colors?: { background?: string; foreground?: string; accent?: string; accentLight?: string; muted?: string; cardBg?: string } };
  }).theme?.colors;
  const themeFonts = (manifest as unknown as {
    theme?: { fonts?: { heading?: string; body?: string; script?: string } };
  }).theme?.fonts;
  // Bug fix 2026-04-25: ensure the published site loads any Google
  // Fonts the host picked in the editor. Previously only the editor's
  // FontPicker injected these <link> tags on demand — so picking
  // "Allura" or "Cormorant Garamond" looked right in the canvas but
  // fell back to default Fraunces on /sites/[domain] because the
  // typeface was never loaded. Now we inject them in both contexts.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fonts = [themeFonts?.heading, themeFonts?.body, themeFonts?.script].filter(
      (f): f is string => Boolean(f),
    );
    for (const font of fonts) {
      // Skip already-loaded fonts (FontPicker dedups via [data-pl-font]
      // and pearloom.css globally imports Fraunces/Caveat/Inter).
      if (font === 'Fraunces' || font === 'Caveat' || font === 'Inter') continue;
      if (document.querySelector(`link[data-pl-font="${font}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      // Use the same Google Fonts URL builder logic as the editor.
      const family = font.replace(/\s+/g, '+');
      link.href = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap`;
      link.dataset.plFont = font;
      document.head.appendChild(link);
    }
  }, [themeFonts?.heading, themeFonts?.body, themeFonts?.script]);
  const themeStyle: React.CSSProperties = themeColors
    ? ({
        background: 'var(--paper)',
        minHeight: '100vh',
        // Surfaces
        ['--paper' as string]: themeColors.background ?? undefined,
        ['--cream' as string]: themeColors.background ?? undefined,
        ['--cream-2' as string]: themeColors.cardBg ?? themeColors.background ?? undefined,
        ['--card' as string]: themeColors.cardBg ?? themeColors.background ?? undefined,
        // Ink
        ['--ink' as string]: themeColors.foreground ?? undefined,
        ['--ink-soft' as string]: themeColors.muted ?? undefined,
        ['--ink-muted' as string]: themeColors.muted ?? undefined,
        // Lines
        ['--card-ring' as string]: themeColors.accentLight ?? undefined,
        ['--line' as string]: themeColors.accentLight ?? undefined,
        ['--line-soft' as string]: themeColors.accentLight ?? undefined,
        // Primary accent — drives eyebrows, CTAs, current-state highlights
        ['--peach-ink' as string]: themeColors.accent ?? undefined,
        ['--peach-bg' as string]: themeColors.accentLight ?? undefined,
        ['--peach-2' as string]: themeColors.accent ?? undefined,
        // Keep motif tones (sage/lavender/dusk) intact so each card
        // band still reads distinctly.
        ...(themeFonts?.heading ? { ['--font-display' as string]: `"${themeFonts.heading}", Georgia, serif` } : {}),
        ...(themeFonts?.body ? { ['--font-sans' as string]: `"${themeFonts.body}", system-ui, -apple-system, sans-serif` } : {}),
      })
    : { background: 'var(--paper)', minHeight: '100vh' };

  const dividerUrl = manifest.decorLibrary?.divider;
  const dividerStrength = (manifest as unknown as { decorLibrary?: { dividerStrength?: 'subtle' | 'standard' | 'tall' } })
    .decorLibrary?.dividerStrength ?? 'standard';
  const bouquetUrl = manifest.decorLibrary?.footerBouquet;

  return (
    <EditorCanvasProvider value={canvasCtxValue}>
      <div className="pl8-guest" style={themeStyle}>
        {!editMode && <BroadcastBar subdomain={siteSlug} />}
        {!editMode && <PersonalGuestGreeting domain={siteSlug} />}
        <EventNav names={names} hasRsvp={hasRsvp} />
        <StickerLayer
          blockId="hero"
          stickers={manifest.stickers}
          onEditField={onEditField}
        >
          <HeroSection names={names} manifest={manifest} siteSlug={siteSlug} onEditField={onEditField} onEditNames={onEditNames} />
        </StickerLayer>
        {blockOrder.map((key, i) => {
          // Honour per-block hidden flag from manifest.blockStyles.
          // Map editor block keys to the section IDs the override
          // panel writes to ('story' → 'our-story').
          const sectionId = key === 'story' ? 'our-story' : key;
          if (isBlockHidden(manifest, sectionId)) return null;
          const block = renderBlock(key);
          if (!block) return null;
          // Per-divider visibility: host can hide the divider above
          // any specific section via manifest.decorVisibility.
          const decorVis = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility;
          const dividerHidden = decorVis?.[`divider-${key}`] === false;
          return (
            <div key={key}>
              <DecorDivider
                url={dividerUrl}
                index={i}
                strength={dividerStrength}
                hidden={dividerHidden}
              />
              <StickerLayer
                blockId={key}
                stickers={manifest.stickers}
                onEditField={onEditField}
              >
                {block}
              </StickerLayer>
            </div>
          );
        })}
        <CustomBlocksRail manifest={manifest} siteSlug={siteSlug} />
        <FooterBouquet url={bouquetUrl} />
        <SiteFooter names={names} prettyUrl={prettyUrl} />
        {/* Guest-side helpers — only on the published site, never in the editor.
            Each is independently dismissable / mobile-aware. */}
        {!editMode && (
          <>
            <ScrollReveal />
            <ScrollSpy sections={['top', 'our-story', 'schedule', 'travel', 'registry', 'gallery', 'faq', 'rsvp']} />
            <FloatingCountdown manifest={manifest} />
            <StickyMobileCta
              deadline={
                manifest.logistics?.rsvpDeadline
                  ? new Date(manifest.logistics.rsvpDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : null
              }
            />
            <AskPearFloater domain={siteSlug} manifest={manifest} names={names} />
            <LiveWallDiscover subdomain={siteSlug} />
            {/* Optional ambient audio — opt-in only, off by default.
                Host enables it in the editor and the loop URL must
                be set on manifest.atmosphere.audio. */}
            {(() => {
              const a = (manifest as unknown as {
                atmosphere?: {
                  audio?: { url?: string; label?: string; enabled?: boolean; preset?: string }
                }
              }).atmosphere?.audio;
              if (!a?.enabled) return null;
              if (!a.url && !a.preset) return null;
              return (
                <AmbientAudio
                  preset={a.preset as 'cafe' | 'fireplace' | 'brook' | 'chapel' | 'ocean' | undefined}
                  url={a.url}
                  label={a.label}
                  storageKey={`pearloom-ambient:${siteSlug}`}
                />
              );
            })()}
          </>
        )}
      </div>
    </EditorCanvasProvider>
  );
}
