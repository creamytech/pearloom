'use client';

 
/* =========================================================================
   PEARLOOM EDITOR — REDESIGN
   Literal port of handoff/pages/editor-redesign.jsx into production TSX.

   The accumulated EditorV8 shell (4,360 lines) bent the prototype around
   production state machinery. This file does the opposite: the prototype
   shell IS the layout, and production manifest state flows in through a
   thin bridge.

   Shape (prototype L1148-1257):
     gridTemplateColumns: '256px 1fr 360px'   (left rail · canvas · property rail)
     gridTemplateRows: '56px 1fr'
     gridTemplateAreas: '"top top top" "left canvas right"'

   Mounted by /editor/[siteSlug]. Production state hooks (autosave, undo
   stack, publish flow) live in a bridge module — this file stays focused
   on the visual shell.
*/

import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { readSiteMode, type SiteBlockKey } from '@/lib/site-mode';
import { nextStepFor, isManifestPublished } from '@/lib/next-step';
import { applyPackToManifest, readPackStash, APPLIED_PACK_STASH_KEY } from '@/lib/theme-store/apply';
import { setEditorVoiceProfile } from '@/lib/pear/editor-voice';
import { Icon } from '../motifs';
import { useEditorRedesignBridge } from './bridge';
import { fireUndoable } from './UndoToast';
import { DesignChangeBeacon } from './DesignChangeBeacon';
import { DESIGN_COMPARE_EVENT, type DesignCompareDetail } from './design-feedback';
import { EditorRailLeft, sectionOrderFor, sectionDisplayLabel } from './SectionRail';
import { PropertyRail } from './PropertyRail';
import { ThemeRail } from './ThemeRail';
import { EditorTopbar } from './EditorTopbar';
import { FullSite } from './FullSite';
import { ThemedSite } from './ThemedSite';
import { LivingBackground } from '../site/LivingBackground';
import { CanvasPhotoDrawer, type PhotoSlot } from './CanvasPhotoDrawer';
import { CanvasPearBlocks, type PicksKind } from './CanvasPearBlocks';
import { EditorDrawers } from './EditorDrawers';
import { PearLoomFx } from './PearLoomFx';
import { FittingRoom } from './FittingRoom';
import { ThreePressings } from './ThreePressings';
import { BastedIn } from './BastedIn';
import { FirstPressing, shouldPlayFirstPressing } from './FirstPressing';
import { buildPublishChecks, MobilePublishChecklist } from './PublishChecklist';
import { MobileSheet, MobileBottomBar, MobileNextStepStrip, PreviewExitPill, type MobileSheetId } from './MobileSheet';
import { useMobileViewport } from './use-mobile-viewport';
import { useEditorCollab } from './useEditorCollab';
import { CoEditHighlights } from './CoEditHighlights';
import { useUserAvatar } from '../avatars';
import './animations.css';

interface Props {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
  /** 'owner' or the viewer's cohosts-table role. Owner-only
   *  affordances (Publish) hide for co-hosts; viewers open in
   *  preview. Defaults 'owner' for existing mounts. */
  viewerRole?: 'owner' | 'editor' | 'guest-manager' | 'viewer';
  /** Session identity for realtime presence + collab. Collab is
   *  disabled when absent (e.g. dev mounts). */
  viewerEmail?: string;
  viewerName?: string;
  /** Deep-link target from `?jump=<section>` (EditorClient). Lets
   *  dashboard surfaces open the editor with the right property-
   *  rail panel active — the golden-thread "Add your cover photo"
   *  card lands on Hero, Partner access lands on Share, etc.
   *  Unknown values are ignored (hero default). */
  initialSection?: string;
}

export type EditorMode = 'edit' | 'preview' | 'mobile';
export type SectionId =
  | 'hero' | 'story' | 'details' | 'schedule' | 'travel'
  | 'registry' | 'gallery' | 'rsvp' | 'faq' | 'nav' | 'navMobile'
  /* Optional sections added via Add Section — applicability gated
     by occasion (see isSectionApplicable below). */
  | 'countdown' | 'map' | 'music'
  /* Event-OS canvas blocks — also added via Add Section, but gated
     against the EVENT_TYPES registry (see isBlockApplicable below)
     so a memorial host sees Program/Livestream/Obituary while a
     bachelorette host sees Itinerary/Cost/Vote/Packing. */
  | 'itinerary' | 'costSplitter' | 'activityVote' | 'toastSignup'
  | 'adviceWall' | 'program' | 'livestream' | 'obituary'
  | 'packingList' | 'honorList' | 'tributeWall' | 'menu' | 'dressCode'
  | 'nameVote' | 'rooms' | 'thenAndNow' | 'groupChat'
  /* Tool panels — not canvas sections, but host-facing tools that
     mount through the same PropertyRail dispatch so the editor's
     state machine stays simple. */
  | 'guests' | 'savetheDate' | 'share' | 'dayof' | 'memorial' | 'bachelor'
  | 'toasts' | 'privacy' | 'cohost'
  | null;

/* Occasion → which optional canvas sections fit. These follow the
   EVENT_TYPES registry's hiddenBlocks the same way the Event-OS
   blocks do — the picker used to offer a countdown on funerals
   because this only special-cased music. Map has no BlockType
   equivalent (every occasion has a venue) and stays universal. */
export function isOptionalSectionApplicable(section: 'countdown' | 'map' | 'music', occasion?: string): boolean {
  if (section === 'map') return true;
  const event = getEventType(occasion);
  if (!event) return true;
  const gateId = section === 'music' ? 'spotify' : 'countdown';
  return !(event.hiddenBlocks as readonly string[]).includes(gateId);
}

/* The Event-OS canvas blocks the Add Section picker can offer. */
export type BlockSectionId =
  | 'itinerary' | 'costSplitter' | 'activityVote' | 'toastSignup'
  | 'adviceWall' | 'program' | 'livestream' | 'obituary'
  | 'packingList' | 'honorList' | 'tributeWall' | 'menu' | 'dressCode'
  | 'nameVote' | 'rooms' | 'thenAndNow' | 'groupChat';

export const BLOCK_SECTION_IDS: readonly BlockSectionId[] = [
  'itinerary', 'costSplitter', 'activityVote', 'toastSignup',
  'adviceWall', 'program', 'livestream', 'obituary',
  'packingList', 'honorList', 'tributeWall', 'menu', 'dressCode',
  'nameVote', 'rooms', 'thenAndNow', 'groupChat',
];

/* honorList is the generalized weddingParty (wedding party / court
   of honor / candle-lighters) — the EVENT_TYPES registry gates it
   under the legacy 'weddingParty' BlockType id, AND under 'whosWho'
   (the reunion face-cards block resolves to honorList's
   `relationships` variant rather than a second block over the same
   people store). */
const BLOCK_GATE_ALIASES: Partial<Record<BlockSectionId, readonly string[]>> = {
  honorList: ['weddingParty', 'whosWho'],
};

/* Occasion → which Event-OS blocks are addable. A block is addable
   when the EVENT_TYPES registry lists it in defaultBlocks OR
   optionalBlocks for the occasion. Unknown / missing occasion →
   true (never strand a host whose manifest predates the registry). */
export function isBlockApplicable(blockId: BlockSectionId, occasion?: string): boolean {
  const event = getEventType(occasion);
  if (!event) return true;
  const gateIds = BLOCK_GATE_ALIASES[blockId] ?? [blockId];
  return gateIds.some((gateId) =>
    (event.defaultBlocks as readonly string[]).includes(gateId)
    || (event.optionalBlocks as readonly string[]).includes(gateId));
}

/* Occasion → whether each of the nine CORE sections fits, plus the
   content-wins escape hatch. Implementation lives in the leaf
   module section-applicability.ts (ThemedSite needs the same
   helpers and is imported BY this file — importing them from here
   would cycle). Re-exported for compat with the existing pattern
   of pulling applicability gates out of EditorRedesign. */
export { isCoreSectionApplicable, sectionHasContent } from './section-applicability';

/* Every non-null SectionId — the allowlist for `?jump=` deep
   links. Kept next to the SectionId union so adding a section
   means touching both lines in the same screenful. */
const JUMPABLE_SECTIONS: ReadonlySet<string> = new Set([
  'hero', 'story', 'details', 'schedule', 'travel',
  'registry', 'gallery', 'rsvp', 'faq', 'nav', 'navMobile',
  'countdown', 'map', 'music',
  ...BLOCK_SECTION_IDS,
  'guests', 'savetheDate', 'share', 'dayof', 'memorial', 'bachelor',
  'toasts', 'privacy', 'cohost',
]);

/* Occasion → which tool panels are applicable. Memorial only on
   memorial/funeral, Bachelor weekend planner on bachelor/ette /
   bridal-shower / reunion / sip-and-see, Save-the-date never on
   memorial/funeral (you don't pre-announce a funeral). */
export function isToolPanelApplicable(panel: Exclude<SectionId, null>, occasion?: string): boolean {
  if (panel === 'memorial') return occasion === 'memorial' || occasion === 'funeral';
  if (panel === 'bachelor') {
    return occasion === 'bachelor-party' || occasion === 'bachelorette-party'
        || occasion === 'bridal-shower' || occasion === 'reunion'
        || occasion === 'sip-and-see';
  }
  if (panel === 'savetheDate') return occasion !== 'memorial' && occasion !== 'funeral';
  /* Toasts & speeches apply everywhere — weddings get toasts and
     vows, memorials get eulogies, retirements get tributes. */
  return true;
}

export default function EditorRedesign({
  manifest: initialManifest, siteSlug, names: initialNames,
  viewerRole = 'owner', viewerEmail, viewerName, initialSection,
}: Props) {
  /* Validated `?jump=` deep-link — unknown values fall back to
     the hero default below. */
  const initialJump: SectionId =
    initialSection && JUMPABLE_SECTIONS.has(initialSection)
      ? (initialSection as SectionId)
      : null;
  // Bridge — autosave, manifest state, undo/redo, publish. Hides the
  // production machinery behind a small interface that mirrors the
  // prototype's tweaks-panel locals (setActive, setLayout, etc.).
  const bridge = useEditorRedesignBridge({ initialManifest, initialNames, siteSlug });

  /* Viewers open read-only — preview mode, no publish, and the
     server rejects their saves anyway. */
  const [mode, setMode] = useState<EditorMode>(viewerRole === 'viewer' ? 'preview' : 'edit');

  /* Realtime collaboration — presence dots + live manifest sync
     across everyone with this editor open (owner + co-hosts).
     Remote applies ride the normal setManifest path so they land
     in the undo stack and the canvas re-weaves in place. */
  const [active, setActive] = useState<SectionId>(initialJump ?? 'hero');
  const { avatarId } = useUserAvatar();
  const { peers } = useEditorCollab({
    siteSlug,
    email: viewerEmail,
    name: viewerName,
    avatar: avatarId ?? null,
    manifest: bridge.manifest,
    activeSection: active,
    onRemoteManifest: (next) => bridge.setManifest(next),
  });
  /* Magazine (multi-page) mode — which page the canvas is focused
     on. null = the whole site on one canvas (every section stays
     editable); 'home' or a block key narrows the canvas to that
     page exactly as guests will see it. Driven by the left rail's
     Pages tab; ignored entirely in scroll mode. */
  const [canvasPage, setCanvasPage] = useState<'home' | SiteBlockKey | null>(null);
  /* Pear Picks modal — which section Pear is populating with rich
     suggestion cards (FAQ / Travel / Details), or null when closed. */
  const [picksKind, setPicksKind] = useState<PicksKind | null>(null);

  /* ── Compare (before/after peek) ────────────────────────────
     The Theme rail's CompareHold dispatches while held; we peek
     the undo stack (read-only — nothing is rewound or persisted)
     and paint the previous manifest on the canvas until release. */
  const [compareManifest, setCompareManifest] = useState<StoryManifest | null>(null);
  const { peekUndo } = bridge;
  useEffect(() => {
    const onCompare = (e: Event) => {
      const detail = (e as CustomEvent<DesignCompareDetail>).detail;
      if (!detail?.active) { setCompareManifest(null); return; }
      setCompareManifest(peekUndo());
    };
    window.addEventListener(DESIGN_COMPARE_EVENT, onCompare);
    return () => window.removeEventListener(DESIGN_COMPARE_EVENT, onCompare);
  }, [peekUndo]);

  /* ── Viewport-mobile chrome ──────────────────────────────────
     viewportMobile (real phone-sized browser) is NOT the canvas's
     "Mobile" preview pill (mode === 'mobile'). Below 768px the
     three-column grid collapses: the canvas goes full-width and
     the rails re-mount inside bottom sheets driven by a fixed
     bottom bar (Sections · Theme). Desktop behavior is
     untouched — every mobile branch gates on this flag. */
  const viewportMobile = useMobileViewport();
  const [mobileSheet, setMobileSheet] = useState<MobileSheetId | null>(null);
  /* Last non-null sheet id — keeps the right content mounted
     during the sheet's exit slide. Render-time state adjustment
     (the React-docs "derive from previous render" pattern), not
     an effect, so there's no extra commit. */
  const [lastSheet, setLastSheet] = useState<MobileSheetId>('sections');
  if (mobileSheet && mobileSheet !== lastSheet) setLastSheet(mobileSheet);
  /* Stable ref so the window-event listeners below don't have to
     re-subscribe when the viewport flag flips. */
  const viewportMobileRef = useRef(false);
  useEffect(() => {
    viewportMobileRef.current = viewportMobile;
  }, [viewportMobile]);
  /* Phone deep-link: on desktop the jumped panel is already
     visible in the property rail, but on a phone the rails live
     in bottom sheets — a `?jump=` open would land on a bare
     canvas. Render-time adjustment (the React-docs pattern, same
     as the breakpoint-crossing block below): once the viewport
     resolves mobile with a jump pending, open the props sheet on
     the jumped section. One-shot. */
  const [jumpSheetPending, setJumpSheetPending] = useState(Boolean(initialJump));
  if (viewportMobile && jumpSheetPending) {
    setJumpSheetPending(false);
    setMobileSheet('props');
  }
  /* Crossing the breakpoint to desktop: the rails live in columns,
     not sheets, so close any open mobile sheet. Render-time
     adjustment (the React-docs pattern, not an effect) — converges
     in one extra render. */
  if (!viewportMobile && mobileSheet) {
    setMobileSheet(null);
  }
  /* Entering preview on a phone (bottom bar, topbar, or the ⌘K
     toggle event): preview should read as the real site, so any
     open sheet closes with it. Same render-time adjustment. */
  if (viewportMobile && mode === 'preview' && mobileSheet) {
    setMobileSheet(null);
  }

  /* Section selection wrappers — on a phone, activating a section
     opens the PropertyRail sheet (tap on canvas or a row in the
     Sections sheet); deselecting from the rail's Theme tab swaps
     to the Theme sheet. Desktop passes straight through. */
  /* With the see-through half sheet, the edited section must sit
     in the VISIBLE upper half of the canvas — otherwise the host
     edits blind anyway. Double-rAF so the scroll lands after the
     sheet's open render. */
  /* ONE smooth scroll per selection, on the canvas scroller
     directly (not scrollIntoView — that can also scroll ancestor
     viewports and, fired twice, restarts visibly). Skip when the
     section is already seated in the visible band above the sheet
     so re-selecting / stepping back doesn't nudge the canvas. */
  const scrollSectionAboveSheet = useCallback((id: string) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
      if (!el) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const scroller = el.closest<HTMLElement>('[data-pl-canvas-scroll]');
      if (!scroller) {
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      /* 80 matches the sections' scrollMarginTop — clears the
         site's own sticky nav riding the canvas top. */
      const delta = el.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top - 80;
      if (Math.abs(delta) < 24) return; // already placed — don't re-scroll
      scroller.scrollTo({
        top: scroller.scrollTop + delta,
        behavior: reduce ? 'auto' : 'smooth',
      });
    }));
  }, []);
  const selectFromCanvas = useCallback((id: SectionId) => {
    setActive(id);
    if (viewportMobileRef.current && id) {
      setMobileSheet('props');
      scrollSectionAboveSheet(id);
    }
  }, [scrollSectionAboveSheet]);
  const selectFromRail = useCallback((id: SectionId) => {
    setActive(id);
    if (!viewportMobileRef.current) {
      /* Desktop: bring the picked section into the canvas viewport —
         clicking "Gallery" in the rail used to select the panel while
         the canvas stayed parked on the hero. Tool-panel keys have no
         [data-section-id] node; the query just misses. */
      if (id) scrollSectionAboveSheet(id);
      return;
    }
    setMobileSheet(id ? 'props' : 'theme');
    if (id) scrollSectionAboveSheet(id);
  }, [scrollSectionAboveSheet]);
  /* ── Mobile section stepper ─────────────────────────────────
     The props sheet's header walks the SAME ordered list the
     Sections rail shows (sectionOrderFor is the shared
     derivation), so prev/next moves match what the host sees in
     the list. Tool panels aren't in the canvas order — the
     chevrons hide there (activeIdx === -1). */
  const orderedSections = useMemo(
    () => (viewportMobile ? sectionOrderFor(bridge.manifest).orderedSections : []),
    [viewportMobile, bridge.manifest],
  );
  const activeIdx = active ? orderedSections.findIndex((s) => s.id === active) : -1;
  const occasion = (bridge.manifest as unknown as { occasion?: string }).occasion;
  const activeSectionLabel = (active && sectionDisplayLabel(active, occasion)) || 'Edit section';
  const stepToSection = useCallback((id: SectionId) => {
    if (!id) return;
    setActive(id);
    setMobileSheet('props');
    scrollSectionAboveSheet(id);
  }, [scrollSectionAboveSheet]);

  /* ── Golden thread, phone edition ───────────────────────────
     Desktop shows the one next-best-action as a topbar chip; the
     compact bar has no room, so it rides as a dismissible strip
     above the bottom bar. Dismiss lasts the session. */
  const nextStep = useMemo(
    () => (viewportMobile ? nextStepFor(bridge.manifest) : null),
    [viewportMobile, bridge.manifest],
  );
  const [nextStepDismissed, setNextStepDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.sessionStorage.getItem('pl-rd-next-step-dismissed') === '1'; } catch { return false; }
  });
  const dismissNextStep = useCallback(() => {
    setNextStepDismissed(true);
    try { window.sessionStorage.setItem('pl-rd-next-step-dismissed', '1'); } catch { /* private mode */ }
  }, []);
  const followNextStep = useCallback(() => {
    const step = nextStep;
    if (!step) return;
    if (step.target === 'publish') {
      /* Same action as the desktop chip — straight to the flow. */
      bridge.openPublish();
      return;
    }
    setActive(step.target as SectionId);
    setMobileSheet('props');
    scrollSectionAboveSheet(step.target);
  }, [nextStep, bridge, scrollSectionAboveSheet]);

  /* ── Mobile Publish gate ────────────────────────────────────
     Desktop surfaces the PublishChecklist pill next to Publish;
     the bottom bar has no room for it, so the Publish tap runs
     the same audit first: unresolved items on an unpublished
     site open the checklist card (non-blocking — "Publish
     anyway" continues); otherwise straight to the flow. */
  const [mobileChecklistOpen, setMobileChecklistOpen] = useState(false);
  const publishFromBar = useCallback(() => {
    const m = bridge.manifest;
    if (!isManifestPublished(m) && buildPublishChecks(m).some((c) => !c.ok)) {
      setMobileChecklistOpen(true);
      return;
    }
    bridge.openPublish();
  }, [bridge]);

  /* The First Pressing — the once-per-generation reveal. Armed by
     the wizard via sessionStorage; consumed before first paint so
     a freshly-woven site opens behind the curtain, not in front
     of it. useLayoutEffect (not state init) keeps SSR happy. */
  const [pressing, setPressing] = useState(false);
  useLayoutEffect(() => {
    /* Deliberate setState-in-effect: sessionStorage can only be read
       client-side, and the layout effect flips state before first
       paint (see the comment above). A render-time read would break
       SSR. (The rule no longer flags this pattern.) */
    if (shouldPlayFirstPressing(siteSlug)) setPressing(true);
  }, [siteSlug]);

  /* Deep surfaces (SharePanel writes, PublishChecklist jumps, the
     topbar Theme button) fire window events; the shell mounts one
     listener that owns the state. __plPearApply is the manifest-
     apply hook SharePanel writes through.

     The listeners subscribe ONCE (empty deps) and reach the latest
     setManifest through a ref — the bridge object (and setManifest,
     whose useCallback depends on `names`) gets a new identity on
     every keystroke, so depending on it re-subscribed 3 window
     listeners per edit and left __plPearApply briefly undefined
     between cleanup and re-run (a window where SharePanel's apply
     silently no-ops). Same ref pattern as viewportMobileRef above. */
  const setManifestRef = useRef(bridge.setManifest);
  useEffect(() => {
    setManifestRef.current = bridge.setManifest;
  });

  /* ── Theme Store hand-off ────────────────────────────────────
     The standalone /store page (and /templates) can't reach this
     editor's manifest, so their Apply stashes the chosen pack
     under 'pl-applied-pack' and navigates here. Consume it once
     on mount and stamp the look through the bridge's normal
     setManifest path — it rides the autosave POST, lands in the
     undo stack, and fires the same undoable toast an in-editor
     ThemeShop apply does.

     Everything runs inside a deferred timeout: no synchronous
     setState-in-effect (React Compiler rule), and StrictMode's
     double-invoke stays safe because the stash is only removed
     when a scheduled callback actually runs (the first schedule
     is cancelled by cleanup before it can read). */
  const manifestRef = useRef(bridge.manifest);
  useEffect(() => {
    manifestRef.current = bridge.manifest;
  });
  /* Register the site's Voice DNA (lib/pear/editor-voice) so every
     Pear rewrite call in the editor — PearInlineRewrite, the
     PropertyRail chips, StoryPanel, FaqPanel — writes in the
     host's captured voice. Keyed on the voiceDNA object itself
     (it only changes via /dashboard/voice, not per keystroke);
     cleared on unmount so no other site inherits it. */
  const voiceDNA = bridge.manifest.voiceDNA;
  useEffect(() => {
    setEditorVoiceProfile({ voiceDNA });
    return () => setEditorVoiceProfile(null);
  }, [voiceDNA]);
  /* Viewers + guest-managers can't save manifests — the server
     rejects their POSTs — so never consume the stash for them
     (it stays put for the owner's next visit). */
  const canApplyStash = viewerRole === 'owner' || viewerRole === 'editor';
  useEffect(() => {
    if (typeof window === 'undefined' || !canApplyStash) return;
    const t = setTimeout(() => {
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(APPLIED_PACK_STASH_KEY);
        if (raw !== null) window.localStorage.removeItem(APPLIED_PACK_STASH_KEY);
      } catch {
        return; /* private mode — nothing stashed */
      }
      const pack = readPackStash(raw, Date.now());
      if (!pack) return;
      const prior = manifestRef.current;
      /* Free vs owned — mirrors EditorThemeShop.onApply. An unowned
         paid pack may be worn on a DRAFT (try-before-you-buy; the
         publish gate reads manifest.appliedPackId), but never on a
         live site — its autosaves would put a paid look in front
         of guests. Ownership reads the shared 'pl-store-owned'
         ledger the store + shop both write. */
      let ownedLocally = pack.priceCents === 0;
      if (!ownedLocally) {
        try {
          const ownedIds = JSON.parse(window.localStorage.getItem('pl-store-owned') || '[]') as unknown;
          ownedLocally = Array.isArray(ownedIds) && ownedIds.includes(pack.id);
        } catch {
          /* unreadable ledger — treat as unowned */
        }
      }
      const locked = !ownedLocally && pack.priceCents > 0;
      if (locked && isManifestPublished(prior)) {
        console.warn('[editor] skipped stashed pack — site is live and the pack is unowned:', pack.id);
        return;
      }
      setManifestRef.current(applyPackToManifest(pack, prior));
      fireUndoable(
        locked
          ? `Wearing ${pack.name} to try — unlock it when you publish`
          : `${pack.name} applied — your old look is one tap away`,
        () => setManifestRef.current(prior),
      );
    }, 0);
    return () => clearTimeout(t);
  }, [canApplyStash]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (window as any).__plPearApply = (next: StoryManifest) => setManifestRef.current(next);
    /* design-jump — dispatched by PublishChecklist + GoLiveBadge +
       Pear advisor when something needs to flip the active panel
       (e.g. "Cover photo · jump to Hero"). detail.block carries a
       SectionId (canvas section OR tool panel key). */
    const onJump = (e: Event) => {
      const detail = (e as CustomEvent).detail as { block?: string } | undefined;
      if (!detail?.block) return;
      setActive(detail.block as SectionId);
      if (viewportMobileRef.current) setMobileSheet('props');
      // Bring the section into view on both form factors (tool-panel
      // keys have no [data-section-id] node; the query just misses).
      scrollSectionAboveSheet(detail.block);
    };
    /* Theme shortcut — fired from the topbar Theme button. Clears
       the active section; the unified rail listens for the same
       event and flips to its Design tab. Phone: the Theme sheet. */
    const onOpenTheme = () => {
      setActive(null);
      if (viewportMobileRef.current) setMobileSheet('theme');
    };
    /* Pear Picks — a section's Content tab asks Pear to populate it
       with rich, ready-to-place suggestion cards (FAQ / Travel /
       Details). Opens the modal. */
    const onOpenPicks = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind?: PicksKind } | undefined;
      if (detail?.kind) setPicksKind(detail.kind);
    };
    /* toggle-preview — the ⌘K "Preview as a guest" row. Flips
       edit ↔ preview (functional update: no `mode` dep needed). */
    const onTogglePreview = () => {
      setMode((m) => (m === 'preview' ? 'edit' : 'preview'));
    };
    window.addEventListener('pearloom:design-jump', onJump);
    window.addEventListener('pearloom:open-theme-rail', onOpenTheme);
    window.addEventListener('pearloom:open-picks', onOpenPicks);
    window.addEventListener('pearloom:toggle-preview', onTogglePreview);
    return () => {
      window.removeEventListener('pearloom:design-jump', onJump);
      window.removeEventListener('pearloom:open-theme-rail', onOpenTheme);
      window.removeEventListener('pearloom:open-picks', onOpenPicks);
      window.removeEventListener('pearloom:toggle-preview', onTogglePreview);
      (window as any).__plPearApply = undefined;
    };
    // setActive/setMode/setMobileSheet/setPicksKind are stable state
    // setters; setManifest arrives via the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prototype L1148-1160 — three-pane grid shell. On phone-sized
  // viewports the grid collapses to topbar + canvas; rails live
  // in bottom sheets instead of columns.
  const gridColumns = viewportMobile ? '1fr' : '256px 1fr 360px';
  const gridAreas = viewportMobile
    ? '"top" "canvas"'
    : '"top top top" "left canvas right"';
  /* Which sheet's content to render — falls back to the last open
     sheet while the exit slide plays so it doesn't empty mid-air. */
  const displaySheet = mobileSheet ?? lastSheet;

  return (
    <div
      className="pl8 pl-redesign"
      style={{
        /* Fixed-height grid so the page itself never scrolls — each
           cell becomes its own scroll viewport. Was minHeight: 100vh,
           which made the grid grow with its tallest child (the canvas
           rendering a tall site), pushing the rails out of view as
           the user scrolled. dvh (dynamic viewport) accommodates
           mobile browser chrome that resizes the visual viewport. */
        height: '100dvh',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gridTemplateRows: '56px 1fr',
        gridTemplateAreas: gridAreas,
        background: 'var(--cream)',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
        /* 360ms is a coordinated pair with the device-frame width
           transition below — keep the literal duration, tokenize the curve. */
        transition: 'grid-template-columns 360ms var(--pl-ease-emphasis)',
      }}
    >
      <EditorTopbar
        mode={mode}
        setMode={setMode}
        savedAt={bridge.savedAt}
        saveState={bridge.saveState}
        onPublish={bridge.openPublish}
        canPublish={viewerRole === 'owner'}
        peers={peers}
        onOpenSettings={bridge.openSettings}
        displayNames={bridge.displayNames}
        /* Feeds the desktop golden-thread chip + GoLiveBadge +
           PublishChecklist pill (all no-op without it). */
        manifest={bridge.manifest}
        compact={viewportMobile}
        onUndo={bridge.undo}
        onRedo={bridge.redo}
        canUndo={bridge.canUndo}
        canRedo={bridge.canRedo}
      />

      {!viewportMobile && mode !== 'preview' && (
        <EditorRailLeft
          active={active}
          setActive={setActive}
          completion={bridge.completion}
          title={bridge.displayNames}
          slug={bridge.prettyUrl}
          manifest={bridge.manifest}
          onChange={bridge.setManifest}
          canvasPage={canvasPage}
          setCanvasPage={setCanvasPage}
          peers={peers}
        />
      )}

      <EditorCanvas
        active={active}
        setActive={viewportMobile ? selectFromCanvas : setActive}
        /* Inline-edit focus selection — plain setActive on every
           viewport (no mobile props-sheet pop: opening a sheet over
           the keyboard mid-typing would bury the field being edited). */
        onSectionFocus={setActive}
        mode={mode}
        manifest={bridge.manifest}
        names={bridge.names}
        siteSlug={siteSlug}
        onEditField={bridge.editField}
        onEditNames={bridge.setNames}
        viewportMobile={viewportMobile}
        usePrototypeCanvas={false}
        canvasPage={canvasPage}
        compareManifest={compareManifest}
      />

      {/* The unified inspector — Content · Design · ✦ Motion. Always
          mounted; the Content tab shows a "Pick a section" empty
          state when nothing's selected, while Design + Motion stay
          available (the v2 rail folds the old theme rail in). */}
      {!viewportMobile && mode !== 'preview' && (
        <PropertyRail
          active={active}
          setActive={setActive}
          manifest={bridge.manifest}
          onChange={bridge.setManifest}
          siteSlug={siteSlug}
          onOpenShop={bridge.openThemeShop}
          onOpenDecor={bridge.openDecor}
        />
      )}

      {/* ── Phone chrome — fixed bottom bar + bottom sheets. Four
          destinations: Sections (left rail) · Theme (theme rail) ·
          Preview (mode flip) · Publish (owner-only, same
          pearloom:open-publish path as the topbar), plus the
          bridge's save state on the bar's right edge. Hidden in
          Preview mode — the floating "Back to editing" pill below
          is the exit there. */}
      {viewportMobile && mode !== 'preview' && (
        <MobileBottomBar
          activeSheet={mobileSheet}
          onSections={() => setMobileSheet('sections')}
          onTheme={() => setMobileSheet('theme')}
          onPreview={() => setMode('preview')}
          onPublish={viewerRole === 'owner' ? publishFromBar : undefined}
          saveState={bridge.saveState}
        />
      )}
      {/* Golden-thread strip — the one next-best-action, riding
          above the bottom bar. Hidden while a sheet is open (it
          would collide) and in preview. Dismiss lasts the session. */}
      {viewportMobile && mode === 'edit' && mobileSheet === null && !nextStepDismissed && nextStep && (
        <MobileNextStepStrip
          label={nextStep.label}
          hint={nextStep.hint}
          onFollow={followNextStep}
          onDismiss={dismissNextStep}
        />
      )}
      {/* Mobile Publish gate — the checklist card the bottom bar's
          Publish opens when essentials are still missing. */}
      {viewportMobile && mobileChecklistOpen && (
        <MobilePublishChecklist
          manifest={bridge.manifest}
          onClose={() => setMobileChecklistOpen(false)}
          onPublish={() => { setMobileChecklistOpen(false); bridge.openPublish(); }}
        />
      )}
      {/* Phone preview strips ALL editor chrome so the site reads
          exactly as guests will see it — this pill is the one
          obvious exit. Viewers stay locked to preview (no pill). */}
      {viewportMobile && mode === 'preview' && viewerRole !== 'viewer' && (
        <PreviewExitPill onClick={() => setMode('edit')} />
      )}
      {viewportMobile && (
        <MobileSheet
          open={mobileSheet !== null}
          onClose={() => setMobileSheet(null)}
          /* Props + Theme are SEE-THROUGH half sheets — their whole
             point is watching the canvas repaint as you change
             things ("you can't see your changes till you put the
             drawer away", 2026-06-12). Sections stays modal. */
          seeThrough={displaySheet === 'props' || displaySheet === 'theme'}
          /* Content identity — a change while open swaps content in
             place and rises a peeked sheet back to open (tapping a
             new section IS intent to edit it). */
          contentKey={displaySheet === 'props' ? `props:${String(active)}` : displaySheet}
          height={
            displaySheet === 'props' || displaySheet === 'theme'
              ? 'min(48vh, 460px)'
              : '75vh'
          }
          label={
            displaySheet === 'sections' ? 'Page sections'
              : displaySheet === 'theme' ? 'Theme'
              : activeSectionLabel
          }
          /* Section stepper — chevrons flanking the props sheet's
             title walk the same ordered list the Sections rail
             shows. Hidden for tool panels (not in the canvas
             order); disabled at the ends. */
          onPrev={displaySheet === 'props' && activeIdx >= 0
            ? () => stepToSection(orderedSections[activeIdx - 1]?.id ?? null)
            : undefined}
          onNext={displaySheet === 'props' && activeIdx >= 0
            ? () => stepToSection(orderedSections[activeIdx + 1]?.id ?? null)
            : undefined}
          prevDisabled={activeIdx <= 0}
          nextDisabled={activeIdx < 0 || activeIdx >= orderedSections.length - 1}
        >
          {displaySheet === 'sections' && (
            <EditorRailLeft
              active={active}
              setActive={selectFromRail}
              completion={bridge.completion}
              title={bridge.displayNames}
              slug={bridge.prettyUrl}
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
              canvasPage={canvasPage}
              setCanvasPage={setCanvasPage}
              peers={peers}
            />
          )}
          {displaySheet === 'theme' && (
            <ThemeRail
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
              onOpenShop={bridge.openThemeShop}
              onOpenDecor={bridge.openDecor}
            />
          )}
          {displaySheet === 'props' && active && (
            <PropertyRail
              active={active}
              setActive={selectFromRail}
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
              siteSlug={siteSlug}
              onOpenShop={bridge.openThemeShop}
              onOpenDecor={bridge.openDecor}
            />
          )}
        </MobileSheet>
      )}

      {/* Floating chrome — Decor Library drawer, Theme Shop bottom
          sheet, Command Palette modal, Publish Flow. All listen on
          window events so any deep surface (sidebar buttons, ⌘K,
          fine-tune dials) can pop them. */}
      <EditorDrawers
        manifest={bridge.manifest}
        onChange={bridge.setManifest}
        siteSlug={siteSlug}
      />
      {/* Pear Picks — rich AI suggestion cards a section's Content tab
          can summon (FAQ / Travel / Details). Each Add drops a real
          record into the manifest. */}
      <CanvasPearBlocks
        kind={picksKind}
        manifest={bridge.manifest}
        onAdd={bridge.editField}
        onClose={() => setPicksKind(null)}
      />
      {/* Pear's hands — thread-travel + weave-settle + dye-sweep
          overlay for every AI operation (pearloom:pear-working). */}
      <PearLoomFx />
      {/* Design-change beacons — the "what changed, where" chip +
          thread pass / layer pulse for design commits. */}
      <DesignChangeBeacon />
      {/* Co-edit highlights — "Maya is editing this section" boxes
          over the canvas, driven by peers' broadcast section. */}
      {!viewportMobile && mode !== 'preview' && peers.length > 0 && (
        <CoEditHighlights peers={peers} />
      )}
      {/* Pear's contact sheet — three live miniature canvases for
          "in 3 styles" asks (pearloom:pressings). Picks chain into
          the Fitting Room. */}
      <ThreePressings names={bridge.names} />
      {/* Basted in — Pear's while-you-were-away stitches. Hidden on
          phone viewports (the FAB corner is already contested) and
          in preview mode. */}
      {!viewportMobile && mode === 'edit' && (
        <BastedIn
          manifest={bridge.manifest}
          siteSlug={siteSlug}
          onApply={(next) => bridge.editField(() => next)}
        />
      )}

      {pressing && (
        <FirstPressing
          manifest={bridge.manifest}
          names={bridge.names}
          onDone={() => setPressing(false)}
        />
      )}
    </div>
  );
}

/* ─── Canvas ─── literal port of editor-redesign.jsx L236-312 ──────────
   The prototype wraps a 1100px (390px mobile) device frame on a cream-3
   paper backdrop with a radial-grid dot pattern. */

/* Memoized canvas renderer — pairs with the useDeferredValue calls in
   EditorCanvas. Without memo, deferring manifest/active only changes
   WHICH values the urgent render passes down; the full ThemedSite tree
   still re-renders synchronously. With it, the urgent render (sheet
   open, section select, panel keystroke) sees identical props and
   bails out; the canvas repaints on the deferred pass. */
const CanvasThemedSite = memo(ThemedSite);

function EditorCanvas({
  active, setActive, onSectionFocus,
  mode, manifest, names, siteSlug, onEditField, onEditNames,
  viewportMobile = false,
  usePrototypeCanvas = false,
  canvasPage = null,
  compareManifest = null,
}: {
  /** Magazine mode — which page the canvas is focused on (Pages
   *  tab in the left rail). null = whole site, every section. */
  canvasPage?: 'home' | SiteBlockKey | null;
  active: SectionId;
  setActive: (id: SectionId) => void;
  /** Fired when an inline-editable field gains focus — selects the
   *  section in the property rail without the mobile sheet pop. */
  onSectionFocus?: (id: SectionId) => void;
  mode: EditorMode;
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
  onEditNames: (next: [string, string]) => void;
  /** Real phone-sized browser viewport (NOT the Mobile preview
   *  pill). Canvas goes edge-to-edge, the device frame drops its
   *  chrome, and ThemedSite is forced into its mobile variants
   *  regardless of the mode pill. */
  viewportMobile?: boolean;
  /** When true, the canvas renders the prototype-faithful FullSite
   *  (decorative arches, gradient blobs, photo strips) instead of the
   *  full ThemedSiteRenderer. Preview pill flips to ThemedSiteRenderer. */
  usePrototypeCanvas?: boolean;
  /** Compare hold — while set, the canvas paints THIS manifest (the
   *  one before the last change) read-only, with a "Before" chip.
   *  Never persisted; release restores the live manifest. */
  compareManifest?: StoryManifest | null;
}) {
  /* On a real phone the canvas always uses mobile sizing — the
     host shouldn't have to toggle the Mobile preview pill to see
     their own phone's layout. */
  const isMobile = mode === 'mobile' || viewportMobile;
  const isPreview = mode === 'preview';

  /* Canvas photo drawer (v2) — clicking a photo square on the canvas
     dispatches `pearloom:open-photo` with a PhotoSlot; we open the
     bottom gallery tray and write the picked URL back to the manifest
     field that slot names. Edit mode only. */
  const [photoSlot, setPhotoSlot] = useState<PhotoSlot | null>(null);
  useEffect(() => {
    if (isPreview) return;
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as PhotoSlot | undefined;
      if (detail && detail.kind) setPhotoSlot(detail);
    };
    window.addEventListener('pearloom:open-photo', onOpen as EventListener);
    return () => window.removeEventListener('pearloom:open-photo', onOpen as EventListener);
  }, [isPreview]);
  const writePhoto = (url: string | null) => {
    const s = photoSlot;
    if (!s) return;
    onEditField((m) => {
      const loose = m as unknown as Record<string, unknown>;
      if (s.kind === 'cover') {
        return { ...loose, coverPhoto: url || undefined } as unknown as StoryManifest;
      }
      if (s.kind === 'gallery' && typeof s.index === 'number') {
        const arr = Array.isArray(loose.galleryImages) ? [...(loose.galleryImages as string[])] : [];
        const captions = (loose.galleryCaptions ?? {}) as Record<string, string>;
        if (url) {
          // Clamp — ThemedSite's empty-gallery placeholders dispatch
          // indices 0..5, so an unclamped write would leave undefined
          // holes that render as broken <img> tiles.
          arr[Math.min(s.index, arr.length)] = url;
          return { ...loose, galleryImages: arr } as unknown as StoryManifest;
        }
        arr.splice(s.index, 1);
        // Captions are index-keyed — shift keys above the removed
        // index down by one so each caption stays with its photo
        // (same re-key GalleryPanel.setPhoto does).
        const nextCaptions: Record<string, string> = {};
        for (const [k, v] of Object.entries(captions)) {
          const ki = Number(k);
          if (!Number.isInteger(ki) || ki === s.index) continue;
          nextCaptions[String(ki > s.index ? ki - 1 : ki)] = v;
        }
        return { ...loose, galleryImages: arr, galleryCaptions: nextCaptions } as unknown as StoryManifest;
      }
      if (s.kind === 'chapter' && typeof s.index === 'number') {
        const chapters = Array.isArray(loose.chapters) ? [...(loose.chapters as Record<string, unknown>[])] : [];
        const ch = { ...(chapters[s.index] ?? {}) };
        const imgs = Array.isArray(ch.images) ? [...(ch.images as Record<string, unknown>[])] : [];
        if (url) imgs[0] = { ...(imgs[0] ?? {}), url };
        else imgs.shift();
        ch.images = imgs;
        ch.heroImage = url || undefined;
        chapters[s.index] = ch;
        return { ...loose, chapters } as unknown as StoryManifest;
      }
      return m;
    });
  };
  /* Keystroke responsiveness — every panel input writes a fresh
     manifest object, and the 4,400-line ThemedSite tree re-renders
     on each one. useDeferredValue lets React commit the cheap panel
     update first and paint the canvas at lower priority, so typing
     in the Property Rail never waits on a full canvas render.
     InlineEdit on the canvas is uncontrolled (commits on blur), so
     the deferral never lags text the host is actively typing. */
  const deferredManifest = useDeferredValue(manifest);
  /* Compare hold — the "before" frame swaps in URGENTLY (it's a
     deliberate press, not a keystroke burst) and is read-only. */
  const comparing = compareManifest !== null;
  const canvasManifest = compareManifest ?? deferredManifest;
  /* Tap responsiveness — same pattern for the ACTIVE section. On a
     phone, tapping a section sets active + opens the props sheet in
     one urgent render; passing the fresh `active` straight into
     ThemedSite made that urgent render pay for the full canvas tree
     before the sheet's slide-in could start. Deferring `active` (and
     memoizing ThemedSite below) lets the urgent render bail out of
     the canvas entirely — the sheet animates immediately, then the
     selection chrome paints on the deferred pass. On the deferred
     pass every other ThemedSite prop is referentially stable for a
     selection-only change (bridge memoizes names/editField/setNames),
     so CanvasThemedSite's shallow compare only fails when something
     really changed. */
  const canvasActive = useDeferredValue(active);
  /* In the handoff, the canvas content is IDENTICAL between Edit and
     Preview modes — Preview just hides the section-frame chrome.
     Production now does the same: FullSite renders in both modes;
     Preview turns editable=false so the lavender hover/click chrome
     is suppressed. */
  const showFullSite = usePrototypeCanvas;

  return (
    <div
      data-pl-canvas-scroll
      style={{
        gridArea: 'canvas',
        background: 'var(--cream-3)',
        overflow: 'auto',
        /* CRITICAL: minHeight: 0 defeats the grid-item intrinsic-
           min-height default. Without this, the canvas cell grows
           to fit its content (the entire tall site) instead of
           staying inside its grid track (100dvh - 56px). When that
           happens, overflow:auto has nothing to scroll because the
           content "fits" inside the now-oversized cell, and the
           outer wrapper's overflow:hidden clips it instead.
           Round G applied this to the rails; the canvas needed it
           too — that's why mouse-wheel scroll didn't work even
           though scrollIntoView() did (programmatic scroll bypasses
           the same calculation). */
        minHeight: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        /* Viewport-mobile: edge-to-edge canvas; the bottom inset
           keeps the end of the site clear of the fixed bottom bar.
           Preview drops it — the bar unmounts there and only the
           floating exit pill rides over the site. */
        padding: viewportMobile
          ? (isPreview ? 0 : '0 0 calc(64px + env(safe-area-inset-bottom))')
          : isMobile ? '24px 0' : '28px 24px',
        position: 'relative',
      }}
    >
      {/* Paper-grid backdrop — prototype L252-257. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(61,74,31,0.08) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          opacity: 0.5,
        }}
      />

      {/* Device frame (prototype L259-291). NOTE: previously had
          transform: translateZ(0) to make the frame a containing
          block for position:fixed mobile-drawer children, but that
          interacted badly with the fixed-height grid + flex column
          layout and broke canvas vertical scroll. Removed in Round L.
          In editor mobile preview, the nav drawers now attach to
          the browser viewport — which is fine for a preview; real
          mobile users on the published site see the drawer at the
          actual viewport (there's no device frame in production). */}
      <div
        onClick={() => setActive(null)}
        style={{
          /* Real phone: the canvas IS the device — no 390px frame
             inside a 390px screen. Edge-to-edge, no chrome. */
          width: viewportMobile ? '100%' : isMobile ? 390 : 1100,
          maxWidth: '100%',
          background: 'var(--paper)',
          borderRadius: viewportMobile ? 0 : isMobile ? 36 : 14,
          boxShadow: viewportMobile ? 'none' : 'var(--shadow-md)',
          border: viewportMobile ? 'none' : '1px solid var(--card-ring)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          /* 360ms pairs with the shell grid-template-columns transition.
             border-radius rides along — the width eased while the
             14↔36 corner snap gave the mode switch a hard edge. */
          transition: 'width 360ms var(--pl-ease-emphasis), border-radius 360ms var(--pl-ease-emphasis)',
          containerType: 'inline-size',
          containerName: 'pl-site',
          /* CRITICAL: flexShrink: 0 stops the canvas flex-column from
             squishing the device frame down to the canvas's height
             and then having the device frame's overflow:hidden clip
             ThemedSite's content at ~700px. Without flexShrink: 0,
             the canvas saw a "child that fits" and never engaged its
             own overflow:auto. With it, the device frame stays at its
             content's natural height (~5000px), the canvas sees the
             overflow, and mouse-wheel + scrollbar finally work. */
          flexShrink: 0,
          /* Compare hold — the "before" frame is a peek, never an
             editing surface. */
          pointerEvents: comparing ? 'none' : undefined,
        }}
      >
        {/* Living background (v2 shader wallpaper) — ThemedSite's root
            goes transparent when manifest.background is set, expecting
            an animated ground behind it. The published shell mounts
            one; without this the canvas previewed a wallpaper pick as
            flat editor paper. Absolute (fixed={false}) so the device
            frame contains it; the site root carries zIndex 1 and
            paints above. LivingBackground self-validates the id. */}
        {Boolean((canvasManifest as unknown as { background?: string }).background) && (
          <LivingBackground
            id={(canvasManifest as unknown as { background?: string }).background as string}
            fixed={false}
          />
        )}
        {/* Compare hold — "Before" chip while the previous look is
            painted. pointerEvents are cut below so nothing can edit
            the old manifest mid-peek. */}
        {comparing && (
          <div
            role="status"
            style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              zIndex: 40, pointerEvents: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 13px', borderRadius: 999,
              background: 'var(--pl-glass, rgba(251,247,238,0.85))',
              backgroundImage: 'var(--pl-glass-sheen)',
              backdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
              WebkitBackdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
              border: '1px solid var(--pl-glass-border, rgba(14,13,11,0.12))',
              boxShadow: 'var(--pl-glass-shadow, 0 8px 24px rgba(14,13,11,0.14))',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--pl-ink, #2A2418)',
              whiteSpace: 'nowrap',
            }}
          >
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />
            Before — release to return
          </div>
        )}
        <CanvasThemedSite
          active={canvasActive}
          setActive={setActive}
          onSectionFocus={isPreview || comparing ? undefined : onSectionFocus}
          editable={!isPreview && !comparing}
          manifest={canvasManifest}
          names={names}
          /* When the editor's mode pill is "Mobile", force the canvas
             to use the mobile nav drawer variants — otherwise
             useIsMobile() reads the browser viewport (desktop) and
             the canvas paints the desktop nav inside the 390px frame. */
          forceMobile={isMobile}
          /* Round R — pipe the bridge's editField + setNames through
             so InlineEdit components inside the canvas write directly
             back to the manifest. PropertyRail's panel inputs and the
             canvas now share the same write path. */
          onEditField={isPreview || comparing ? undefined : onEditField}
          onEditNames={isPreview || comparing ? undefined : onEditNames}
          /* Magazine (multi-page) sites — Preview shows the real home
             page (hero + the keep-on-home picks) exactly as guests
             will see it. Edit mode keeps every section on the canvas
             so they all stay editable; own-page sections carry an
             "· own page" tag in their selection handle. siteSlug is
             deliberately NOT passed: in-canvas nav clicks must never
             navigate the editor tab to the published site. */
          pageFilter={
            readSiteMode(canvasManifest) === 'multi-page'
              ? (canvasPage ?? (isPreview ? 'home' : undefined))
              : undefined
          }
          /* Data-only slug: the registry section's item grid uses it
             to fetch the host's REAL items on the canvas. Unlike
             siteSlug (still deliberately omitted, see above), this
             never drives navigation. */
          registrySiteSlug={siteSlug}
        />
        {/* The Fitting Room — drape layer for whole-site AI
            proposals (pearloom:drape). Lives inside the device
            frame so the drape aligns 1:1 with the canvas. */}
        <FittingRoom
          /* Deferred manifest — the drape preview doesn't need
             keystroke-fresh data, and the undeferred prop made it
             re-render synchronously on every edit while the canvas
             itself rendered at deferred priority. */
          manifest={canvasManifest}
          names={names}
          forceMobile={isMobile}
          onApply={(next) => onEditField(() => next)}
        />
        {/* Canvas photo drawer — the v2 "press a square → your gallery"
            tray. Writes the picked/uploaded URL to the slot's manifest
            field, then closes. */}
        {!isPreview && (
          <CanvasPhotoDrawer
            slot={photoSlot}
            manifest={manifest}
            onPick={(url) => { writePhoto(url); setPhotoSlot(null); }}
            onClear={() => { writePhoto(null); setPhotoSlot(null); }}
            onClose={() => setPhotoSlot(null)}
          />
        )}
        {/* GuestRsvpModal mount — same modal PublishedSiteShell
            shows guests, so the host can TEST the real RSVP flow.
            Mounted in ALL modes: in Edit, the canvas CTA selects
            the RSVP section instead of firing pl-open-rsvp (see
            ThemedSite's onCtaClick), so the only thing that opens
            it there is the RSVP panel's explicit "Preview as a
            guest" button — which was dead while this mount was
            Preview-only. */}
        {/* Deferred for the same reason as FittingRoom above. */}
        <EditorCanvasRsvpModal siteSlug={siteSlug} manifest={canvasManifest} />
      </div>

      {isPreview && (
        <div
          style={{
            position: 'absolute', top: 16, right: 24,
            padding: '6px 12px', borderRadius: 999,
            background: 'var(--ink)', color: 'var(--cream)',
            fontSize: 11.5, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: 'var(--shadow)',
          }}
        >
          <Icon name="eye" size={11} color="var(--cream)" />
          Preview — chrome hidden
        </div>
      )}
    </div>
  );
}

/* EditorCanvasRsvpModal — lazy-loaded wrapper for the published-
   site GuestRsvpModal so the editor preview can open the same
   RSVP form a guest would see. The actual modal is ~30KB; the
   require() call keeps it out of the initial editor bundle until
   the canvas mounts. */
function EditorCanvasRsvpModal({ siteSlug, manifest }: { siteSlug: string; manifest: StoryManifest }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy require, keeps the ~30KB modal out of the initial editor bundle
  const GuestRsvpModal = require('../site/GuestRsvpModal').GuestRsvpModal as React.ComponentType<{
    siteSlug: string;
    manifest: StoryManifest;
  }>;
  return <GuestRsvpModal siteSlug={siteSlug} manifest={manifest} />;
}
