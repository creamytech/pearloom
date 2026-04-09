'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileContextPanel.tsx
// Smart panel that shows the right settings based on what was
// tapped in the mobile preview. Renders inside MobileBottomSheet.
// ─────────────────────────────────────────────────────────────

import { useCallback, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Star, BookOpen, CalendarDays, Mail, Gift, Plane, HelpCircle,
  Camera, MessageSquare, MapPin, Quote, Type, Video, Timer, Minus,
  Music, Hash, Users, Navigation, LayoutGrid, Sparkles, Image,
  Palette, Upload, Loader2,
} from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { Field, lbl, inp } from './editor-utils';
import { ImageManager } from './ImageManager';
import type { Chapter, ChapterImage, WeddingEvent, FaqItem, StoryManifest } from '@/types';

// ── Section type → icon + display name mapping ──────────────

type SectionType = NonNullable<MobileContextPanelProps['activeSection']>;

const SECTION_META: Record<SectionType, { icon: React.ElementType; label: string }> = {
  hero:         { icon: Star,         label: 'Hero'          },
  story:        { icon: BookOpen,     label: 'Story'         },
  events:       { icon: CalendarDays, label: 'Events'        },
  rsvp:         { icon: Mail,         label: 'RSVP'          },
  registry:     { icon: Gift,         label: 'Registry'      },
  travel:       { icon: Plane,        label: 'Travel'        },
  faq:          { icon: HelpCircle,   label: 'FAQ'           },
  photos:       { icon: Camera,       label: 'Photos'        },
  guestbook:    { icon: MessageSquare, label: 'Guestbook'    },
  map:          { icon: MapPin,       label: 'Map'           },
  quote:        { icon: Quote,        label: 'Quote'         },
  text:         { icon: Type,         label: 'Text'          },
  video:        { icon: Video,        label: 'Video'         },
  countdown:    { icon: Timer,        label: 'Countdown'     },
  divider:      { icon: Minus,        label: 'Divider'       },
  spotify:      { icon: Music,        label: 'Spotify'       },
  hashtag:      { icon: Hash,         label: 'Hashtag'       },
  weddingParty: { icon: Users,        label: 'Wedding Party' },
  nav:          { icon: Navigation,   label: 'Navigation'    },
  footer:       { icon: LayoutGrid,   label: 'Footer'        },
};

// ── Props ───────────────────────────────────────────────────

export interface MobileContextPanelProps {
  /** The section/block type that was tapped */
  activeSection: string | null;
  /** If a specific chapter was tapped */
  activeChapterId: string | null;
  /** If a specific event was tapped */
  activeEventId: string | null;
  /** Close the panel */
  onClose?: () => void;
}

// ── Layout picker (reused from MobileChapterEditor pattern) ─

const LAYOUTS: Array<{
  id: NonNullable<Chapter['layout']>;
  label: string;
  glyph: string;
}> = [
  { id: 'editorial',  label: 'Editorial',  glyph: '▤' },
  { id: 'fullbleed',  label: 'Full Bleed', glyph: '▣' },
  { id: 'split',      label: 'Split',      glyph: '▥' },
  { id: 'cinematic',  label: 'Cinematic',  glyph: '▬' },
  { id: 'gallery',    label: 'Gallery',    glyph: '▦' },
  { id: 'mosaic',     label: 'Mosaic',     glyph: '▩' },
];

// ── Component ───────────────────────────────────────────────

export function MobileContextPanel({
  activeSection,
  activeChapterId,
  activeEventId,
  onClose,
}: MobileContextPanelProps) {
  const { state, actions, manifest, dispatch } = useEditor();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Debounced chapter update
  const scheduleChapterUpdate = useCallback(
    (id: string, data: Partial<Chapter>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        actions.updateChapter(id, data);
      }, 600);
    },
    [actions],
  );

  // Debounced manifest update
  const scheduleManifestUpdate = useCallback(
    (updates: Partial<typeof manifest>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        actions.handleDesignChange({ ...manifest, ...updates });
      }, 600);
    },
    [actions, manifest],
  );

  // ── Empty state ──
  if (!activeSection) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 16,
        minHeight: 200,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--pl-olive-8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--pl-olive)',
        }}>
          <Sparkles size={24} />
        </div>
        <div>
          <div style={{
            fontSize: 'var(--pl-text-md)',
            fontWeight: 700,
            color: 'var(--pl-ink)',
            marginBottom: 6,
          }}>
            Tap anything on your site to edit it
          </div>
          <div style={{
            fontSize: 'var(--pl-text-sm)',
            color: 'var(--pl-muted)',
            lineHeight: 1.5,
          }}>
            Select a section, photo, or text block in the preview above to see its settings here.
          </div>
        </div>
      </div>
    );
  }

  const sectionKey = activeSection as SectionType;
  const meta = SECTION_META[sectionKey] || { icon: LayoutGrid, label: activeSection };
  const SectionIcon = meta.icon;

  // ── Render section content ──
  const renderContent = () => {
    switch (sectionKey) {
      case 'hero':
        return <HeroSettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'story': {
        if (activeChapterId) {
          const chapter = state.chapters.find(c => c.id === activeChapterId);
          if (chapter) {
            return (
              <ChapterSettings
                chapter={chapter}
                onUpdate={(data) => scheduleChapterUpdate(chapter.id, data)}
                onRewrite={() => actions.handleAIRewrite(chapter.id)}
                isRewriting={state.rewritingId === chapter.id}
              />
            );
          }
        }
        // No specific chapter — show chapter list hint
        return (
          <div style={{ ...sectionPad, color: 'var(--pl-muted)', fontSize: 'var(--pl-text-sm)' }}>
            Tap a specific chapter in the preview to edit it.
          </div>
        );
      }

      case 'events': {
        if (activeEventId && manifest.events) {
          const event = manifest.events.find(e => e.id === activeEventId);
          if (event) {
            return (
              <EventSettings
                event={event}
                onUpdate={(data) => {
                  const updated = manifest.events!.map(e =>
                    e.id === event.id ? { ...e, ...data } : e
                  );
                  scheduleManifestUpdate({ events: updated });
                }}
              />
            );
          }
        }
        return (
          <div style={{ ...sectionPad, color: 'var(--pl-muted)', fontSize: 'var(--pl-text-sm)' }}>
            Tap a specific event in the preview to edit it.
          </div>
        );
      }

      case 'nav':
      case 'footer':
        return <DesignSettings manifest={manifest} onUpdate={scheduleManifestUpdate} section={sectionKey} />;

      case 'rsvp':
        return <RsvpSettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'registry':
        return <RegistrySettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'travel':
        return <TravelSettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'faq':
        return <FaqSettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'photos':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="photos" label="Photo Gallery" />;

      case 'guestbook':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="guestbook" label="Guestbook" />;

      case 'map':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="map" label="Map" />;

      case 'quote':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="quote" label="Quote" />;

      case 'text':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="text" label="Text Block" />;

      case 'video':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="video" label="Video" />;

      case 'countdown':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="countdown" label="Countdown" />;

      case 'divider':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="divider" label="Divider" />;

      case 'spotify':
        return <SpotifySettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'hashtag':
        return <HashtagSettings manifest={manifest} onUpdate={scheduleManifestUpdate} />;

      case 'weddingParty':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="weddingParty" label="Wedding Party" />;

      case 'vibeQuote':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="vibeQuote" label="Vibe Quote" />;

      case 'welcome':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="welcome" label="Welcome Message" />;

      case 'anniversary':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="anniversary" label="Anniversary" />;

      case 'storymap':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="storymap" label="Story Map" />;

      case 'quiz':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="quiz" label="Couple Quiz" />;

      case 'photoWall':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="photoWall" label="Photo Wall" />;

      case 'gallery':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="gallery" label="Gallery" />;

      case 'footer':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="footer" label="Footer" />;

      default:
        return (
          <div style={{ ...sectionPad, color: 'var(--pl-muted)', fontSize: 'var(--pl-text-sm)' }}>
            Settings for this section are not yet available.
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Sticky header ── */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--pl-olive-8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pl-olive)',
            flexShrink: 0,
          }}>
            <SectionIcon size={14} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--pl-text-sm)',
              fontWeight: 700,
              color: 'var(--pl-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {meta.label}
            </div>
            <div style={{
              fontSize: 'var(--pl-text-2xs)',
              color: 'var(--pl-muted)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Settings
            </div>
          </div>
        </div>
        {onClose && (
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.85 }}
            style={closeBtn}
            aria-label="Close settings"
          >
            <X size={16} />
          </motion.button>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div style={scrollArea}>
        {renderContent()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section-specific settings sub-components
// ═══════════════════════════════════════════════════════════════

// ── Cover Photo Uploader ────────────────────────────────────

function CoverPhotoUploader({ currentPhoto, onPhotoChange }: {
  currentPhoto?: string;
  onPhotoChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const { publicUrl } = await res.json();
        onPhotoChange(publicUrl);
      }
    } catch {
      // Silent fail
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label style={lbl}>Cover Photo</label>

      {/* Current photo preview */}
      {currentPhoto && (
        <div style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentPhoto} alt="Cover" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 8,
          }}>
            <span style={{ fontSize: '0.65rem', color: 'white', fontWeight: 600, letterSpacing: '0.06em' }}>
              Tap below to replace
            </span>
          </div>
        </div>
      )}

      {/* Upload options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Device upload */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
            border: '1.5px dashed rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            textAlign: 'left' as const, width: '100%',
          }}
        >
          {uploading ? (
            <Loader2 size={18} style={{ color: 'var(--pl-olive)', animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={18} style={{ color: 'var(--pl-olive)' }} />
          )}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
              {uploading ? 'Uploading...' : 'Upload from Device'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)' }}>
              JPG, PNG, or HEIC
            </div>
          </div>
        </button>

        {/* Google Photos */}
        <button
          onClick={() => {
            // Open Google Photos picker flow
            window.open('/api/photos/picker?context=cover', '_blank', 'width=600,height=700');
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            textAlign: 'left' as const, width: '100%',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M24 4L29.5 14.5H18.5L24 4Z" fill="#EA4335"/>
            <path d="M4 34.5L14.5 29V40L4 34.5Z" fill="#4285F4"/>
            <path d="M44 34.5L33.5 40V29L44 34.5Z" fill="#34A853"/>
            <path d="M24 44L18.5 33.5H29.5L24 44Z" fill="#FBBC05"/>
          </svg>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
              Google Photos
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)' }}>
              Pick from your library
            </div>
          </div>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── Hero Settings ───────────────────────────────────────────

function HeroSettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  const poetry = manifest.poetry ?? { heroTagline: '', closingLine: '', rsvpIntro: '' };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Hero Tagline"
          value={poetry.heroTagline || ''}
          onChange={(v) => onUpdate({ poetry: { ...poetry, heroTagline: v } })}
          placeholder="A poetic subtitle for your hero..."
        />

        <Field
          label="Welcome Statement"
          value={poetry.welcomeStatement || ''}
          onChange={(v) => onUpdate({ poetry: { ...poetry, welcomeStatement: v } })}
          rows={3}
          placeholder="A warm welcome to your guests..."
        />

        <CoverPhotoUploader
          currentPhoto={manifest.coverPhoto}
          onPhotoChange={(url) => onUpdate({ coverPhoto: url })}
        />

        <div>
          <label style={lbl}>Display Names</label>
          <div style={{
            display: 'flex', gap: 8,
            padding: '8px 0',
          }}>
            {['Show Names', 'Hide Names'].map((opt, i) => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.92 }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--pl-black-6)',
                  background: i === 0 ? 'var(--pl-olive-12)' : 'transparent',
                  color: i === 0 ? 'var(--pl-olive)' : 'var(--pl-muted)',
                  fontSize: 'var(--pl-text-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chapter Settings ────────────────────────────────────────

function ChapterSettings({
  chapter,
  onUpdate,
  onRewrite,
  isRewriting,
}: {
  chapter: Chapter;
  onUpdate: (data: Partial<Chapter>) => void;
  onRewrite: () => void;
  isRewriting: boolean;
}) {
  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        {/* Title */}
        <div>
          <label style={lbl}>Title</label>
          <input
            key={`ctx-title-${chapter.id}`}
            defaultValue={chapter.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Chapter title..."
            style={{
              ...inp,
              fontFamily: 'var(--pl-font-heading, "Playfair Display", serif)',
              fontSize: 'max(16px, 1.15rem)',
              fontWeight: 700,
              fontStyle: 'italic',
            }}
          />
        </div>

        {/* Subtitle */}
        <Field
          label="Subtitle"
          value={chapter.subtitle || ''}
          onChange={(v) => onUpdate({ subtitle: v })}
          placeholder="A quiet note..."
        />

        {/* Description */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...lbl, marginBottom: 0 }}>Story</label>
            <motion.button
              onClick={onRewrite}
              disabled={isRewriting}
              whileTap={{ scale: 0.9 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 16,
                border: '1px solid var(--pl-olive-30)',
                background: 'var(--pl-olive-8)',
                color: isRewriting ? 'var(--pl-olive-40)' : 'var(--pl-olive)',
                cursor: isRewriting ? 'wait' : 'pointer',
                fontSize: 'var(--pl-text-2xs)',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              <Sparkles size={11} />
              {isRewriting ? 'Rewriting...' : 'Rewrite'}
            </motion.button>
          </div>
          <textarea
            key={`ctx-desc-${chapter.id}`}
            defaultValue={chapter.description || ''}
            onChange={e => onUpdate({ description: e.target.value })}
            readOnly={isRewriting}
            placeholder="Tell this chapter's story..."
            rows={5}
            style={{
              ...inp,
              resize: 'vertical',
              lineHeight: 1.65,
              fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
            }}
          />
        </div>

        {/* Layout picker */}
        <div>
          <label style={lbl}>Layout</label>
          <div style={{
            display: 'flex', gap: 8,
            overflowX: 'auto', paddingBottom: 4,
            scrollbarWidth: 'none',
          } as React.CSSProperties}>
            {LAYOUTS.map(({ id, label, glyph }) => {
              const active = (chapter.layout || 'editorial') === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => onUpdate({ layout: id })}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 5,
                    padding: '10px 12px', borderRadius: 10,
                    border: active ? '1px solid var(--pl-olive-50)' : '1px solid var(--pl-black-6)',
                    background: active ? 'var(--pl-olive-12)' : 'var(--pl-olive-5)',
                    color: active ? 'var(--pl-olive)' : 'var(--pl-muted)',
                    cursor: 'pointer', minWidth: 60,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{glyph}</span>
                  <span style={{
                    fontSize: 'var(--pl-text-2xs)', fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Photos */}
        <div>
          <label style={lbl}>Photos</label>
          <ImageManager
            images={chapter.images || []}
            onUpdate={(imgs: ChapterImage[]) => onUpdate({ images: imgs })}
            imagePosition={chapter.imagePosition}
            onPositionChange={(x, y) => onUpdate({ imagePosition: { x, y } })}
            chapterTitle={chapter.title}
            chapterMood={chapter.mood}
            chapterDescription={chapter.description}
          />
        </div>
      </div>
    </div>
  );
}

// ── Event Settings ──────────────────────────────────────────

function EventSettings({
  event,
  onUpdate,
}: {
  event: WeddingEvent;
  onUpdate: (data: Partial<WeddingEvent>) => void;
}) {
  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Event Name"
          value={event.name}
          onChange={(v) => onUpdate({ name: v })}
          placeholder="Ceremony, Reception..."
        />
        <Field
          label="Time"
          value={event.time || ''}
          onChange={(v) => onUpdate({ time: v })}
          placeholder="4:00 PM"
        />
        <Field
          label="Venue"
          value={event.venue || ''}
          onChange={(v) => onUpdate({ venue: v })}
          placeholder="Venue name"
        />
        <Field
          label="Address"
          value={event.address || ''}
          onChange={(v) => onUpdate({ address: v })}
          placeholder="123 Main St..."
        />
        <Field
          label="Dress Code"
          value={event.dressCode || ''}
          onChange={(v) => onUpdate({ dressCode: v })}
          placeholder="Black tie, cocktail..."
        />
        <Field
          label="Description"
          value={event.description || ''}
          onChange={(v) => onUpdate({ description: v })}
          rows={3}
          placeholder="Details about this event..."
        />
      </div>
    </div>
  );
}

// ── Design Settings (nav / footer) ──────────────────────────

function DesignSettings({
  manifest,
  onUpdate,
  section,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
  section: 'nav' | 'footer';
}) {
  const theme = manifest.theme || {};
  const colors = theme.colors || {};

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <div style={{
          fontSize: 'var(--pl-text-sm)',
          color: 'var(--pl-muted)',
          lineHeight: 1.5,
          marginBottom: 8,
        }}>
          {section === 'nav'
            ? 'Customize the navigation bar appearance.'
            : 'Customize the footer appearance and closing message.'}
        </div>

        {section === 'footer' && (
          <Field
            label="Closing Line"
            value={manifest.poetry?.closingLine || ''}
            onChange={(v) => onUpdate({
              poetry: {
                heroTagline: manifest.poetry?.heroTagline ?? '',
                closingLine: v,
                rsvpIntro: manifest.poetry?.rsvpIntro ?? '',
                welcomeStatement: manifest.poetry?.welcomeStatement,
                milestones: manifest.poetry?.milestones,
              },
            })}
            placeholder="A final note for your guests..."
          />
        )}

        <div>
          <label style={lbl}>Background Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={colors.background || '#FFFDF8'}
              onChange={e => onUpdate({
                theme: { ...theme, colors: { ...colors, background: e.target.value } },
              })}
              style={{
                width: 52, height: 44, padding: 3,
                borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                cursor: 'pointer', background: 'transparent',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontFamily: 'monospace' }}>{colors.background || '#FFFDF8'}</span>
          </div>
        </div>

        <div>
          <label style={lbl}>Accent Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={colors.accent || '#A3B18A'}
              onChange={e => onUpdate({
                theme: { ...theme, colors: { ...colors, accent: e.target.value } },
              })}
              style={{
                width: 52, height: 44, padding: 3,
                borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                cursor: 'pointer', background: 'transparent',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontFamily: 'monospace' }}>{colors.accent || '#A3B18A'}</span>
          </div>
        </div>

        <Field
          label="Heading Font"
          value={theme.fonts?.heading || 'Playfair Display'}
          onChange={(v) => onUpdate({
            theme: { ...theme, fonts: { ...(theme.fonts || {}), heading: v } },
          })}
          placeholder="Playfair Display"
        />

        <Field
          label="Body Font"
          value={theme.fonts?.body || 'Lora'}
          onChange={(v) => onUpdate({
            theme: { ...theme, fonts: { ...(theme.fonts || {}), body: v } },
          })}
          placeholder="Lora"
        />
      </div>
    </div>
  );
}

// ── RSVP Settings ───────────────────────────────────────────

function RsvpSettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  const block = manifest.blocks?.find((b) => b.type === 'rsvp');
  const config = block?.config || {};

  const updateBlockConfig = (updates: Record<string, unknown>) => {
    const blocks = (manifest.blocks || []).map((b) =>
      b.type === 'rsvp' ? { ...b, config: { ...b.config, ...updates } } : b
    );
    onUpdate({ blocks });
  };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="RSVP Intro"
          value={manifest.poetry?.rsvpIntro || ''}
          onChange={(v) => onUpdate({
            poetry: {
              heroTagline: manifest.poetry?.heroTagline ?? '',
              closingLine: manifest.poetry?.closingLine ?? '',
              rsvpIntro: v,
              welcomeStatement: manifest.poetry?.welcomeStatement,
              milestones: manifest.poetry?.milestones,
            },
          })}
          rows={2}
          placeholder="We can't wait to celebrate with you..."
        />
        <Field
          label="Section Title"
          value={(config.title as string) || ''}
          onChange={(v) => updateBlockConfig({ title: v })}
          placeholder="RSVP"
        />
        <Field
          label="RSVP Deadline"
          value={manifest.logistics?.rsvpDeadline || ''}
          onChange={(v) => onUpdate({
            logistics: { ...(manifest.logistics || {}), rsvpDeadline: v },
          })}
          placeholder="2026-06-01"
        />
      </div>
    </div>
  );
}

// ── Registry Settings ───────────────────────────────────────

function RegistrySettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  const registry = manifest.registry ?? { enabled: true };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Registry Message"
          value={registry.message || ''}
          onChange={(v) => onUpdate({ registry: { ...registry, message: v } })}
          rows={3}
          placeholder="Your presence is the greatest gift..."
        />
        <Field
          label="Cash Fund URL"
          value={registry.cashFundUrl || ''}
          onChange={(v) => onUpdate({ registry: { ...registry, cashFundUrl: v } })}
          placeholder="https://..."
        />
        <Field
          label="Cash Fund Note"
          value={registry.cashFundMessage || ''}
          onChange={(v) => onUpdate({ registry: { ...registry, cashFundMessage: v } })}
          rows={2}
          placeholder="For our honeymoon fund..."
        />
      </div>
    </div>
  );
}

// ── Travel Settings ─────────────────────────────────────────

function TravelSettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  const travel = manifest.travelInfo || { airports: [], hotels: [] };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Nearest Airport"
          value={travel.airports?.[0] || ''}
          onChange={(v) => onUpdate({
            travelInfo: { ...travel, airports: [v, ...(travel.airports?.slice(1) || [])] },
          })}
          placeholder="JFK International Airport"
        />
        <Field
          label="Parking Info"
          value={travel.parkingInfo || ''}
          onChange={(v) => onUpdate({
            travelInfo: { ...travel, parkingInfo: v },
          })}
          rows={2}
          placeholder="Free parking available at the venue..."
        />
        <Field
          label="Directions"
          value={travel.directions || ''}
          onChange={(v) => onUpdate({
            travelInfo: { ...travel, directions: v },
          })}
          rows={3}
          placeholder="From the airport, take..."
        />
      </div>
    </div>
  );
}

// ── FAQ Settings ────────────────────────────────────────────

function FaqSettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  const faqs: FaqItem[] = manifest.faqs || [];

  const updateFaq = (index: number, data: Partial<FaqItem>) => {
    const updated = faqs.map((f, i) => i === index ? { ...f, ...data } : f);
    onUpdate({ faqs: updated });
  };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        {faqs.length === 0 && (
          <div style={{ color: 'var(--pl-muted)', fontSize: 'var(--pl-text-sm)' }}>
            No FAQs yet. Add your first question and answer.
          </div>
        )}
        {faqs.map((faq, i) => (
          <div key={faq.id} style={{
            padding: 12, borderRadius: 10,
            border: '1px solid var(--pl-black-6)',
            background: 'var(--pl-glass-light)',
          }}>
            <Field
              label={`Question ${i + 1}`}
              value={faq.question}
              onChange={(v) => updateFaq(i, { question: v })}
              placeholder="Will there be parking?"
            />
            <div style={{ height: 8 }} />
            <Field
              label="Answer"
              value={faq.answer}
              onChange={(v) => updateFaq(i, { answer: v })}
              rows={2}
              placeholder="Yes! Free parking is available..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Spotify Settings ────────────────────────────────────────

function SpotifySettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Spotify Playlist URL"
          value={manifest.spotifyUrl || ''}
          onChange={(v) => onUpdate({ spotifyUrl: v })}
          placeholder="https://open.spotify.com/playlist/..."
        />
        <Field
          label="Playlist Name"
          value={manifest.spotifyPlaylistName || ''}
          onChange={(v) => onUpdate({ spotifyPlaylistName: v })}
          placeholder="Our Soundtrack"
        />
      </div>
    </div>
  );
}

// ── Hashtag Settings ────────────────────────────────────────

function HashtagSettings({
  manifest,
  onUpdate,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
}) {
  const hashtags: string[] = manifest.hashtags || [];

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Primary Hashtag"
          value={hashtags[0] || ''}
          onChange={(v) => {
            const updated = [v, ...hashtags.slice(1)];
            onUpdate({ hashtags: updated });
          }}
          placeholder="#JessAndTomForever"
        />
        <Field
          label="Secondary Hashtag"
          value={hashtags[1] || ''}
          onChange={(v) => {
            const updated = [hashtags[0] || '', v, ...hashtags.slice(2)];
            onUpdate({ hashtags: updated });
          }}
          placeholder="#SmithWedding2026"
        />
      </div>
    </div>
  );
}

// ── Generic Block Settings ──────────────────────────────────

function BlockSettings({
  manifest,
  onUpdate,
  blockType,
  label,
}: {
  manifest: StoryManifest;
  onUpdate: (u: Partial<StoryManifest>) => void;
  blockType: string;
  label: string;
}) {
  const block = manifest.blocks?.find((b) => b.type === blockType);
  const config = block?.config || {};

  const updateBlockConfig = (updates: Record<string, unknown>) => {
    const blocks = (manifest.blocks || []).map((b) =>
      b.type === blockType ? { ...b, config: { ...b.config, ...updates } } : b
    );
    onUpdate({ blocks });
  };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <Field
          label="Section Title"
          value={(config.title as string) || ''}
          onChange={(v) => updateBlockConfig({ title: v })}
          placeholder={label}
        />
        <Field
          label="Subtitle"
          value={(config.subtitle as string) || ''}
          onChange={(v) => updateBlockConfig({ subtitle: v })}
          placeholder="Optional subtitle..."
        />
        {(blockType === 'text' || blockType === 'quote') && (
          <Field
            label={blockType === 'quote' ? 'Quote Text' : 'Content'}
            value={(config.text as string) || ''}
            onChange={(v) => updateBlockConfig({ text: v })}
            rows={4}
            placeholder={blockType === 'quote' ? 'Enter your quote...' : 'Enter text content...'}
          />
        )}
        {blockType === 'video' && (
          <Field
            label="Video URL"
            value={(config.url as string) || ''}
            onChange={(v) => updateBlockConfig({ url: v })}
            placeholder="https://youtube.com/watch?v=..."
          />
        )}
        {blockType === 'map' && (
          <Field
            label="Map URL / Place ID"
            value={(config.url as string) || ''}
            onChange={(v) => updateBlockConfig({ url: v })}
            placeholder="Google Maps embed URL..."
          />
        )}
        {blockType === 'countdown' && (
          <>
            <Field
              label="Target Date"
              value={(config.date as string) || ''}
              onChange={(v) => updateBlockConfig({ date: v })}
              placeholder="2025-06-15"
            />
            <Field
              label="Countdown Label"
              value={(config.label as string) || ''}
              onChange={(v) => updateBlockConfig({ label: v })}
              placeholder="Until the big day..."
            />
          </>
        )}
        {blockType === 'divider' && (
          <Field
            label="Symbol"
            value={(config.symbol as string) || ''}
            onChange={(v) => updateBlockConfig({ symbol: v })}
            placeholder="A decorative symbol..."
          />
        )}
        {(blockType === 'vibeQuote' || blockType === 'welcome') && (
          <Field
            label={blockType === 'welcome' ? 'Welcome Statement' : 'Quote Text'}
            value={blockType === 'welcome' ? (manifest.poetry?.welcomeStatement || '') : (manifest.vibeSkin?.dividerQuote || manifest.vibeString || '')}
            onChange={(v) => {
              if (blockType === 'welcome') {
                onUpdate({ poetry: { ...(manifest.poetry as any || {}), welcomeStatement: v } as StoryManifest['poetry'] });
              } else {
                onUpdate({ vibeSkin: manifest.vibeSkin ? { ...manifest.vibeSkin, dividerQuote: v } : manifest.vibeSkin });
              }
            }}
            rows={3}
            placeholder={blockType === 'welcome' ? 'Welcome to our celebration...' : 'A meaningful quote...'}
          />
        )}
        {blockType === 'quiz' && (
          <Field
            label="Quiz Title"
            value={(config.quizTitle as string) || ''}
            onChange={(v) => updateBlockConfig({ quizTitle: v })}
            placeholder="How Well Do You Know Us?"
          />
        )}
        {blockType === 'hashtag' && (
          <Field
            label="Hashtag"
            value={(config.hashtag as string) || ''}
            onChange={(v) => updateBlockConfig({ hashtag: v })}
            placeholder="SmithAndJones2025"
          />
        )}
        {blockType === 'footer' && (
          <Field
            label="Footer Text"
            value={(config.text as string) || (manifest.poetry?.closingLine || '')}
            onChange={(v) => updateBlockConfig({ text: v })}
            placeholder="Made with love"
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shared styles
// ═══════════════════════════════════════════════════════════════

const headerStyle: React.CSSProperties = {
  height: 48,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  borderBottom: '1px solid var(--pl-black-6)',
  background: 'var(--pl-glass-heavy)',
  backdropFilter: 'var(--pl-glass-blur)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
};

const closeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: 'none',
  background: 'var(--pl-black-6)',
  color: 'var(--pl-muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

const scrollArea: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
} as React.CSSProperties;

const sectionPad: React.CSSProperties = {
  padding: 16,
};

const fieldStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};
