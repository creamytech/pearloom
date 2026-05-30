'use client';

/* ========================================================================
   PEARLOOM — PUBLISHED EVENT SITE (v8 handoff port)
   Data-driven: reads a StoryManifest + couple names and emits the
   "Alex & Jamie" layout from the handoff mockup.
   ======================================================================== */

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StoryManifest, Chapter } from '@/types';
import { parseLocalDate } from '@/lib/date-utils';
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
import { CanvasBulkActionBar } from '../editor/canvas/CanvasBulkActionBar';
import { terminologyFor } from '@/lib/event-terminology';
import { sunriseSunsetFor } from '@/lib/sunset';
import { stableHotelId } from '@/lib/hotel-id';
import { CustomBadgePill as SectionCustomBadge } from '@/components/pearloom/editor/panels/BadgesEditor';
import { EditableText } from '../editor/canvas/EditableText';
import { EditableField } from '../editor/canvas/EditableField';
import { SortableBlockList } from '../editor/canvas/CanvasBlockSortable';
import { DraftedByPearBanner } from '../editor/DraftedByPearBanner';
import { SortableChapters } from '../editor/canvas/SortableChapters';
import { HoverToolbar } from '../editor/canvas/HoverToolbar';
import { PhotoDropTarget } from '../editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '../editor/canvas/PhotoActionMenu';
import { OccasionDecor } from './OccasionDecor';
import { OwnerEditPill } from './OwnerEditPill';
import { BroadcastBar } from './BroadcastBar';
import { DayOfBanner } from './DayOfBanner';
import { GuestPearChat } from './GuestPearChat';
import { LiveNowHero } from './LiveNowHero';
import { DayOfBroadcastDock } from './DayOfBroadcastDock';
import { computeDayOfState } from '@/lib/day-of/state';
import { DecorDivider } from './DecorDivider';
import { DecorEditOverlay } from '../editor/canvas/DecorEditOverlay';
import { LivingAtmosphere, defaultAtmosphereForOccasion, type AtmosphereKind, type AtmosphereIntensity } from './LivingAtmosphere';
import { AmbientAudio } from './AmbientAudio';
import { useHeroParallax } from './useHeroParallax';
import { SectionBackground } from './SectionBackground';
import { ScrollReveal } from './ScrollReveal';
import { isBlockHidden, BlockStyleWrapper } from './BlockStyleWrapper';
import { TemplateSignatureDecor, type SignatureDecorKind } from './TemplateSignatureDecor';
import { NavBrandIcon } from './NavBrandIcon';
import { inkFamilyForBackground, parseAnyColorToHex, luminance as wcagLuminance, pickInkForBackground } from '@/lib/color-utils';
import { resolveStoryLayout } from '@/components/blocks/StoryLayouts';
// Side-effect imports — register all variant types with the
// block-style registry before any dispatcher reads from it.
import { HERO_VARIANTS_REGISTERED } from './hero-variants';
import { STORY_VARIANTS_REGISTERED } from './story-variants';
import { SCHEDULE_VARIANTS_REGISTERED } from './schedule-variants';
import { GALLERY_VARIANTS_REGISTERED } from './gallery-variants';
import { getBlockStyle, getBlockStyles } from '@/lib/block-engine/block-styles';
import { resolveEdition, type EditionContext } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';
import type { SiteOccasion } from '@/lib/site-urls';
import { EditionDivider } from './edition-dividers';
void HERO_VARIANTS_REGISTERED;
void STORY_VARIANTS_REGISTERED;
void SCHEDULE_VARIANTS_REGISTERED;
void GALLERY_VARIANTS_REGISTERED;
import {
  CalendarAddButton,
  SaveContactButton,
  StickyMobileCta,
  OpenInMapsButton,
  PersonalGuestGreeting,
} from './GuestKit';
import {
  PhotoLightbox,
  usePhotoLightbox,
  TimeZoneCountdown,
  ScrollSpy,
  LiveWallDiscover,
  GuestPhotoUploader,
  VoiceToastRecorder,
} from './GuestKit2';
import { CanvasSortable, CanvasGripHandle } from './canvas-sortable';
import { WeatherStrip } from './WeatherStrip';
import { ReadingProgress } from './ReadingProgress';
import { BackToTop } from './BackToTop';
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
import { RegistryItemsBlock } from '@/components/site/RegistryItemsBlock';
import { CashGiftBlock } from '@/components/site/CashGiftBlock';
import { SpotifySection } from '@/components/site/SpotifySection';
import { Guestbook } from '@/components/guestbook';
import {
  type SiteMode,
  type SiteBlockKey,
  DEFAULT_BLOCK_ORDER as DEFAULT_ORDER,
  DEFAULT_HOME_BLOCKS,
  MULTI_PAGE_BLOCKS,
  BLOCK_PAGE_SLUG,
  readSiteMode,
  readHomePageBlocks,
} from '@/lib/site-mode';
import type { PageBlock } from '@/types';

// Callback passed down for inline edits. Parent (CanvasStage)
// owns the manifest and wires each field edit back.
type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

// ──────────────────────────────────────────────────────────────
// Block-level memoization.
//
// SiteV8Renderer is a 3.6k-line tree that re-renders whenever the
// manifest reference changes — and writePath now uses Immer, so
// every edit produces a new manifest top-level ref. Without
// memoization, typing a single character into the hero tagline
// re-renders the timeline, gallery, schedule, RSVP, and FAQ
// sections too.
//
// The trick: Immer gives us *structural sharing*. If you edit
// manifest.poetry.heroTagline, manifest.chapters, manifest.theme,
// manifest.events, etc. all keep their previous reference. So a
// per-section memo comparator can drill into the slices that
// section actually consumes and bail out when none of them
// changed — even though the manifest top-level ref is new.
//
// The comparators below are conservative on purpose: each lists a
// superset of slices the section reads (directly or via children
// like SectionBackground / SectionStamp). When in doubt, add the
// slice — the cost of a missed bail-out is a wasted render, the
// cost of a missing slice is a stale UI.
// ──────────────────────────────────────────────────────────────

/**
 * Compare two manifests by a fixed list of top-level slice names.
 * Returns true iff every named slice keeps reference equality.
 * Relies on Immer structural sharing for siblings to stay stable.
 */
function manifestSlicesEqual(
  a: StoryManifest | undefined,
  b: StoryManifest | undefined,
  keys: ReadonlyArray<keyof StoryManifest>,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// Slices every section reads via shared chrome (SectionBackground,
// SectionStamp, BlockStyleWrapper, decor visibility, theme).
const COMMON_CHROME_KEYS = [
  'theme',
  'sectionBackgrounds',
  'blockStyles',
  'decorLibrary',
  'decorVisibility',
  'blockVariants',
  'storyLayout',
  'layoutFormat',
] as unknown as ReadonlyArray<keyof StoryManifest>;

type Tone = 'warm' | 'field' | 'dusk' | 'lavender' | 'peach' | 'sage' | 'cream';

const CHAPTER_TONES: Tone[] = ['lavender', 'sage', 'peach', 'cream', 'lavender', 'peach'];

/**
 * Click a structured row on the canvas (hotel, FAQ, schedule
 * event, registry entry) → land in the matching editor panel
 * with the row scrolled into view. Without this, the focus-row
 * event lands on a panel that isn't even mounted (host was on
 * "Hero" or "Details") and the click looks dead.
 *
 * Pattern: dispatch design-jump first to switch the active
 * block; defer the focus-row event 80ms so the panel has time
 * to mount before we ask it to scroll.
 */
function jumpToPanelRow(block: 'travel' | 'faq' | 'schedule' | 'registry', focusEvent: string, detail: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block } }));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(focusEvent, { detail }));
  }, 80);
}

function fmtEventDate(
  iso?: string | null,
  format?: 'long' | 'short' | 'numeric' | 'iso' | 'month-year',
  timezone?: string,
): { pretty: string; weekday: string } | null {
  const d = parseLocalDate(iso);
  if (!d) return null;
  const tz = timezone || undefined;
  let pretty: string;
  switch (format) {
    case 'short':
      pretty = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: tz });
      break;
    case 'numeric':
      pretty = d.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: tz });
      break;
    case 'iso':
      // YYYY-MM-DD anchored to the chosen zone — Intl.DateTimeFormat
      // doesn't expose ISO directly, so format parts and assemble.
      {
        const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(d);
        pretty = parts;
      }
      break;
    case 'month-year':
      pretty = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: tz });
      break;
    case 'long':
    default:
      pretty = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: tz });
  }
  return {
    pretty,
    weekday: d.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz }),
  };
}

function useCountdown(iso?: string | null, timezone?: string, time?: string) {
  return useMemo(() => {
    const d = parseLocalDate(iso);
    if (!d) return null;
    // If the host set a timezone *and* a time, anchor the target on
    // that wall-clock + zone (e.g., 4pm Eastern). Without a zone we
    // keep the historical behaviour of using the viewer's local
    // midnight, which is what useCountdown has always done.
    let target = d.getTime();
    if (timezone && time && /^\d{2}:\d{2}/.test(time)) {
      const [hh, mm] = time.split(':').map(Number);
      // Round-trip via Date.UTC then offset by the zone offset for
      // that specific instant. Intl.DateTimeFormat tells us what the
      // zone's offset is at that wall-clock; we subtract it from a
      // UTC-coded version of the same wall-clock to get the real ms.
      const utcWall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, 0, 0);
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
          timeZoneName: 'shortOffset',
        });
        const parts = fmt.formatToParts(new Date(utcWall));
        const offPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0';
        const m = /GMT([+-])(\d+)(?::(\d+))?/.exec(offPart);
        if (m) {
          const sign = m[1] === '-' ? -1 : 1;
          const offHrs = Number(m[2]);
          const offMin = m[3] ? Number(m[3]) : 0;
          const offsetMs = sign * (offHrs * 60 + offMin) * 60_000;
          target = utcWall - offsetMs;
        }
      } catch { /* fall through to date-only target */ }
    }
    if (Number.isNaN(target)) return null;
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return null;
    const days = Math.floor(diffMs / 86_400_000);
    const hrs = Math.floor((diffMs % 86_400_000) / 3_600_000);
    const min = Math.floor((diffMs % 3_600_000) / 60_000);
    return { days, hrs, min };
  }, [iso, timezone, time]);
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
        className="pl8-lang-switcher"
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
        {/* On phone the label drops — globe icon is enough.
            Translating state still surfaces a tiny "…" so guests
            know it's working. */}
        <span className="pl8-lang-label">
          {working ? 'Translating…' : currentLabel}
        </span>
        {working && <span className="pl8-lang-dot" aria-hidden>…</span>}
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

interface NavLink {
  label: string;
  href: string;
}

interface NavBodyProps {
  navStyle: string;
  scrolled: boolean;
  coupleLabel: string;
  links: NavLink[];
  hasRsvp: boolean;
  rsvpHref: string;
  brandHref: string;
  manifest: StoryManifest;
}

const NAV_LINK_STYLE: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--nav-ink-soft, var(--ink-soft))',
  fontWeight: 500,
  textDecoration: 'none',
  position: 'relative',
  paddingBottom: 4,
  transition: 'color 220ms ease',
};

function NavLinks({ links, gap = 22 }: { links: NavLink[]; gap?: number }) {
  return (
    <nav style={{ display: 'flex', gap, alignItems: 'center' }} className="pl8-site-nav-links">
      {links.map((l) => (
        <a key={l.label} href={l.href} style={NAV_LINK_STYLE}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}

function NavBrand({ manifest, label, size, href }: { manifest: StoryManifest; label: string; size: number; href: string }) {
  return (
    <a
      href={href}
      className="pl8-site-nav-brand"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none',
        transition: 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(-2deg) translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <NavBrandIcon manifest={manifest} size={size} />
      <span className="display-italic" style={{ fontSize: 22, color: 'var(--nav-ink, var(--ink))' }}>
        {label}
      </span>
    </a>
  );
}

function NavBody({ navStyle, scrolled, coupleLabel, links, hasRsvp, rsvpHref, brandHref, manifest }: NavBodyProps) {
  const innerPadding = scrolled ? '10px 32px' : '14px 32px';

  // ── Centered: brand centered, links split left/right around it. ──
  if (navStyle === 'centered') {
    const half = Math.ceil(links.length / 2);
    const left = links.slice(0, half);
    const right = links.slice(half);
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 28, transition: 'padding 380ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <NavLinks links={left} gap={22} />
        <NavBrand manifest={manifest} label={coupleLabel} size={28} href={brandHref} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18 }}>
          <NavLinks links={right} gap={22} />
          <LanguageSwitcher />
          {hasRsvp && (
            <a href={rsvpHref} className="btn btn-primary btn-sm pl8-btn-sheen pl8-nav-rsvp">
              RSVP <Icon name="arrow-right" size={12} />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Minimal: brand only, no inline links. Tight, magazine-cover. ──
  if (navStyle === 'minimal') {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, transition: 'padding 380ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <NavBrand manifest={manifest} label={coupleLabel} size={26} href={brandHref} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LanguageSwitcher />
          {hasRsvp && (
            <a href={rsvpHref} className="btn btn-primary btn-sm pl8-btn-sheen pl8-nav-rsvp">
              RSVP <Icon name="arrow-right" size={12} />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Stacked: brand on its own row, links underneath. Editorial. ──
  if (navStyle === 'stacked') {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'flex', flexDirection: 'column', gap: 8, transition: 'padding 380ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavBrand manifest={manifest} label={coupleLabel} size={32} href={brandHref} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LanguageSwitcher />
            {hasRsvp && (
              <a href={rsvpHref} className="btn btn-primary btn-sm pl8-btn-sheen">
                RSVP <Icon name="arrow-right" size={12} />
              </a>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--nav-divider, rgba(61,74,31,0.08))', paddingTop: 8 }}>
          <NavLinks links={links} gap={26} />
        </div>
      </div>
    );
  }

  // ── Classic (default): brand left, links right, RSVP at end. ──
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'flex', alignItems: 'center', gap: 28, transition: 'padding 380ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
      <NavBrand manifest={manifest} label={coupleLabel} size={28} href={brandHref} />
      <div style={{ marginLeft: 'auto' }}>
        <NavLinks links={links} gap={22} />
      </div>
      <LanguageSwitcher />
      {hasRsvp && (
        <a href={rsvpHref} className="btn btn-primary btn-sm pl8-btn-sheen">
          RSVP <Icon name="arrow-right" size={12} />
        </a>
      )}
    </div>
  );
}

/* ==================== DAY-OF HOST BROADCAST WRAPPER ====================
   Owner-only floating dock for sending day-of broadcasts (push +
   announcement). Mirrors OwnerEditPill's session-vs-creator-email
   check so the dock only renders when the signed-in user is the
   site host. */
function DayOfHostBroadcastWrapper({
  siteSlug,
  creatorEmail,
}: {
  siteSlug: string;
  creatorEmail: string;
}) {
  const [isHost, setIsHost] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { user?: { email?: string } } | null) => {
        if (cancelled) return;
        if (data?.user?.email && data.user.email.toLowerCase() === creatorEmail.toLowerCase()) {
          setIsHost(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [creatorEmail]);
  if (!isHost) return null;
  return <DayOfBroadcastDock siteSlug={siteSlug} />;
}

/* ==================== SUB-PAGE HEADER ====================
   Shown above the single section on multi-page sub-routes.
   Editorial breadcrumb + display title + couple kicker — keeps the
   visual continuity of the home page without forcing a full hero. */
function SubPageHeader({
  blockKey,
  manifest,
  names,
  basePath,
}: {
  blockKey: SiteBlockKey;
  manifest: StoryManifest;
  names: [string, string];
  basePath: string;
}) {
  const SUB_PAGE_TITLES: Record<SiteBlockKey, { title: string; kicker: string }> = {
    story: { title: 'Our Story', kicker: 'How we got here' },
    details: { title: 'The Details', kicker: 'Save the date' },
    schedule: { title: 'The Schedule', kicker: 'The flow of the day' },
    travel: { title: 'Travel', kicker: 'Hotels, airports, directions' },
    registry: { title: 'Registry', kicker: 'Your presence is the gift' },
    gallery: { title: 'Gallery', kicker: 'A few of our favourites' },
    faq: { title: 'Questions & Answers', kicker: 'Everything else' },
    rsvp: { title: 'RSVP', kicker: 'Will you join us?' },
  };
  const meta = SUB_PAGE_TITLES[blockKey];
  const coupleLabel = names.filter(Boolean).join(' & ');
  const accentSymbol =
    (manifest as unknown as { vibeSkin?: { accentSymbol?: string } }).vibeSkin?.accentSymbol || '✦';
  return (
    <section
      style={{
        padding: '5.5rem 2rem 3rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--line, rgba(14,13,11,0.08))',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12.5, letterSpacing: '0.02em' }}>
            <li>
              <a href={basePath} style={{ color: 'var(--peach-ink, #C6703D)', textDecoration: 'none', fontWeight: 600 }}>
                Home
              </a>
            </li>
            <li aria-hidden="true" style={{ color: 'var(--ink-muted)', opacity: 0.5 }}>·</li>
            <li aria-current="page" style={{ color: 'var(--ink-muted)' }}>{meta.title}</li>
          </ol>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: 18 }}>
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'var(--peach-ink, #C6703D)', opacity: 0.3 }} />
          <span style={{ fontSize: 14, color: 'var(--peach-ink, #C6703D)', opacity: 0.65 }}>{accentSymbol}</span>
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'var(--peach-ink, #C6703D)', opacity: 0.3 }} />
        </div>
        <h1
          className="display-italic"
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: '0 0 12px',
            lineHeight: 1.05,
          }}
        >
          {meta.title}
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 15, fontStyle: 'italic', margin: 0 }}>
          {meta.kicker}
        </p>
        {coupleLabel && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: 24 }}>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'var(--peach-ink, #C6703D)', opacity: 0.25 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)', opacity: 0.55 }}>
              {coupleLabel}
            </span>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'var(--peach-ink, #C6703D)', opacity: 0.25 }} />
          </div>
        )}
      </div>
    </section>
  );
}

function EventNav({ names, hasRsvp, manifest, siteSlug, basePath, siteMode, homePageBlocks, pageFilter }: {
  names: [string, string];
  hasRsvp: boolean;
  manifest: StoryManifest;
  siteSlug: string;
  basePath: string;
  siteMode: SiteMode;
  homePageBlocks: SiteBlockKey[];
  pageFilter?: SiteBlockKey | 'home';
}) {
  // Build the link set. In scroll mode every link is an anchor on the
  // current page. In multi-page mode, blocks rendered on home stay as
  // anchors but route to the home path; blocks promoted to their own
  // page route to /{basePath}/{slug}. From a sub-page, anchors target
  // the home path with the hash so guests don't get stuck.
  const NAV_BLOCKS: Array<{ key: SiteBlockKey; label: string; anchor: string }> = [
    { key: 'story', label: 'Our Story', anchor: 'our-story' },
    { key: 'details', label: 'Details', anchor: 'details' },
    { key: 'schedule', label: 'Schedule', anchor: 'schedule' },
    { key: 'travel', label: 'Travel', anchor: 'travel' },
    { key: 'registry', label: 'Registry', anchor: 'registry' },
    { key: 'gallery', label: 'Gallery', anchor: 'gallery' },
  ];
  const onSubPage = pageFilter && pageFilter !== 'home';
  const homeBlockSet = new Set<SiteBlockKey>(homePageBlocks);
  const links: NavLink[] = NAV_BLOCKS.map(({ key, label, anchor }) => {
    if (siteMode === 'multi-page') {
      const onHome = key === 'details' || homeBlockSet.has(key);
      if (onHome) {
        // Anchor on the home page. From a sub-page, prefix with basePath.
        return { label, href: `${basePath}#${anchor}` };
      }
      return { label, href: `${basePath}/${BLOCK_PAGE_SLUG[key]}` };
    }
    // Scroll mode: anchor on current page (or basePath when on a sub
    // route that still wants to target home — uncommon but safe).
    return { label, href: onSubPage ? `${basePath}#${anchor}` : `#${anchor}` };
  });
  const rsvpHref = siteMode === 'multi-page'
    ? `${basePath}/rsvp`
    : (onSubPage ? `${basePath}#rsvp` : '#rsvp');
  const brandHref = onSubPage || siteMode === 'multi-page' ? basePath : '#top';

  void siteSlug; // reserved for future analytics hooks
  const coupleLabel = names.filter(Boolean).join(' & ') || 'Our celebration';
  const [scrolled, setScrolled] = useState(false);
  const navStyle = manifest.nav?.style ?? 'classic';
  // Per-host motion overrides set in NavPanel → manifest.navStyle.
  // Defaults match the pre-config behaviour exactly.
  const navMotion = (manifest as unknown as {
    navStyle?: {
      shrinkOnScroll?: 'off' | 'subtle' | 'compact';
      linkUnderline?: 'static' | 'hover' | 'active' | 'none';
      brandHover?: 'none' | 'pulse' | 'tilt' | 'breathe';
      blurOnScroll?: boolean;
    };
  }).navStyle ?? {};
  const shrinkMode = navMotion.shrinkOnScroll ?? 'off';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Smart contrast: read the theme's page background and pick a
  // matching ink family + nav surface. Dark themes get a warm-dark
  // translucent header with cream text + dividers; light themes
  // keep the cream paper look. Falls back to v8 cream defaults
  // when the theme bg can't be parsed.
  const themeBg = (manifest as unknown as { theme?: { colors?: { background?: string } } }).theme?.colors?.background;
  const ink = inkFamilyForBackground(themeBg);
  const bgHex = parseAnyColorToHex(themeBg);
  const bgLum = bgHex ? wcagLuminance(bgHex) : null;
  const isDarkTheme = bgLum !== null && bgLum <= 0.45;
  const navSurfaceTop = isDarkTheme
    ? 'rgba(14, 13, 11, 0.42)'
    : 'rgba(247, 242, 228, 0.78)';
  const navSurfaceScrolled = isDarkTheme
    ? 'rgba(14, 13, 11, 0.78)'
    : 'rgba(247, 242, 228, 0.96)';
  const navBorder = isDarkTheme
    ? 'rgba(251, 247, 238, 0.14)'
    : 'rgba(61,74,31,0.10)';

  const cssVars: React.CSSProperties & Record<string, string> = {
    '--nav-ink': ink.ink,
    '--nav-ink-soft': ink.inkSoft,
    '--nav-ink-muted': ink.inkMuted,
    '--nav-divider': ink.divider,
  } as React.CSSProperties & Record<string, string>;

  // Shrink-on-scroll: scale the nav down once the host scrolled
  // past the hero. 'subtle' = 92% scale + slight padding cut;
  // 'compact' = 80% scale + tighter padding.
  const shrinkScale = shrinkMode === 'compact' ? 0.86 : shrinkMode === 'subtle' ? 0.94 : 1;
  // Frosted-on-scroll opt-in. When off, scrolled state still
  // tightens the surface but doesn't lean into the heavy blur.
  const blurAmount = navMotion.blurOnScroll
    ? (scrolled ? 'blur(22px) saturate(170%)' : 'blur(14px) saturate(140%)')
    : (scrolled ? 'blur(18px) saturate(160%)' : 'blur(12px) saturate(140%)');

  return (
    <header
      className={`pl8-site-nav${scrolled ? ' pl8-site-nav-scrolled' : ''}`}
      data-pl-link-underline={navMotion.linkUnderline ?? 'static'}
      data-pl-brand-hover={navMotion.brandHover ?? 'none'}
      style={{
        ...cssVars,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: scrolled ? navSurfaceScrolled : navSurfaceTop,
        backdropFilter: blurAmount,
        WebkitBackdropFilter: blurAmount,
        borderBottom: scrolled ? `1px solid ${navBorder}` : '1px solid transparent',
        boxShadow: scrolled ? '0 8px 24px -16px rgba(14,13,11,0.18)' : 'none',
        transformOrigin: 'top center',
        transform: scrolled && shrinkMode !== 'off' ? `scaleY(${shrinkScale})` : undefined,
        transition:
          'background 380ms cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 380ms cubic-bezier(0.22, 1, 0.36, 1), border-color 380ms ease, box-shadow 380ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <NavBody
        navStyle={navStyle}
        scrolled={scrolled}
        coupleLabel={coupleLabel}
        links={links}
        hasRsvp={hasRsvp}
        rsvpHref={rsvpHref}
        brandHref={brandHref}
        manifest={manifest}
      />
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
function CountdownDisplay({ eventDate, timezone, time }: { eventDate?: string | null; timezone?: string; time?: string }) {
  const c = useCountdown(eventDate, timezone, time);
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
function CountdownPill({ eventDate, timezone, time }: { eventDate?: string | null; timezone?: string; time?: string }) {
  const c = useCountdown(eventDate, timezone, time);
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

/* Derives the EditionContext from a manifest so the resolver can
 * pick the active Edition. occasion + voice are loose enough that
 * the resolver tolerates undefined for both. Voice is looked up via
 * the EVENT_TYPES registry — single source of truth for tone. */
function editionContextFromManifest(manifest: StoryManifest): EditionContext {
  const occasion = (manifest as unknown as { occasion?: string }).occasion as SiteOccasion | undefined;
  const eventType = occasion ? getEventType(occasion) : null;
  return {
    edition: manifest.edition,
    occasion,
    voice: eventType?.voice,
  };
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
  const dateInfo = fmtEventDate(manifest.logistics?.date, manifest.dateFormat, manifest.logistics?.timezone);
  const venue = manifest.logistics?.venue ?? '';
  const rsvpDeadline = manifest.logistics?.rsvpDeadline;
  // parseLocalDate dodges the UTC midnight off-by-one — bare
  // YYYY-MM-DD parses as local midnight so an Aug 1 deadline
  // doesn't display as "July 31" in PT.
  const deadlineDate = parseLocalDate(rsvpDeadline);
  const deadlineStr = deadlineDate ? deadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null;
  const heroCopy =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ??
    "We'd love you there. Come celebrate with us — the day will be better for it.";
  const coverPhoto = manifest.coverPhoto;
  const photos = manifest.heroSlideshow ?? (manifest.chapters?.flatMap((c) => (c.images ?? []).slice(0, 1).map((i) => i.url)) ?? []);

  // Decor mode — 'occasion' (per-event shape library),
  // 'classic' (the original v8 blobs + squiggles, for templates
  // that ship that look), or 'off' (clean hero).
  const occasionRaw = (manifest as unknown as { occasion?: string }).occasion;
  const signatureDecorKind = (manifest as unknown as { signatureDecor?: string }).signatureDecor;
  // When a SITE_TEMPLATE ships a per-template signatureDecor (citrus
  // for Lake Como, monolith for Marfa, brushstroke for Tokyo, etc.),
  // suppress the generic OccasionDecor rings — the bespoke illustration
  // is the template's identity, the rings would just clutter it.
  const decorMode =
    ((manifest as unknown as { decorStyle?: 'classic' | 'occasion' | 'off' }).decorStyle) ??
    (signatureDecorKind && signatureDecorKind !== 'none' ? 'off' : 'occasion');

  // Living atmosphere — animated background layer. Resolution
  // order: explicit manifest.atmosphere > active Edition preset >
  // occasion default > 'standard'. Editions are read-time defaults
  // so a host who set an explicit atmosphere keeps it.
  const atmosphereCfg = (manifest as unknown as {
    atmosphere?: { kind?: string; intensity?: string; sections?: string[]; accent?: string }
  }).atmosphere;
  const heroEdition = resolveEdition(editionContextFromManifest(manifest));
  const atmosphereKind = (atmosphereCfg?.kind as AtmosphereKind | undefined)
    ?? (heroEdition.atmospherePreset.kind as AtmosphereKind | undefined)
    ?? defaultAtmosphereForOccasion(occasionRaw);
  const atmosphereIntensity = (atmosphereCfg?.intensity as AtmosphereIntensity | undefined)
    ?? (heroEdition.atmospherePreset.intensity as AtmosphereIntensity | undefined)
    ?? 'standard';
  const atmosphereAccent = atmosphereCfg?.accent
    ?? (manifest as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors?.accent;

  // Cursor parallax — subtle drift on the atmosphere layer.
  const { ref: parallaxRef, style: parallaxStyle } = useHeroParallax(8);

  return (
    <section
      ref={parallaxRef as React.RefObject<HTMLElement>}
      id="top"
      style={{ position: 'relative', padding: 'clamp(48px, 8cqw, 80px) 32px clamp(48px, 8cqw, 110px)', overflow: 'hidden' }}
    >
      {/* Animated atmosphere — sits beneath the static decor so it
          reads as light moving through the paper, not on top of it.
          Cursor parallax drifts the whole layer ~8px. */}
      <div style={{ position: 'absolute', inset: 0, ...parallaxStyle, zIndex: 0 }} aria-hidden>
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

      {/* Per-template signature decor lives at the section level
          (position: absolute relative to <section>) so it doesn't get
          clipped when a variant uses negative margins to break out of
          the maxWidth wrapper (e.g. PhotoFirst). */}
      {(manifest as unknown as { signatureDecor?: string }).signatureDecor && (
        <div
          className="pl8-hide-mobile"
          style={{
            position: 'absolute',
            top: 0,
            right: 'max(0px, calc((100cqw - 1160px) / 2))',
            width: 240, height: 240,
            pointerEvents: 'none', zIndex: 2,
          }}
        >
          <TemplateSignatureDecor
            kind={(manifest as unknown as { signatureDecor?: string }).signatureDecor as SignatureDecorKind}
            position="top-right"
            size={220}
          />
        </div>
      )}

      {/* Variant dispatcher. Reads manifest.blockVariants.hero.style;
          falls back to 'postcard' (the v8 default) if unset. PhotoFirst
          uses negative margins inside itself to break the section
          padding for full-bleed; other variants stay inside the
          centred maxWidth frame. */}
      <HeroVariantDispatch
        manifest={manifest}
        names={names}
        siteSlug={siteSlug}
        onEditField={onEditField}
        onEditNames={onEditNames}
      />
    </section>
  );
}

/* ==================== Hero variant dispatcher ==================== */

function HeroVariantDispatch({
  manifest, names, siteSlug, onEditField, onEditNames,
}: {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug?: string;
  onEditField?: FieldEditor;
  onEditNames?: (next: [string, string]) => void;
}) {
  const [n1, n2] = names;
  const dateInfo = fmtEventDate(manifest.logistics?.date, manifest.dateFormat, manifest.logistics?.timezone);
  const venue = manifest.logistics?.venue ?? '';
  const rsvpDeadline = manifest.logistics?.rsvpDeadline;
  // parseLocalDate dodges the UTC-midnight off-by-one bug for
  // bare YYYY-MM-DD inputs.
  const deadlineDate = parseLocalDate(rsvpDeadline);
  const deadlineStr = deadlineDate
    ? deadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;
  const heroCopy =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ??
    "We'd love you there. Come celebrate with us — the day will be better for it.";
  const coverPhoto = manifest.coverPhoto;
  const photos = manifest.heroSlideshow ?? (manifest.chapters?.flatMap((c) => (c.images ?? []).slice(0, 1).map((i) => i.url)) ?? []);
  const heroKicker =
    (manifest as unknown as { heroKicker?: string }).heroKicker ??
    (dateInfo ? `together, ${dateInfo.weekday.toLowerCase()}` : 'save the date');

  // Edition-aware hero variant fallback. When the host hasn't
  // picked a hero variant explicitly, fall back to the active
  // Edition's heroVariantId (Cinema → photo-first, Quiet →
  // minimal, etc.) instead of the legacy hard-coded 'postcard'.
  // Explicit host picks always win — Editions are read-time
  // defaults only.
  const editionCtx = editionContextFromManifest(manifest);
  const edition = resolveEdition(editionCtx);
  const styleId =
    (manifest.blockVariants?.hero?.style as string | undefined) ?? edition.heroVariantId;
  const variant = getBlockStyle('hero', styleId) ?? getBlockStyle('hero', edition.heroVariantId) ?? getBlockStyle('hero', 'postcard');
  if (!variant) {
    // Registry didn't initialise — render nothing rather than crash.
    // The side-effect import at the top of this file should guarantee
    // postcard is always present in production.
    return null;
  }

  const Variant = variant.Component;
  const sharedProps = {
    manifest, names, siteSlug, onEditField, onEditNames,
    context: {
      n1: n1 ?? '', n2: n2 ?? '',
      coverPhoto, photos, venue,
      rsvpDeadline, deadlineStr, heroCopy, dateInfo, heroKicker,
      signatureDecor: (manifest as unknown as { signatureDecor?: string }).signatureDecor,
      occasion: (manifest as unknown as { occasion?: string }).occasion,
    },
  };

  // PhotoFirst manages its own outer wrapper (full-bleed). Other
  // variants render inside the centred maxWidth frame.
  if (styleId === 'photo-first') {
    return <Variant {...sharedProps} />;
  }

  // .pl-hero-enter staggers the variant's immediate children
  // (Postcard returns a fragment of 7 elements — kicker, names,
  // date-venue, tagline, CTA, link tray, photo strip — each
  // settles in 120ms after the previous so the hero feels like
  // it's composing on the page rather than slamming on paint).
  // Variants returning a single root div degrade to a whole-block
  // fade-in. Honours prefers-reduced-motion.
  return (
    <div className="pl-hero-enter" style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
      <Variant {...sharedProps} />
    </div>
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
function StoryVariantSectionImpl({
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

  // Edit-mode click hook — every chapter card opens the
  // StoryQuickEditModal scoped to that chapter. Mirrors the
  // schedule-row pattern: ignore clicks on inputs / inline-editable
  // text so EditableField still works inline.
  const editMode = useIsEditMode();
  function chapterClick(id: string | undefined) {
    return (e: React.MouseEvent<HTMLDivElement>) => {
      if (!editMode || !id) return;
      const target = e.target as Element;
      if (target.closest('a, button, input, textarea, [contenteditable="true"], [role="button"]')) return;
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new CustomEvent('pearloom:story-quick-edit', { detail: { chapterId: id } }));
    };
  }

  if (!Comp) {
    // Fall back to the timeline render while the chunk loads. Avoids
    // an empty section flash on first navigation.
    return <TimelineSection chapters={chapters} manifest={manifest} />;
  }

  return (
    <section id="our-story" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
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
            <SectionStamp url={manifest?.decorLibrary?.sectionStamps?.story} fallbackIcon="leaf" size={20} slotKey="story" />
            Our story so far
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(42px, 6cqw, 72px)', margin: 0 }}>
            How we got <span className="display-italic">here</span>
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
          {chapters.map((c, i) => {
            const photos = (c.images ?? [])
              .filter((img) => img && img.url)
              .map((img) => ({ url: img.url, alt: img.alt, caption: img.caption }));
            return (
              <div
                key={c.id ?? i}
                data-pl-chapter-id={c.id}
                onClick={chapterClick(c.id)}
                style={editMode ? { cursor: 'pointer' } : undefined}
              >
                <Comp
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimelineSectionImpl({ chapters, onEditField, manifest }: { chapters: Chapter[]; onEditField?: FieldEditor; manifest?: StoryManifest }) {
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
    <section id="our-story" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
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
            <SectionStamp url={manifest?.decorLibrary?.sectionStamps?.story} fallbackIcon="leaf" size={20} slotKey="story" />
            Our story so far
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(42px, 6cqw, 72px)', margin: 0 }}>
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
              // parseLocalDate avoids reading "2024-12-31" as UTC,
              // which would render as 2023 in PT.
              const yearDate = parseLocalDate(c.date);
              const year = yearDate ? yearDate.getFullYear().toString() : String(i + 1);
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
  const onChapterPhotoRemove = () => {
    onEditField?.((m) => {
      const chapters = [...(m.chapters ?? [])];
      const ch = chapters[chapterIndex];
      if (!ch) return m;
      const images = [...((ch.images as Array<{ url: string }> | undefined) ?? [])];
      if (images.length === 0) return m;
      images.splice(0, 1);
      chapters[chapterIndex] = { ...ch, images } as typeof ch;
      return { ...m, chapters };
    });
  };
  return (
    <div
      className="pl8-chapter-row"
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
            // First chapter gets a Fraunces-italic dropcap on the
            // opening glyph — pure editorial flourish that signals
            // "this is a story, not a CMS." Skipped for chapter 2+
            // so the page doesn't read like a serial novel.
            className={chapterIndex === 0 ? 'pl-dropcap' : undefined}
            style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}
          />
        </HoverToolbar>
      </div>
      <PhotoDropTarget onDrop={onChapterPhotoDrop} label="Drop a photo">
        <PhotoActionMenu imageUrl={src} onReplace={onChapterPhotoDrop} onRemove={onChapterPhotoRemove}>
          <PhotoPlaceholder tone={tone} aspect="1/1" src={src} style={{ borderRadius: 14 }} />
        </PhotoActionMenu>
      </PhotoDropTarget>
    </div>
  );
}

/* ==================== DETAILS STRIP ==================== */
function DetailsStripImpl({ manifest, siteSlug }: { manifest: StoryManifest; siteSlug?: string }) {
  const l = manifest.logistics ?? {};
  const dateInfo = fmtEventDate(l.date, manifest.dateFormat, l.timezone);
  const events = manifest.events ?? [];
  // Run every time string through the occasion-aware formatter.
  // Wedding panels were rendering "17:00" because the host typed
  // it from the 24h TimePicker; weddings expect "Five o'clock in
  // the afternoon". Casual events get "5 PM". Empty/garbage values
  // fall through unchanged so the formatter never destroys input.
  const term = terminologyFor((manifest as unknown as { occasion?: string }).occasion);
  const formatTime = (t?: string) => (t ? term.formatTime(t) : '');
  const ceremonyLabel = term.ceremonyLabel;
  const details = manifest.details;
  const expandMap = details?.expand ?? {};

  // Sunset / golden-hour for the ceremony card. Skip when we
  // don't have lat/lng — the chip stays out rather than guessing.
  const sun = (l.venueLat != null && l.venueLng != null && l.date)
    ? sunriseSunsetFor(l.venueLat, l.venueLng, l.date, l.timezone)
    : null;

  type DetailsItem = {
    id: string;
    label: string;
    value: string;
    subtitle: string;
    icon: string;
    tone: 'lavender' | 'peach' | 'sage';
    /** Card has a real time + venue → render Calendar / Directions chips. */
    address?: string;
    /** Show the golden-hour chip (only on the ceremony / main-event card). */
    showGoldenHour?: boolean;
    /** When set, an expandable "What to expect" body. */
    expand?: string;
  };
  const items: DetailsItem[] = [];

  const ceremony = events.find((e) => e.type === 'ceremony');
  const ceremonyVenue = ceremony?.venue || l.venue || '';
  const ceremonyAddress = ceremony?.address || l.venueAddress;
  if (ceremony) {
    items.push({
      id: 'ceremony',
      label: ceremonyLabel,
      value: formatTime(ceremony.time) || (dateInfo?.pretty ?? ''),
      subtitle: ceremonyVenue,
      icon: 'calendar-check',
      tone: 'lavender',
      address: ceremonyAddress,
      showGoldenHour: !!sun,
      expand: expandMap.ceremony,
    });
  } else if (l.time || l.venue) {
    items.push({
      id: 'ceremony',
      label: ceremonyLabel,
      value: formatTime(l.time) || (dateInfo?.pretty ?? ''),
      subtitle: ceremonyVenue,
      icon: 'calendar-check',
      tone: 'lavender',
      address: ceremonyAddress,
      showGoldenHour: !!sun,
      expand: expandMap.ceremony,
    });
  }

  const reception = events.find((e) => e.type === 'reception');
  if (reception) {
    items.push({
      id: 'reception',
      label: term.receptionLabel,
      value: formatTime(reception.time),
      subtitle: reception.venue || '',
      icon: 'sparkles',
      tone: 'peach',
      address: reception.address || (reception.venue === l.venue ? l.venueAddress : undefined),
      expand: expandMap.reception,
    });
  }

  if (l.dresscode) {
    items.push({
      id: 'dressCode',
      label: 'Dress code',
      value: l.dresscode,
      subtitle: l.notes ?? '',
      icon: 'type',
      tone: 'sage',
      expand: expandMap.dressCode,
    });
  }

  // Parking & arrival — when the host fills the field in the
  // DetailsPanel it lands here as its own card. Lavender tone +
  // pin glyph because guests scan the strip for "where do I
  // park?" before they look at the dress code.
  if (details?.parking) {
    items.push({
      id: 'parking',
      label: 'Parking + arrival',
      value: '',
      subtitle: details.parking,
      icon: 'pin',
      tone: 'lavender',
      address: ceremonyAddress,
      expand: expandMap.parking,
    });
  }

  // Accessibility — separate card so it doesn't get buried in
  // the parking copy. Sage tone + leaf glyph keeps the editorial
  // feel without bolding accessibility as an afterthought.
  if (details?.accessibility) {
    items.push({
      id: 'accessibility',
      label: 'Accessibility',
      value: '',
      subtitle: details.accessibility,
      icon: 'leaf',
      tone: 'sage',
      expand: expandMap.accessibility,
    });
  }

  // Host-authored custom cards. Any number; render after the
  // preset 3 in declaration order.
  for (const c of details?.customCards ?? []) {
    items.push({
      id: c.id,
      label: c.title,
      value: c.time ? formatTime(c.time) : '',
      subtitle: c.body,
      icon: c.icon || 'star',
      tone: c.tone || 'sage',
      address: c.address,
      expand: expandMap[c.id],
    });
  }

  if (items.length === 0) return null;
  void dateInfo;

  // Derive a city for the weather lookup. Take the chunk before the
  // first comma in the venue address — most "Address, City, State"
  // formats land on the right token; fall back to venue name.
  const weatherCity = (() => {
    const addr = l.venueAddress;
    if (addr) {
      const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
      return parts[1] ?? parts[0] ?? l.venue;
    }
    return l.venue;
  })();

  return (
    <section
      id="details"
      style={{ padding: 'clamp(48px, 7cqw, 80px) 32px', position: 'relative' }}
    >
      <SectionBackground manifest={manifest} sectionId="details" />
      <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
        <div className="pl8-cols-3" style={{ gap: 28 }}>
          {items.map((it) => (
            <DetailsCard
              key={it.id}
              item={it}
              sun={sun}
              manifest={manifest}
              siteSlug={siteSlug}
            />
          ))}
        </div>
        {/* Weather strip — single editorial row that combines the
            short-term forecast (≤14 days) and the climate normals
            into one horizontal layout, separated by peach hairlines.
            Replaces the awkward two-card rail. Falls through
            cleanly when data isn't available. */}
        {l.date && l.venueLat != null && l.venueLng != null && (() => {
          // Per-host weather style — voice / glyph treatment / day-of
          // suppression. Defaults match the original strip exactly so
          // sites without weatherStyle in their manifest are visually
          // unchanged.
          const ws = manifest.weatherStyle;
          return (
            <WeatherStrip
              lat={l.venueLat}
              lng={l.venueLng}
              date={l.date}
              city={weatherCity}
              voice={ws?.voice}
              glyph={ws?.glyph}
              hideOnDay={ws?.hideOnDay}
            />
          );
        })()}
      </div>
    </section>
  );
}

interface DetailsCardItem {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  icon: string;
  tone: 'lavender' | 'peach' | 'sage';
  address?: string;
  showGoldenHour?: boolean;
  expand?: string;
}

function DetailsCard({
  item,
  sun,
  manifest,
  siteSlug,
}: {
  item: DetailsCardItem;
  sun: { sunset: string; goldenHour: string } | null;
  manifest: StoryManifest;
  siteSlug?: string;
}) {
  const [showExpand, setShowExpand] = useState(false);
  const toneVar =
    item.tone === 'lavender' ? 'var(--lavender-2)'
      : item.tone === 'peach' ? 'var(--peach-2)'
      : 'var(--sage-2)';
  return (
    <div
      className="pl8-card-lift"
      style={{
        background: 'var(--card)',
        border: 'var(--pl-block-card-border-width, 1px) solid var(--card-ring)',
        borderRadius: 'var(--pl-block-card-radius, var(--pl-card-radius, 20px))',
        boxShadow: 'var(--pl-block-card-shadow, none)',
        padding: 'var(--pl-block-card-padding, 28px)',
        position: 'relative',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        // Text alignment ALSO controls flex-children alignment so
        // the icon medallion, eyebrow, value, subtitle, golden-hour
        // chip, and "what to expect" pill all follow the host's
        // text-align pick. Without this var, picking "center" on
        // Details left the icon glued to the left edge while the
        // text centered — looked broken.
        alignItems: 'var(--pl-block-align-items, flex-start)' as React.CSSProperties['alignItems'],
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: toneVar,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink)',
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <Icon name={item.icon} size={20} />
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          marginBottom: 6,
        }}
      >
        {item.label}
      </div>
      {item.value && (
        <div className="display" style={{ fontSize: 34, color: 'var(--ink)', marginBottom: 6 }}>
          {item.value}
        </div>
      )}
      {item.subtitle && (
        <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{item.subtitle}</div>
      )}
      {/* Golden-hour chip — italic editorial note under the time
          on the ceremony card when the venue has lat/lng. */}
      {item.showGoldenHour && sun && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--gold, #B8935A)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          }}
        >
          <Icon name="sun" size={12} color="var(--gold)" />
          Golden hour {sun.goldenHour} &middot; Sunset {sun.sunset}
        </div>
      )}
      {/* "What to expect" expand — reveals an editorial paragraph
          with a soft border-top so the resting card stays clean. */}
      {item.expand && (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowExpand((s) => !s)}
            aria-expanded={showExpand}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'var(--peach-ink, #C6703D)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            What to expect
            <Icon name={showExpand ? 'chev-up' : 'chev-down'} size={11} />
          </button>
          {showExpand && (
            <p
              style={{
                marginTop: 10,
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--ink-soft)',
                paddingTop: 10,
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              {item.expand}
            </p>
          )}
        </div>
      )}
      {/* Calendar + Directions chips — render only when actionable.
          Calendar needs a date; Directions needs an address. The
          spacer above pushes them to the bottom of the card so cards
          of varied content height still align their action rows. */}
      {(item.address || (manifest.logistics?.date && item.id === 'ceremony')) && (
        <>
          <div style={{ flex: 1, minHeight: 14 }} />
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--line-soft)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {/* Calendar chip — only on the ceremony card or any custom
                card with an address (treat address-bearing cards as
                location-anchored events worth saving). */}
            {manifest.logistics?.date && (item.id === 'ceremony' || item.address) && siteSlug && (
              <DetailsCalendarChip manifest={manifest} siteSlug={siteSlug} />
            )}
            {item.address && <DetailsDirectionsChip address={item.address} />}
          </div>
        </>
      )}
    </div>
  );
}

function DetailsCalendarChip({ manifest, siteSlug }: { manifest: StoryManifest; siteSlug: string }) {
  const date = manifest.logistics?.date;
  if (!date) return null;
  const ics = `/sites/${siteSlug}/event.ics`;
  return (
    <a
      href={ics}
      download
      className="pl8-details-chip"
      title="Download .ics — adds to Apple / Google / Outlook"
      style={chipStyle}
    >
      <Icon name="calendar" size={12} />
      Add to calendar
    </a>
  );
}

function DetailsDirectionsChip({ address }: { address: string }) {
  const enc = encodeURIComponent(address);
  const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const href = ios ? `https://maps.apple.com/?q=${enc}` : `https://www.google.com/maps/search/?api=1&query=${enc}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="pl8-details-chip"
      title={`Open in ${ios ? 'Apple' : 'Google'} Maps`}
      style={chipStyle}
    >
      <Icon name="pin" size={12} />
      Directions
    </a>
  );
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 999,
  background: 'transparent',
  border: '1px solid var(--line)',
  color: 'var(--ink)',
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textDecoration: 'none',
  fontFamily: 'var(--font-ui)',
  transition: 'background 160ms ease, border-color 160ms ease',
};

/* ==================== SCHEDULE ==================== */
// ScheduleTimeEditor — click the time on a canvas schedule row
// to inline-edit it. Displays the formatted time (per terminology
// — "half past four in the afternoon" or "4:30pm"); on click,
// reveals a tiny native-time-input behind a v8 wrapper. We use
// the native time control here because picking a wall-clock is
// the one place native UI is genuinely better than custom — it's
// keyboard-accessible, mobile-aware, and supported everywhere.
function ScheduleTimeEditor({
  rawTime,
  formattedTime,
  formal,
  isLive,
  emphasized,
  onChange,
}: {
  rawTime: string;
  formattedTime: string;
  formal: boolean;
  isLive: boolean;
  emphasized: boolean;
  onChange: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Coerce arbitrary input into HH:MM if possible — empty when
  // we can't parse so the input shows blank rather than garbage.
  const inputValue = (() => {
    const m = /^(\d{1,2}):(\d{2})/.exec(rawTime);
    if (!m) return '';
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
    return `${hh}:${mm}`;
  })();

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="time"
        defaultValue={inputValue}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          if (e.target.value !== rawTime) onChange(e.target.value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        style={{
          width: '100%',
          maxWidth: 130,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1.5px solid var(--peach-ink, #C6703D)',
          background: 'var(--card)',
          color: 'var(--ink)',
          fontSize: 18,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          outline: 'none',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="display"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Click to edit time"
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: rawTime && formal ? 14 : 28,
        fontStyle: formal ? 'italic' : 'normal',
        fontWeight: 600,
        lineHeight: 1.15,
        color: isLive ? 'var(--peach-ink)' : (emphasized ? 'var(--peach-ink)' : 'var(--ink)'),
        fontFamily: 'inherit',
        borderBottom: '1px dashed transparent',
        transition: 'border-color 160ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
    >
      {formattedTime || 'set time'}
    </button>
  );
}

// Pick the row to spotlight as the day's "main moment" — the
// ceremony / service / centre-piece event. Strategy:
//   1. Explicit type=='ceremony' wins.
//   2. Failing that, name-match for "ceremony", "vows", "service",
//      "wedding mass", "I do", "exchange of vows".
//   3. Otherwise no main moment — the strip just renders without
//      the badge (host hasn't said which is centre).
function computeMainEventIndex(events: Array<{ name?: string; type?: string; isMain?: boolean }>): number {
  // Host wins. When any event has isMain=true, that one is the
  // main moment regardless of type/name heuristics. Auto-detection
  // is the fallback for sites that haven't picked yet — it kept
  // mismatching graduations / memorials where "ceremony" doesn't
  // mean what the heuristic thinks.
  const explicitHost = events.findIndex((e) => e.isMain === true);
  if (explicitHost >= 0) return explicitHost;
  const explicit = events.findIndex((e) => e.type === 'ceremony');
  if (explicit >= 0) return explicit;
  const NAME_HINTS = /\b(ceremony|service|vows|nuptials|exchange|i do)\b/i;
  return events.findIndex((e) => NAME_HINTS.test(e.name ?? ''));
}

// "Live now" detection — when the guest's clock is between
// event.start and event.start + ~30 minutes (anchored on the
// venue timezone if the host set one). Returns -1 when nothing
// is currently happening.
function computeLiveEventIndex(
  events: Array<{ time?: string }>,
  isoDate: string,
  timezone: string | undefined,
): number {
  if (!isoDate || events.length === 0) return -1;
  const now = Date.now();
  // Build the venue-local instant for each event's HH:MM and
  // compare to "now". A 30-minute trailing window keeps the badge
  // up briefly past start so guests opening the site mid-walk-in
  // still see "Live now" instead of nothing.
  for (let i = 0; i < events.length; i++) {
    const t = events[i].time ?? '';
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) continue;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const utcWall = Date.UTC(
      parseInt(isoDate.slice(0, 4), 10),
      parseInt(isoDate.slice(5, 7), 10) - 1,
      parseInt(isoDate.slice(8, 10), 10),
      hh, mm, 0,
    );
    let target = utcWall;
    if (timezone) {
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone, hour: 'numeric', hour12: false,
          timeZoneName: 'shortOffset',
        });
        const offPart = fmt.formatToParts(new Date(utcWall)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0';
        const om = /GMT([+-])(\d+)(?::(\d+))?/.exec(offPart);
        if (om) {
          const sign = om[1] === '-' ? -1 : 1;
          const offHrs = Number(om[2]);
          const offMin = om[3] ? Number(om[3]) : 0;
          target = utcWall - sign * (offHrs * 60 + offMin) * 60_000;
        }
      } catch { /* keep target as utcWall */ }
    }
    if (now >= target && now < target + 30 * 60_000) return i;
  }
  return -1;
}

function ScheduleSectionImpl({ manifest, names, onEditField }: { manifest: StoryManifest; names: [string, string]; onEditField?: FieldEditor }) {
  const edit = useIsEditMode();
  const dateInfo = fmtEventDate(manifest.logistics?.date, manifest.dateFormat, manifest.logistics?.timezone);
  const events = manifest.events ?? [];
  // Per-occasion section title + ceremony label + time format.
  // Wedding → "Order of service · Ceremony · half past four in the
  // afternoon"; baby shower → "The plan · Shower · 2pm". One config
  // module, no scattered if-occasion-equals chains.
  const term = terminologyFor((manifest as unknown as { occasion?: string }).occasion);
  // "Live now" + "Main moment" — figure out which row is *the* one
  // the host wants spotlighted, and which row is currently happening
  // (if guests open the site between event.start and start+30min).
  const eventDateStr = manifest.logistics?.date ?? '';
  const eventTZ = manifest.logistics?.timezone;
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
  // Pre-figure-out the live + main rows so per-row render is
  // a cheap lookup instead of recomputing.
  const liveIdx = computeLiveEventIndex(sorted, eventDateStr, eventTZ);
  const mainIdx = computeMainEventIndex(sorted);

  const rows = sorted.map((e, i) => ({
    id: e.id,
    rawTime: e.time ?? '',
    time: term.formatTime(e.time ?? ''),
    title: e.name,
    d: e.description ?? '',
    tag: tagFromType[e.type] ?? 'Other',
    cur: e.type === 'ceremony',
    isMain: i === mainIdx,
    isLive: i === liveIdx,
    badges: e.badges,
  }));
  void names;

  // Patch a single event by ID — the sorted array decoupled
  // display order from manifest order, so we always go through
  // the canonical id lookup.
  const removeEvent = (eventId: string) => {
    onEditField?.((m) => {
      const arr = (m.events ?? []).filter((e) => e.id !== eventId);
      return { ...m, events: arr };
    });
  };
  // Drag-to-reorder. The schedule sorter falls back to event.time
  // when `order` is equal, so we rewrite each event's `order` to
  // its new index after the drop and the renderer's sort honours
  // the host's choice. We re-resolve to manifest events via id so
  // the WeddingEvent shape stays intact.
  const reorderEvents = (next: Array<{ id?: string }>) => {
    onEditField?.((m) => {
      const cur = m.events ?? [];
      const byId = new Map(cur.map((e) => [e.id, e] as const));
      const reordered = next
        .map((nh, i) => {
          const nid = (nh as { id?: string }).id;
          if (!nid) return null;
          const original = byId.get(nid);
          if (!original) return null;
          return { ...original, order: i };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      return { ...m, events: reordered };
    });
  };
  const patchEventTime = (eventId: string) => (nextTime: string) => {
    onEditField?.((m) => {
      const arr = (m.events ?? []).map((e) =>
        e.id === eventId ? { ...e, time: nextTime } : e,
      );
      return { ...m, events: arr };
    });
  };
  const patchEvent = (eventId: string, field: 'name' | 'description') => (next: string) => {
    onEditField?.((m) => {
      const arr = (m.events ?? []).map((e) =>
        e.id === eventId ? { ...e, [field]: next } : e,
      );
      return { ...m, events: arr };
    });
  };

  return (
    <section id="schedule" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="schedule" />
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {edit && (
          <DraftedByPearBanner
            sectionKey="schedule"
            sectionLabel="Schedule"
            manifest={manifest}
            onChange={(m) => onEditField?.(() => m)}
            onClear={() => onEditField?.((m) => ({ ...m, events: [], draftedByPear: { ...(m.draftedByPear ?? {}), schedule: false } }))}
          />
        )}
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.schedule} fallbackIcon="clock" size={20} slotKey="schedule" />
            How the day flows
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 6cqw, 64px)', margin: 0 }}>
            {term.scheduleLabel} {dateInfo && <>for <span className="display-italic">{dateInfo.pretty}</span></>}
          </h2>
        </div>

        <div className="pl-cascade-row" style={{ background: 'var(--card)', border: '1px solid var(--card-ring)', borderRadius: 24, overflow: 'hidden' }}>
          {(() => {
            const renderRow = (r: typeof rows[number], i: number, dragHandleProps?: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void }) => (
            <div
              key={i}
              className={`pl8-schedule-row${edit ? ' pl8-canvas-row' : ''}`}
              data-pl-event-id={r.id}
              onClick={edit && r.id ? (e) => {
                const target = e.target as Element;
                if (target.closest('a, button, input, textarea, [contenteditable="true"], [role="button"]')) return;
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('pearloom:schedule-quick-edit', { detail: { eventId: r.id } }));
                }
                jumpToPanelRow('schedule', 'pearloom:focus-schedule-row', { eventId: r.id });
              } : undefined}
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '120px 1fr 140px',
                alignItems: 'center',
                gap: 20,
                padding: '22px 28px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
                background: r.isLive ? 'var(--peach-bg)' : (r.isMain && r.cur) ? 'rgba(198,112,61,0.05)' : 'transparent',
                borderLeft: r.isLive ? '3px solid var(--peach-ink, #C6703D)' : (r.isMain ? '3px solid rgba(198,112,61,0.45)' : '3px solid transparent'),
                transition: 'background 220ms ease, border-color 220ms ease',
                cursor: edit ? 'pointer' : 'default',
              }}
            >
              {edit && r.id && onEditField && (
                <button
                  type="button"
                  aria-label="Remove this event"
                  onClick={(e) => { e.stopPropagation(); removeEvent(r.id!); }}
                  className="pl8-canvas-remove"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: 'rgba(14,13,11,0.85)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    zIndex: 4,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 13,
                    lineHeight: 1,
                    opacity: 0,
                    transition: 'opacity 160ms ease',
                  }}
                >
                  ×
                </button>
              )}
              {edit && dragHandleProps && (
                <CanvasGripHandle dragHandleProps={dragHandleProps} ariaLabel="Drag to reorder event" position="top-left" />
              )}
              {edit && r.id ? (
                <ScheduleTimeEditor
                  rawTime={r.rawTime}
                  formattedTime={r.time}
                  formal={term.tone === 'formal'}
                  isLive={r.isLive}
                  emphasized={r.cur || r.isMain}
                  onChange={patchEventTime(r.id)}
                />
              ) : (
                <div
                  className="display"
                  style={{
                    fontSize: r.rawTime && term.tone === 'formal' ? 14 : 28,
                    fontStyle: term.tone === 'formal' ? 'italic' : 'normal',
                    fontWeight: 600,
                    lineHeight: 1.15,
                    color: r.isLive ? 'var(--peach-ink)' : (r.cur || r.isMain ? 'var(--peach-ink)' : 'var(--ink)'),
                  }}
                >
                  {r.time}
                </div>
              )}
              <div>
                {(() => {
                  // Auto-tagged + host-authored badges share one row.
                  // Host can suppress 'main' via badges.hideAuto. Custom
                  // labels render as v8 chips after the auto-tags.
                  const evBadges = (r as { badges?: { hideAuto?: string[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> } }).badges;
                  const showMain = r.isMain && !r.isLive && !evBadges?.hideAuto?.includes('main');
                  const customBadges = evBadges?.custom ?? [];
                  if (!r.isLive && !showMain && customBadges.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
                      {r.isLive && (
                        <span
                          className="pl8-live-pill"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 9px 2px 6px',
                            background: 'var(--peach-ink, #C6703D)',
                            color: '#FFFFFF',
                            borderRadius: 999,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            boxShadow: '0 4px 10px -3px rgba(198,112,61,0.45)',
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: '#FFFFFF',
                              animation: 'pl8-live-pulse 1.4s ease-in-out infinite',
                            }}
                          />
                          Live now
                        </span>
                      )}
                      {showMain && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 9px',
                            background: 'rgba(198,112,61,0.10)',
                            color: 'var(--peach-ink, #C6703D)',
                            border: '1px solid rgba(198,112,61,0.32)',
                            borderRadius: 999,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                          }}
                        >
                          <span aria-hidden style={{ fontSize: 9 }}>★</span>
                          Main moment
                        </span>
                      )}
                      {customBadges.map((cb) => (
                        <SectionCustomBadge key={cb.id} label={cb.label} tone={cb.tone ?? 'peach'} />
                      ))}
                    </div>
                  );
                })()}
                <EditableField
                  as="div"
                  context={`Schedule item ${i + 1} title`}
                  value={r.title}
                  onSave={r.id ? patchEvent(r.id, 'name') : () => {}}
                  placeholder="Event name"
                  ariaLabel={`Schedule item ${i + 1} title`}
                  rewrite={false}
                  style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}
                />
                <EditableField
                  as="div"
                  context={`Schedule item ${i + 1} description`}
                  value={r.d}
                  onSave={r.id ? patchEvent(r.id, 'description') : () => {}}
                  placeholder="What guests can expect…"
                  multiline
                  ariaLabel={`Schedule item ${i + 1} description`}
                  style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`chip ${tagClass[r.tag] ?? 'chip-cream'}`} style={{ cursor: 'default' }}>
                  {r.tag}
                </span>
              </div>
            </div>
            );
            // Synthesize ids when missing for CanvasSortable.
            const itemsWithIds = rows.map((r, i) => ({ ...r, id: r.id ?? `evt-idx-${i}` }));
            if (edit && onEditField) {
              return (
                <CanvasSortable
                  items={itemsWithIds}
                  onReorder={(next) => reorderEvents(next as Array<{ id?: string }>)}
                  renderItem={(item, ctx) => renderRow(item as typeof rows[number], ctx.index, ctx.dragHandleProps)}
                />
              );
            }
            return rows.map((r, i) => renderRow(r, i));
          })()}
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
          // Critical: flag this as a venue stylize so the route
          // picks the no-people prompt. Without this the model
          // hallucinates a couple into the Fort-Lauderdale skyline.
          subject: 'venue',
        }),
      });
      if (!stylRes.ok) {
        const body = await stylRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Stylize ${stylRes.status}`);
      }
      const data = (await stylRes.json()) as { url?: string; jobId?: string; async?: boolean };

      // Async path — server returned a jobId. Poll the stylize
      // job route every 2s for up to 4 minutes. Was a hard 504
      // before this — gpt-image-2 quality='high' takes 60-120s,
      // longer than Vercel's request gateway will hold.
      let finalUrl = data.url ?? null;
      if (data.async && data.jobId) {
        const startedAt = Date.now();
        const ceiling = 240_000;
        let consecutiveErrors = 0;
        while (Date.now() - startedAt < ceiling) {
          await new Promise((r) => setTimeout(r, 2000));
          let pollRes: Response;
          try {
            pollRes = await fetch(`/api/photos/stylize/${encodeURIComponent(data.jobId)}`, { cache: 'no-store' });
          } catch {
            consecutiveErrors += 1;
            if (consecutiveErrors >= 3) throw new Error('Lost connection to Pear. Try again.');
            continue;
          }
          consecutiveErrors = 0;
          if (!pollRes.ok) {
            if (pollRes.status === 404) throw new Error('Pear lost the canvas. Try again.');
            continue;
          }
          const poll = (await pollRes.json()) as { status?: string; url?: string; error?: string };
          if (poll.status === 'complete' && poll.url) { finalUrl = poll.url; break; }
          if (poll.status === 'failed') throw new Error(poll.error ?? 'Stylize failed.');
        }
        if (!finalUrl) throw new Error('Pear is still painting. Try again in a minute.');
      }
      if (!finalUrl) throw new Error('Stylize returned no url');

      onEditField?.((m) => {
        const l = (m.logistics ?? {}) as Record<string, unknown>;
        return {
          ...m,
          logistics: { ...l, venuePhotoStylized: finalUrl, venuePhotoMode: 'stylized' },
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
          loading="lazy"
          decoding="async"
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

// ── HotelCard model ──────────────────────────────────────────
// Wide superset of the manifest's HotelBlock so we can read every
// rich field that newer entries carry without breaking older
// hotels that only have name + address. Every field is optional;
// the render gracefully degrades.
interface HotelCardModel {
  name?: string;
  address?: string;
  bookingUrl?: string;
  groupRate?: string;
  notes?: string;
  photoUrl?: string;
  photoUrls?: string[];
  image?: string;
  rating?: number;
  ratingCount?: number;
  amenities?: string;
  distance?: string;
  priceLevel?: string;
  priceRange?: { start?: number; end?: number; currency?: string };
  description?: string;
  lat?: number;
  lng?: number;
  badges?: {
    hideAuto?: Array<'top' | 'closest' | 'value'>;
    custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }>;
  };
}

type HotelSort = 'manual' | 'pearPick' | 'closest' | 'rating' | 'priceAsc';

const HOTEL_SORT_LABELS: Record<HotelSort, string> = {
  manual: 'Custom order',
  pearPick: "Pear's pick",
  closest: 'Closest to venue',
  rating: 'Highest rated',
  priceAsc: 'Price: low to high',
};

// V8-styled sort picker — replaces the native <select> the
// browser would otherwise paint with platform chrome (white
// blocky options, blue OS highlight) that read as borrowed
// against the rest of the cream/peach palette. Behaviour
// matches a native select: arrow keys navigate, Enter picks,
// Escape closes, click-outside dismisses.
function SortDropdown({ value, onChange }: { value: HotelSort; onChange: (v: HotelSort) => void }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const options: HotelSort[] = ['manual', 'pearPick', 'closest', 'rating', 'priceAsc'];

  // Close on outside click + esc, focus the active option on open.
  useEffect(() => {
    if (!open) return;
    setActiveIdx(options.indexOf(value));
    function onDocClick(e: MouseEvent) {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        onChange(options[activeIdx]);
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIdx, value]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: 'var(--card)',
          color: 'var(--ink)',
          fontSize: 11.5,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          minWidth: 158,
          justifyContent: 'space-between',
          transition: 'border-color 160ms ease, background 160ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        <span>{HOTEL_SORT_LABELS[value]}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="Sort hotels"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 200,
            zIndex: 20,
            padding: 6,
            background: 'var(--paper)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            boxShadow: '0 14px 40px -10px rgba(14,13,11,0.30)',
            animation: 'pl8-sort-pop 160ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {options.map((opt, i) => {
            const selected = value === opt;
            const active = activeIdx === i;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? 'var(--cream-2)' : 'transparent',
                  color: 'var(--ink)',
                  fontSize: 12.5,
                  fontWeight: selected ? 700 : 500,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 120ms ease',
                }}
              >
                <span>{HOTEL_SORT_LABELS[opt]}</span>
                {selected && (
                  <span aria-hidden style={{ color: 'var(--peach-ink, #C6703D)', fontSize: 13 }}>✓</span>
                )}
              </button>
            );
          })}
          <style jsx global>{`
            @keyframes pl8-sort-pop {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

const AMENITY_FILTERS: Array<{ key: string; label: string; matches: RegExp }> = [
  { key: 'pool',    label: 'Pool',    matches: /pool/i },
  { key: 'spa',     label: 'Spa',     matches: /spa/i },
  { key: 'gym',     label: 'Gym',     matches: /gym|fitness/i },
  { key: 'bar',     label: 'Bar',     matches: /bar\b/i },
  { key: 'parking', label: 'Parking', matches: /parking/i },
  { key: 'beach',   label: 'Beach',   matches: /beach/i },
];

// Reads the same distance parser the badge logic uses so sorting
// by distance lines up with the "Closest" badge auto-tag.
function hotelDistanceMeters(h: HotelCardModel): number {
  const d = h.distance ?? '';
  const mi = /^(\d+(?:\.\d+)?)\s*mi\b/i.exec(d);
  if (mi) return parseFloat(mi[1]) * 1609.344;
  const ft = /^(\d+(?:\.\d+)?)\s*ft\b/i.exec(d);
  if (ft) return parseFloat(ft[1]) / 3.28084;
  const km = /^(\d+(?:\.\d+)?)\s*km/i.exec(d);
  if (km) return parseFloat(km[1]) * 1000;
  const m = /^(\d+(?:\.\d+)?)\s*m\b/i.exec(d);
  if (m) return parseFloat(m[1]);
  return Number.MAX_SAFE_INTEGER;
}

function hotelPriceTier(h: HotelCardModel): number {
  const p = (h.priceLevel ?? '').toUpperCase();
  if (p.includes('VERY_EXPENSIVE') || p === '$$$$') return 4;
  if (p.includes('EXPENSIVE') || p === '$$$') return 3;
  if (p.includes('MODERATE') || p === '$$') return 2;
  if (p.includes('INEXPENSIVE') || p === '$') return 1;
  return 99; // unknown sorts last
}

// HotelsList — sort + amenity filter + render. Hoisted so the
// hotel section can stay readable; all per-section UI state lives
// here. Defaults to pearPick sort and no amenity filter so the
// out-of-box render matches what the host saw before this added
// the controls.
function HotelsList({
  manifest,
  hotels,
  hotelTones,
  editMode = false,
  onRemove,
  onReorder,
}: {
  manifest: StoryManifest;
  hotels: HotelCardModel[];
  hotelTones: ('peach' | 'lavender' | 'sage')[];
  editMode?: boolean;
  onRemove?: (idxInVisible: number, hotel: HotelCardModel) => void;
  /** Drag-to-reorder callback. Receives the visible array in
   *  the new order. Only honoured when display === 'photo' or
   *  'icon' — map mode uses pin order from the array, not drag. */
  onReorder?: (next: HotelCardModel[]) => void;
}) {
  // Default sort: in edit mode, "Custom order" — the host's drag
  // sequence is what they expect to see after dropping. On the
  // published site, "Pear's pick" so guests see the best options
  // first regardless of how the host arranged the panel.
  const [sort, setSort] = useState<HotelSort>(editMode && onReorder ? 'manual' : 'pearPick');
  const [amenitySet, setAmenitySet] = useState<Set<string>>(new Set());
  const display = (manifest.travelInfo?.hotelDisplay ?? 'photo') as 'photo' | 'icon' | 'map';
  const badgesEnabled = manifest.travelInfo?.hotelBadges !== false;
  const blockCode = (manifest.travelInfo as unknown as { blockCode?: string } | undefined)?.blockCode
    ?? (manifest as unknown as { travel?: { blockCode?: string } }).travel?.blockCode
    ?? '';

  // Filter amenities first, then sort, then cap at 6. The order
  // matters — sort+cap then filter would hide the cap-out hotels'
  // amenities from the chip rail.
  const filtered = hotels.filter((h) => {
    if (amenitySet.size === 0) return true;
    const amen = (h.amenities ?? '').toLowerCase();
    for (const key of amenitySet) {
      const rule = AMENITY_FILTERS.find((a) => a.key === key);
      if (rule && !rule.matches.test(amen)) return false;
    }
    return true;
  });
  // 'manual' preserves manifest order — the host's drag sequence.
  // Anything else applies a comparator. We never mutate `filtered`.
  const sorted = sort === 'manual'
    ? filtered
    : [...filtered].sort((a, b) => {
        if (sort === 'closest') return hotelDistanceMeters(a) - hotelDistanceMeters(b);
        if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (sort === 'priceAsc') return hotelPriceTier(a) - hotelPriceTier(b);
        // pearPick — same scoring as the auto-badges
        const score = (h: HotelCardModel) =>
          (h.rating ?? 0) * 1000 + Math.log10((h.ratingCount ?? 0) + 1) * 100;
        return score(b) - score(a);
      });
  const visible = sorted.slice(0, 6);
  const badges = badgesEnabled ? computeHotelBadges(visible) : visible.map(() => [] as HotelBadge[]);

  // Hide amenity filter chips that don't match any hotel — chips
  // that always filter to zero just teach the guest that nothing
  // works. The Sort picker is always shown when ≥3 hotels.
  const availableAmenities = AMENITY_FILTERS.filter((rule) =>
    hotels.some((h) => rule.matches.test(h.amenities ?? '')),
  );
  const showSort = hotels.length >= 3;
  const showFilters = availableAmenities.length >= 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {blockCode && <GroupBlockCodeBanner code={blockCode} />}
      {(showSort || showFilters) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 14,
          }}
        >
          {showFilters && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {availableAmenities.map((rule) => {
                const active = amenitySet.has(rule.key);
                return (
                  <button
                    key={rule.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setAmenitySet((prev) => {
                        const next = new Set(prev);
                        if (active) next.delete(rule.key); else next.add(rule.key);
                        return next;
                      });
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: active ? '1px solid var(--peach-ink, #C6703D)' : '1px solid var(--line)',
                      background: active ? 'var(--peach-ink, #C6703D)' : 'transparent',
                      color: active ? '#FFFFFF' : 'var(--ink-soft)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                    }}
                  >
                    {rule.label}
                  </button>
                );
              })}
            </div>
          )}
          {showSort && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginLeft: 'auto',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                }}
              >
                Sort
              </span>
              <SortDropdown value={sort} onChange={setSort} />
            </div>
          )}
        </div>
      )}
      {visible.length === 0 ? (
        <div
          style={{
            padding: '24px 18px',
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 14,
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          No hotels match those filters. Clear them to see every option.
        </div>
      ) : display === 'map' ? (
        <HotelsMapView
          venueLat={manifest.logistics?.venueLat}
          venueLng={manifest.logistics?.venueLng}
          venueName={manifest.logistics?.venue}
          hotels={visible}
          tones={hotelTones}
          badges={badges}
        />
      ) : (() => {
        // Stable, content-derived ids. Two hotels with the same
        // name+address will share an id (which is a duplicate the
        // host should fix anyway). Critical: the id must be the
        // same id the *panel* will compute on its side so click +
        // drag-reorder + badge writes all align.
        const cardItems = visible.map((h, i) => ({
          ...h,
          id: stableHotelId(h, i),
        }));
        // Drag-to-reorder turns on when editMode + the parent
        // supplied an onReorder. We feed CanvasSortable the same
        // visible array; it tracks order locally during the
        // gesture and calls onReorder with the post-drop order
        // when the host releases. Map mode early-returns above
        // so display here is narrowed to 'photo' | 'icon'.
        if (editMode && onReorder) {
          return (
            <CanvasSortable
              items={cardItems}
              onReorder={(next) => {
                // Drag-to-reorder flips the local sort to 'manual'
                // so the manifest order persists through subsequent
                // re-renders. Without this, sorting re-applies on
                // the next pass and snaps the cards back to the
                // pearPick / rating / closest order.
                setSort('manual');
                onReorder(next as unknown as HotelCardModel[]);
              }}
              renderItem={(item, ctx) => {
                const i = ctx.index;
                const tone = hotelTones[i % hotelTones.length] as 'peach' | 'lavender' | 'sage';
                return (
                  <HotelCard
                    hotel={item}
                    tone={tone}
                    display={display}
                    badges={badges[i] ?? []}
                    eventDate={manifest.logistics?.date}
                    hotelId={item.id}
                    editMode={editMode}
                    onRemove={() => onRemove?.(i, item)}
                    onFocus={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('pearloom:hotel-quick-edit', { detail: { hotelId: item.id } }));
                      }
                      jumpToPanelRow('travel', 'pearloom:focus-hotel-row', { hotelId: item.id });
                    }}
                    dragHandleProps={ctx.dragHandleProps}
                  />
                );
              }}
            />
          );
        }
        return cardItems.map((h, i) => {
          const tone = hotelTones[i % hotelTones.length] as 'peach' | 'lavender' | 'sage';
          return (
            <HotelCard
              key={h.id}
              hotel={h}
              tone={tone}
              display={display}
              badges={badges[i] ?? []}
              eventDate={manifest.logistics?.date}
              hotelId={h.id}
              editMode={editMode}
              onRemove={editMode ? () => onRemove?.(i, h) : undefined}
              onFocus={editMode ? () => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('pearloom:hotel-quick-edit', { detail: { hotelId: h.id } }));
                }
                jumpToPanelRow('travel', 'pearloom:focus-hotel-row', { hotelId: h.id });
              } : undefined}
            />
          );
        });
      })()}
    </div>
  );
}

// HotelsMapView — static map with venue + numbered hotel pins,
// followed by a compact legend list below. Hotels missing lat/lng
// just don't get a pin (the legend still shows them so the host's
// hand-typed entries aren't hidden).
function HotelsMapView({
  venueLat,
  venueLng,
  venueName,
  hotels,
  tones,
  badges,
}: {
  venueLat?: number;
  venueLng?: number;
  venueName?: string;
  hotels: HotelCardModel[];
  tones: Array<'peach' | 'lavender' | 'sage'>;
  badges: HotelBadge[][];
}) {
  // Map-pinnable hotels = those with lat/lng. Always-visible
  // legend = all visible hotels regardless of pin availability.
  const pinned = hotels
    .map((h, i) => ({ h, i, lat: h.lat, lng: h.lng }))
    .filter((x): x is { h: HotelCardModel; i: number; lat: number; lng: number } =>
      typeof x.lat === 'number' && typeof x.lng === 'number',
    );
  const center = (typeof venueLat === 'number' && typeof venueLng === 'number')
    ? `${venueLat.toFixed(5)},${venueLng.toFixed(5)}`
    : pinned[0] ? `${pinned[0].lat.toFixed(5)},${pinned[0].lng.toFixed(5)}` : null;

  const params = new URLSearchParams();
  if (center) params.set('center', center);
  // Auto-zoom: 12 if hotels span >5km, 14 if all within 1km, 13 default.
  let zoom = 13;
  if (pinned.length > 0 && typeof venueLat === 'number' && typeof venueLng === 'number') {
    const maxDistKm = Math.max(...pinned.map((p) => {
      const R = 6371;
      const phi1 = (venueLat * Math.PI) / 180;
      const phi2 = (p.lat * Math.PI) / 180;
      const dPhi = ((p.lat - venueLat) * Math.PI) / 180;
      const dLambda = ((p.lng - venueLng) * Math.PI) / 180;
      const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }));
    if (maxDistKm < 1) zoom = 14;
    else if (maxDistKm > 8) zoom = 11;
    else if (maxDistKm > 5) zoom = 12;
  }
  params.set('zoom', String(zoom));
  params.set('size', '720x420');
  if (typeof venueLat === 'number' && typeof venueLng === 'number') {
    params.set('venue', `${venueLat.toFixed(5)},${venueLng.toFixed(5)}`);
  }
  if (pinned.length > 0) {
    params.set('hotels', pinned.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';'));
  }

  const mapSrc = center ? `/api/maps/static?${params.toString()}` : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {mapSrc ? (
        <img
          src={mapSrc}
          alt={venueName ? `Map of ${venueName} and nearby hotels` : 'Map of nearby hotels'}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            aspectRatio: '720 / 420',
            objectFit: 'cover',
            borderRadius: 18,
            border: '1px solid var(--card-ring)',
            boxShadow: '0 4px 12px -8px rgba(14,13,11,0.18)',
            background: 'var(--cream-2)',
          }}
        />
      ) : (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 14,
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          Set a venue with a real address, then hotels will pin to the map.
        </div>
      )}
      <ol
        className="pl-cascade-row"
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {hotels.map((h, i) => {
          const num = pinned.find((p) => p.i === i);
          const numLabel = num ? pinned.findIndex((p) => p.i === i) + 1 : null;
          const tone = tones[i % tones.length];
          const tintBg =
            tone === 'peach' ? 'var(--peach-bg)' :
            tone === 'lavender' ? 'var(--lavender-bg)' :
            'var(--sage-tint)';
          return (
            <li
              key={i}
              className="pl8-hotel-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 14px',
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: numLabel ? 'var(--ink)' : tintBg,
                  color: numLabel ? 'var(--cream)' : 'var(--ink-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {numLabel ?? <Icon name="moon" size={14} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{h.name}</span>
                  {(badges[i] ?? []).includes('top') && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink, #C6703D)',
                      }}
                    >
                      ★ Pear&apos;s pick
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--ink-soft)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[
                    typeof h.rating === 'number' ? `★ ${h.rating.toFixed(1)}` : null,
                    reformatDistanceToMiles(h.distance),
                  ].filter(Boolean).join(' · ') || h.address}
                </div>
              </div>
              {h.bookingUrl && (
                <a
                  href={h.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: 'var(--ink)',
                    color: 'var(--cream)',
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                  }}
                >
                  Book
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// RsvpPulseRibbon — fetches /api/rsvp/pulse on mount, renders
// a 3-stat ribbon (Yes / No / Pending) and a "Recently RSVPd"
// stream of first names. Hides itself when no responses exist
// yet so a brand-new site doesn't read as "0 yes / 0 no" at
// the top of the form. Auto-refreshes every 60 seconds for
// the pre-day-of host who keeps the tab open.
interface RsvpPulse {
  yes: number;
  no: number;
  pending: number;
  total: number;
  recent: Array<{ firstName: string; status: 'yes' | 'no'; ts: string }>;
}
function RsvpPulseRibbon({ siteSlug }: { siteSlug?: string }) {
  const [pulse, setPulse] = useState<RsvpPulse | null>(null);
  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/rsvp/pulse?siteId=${encodeURIComponent(siteSlug ?? '')}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as RsvpPulse;
        if (!cancelled) setPulse(data);
      } catch { /* silent */ }
    }
    void load();
    const id = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [siteSlug]);

  if (!pulse || pulse.total === 0) return null;

  return (
    <div
      style={{
        marginTop: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div
        role="status"
        aria-label="RSVP counts"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'var(--card)',
          border: '1px solid var(--card-ring)',
          borderRadius: 999,
          boxShadow: '0 4px 12px -8px rgba(14,13,11,0.15)',
        }}
      >
        <RsvpStat n={pulse.yes} label="yes" tone="peach" />
        <span style={{ width: 1, height: 16, background: 'var(--line-soft)' }} aria-hidden />
        <RsvpStat n={pulse.no} label="no" tone="muted" />
        {pulse.pending > 0 && (
          <>
            <span style={{ width: 1, height: 16, background: 'var(--line-soft)' }} aria-hidden />
            <RsvpStat n={pulse.pending} label="pending" tone="muted" />
          </>
        )}
      </div>
      {pulse.recent.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
            maxWidth: 520,
            fontSize: 11.5,
            color: 'var(--ink-soft)',
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginRight: 4 }}>
            Recently RSVPd
          </span>
          {pulse.recent.map((r, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 9px',
                background: r.status === 'yes' ? 'var(--peach-bg, rgba(198,112,61,0.10))' : 'var(--cream-2)',
                color: r.status === 'yes' ? 'var(--peach-ink, #C6703D)' : 'var(--ink-soft)',
                border: '1px solid var(--line-soft)',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {r.status === 'yes' ? '✓' : '·'} {r.firstName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RsvpStat({ n, label, tone }: { n: number; label: string; tone: 'peach' | 'muted' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
      <span
        className="display"
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          color: tone === 'peach' ? 'var(--peach-ink, #C6703D)' : 'var(--ink)',
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        {label}
      </span>
    </span>
  );
}

// AirportsBlock — compact list of nearby airports with the
// closest tagged "Closest" and a copy-the-IATA-code chip per
// row. Mixes legacy string entries (just a name) and new
// AirportEntry objects (name + lat/lng + distance).
interface AirportRow {
  id?: string;
  name: string;
  code?: string;
  address?: string;
  lat?: number;
  lng?: number;
  distance?: string;
}
function airportToRow(a: string | { id?: string; name?: string; code?: string; address?: string; lat?: number; lng?: number; distance?: string }): AirportRow {
  if (typeof a === 'string') return { name: a };
  return {
    id: a.id,
    name: a.name ?? '',
    code: a.code,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    distance: a.distance,
  };
}

function AirportsBlock({ manifest }: { manifest: StoryManifest }) {
  const edit = useIsEditMode();
  const raw = manifest.travelInfo?.airports ?? [];
  if (!raw.length) {
    if (!edit) return null;
    return null; // edit-time hint lives in TravelPanel — no canvas placeholder needed
  }
  const airports = raw.map(airportToRow);
  // Sort by parsed distance for guest-side display so "Closest"
  // is also at the top. Hotels-style miles parser.
  function distMeters(a: AirportRow): number {
    const d = a.distance ?? '';
    const mi = /^(\d+(?:\.\d+)?)\s*mi\b/i.exec(d);
    if (mi) return parseFloat(mi[1]) * 1609.344;
    const ft = /^(\d+(?:\.\d+)?)\s*ft\b/i.exec(d);
    if (ft) return parseFloat(ft[1]) / 3.28084;
    const km = /^(\d+(?:\.\d+)?)\s*km/i.exec(d);
    if (km) return parseFloat(km[1]) * 1000;
    return Number.MAX_SAFE_INTEGER;
  }
  const sorted = [...airports].sort((a, b) => distMeters(a) - distMeters(b));
  const closestIdx = sorted.findIndex((a) => distMeters(a) !== Number.MAX_SAFE_INTEGER);

  return (
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
        <Icon name="compass" size={13} /> Flying in
      </div>
      <h3 className="display" style={{ fontSize: 'clamp(32px, 4.5cqw, 44px)', margin: '0 0 16px' }}>
        Nearest <span className="display-italic">airports</span>
      </h3>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((a, i) => {
          const isClosest = i === closestIdx;
          return (
            <li
              key={a.id ?? a.name}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '14px 18px',
                background: 'var(--card)',
                border: isClosest ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--card-ring)',
                borderRadius: 14,
                boxShadow: isClosest ? '0 4px 12px -8px rgba(198,112,61,0.30)' : 'none',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isClosest ? 'var(--peach-bg)' : 'var(--cream-2)',
                  color: isClosest ? 'var(--peach-ink)' : 'var(--ink-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                {a.code ?? <Icon name="compass" size={18} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{a.name}</span>
                  {isClosest && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink, #C6703D)',
                        background: 'rgba(198,112,61,0.10)',
                        border: '1px solid rgba(198,112,61,0.32)',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      ★ Closest
                    </span>
                  )}
                </div>
                {(a.distance || a.address) && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>
                    {a.distance ? a.distance : a.address}
                  </div>
                )}
              </div>
              {a.address && (
                <OpenInMapsButton address={a.address} label="Directions" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Lightweight badge tags computed by HotelsList. Renders as
// pearl-flavoured pills in the top-right of each card so a guest
// scanning the section sees "the best one" at a glance instead
// of having to compare 4 sets of numbers.
type HotelBadge = 'top' | 'closest' | 'value';

/** Score each hotel for "Pear's pick" + figure out which is the
 *  closest and which is the best value. Multiple badges can land
 *  on the same hotel; rare in practice with ≥4 entries. */
function computeHotelBadges(hotels: HotelCardModel[]): HotelBadge[][] {
  const out: HotelBadge[][] = hotels.map(() => []);
  if (hotels.length === 0) return out;

  // Top score: rating × 1000 + log10(reviews) × 100. We don't
  // include distance here because the host's grid is already
  // distance-sorted in many cases — surfacing "highest quality"
  // is the more useful signal.
  function score(h: HotelCardModel): number {
    const r = h.rating ?? 0;
    const c = h.ratingCount ?? 0;
    return r * 1000 + Math.log10(c + 1) * 100;
  }
  const scored = hotels.map((h, i) => ({ i, s: score(h) }));
  scored.sort((a, b) => b.s - a.s);
  if (scored[0] && scored[0].s > 0) out[scored[0].i].push('top');

  // Closest: parse the leading number out of the formatted distance
  // string ("0.9 mi · ~3 min drive" / "200 ft · steps from venue"
  // / legacy "1.4 km"). Hotels without distance text are skipped —
  // can't sort what we don't know.
  function distMeters(h: HotelCardModel): number | null {
    const d = h.distance ?? '';
    const mi = /^(\d+(?:\.\d+)?)\s*mi\b/i.exec(d);
    if (mi) return parseFloat(mi[1]) * 1609.344;
    const ft = /^(\d+(?:\.\d+)?)\s*ft\b/i.exec(d);
    if (ft) return parseFloat(ft[1]) / 3.28084;
    const km = /^(\d+(?:\.\d+)?)\s*km/i.exec(d);
    if (km) return parseFloat(km[1]) * 1000;
    const m = /^(\d+(?:\.\d+)?)\s*m\b/i.exec(d);
    if (m) return parseFloat(m[1]);
    return null;
  }
  const withDist = hotels
    .map((h, i) => ({ i, d: distMeters(h) }))
    .filter((x): x is { i: number; d: number } => x.d !== null);
  if (withDist.length > 1) {
    withDist.sort((a, b) => a.d - b.d);
    if (!out[withDist[0].i].includes('top')) {
      out[withDist[0].i].push('closest');
    } else if (withDist[1]) {
      // If the closest is also the top, give the closest badge to
      // the runner-up so each badge surfaces a different hotel.
      out[withDist[1].i].push('closest');
    }
  }

  // Best value: rating ≥ 4.0, lowest priceLevel ($ or $$). Falls
  // back to "any rated hotel with priceLevel" when no $ or $$
  // exists. Skips when no hotel has a price tag at all.
  function priceTier(h: HotelCardModel): number | null {
    const p = (h.priceLevel ?? '').toUpperCase();
    if (p.includes('VERY_EXPENSIVE') || p === '$$$$') return 4;
    if (p.includes('EXPENSIVE') || p === '$$$') return 3;
    if (p.includes('MODERATE') || p === '$$') return 2;
    if (p.includes('INEXPENSIVE') || p === '$') return 1;
    return null;
  }
  const valueCandidates = hotels
    .map((h, i) => ({ i, t: priceTier(h), r: h.rating ?? 0 }))
    .filter((x): x is { i: number; t: number; r: number } => x.t !== null && x.r >= 4)
    .sort((a, b) => a.t - b.t || b.r - a.r);
  if (valueCandidates[0]) {
    const idx = valueCandidates[0].i;
    if (!out[idx].includes('top') && !out[idx].includes('closest')) {
      out[idx].push('value');
    }
  }

  return out;
}

// Group block code banner — appears above the hotel grid when the
// host set one in the Travel panel. Click-to-copy because nothing
// is more annoying than reading a 9-character rate code off a phone
// screen at the front desk.
function GroupBlockCodeBanner({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        padding: '12px 16px',
        background: 'var(--peach-bg, rgba(198,112,61,0.10))',
        border: '1px solid rgba(198,112,61,0.22)',
        borderRadius: 14,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
          }}
        >
          Group rate code
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink)',
            fontFamily: 'var(--font-ui, ui-monospace, monospace)',
            letterSpacing: '0.04em',
          }}
        >
          {code}
        </span>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            /* clipboard might be denied — silent */
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 999,
          background: 'var(--peach-ink, #C6703D)',
          color: '#FFFFFF',
          border: 'none',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} size={11} color="#FFFFFF" />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// Host-authored badge — same pearl pill shape as the auto ones,
// but the host picks both the label and the v8 tone. Renders
// without the ★ prefix since "Couple's pick" reads with the
// same authority the host put behind it.
function CustomBadgePill({ label, tone }: { label: string; tone: 'peach' | 'sage' | 'lavender' | 'ink' }) {
  const config =
    tone === 'sage'     ? { bg: 'var(--sage-tint, rgba(123,138,93,0.18))',     fg: '#3D4A1F', border: 'rgba(123,138,93,0.4)' } :
    tone === 'lavender' ? { bg: 'var(--lavender-bg, rgba(149,141,176,0.16))',  fg: '#5C4F8C', border: 'rgba(149,141,176,0.4)' } :
    tone === 'ink'      ? { bg: 'var(--ink, #0E0D0B)',                         fg: '#FFFFFF', border: 'var(--ink, #0E0D0B)' } :
                          { bg: 'var(--peach-bg, rgba(198,112,61,0.10))',      fg: 'var(--peach-ink, #C6703D)', border: 'rgba(198,112,61,0.32)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        background: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
        borderRadius: 999,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  );
}

function HotelBadgePill({ kind }: { kind: HotelBadge }) {
  const config = (
    kind === 'top'     ? { label: "Pear's pick", bg: 'var(--peach-ink, #C6703D)', fg: '#FFFFFF', border: 'var(--peach-ink, #C6703D)' } :
    kind === 'closest' ? { label: 'Closest',     bg: 'var(--sage-tint, rgba(123,138,93,0.18))', fg: '#3D4A1F', border: 'rgba(123,138,93,0.4)' } :
                          { label: 'Best value', bg: 'var(--lavender-bg, rgba(149,141,176,0.16))', fg: '#5C4F8C', border: 'rgba(149,141,176,0.4)' }
  );
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        background: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
        borderRadius: 999,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        boxShadow: kind === 'top' ? '0 4px 10px -4px rgba(198,112,61,0.50)' : 'none',
      }}
    >
      {kind === 'top' && <span aria-hidden style={{ fontSize: 9 }}>★</span>}
      {config.label}
    </span>
  );
}

/** Reformat a stored `distance` string into miles + drive minutes
 *  at render time, so manifests written before the miles switchover
 *  ("602 m", "1.4 km") still render in the new format without
 *  needing a re-fetch. Returns the original string when it's already
 *  in mi / ft (or is something we can't parse). */
function reformatDistanceToMiles(input: string | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  // Already mi or ft — leave alone.
  if (/\bmi\b|\bft\b/i.test(trimmed)) return trimmed;
  // Pull out the leading distance value.
  const km = /^(\d+(?:\.\d+)?)\s*km/i.exec(trimmed);
  const m = /^(\d+(?:\.\d+)?)\s*m\b/i.exec(trimmed);
  let meters: number | null = null;
  if (km) meters = parseFloat(km[1]) * 1000;
  else if (m) meters = parseFloat(m[1]);
  if (meters === null) return trimmed;
  if (meters < 300) {
    const ft = Math.round(meters * 3.28084);
    return `${ft} ft · steps from venue`;
  }
  const miles = meters / 1609.344;
  const driveMin = Math.max(1, Math.round(miles * 2.8));
  if (miles < 0.5) return `${miles.toFixed(2)} mi · ~${driveMin} min drive`;
  if (miles < 10)  return `${miles.toFixed(1)} mi · ~${driveMin} min drive`;
  return `${Math.round(miles)} mi · ~${driveMin} min drive`;
}

function HotelCard({
  hotel,
  tone,
  display = 'photo',
  badges = [],
  eventDate,
  hotelId,
  editMode = false,
  onRemove,
  onFocus,
  dragHandleProps,
}: {
  hotel: HotelCardModel;
  tone: 'peach' | 'lavender' | 'sage';
  /** 'icon' renders the editorial moon-glyph variant even when a
   *  Google photoUrl is present. */
  display?: 'photo' | 'icon';
  badges?: HotelBadge[];
  /** Event date (YYYY-MM-DD) — when set, the Book button gets
   *  `?checkin=DATE&checkout=DATE+1` deep-link params so the
   *  booking site lands on the right night. Param names match
   *  major chains (booking.com, marriott, hilton, etc). */
  eventDate?: string;
  /** Stable id for the canvas-side click-to-focus jump. Stamped
   *  as `data-pl-hotel-id` so the editor can scroll the panel to
   *  the matching row. */
  hotelId?: string;
  /** When true, render canvas chrome: hover-reveal × button +
   *  whole card becomes a click target that focuses the panel. */
  editMode?: boolean;
  onRemove?: () => void;
  onFocus?: () => void;
  /** dnd-kit activator props — when supplied, the card adds a
   *  hover-reveal grip handle that drives canvas drag-to-reorder. */
  dragHandleProps?: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void };
}) {
  // Old manifests stored the formatted distance in km/m. Convert
  // at render time so guests always see miles + minutes.
  const distanceLabel = reformatDistanceToMiles(hotel.distance);

  // Booking deeplink — when host has an event date, append
  // checkin/checkout params so the booking page opens on the
  // right night. Different chains use different param names; we
  // detect the domain and use the right one. Booking.com style
  // is the default for unrecognised domains since most modern
  // sites accept it (and ignore unknown params).
  const bookingHref = (() => {
    const url = hotel.bookingUrl;
    if (!url || !eventDate) return url;
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      const checkin = eventDate;
      const next = parseLocalDate(eventDate);
      if (!next) return url;
      next.setDate(next.getDate() + 1);
      // Local-midnight Date → YYYY-MM-DD via the local accessors,
      // not toISOString (which would shift by the local offset).
      const checkout = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      // Per-chain param mapping. When in doubt, fall through to
      // the booking.com style — Marriott, Hilton, IHG, Hyatt,
      // Choice, Best Western, Accor all accept it (or ignore).
      if (host.includes('marriott')) {
        u.searchParams.set('fromDate', checkin);
        u.searchParams.set('toDate', checkout);
      } else if (host.includes('hilton')) {
        u.searchParams.set('arrivalDate', checkin);
        u.searchParams.set('departureDate', checkout);
      } else if (host.includes('hotels.com') || host.includes('expedia')) {
        u.searchParams.set('startDate', checkin);
        u.searchParams.set('endDate', checkout);
      } else if (host.includes('airbnb')) {
        u.searchParams.set('check_in', checkin);
        u.searchParams.set('check_out', checkout);
      } else {
        // Booking.com + the long tail.
        u.searchParams.set('checkin', checkin);
        u.searchParams.set('checkout', checkout);
      }
      return u.toString();
    } catch {
      return url;
    }
  })();

  // Photo carousel — up to 5 Google Places photos, flipped
  // through with prev/next buttons. Guest-side state, resets on
  // re-render of a different hotel since `photoIdx` is per-card.
  const allPhotos = (hotel.photoUrls && hotel.photoUrls.length > 0)
    ? hotel.photoUrls
    : (hotel.photoUrl ? [hotel.photoUrl] : []);
  const [photoIdx, setPhotoIdx] = useState(0);
  const safeIdx = Math.min(photoIdx, Math.max(0, allPhotos.length - 1));
  const currentPhoto = display === 'icon' ? null : (allPhotos[safeIdx] ?? null);
  const showCarouselNav = display !== 'icon' && allPhotos.length > 1;
  const tintBg =
    tone === 'peach' ? 'var(--peach-bg)' :
    tone === 'lavender' ? 'var(--lavender-bg)' :
    'var(--sage-tint)';
  // (legacy single-photo helper — `currentPhoto` from the
  // carousel below is what actually renders.)
  // Description preference: explicit description → notes (legacy
  // channel that older hotels used) → empty.
  const blurb = hotel.description ?? hotel.notes ?? '';
  // Editorial price label: Google's PRICE_LEVEL enum is
  // PRICE_LEVEL_INEXPENSIVE / MODERATE / EXPENSIVE / VERY_EXPENSIVE.
  // Map to standard $ glyphs so the host doesn't see SCREAMING_CASE.
  const priceGlyph = (() => {
    const p = hotel.priceLevel ?? hotel.groupRate ?? '';
    if (!p) return '';
    if (p.includes('VERY_EXPENSIVE') || p === '$$$$') return '$$$$';
    if (p.includes('EXPENSIVE') || p === '$$$') return '$$$';
    if (p.includes('MODERATE') || p === '$$') return '$$';
    if (p.includes('INEXPENSIVE') || p === '$') return '$';
    return p;  // host-typed nightly rate — show as-is
  })();
  // Real nightly-rate range when Google has one. Falls back to a
  // priceLevel-tiered estimate (USD) when missing — better to show
  // "~$200-380/night" than just "$$$" the user has to mentally
  // translate. Empty string when there's no signal at all.
  const priceRangeLabel = (() => {
    const r = hotel.priceRange;
    const fmt = (n: number, cur?: string) => {
      const symbol = (cur === 'USD' || !cur) ? '$' : `${cur} `;
      // Drop dollar-cents on whole-numbered rates.
      return `${symbol}${Math.round(n)}`;
    };
    if (r && (typeof r.start === 'number' || typeof r.end === 'number')) {
      if (typeof r.start === 'number' && typeof r.end === 'number') {
        return `${fmt(r.start, r.currency)}–${Math.round(r.end)}/night`;
      }
      const single = (r.start ?? r.end) as number;
      return `${fmt(single, r.currency)}/night`;
    }
    // Fallback estimate from priceLevel. Coarse but useful.
    const tier = priceGlyph;
    if (tier === '$')    return '~$80–150/night est.';
    if (tier === '$$')   return '~$130–220/night est.';
    if (tier === '$$$')  return '~$200–380/night est.';
    if (tier === '$$$$') return '~$350–700/night est.';
    return '';
  })();
  // Filter auto-badges per host overrides — Pearloom auto-tags
  // Pear's pick / Closest / Best value, but the host can suppress
  // any of them via the BadgesEditor in the Travel panel.
  const hideAutoSet = new Set<HotelBadge>(hotel.badges?.hideAuto ?? []);
  const visibleAutoBadges = badges.filter((b) => !hideAutoSet.has(b));
  const customBadges = hotel.badges?.custom ?? [];
  const totalBadges = visibleAutoBadges.length + customBadges.length;
  // Pearl-pick gets a pearl-accent border so the eye lands there
  // first; closest + value just stay as small pills in the corner.
  // Honor the override — if the host hid the top badge, drop the
  // ring too.
  const isTop = visibleAutoBadges.includes('top');
  // Stack the three meta rails into chips. Hide rails that are empty
  // so the card never reads as half-full.
  return (
    <article
      className={`pl8-hotel-card pl8-card-lift${isTop ? ' pl8-hotel-card-top' : ''}${editMode ? ' pl8-hotel-card-edit' : ''}`}
      data-pl-hotel-id={hotelId}
      onClick={editMode ? (e) => {
        // Don't hijack clicks on inner buttons/links/inputs.
        const target = e.target as Element;
        if (target.closest('a, button, input, textarea, [role="button"]')) return;
        onFocus?.();
      } : undefined}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: 16,
        padding: 'var(--pl-block-card-padding, 14px)',
        borderRadius: 'var(--pl-block-card-radius, var(--pl-card-radius, 18px))',
        background: 'var(--card)',
        // Border: when the host picks 'none' on a section, the var is '0'
        // and the ring vanishes. The "Pear's pick" highlight wins so a
        // top hotel still reads with its accent edge.
        border: isTop
          ? '1.5px solid var(--peach-ink, #C6703D)'
          : 'var(--pl-block-card-border-width, 1px) solid var(--card-ring)',
        boxShadow: isTop
          ? '0 8px 24px -10px rgba(198,112,61,0.30), 0 0 0 4px rgba(198,112,61,0.06)'
          : 'var(--pl-block-card-shadow, 0 4px 12px -8px rgba(14,13,11,0.18))',
        overflow: 'hidden',
        cursor: editMode ? 'pointer' : 'default',
      }}
    >
      {editMode && onRemove && (
        <button
          type="button"
          aria-label="Remove this hotel"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="pl8-hotel-card-remove"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 999,
            background: 'rgba(14,13,11,0.85)',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            zIndex: 4,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            lineHeight: 1,
            opacity: 0,
            transition: 'opacity 160ms ease, transform 160ms ease',
          }}
        >
          ×
        </button>
      )}
      {editMode && dragHandleProps && (
        <CanvasGripHandle dragHandleProps={dragHandleProps} ariaLabel="Drag to reorder hotel" position="top-left" />
      )}
      {/* Badges row was previously absolute-positioned in the
          top-right of the article — that overlapped longer hotel
          names ("Hyatt Centric Las Olas Fort Lauderdale" wrapped
          two lines under the badge). Now they live inline at the
          top of the content cell so the title always has room. */}
      <div
        aria-hidden={!currentPhoto}
        style={{
          width: 120,
          aspectRatio: '4 / 5',
          borderRadius: 12,
          background: currentPhoto
            ? `linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.20) 100%), url(${currentPhoto}) center/cover no-repeat`
            : tintBg,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-soft)',
          flexShrink: 0,
          position: 'relative',
          transition: 'background-image 220ms ease',
        }}
      >
        {!currentPhoto && <Icon name="moon" size={32} />}
        {showCarouselNav && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPhotoIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length);
              }}
              style={{
                position: 'absolute',
                left: 4, top: '50%',
                transform: 'translateY(-50%)',
                width: 22, height: 22,
                borderRadius: 999,
                background: 'rgba(14,13,11,0.55)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                lineHeight: 1,
                backdropFilter: 'blur(4px)',
              }}
            >‹</button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPhotoIdx((i) => (i + 1) % allPhotos.length);
              }}
              style={{
                position: 'absolute',
                right: 4, top: '50%',
                transform: 'translateY(-50%)',
                width: 22, height: 22,
                borderRadius: 999,
                background: 'rgba(14,13,11,0.55)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                lineHeight: 1,
                backdropFilter: 'blur(4px)',
              }}
            >›</button>
            {/* Photo dot indicator at the bottom — small enough to
                stay decorative, big enough to read which slide
                you're on without counting. */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                bottom: 6,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'inline-flex',
                gap: 3,
              }}
            >
              {allPhotos.map((_, j) => (
                <span
                  key={j}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: j === safeIdx ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {totalBadges > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              marginBottom: 2,
            }}
          >
            {visibleAutoBadges.includes('top') && <HotelBadgePill kind="top" />}
            {visibleAutoBadges.includes('closest') && <HotelBadgePill kind="closest" />}
            {visibleAutoBadges.includes('value') && <HotelBadgePill kind="value" />}
            {customBadges.map((cb) => (
              <CustomBadgePill key={cb.id} label={cb.label} tone={cb.tone ?? 'peach'} />
            ))}
          </div>
        )}
        <h3
          style={{
            fontSize: 'clamp(16px, 1.6cqw, 18px)',
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.2,
            color: 'var(--ink)',
          }}
        >
          {hotel.name || 'Hotel'}
        </h3>
        {(typeof hotel.rating === 'number' || priceRangeLabel || priceGlyph || distanceLabel) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
              fontSize: 12,
              color: 'var(--ink-soft)',
            }}
          >
            {typeof hotel.rating === 'number' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 9px',
                  background: 'var(--peach-bg, rgba(198,112,61,0.10))',
                  color: 'var(--peach-ink, #C6703D)',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                }}
                aria-label={`Rated ${hotel.rating.toFixed(1)} out of 5${hotel.ratingCount ? ` from ${hotel.ratingCount} reviews` : ''}`}
              >
                <span aria-hidden style={{ fontSize: 12 }}>★</span>
                {hotel.rating.toFixed(1)}
                {hotel.ratingCount ? (
                  <span style={{ opacity: 0.75, fontWeight: 600 }}>
                    · {hotel.ratingCount.toLocaleString()} reviews
                  </span>
                ) : null}
              </span>
            )}
            {priceRangeLabel ? (
              <span
                title={priceGlyph ? `${priceGlyph} tier` : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '0.01em',
                  fontSize: 11.5,
                }}
              >
                {priceRangeLabel.includes('est.') && (
                  <span aria-hidden style={{ opacity: 0.55, fontWeight: 600, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.12em' }}>est</span>
                )}
                {priceRangeLabel.replace(' est.', '')}
              </span>
            ) : priceGlyph && (
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '0.02em',
                }}
              >
                {priceGlyph}
              </span>
            )}
            {hotel.distance && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  color: 'var(--ink-soft)',
                }}
              >
                <Icon name="pin" size={11} /> {hotel.distance}
              </span>
            )}
          </div>
        )}
        {blurb && (
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'var(--ink-soft)',
              margin: 0,
            }}
          >
            {blurb}
          </p>
        )}
        {hotel.amenities && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {hotel.amenities}
          </div>
        )}
        {hotel.address && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-muted)',
              marginTop: 2,
            }}
          >
            {hotel.address}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
          }}
        >
          {hotel.bookingUrl && (
            <a
              href={bookingHref}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--ink)',
                color: 'var(--cream)',
                fontSize: 11.5,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              <Icon name="arrow-ur" size={11} /> Book
            </a>
          )}
          {hotel.address && (
            <OpenInMapsButton address={hotel.address} label="Directions" />
          )}
        </div>
      </div>
    </article>
  );
}

function TravelSectionImpl({ manifest, onEditField }: { manifest: StoryManifest; onEditField?: FieldEditor }) {
  const edit = useIsEditMode();
  const venue = manifest.logistics?.venue ?? 'Our venue';
  const address = manifest.logistics?.venueAddress ?? '';
  const hotels = manifest.travelInfo?.hotels ?? [];
  const hotelTones: Tone[] = ['peach', 'lavender', 'sage'];
  // Real sites only — no placeholder hotel cards. If nothing is set
  // and we're not in edit mode, just show venue + map.
  const showPlacesToStay = hotels.length > 0 || edit;
  return (
    <section id="travel" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
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
              <SectionStamp url={manifest.decorLibrary?.sectionStamps?.travel} fallbackIcon="pin" size={20} slotKey="travel" />
              The venue
            </div>
            <h3 className="display" style={{ fontSize: 'clamp(32px, 4.5cqw, 44px)', margin: '0 0 16px' }}>
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
            {/* Airports — sit DIRECTLY beneath the venue on the
                left column. Used to land at the end of the
                pl8-cols-2 grid as a third child (so they fell
                under "Places to stay" on the right) which read as
                "this is part of the hotels". They're venue-context
                so they belong with the venue column. */}
            <AirportsBlock manifest={manifest} />
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
              <h3 className="display" style={{ fontSize: 'clamp(32px, 4.5cqw, 44px)', margin: '0 0 16px' }}>
                Sleep <span className="display-italic">somewhere lovely</span>
              </h3>
              {hotels.length === 0 && edit && (
                <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
                  Nothing yet. Add hotel blocks from the Travel panel.
                </p>
              )}
              {hotels.length > 0 && (
                <HotelsList
                  manifest={manifest}
                  hotels={hotels as unknown as HotelCardModel[]}
                  hotelTones={hotelTones as Array<'peach' | 'lavender' | 'sage'>}
                  editMode={edit}
                  onRemove={edit && onEditField ? (_idxInVisible, target) => {
                    onEditField((m) => {
                      // Resolve on BOTH sides — legacy travel.hotels
                      // and canonical travelInfo.hotels — by stable id.
                      // Both are kept in lockstep so the panel's
                      // findIndex(x => x.id === h.id) keeps working.
                      const tid = stableHotelId(target as { id?: string; name?: string; address?: string });
                      const filterByStableId = (list: Array<{ id?: string; name?: string; address?: string }>) =>
                        list.filter((x, i) => stableHotelId(x, i) !== tid);
                      const legacyTravel = (m as unknown as { travel?: { hotels?: Array<{ id?: string; name?: string; address?: string }> } }).travel ?? {};
                      const legacyHotels = legacyTravel.hotels ?? [];
                      const infoHotels = m.travelInfo?.hotels ?? [];
                      return {
                        ...m,
                        travel: { ...legacyTravel, hotels: filterByStableId(legacyHotels) },
                        travelInfo: { ...(m.travelInfo ?? { airports: [], hotels: [] }), hotels: filterByStableId(infoHotels) as typeof infoHotels },
                      } as StoryManifest;
                    });
                  } : undefined}
                  onReorder={edit && onEditField ? (next) => {
                    onEditField((m) => {
                      // Reorder both sides by stable id. Critical:
                      // we DO NOT overwrite the panel's richer Hotel
                      // records with the canvas's HotelBlock projection
                      // (that strips fields like the panel-only
                      // `description` and the Hotel.id we want to
                      // preserve). Instead, build the new order by
                      // matching ids and pulling the originals through.
                      const orderIds = next.map((nh, i) => stableHotelId(nh as { id?: string; name?: string; address?: string }, i));
                      const reorderList = <T extends { id?: string; name?: string; address?: string }>(list: T[]): T[] => {
                        const byId = new Map(list.map((x, i) => [stableHotelId(x, i), x]));
                        const reordered = orderIds.map((id) => byId.get(id)).filter((x): x is T => Boolean(x));
                        // Append anything that wasn't in the visible
                        // window (sort + slice(0, 6)) so we don't lose
                        // hotels 7+.
                        const visibleIds = new Set(orderIds);
                        const tail = list.filter((x, i) => !visibleIds.has(stableHotelId(x, i)));
                        return [...reordered, ...tail];
                      };
                      const legacyTravel = (m as unknown as { travel?: { hotels?: Array<{ id?: string; name?: string; address?: string }> } }).travel ?? {};
                      const legacyHotels = legacyTravel.hotels ?? [];
                      const infoHotels = m.travelInfo?.hotels ?? [];
                      return {
                        ...m,
                        travel: { ...legacyTravel, hotels: reorderList(legacyHotels) },
                        travelInfo: { ...(m.travelInfo ?? { airports: [], hotels: [] }), hotels: reorderList(infoHotels) as typeof infoHotels },
                      } as StoryManifest;
                    });
                  } : undefined}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==================== REGISTRY ==================== */
// Single registry card — extracted from RegistrySectionImpl so
// the same shape renders both grouped + flat layouts. The
// "Most loved" pill stamps the *first* card so the host's
// preferred order surfaces at the top.
interface RegistryCardGift {
  name: string;
  d: string;
  url: string;
  icon: string;
  tone: 'peach' | 'sage' | 'lavender';
  /** Optional product / retailer thumbnail. Replaces the colored
   *  icon block when set; the card reads as a polished wishlist
   *  tile rather than a generic link. */
  photoUrl?: string;
  /** Free-form price label ("$120", "Group gift", "From $40"). */
  priceLabel?: string;
  badges?: { hideAuto?: string[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> };
}
function RegistryCard({
  gift,
  isMostLoved,
  registryId,
  editMode,
  onRemove,
  onFocus,
  badges,
  claim,
  onMarkBought,
}: {
  gift: RegistryCardGift;
  isMostLoved?: boolean;
  registryId?: string;
  editMode?: boolean;
  onRemove?: () => void;
  onFocus?: () => void;
  badges?: { hideAuto?: string[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> };
  /** Claim summary for this entry from /api/registry-link-claims —
   *  count of claimers + first names of the first 3. When present
   *  with count > 0, the card surfaces a "Linda got this" pill. */
  claim?: { count: number; top: Array<{ name: string }> };
  /** Opens the claim modal scoped to this entry. */
  onMarkBought?: () => void;
}) {
  const hideMostLoved = badges?.hideAuto?.includes('mostLoved');
  const showMostLoved = isMostLoved && !hideMostLoved;
  const customBadges = badges?.custom ?? [];
  return (
    <div
      className={`pl8-card-lift${editMode ? ' pl8-canvas-row' : ''}`}
      data-pl-registry-id={registryId}
      onClick={editMode ? (e) => {
        const target = e.target as Element;
        if (target.closest('a, button')) return;
        onFocus?.();
      } : undefined}
      style={{
        position: 'relative',
        background: 'var(--card)',
        border: showMostLoved
          ? '1.5px solid var(--peach-ink, #C6703D)'
          : 'var(--pl-block-card-border-width, 1px) solid var(--card-ring)',
        borderRadius: 'var(--pl-block-card-radius, var(--pl-card-radius, 20px))',
        padding: 'var(--pl-block-card-padding, 24px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        // Match Details cards — flex children align with the host's
        // text-align pick, so the gift icon + label + body all
        // center / right-align together when picked.
        alignItems: 'var(--pl-block-align-items, flex-start)' as React.CSSProperties['alignItems'],
        boxShadow: showMostLoved
          ? '0 8px 24px -10px rgba(198,112,61,0.30), 0 0 0 4px rgba(198,112,61,0.06)'
          : 'var(--pl-block-card-shadow, none)',
        cursor: editMode ? 'pointer' : 'default',
      }}
    >
      {editMode && onRemove && (
        <button
          type="button"
          aria-label="Remove this registry"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="pl8-canvas-remove"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 26,
            height: 26,
            borderRadius: 999,
            background: 'rgba(14,13,11,0.85)',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            zIndex: 4,
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            lineHeight: 1,
            opacity: 0,
            transition: 'opacity 160ms ease',
          }}
        >
          ×
        </button>
      )}
      {/* Auto + custom badges stacked top-right. The auto "Most
          loved" lights up first; host-authored chips render below
          it so the resting card stays visually clean. */}
      {(showMostLoved || customBadges.length > 0) && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
          }}
        >
          {showMostLoved && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 9px',
                background: 'var(--peach-ink, #C6703D)',
                color: '#FFFFFF',
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 10px -3px rgba(198,112,61,0.45)',
              }}
            >
              <span aria-hidden style={{ fontSize: 9 }}>★</span>
              Most loved
            </span>
          )}
          {customBadges.map((cb) => (
            <SectionCustomBadge key={cb.id} label={cb.label} tone={cb.tone ?? 'peach'} />
          ))}
        </div>
      )}
      {/* Thumbnail / icon block. Real product photo when the host
          uploaded one, retailer favicon when the URL is well-known
          and no photo is set, abstract tone block as last resort. */}
      {gift.photoUrl ? (
        <div
          style={{
            width: '100%',
            aspectRatio: '4/3',
            borderRadius: 12,
            background: `var(--cream-2, #F5EFE2) center/cover no-repeat url(${gift.photoUrl})`,
            border: '1px solid rgba(14,13,11,0.06)',
          }}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background:
              gift.tone === 'peach' ? 'var(--peach-bg)' : gift.tone === 'sage' ? 'var(--sage-tint)' : 'var(--lavender-bg)',
            color:
              gift.tone === 'peach' ? 'var(--peach-ink)' : gift.tone === 'sage' ? 'var(--sage-deep)' : 'var(--lavender-ink)',
            display: 'grid',
            placeItems: 'center',
            position: 'relative',
          }}
        >
          <Icon name={gift.icon} size={24} />
          <RetailerFavicon url={gift.url} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, width: '100%' }}>
        <div className="display" style={{ fontSize: 26 }}>
          {gift.name}
        </div>
        {gift.priceLabel && (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '3px 10px',
              borderRadius: 999,
              background: 'var(--cream-2, #F5EFE2)',
              color: 'var(--ink, #0E0D0B)',
              flexShrink: 0,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {gift.priceLabel}
          </span>
        )}
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>{gift.d}</p>
      {claim && claim.count > 0 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 999,
            background: 'rgba(139,156,90,0.18)',
            color: 'var(--sage-deep, #6d7d3f)',
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            alignSelf: 'flex-start',
          }}
        >
          <span aria-hidden style={{ fontSize: 10 }}>✓</span>
          {claimPillCopy(claim)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <a
          href={gift.url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-sm"
          style={{ justifyContent: 'center', flex: 1 }}
        >
          Contribute <Icon name="arrow-right" size={12} />
        </a>
        {onMarkBought && !editMode && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkBought(); }}
            title="Tell the couple you got this so no one doubles up"
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: '1px dashed rgba(139,156,90,0.55)',
              background: 'transparent',
              color: 'var(--sage-deep, #6d7d3f)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            I got this
          </button>
        )}
      </div>
    </div>
  );
}

// Modal a guest taps after they get a registry item from the
// retailer. Captures name + email + optional note so the host
// can see who's covered what; future ships use the email for
// thank-you note generation. Honor-system — Pearloom doesn't
// verify the purchase, just records the claim.
function RegistryClaimModal({
  siteSlug,
  entryUrl,
  entryName,
  onClose,
  onClaimed,
}: {
  siteSlug: string;
  entryUrl: string;
  entryName: string;
  onClose: () => void;
  onClaimed: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/registry-link-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteSlug,
          entryUrl,
          claimerEmail: email.trim(),
          claimerName: name.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Couldn't save (${r.status})`);
      }
      onClaimed(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your claim.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 360,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--card, #FBF7EE)',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
          fontFamily: 'var(--font-ui)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--sage-deep, #6d7d3f)',
            }}
          >
            Got it!
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 22,
              margin: '4px 0 0',
              color: 'var(--ink, #0E0D0B)',
              lineHeight: 1.2,
            }}
          >
            {entryName}
          </h3>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 12.5,
              color: 'var(--ink-soft, #3A332C)',
              lineHeight: 1.5,
            }}
          >
            Mark this as bought so no one doubles up. The couple sees your
            name; we keep your email for their thank-you list.
          </p>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted, #6F6557)', letterSpacing: '0.04em' }}>
            Your name (optional)
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Linda Chen"
            style={modalInputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted, #6F6557)', letterSpacing: '0.04em' }}>
            Email (for the thank-you)
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="linda@example.com"
            required
            style={modalInputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted, #6F6557)', letterSpacing: '0.04em' }}>
            A note (optional)
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="From the Patel family — congratulations!"
            maxLength={300}
            style={{ ...modalInputStyle, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
          />
        </label>
        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(122,45,45,0.08)',
              border: '1px solid rgba(122,45,45,0.22)',
              color: '#7A2D2D',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !email.includes('@')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 999,
              background: busy || !email.includes('@') ? 'var(--cream-2, #F5EFE2)' : 'var(--ink, #0E0D0B)',
              color: busy || !email.includes('@') ? 'var(--ink-muted, #6F6557)' : 'var(--cream, #FBF7EE)',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? 'wait' : !email.includes('@') ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {busy ? 'Saving…' : 'Mark as bought'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink-soft, #3A332C)',
              border: '1px solid var(--line, rgba(14,13,11,0.14))',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const modalInputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--line, rgba(14,13,11,0.14))',
  background: 'var(--paper, #FBF7EE)',
  fontSize: 13.5,
  color: 'var(--ink, #0E0D0B)',
  outline: 'none',
  fontFamily: 'var(--font-ui)',
};

// "Linda got this" / "Linda + 2 others got this" — keeps the
// pill copy short by only naming first names and collapsing
// long lists into "+ N others".
function claimPillCopy(c: { count: number; top: Array<{ name: string }> }): string {
  if (c.count === 0) return '';
  const names = c.top.map((t) => t.name).filter(Boolean);
  if (names.length === 0) return `${c.count} ${c.count === 1 ? 'guest' : 'guests'} got this`;
  if (c.count === 1) return `${names[0]} got this`;
  if (c.count === 2) return `${names[0]} & ${names[1] ?? 'another'} got this`;
  const remaining = c.count - 1;
  return `${names[0]} + ${remaining} ${remaining === 1 ? 'other' : 'others'} got this`;
}

// Cash-fund progress strip. Renders above the registry grid when
// the host set a target. Shows the fraction raised + a peach
// thread that fills proportionally. Pure presentation — Pearloom
// doesn't reconcile actual transactions. Hosts edit the raised
// amount as they receive contributions, OR a future webhook
// updates it on Stripe success.
function CashFundProgress({
  target,
  raised,
  currency,
  label,
  url,
}: {
  target: number;
  raised: number;
  currency: string;
  label?: string;
  url: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((raised / target) * 100)));
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        margin: '0 auto 32px',
        maxWidth: 560,
        padding: '18px 22px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(251,232,214,0.7) 0%, rgba(232,224,240,0.6) 100%)',
        border: '1px solid rgba(198,112,61,0.22)',
        textDecoration: 'none',
        color: 'var(--ink)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
          }}
        >
          Cash fund
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{fmt(raised)}</strong> of {fmt(target)}
        </span>
      </div>
      {label && (
        <div
          style={{
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--ink)',
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      )}
      <div
        aria-hidden
        style={{
          height: 6,
          marginTop: 14,
          borderRadius: 999,
          background: 'rgba(14,13,11,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--sage-deep, #6d7d3f), var(--peach-ink, #C6703D))',
            borderRadius: 999,
            transition: 'width 480ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 6,
          fontSize: 11.5,
          color: 'var(--ink-muted)',
        }}
      >
        <span>{pct}% there</span>
        <span style={{ color: 'var(--peach-ink, #C6703D)', fontWeight: 600 }}>
          Chip in →
        </span>
      </div>
    </a>
  );
}

// Tiny circular favicon overlay on the bottom-right of the icon
// block. Pulls the retailer's hostname favicon via Google's S2
// service so common stores (Zola, Amazon, Crate & Barrel) get a
// real-feeling brand cue without the host uploading anything.
// Hides when the favicon 404s (img onError sets aria-hidden true
// — we just collapse the wrapper instead).
function RetailerFavicon({ url }: { url: string }) {
  const host = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  })();
  if (!host) return null;
  return (
    <span
      style={{
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 999,
        background: '#FFFFFF',
        boxShadow: '0 2px 6px rgba(14,13,11,0.18)',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
      }}
      aria-hidden
    >
      <img
        src={`https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`}
        alt=""
        width={14}
        height={14}
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </span>
  );
}

// Auto-categorize a registry entry by name + note + URL keywords.
// "Cash fund" wins outright when the entry was minted from
// reg.cashFundUrl. "Travel" covers honeymoon experiences;
// "Kitchen" covers cookware/utensils; "Home" covers furnishings/
// linens; everything else stays under "Shop".
function categorizeRegistry(name: string, d: string, url: string): string {
  const text = `${name} ${d} ${url}`.toLowerCase();
  if (/\bcash\s*fund\b|\bvenmo\b|\bzelle\b|\bpaypal\b|\bgofundme\b|honey\s*moon\s*fund/.test(text)) return 'Cash + funds';
  if (/honeymoon|travel|trip|hotel|flight|experience|airbnb|viator|getaway/.test(text)) return 'Travel';
  if (/williams[\s-]?sonoma|sur\s+la\s+table|kitchen|cookware|cookbook|knife|knives|pot\s*&\s*pan|dishes|bowls|baking/.test(text)) return 'Kitchen';
  if (/pottery\s*barn|cb2|crate\s*&\s*barrel|west\s*elm|home|bedding|linens|lamp|sheet|towel|rug|throw\s*pillow|art|frame|decor/.test(text)) return 'Home';
  if (/amazon|target|zola|the\s*knot|honeyfund|wayfair|registry|shop/.test(text)) return 'Shop';
  return 'Shop';
}

function RegistrySectionImpl({ manifest, onEditField, siteSlug }: { manifest: StoryManifest; onEditField?: FieldEditor; siteSlug?: string }) {
  const edit = useIsEditMode();

  // Fetch existing claims so each card knows whether to show the
  // "Linda Chen got this" pill. Skips entirely in edit mode (no
  // claims on a draft preview) and when no siteSlug is available.
  type ClaimSummary = { count: number; top: Array<{ name: string }> };
  const [claims, setClaims] = useState<Record<string, ClaimSummary>>({});
  // The card opens this with the entry it represents; state moves
  // up here so a single modal renders per section.
  const [activeClaim, setActiveClaim] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => {
    if (edit || !siteSlug) return;
    let cancelled = false;
    fetch(`/api/registry-link-claims?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { claims?: Record<string, ClaimSummary> } | null) => {
        if (cancelled || !data?.claims) return;
        setClaims(data.claims);
      })
      .catch(() => { /* degrade silently */ });
    return () => { cancelled = true; };
  }, [edit, siteSlug]);
  function recordClaim(url: string, name: string) {
    setClaims((c) => {
      const cur = c[url] ?? { count: 0, top: [] };
      const firstName = (name || 'A guest').split(/\s+/)[0];
      return {
        ...c,
        [url]: {
          count: cur.count + 1,
          top: cur.top.length < 3 ? [...cur.top, { name: firstName }] : cur.top,
        },
      };
    });
  }
  function removeRegistry(url: string) {
    if (!onEditField) return;
    onEditField((m) => {
      const reg = (m as unknown as { registry?: { entries?: Array<{ url?: string }>; cashFundUrl?: string } }).registry;
      if (!reg) return m;
      const isCashFund = reg.cashFundUrl === url;
      const entries = (reg.entries ?? []).filter((e) => e.url !== url);
      const next = { ...reg, entries };
      if (isCashFund) {
        (next as { cashFundUrl?: string }).cashFundUrl = undefined;
        (next as { cashFundMessage?: string }).cashFundMessage = undefined;
      }
      // Also strip from the legacy flat-array shape if present.
      const legacy = (m as unknown as { registry?: Array<{ url?: string }> }).registry;
      const legacyArr = Array.isArray(legacy) ? legacy.filter((r) => r.url !== url) : undefined;
      const out: StoryManifest = { ...m, registry: next as StoryManifest['registry'] };
      if (legacyArr) (out as unknown as { registry?: unknown }).registry = legacyArr;
      return out;
    });
  }
  function focusRegistry(url: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:registry-quick-edit', { detail: { url } }));
    }
    jumpToPanelRow('registry', 'pearloom:focus-registry-row', { url });
  }
  // Pull from the real manifest shape: registry.entries[] +
  // registry.cashFundUrl / message. When nothing is set, the
  // whole section hides so we never ship "Honeymoon fund / A
  // good kitchen" demo copy.
  type RegistryEntry = {
    name?: string;
    label?: string;
    url: string;
    note?: string;
    photoUrl?: string;
    priceLabel?: string;
    badges?: { hideAuto?: string[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> };
  };
  const reg = manifest.registry as undefined | {
    enabled?: boolean;
    entries?: RegistryEntry[];
    cashFundUrl?: string;
    cashFundMessage?: string;
    cashFundTarget?: number;
    cashFundRaised?: number;
    cashFundCurrency?: string;
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
  const combined: RegistryCardGift[] = [];
  entries.forEach((e, i) => {
    if (!e.url || seenUrls.has(e.url)) return;
    seenUrls.add(e.url);
    combined.push({
      name: e.name ?? e.label ?? 'Registry',
      d: e.note ?? e.url.replace(/^https?:\/\//, '').split('/')[0],
      url: e.url,
      icon: ['gift', 'compass', 'image'][i % 3],
      tone: (['peach', 'sage', 'lavender'] as const)[i % 3],
      photoUrl: e.photoUrl,
      priceLabel: e.priceLabel,
      badges: e.badges,
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

  // Auto-bucket entries — "Cash + funds", "Travel", "Kitchen",
  // "Home", "Shop". When ≥2 buckets are populated AND ≥4 entries
  // exist, render under category headers; otherwise stay as a
  // single grid (small registries don't need the structure).
  const grouped = gifts.map((g) => ({ ...g, category: categorizeRegistry(g.name, g.d, g.url) }));
  const buckets: Record<string, typeof grouped> = {};
  for (const g of grouped) {
    const key = g.category;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(g);
  }
  const bucketKeys = ['Cash + funds', 'Kitchen', 'Home', 'Travel', 'Shop'].filter((k) => buckets[k]?.length);
  const showGroups = bucketKeys.length >= 2 && grouped.length >= 4;

  return (
    <section id="registry" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="registry" />
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {edit && (
          <DraftedByPearBanner
            sectionKey="registry"
            sectionLabel="Registry"
            manifest={manifest}
            onChange={(m) => onEditField?.(() => m)}
            onClear={() => onEditField?.((m) => ({ ...m, registry: { enabled: true, ...((m.registry as Record<string, unknown>) ?? {}), entries: [] }, draftedByPear: { ...(m.draftedByPear ?? {}), registry: false } } as unknown as StoryManifest))}
          />
        )}
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.registry} fallbackIcon="gift" size={20} slotKey="registry" />
            If you&apos;re asking
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 6cqw, 64px)', margin: '0 0 12px' }}>
            Registry, <span className="display-italic">gently</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-soft)', maxWidth: 560, margin: '0 auto', lineHeight: 1.55 }}>
            Your presence really is the gift. But if you&apos;d like to mark the day, here&apos;s where to find us.
          </p>
        </div>

        {/* Cash fund progress thread — when the host set a target,
            show how the fund's filling up. Reads as encouragement
            ("we're at 60%") rather than a dunning chart. Hidden
            when target is unset or zero. */}
        {reg?.cashFundUrl && reg.cashFundTarget && reg.cashFundTarget > 0 && (
          <CashFundProgress
            target={reg.cashFundTarget}
            raised={reg.cashFundRaised ?? 0}
            currency={reg.cashFundCurrency ?? 'USD'}
            label={reg.cashFundMessage}
            url={reg.cashFundUrl}
          />
        )}

        {showGroups ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {bucketKeys.map((key) => (
              <div key={key}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: 'var(--peach-ink)',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                    textAlign: 'center',
                  }}
                >
                  {key} · {buckets[key].length}
                </div>
                <div className="pl8-cols-3" style={{ gap: 20 }}>
                  {buckets[key].map((g, i) => (
                    <RegistryCard
                      key={`${key}-${i}`}
                      gift={g}
                      isMostLoved={g === grouped[0] && i === 0 && key === bucketKeys[0]}
                      registryId={g.url}
                      editMode={edit}
                      onRemove={edit ? () => removeRegistry(g.url) : undefined}
                      onFocus={edit ? () => focusRegistry(g.url) : undefined}
                      badges={(g as { badges?: { hideAuto?: string[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> } }).badges}
                      claim={claims[g.url]}
                      onMarkBought={!edit && siteSlug ? () => setActiveClaim({ url: g.url, name: g.name }) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pl8-cols-3" style={{ gap: 20 }}>
            {grouped.map((g, i) => (
              <RegistryCard
                key={i}
                gift={g}
                isMostLoved={i === 0}
                registryId={g.url}
                editMode={edit}
                onRemove={edit ? () => removeRegistry(g.url) : undefined}
                onFocus={edit ? () => focusRegistry(g.url) : undefined}
                badges={(g as { badges?: { hideAuto?: string[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> } }).badges}
                claim={claims[g.url]}
                onMarkBought={!edit && siteSlug ? () => setActiveClaim({ url: g.url, name: g.name }) : undefined}
              />
            ))}
          </div>
        )}
      </div>
      {activeClaim && siteSlug && (
        <RegistryClaimModal
          siteSlug={siteSlug}
          entryUrl={activeClaim.url}
          entryName={activeClaim.name}
          onClose={() => setActiveClaim(null)}
          onClaimed={(name) => {
            recordClaim(activeClaim.url, name);
            setActiveClaim(null);
          }}
        />
      )}
    </section>
  );
}

/* ==================== GALLERY ==================== */
function GallerySectionImpl({
  chapters, manifest, onEditField, siteSlug,
}: {
  chapters: Chapter[];
  manifest?: StoryManifest;
  onEditField?: FieldEditor;
  siteSlug?: string;
}) {
  const edit = useIsEditMode();
  // Build a mapping from each photo URL to the (chapter, image) it
  // came from so PhotoActionMenu can patch the original chapters[]
  // when a tile is replaced or removed.
  const photoSources = chapters.flatMap((c, ci) =>
    (c.images ?? []).map((img, ii) => ({ url: img.url, chapterIndex: ci, imageIndex: ii })),
  ).filter((x) => x.url);
  const photos = photoSources.map((p) => p.url).slice(0, 12);
  const sources = photoSources.slice(0, 12);

  // Live reactions — { [photoUrl]: count } + which ones I've hearted.
  // Polled once on mount + when the lightbox toggles a reaction
  // (the lightbox calls onReactionChange with the new count).
  const [reactions, setReactions] = useState<{ counts: Record<string, number>; mine: Record<string, true> }>({ counts: {}, mine: {} });
  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/gallery/reactions?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { counts: Record<string, number>; mine: Record<string, true> };
        if (!cancelled) setReactions(data);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [siteSlug]);

  // Find the most-loved photo to flag with a badge. Only when at
  // least 1 reaction exists — otherwise no photo deserves the
  // "Most loved" pin yet.
  const mostLovedUrl = (() => {
    let best: string | null = null;
    let bestCount = 0;
    for (const url of photos) {
      const c = reactions.counts[url] ?? 0;
      if (c > bestCount) { best = url; bestCount = c; }
    }
    return bestCount > 0 ? best : null;
  })();

  function applyReaction(photoUrl: string, count: number, reacted: boolean) {
    setReactions((prev) => {
      const counts = { ...prev.counts, [photoUrl]: count };
      const mine = { ...prev.mine };
      if (reacted) mine[photoUrl] = true;
      else delete mine[photoUrl];
      return { counts, mine };
    });
  }
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

  // Only render tiles for actual photos in published view. In editor
  // mode show 4 placeholder cells so the user has dropzones — but
  // never render the empty gradient grid on the published site.
  const renderCount = edit && photos.length === 0 ? 4 : photos.length;
  if (renderCount === 0) return null;

  async function toggleReaction(photoUrl: string) {
    if (!siteSlug) return;
    try {
      const res = await fetch('/api/gallery/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, photoUrl }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { reacted: boolean; count: number };
      applyReaction(photoUrl, data.count, data.reacted);
    } catch { /* silent */ }
  }

  return (
    <section id="gallery" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', background: 'var(--cream-2)', position: 'relative' }}>
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
              <SectionStamp url={manifest?.decorLibrary?.sectionStamps?.gallery} fallbackIcon="gallery" size={20} slotKey="gallery" />
              Along the way
            </div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6cqw, 64px)', margin: 0 }}>
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
          {tones.slice(0, renderCount).map((t, i) => {
            const s = spans[i] ?? {};
            const url = photos[i];
            const photoIndex = url ? lightboxImages.findIndex((img) => img.url === url) : -1;
            const clickable = photoIndex >= 0 && !edit;
            const src = sources[i];
            const onReplace = src && onEditField
              ? (next: string) => onEditField((m) => {
                  const arr = [...(m.chapters ?? [])];
                  const ch = arr[src.chapterIndex];
                  if (!ch) return m;
                  const imgs = [...(ch.images ?? [])];
                  const orig = imgs[src.imageIndex];
                  if (!orig) return m;
                  imgs[src.imageIndex] = { ...orig, url: next };
                  arr[src.chapterIndex] = { ...ch, images: imgs };
                  return { ...m, chapters: arr };
                })
              : undefined;
            const onRemove = src && onEditField
              ? () => onEditField((m) => {
                  const arr = [...(m.chapters ?? [])];
                  const ch = arr[src.chapterIndex];
                  if (!ch) return m;
                  const imgs = [...(ch.images ?? [])];
                  imgs.splice(src.imageIndex, 1);
                  arr[src.chapterIndex] = { ...ch, images: imgs };
                  return { ...m, chapters: arr };
                })
              : undefined;
            const reactionCount = url ? (reactions.counts[url] ?? 0) : 0;
            const isMostLoved = !!url && url === mostLovedUrl;
            // In edit mode, clicking a gallery tile opens the
            // GalleryQuickEditModal scoped to that photo. Falls back
            // to the lightbox on the published view.
            const onTileClick = edit && url
              ? () => {
                  if (typeof window === 'undefined') return;
                  window.dispatchEvent(new CustomEvent('pearloom:gallery-quick-edit', { detail: { url } }));
                }
              : (clickable ? () => open(photoIndex) : undefined);
            return (
              <div
                key={i}
                onClick={onTileClick}
                className={`pl8-gallery-tile pl-tile-reveal${clickable ? ' is-clickable' : ''}`}
                style={{
                  position: 'relative',
                  gridColumn: s.cs,
                  gridRow: s.rs,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: isMostLoved
                    ? '0 12px 28px rgba(198,112,61,0.30), 0 0 0 2px var(--peach-ink, #C6703D)'
                    : '0 8px 20px rgba(61,74,31,0.1)',
                  cursor: clickable ? 'zoom-in' : 'default',
                }}
              >
                <PhotoActionMenu imageUrl={url} onReplace={onReplace} onRemove={onRemove}>
                  <PhotoPlaceholder tone={t} aspect="auto" src={url} style={{ height: '100%' }} />
                </PhotoActionMenu>
                {isMostLoved && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 9px',
                      background: 'var(--peach-ink, #C6703D)',
                      color: '#FFFFFF',
                      borderRadius: 999,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 10px -3px rgba(198,112,61,0.50)',
                      pointerEvents: 'none',
                    }}
                  >
                    ♥ Most loved
                  </span>
                )}
                {reactionCount > 0 && (
                  <span
                    aria-label={`${reactionCount} reactions`}
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      background: 'rgba(14,13,11,0.55)',
                      color: '#FFFFFF',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      backdropFilter: 'blur(6px)',
                      pointerEvents: 'none',
                    }}
                  >
                    ♥ {reactionCount}
                  </span>
                )}
              </div>
            );
          })}
          {/* Inline + tile in edit mode — host can add a photo
              without diving into the Story panel. Clicking
              triggers a file picker; on pick we POST the bytes
              to /api/photos/upload and append to the first
              chapter's images so it lands in the gallery
              immediately. Tile sits inside the grid so the
              spacing matches the surrounding mosaic. */}
          {edit && onEditField && photos.length > 0 && (
            <GalleryAddTile manifest={manifest} onEditField={onEditField} chapters={chapters} />
          )}
        </div>
      </div>
      <PhotoLightbox
        images={lightboxImages}
        index={index}
        onClose={close}
        onNext={next}
        onPrev={prev}
        reactions={siteSlug ? reactions : undefined}
        onToggleReaction={siteSlug ? (url) => void toggleReaction(url) : undefined}
      />
    </section>
  );
}

// + tile inside the gallery grid. Uploads via /api/photos/upload
// and appends to the first chapter's images[]. Keeps grid spacing
// consistent with surrounding mosaic. Falls back to a quick error
// state when the upload fails so the host doesn't think the
// click did nothing.
function GalleryAddTile({
  manifest,
  onEditField,
  chapters,
}: {
  manifest?: StoryManifest;
  onEditField: FieldEditor;
  chapters: Chapter[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  void manifest;

  async function pickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (accepted.length === 0) throw new Error('Pick image files only.');
      const payload = await Promise.all(
        accepted.map(async (file) => {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(new Error('read failed'));
            reader.readAsDataURL(file);
          });
          return {
            id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            base64: dataUrl,
            capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
          };
        }),
      );
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payload, source: 'gallery-add' }),
      });
      if (!res.ok) throw new Error(`Upload ${res.status}`);
      const data = (await res.json()) as { photos?: Array<{ url?: string }> };
      const urls = (data.photos ?? [])
        .map((p) => p.url)
        .filter((u): u is string => Boolean(u));
      if (urls.length === 0) throw new Error('Upload returned no URLs.');
      onEditField((m) => {
        const arr = [...(m.chapters ?? [])];
        if (arr.length === 0) {
          // Mint a chapter for the new photos when the manifest
          // doesn't have one yet (fresh sites).
          arr.push({ id: `ch-${Date.now()}`, title: 'Favourites', images: [] } as unknown as Chapter);
        }
        const target = arr[0];
        const imgs = [
          ...((target.images ?? []) as Array<{ url: string }>),
          ...urls.map((url) => ({ url })),
        ];
        arr[0] = { ...target, images: imgs } as Chapter;
        return { ...m, chapters: arr };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      window.setTimeout(() => setError(null), 3500);
    } finally {
      setBusy(false);
    }
  }

  void chapters;
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      aria-label="Add photo to gallery"
      style={{
        position: 'relative',
        gridColumn: 'auto',
        gridRow: 'auto',
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--cream-2)',
        border: '1.5px dashed var(--peach-ink, #C6703D)',
        color: 'var(--peach-ink, #C6703D)',
        cursor: busy ? 'wait' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        transition: 'background 160ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        minHeight: 180,
      }}
      onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.10))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => { void pickFiles(e.target.files); e.target.value = ''; }}
        style={{ display: 'none' }}
      />
      <span style={{ fontSize: 32, lineHeight: 1, fontWeight: 300 }} aria-hidden>+</span>
      {busy ? 'Uploading…' : error ? 'Try again' : 'Add photo'}
    </button>
  );
}

/* ==================== FAQ ==================== */
// Auto-categorize a FAQ question by keyword. Buckets are kept
// short on purpose — too many bins and the chip rail gets noisy.
// The category chips are guest-side filters; "Most asked" is the
// host-curated first item.
const FAQ_CATEGORY_RULES: Array<[RegExp, string]> = [
  [/\b(airport|airline|flight|drive|driving|park|parking|direction|address|map|where is|how to get|car)/i, 'Travel'],
  [/\b(dress|wear|attire|black\s*tie|cocktail|formal|outfit|tie|tux|gown|shoes|heels)/i, 'Dress code'],
  [/\b(food|meal|dietary|allerg|vegan|vegetarian|gluten|menu|drink|bar|alcohol|kosher|halal)/i, 'Food + drink'],
  [/\b(kid|child|children|baby|toddler|family|stroller|nanny)/i, 'Kids'],
  [/\b(rsvp|reply|deadline|when do|how do i|let you know)/i, 'RSVP'],
  [/\b(gift|registr|present|honey\s*moon\s*fund|cash)/i, 'Gifts'],
  [/\b(hotel|stay|lodging|sleep|rooms|airbnb)/i, 'Hotels'],
  [/\b(plus[\s-]?one|guest|invit|alone|date|partner)/i, 'Plus-ones'],
  [/\b(photo|video|post|social|hashtag|instagram|share)/i, 'Photos'],
];
function categorizeFaq(question: string): string {
  for (const [rx, label] of FAQ_CATEGORY_RULES) {
    if (rx.test(question)) return label;
  }
  return 'Other';
}

function FaqSectionImpl({ manifest, onEditField }: { manifest: StoryManifest; onEditField?: FieldEditor }) {
  type FaqItem = { id?: string; question: string; answer: string };
  const edit = useIsEditMode();
  const faq = useMemo(
    () => ((manifest as unknown as { faq?: FaqItem[] }).faq ?? []),
    [manifest],
  );
  // Active filter chip — guest-side state. "All" shows everything.
  const [filter, setFilter] = useState<string>('All');
  // Build the chip list from actually-present categories so we
  // never advertise a chip that filters to zero results. Order
  // mirrors the original rule order so the most-common topics
  // surface first.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of faq) {
      const c = categorizeFaq(f.question ?? '');
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const labels = Array.from(counts.keys());
    // Sort by descending count so the most populous topic comes first.
    labels.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
    return labels.length > 1 ? labels : [];
  }, [faq]);
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
  const removeFaq = (index: number) => {
    onEditField?.((m) => {
      const arr = [...(((m as unknown as { faq?: FaqItem[] }).faq ?? []))];
      arr.splice(index, 1);
      return { ...(m as unknown as Record<string, unknown>), faq: arr } as unknown as StoryManifest;
    });
  };
  // Drag-to-reorder. CanvasSortable hands back the new order;
  // we rewrite manifest.faq verbatim. The current filter UI is
  // a non-destructive view filter — reordering applies to the
  // full list regardless of which chip is active.
  const reorderFaq = (next: FaqItem[]) => {
    onEditField?.((m) => ({
      ...(m as unknown as Record<string, unknown>),
      faq: next,
    }) as unknown as StoryManifest);
  };
  return (
    <section id="faq" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', position: 'relative' }}>
      <SectionBackground manifest={manifest} sectionId="faq" />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {edit && (
          <DraftedByPearBanner
            sectionKey="faq"
            sectionLabel="FAQ"
            manifest={manifest}
            onChange={(m) => onEditField?.(() => m)}
            onClear={() => onEditField?.((m) => ({ ...m, faq: [], draftedByPear: { ...(m.draftedByPear ?? {}), faq: false } } as StoryManifest))}
          />
        )}
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.faq} fallbackIcon="heart-icon" size={20} slotKey="faq" />
            Good to know
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(38px, 6cqw, 60px)', margin: 0 }}>
            Frequently <span className="display-italic">asked.</span>
          </h2>
        </div>
        {categories.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter FAQ by topic"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            {(['All', ...categories]).map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(c)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: active ? '1px solid var(--peach-ink, #C6703D)' : '1px solid var(--line-soft)',
                    background: active ? 'var(--peach-ink, #C6703D)' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--ink-soft)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {(() => {
            // Drag-to-reorder is only safe with filter === 'All' —
            // dragging while a topic chip is filtering would let
            // the host visually move row B above row A even though
            // the underlying full list still has A before B
            // (because we'd persist the visible-only order). When
            // filtered, we render the inline map; when 'All' +
            // editing, we wrap in CanvasSortable.
            const renderRow = (item: FaqItem, i: number, dragHandleProps?: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void }) => {
              const cat = categorizeFaq(item.question ?? '');
              const visible = filter === 'All' || filter === cat;
              if (!visible) return null;
              const fid = item.id ?? `faq-${i}`;
              return (
              <div
                key={item.id ?? i}
                className={edit ? 'pl8-canvas-row' : undefined}
                data-pl-faq-id={fid}
                onClick={edit ? (e) => {
                  const target = e.target as Element;
                  if (target.closest('a, button, input, textarea, [contenteditable="true"], [role="button"]')) return;
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pearloom:faq-quick-edit', { detail: { faqId: fid } }));
                  }
                  jumpToPanelRow('faq', 'pearloom:focus-faq-row', { faqId: fid });
                } : undefined}
                style={{
                  position: 'relative',
                  padding: '22px 26px',
                  borderBottom: i < faq.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  cursor: edit ? 'pointer' : 'default',
                  transition: 'background 160ms ease',
                }}
                onMouseEnter={edit ? (e) => { e.currentTarget.style.background = 'rgba(198,112,61,0.04)'; } : undefined}
                onMouseLeave={edit ? (e) => { e.currentTarget.style.background = 'transparent'; } : undefined}
              >
                {edit && onEditField && (
                  <button
                    type="button"
                    aria-label="Remove this question"
                    onClick={(e) => { e.stopPropagation(); removeFaq(i); }}
                    className="pl8-canvas-remove"
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: 'rgba(14,13,11,0.85)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      zIndex: 4,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 13,
                      lineHeight: 1,
                      opacity: 0,
                      transition: 'opacity 160ms ease',
                    }}
                  >
                    ×
                  </button>
                )}
                {edit && dragHandleProps && (
                  <CanvasGripHandle dragHandleProps={dragHandleProps} ariaLabel="Drag to reorder question" position="top-left" />
                )}
                {/* Auto badge: "Most asked" on the first row when no
                    topic filter is applied. The host can suppress it
                    via the BadgesEditor's Hide pill (badges.hideAuto
                    contains 'mostAsked'). */}
                {i === 0 && filter === 'All' && !((item as { badges?: { hideAuto?: string[] } }).badges?.hideAuto?.includes('mostAsked')) && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 9px',
                      background: 'rgba(198,112,61,0.10)',
                      color: 'var(--peach-ink, #C6703D)',
                      border: '1px solid rgba(198,112,61,0.32)',
                      borderRadius: 999,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                      marginRight: 6,
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 9 }}>★</span>
                    Most asked
                  </span>
                )}
                {/* Custom host-authored badges. Render inline above
                    the question copy so they read as labels for the
                    row, not chrome stuck to the side. */}
                {(() => {
                  const customBadges = (item as { badges?: { custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> } }).badges?.custom ?? [];
                  if (customBadges.length === 0) return null;
                  return (
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {customBadges.map((cb) => (
                        <SectionCustomBadge key={cb.id} label={cb.label} tone={cb.tone ?? 'peach'} />
                      ))}
                    </div>
                  );
                })()}
                <EditableField
                  as="div"
                  className="display"
                  value={item.question}
                  onSave={patchFaq(i, 'question')}
                  context={`FAQ ${i + 1} question`}
                  placeholder="Question?"
                  ariaLabel={`FAQ ${i + 1} question`}
                  maxLength={240}
                  style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}
                />
                <EditableField
                  as="div"
                  value={item.answer}
                  onSave={patchFaq(i, 'answer')}
                  context={`FAQ ${i + 1} answer`}
                  placeholder="Write the answer here…"
                  ariaLabel={`FAQ ${i + 1} answer`}
                  multiline
                  maxLength={800}
                  style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.65 }}
                />
              </div>
              );
            };
            // FAQ items need stable ids for CanvasSortable. Synthesize
            // when missing, just like we do for hotels.
            const itemsWithIds = faq.map((it, i) => ({ ...it, id: it.id ?? `faq-idx-${i}` }));
            if (edit && onEditField && filter === 'All') {
              return (
                <CanvasSortable
                  items={itemsWithIds}
                  onReorder={(next) => {
                    // Re-resolve synthetic ids back to manifest entries
                    // (otherwise we'd grow temp ids).
                    const reordered = next.map((nh) => {
                      const nid = (nh as { id?: string }).id;
                      if (nid && !nid.startsWith('faq-idx-')) {
                        return faq.find((x) => (x.id ?? '') === nid) ?? nh;
                      }
                      return faq.find(
                        (x) => x.question === nh.question && x.answer === nh.answer,
                      ) ?? nh;
                    });
                    reorderFaq(reordered);
                  }}
                  renderItem={(item, ctx) => renderRow(item, ctx.index, ctx.dragHandleProps)}
                />
              );
            }
            return faq.map((item, i) => renderRow(item, i));
          })()}
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
function RSVPSectionImpl({
  names,
  manifest,
  siteSlug,
  onEditField,
}: {
  names: [string, string];
  manifest: StoryManifest;
  siteSlug: string;
  onEditField?: FieldEditor;
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
  // Host-controlled toggles from RsvpPanel. Default true so existing
  // sites that haven't seen the panel keep their current behavior.
  // Reads `manifest.rsvpConfig.plusOnes` written by RsvpPanel.
  const allowPlusOnes = manifest.rsvpConfig?.plusOnes !== false;
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
    <section id="rsvp" style={{ padding: 'clamp(48px, 8cqw, 100px) 32px', position: 'relative', overflow: 'hidden' }}>
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
            <SectionStamp url={manifest.decorLibrary?.sectionStamps?.rsvp} fallbackIcon="mail" size={20} slotKey="rsvp" />
            Kindly respond by {deadlineStr}
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(44px, 7cqw, 72px)', margin: 0 }}>
            Will you <span className="display-italic">be there?</span>
          </h2>
          {/* Editorial intro line — host-editable, AI-rewritable. */}
          <EditableField
            as="p"
            context="RSVP intro"
            value={
              (manifest as unknown as { poetry?: { rsvpIntro?: string } }).poetry?.rsvpIntro
              ?? 'Tell us if you can come — every yes makes the day better.'
            }
            onSave={(next) =>
              onEditField?.((m) => ({
                ...m,
                poetry: {
                  rsvpIntro: next,
                  heroTagline: m.poetry?.heroTagline ?? '',
                  closingLine: m.poetry?.closingLine ?? '',
                  welcomeStatement: m.poetry?.welcomeStatement,
                  milestones: m.poetry?.milestones,
                },
              }))
            }
            placeholder="A line that nudges them to reply…"
            multiline
            maxLength={240}
            style={{
              fontSize: 16,
              color: 'var(--ink-soft)',
              maxWidth: 540,
              margin: '14px auto 0',
              lineHeight: 1.55,
            }}
          />
          <RsvpPulseRibbon siteSlug={siteSlug} />
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
            {going === 'yes' && allowPlusOnes && (
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

            {(() => {
              // Per-host RSVP button style — shape, pulse animation, label.
              // Stored at manifest.rsvpButton from RsvpPanel. Defaults
              // ('pearl' shape, no pulse, "Send RSVP" label) match the
              // pre-config behaviour exactly so existing sites are
              // visually unchanged.
              const rsvpBtn = (manifest as unknown as {
                rsvpButton?: { shape?: 'pearl'|'pill'|'hairline'|'tag'; pulse?: 'none'|'breathe'|'urgent'; customLabel?: string };
              }).rsvpButton ?? {};
              const shape = rsvpBtn.shape ?? 'pearl';
              const pulse = rsvpBtn.pulse ?? 'none';
              const labelText = (rsvpBtn.customLabel || '').trim() || 'Send RSVP';
              const shapeStyles: Record<string, React.CSSProperties> = {
                pearl:    {},
                pill:     { borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)' },
                hairline: { borderRadius: 4, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)' },
                tag:      { borderRadius: '12px 4px 12px 4px', background: 'var(--peach-ink, #C6703D)', color: '#FFFFFF', border: 'none', boxShadow: '0 4px 12px -4px rgba(198,112,61,0.5)' },
              };
              const pulseAnim: Record<string, string | undefined> = {
                none: undefined,
                breathe: 'pl-pearl-breathe 3.6s ease-in-out infinite',
                urgent: 'pl-cta-pulse 1.6s ease-in-out infinite',
              };
              return (
                <button
                  type="submit"
                  className={shape === 'pearl' ? 'btn btn-primary pl-pearl-accent' : 'btn'}
                  disabled={state === 'submitting'}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '16px',
                    ...shapeStyles[shape],
                    animation: pulseAnim[pulse],
                  }}
                >
                  {state === 'submitting' ? 'Sending…' : (
                    <>
                      {labelText} <Icon name="send" size={14} />
                    </>
                  )}
                </button>
              );
            })()}
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

// ──────────────────────────────────────────────────────────────
// Memoized exports of the section components above. Each
// comparator drills into the manifest slices that the section
// (and its subtree) consumes; with Immer's structural sharing
// from useFieldEdit/writePath, those slices keep referential
// equality across unrelated edits, so the memo bails out and
// the section's whole subtree (including SortableChapters,
// SortableBlockList, lightboxes, etc.) skips re-rendering.
//
// Conservative on purpose: every comparator includes
// COMMON_CHROME_KEYS (theme, sectionBackgrounds, blockStyles,
// decorLibrary, decorVisibility, blockVariants, storyLayout,
// layoutFormat). Section-specific slices added on top.
// ──────────────────────────────────────────────────────────────

const StoryVariantSection = memo(StoryVariantSectionImpl, (p, n) => {
  return (
    p.chapters === n.chapters &&
    p.layout === n.layout &&
    manifestSlicesEqual(p.manifest, n.manifest, COMMON_CHROME_KEYS)
  );
});

const TimelineSection = memo(TimelineSectionImpl, (p, n) => {
  return (
    p.chapters === n.chapters &&
    p.onEditField === n.onEditField &&
    manifestSlicesEqual(p.manifest, n.manifest, COMMON_CHROME_KEYS)
  );
});

const DetailsStrip = memo(DetailsStripImpl, (p, n) => {
  if (p.siteSlug !== n.siteSlug) return false;
  return manifestSlicesEqual(p.manifest, n.manifest, [
    ...COMMON_CHROME_KEYS,
    'logistics',
    'events',
    'details',
  ] as unknown as ReadonlyArray<keyof StoryManifest>);
});

const ScheduleSection = memo(ScheduleSectionImpl, (p, n) => {
  return (
    p.onEditField === n.onEditField &&
    p.names[0] === n.names[0] &&
    p.names[1] === n.names[1] &&
    manifestSlicesEqual(p.manifest, n.manifest, [
      ...COMMON_CHROME_KEYS,
      'logistics',
      'events',
      'mealOptions',
    ] as unknown as ReadonlyArray<keyof StoryManifest>)
  );
});

const TravelSection = memo(TravelSectionImpl, (p, n) => {
  return (
    p.onEditField === n.onEditField &&
    manifestSlicesEqual(p.manifest, n.manifest, [
      ...COMMON_CHROME_KEYS,
      'travelInfo',
      'logistics',
    ] as unknown as ReadonlyArray<keyof StoryManifest>)
  );
});

const RegistrySection = memo(RegistrySectionImpl, (p, n) => {
  return p.onEditField === n.onEditField
    && p.siteSlug === n.siteSlug
    && manifestSlicesEqual(p.manifest, n.manifest, [
      ...COMMON_CHROME_KEYS,
      'registry',
    ] as unknown as ReadonlyArray<keyof StoryManifest>);
});

const GallerySection = memo(GallerySectionImpl, (p, n) => {
  return (
    p.chapters === n.chapters &&
    p.onEditField === n.onEditField &&
    p.siteSlug === n.siteSlug &&
    manifestSlicesEqual(p.manifest, n.manifest, COMMON_CHROME_KEYS)
  );
});

const FaqSection = memo(FaqSectionImpl, (p, n) => {
  return (
    p.onEditField === n.onEditField &&
    manifestSlicesEqual(p.manifest, n.manifest, [
      ...COMMON_CHROME_KEYS,
      'faqs',
    ] as unknown as ReadonlyArray<keyof StoryManifest>)
  );
});

const RSVPSection = memo(RSVPSectionImpl, (p, n) => {
  return (
    p.onEditField === n.onEditField &&
    p.siteSlug === n.siteSlug &&
    p.names[0] === n.names[0] &&
    p.names[1] === n.names[1] &&
    manifestSlicesEqual(p.manifest, n.manifest, [
      ...COMMON_CHROME_KEYS,
      'mealOptions',
      'logistics',
    ] as unknown as ReadonlyArray<keyof StoryManifest>)
  );
});

/* ==================== FOOTER ==================== */
// ── Footer config ──────────────────────────────────────────
// Lives at manifest.footer, all fields optional with sensible
// defaults. Exposes layout + brand mark + columns + the
// "Made with Pearloom" attribution toggle. The FooterPanel in
// the editor binds to these fields.
type FooterLayout = 'anchor' | 'minimal' | 'stacked';
type FooterBrandMark = 'pear' | 'heart' | 'sparkle' | 'leaf' | 'off';

interface FooterConfig {
  layout?: FooterLayout;
  brandMark?: FooterBrandMark;
  /** When true the Pearloom attribution shows in the legal row. */
  showAttribution?: boolean;
  /** Trailing link in the legal row. Defaults to "Make one like
   *  this" pointing at /. Set to null to hide entirely. */
  trailingLinkLabel?: string | null;
  trailingLinkHref?: string;
  /** Custom column headers. Keys map to the same hard-coded link
   *  groups; values override the default heading text. */
  headings?: { day?: string; about?: string };
}

function brandMarkGlyph(mark: FooterBrandMark) {
  switch (mark) {
    case 'pear':    return <Pear size={44} tone="cream" shadow={false} />;
    case 'heart':   return <Heart size={36} color="var(--cream)" />;
    case 'sparkle': return <Sparkle size={36} color="var(--cream)" />;
    case 'leaf':    return <Icon name="leaf" size={32} color="var(--cream)" />;
    case 'off':
    default:        return null;
  }
}

function SiteFooter({
  names,
  prettyUrl,
  manifest,
  onEditField,
}: {
  names: [string, string];
  prettyUrl: string;
  manifest?: StoryManifest;
  onEditField?: FieldEditor;
}) {
  const [n1, n2] = names;
  const year = new Date().getFullYear();
  const cfg = ((manifest as unknown as { footer?: FooterConfig }).footer ?? {}) as FooterConfig;
  const layout: FooterLayout = cfg.layout ?? 'anchor';
  const brandMark: FooterBrandMark = cfg.brandMark ?? 'pear';
  const showAttribution = cfg.showAttribution !== false;
  const trailingLabel = cfg.trailingLinkLabel === null
    ? null
    : (cfg.trailingLinkLabel ?? 'Make one like this');
  const trailingHref = cfg.trailingLinkHref ?? '/';
  const dayLinks: Array<[string, string]> = [
    ['Our story', '#our-story'],
    ['Schedule', '#schedule'],
    ['Travel', '#travel'],
    ['Registry', '#registry'],
  ];
  const aboutLinks: Array<[string, string]> = [
    ...(showAttribution ? [['Built on Pearloom', '/']] as Array<[string, string]> : []),
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
  ];

  const closingLineSlot = (
    <EditableField
      as="div"
      context="footer closing line"
      value={
        (manifest as unknown as { poetry?: { closingLine?: string } }).poetry?.closingLine
        ?? 'Made with love (and Pearloom) by the two of us.'
      }
      onSave={(next) =>
        onEditField?.((m) => ({
          ...m,
          poetry: {
            closingLine: next,
            heroTagline: m.poetry?.heroTagline ?? '',
            rsvpIntro: m.poetry?.rsvpIntro ?? '',
            welcomeStatement: m.poetry?.welcomeStatement,
            milestones: m.poetry?.milestones,
          },
        }))
      }
      placeholder="One last line for the footer…"
      maxLength={200}
      multiline
      style={{ fontSize: 13, opacity: 0.7, marginTop: 14, lineHeight: 1.6, maxWidth: 340, color: 'var(--cream)' }}
    />
  );

  const namesBlock = (
    <>
      {brandMarkGlyph(brandMark)}
      <div className="display" style={{ fontSize: layout === 'minimal' ? 38 : 32, marginTop: 14, color: 'var(--cream)' }}>
        {n1 || 'Your'}{' '}
        {n2 && (
          <>
            <span className="display-italic">&amp;</span> {n2}
          </>
        )}
      </div>
      <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{prettyUrl}</div>
    </>
  );

  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '60px 32px 32px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {layout === 'minimal' ? (
          // Centered single column. Brand mark, names, URL,
          // closing line, then the legal row underneath.
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
            {namesBlock}
            {closingLineSlot}
          </div>
        ) : layout === 'stacked' ? (
          // Two-column: identity block left, link columns stacked
          // right. Reads more like a quiet endpaper than the wide
          // 4-column anchor variant.
          <div
            className="pl8-site-footer-grid"
            style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, marginBottom: 40 }}
          >
            <div>
              {namesBlock}
              {closingLineSlot}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {[
                { h: cfg.headings?.day ?? 'The day', l: dayLinks },
                { h: cfg.headings?.about ?? 'About', l: aboutLinks },
              ].map((c) => (
                <FooterColumn key={c.h} heading={c.h} links={c.l} />
              ))}
            </div>
          </div>
        ) : (
          // Anchor layout — 4 columns. Default editorial spread.
          <div
            className="pl8-site-footer-grid"
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}
          >
            <div>
              {namesBlock}
              {closingLineSlot}
            </div>
            <FooterColumn heading={cfg.headings?.day ?? 'The day'} links={dayLinks} />
            <FooterColumn heading={cfg.headings?.about ?? 'About'} links={aboutLinks} />
            <div />
          </div>
        )}
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
          <div>
            © {year} {(n1 && n2 ? `${n1} & ${n2}` : n1) || 'Pearloom'}
            {showAttribution ? ' · Made with Pearloom' : ''}
          </div>
          {trailingLabel && (
            <a href={trailingHref} style={{ color: 'var(--cream)' }}>
              {trailingLabel}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ heading, links }: { heading: string; links: Array<[string, string]> }) {
  if (links.length === 0) return null;
  return (
    <div>
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
        {heading}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(([label, href]) => (
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
  );
}

/* ==================== RENDERER ==================== */
// SiteBlockKey, SiteMode, DEFAULT_ORDER, DEFAULT_HOME_BLOCKS,
// MULTI_PAGE_BLOCKS, BLOCK_PAGE_SLUG, readSiteMode, readHomePageBlocks
// are imported from '@/lib/site-mode' at the top of the file —
// single source of truth for layout-mode wiring across editor +
// route layer + renderer.

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
  // v8 Tier S
  'registryItems',
  'cashGift',
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
        <CustomBlockCase key={block.id} block={block} siteSlug={siteSlug} editMode={edit} manifest={manifest} />
      ))}
    </div>
  );
}

function CustomBlockCase({ block, siteSlug, editMode, manifest }: { block: PageBlock; siteSlug: string; editMode: boolean; manifest: StoryManifest }) {
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
        <div style={{ padding: 'clamp(40px, 6cqw, 72px) 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 4cqw, 40px)', margin: '0 0 8px' }}>
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
        <div style={{ padding: 'clamp(40px, 6cqw, 72px) 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 4cqw, 40px)', margin: '0 0 8px' }}>
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
    case 'registryItems': {
      return wrap(
        <RegistryItemsBlock
          siteId={siteSlug}
          title={str('title')}
          subtitle={str('subtitle')}
        />
      );
    }
    case 'cashGift': {
      const presetAmounts = arr<number>('presetAmounts').filter((n) => Number.isFinite(n) && n > 0);
      return wrap(
        <CashGiftBlock
          siteId={siteSlug}
          title={str('title')}
          subtitle={str('subtitle')}
          label={str('label')}
          presetAmounts={presetAmounts.length ? presetAmounts : undefined}
        />
      );
    }
    case 'spotify': {
      // Block config wins, then manifest.spotifyUrl as fallback so
      // hosts with a top-level URL (legacy / wizard-stamped) get
      // the embed without re-saving in the editor. SpotifySection
      // self-handles the no-URL case with a CTA empty state.
      const spotifyUrl =
        str('spotifyUrl')
        ?? str('url')
        ?? (manifest as unknown as { spotifyUrl?: string }).spotifyUrl
        ?? '';
      const playlistName = str('playlistName') ?? str('title');
      const vibeSkin = (manifest as unknown as { vibeSkin?: import('@/lib/vibe-engine').VibeSkin }).vibeSkin;
      // Without a vibeSkin SpotifySection won't theme correctly —
      // skip the section in that case (rare; v8 sites generate it
      // on publish).
      if (!vibeSkin) return null;
      if (!spotifyUrl && !editMode) return null;
      return (
        <section data-pl-block={block.type} data-pl-block-id={block.id}>
          <SpotifySection
            spotifyUrl={spotifyUrl}
            playlistName={playlistName}
            vibeSkin={vibeSkin}
            subdomain={siteSlug}
          />
        </section>
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
  creatorEmail,
  pageFilter,
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
  /** Site owner's email. Passed only on the published view (NOT in
   *  the editor canvas) so the OwnerEditPill can match against the
   *  current session and surface the "Edit" affordance to the host. */
  creatorEmail?: string | null;
  /** Multi-page filter. When set to a SiteBlockKey, the renderer
   *  shows only that block (sub-page route). When set to 'home',
   *  it shows the hero plus the homePageBlocks subset (multi-page
   *  home). Undefined = scroll mode (render everything). */
  pageFilter?: SiteBlockKey | 'home';
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

  // ── Multi-select state ─────────────────────────────────────
  // Lives at the renderer root so every block in the canvas
  // shares the same selection set via context. Click selects;
  // Shift-click or Cmd-click toggles membership; Esc clears.
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const selectBlock = useCallback((id: string, additive?: boolean) => {
    setSelectedBlockIds((prev) => {
      if (additive) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      // Already the only selected — clicking again clears (so a
      // second click on a non-editable region of a block deselects).
      if (prev.length === 1 && prev[0] === id) return prev;
      return [id];
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedBlockIds([]), []);

  // Stable refs so the keydown listener doesn't churn on every
  // render — it reads through the ref into the latest values.
  const onEditFieldRef = useRef(onEditField);
  const selectionRef = useRef(selectedBlockIds);
  useEffect(() => {
    onEditFieldRef.current = onEditField;
  }, [onEditField]);
  useEffect(() => {
    selectionRef.current = selectedBlockIds;
  }, [selectedBlockIds]);

  // Edit-mode keyboard router. ⌫/Delete bulk-hides every selected
  // section (adds to manifest.hiddenBlocks); Escape clears the
  // selection. Skips when focus is in a text input / contentEditable
  // so typing keeps working.
  useEffect(() => {
    if (!editMode) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          t.isContentEditable
        ) {
          // Escape still clears selection from inside fields — match
          // Figma's behaviour where Esc both blurs and deselects.
          if (e.key === 'Escape') setSelectedBlockIds([]);
          return;
        }
      }
      if (e.key === 'Escape') {
        if (selectionRef.current.length > 0) {
          e.preventDefault();
          setSelectedBlockIds([]);
        }
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = selectionRef.current;
        if (sel.length === 0) return;
        e.preventDefault();
        const sectionIds = sel.map((k) => (k === 'story' ? 'our-story' : k));
        onEditFieldRef.current?.((m) => ({
          ...m,
          hiddenBlocks: Array.from(
            new Set([
              ...((m as unknown as { hiddenBlocks?: string[] }).hiddenBlocks ?? []),
              ...sectionIds,
            ]),
          ),
        }) as StoryManifest);
        setSelectedBlockIds([]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode]);

  // Memoize context value so every EditableText doesn't re-render on
  // every unrelated manifest change. Selection setters are stable
  // refs (useCallback above) so the only churning identity is the
  // selectedBlockIds array — that's intentional, blocks need to know
  // when they enter or leave the selection set.
  const iconOverrides = (manifest as unknown as { iconOverrides?: Record<string, string> }).iconOverrides;
  const iconAnimations = (manifest as unknown as { iconAnimations?: Record<string, 'still' | 'hover' | 'constant'> }).iconAnimations;
  const canvasCtxValue = useMemo(
    () => ({ editMode, selectedBlockIds, selectBlock, clearSelection, onEditField, iconOverrides, iconAnimations }),
    [editMode, selectedBlockIds, selectBlock, clearSelection, onEditField, iconOverrides, iconAnimations],
  );

  const blockOrderRaw =
    (manifest as unknown as { blockOrder?: SiteBlockKey[] }).blockOrder ?? DEFAULT_ORDER;
  const fullBlockOrder: SiteBlockKey[] = blockOrderRaw.filter((k): k is SiteBlockKey =>
    DEFAULT_ORDER.includes(k as SiteBlockKey)
  );
  for (const key of DEFAULT_ORDER) if (!fullBlockOrder.includes(key)) fullBlockOrder.push(key);

  const hidden: Set<SiteBlockKey> = new Set(
    ((manifest as unknown as { hiddenBlocks?: SiteBlockKey[] }).hiddenBlocks ?? []).filter((k): k is SiteBlockKey =>
      DEFAULT_ORDER.includes(k as SiteBlockKey)
    )
  );

  // ── Multi-page mode resolution ──
  // Single source of truth for both reads is @/lib/site-mode. The
  // editor's LayoutModeSection writes the same fields these helpers
  // read, so the two surfaces can never drift.
  const siteMode: SiteMode = readSiteMode(manifest);
  const homePageBlocks: SiteBlockKey[] = readHomePageBlocks(manifest);

  // Apply pageFilter to blockOrder.
  const blockOrder: SiteBlockKey[] = (() => {
    if (!pageFilter) return fullBlockOrder;
    if (pageFilter === 'home') {
      // Home in multi-page mode: keep only blocks marked as home blocks
      // plus 'details' (a permanent fixture on home — it's a thin strip,
      // not a destination).
      const homeSet = new Set<SiteBlockKey>([...homePageBlocks, 'details']);
      return fullBlockOrder.filter((k) => homeSet.has(k));
    }
    // Sub-page: show only the requested block.
    return fullBlockOrder.filter((k) => k === pageFilter);
  })();

  // Hide hero on sub-pages — sub-pages get a focused single-block view.
  const showHero = !pageFilter || pageFilter === 'home';

  // Base path for nav links. Prefer the occasion-prefixed canonical
  // path so multi-page links match the URL bar; fall back to the
  // legacy /sites/{slug} form.
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const basePath = occasion ? `/${occasion}/${siteSlug}` : `/sites/${siteSlug}`;

  const renderBlock = (key: SiteBlockKey) => {
    if (hidden.has(key)) return null;
    switch (key) {
      case 'story': {
        if (chapters.length === 0 && !editMode) return null;
        // v9 priority chain for picking the story layout:
        //   1. manifest.blockVariants.story.style — picked via the
        //      Inspector's BlockStylePicker (the new shared UI)
        //   2. manifest.storyLayout — pre-v9 explicit field
        //   3. manifest.layoutFormat — template-declared legacy field
        // resolveStoryLayout handles legacy values (cascade /
        // scrapbook / chapters / starmap) → canonical type mapping.
        const variantStyle = manifest.blockVariants?.story?.style as string | undefined;
        const rawStory = (variantStyle ?? manifest.storyLayout) as string | undefined;
        const rawFormat = (manifest as unknown as { layoutFormat?: string }).layoutFormat;
        if (!rawStory && !rawFormat) {
          return <TimelineSection key="story" chapters={chapters} onEditField={onEditField} manifest={manifest} />;
        }
        const layout = resolveStoryLayout(rawStory, rawFormat);
        if (layout === 'timeline') {
          return <TimelineSection key="story" chapters={chapters} onEditField={onEditField} manifest={manifest} />;
        }
        return <StoryVariantSection key="story" chapters={chapters} layout={layout} manifest={manifest} />;
      }
      case 'details':
        return <DetailsStrip key="details" manifest={manifest} siteSlug={siteSlug} />;
      case 'schedule':
        return <ScheduleSection key="schedule" manifest={manifest} names={names} onEditField={onEditField} />;
      case 'travel':
        return <TravelSection key="travel" manifest={manifest} onEditField={onEditField} />;
      case 'registry':
        return <RegistrySection key="registry" manifest={manifest} onEditField={onEditField} siteSlug={siteSlug} />;
      case 'gallery':
        return <GallerySection key="gallery" chapters={chapters} manifest={manifest} onEditField={onEditField} siteSlug={siteSlug} />;
      case 'faq':
        return <FaqSection key="faq" manifest={manifest} onEditField={onEditField} />;
      case 'rsvp':
        return <RSVPSection key="rsvp" names={names} manifest={manifest} siteSlug={siteSlug} onEditField={onEditField} />;
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
        // Primary button — uses the theme's accent as the fill, with
        // contrast-aware text color picked from accent luminance so
        // gold/peach/blue/olive accents all render readable buttons
        // without per-theme tweaks.
        ...(themeColors.accent
          ? {
              ['--btn-primary-bg' as string]: themeColors.accent,
              ['--btn-primary-fg' as string]: pickInkForBackground(themeColors.accent),
            }
          : {}),
        // Theme-aware section stamp blend mode + filter. Multiply
        // is gorgeous on cream paper but invisible on dark themes;
        // 'screen' inverts the math and lifts the stamp onto dark
        // surfaces. Plus a brightness lift so dark stamps don't
        // disappear into the background.
        ...(themeColors.background
          ? (() => {
              const bgHex = parseAnyColorToHex(themeColors.background);
              const isDark = bgHex ? (wcagLuminance(bgHex) ?? 1) <= 0.45 : false;
              return isDark
                ? {
                    ['--stamp-blend' as string]: 'screen',
                    ['--stamp-filter' as string]: 'brightness(1.4) contrast(0.95)',
                  }
                : {};
            })()
          : {}),
        // Form input focus ring — themed accent + accent-tinted glow.
        // Replaces the hardcoded sage on light themes that looked off
        // when the user picked a non-sage palette.
        ...(themeColors.accent
          ? {
              ['--focus-ring-color' as string]: themeColors.accent,
              ['--focus-ring-glow' as string]: `${themeColors.accent}33`,
            }
          : {}),
        // Brand-shimmer var (used in pl8-btn-sheen + chip-gold) follows
        // the theme accent when set, falls back to gold default.
        ['--gold' as string]: themeColors.accent ?? undefined,
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

  // Global card + photo radius. SpacingPanel writes these to
  // manifest.theme.{cardRadius,photoRadius}; we mirror them as
  // CSS vars on the site root so every card surface that opts
  // into var(--pl-card-radius, …) follows the host's pick. The
  // fallback (14 / 18) matches the v8 default ("rounded").
  const themeRadius = (manifest as unknown as { theme?: { cardRadius?: string; photoRadius?: string } }).theme;
  const cardRadiusPx = (() => {
    switch (themeRadius?.cardRadius) {
      case 'sharp': return 0;
      case 'soft': return 6;
      case 'pillow': return 24;
      case 'rounded': return 14;
      default: return undefined;
    }
  })();
  const photoRadiusPx = (() => {
    switch (themeRadius?.photoRadius) {
      case 'sharp': return 0;
      case 'soft': return 8;
      case 'circle': return 9999;
      case 'rounded': return 18;
      default: return undefined;
    }
  })();
  const radiusVars: React.CSSProperties = {};
  if (cardRadiusPx != null) {
    (radiusVars as Record<string, string>)['--pl-card-radius'] = `${cardRadiusPx}px`;
  }
  if (photoRadiusPx != null) {
    (radiusVars as Record<string, string>)['--pl-photo-radius'] = photoRadiusPx === 9999 ? '50%' : `${photoRadiusPx}px`;
  }

  // Active Edition id — drives the data-pl-edition attribute on
  // the site root so CSS rules in pearloom.css can give each
  // Edition genuinely distinct visual treatment per section
  // (Cinema's letterbox card stacks, Postcard Box's tilted cards
  // and stitch borders, Quiet Edition's centered naked paper,
  // etc.) without per-component variants.
  const activeEdition = resolveEdition(editionContextFromManifest(manifest));

  return (
    <EditorCanvasProvider value={canvasCtxValue}>
      <div className="pl8-guest" data-pl-edition={activeEdition.id} style={{ ...themeStyle, ...radiusVars }}>
        {/* Reading progress hairline — peach-to-gold gradient that
            fills L → R as guests scroll. Only on the published view
            (the editor's own scrollbar handles its own progress). */}
        {!editMode && <ReadingProgress />}
        {/* Back-to-top pill — appears after 60% scroll, fixed
            bottom-right. Skipped in edit mode (the editor has its
            own outline rail for jumping anywhere). */}
        {!editMode && <BackToTop />}
        {!editMode && <GuestPearChat manifest={manifest} coupleNames={names} domain={siteSlug} />}
        {!editMode && <DayOfBanner manifest={manifest} />}
        {/* When DayOfBanner is active (live/pre/post), suppress the
            BroadcastBar — the day-of banner already owns the sticky
            top strip and stacking both creates competing colored
            bars during the highest-attention moment of the event. */}
        {!editMode && !computeDayOfState(manifest).active && <BroadcastBar subdomain={siteSlug} />}
        {!editMode && <PersonalGuestGreeting domain={siteSlug} />}
        {!editMode && creatorEmail && (
          <OwnerEditPill siteSlug={siteSlug} creatorEmail={creatorEmail} />
        )}
        {/* Day-Of broadcast dock — owner-only, only when Day-Of Mode
            is active. Renders inside OwnerEditPill's auth check via
            its own creatorEmail comparison so non-host visitors
            never see it. */}
        {!editMode && creatorEmail && computeDayOfState(manifest).active && (
          <DayOfHostBroadcastWrapper siteSlug={siteSlug} creatorEmail={creatorEmail} />
        )}
        <EventNav
          names={names}
          hasRsvp={hasRsvp}
          manifest={manifest}
          siteSlug={siteSlug}
          basePath={basePath}
          siteMode={siteMode}
          homePageBlocks={homePageBlocks}
          pageFilter={pageFilter}
        />
        {showHero && (() => {
          // Day-Of Mode: when active and we're on the live site (not
          // editor canvas), swap the hero for LiveNowHero so guests
          // see "Happening now: Ceremony" / "Up next: Reception" /
          // "The day, in your hands" depending on phase.
          const dayOf = !editMode ? computeDayOfState(manifest) : { active: false };
          if (dayOf.active) {
            return (
              <StickerLayer
                blockId="hero"
                stickers={manifest.stickers}
                onEditField={onEditField}
              >
                <LiveNowHero manifest={manifest} names={names} />
              </StickerLayer>
            );
          }
          return (
            <StickerLayer
              blockId="hero"
              stickers={manifest.stickers}
              onEditField={onEditField}
            >
              <HeroSection names={names} manifest={manifest} siteSlug={siteSlug} onEditField={onEditField} onEditNames={onEditNames} />
            </StickerLayer>
          );
        })()}
        {pageFilter && pageFilter !== 'home' && (
          <SubPageHeader
            blockKey={pageFilter}
            manifest={manifest}
            names={names}
            basePath={basePath}
          />
        )}
        {/* Wix-style canvas drag-and-drop with full direct-manipulation:
            ⋮⋮ drag · ✎ edit · ⊕ add below · × remove on every section,
            plus inline "+ Add section" zones between every two
            sections. SortableBlockList is a no-op outside edit mode. */}
        <SortableBlockList
          blockKeys={blockOrder as string[]}
          onReorder={(next) =>
            onEditField?.((m) => ({
              ...m,
              blockOrder: next as SiteBlockKey[],
            }))
          }
          onRemove={(key) => {
            const sectionId = key === 'story' ? 'our-story' : key;
            onEditField?.((m) => ({
              ...m,
              hiddenBlocks: Array.from(new Set([
                ...((m as unknown as { hiddenBlocks?: string[] }).hiddenBlocks ?? []),
                sectionId,
              ])),
            }) as StoryManifest);
          }}
          onEdit={(key) => {
            // Surface the inspector via a custom event the editor
            // shell listens to. Falls through harmlessly outside the
            // editor.
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pearloom:inspector-focus', { detail: { blockKey: key } }));
            }
          }}
          onAddAt={(atIndex, key) => {
            const sectionId = key === 'story' ? 'our-story' : key;
            onEditField?.((m) => {
              // Un-hide.
              const hidden = ((m as unknown as { hiddenBlocks?: string[] }).hiddenBlocks ?? [])
                .filter((h) => h !== sectionId);
              // Insert into blockOrder at requested index.
              const rawOrder = ((m as unknown as { blockOrder?: string[] }).blockOrder ?? []);
              const cleaned = rawOrder.filter((k) => k !== key);
              const next = [...cleaned];
              next.splice(Math.min(atIndex, next.length), 0, key);
              return {
                ...m,
                hiddenBlocks: hidden,
                blockOrder: next as SiteBlockKey[],
              } as StoryManifest;
            });
          }}
          // Outline → canvas drag bridge. Drag a section out of the
          // left rail, drop it in any gap on the canvas to add it
          // there. Same final state as picking from the popover.
          onDropOutlineBlock={(atIndex, key) => {
            const sectionId = key === 'story' ? 'our-story' : key;
            onEditField?.((m) => {
              const hidden = ((m as unknown as { hiddenBlocks?: string[] }).hiddenBlocks ?? [])
                .filter((h) => h !== sectionId);
              const rawOrder = ((m as unknown as { blockOrder?: string[] }).blockOrder ?? []);
              const cleaned = rawOrder.filter((k) => k !== key);
              const next = [...cleaned];
              next.splice(Math.min(atIndex, next.length), 0, key);
              return {
                ...m,
                hiddenBlocks: hidden,
                blockOrder: next as SiteBlockKey[],
              } as StoryManifest;
            });
          }}
          blockLabels={{
            story: 'Story',
            details: 'Details',
            schedule: 'Schedule',
            travel: 'Travel',
            registry: 'Registry',
            gallery: 'Gallery',
            rsvp: 'RSVP',
            faq: 'FAQ',
          }}
          pickerBlocks={(() => {
            // Surface every block currently NOT visible on the site.
            const hidden = ((manifest as unknown as { hiddenBlocks?: string[] }).hiddenBlocks ?? []);
            const meta: Record<string, { label: string; description: string }> = {
              story: { label: 'Story', description: 'How you got here, chapter by chapter.' },
              details: { label: 'Details', description: 'Ceremony time, dress code, arrival notes.' },
              schedule: { label: 'Schedule', description: 'The flow of the day.' },
              travel: { label: 'Travel', description: 'Venue map, directions, hotels.' },
              registry: { label: 'Registry', description: 'Gift links + cash funds.' },
              gallery: { label: 'Gallery', description: 'A bento mosaic of favourites.' },
              rsvp: { label: 'RSVP', description: 'Meal options, deadline, plus-ones.' },
              faq: { label: 'FAQ', description: 'Questions guests are likely to ask.' },
            };
            const editorKeys = Object.keys(meta);
            const visibleKeys = blockOrder as string[];
            const renderableHidden = editorKeys
              .filter((k) => {
                const sectionId = k === 'story' ? 'our-story' : k;
                return hidden.includes(sectionId) || !visibleKeys.includes(k);
              })
              .map((k) => ({ key: k, label: meta[k].label, description: meta[k].description }));
            return renderableHidden;
          })()}
          renderBefore={(key, i) => {
            // Divider art lives BETWEEN sections, not inside either
            // one. Rendering it via renderBefore (sibling of the
            // CanvasSortableItem) means the section's bounding box
            // starts where its content actually does — so the
            // section label, grip, and hover ring don't overlap
            // the compass-rose divider art at the top. Bug fix
            // 2026-04-30: the user reported "all sections say they
            // start at same place of the dividers and art so it
            // overlaps."
            const k = key as SiteBlockKey;
            const sectionId = k === 'story' ? 'our-story' : k;
            if (isBlockHidden(manifest, sectionId)) return null;
            if (!renderBlock(k)) return null;
            const decorVis = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility;
            const dividerHidden = decorVis?.[`divider-${k}`] === false;
            return (
              <DecorEditOverlay
                visibilityKey={`divider-${k}`}
                kind="divider"
                url={dividerUrl}
                onEditField={onEditField}
                label="Divider"
              >
                <DecorDivider
                  url={dividerUrl}
                  index={i}
                  strength={dividerStrength}
                  hidden={dividerHidden}
                />
              </DecorEditOverlay>
            );
          }}
          renderItem={(key, idx) => {
            const k = key as SiteBlockKey;
            // Honour per-block hidden flag.
            const sectionId = k === 'story' ? 'our-story' : k;
            if (isBlockHidden(manifest, sectionId)) return null;
            const block = renderBlock(k);
            if (!block) return null;
            // Edition divider between sections (skip before first).
            // Picks the divider style declared by the active Edition
            // — thread (Almanac), sprocket (Cinema), stitch (Postcard
            // Box), gold-hairline (Linen Folder), whitespace (Quiet).
            const editionForDivider = resolveEdition(editionContextFromManifest(manifest));
            return (
              <>
                {idx > 0 && <EditionDivider style={editionForDivider.divider} />}
                <StickerLayer
                  blockId={k}
                  stickers={manifest.stickers}
                  onEditField={onEditField}
                >
                  {/* Apply per-section visual overrides (padding /
                      maxWidth / textAlign / textColor) from
                      manifest.blockStyles[sectionId]. The wrapper
                      is a no-op when no override is set. */}
                  <BlockStyleWrapper manifest={manifest} blockId={sectionId}>
                    {block}
                  </BlockStyleWrapper>
                </StickerLayer>
              </>
            );
          }}
        />
        <CustomBlocksRail manifest={manifest} siteSlug={siteSlug} />
        {/* Guestbook — host-toggled in RsvpPanel ('Guestbook on
            published site'). Default off; flips on via
            manifest.features.guestbook = true. Mounted after the
            block iteration but before the footer so guests scroll
            past every section first, then leave a wish at the end. */}
        {(() => {
          const features = (manifest as unknown as { features?: { guestbook?: boolean } }).features;
          if (!features?.guestbook) return null;
          // Skip in multi-page mode unless rendering home — sub-pages
          // shouldn't repeat the guestbook (it's a destination, not
          // a per-page footer).
          if (siteMode === 'multi-page' && pageFilter && pageFilter !== 'home') return null;
          const vibeSkin = (manifest as unknown as { vibeSkin?: import('@/lib/vibe-engine').VibeSkin }).vibeSkin;
          return <Guestbook siteId={siteSlug} coupleNames={names} vibeSkin={vibeSkin} />;
        })()}
        <FooterBouquet url={bouquetUrl} />
        <SiteFooter names={names} prettyUrl={prettyUrl} manifest={manifest} onEditField={onEditField} />
        {/* Guest-side helpers — only on the published site, never in the editor.
            Each is independently dismissable / mobile-aware. */}
        {!editMode && (
          <>
            <ScrollReveal />
            <ScrollSpy sections={['top', 'our-story', 'schedule', 'travel', 'registry', 'gallery', 'faq', 'rsvp']} />
            {/* FloatingCountdown removed — duplicated the sticky
                bottom RSVP CTA's deadline cue. See GuestKit.tsx. */}
            <StickyMobileCta
              deadline={(() => {
                const d = parseLocalDate(manifest.logistics?.rsvpDeadline);
                return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
              })()}
            />
            {/* AskPearFloater removed — GuestPearChat (mounted higher
                up in this tree) is the streaming, guest-passport-aware
                replacement. Was two 🍐 buttons in the same corner. */}
            <LiveWallDiscover
              subdomain={siteSlug}
              occasion={(manifest as unknown as { occasion?: string }).occasion}
            />
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
      {/* Floating bulk-action bar — visible only when 2+ blocks
       *  are selected on the canvas. Lives inside the provider so
       *  it can read selection state without prop drilling. */}
      {editMode && <CanvasBulkActionBar />}
    </EditorCanvasProvider>
  );
}
