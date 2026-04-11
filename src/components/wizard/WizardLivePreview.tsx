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
import { Eye } from 'lucide-react';
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
    pageMode: 'single-page',
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
      }}
    >
      {/* Eyebrow label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: '0.58rem',
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--pl-olive-deep, #7D9B6A)',
          opacity: 0.85,
        }}
      >
        <Eye size={10} />
        <span>Your site so far</span>
      </div>

      {/* The preview frame — a scaled-down SiteRenderer on a glass
          surface. Each answer layers another block in so the user
          sees their site accumulate in real time. */}
      <motion.div
        layout
        style={{
          width: '100%',
          maxWidth: 340,
          margin: '0 auto',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 18px 48px rgba(43,30,20,0.18), 0 2px 8px rgba(43,30,20,0.06)',
          border: '1px solid rgba(255,255,255,0.55)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          maxHeight: 420,
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {skeleton ? (
          // Scale the real SiteRenderer down so a full hero +
          // countdown + first chapter fits in the mini frame.
          // The renderer is heavy-ish but the preview is read-only
          // (editMode=false) so it's fine.
          <div
            style={{
              width: '100%',
              transformOrigin: 'top center',
            }}
          >
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
        padding: '36px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        minHeight: 240,
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: 'rgba(163,177,138,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed rgba(163,177,138,0.4)',
        }}
      >
        <Eye size={22} color="var(--pl-olive, #A3B18A)" />
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--pl-ink-soft)',
        }}
      >
        Your site will appear here
      </div>
      <div
        style={{
          fontSize: '0.7rem',
          color: 'var(--pl-muted)',
          maxWidth: 220,
          lineHeight: 1.5,
        }}
      >
        Every answer lights up another piece of your real site so you can watch
        it come together.
      </div>
    </div>
  );
}
