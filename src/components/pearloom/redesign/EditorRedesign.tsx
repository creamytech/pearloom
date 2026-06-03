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

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import { ThemedSiteRenderer } from '../site/ThemedSiteRenderer';
import { useEditorRedesignBridge } from './bridge';
import { EditorRailLeft } from './SectionRail';
import { PropertyRail } from './PropertyRail';
import { ThemeRail } from './ThemeRail';
import { FloatingPearBubble } from './FloatingPearBubble';
import { EditorTopbar } from './EditorTopbar';
import { FullSite } from './FullSite';
import { ThemedSite } from './ThemedSite';
import { EditorDrawers } from './EditorDrawers';
import './animations.css';

interface Props {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
}

export type EditorMode = 'edit' | 'preview' | 'mobile';
export type SectionId =
  | 'hero' | 'story' | 'details' | 'schedule' | 'travel'
  | 'registry' | 'gallery' | 'rsvp' | 'faq' | 'nav' | 'navMobile' | null;

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

  /* FloatingPearBubble + DesignAdvisor entry points fire window
     events; the shell mounts one listener that owns the state. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (window as any).__plPearApply = (next: StoryManifest) => bridge.setManifest(next);
    const onOpenPear = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prefill?: string } | undefined;
      if (detail?.prefill) setPearPrefill(detail.prefill);
      setPearOpen(true);
    };
    window.addEventListener('pearloom:open-pear', onOpenPear);
    return () => {
      window.removeEventListener('pearloom:open-pear', onOpenPear);
      (window as any).__plPearApply = undefined;
    };
  }, [bridge]);

  // Prototype L1148-1160 — four-pane grid shell.
  const gridColumns = pearOpen ? '256px 1fr 360px 320px' : '256px 1fr 360px';
  const gridAreas = pearOpen
    ? '"top top top top" "left canvas right pear"'
    : '"top top top" "left canvas right"';

  return (
    <div
      className="pl8 pl-redesign"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gridTemplateRows: '56px 1fr',
        gridTemplateAreas: gridAreas,
        background: 'var(--cream)',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
        transition: 'grid-template-columns 360ms cubic-bezier(0.16,1,0.3,1)',
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
      />

      {mode !== 'preview' && (
        <EditorRailLeft
          active={active}
          setActive={setActive}
          completion={bridge.completion}
          title={bridge.displayNames}
          slug={bridge.prettyUrl}
          manifest={bridge.manifest}
        />
      )}

      <EditorCanvas
        active={active}
        setActive={setActive}
        hover={hover}
        setHover={setHover}
        mode={mode}
        manifest={bridge.manifest}
        names={bridge.names}
        siteSlug={siteSlug}
        onEditField={bridge.editField}
        onEditNames={bridge.setNames}
        pearOpen={pearOpen}
        usePrototypeCanvas={false}
      />

      {mode !== 'preview' && (
        active
          ? <PropertyRail
              active={active}
              setActive={setActive}
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
            />
          : <ThemeRail
              manifest={bridge.manifest}
              onChange={bridge.setManifest}
              onOpenShop={bridge.openThemeShop}
              onOpenDecor={bridge.openDecor}
            />
      )}

      {pearOpen && (
        <PearAside
          onClose={() => setPearOpen(false)}
          manifest={bridge.manifest}
          names={bridge.names}
          siteSlug={siteSlug}
          prefill={pearPrefill}
          onApplyPatch={(next) => bridge.setManifest(next)}
        />
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
    </div>
  );
}

/* ─── Canvas ─── literal port of editor-redesign.jsx L236-312 ──────────
   The prototype wraps a 1100px (390px mobile) device frame on a cream-3
   paper backdrop with a radial-grid dot pattern + FloatingPearBubble. */

function EditorCanvas({
  active, setActive, hover, setHover,
  mode, manifest, names, siteSlug, onEditField, onEditNames, pearOpen: _pearOpen,
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
  /** When true, the canvas renders the prototype-faithful FullSite
   *  (decorative arches, gradient blobs, photo strips) instead of the
   *  full ThemedSiteRenderer. Preview pill flips to ThemedSiteRenderer. */
  usePrototypeCanvas?: boolean;
}) {
  void _pearOpen;
  const isMobile = mode === 'mobile';
  const isPreview = mode === 'preview';
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
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: isMobile ? '24px 0' : '28px 24px',
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

      {/* Device frame (prototype L259-291). */}
      <div
        onClick={() => setActive(null)}
        style={{
          width: isMobile ? 390 : 1100,
          maxWidth: '100%',
          background: 'var(--paper)',
          borderRadius: isMobile ? 36 : 14,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--card-ring)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1)',
          containerType: 'inline-size',
          containerName: 'pl-site',
        }}
      >
        <ThemedSite
          active={active}
          hover={hover}
          setActive={setActive}
          setHover={setHover}
          editable={!isPreview}
          manifest={manifest}
          names={names}
        />
        {/* FullSite + ThemedSiteRenderer kept as imports for one-line
            rollback during cutover — not rendered. */}
        {false && (
          <>
            <FullSite active={active} hover={hover} setActive={setActive} setHover={setHover} editable={!isPreview} manifest={manifest} names={names} />
            <ThemedSiteRenderer manifest={manifest} names={names} siteSlug={siteSlug} editMode={!isPreview} onEditField={isPreview ? undefined : onEditField} onEditNames={isPreview ? undefined : onEditNames} />
          </>
        )}
      </div>

      {!isPreview && (
        <FloatingPearBubble
          active={active}
          manifest={manifest}
          names={names}
          onApplyPatch={(next) => {
            /* Forward to the bridge via setManifest — flowing through
               the same persistence + saveState wiring. */
            (window as unknown as { __plPearApply?: (m: StoryManifest) => void }).__plPearApply?.(next);
          }}
          onAskMore={(text) => {
            /* Open the 4th-column Pear pane prefilled with the host's
               question. The shell listens for this event. */
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pearloom:open-pear', { detail: { prefill: text } }));
            }
          }}
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
  onClose, manifest, names, siteSlug, prefill, onApplyPatch,
}: {
  onClose: () => void;
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  prefill?: string;
  onApplyPatch: (next: StoryManifest) => void;
}) {
  /* Lazy-load DesignAdvisor — 48 KB module. Renders as an inline
     <aside> in the 4th grid column via inline={true}. */
  const DesignAdvisor = require('../editor/DesignAdvisor').DesignAdvisor as React.ComponentType<{
    manifest: StoryManifest;
    names: [string, string];
    siteSlug: string;
    open: boolean;
    onClose: () => void;
    onApplyPatch?: (next: StoryManifest) => void;
    intent?: { pass: string; key: number } | null;
    inline?: boolean;
  }>;
  return (
    <div style={{ gridArea: 'pear', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <DesignAdvisor
        manifest={manifest}
        names={names}
        siteSlug={siteSlug}
        open
        onClose={onClose}
        onApplyPatch={onApplyPatch}
        intent={prefill ? { pass: prefill, key: Date.now() } : null}
        inline
      />
    </div>
  );
}
