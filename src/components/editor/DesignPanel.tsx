'use client';

import React, { useState, useEffect } from 'react';
import { useEditor } from '@/lib/editor-state';
import { RangeSlider } from '@/components/ui/range-slider';
import { Loader2 } from 'lucide-react';
import { lbl } from './editor-utils';
import { ColorPalettePanel } from './ColorPalettePanel';
import { ThemeSwitcher } from './ThemeSwitcher';
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
  StoryLayoutPicker,
  resolveStoryLayout,
  CHAPTER_DATE_FORMATS,
  type StoryLayoutType,
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
      <div style={{ height: '100%', background: 'linear-gradient(135deg, rgba(163,177,138,0.15), rgba(196,169,106,0.1))', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.6 }} />
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
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.4 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'solid', label: 'Solid', desc: 'Opaque bar with shadow',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'white', boxShadow: '0 1px 3px rgba(43,30,20,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
            <div style={{ width: '12px', height: '2px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.5 }} />
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
          <div style={{ width: '16px', height: '2.5px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.5 }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '1.5px', background: 'var(--pl-muted)', borderRadius: '1px', opacity: 0.5 }} />)}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'floating', label: 'Floating', desc: 'Pill-shaped, detached from edge',
    preview: (
      <div style={{ height: '100%', background: 'var(--pl-cream)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '3px', left: '15%', right: '15%', height: '8px', background: 'rgba(255,255,255,0.9)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 1px 4px rgba(43,30,20,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--pl-olive)' }} />
            <div style={{ width: '10px', height: '1.5px', background: 'var(--pl-ink)', borderRadius: '1px', opacity: 0.4 }} />
          </div>
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
];

// ── Nav Customization Panel ───────────────────────────────────
function NavCustomizationPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const currentLogo = manifest.logoIcon || 'pear';
  const currentNavStyle = manifest.navStyle || 'glass';
  const accent = manifest.vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Page layout mode */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
          Site Layout
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {([
            { id: 'multi-page', label: 'Separate Pages', desc: 'Each section is its own page' },
            { id: 'single-scroll', label: 'Single Scroll', desc: 'Everything on one long page' },
          ] as const).map(mode => {
            const isActive = (manifest.pageMode || 'multi-page') === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onChange({ ...manifest, pageMode: mode.id })}
                style={{
                  padding: '10px 8px', borderRadius: '8px', textAlign: 'center',
                  border: isActive ? '2px solid #18181B' : '1px solid #E4E4E7',
                  background: isActive ? 'rgba(24,24,27,0.04)' : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isActive ? '#18181B' : '#3F3F46' }}>{mode.label}</div>
                <div style={{ fontSize: '0.58rem', color: '#71717A', marginTop: '2px' }}>{mode.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: '0.55rem', color: 'var(--pl-muted)', marginTop: '6px', lineHeight: 1.4 }}>
          {(manifest.pageMode || 'multi-page') === 'multi-page'
            ? 'Guests navigate between pages like a real website. Best for sites with lots of content.'
            : 'All content on one page that guests scroll through. Great for minimal sites.'}
        </div>
      </div>

      {/* Logo icon picker */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
          Site Logo Icon
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {LOGO_ICONS.map(({ id, label, Icon }) => {
            const isActive = currentLogo === id && !manifest.logoSvg;
            return (
              <button
                key={id}
                onClick={() => onChange({ ...manifest, logoIcon: id, logoSvg: undefined })}
                title={label}
                style={{
                  aspectRatio: '1',
                  borderRadius: '10px',
                  border: isActive ? '2px solid #18181B' : '1px solid #E4E4E7',
                  background: isActive ? 'rgba(24,24,27,0.05)' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <Icon size={18} color={isActive ? accent : 'var(--pl-muted)'} />
              </button>
            );
          })}
        </div>
        {manifest.logoSvg && (
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--pl-olive)', fontStyle: 'italic' }}>
              ✦ Using AI-generated logo
            </span>
            <button
              onClick={() => onChange({ ...manifest, logoSvg: undefined })}
              style={{
                fontSize: '0.55rem', color: 'var(--pl-muted)', background: 'rgba(255,255,255,0.2)',
                border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer',
              }}
            >
              Use icon instead
            </button>
          </div>
        )}
      </div>

      {/* Desktop nav bar style */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
          Desktop Nav Style
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {NAV_STYLES.map(style => {
            const isActive = currentNavStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onChange({ ...manifest, navStyle: style.id as StoryManifest['navStyle'] })}
                style={{
                  display: 'flex', flexDirection: 'column',
                  borderRadius: '8px', overflow: 'hidden',
                  border: isActive ? '2px solid #18181B' : '1px solid #E4E4E7',
                  background: isActive ? 'rgba(24,24,27,0.04)' : '#FFFFFF',
                  cursor: 'pointer', padding: 0,
                  boxShadow: isActive ? '0 2px 6px rgba(24,24,27,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ height: '28px', overflow: 'hidden' }}>
                  {style.preview}
                </div>
                <div style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{
                    fontSize: '0.58rem', fontWeight: 600,
                    color: isActive ? '#18181B' : '#71717A',
                  }}>
                    {style.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile nav style */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
          Mobile Nav Style
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {MOBILE_NAV_STYLES.map(style => {
            const isActive = (manifest.mobileNavStyle || 'classic') === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onChange({ ...manifest, mobileNavStyle: style.id as StoryManifest['mobileNavStyle'] })}
                style={{
                  display: 'flex', flexDirection: 'column',
                  borderRadius: '8px',
                  border: isActive ? '2px solid #18181B' : '1px solid #E4E4E7',
                  background: isActive ? 'rgba(24,24,27,0.04)' : '#FFFFFF',
                  cursor: 'pointer', padding: '8px 6px',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '0.6rem', fontWeight: 600,
                  color: isActive ? '#18181B' : '#3F3F46',
                }}>
                  {style.label}
                </div>
                <div style={{
                  fontSize: '0.55rem', color: '#71717A', marginTop: '2px', lineHeight: 1.3,
                }}>
                  {style.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav opacity */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
          Nav Opacity — {manifest.navOpacity ?? 100}%
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={manifest.navOpacity ?? 100}
          onChange={e => onChange({ ...manifest, navOpacity: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--pl-olive)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--pl-muted)', marginTop: '2px' }}>
          <span>Transparent</span><span>Full</span>
        </div>
      </div>

      {/* Nav background color */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
          Nav Background
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: 'Auto', value: '' },
            { label: 'White', value: 'rgba(255,255,255,0.9)' },
            { label: 'Cream', value: 'rgba(245,241,232,0.92)' },
            { label: 'Dark', value: 'rgba(28,28,28,0.85)' },
            { label: 'Black', value: 'rgba(0,0,0,0.7)' },
            { label: 'Accent', value: accent },
          ].map(opt => {
            const isActive = (manifest.navBackground || '') === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => onChange({ ...manifest, navBackground: opt.value || undefined })}
                style={{
                  padding: '5px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 600,
                  border: isActive ? '2px solid #18181B' : '1px solid #E4E4E7',
                  background: isActive ? 'rgba(24,24,27,0.05)' : '#FFFFFF',
                  color: isActive ? '#18181B' : '#71717A',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {opt.value && opt.label !== 'Auto' && (
                  <span style={{
                    display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                    background: opt.value, border: '1px solid rgba(0,0,0,0.1)',
                    marginRight: '4px', verticalAlign: 'middle',
                  }} />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Corner Decoration Picker ──────────────────────────────────
function CornerDecorationPicker({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const accent = manifest.vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', lineHeight: 1.5, margin: 0 }}>
        Decorative corners for the hero and footer — personalized to your style.
      </p>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '3px 10px', borderRadius: '100px', border: 'none',
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
              background: filter === cat ? 'var(--pl-olive)' : 'rgba(255,255,255,0.2)',
              color: filter === cat ? 'white' : 'var(--pl-muted)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {filtered.map(preset => {
          const active = isActive(preset);
          const previewSvg = preset.svg ? renderCornerSvg(preset, accent) : '';
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              title={preset.label}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '10px',
                border: active ? '2px solid #18181B' : '1px solid #E4E4E7',
                background: active ? 'rgba(24,24,27,0.04)' : '#FFFFFF',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.15s',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {previewSvg ? (
                <div
                  style={{ width: '80%', height: '80%' }}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <span style={{ fontSize: '0.6rem', color: 'var(--pl-muted)', fontWeight: 600 }}>None</span>
              )}
              {active && (
                <div style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'var(--pl-olive)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={9} color="white" strokeWidth={3} />
                </div>
              )}
              <span style={{
                position: 'absolute', bottom: '3px', left: 0, right: 0,
                fontSize: '0.5rem', fontWeight: 700, color: 'var(--pl-muted)',
                textAlign: 'center', letterSpacing: '0.03em',
              }}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {currentSvg && (
        <p style={{ fontSize: '0.6rem', color: 'var(--pl-olive)', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
          ✦ AI-generated corners will be replaced when you pick a preset
        </p>
      )}
    </div>
  );
}

export function DesignPanel({ manifest, onChange, coupleNames }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; coupleNames?: [string, string] }) {
  const { state, dispatch } = useEditor();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [forceOpenSection, setForceOpenSection] = useState<string | null>(null);

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

  // Auto-open section from contextual click
  useEffect(() => {
    if (state.contextSection && state.activeTab === 'design') {
      setForceOpenSection(state.contextSection);
      // Clear after applying
      dispatch({ type: 'SET_CONTEXT_SECTION', section: null });
    }
  }, [state.contextSection, state.activeTab, dispatch]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '24px' }}>

      {/* ── AI Design Critic ── */}
      <div className="pl-panel-section" style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '2px',
        marginInline: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PearIcon size={18} color="var(--pl-olive, #A3B18A)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-heading)', fontStyle: 'italic' }}>
            Want Pear to review your design?
          </span>
        </div>
        <button
          onClick={handleGetDesignFeedback}
          disabled={feedbackLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '100px',
            border: 'none',
            background: feedbackLoading ? 'rgba(163,177,138,0.2)' : 'rgba(163,177,138,0.9)',
            color: feedbackLoading ? 'var(--pl-ink-soft)' : '#fff',
            cursor: feedbackLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.15s',
            boxShadow: feedbackLoading ? 'none' : '0 2px 8px rgba(163,177,138,0.3)',
            width: '100%',
          }}
        >
          {feedbackLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PearIcon size={12} color="#fff" />}
          {feedbackLoading ? 'Analyzing design...' : 'Get Feedback'}
        </button>
        {feedbackError && (
          <p style={{ fontSize: '0.72rem', color: '#e87a7a', margin: 0 }}>{feedbackError}</p>
        )}
        {designFeedback && (
          <div style={{ marginTop: '2px' }}>
            <button
              onClick={() => setFeedbackExpanded(!feedbackExpanded)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--pl-olive, #A3B18A)',
              }}
            >
              {feedbackExpanded ? 'Hide' : 'Show'} Feedback
            </button>
            {feedbackExpanded && (
              <div style={{
                marginTop: '6px', padding: '10px 12px', borderRadius: '10px',
                background: 'rgba(163,177,138,0.06)', border: '1px solid rgba(163,177,138,0.12)',
                fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--pl-ink-soft, #3D3530)',
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
        background: 'linear-gradient(135deg, rgba(163,177,138,0.06), rgba(196,169,106,0.04))',
        border: '1px solid rgba(163,177,138,0.15)',
      }}>
        {vibeSkin?.tone && (
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#A3B18A',
            background: 'rgba(163,177,138,0.15)', padding: '3px 10px', borderRadius: '100px',
            border: '1px solid rgba(163,177,138,0.2)', flexShrink: 0,
          }}>
            {vibeSkin.tone}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleRegenerateDesign}
          disabled={isRegenerating}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 12px', borderRadius: '100px',
            border: 'none',
            background: isRegenerating ? 'rgba(163,177,138,0.2)' : 'rgba(163,177,138,0.9)',
            color: isRegenerating ? 'var(--pl-ink-soft)' : '#fff',
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s',
            boxShadow: isRegenerating ? 'none' : '0 2px 8px rgba(163,177,138,0.3)',
          }}
        >
          {isRegenerating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <DesignIcon size={12} />}
          {isRegenerating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>
      {regenError && (
        <p style={{ fontSize: '0.78rem', color: '#e87a7a', marginTop: '-4px' }}>{regenError}</p>
      )}

      {/* ── Writing Style — AI tone adjuster ── */}
      <SidebarSection title="Writing Style" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted, #7A756E)', margin: 0, lineHeight: 1.5 }}>
            Let Pear rewrite all your site copy to match a tone.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {(['Casual', 'Warm', 'Elegant', 'Formal'] as const).map((tone) => {
              const isActive = activeTone === tone;
              return (
                <button
                  key={tone}
                  onClick={() => handleToneAdjust(tone)}
                  disabled={toneLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: isActive ? '2px solid #18181B' : '1px solid #E4E4E7',
                    background: isActive ? '#18181B' : '#FFFFFF',
                    cursor: toneLoading ? 'wait' : 'pointer',
                    opacity: toneLoading && !isActive ? 0.5 : 1,
                    transition: 'all 0.15s',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: isActive ? '#FFFFFF' : '#3F3F46',
                  }}
                >
                  {isActive && toneLoading ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <PearIcon size={12} color={isActive ? 'var(--pl-olive)' : 'var(--pl-muted, #7A756E)'} />
                  )}
                  {tone}
                </button>
              );
            })}
          </div>
          {toneLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'rgba(163,177,138,0.06)',
              border: '1px solid rgba(163,177,138,0.12)',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--pl-olive, #A3B18A)',
            }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Pear is adjusting your tone...
            </div>
          )}
        </div>
      </SidebarSection>

      {/* ── Theme — presets ── */}
      <SidebarSection title="Theme" defaultOpen={forceOpenSection === 'theme' || !forceOpenSection} key={forceOpenSection === 'theme' ? 'theme-open' : 'theme'}>
        <ThemeSwitcher
          currentVibeSkin={manifest.vibeSkin ?? ({} as VibeSkin)}
          manifest={manifest}
          onApply={handleThemeApply}
        />
      </SidebarSection>

      {/* ── Page Background ── */}
      <SidebarSection title="Page Background" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: '#A1A1AA', marginBottom: '4px' }}>Background Color</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { label: 'Theme', value: '' },
              { label: 'White', value: '#ffffff' },
              { label: 'Cream', value: '#FAF7F2' },
              { label: 'Warm', value: '#F5EFE6' },
              { label: 'Blush', value: '#FDF0F3' },
              { label: 'Sage', value: '#EEF2ED' },
              { label: 'Dark', value: '#1a1814' },
              { label: 'Navy', value: '#1a2332' },
            ].map(bg => {
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
                    width: '28px', height: '28px', borderRadius: '12px',
                    border: isActive ? '2px solid var(--pl-olive)' : '1px solid rgba(255,255,255,0.3)',
                    background: bg.value || 'linear-gradient(135deg, #FAF7F2, #E8D5C4)',
                    cursor: 'pointer', transition: 'border 0.15s',
                  }}
                />
              );
            })}
          </div>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: '#A1A1AA', marginBottom: '4px' }}>Background Pattern</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { label: 'None', value: '' },
              { label: 'Dots', value: 'radial-gradient(circle, rgba(163,177,138,0.08) 1px, transparent 1px)' },
              { label: 'Lines', value: 'repeating-linear-gradient(0deg, rgba(163,177,138,0.04) 0px, transparent 1px, transparent 40px)' },
              { label: 'Grid', value: 'linear-gradient(rgba(163,177,138,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163,177,138,0.03) 1px, transparent 1px)' },
            ].map(p => {
              const current = (manifest as unknown as Record<string, unknown>).backgroundPatternCss as string || '';
              const isActive = p.value === current;
              return (
                <button
                  key={p.label}
                  onClick={() => onChange({ ...manifest, backgroundPatternCss: p.value } as StoryManifest)}
                  style={{
                    padding: '4px 10px', borderRadius: '100px',
                    border: isActive ? '1.5px solid var(--pl-olive)' : '1px solid rgba(255,255,255,0.3)',
                    background: isActive ? 'rgba(163,177,138,0.1)' : 'rgba(255,255,255,0.2)',
                    color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                    cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </SidebarSection>

      {/* ── Colors — tweak individual colors ── */}
      <SidebarSection title="Colors" defaultOpen>
        <ColorPalettePanel manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Wedding Palettes — curated presets ── */}
      <SidebarSection title="Wedding Palettes" defaultOpen={false}>
        <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', lineHeight: 1.5, margin: '0 0 8px' }}>
          One-click curated palettes designed for weddings.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {([
            { name: 'Blush & Sage', colors: ['#D4A0A0', '#A3B18A', '#FAF7F2', '#3D3530', '#F5F1E8'] },
            { name: 'Navy & Gold', colors: ['#2C3E6B', '#C4A96A', '#FAF7F2', '#1C1C1C', '#F5F1E8'] },
            { name: 'Terracotta & Cream', colors: ['#C67B5C', '#E8B89D', '#FFF8F2', '#3D2E24', '#F5ECE4'] },
            { name: 'Lavender Dream', colors: ['#9B8EC1', '#D4A0C4', '#F8F5FD', '#2D2640', '#F0ECF8'] },
            { name: 'Coastal Blue', colors: ['#5B9BD5', '#B8D4E8', '#F0F7FF', '#1E4D8C', '#E8F0F8'] },
            { name: 'Emerald & Ivory', colors: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24', '#E2F0E8'] },
            { name: 'Sunset Glow', colors: ['#E8785E', '#F0B860', '#FFF8F0', '#3D2420', '#FFF0E8'] },
            { name: 'Classic B&W', colors: ['#333333', '#888888', '#FFFFFF', '#111111', '#F5F5F5'] },
          ] as const).map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                const [accent, accent2, background, ink, subtle] = preset.colors;
                const newPalette = {
                  ...(manifest.vibeSkin?.palette || {}),
                  accent,
                  accent2,
                  background,
                  foreground: ink,
                  ink,
                  subtle,
                  card: subtle,
                  muted: accent2,
                  highlight: accent,
                };
                const newSkin = {
                  ...(manifest.vibeSkin || {} as VibeSkin),
                  palette: newPalette as VibeSkin['palette'],
                };
                handleThemeApply(newSkin);
              }}
              style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                padding: '10px', borderRadius: '12px', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.3)',
                textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; }}
            >
              <div className="pl-palette-swatches" style={{ display: 'flex', gap: '3px' }}>
                {preset.colors.slice(0, 5).map((c, i) => (
                  <div key={i} style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: c, border: '1px solid rgba(0,0,0,0.08)',
                    transition: `transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.04}s`,
                  }} />
                ))}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--pl-ink)' }}>
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </SidebarSection>

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
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--pl-muted, #7A756E)', fontSize: '0.82rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>No AI art generated yet.</p>
            <button onClick={handleRegenerateDesign} style={{ padding: '0.5rem 1rem', borderRadius: '100px', background: 'var(--pl-olive, #A3B18A)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              Generate AI Art
            </button>
          </div>
        )}
      </SidebarSection>

      {/* ── Navigation — logo + nav style ── */}
      <SidebarSection title="Navigation" defaultOpen={forceOpenSection === 'navigation' || !forceOpenSection} key={forceOpenSection === 'navigation' ? 'nav-open' : 'nav'}>
        <NavCustomizationPanel manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Story Layout — how chapters unfold on the page ── */}
      <SidebarSection title="Story Layout" defaultOpen={false}>
        <div>
          <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
            Story Layout
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
            How your chapters unfold on the page
          </div>
          <StoryLayoutPicker
            // Canonical read path: prefer `storyLayout`, fall back to the
            // legacy `layoutFormat` so existing drafts show the right
            // selection until the user saves with the new field.
            selected={resolveStoryLayout(manifest.storyLayout, manifest.layoutFormat)}
            onSelect={(layout) => onChange({
              ...manifest,
              storyLayout: layout,
              // Clear the legacy field so it can't silently override.
              layoutFormat: undefined,
            })}
          />

          {/* ── Date format — applies to chapter date labels ── */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '6px' }}>
              Date format
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
              How dates read on every chapter
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.keys(CHAPTER_DATE_FORMATS) as ChapterDateFormatKey[]).map((key) => {
                const preset = CHAPTER_DATE_FORMATS[key];
                const isActive = (manifest.dateFormat || 'long') === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ ...manifest, dateFormat: key })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${isActive ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.2)'}`,
                      background: isActive ? 'rgba(163,177,138,0.12)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    aria-pressed={isActive}
                  >
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: isActive ? 700 : 600,
                      color: 'var(--pl-ink-soft)',
                    }}>
                      {preset.label}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      color: 'var(--pl-muted)',
                    }}>
                      {preset.example}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SidebarSection>

      {/* ── Corner Decorations — swappable presets ── */}
      <SidebarSection title="Corner Decorations" defaultOpen={false}>
        <CornerDecorationPicker manifest={manifest} onChange={onChange} />
      </SidebarSection>

      {/* ── Quick Design Presets ── */}
      <SidebarSection title="Quick Style Presets" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {DESIGN_PRESETS.map(preset => (
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
                display: 'flex', flexDirection: 'column', gap: '6px',
                padding: '10px', borderRadius: '12px', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.3)',
                textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; }}
            >
              <div style={{ display: 'flex', gap: '3px' }}>
                {[preset.preview.bg, preset.preview.fg, preset.preview.accent].map((c, i) => (
                  <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--pl-ink)' }}>{preset.name}</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--pl-muted)', lineHeight: 1.3 }}>{preset.description}</div>
            </button>
          ))}
        </div>
      </SidebarSection>

      {/* ── Dark Mode Preview ── */}
      <SidebarSection title="Dark Mode Preview" defaultOpen={false}>
        <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', marginBottom: '8px', lineHeight: 1.5 }}>
          Preview how your site would look with inverted colors. Great for evening events.
        </p>
        <button
          onClick={() => {
            if (!manifest.vibeSkin) return;
            const darkPalette = invertPalette(manifest.vibeSkin.palette);
            const darkSkin: VibeSkin = { ...manifest.vibeSkin, palette: darkPalette };
            handleThemeApply(darkSkin);
          }}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'linear-gradient(135deg, #1a1520 0%, #252030 100%)',
            color: '#F0E8D8', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>🌙</span> Apply Dark Mode
        </button>
      </SidebarSection>

      {/* ── Typographic Scale ── */}
      <SidebarSection title="Type Scale" defaultOpen={false}>
        <p style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', marginBottom: '8px', lineHeight: 1.5 }}>
          Set the mathematical ratio for font size hierarchy across your site.
        </p>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(['minor-third', 'major-third', 'perfect-fourth', 'golden-ratio'] as TypeScale[]).map(scale => {
            const h = generateTypeHierarchy(16, scale);
            return (
              <button
                key={scale}
                onClick={() => {
                  onChange({
                    ...manifest,
                    theme: {
                      ...manifest.theme,
                      typeScale: scale,
                      typeSizes: h.sizes,
                    },
                  });
                }}
                style={{
                  flex: 1, minWidth: '70px', padding: '8px 6px', borderRadius: '12px',
                  border: manifest.theme?.typeScale === scale
                    ? '1.5px solid var(--pl-olive)' : '1px solid rgba(255,255,255,0.25)',
                  background: manifest.theme?.typeScale === scale
                    ? 'rgba(163,177,138,0.1)' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--pl-ink)', textTransform: 'capitalize' }}>
                  {scale.replace('-', ' ')}
                </div>
                <div style={{ fontSize: '0.5rem', color: 'var(--pl-muted)' }}>
                  {h.ratio}:1
                </div>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      {/* Design Health — advisors collapsed at bottom */}
      <SidebarSection title="Design Health" defaultOpen={false}>
        <DesignAdvisor manifest={manifest} />
        <AccessibilityAuditPanel manifest={manifest} />
      </SidebarSection>

      {/* Asset Library */}
      <SidebarSection title="Asset Library" defaultOpen={false}>
        <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted, #7A756E)', marginBottom: '10px', lineHeight: 1.5 }}>
          Dividers, illustrations & accents to add to your pages.
        </p>
        <AssetPicker
          onSelect={(asset) => {
            // Store last-selected asset on manifest for canvas insertion
            onChange({ ...manifest, lastAsset: asset as StoryManifest['lastAsset'] });
          }}
          onAddSticker={(asset) => {
            const newSticker: import('@/types').StickerItem = {
              id: `sticker-${Date.now()}`,
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
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted, #7A756E)', marginBottom: '8px' }}>
              Active ({manifest.stickers!.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {manifest.stickers!.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: '#FAFAFA', border: '1px solid #E4E4E7' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--pl-ink-soft, #3D3530)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-muted, #7A756E)' }}>
                    Size
                    <RangeSlider min={30} max={200} value={s.size} onChange={v => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, size: v };
                      onChange({ ...manifest, stickers: updated });
                    }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--pl-muted)' }}>
                    Op.
                    <RangeSlider min={10} max={100} value={Math.round(s.opacity * 100)} onChange={v => {
                      const updated = [...manifest.stickers!];
                      updated[i] = { ...s, opacity: v / 100 };
                      onChange({ ...manifest, stickers: updated });
                    }} />
                  </label>
                  <button onClick={() => onChange({ ...manifest, stickers: manifest.stickers!.filter((_, j) => j !== i) })} style={{ all: 'unset', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '2px' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SidebarSection>

      {/* Live preview — compact, no extra nesting */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E4E4E7', background: '#FFFFFF' }}>
        <div style={{ background: colors.background || '#faf9f6', padding: '14px' }}>
          <div style={{ fontFamily: `"${manifest.theme?.fonts?.heading || 'Playfair Display'}", serif`, fontSize: '1rem', fontWeight: 700, color: colors.foreground || 'var(--pl-ink, var(--pl-ink-soft))', marginBottom: '3px' }}>
            {manifest.chapters?.[0]?.title || 'Preview'}
          </div>
          <div style={{ color: colors.muted || '#8c8c8c', fontSize: '0.72rem', marginBottom: '8px' }}>The beginning of everything.</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ background: colors.accent || '#A3B18A', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700 }}>RSVP</div>
            <div style={{ background: colors.accentLight || '#f3e8d8', color: colors.accent || '#A3B18A', padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 600 }}>View Story</div>
          </div>
        </div>
        <div style={{ height: '3px', background: colors.accent || '#A3B18A' }} />
      </div>
    </div>
  );
}
