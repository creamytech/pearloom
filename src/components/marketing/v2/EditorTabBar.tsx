'use client';

// ─────────────────────────────────────────────────────────────
// Editor v2 tab bar — Theme / Compose / Arrange / Publish.
// Sits above the classic FullscreenEditor and provides the four
// entry points from mockup 1: Theme opens the gallery sheet,
// Compose is the default edit-in-place experience, Arrange opens
// the block library drawer, Publish opens the publish modal.
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode } from 'react';
import { PD, DISPLAY_STYLE, Pear } from '../design/DesignAtoms';
import { ThemeGallerySheet } from './ThemeGallery';
import { PublishModal } from '@/components/shared/PublishModal';
import type { StoryManifest } from '@/types';

export type EditorTab = 'theme' | 'compose' | 'arrange' | 'publish';

const TABS: { k: EditorTab; l: string }[] = [
  { k: 'theme', l: 'Theme' },
  { k: 'compose', l: 'Compose' },
  { k: 'arrange', l: 'Arrange' },
  { k: 'publish', l: 'Publish' },
];

export function EditorTabBar({
  manifest,
  names,
  subdomain,
  onManifestChange,
  onBack,
  onPreview,
  onShare,
}: {
  manifest: StoryManifest;
  names: [string, string];
  subdomain: string;
  onManifestChange: (m: StoryManifest) => void;
  onBack?: () => void;
  onPreview?: () => void;
  onShare?: () => void;
}) {
  const [active, setActive] = useState<EditorTab>('compose');
  const [themeOpen, setThemeOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const title = names[0] && names[1] ? `${names[0]} & ${names[1]}` : names[0] || 'Your site';

  const onTab = (k: EditorTab) => {
    setActive(k);
    if (k === 'theme') setThemeOpen(true);
    if (k === 'arrange') {
      // The existing editor exposes an "open block library" action through
      // window.dispatchEvent. Emit it so the left drawer opens.
      window.dispatchEvent(new CustomEvent('pearloom:open-block-library'));
    }
    if (k === 'publish') setPublishOpen(true);
  };

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: 'rgba(244,236,216,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(31,36,24,0.08)',
          padding: '10px clamp(16px, 4vw, 28px)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: 'var(--pl-font-body)',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back to dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: PD.ink,
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <Pear size={26} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <span
            style={{
              ...DISPLAY_STYLE,
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            Pearloom
          </span>
        </button>
        <div
          style={{
            fontSize: 13,
            color: PD.ink,
            padding: '6px 10px',
            background: PD.paperCard,
            borderRadius: 10,
            fontWeight: 500,
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          className="pl-editor-v2-title"
        >
          {title}
        </div>

        {/* Tabs */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            gap: 22,
          }}
          className="pl-editor-v2-tabs"
        >
          {TABS.map((t) => (
            <TabButton key={t.k} active={active === t.k} onClick={() => onTab(t.k)}>
              {t.l}
            </TabButton>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onPreview && (
            <button
              onClick={onPreview}
              style={{
                background: 'transparent',
                border: '1px solid rgba(31,36,24,0.15)',
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 12.5,
                cursor: 'pointer',
                color: PD.ink,
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              👁 Preview
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              style={{
                background: 'transparent',
                border: '1px solid rgba(31,36,24,0.15)',
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 12.5,
                cursor: 'pointer',
                color: PD.ink,
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              className="pl-editor-v2-share"
            >
              ↑ Share
            </button>
          )}
          <button
            onClick={() => setPublishOpen(true)}
            style={{
              background: PD.oliveDeep,
              color: '#FFFEF7',
              border: 'none',
              borderRadius: 999,
              padding: '9px 18px',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 16px rgba(76,90,38,0.22)',
            }}
          >
            ✦ Publish site
          </button>
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            :global(.pl-editor-v2-tabs) {
              gap: 12px !important;
              font-size: 12px !important;
            }
            :global(.pl-editor-v2-title) {
              display: none !important;
            }
            :global(.pl-editor-v2-share) {
              display: none !important;
            }
          }
          @media (max-width: 640px) {
            :global(.pl-editor-v2-tabs) {
              display: none !important;
            }
          }
        `}</style>
      </div>

      {themeOpen && (
        <ThemeGallerySheet
          manifest={manifest}
          onApply={(m) => onManifestChange(m)}
          onClose={() => {
            setThemeOpen(false);
            setActive('compose');
          }}
        />
      )}

      <PublishModal
        open={publishOpen}
        onClose={() => {
          setPublishOpen(false);
          if (active === 'publish') setActive('compose');
        }}
        manifest={manifest}
        coupleNames={names}
        initialSubdomain={subdomain}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        color: active ? PD.ink : PD.inkSoft,
        fontWeight: active ? 500 : 400,
        padding: '8px 4px',
        borderBottom: `1.5px solid ${active ? PD.olive : 'transparent'}`,
        transition: 'color 180ms, border-color 180ms',
      }}
    >
      {children}
    </button>
  );
}
