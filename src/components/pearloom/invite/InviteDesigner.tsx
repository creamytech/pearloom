'use client';

/* ========================================================================
   PEARLOOM INVITE DESIGNER — v8
   Save-the-date + wedding invite composer.
   8 editorial variants, each rendered as SVG so the PNG export is 1:1
   with the preview. Copy link, download PNG, and send-as-save-the-date
   via the existing bulk-email flow.
   ======================================================================== */

import Link from 'next/link';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { DashLayout } from '../dash/DashShell';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { AISuggestButton, useAICall } from '../editor/ai';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';
import { DecorGenerationToast } from '../editor/DecorGenerationToast';
import { ARCHETYPES, type ArchetypeId } from '@/lib/invite-engine/archetypes';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { PrintMailModal } from './PrintMailModal';
import { InviteCanvas } from './canvas/InviteCanvas';
import { CanvasInspector } from './canvas/CanvasInspector';
import { CanvasToolbar } from './canvas/CanvasToolbar';
import {
  CANVAS_TEMPLATES,
  buildScene,
  type CanvasTemplateId,
} from '@/lib/invite-canvas/templates';
import type { CanvasScene } from '@/lib/invite-canvas/types';

type VariantId =
  // Save-the-date — photo-first
  | 'photo-postcard'
  | 'polaroid-stack'
  | 'photo-frame'
  // Save-the-date — photo-as-accent (small inset, type leads)
  | 'split-portrait'
  | 'corner-photo'
  | 'photo-disc'
  | 'banner-strip'
  | 'tape-snapshot'
  // Invitation — type-first formal
  | 'formal-engraved'
  | 'letterpress'
  | 'monogram-crest'
  // Cross-kind classics
  | 'garden'
  | 'editorial'
  | 'groovy'
  | 'polaroid'
  | 'modern'
  | 'botanical'
  | 'cinema'
  | 'linen';

type PhotoFilter = 'none' | 'sepia' | 'film' | 'dreamy' | 'mono' | 'vintage' | 'noir' | 'sunwash';
type DesignKind = 'save-the-date' | 'invitation';
type DesignerMode = 'variant' | 'photos' | 'style' | 'ai';
type QRPosition = 'br' | 'bl' | 'bc' | 'tr' | 'hidden';
type FontKey = 'fraunces' | 'cormorant' | 'allura' | 'space-grotesk' | 'system';

interface PhotoSlot {
  id: string;
  // Position + size in the 1000×1400 viewBox.
  x: number; y: number; w: number; h: number;
  // Crop shape — defaults to 'rect'. Renderer applies the matching
  // SVG clipPath so the photo never bleeds outside the slot.
  shape?: 'rect' | 'rounded' | 'circle' | 'arch' | 'polaroid';
  // Optional rotation in degrees, around the slot's centre. Used by
  // the polaroid-stack variant to scatter photos.
  rotation?: number;
  // How aggressively the renderer should darken the slot when text
  // sits on top of the photo. 'auto' adds a tint plate; 'none'
  // leaves it raw.
  textTint?: 'none' | 'auto';
}

const FONT_FAMILIES: Record<FontKey, { label: string; value: string }> = {
  fraunces:        { label: 'Fraunces · classic serif', value: 'Fraunces, Georgia, serif' },
  cormorant:       { label: 'Cormorant · romantic',     value: '"Cormorant Garamond", "Cormorant", Georgia, serif' },
  allura:          { label: 'Allura · script',           value: '"Allura", "Caveat", cursive' },
  'space-grotesk': { label: 'Space Grotesk · modern',    value: '"Space Grotesk", Inter, sans-serif' },
  system:          { label: 'System sans',               value: 'Inter, system-ui, sans-serif' },
};

// Curated subset of archetypes shown in the AI tab (full list of 12
// in archetypes.ts is too dense for a single picker grid — we pick
// the ones that read distinctly across occasions).
const AI_ARCHETYPE_PICKS: ArchetypeId[] = [
  'art-deco',
  'italian-poster',
  'garden-table',
  'kyoto-winter',
  'tulum-dusk',
  'parisian-salon',
  'desert-heirloom',
  'midnight-observatory',
];

interface Variant {
  id: VariantId;
  label: string;
  description: string;
  /** Which kind(s) the picker shows this variant in. */
  kind: DesignKind | 'both';
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  /** Photo slots — only set on photo-first variants. Each slot is
   *  filled from the host's photoSelections map by id. Slots without
   *  a matching selection render a soft placeholder. */
  photoSlots?: PhotoSlot[];
}

const VARIANTS: Variant[] = [
  // ── Save-the-date · photo-first ──
  // Modern save-the-dates are visual-first. The photo is the design;
  // type sits over it. Three takes: postcard, scattered polaroids,
  // and an editorial frame. Each surfaces guests' photos prominently.
  {
    id: 'photo-postcard',
    label: 'Photo postcard',
    description: 'Full-bleed engagement photo with date stamped over.',
    kind: 'save-the-date',
    paper: '#F8F1E4', ink: '#FFFFFF', accent: '#C6703D', soft: '#EDE0C5',
    photoSlots: [{ id: 'main', x: 0, y: 0, w: 1000, h: 1400, shape: 'rect', textTint: 'auto' }],
  },
  {
    id: 'polaroid-stack',
    label: 'Polaroid stack',
    description: 'Two scattered polaroids over cream paper.',
    kind: 'save-the-date',
    paper: '#F8F1E4', ink: '#3D4A1F', accent: '#C6703D', soft: '#EDE0C5',
    photoSlots: [
      { id: 'left', x: 90, y: 200, w: 380, h: 460, shape: 'polaroid', rotation: -6 },
      { id: 'right', x: 540, y: 280, w: 380, h: 460, shape: 'polaroid', rotation: 5 },
    ],
  },
  {
    id: 'photo-frame',
    label: 'Frame',
    description: 'Photo in an editorial double-rule frame, names below.',
    kind: 'save-the-date',
    paper: '#F8F1E4', ink: '#3D4A1F', accent: '#B89244', soft: '#EDE0C5',
    photoSlots: [{ id: 'main', x: 130, y: 180, w: 740, h: 720, shape: 'rounded' }],
  },

  // ── Save-the-date · photo-as-accent (type leads, photo supports) ──
  // Five layouts where the photo is one element on the page, not the
  // whole canvas. Hosts who want type-driven design with a photo
  // inset live here.
  {
    id: 'split-portrait',
    label: 'Split portrait',
    description: 'Half photo on the left, type on the right.',
    kind: 'save-the-date',
    paper: '#F8F1E4', ink: '#3D4A1F', accent: '#C6703D', soft: '#EDE0C5',
    photoSlots: [{ id: 'main', x: 0, y: 0, w: 480, h: 1400, shape: 'rect' }],
  },
  {
    id: 'corner-photo',
    label: 'Corner photo',
    description: 'Small editorial photo tucked into the top-right.',
    kind: 'save-the-date',
    paper: '#FBF7EE', ink: '#0E0D0B', accent: '#5C6B3F', soft: '#E8E0D0',
    photoSlots: [{ id: 'main', x: 580, y: 110, w: 320, h: 380, shape: 'rounded' }],
  },
  {
    id: 'photo-disc',
    label: 'Photo medallion',
    description: 'Round photo medallion above a centered date stamp.',
    kind: 'save-the-date',
    paper: '#F5EFE2', ink: '#0E0D0B', accent: '#B89244', soft: '#EDE0C5',
    photoSlots: [{ id: 'main', x: 340, y: 160, w: 320, h: 320, shape: 'circle' }],
  },
  {
    id: 'banner-strip',
    label: 'Photo banner',
    description: 'Wide photo banner with a clean two-block typography lockup.',
    kind: 'save-the-date',
    paper: '#FBF7EE', ink: '#0E0D0B', accent: '#C6703D', soft: '#EDE0C5',
    photoSlots: [{ id: 'main', x: 0, y: 940, w: 1000, h: 460, shape: 'rect' }],
  },
  {
    id: 'tape-snapshot',
    label: 'Taped snapshot',
    description: 'Single photo taped to cream paper with handwritten date.',
    kind: 'save-the-date',
    paper: '#F8F1E4', ink: '#3D4A1F', accent: '#C6703D', soft: '#EDE0C5',
    photoSlots: [{ id: 'main', x: 220, y: 220, w: 560, h: 540, shape: 'rect', rotation: -3 }],
  },

  // ── Invitation · type-first formal ──
  // Wedding invitations follow a long tradition: hosting line on top,
  // names featured, ceremony details, reception line, RSVP card line.
  // No photo by default — the type IS the design.
  {
    id: 'formal-engraved',
    label: 'Engraved',
    description: 'Centered serif type with a single hairline rule.',
    kind: 'invitation',
    paper: '#FBF7EE', ink: '#0E0D0B', accent: '#5C4F2E', soft: '#E8E0D0',
  },
  {
    id: 'letterpress',
    label: 'Letterpress',
    description: 'Wide caps, paired hairlines, formal blocks.',
    kind: 'invitation',
    paper: '#F5EFE2', ink: '#0E0D0B', accent: '#5C6B3F', soft: '#D8CFB8',
  },
  {
    id: 'monogram-crest',
    label: 'Monogram',
    description: 'Initials medallion over a double-rule frame.',
    kind: 'invitation',
    paper: '#F8F1E4', ink: '#3D4A1F', accent: '#B89244', soft: '#EDE0C5',
  },

  // ── Cross-kind classics ──
  // Flexible templates that read well as either save-the-date or
  // formal invitation; copy fields adapt to whichever kind the host
  // picked in the topbar toggle.
  { id: 'garden',    label: 'Garden Party', description: 'Sage + cream with a soft squiggle.', kind: 'both', paper: '#F3E9D4', ink: '#3D4A1F', accent: '#8B9C5A', soft: '#CBD29E' },
  { id: 'editorial', label: 'Editorial',    description: 'Serif type on cream paper.',          kind: 'both', paper: '#F8F1E4', ink: '#3D4A1F', accent: '#B89244', soft: '#EDE0C5' },
  { id: 'groovy',    label: 'Groovy',       description: 'Loopy type, warm peach.',             kind: 'both', paper: '#F7DDC2', ink: '#8B4720', accent: '#C6703D', soft: '#EAB286' },
  { id: 'polaroid',  label: 'Polaroid',     description: 'Photo-first with handwriting.',        kind: 'both', paper: '#FFFFFF', ink: '#3D4A1F', accent: '#EAB286', soft: '#F3E9D4',
    photoSlots: [{ id: 'main', x: 120, y: 160, w: 760, h: 720, shape: 'rect' }] },
  { id: 'modern',    label: 'Modern',       description: 'Minimal ink, sans body.',             kind: 'both', paper: '#F8F1E4', ink: '#0E0D0B', accent: '#6B5A8C', soft: '#EDE0C5' },
  { id: 'botanical', label: 'Botanical',    description: 'Lavender wash.',                       kind: 'both', paper: '#EDE0C5', ink: '#4A3F6B', accent: '#B7A4D0', soft: '#D7CCE5' },
  { id: 'cinema',    label: 'Cinema',       description: 'Dark olive with gold leaf.',          kind: 'both', paper: '#3D4A1F', ink: '#F3E9D4', accent: '#D4A95D', soft: '#8B9C5A' },
  { id: 'linen',     label: 'Linen',        description: 'Warm peach with gold rules.',         kind: 'both', paper: '#F7DDC2', ink: '#3D4A1F', accent: '#B89244', soft: '#F0C9A8' },
];

/** Default variant per kind — picked when the user toggles between
 *  save-the-date and invitation modes so the preview snaps to a
 *  template that matches the new format's conventions. */
const DEFAULT_VARIANT_BY_KIND: Record<DesignKind, VariantId> = {
  'save-the-date': 'photo-postcard',
  'invitation': 'formal-engraved',
};

function variantsForKind(kind: DesignKind): Variant[] {
  return VARIANTS.filter((v) => v.kind === kind || v.kind === 'both');
}

/** Pluck every photo URL we know about from the manifest so the
 *  Photos tab can show a grid of "use one of these." Pulls from
 *  coverPhoto, chapter heroes, and chapter image arrays. Dedupes
 *  by URL string. */
function collectManifestPhotos(manifest: StoryManifest): string[] {
  const out: string[] = [];
  const push = (url?: string | null) => {
    if (!url || typeof url !== 'string') return;
    if (out.includes(url)) return;
    out.push(url);
  };
  push((manifest as unknown as { coverPhoto?: string }).coverPhoto);
  for (const ch of manifest.chapters ?? []) {
    push((ch as unknown as { heroImage?: string }).heroImage);
    for (const img of (ch.images ?? []) as Array<{ url?: string }>) push(img?.url);
  }
  return out;
}

function fmtDate(iso?: string | null): { long: string; line: string; short: string } {
  if (!iso) return { long: 'Save the date', line: 'Date to come', short: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { long: 'Save the date', line: 'Date to come', short: '' };
  const long = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const short = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return { long, line: `${weekday} · ${long}`, short };
}

export function InviteDesigner({
  siteSlug,
  manifest,
  names,
}: {
  siteSlug: string;
  manifest: StoryManifest;
  names: [string, string];
}) {
  const [kind, setKind] = useState<DesignKind>('save-the-date');
  const [variantId, setVariantId] = useState<VariantId>(DEFAULT_VARIANT_BY_KIND['save-the-date']);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Designer surface mode ──
  // 'template' = the existing rigid SVG variants (legacy).
  // 'canvas'   = the new free-form drag/resize/select editor.
  // Hosts toggle at the top of the page; switching to canvas
  // seeds a CanvasScene from the currently-picked template so
  // the work-in-progress carries over instead of starting blank.
  const [surfaceMode, setSurfaceMode] = useState<'template' | 'canvas'>('template');
  const [canvasTemplateId, setCanvasTemplateId] = useState<CanvasTemplateId>('classic-stack');
  const [canvasScene, setCanvasScene] = useState<CanvasScene | null>(null);
  const [canvasSelectedId, setCanvasSelectedId] = useState<string | null>(null);

  // ── Photo state ─────────────────────────────────────────────
  // Photo slots on a variant are filled from this map: slotId →
  // image URL. Switching variants clears slot selections that no
  // longer apply. Hosts pick from manifest photos (engagement
  // shoot, hero, chapter images) or paste an external URL.
  const [photoSelections, setPhotoSelections] = useState<Record<string, string>>({});
  // Per-photo filter — applied as an SVG <filter> over the slot.
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('none');
  // Per-photo zoom + pan offset (light Canva mode). Lets the host
  // zoom into a portion of the photo and reposition it within the
  // slot without leaving the designer.
  const [photoTransform, setPhotoTransform] = useState<{ zoom: number; offsetX: number; offsetY: number }>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  // Inspiration mood-board image for AI generation. Base64 + mime
  // sent alongside the portrait when the host clicks "Paint with
  // Pear" so the painter mimics palette/composition.
  const [inspirationImage, setInspirationImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [aiHint, setAiHint] = useState<string>('');

  // ── Invitation-specific copy ────────────────────────────────
  // Save-the-dates need only headline + names + date + venue. Real
  // wedding invitations also need: hosting line ("Together with
  // their families..."), ceremony time, reception line, dress code,
  // and an RSVP card line. These default to sensible boilerplate
  // and are only surfaced in the inspector when kind = 'invitation'.
  const [hostingLine, setHostingLine] = useState<string>('Together with their families');
  const [ceremonyTime, setCeremonyTime] = useState<string>('');
  const [receptionLine, setReceptionLine] = useState<string>('Reception to follow');
  const [dressCode, setDressCode] = useState<string>('');
  const [rsvpDeadline, setRsvpDeadline] = useState<string>('');

  // ── Customization state ─────────────────────────────────────
  // Inspector mode controls which set of controls is visible.
  // Variant = the 8 SVG templates (current behaviour). Style =
  // color/font/qr overrides on top of the chosen template. AI =
  // Pear paints a bespoke background scene via /api/invite/render.
  const [mode, setMode] = useState<DesignerMode>('variant');
  const [colorOverrides, setColorOverrides] = useState<{
    paper?: string;
    ink?: string;
    accent?: string;
    soft?: string;
  }>({});
  const [headlineFont, setHeadlineFont] = useState<FontKey>('fraunces');
  const [bodyFont, setBodyFont] = useState<FontKey>('system');
  const [qrPosition, setQrPosition] = useState<QRPosition>('br');
  const [aiBackgroundUrl, setAiBackgroundUrl] = useState<string | null>(null);
  const [aiArchetype, setAiArchetype] = useState<ArchetypeId>('garden-table');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPaintError, setAiPaintError] = useState<string | null>(null);

  // Variant might not exist on the current kind's filtered list (when
  // host toggles save-the-date ↔ invitation). Fall back to a sensible
  // default so the preview never blanks out.
  const baseVariant =
    VARIANTS.find((v) => v.id === variantId) ??
    VARIANTS.find((v) => v.id === DEFAULT_VARIANT_BY_KIND[kind])!;
  const availableVariants = useMemo(() => variantsForKind(kind), [kind]);
  const manifestPhotos = useMemo(() => collectManifestPhotos(manifest), [manifest]);

  // When the host toggles save-the-date ↔ invitation, snap the
  // variant to one that fits the new kind. If the current variant
  // is cross-kind ('both'), keep it.
  function setKindAndAdjust(next: DesignKind) {
    setKind(next);
    const current = VARIANTS.find((v) => v.id === variantId);
    if (!current || (current.kind !== 'both' && current.kind !== next)) {
      setVariantId(DEFAULT_VARIANT_BY_KIND[next]);
    }
  }
  // Apply overrides on top of the chosen template. When the host
  // hasn't touched a slot, the variant's own colour wins so the
  // template still reads as itself.
  const variant: Variant = useMemo(
    () => ({
      ...baseVariant,
      paper: colorOverrides.paper ?? baseVariant.paper,
      ink: colorOverrides.ink ?? baseVariant.ink,
      accent: colorOverrides.accent ?? baseVariant.accent,
      soft: colorOverrides.soft ?? baseVariant.soft,
    }),
    [baseVariant, colorOverrides],
  );
  const date = fmtDate(manifest.logistics?.date);
  const venue = manifest.logistics?.venue ?? 'Venue details to come';
  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion ?? 'wedding');
  const prettyUrl = formatSiteDisplayUrl(siteSlug, '', occasion);
  const fullUrl = buildSiteUrl(siteSlug, '', undefined, occasion);
  // Occasion-aware copy: default headline + kind toggle labels + page title
  // all adapt so a memorial host doesn't see "Wedding invite" at the top.
  const invitationLabels = useMemo(() => {
    switch (occasion) {
      case 'memorial':
      case 'funeral':
        return {
          title: { save: 'Service announcement', invite: 'Invitation to the service' },
          default: { save: 'In loving memory', invite: 'Please join us' },
          kindLabel: { save: 'Service notice', invite: 'Full invite' },
          stampShort: { save: 'SERVICE · ANNOUNCEMENT', invite: 'PLEASE · JOIN US' },
        };
      case 'bachelor-party':
      case 'bachelorette-party':
        return {
          title: { save: 'Save the weekend', invite: 'You’re in' },
          default: { save: 'Save the weekend', invite: 'You’re in' },
          kindLabel: { save: 'Save the weekend', invite: 'Full invite' },
          stampShort: { save: 'SAVE · THE · WEEKEND', invite: 'YOU ARE IN' },
        };
      case 'baby-shower':
      case 'gender-reveal':
      case 'sip-and-see':
        return {
          title: { save: 'Save the date', invite: 'You’re invited' },
          default: { save: 'A new little one', invite: 'Come meet the baby' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'YOU ARE INVITED' },
        };
      case 'bridal-shower':
      case 'rehearsal-dinner':
      case 'welcome-party':
      case 'brunch':
      case 'anniversary':
      case 'housewarming':
      case 'vow-renewal':
      case 'bridal-luncheon':
        return {
          title: { save: 'Save the date', invite: 'You’re invited' },
          default: { save: 'Save the date', invite: 'You’re invited' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'YOU ARE INVITED' },
        };
      case 'reunion':
        return {
          title: { save: 'Save the weekend', invite: 'The reunion' },
          default: { save: 'Save the weekend', invite: 'Everyone, together' },
          kindLabel: { save: 'Save the Weekend', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · WEEKEND', invite: 'THE · REUNION' },
        };
      case 'birthday':
      case 'milestone-birthday':
      case 'first-birthday':
      case 'sweet-sixteen':
      case 'retirement':
      case 'graduation':
        return {
          title: { save: 'Save the date', invite: 'Celebrate with us' },
          default: { save: 'Save the date', invite: 'Celebrate with us' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'CELEBRATE · WITH · US' },
        };
      case 'bar-mitzvah':
      case 'bat-mitzvah':
      case 'quinceanera':
      case 'baptism':
      case 'first-communion':
      case 'confirmation':
        return {
          title: { save: 'Save the date', invite: 'Ceremony invite' },
          default: { save: 'Save the date', invite: 'Please join us' },
          kindLabel: { save: 'Save the Date', invite: 'Ceremony invite' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'PLEASE · JOIN · US' },
        };
      case 'wedding':
      case 'engagement':
      default:
        return {
          title: { save: 'Save the date', invite: 'Wedding invite' },
          default: { save: 'Save the date', invite: 'You’re invited' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'YOU ARE INVITED' },
        };
    }
  }, [occasion]);
  const defaultMessage = kind === 'save-the-date'
    ? invitationLabels.default.save
    : invitationLabels.default.invite;

  // Generate a QR code (data URL) pointing to the site. When a future
  // version passes a per-guest token (?g=<token>) we can swap this with
  // the Guest Passport URL — for now, the site link is the sensible
  // default for a printed invite that goes to every guest.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: 'M',
      color: { dark: variant.ink, light: '#00000000' },
    })
      .then((u) => {
        if (!cancelled) setQrDataUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullUrl, variant.ink]);

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }

  async function onDownloadPng() {
    setDownloading(true);
    try {
      const svg = svgRef.current;
      if (!svg) throw new Error('No SVG');
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const src = `data:image/svg+xml;base64,${svg64}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('image load'));
        img.src = src;
      });
      const SCALE = 3;
      const canvas = document.createElement('canvas');
      canvas.width = 1000 * SCALE;
      canvas.height = 1400 * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      ctx.scale(SCALE, SCALE);
      ctx.drawImage(img, 0, 0, 1000, 1400);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('no blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${siteSlug}-${kind}-${variantId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed — try a different browser or try again.');
    } finally {
      setDownloading(false);
    }
  }

  const [aiMessage, setAiMessage] = useState<string>('');
  const { state: aiState, error: aiError, run: runAi } = useAICall(async () => {
    const res = await fetch('/api/rewrite-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Write a 3-6 word warm ${kind} headline for a ${occasion} for ${names.filter(Boolean).join(' & ') || 'the hosts'}. No exclamation marks. Specific over generic. Return ONLY the headline, no quotes.`,
        tone: 'warm',
      }),
    });
    if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
    const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
    const text = (data.text ?? data.rewritten ?? data.result ?? '').trim().replace(/^"|"$/g, '');
    if (!text) throw new Error('Empty response');
    setAiMessage(text);
    return text;
  });

  const headline = aiMessage.trim() || defaultMessage;

  // ── AI scene generation ─────────────────────────────────────
  // Calls the existing /api/invite/render archetype renderer. The
  // result is a tall PNG on R2 — we composite it as the background
  // of the SVG preview so the host can see it under the text. Toast
  // updates via the global decor-bus so the user can navigate away
  // while Pear paints (~20-40s).
  async function paintWithPear() {
    if (aiBusy) return;
    const archetype = ARCHETYPES.find((a) => a.id === aiArchetype);
    if (!archetype) return;
    setAiBusy(true);
    setAiPaintError(null);
    const jobId = startDecorJob('invite', `Painting ${archetype.label}`);
    try {
      const palette = {
        background: variant.paper,
        foreground: variant.ink,
        accent: variant.accent,
        accentLight: variant.soft,
      };
      const res = await fetch('/api/invite/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: aiArchetype,
          siteSlug,
          names: names.filter(Boolean).join(' & ') || 'Our celebration',
          date: manifest.logistics?.date ?? '',
          venue: manifest.logistics?.venue,
          city: manifest.logistics?.venue,
          occasionLabel: occasion,
          palette,
          inspiration: inspirationImage
            ? { base64: inspirationImage.base64, mimeType: inspirationImage.mimeType }
            : undefined,
          hint: aiHint.trim() || undefined,
        }),
      });
      // Read body as text first — Vercel/edge gateways frequently
      // return plain "An error occurred" on timeouts (gpt-image-2
      // can take 30–60s, function timeout caps at the platform's
      // limit). JSON.parse on plain text crashes with a cryptic
      // "Unexpected token A" — translate to a useful message.
      const raw = await res.text();
      let parsed: { ok?: boolean; url?: string; error?: string } = {};
      try { parsed = raw ? JSON.parse(raw) : {}; }
      catch {
        // Non-JSON response (gateway timeout / 504) — surface a
        // human reason instead of the parse error.
        if (res.status === 504 || /An error occurred/i.test(raw)) {
          throw new Error('Pear timed out before the painter finished. Try a simpler archetype or run it again.');
        }
        throw new Error(`Painter responded with non-JSON (${res.status}). Try again in a minute.`);
      }
      if (!res.ok) {
        throw new Error(parsed.error ?? `Render failed (${res.status})`);
      }
      if (!parsed.url) throw new Error('Pear returned no image URL.');
      setAiBackgroundUrl(parsed.url);
      completeDecorJob(jobId, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Paint failed';
      setAiPaintError(msg);
      completeDecorJob(jobId, false, msg);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <DashLayout active="sites" hideTopbar>
      <div
        className="pl8-invite-layout"
        style={{ padding: 'clamp(20px, 3vw, 32px)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24 }}
      >
        <main>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
                Designer
              </div>
              <h1 className="display" style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: 0 }}>
                {kind === 'save-the-date' ? invitationLabels.title.save : invitationLabels.title.invite}
              </h1>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Surface mode — Template = legacy SVG variants;
                  Canvas = the new free-form drag/resize editor. */}
              <div style={{ display: 'flex', padding: 3, background: 'var(--cream-2)', borderRadius: 10, gap: 2 }}>
                {(
                  [
                    { v: 'template' as const, l: 'Templates' },
                    { v: 'canvas' as const,   l: 'Canvas' },
                  ]
                ).map((o) => {
                  const on = surfaceMode === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => {
                        setSurfaceMode(o.v);
                        if (o.v === 'canvas' && !canvasScene) {
                          // Seed a scene from the currently-picked
                          // legacy variant so the canvas isn't blank.
                          const stamp = kind === 'save-the-date'
                            ? invitationLabels.stampShort.save
                            : invitationLabels.stampShort.invite;
                          setCanvasScene(buildScene(canvasTemplateId, {
                            names,
                            dateLabel: date.long,
                            venue,
                            occasionLabel: occasion,
                            photo: manifestPhotos[0],
                            stamp,
                          }));
                        }
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: on ? 'var(--ink)' : 'transparent',
                        color: on ? 'var(--cream)' : 'var(--ink)',
                        border: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {o.l}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', padding: 3, background: 'var(--cream-2)', borderRadius: 10, gap: 2 }}>
                {(
                  [
                    { v: 'save-the-date', l: invitationLabels.kindLabel.save },
                    { v: 'invitation', l: invitationLabels.kindLabel.invite },
                  ] as const
                ).map((o) => {
                  const on = kind === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setKindAndAdjust(o.v)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: on ? 'var(--ink)' : 'transparent',
                        color: on ? 'var(--cream)' : 'var(--ink)',
                        border: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {o.l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {surfaceMode === 'template' ? (
            <div
              style={{
                background: 'var(--cream-2)',
                borderRadius: 24,
                padding: 'clamp(20px, 3vw, 40px)',
                border: '1px solid var(--card-ring)',
                display: 'grid',
                placeItems: 'center',
                minHeight: 560,
              }}
            >
              <div
                style={{
                  width: 'min(520px, 100%)',
                  aspectRatio: '1000 / 1400',
                  boxShadow: '0 24px 60px rgba(61,74,31,0.18), 0 2px 6px rgba(0,0,0,0.06)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: variant.paper,
                }}
              >
                <InviteSvg
                  ref={svgRef}
                  variant={variant}
                  headline={headline}
                  names={names}
                  date={date}
                  venue={venue}
                  prettyUrl={prettyUrl}
                  kind={kind}
                  stampLabel={kind === 'save-the-date' ? invitationLabels.stampShort.save : invitationLabels.stampShort.invite}
                  qrDataUrl={qrPosition === 'hidden' ? null : qrDataUrl}
                  qrPosition={qrPosition}
                  headlineFontFamily={FONT_FAMILIES[headlineFont].value}
                  bodyFontFamily={FONT_FAMILIES[bodyFont].value}
                  aiBackgroundUrl={aiBackgroundUrl}
                  photoSelections={photoSelections}
                  photoFilter={photoFilter}
                  photoTransform={photoTransform}
                  inviteCopy={{
                    hostingLine,
                    ceremonyTime,
                    receptionLine,
                    dressCode,
                    rsvpDeadline,
                  }}
                />
              </div>
            </div>
          ) : (
            <CanvasSurface
              scene={canvasScene}
              setScene={setCanvasScene}
              selectedId={canvasSelectedId}
              setSelectedId={setCanvasSelectedId}
              templateId={canvasTemplateId}
              setTemplateId={(id) => {
                setCanvasTemplateId(id);
                const stamp = kind === 'save-the-date'
                  ? invitationLabels.stampShort.save
                  : invitationLabels.stampShort.invite;
                setCanvasScene(buildScene(id, {
                  names, dateLabel: date.long, venue,
                  occasionLabel: occasion,
                  photo: manifestPhotos[0], stamp,
                }));
                setCanvasSelectedId(null);
              }}
            />
          )}

          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pl-pearl-accent"
              onClick={() => setPrintOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="send" size={13} /> Print &amp; mail
            </button>
            <button type="button" className="btn btn-outline" onClick={onDownloadPng} disabled={downloading}>
              <Icon name="download" size={13} />
              {downloading ? 'Exporting…' : 'Download PNG'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onCopyLink}>
              <Icon name={copied ? 'check' : 'link'} size={13} />
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <Link
              href={`/dashboard/rsvp?action=bulk-invite&source=${kind}`}
              className="btn btn-outline"
            >
              <Icon name="mail" size={13} /> Email to guests
            </Link>
          </div>
        </main>

        <aside
          className="pl8-invite-inspector"
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--line-soft)',
            borderRadius: 18,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            alignSelf: 'start',
            position: 'sticky',
            top: 24,
          }}
        >
          {surfaceMode === 'canvas' && canvasScene ? (
            <CanvasInspector
              scene={canvasScene}
              setScene={setCanvasScene}
              selectedId={canvasSelectedId}
              setSelectedId={setCanvasSelectedId}
              libraryPhotos={manifestPhotos}
              pearPaintUrl={aiBackgroundUrl}
            />
          ) : (
            <InspectorTabsAndContent />
          )}
        </aside>
      </div>
      <DecorGenerationToast />
      <PrintMailModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        siteSlug={siteSlug}
        kind={kind === 'save-the-date' ? 'save-the-date' : 'invitation'}
        getSvg={() => {
          const el = svgRef.current;
          if (!el) return null;
          return new XMLSerializer().serializeToString(el);
        }}
      />
    </DashLayout>
  );

  // Hoisted as a function component within the closure so it
  // captures all the state above without prop-drilling. Renders
  // the legacy template-mode inspector (variant picker, photo
  // controls, AI paint, etc.). Only invoked when surfaceMode
  // === 'template'.
  function InspectorTabsAndContent() {
    return (
      <>
          {/* Mode tabs — three lanes for designing the invite. */}
          <div
            role="tablist"
            aria-label="Designer mode"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
              padding: 3,
              background: 'var(--cream-2)',
              borderRadius: 10,
              border: '1px solid var(--line-soft)',
            }}
          >
            {(
              [
                { v: 'variant', l: 'Templates' },
                { v: 'photos', l: 'Photos' },
                { v: 'style', l: 'Style' },
                { v: 'ai', l: 'Pear paint' },
              ] as const
            ).map((o) => {
              const on = mode === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMode(o.v)}
                  style={{
                    padding: '7px 6px',
                    borderRadius: 7,
                    border: 0,
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {o.l}
                </button>
              );
            })}
          </div>

          {mode === 'variant' && (
            <div>
              <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
                {kind === 'save-the-date' ? 'Save-the-date templates' : 'Invitation templates'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {availableVariants.map((v) => {
                  const on = variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVariantId(v.id);
                        // Switching template also drops manual color
                        // overrides so the new variant reads as itself.
                        // Photo selections persist by slot id — if the
                        // new variant has a slot with the same id (e.g.
                        // 'main'), it inherits the previous photo.
                        setColorOverrides({});
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: on ? 'var(--cream-2)' : 'var(--card)',
                        border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        textAlign: 'left',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[v.paper, v.ink, v.accent, v.soft].map((c, i) => (
                          <div
                            key={i}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: c,
                              border: '1.5px solid rgba(255,255,255,0.5)',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{v.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.35 }}>{v.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'photos' && (
            <PhotoControls
              variant={variant}
              photoSelections={photoSelections}
              setPhotoSelections={setPhotoSelections}
              libraryPhotos={manifestPhotos}
              photoFilter={photoFilter}
              setPhotoFilter={setPhotoFilter}
              photoTransform={photoTransform}
              setPhotoTransform={setPhotoTransform}
            />
          )}

          {mode === 'style' && (
            <StyleControls
              variant={variant}
              colorOverrides={colorOverrides}
              setColorOverrides={setColorOverrides}
              headlineFont={headlineFont}
              setHeadlineFont={setHeadlineFont}
              bodyFont={bodyFont}
              setBodyFont={setBodyFont}
              qrPosition={qrPosition}
              setQrPosition={setQrPosition}
            />
          )}

          {mode === 'ai' && (
            <AIControls
              archetype={aiArchetype}
              setArchetype={setAiArchetype}
              busy={aiBusy}
              error={aiPaintError}
              onPaint={paintWithPear}
              hasResult={Boolean(aiBackgroundUrl)}
              onClear={() => {
                setAiBackgroundUrl(null);
                setAiPaintError(null);
              }}
              context={{
                names: names.filter(Boolean).join(' & ') || 'the host',
                venue: manifest.logistics?.venue,
                occasion,
              }}
              inspirationImage={inspirationImage}
              setInspirationImage={setInspirationImage}
              aiHint={aiHint}
              setAiHint={setAiHint}
            />
          )}

          {/* Headline editor lives beneath the mode tabs because all
              three modes share it. AI mode still wants the host to
              own the words even if Pear paints the picture. */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
              Headline
            </div>
            <input
              type="text"
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              placeholder={defaultMessage}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--paper)',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                fontSize: 14,
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: 10 }}>
              <AISuggestButton
                label="Draft with Pear"
                runningLabel="Writing…"
                state={aiState}
                onClick={() => void runAi()}
                error={aiError ?? undefined}
                size="sm"
              />
            </div>
          </div>

          {/* Invitation-only copy fields. Real wedding invitations
              follow a long-standing form: hosting line, ceremony
              time, reception line, dress code, RSVP deadline. We
              only surface these when kind = 'invitation' so save-
              the-dates stay simple. */}
          {kind === 'invitation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>
                Invitation copy
              </div>
              <InviteFieldInput
                label="Hosting line"
                value={hostingLine}
                placeholder="Together with their families"
                onChange={setHostingLine}
              />
              <InviteFieldInput
                label="Ceremony time"
                value={ceremonyTime}
                placeholder="4:00 in the afternoon"
                onChange={setCeremonyTime}
              />
              <InviteFieldInput
                label="Reception line"
                value={receptionLine}
                placeholder="Reception to follow"
                onChange={setReceptionLine}
              />
              <InviteFieldInput
                label="Dress code"
                value={dressCode}
                placeholder="Black tie optional"
                onChange={setDressCode}
              />
              <InviteFieldInput
                label="RSVP line"
                value={rsvpDeadline}
                placeholder="Kindly respond by September 1"
                onChange={setRsvpDeadline}
              />
            </div>
          )}

          <div
            style={{
              padding: 12,
              background: 'var(--lavender-bg)',
              border: '1px solid rgba(107,90,140,0.2)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 4 }}>
              About this print
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Downloads at 3000×4200 PNG (300dpi at 10×14 in). Scales cleanly to 5×7 postcards and 4×6 photo prints.
            </div>
          </div>
      </>
    );
  }
}

// Small input row — keeps invitation fields visually consistent.
function InviteFieldInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '9px 12px',
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 9,
          fontSize: 13,
          color: 'var(--ink)',
          fontFamily: 'var(--font-ui)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

// ── StyleControls ──────────────────────────────────────────
// Color overrides + font dropdowns + QR position. Applied on
// top of the chosen template variant — clearing an override
// snaps that slot back to the template default.
function StyleControls({
  variant,
  colorOverrides,
  setColorOverrides,
  headlineFont,
  setHeadlineFont,
  bodyFont,
  setBodyFont,
  qrPosition,
  setQrPosition,
}: {
  variant: Variant;
  colorOverrides: { paper?: string; ink?: string; accent?: string; soft?: string };
  setColorOverrides: (next: { paper?: string; ink?: string; accent?: string; soft?: string }) => void;
  headlineFont: FontKey;
  setHeadlineFont: (k: FontKey) => void;
  bodyFont: FontKey;
  setBodyFont: (k: FontKey) => void;
  qrPosition: QRPosition;
  setQrPosition: (p: QRPosition) => void;
}) {
  function setColor(slot: 'paper' | 'ink' | 'accent' | 'soft', value: string) {
    setColorOverrides({ ...colorOverrides, [slot]: value });
  }
  function clearColor(slot: 'paper' | 'ink' | 'accent' | 'soft') {
    const next = { ...colorOverrides };
    delete next[slot];
    setColorOverrides(next);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Colors
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {(
            [
              { slot: 'paper', label: 'Paper' },
              { slot: 'ink', label: 'Ink' },
              { slot: 'accent', label: 'Accent' },
              { slot: 'soft', label: 'Soft' },
            ] as const
          ).map(({ slot, label }) => {
            const value = (colorOverrides[slot] ?? variant[slot]) as string;
            const overridden = colorOverrides[slot] !== undefined;
            return (
              <label key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between' }}>
                  {label}
                  {overridden && (
                    <button
                      type="button"
                      onClick={() => clearColor(slot)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--peach-ink)',
                        fontSize: 10,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      reset
                    </button>
                  )}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: 'var(--card)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 9,
                  }}
                >
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setColor(slot, e.target.value)}
                    style={{
                      width: 26,
                      height: 26,
                      padding: 0,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: 'transparent',
                    }}
                  />
                  <code
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-soft)',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {value.toUpperCase()}
                  </code>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Fonts
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>Headline</span>
          <select
            value={headlineFont}
            onChange={(e) => setHeadlineFont(e.target.value as FontKey)}
            style={fontSelectStyle}
          >
            {Object.entries(FONT_FAMILIES).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>Body</span>
          <select
            value={bodyFont}
            onChange={(e) => setBodyFont(e.target.value as FontKey)}
            style={fontSelectStyle}
          >
            {Object.entries(FONT_FAMILIES).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          QR position
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {(
            [
              { v: 'tr', l: '↗' },
              { v: 'br', l: '↘' },
              { v: 'bc', l: '↓' },
              { v: 'bl', l: '↙' },
              { v: 'hidden', l: '×' },
            ] as const
          ).map((o) => {
            const on = qrPosition === o.v;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => setQrPosition(o.v)}
                title={o.v === 'hidden' ? 'Hide QR' : `QR ${o.v.toUpperCase()}`}
                style={{
                  padding: '8px 0',
                  borderRadius: 8,
                  background: on ? 'var(--ink)' : 'var(--card)',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {o.l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const fontSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--card)',
  border: '1.5px solid var(--line)',
  borderRadius: 9,
  fontSize: 12.5,
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

// ── AIControls ─────────────────────────────────────────────
// Picker for the AI archetype + Pear-suggested prompt context
// + Paint button that calls /api/invite/render and composites
// the result as the SVG background.
function AIControls({
  archetype,
  setArchetype,
  busy,
  error,
  onPaint,
  hasResult,
  onClear,
  context,
  inspirationImage,
  setInspirationImage,
  aiHint,
  setAiHint,
}: {
  archetype: ArchetypeId;
  setArchetype: (id: ArchetypeId) => void;
  busy: boolean;
  error: string | null;
  onPaint: () => void;
  hasResult: boolean;
  onClear: () => void;
  context: { names: string; venue?: string; occasion: string };
  inspirationImage: { base64: string; mimeType: string; preview: string } | null;
  setInspirationImage: (next: { base64: string; mimeType: string; preview: string } | null) => void;
  aiHint: string;
  setAiHint: (next: string) => void;
}) {
  const inspirationInputRef = useRef<HTMLInputElement | null>(null);

  async function onInspirationChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx > -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    setInspirationImage({ base64, mimeType: file.type, preview: dataUrl });
  }

  const picks = AI_ARCHETYPE_PICKS.map((id) => ARCHETYPES.find((a) => a.id === id)).filter(Boolean) as typeof ARCHETYPES;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Pear paints from
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
          {context.venue
            ? <>Pear knows the venue is <strong>{context.venue}</strong> — pick a world and Pear&apos;ll work the venue&apos;s feel into the painting.</>
            : <>Pick a world and Pear paints a bespoke background for {context.names}. Add a venue in the editor for richer context.</>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {picks.map((a) => {
            const on = archetype === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setArchetype(a.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: on ? 'var(--cream-2)' : 'var(--card)',
                  border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: on ? 'var(--peach-ink)' : 'var(--ink-muted)',
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block' }}>
                    {a.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{a.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Inspiration image (mood board) ──
          Hosts can upload one reference image — Pear uses it for
          palette + composition cues, not literal subject copying. */}
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Inspiration (optional)
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: 8 }}>
          Drop a mood-board image and Pear will mimic its palette + composition. We don&apos;t copy subjects or faces from it.
        </div>
        {inspirationImage ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, background: 'var(--cream-2)', borderRadius: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={inspirationImage.preview} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-soft)' }}>
              Pear will use this as a reference.
            </div>
            <button
              type="button"
              onClick={() => setInspirationImage(null)}
              style={{
                padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--line)', background: 'transparent',
                color: 'var(--ink-soft)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inspirationInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '14px 12px',
              borderRadius: 10,
              border: '1.5px dashed var(--line)',
              background: 'var(--card)',
              color: 'var(--ink-soft)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="image" size={13} /> Upload mood-board image
          </button>
        )}
        <input
          ref={inspirationInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            void onInspirationChange(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* ── Free-form hint ──
          Tells Pear something the archetype doesn't know — e.g.
          "feels like Tuscany at dusk" or "more art deco." */}
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Direction (optional)
        </div>
        <input
          type="text"
          value={aiHint}
          onChange={(e) => setAiHint(e.target.value)}
          placeholder="e.g. feels like Tuscany at dusk, more art deco"
          maxLength={200}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--ink)',
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onPaint}
        disabled={busy}
        className="pl-pearl-accent"
        style={{
          padding: '10px 16px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          border: 'none',
          fontFamily: 'var(--font-ui)',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Pear is painting…' : hasResult ? 'Paint another' : 'Paint with Pear'}
      </button>

      {hasResult && !busy && (
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            color: 'var(--ink-soft)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Remove background
        </button>
      )}

      {error && (
        <div
          style={{
            fontSize: 11.5,
            color: '#7A2D2D',
            background: 'rgba(122,45,45,0.08)',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-muted)',
          lineHeight: 1.45,
          padding: '10px 12px',
          background: 'var(--lavender-bg)',
          border: '1px solid rgba(107,90,140,0.2)',
          borderRadius: 10,
        }}
      >
        Pear paints in ~30 seconds — you can switch tabs and keep editing while it works. The toast in the bottom-right will tell you when it&apos;s ready.
      </div>
    </div>
  );
}

// ── PhotoControls ──────────────────────────────────────────
// Per-slot photo picker. Supports four sources:
//   1. Library — photos already on the manifest (chapter / hero
//      images + uploaded user_media that ship with the site).
//   2. Device upload — file picker → base64 → /api/photos/upload
//      → R2/Supabase URL.
//   3. Google Photos — OAuth picker → server-side mirror to R2.
//   4. Paste URL — instant, useful for Dropbox / iCloud links.
//
// Variants without photoSlots show a friendly empty state explaining
// to switch to a photo template (or to use Pear paint).
function PhotoControls({
  variant,
  photoSelections,
  setPhotoSelections,
  libraryPhotos,
  photoFilter,
  setPhotoFilter,
  photoTransform,
  setPhotoTransform,
}: {
  variant: Variant;
  photoSelections: Record<string, string>;
  setPhotoSelections: (next: Record<string, string>) => void;
  libraryPhotos: string[];
  photoFilter: PhotoFilter;
  setPhotoFilter: (next: PhotoFilter) => void;
  photoTransform: { zoom: number; offsetX: number; offsetY: number };
  setPhotoTransform: (next: { zoom: number; offsetX: number; offsetY: number }) => void;
}) {
  const slots = variant.photoSlots ?? [];
  const [activeSlot, setActiveSlot] = useState<string>(() => slots[0]?.id ?? '');
  const [pasteUrl, setPasteUrl] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { pick: pickGoogle, state: gpState, error: gpError, isActive: gpActive } = useGooglePhotosPicker();

  // Reset active slot whenever the variant changes (the slot ids
  // might not match between variants — e.g. polaroid-stack uses
  // 'left' + 'right', the others use 'main').
  useEffect(() => {
    if (slots.length === 0) {
      setActiveSlot('');
      return;
    }
    if (!slots.some((s) => s.id === activeSlot)) {
      setActiveSlot(slots[0].id);
    }
  }, [variant.id, slots, activeSlot]);

  function setSlot(slotId: string, url: string | null) {
    const next = { ...photoSelections };
    if (url) {
      next[slotId] = url;
    } else {
      delete next[slotId];
    }
    setPhotoSelections(next);
  }

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeSlot) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadError('That photo is over 12MB — please pick a smaller one.');
      return;
    }
    setUploadBusy(true);
    setUploadError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read failed'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            base64,
            filename: file.name,
            mimeType: file.type,
            capturedAt: new Date(file.lastModified).toISOString(),
          }],
          source: 'invite',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        photos?: Array<{ baseUrl?: string }>;
        error?: string;
      };
      if (!res.ok || !data.photos?.[0]?.baseUrl) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setSlot(activeSlot, data.photos[0].baseUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadBusy(false);
    }
  }, [activeSlot, photoSelections]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPickGoogle = useCallback(async () => {
    if (!activeSlot) return;
    setUploadError(null);
    try {
      await pickGoogle(async (picked: PickedPhoto[]) => {
        const first = picked[0];
        if (!first?.baseUrl) return;
        // Mirror to R2 via the upload route so we don't depend on
        // Google's 1h-expiring CDN URL. Uses sourceUrl path.
        try {
          setUploadBusy(true);
          const res = await fetch('/api/photos/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photos: [{
                sourceUrl: first.baseUrl,
                filename: first.filename || `google-${first.id}.jpg`,
                mimeType: first.mimeType || 'image/jpeg',
                width: first.width,
                height: first.height,
              }],
              source: 'invite',
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            photos?: Array<{ baseUrl?: string }>;
            error?: string;
          };
          if (!res.ok || !data.photos?.[0]?.baseUrl) {
            throw new Error(data.error || `Upload failed (${res.status})`);
          }
          setSlot(activeSlot, data.photos[0].baseUrl);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Could not import that Google photo.');
        } finally {
          setUploadBusy(false);
        }
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Google Photos picker failed.');
    }
  }, [activeSlot, pickGoogle]); // eslint-disable-line react-hooks/exhaustive-deps

  if (slots.length === 0) {
    return (
      <div
        style={{
          padding: '14px 14px',
          background: 'var(--cream-2)',
          border: '1px dashed var(--line)',
          borderRadius: 12,
          fontSize: 12.5,
          color: 'var(--ink-soft)',
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: 'var(--ink)' }}>This template is type-first.</strong>
        <div style={{ marginTop: 6 }}>
          To put a photo on the front, switch to one of the photo templates ({variant.kind === 'invitation' ? 'Polaroid' : 'Photo postcard, Polaroid stack, or Frame'}) in the <em>Templates</em> tab.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Slot picker — only shown when the variant has more than one
          slot. The polaroid-stack template has two photos, so the
          host needs to know which one they're filling. */}
      {slots.length > 1 && (
        <div>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
            Photo slot
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${slots.length}, 1fr)`, gap: 6 }}>
            {slots.map((s) => {
              const on = activeSlot === s.id;
              const filled = Boolean(photoSelections[s.id]);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSlot(s.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                    background: on ? 'var(--cream-2)' : 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{s.id}</div>
                  <div style={{ fontSize: 10.5, color: filled ? 'var(--peach-ink)' : 'var(--ink-muted)', marginTop: 2 }}>
                    {filled ? '● filled' : 'empty'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources stack — three actions + a paste-URL input */}
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Add a photo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadBusy || !activeSlot}
            style={photoActionStyle(uploadBusy)}
          >
            <Icon name="image" size={13} /> Upload
          </button>
          <button
            type="button"
            onClick={() => void onPickGoogle()}
            disabled={uploadBusy || gpActive || !activeSlot}
            style={photoActionStyle(uploadBusy || gpActive)}
          >
            <Icon name="image" size={13} /> Google Photos
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            void onUploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <input
            type="url"
            placeholder="Paste a photo URL"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'var(--paper)',
              border: '1.5px solid var(--line)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--ink)',
              fontFamily: 'var(--font-ui)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            disabled={!pasteUrl.trim() || !activeSlot}
            onClick={() => {
              const t = pasteUrl.trim();
              if (!t) return;
              setSlot(activeSlot, t);
              setPasteUrl('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--ink)',
              color: 'var(--cream)',
              border: 0,
              fontSize: 12,
              fontWeight: 600,
              cursor: pasteUrl.trim() ? 'pointer' : 'default',
              opacity: pasteUrl.trim() ? 1 : 0.5,
            }}
          >
            Use
          </button>
        </div>
        {(uploadBusy || gpState === 'creating' || gpState === 'waiting' || gpState === 'fetching') && (
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8 }}>
            {gpState === 'waiting' ? 'Waiting on Google Photos…' : 'Uploading…'}
          </div>
        )}
        {(uploadError || gpError) && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11.5,
              color: '#7A2D2D',
              background: 'rgba(122,45,45,0.08)',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            {uploadError || gpError}
          </div>
        )}
      </div>

      {/* Library — manifest photos as a clickable grid */}
      {libraryPhotos.length > 0 && (
        <div>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
            From your site
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {libraryPhotos.slice(0, 12).map((url) => {
              const on = activeSlot && photoSelections[activeSlot] === url;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => activeSlot && setSlot(activeSlot, url)}
                  disabled={!activeSlot}
                  title="Use this photo"
                  style={{
                    padding: 0,
                    border: on ? '2px solid var(--peach-ink)' : '1.5px solid var(--line)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    aspectRatio: '1 / 1',
                    background: 'var(--cream-2)',
                    cursor: activeSlot ? 'pointer' : 'default',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active slot preview + clear */}
      {activeSlot && photoSelections[activeSlot] && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--cream-2)', borderRadius: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSelections[activeSlot]}
            alt=""
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
          />
          <div style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Photo set for <strong style={{ color: 'var(--ink)' }}>{activeSlot}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSlot(activeSlot, null)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink-soft)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Remove
          </button>
        </div>
      )}

      {/* ── Filter chips ──
          Six SVG-driven looks applied across every photo slot. The
          shared filter id pattern is pf-{variantId}-{filter} which
          the InviteSvg defines in <defs>. */}
      {Object.values(photoSelections).some(Boolean) && (
        <div>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
            Filter
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(
              [
                { v: 'none' as const, l: 'None' },
                { v: 'sepia' as const, l: 'Sepia' },
                { v: 'film' as const, l: 'Film' },
                { v: 'dreamy' as const, l: 'Dreamy' },
                { v: 'mono' as const, l: 'B&W' },
                { v: 'vintage' as const, l: 'Vintage' },
                { v: 'noir' as const, l: 'Noir' },
                { v: 'sunwash' as const, l: 'Sunwash' },
              ]
            ).map((o) => {
              const on = photoFilter === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setPhotoFilter(o.v)}
                  className="pl8-chip-pop"
                  style={{
                    padding: '7px 4px',
                    borderRadius: 8,
                    border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                    background: on ? 'var(--cream-2)' : 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {o.l}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Light Canva mode — zoom + offset sliders ──
          Lets the host crop into a portion of any photo without
          opening a separate editor. Applied uniformly across all
          slots in the current design. */}
      {Object.values(photoSelections).some(Boolean) && (
        <div>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
            Crop &amp; reposition
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SliderRow
              label="Zoom"
              value={photoTransform.zoom}
              min={1}
              max={2.5}
              step={0.05}
              suffix="×"
              onChange={(z) => setPhotoTransform({ ...photoTransform, zoom: z })}
            />
            <SliderRow
              label="Horizontal"
              value={photoTransform.offsetX}
              min={-0.5}
              max={0.5}
              step={0.02}
              suffix=""
              onChange={(x) => setPhotoTransform({ ...photoTransform, offsetX: x })}
            />
            <SliderRow
              label="Vertical"
              value={photoTransform.offsetY}
              min={-0.5}
              max={0.5}
              step={0.02}
              suffix=""
              onChange={(y) => setPhotoTransform({ ...photoTransform, offsetY: y })}
            />
            <button
              type="button"
              onClick={() => setPhotoTransform({ zoom: 1, offsetX: 0, offsetY: 0 })}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink-soft)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Reset crop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string;
  value: number;
  min: number; max: number; step: number;
  suffix: string;
  onChange: (next: number) => void;
}) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '70px 1fr 56px', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          accentColor: 'var(--peach-ink, #C6703D)',
          width: '100%',
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(suffix === '×' ? 2 : 2)}{suffix}
      </span>
    </label>
  );
}

// ── CanvasSurface ──────────────────────────────────────────
// Wraps the new free-form canvas editor. Renders a template
// chip strip at the top, the toolbar centered above the canvas,
// and the canvas itself. Inspector lives in the right rail
// (handled by the parent layout).
function CanvasSurface({
  scene, setScene, selectedId, setSelectedId, templateId, setTemplateId,
}: {
  scene: CanvasScene | null;
  setScene: (next: CanvasScene | null) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  templateId: CanvasTemplateId;
  setTemplateId: (id: CanvasTemplateId) => void;
}) {
  return (
    <div
      style={{
        background: 'var(--cream-2)',
        borderRadius: 24,
        padding: 'clamp(16px, 2.5vw, 28px)',
        border: '1px solid var(--card-ring)',
        minHeight: 560,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Template chip strip */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CANVAS_TEMPLATES.map((t) => {
          const on = templateId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className="pl8-chip-pop"
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar (centered above the canvas) */}
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: 42 }}>
        {scene && (
          <CanvasToolbar
            scene={scene}
            setScene={(s) => setScene(s)}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        )}
      </div>

      {/* Canvas */}
      {scene ? (
        <InviteCanvas
          scene={scene}
          setScene={(s) => setScene(s)}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          editing
        />
      ) : (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-muted)' }}>
          Threading the canvas…
        </div>
      )}

      {/* Hint */}
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'center', lineHeight: 1.5 }}>
        Click an element to select. Drag to move. Pull a corner to resize. Double-click text to retype.
        Arrow keys nudge by 1px (Shift = 10px).
      </div>
    </div>
  );
}

const photoActionStyle = (busy: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  justifyContent: 'center',
  padding: '9px 10px',
  borderRadius: 10,
  background: 'var(--card)',
  border: '1.5px solid var(--line)',
  color: 'var(--ink)',
  fontSize: 12,
  fontWeight: 600,
  cursor: busy ? 'wait' : 'pointer',
  fontFamily: 'var(--font-ui)',
  opacity: busy ? 0.7 : 1,
});

/* ==================== SVG — all 8 variants in one switch ==================== */

interface InviteCopyFields {
  hostingLine?: string;
  ceremonyTime?: string;
  receptionLine?: string;
  dressCode?: string;
  rsvpDeadline?: string;
}

const InviteSvg = forwardRef<
  SVGSVGElement,
  {
    variant: Variant;
    headline: string;
    names: [string, string];
    date: { long: string; line: string; short: string };
    venue: string;
    prettyUrl: string;
    kind: DesignKind;
    stampLabel?: string;
    qrDataUrl?: string | null;
    qrPosition?: QRPosition;
    headlineFontFamily?: string;
    bodyFontFamily?: string;
    /** AI-painted background image (R2 URL). When set, composites
     *  the PNG full-bleed under the SVG text + a soft tinted plate
     *  for legibility. */
    aiBackgroundUrl?: string | null;
    /** Slot id → photo URL. Variants with photoSlots fill them in
     *  declared order; missing entries render a placeholder so the
     *  composition still reads. */
    photoSelections?: Record<string, string>;
    /** SVG-based filter applied to every photo slot. Defined
     *  per-render in <defs>, referenced via filter="url(#…)" on
     *  each <image>. */
    photoFilter?: PhotoFilter;
    /** Per-photo zoom + pan within the slot. zoom > 1 crops in;
     *  offsetX/Y in fractional units shift the image. */
    photoTransform?: { zoom: number; offsetX: number; offsetY: number };
    /** Invitation-only copy fields. Only consumed when the variant
     *  is a formal invitation template (kind = 'invitation'). */
    inviteCopy?: InviteCopyFields;
  }
>(function InviteSvg({ variant, headline, names, date, venue, prettyUrl, kind, stampLabel, qrDataUrl, qrPosition = 'br', headlineFontFamily, bodyFontFamily, aiBackgroundUrl, photoSelections, photoFilter, photoTransform, inviteCopy }, ref) {
  const [n1, n2] = names;
  const nameLine = n2 ? `${n1 || ''} & ${n2}` : n1 || 'Our celebration';
  const { paper, ink, accent, soft, id } = variant;
  const photoSlots = variant.photoSlots ?? [];
  const sels = photoSelections ?? {};
  const copy = inviteCopy ?? {};
  const filter = photoFilter ?? 'none';
  const xform = photoTransform ?? { zoom: 1, offsetX: 0, offsetY: 0 };
  // Stable filter id so all slots share the same filter definition.
  const filterId = `pf-${variant.id}-${filter}`;
  // Initials for the monogram-crest variant.
  const monogram = `${(n1 || 'A').charAt(0).toUpperCase()}${(n2 || 'B').charAt(0).toUpperCase()}`;
  const stamp =
    stampLabel ?? (kind === 'save-the-date' ? 'SAVE THE DATE' : 'INVITATION');
  const stampSoft = stamp.toLowerCase();
  // Font overrides — when the host picked a custom font in the
  // Style tab, every text node inherits it via the SVG root's
  // `font-family`. Individual text nodes may still set their own
  // family for variants that need a specific look (e.g. Polaroid's
  // handwritten note); those win because inline > inherit.
  const rootFontFamily = bodyFontFamily ?? 'Inter, sans-serif';
  const titleFontFamily = headlineFontFamily ?? 'Fraunces, Georgia, serif';
  // QR position helper — translates the corner key into x/y on the
  // 1000×1400 viewBox. Hidden mode falls through (caller passes
  // null qrDataUrl) so this only runs when we're rendering one.
  const qrCoords = (() => {
    switch (qrPosition) {
      case 'tr': return { x: 830, y: 60, labelY: 200 };
      case 'bl': return { x: 50, y: 1230, labelY: 1370 };
      case 'bc': return { x: 440, y: 1230, labelY: 1370 };
      case 'br':
      default:   return { x: 830, y: 1230, labelY: 1370 };
    }
  })();

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1400"
      width="100%"
      height="100%"
      style={{ display: 'block', background: paper, fontFamily: rootFontFamily }}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      {/* Paper — solid colour, then optional AI-painted background
          image overlaid full-bleed (when host chose Pear paint
          mode). A soft tinted plate sits over the image so the
          centre text stays legible regardless of what Pear painted. */}
      <rect x="0" y="0" width="1000" height="1400" fill={paper} />
      {aiBackgroundUrl && (
        <>
          <image
            href={aiBackgroundUrl}
            x="0"
            y="0"
            width="1000"
            height="1400"
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Vertical luminance plate — keeps the centre band
              readable when the AI scene has a busy middle.
              Tone-locked to the variant's paper so it feels like
              part of the same design system. */}
          <rect x="0" y="380" width="1000" height="640" fill={paper} opacity="0.62" />
        </>
      )}

      {/* ── Photo filter defs ──
          Six SVG filter presets that mimic Lightroom-style looks
          without leaving the browser. Each is a feColorMatrix +
          (optional) feComponentTransfer/feGaussianBlur stack.
          Applied to every photo slot via filter="url(#…)". */}
      <defs>
        {/* sepia — warm one-tone wash */}
        <filter id={`pf-${variant.id}-sepia`} x="0" y="0" width="1" height="1">
          <feColorMatrix type="matrix" values="0.39 0.77 0.19 0 0  0.35 0.69 0.17 0 0  0.27 0.53 0.13 0 0  0 0 0 1 0" />
        </filter>
        {/* film — slightly warm + lifted shadows + subtle vignette */}
        <filter id={`pf-${variant.id}-film`}>
          <feColorMatrix type="matrix" values="1.05 0 0 0 0  0 0.96 0 0 0  0 0 0.92 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.05" intercept="0.02" />
            <feFuncB type="linear" slope="0.95" intercept="0" />
          </feComponentTransfer>
        </filter>
        {/* dreamy — soft glow + lifted blacks */}
        <filter id={`pf-${variant.id}-dreamy`}>
          <feGaussianBlur stdDeviation="1.4" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.95" intercept="0.06" />
            <feFuncG type="linear" slope="0.95" intercept="0.06" />
            <feFuncB type="linear" slope="0.97" intercept="0.04" />
          </feComponentTransfer>
        </filter>
        {/* mono — true greyscale */}
        <filter id={`pf-${variant.id}-mono`}>
          <feColorMatrix type="saturate" values="0" />
        </filter>
        {/* vintage — desaturated + amber overlay tone */}
        <filter id={`pf-${variant.id}-vintage`}>
          <feColorMatrix type="saturate" values="0.55" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.1" intercept="0.04" />
            <feFuncG type="linear" slope="0.98" intercept="0.02" />
            <feFuncB type="linear" slope="0.85" intercept="-0.02" />
          </feComponentTransfer>
        </filter>
        {/* noir — high contrast black + white */}
        <filter id={`pf-${variant.id}-noir`}>
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude="1" exponent="0.7" offset="0" />
            <feFuncG type="gamma" amplitude="1" exponent="0.7" offset="0" />
            <feFuncB type="gamma" amplitude="1" exponent="0.7" offset="0" />
          </feComponentTransfer>
        </filter>
        {/* sunwash — bleached highlights + lifted yellows */}
        <filter id={`pf-${variant.id}-sunwash`}>
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.15" intercept="0.05" />
            <feFuncG type="linear" slope="1.10" intercept="0.06" />
            <feFuncB type="linear" slope="0.95" intercept="-0.02" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* ── Photo slots ──
          Render photos declared by the variant. Each slot gets a
          unique clipPath so its shape (rect / rounded / circle /
          arch / polaroid) carves the photo edges cleanly. Polaroid
          slots add a thick paper border and a soft shadow so they
          read as physical prints, not flat insets. */}
      {photoSlots.length > 0 && (
        <>
          <defs>
            {photoSlots.map((slot) => {
              const cx = slot.x + slot.w / 2;
              const cy = slot.y + slot.h / 2;
              return (
                <clipPath key={`clip-${slot.id}`} id={`photoclip-${id}-${slot.id}`}>
                  {slot.shape === 'circle' && (
                    <ellipse cx={cx} cy={cy} rx={slot.w / 2} ry={slot.h / 2} />
                  )}
                  {slot.shape === 'rounded' && (
                    <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="14" ry="14" />
                  )}
                  {slot.shape === 'arch' && (
                    <path
                      d={`M ${slot.x} ${slot.y + slot.h}
                          L ${slot.x} ${slot.y + slot.w / 2}
                          A ${slot.w / 2} ${slot.w / 2} 0 0 1 ${slot.x + slot.w} ${slot.y + slot.w / 2}
                          L ${slot.x + slot.w} ${slot.y + slot.w / 2}
                          L ${slot.x + slot.w} ${slot.y + slot.h} Z`}
                    />
                  )}
                  {(!slot.shape || slot.shape === 'rect' || slot.shape === 'polaroid') && (
                    <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} />
                  )}
                </clipPath>
              );
            })}
          </defs>
          {photoSlots.map((slot) => {
            const cx = slot.x + slot.w / 2;
            const cy = slot.y + slot.h / 2;
            const transform = slot.rotation ? `rotate(${slot.rotation} ${cx} ${cy})` : undefined;
            const url = sels[slot.id];
            const isPolaroid = slot.shape === 'polaroid';
            return (
              <g key={`photo-${slot.id}`} transform={transform}>
                {/* Polaroid paper border + shadow */}
                {isPolaroid && (
                  <>
                    <rect
                      x={slot.x - 18}
                      y={slot.y - 18}
                      width={slot.w + 36}
                      height={slot.h + 70}
                      fill="#FFFFFF"
                      stroke="rgba(14,13,11,0.08)"
                      strokeWidth="1"
                      rx="2"
                      filter="drop-shadow(0 6px 12px rgba(14,13,11,0.18))"
                    />
                  </>
                )}
                {url ? (
                  <image
                    href={url}
                    x={slot.x - (slot.w * (xform.zoom - 1)) / 2 + slot.w * xform.offsetX}
                    y={slot.y - (slot.h * (xform.zoom - 1)) / 2 + slot.h * xform.offsetY}
                    width={slot.w * xform.zoom}
                    height={slot.h * xform.zoom}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#photoclip-${id}-${slot.id})`}
                    filter={filter !== 'none' ? `url(#${filterId})` : undefined}
                  />
                ) : (
                  <g clipPath={`url(#photoclip-${id}-${slot.id})`}>
                    <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} fill={soft} />
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Inter, sans-serif"
                      fontSize="14"
                      fontWeight="600"
                      letterSpacing="0.18em"
                      fill={ink}
                      opacity="0.42"
                    >
                      ADD A PHOTO
                    </text>
                  </g>
                )}
                {/* Auto text-tint plate over photo for legibility */}
                {url && slot.textTint === 'auto' && (
                  <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.w}
                    height={slot.h}
                    fill="rgba(14,13,11,0.32)"
                    clipPath={`url(#photoclip-${id}-${slot.id})`}
                  />
                )}
              </g>
            );
          })}
        </>
      )}

      {/* ── Save-the-date · Photo postcard ──
          Big bleed photo. Date stamp lower-left, names lower-right
          so the photo's mid-frame stays clear. */}
      {id === 'photo-postcard' && (
        <>
          <text
            x="80" y="170"
            fontFamily="Inter, sans-serif"
            fontSize="20"
            fill="#FFFFFF"
            opacity="0.85"
            letterSpacing="14"
          >
            {stamp}
          </text>
          {/* Date stamp ribbon */}
          <g transform="translate(72, 1100)">
            <rect x="0" y="0" width="380" height="200" fill="rgba(0,0,0,0.36)" rx="2" />
            <text x="20" y="60" fontFamily="Inter, sans-serif" fontSize="14" fill="#FFFFFF" opacity="0.7" letterSpacing="6">
              {date.short || 'DATE TO COME'}
            </text>
            <text x="20" y="130" fontFamily="Fraunces, Georgia, serif" fontSize="62" fontWeight="600" fill="#FFFFFF" letterSpacing="-1">
              {n1 || 'Our'}
            </text>
            <text x="20" y="180" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="42" fill="#FFFFFF" opacity="0.95">
              & {n2 || 'Story'}
            </text>
          </g>
          {/* Bottom-right city + URL */}
          <text x="920" y="1240" textAnchor="end" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="32" fill="#FFFFFF" opacity="0.9">
            {venue}
          </text>
          <text x="920" y="1280" textAnchor="end" fontFamily="Inter, sans-serif" fontSize="16" fill="#FFFFFF" opacity="0.72" letterSpacing="3">
            {prettyUrl.toUpperCase()}
          </text>
          {kind === 'save-the-date' && (
            <text x="920" y="1340" textAnchor="end" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="14" fill="#FFFFFF" opacity="0.72">
              invitation to follow
            </text>
          )}
        </>
      )}

      {/* ── Save-the-date · Polaroid stack ──
          Two scattered polaroids over cream paper. Date + names
          centered below. Photos rendered above by the slot loop. */}
      {id === 'polaroid-stack' && (
        <>
          <text x="500" y="140" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} letterSpacing="14">{stamp}</text>
          <text x="500" y="900" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="118" fontWeight="600" letterSpacing="-2" fill={ink}>{nameLine}</text>
          <line x1="380" y1="970" x2="620" y2="970" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="1050" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="38" fill={ink}>{date.long}</text>
          <text x="500" y="1100" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          {kind === 'save-the-date' && (
            <text x="500" y="1300" textAnchor="middle" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="18" fill={ink} opacity="0.65">
              invitation to follow · {prettyUrl}
            </text>
          )}
          {kind === 'invitation' && (
            <text x="500" y="1300" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.65">
              {copy.rsvpDeadline || `more at ${prettyUrl}`}
            </text>
          )}
        </>
      )}

      {/* ── Save-the-date · Photo frame ──
          Photo inside a centered editorial frame, names + date
          below in classic stacked layout. */}
      {id === 'photo-frame' && (
        <>
          <text x="500" y="130" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} letterSpacing="14">{stamp}</text>
          {/* Double-rule frame around the photo */}
          <rect x="120" y="170" width="760" height="740" fill="none" stroke={accent} strokeWidth="2" rx="14" ry="14" />
          <rect x="130" y="180" width="740" height="720" fill="none" stroke={accent} strokeWidth="0.7" opacity="0.7" rx="10" ry="10" />
          <text x="500" y="990" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="108" fontWeight="600" letterSpacing="-2" fill={ink}>{nameLine}</text>
          <line x1="380" y1="1050" x2="620" y2="1050" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="1130" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="40" fill={ink}>{date.long}</text>
          <text x="500" y="1180" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          <text x="500" y="1310" textAnchor="middle" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="18" fill={ink} opacity="0.6">
            {kind === 'save-the-date' ? `invitation to follow · ${prettyUrl}` : (copy.rsvpDeadline || prettyUrl)}
          </text>
        </>
      )}

      {/* ── Save-the-date · Split portrait ──
          Half photo on the left, type stack on the right. Photo
          slot is rendered above by the slot loop; here we only
          paint the right-column type lockup. */}
      {id === 'split-portrait' && (
        <>
          <line x1="540" y1="220" x2="900" y2="220" stroke={accent} strokeWidth="1" />
          <text x="540" y="200" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} letterSpacing="8">{stamp}</text>
          <text x="540" y="500" fontFamily="Fraunces, Georgia, serif" fontSize="92" fontWeight="600" letterSpacing="-2" fill={ink}>{n1 || 'Our'}</text>
          <text x="540" y="600" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="46" fill={accent}>and</text>
          <text x="540" y="700" fontFamily="Fraunces, Georgia, serif" fontSize="92" fontWeight="600" letterSpacing="-2" fill={ink}>{n2 || 'Story'}</text>
          <line x1="540" y1="780" x2="700" y2="780" stroke={accent} strokeWidth="1.3" />
          <text x="540" y="860" fontFamily="Fraunces, Georgia, serif" fontSize="32" fill={ink}>{date.long}</text>
          <text x="540" y="910" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.7">{venue}</text>
          <text x="540" y="1320" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="3">
            {kind === 'save-the-date' ? `invitation to follow · ${prettyUrl}` : prettyUrl.toUpperCase()}
          </text>
        </>
      )}

      {/* ── Save-the-date · Corner photo ──
          Small editorial photo tucked into the top-right. Type
          lockup centred and dominant. */}
      {id === 'corner-photo' && (
        <>
          <text x="100" y="200" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} letterSpacing="10">{stamp}</text>
          <text x="100" y="640" fontFamily="Fraunces, Georgia, serif" fontSize="118" fontWeight="500" letterSpacing="-3" fill={ink}>{nameLine}</text>
          <line x1="100" y1="730" x2="280" y2="730" stroke={accent} strokeWidth="1.5" />
          <text x="100" y="820" fontFamily="Fraunces, Georgia, serif" fontSize="40" fill={ink}>{date.long}</text>
          <text x="100" y="870" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          <text x="100" y="1320" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="3">{prettyUrl.toUpperCase()}</text>
          <text x="900" y="540" textAnchor="end" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="22" fill={accent}>{kind === 'save-the-date' ? 'save the date' : 'you are invited'}</text>
        </>
      )}

      {/* ── Save-the-date · Photo medallion ──
          Round photo medallion above a centered date stamp. */}
      {id === 'photo-disc' && (
        <>
          <text x="500" y="150" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} letterSpacing="14">{stamp}</text>
          {/* Photo lives in the slot at y=160 (rendered by slot loop) */}
          <text x="500" y="610" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="98" fontWeight="500" letterSpacing="-2" fill={ink}>{nameLine}</text>
          <line x1="380" y1="700" x2="620" y2="700" stroke={accent} strokeWidth="1.5" />
          <text x="500" y="800" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="44" fill={accent}>{date.long}</text>
          <text x="500" y="870" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          {/* Decorative double rule at base */}
          <line x1="120" y1="1180" x2="880" y2="1180" stroke={accent} strokeWidth="1.5" />
          <line x1="120" y1="1190" x2="880" y2="1190" stroke={accent} strokeWidth="0.6" />
          <text x="500" y="1320" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="4">
            {kind === 'save-the-date' ? `invitation to follow · ${prettyUrl}` : prettyUrl.toUpperCase()}
          </text>
        </>
      )}

      {/* ── Save-the-date · Photo banner ──
          Wide bottom-third photo with type lockup occupying the
          top two-thirds. */}
      {id === 'banner-strip' && (
        <>
          <text x="500" y="220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} letterSpacing="14">{stamp}</text>
          <text x="500" y="460" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="500" letterSpacing="-3" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="580" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="56" fill={accent}>and</text>
          <text x="500" y="720" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="500" letterSpacing="-3" fill={ink}>{n2 || 'Story'}</text>
          <line x1="380" y1="820" x2="620" y2="820" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="890" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="34" fill={ink}>{date.long}</text>
          {/* Subtle overlay caption on the banner photo */}
          <text x="500" y="1340" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill="#FFFFFF" opacity="0.85" letterSpacing="6">{venue.toUpperCase()}</text>
        </>
      )}

      {/* ── Save-the-date · Taped snapshot ──
          Single rotated snapshot with washi-tape detail + handwritten
          date strip below. */}
      {id === 'tape-snapshot' && (
        <>
          {/* Washi-tape strips at top + bottom of the snapshot */}
          <rect x="320" y="200" width="100" height="20" fill={accent} opacity="0.4" transform="rotate(-12 370 210)" />
          <rect x="600" y="780" width="100" height="20" fill={accent} opacity="0.4" transform="rotate(8 650 790)" />
          <text x="500" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} letterSpacing="14">{stamp}</text>
          <text x="500" y="900" textAnchor="middle" fontFamily="Caveat, Fraunces, cursive" fontSize="68" fill={ink}>{nameLine}</text>
          <text x="500" y="1000" textAnchor="middle" fontFamily="Caveat, Fraunces, cursive" fontSize="48" fill={accent}>{date.long}</text>
          <text x="500" y="1080" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.7">{venue}</text>
          <text x="500" y="1310" textAnchor="middle" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="16" fill={ink} opacity="0.55">
            {kind === 'save-the-date' ? `more soon · ${prettyUrl}` : prettyUrl}
          </text>
        </>
      )}

      {/* ── Invitation · Engraved ──
          Centered serif type with a single hairline rule. Reads as
          a traditional engraved invite. Hosting line, ceremony
          time, reception line, dress code each lay out cleanly. */}
      {id === 'formal-engraved' && (
        <>
          <text x="500" y="180" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="26" fill={ink} opacity="0.65">
            {copy.hostingLine || 'Together with their families'}
          </text>
          <text x="500" y="280" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="6">
            INVITE YOU TO CELEBRATE
          </text>
          <text x="500" y="450" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="92" fontWeight="500" letterSpacing="-1.5" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="540" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="44" fontWeight="400" fill={accent}>and</text>
          <text x="500" y="650" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="92" fontWeight="500" letterSpacing="-1.5" fill={ink}>{n2 || 'Celebration'}</text>
          <line x1="430" y1="730" x2="570" y2="730" stroke={accent} strokeWidth="1" />
          <text x="500" y="810" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="32" fill={ink}>{date.long}</text>
          {copy.ceremonyTime && (
            <text x="500" y="855" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="22" fill={ink} opacity="0.7">{copy.ceremonyTime}</text>
          )}
          <text x="500" y="930" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.78">{venue}</text>
          {copy.receptionLine && (
            <text x="500" y="1020" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="22" fill={ink} opacity="0.65">{copy.receptionLine}</text>
          )}
          {copy.dressCode && (
            <text x="500" y="1140" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="5">{copy.dressCode.toUpperCase()}</text>
          )}
          {copy.rsvpDeadline && (
            <text x="500" y="1240" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="20" fill={ink} opacity="0.7">{copy.rsvpDeadline}</text>
          )}
          <text x="500" y="1330" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.5" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {/* ── Invitation · Letterpress ──
          Wide letter-spaced caps, paired hairline rules, formal
          rhythm. Reads as deeply pressed type. */}
      {id === 'letterpress' && (
        <>
          <line x1="120" y1="160" x2="880" y2="160" stroke={accent} strokeWidth="2" />
          <line x1="120" y1="172" x2="880" y2="172" stroke={accent} strokeWidth="0.6" />
          <text x="500" y="240" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill={ink} opacity="0.62" letterSpacing="8">
            {(copy.hostingLine || 'TOGETHER WITH THEIR FAMILIES').toUpperCase()}
          </text>
          <text x="500" y="430" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="78" fontWeight="600" letterSpacing="6" fill={ink}>
            {(n1 || 'OUR').toUpperCase()}
          </text>
          <text x="500" y="510" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="34" fill={accent}>&</text>
          <text x="500" y="600" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="78" fontWeight="600" letterSpacing="6" fill={ink}>
            {(n2 || 'CELEBRATION').toUpperCase()}
          </text>
          <line x1="370" y1="690" x2="630" y2="690" stroke={accent} strokeWidth="1.2" />
          <text x="500" y="780" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="6">CEREMONY</text>
          <text x="500" y="830" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="30" fill={ink}>{date.long}</text>
          {copy.ceremonyTime && (
            <text x="500" y="870" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.7">{copy.ceremonyTime}</text>
          )}
          <text x="500" y="930" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.78">{venue}</text>
          {copy.receptionLine && (
            <>
              <text x="500" y="1020" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={ink} opacity="0.55" letterSpacing="6">RECEPTION</text>
              <text x="500" y="1062" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="22" fill={ink} opacity="0.78">{copy.receptionLine}</text>
            </>
          )}
          {copy.dressCode && (
            <text x="500" y="1170" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill={ink} opacity="0.6" letterSpacing="6">{copy.dressCode.toUpperCase()}</text>
          )}
          {copy.rsvpDeadline && (
            <text x="500" y="1240" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="18" fill={ink} opacity="0.7">{copy.rsvpDeadline}</text>
          )}
          <line x1="120" y1="1280" x2="880" y2="1280" stroke={accent} strokeWidth="2" />
          <line x1="120" y1="1292" x2="880" y2="1292" stroke={accent} strokeWidth="0.6" />
          <text x="500" y="1340" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill={ink} opacity="0.55" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {/* ── Invitation · Monogram crest ──
          Initials medallion over a double-rule frame. Reads as a
          family-crest invite — formal but with a personal mark. */}
      {id === 'monogram-crest' && (
        <>
          <rect x="80" y="80" width="840" height="1240" fill="none" stroke={accent} strokeWidth="2" />
          <rect x="100" y="100" width="800" height="1200" fill="none" stroke={accent} strokeWidth="0.6" />
          <circle cx="500" cy="240" r="90" fill={soft} stroke={accent} strokeWidth="1.5" />
          <text x="500" y="270" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="58" fontWeight="600" fill={ink}>{monogram}</text>
          <text x="500" y="400" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="24" fill={ink} opacity="0.7">
            {copy.hostingLine || 'Together with their families'}
          </text>
          <text x="500" y="450" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill={ink} opacity="0.55" letterSpacing="6">REQUEST THE HONOUR OF YOUR PRESENCE</text>
          <text x="500" y="600" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="86" fontWeight="500" letterSpacing="-1" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="690" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="40" fill={accent}>and</text>
          <text x="500" y="800" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="86" fontWeight="500" letterSpacing="-1" fill={ink}>{n2 || 'Celebration'}</text>
          <line x1="430" y1="870" x2="570" y2="870" stroke={accent} strokeWidth="1" />
          <text x="500" y="950" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="28" fill={ink}>{date.long}</text>
          {copy.ceremonyTime && (
            <text x="500" y="990" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="20" fill={ink} opacity="0.72">{copy.ceremonyTime}</text>
          )}
          <text x="500" y="1050" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.72">{venue}</text>
          {copy.receptionLine && (
            <text x="500" y="1130" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="22" fill={ink} opacity="0.65">{copy.receptionLine}</text>
          )}
          {copy.dressCode && (
            <text x="500" y="1190" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill={ink} opacity="0.55" letterSpacing="6">{copy.dressCode.toUpperCase()}</text>
          )}
          {copy.rsvpDeadline && (
            <text x="500" y="1240" textAnchor="middle" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="18" fill={ink} opacity="0.6">{copy.rsvpDeadline}</text>
          )}
        </>
      )}

      {id === 'garden' && (
        <>
          <circle cx="120" cy="180" r="220" fill={soft} opacity="0.55" />
          <circle cx="880" cy="1220" r="260" fill={accent} opacity="0.3" />
          <path d="M 150 1080 Q 250 1020, 350 1080 T 550 1080 T 750 1080" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
          <text x="500" y="270" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="28" fill={ink} letterSpacing="8">{stamp}</text>
          <text x="500" y="520" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="108" fontWeight="600" letterSpacing="-2" fill={ink}>{headline}</text>
          <text x="500" y="710" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="68" fontStyle="italic" fontWeight="500" fill={accent}>{nameLine}</text>
          <text x="500" y="920" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="30" fill={ink}>{date.long}</text>
          <text x="500" y="970" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="24" fill={ink} opacity="0.7">{venue}</text>
          <line x1="380" y1="1160" x2="620" y2="1160" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="1220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.7">{prettyUrl}</text>
        </>
      )}

      {id === 'editorial' && (
        <>
          <line x1="80" y1="160" x2="920" y2="160" stroke={accent} strokeWidth="1.2" />
          <text x="500" y="130" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} letterSpacing="14">PEARLOOM · {stamp}</text>
          <text x="500" y="540" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="500" letterSpacing="-3" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="680" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="72" fontStyle="italic" fontWeight="500" fill={accent}>and</text>
          <text x="500" y="820" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="500" letterSpacing="-3" fill={ink}>{n2 || 'Celebration'}</text>
          <line x1="380" y1="940" x2="620" y2="940" stroke={accent} strokeWidth="1.2" />
          <text x="500" y="1010" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="36" fill={ink}>{date.long}</text>
          <text x="500" y="1060" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          <text x="500" y="1290" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {id === 'groovy' && (
        <>
          <path d="M 0 200 Q 200 120, 400 200 T 800 200 T 1200 200" stroke={accent} strokeWidth="3" fill="none" opacity="0.8" />
          <path d="M 0 1200 Q 200 1280, 400 1200 T 800 1200 T 1200 1200" stroke={accent} strokeWidth="3" fill="none" opacity="0.8" />
          <circle cx="170" cy="350" r="120" fill={soft} opacity="0.65" />
          <circle cx="840" cy="1040" r="140" fill={soft} opacity="0.65" />
          <text x="500" y="310" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="44" fontWeight="500" fill={ink}>~ {stampSoft} ~</text>
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="600" letterSpacing="-2" fill={ink}>{headline}</text>
          <text x="500" y="740" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="60" fontWeight="500" fill={accent}>{nameLine}</text>
          <text x="500" y="910" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="38" fill={ink}>{date.long}</text>
          <text x="500" y="965" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.72">{venue}</text>
          <text x="500" y="1290" textAnchor="middle" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="20" fill={ink} opacity="0.6">more at {prettyUrl}</text>
        </>
      )}

      {id === 'polaroid' && (
        <>
          <rect x="100" y="140" width="800" height="980" fill={soft} />
          <rect x="120" y="160" width="760" height="720" fill={accent} opacity="0.5" />
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="68" fontWeight="600" fill={paper}>{nameLine}</text>
          <text x="500" y="640" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="34" fill={paper} opacity="0.9">{date.long}</text>
          <text x="500" y="1040" textAnchor="middle" fontFamily="Caveat, Fraunces, cursive" fontSize="48" fill={ink}>{headline}</text>
          <text x="500" y="1270" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.7" letterSpacing="3">{venue.toUpperCase()}</text>
          <text x="500" y="1320" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fill={ink} opacity="0.6">{prettyUrl}</text>
        </>
      )}

      {id === 'modern' && (
        <>
          <circle cx="820" cy="260" r="180" fill={accent} opacity="0.22" />
          <text x="120" y="320" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} letterSpacing="12">{stamp}</text>
          <text x="120" y="620" fontFamily="Fraunces, Georgia, serif" fontSize="150" fontWeight="500" letterSpacing="-5" fill={ink}>{n1 || 'Our'}</text>
          <text x="120" y="800" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="90" fontWeight="400" fill={accent}>and</text>
          <text x="120" y="980" fontFamily="Fraunces, Georgia, serif" fontSize="150" fontWeight="500" letterSpacing="-5" fill={ink}>{n2 || 'Story'}</text>
          <line x1="120" y1="1110" x2="320" y2="1110" stroke={ink} strokeWidth="1.6" />
          <text x="120" y="1180" fontFamily="Inter, sans-serif" fontSize="26" fontWeight="600" fill={ink}>{date.long}</text>
          <text x="120" y="1220" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.65">{venue}</text>
          <text x="120" y="1300" fontFamily="Inter, sans-serif" fontSize="16" fill={ink} opacity="0.55" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {id === 'botanical' && (
        <>
          <path d="M 0 200 C 200 100, 400 300, 600 180 S 1000 260, 1000 260 L 1000 0 L 0 0 Z" fill={soft} opacity="0.65" />
          <path d="M 60 80 C 140 40, 200 120, 180 200 L 160 260 L 120 220 L 100 190 L 60 80 Z" fill={accent} opacity="0.7" />
          <circle cx="100" cy="120" r="12" fill={accent} />
          <text x="500" y="420" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="34" fill={ink} opacity="0.82">{stampSoft}</text>
          <text x="500" y="620" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="600" letterSpacing="-3" fill={ink}>{headline}</text>
          <text x="500" y="790" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="66" fontWeight="500" fill={accent}>{nameLine}</text>
          <line x1="380" y1="900" x2="620" y2="900" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="970" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="34" fill={ink}>{date.long}</text>
          <text x="500" y="1020" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          <text x="500" y="1300" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6">{prettyUrl}</text>
        </>
      )}

      {id === 'cinema' && (
        <>
          <rect x="0" y="1200" width="1000" height="200" fill="rgba(0,0,0,0.3)" />
          <text x="500" y="220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.7" letterSpacing="12">FEATURING</text>
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="600" letterSpacing="-3" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="720" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="72" fontWeight="500" fill={accent}>and</text>
          <text x="500" y="880" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="600" letterSpacing="-3" fill={ink}>{n2 || 'Story'}</text>
          <line x1="380" y1="1000" x2="620" y2="1000" stroke={accent} strokeWidth="1.5" />
          <text x="500" y="1080" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="36" fill={accent}>{date.long}</text>
          <text x="500" y="1135" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.72">{venue}</text>
          <text x="500" y="1340" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {id === 'linen' && (
        <>
          <line x1="90" y1="120" x2="910" y2="120" stroke={accent} strokeWidth="2" />
          <line x1="90" y1="1280" x2="910" y2="1280" stroke={accent} strokeWidth="2" />
          <line x1="90" y1="132" x2="910" y2="132" stroke={accent} strokeWidth="0.7" />
          <line x1="90" y1="1268" x2="910" y2="1268" stroke={accent} strokeWidth="0.7" />
          <text x="500" y="220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} letterSpacing="12">{stamp}</text>
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="600" letterSpacing="-2" fill={ink}>{headline}</text>
          <text x="500" y="740" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="68" fontWeight="500" fill={accent}>{nameLine}</text>
          <text x="500" y="930" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="38" fill={ink}>{date.long}</text>
          <text x="500" y="985" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="24" fill={ink} opacity="0.72">{venue}</text>
          <text x="500" y="1230" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6">{prettyUrl}</text>
        </>
      )}

      {/* QR code — position chosen by the host in the Style tab.
          Hidden mode skips render entirely (caller passes null
          qrDataUrl). Scans → the couple's site (or future per-guest
          passport). */}
      {qrDataUrl && (
        <g>
          <image href={qrDataUrl} x={qrCoords.x} y={qrCoords.y} width="120" height="120" />
          <text
            x={qrCoords.x + 60}
            y={qrCoords.labelY}
            textAnchor="middle"
            fontFamily={rootFontFamily}
            fontSize="11"
            fill={ink}
            opacity="0.62"
            letterSpacing="2"
          >
            SCAN
          </text>
        </g>
      )}
    </svg>
  );
});
