'use client';

/* ========================================================================
   PEARLOOM — WIZARD (v8 handoff port)
   Functional 6-step wizard posting to /api/sites. Matches the handoff
   progress-thread + Pear helper shell.
   ======================================================================== */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Pear, PearloomLogo, Sparkle, Sprig } from '../motifs';
import { OccasionGlyph } from '../icons/OccasionGlyph';
import { Reveal } from '../motion';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { parseLocalDate } from '@/lib/date-utils';
import { TEMPLATES_BY_ID } from '../marketplace/templates-data';
import { EVENT_TYPES, getEventType, recommendTextureFor, lookDefaultsFor, type EventCategory } from '@/lib/event-os/event-types';
import { recommendEdition } from '@/lib/site-editions/resolve';
import { nameModeFor, nameModeIsValid } from '@/lib/event-os/name-mode';
import { questionsFor } from '@/lib/event-os/wizard-questions';
import { NumberInput } from '../editor/v8-forms';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { WizardLocationAutocomplete } from '../wizard/WizardLocationAutocomplete';
import { WizardDatePicker } from '../wizard/WizardDatePicker';
import { GeneratingScreen } from '../wizard/GeneratingScreen';
import { useBackgroundCook, readCookedDecor } from '../wizard/useBackgroundCook';
import {
  useBackgroundManifest,
  buildManifestSignature,
  readCookedManifest,
  type ManifestCookContext,
  type ManifestCookBody,
} from '../wizard/useBackgroundManifest';
import { BackgroundCookPill } from '../wizard/BackgroundCookPill';
import { usePhotoPalette } from '../wizard/usePhotoPalette';
import { useDialog } from '@/components/ui/confirm-dialog';

// Layout step removed 2026-05-30 — Editions (picked later in the
// editor) stamp manifest.storyLayout per Edition, so making the
// host pick a layout in the wizard then potentially have it
// overwritten by an Edition was double work + confusing. Default
// layout 'timeline' stays seeded as st.layout for backward compat
// with the generation pipeline which still reads layoutFormat.
const STEPS = ['Occasion', 'Basics', 'Details', 'Photos', 'Vibe', 'Palette', 'Review'] as const;
type StepKey = (typeof STEPS)[number];

// 8 steps grouped into 4 phases. Pearloom's wizard now reads as
// "you're on Story · 2 of 3" rather than "step 2 of 8" — the
// phase name carries the meaning, the step count is supporting
// chrome. PhaseHeader renders this above the canvas.
type PhaseKey = 'Story' | 'Photos' | 'Look' | 'Review';
const PHASES: Array<{ key: PhaseKey; steps: readonly StepKey[] }> = [
  { key: 'Story', steps: ['Occasion', 'Basics', 'Details'] },
  { key: 'Photos', steps: ['Photos'] },
  { key: 'Look', steps: ['Vibe', 'Palette'] },
  { key: 'Review', steps: ['Review'] },
];
function phaseFor(step: StepKey): PhaseKey {
  return PHASES.find((p) => p.steps.includes(step))?.key ?? 'Story';
}

// Draw occasion list from the Event OS registry (all 28 supported
// events), grouped by category with a friendly icon + tone per card.
interface OccasionCard {
  id: string;
  label: string;
  icon: string;
  tone: 'peach' | 'sage' | 'lavender' | 'cream';
  category: EventCategory;
}
const CATEGORY_LABELS: Record<EventCategory, string> = {
  'wedding-arc': 'Wedding arc',
  family: 'Family & home',
  milestone: 'Milestones',
  cultural: 'Ceremonies & faith',
  commemoration: 'Memorials & reunions',
};
function iconFor(id: string): string {
  if (id === 'wedding' || id === 'engagement' || id === 'vow-renewal' || id === 'anniversary' || id === 'bridal-shower' || id === 'bridal-luncheon') return 'heart-icon';
  if (id === 'memorial' || id === 'funeral') return 'leaf';
  if (id === 'baby-shower' || id === 'gender-reveal' || id === 'sip-and-see' || id === 'first-birthday') return 'sparkles';
  if (id === 'bar-mitzvah' || id === 'bat-mitzvah' || id === 'quinceanera' || id === 'baptism' || id === 'first-communion' || id === 'confirmation') return 'sparkles';
  if (id === 'reunion' || id === 'housewarming' || id === 'welcome-party' || id === 'brunch') return 'users';
  if (id === 'retirement' || id === 'graduation') return 'leaf';
  if (id === 'bachelor-party' || id === 'bachelorette-party') return 'compass';
  if (id === 'birthday' || id === 'milestone-birthday' || id === 'sweet-sixteen' || id === 'rehearsal-dinner') return 'gift';
  if (id === 'story') return 'sparkles';
  return 'sparkles';
}
function toneFor(id: string): 'peach' | 'sage' | 'lavender' | 'cream' {
  const e = getEventType(id as never);
  const voice = e?.voice;
  if (voice === 'solemn') return 'lavender';
  if (voice === 'ceremonial') return 'cream';
  if (voice === 'playful') return 'peach';
  if (voice === 'intimate') return 'sage';
  return 'peach';
}
const OCCASIONS: OccasionCard[] = EVENT_TYPES
  .filter((e) => e.status === 'shipping' || e.status === 'beta')
  .map((e) => ({ id: e.id, label: e.label, icon: iconFor(e.id), tone: toneFor(e.id), category: e.category }));

// Brand-family tints per card tone (BRAND.md §5). The prototype's
// pastel peach/lavender chips are retired — every tone resolves to
// a cream-deep / olive-mist surface with an olive or ink glyph.
type CardTone = OccasionCard['tone'];
const TONE_BG: Record<CardTone, string> = {
  peach: 'var(--pl-cream-deep, #EBE3D2)',
  lavender: 'var(--pl-olive-mist, #E0DDC9)',
  sage: 'var(--sage-tint, #E3E6C8)',
  cream: 'var(--cream-2, #FBF7EE)',
};
const TONE_INK: Record<CardTone, string> = {
  peach: 'var(--pl-olive, #5C6B3F)',
  lavender: 'var(--pl-ink, #0E0D0B)',
  sage: 'var(--sage-deep, #5C6B3F)',
  cream: 'var(--pl-ink, #0E0D0B)',
};

const VIBES = [
  { id: 'romantic', label: 'Romantic', icon: '♥', tone: 'peach' as const },
  { id: 'joyful', label: 'Joyful', icon: '✦', tone: 'peach' as const },
  { id: 'intimate', label: 'Intimate', icon: '◉', tone: 'lavender' as const },
  { id: 'playful', label: 'Playful', icon: '✿', tone: 'peach' as const },
  { id: 'quiet', label: 'Quiet', icon: '⟐', tone: 'sage' as const },
  { id: 'editorial', label: 'Editorial', icon: '❖', tone: 'cream' as const },
  { id: 'groovy', label: 'Groovy', icon: '☀', tone: 'peach' as const },
  { id: 'outdoorsy', label: 'Outdoorsy', icon: '☘', tone: 'sage' as const },
  { id: 'modern', label: 'Modern', icon: '■', tone: 'lavender' as const },
];

/** Palette-picker id for the photo-derived option ("From your photos"). */
const PHOTO_PALETTE_ID = 'from-your-photos';

const PALETTES = [
  { id: 'groovy-garden', name: 'Groovy Garden', colors: ['#F0C9A8', '#8B9C5A', '#CBD29E', '#3D4A1F'] },
  { id: 'dusk-meadow', name: 'Dusk Meadow', colors: ['#C4B5D9', '#B7A4D0', '#CBD29E', '#6B5A8C'] },
  { id: 'warm-linen', name: 'Warm Linen', colors: ['#F3E9D4', '#EAB286', '#F0C9A8', '#8B4720'] },
  { id: 'olive-gold', name: 'Olive & Gold', colors: ['#6d7d3f', '#D4A95D', '#F3E9D4', '#3D4A1F'] },
];

const LAYOUTS = [
  { id: 'timeline', name: 'Memory Thread', body: 'A vertical story, chapter by chapter.', icon: '⏳' },
  { id: 'magazine', name: 'Editorial Spread', body: 'Headlines, features, quiet pages.', icon: '▤' },
  { id: 'filmstrip', name: 'Filmstrip', body: 'Photos first, words second.', icon: '▥' },
  { id: 'bento', name: 'Bento Stack', body: 'Card grid — schedule, people, gifts.', icon: '⊞' },
];

interface WizardPhoto {
  id: string;
  /** Permanent URL (R2 or Google CDN) — what gets sent to generate. */
  url: string;
  /** Local preview — data URL for uploads before they finish, or Google baseUrl. */
  previewUrl: string;
  name?: string;
  caption?: string;
  takenAt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  source: 'upload' | 'google';
  uploading?: boolean;
  error?: string;
}

interface SmartPalette {
  id: string;
  name: string;
  rationale: string;
  colors: [string, string, string, string];
  tone: string;
  source: string;
}

interface WizardState {
  occasion: string;
  names: [string, string];
  eventDate: string;
  location: string;
  vibes: string[];
  palette: string;
  /** Hex colors from the currently-selected palette — flows to /api/generate/stream
   *  as `selectedPaletteColors` so Pass 2 honors them. */
  paletteColors?: string[];
  layout: string;
  subdomain: string;
  templateId?: string;
  // factSheet — anchors for the AI story pass
  howWeMet?: string;
  whyCelebrate?: string;
  favoriteMemory?: string;
  // Occasion-specific details (consumed by /api/generate/stream as eventDetails)
  detailDays?: number;
  detailLivestreamUrl?: string;
  detailInMemoryOf?: string;
  detailSchool?: string;
  // Photos
  photos: WizardPhoto[];
  // AI-suggested palettes (from /api/wizard/smart-palette)
  smartPalettes?: SmartPalette[];
  smartPalettesLoading?: boolean;
  smartPalettesError?: string;
}

const defaultState: WizardState = {
  occasion: '',
  names: ['', ''],
  eventDate: '',
  location: '',
  vibes: [],
  palette: PALETTES[0].id,
  layout: LAYOUTS[0].id,
  subdomain: '',
  photos: [],
};

// User-friendly upload failure messages keyed on HTTP status.
function humanizeUploadStatus(status: number): string {
  if (status === 401) return 'Please sign back in and try uploading again.';
  if (status === 413) return 'Those files are too large. Try smaller photos (under 12MB each).';
  if (status === 429) return "You've uploaded a lot recently — take a breath and try again in a minute.";
  if (status >= 500) return "Pearloom's servers are hiccuping. Try again in a moment.";
  return `Upload failed (${status}). Try again, or contact hello@pearloom.com.`;
}

// ── Photo upload (device + Google Photos) ────────────────────
// Both sources produce the same WizardPhoto shape so downstream
// code doesn't care where the photos came from.
const MAX_WIZARD_PHOTOS = 24;

function WizardPhotoUpload({
  photos,
  onChange,
}: {
  photos: WizardPhoto[];
  onChange: (next: WizardPhoto[]) => void;
}) {
  const inputId = 'pl8-wizard-photo-input';
  const picker = useGooglePhotosPicker();
  // Latest photos ref — patched into async mirror callbacks so they
  // don't clobber intermediate edits (deletes, reorders, captions).
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_WIZARD_PHOTOS - photos.length;
    const accepted = Array.from(files).slice(0, Math.max(0, remaining)).filter((f) => f.type.startsWith('image/'));
    if (accepted.length === 0) return;

    // Stage all images as local previews immediately so the user sees
    // their thumbnails right away, then upload in the background.
    const staged: WizardPhoto[] = await Promise.all(
      accepted.map(async (file) => {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        return {
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: '', // filled in after upload
          previewUrl: dataUrl,
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
          source: 'upload' as const,
          uploading: true,
        };
      }),
    );
    onChange([...photos, ...staged]);

    // Batch-upload to R2 via /api/photos/upload (max 25 per request).
    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: staged.map((p) => ({
            id: p.id,
            filename: p.name ?? p.id,
            mimeType: p.mimeType ?? 'image/jpeg',
            base64: p.previewUrl,
            capturedAt: p.takenAt,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? humanizeUploadStatus(res.status);
        throw new Error(msg);
      }
      const data = await res.json() as { photos?: Array<{ id: string; baseUrl: string; width?: number; height?: number }> };
      const byId = new Map(data.photos?.map((p) => [p.id, p]) ?? []);
      onChange((await buildNext(staged, byId)));
    } catch (err) {
      // Keep the previews but mark them as errored so the user can retry,
      // with a friendly message they can actually act on.
      const friendly = err instanceof Error ? err.message : 'Upload failed — try again';
      onChange(
        photosRef.current.concat(
          staged.map((s) => ({ ...s, uploading: false, error: friendly })),
        ),
      );
    }

    async function buildNext(
      stagedList: WizardPhoto[],
      byId: Map<string, { baseUrl: string; width?: number; height?: number }>,
    ): Promise<WizardPhoto[]> {
      return [
        ...photos,
        ...stagedList.map((s) => {
          const hit = byId.get(s.id);
          if (!hit?.baseUrl) return { ...s, uploading: false, error: 'Upload failed' };
          return {
            ...s,
            uploading: false,
            error: undefined,
            url: hit.baseUrl,
            width: hit.width ?? s.width,
            height: hit.height ?? s.height,
          };
        }),
      ];
    }
  }

  function handleGoogle() {
    picker.pick(async (picked: PickedPhoto[]) => {
      const remaining = MAX_WIZARD_PHOTOS - photos.length;
      const accepted = picked.slice(0, Math.max(0, remaining));
      if (accepted.length === 0) return;

      // 1. Stage immediately so the thumbnails paint while the server
      //    mirrors in the background. Picker baseUrls require OAuth —
      //    the browser can't load them in <img> tags directly — so we
      //    route the preview through our authenticated proxy. Once the
      //    R2 mirror lands below, we swap the preview to the permanent
      //    URL and the proxy request goes away.
      const previewFor = (baseUrl: string) =>
        `/api/photos/proxy?url=${encodeURIComponent(baseUrl)}&w=600&h=600`;
      const staged: WizardPhoto[] = accepted.map((g) => ({
        id: g.id,
        url: g.baseUrl,
        previewUrl: previewFor(g.baseUrl),
        name: g.filename,
        mimeType: g.mimeType,
        width: g.width,
        height: g.height,
        source: 'google' as const,
        uploading: true,
      }));
      onChange([...photos, ...staged]);

      // 2. Mirror each Google URL to R2 via /api/photos/upload. The
      //    server fetches each URL with the session's OAuth token and
      //    writes the bytes to R2 — same path as device uploads. This
      //    guarantees the photo survives past Google's ~1h CDN expiry.
      try {
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos: staged.map((p, i) => ({
              id: p.id,
              filename: p.name ?? `google-${i}.jpg`,
              mimeType: p.mimeType ?? 'image/jpeg',
              sourceUrl: p.previewUrl,
              capturedAt: p.takenAt,
              width: p.width,
              height: p.height,
            })),
          }),
        });
        if (!res.ok) throw new Error(`mirror ${res.status}`);
        const data = (await res.json()) as {
          photos?: Array<{ id: string; baseUrl: string; width?: number; height?: number }>;
        };
        const byId = new Map(data.photos?.map((p) => [p.id, p]) ?? []);
        // Use the freshest photos array from state to avoid racing
        // with other edits. We match staged entries by id so if the
        // user deleted or reordered photos while the mirror was in
        // flight, we only touch the ones that still exist.
        // Patch by id against whatever state is current — respects
        // any deletes/reorders the user made during the round trip.
        const patched = photosRef.current.map((p) => {
          const hit = byId.get(p.id);
          if (!hit?.baseUrl) {
            if (p.source === 'google' && p.uploading) return { ...p, uploading: false };
            return p;
          }
          return {
            ...p,
            uploading: false,
            url: hit.baseUrl,
            previewUrl: hit.baseUrl,
            width: hit.width ?? p.width,
            height: hit.height ?? p.height,
          };
        });
        onChange(patched);
      } catch (err) {
        console.warn('[wizard] Google mirror failed:', err);
        // Keep the previews but flip off uploading state, using the
        // latest photos array so concurrent edits aren't clobbered.
        onChange(photosRef.current.map((p) => (p.uploading ? { ...p, uploading: false } : p)));
      }
    });
  }

  function remove(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }
  function setCaption(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  const pickerBusy = picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            border: '2px dashed var(--line)',
            borderRadius: 14,
            background: 'var(--cream-2)',
            cursor: 'pointer',
            gap: 8,
            color: 'var(--ink-soft)',
            minHeight: 150,
          }}
        >
          <Icon name="upload" size={24} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Upload from device</div>
          <div style={{ fontSize: 11, textAlign: 'center' }}>JPG, PNG, HEIC · up to {MAX_WIZARD_PHOTOS}</div>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={handleGoogle}
          disabled={pickerBusy}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            border: '2px solid var(--line)',
            borderRadius: 14,
            background: pickerBusy ? 'var(--cream-2)' : 'var(--card)',
            cursor: pickerBusy ? 'wait' : 'pointer',
            gap: 8,
            color: 'var(--ink)',
            minHeight: 150,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c-3.54 0-6.72 1.22-9.2 3.22l-5.36-5.36C13.26 3.89 18.37 2 24 2c8.27 0 15.26 4.59 19 11.27l-5.9 4.58C34.96 13.31 29.89 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.35l-7.73-6c-2.15 1.45-4.92 2.3-6.84 2.3-5.89 0-10.87-3.81-12.65-8.85l-7.98 6.19C6.73 41.41 13.73 46 24 46z" />
          </svg>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {pickerBusy ? 'Opening Google Photos…' : 'Pick from Google Photos'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center' }}>
            Choose in a popup · nothing leaves Google unless you pick it
          </div>
        </button>
      </div>

      {picker.error && (
        <div style={{ fontSize: 12, color: '#7A2D2D', marginBottom: 10 }}>{picker.error}</div>
      )}

      {photos.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {photos.map((p) => (
            <div key={p.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
              <img
                src={p.previewUrl}
                alt={p.name ?? ''}
                style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', opacity: p.uploading ? 0.6 : 1 }}
              />
              {p.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  uploading…
                </div>
              )}
              {p.error && !p.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: '#7A2D2D',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  {p.error}
                </div>
              )}
              {p.source === 'google' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: 'rgba(66,133,244,0.85)',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  Google
                </div>
              )}
              <input
                value={p.caption ?? ''}
                onChange={(e) => setCaption(p.id, e.target.value)}
                placeholder="Caption (optional)"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  border: 0,
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Remove photo"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 0,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-muted)' }}>
        {photos.length === 0
          ? 'No photos yet — Pear will start with an empty canvas.'
          : `${photos.length} photo${photos.length === 1 ? '' : 's'} ready. Pear clusters them into chapters.`}
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// The 6 most-picked occasions. Showing these first turns a 31-tile
// directory into a one-glance question for the 80% of users who
// want one of them. Everything else lives behind "Show all".
const POPULAR_OCCASIONS: string[] = [
  'wedding',
  'birthday',
  'anniversary',
  'memorial',
  'reunion',
  'baby-shower',
];

function OccasionPicker({
  selected,
  onPick,
}: {
  selected: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();

  const popular = POPULAR_OCCASIONS
    .map((id) => OCCASIONS.find((o) => o.id === id))
    .filter((o): o is OccasionCard => Boolean(o));

  const filtered = q
    ? OCCASIONS.filter((o) => o.label.toLowerCase().includes(q))
    : null;

  const showCategorised = showAll || filtered !== null;

  const tile = (o: OccasionCard) => {
    const on = selected === o.id;
    const glyphColor = TONE_INK[o.tone];
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => onPick(o.id)}
        // Hover host — bespoke glyph anims fire on parent hover.
        className="pl8-glyph-host"
        style={{
          padding: 14,
          borderRadius: 14,
          border: on
            ? '2px solid var(--pl-olive, #5C6B3F)'
            : '1px solid var(--line)',
          background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card)',
          boxShadow: on ? '0 0 0 4px var(--pl-olive-12, rgba(92,107,63,0.12))' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-ui)',
          transition: 'border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        }}
        onMouseEnter={(e) => {
          if (!on) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          if (!on) e.currentTarget.style.transform = '';
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            flexShrink: 0,
            background: TONE_BG[o.tone],
            display: 'grid',
            placeItems: 'center',
            color: glyphColor,
          }}
        >
          <OccasionGlyph id={o.id} size={20} />
        </div>
        <div className="display" style={{ fontSize: 14.5 }}>
          {o.label}
        </div>
      </button>
    );
  };

  return (
    <>
      <h2
        className="display"
        style={{ fontSize: 'clamp(36px, 5vw, 52px)', margin: '0 0 10px', lineHeight: 1.05 }}
      >
        What are we <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>celebrating?</span>
      </h2>
      <p
        style={{
          color: 'var(--ink-soft)',
          fontSize: 15,
          margin: '0 0 24px',
          maxWidth: 540,
        }}
      >
        Pick the closest — you can change it any time. Pearloom supports {OCCASIONS.length} event types.
      </p>

      {/* Search input + popular tiles. The 31-tile directory is the
          escape hatch ("Show all"); 90% of users land on one of the
          popular ones and never expand. */}
      <div
        style={{
          position: 'relative',
          marginBottom: 18,
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ink-muted)',
            display: 'inline-grid',
            placeItems: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value && !showAll) setShowAll(true);
          }}
          placeholder={`Search ${OCCASIONS.length} events…`}
          style={{
            width: '100%',
            padding: '12px 14px 12px 38px',
            borderRadius: 12,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            fontSize: 14,
            fontFamily: 'inherit',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
      </div>

      {!showCategorised && (
        <>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              marginBottom: 10,
            }}
          >
            Popular
          </div>
          <div
            className="pl8-occasion-grid pl-cascade-row"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}
          >
            {popular.map(tile)}
          </div>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pl-olive, #5C6B3F)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            Show all {OCCASIONS.length} events →
          </button>
        </>
      )}

      {showCategorised && filtered === null && (
        <>
          {(['wedding-arc', 'family', 'milestone', 'cultural', 'commemoration'] as EventCategory[]).map((cat) => {
            const items = OCCASIONS.filter((o) => o.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive, #5C6B3F)',
                    marginBottom: 10,
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="pl8-occasion-grid pl-cascade-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {items.map(tile)}
                </div>
              </div>
            );
          })}
        </>
      )}

      {filtered !== null && (
        <div className="pl8-occasion-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--ink-muted)',
                fontSize: 13,
                background: 'var(--cream-2)',
                borderRadius: 12,
              }}
            >
              Nothing matches "{query}". Try a different word, or{' '}
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--pl-olive, #5C6B3F)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                clear search
              </button>
              .
            </div>
          ) : (
            filtered.map(tile)
          )}
        </div>
      )}
    </>
  );
}

function PhaseHeader({ active, hiddenSteps }: { active: number; hiddenSteps?: StepKey[] }) {
  // Map the 8 steps into 4 phases. Hidden-step ranges (template
  // skips Vibe/Palette/Layout) collapse the Look phase down so
  // the progress thread reads accurately.
  const visibleSteps = STEPS.filter((s) => !(hiddenSteps ?? []).includes(s));
  const totalVisible = visibleSteps.length;
  const visibleIndex = visibleSteps.indexOf(STEPS[active]);
  const completed = Math.max(0, visibleIndex);
  const fraction = totalVisible > 1 ? completed / (totalVisible - 1) : 0;

  const currentPhase = phaseFor(STEPS[active]);
  // Step number within the active phase (e.g. Story · 2 of 3).
  const phaseSteps = PHASES.find((p) => p.key === currentPhase)?.steps ?? [];
  const visiblePhaseSteps = phaseSteps.filter((s) => !(hiddenSteps ?? []).includes(s));
  const phaseStepIndex = visiblePhaseSteps.indexOf(STEPS[active]);
  const phasePosition = `${phaseStepIndex + 1} of ${visiblePhaseSteps.length}`;

  return (
    <div
      className="pl8-wizard-progress"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
        maxWidth: 480,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          className="display"
          style={{
            fontSize: 18,
            lineHeight: 1,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {currentPhase}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
          }}
        >
          {phasePosition} · {STEPS[active]}
        </span>
      </div>
      {/* Single thread fills as the user moves through every step
          (not just phase transitions) so each click feels like
          progress. Olive + gold gradient matches Pearloom's
          loom-shuttle motion language. */}
      <div
        aria-hidden
        style={{
          height: 2,
          width: '100%',
          background: 'var(--line-soft)',
          borderRadius: 999,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.round(fraction * 100)}%`,
            background:
              'linear-gradient(90deg, var(--ink-soft) 0%, var(--pl-olive, #5C6B3F) 70%, var(--gold, #B89244) 100%)',
            borderRadius: 999,
            transition: 'width 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      {/* Phase track — small dots per phase showing which phases
          are done, current, upcoming. Subtle so it doesn't compete
          with the active phase header above. */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
        {PHASES.map((p) => {
          const phaseStepsAll = p.steps.filter((s) => !(hiddenSteps ?? []).includes(s));
          if (phaseStepsAll.length === 0) return null;
          const phaseDone = phaseStepsAll.every((s) => STEPS.indexOf(s) < active);
          const phaseCur = p.key === currentPhase;
          return (
            <div
              key={p.key}
              title={p.key}
              style={{
                flex: phaseStepsAll.length,
                height: 4,
                borderRadius: 999,
                background: phaseDone
                  ? 'var(--ink-soft)'
                  : phaseCur
                    ? 'var(--pl-olive, #5C6B3F)'
                    : 'var(--line-soft)',
                transition: 'background-color 280ms ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ContextChips({ st }: { st: WizardState }) {
  const occ = OCCASIONS.find((o) => o.id === st.occasion)?.label ?? 'Not set';
  const namesVal = st.names.filter(Boolean).join(' & ') || 'Add names';
  const dateVal = parseLocalDate(st.eventDate)?.toLocaleDateString() ?? 'Set date';
  const locVal = st.location || 'Add location';
  const chips = [
    { icon: '♥', tone: 'peach' as const, label: 'Occasion', val: occ },
    { icon: '✦', tone: 'lavender' as const, label: 'Names', val: namesVal },
    { icon: '🗓', tone: 'sage' as const, label: 'Date', val: dateVal },
    { icon: '📍', tone: 'peach' as const, label: 'Location', val: locVal },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--card)',
        borderRadius: 16,
        border: '1px solid var(--card-ring)',
        alignItems: 'center',
      }}
    >
      {chips.map((c) => (
        <div key={c.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: TONE_BG[c.tone],
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {c.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--ink-muted)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * WizardLiveVignette — slim "your site, live" preview ribbon rendered on the
 * Vibe + Palette steps. Mirrors the prototype's right-rail SiteVignette but
 * fits inline above the chip/palette grid so the single-column letterpress
 * flow stays intact. Updates as the host picks vibes + palettes — turning
 * the two Look steps into a live design feedback loop.
 */
function WizardLiveVignette({ st }: { st: WizardState }) {
  const names = st.names.filter(Boolean);
  // Solo occasions preview ONE name — no '&', no phantom partner.
  // Placeholders come from the occasion's name spec ('Sam',
  // 'Valentina', 'Eleanor Rose Thompson'…) so a memorial never
  // previews as 'Alex & Jamie'. Placeholders are preview-only —
  // they never reach the saved manifest.
  const nameSpec = nameModeFor(st.occasion);
  const couple = nameSpec.mode === 'couple';
  const a = names[0] || (couple ? 'Alex' : nameSpec.primaryPlaceholder);
  const b = couple ? (names[1] || 'Jamie') : '';
  const dateLabel = parseLocalDate(st.eventDate)?.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) || 'Your date';
  const placeLabel = st.location || 'Your place';
  const firstVibe = st.vibes
    .map((id) => VIBES.find((v) => v.id === id)?.label ?? id)
    .filter(Boolean)[0];

  // Pull live colours from the selected palette (smart or classic).
  const paletteColors =
    st.paletteColors && st.paletteColors.length > 0
      ? st.paletteColors
      : PALETTES.find((p) => p.id === st.palette)?.colors;
  const accent = paletteColors?.[1] || 'var(--sage-deep, #5C6B3F)';
  const ground = paletteColors?.[2] || 'var(--cream-2, #F0E8D6)';
  const ink = paletteColors?.[3] || 'var(--ink, #2A2A2A)';

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 22,
        padding: '20px 22px 22px',
        borderRadius: 16,
        background: ground,
        border: '1px solid var(--line-soft)',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* eyebrow */}
      <div
        style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: 8,
        }}
      >
        {firstVibe ? `${firstVibe} • Your site, live` : 'Your site, live'}
      </div>

      {/* Names — letterpress display */}
      <div
        className="display"
        style={{
          fontFamily: 'var(--font-display, Fraunces, serif)',
          fontSize: 32,
          lineHeight: 1.02,
          color: ink,
          letterSpacing: '-0.01em',
        }}
      >
        {a}
        {b ? (
          <>
            <span
              className="display-italic"
              style={{ fontSize: '0.55em', color: accent, margin: '0 0.16em', fontStyle: 'italic', fontWeight: 400 }}
            >
              &amp;
            </span>
            {b}
          </>
        ) : null}
      </div>

      {/* Sprig-flanked rule */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, margin: '12px 0 6px' }}>
        <span style={{ width: 50, height: 1, background: accent, opacity: 0.5 }} />
        <Sparkle size={10} color={accent} />
        <span style={{ width: 50, height: 1, background: accent, opacity: 0.5 }} />
      </div>

      {/* Date + place */}
      <div style={{ fontSize: 12, letterSpacing: '0.04em', color: ink, opacity: 0.7 }}>
        {dateLabel} · {placeLabel}
      </div>

      {/* Footer hint */}
      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          letterSpacing: '0.06em',
        }}
      >
        Updates as you pick.
      </div>
    </div>
  );
}

// Inline tips per step — replaces the floating PearHelper sidebar.
// Each step can opt in by reading STEP_TIPS[step] and rendering it
// as a single low-key line under the question heading.
const STEP_TIPS: Record<StepKey, string> = {
  Occasion: 'Not sure? Pick the closest — we can change it any time.',
  Basics: 'Guests only see what you choose. First names work fine.',
  Details: 'Skip any field — write it yourself later in the editor.',
  Photos: '6 to 20 photos is the sweet spot. More = more chapters.',
  Vibe: 'Pick 2 to 4 vibes that capture the heart of the day.',
  Palette: 'Pick what you love — Pear builds matching gradients + accents.',
  Review: 'Nothing is public until you publish. Keep editing as long as you like.',
};

export function WizardV8() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const dialog = useDialog();
  const [stepIndex, setStepIndex] = useState(0);
  // Persist wizard state across refreshes so users don't lose their
  // work if they accidentally reload mid-flow. Photos stay out of
  // storage (too big); they'd need to be re-picked.
  const STORAGE_KEY = 'pl-wizard-state-v1';
  const [st, setSt] = useState<WizardState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<WizardState>;
          if (parsed && typeof parsed === 'object') {
            return { ...defaultState, ...parsed, photos: [] } as WizardState;
          }
        }
      } catch {}
    }
    if (!templateId) return defaultState;
    const tpl = TEMPLATES_BY_ID[templateId];
    if (!tpl) return defaultState;
    return {
      ...defaultState,
      occasion: tpl.occasion,
      vibes: tpl.vibes.map((v) => v.toLowerCase()),
      palette: tpl.palette,
      layout: tpl.layout,
      templateId,
    } as WizardState;
  });

  // Debounced persistence — runs on every state change, but throttled
  // to one write per 400ms so we don't thrash localStorage on each
  // keystroke.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        const { photos: _photos, ...persisted } = st;
        void _photos;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [st]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Background cook — kicks off the AI decor library generation
  // as soon as the host has occasion + palette + venue. The
  // result lands in sessionStorage so the editor's first paint
  // can read it instead of generating decor on demand. Saves
  // 60-120s after the wizard's main generate pass.
  const cookSig =
    st.occasion && st.paletteColors && st.paletteColors.length > 0
      ? {
          occasion: st.occasion,
          paletteHex: st.paletteColors,
          venue: st.location || undefined,
          vibe: st.vibes.join(', ') || undefined,
        }
      : null;
  const cookStatus = useBackgroundCook(cookSig);

  // Speculative manifest pre-warm — kicks the full /api/generate
  // /stream pipeline once the host has all the required inputs
  // (photos + names + occasion + vibes + palette). The cooked
  // manifest lands in sessionStorage; if the host doesn't change
  // inputs before tapping Generate, we skip the foreground fetch
  // entirely and land in the editor instantly.
  const readyPhotosForCook = useMemo(
    () => st.photos.filter((p) => p.url && !p.uploading),
    [st.photos],
  );
  const manifestCookInput = useMemo<ManifestCookBody | null>(() => {
    if (
      readyPhotosForCook.length === 0 ||
      !st.names[0] ||
      !st.occasion ||
      !st.vibes.length ||
      !st.paletteColors ||
      st.paletteColors.length === 0
    ) {
      return null;
    }
    const photosPayload = readyPhotosForCook.map((p) => ({
      mediaId: p.id,
      baseUrl: p.url,
      filename: p.name ?? p.id,
      mimeType: p.mimeType ?? 'image/jpeg',
      width: p.width ?? 1200,
      height: p.height ?? 1200,
      creationTime: p.takenAt,
      description: p.caption,
    }));
    const clusters = [
      {
        id: 'c-all',
        photos: photosPayload,
        timeRange: st.eventDate || new Date().toISOString(),
        locationLabel: st.location || undefined,
      },
    ];
    const vibeString = st.vibes.join(', ') || 'warm, celebratory';
    const e = getEventType(st.occasion as never);
    const category = e?.category;
    const ctx: ManifestCookContext = {
      photoIds: readyPhotosForCook.map((p) => p.id),
      names: st.names,
      occasion: st.occasion,
      category,
      vibes: st.vibes,
      paletteColors: st.paletteColors,
      templateId: st.templateId,
      layout: st.layout,
      eventDate: st.eventDate,
      eventVenue: st.location,
    };
    return {
      ctx,
      body: {
        photos: photosPayload,
        clusters,
        vibeString,
        vibeName: vibeString,
        names: st.names,
        occasion: st.occasion,
        category,
        eventDate: st.eventDate || undefined,
        eventVenue: st.location || undefined,
        hostRole: 'principal',
        factSheet: {
          howWeMet: st.howWeMet,
          why: st.whyCelebrate,
          favorite: st.favoriteMemory,
        },
        eventDetails: {
          days: st.detailDays,
          livestreamUrl: st.detailLivestreamUrl,
          inMemoryOf: st.detailInMemoryOf,
          school: st.detailSchool,
        },
        layoutFormat: st.layout,
        templateId: st.templateId,
        selectedPaletteColors: st.paletteColors,
      },
    };
  }, [
    readyPhotosForCook,
    st.names,
    st.occasion,
    st.vibes,
    st.paletteColors,
    st.templateId,
    st.layout,
    st.eventDate,
    st.location,
    st.howWeMet,
    st.whyCelebrate,
    st.favoriteMemory,
    st.detailDays,
    st.detailLivestreamUrl,
    st.detailInMemoryOf,
    st.detailSchool,
  ]);
  const manifestStatus = useBackgroundManifest(manifestCookInput);
  const [genStep, setGenStep] = useState<string>('');
  const [generatedTagline, setGeneratedTagline] = useState<string>('');
  const [taglineState, setTaglineState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const step = STEPS[stepIndex];

  // ── "From your photos" palette ──────────────────────────────
  // Client-side extraction from the host's first uploaded photo
  // (the one the hero leads with). Computed lazily when the host
  // reaches the Palette step; cached per source URL by the hook,
  // so revisits are free and re-picked photos recompute. Fails
  // silently — no photos / tainted canvas / decode error just
  // means the tile doesn't render.
  const firstPhoto = st.photos[0];
  const photoPaletteSource = firstPhoto
    ? firstPhoto.previewUrl || firstPhoto.url || undefined
    : undefined;
  const photoPalette = usePhotoPalette(photoPaletteSource, step === 'Palette');
  const photoPaletteColors = useMemo<[string, string, string, string] | null>(
    () =>
      photoPalette
        ? [photoPalette.accent, photoPalette.gold, photoPalette.accentBg, photoPalette.accentInk]
        : null,
    [photoPalette],
  );
  // If the host picked the photo palette and then changed photos
  // (back-navigation), re-sync the selected hex tuple so the
  // generate pass honors the fresh extraction.
  useEffect(() => {
    if (!photoPaletteColors) return;
    setSt((s) =>
      s.palette === PHOTO_PALETTE_ID &&
      (s.paletteColors ?? []).join(',') !== photoPaletteColors.join(',')
        ? { ...s, paletteColors: photoPaletteColors }
        : s,
    );
  }, [photoPaletteColors]);

  // Fetch AI palette suggestions. Factored out so we can fire it
  // automatically on step enter AND from the "Re-read my event"
  // button.
  const fetchSmartPalettes = async () => {
    setSt((s) => ({ ...s, smartPalettesLoading: true, smartPalettesError: undefined }));
    try {
      const res = await fetch('/api/wizard/smart-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: st.occasion,
          names: st.names,
          venue: st.location,
          city: st.location,
          vibes: st.vibes,
          howWeMet: st.howWeMet,
          whyCelebrate: st.whyCelebrate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Palette advisor unavailable.');
      setSt((s) => ({
        ...s,
        smartPalettes: (data.palettes ?? []) as SmartPalette[],
        smartPalettesLoading: false,
      }));
    } catch (err) {
      setSt((s) => ({
        ...s,
        smartPalettesLoading: false,
        smartPalettesError: err instanceof Error ? err.message : 'Palette advisor failed.',
      }));
    }
  };

  // Auto-fire palette suggestions the FIRST time the user lands on
  // the Palette step — no click required. Guards against re-firing
  // on step-navigation back-and-forth by checking existing results.
  useEffect(() => {
    if (step !== 'Palette') return;
    if (st.smartPalettesLoading) return;
    if ((st.smartPalettes?.length ?? 0) > 0) return;
    // Don't auto-fire if the user hasn't given us enough to work with.
    if (!st.occasion) return;
    void fetchSmartPalettes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Steps that are redundant when a template is selected — the
  // template already picked the occasion, vibes, palette, and
  // layout. Skip them on forward navigation; still reachable via
  // the progress bar if the user wants to override.
  const isTemplateRedundant = (stepName: StepKey): boolean => {
    if (!st.templateId) return false;
    return stepName === 'Vibe' || stepName === 'Palette';
  };

  /** Next index, skipping template-redundant steps. */
  const nextStepIndex = (from: number): number => {
    let next = Math.min(from + 1, STEPS.length - 1);
    while (next < STEPS.length - 1 && isTemplateRedundant(STEPS[next])) next += 1;
    return next;
  };

  /** Previous index, also skipping template-redundant steps. */
  const prevStepIndex = (from: number): number => {
    let prev = Math.max(0, from - 1);
    while (prev > 0 && isTemplateRedundant(STEPS[prev])) prev -= 1;
    return prev;
  };

  // Auto-advance to the next step after a single-choice selection.
  // Small delay so the user sees the checkmark animation before the
  // step transitions. Skips Vibe/Palette/Layout when a template is
  // active since those are pre-set by the template itself.
  const autoAdvance = (ms = 380) => {
    window.setTimeout(() => {
      setStepIndex((i) => nextStepIndex(i));
    }, ms);
  };

  async function suggestTagline() {
    setTaglineState('running');
    try {
      const res = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Write a warm 1-2 sentence hero tagline for a ${st.occasion} site for ${st.names.filter(Boolean).join(' & ') || 'the hosts'}${
            st.location ? ` at ${st.location}` : ''
          }${st.vibes.length ? `. Vibes: ${st.vibes.join(', ')}` : ''}. No exclamation marks, no cliches. Write like a friend.`,
          tone: 'warm',
        }),
      });
      if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
      const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
      const text = (data.text ?? data.rewritten ?? data.result ?? '').trim();
      if (!text) throw new Error('Empty tagline');
      setGeneratedTagline(text);
      setTaglineState('done');
      setTimeout(() => setTaglineState('idle'), 1800);
    } catch {
      setTaglineState('error');
    }
  }

  // When a template is pre-selected, start the user at the Basics step so
  // they don't re-confirm the occasion/vibe/palette/layout we already chose.
  useEffect(() => {
    if (templateId && TEMPLATES_BY_ID[templateId] && stepIndex === 0) {
      setStepIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'Occasion':
        return !!st.occasion;
      case 'Basics':
        return nameModeIsValid(st.occasion, st.names);
      case 'Vibe':
        return st.vibes.length > 0;
      case 'Palette':
        return !!st.palette;
      case 'Review':
        return nameModeIsValid(st.occasion, st.names) && !!st.occasion;
      default:
        return true;
    }
  }, [step, st]);

  function toggleVibe(id: string) {
    setSt((s) => ({ ...s, vibes: s.vibes.includes(id) ? s.vibes.filter((v) => v !== id) : [...s.vibes, id] }));
  }

  async function handleFinish() {
    setBusy(true);
    setErr(null);
    setGenStep('starting…');
    try {
      // Belt-and-braces: solo / group occasions carry exactly one
      // name into generation + the saved manifest. Placeholders
      // are never written; a partner name typed under a previous
      // occasion pick is dropped here even if state restoration
      // skipped the Occasion step.
      const submitNames: [string, string] =
        nameModeFor(st.occasion).mode === 'couple'
          ? [st.names[0].trim(), st.names[1].trim()]
          : [st.names[0].trim(), ''];
      const derivedSubdomain =
        st.subdomain ||
        slugify(submitNames.filter(Boolean).join('-and-')) ||
        slugify(st.occasion) ||
        `event-${Date.now().toString(36)}`;

      // Only photos that have a resolvable URL reach the pipeline.
      // Uploads that haven't finished (or failed) are dropped here.
      const readyPhotos = st.photos.filter((p) => p.url && !p.uploading);
      const hasPhotos = readyPhotos.length > 0;
      const e = getEventType(st.occasion as never);
      const category = e?.category;

      let manifest: Record<string, unknown>;

      if (hasPhotos) {
        // Speculative manifest pre-warm — if the background hook
        // already cooked a manifest for the same signature, skip
        // the foreground fetch entirely. The 1-2 minute generation
        // wait collapses to ~600ms because we just hand the cached
        // result to the editor.
        const liveSig = manifestCookInput ? buildManifestSignature(manifestCookInput.ctx) : null;
        const cachedPrewarm = liveSig ? readCookedManifest(liveSig) : null;
        if (cachedPrewarm) {
          setGenStep('Pear already prepared this — opening the editor…');
          // Still fold in any cooked decor that may have arrived
          // separately so the editor opens fully populated.
          if (cookSig) {
            const decorRaw = readCookedDecor(cookSig);
            if (decorRaw && typeof decorRaw === 'object') {
              const lib: Record<string, unknown> = {
                ...((cachedPrewarm as { decorLibrary?: Record<string, unknown> }).decorLibrary ?? {}),
                updatedAt: new Date().toISOString(),
              };
              const d = decorRaw as Record<string, unknown>;
              if (typeof d.divider === 'string') lib.divider = d.divider;
              if (typeof d.confetti === 'string') lib.confetti = d.confetti;
              if (typeof d.footerBouquet === 'string') lib.footerBouquet = d.footerBouquet;
              if (d.sectionStamps && typeof d.sectionStamps === 'object') {
                const stamps: Record<string, string> = {};
                for (const [k, v] of Object.entries(d.sectionStamps as Record<string, unknown>)) {
                  if (typeof v === 'string') stamps[k] = v;
                }
                if (Object.keys(stamps).length) lib.sectionStamps = stamps;
              }
              (cachedPrewarm as { decorLibrary?: Record<string, unknown> }).decorLibrary = lib;
            }
          }
          manifest = cachedPrewarm as unknown as Record<string, unknown>;
          // Tiny visual settle so the GeneratingScreen doesn't
          // flash for 50ms — feels like real progress.
          await new Promise((r) => setTimeout(r, 600));
          // Skip the rest of the pipeline; jump to the publish path.
        } else {
        // Full AI pipeline — stream generate returns a populated
        // manifest with chapters, story, logistics, poetry, etc.
        const photosPayload = readyPhotos.map((p) => ({
          mediaId: p.id,
          baseUrl: p.url,
          filename: p.name ?? p.id,
          mimeType: p.mimeType ?? 'image/jpeg',
          width: p.width ?? 1200,
          height: p.height ?? 1200,
          creationTime: p.takenAt,
          description: p.caption,
        }));
        const clusters = [
          {
            id: 'c-all',
            photos: photosPayload,
            timeRange: st.eventDate || new Date().toISOString(),
            locationLabel: st.location || undefined,
          },
        ];
        const vibeString = st.vibes.join(', ') || 'warm, celebratory';
        const body = {
          photos: photosPayload,
          clusters,
          vibeString,
          vibeName: vibeString,
          names: submitNames,
          occasion: st.occasion,
          category,
          eventDate: st.eventDate || undefined,
          eventVenue: st.location || undefined,
          hostRole: 'principal',
          factSheet: {
            howWeMet: st.howWeMet,
            why: st.whyCelebrate,
            favorite: st.favoriteMemory,
          },
          eventDetails: {
            days: st.detailDays,
            livestreamUrl: st.detailLivestreamUrl,
            inMemoryOf: st.detailInMemoryOf,
            school: st.detailSchool,
          },
          layoutFormat: st.layout,
          templateId: st.templateId,
          selectedPaletteColors: st.paletteColors,
          // Speculative decor library, baked while the wizard
          // ran. The generate route can fold this into the new
          // manifest so the editor opens with decor already
          // populated — no on-demand generation needed. Server
          // ignores the field if the shape doesn't match.
          prebuiltDecor: cookSig ? readCookedDecor(cookSig) : null,
        };
        setGenStep('Pear is reading your photos…');
        const res = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Generation failed (${res.status})`);
        }
        // Consume the SSE stream, looking for `type: 'complete'`.
        const reader = res.body?.getReader();
        if (!reader) throw new Error('Stream unavailable');
        const decoder = new TextDecoder();
        let buffer = '';
        let finalManifest: Record<string, unknown> | null = null;
        let streamError: string | null = null;

        const processFrame = (part: string) => {
          const line = part.split('\n').find((l) => l.startsWith('data: '));
          if (!line) return;
          let ev: Record<string, unknown> | null = null;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            // Truly partial / malformed frame — drop it.
            return;
          }
          if (!ev) return;
          // NOTE: don't put an ev.type === 'error' throw inside a
          // try/catch — the surrounding "ignore parse errors"
          // guard used to swallow the real server error and
          // bubble up a misleading "No manifest received".
          if (ev.type === 'progress') {
            const label = (ev.label ?? ev.message) as string | undefined;
            if (label) setGenStep(label);
          } else if (ev.type === 'pass' && typeof ev.message === 'string') {
            setGenStep(ev.message);
          } else if (ev.type === 'complete' && ev.manifest) {
            finalManifest = ev.manifest as Record<string, unknown>;
          } else if (ev.type === 'error') {
            streamError = (ev.message as string) ?? 'Generation failed';
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) processFrame(part);
          if (streamError) break;
        }
        // Flush: the final frame may live in `buffer` if the server
        // closed before writing the trailing blank line. Replay it
        // through the same parser so `complete` isn't lost.
        buffer += decoder.decode();
        if (buffer.trim()) {
          for (const part of buffer.split('\n\n')) processFrame(part);
        }
        if (streamError) throw new Error(streamError);
        // Capture the closure-assigned value into a local so TS can
        // narrow it — `finalManifest` is referenced by `processFrame`
        // so the compiler keeps it as `Record<string, unknown> | null`
        // even after a null guard.
        const resolvedManifest = finalManifest as Record<string, unknown> | null;
        if (!resolvedManifest) {
          throw new Error(
            'Pear finished without sending your manifest — try again in a minute, or contact support if this keeps happening.',
          );
        }
        manifest = {
          ...resolvedManifest,
          themeFamily: (resolvedManifest as { themeFamily?: string }).themeFamily ?? 'v8',
          templateId: st.templateId,
        };
        } // end "no cached pre-warm — full pipeline" branch
      } else {
        // Skeleton path — no photos → no AI pass. Seed what we can
        // so the editor opens with enough for the user to write.
        const seedTagline = st.templateId ? TEMPLATES_BY_ID[st.templateId]?.tagline : generatedTagline || undefined;
        manifest = {
          occasion: st.occasion,
          themeFamily: 'v8',
          templateId: st.templateId,
          vibeString: st.vibes.join(', '),
          names: submitNames,
          logistics: { date: st.eventDate || undefined, venue: st.location || undefined },
          chapters: [],
          layoutFormat: st.layout,
          factSheet: {
            howWeMet: st.howWeMet,
            why: st.whyCelebrate,
            favorite: st.favoriteMemory,
          },
          ...(seedTagline ? { poetry: { heroTagline: seedTagline } } : {}),
        };
      }

      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: derivedSubdomain, manifest, names: submitNames }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to create site (${res.status})`);
      }
      // Invalidate the shared sites cache so the dashboard renders
      // this freshly-created site the next time the user lands on it.
      try {
        const { invalidateSitesCache } = await import('@/components/marketing/design/dash/hooks');
        invalidateSitesCache();
      } catch {}
      // Clear persisted wizard state — user has their site, no reason
      // to keep the draft. Prevents the wizard from showing yesterday's
      // answers if the user starts a second site later.
      if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
        // Arm the First Pressing — the editor plays the reveal
        // sequence exactly once for this freshly-woven site.
        try {
          const { armFirstPressing } = await import('@/components/pearloom/redesign/FirstPressing');
          armFirstPressing(derivedSubdomain);
        } catch {}
      }
      router.push(`/editor/${derivedSubdomain}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      {/* Botanical atmosphere — replaces the older Blob/Squiggle
          underlay with the prototype's subtle Sprig + flower glyphs.
          Reads as paper-grain garden, not AI-startup gradient mesh. */}
      <div
        aria-hidden
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, color: 'var(--sage, #5C6B3F)' }}
      >
        <div style={{ position: 'absolute', top: 90, left: -20, opacity: 0.10, transform: 'rotate(-12deg)' }}>
          <Sprig size={220} color="var(--sage-deep, #5C6B3F)" />
        </div>
        <div style={{ position: 'absolute', bottom: 40, right: -30, opacity: 0.09, transform: 'rotate(8deg) scaleX(-1)' }}>
          <Sprig size={260} color="var(--sage-deep, #5C6B3F)" />
        </div>
        <div style={{ position: 'absolute', top: '44%', right: '32%', opacity: 0.18 }}>
          <Sparkle size={28} color="var(--gold, #B89244)" />
        </div>
      </div>

      {/* Background cook indicator — surfaces "Pear is preparing
          things" while the speculative decor + warm-up runs in
          parallel to the wizard. Skipped on step 0 (occasion) so
          there's nothing to support yet. */}
      {stepIndex > 0 && <BackgroundCookPill cooking={cookStatus.cooking} ready={cookStatus.decorReady} />}

      {/* Header */}
      <header
        className="pl8-wizard-header"
        style={{
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          background: 'rgba(248,241,228,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Link href="/">
          <PearloomLogo />
        </Link>
        <PhaseHeader
          active={stepIndex}
          hiddenSteps={st.templateId ? ['Vibe', 'Palette'] : []}
        />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center', flexShrink: 0 }}>
          <Link
            href="/dashboard"
            style={{
              padding: '7px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid var(--line-soft)',
              color: 'var(--ink-soft)',
              textDecoration: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Save draft
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '7px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Exit
          </Link>
        </div>
      </header>

      <div
        className="pl8-wizard-canvas"
        style={{
          // Centered single-column letterpress feel — generous left
          // and right margins so each question reads like its own
          // page, no sidebar to fight with.
          maxWidth: 760,
          margin: '0 auto',
          padding: '40px 32px 80px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div>
          {/* Active-template banner — shown whenever a template is
              selected, so the user always knows which design drives
              their site and can swap it without digging through
              the wizard back-buttons. */}
          {st.templateId && TEMPLATES_BY_ID[st.templateId] && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 'var(--r, 12px)',
                background: 'var(--sage-tint, #EDEFE1)',
                border: '1px solid var(--line-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
              }}
            >
              <Sparkle size={12} color="var(--gold)" />
              <span style={{ color: 'var(--ink-soft)' }}>
                Using template
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display, Fraunces, serif)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  fontSize: 16,
                }}
              >
                {TEMPLATES_BY_ID[st.templateId].name}
              </span>
              <div style={{ flex: 1 }} />
              <Link
                href="/templates"
                style={{
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Change template
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: 'Start from scratch?',
                    message: "Keeps everything you've typed but drops the template’s palette + layout.",
                    confirmLabel: 'Drop the template',
                    cancelLabel: 'Keep the template',
                  });
                  if (ok) setSt((s) => ({ ...s, templateId: undefined }));
                }}
                style={{
                  fontSize: 12,
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Start blank
              </button>
            </div>
          )}

          {stepIndex > 0 && (
            <div style={{ marginBottom: 16 }}>
              <ContextChips st={st} />
            </div>
          )}

          <Reveal y={14} key={step}>
            <div
              style={{
                position: 'relative',
                // Letterpress page feel — open paper, no card frame
                // competing with the question. Each step is its own
                // breath; the PhaseHeader carries the step name.
                padding: '8px 0 0',
              }}
            >
              {/* One-line inline tip — replaces the floating PearHelper
                  sidebar. Reads as a small note under the question, not
                  a competing column of advice. */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 18,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'var(--pl-olive-mist, #E0DDC9)',
                  color: 'var(--pl-ink-soft, #3A332C)',
                  fontSize: 12,
                }}
              >
                <Pear size={14} tone="sage" shadow={false} />
                <span style={{ lineHeight: 1.4 }}>{STEP_TIPS[step]}</span>
              </div>

              {step === 'Occasion' && (
                <OccasionPicker
                  selected={st.occasion}
                  onPick={(id) => {
                    // Solo / group occasions hide the second name
                    // field — clear any partner name typed under a
                    // previous occasion so it can't silently ride
                    // along into generation ("random names don't
                    // populate").
                    const keepSecond = nameModeFor(id).mode === 'couple';
                    setSt((s) => ({
                      ...s,
                      occasion: id,
                      names: keepSecond ? s.names : [s.names[0], ''],
                    }));
                    autoAdvance();
                  }}
                />
              )}

              {step === 'Basics' && (() => {
                const nameSpec = nameModeFor(st.occasion);
                const remembering = st.occasion === 'memorial' || st.occasion === 'funeral';
                return (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    {nameSpec.mode === 'solo' ? (
                      remembering ? (
                        <>Who are we <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>remembering?</span></>
                      ) : (
                        <>Who are we <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>celebrating?</span></>
                      )
                    ) : (
                      <>Who, when, and <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>where.</span></>
                    )}
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Just the bones — you can make anything optional later.
                  </p>
                  <div
                    className="pl8-basics-grid"
                    style={{
                      display: 'grid',
                      // Solo and group modes get a single-column name row;
                      // couple modes use the two-up layout.
                      gridTemplateColumns: nameSpec.mode === 'couple' ? '1fr 1fr' : '1fr',
                      gap: 16,
                    }}
                  >
                    <div style={{ gridColumn: nameSpec.mode === 'couple' ? 'auto' : 'span 1' }}>
                      <label className="field-label">{nameSpec.primaryLabel}</label>
                      <input
                        className="input"
                        value={st.names[0]}
                        onChange={(e) => setSt((s) => ({ ...s, names: [e.target.value, s.names[1]] }))}
                        placeholder={nameSpec.primaryPlaceholder}
                        // autoComplete="name" lets iOS / Android offer the
                        // device contact name + Chrome / Safari autofill it
                        // for returning hosts. Skipping this means hosts
                        // type their own name from scratch on every wizard
                        // run, which is the most boring possible friction.
                        autoComplete="given-name"
                      />
                    </div>
                    {nameSpec.mode === 'couple' && (
                      <div>
                        <label className="field-label">{nameSpec.secondaryLabel ?? 'Second name'}</label>
                        <input
                          className="input"
                          value={st.names[1]}
                          onChange={(e) => setSt((s) => ({ ...s, names: [s.names[0], e.target.value] }))}
                          placeholder={nameSpec.secondaryPlaceholder ?? ''}
                          autoComplete="off"
                        />
                      </div>
                    )}
                    {nameSpec.hint && (
                      <div
                        style={{
                          gridColumn: nameSpec.mode === 'couple' ? 'span 2' : 'auto',
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          marginTop: -6,
                          fontStyle: 'italic',
                        }}
                      >
                        {nameSpec.hint}
                      </div>
                    )}
                    <div>
                      <label className="field-label">Date</label>
                      <WizardDatePicker
                        value={st.eventDate}
                        onChange={(iso) => setSt((s) => ({ ...s, eventDate: iso }))}
                        placeholder="Pick a date"
                      />
                    </div>
                    <div>
                      <label className="field-label">Location</label>
                      <WizardLocationAutocomplete
                        value={st.location}
                        onChange={(v) => setSt((s) => ({ ...s, location: v }))}
                        onSelect={(place) =>
                          setSt((s) => ({ ...s, location: place.name ? `${place.name}${place.address ? ` · ${place.address}` : ''}` : place.address }))
                        }
                        placeholder="Madison Square Garden · New York"
                      />
                    </div>
                    <div style={{ gridColumn: nameSpec.mode === 'couple' ? 'span 2' : 'span 1' }}>
                      <label className="field-label">Site link</label>
                      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 14px',
                            border: '1.5px solid var(--line)',
                            borderRight: 0,
                            borderTopLeftRadius: 'var(--r)',
                            borderBottomLeftRadius: 'var(--r)',
                            color: 'var(--ink-muted)',
                            fontSize: 13,
                            background: 'var(--cream-2)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          pearloom.com/{normalizeOccasion(st.occasion || 'wedding')}/
                        </div>
                        <input
                          className="input"
                          value={st.subdomain}
                          onChange={(e) => setSt((s) => ({ ...s, subdomain: slugify(e.target.value) }))}
                          placeholder={
                            nameSpec.mode === 'couple'
                              ? 'alex-and-jamie'
                              : nameSpec.mode === 'solo'
                              ? slugify(nameSpec.primaryPlaceholder) || 'eleanor'
                              : 'our-gathering'
                          }
                          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1, minWidth: 160 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
                        We&apos;ll derive this from your names if you leave it empty.
                      </div>
                    </div>
                  </div>
                </>
                );
              })()}

              {step === 'Details' && (() => {
                const e = getEventType(st.occasion as never);
                const preset = e?.rsvpPreset ?? 'wedding';
                const isMemorial = preset === 'memorial';
                const isBachelor = preset === 'bachelor';
                const isReunion = preset === 'reunion';
                const isGrad = st.occasion === 'graduation';
                // Per-occasion question copy — labels + placeholders
                // tailored to the specific event (birthday no longer
                // asks "how did you meet in 2018").
                const q = questionsFor(st.occasion);
                return (
                  <>
                    <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                      A little more <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>about it.</span>
                    </h2>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                      Every answer here sharpens the story Pear writes. Skip anything you want to leave to the editor.
                    </p>

                    <div style={{ display: 'grid', gap: 18 }}>
                      <div>
                        <label className="field-label">{q.q1Label}</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={st.howWeMet ?? ''}
                          onChange={(ev) => setSt((s) => ({ ...s, howWeMet: ev.target.value }))}
                          placeholder={q.q1Placeholder}
                        />
                      </div>

                      <div>
                        <label className="field-label">{q.q2Label}</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={st.whyCelebrate ?? ''}
                          onChange={(ev) => setSt((s) => ({ ...s, whyCelebrate: ev.target.value }))}
                          placeholder={q.q2Placeholder}
                        />
                      </div>

                      <div>
                        <label className="field-label">{q.q3Label}</label>
                        <textarea
                          className="input"
                          rows={3}
                          value={st.favoriteMemory ?? ''}
                          onChange={(ev) => setSt((s) => ({ ...s, favoriteMemory: ev.target.value }))}
                          placeholder={q.q3Placeholder}
                        />
                      </div>

                      {/* Occasion-specific fields */}
                      {isBachelor && (
                        <div>
                          <label className="field-label">How many days is this trip?</label>
                          <NumberInput
                            value={st.detailDays ?? 3}
                            onChange={(n) => setSt((s) => ({ ...s, detailDays: n }))}
                            min={1}
                            max={14}
                            unit="days"
                            width={140}
                            ariaLabel="Trip duration in days"
                          />
                        </div>
                      )}

                      {isReunion && (
                        <div>
                          <label className="field-label">The connection</label>
                          <input
                            className="input"
                            value={st.detailSchool ?? ''}
                            onChange={(ev) => setSt((s) => ({ ...s, detailSchool: ev.target.value }))}
                            placeholder="Jefferson High, class of 2005 · or · The Hernandez cousins"
                          />
                        </div>
                      )}

                      {isMemorial && (
                        <>
                          <div>
                            <label className="field-label">In memory of</label>
                            <input
                              className="input"
                              value={st.detailInMemoryOf ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, detailInMemoryOf: ev.target.value }))}
                              placeholder="Eleanor Rose Thompson (1948–2026)"
                            />
                          </div>
                          <div>
                            <label className="field-label">Livestream link (optional)</label>
                            <input
                              className="input"
                              value={st.detailLivestreamUrl ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, detailLivestreamUrl: ev.target.value }))}
                              placeholder="https://…"
                            />
                          </div>
                        </>
                      )}

                      {isGrad && (
                        <div>
                          <label className="field-label">School</label>
                          <input
                            className="input"
                            value={st.detailSchool ?? ''}
                            onChange={(ev) => setSt((s) => ({ ...s, detailSchool: ev.target.value }))}
                            placeholder="Portland State University · BS, Computer Science"
                          />
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {step === 'Photos' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Give Pear <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>something to see.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Add 6–20 favourite photos. Pear looks at them — scenes, people, light — and writes each chapter
                    from what&apos;s actually in the frame. Skip this step if you want a blank canvas.
                  </p>
                  <WizardPhotoUpload
                    photos={st.photos}
                    onChange={(next) => setSt((s) => ({ ...s, photos: next }))}
                  />
                </>
              )}

              {step === 'Vibe' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Set the <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>vibe.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 18px' }}>
                    Pick 2–4. Your vibes shape tone, language, and flow.
                  </p>
                  {/* Live "Your site" vignette — confirms the host's
                      choices coalesce into something real. Mirrors the
                      prototype's right-rail SiteVignette in a centered
                      inline ribbon. */}
                  <WizardLiveVignette st={st} />
                  {/* Live counter so the host knows how close to the
                      2-vibe floor they are. Plum when at 0–1 (can't
                      continue), sage when ≥2 (good to go). */}
                  <p
                    aria-live="polite"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: st.vibes.length >= 2 ? 'var(--sage-deep)' : 'var(--plum, #7A2D2D)',
                      margin: '0 0 18px',
                    }}
                  >
                    {st.vibes.length === 0
                      ? 'Pick at least 2 to continue'
                      : `${st.vibes.length} of 4 selected${st.vibes.length === 1 ? ' — one more to continue' : ''}`}
                  </p>
                  <div className="pl-cascade-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {VIBES.map((v) => {
                      const on = st.vibes.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVibe(v.id)}
                          className="chip"
                          style={{
                            background: on ? 'var(--sage-deep)' : TONE_BG[v.tone],
                            color: on ? 'var(--cream)' : TONE_INK[v.tone],
                            border: 'none',
                            padding: '12px 20px',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          <span>{v.icon}</span> {v.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 'Palette' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Choose a <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>palette.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 18px' }}>
                    Pear read your venue and vibes and mixed three palettes just for you — or pick a classic below.
                  </p>
                  {/* Live preview — re-renders the moment a palette is
                      tapped so the host sees how their names land in
                      the chosen colours before continuing. */}
                  <WizardLiveVignette st={st} />

                  {/* ── Smart palettes header ──────────────────── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                        fontSize: 11,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-olive, #5C6B3F)',
                      }}
                    >
                      <Sparkle size={11} color="var(--gold)" /> Pear's picks for you
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchSmartPalettes()}
                      className="btn btn-outline btn-sm"
                      disabled={!!st.smartPalettesLoading}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Icon name="wand" size={12} />{' '}
                      {st.smartPalettesLoading
                        ? 'Mixing palette…'
                        : (st.smartPalettes?.length ?? 0) > 0
                          ? 'Re-read my event'
                          : 'Ask Pear again'}
                    </button>
                  </div>

                  {st.smartPalettesError && (
                    <div style={{ fontSize: 12, color: 'var(--pl-warning, #A14A2C)', marginBottom: 10 }}>
                      {st.smartPalettesError}
                    </div>
                  )}

                  {/* Skeleton while Pear mixes the first set */}
                  {st.smartPalettesLoading && (st.smartPalettes?.length ?? 0) === 0 && (
                    <div
                      className="pl8-palette-grid"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--card, #fff)',
                            border: '1.5px solid var(--line)',
                            minHeight: 170,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0, 1, 2, 3].map((k) => (
                              <div
                                key={k}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'var(--cream-2)',
                                  opacity: 0.7 - k * 0.12,
                                  animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.15 + k * 0.08}s infinite`,
                                }}
                              />
                            ))}
                          </div>
                          <div
                            style={{
                              width: '70%',
                              height: 14,
                              background: 'var(--cream-2)',
                              borderRadius: 6,
                              marginTop: 12,
                              opacity: 0.6,
                              animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
                            }}
                          />
                          <div
                            style={{
                              width: '90%',
                              height: 10,
                              background: 'var(--cream-2)',
                              borderRadius: 5,
                              marginTop: 8,
                              opacity: 0.5,
                              animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                          <style jsx>{`
                            @keyframes wizard-skeleton-pulse {
                              0%, 100% { opacity: 0.6; }
                              50%      { opacity: 0.85; }
                            }
                          `}</style>
                        </div>
                      ))}
                    </div>
                  )}

                  {((st.smartPalettes?.length ?? 0) > 0 || photoPaletteColors) && (
                    <div
                      className="pl8-palette-grid pl-cascade-row"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
                    >
                      {/* "From your photos" — client-side extraction from
                          the first uploaded photo. Renders only when the
                          extraction succeeded; selecting it flows through
                          the same palette/paletteColors path as siblings. */}
                      {photoPaletteColors && (
                        <button
                          type="button"
                          onClick={() => {
                            setSt((s) => ({
                              ...s,
                              palette: PHOTO_PALETTE_ID,
                              paletteColors: photoPaletteColors,
                            }));
                            autoAdvance();
                          }}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--card)',
                            border:
                              st.palette === PHOTO_PALETTE_ID
                                ? '2px solid var(--ink)'
                                : '1.5px solid var(--line)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            cursor: 'pointer',
                            position: 'relative',
                            textAlign: 'left',
                          }}
                        >
                          {st.palette === PHOTO_PALETTE_ID && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: 'var(--ink)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {photoPaletteColors.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: c,
                                  border: '1.5px solid rgba(255,255,255,0.45)',
                                }}
                              />
                            ))}
                          </div>
                          <div
                            className="display"
                            style={{
                              fontSize: 18,
                              fontStyle: 'italic',
                              margin: 0,
                              lineHeight: 1.2,
                            }}
                          >
                            From your photos
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                            Accents drawn straight from the photographs you shared.
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                              fontSize: 9.5,
                              letterSpacing: '0.16em',
                              textTransform: 'uppercase',
                              color: 'var(--ink-muted)',
                            }}
                          >
                            Photo-matched
                          </div>
                        </button>
                      )}
                      {(st.smartPalettes ?? []).map((p) => {
                        const on = st.palette === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSt((s) => ({
                                ...s,
                                palette: p.id,
                                paletteColors: p.colors,
                              }));
                              autoAdvance();
                            }}
                            style={{
                              padding: 16,
                              borderRadius: 16,
                              background: 'var(--card)',
                              border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                              cursor: 'pointer',
                              position: 'relative',
                              textAlign: 'left',
                            }}
                          >
                            {on && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 10,
                                  right: 10,
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: 'var(--ink)',
                                  display: 'grid',
                                  placeItems: 'center',
                                }}
                              >
                                <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 4 }}>
                              {p.colors.map((c, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: c,
                                    border: '1.5px solid rgba(255,255,255,0.45)',
                                  }}
                                />
                              ))}
                            </div>
                            <div
                              className="display"
                              style={{
                                fontSize: 18,
                                fontStyle: 'italic',
                                margin: 0,
                                lineHeight: 1.2,
                              }}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                              {p.rationale}
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                                fontSize: 9.5,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color: 'var(--ink-muted)',
                              }}
                            >
                              {p.source === 'venue' ? 'Venue-aware' : p.source === 'vibe' ? 'Vibe-aware' : p.source}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Classic presets ───────────────────────── */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                      marginBottom: 10,
                    }}
                  >
                    Classic presets
                  </div>
                  <div
                    className="pl8-palette-grid pl-cascade-row"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
                  >
                    {PALETTES.map((p) => {
                      const on = st.palette === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSt((s) => ({
                              ...s,
                              palette: p.id,
                              paletteColors: p.colors,
                            }));
                            autoAdvance();
                          }}
                          style={{
                            padding: 14,
                            borderRadius: 14,
                            background: 'var(--card)',
                            border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            cursor: 'pointer',
                            position: 'relative',
                            textAlign: 'left',
                          }}
                        >
                          {on && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: 'var(--ink)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <Icon name="check" size={10} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {p.colors.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  background: c,
                                  border: '1.5px solid rgba(255,255,255,0.4)',
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Layout step removed from STEPS in 2026-05-30 but the
                  JSX is kept dead-coded for easy re-enable. Editions
                  pick the layout per persona. The cast bypasses the
                  StepKey narrow check so the branch compiles
                  unreachable. */}
              {(step as string) === 'Layout' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    How should it <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>read?</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Every layout is a full site — they just handle pacing differently.
                  </p>
                  <div className="pl8-layout-grid pl-cascade-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {LAYOUTS.map((l) => {
                      const on = st.layout === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setSt((s) => ({ ...s, layout: l.id }));
                            autoAdvance();
                          }}
                          style={{
                            padding: 18,
                            borderRadius: 14,
                            background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card)',
                            border: on ? '2px solid var(--pl-olive, #5C6B3F)' : '1.5px solid var(--line)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 10,
                              background: 'var(--cream-2)',
                              display: 'grid',
                              placeItems: 'center',
                              marginBottom: 6,
                              fontSize: 20,
                            }}
                          >
                            {l.icon}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{l.body}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 'Review' && (
                <>
                  <h2 className="display" style={{ fontSize: 44, margin: '0 0 6px' }}>
                    Everything in <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>order?</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    When you save, we&apos;ll build your first draft and open the studio.
                  </p>
                  <div className="pl8-basics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Row label="Occasion" val={OCCASIONS.find((o) => o.id === st.occasion)?.label ?? '—'} />
                    <Row label="Names" val={st.names.filter(Boolean).join(' & ') || '—'} />
                    <Row label="Date" val={st.eventDate || '—'} />
                    <Row label="Location" val={st.location || '—'} />
                    <Row
                      label="Vibes"
                      val={
                        st.vibes
                          .map((id) => VIBES.find((v) => v.id === id)?.label ?? id)
                          .join(', ') || '—'
                      }
                    />
                    <Row
                      label="Palette"
                      val={
                        st.palette === PHOTO_PALETTE_ID
                          ? 'From your photos'
                          : PALETTES.find((p) => p.id === st.palette)?.name ??
                            st.smartPalettes?.find((p) => p.id === st.palette)?.name ??
                            (st.paletteColors && st.paletteColors.length > 0 ? 'Pear-picked palette' : '—')
                      }
                      swatches={
                        st.paletteColors && st.paletteColors.length > 0
                          ? st.paletteColors
                          : PALETTES.find((p) => p.id === st.palette)?.colors
                      }
                    />
                    {/* Layout row removed — host picks an Edition in
                        the editor; Pear seeds a sensible default at
                        generation time. Showing "Layout: Memory
                        Thread" in the review confused hosts who
                        hadn't been asked. */}
                    <Row
                      label="Site link"
                      val={formatSiteDisplayUrl(
                        st.subdomain || slugify(st.names.filter(Boolean).join('-and-')) || slugify(st.occasion),
                        '',
                        normalizeOccasion(st.occasion || 'wedding'),
                      )}
                    />
                  </div>

                  {/* Pear's first-draft Look preview — surfaces the per-event
                      defaults the renderer will fall back to (edition / kit /
                      texture / density / voice). Lets the host see what Pear
                      will pick BEFORE the editor opens, and quietly introduces
                      the Look Engine concept (every value here has a dial in
                      the editor's Theme panel). Live-computed from the host's
                      occasion + voice; no manifest writes. */}
                  {st.occasion && (() => {
                    const eventType = getEventType(st.occasion as never);
                    const voice = eventType?.voice;
                    const occ = st.occasion as never;
                    const ed = recommendEdition(occ, voice);
                    const tex = recommendTextureFor(st.occasion);
                    const ld = lookDefaultsFor(st.occasion);
                    const editionLabel = ed.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
                    /* Intensity label matches LookEnginePanel's
                       intensityLabel() thresholds so the wizard preview
                       reads the same way the editor pickers do. */
                    const intensityLabel =
                      ld.textureIntensity <= 0.01 ? 'Off'
                      : ld.textureIntensity < 0.6 ? 'Faint'
                      : ld.textureIntensity < 1.05 ? 'Natural'
                      : ld.textureIntensity < 1.35 ? 'Rich'
                      : 'Bold';
                    const items = [
                      { label: 'Edition', val: editionLabel },
                      { label: 'Texture', val: tex.charAt(0).toUpperCase() + tex.slice(1) },
                      { label: 'Kit',     val: ld.kitId.charAt(0).toUpperCase() + ld.kitId.slice(1) },
                      { label: 'Spacing', val: ld.density.charAt(0).toUpperCase() + ld.density.slice(1) },
                      { label: 'Voice',   val: voice ? voice.charAt(0).toUpperCase() + voice.slice(1) : 'Celebratory' },
                      { label: 'Grain',   val: intensityLabel },
                    ];
                    return (
                      <div
                        style={{
                          marginTop: 18,
                          padding: 16,
                          borderRadius: 14,
                          background: 'var(--cream-2)',
                          border: '1px solid var(--line-soft)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <Pear size={22} tone="sage" sparkle shadow={false} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                              Pear&apos;s first draft of your look
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
                              Tuned to your event. Every dial is editable in the Theme panel.
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {items.map((it) => (
                            <div
                              key={it.label}
                              style={{
                                padding: '8px 10px',
                                background: 'var(--card)',
                                borderRadius: 8,
                                border: '1px solid var(--line-soft)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  color: 'var(--ink-muted)',
                                }}
                              >
                                {it.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: 'var(--ink)',
                                }}
                              >
                                {it.val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Let Pear draft a tagline */}
                  <div
                    style={{
                      marginTop: 22,
                      padding: 16,
                      borderRadius: 14,
                      background: 'var(--pl-olive-mist, #E0DDC9)',
                      border: '1px solid var(--pl-olive-20, rgba(92,107,63,0.20))',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Pear size={36} tone="sage" sparkle />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-olive-deep, #363F22)', marginBottom: 4 }}>
                        Want Pear to draft a hero tagline?
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
                        Pear reads your occasion, names, vibes, and venue and writes a warm one-liner. You can always edit it later in the editor.
                      </div>
                      {generatedTagline && (
                        <div
                          style={{
                            padding: '10px 12px',
                            background: 'var(--card)',
                            border: '1px solid var(--card-ring)',
                            borderRadius: 10,
                            fontSize: 14,
                            fontStyle: 'italic',
                            color: 'var(--ink)',
                            marginBottom: 10,
                            lineHeight: 1.5,
                          }}
                        >
                          {generatedTagline}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={taglineState === 'running'}
                          onClick={() => void suggestTagline()}
                        >
                          {taglineState === 'running'
                            ? 'Writing…'
                            : generatedTagline
                              ? 'Try another'
                              : 'Let Pear draft it'}
                          <Sparkle size={10} />
                        </button>
                        {taglineState === 'error' && (
                          <span style={{ fontSize: 11.5, color: '#7A2D2D', alignSelf: 'center' }}>
                            Pear couldn't write one. Try once more.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {err && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: 'var(--pl-warning-mist, rgba(161,74,44,0.10))',
                        border: '1px solid var(--pl-warning, #A14A2C)',
                        color: 'var(--pl-warning, #A14A2C)',
                        fontSize: 13,
                      }}
                    >
                      {err}
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: '1px solid var(--line-soft)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStepIndex((i) => prevStepIndex(i))}
                  disabled={stepIndex === 0}
                >
                  <Icon name="arrow-left" size={14} /> Back
                </button>
                {step !== 'Review' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canContinue}
                    onClick={() => setStepIndex((i) => nextStepIndex(i))}
                  >
                    Continue <Icon name="arrow-right" size={14} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary btn-lg" disabled={!canContinue || busy} onClick={handleFinish}>
                    {busy ? 'Weaving your site…' : 'Build my site'}
                    <Pear size={14} tone="cream" shadow={false} />
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {busy && <GeneratingScreen genStep={genStep} photoCount={st.photos.length} />}
    </div>
  );
}

function Row({ label, val, swatches }: { label: string; val: string; swatches?: string[] }) {
  return (
    <div style={{ background: 'var(--cream-2)', borderRadius: 12, padding: '10px 14px' }}>
      <div className="eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{val}</div>
        {swatches && swatches.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {swatches.slice(0, 5).map((c, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: c,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
