'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/WizardLivePreview.tsx
//
// The floating mini site preview that sits alongside the wizard
// card and updates in real time as the user answers each
// question. This is the single biggest "wait this is magical"
// moment of the whole flow — they see their site assemble
// itself piece by piece before it's even been generated.
//
// Mounts a compact SiteRenderer with a rolling skeleton
// manifest. Each new piece of information from `collected`
// layers onto the manifest so every answer produces a visible
// change in the preview:
//
//   Pick an occasion    → hero block appears with the vibe skin
//   Enter the names     → title renders + countdown prep
//   Pick a date         → countdown block shows
//   Pick a venue        → event block with the venue name
//   Pick a palette      → entire site recolors
//   Pick photos         → first photo fills the hero
//   Pick a layout       → story section re-renders with it
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SiteRenderer } from '@/components/editor/SiteRenderer';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import type { StoryManifest, PageBlock } from '@/types';
import type { StoryLayoutType } from '@/components/blocks/StoryLayouts';

interface Collected {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
  storyLayout?: StoryLayoutType;
}

export interface WizardLivePreviewProps {
  collected: Collected;
  /** Photos selected during the photo step (raw Picker metadata). */
  selectedPhotos: Array<{ id?: string; baseUrl?: string; url?: string; uri?: string; creationTime?: string }>;
  /** Accent/background/foreground hex picked during vibe. */
  selectedPaletteColors: string[] | null;
  /** Optional class override so the parent can position the panel. */
  className?: string;
}

/**
 * Build a skeleton StoryManifest out of the partial wizard state.
 * Returns `null` when we don't have enough to render anything
 * meaningful yet (no occasion or names).
 */
function buildSkeleton(
  collected: Collected,
  selectedPhotos: WizardLivePreviewProps['selectedPhotos'],
  selectedPaletteColors: string[] | null,
): StoryManifest | null {
  const hasSomething = !!(collected.occasion || collected.names?.[0]);
  if (!hasSomething) return null;

  const occasion = (collected.occasion || 'story') as
    | 'wedding'
    | 'anniversary'
    | 'engagement'
    | 'birthday'
    | 'story';

  // Build a vibe skin from the fallback derivation so every
  // required field is present, then override its palette with
  // any colors the user has explicitly picked.
  const vibeString = `${collected.occasion || ''} ${collected.vibe || ''}`.trim();
  const baseSkin = deriveVibeSkin(vibeString);
  const palette = selectedPaletteColors && selectedPaletteColors.length >= 2
    ? {
        ...baseSkin.palette,
        accent: selectedPaletteColors[0] || baseSkin.palette.accent,
        accent2: selectedPaletteColors[1] || baseSkin.palette.accent2,
        background: selectedPaletteColors[2] || baseSkin.palette.background,
        foreground: selectedPaletteColors[3] || baseSkin.palette.foreground,
      }
    : baseSkin.palette;

  const vibeSkin = {
    ...baseSkin,
    palette,
  };

  // Hero slideshow: proxy-wrap the selected photos so they
  // load in the editing session. Limit to 4 so the preview
  // stays lightweight.
  const photoUrls = selectedPhotos
    .slice(0, 4)
    .map((p) => {
      const raw = p.baseUrl || p.url || p.uri || '';
      if (!raw) return '';
      return raw.includes('googleusercontent')
        ? `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=800&h=800`
        : raw;
    })
    .filter(Boolean);

  const safeNames: [string, string] = [
    collected.names?.[0] || 'Our',
    collected.names?.[1] || 'Story',
  ];

  // Build an ordered block list that adds pieces as the user
  // answers more questions. Every answer lights up another
  // block in the preview.
  const blocks: PageBlock[] = [
    { id: 'hero', type: 'hero', visible: true, order: 0, config: {} },
  ];
  if (collected.date) {
    blocks.push({
      id: 'countdown',
      type: 'countdown',
      visible: true,
      order: 1,
      config: {},
    });
  }
  if (selectedPhotos.length > 0) {
    blocks.push({
      id: 'story',
      type: 'story',
      visible: true,
      order: 2,
      config: {},
    });
  }
  if (collected.venue && collected.venue !== 'TBD') {
    blocks.push({
      id: 'event',
      type: 'event',
      visible: true,
      order: 3,
      config: {},
    });
  }

  // Chapters: synthesize one placeholder chapter from the first
  // few photos so the story section has something to render.
  const chapters = selectedPhotos.length > 0
    ? [
        {
          id: 'preview-chapter-0',
          date: collected.date || new Date().toISOString(),
          title: 'How it begins',
          subtitle: 'The first chapter of your story',
          description:
            'Your real chapters will be written by Pear in a moment — this is just a sneak peek.',
          images: photoUrls.map((url, i) => ({
            id: `preview-img-${i}`,
            url,
            alt: `Photo ${i + 1}`,
            width: 800,
            height: 800,
          })),
          location: null,
          mood: 'warm',
          order: 0,
          emotionalIntensity: 6,
        },
      ]
    : [];

  const skeleton: StoryManifest = {
    coupleId: `preview-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    vibeString,
    // ThemeSchema — the SiteRenderer's ThemeProvider reads from it
    theme: {
      name: 'pearloom-wizard-preview',
      fonts: { heading: vibeSkin.fonts.heading, body: vibeSkin.fonts.body },
      colors: {
        background: palette.background,
        foreground: palette.foreground,
        accent: palette.accent,
        accentLight: palette.accent2,
        muted: palette.muted,
        cardBg: palette.card,
      },
      borderRadius: '1rem',
    },
    chapters,
    comingSoon: {
      enabled: false,
      title: 'Coming Soon',
      subtitle: '',
      passwordProtected: false,
    },
    coverPhoto: photoUrls[0] || undefined,
    heroSlideshow: photoUrls.length > 0 ? photoUrls : undefined,
    occasion,
    vibeSkin,
    blocks,
    events: collected.venue && collected.venue !== 'TBD' && collected.date
      ? [
          {
            id: 'preview-event',
            name:
              occasion === 'wedding' ? 'The Ceremony'
              : occasion === 'birthday' ? 'The Party'
              : occasion === 'engagement' ? 'The Engagement'
              : 'The Celebration',
            type: occasion === 'wedding' ? 'ceremony' : 'reception',
            date: collected.date,
            time: '',
            venue: collected.venue,
            address: '',
            description: '',
            order: 0,
          },
        ]
      : [],
    logistics: {
      date: collected.date || '',
      venue: collected.venue || '',
    },
    poetry: {
      heroTagline:
        occasion === 'wedding' ? 'forever starts here'
        : occasion === 'birthday' ? 'a year worth celebrating'
        : occasion === 'engagement' ? "they said yes"
        : occasion === 'anniversary' ? 'still choosing each other'
        : 'a love story, beautifully told',
      closingLine: '',
      rsvpIntro: '',
    },
    storyLayout: collected.storyLayout || 'parallax',
    pageMode: 'single-scroll',
    navStyle: 'glass',
  } as StoryManifest;

  return skeleton;
}

export function WizardLivePreview({
  collected,
  selectedPhotos,
  selectedPaletteColors,
  className,
}: WizardLivePreviewProps) {
  const skeleton = useMemo(
    () => buildSkeleton(collected, selectedPhotos, selectedPaletteColors),
    [collected, selectedPhotos, selectedPaletteColors],
  );

  const year = new Date().getFullYear();
  const blockCount = skeleton?.blocks?.length ?? 0;
  const folio = String(Math.max(1, blockCount)).padStart(2, '0');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      {/* Masthead kicker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 2px 2px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'rgba(184,147,90,0.85)',
          }}
        >
          Live preview · {year}
        </span>
        <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.45)' }} />
        <span
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: 'rgba(184,147,90,0.85)',
          }}
        >
          Step {folio} of 4
        </span>
      </div>

      {/* The preview frame — a scaled-down SiteRenderer on a cream
          editorial plate. We render the site into a fake 1600 × 1000
          desktop viewport and then CSS-transform the whole thing down
          so it fits inside the 640 × 400 plate. This gives a real
          desktop-shaped preview (16:10) instead of a mobile-phone
          sliver, and the 0.4× scale is still readable. */}
      <motion.div
        layout
        style={{
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          borderRadius: 'var(--pl-radius-xs)',
          overflow: 'hidden',
          boxShadow:
            '0 22px 60px rgba(22,16,6,0.22), 0 2px 8px rgba(22,16,6,0.08), 0 0 0 1px rgba(184,147,90,0.28)',
          borderTop: '1.5px solid rgba(184,147,90,0.65)',
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
          height: 400,
          position: 'relative',
        }}
      >
        {skeleton ? (
          // The inner scroller is sized as a fake desktop viewport
          // (1600 × 1000) and then scaled down to exactly fit the
          // 640 × 400 glass card. Scroll happens at the scaled-up
          // level, so the user can drag through the full site but
          // the visual footprint stays inside the frame.
          //
          //   PREVIEW_SCALE = 640 / 1600 = 0.40
          //   fake height    = 400 / 0.40 = 1000
          <div
            style={{
              width: 1600,
              height: 1000,
              transform: 'scale(0.4)',
              transformOrigin: 'top left',
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative',
            }}
            className="pear-wizard-preview-scroll"
          >
            <style>{`
              /* Hide the scroll bar inside the mini preview so it
                 reads as a site surface, not a scroll container. */
              .pear-wizard-preview-scroll::-webkit-scrollbar {
                width: 0;
                background: transparent;
              }
              .pear-wizard-preview-scroll {
                scrollbar-width: none;
              }
            `}</style>
            <SiteRenderer
              manifest={skeleton}
              names={collected.names || ['', '']}
              editMode={false}
            />
          </div>
        ) : (
          <EmptyPreview />
        )}
      </motion.div>
    </motion.div>
  );
}

function EmptyPreview() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '28px 36px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        justifyContent: 'center',
      }}
    >
      {/* Folio seal */}
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: 'rgba(184,147,90,0.85)',
        }}
      >
        Empty preview
      </div>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 'var(--pl-radius-xs)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(184,147,90,0.45)',
          borderTop: '1.5px solid rgba(184,147,90,0.75)',
          background: 'rgba(250,247,242,0.65)',
          fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
          fontStyle: 'italic',
          fontSize: '2rem',
          fontWeight: 400,
          color: 'rgba(184,147,90,0.9)',
          letterSpacing: '-0.02em',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        №
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
          fontStyle: 'italic',
          fontSize: '1.35rem',
          fontWeight: 400,
          color: '#18181B',
          letterSpacing: '-0.005em',
          lineHeight: 1.15,
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        your story begins here
      </div>
      <div style={{ width: 42, height: 1, background: 'rgba(184,147,90,0.55)' }} />
      <div
        style={{
          fontSize: '0.78rem',
          color: '#52525B',
          maxWidth: 320,
          lineHeight: 1.55,
          fontFamily: 'var(--pl-font-body, inherit)',
        }}
      >
        Each answer adds another piece — your site assembles itself
        beside you as you go.
      </div>
    </div>
  );
}
