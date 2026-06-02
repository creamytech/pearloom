'use client';

/* eslint-disable no-restricted-syntax */
/* Floating chrome for the redesign editor — Decor Library drawer,
   Theme Shop bottom sheet, Command Palette modal. All listen on
   window events ('pearloom:open-decor-library',
   'pearloom:open-theme-shop', 'pearloom:open-command-palette') so
   deep surfaces can pop them without prop-drilling. */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';

const DecorLibraryPanel = dynamic(
  () => import('../editor/panels/DecorLibraryPanel').then((m) => ({ default: m.DecorLibraryPanel })),
  { ssr: false },
);
const EditorThemeShop = dynamic(
  () => import('../editor/EditorThemeShop').then((m) => ({ default: m.EditorThemeShop })),
  { ssr: false },
);
const CommandPalette = dynamic(
  () => import('../editor/CommandPalette').then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

interface Props {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  siteSlug: string;
}

const SECTION_PALETTE: { key: string; label: string; description?: string }[] = [
  { key: 'hero',     label: 'Hero',      description: 'Names, date, cover' },
  { key: 'story',    label: 'Our story', description: 'How you met' },
  { key: 'details',  label: 'Details',   description: 'Dress code & FAQ-lite' },
  { key: 'schedule', label: 'Schedule',  description: 'Day-of timeline' },
  { key: 'travel',   label: 'Travel',    description: 'Hotels, transit' },
  { key: 'registry', label: 'Registry',  description: 'Linked stores' },
  { key: 'gallery',  label: 'Gallery',   description: 'Photos' },
  { key: 'rsvp',     label: 'RSVP',      description: 'Meals & plus-ones' },
  { key: 'faq',      label: 'FAQ',       description: 'Common questions' },
];

export function EditorDrawers({ manifest, onChange, siteSlug }: Props) {
  void siteSlug;
  const [decorOpen, setDecorOpen] = useState(false);
  const [themeShopOpen, setThemeShopOpen] = useState(false);

  /* Window-event listeners — every deep surface fires the same event
     names the legacy EditorV8 already dispatches, so the existing
     wiring lights up here for free.
     CommandPalette manages its own open state via its built-in ⌘K
     listener — we just mount it. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const openDecor = () => setDecorOpen(true);
    const openShop = () => setThemeShopOpen(true);
    window.addEventListener('pearloom:open-decor-library', openDecor);
    window.addEventListener('pearloom:open-theme-shop', openShop);
    return () => {
      window.removeEventListener('pearloom:open-decor-library', openDecor);
      window.removeEventListener('pearloom:open-theme-shop', openShop);
    };
  }, []);

  return (
    <>
      <DecorLibraryPanel
        asDrawer
        open={decorOpen}
        onClose={() => setDecorOpen(false)}
        manifest={manifest}
        onChange={onChange}
      />
      <EditorThemeShop
        open={themeShopOpen}
        onClose={() => setThemeShopOpen(false)}
        manifest={manifest}
        onChange={onChange}
      />
      <CommandPalette
        manifest={manifest}
        sections={SECTION_PALETTE}
        onPatchManifest={onChange}
        onJumpSection={(key) => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent('pearloom:jump-section', { detail: { key } }));
        }}
        onOpenThemeShop={() => setThemeShopOpen(true)}
        onOpenDecorLibrary={() => setDecorOpen(true)}
        onOpenSettings={() => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent('pearloom:open-settings'));
        }}
        onPublish={() => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent('pearloom:open-publish'));
        }}
        onTogglePreview={() => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent('pearloom:toggle-preview'));
        }}
        onOpenAskPear={() => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent('pearloom:open-ask-pear'));
        }}
      />
    </>
  );
}

export default EditorDrawers;
