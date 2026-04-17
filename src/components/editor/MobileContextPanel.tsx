'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileContextPanel.tsx
// Smart panel that shows the right settings based on what was
// tapped in the mobile preview. Renders inside MobileBottomSheet.
// ─────────────────────────────────────────────────────────────

import { useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, BookOpen, CalendarDays, Mail, Gift, Plane, HelpCircle,
  Camera, MessageSquare, MapPin, Quote, Type, Video, Timer, Minus,
  Music, Hash, Users, Navigation, LayoutGrid, Sparkles, Image,
  Palette, Upload, Loader2,
} from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { Field, lbl, inp } from './editor-utils';
import { ImageManager } from './ImageManager';
import { GalleryPicker } from './GalleryPicker';
import { PRESET_THEMES } from './ThemeSwitcher';
import {
  LAYOUT_OPTIONS,
  MiniDiagram,
  resolveStoryLayout,
  type StoryLayoutType,
} from '@/components/blocks/StoryLayouts';
import type { VibeSkin } from '@/lib/vibe-engine';
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
  description: string;
}> = [
  { id: 'editorial',  label: 'Classic',      glyph: '▤', description: 'Text alongside a featured photo' },
  { id: 'fullbleed',  label: 'Full Photo',   glyph: '▣', description: 'Photo fills the entire width' },
  { id: 'split',      label: 'Side by Side', glyph: '▥', description: 'Photo and text split 50/50' },
  { id: 'cinematic',  label: 'Widescreen',   glyph: '▬', description: 'Panoramic photo with text below' },
  { id: 'gallery',    label: 'Photo Grid',   glyph: '▦', description: 'Multiple photos in a grid layout' },
  { id: 'mosaic',     label: 'Collage',      glyph: '▩', description: 'Photos arranged in an artistic mosaic' },
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
          background: 'rgba(24,24,27,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#18181B',
        }}>
          <Sparkles size={24} />
        </div>
        <div>
          <div style={{
            fontSize: 'var(--pl-text-md)',
            fontWeight: 700,
            color: '#18181B',
            marginBottom: 6,
          }}>
            Tap anything on your site to edit it
          </div>
          <div style={{
            fontSize: 'var(--pl-text-sm)',
            color: '#71717A',
            lineHeight: 1.5,
          }}>
            Select a section, photo, or text area in the preview above to see its settings here.
          </div>
        </div>
      </div>
    );
  }

  const sectionKey = activeSection as SectionType;
  const meta: { icon: React.ElementType; label: string } =
    (SECTION_META as Record<string, { icon: React.ElementType; label: string } | undefined>)[activeSection]
    ?? { icon: LayoutGrid, label: activeSection };
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
              <>
                {/* Quick style — mirrors desktop InlineStylePicker so mobile
                    users can swap fonts / palette / accent without drilling
                    into the Design panel. Positioned at the top of the
                    chapter editor so it's instantly visible on open. */}
                <QuickStyleSection
                  manifest={manifest}
                  onApply={(patch) => actions.handleDesignChange({ ...manifest, ...patch })}
                  onOpenFullPanel={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' })}
                />
                {/* Story layout switcher — compact horizontal pill row that
                    mirrors the desktop InlineStoryLayoutSwitcher. */}
                <MobileStoryLayoutRow
                  manifest={manifest}
                  onApply={(type) =>
                    actions.handleDesignChange({ ...manifest, storyLayout: type, layoutFormat: undefined })
                  }
                />
                <ChapterSettings
                  chapter={chapter}
                  onUpdate={(data) => scheduleChapterUpdate(chapter.id, data)}
                  onRewrite={() => actions.handleAIRewrite(chapter.id)}
                  isRewriting={state.rewritingId === chapter.id}
                />
              </>
            );
          }
        }
        // No specific chapter — still surface quick-style at the top so
        // users can tweak the look even when they haven't picked a chapter.
        return (
          <>
            <QuickStyleSection
              manifest={manifest}
              onApply={(patch) => actions.handleDesignChange({ ...manifest, ...patch })}
              onOpenFullPanel={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' })}
            />
            <MobileStoryLayoutRow
              manifest={manifest}
              onApply={(type) =>
                actions.handleDesignChange({ ...manifest, storyLayout: type, layoutFormat: undefined })
              }
            />
            <div style={{ ...sectionPad, color: '#71717A', fontSize: 'var(--pl-text-sm)' }}>
              Tap a specific chapter in the preview to edit it.
            </div>
          </>
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
        // Show event list with add/delete + tap to edit
        const events = manifest.events || [];
        return (
          <div style={sectionPad}>
            <div style={fieldStack}>
              {events.length === 0 && (
                <div style={{ color: '#71717A', fontSize: 'var(--pl-text-sm)', lineHeight: 1.5 }}>
                  No events yet. Add your ceremony, reception, and more.
                </div>
              )}
              {events.map((ev, i) => (
                <div key={ev.id} style={{
                  padding: 12, borderRadius: 10,
                  border: '1px solid var(--pl-black-6)',
                  background: 'var(--pl-glass-light)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#18181B' }}>{ev.name || `Event ${i + 1}`}</div>
                    <button
                      onClick={() => scheduleManifestUpdate({ events: events.filter(e => e.id !== ev.id) })}
                      style={{ background: 'none', border: 'none', color: '#e87171', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                    >Remove</button>
                  </div>
                  <EventSettings
                    event={ev}
                    onUpdate={(data) => {
                      const updated = events.map(e => e.id === ev.id ? { ...e, ...data } : e);
                      scheduleManifestUpdate({ events: updated });
                    }}
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const newEvent: WeddingEvent = {
                    id: `event-${Date.now()}`, name: '', type: 'other',
                    date: manifest.logistics?.date || '', time: '', venue: '', address: '',
                  };
                  scheduleManifestUpdate({ events: [...events, newEvent] });
                }}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  border: '2px dashed #E4E4E7', background: 'rgba(24,24,27,0.03)',
                  color: '#18181B', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >+ Add Event</button>
            </div>
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
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="text" label="Text Section" />;

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
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="photoWall" label="Guest Photo Wall" />;

      case 'gallery':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="gallery" label="Photo Collage" />;

      case 'footer':
        return <BlockSettings manifest={manifest} onUpdate={scheduleManifestUpdate} blockType="footer" label="Footer" />;

      default:
        return (
          <div style={{ ...sectionPad, color: '#71717A', fontSize: 'var(--pl-text-sm)' }}>
            Settings for this section are not yet available.
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Sticky header — pinned inside the sheet scroll container ── */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(24,24,27,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#18181B',
            flexShrink: 0,
          }}>
            <SectionIcon size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--pl-text-sm)',
              fontWeight: 700,
              color: '#18181B',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {meta.label}
            </div>
            <div style={{
              fontSize: 'var(--pl-text-2xs)',
              color: '#71717A',
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

      {/* ── Content (no nested scroll — relies on sheet's scroll container) ── */}
      <div style={contentArea}>
        {renderContent()}
      </div>

      {/* ── Save feedback indicator ── */}
      <SaveIndicator />
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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
          className={dragOver ? 'pl-dropzone-active' : undefined}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) handleFileUpload(file);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px dashed ${dragOver ? '#71717A' : 'rgba(255,255,255,0.5)'}`,
            background: dragOver ? 'rgba(24,24,27,0.04)' : 'rgba(255,255,255,0.35)',
            textAlign: 'left' as const, width: '100%',
            transition: 'border-color 0.25s ease, background 0.25s ease',
          }}
        >
          {uploading ? (
            <Loader2 size={18} style={{ color: '#18181B', animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={18} className="pl-dropzone-icon" style={{ color: '#18181B', transition: 'transform 0.2s ease' }} />
          )}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#18181B' }}>
              {uploading ? 'Uploading...' : dragOver ? 'Drop image here' : 'Upload from Device'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#71717A' }}>
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
            padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            border: '1px solid #E4E4E7',
            background: '#FFFFFF',
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
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#18181B' }}>
              Google Photos
            </div>
            <div style={{ fontSize: '0.65rem', color: '#71717A' }}>
              Pick from your library
            </div>
          </div>
        </button>

        {/* Choose from Gallery */}
        <button
          onClick={() => setGalleryOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            border: '1.5px dashed #E4E4E7',
            background: 'rgba(24,24,27,0.04)',
            textAlign: 'left' as const, width: '100%',
          }}
        >
          <Image size={18} style={{ color: '#18181B' }} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#18181B' }}>
              Choose from Gallery
            </div>
            <div style={{ fontSize: '0.65rem', color: '#71717A' }}>
              Reuse photos from your sites
            </div>
          </div>
        </button>
      </div>

      <GalleryPicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => onPhotoChange(url)}
      />

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
          placeholder="e.g., We're so happy you're here to celebrate with us..."
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
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--pl-black-6)',
                  background: i === 0 ? 'rgba(24,24,27,0.06)' : 'transparent',
                  color: i === 0 ? '#18181B' : '#71717A',
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
              fontFamily: 'inherit',
              fontSize: 'max(16px, 1.15rem)',
              fontWeight: 700,
              
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
                border: '1px solid rgba(24,24,27,0.15)',
                background: 'rgba(24,24,27,0.04)',
                color: isRewriting ? 'rgba(24,24,27,0.2)' : '#18181B',
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
              fontFamily: 'var(--pl-font-body)',
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
            {LAYOUTS.map(({ id, label, glyph, description }) => {
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
                    padding: '8px 10px', borderRadius: 10,
                    border: active ? '1px solid rgba(24,24,27,0.25)' : '1px solid var(--pl-black-6)',
                    background: active ? 'rgba(24,24,27,0.06)' : 'rgba(24,24,27,0.03)',
                    color: active ? '#18181B' : '#71717A',
                    cursor: 'pointer', minWidth: 72,
                    transition: 'all 0.15s',
                  }}
                  title={description}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{glyph}</span>
                  <span style={{
                    fontSize: 'var(--pl-text-2xs)', fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 500,
                    color: active ? '#18181B' : '#71717A',
                    opacity: 0.75, lineHeight: 1.2,
                    textAlign: 'center', maxWidth: 80,
                  }}>
                    {description}
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
          placeholder="e.g., 4:00 PM"
          type="time"
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
          placeholder="e.g., Black Tie, Cocktail, Casual"
        />
        <Field
          label="Description"
          value={event.description || ''}
          onChange={(v) => onUpdate({ description: v })}
          rows={3}
          placeholder="Tell your guests what to expect at this event"
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

  const DESKTOP_NAV_STYLES = [
    { id: 'glass', label: 'Glass', desc: 'Frosted blur' },
    { id: 'minimal', label: 'Minimal', desc: 'Clean line' },
    { id: 'solid', label: 'Solid', desc: 'White bar' },
    { id: 'editorial', label: 'Editorial', desc: 'Centered' },
    { id: 'floating', label: 'Floating', desc: 'Pill shape' },
  ];

  const MOBILE_NAV_STYLES = [
    { id: 'classic', label: 'Classic', desc: 'Top + hamburger' },
    { id: 'compact-glass', label: 'Compact', desc: 'Thin glass bar' },
    { id: 'floating-pill', label: 'Pill', desc: 'Centered pill' },
    { id: 'bottom-tabs', label: 'Tabs', desc: 'Bottom tab bar' },
    { id: 'hidden', label: 'Hidden', desc: 'Hamburger only' },
  ];

  const FONT_OPTIONS = [
    'Playfair Display', 'Cormorant Garamond', 'Lora', 'Libre Baskerville',
    'Dancing Script', 'Great Vibes', 'Josefin Sans', 'DM Sans',
    'Montserrat', 'Inter', 'Raleway', 'Open Sans', 'Source Sans 3', 'Lato',
  ];

  const NAV_BG_PRESETS = [
    { label: 'Auto', value: '' },
    { label: 'White', value: 'rgba(255,255,255,0.9)' },
    { label: 'Cream', value: 'rgba(245,241,232,0.92)' },
    { label: 'Dark', value: 'rgba(28,28,28,0.85)' },
    { label: 'Black', value: 'rgba(0,0,0,0.7)' },
  ];

  const selectStyle: React.CSSProperties = {
    ...inp,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9488' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '32px',
  };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        <div style={{ fontSize: 'var(--pl-text-sm)', color: '#71717A', lineHeight: 1.5, marginBottom: 4 }}>
          {section === 'nav' ? 'Customize the navigation bar.' : 'Customize the footer.'}
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

        {/* ── Page Layout Mode ── */}
        {section === 'nav' && (
          <div>
            <label style={lbl}>Site Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {([
                { id: 'multi-page', label: 'Separate Pages', desc: 'Each section is its own page' },
                { id: 'single-scroll', label: 'Single Scroll', desc: 'One long scrollable page' },
              ] as const).map(mode => {
                const active = (manifest.pageMode || 'multi-page') === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onUpdate({ pageMode: mode.id })}
                    style={{
                      padding: '10px 6px', borderRadius: 12, textAlign: 'center',
                      border: active ? '2px solid #18181B' : '1px solid rgba(0,0,0,0.06)',
                      background: active ? 'rgba(24,24,27,0.04)' : 'rgba(255,255,255,0.75)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? '#18181B' : '#18181B' }}>{mode.label}</div>
                    <div style={{ fontSize: '0.55rem', color: '#71717A', marginTop: 2 }}>{mode.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Desktop Nav Style ── */}
        {section === 'nav' && (
          <div>
            <label style={lbl}>Desktop Style</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {DESKTOP_NAV_STYLES.map(s => {
                const active = (manifest.navStyle || 'glass') === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onUpdate({ navStyle: s.id as StoryManifest['navStyle'] })}
                    style={{
                      padding: '10px 6px', borderRadius: 10, textAlign: 'center',
                      border: active ? '2px solid #18181B' : '1px solid rgba(0,0,0,0.06)',
                      background: active ? 'rgba(24,24,27,0.04)' : 'rgba(255,255,255,0.75)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? '#18181B' : '#18181B' }}>{s.label}</div>
                    <div style={{ fontSize: '0.55rem', color: '#71717A', marginTop: 2 }}>{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Mobile Nav Style ── */}
        {section === 'nav' && (
          <div>
            <label style={lbl}>Mobile Style</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {MOBILE_NAV_STYLES.map(s => {
                const active = (manifest.mobileNavStyle || 'classic') === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onUpdate({ mobileNavStyle: s.id as StoryManifest['mobileNavStyle'] })}
                    style={{
                      padding: '10px 6px', borderRadius: 10, textAlign: 'center',
                      border: active ? '2px solid #18181B' : '1px solid rgba(0,0,0,0.06)',
                      background: active ? 'rgba(24,24,27,0.04)' : 'rgba(255,255,255,0.75)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? '#18181B' : '#18181B' }}>{s.label}</div>
                    <div style={{ fontSize: '0.55rem', color: '#71717A', marginTop: 2 }}>{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Nav Opacity ── */}
        {section === 'nav' && (
          <div>
            <label style={lbl}>Opacity — {manifest.navOpacity ?? 100}%</label>
            <input
              type="range" min={0} max={100} step={5}
              value={manifest.navOpacity ?? 100}
              onChange={e => onUpdate({ navOpacity: Number(e.target.value) })}
              style={{ width: '100%', accentColor: '#18181B' }}
            />
          </div>
        )}

        {/* ── Nav Background Presets ── */}
        {section === 'nav' && (
          <div>
            <label style={lbl}>Nav Background</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {NAV_BG_PRESETS.map(p => {
                const active = (manifest.navBackground || '') === p.value;
                return (
                  <button
                    key={p.label}
                    onClick={() => onUpdate({ navBackground: p.value || undefined })}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 600,
                      border: active ? '2px solid #18181B' : '1px solid rgba(0,0,0,0.06)',
                      background: active ? 'rgba(24,24,27,0.04)' : 'rgba(255,255,255,0.75)',
                      color: active ? '#18181B' : '#71717A',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {p.value && <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.value, border: '1px solid rgba(0,0,0,0.1)' }} />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Colors ── */}
        <div>
          <label style={lbl}>Background Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" value={colors.background || '#FFFDF8'}
              onChange={e => onUpdate({ theme: { ...theme, colors: { ...colors, background: e.target.value } } })}
              style={{ width: 52, height: 44, padding: 3, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            />
            <span style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'monospace' }}>{colors.background || '#FFFDF8'}</span>
          </div>
        </div>

        <div>
          <label style={lbl}>Accent Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" value={colors.accent || '#71717A'}
              onChange={e => onUpdate({ theme: { ...theme, colors: { ...colors, accent: e.target.value } } })}
              style={{ width: 52, height: 44, padding: 3, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            />
            <span style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'monospace' }}>{colors.accent || '#71717A'}</span>
          </div>
        </div>

        {/* ── Font Selectors (dropdowns, not text inputs) ── */}
        <div>
          <label style={lbl}>Heading Font</label>
          <select
            value={theme.fonts?.heading || 'Playfair Display'}
            onChange={e => onUpdate({ theme: { ...theme, fonts: { ...(theme.fonts || {}), heading: e.target.value } } })}
            style={selectStyle}
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Body Font</label>
          <select
            value={theme.fonts?.body || 'Inter'}
            onChange={e => onUpdate({ theme: { ...theme, fonts: { ...(theme.fonts || {}), body: e.target.value } } })}
            style={selectStyle}
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
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
          placeholder="e.g., June 1, 2026"
          hint="The last day guests can respond to your invitation"
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
          label="Cash Fund Link"
          value={registry.cashFundUrl || ''}
          onChange={(v) => onUpdate({ registry: { ...registry, cashFundUrl: v } })}
          placeholder="e.g., Venmo, PayPal, or GoFundMe link"
          hint="Paste the link where guests can send a contribution"
        />
        <Field
          label="Cash Fund Note"
          value={registry.cashFundMessage || ''}
          onChange={(v) => onUpdate({ registry: { ...registry, cashFundMessage: v } })}
          rows={2}
          placeholder="For our honeymoon fund..."
        />

        {/* Registry links */}
        <div>
          <label style={lbl}>Registry Links</label>
          {(registry.entries || []).map((entry, i) => (
            <div key={i} style={{
              padding: 12, borderRadius: 10, marginBottom: 8,
              border: '1px solid var(--pl-black-6)', background: 'var(--pl-glass-light)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#3F3F46' }}>{entry.name || `Registry ${i + 1}`}</span>
                <button
                  onClick={() => {
                    const entries = (registry.entries || []).filter((_, j) => j !== i);
                    onUpdate({ registry: { ...registry, entries } });
                  }}
                  style={{ background: 'none', border: 'none', color: '#e87171', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer' }}
                >Remove</button>
              </div>
              <Field label="Name" value={entry.name || ''} onChange={(v) => {
                const entries = [...(registry.entries || [])];
                entries[i] = { ...entries[i], name: v };
                onUpdate({ registry: { ...registry, entries } });
              }} placeholder="Amazon, Zola, Target..." />
              <div style={{ height: 6 }} />
              <Field label="Registry Link" value={entry.url || ''} onChange={(v) => {
                const entries = [...(registry.entries || [])];
                entries[i] = { ...entries[i], url: v };
                onUpdate({ registry: { ...registry, entries } });
              }} placeholder="Paste the link to your registry page" />
            </div>
          ))}
          <button
            onClick={() => {
              const entries = [...(registry.entries || []), { name: '', url: '' }];
              onUpdate({ registry: { ...registry, entries } });
            }}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              border: '2px dashed #E4E4E7', background: 'rgba(24,24,27,0.03)',
              color: '#18181B', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >+ Add Registry</button>
        </div>
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

        {/* Hotel list */}
        <div>
          <label style={lbl}>Hotels</label>
          {(travel.hotels || []).map((hotel, i) => (
            <div key={i} style={{
              padding: 12, borderRadius: 10, marginBottom: 8,
              border: '1px solid var(--pl-black-6)', background: 'var(--pl-glass-light)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#3F3F46' }}>Hotel {i + 1}</span>
                <button
                  onClick={() => onUpdate({ travelInfo: { ...travel, hotels: (travel.hotels || []).filter((_, j) => j !== i) } })}
                  style={{ background: 'none', border: 'none', color: '#e87171', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer' }}
                >Remove</button>
              </div>
              <Field label="Name" value={hotel.name || ''} onChange={(v) => {
                const hotels = [...(travel.hotels || [])];
                hotels[i] = { ...hotels[i], name: v };
                onUpdate({ travelInfo: { ...travel, hotels } });
              }} placeholder="Hotel name" />
              <div style={{ height: 6 }} />
              <Field label="Address" value={hotel.address || ''} onChange={(v) => {
                const hotels = [...(travel.hotels || [])];
                hotels[i] = { ...hotels[i], address: v };
                onUpdate({ travelInfo: { ...travel, hotels } });
              }} placeholder="Hotel address" />
              <div style={{ height: 6 }} />
              <Field label="Booking Link" value={hotel.bookingUrl || ''} onChange={(v) => {
                const hotels = [...(travel.hotels || [])];
                hotels[i] = { ...hotels[i], bookingUrl: v };
                onUpdate({ travelInfo: { ...travel, hotels } });
              }} placeholder="Paste the hotel's booking page link" />
              <div style={{ height: 6 }} />
              <Field label="Group Rate" value={hotel.groupRate || ''} onChange={(v) => {
                const hotels = [...(travel.hotels || [])];
                hotels[i] = { ...hotels[i], groupRate: v };
                onUpdate({ travelInfo: { ...travel, hotels } });
              }} placeholder="e.g., Use code SMITH2025 for a discounted rate" />
            </div>
          ))}
          <button
            onClick={() => onUpdate({ travelInfo: { ...travel, hotels: [...(travel.hotels || []), { name: '', address: '' }] } })}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              border: '2px dashed #E4E4E7', background: 'rgba(24,24,27,0.03)',
              color: '#18181B', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >+ Add Hotel</button>
        </div>
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

  const addFaq = () => {
    onUpdate({ faqs: [...faqs, { id: `faq-${Date.now()}`, question: '', answer: '', order: faqs.length }] });
  };

  const removeFaq = (index: number) => {
    onUpdate({ faqs: faqs.filter((_, i) => i !== index) });
  };

  return (
    <div style={sectionPad}>
      <div style={fieldStack}>
        {faqs.length === 0 && (
          <div style={{ color: '#71717A', fontSize: 'var(--pl-text-sm)', lineHeight: 1.5 }}>
            No FAQs yet. Add common questions your guests might have.
          </div>
        )}
        {faqs.map((faq, i) => (
          <div key={faq.id} style={{
            padding: 12, borderRadius: 10,
            border: '1px solid var(--pl-black-6)',
            background: 'var(--pl-glass-light)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Q{i + 1}</span>
              <button onClick={() => removeFaq(i)} style={{ background: 'none', border: 'none', color: '#e87171', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}>Remove</button>
            </div>
            <Field
              label="Question"
              value={faq.question}
              onChange={(v) => updateFaq(i, { question: v })}
              placeholder="e.g., Is there parking at the venue?"
            />
            <div style={{ height: 8 }} />
            <Field
              label="Answer"
              value={faq.answer}
              onChange={(v) => updateFaq(i, { answer: v })}
              rows={2}
              placeholder="e.g., Yes! Free parking is available in the lot behind the building."
            />
          </div>
        ))}
        <button
          onClick={addFaq}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            border: '2px dashed #E4E4E7', background: 'rgba(24,24,27,0.03)',
            color: '#18181B', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >+ Add Question</button>
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
          label="Spotify Link"
          value={manifest.spotifyUrl || ''}
          onChange={(v) => onUpdate({ spotifyUrl: v })}
          placeholder="Paste your Spotify playlist link"
          hint="Open Spotify, go to your playlist, tap Share, then Copy Link"
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
          hint="Your guests will use this to share photos on social media"
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
        {blockType === 'text' && (
          <Field
            label="Content"
            value={(config.content as string) || (config.text as string) || ''}
            onChange={(v) => updateBlockConfig({ content: v })}
            rows={4}
            placeholder="Write anything here — a welcome message, a story, or a note to your guests"
          />
        )}
        {blockType === 'quote' && (
          <>
            <Field
              label="Quote Text"
              value={(config.text as string) || (config.quote as string) || ''}
              onChange={(v) => updateBlockConfig({ text: v })}
              rows={3}
              placeholder="Love is composed of a single soul..."
            />
            <Field
              label="Who said this?"
              value={(config.author as string) || (config.attribution as string) || ''}
              onChange={(v) => updateBlockConfig({ author: v })}
              placeholder="e.g., — Shakespeare"
            />
          </>
        )}
        {blockType === 'video' && (
          <Field
            label="Video Link"
            value={(config.url as string) || ''}
            onChange={(v) => updateBlockConfig({ url: v })}
            placeholder="Paste a YouTube or Vimeo link"
            hint="Copy the link from your browser when watching the video"
          />
        )}
        {blockType === 'guestbook' && (
          <Field
            label="Prompt Text"
            value={(config.prompt as string) || ''}
            onChange={(v) => updateBlockConfig({ prompt: v })}
            rows={2}
            placeholder="e.g., Share a favorite memory or wish for the couple"
          />
        )}
        {(blockType === 'photos' || blockType === 'gallery' || blockType === 'photoWall') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...lbl, marginBottom: 0 }}>Show Captions</span>
            <button
              onClick={() => updateBlockConfig({ showCaptions: !config.showCaptions })}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: config.showCaptions ? '#18181B' : 'rgba(0,0,0,0.12)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: 'white',
                position: 'absolute', top: 2,
                left: config.showCaptions ? 20 : 2,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>
        )}
        {blockType === 'map' && (
          <Field
            label="Venue Address"
            value={(config.url as string) || ''}
            onChange={(v) => updateBlockConfig({ url: v })}
            placeholder={manifest.events?.[0]?.address || manifest.logistics?.venueAddress || 'e.g., 123 Main St, New York, NY'}
            hint="Just type the address and we will show it on a map"
          />
        )}
        {blockType === 'countdown' && (
          <>
            <div>
              <label style={lbl}>Target Date</label>
              <input
                type="date"
                value={(config.date as string) || manifest.events?.[0]?.date || manifest.logistics?.date || ''}
                onChange={(e) => updateBlockConfig({ date: e.target.value })}
                style={inp}
              />
              {!((config.date as string) || manifest.events?.[0]?.date || manifest.logistics?.date) && (
                <p style={{ fontSize: '0.55rem', color: '#71717A', marginTop: '4px', lineHeight: 1.4 }}>This is when the countdown timer reaches zero</p>
              )}
            </div>
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
            placeholder={blockType === 'welcome' ? "e.g., We're so happy you're here to celebrate with us..." : 'A meaningful quote...'}
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
            hint="Your guests will use this to share photos on social media"
          />
        )}
        {blockType === 'footer' && (
          <Field
            label="Footer Text"
            value={(config.text as string) || (manifest.poetry?.closingLine || '')}
            onChange={(v) => updateBlockConfig({ text: v })}
            placeholder="e.g., Made with love by Sarah & James"
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Quick Style — mobile mirror of InlineStylePicker (desktop)
// Same font-pair / palette / accent swatches, same preset data
// (PRESET_THEMES), same manifest-write pattern (updates both
// vibeSkin.* and theme.* so downstream consumers stay in sync).
// ═══════════════════════════════════════════════════════════════

// Curated subset — identical choices to InlineStylePicker so desktop
// and mobile feel like the same feature.
const MOBILE_FONT_SWATCH_NAMES = [
  'Ivory Garden',
  'Midnight Luxe',
  'Coastal Breeze',
  'Blush Editorial',
  'Art Deco Glamour',
];

const MOBILE_PALETTE_SWATCH_NAMES = [
  'Ivory Garden',
  'Midnight Luxe',
  'Coastal Breeze',
  'Forest Romance',
  'Blush Editorial',
  'Golden Hour',
];

const MOBILE_ACCENT_SWATCH_NAMES = [
  'Ivory Garden',
  'Midnight Luxe',
  'Blush Editorial',
  'Coastal Breeze',
  'Art Deco Glamour',
  'Garden Party',
];

const pickMobilePreset = (name: string) =>
  PRESET_THEMES.find((p) => p.name === name);

// ── Mobile story-layout switcher ─────────────────────────────
// Compact horizontal pill row that mirrors the desktop
// InlineStoryLayoutSwitcher. Tapping a pill applies the layout
// immediately via actions.handleDesignChange.
function MobileStoryLayoutRow({
  manifest,
  onApply,
}: {
  manifest: StoryManifest;
  onApply: (type: StoryLayoutType) => void;
}) {
  const active = resolveStoryLayout(manifest.storyLayout, manifest.layoutFormat);
  return (
    <div
      style={{
        padding: '10px 12px 12px',
        borderBottom: '1px solid var(--pl-black-6)',
        background: 'var(--pl-glass-light)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--pl-text-2xs)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#71717A',
          marginBottom: 8,
        }}
      >
        Story layout
      </div>
      <div
        role="toolbar"
        aria-label="Story layout"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {LAYOUT_OPTIONS.map((opt) => {
          const isActive = opt.type === active;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                if (opt.type !== active) onApply(opt.type);
              }}
              title={opt.desc}
              aria-pressed={isActive}
              style={{
                flex: '0 0 auto',
                minWidth: 56,
                width: 72,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 4,
                padding: 6,
                borderRadius: 10,
                background: isActive ? '#FFFFFF' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? '#18181B' : 'rgba(24,24,27,0.08)',
                boxShadow: isActive ? '0 0 0 2px rgba(24,24,27,0.12)' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: '#18181B',
                textAlign: 'center',
              }}
            >
              <div style={{ width: '100%', pointerEvents: 'none' }}>
                <MiniDiagram type={opt.type} />
              </div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: isActive ? '#18181B' : '#52525B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {opt.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickStyleSection({
  manifest,
  onApply,
  onOpenFullPanel,
}: {
  manifest: StoryManifest;
  onApply: (patch: Partial<StoryManifest>) => void;
  onOpenFullPanel: () => void;
}) {
  // ── Apply helpers — mirror InlineStylePicker.applyFonts/Palette/Accent.
  // Both vibeSkin.* and theme.* are written so the manifest stays
  // self-consistent across the engine and the renderer.
  const applyFonts = (fonts: VibeSkin['fonts']) => {
    if (!manifest) return;
    onApply({
      theme: { ...manifest.theme, fonts: { heading: fonts.heading, body: fonts.body } },
      vibeSkin: manifest.vibeSkin
        ? { ...manifest.vibeSkin, fonts: { ...manifest.vibeSkin.fonts, ...fonts } }
        : manifest.vibeSkin,
    });
  };

  const applyPalette = (palette: VibeSkin['palette']) => {
    if (!manifest) return;
    onApply({
      vibeSkin: manifest.vibeSkin
        ? { ...manifest.vibeSkin, palette: { ...manifest.vibeSkin.palette, ...palette } }
        : manifest.vibeSkin,
      theme: {
        ...manifest.theme,
        colors: {
          ...manifest.theme.colors,
          background: palette.background,
          foreground: palette.foreground,
          accent: palette.accent,
          muted: palette.muted,
        },
      },
    });
  };

  const applyAccent = (accent: string) => {
    if (!manifest) return;
    onApply({
      vibeSkin: manifest.vibeSkin
        ? {
            ...manifest.vibeSkin,
            palette: { ...manifest.vibeSkin.palette, accent },
          }
        : manifest.vibeSkin,
      theme: {
        ...manifest.theme,
        colors: { ...manifest.theme.colors, accent },
      },
    });
  };

  return (
    <div
      style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--pl-black-6)',
        background: 'var(--pl-glass-light)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--pl-text-2xs)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#71717A',
          marginBottom: 8,
        }}
      >
        Quick style
      </div>

      {/* Fonts */}
      <QuickStyleLabel>Font pair</QuickStyleLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {MOBILE_FONT_SWATCH_NAMES.map((name) => {
          const p = pickMobilePreset(name);
          if (!p) return null;
          const active =
            manifest?.vibeSkin?.fonts?.heading === p.fonts.heading &&
            manifest?.vibeSkin?.fonts?.body === p.fonts.body;
          return (
            <button
              key={name}
              type="button"
              onClick={() => applyFonts(p.fonts)}
              aria-label={`Apply ${name} fonts`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 10,
                minHeight: 44,
                padding: '10px 12px',
                borderRadius: 10,
                background: active ? 'rgba(24,24,27,0.06)' : 'rgba(255,255,255,0.6)',
                border: active
                  ? '1px solid rgba(24,24,27,0.25)'
                  : '1px solid var(--pl-black-6)',
                color: '#18181B',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                style={{
                  fontFamily: `'${p.fonts.heading}', serif`,
                  fontSize: 17,
                  lineHeight: 1.1,
                  letterSpacing: '0.01em',
                  color: '#18181B',
                }}
              >
                {p.fonts.heading}
              </span>
              <span
                style={{
                  fontFamily: `'${p.fonts.body}', sans-serif`,
                  fontSize: 11,
                  color: '#71717A',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.fonts.body}
              </span>
            </button>
          );
        })}
      </div>

      {/* Palette — 2-column grid of striped swatches */}
      <QuickStyleLabel>Color palette</QuickStyleLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {MOBILE_PALETTE_SWATCH_NAMES.map((name) => {
          const p = pickMobilePreset(name);
          if (!p) return null;
          const active =
            manifest?.vibeSkin?.palette?.background === p.palette.background &&
            manifest?.vibeSkin?.palette?.accent === p.palette.accent;
          const stripes: Array<{ color: string; key: string }> = [
            { key: 'bg', color: p.palette.background },
            { key: 'accent', color: p.palette.accent },
            { key: 'accent2', color: p.palette.accent2 },
            { key: 'ink', color: p.palette.ink },
          ];
          return (
            <button
              key={name}
              type="button"
              onClick={() => applyPalette(p.palette)}
              aria-label={`Apply ${name} palette`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minHeight: 56,
                padding: 8,
                borderRadius: 10,
                background: active ? 'rgba(24,24,27,0.06)' : 'rgba(255,255,255,0.6)',
                border: active
                  ? '1px solid rgba(24,24,27,0.25)'
                  : '1px solid var(--pl-black-6)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  height: 18,
                  borderRadius: 5,
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                {stripes.map((s) => (
                  <div key={s.key} style={{ flex: 1, background: s.color }} />
                ))}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#18181B',
                  letterSpacing: '0.01em',
                  lineHeight: 1.2,
                }}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accent — circular swatches, ≥44px hit area */}
      <QuickStyleLabel>Accent color</QuickStyleLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 6, justifyContent: 'space-between' }}>
        {MOBILE_ACCENT_SWATCH_NAMES.map((name) => {
          const p = pickMobilePreset(name);
          if (!p) return null;
          const active = manifest?.vibeSkin?.palette?.accent === p.palette.accent;
          return (
            <button
              key={name}
              type="button"
              onClick={() => applyAccent(p.palette.accent)}
              aria-label={`${name} accent`}
              title={`${name} accent`}
              style={{
                flex: 1,
                minWidth: 44,
                minHeight: 44,
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: p.palette.accent,
                border: active
                  ? '2px solid #18181B'
                  : '2px solid rgba(0,0,0,0.08)',
                boxShadow: active
                  ? '0 0 0 2px rgba(24,24,27,0.15)'
                  : 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
      </div>

      {/* More options escape hatch → opens the full Design panel */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 6,
        }}
      >
        <button
          type="button"
          onClick={onOpenFullPanel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 10px',
            minHeight: 36,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: '#71717A',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          More options →
        </button>
      </div>
    </div>
  );
}

function QuickStyleLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: '#71717A',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Save Indicator — shows brief "Saved" confirmation on changes
// ═══════════════════════════════════════════════════════════════

function SaveIndicator() {
  const { state } = useEditor();
  const [showSaved, setShowSaved] = useState(false);
  const prevSaveStateRef = useRef(state.saveState);

  useEffect(() => {
    // Show "saved" toast when state transitions from unsaved to saved
    if (state.saveState === 'saved' && prevSaveStateRef.current === 'unsaved') {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 1800);
      prevSaveStateRef.current = state.saveState;
      return () => clearTimeout(t);
    }
    prevSaveStateRef.current = state.saveState;
  }, [state.saveState]);

  return (
    <AnimatePresence>
      {showSaved && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: 'var(--pl-text-2xs)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: '#18181B',
            background: 'rgba(24,24,27,0.04)',
            borderTop: '1px solid rgba(24,24,27,0.1)',
            zIndex: 3,
          }}
        >
          Changes saved
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shared styles
// ═══════════════════════════════════════════════════════════════

const headerStyle: React.CSSProperties = {
  height: 52,
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
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: 'var(--pl-black-6)',
  color: '#71717A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

const contentArea: React.CSSProperties = {
  /* No overflow: relies on MobileBottomSheet's scroll container,
     which lets the sticky header actually stick. */
  paddingBottom: 24,
};

const sectionPad: React.CSSProperties = {
  padding: 16,
};

const fieldStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};
