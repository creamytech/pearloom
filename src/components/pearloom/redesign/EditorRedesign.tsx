'use client';

/* eslint-disable no-restricted-syntax */
/* =========================================================================
   PEARLOOM EDITOR — REDESIGN
   Literal port of handoff/pages/editor-redesign.jsx into production TSX.

   The accumulated EditorV8 shell (4,360 lines) bent the prototype around
   production state machinery. This file does the opposite: the prototype
   shell IS the layout, and production manifest state flows in through a
   thin bridge.

   Shape (prototype L1148-1257):
     gridTemplateColumns: pearOpen ? '256px 1fr 360px 320px' : '256px 1fr 360px'
     gridTemplateRows: '56px 1fr'
     gridTemplateAreas:
       pearOpen → '"top top top top" "left canvas right pear"'
       else     → '"top top top" "left canvas right"'

   Mounted by /editor/[siteSlug]. Production state hooks (autosave, undo
   stack, publish flow) live in a bridge module — this file stays focused
   on the visual shell.
*/

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { Icon, Pear } from '../motifs';
import { useEditorRedesignBridge } from './bridge';
import { EditorRailLeft } from './SectionRail';
import { PropertyRail } from './PropertyRail';
import { ThemeRail } from './ThemeRail';
import { FloatingPearBubble } from './FloatingPearBubble';
import { EditorTopbar } from './EditorTopbar';
import { FullSite } from './FullSite';
import { ThemedSite } from './ThemedSite';
import { EditorDrawers } from './EditorDrawers';
import { PearLoomFx } from './PearLoomFx';
import { FittingRoom } from './FittingRoom';
import { ThreePressings } from './ThreePressings';
import { BastedIn } from './BastedIn';
import { FirstPressing, shouldPlayFirstPressing } from './FirstPressing';
import { MobileSheet, MobileBottomBar, type MobileSheetId } from './MobileSheet';
import { useMobileViewport } from './use-mobile-viewport';
import './animations.css';

interface Props {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
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
  | 'packingList' | 'honorList'
  /* Tool panels — not canvas sections, but host-facing tools that
     mount through the same PropertyRail dispatch so the editor's
     state machine stays simple. */
  | 'guests' | 'savetheDate' | 'share' | 'dayof' | 'memorial' | 'bachelor'
  | 'toasts'
  | null;

/* Occasion → which optional canvas sections fit. Countdown reads
   the event date so it works for any forward-looking occasion;
   memorials use it in "X years since" mode but the read path is
   identical. Map needs a venue. Music is celebratory by default —
   suppress on memorial/funeral unless the host opts in via the
   Add Section picker. */
export function isOptionalSectionApplicable(section: 'countdown' | 'map' | 'music', occasion?: string): boolean {
  if (section === 'music') return occasion !== 'memorial' && occasion !== 'funeral';
  return true;
}

/* The ten Event-OS canvas blocks the Add Section picker can offer. */
export type BlockSectionId =
  | 'itinerary' | 'costSplitter' | 'activityVote' | 'toastSignup'
  | 'adviceWall' | 'program' | 'livestream' | 'obituary'
  | 'packingList' | 'honorList';

export const BLOCK_SECTION_IDS: readonly BlockSectionId[] = [
  'itinerary', 'costSplitter', 'activityVote', 'toastSignup',
  'adviceWall', 'program', 'livestream', 'obituary',
  'packingList', 'honorList',
];

/* honorList is the generalized weddingParty (wedding party / court
   of honor / candle-lighters) — the EVENT_TYPES registry gates it
   under the legacy 'weddingParty' BlockType id. */
const BLOCK_GATE_ALIAS: Partial<Record<BlockSectionId, string>> = {
  honorList: 'weddingParty',
};

/* Occasion → which Event-OS blocks are addable. A block is addable
   when the EVENT_TYPES registry lists it in defaultBlocks OR
   optionalBlocks for the occasion. Unknown / missing occasion →
   true (never strand a host whose manifest predates the registry). */
export function isBlockApplicable(blockId: BlockSectionId, occasion?: string): boolean {
  const event = getEventType(occasion);
  if (!event) return true;
  const gateId = BLOCK_GATE_ALIAS[blockId] ?? blockId;
  return (event.defaultBlocks as readonly string[]).includes(gateId)
      || (event.optionalBlocks as readonly string[]).includes(gateId);
}

/* Occasion → whether each of the nine CORE sections fits, plus the
   content-wins escape hatch. Implementation lives in the leaf
   module section-applicability.ts (ThemedSite needs the same
   helpers and is imported BY this file — importing them from here
   would cycle). Re-exported for compat with the existing pattern
   of pulling applicability gates out of EditorRedesign. */
export { isCoreSectionApplicable, sectionHasContent } from './section-applicability';

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

export default function EditorRedesign({ manifest: initialManifest, siteSlug, names: initialNames }: Props) {
  // Bridge — autosave, manifest state, undo/redo, publish. Hides the
  // production machinery behind a small interface that mirrors the
  // prototype's tweaks-panel locals (setActive, setLayout, etc.).
  const bridge = useEditorRedesignBridge({ initialManifest, initialNames, siteSlug });

  const [mode, setMode] = useState<EditorMode>('edit');
  const [active, setActive] = useState<SectionId>('hero');
  const [hover, setHover] = useState<SectionId>(null);
  const [pearOpen, setPearOpen] = useState(false);
  const [pearPrefill, setPearPrefill] = useState<string>('');

  /* ── Viewport-mobile chrome ──────────────────────────────────
     viewportMobile (real phone-sized browser) is NOT the canvas's
     "Mobile" preview pill (mode === 'mobile'). Below 768px the
     three-column grid collapses: the canvas goes full-width and
     the rails re-mount inside bottom sheets driven by a fixed
     bottom bar (Sections · Theme · Pear). Desktop behavior is
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
  /* Crossing the breakpoint: hand the open Pear pane to the
     matching chrome on the other side. Render-time adjustment
     (the React-docs pattern, not an effect) — converges in one
     extra render and never shows a frame with both chromes. */
  if (viewportMobile && pearOpen) {
    setPearOpen(false);
    setMobileSheet('pear');
  } else if (!viewportMobile && mobileSheet) {
    if (mobileSheet === 'pear') setPearOpen(true);
    setMobileSheet(null);
  }

  /* Section selection wrappers — on a phone, activating a section
     opens the PropertyRail sheet (tap on canvas or a row in the
     Sections sheet); deselecting from the rail's Theme tab swaps
     to the Theme sheet. Desktop passes straight through. */
  const selectFromCanvas = useCallback((id: SectionId) => {
    setActive(id);
    if (viewportMobileRef.current && id) setMobileSheet('props');
  }, []);
  const selectFromRail = useCallback((id: SectionId) => {
    setActive(id);
    if (!viewportMobileRef.current) return;
    setMobileSheet(id ? 'props' : 'theme');
  }, []);
  /* The First Pressing — the once-per-generation reveal. Armed by
     the wizard via sessionStorage; consumed before first paint so
     a freshly-woven site opens behind the curtain, not in front
     of it. useLayoutEffect (not state init) keeps SSR happy. */
  const [pressing, setPressing] = useState(false);
  useLayoutEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       deliberate: sessionStorage can only be read client-side, and
       the layout effect flips state before first paint (see the
       comment above). A render-time read would break SSR. */
    if (shouldPlayFirstPressing(siteSlug)) setPressing(true);
  }, [siteSlug]);

  /* FloatingPearBubble + DesignAdvisor entry points fire window
     events; the shell mounts one listener that owns the state. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (window as any).__plPearApply = (next: StoryManifest) => bridge.setManifest(next);
    const onOpenPear = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prefill?: string } | undefined;
      if (detail?.prefill) setPearPrefill(detail.prefill);
      /* Phone → the Pear bottom sheet; desktop → 4th column. */
      if (viewportMobileRef.current) setMobileSheet('pear');
      else setPearOpen(true);
    };
    /* design-jump — dispatched by PublishChecklist + GoLiveBadge +
       Pear advisor when something needs to flip the active panel
       (e.g. "Cover photo · jump to Hero"). detail.block carries a
       SectionId (canvas section OR tool panel key). */
    const onJump = (e: Event) => {
      const detail = (e as CustomEvent).detail as { block?: string } | undefined;
      if (!detail?.block) return;
      setActive(detail.block as SectionId);
      if (viewportMobileRef.current) setMobileSheet('props');
    };
    /* Theme-rail shortcut — fired from the topbar Theme button.
       Switches the property rail to ThemeRail by clearing the
       active section (the conditional in the grid below renders
       ThemeRail when active is null). Phone: the Theme sheet. */
    const onOpenTheme = () => {
      setActive(null);
      if (viewportMobileRef.current) setMobileSheet('theme');
    };
    window.addEventListener('pearloom:open-pear', onOpenPear);
    window.addEventListener('pearloom:design-jump', onJump);
    window.addEventListener('pearloom:open-theme-rail', onOpenTheme);
    return () => {
      window.removeEventListener('pearloom:open-pear', onOpenPear);
      window.removeEventListener('pearloom:design-jump', onJump);
      window.removeEventListener('pearloom:open-theme-rail', onOpenTheme);
      (window as any).__plPearApply = undefined;
    };
  }, [bridge]);

  // Prototype L1148-1160 — four-pane grid shell. On phone-sized
  // viewports the grid collapses to topbar + canvas; rails live
  // in bottom sheets instead of columns.
  const gridColumns = viewportMobile
    ? '1fr'
    : pearOpen ? '256px 1fr 360px 320px' : '256px 1fr 360px';
  const gridAreas = viewportMobile
    ? '"top" "canvas"'
    : pearOpen
      ? '"top top top top" "left canvas right pear"'
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
        pearOpen={pearOpen}
        setPearOpen={setPearOpen}
        onOpenSettings={bridge.openSettings}
        displayNames={bridge.displayNames}
        compact={viewportMobile}
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
        />
      )}

      <EditorCanvas
        active={active}
        setActive={viewportMobile ? selectFromCanvas : setActive}
        hover={hover}
        setHover={setHover}
        mode={mode}
        manifest={bridge.manifest}
        names={bridge.names}
        siteSlug={siteSlug}
        onEditField={bridge.editField}
        onEditNames={bridge.setNames}
        pearOpen={pearOpen || mobileSheet === 'pear'}
        viewportMobile={viewportMobile}
        usePrototypeCanvas={false}
      />

      {!viewportMobile && mode !== 'preview' && (
        active
          ? <PropertyRail
              active={active}
              setActive={setActive}
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
              siteSlug={siteSlug}
            />
          : <ThemeRail
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
              onOpenShop={bridge.openThemeShop}
              onOpenDecor={bridge.openDecor}
            />
      )}

      {!viewportMobile && pearOpen && (
        <PearAside
          onClose={() => setPearOpen(false)}
          manifest={bridge.manifest}
          names={bridge.names}
          siteSlug={siteSlug}
          prefill={pearPrefill}
          currentBlock={active ?? undefined}
          onApplyPatch={(next) => bridge.setManifest(next)}
        />
      )}

      {/* ── Phone chrome — fixed bottom bar + bottom sheets. The
          bar mirrors the desktop rails: Sections (left rail),
          Theme (theme rail), Pear (advisor). Activating a section
          opens the PropertyRail sheet. Hidden in Preview mode,
          matching how the desktop rails unmount there. */}
      {viewportMobile && mode !== 'preview' && (
        <MobileBottomBar
          activeSheet={mobileSheet}
          onSections={() => setMobileSheet('sections')}
          onTheme={() => setMobileSheet('theme')}
          onPear={() => setMobileSheet('pear')}
        />
      )}
      {viewportMobile && (
        <MobileSheet
          open={mobileSheet !== null}
          onClose={() => setMobileSheet(null)}
          height={displaySheet === 'props' ? '80vh' : '75vh'}
          label={
            displaySheet === 'sections' ? 'Page sections'
              : displaySheet === 'theme' ? 'Theme'
              : displaySheet === 'pear' ? 'Pear, your design advisor'
              : 'Edit section'
          }
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
            />
          )}
          {displaySheet === 'pear' && (
            <PearAside
              mobile
              onClose={() => setMobileSheet(null)}
              manifest={bridge.manifest}
              names={bridge.names}
              siteSlug={siteSlug}
              prefill={pearPrefill}
              currentBlock={active ?? undefined}
              onApplyPatch={(next) => bridge.setManifest(next)}
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
      {/* Pear's hands — thread-travel + weave-settle + dye-sweep
          overlay for every AI operation (pearloom:pear-working). */}
      <PearLoomFx />
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
   paper backdrop with a radial-grid dot pattern + FloatingPearBubble. */

function EditorCanvas({
  active, setActive, hover, setHover,
  mode, manifest, names, siteSlug, onEditField, onEditNames, pearOpen,
  viewportMobile = false,
  usePrototypeCanvas = false,
}: {
  active: SectionId;
  setActive: (id: SectionId) => void;
  hover: SectionId;
  setHover: (id: SectionId) => void;
  mode: EditorMode;
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
  onEditNames: (next: [string, string]) => void;
  pearOpen: boolean;
  /** Real phone-sized browser viewport (NOT the Mobile preview
   *  pill). Canvas goes edge-to-edge, the device frame drops its
   *  chrome, and ThemedSite is forced into its mobile variants
   *  regardless of the mode pill. */
  viewportMobile?: boolean;
  /** When true, the canvas renders the prototype-faithful FullSite
   *  (decorative arches, gradient blobs, photo strips) instead of the
   *  full ThemedSiteRenderer. Preview pill flips to ThemedSiteRenderer. */
  usePrototypeCanvas?: boolean;
}) {
  /* On a real phone the canvas always uses mobile sizing — the
     host shouldn't have to toggle the Mobile preview pill to see
     their own phone's layout. */
  const isMobile = mode === 'mobile' || viewportMobile;
  const isPreview = mode === 'preview';
  /* Keystroke responsiveness — every panel input writes a fresh
     manifest object, and the 4,400-line ThemedSite tree re-renders
     on each one. useDeferredValue lets React commit the cheap panel
     update first and paint the canvas at lower priority, so typing
     in the Property Rail never waits on a full canvas render.
     InlineEdit on the canvas is uncontrolled (commits on blur), so
     the deferral never lags text the host is actively typing. */
  const canvasManifest = useDeferredValue(manifest);
  /* In the handoff, the canvas content is IDENTICAL between Edit and
     Preview modes — Preview just hides the section-frame chrome.
     Production now does the same: FullSite renders in both modes;
     Preview turns editable=false so the lavender hover/click chrome
     is suppressed. */
  const showFullSite = usePrototypeCanvas;

  return (
    <div
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
           keeps the end of the site clear of the fixed bottom bar. */
        padding: viewportMobile
          ? '0 0 calc(64px + env(safe-area-inset-bottom))'
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
          /* 360ms pairs with the shell grid-template-columns transition. */
          transition: 'width 360ms var(--pl-ease-emphasis)',
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
        }}
      >
        <ThemedSite
          active={active}
          hover={hover}
          setActive={setActive}
          setHover={setHover}
          editable={!isPreview}
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
          onEditField={isPreview ? undefined : onEditField}
          onEditNames={isPreview ? undefined : onEditNames}
        />
        {/* The Fitting Room — drape layer for whole-site AI
            proposals (pearloom:drape). Lives inside the device
            frame so the drape aligns 1:1 with the canvas. */}
        <FittingRoom
          manifest={manifest}
          names={names}
          forceMobile={isMobile}
          onApply={(next) => onEditField(() => next)}
        />
        {/* GuestRsvpModal mount — same modal PublishedSiteShell
            shows guests, mounted so the host can TEST the RSVP
            flow from Preview / Mobile-preview. Deliberately NOT
            mounted in Edit mode: the canvas CTAs there select the
            RSVP section instead (a guest modal opening over the
            editor blurred the whole shell and trapped the host). */}
        {isPreview || mode === 'mobile' ? (
          <EditorCanvasRsvpModal siteSlug={siteSlug} manifest={manifest} />
        ) : null}
      </div>

      {/* One Pear, one entry point — the pill only OPENS the
          advisor (desktop column or mobile sheet, routed through
          pearloom:open-pear). Its old nudge/chat UI moved into the
          advisor itself. Hidden while the advisor is open so there
          are never two Pears on screen (audit 2026-06-09). */}
      {!isPreview && !pearOpen && (
        <FloatingPearBubble
          bottomOffset={viewportMobile ? 'calc(72px + env(safe-area-inset-bottom))' : 24}
        />
      )}

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

/* ─── Pear aside (4th column) ──────────────────────────────────────── */

function PearAside({
  onClose, manifest, names, siteSlug, prefill, onApplyPatch, currentBlock, mobile = false,
}: {
  onClose: () => void;
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  prefill?: string;
  onApplyPatch: (next: StoryManifest) => void;
  /** Section the host is editing — lets the advisor open with the
   *  matching "Pear noticed…" nudge + answer "polish this". */
  currentBlock?: string;
  /** Mount inside the mobile bottom sheet instead of the 4th grid
   *  column — drops the gridArea so the sheet's grid cell sizes it. */
  mobile?: boolean;
}) {
  /* Lazy-load DesignAdvisor — 48 KB module. Renders as an inline
     <aside> in the 4th grid column via inline={true}. */
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy require, keeps the module out of the initial editor bundle
  const DesignAdvisor = require('../editor/DesignAdvisor').DesignAdvisor as React.ComponentType<{
    manifest: StoryManifest;
    names: [string, string];
    siteSlug: string;
    open: boolean;
    onClose: () => void;
    onApplyPatch?: (next: StoryManifest) => void;
    intent?: { pass: string; key: number } | null;
    inline?: boolean;
    currentBlock?: string;
  }>;
  return (
    <div
      style={
        mobile
          ? { minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }
          : { gridArea: 'pear', minWidth: 0, display: 'flex', flexDirection: 'column' }
      }
    >
      <DesignAdvisor
        manifest={manifest}
        names={names}
        siteSlug={siteSlug}
        open
        onClose={onClose}
        onApplyPatch={onApplyPatch}
        // eslint-disable-next-line react-hooks/purity -- pre-dates this lint; the key only needs to differ per prefill instance and the advisor dedupes via lastIntentKeyRef
        intent={prefill ? { pass: prefill, key: Date.now() } : null}
        inline
        currentBlock={currentBlock}
      />
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
