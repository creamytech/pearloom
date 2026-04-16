'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '@/lib/editor-state';
import { RangeSlider } from '@/components/ui/range-slider';
import { Loader2 } from 'lucide-react';
import { lbl } from './editor-utils';
import { makeId } from '@/lib/editor-ids';
import { panelText, panelWeight, panelTracking, panelLineHeight, panelFont } from './panel';

// ── Shared sub-label (used inside SidebarSection bodies) ──────
// Matches the canonical PanelField/editor-utils lbl typography:
// 0.6rem • 700 • #71717A • uppercase • 0.1em tracking.
const SUB_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: panelText.label,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.wider,
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-muted)',
  marginBottom: '6px',
  lineHeight: panelLineHeight.tight,
};

// Small muted helper text beneath a chip grid or picker
const HINT_TEXT: React.CSSProperties = {
  fontSize: panelText.meta,
  color: 'var(--pl-chrome-text-muted)',
  marginTop: '6px',
  lineHeight: panelLineHeight.normal,
};
import { ColorPalettePanel } from './ColorPalettePanel';
import { ThemeSwitcher, PRESET_THEMES } from './ThemeSwitcher';
import FontPicker from '@/components/dashboard/FontPicker';
import { AssetPicker } from '@/components/asset-library/AssetPicker';
import { ArtManager } from './ArtManager';
import { SidebarSection } from './EditorSidebar';
import { DesignIcon } from '@/components/icons/EditorIcons';
import { VisualEffectsPanel } from './VisualEffectsPanel';
import { DesignAdvisor } from './DesignAdvisor';
import { AccessibilityAuditPanel } from './AccessibilityAuditPanel';
import { CORNER_PRESETS, renderCornerSvg, type CornerPreset } from '@/lib/corner-presets';
import {
  CHAPTER_DATE_FORMATS,
  type ChapterDateFormatKey,
} from '@/components/blocks/StoryLayouts';
import { Check, Navigation } from 'lucide-react';
import {
  PearIcon, PearlIcon, WeddingRingsIcon, BouquetIcon, ElegantHeartIcon,
  EnvelopeIcon, ChampagneIcon, GiftIcon, MountainIcon, PawIcon,
  MusicNoteIcon, CoffeeCupIcon, SuitcaseIcon, StarburstIcon,
} from '@/components/icons/PearloomIcons';
import type { StoryManifest, ThemeSchema, LogoIconId } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import { invertPalette, DESIGN_PRESETS, generateTypeHierarchy, type TypeScale } from '@/lib/smart-features';

// ── Logo Icon Options ─────────────────────────────────────────
const LOGO_ICONS: Array<{ id: LogoIconId; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = [
  { id: 'wedding-rings', label: 'Rings', Icon: WeddingRingsIcon },
  { id: 'heart', label: 'Heart', Icon: ElegantHeartIcon },
  { id: 'bouquet', label: 'Bouquet', Icon: BouquetIcon },
  { id: 'champagne', label: 'Cheers', Icon: ChampagneIcon },
  { id: 'envelope', label: 'Letter', Icon: EnvelopeIcon },
  { id: 'gift', label: 'Gift', Icon: GiftIcon },
  { id: 'pearl', label: 'Pearl', Icon: PearlIcon },
  { id: 'pear', label: 'Pear', Icon: PearIcon },
  { id: 'mountain', label: 'Mountain', Icon: MountainIcon },
  { id: 'paw', label: 'Paw', Icon: PawIcon },
  { id: 'music-note', label: 'Music', Icon: MusicNoteIcon },
  { id: 'coffee', label: 'Coffee', Icon: CoffeeCupIcon },
  { id: 'suitcase', label: 'Travel', Icon: SuitcaseIcon },
  { id: 'starburst', label: 'Star', Icon: StarburstIcon },
];

// ── Nav Style Options ─────────────────────────────────────────
const NAV_STYLES: Array<{ id: string; label: string; desc: string; preview: React.ReactNode }> = [
  {
    id: 'glass', label: 'Glass', desc: 'Frosted blur, floats over content',
    preview: (
      <div style={{ height: '100%', background: 'linear-gradient(135deg, rgba(24,24,27,0.08), rgba(196,169,106,0.1))', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'rgba(255,255,255,0.7)', /* blur removed */ borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-chrome-text)' }} />
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.6 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'minimal', label: 'Minimal', desc: 'Clean line, no background',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.4 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'solid', label: 'Solid', desc: 'Opaque bar with shadow',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-chrome-text)' }} />
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.5 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'editorial', label: 'Editorial', desc: 'Centered logo, wide spacing',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', paddingTop: '2px' }}>
          <div style={{ width: '16px', height: '2.5px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.5 }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '1.5px', background: '#71717A', borderRadius: '1px', opacity: 0.5 }} />)}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'floating', label: 'Floating', desc: 'Pill-shaped, detached from edge',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '3px', left: '15%', right: '15%', height: '8px', background: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-chrome-text)' }} />
            <div style={{ width: '10px', height: '1.5px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.4 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'centered', label: 'Centered', desc: 'Logo on top, links below — two rows',
    preview: (
      <div style={{ height: '100%', background: '#fff', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', paddingTop: '1px' }}>
          <div style={{ width: '14px', height: '2px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.55 }} />
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: '5px', height: '1px', background: '#71717A', borderRadius: '1px', opacity: 0.4 }} />)}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'sidebar', label: 'Sidebar', desc: 'Vertical left sidebar navigation',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative', display: 'flex' }}>
        <div style={{ width: '22%', height: '100%', background: '#fff', borderRight: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px', gap: '2px' }}>
          <div style={{ width: '10px', height: '2px', background: 'var(--pl-chrome-text)', borderRadius: '1px', opacity: 0.6 }} />
          {[0, 1, 2].map(i => <div key={i} style={{ width: '8px', height: '1px', background: '#71717A', borderRadius: '1px', opacity: 0.3 }} />)}
        </div>
        <div style={{ flex: 1, background: 'var(--pl-cream)' }} />
      </div>
    ),
  },
  {
    id: 'command', label: 'Command', desc: 'Hidden nav, ⌘K to open page menu',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: '6px', right: '8px', padding: '2px 5px', borderRadius: '4px', background: 'var(--pl-chrome-text)', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: 'rgba(255,255,255,0.7)' }} />
          <div style={{ width: '4px', height: '1px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
        </div>
      </div>
    ),
  },
];

const MOBILE_NAV_STYLES: Array<{ id: string; label: string; desc: string }> = [
  { id: 'classic', label: 'Classic', desc: 'Top bar with hamburger menu' },
  { id: 'compact-glass', label: 'Compact Glass', desc: 'Thin frosted bar, minimal' },
  { id: 'floating-pill', label: 'Floating Pill', desc: 'Centered pill-shaped nav' },
  { id: 'bottom-tabs', label: 'Bottom Tabs', desc: 'App-style tab bar at bottom' },
  { id: 'hidden', label: 'Hidden', desc: 'Floating hamburger button only' },
  { id: 'floating-island', label: 'Floating Island', desc: 'Bottom-center pill with page links' },
];

// ── Nav Customization Panel ───────────────────────────────────
// Editorial rebuild — numbered specimen cards, Fraunces italic
// display names, mono eyebrows, gold hairline on active state,
// custom opacity rail with tick marks + big italic readout.
function NavCustomizationPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const currentLogo = manifest.logoIcon || 'pear';
  const currentNavStyle = manifest.navStyle || 'glass';
  const accent = manifest.vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#71717A';
  const num2 = (n: number) => String(n + 1).padStart(2, '0');

  // Reusable specimen-card style (preview on top, eyebrow + italic label below)
  const specimenCard = (isActive: boolean, variant: 'preview' | 'text'): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column',
    borderRadius: '10px', overflow: 'hidden', position: 'relative',
    border: isActive
      ? '1px solid var(--pl-chrome-accent)'
      : '1px solid var(--pl-chrome-border)',
    background: isActive ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
    cursor: 'pointer', padding: 0,
    boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 16%, transparent)' : 'none',
    transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
    textAlign: 'left',
    minHeight: variant === 'preview' ? '82px' : '62px',
  });

  const cardNumber = (isActive: boolean): React.CSSProperties => ({
    position: 'absolute', top: '6px', left: '8px',
    fontFamily: panelFont.mono,
    fontSize: '0.52rem', letterSpacing: panelTracking.widest,
    fontWeight: panelWeight.bold,
    color: isActive ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-faint)',
    opacity: 0.9,
    zIndex: 2,
  });

  const cardDisplayName = (isActive: boolean): React.CSSProperties => ({
    fontFamily: panelFont.display,
    fontStyle: 'italic',
    fontSize: '0.82rem',
    fontWeight: panelWeight.regular,
    color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
    lineHeight: panelLineHeight.tight,
    letterSpacing: '-0.005em',
  });

  const cardEyebrow: React.CSSProperties = {
    fontFamily: panelFont.mono,
    fontSize: '0.5rem',
    letterSpacing: panelTracking.widest,
    textTransform: 'uppercase',
    color: 'var(--pl-chrome-text-muted)',
    marginTop: '3px',
    lineHeight: panelLineHeight.snug,
  };

  const opacity = manifest.navOpacity ?? 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* ── Site Layout — two large numbered editorial cards ──────── */}
      <section>
        <div style={SUB_LABEL}>Site Layout</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {([
            { id: 'multi-page', label: 'Separate Pages', desc: 'Distinct routes, nav-driven' },
            { id: 'single-scroll', label: 'Single Scroll', desc: 'One long editorial page' },
          ] as const).map((mode, i) => {
            const isActive = (manifest.pageMode || 'multi-page') === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onChange({ ...manifest, pageMode: mode.id })}
                style={{ ...specimenCard(isActive, 'text'), padding: '14px 12px 12px' }}
              >
                <span style={cardNumber(isActive)}>№ {num2(i)}</span>
                {isActive && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '10px',
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--pl-chrome-accent)',
                    boxShadow: '0 0 0 2px color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
                  }} />
                )}
                <div style={{ marginTop: '14px' }}>
                  <div style={cardDisplayName(isActive)}>{mode.label}</div>
                  <div style={cardEyebrow}>{mode.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <p style={{
          ...HINT_TEXT, fontFamily: panelFont.body,
          fontStyle: 'italic', marginTop: '10px',
          borderLeft: '1px solid var(--pl-chrome-accent)',
          paddingLeft: '8px',
        }}>
          {(manifest.pageMode || 'multi-page') === 'multi-page'
            ? 'Guests navigate between pages — best for rich sites with many sections.'
            : 'All content lives on one scrolling page — elegant for minimal sites.'}
        </p>
      </section>

      {/* ── Logo picker — two-row named chip grid ─────────────────── */}
      <section>
        <div style={SUB_LABEL}>Site Logo Icon</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          padding: '8px',
          background: 'var(--pl-chrome-bg)',
          borderRadius: '10px',
          border: '1px solid var(--pl-chrome-border)',
        }}>
          {LOGO_ICONS.map(({ id, label, Icon }) => {
            const isActive = currentLogo === id && !manifest.logoSvg;
            return (
              <button
                key={id}
                onClick={() => onChange({ ...manifest, logoIcon: id, logoSvg: undefined })}
                title={label}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '3px', padding: '7px 2px',
                  borderRadius: '6px',
                  border: '1px solid transparent',
                  background: isActive
                    ? 'var(--pl-chrome-accent-soft)'
                    : 'transparent',
                  boxShadow: isActive
                    ? 'inset 0 0 0 1px var(--pl-chrome-accent)'
                    : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <Icon size={18} color={isActive ? accent : 'var(--pl-chrome-text-soft)' as unknown as string} />
                <span style={{
                  fontFamily: panelFont.display,
                  fontStyle: 'italic',
                  fontSize: '0.56rem',
                  color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-faint)',
                  lineHeight: 1,
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {manifest.logoSvg && (
          <div style={{
            marginTop: '10px',
            padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--pl-chrome-accent-soft)',
            border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 40%, transparent)',
            borderRadius: '8px',
          }}>
            <span style={{
              fontFamily: panelFont.mono,
              fontSize: '0.56rem',
              letterSpacing: panelTracking.wider,
              textTransform: 'uppercase',
              color: 'var(--pl-chrome-accent-ink)',
            }}>
              ✦ AI-Generated Logo Active
            </span>
            <button
              onClick={() => onChange({ ...manifest, logoSvg: undefined })}
              style={{
                fontFamily: panelFont.body,
                fontStyle: 'italic',
                fontSize: '0.66rem',
                color: 'var(--pl-chrome-text)',
                background: 'transparent',
                border: '1px solid var(--pl-chrome-border)',
                borderRadius: '6px',
                padding: '3px 10px',
                cursor: 'pointer',
              }}
            >
              Revert to icon
            </button>
          </div>
        )}
      </section>

      {/* ── Desktop Nav Style — numbered specimen cards ───────────── */}
      <section>
        <div style={SUB_LABEL}>Desktop Nav Style</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {NAV_STYLES.map((style, i) => {
            const isActive = currentNavStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onChange({ ...manifest, navStyle: style.id as StoryManifest['navStyle'] })}
                style={specimenCard(isActive, 'preview')}
              >
                <span style={cardNumber(isActive)}>№ {num2(i)}</span>
                {isActive && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '10px',
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--pl-chrome-accent)',
                    boxShadow: '0 0 0 2px color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
                    zIndex: 2,
                  }} />
                )}
                <div style={{
                  height: '44px',
                  borderBottom: '1px solid var(--pl-chrome-border)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {style.preview}
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={cardDisplayName(isActive)}>{style.label}</div>
                  <div style={cardEyebrow}>{style.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Mobile Nav Style — numbered text-only cards ───────────── */}
      <section>
        <div style={SUB_LABEL}>Mobile Nav Style</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {MOBILE_NAV_STYLES.map((style, i) => {
            const isActive = (manifest.mobileNavStyle || 'classic') === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onChange({ ...manifest, mobileNavStyle: style.id as StoryManifest['mobileNavStyle'] })}
                style={{ ...specimenCard(isActive, 'text'), padding: '14px 12px 12px' }}
              >
                <span style={cardNumber(isActive)}>№ {num2(i)}</span>
                {isActive && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '10px',
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--pl-chrome-accent)',
                    boxShadow: '0 0 0 2px color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
                  }} />
                )}
                <div style={{ marginTop: '12px' }}>
                  <div style={cardDisplayName(isActive)}>{style.label}</div>
                  <div style={cardEyebrow}>{style.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Nav Opacity — custom rail with tick marks + italic readout ─ */}
      <section>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <div style={SUB_LABEL}>Nav Opacity</div>
          <div style={{
            fontFamily: panelFont.display,
            fontStyle: 'italic',
            fontSize: '1.1rem',
            fontWeight: panelWeight.regular,
            color: 'var(--pl-chrome-text)',
            lineHeight: 1,
          }}>
            {opacity}
            <span style={{
              fontFamily: panelFont.mono,
              fontSize: '0.56rem',
              fontStyle: 'normal',
              letterSpacing: panelTracking.wider,
              color: 'var(--pl-chrome-text-muted)',
              marginLeft: '2px',
            }}>%</span>
          </div>
        </div>
        <div style={{ position: 'relative', padding: '8px 0 4px' }}>
          {/* Track background */}
          <div style={{
            position: 'absolute', top: '14px', left: 0, right: 0,
            height: '2px', background: 'var(--pl-chrome-border)',
            borderRadius: '1px',
          }} />
          {/* Filled portion */}
          <div style={{
            position: 'absolute', top: '14px', left: 0,
            width: `${opacity}%`, height: '2px',
            background: 'var(--pl-chrome-accent)',
            borderRadius: '1px',
          }} />
          {/* Tick marks */}
          <div style={{
            position: 'absolute', top: '10px', left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between',
            pointerEvents: 'none',
          }}>
            {[0, 25, 50, 75, 100].map(t => (
              <div key={t} style={{
                width: '1px', height: '10px',
                background: opacity >= t ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-border)',
              }} />
            ))}
          </div>
          <input
            type="range"
            min={0} max={100} step={5}
            value={opacity}
            onChange={e => onChange({ ...manifest, navOpacity: Number(e.target.value) })}
            style={{
              width: '100%', margin: 0, padding: 0,
              WebkitAppearance: 'none', appearance: 'none',
              background: 'transparent',
              height: '24px',
              cursor: 'pointer',
              position: 'relative', zIndex: 2,
            }}
            className="pl-nav-opacity-range"
          />
          <style jsx>{`
            .pl-nav-opacity-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--pl-chrome-surface);
              border: 2px solid var(--pl-chrome-accent);
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              cursor: grab;
              transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .pl-nav-opacity-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
            .pl-nav-opacity-range::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.25); }
            .pl-nav-opacity-range::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--pl-chrome-surface);
              border: 2px solid var(--pl-chrome-accent);
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              cursor: grab;
            }
          `}</style>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: panelFont.mono,
            fontSize: '0.5rem',
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-text-faint)',
            marginTop: '2px',
          }}>
            <span>Sheer</span>
            <span>Half</span>
            <span>Full</span>
          </div>
        </div>
      </section>

      {/* ── Nav Background — editorial pill group with hex labels ──── */}
      <section>
        <div style={SUB_LABEL}>Nav Background</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[
            { label: 'Auto', value: '', hex: '— default' },
            { label: 'White', value: 'rgba(255,255,255,0.9)', hex: '#FFFFFF' },
            { label: 'Cream', value: 'rgba(245,241,232,0.92)', hex: '#F5F1E8' },
            { label: 'Dark', value: 'rgba(28,28,28,0.85)', hex: '#1C1C1C' },
            { label: 'Black', value: 'rgba(0,0,0,0.7)', hex: '#000000' },
            { label: 'Accent', value: accent, hex: accent.toUpperCase() },
          ].map(opt => {
            const isActive = (manifest.navBackground || '') === opt.value;
            const swatchColor = opt.value || 'transparent';
            return (
              <button
                key={opt.label}
                onClick={() => onChange({ ...manifest, navBackground: opt.value || undefined })}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', gap: '6px',
                  padding: '10px 10px 9px',
                  borderRadius: '8px',
                  border: isActive
                    ? '1px solid var(--pl-chrome-accent)'
                    : '1px solid var(--pl-chrome-border)',
                  background: isActive ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                  boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '100%', height: '14px',
                  borderRadius: '4px',
                  background: opt.value
                    ? swatchColor
                    : 'repeating-linear-gradient(45deg, var(--pl-chrome-border) 0, var(--pl-chrome-border) 3px, transparent 3px, transparent 6px)',
                  border: '1px solid color-mix(in srgb, var(--pl-chrome-text) 8%, transparent)',
                }} />
                <div style={{ width: '100%' }}>
                  <div style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.72rem',
                    color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    lineHeight: 1.1,
                  }}>
                    {opt.label}
                  </div>
                  <div style={{
                    fontFamily: panelFont.mono,
                    fontSize: '0.48rem',
                    letterSpacing: panelTracking.wider,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-faint)',
                    marginTop: '2px',
                  }}>
                    {opt.hex}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Corner Decoration Picker ──────────────────────────────────
function CornerDecorationPicker({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const accent = manifest.vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#71717A';
  const currentSvg = manifest.vibeSkin?.cornerFlourishSvg || '';
  const [filter, setFilter] = useState<string>('all');

  const categories = ['all', 'botanical', 'whimsical', 'geometric', 'minimal', 'cultural'];
  const filtered = filter === 'all' ? CORNER_PRESETS : CORNER_PRESETS.filter(p => p.category === filter);

  const applyPreset = (preset: CornerPreset) => {
    const svg = preset.svg ? renderCornerSvg(preset, accent) : '';
    onChange({
      ...manifest,
      vibeSkin: manifest.vibeSkin ? { ...manifest.vibeSkin, cornerFlourishSvg: svg || undefined } : manifest.vibeSkin,
    });
  };

  // Check if current matches a preset (rough match by id presence in svg)
  const isActive = (preset: CornerPreset) => {
    if (!preset.svg && !currentSvg) return true;
    if (!preset.svg || !currentSvg) return false;
    const rendered = renderCornerSvg(preset, accent);
    // Compare first 100 chars of path data as fingerprint
    return rendered.slice(0, 120) === currentSvg.slice(0, 120);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Editorial intro — Fraunces italic + gold rule */}
      <div style={{
        borderLeft: '1px solid var(--pl-chrome-accent)',
        paddingLeft: '10px',
      }}>
        <div style={{
          fontFamily: panelFont.mono,
          fontSize: '0.5rem',
          letterSpacing: panelTracking.widest,
          textTransform: 'uppercase',
          color: 'var(--pl-chrome-accent-ink)',
          marginBottom: '3px',
        }}>
          Figure · Ornament
        </div>
        <p style={{
          fontFamily: panelFont.display,
          fontStyle: 'italic',
          fontSize: '0.82rem',
          color: 'var(--pl-chrome-text)',
          lineHeight: panelLineHeight.snug,
          margin: 0,
        }}>
          Decorative corners for hero and footer.
        </p>
      </div>

      {/* Category filter — quiet mono tabs with count */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--pl-chrome-border)', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
        {categories.map(cat => {
          const count = cat === 'all' ? CORNER_PRESETS.length : CORNER_PRESETS.filter(p => p.category === cat).length;
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '8px 10px 10px',
                fontFamily: panelFont.mono,
                fontSize: '0.54rem',
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.widest,
                textTransform: 'uppercase',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? '1px solid var(--pl-chrome-accent)'
                  : '1px solid transparent',
                marginBottom: '-1px',
                color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-muted)',
                display: 'inline-flex', alignItems: 'baseline', gap: '4px',
                transition: 'color 0.18s, border-color 0.18s',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{cat}</span>
              <span style={{
                fontSize: '0.44rem',
                color: 'var(--pl-chrome-text-faint)',
                fontWeight: panelWeight.regular,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Preset grid — numbered specimen tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {filtered.map((preset, i) => {
          const active = isActive(preset);
          const previewSvg = preset.svg ? renderCornerSvg(preset, accent) : '';
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              title={preset.label}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                borderRadius: '10px',
                border: active
                  ? '1px solid var(--pl-chrome-accent)'
                  : '1px solid var(--pl-chrome-border)',
                background: active ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                padding: 0,
              }}
            >
              {/* Number marker */}
              <span style={{
                position: 'absolute', top: '5px', left: '7px',
                fontFamily: panelFont.mono,
                fontSize: '0.46rem',
                letterSpacing: panelTracking.widest,
                fontWeight: panelWeight.bold,
                color: active ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-faint)',
                zIndex: 2,
              }}>
                № {String(i + 1).padStart(2, '0')}
              </span>
              {active && (
                <span style={{
                  position: 'absolute', top: '6px', right: '7px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--pl-chrome-accent)',
                  boxShadow: '0 0 0 2px color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
                  zIndex: 2,
                }} />
              )}
              {/* Preview plate */}
              <div style={{
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid var(--pl-chrome-border)',
                background: active
                  ? 'color-mix(in srgb, var(--pl-chrome-surface) 70%, var(--pl-chrome-accent-soft))'
                  : 'var(--pl-chrome-bg)',
              }}>
                {previewSvg ? (
                  <div
                    style={{ width: '72%', height: '72%' }}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                ) : (
                  <span style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.72rem',
                    color: 'var(--pl-chrome-text-muted)',
                  }}>none</span>
                )}
              </div>
              {/* Name plate */}
              <span style={{
                display: 'block',
                padding: '6px 6px 7px',
                fontFamily: panelFont.display,
                fontStyle: 'italic',
                fontSize: '0.66rem',
                color: active ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                textAlign: 'center',
                lineHeight: 1.15,
              }}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {currentSvg && (
        <div style={{
          padding: '8px 10px',
          background: 'var(--pl-chrome-accent-soft)',
          border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 35%, transparent)',
          borderRadius: '8px',
          fontFamily: panelFont.mono,
          fontSize: '0.54rem',
          letterSpacing: panelTracking.wider,
          textTransform: 'uppercase',
          color: 'var(--pl-chrome-accent-ink)',
          textAlign: 'center',
        }}>
          ✦ AI corners are active — picking a preset replaces them
        </div>
      )}
    </div>
  );
}

// ── Quick Styles — 5 curated one-click theme presets ─────────
// Maps to specific PRESET_THEMES entries by name.
const QUICK_STYLES = [
  { label: 'Romantic',  desc: 'Warm & floral',      themeName: 'Ivory Garden'      },
  { label: 'Dramatic',  desc: 'Dark & luxurious',   themeName: 'Midnight Luxe'     },
  { label: 'Garden',    desc: 'Fresh & botanical',  themeName: 'Forest Romance'    },
  { label: 'Coastal',   desc: 'Breezy & minimal',   themeName: 'Coastal Breeze'    },
  { label: 'Classic',   desc: 'Crisp & timeless',   themeName: 'Minimalist Modern' },
] as const;

type QuickStyleName = (typeof QUICK_STYLES)[number]['label'];

function QuickStylesRow({
  manifest,
  onApply,
  onHover,
  onHoverEnd,
}: {
  manifest: StoryManifest;
  onApply: (skin: VibeSkin) => void;
  onHover: (skin: VibeSkin) => void;
  onHoverEnd: () => void;
}) {
  const [hovered, setHovered] = useState<QuickStyleName | null>(null);

  const handleHover = (qs: (typeof QUICK_STYLES)[number]) => {
    const preset = PRESET_THEMES.find(t => t.name === qs.themeName);
    if (!preset) return;
    setHovered(qs.label);
    onHover(preset);
  };

  const handleLeave = () => {
    setHovered(null);
    onHoverEnd();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '10px',
      padding: '12px 12px 14px',
    }}>
      {/* Editorial heading — eyebrow + italic kicker */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        borderBottom: '1px solid var(--pl-chrome-accent)',
        paddingBottom: '6px',
      }}>
        <div>
          <div style={{
            fontFamily: panelFont.mono,
            fontSize: '0.5rem',
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-accent-ink)',
            marginBottom: '2px',
          }}>
            Collection № 01
          </div>
          <div style={{
            fontFamily: panelFont.display,
            fontStyle: 'italic',
            fontSize: '0.92rem',
            color: 'var(--pl-chrome-text)',
            lineHeight: 1.1,
          }}>
            Curated Styles
          </div>
        </div>
        <div style={{
          fontFamily: panelFont.mono,
          fontSize: '0.48rem',
          letterSpacing: panelTracking.wider,
          color: 'var(--pl-chrome-text-faint)',
        }}>
          {QUICK_STYLES.length} looks
        </div>
      </div>

      {/* Horizontal specimen cards — wider, numbered, italic labels */}
      <div style={{
        display: 'flex', gap: '8px',
        overflowX: 'auto', scrollbarWidth: 'none',
        paddingBottom: '2px', marginLeft: '-2px', marginRight: '-2px',
        paddingLeft: '2px', paddingRight: '2px',
      } as React.CSSProperties}>
        {QUICK_STYLES.map((qs, i) => {
          const preset = PRESET_THEMES.find(t => t.name === qs.themeName);
          if (!preset) return null;
          const pal = preset.palette;
          const isActive = manifest.vibeSkin?.tone === preset.tone &&
            manifest.vibeSkin?.fonts?.heading === preset.fonts?.heading;
          const isHov = hovered === qs.label;
          return (
            <button
              key={qs.label}
              onMouseEnter={() => handleHover(qs)}
              onMouseLeave={handleLeave}
              onClick={() => { onApply(preset); handleLeave(); }}
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                width: '108px',
                padding: 0, cursor: 'pointer',
                borderRadius: '10px', overflow: 'hidden',
                border: isActive
                  ? '1px solid var(--pl-chrome-accent)'
                  : isHov
                    ? '1px solid var(--pl-chrome-border-strong)'
                    : '1px solid var(--pl-chrome-border)',
                background: isActive ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                boxShadow: isActive
                  ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)'
                  : isHov
                    ? '0 2px 8px rgba(0,0,0,0.06)'
                    : 'none',
                transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: isHov ? 'translateY(-1px)' : 'none',
                position: 'relative',
                textAlign: 'left',
              }}
            >
              {/* 4-stripe vertical palette bar — magazine swatch */}
              <div style={{
                display: 'flex',
                width: '100%', height: '48px',
                borderBottom: '1px solid var(--pl-chrome-border)',
                position: 'relative',
              }}>
                <div style={{ flex: 2, background: pal.background || 'var(--pl-chrome-bg)' }} />
                <div style={{ flex: 1, background: pal.card ?? pal.subtle ?? 'var(--pl-chrome-bg)' }} />
                <div style={{ flex: 1, background: pal.accent || 'var(--pl-chrome-accent)' }} />
                <div style={{ flex: 1, background: pal.foreground || 'var(--pl-chrome-text)' }} />
                {/* Number */}
                <span style={{
                  position: 'absolute', top: '5px', left: '7px',
                  fontFamily: panelFont.mono,
                  fontSize: '0.46rem',
                  letterSpacing: panelTracking.widest,
                  fontWeight: panelWeight.bold,
                  color: 'rgba(255,255,255,0.88)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                }}>
                  № {String(i + 1).padStart(2, '0')}
                </span>
                {isActive && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '7px',
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 0 0 2px var(--pl-chrome-accent), 0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                )}
              </div>
              {/* Label plate */}
              <div style={{ padding: '7px 8px 8px' }}>
                <div style={{
                  fontFamily: panelFont.display,
                  fontStyle: 'italic',
                  fontSize: '0.76rem',
                  color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                  lineHeight: 1.1,
                }}>
                  {qs.label}
                </div>
                <div style={{
                  fontFamily: panelFont.mono,
                  fontSize: '0.46rem',
                  letterSpacing: panelTracking.wider,
                  textTransform: 'uppercase',
                  color: 'var(--pl-chrome-text-faint)',
                  marginTop: '2px',
                }}>
                  {qs.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DesignPanel({ manifest, onChange, coupleNames }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; coupleNames?: [string, string] }) {
  const { state, dispatch } = useEditor();
  const [designTab, setDesignTab] = useState<'theme' | 'effects'>('theme');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [forceOpenSection, setForceOpenSection] = useState<string | null>(null);
  const [hoverSkin, setHoverSkin] = useState<VibeSkin | null>(null);

  // ── Hover preview: temporarily apply skin CSS vars to :root ──
  useEffect(() => {
    const skin = hoverSkin;
    if (!skin) return;
    const root = document.documentElement;
    const vars: Record<string, string> = {
      '--pl-cream': skin.palette.background,
      '--pl-ink': skin.palette.foreground,
      '--pl-olive': skin.palette.accent,
      '--pl-muted': skin.palette.muted,
      '--pl-cream-card': skin.palette.card ?? skin.palette.subtle ?? skin.palette.background,
      '--pl-font-heading': `"${skin.fonts.heading}", serif`,
    };
    const prev: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
      prev[k] = root.style.getPropertyValue(k);
      root.style.setProperty(k, v);
    }
    return () => {
      for (const [k, v] of Object.entries(prev)) {
        if (v) root.style.setProperty(k, v);
        else root.style.removeProperty(k);
      }
    };
  }, [hoverSkin]);

  // ── AI Design Critic state ──
  const [designFeedback, setDesignFeedback] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // ── AI Tone Adjuster state ──
  const [activeTone, setActiveTone] = useState<string | null>(null);
  const [toneLoading, setToneLoading] = useState(false);

  const handleGetDesignFeedback = async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    setDesignFeedback(null);
    setFeedbackExpanded(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Review this site's visual design critically. Check: 1) Does the heading font pair well with the body font? 2) Does the color palette have enough contrast? 3) Are the accent colors harmonious? 4) Is the overall vibe consistent? Give specific, actionable improvement suggestions. Use the 'message' action.",
          manifest,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || data.message || '';
      setDesignFeedback(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not get feedback';
      setFeedbackError(msg);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Auto-open section from contextual click + scroll-to + highlight
  useEffect(() => {
    if (state.contextSection && state.activeTab === 'design') {
      setForceOpenSection(state.contextSection);
      // Scroll the matching section into view with highlight pulse
      requestAnimationFrame(() => {
        const el = document.getElementById(`pe-panel-section-${state.contextSection}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('pe-panel-field-highlight');
          setTimeout(() => el.classList.remove('pe-panel-field-highlight'), 1600);
        }
      });
      // Clear after applying
      dispatch({ type: 'SET_CONTEXT_SECTION', section: null });
    }
  }, [state.contextSection, state.activeTab, dispatch]);

  // Scroll the `fieldFocus` target into view when it changes. Fieldfocus is
  // dispatched by EditorCanvas for structured-data-like sections (e.g.
  // navigation, theme) so the field the user clicked is brought into view
  // even when the panel scroll was far from it.
  useEffect(() => {
    if (!state.fieldFocus || state.activeTab !== 'design') return;
    const field = state.fieldFocus;
    // Run after paint so SidebarSection has a chance to expand first.
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field-focus="${field}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(raf);
  }, [state.fieldFocus, state.activeTab]);

  const handleRegenerateDesign = async () => {
    setIsRegenerating(true);
    setRegenError('');
    try {
      const res = await fetch('/api/regenerate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString,
          coupleNames: coupleNames || ['Partner', 'Partner'],
          chapters: manifest.chapters?.map(c => ({
            title: c.title, subtitle: c.subtitle,
            mood: c.mood, location: c.location,
            description: c.description,
          })),
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { vibeSkin } = await res.json();
      handleThemeApply(vibeSkin);
    } catch (e) {
      setRegenError('Try again in a moment');
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const updateFonts = (heading: string, body: string) => {
    const newFonts = { heading, body };
    onChange({
      ...manifest,
      theme: { ...manifest.theme, fonts: newFonts },
      vibeSkin: manifest.vibeSkin ? {
        ...manifest.vibeSkin,
        fonts: { ...manifest.vibeSkin.fonts, ...newFonts },
      } : manifest.vibeSkin,
    });
  };

  const handleThemeApply = (newSkin: VibeSkin) => {
    onChange({
      ...manifest,
      vibeSkin: newSkin,
      theme: {
        ...manifest.theme,
        fonts: { heading: newSkin.fonts.heading, body: newSkin.fonts.body },
        colors: {
          ...manifest.theme.colors,
          background: newSkin.palette.background,
          foreground: newSkin.palette.foreground,
          accent: newSkin.palette.accent,
          muted: newSkin.palette.muted,
        },
      },
    });
  };

  const handleToneAdjust = async (tone: string) => {
    if (toneLoading) return;
    setActiveTone(tone);
    setToneLoading(true);
    try {
      const names = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'the couple';
      const prompt = `Rewrite ALL text content on this site to match a ${tone} tone. Update the hero tagline, welcome message, closing line, RSVP intro, and all chapter descriptions. The couple's names are ${names}. Return multiple update_manifest and update_chapter actions to apply all changes at once. Be comprehensive — change every piece of text content.`;
      // Dispatch to Pear command bar for comprehensive tone rewrite
      window.dispatchEvent(new CustomEvent('pear-command', { detail: { prompt } }));
    } finally {
      // Reset after a brief delay to show the active state
      setTimeout(() => {
        setToneLoading(false);
        setActiveTone(null);
      }, 500);
    }
  };

  const colors = manifest.theme?.colors || {};
  const vibeSkin = manifest.vibeSkin;
  const paletteColors = vibeSkin?.palette
    ? Object.values(vibeSkin.palette).slice(0, 5)
    : [colors.background, colors.foreground, colors.accent, colors.accentLight, colors.muted].filter(Boolean);

  // Save-feedback indicator (flashes "Changes saved" after every manifest change)
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevManifestRef = useRef(manifest);
  useEffect(() => {
    if (prevManifestRef.current !== manifest && prevManifestRef.current !== null) {
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
    prevManifestRef.current = manifest;
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, [manifest]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '24px' }}>
      {/* Auto-save indicator — flashes briefly after each edit */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '6px 12px', margin: '0 12px 6px',
              borderRadius: '100px',
              background: 'var(--pl-chrome-bg)',
              border: '1px solid var(--pl-chrome-border)',
              fontSize: panelText.hint,
              fontWeight: panelWeight.semibold,
              fontFamily: 'inherit',
              color: 'var(--pl-chrome-text)',
              lineHeight: panelLineHeight.tight,
            }}
          >
            <Check size={10} /> Changes saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sub-tab switcher: Theme / Effects ── */}
      <div style={{
        display: 'flex', gap: '6px',
        padding: '0 8px 10px',
        borderBottom: '1px solid #E4E4E7',
        marginBottom: '8px',
      }}>
        {(['theme', 'effects'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setDesignTab(tab)}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: '8px',
              border: designTab === tab ? '1px solid #18181B' : '1px solid #E4E4E7',
              background: designTab === tab ? '#18181B' : '#FFFFFF',
              color: designTab === tab ? '#FFFFFF' : '#71717A',
              fontSize: panelText.chip,
              fontWeight: panelWeight.semibold,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
              lineHeight: panelLineHeight.tight,
            }}
          >
            {tab === 'theme' ? 'Theme' : 'Effects & Advanced'}
          </button>
        ))}
      </div>

      {/* ═══ Theme tier ═══ */}
      {designTab === 'theme' && <>
      {/* ── Quick Styles row ── */}
      <QuickStylesRow
        manifest={manifest}
        onApply={handleThemeApply}
        onHover={setHoverSkin}
        onHoverEnd={() => setHoverSkin(null)}
      />
      {/* ── AI Design Critic ── */}
      <div className="pl-panel-section" style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'var(--pl-chrome-surface)',
        border: '1px solid var(--pl-chrome-border)',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '2px',
        marginInline: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PearIcon size={18} color="#18181B" />
          <span style={{
            fontSize: panelText.itemTitle,
            fontWeight: panelWeight.bold,
            color: 'var(--pl-chrome-text)',
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.tight,
          }}>
            Want Pear to review your design?
          </span>
        </div>
        <button
          onClick={handleGetDesignFeedback}
          disabled={feedbackLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            border: 'none',
            background: feedbackLoading ? 'rgba(24,24,27,0.1)' : '#18181B',
            color: feedbackLoading ? '#3F3F46' : '#fff',
            cursor: feedbackLoading ? 'not-allowed' : 'pointer',
            fontSize: panelText.body,
            fontWeight: panelWeight.bold,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            boxShadow: feedbackLoading ? 'none' : '0 2px 8px #E4E4E7',
            width: '100%',
            lineHeight: panelLineHeight.tight,
          }}
        >
          {feedbackLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PearIcon size={12} color="#fff" />}
          {feedbackLoading ? 'Analyzing design...' : 'Get Feedback'}
        </button>
        {feedbackError && (
          <p style={{
            fontSize: panelText.hint,
            color: '#b91c1c',
            margin: 0,
            lineHeight: panelLineHeight.snug,
          }}>
            {feedbackError}
          </p>
        )}
        {designFeedback && (
          <div style={{ marginTop: '2px' }}>
            <button
              onClick={() => setFeedbackExpanded(!feedbackExpanded)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: panelText.label,
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                color: 'var(--pl-chrome-text)',
                fontFamily: 'inherit',
              }}
            >
              {feedbackExpanded ? 'Hide' : 'Show'} Feedback
            </button>
            {feedbackExpanded && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'var(--pl-chrome-bg)',
                border: '1px solid var(--pl-chrome-border)',
                fontSize: panelText.body,
                lineHeight: 1.6,
                color: 'var(--pl-chrome-text-soft)',
                whiteSpace: 'pre-wrap',
              }}>
                {designFeedback}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick AI regenerate ── */}
      <div className="pl-panel-section" style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'linear-gradient(135deg, #F4F4F5, rgba(196,169,106,0.04))',
        border: '1px solid rgba(24,24,27,0.08)',
      }}>
        {vibeSkin?.tone && (
          <span style={{
            fontSize: panelText.chip,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.wide,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-text-muted)',
            background: 'rgba(24,24,27,0.08)',
            padding: '3px 10px',
            borderRadius: '100px',
            border: '1px solid rgba(24,24,27,0.1)',
            flexShrink: 0,
            lineHeight: panelLineHeight.tight,
          }}>
            {vibeSkin.tone}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleRegenerateDesign}
          disabled={isRegenerating}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '8px',
            border: 'none',
            background: isRegenerating ? 'rgba(24,24,27,0.1)' : '#18181B',
            color: isRegenerating ? '#3F3F46' : '#fff',
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
            fontSize: panelText.body,
            fontWeight: panelWeight.bold,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            boxShadow: isRegenerating ? 'none' : '0 2px 8px #E4E4E7',
            lineHeight: panelLineHeight.tight,
          }}
        >
          {isRegenerating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <DesignIcon size={12} />}
          {isRegenerating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>
      {regenError && (
        <p style={{
          fontSize: panelText.hint,
          color: '#b91c1c',
          marginTop: '-4px',
          lineHeight: panelLineHeight.snug,
        }}>
          {regenError}
        </p>
      )}

      {/* ── Writing Style — AI tone adjuster ── */}
      <SidebarSection title="Writing Style" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            borderLeft: '1px solid var(--pl-chrome-accent)',
            paddingLeft: '10px',
          }}>
            <div style={{
              fontFamily: panelFont.mono,
              fontSize: '0.5rem',
              letterSpacing: panelTracking.widest,
              textTransform: 'uppercase',
              color: 'var(--pl-chrome-accent-ink)',
              marginBottom: '3px',
            }}>
              Pear · AI Copyedit
            </div>
            <p style={{
              fontFamily: panelFont.display,
              fontStyle: 'italic',
              fontSize: '0.82rem',
              color: 'var(--pl-chrome-text)',
              lineHeight: panelLineHeight.snug,
              margin: 0,
            }}>
              Rewrite every word to fit a voice.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {([
              { id: 'Casual',  sample: 'hey y\u2019all!', hint: 'Loose · friendly' },
              { id: 'Warm',    sample: 'with love,',      hint: 'Tender · personal' },
              { id: 'Elegant', sample: 'we invite you.',  hint: 'Refined · quiet' },
              { id: 'Formal',  sample: 'request the honour', hint: 'Classical · crisp' },
            ] as const).map((tone, i) => {
              const isActive = activeTone === tone.id;
              const loading = isActive && toneLoading;
              return (
                <button
                  key={tone.id}
                  onClick={() => handleToneAdjust(tone.id)}
                  disabled={toneLoading}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '6px',
                    padding: '12px 12px 11px',
                    borderRadius: '10px',
                    border: isActive
                      ? '1px solid var(--pl-chrome-accent)'
                      : '1px solid var(--pl-chrome-border)',
                    background: isActive ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                    boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                    cursor: toneLoading ? 'wait' : 'pointer',
                    opacity: toneLoading && !isActive ? 0.5 : 1,
                    transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                    textAlign: 'left',
                    minHeight: '72px',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '7px', right: '10px',
                    fontFamily: panelFont.mono,
                    fontSize: '0.46rem',
                    letterSpacing: panelTracking.widest,
                    fontWeight: panelWeight.bold,
                    color: isActive ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-faint)',
                  }}>
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.84rem',
                    color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    lineHeight: 1.1,
                  }}>
                    {loading ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} />
                    ) : tone.id}
                  </span>
                  <span style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.66rem',
                    color: 'var(--pl-chrome-text-muted)',
                    lineHeight: 1.2,
                    fontWeight: panelWeight.regular,
                    opacity: 0.85,
                  }}>
                    &ldquo;{tone.sample}&rdquo;
                  </span>
                  <span style={{
                    fontFamily: panelFont.mono,
                    fontSize: '0.48rem',
                    letterSpacing: panelTracking.wider,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-faint)',
                    marginTop: 'auto',
                  }}>
                    {tone.hint}
                  </span>
                </button>
              );
            })}
          </div>
          {toneLoading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--pl-chrome-accent-soft)',
              border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
            }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: 'var(--pl-chrome-accent-ink)' }} />
              <span style={{
                fontFamily: panelFont.display,
                fontStyle: 'italic',
                fontSize: '0.74rem',
                color: 'var(--pl-chrome-accent-ink)',
              }}>
                Pear is rewriting your voice…
              </span>
            </div>
          )}
        </div>
      </SidebarSection>

      {/* ── Theme — presets ── */}
      <div data-field-focus="theme">
      <SidebarSection title="Theme" defaultOpen={forceOpenSection === 'theme' || !forceOpenSection} key={forceOpenSection === 'theme' ? 'theme-open' : 'theme'}>
        <ThemeSwitcher
          currentVibeSkin={manifest.vibeSkin ?? ({} as VibeSkin)}
          manifest={manifest}
          onApply={handleThemeApply}
        />
      </SidebarSection>
      </div>

      {/* ── Page Background ── */}
      <SidebarSection title="Page Background" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Paper — swatch cards with italic name + mono hex */}
          <div>
            <label style={SUB_LABEL}>Paper</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {([
                { label: 'Theme',  value: '', hex: 'Inherit' },
                { label: 'White',  value: '#ffffff', hex: '#FFFFFF' },
                { label: 'Cream',  value: '#FAF7F2', hex: '#FAF7F2' },
                { label: 'Warm',   value: '#F5EFE6', hex: '#F5EFE6' },
                { label: 'Blush',  value: '#FDF0F3', hex: '#FDF0F3' },
                { label: 'Sage',   value: '#EEF2ED', hex: '#EEF2ED' },
                { label: 'Dark',   value: '#1a1814', hex: '#1A1814' },
                { label: 'Navy',   value: '#1a2332', hex: '#1A2332' },
              ] as const).map(bg => {
                const current = manifest.theme?.colors?.background || '';
                const isActive = bg.value ? current === bg.value : !current || current === colors.background;
                return (
                  <button
                    key={bg.label}
                    onClick={() => {
                      const newColors = { ...colors, background: bg.value || (vibeSkin?.palette?.background || '#FAF7F2') };
                      onChange({ ...manifest, theme: { ...manifest.theme, colors: newColors } });
                    }}
                    title={bg.label}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      padding: 0, overflow: 'hidden',
                      borderRadius: '8px', cursor: 'pointer',
                      border: isActive
                        ? '1px solid var(--pl-chrome-accent)'
                        : '1px solid var(--pl-chrome-border)',
                      background: 'var(--pl-chrome-surface)',
                      boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                      transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <div style={{
                      width: '100%', height: '26px',
                      background: bg.value || 'linear-gradient(135deg, #FAF7F2, #E8D5C4)',
                      borderBottom: '1px solid var(--pl-chrome-border)',
                    }} />
                    <div style={{ padding: '4px 5px 5px', textAlign: 'left' }}>
                      <div style={{
                        fontFamily: panelFont.display,
                        fontStyle: 'italic',
                        fontSize: '0.62rem',
                        color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                        lineHeight: 1.05,
                      }}>
                        {bg.label}
                      </div>
                      <div style={{
                        fontFamily: panelFont.mono,
                        fontSize: '0.42rem',
                        letterSpacing: panelTracking.wider,
                        textTransform: 'uppercase',
                        color: 'var(--pl-chrome-text-faint)',
                      }}>
                        {bg.hex}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pattern — tiled preview panels */}
          <div>
            <label style={SUB_LABEL}>Pattern</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {([
                { label: 'Plain', value: '' },
                { label: 'Dots',  value: 'radial-gradient(circle, rgba(24,24,27,0.04) 1px, transparent 1px)' },
                { label: 'Lines', value: 'repeating-linear-gradient(0deg, rgba(24,24,27,0.03) 0px, transparent 1px, transparent 40px)' },
                { label: 'Grid',  value: 'linear-gradient(rgba(24,24,27,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,0.02) 1px, transparent 1px)' },
              ] as const).map((p, i) => {
                const current = (manifest as unknown as Record<string, unknown>).backgroundPatternCss as string || '';
                const isActive = p.value === current;
                // Smaller-scale preview version
                const previewBg = p.label === 'Plain'
                  ? 'transparent'
                  : p.label === 'Dots'
                    ? 'radial-gradient(circle, rgba(24,24,27,0.18) 1px, transparent 1.5px)'
                    : p.label === 'Lines'
                      ? 'repeating-linear-gradient(0deg, rgba(24,24,27,0.18) 0px, transparent 1px, transparent 6px)'
                      : 'linear-gradient(rgba(24,24,27,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,0.18) 1px, transparent 1px)';
                const previewSize = p.label === 'Dots' ? '8px 8px' : p.label === 'Grid' ? '8px 8px' : 'auto';
                return (
                  <button
                    key={p.label}
                    onClick={() => onChange({ ...manifest, backgroundPatternCss: p.value } as StoryManifest)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      padding: 0, overflow: 'hidden',
                      borderRadius: '8px', cursor: 'pointer',
                      border: isActive
                        ? '1px solid var(--pl-chrome-accent)'
                        : '1px solid var(--pl-chrome-border)',
                      background: 'var(--pl-chrome-surface)',
                      boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                      transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '4px', left: '6px',
                      fontFamily: panelFont.mono,
                      fontSize: '0.42rem',
                      letterSpacing: panelTracking.widest,
                      color: isActive ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-faint)',
                      zIndex: 2,
                    }}>
                      № 0{i + 1}
                    </span>
                    <div style={{
                      width: '100%', height: '30px',
                      background: previewBg,
                      backgroundSize: previewSize,
                      borderBottom: '1px solid var(--pl-chrome-border)',
                    }} />
                    <div style={{
                      padding: '4px 5px 5px',
                      fontFamily: panelFont.display,
                      fontStyle: 'italic',
                      fontSize: '0.64rem',
                      color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                      textAlign: 'center',
                      lineHeight: 1.05,
                    }}>
                      {p.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SidebarSection>

      {/* ── Colors — tweak individual colors ── */}
      <SidebarSection title="Colors" defaultOpen>
        <ColorPalettePanel manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Wedding Palettes — curated presets ── */}
      <SidebarSection title="Wedding Palettes" defaultOpen={false}>
        <div style={{
          borderLeft: '1px solid var(--pl-chrome-accent)',
          paddingLeft: '10px',
          marginBottom: '12px',
        }}>
          <div style={{
            fontFamily: panelFont.mono,
            fontSize: '0.5rem',
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-accent-ink)',
            marginBottom: '3px',
          }}>
            Series · Curated
          </div>
          <p style={{
            fontFamily: panelFont.display,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--pl-chrome-text)',
            lineHeight: panelLineHeight.snug,
            margin: 0,
          }}>
            Eight palettes composed for weddings.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {([
            { name: 'Blush & Sage',       colors: ['#D4A0A0', '#71717A', '#FAF7F2', '#3D3530', '#F5F1E8'], kicker: 'warm · soft' },
            { name: 'Navy & Gold',        colors: ['#2C3E6B', '#C4A96A', '#FAF7F2', '#1C1C1C', '#F5F1E8'], kicker: 'formal · jewel' },
            { name: 'Terracotta & Cream', colors: ['#C67B5C', '#E8B89D', '#FFF8F2', '#3D2E24', '#F5ECE4'], kicker: 'earthy · sun' },
            { name: 'Lavender Dream',     colors: ['#9B8EC1', '#D4A0C4', '#F8F5FD', '#2D2640', '#F0ECF8'], kicker: 'dreamy · soft' },
            { name: 'Coastal Blue',       colors: ['#5B9BD5', '#B8D4E8', '#F0F7FF', '#1E4D8C', '#E8F0F8'], kicker: 'seaside · airy' },
            { name: 'Emerald & Ivory',    colors: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24', '#E2F0E8'], kicker: 'garden · rich' },
            { name: 'Sunset Glow',        colors: ['#E8785E', '#F0B860', '#FFF8F0', '#3D2420', '#FFF0E8'], kicker: 'radiant · warm' },
            { name: 'Classic B&W',        colors: ['#333333', '#888888', '#FFFFFF', '#111111', '#F5F5F5'], kicker: 'timeless · crisp' },
          ] as const).map((preset, i) => {
            const [accent, accent2, bg, ink] = preset.colors;
            const current = manifest.vibeSkin?.palette;
            const isActive = current?.accent === accent && current?.background === bg;
            return (
              <button
                key={preset.name}
                onClick={() => {
                  const [acc, acc2, background, inkC, subtle] = preset.colors;
                  const newPalette = {
                    ...(manifest.vibeSkin?.palette || {}),
                    accent: acc, accent2: acc2, background,
                    foreground: inkC, ink: inkC,
                    subtle, card: subtle,
                    muted: acc2, highlight: acc,
                  };
                  const newSkin = { ...(manifest.vibeSkin || {} as VibeSkin), palette: newPalette as VibeSkin['palette'] };
                  handleThemeApply(newSkin);
                }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: 0, overflow: 'hidden',
                  borderRadius: '10px', cursor: 'pointer',
                  border: isActive
                    ? '1px solid var(--pl-chrome-accent)'
                    : '1px solid var(--pl-chrome-border)',
                  background: 'var(--pl-chrome-surface)',
                  boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                  transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                {/* Horizontal stripe swatch */}
                <div style={{
                  display: 'flex', height: '36px',
                  borderBottom: '1px solid var(--pl-chrome-border)',
                  position: 'relative',
                }}>
                  {preset.colors.map((c, idx) => (
                    <div key={idx} style={{ flex: idx === 2 ? 2 : 1, background: c }} />
                  ))}
                  <span style={{
                    position: 'absolute', top: '4px', left: '6px',
                    fontFamily: panelFont.mono,
                    fontSize: '0.44rem',
                    letterSpacing: panelTracking.widest,
                    fontWeight: panelWeight.bold,
                    color: 'rgba(255,255,255,0.9)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}>
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: '6px', right: '7px',
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 0 0 2px var(--pl-chrome-accent), 0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  )}
                </div>
                {/* Name plate */}
                <div style={{ padding: '7px 9px 8px' }}>
                  <div style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.74rem',
                    color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    lineHeight: 1.1,
                  }}>
                    {preset.name}
                  </div>
                  <div style={{
                    fontFamily: panelFont.mono,
                    fontSize: '0.46rem',
                    letterSpacing: panelTracking.wider,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-faint)',
                    marginTop: '2px',
                  }}>
                    {preset.kicker}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      </>}

      {/* ═══ Effects & Advanced tier ═══ */}
      {designTab === 'effects' && <>
      {/* FIX #6: Visual Effects collapsed by default — panel was too long */}
      <SidebarSection title="Visual Effects" defaultOpen={false}>
        <VisualEffectsPanel
          effects={manifest.theme?.effects ?? {}}
          accentColor={manifest.theme?.colors?.accent}
          onChange={(effects: NonNullable<ThemeSchema['effects']>) => {
            onChange({
              ...manifest,
              theme: { ...manifest.theme, effects },
            });
          }}
        />
      </SidebarSection>

      {/* Typography — full font pair picker */}
      <SidebarSection title="Typography" defaultOpen>
        <FontPicker
          currentHeading={manifest.theme?.fonts?.heading || 'Playfair Display'}
          currentBody={manifest.theme?.fonts?.body || 'Inter'}
          onChange={(heading, body) => updateFonts(heading, body)}
        />
      </SidebarSection>

      {/* AI Art Manager — hero, ambient, art strip */}
      <SidebarSection title="AI Art" defaultOpen={false}>
        {manifest.vibeSkin ? (
          <ArtManager
            manifest={manifest}
            coupleNames={coupleNames}
            onUpdate={(updates) => onChange({ ...manifest, ...updates })}
          />
        ) : (
          <div style={{
            padding: '24px 20px 22px',
            textAlign: 'center',
            borderRadius: '12px',
            background: 'linear-gradient(145deg, var(--pl-chrome-accent-soft) 0%, var(--pl-chrome-surface) 80%)',
            border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 45%, transparent)',
          }}>
            {/* Sparkle glyph cluster */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              width: '36px', height: '36px',
              marginBottom: '10px',
            }}>
              <span style={{
                position: 'absolute',
                fontFamily: panelFont.display,
                fontStyle: 'italic',
                fontSize: '1.8rem',
                color: 'var(--pl-chrome-accent)',
                lineHeight: 1,
                top: '-3px', left: '3px',
              }}>✦</span>
              <span style={{
                position: 'absolute',
                fontSize: '0.7rem',
                color: 'color-mix(in srgb, var(--pl-chrome-accent) 65%, transparent)',
                bottom: '0px', right: '3px',
              }}>✦</span>
            </div>
            <div style={{
              fontFamily: panelFont.mono,
              fontSize: '0.5rem',
              letterSpacing: panelTracking.widest,
              textTransform: 'uppercase',
              color: 'var(--pl-chrome-accent-ink)',
              marginBottom: '6px',
            }}>
              Plate · Awaiting
            </div>
            <div style={{
              fontFamily: panelFont.display,
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'var(--pl-chrome-text)',
              lineHeight: 1.15,
              marginBottom: '4px',
            }}>
              No art generated yet.
            </div>
            <div style={{
              fontFamily: panelFont.body,
              fontSize: '0.66rem',
              color: 'var(--pl-chrome-text-muted)',
              marginBottom: '14px',
              maxWidth: '220px', marginLeft: 'auto', marginRight: 'auto',
              lineHeight: 1.45,
            }}>
              Let Pear compose hero, ambient, and accent art from your vibe.
            </div>
            <button
              onClick={handleRegenerateDesign}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px 8px 14px',
                borderRadius: '100px',
                background: 'var(--pl-chrome-text)',
                color: 'var(--pl-chrome-surface)',
                border: '1px solid var(--pl-chrome-text)',
                cursor: 'pointer',
                fontFamily: panelFont.mono,
                fontSize: '0.56rem',
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.widest,
                textTransform: 'uppercase',
                lineHeight: 1,
                transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <span style={{ fontSize: '0.7rem' }}>✦</span>
              Generate
            </button>
          </div>
        )}
      </SidebarSection>

      {/* ── Navigation — logo + nav style ── */}
      <div data-field-focus="navigation">
      <SidebarSection title="Navigation" defaultOpen={forceOpenSection === 'navigation' || !forceOpenSection} key={forceOpenSection === 'navigation' ? 'nav-open' : 'nav'}>
        <NavCustomizationPanel manifest={manifest} onChange={onChange} />
      </SidebarSection>
      </div>

      {/* ── Chapter Date Format — applies to chapter date labels ── */}
      {/* Story-layout selection moved to the inline InlineStoryLayoutSwitcher. */}
      <SidebarSection title="Chapter Date Format" defaultOpen={false}>
        <div style={{
          borderLeft: '1px solid var(--pl-chrome-accent)',
          paddingLeft: '10px',
          marginBottom: '12px',
        }}>
          <div style={{
            fontFamily: panelFont.mono,
            fontSize: '0.5rem',
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-accent-ink)',
            marginBottom: '3px',
          }}>
            Typesetter · Date
          </div>
          <p style={{
            fontFamily: panelFont.display,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--pl-chrome-text)',
            lineHeight: panelLineHeight.snug,
            margin: 0,
          }}>
            How dates read on every chapter.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(Object.keys(CHAPTER_DATE_FORMATS) as ChapterDateFormatKey[]).map((key, i) => {
            const preset = CHAPTER_DATE_FORMATS[key];
            const isActive = (manifest.dateFormat || 'long') === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...manifest, dateFormat: key })}
                aria-pressed={isActive}
                style={{
                  width: '100%',
                  padding: '11px 14px 10px',
                  borderRadius: '10px',
                  border: isActive
                    ? '1px solid var(--pl-chrome-accent)'
                    : '1px solid var(--pl-chrome-border)',
                  background: isActive ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                  boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'baseline',
                  gap: '12px',
                  transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                  position: 'relative',
                }}
              >
                <span style={{
                  fontFamily: panelFont.mono,
                  fontSize: '0.46rem',
                  letterSpacing: panelTracking.widest,
                  fontWeight: panelWeight.bold,
                  color: isActive ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-faint)',
                }}>
                  № {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{
                  fontFamily: panelFont.display,
                  fontStyle: 'italic',
                  fontSize: '0.78rem',
                  color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                  lineHeight: 1.1,
                }}>
                  {preset.label}
                </span>
                <span style={{
                  fontFamily: panelFont.mono,
                  fontSize: '0.58rem',
                  letterSpacing: '0.02em',
                  color: 'var(--pl-chrome-text-muted)',
                  padding: '3px 7px',
                  borderRadius: '4px',
                  background: 'var(--pl-chrome-bg)',
                  border: '1px solid var(--pl-chrome-border)',
                  whiteSpace: 'nowrap',
                }}>
                  {preset.example}
                </span>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* ── Corner Decorations — swappable presets ── */}
      <SidebarSection title="Corner Decorations" defaultOpen={false}>
        <CornerDecorationPicker manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Quick Design Presets ── */}
      <SidebarSection title="Quick Style Presets" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {DESIGN_PRESETS.map((preset, i) => {
            const current = manifest.vibeSkin;
            const isActive = current?.tone === preset.tone &&
              current?.fonts?.heading === preset.fonts?.heading;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  const newSkin: VibeSkin = {
                    ...(manifest.vibeSkin || {} as VibeSkin),
                    palette: preset.palette,
                    fonts: preset.fonts,
                    cardStyle: preset.cardStyle as VibeSkin['cardStyle'],
                    texture: preset.texture as VibeSkin['texture'],
                    headingStyle: preset.headingStyle as VibeSkin['headingStyle'],
                    sectionEntrance: preset.sectionEntrance as VibeSkin['sectionEntrance'],
                    particle: preset.particle as VibeSkin['particle'],
                    tone: preset.tone as VibeSkin['tone'],
                  };
                  handleThemeApply(newSkin);
                }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: 0, overflow: 'hidden',
                  borderRadius: '10px', cursor: 'pointer',
                  border: isActive
                    ? '1px solid var(--pl-chrome-accent)'
                    : '1px solid var(--pl-chrome-border)',
                  background: 'var(--pl-chrome-surface)',
                  boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                  transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                {/* Miniature specimen — bg + fg + accent as a layered card */}
                <div style={{
                  height: '64px', position: 'relative',
                  background: preset.preview.bg,
                  borderBottom: '1px solid var(--pl-chrome-border)',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    position: 'absolute', top: '6px', left: '8px',
                    fontFamily: panelFont.mono,
                    fontSize: '0.44rem',
                    letterSpacing: panelTracking.widest,
                    fontWeight: panelWeight.bold,
                    color: preset.preview.fg,
                    opacity: 0.7,
                  }}>
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: '7px', right: '8px',
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: preset.preview.accent,
                      boxShadow: `0 0 0 2px ${preset.preview.bg}, 0 0 0 3px ${preset.preview.accent}`,
                    }} />
                  )}
                  {/* Display-font showing */}
                  <div style={{
                    position: 'absolute', bottom: '8px', left: '10px', right: '10px',
                    fontFamily: `"${preset.fonts?.heading || 'Fraunces'}", serif`,
                    fontStyle: 'italic',
                    fontSize: '1.15rem',
                    color: preset.preview.fg,
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}>
                    Aa
                  </div>
                  {/* Accent bar */}
                  <div style={{
                    position: 'absolute', bottom: '6px', right: '10px',
                    width: '20px', height: '3px',
                    background: preset.preview.accent,
                    borderRadius: '1px',
                  }} />
                </div>
                {/* Label plate */}
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.76rem',
                    color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    lineHeight: 1.1,
                  }}>
                    {preset.name}
                  </div>
                  <div style={{
                    fontFamily: panelFont.mono,
                    fontSize: '0.46rem',
                    letterSpacing: panelTracking.wider,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-faint)',
                    marginTop: '3px',
                  }}>
                    {preset.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* ── Dark Mode Preview ── */}
      <SidebarSection title="Dark Mode Preview" defaultOpen={false}>
        <button
          onClick={() => {
            if (!manifest.vibeSkin) return;
            const darkPalette = invertPalette(manifest.vibeSkin.palette);
            const darkSkin: VibeSkin = { ...manifest.vibeSkin, palette: darkPalette };
            handleThemeApply(darkSkin);
          }}
          style={{
            width: '100%',
            padding: 0, overflow: 'hidden',
            borderRadius: '12px',
            border: '1px solid rgba(196,169,106,0.4)',
            background: 'linear-gradient(135deg, #0f0e14 0%, #1a1520 55%, #252030 100%)',
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
        >
          <div style={{ padding: '16px 16px 18px', position: 'relative' }}>
            {/* decorative mini-moons */}
            <div style={{
              position: 'absolute', top: '14px', right: '18px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #F0E8D8 0%, #d4c899 60%, #9b8f66 100%)',
              boxShadow: '0 0 20px rgba(240,232,216,0.25), inset -4px -4px 8px rgba(0,0,0,0.35)',
            }} />
            <div style={{ position: 'absolute', top: '24px', right: '52px', width: '2px', height: '2px', borderRadius: '50%', background: '#F0E8D8', opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: '18px', right: '70px', width: '1.5px', height: '1.5px', borderRadius: '50%', background: '#F0E8D8', opacity: 0.5 }} />
            <div style={{ position: 'absolute', top: '36px', right: '62px', width: '1px', height: '1px', borderRadius: '50%', background: '#F0E8D8', opacity: 0.4 }} />

            <div style={{
              fontFamily: panelFont.mono,
              fontSize: '0.5rem',
              letterSpacing: panelTracking.widest,
              textTransform: 'uppercase',
              color: '#C4A96A',
              marginBottom: '6px',
            }}>
              Nocturne · Invert
            </div>
            <div style={{
              fontFamily: panelFont.display,
              fontStyle: 'italic',
              fontSize: '1.05rem',
              color: '#F0E8D8',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}>
              Flip to midnight
            </div>
            <div style={{
              fontFamily: panelFont.body,
              fontSize: '0.66rem',
              color: 'rgba(240,232,216,0.65)',
              marginTop: '6px',
              lineHeight: 1.4,
              maxWidth: '72%',
            }}>
              Invert the palette for evening events — dark paper, luminous accents.
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginTop: '12px',
              padding: '5px 10px',
              borderRadius: '100px',
              background: 'rgba(196,169,106,0.15)',
              border: '1px solid rgba(196,169,106,0.4)',
              fontFamily: panelFont.mono,
              fontSize: '0.52rem',
              letterSpacing: panelTracking.wider,
              textTransform: 'uppercase',
              color: '#C4A96A',
            }}>
              Apply <span style={{ color: '#F0E8D8' }}>→</span>
            </div>
          </div>
        </button>
      </SidebarSection>

      {/* ── Typographic Scale ── */}
      <SidebarSection title="Type Scale" defaultOpen={false}>
        <div style={{
          borderLeft: '1px solid var(--pl-chrome-accent)',
          paddingLeft: '10px',
          marginBottom: '12px',
        }}>
          <div style={{
            fontFamily: panelFont.mono,
            fontSize: '0.5rem',
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-accent-ink)',
            marginBottom: '3px',
          }}>
            Typographic · Ratio
          </div>
          <p style={{
            fontFamily: panelFont.display,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--pl-chrome-text)',
            lineHeight: panelLineHeight.snug,
            margin: 0,
          }}>
            The math behind size hierarchy.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {(['minor-third', 'major-third', 'perfect-fourth', 'golden-ratio'] as TypeScale[]).map((scale, i) => {
            const h = generateTypeHierarchy(16, scale);
            const isActive = manifest.theme?.typeScale === scale;
            return (
              <button
                key={scale}
                onClick={() => {
                  onChange({
                    ...manifest,
                    theme: { ...manifest.theme, typeScale: scale, typeSizes: h.sizes },
                  });
                }}
                style={{
                  position: 'relative',
                  padding: 0, overflow: 'hidden',
                  borderRadius: '10px',
                  border: isActive
                    ? '1px solid var(--pl-chrome-accent)'
                    : '1px solid var(--pl-chrome-border)',
                  background: isActive ? 'var(--pl-chrome-accent-soft)' : 'var(--pl-chrome-surface)',
                  boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--pl-chrome-accent) 14%, transparent)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {/* Ratio specimen visualization */}
                <div style={{
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px',
                  padding: '14px 10px 10px', height: '52px',
                  borderBottom: '1px solid var(--pl-chrome-border)',
                  background: isActive
                    ? 'color-mix(in srgb, var(--pl-chrome-surface) 65%, var(--pl-chrome-accent-soft))'
                    : 'var(--pl-chrome-bg)',
                }}>
                  {[1, h.ratio, h.ratio * h.ratio].map((mul, idx) => (
                    <div key={idx} style={{
                      width: '5px',
                      height: `${Math.min(32, 10 * mul)}px`,
                      background: isActive ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-text-muted)',
                      borderRadius: '1px',
                    }} />
                  ))}
                </div>
                <span style={{
                  position: 'absolute', top: '5px', left: '8px',
                  fontFamily: panelFont.mono,
                  fontSize: '0.44rem',
                  letterSpacing: panelTracking.widest,
                  fontWeight: panelWeight.bold,
                  color: isActive ? 'var(--pl-chrome-accent-ink)' : 'var(--pl-chrome-text-faint)',
                }}>
                  № {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ padding: '7px 10px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: '0.72rem',
                    color: isActive ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
                    lineHeight: 1.1,
                    textTransform: 'capitalize',
                  }}>
                    {scale.replace('-', ' ')}
                  </div>
                  <div style={{
                    fontFamily: panelFont.mono,
                    fontSize: '0.52rem',
                    letterSpacing: '0.02em',
                    color: 'var(--pl-chrome-text-muted)',
                  }}>
                    {h.ratio.toFixed(3)}:1
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* Accessibility — promoted to its own first-class section so issues
          surface immediately without needing to expand a "Design Health" group. */}
      <SidebarSection title="Accessibility" defaultOpen={true}>
        <AccessibilityAuditPanel manifest={manifest} />
      </SidebarSection>

      {/* Design Health — color/typography advisors */}
      <SidebarSection title="Design Health" defaultOpen={false}>
        <DesignAdvisor manifest={manifest} />
      </SidebarSection>

      {/* Asset Library */}
      <SidebarSection title="Asset Library" defaultOpen={false}>
        <p style={{ fontSize: '0.8rem', color: 'var(--pl-chrome-text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
          Dividers, illustrations & accents to add to your pages.
        </p>
        <AssetPicker
          onSelect={(asset) => {
            // Store last-selected asset on manifest for canvas insertion
            onChange({ ...manifest, lastAsset: asset as StoryManifest['lastAsset'] });
          }}
          onAddSticker={(asset) => {
            const newSticker: import('@/types').StickerItem = {
              id: makeId('sticker'),
              name: asset.name,
              type: asset.type as 'illustrations' | 'accents' | 'dividers',
              x: 20 + Math.random() * 60,
              y: 20 + Math.random() * 60,
              size: 80,
              rotation: (Math.random() * 30) - 15,
              opacity: 0.85,
            };
            onChange({
              ...manifest,
              stickers: [...(manifest.stickers || []), newSticker],
            });
          }}
        />

        {/* Active stickers list with controls */}
        {(manifest.stickers?.length ?? 0) > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-chrome-text-muted)', marginBottom: '8px' }}>
              Active ({manifest.stickers!.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {manifest.stickers!.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: 'var(--pl-chrome-bg)', border: '1px solid var(--pl-chrome-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-ink-soft, #3D3530)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-muted, #7A756E)' }}>
                    Size
                    <RangeSlider min={30} max={200} value={s.size} onChange={v => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, size: v };
                      onChange({ ...manifest, stickers: updated });
                    }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-chrome-text-muted)' }}>
                    Op.
                    <RangeSlider min={10} max={100} value={Math.round(s.opacity * 100)} onChange={v => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, opacity: v / 100 };
                      onChange({ ...manifest, stickers: updated });
                    }} />
                  </label>
                  <button onClick={() => onChange({ ...manifest, stickers: manifest.stickers!.filter((_, j) => j !== i) })} style={{ all: 'unset', cursor: 'pointer', color: 'var(--pl-chrome-text-muted)', display: 'flex', padding: '2px' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SidebarSection>

      </>}

      {/* Live preview — compact, no extra nesting */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid var(--pl-chrome-border)', background: 'var(--pl-chrome-surface)' }}>
        <div style={{ background: colors.background || '#faf9f6', padding: '14px' }}>
          <div style={{ fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`, fontSize: '1rem', fontWeight: 700, color: colors.foreground || 'var(--pl-ink, #3F3F46)', marginBottom: '3px' }}>
            {manifest.chapters?.[0]?.title || 'Preview'}
          </div>
          <div style={{ color: colors.muted || '#8c8c8c', fontSize: '0.65rem', marginBottom: '8px' }}>The beginning of everything.</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ background: colors.accent || '#71717A', color: '#fff', padding: '3px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700 }}>RSVP</div>
            <div style={{ background: colors.accentLight || '#f3e8d8', color: colors.accent || '#71717A', padding: '3px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 600 }}>View Story</div>
          </div>
        </div>
        <div style={{ height: '3px', background: colors.accent || '#71717A' }} />
      </div>
    </div>
  );
}
