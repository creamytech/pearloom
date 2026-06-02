'use client';

/* ========================================================================
   DecorLibraryPanel — couple-side admin for the AI decor library.

   Visual treatment: faithful port of the prototype's `DecorLibrary`
   drawer (ClaudeDesign/pages/decor-library.jsx). Renders as an
   embedded card with a header + 5-tab strip (Motifs · Dividers ·
   Patterns · Monogram · Generate) + scrollable body + footer reset
   pill. Each tab maps to a coherent slice of the existing manifest
   data flow:

     Motifs   → manifest.motifs (blob/stamp/squiggle/sparkle/heart/
                postIt/polaroid) + color picker (writes nothing — the
                renderer derives motif tint from the theme accent) +
                density slider (writes manifest.density).
     Dividers → manifest.decorLibrary.dividerStrength enum picker
                + slot-card for the AI-painted divider image.
     Patterns → manifest.pattern (12 print tiles).
     Monogram → manifest.monogram (initials + frame + joiner).
     Generate → /api/decor/generate-from-text → applies pattern +
                motif + accent + dividerStrength in one shot.

   The AI decor library (full draft of divider + section stamps +
   confetti + footer flourish) lives at the bottom of the Dividers
   tab — it's the "advanced" path most hosts won't touch on first
   open. Per-slot custom-prompt composer + alternates strip + error
   surfacing all preserved.
   ======================================================================== */

import { useCallback, useState, type ReactNode } from 'react';
import type { StoryManifest, DecorDraft, SectionStampsDraft } from '@/types';
import { PanelSection, PanelGroup } from '../atoms';
import { Icon } from '../../motifs';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';

function decorJobLabel(slot: string): string {
  switch (slot) {
    case 'divider': return 'Section dividers';
    case 'sectionStamps': return 'Section stamps';
    case 'confetti': return 'Confetti burst';
    case 'footerBouquet': return 'Closing flourish';
    case 'accent': return 'Hero flourish';
    default: return slot;
  }
}
import { getVenueMotifs, describeVenueMatch, type VenueMotif } from '@/lib/decor/venue-motifs';
import {
  DecorPromptComposer,
  DecorAlternatesStrip,
  pushDraft,
  pushSectionStampsDraft,
  buildAutoSummary,
} from './decor-shared';
import { Monogram, deriveInitials, type MonogramFrame } from '../../site/Monogram';

type LibrarySlot = 'divider' | 'sectionStamps' | 'confetti' | 'footerBouquet';
type Status = 'idle' | 'running' | 'ok' | 'error';

const SLOT_META: Record<LibrarySlot, { label: string; hint: string; aspect: '5/2' | '1/1' | '2/3' | '3/2' }> = {
  divider: { label: 'Section divider', hint: 'Hand-drawn ornament between every section.', aspect: '5/2' },
  sectionStamps: { label: 'Section stamps', hint: 'Tiny wax-seal icons next to each block title.', aspect: '3/2' },
  confetti: { label: 'RSVP confetti', hint: 'Plays once when a guest confirms.', aspect: '1/1' },
  footerBouquet: { label: 'Footer flourish', hint: 'Closing bouquet above the footer.', aspect: '2/3' },
};

/* ── Tab strip primitive — direct port of the prototype's `TabBtn`.
   Active tab = ink fill, inactive = transparent + ink-soft label,
   icon above 10.5px label, equal flex distribution. ── */
function DLTabBtn({
  on, onClick, icon, label,
}: { on: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '9px 4px',
        borderRadius: 10,
        cursor: 'pointer',
        background: on ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'transparent',
        color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
        border: 'none',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <Icon name={icon} size={16} color={on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)'} />
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
    </button>
  );
}

/* ── Gallery label — uppercase muted micro-label above each
   tile grid, ported verbatim from the prototype. ── */
function DLGalleryLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted, var(--pl-ink-soft, #6F6557))',
        margin: '14px 2px 10px',
      }}
    >
      {children}
    </div>
  );
}

/* ── ThemedTile — squarish picker tile with active outline + tick
   badge. Used by the Motifs + Patterns grids. The prototype scopes
   theme vars inside each tile so motif color matches the live
   palette; here we just bind to the surrounding theme. ── */
function DLThemedTile({
  active, onClick, children, padding = 14, minHeight = 78, background,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  padding?: number | string;
  minHeight?: number;
  background?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        background: background ?? 'var(--cream-2, #FBF7EE)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        minHeight,
        padding,
        cursor: 'pointer',
        outline: active
          ? '2.5px solid var(--lavender-2, var(--pl-olive, #5C6B3F))'
          : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        outlineOffset: active ? -1 : 0,
        border: 'none',
        transition: 'outline-color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--lavender-2, var(--pl-olive, #5C6B3F))',
            display: 'grid',
            placeItems: 'center',
            zIndex: 3,
          }}
        >
          <Icon name="check" size={11} color="#fff" />
        </span>
      )}
    </button>
  );
}

/* ── DL_MOTIF_TILES — production motif palette mapped to the
   prototype's pickable-tile model. Mutually exclusive: choosing
   one motif clears the others (the renderer composes ONE motif
   on the hero, not multiple). The blob icon legend matches the
   ThemePanel's existing motif preview. ── */
type ProdMotifKey = 'none' | 'blob' | 'stamp' | 'squiggle' | 'sparkle' | 'heart' | 'postIt' | 'polaroid';
const DL_MOTIF_TILES: { id: ProdMotifKey; label: string; icon?: ReactNode }[] = [
  { id: 'none', label: 'None' },
  { id: 'blob', label: 'Blob', icon: <span style={{ width: 38, height: 38, borderRadius: '50% 60% 55% 45% / 55% 45% 60% 50%', background: 'var(--sage-tint, var(--pl-olive, #5C6B3F))', opacity: 0.7 }} /> },
  { id: 'stamp', label: 'Stamp', icon: <span style={{ width: 42, height: 42, borderRadius: 8, border: '1.5px dashed var(--sage-deep, var(--pl-olive, #5C6B3F))', display: 'grid', placeItems: 'center', fontSize: 14, fontFamily: 'var(--font-display, serif)', color: 'var(--sage-deep, var(--pl-olive, #5C6B3F))' }}>EST.</span> },
  { id: 'squiggle', label: 'Squiggle', icon: <svg width="48" height="22" viewBox="0 0 48 22" aria-hidden="true"><path d="M2 11 Q 8 2, 14 11 T 26 11 T 38 11 T 46 11" fill="none" stroke="var(--sage-deep, var(--pl-olive, #5C6B3F))" strokeWidth="1.6" strokeLinecap="round" /></svg> },
  { id: 'sparkle', label: 'Sparkle', icon: <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.8L18.6 9l-4.8 1.8L12 15.6 10.2 10.8 5.4 9l4.8-1.2z" fill="var(--gold, #B8935A)" /></svg> },
  { id: 'heart', label: 'Heart', icon: <svg width="36" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.4-7 10-7 10z" fill="var(--peach-ink, #C6703D)" opacity="0.85" /></svg> },
  { id: 'postIt', label: 'Post-it', icon: <span style={{ width: 44, height: 36, background: 'var(--peach-bg, #FCE6D7)', border: '1px solid var(--peach-2, #F4C7A4)', borderRadius: 2, transform: 'rotate(-3deg)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--peach-ink, #C6703D)' }}>save the date</span> },
  { id: 'polaroid', label: 'Polaroid', icon: <span style={{ width: 36, height: 42, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', border: '1px solid var(--line-soft, rgba(14,13,11,0.10))', transform: 'rotate(2deg)', display: 'grid', gridTemplateRows: '1fr auto' }}><span style={{ background: 'var(--sage-tint, color-mix(in oklab, var(--pl-olive, #5C6B3F) 14%, #fff))' }} /><span style={{ fontSize: 7, color: 'var(--ink-muted, #6F6557)', padding: '2px 0', textAlign: 'center' }}>1985</span></span> },
];

/* ── DL_COLOR_CHIPS — recolor row beneath the motif grid. The
   prototype writes a CSS var to a tile-scoped `--t-motif`; in
   production, motif tint flows from `theme.colors.accent`. This
   row offers the active accent + 3 alternates and patches
   `manifest.theme.colors.accent` (which the renderer picks up via
   CSS-var overrides). The "Ink" / "Deep" options are read-only
   reminders so the visual treatment matches the prototype. ── */
const DL_COLOR_CHIPS: { id: 'accent' | 'soft' | 'gold' | 'ink'; label: string; valueFn: (t?: { accent?: string; accentLight?: string; foreground?: string }) => string }[] = [
  { id: 'accent', label: 'Accent', valueFn: (t) => t?.accent ?? 'var(--pl-olive, #5C6B3F)' },
  { id: 'soft', label: 'Soft', valueFn: (t) => t?.accentLight ?? 'var(--peach-ink, #C6703D)' },
  { id: 'gold', label: 'Gold', valueFn: () => 'var(--gold, #B8935A)' },
  { id: 'ink', label: 'Ink', valueFn: (t) => t?.foreground ?? 'var(--pl-ink, #0E0D0B)' },
];

/* ── DL_DIVIDER_TILES — maps prototype's 5 divider looks onto
   production's 3-tier dividerStrength enum + the "kit default"
   reset row. Each preview is a hairline SVG so the user can read
   the shape without painting a real divider. ── */
type DividerStrengthId = 'subtle' | 'standard' | 'tall';
const DL_DIVIDER_TILES: { id: DividerStrengthId; label: string; render: () => ReactNode }[] = [
  { id: 'subtle', label: 'Hairline', render: () => (
    <svg width="170" height="20" viewBox="0 0 170 20" aria-hidden="true"><line x1="0" y1="10" x2="170" y2="10" stroke="var(--ink-soft, #3A332C)" strokeOpacity="0.35" strokeWidth="0.6" /></svg>
  ) },
  { id: 'standard', label: 'Standard', render: () => (
    <svg width="170" height="30" viewBox="0 0 170 30" aria-hidden="true">
      <line x1="0" y1="15" x2="68" y2="15" stroke="var(--ink-soft, #3A332C)" strokeOpacity="0.55" strokeWidth="1" />
      <line x1="102" y1="15" x2="170" y2="15" stroke="var(--ink-soft, #3A332C)" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="85" cy="15" r="3" fill="var(--sage-deep, var(--pl-olive, #5C6B3F))" />
    </svg>
  ) },
  { id: 'tall', label: 'Statement', render: () => (
    <svg width="170" height="44" viewBox="0 0 170 44" aria-hidden="true">
      <path d="M0 22 Q42 8 85 22 T 170 22" stroke="var(--sage-deep, var(--pl-olive, #5C6B3F))" strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="85" cy="22" r="4.5" fill="none" stroke="var(--gold, #B8935A)" strokeWidth="1" />
    </svg>
  ) },
];

/* ── DL_DENSITY — production density enum (cozy / comfortable /
   spacious). The prototype's "Subtle / Generous" binary is a
   subset of this trichotomy. ── */
const DL_DENSITY: { id: 'cozy' | 'comfortable' | 'spacious'; label: string }[] = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'spacious', label: 'Spacious' },
];

type DLTab = 'motifs' | 'dividers' | 'patterns' | 'monogram' | 'generate';

export function DecorLibraryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const lib = manifest.decorLibrary;
  const drafts = manifest.decorDrafts ?? {};
  const ctx = useContext(manifest);

  const [tab, setTab] = useState<DLTab>('motifs');

  const [status, setStatus] = useState<Record<LibrarySlot, Status>>({
    divider: 'idle', sectionStamps: 'idle', confetti: 'idle', footerBouquet: 'idle',
  });
  const [errors, setErrors] = useState<Record<LibrarySlot, string | null>>({
    divider: null, sectionStamps: null, confetti: null, footerBouquet: null,
  });
  const [customPrompts, setCustomPrompts] = useState<Record<LibrarySlot, string>>({
    divider: '', sectionStamps: '', confetti: '', footerBouquet: '',
  });

  const generate = useCallback(
    async (slots: LibrarySlot[]) => {
      setStatus((s) => {
        const next = { ...s };
        for (const k of slots) next[k] = 'running';
        return next;
      });
      setErrors((e) => {
        const next = { ...e };
        for (const k of slots) next[k] = null;
        return next;
      });
      // Surface every slot as a job in the floating decor toast so
      // the user sees progress even after they navigate away from
      // the Theme tab. One job per slot keeps the toast specific
      // about what's running.
      const jobIds: Record<string, string> = {};
      for (const k of slots) {
        jobIds[k] = startDecorJob(k, decorJobLabel(k));
      }
      try {
        const slotPrompts: Partial<Record<LibrarySlot, string>> = {};
        for (const k of slots) {
          const p = customPrompts[k]?.trim();
          if (p) slotPrompts[k] = p;
        }
        const res = await fetch('/api/decor/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...ctx, slots,
            customPrompts: Object.keys(slotPrompts).length ? slotPrompts : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? String(res.status));
        }
        const raw = (await res.json()) as unknown;
        const dataObj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
        const libRaw = dataObj.library;
        const promptsRaw = (dataObj.prompts as Record<string, string>) || {};

        // Validate library shape — accept only known keys + string URLs.
        const incoming: Partial<NonNullable<StoryManifest['decorLibrary']>> = {};
        if (libRaw && typeof libRaw === 'object') {
          const l = libRaw as Record<string, unknown>;
          if (typeof l.divider === 'string') incoming.divider = l.divider;
          if (typeof l.confetti === 'string') incoming.confetti = l.confetti;
          if (typeof l.footerBouquet === 'string') incoming.footerBouquet = l.footerBouquet;
          if (l.sectionStamps && typeof l.sectionStamps === 'object') {
            const stamps: Record<string, string> = {};
            for (const [k, v] of Object.entries(l.sectionStamps as Record<string, unknown>)) {
              if (typeof v === 'string') stamps[k] = v;
            }
            if (Object.keys(stamps).length) incoming.sectionStamps = stamps;
          }
          if (typeof l.updatedAt === 'string') incoming.updatedAt = l.updatedAt;
        }

        // Update manifest: live URLs go into decorLibrary, history into
        // decorDrafts. Each slot's draft is keyed by the per-slot prompt.
        const nextDrafts = { ...(manifest.decorDrafts ?? {}) };
        const ts = new Date().toISOString();
        for (const k of slots) {
          if (k === 'sectionStamps' && incoming.sectionStamps) {
            const draft: SectionStampsDraft = {
              id: `stamps-${Date.now()}`,
              stamps: { ...incoming.sectionStamps },
              prompt: promptsRaw.sectionStamps ?? '',
              customPrompt: slotPrompts.sectionStamps,
              createdAt: ts,
            };
            nextDrafts.sectionStamps = pushSectionStampsDraft(nextDrafts.sectionStamps, draft);
          } else if (k !== 'sectionStamps' && typeof incoming[k] === 'string') {
            const draft: DecorDraft = {
              id: `${k}-${Date.now()}`,
              url: incoming[k] as string,
              prompt: promptsRaw[k] ?? '',
              customPrompt: slotPrompts[k],
              createdAt: ts,
            };
            const key = k as 'divider' | 'confetti' | 'footerBouquet';
            nextDrafts[key] = pushDraft(nextDrafts[key], draft);
          }
        }

        onChange({
          ...manifest,
          decorLibrary: { ...(manifest.decorLibrary ?? {}), ...incoming },
          decorDrafts: nextDrafts,
        } as StoryManifest);

        setStatus((s) => {
          const next = { ...s };
          for (const k of slots) {
            const hit = (k === 'sectionStamps' ? incoming.sectionStamps : incoming[k]);
            next[k] = hit ? 'ok' : 'error';
            // Mirror the per-slot result into the floating toast.
            completeDecorJob(jobIds[k], Boolean(hit), hit ? undefined : 'No image returned');
          }
          return next;
        });
        const failures = Array.isArray(dataObj.failures) ? (dataObj.failures as string[]) : [];
        if (failures.length) {
          setErrors((e) => {
            const next = { ...e };
            for (const line of failures) {
              const slot = line.split(':')[0] as LibrarySlot;
              if (slot in next) next[slot] = line.slice(line.indexOf(':') + 1).trim();
            }
            return next;
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Pear couldn't paint that one";
        setErrors((e) => {
          const next = { ...e };
          for (const k of slots) next[k] = msg;
          return next;
        });
        setStatus((s) => {
          const next = { ...s };
          for (const k of slots) next[k] = 'error';
          return next;
        });
        for (const k of slots) {
          completeDecorJob(jobIds[k], false, msg);
        }
      }
    },
    [ctx, customPrompts, manifest, onChange],
  );

  function clearSlot(slot: LibrarySlot) {
    const next = { ...(manifest.decorLibrary ?? {}) };
    if (slot === 'sectionStamps') delete next.sectionStamps;
    else delete next[slot];
    onChange({ ...manifest, decorLibrary: next } as StoryManifest);
  }

  function pickDraft(slot: 'divider' | 'confetti' | 'footerBouquet', d: DecorDraft) {
    onChange({
      ...manifest,
      decorLibrary: { ...(manifest.decorLibrary ?? {}), [slot]: d.url },
    } as StoryManifest);
    setCustomPrompts((p) => ({ ...p, [slot]: d.customPrompt ?? '' }));
  }

  function deleteDraft(slot: 'divider' | 'confetti' | 'footerBouquet', d: DecorDraft) {
    const list = drafts[slot] ?? [];
    const next = list.filter((x) => x.id !== d.id);
    const isActive = manifest.decorLibrary?.[slot] === d.url;
    onChange({
      ...manifest,
      decorLibrary: {
        ...(manifest.decorLibrary ?? {}),
        [slot]: isActive ? next[0]?.url : manifest.decorLibrary?.[slot],
      },
      decorDrafts: { ...(manifest.decorDrafts ?? {}), [slot]: next },
    } as StoryManifest);
  }

  function pickStampsDraft(d: SectionStampsDraft) {
    onChange({
      ...manifest,
      decorLibrary: {
        ...(manifest.decorLibrary ?? {}),
        sectionStamps: { ...d.stamps },
      },
    } as StoryManifest);
    setCustomPrompts((p) => ({ ...p, sectionStamps: d.customPrompt ?? '' }));
  }

  function deleteStampsDraft(d: SectionStampsDraft) {
    const list = drafts.sectionStamps ?? [];
    const next = list.filter((x) => x.id !== d.id);
    const activeStamps = manifest.decorLibrary?.sectionStamps;
    const someUrlMatches = activeStamps && Object.values(activeStamps).some(
      (u) => Object.values(d.stamps).includes(u as string),
    );
    onChange({
      ...manifest,
      decorLibrary: {
        ...(manifest.decorLibrary ?? {}),
        sectionStamps: someUrlMatches ? next[0]?.stamps : activeStamps,
      },
      decorDrafts: { ...(manifest.decorDrafts ?? {}), sectionStamps: next },
    } as StoryManifest);
  }

  const allSlots: LibrarySlot[] = ['divider', 'sectionStamps', 'confetti', 'footerBouquet'];

  // Venue-aware motif suggestions. When the venue string matches a
  // known archetype (desert, vineyard, beach, mountain, ...), Pear
  // surfaces 3-5 motif chips. Click a chip to drop its prompt into
  // ALL slot prompts at once — clicking again clears it.
  const heuristicMotifs = getVenueMotifs(ctx.venue);
  const venueMatchLabel = describeVenueMatch(ctx.venue);

  // AI fallback — when the heuristic doesn't match, the user can
  // ask Pear directly. Loaded on demand, cached in component state.
  const [aiMotifs, setAiMotifs] = useState<VenueMotif[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const venueMotifs = heuristicMotifs ?? aiMotifs;

  async function askPearForMotifs() {
    if (!ctx.venue || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/decor/venue-motifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: ctx.venue, occasion: ctx.occasion, vibe: ctx.vibe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data && data.error) || 'Pear couldn\'t pull motifs.');
      setAiMotifs(data.motifs as VenueMotif[]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Pear is unreachable.');
    } finally {
      setAiLoading(false);
    }
  }

  function applyMotifToAllSlots(motif: VenueMotif) {
    setCustomPrompts((p) => {
      // Toggle: if every slot already has this motif's prompt,
      // clear them; otherwise apply to all four.
      const allMatch = allSlots.every((s) => p[s] === motif.prompt);
      const next: Record<LibrarySlot, string> = { ...p };
      for (const s of allSlots) next[s] = allMatch ? '' : motif.prompt;
      return next;
    });
  }

  // Read the active motif key (mutually exclusive across blob /
  // stamp / squiggle / sparkle / heart / postIt / polaroid).
  const motifs = manifest.motifs ?? {};
  const activeMotif: ProdMotifKey =
    motifs.blob && motifs.blob !== 'none' ? 'blob'
    : motifs.stamp ? 'stamp'
    : motifs.squiggle ? 'squiggle'
    : motifs.sparkle ? 'sparkle'
    : motifs.heart ? 'heart'
    : motifs.postIt ? 'postIt'
    : motifs.polaroid ? 'polaroid'
    : 'none';

  function applyMotif(id: ProdMotifKey) {
    const next: NonNullable<StoryManifest['motifs']> = {};
    if (id === 'blob') next.blob = 'sage';
    else if (id === 'stamp') next.stamp = manifest.motifs?.stamp ?? { text: 'EST.', tone: 'sage' };
    else if (id === 'squiggle') next.squiggle = manifest.motifs?.squiggle ?? 2;
    else if (id === 'sparkle') next.sparkle = true;
    else if (id === 'heart') next.heart = true;
    else if (id === 'postIt') next.postIt = manifest.motifs?.postIt ?? { text: 'save the date' };
    else if (id === 'polaroid') next.polaroid = true;
    // 'none' → empty object (clears all)
    onChange({ ...manifest, motifs: next } as StoryManifest);
  }

  const themeColors = ((manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors) as { accent?: string; accentLight?: string; foreground?: string; muted?: string; background?: string; cardBg?: string } | undefined;
  const activeAccent = themeColors?.accent ?? '';

  function applyAccent(hex: string) {
    const existingTheme = (manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {};
    const existingColors = (existingTheme.colors as Record<string, string> | undefined) ?? {};
    onChange({
      ...manifest,
      theme: {
        ...existingTheme,
        colors: { ...existingColors, accent: hex },
      },
    } as unknown as StoryManifest);
  }

  const activePattern: PatternId = manifest.pattern ?? 'none';
  function pickPattern(id: PatternId) {
    onChange({ ...manifest, pattern: id === 'none' ? undefined : id } as StoryManifest);
  }

  const activeDivider: DividerStrengthId | null = lib?.dividerStrength ?? null;
  function pickDividerStrength(id: DividerStrengthId | null) {
    const next = { ...(manifest.decorLibrary ?? {}) };
    if (id === null) delete next.dividerStrength;
    else next.dividerStrength = id;
    onChange({ ...manifest, decorLibrary: next } as StoryManifest);
  }

  const activeDensity = manifest.density ?? 'comfortable';
  function pickDensity(id: 'cozy' | 'comfortable' | 'spacious') {
    onChange({ ...manifest, density: id } as StoryManifest);
  }

  function resetAllDecor() {
    const next = { ...manifest } as StoryManifest;
    next.motifs = {};
    delete next.pattern;
    if (next.decorLibrary) {
      const nextLib = { ...next.decorLibrary };
      delete nextLib.dividerStrength;
      next.decorLibrary = nextLib;
    }
    onChange(next);
  }

  return (
    <div data-pl-decor-library style={{ marginBottom: 14 }}>
      {/* ────── Embedded drawer card ────── */}
      <div
        style={{
          borderRadius: 16,
          background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
          border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          boxShadow: '0 1px 2px rgba(40,28,12,0.05), 0 8px 24px rgba(40,28,12,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Header: lavender icon-tile + title + tab strip */}
        <div
          style={{
            padding: '16px 20px 13px',
            borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'var(--lavender-bg, var(--peach-bg, #FCE6D7))',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="sparkles" size={16} color="var(--lavender-ink, var(--peach-ink, #C6703D))" />
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-display, "Fraunces", serif)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--ink, var(--pl-ink, #0E0D0B))',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Decor Library
            </h3>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 12,
              padding: 4,
              background: 'var(--cream-2, color-mix(in oklab, var(--pl-cream, #F5EFE2) 80%, white))',
              borderRadius: 12,
            }}
          >
            <DLTabBtn on={tab === 'motifs'} onClick={() => setTab('motifs')} icon="leaf" label="Motifs" />
            <DLTabBtn on={tab === 'dividers'} onClick={() => setTab('dividers')} icon="minus" label="Dividers" />
            <DLTabBtn on={tab === 'patterns'} onClick={() => setTab('patterns')} icon="grid" label="Patterns" />
            <DLTabBtn on={tab === 'monogram'} onClick={() => setTab('monogram')} icon="heart-icon" label="Monogram" />
            <DLTabBtn on={tab === 'generate'} onClick={() => setTab('generate')} icon="wand" label="Generate" />
          </div>
        </div>

        {/* Body: scrollable tab content */}
        <div style={{ padding: 18, maxHeight: 720, overflowY: 'auto' }}>
          {/* ───── MOTIFS tab ───── */}
          {tab === 'motifs' && (
            <>
              <DLGalleryLabel>Motif — tap to place around your sections</DLGalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {DL_MOTIF_TILES.map((m) => (
                  <DLThemedTile
                    key={m.id}
                    active={activeMotif === m.id}
                    onClick={() => applyMotif(m.id)}
                  >
                    {m.icon ?? (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', fontWeight: 600 }}>
                        {m.label}
                      </span>
                    )}
                  </DLThemedTile>
                ))}
              </div>

              <DLGalleryLabel>Motif color</DLGalleryLabel>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                {DL_COLOR_CHIPS.map((c) => {
                  const value = c.valueFn(themeColors);
                  const isAccentChip = c.id === 'accent';
                  const on = isAccentChip; // active accent always shows the live theme accent
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        // Only the accent chip rewrites the theme. Soft/Gold/Ink
                        // are read-only previews — clicking them would silently
                        // change colors users didn't intend.
                        if (isAccentChip && activeAccent) applyAccent(activeAccent);
                      }}
                      title={isAccentChip ? 'Active accent' : `${c.label} (preview)`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        background: 'transparent',
                        border: 'none',
                        cursor: isAccentChip ? 'pointer' : 'default',
                        padding: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: value,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                          border: on ? '2.5px solid var(--ink, var(--pl-ink, #0E0D0B))' : '2.5px solid transparent',
                        }}
                      />
                      <span style={{ fontSize: 9.5, color: 'var(--ink-muted, #6F6557)', fontWeight: 600 }}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <DLGalleryLabel>Amount</DLGalleryLabel>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: 3,
                  background: 'var(--cream-2, #FBF7EE)',
                  borderRadius: 9,
                  width: 'fit-content',
                }}
              >
                {DL_DENSITY.map((d) => {
                  const on = activeDensity === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => pickDensity(d.id)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: 600,
                        background: on ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'transparent',
                        color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ───── DIVIDERS tab ───── */}
          {tab === 'dividers' && (
            <>
              <DLGalleryLabel>Section dividers — tap to apply everywhere</DLGalleryLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => pickDividerStrength(null)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 11,
                    background: 'var(--cream-2, #FBF7EE)',
                    border: activeDivider === null
                      ? '2px solid var(--ink, var(--pl-ink, #0E0D0B))'
                      : '1px solid var(--line, rgba(14,13,11,0.12))',
                    textAlign: 'left',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--ink-soft, #3A332C)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  Use the kit&rsquo;s default divider
                </button>
                {DL_DIVIDER_TILES.map((d) => (
                  <DLThemedTile
                    key={d.id}
                    active={activeDivider === d.id}
                    onClick={() => pickDividerStrength(d.id)}
                    minHeight={64}
                    padding="16px 22px"
                    background="var(--paper, var(--pl-cream, #F5EFE2))"
                  >
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 14,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted, #6F6557)',
                        }}
                      >
                        {d.label}
                      </span>
                      <span style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{d.render()}</span>
                    </div>
                  </DLThemedTile>
                ))}
              </div>

              {/* ── AI decor library (full draft) — was the legacy
                  top-level "Decor library" PanelSection. Moved
                  under Dividers because divider art is the most
                  visible AI piece; the other 3 slots are subtler. ── */}
              <div style={{ marginTop: 18 }}>
                <DLGalleryLabel>AI-painted set — divider, stamps, confetti, flourish</DLGalleryLabel>
                {!ctx.venue && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 10,
                      borderRadius: 12,
                      background: 'var(--cream-2, #FBF7EE)',
                      border: '1px dashed var(--line-soft, rgba(14,13,11,0.10))',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <Icon name="pin" size={13} />
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>Set a venue first.</span> Pear pulls motif
                      suggestions (Joshua trees, cypress, palm fronds…) from the Hero panel&apos;s venue field.
                    </div>
                  </div>
                )}
                {ctx.venue && !venueMotifs && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 10,
                      borderRadius: 12,
                      background: 'var(--cream-2, #FBF7EE)',
                      border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
                    }}
                  >
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>"{ctx.venue}"</span> didn't match a known
            archetype. Ask Pear to read your venue and propose motifs, or write a custom prompt below.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void askPearForMotifs()}
              disabled={aiLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--ink)',
                color: 'var(--cream)',
                border: 'none',
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: 'var(--font-ui)',
                cursor: aiLoading ? 'wait' : 'pointer',
              }}
            >
              {aiLoading ? (
                <>
                  <Icon name="sparkles" size={11} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: '50%',
                          background: 'currentColor',
                          opacity: 0.4,
                          animation: `pl-pear-dot-tiny 1.4s ease-in-out ${i * 0.18}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                  <span>drafting</span>
                  <style jsx>{`
                    @keyframes pl-pear-dot-tiny {
                      0%, 80%, 100% { opacity: 0.25; }
                      40%           { opacity: 1; }
                    }
                  `}</style>
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={11} />
                  Ask Pear for ideas
                </>
              )}
            </button>
            {aiError && (
              <span style={{ fontSize: 11, color: 'var(--plum-ink, #7A2D2D)' }}>{aiError}</span>
            )}
          </div>
        </div>
      )}
      {venueMotifs && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: 'var(--peach-bg, #FCE6D7)',
            border: '1px solid var(--peach-2, #F4C7A4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              marginBottom: 6,
            }}
          >
            <Icon name="sparkles" size={11} />
            {heuristicMotifs
              ? `Pear sees: ${venueMatchLabel ?? 'a venue with character'}`
              : `Pear's picks for ${ctx.venue}`}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>
            Click a motif and Pear will fold it into every piece in the next draft.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {venueMotifs.map((m) => {
              const active = allSlots.every((s) => customPrompts[s] === m.prompt);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => applyMotifToAllSlots(m)}
                  title={m.prompt}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: active ? 'var(--peach-ink, #C6703D)' : 'var(--cream, #FBF7EE)',
                    color: active ? '#fff' : 'var(--ink)',
                    border: active ? '1px solid var(--peach-ink, #C6703D)' : '1px solid var(--line-soft)',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
                  }}
                >
                  {active ? '✓ ' : ''}{m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void generate(allSlots)}
                  style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}
                  disabled={Object.values(status).some((v) => v === 'running')}
                >
                  {lib && Object.keys(lib).length > 1 ? 'Re-draft the whole library' : 'Draft the decor library'}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  {allSlots.map((slot) => (
                    <SlotCard
                      key={slot}
                      slot={slot}
                      lib={lib}
                      status={status[slot]}
                      error={errors[slot]}
                      customPrompt={customPrompts[slot]}
                      onCustomPromptChange={(v) => setCustomPrompts((p) => ({ ...p, [slot]: v }))}
                      onRegen={() => void generate([slot])}
                      onClear={() => clearSlot(slot)}
                      ctx={ctx}
                      drafts={
                        slot === 'sectionStamps'
                          ? (drafts.sectionStamps ?? [])
                          : (drafts[slot as 'divider' | 'confetti' | 'footerBouquet'] ?? [])
                      }
                      onPickDraft={(d) => {
                        if (slot === 'sectionStamps') pickStampsDraft(d as SectionStampsDraft);
                        else pickDraft(slot as 'divider' | 'confetti' | 'footerBouquet', d as DecorDraft);
                      }}
                      onDeleteDraft={(d) => {
                        if (slot === 'sectionStamps') deleteStampsDraft(d as SectionStampsDraft);
                        else deleteDraft(slot as 'divider' | 'confetti' | 'footerBouquet', d as DecorDraft);
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', marginTop: 12, lineHeight: 1.5 }}>
                  Each full-library draft makes 4 generations. Per-slot regen + alternates count against your hourly budget of 3 full libraries.
                </p>
              </div>
            </>
          )}

          {/* ───── PATTERNS tab ───── */}
          {tab === 'patterns' && (
            <>
              <DLGalleryLabel>Background prints — tap to apply behind sections</DLGalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {PATTERN_TILES.map((tile) => {
                  const on = activePattern === tile.id;
                  return (
                    <DLThemedTile
                      key={tile.id}
                      active={on}
                      onClick={() => pickPattern(tile.id)}
                      padding={0}
                      background="var(--paper, var(--pl-cream, #F5EFE2))"
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: 78,
                          overflow: 'hidden',
                          borderRadius: 12,
                        }}
                      >
                        <PatternMiniature id={tile.id} />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--ink-soft, #3A332C)',
                            zIndex: 2,
                            textShadow: '0 1px 2px rgba(255,255,255,0.6)',
                          }}
                        >
                          {tile.label}
                        </span>
                      </div>
                    </DLThemedTile>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', marginTop: 14, lineHeight: 1.5 }}>
                Patterns sit BEHIND every section, like wallpaper. Different from texture (the material grain ON TOP).
              </p>
            </>
          )}

          {/* ───── MONOGRAM tab ───── */}
          {tab === 'monogram' && (
            <div data-pl-decor-monogram-tab>
              {/* Fresh PanelGroup → MonogramSection's PanelSection opens
                  by default no matter where this drawer is mounted. */}
              <PanelGroup>
                <MonogramSection manifest={manifest} onChange={onChange} />
              </PanelGroup>
            </div>
          )}

          {/* ───── GENERATE tab ───── */}
          {tab === 'generate' && (
            <div data-pl-decor-generate-tab>
              <PanelGroup>
                <GenerateFromTextSection manifest={manifest} onChange={onChange} />
              </PanelGroup>
            </div>
          )}
        </div>

        {/* Footer: Reset all + tab-specific tip */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
          }}
        >
          <button
            type="button"
            onClick={resetAllDecor}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--ink-soft, #3A332C)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <Icon name="close" size={13} color="var(--ink-soft, #3A332C)" />
            Reset decor
          </button>
          <span
            style={{
              fontSize: 10.5,
              color: 'var(--ink-muted, #6F6557)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Live-applied — your site updates as you tap.
          </span>
        </div>
      </div>
    </div>
  );
}

interface SlotCardProps {
  slot: LibrarySlot;
  lib: StoryManifest['decorLibrary'];
  status: Status;
  error: string | null;
  customPrompt: string;
  onCustomPromptChange: (v: string) => void;
  onRegen: () => void;
  onClear: () => void;
  ctx: { occasion: string; venue?: string; vibe?: string };
  drafts: DecorDraft[] | SectionStampsDraft[];
  onPickDraft: (d: DecorDraft | SectionStampsDraft) => void;
  onDeleteDraft: (d: DecorDraft | SectionStampsDraft) => void;
}

function SlotCard({
  slot, lib, status, error, customPrompt, onCustomPromptChange,
  onRegen, onClear, ctx, drafts, onPickDraft, onDeleteDraft,
}: SlotCardProps) {
  const meta = SLOT_META[slot];
  const url =
    slot === 'sectionStamps'
      ? (Object.values(lib?.sectionStamps ?? {})[0] as string | undefined)
      : ((lib?.[slot] as string | undefined) ?? undefined);

  // Adapt drafts to a uniform DecorDraft shape for the strip view —
  // sectionStamps draft uses its first stamp as the thumbnail.
  const stripDrafts: DecorDraft[] = drafts.map((d) => {
    if ('stamps' in d) {
      const firstUrl = Object.values(d.stamps).find((v): v is string => typeof v === 'string') ?? '';
      return {
        id: d.id, url: firstUrl, prompt: d.prompt,
        customPrompt: d.customPrompt, createdAt: d.createdAt,
      };
    }
    return d;
  });

  return (
    <div
      style={{
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--line-soft)', background: 'var(--card)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, padding: 10 }}>
        <div
          style={{
            flexShrink: 0, width: 96, aspectRatio: meta.aspect,
            borderRadius: 8, position: 'relative',
            background: url
              ? `url(${url}) center/contain no-repeat var(--cream-2)`
              : 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            display: 'grid', placeItems: 'center',
            color: 'var(--ink-muted)', fontSize: 10,
          }}
        >
          {!url && status === 'idle' && 'Not yet'}
          {status === 'running' && '…drawing'}
          {status === 'error' && (
            <span style={{ padding: 6, fontSize: 10, color: 'var(--plum-ink, #7A2D2D)', textAlign: 'center', lineHeight: 1.3 }}>
              {error ?? "Pear couldn't paint this"}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.35 }}>{meta.hint}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <button
              type="button"
              onClick={onRegen}
              disabled={status === 'running'}
              style={{
                border: '1px solid var(--ink)', background: 'var(--ink)',
                color: 'var(--cream)', padding: '5px 12px',
                borderRadius: 999, fontSize: 11, fontWeight: 600,
                cursor: status === 'running' ? 'wait' : 'pointer',
              }}
            >
              {url ? 'Redraw' : 'Draft'}
            </button>
            {url && (
              <button
                type="button"
                onClick={onClear}
                disabled={status === 'running'}
                style={{
                  border: '1px solid var(--line)', background: 'var(--card)',
                  color: 'var(--ink)', padding: '5px 12px',
                  borderRadius: 999, fontSize: 11, fontWeight: 600,
                  cursor: status === 'running' ? 'wait' : 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 10px 10px' }}>
        {/* Audited 2026-04-30: per-slot custom prompt textarea
            tucked behind a native <details>. Hosts who want
            "with olive sprigs" can still write it; the default
            path uses the motif suggestions above and stays clean. */}
        <details style={{ marginBottom: 6 }}>
          <summary
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--ink-muted)',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            Custom direction (optional)
          </summary>
          <div style={{ marginTop: 6 }}>
            <DecorPromptComposer
              value={customPrompt}
              onChange={onCustomPromptChange}
              autoSummary={buildAutoSummary(ctx)}
              disabled={status === 'running'}
              label={`${meta.label} — direction (optional)`}
            />
          </div>
        </details>
        <DecorAlternatesStrip
          drafts={stripDrafts}
          activeUrl={url}
          onSelect={(d) => onPickDraft(drafts.find((x) => x.id === d.id) ?? d)}
          onDelete={(d) => onDeleteDraft(drafts.find((x) => x.id === d.id) ?? d)}
          onAlternate={onRegen}
          busy={status === 'running'}
          aspect={meta.aspect === '5/2' ? '5/2' : meta.aspect === '2/3' ? '2/3' : meta.aspect === '3/2' ? '3/2' : '1/1'}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   GenerateFromTextSection — direct port of the prototype's
   GenerateCard (themes.jsx §1129). One-shot "describe your event,
   get a decor preset" surface.

   Prototype called `window.claude.complete(prompt)` directly in
   the browser; production routes through /api/decor/generate-from-text
   so the API key never leaves the host and the call is rate-limited
   + tool_use-forced. The deterministic
   `generateDecorFromText()` matcher in src/lib/decor/ runs server-
   side when the API key is missing or Claude fails.

   Writes:
     manifest.pattern        ← preset.patternId  (or unset when 'none')
     manifest.motifs.<slot>  ← preset.motifId    (mutually exclusive)
     manifest.decorLibrary.dividerStrength ← preset.dividerId
     manifest.theme.colors.accent ← preset.accentColor
   ════════════════════════════════════════════════════════════════ */

type DecorPatternId =
  | 'none'
  | 'gingham'
  | 'stripe'
  | 'cabana'
  | 'diagonal'
  | 'dots'
  | 'grid'
  | 'deco'
  | 'scallop'
  | 'wave'
  | 'confetti'
  | 'terrazzo'
  | 'celestial';

type DecorMotifId = 'blob' | 'stamp' | 'squiggle' | 'sparkle' | 'heart' | 'postIt' | 'polaroid';
type DecorDividerId = 'subtle' | 'standard' | 'tall';

interface DecorPresetResponse {
  patternId: DecorPatternId;
  motifId: DecorMotifId;
  dividerId: DecorDividerId;
  accentColor: string;
  rationale: string;
  source: 'claude' | 'heuristic';
}

const STORY_EXAMPLES = [
  'July wedding in Santorini, olive groves, relaxed',
  'Black-tie evening gala, candlelit',
  'Tuscan vineyard, lemons, romantic',
];

function GenerateFromTextSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DecorPresetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = useContext(manifest);

  const run = useCallback(
    async (q?: string) => {
      const query = (q ?? text).trim();
      if (!query) return;
      if (q != null) setText(q);
      setBusy(true);
      setResult(null);
      setError(null);
      try {
        const res = await fetch('/api/decor/generate-from-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: query,
            occasion: ctx.occasion,
            paletteHex: ctx.paletteHex,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<DecorPresetResponse> & { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
        if (!data.patternId || !data.motifId || !data.dividerId || !data.accentColor) {
          throw new Error('Pear returned a malformed preset — try again.');
        }
        const preset = data as DecorPresetResponse;

        // Apply the preset across the four manifest surfaces.
        // motifId is mutually exclusive — clear the other slots so the
        // renderer doesn't compose multiple motifs on the hero.
        const motifSlot = preset.motifId;
        const nextMotifs: NonNullable<StoryManifest['motifs']> = {};
        if (motifSlot === 'blob') nextMotifs.blob = 'sage';
        else if (motifSlot === 'stamp') {
          // Preserve existing stamp text/icon if the host had set one,
          // otherwise leave the slot enabled with a sensible default.
          const existing = manifest.motifs?.stamp;
          nextMotifs.stamp = existing ?? { text: 'EST.' };
        } else if (motifSlot === 'squiggle') nextMotifs.squiggle = 2;
        else if (motifSlot === 'sparkle') nextMotifs.sparkle = true;
        else if (motifSlot === 'heart') nextMotifs.heart = true;
        else if (motifSlot === 'postIt') {
          const existing = manifest.motifs?.postIt;
          nextMotifs.postIt = existing ?? { text: 'save the date' };
        } else if (motifSlot === 'polaroid') nextMotifs.polaroid = true;

        const nextTheme: NonNullable<StoryManifest['theme']> = {
          ...(manifest.theme ?? { colors: { background: '#FBF7EE', foreground: '#0E0D0B', accent: preset.accentColor, accentLight: preset.accentColor, muted: '#6F6557', cardBg: '#FBF7EE' }, fonts: { heading: 'Fraunces', body: 'Geist' } }),
          colors: {
            ...(manifest.theme?.colors ?? { background: '#FBF7EE', foreground: '#0E0D0B', accent: preset.accentColor, accentLight: preset.accentColor, muted: '#6F6557', cardBg: '#FBF7EE' }),
            accent: preset.accentColor,
          },
        };

        const nextDecorLibrary = {
          ...(manifest.decorLibrary ?? {}),
          dividerStrength: preset.dividerId,
        };

        onChange({
          ...manifest,
          pattern: preset.patternId === 'none' ? undefined : preset.patternId,
          motifs: nextMotifs,
          theme: nextTheme,
          decorLibrary: nextDecorLibrary,
        } as StoryManifest);

        setResult(preset);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pear is unreachable. Try again in a moment.');
      } finally {
        setBusy(false);
      }
    },
    [text, ctx.occasion, ctx.paletteHex, manifest, onChange],
  );

  return (
    <PanelSection
      label="Generate decor from your story"
      hint="Describe the event in a sentence — Pear picks a pattern, motif, divider, and accent that match. Falls back to keyword matching when offline."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="e.g. Sunset wedding in Santorini, lots of olive groves, relaxed and warm…"
          disabled={busy}
          style={{
            width: '100%',
            padding: '9px 11px',
            borderRadius: 9,
            border: '1px solid var(--line, rgba(14,13,11,0.12))',
            background: 'var(--cream-2, #FBF7EE)',
            fontSize: 12.5,
            color: 'var(--ink)',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.45,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STORY_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => void run(ex)}
              disabled={busy}
              style={{
                padding: '4px 9px',
                borderRadius: 999,
                background: 'var(--cream-2, #FBF7EE)',
                border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                fontSize: 10.5,
                color: 'var(--ink-soft, #3A332C)',
                cursor: busy ? 'wait' : 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {ex.split(',')[0]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !text.trim()}
          className="btn btn-primary btn-sm"
          style={{
            justifyContent: 'center',
            width: '100%',
            opacity: busy || !text.trim() ? 0.7 : 1,
          }}
        >
          {busy ? (
            <>
              <Icon name="sparkles" size={13} />
              Pear is designing…
            </>
          ) : (
            <>
              <Icon name="sparkles" size={13} />
              Design my decor
            </>
          )}
        </button>
        {result && !busy && (
          <div
            style={{
              display: 'flex',
              gap: 7,
              alignItems: 'flex-start',
              padding: '8px 10px',
              borderRadius: 9,
              background: 'var(--sage-tint, color-mix(in oklab, var(--pl-olive, #5C6B3F) 12%, var(--cream, #FBF7EE)))',
              fontSize: 11.5,
              color: 'var(--sage-deep, var(--pl-olive, #5C6B3F))',
              lineHeight: 1.45,
            }}
          >
            <Icon name="check" size={13} />
            <span>
              <b>Done.</b> {result.rationale}
              {result.source === 'heuristic' && (
                <span style={{ opacity: 0.7, marginLeft: 4 }}>(offline match)</span>
              )}
            </span>
          </div>
        )}
        {error && !busy && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 9,
              background: 'var(--plum-tint, rgba(122,45,45,0.08))',
              color: 'var(--plum-ink, #7A2D2D)',
              fontSize: 11.5,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </PanelSection>
  );
}

/* ════════════════════════════════════════════════════════════════
   PatternPickerSection — direct port of the prototype's PATTERN
   dial (themes.jsx §3b, themed-site.jsx line 172). 12 patterns,
   each a tinted decorative print that sits BEHIND content
   (zIndex 0). Distinct from TextureLayer (a material grain on
   TOP). Writes manifest.pattern; CSS lives in pearloom.css under
   the "── PatternLayer ──" section.
   ════════════════════════════════════════════════════════════════ */

type PatternId =
  | 'none'
  | 'gingham'
  | 'stripe'
  | 'cabana'
  | 'diagonal'
  | 'dots'
  | 'grid'
  | 'deco'
  | 'scallop'
  | 'wave'
  | 'confetti'
  | 'terrazzo'
  | 'celestial';

const PATTERN_TILES: { id: PatternId; label: string; hint: string }[] = [
  { id: 'none', label: 'None', hint: 'No pattern behind content.' },
  { id: 'gingham', label: 'Gingham', hint: 'Repeating 14px crosshatch.' },
  { id: 'stripe', label: 'Stripe', hint: 'Vertical bands, awning width.' },
  { id: 'cabana', label: 'Cabana', hint: 'Wide stripes, beach club.' },
  { id: 'diagonal', label: 'Diagonal', hint: '45° bands — kinetic.' },
  { id: 'dots', label: 'Dots', hint: '20px polka — playful.' },
  { id: 'grid', label: 'Grid', hint: 'Hairline graph paper.' },
  { id: 'deco', label: 'Deco', hint: 'Accent + gold diagonals.' },
  { id: 'scallop', label: 'Scallop', hint: 'Half-arcs, hairline.' },
  { id: 'wave', label: 'Wave', hint: 'Half-arcs at the bottom.' },
  { id: 'confetti', label: 'Confetti', hint: 'Three-color scatter.' },
  { id: 'terrazzo', label: 'Terrazzo', hint: 'Four-tone speckle.' },
  { id: 'celestial', label: 'Celestial', hint: 'Gold + white stars.' },
];

function PatternMiniature({ id }: { id: PatternId }) {
  const accent = 'var(--sage-deep, var(--pl-olive, #5C6B3F))';
  const accent2 = 'var(--peach-ink, #C6703D)';
  const gold = 'var(--gold, #B89244)';
  const line = 'var(--line, rgba(14,13,11,0.14))';
  const ink = 'var(--ink, #0E0D0B)';

  if (id === 'none') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        <text x="40" y="29" textAnchor="middle" fontSize="11" fill={ink} opacity="0.4" fontFamily="serif">∅</text>
      </svg>
    );
  }
  if (id === 'gingham') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`v${i}`} x={i * 14} y="0" width="7" height="48" fill={accent} opacity="0.13" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`h${i}`} x="0" y={i * 14} width="80" height="7" fill={accent} opacity="0.13" />
        ))}
      </svg>
    );
  }
  if (id === 'stripe') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={i * 11} y="0" width="5" height="48" fill={accent} opacity="0.12" />
        ))}
      </svg>
    );
  }
  if (id === 'cabana') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        <rect x="0" y="0" width="14" height="48" fill={accent} opacity="0.15" />
        <rect x="28" y="0" width="14" height="48" fill={accent} opacity="0.15" />
        <rect x="56" y="0" width="14" height="48" fill={accent} opacity="0.15" />
      </svg>
    );
  }
  if (id === 'diagonal') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        <defs>
          <pattern id="diag-mini" patternUnits="userSpaceOnUse" width="13" height="13" patternTransform="rotate(45)">
            <rect x="0" y="0" width="6" height="13" fill={accent} opacity="0.11" />
          </pattern>
        </defs>
        <rect width="80" height="48" fill="url(#diag-mini)" />
      </svg>
    );
  }
  if (id === 'dots') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 8 }).map((__, c) => (
            <circle key={`${r}-${c}`} cx={c * 10 + 5} cy={r * 10 + 8} r="2.2" fill={accent} opacity="0.22" />
          )),
        )}
      </svg>
    );
  }
  if (id === 'grid') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} x1={i * 11} y1="0" x2={i * 11} y2="48" stroke={line} strokeWidth="0.5" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 11} x2="80" y2={i * 11} stroke={line} strokeWidth="0.5" />
        ))}
      </svg>
    );
  }
  if (id === 'deco') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        <defs>
          <pattern id="deco-mini" patternUnits="userSpaceOnUse" width="26" height="26" patternTransform="rotate(135)">
            <rect x="0" y="0" width="6.5" height="26" fill={accent} opacity="0.13" />
            <rect x="13" y="0" width="6.5" height="26" fill={gold} opacity="0.13" />
          </pattern>
        </defs>
        <rect width="80" height="48" fill="url(#deco-mini)" />
      </svg>
    );
  }
  if (id === 'scallop') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={i * 16 + 8} cy="0" r="11" fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="1" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={`b${i}`} cx={i * 16 + 8} cy="30" r="11" fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="1" />
        ))}
      </svg>
    );
  }
  if (id === 'wave') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={`a${i}`} cx={i * 14 + 7} cy="48" r="13" fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={`b${i}`} cx={i * 14 + 7} cy="24" r="13" fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1" />
        ))}
      </svg>
    );
  }
  if (id === 'confetti') {
    const dots: [number, number, string][] = [
      [10, 8, accent], [28, 18, accent2], [46, 6, gold],
      [62, 22, accent], [18, 32, gold], [40, 38, accent2],
      [64, 38, accent], [8, 22, accent2],
    ];
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {dots.map(([cx, cy, fill], i) => (
          <circle key={i} cx={cx} cy={cy} r="3.2" fill={fill} opacity="0.42" />
        ))}
      </svg>
    );
  }
  if (id === 'terrazzo') {
    const spots: [number, number, number, string, number][] = [
      [12, 14, 5, accent, 0.34], [40, 8, 4, accent2, 0.30],
      [62, 18, 4, gold, 0.30], [28, 30, 3, ink, 0.12],
      [54, 36, 5, accent, 0.34], [70, 32, 3, accent2, 0.30],
      [18, 40, 3, gold, 0.30],
    ];
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        {spots.map(([cx, cy, r, fill, op], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity={op} />
        ))}
      </svg>
    );
  }
  if (id === 'celestial') {
    return (
      <svg viewBox="0 0 80 48" width="100%" height="100%" aria-hidden="true">
        <rect width="80" height="48" fill="var(--cream-2, #FBF7EE)" />
        <circle cx="14" cy="14" r="2.2" fill={gold} opacity="0.75" />
        <circle cx="58" cy="10" r="1.6" fill={gold} opacity="0.75" />
        <circle cx="36" cy="32" r="1.8" fill="#fff" opacity="0.85" />
        <circle cx="70" cy="34" r="1.4" fill="#fff" opacity="0.7" />
        <circle cx="22" cy="38" r="1.2" fill="#fff" opacity="0.55" />
      </svg>
    );
  }
  return null;
}

function PatternPickerSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const current: PatternId = manifest.pattern ?? 'none';
  function pick(id: PatternId) {
    onChange({
      ...manifest,
      pattern: id === 'none' ? undefined : id,
    });
  }
  return (
    <PanelSection
      label="Pattern"
      hint="A bold decorative print sits BEHIND every section (like wallpaper). Tinted from your active palette. Different from Texture, which is the material grain on TOP."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {PATTERN_TILES.map((tile) => {
          const active = current === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => pick(tile.id)}
              title={tile.hint}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: 0,
                background: 'var(--cream, #FBF7EE)',
                border: active
                  ? '2px solid var(--sage-deep, var(--pl-olive, #5C6B3F))'
                  : '1px solid var(--line-soft, rgba(14,13,11,0.12))',
                borderRadius: 10,
                cursor: 'pointer',
                overflow: 'hidden',
                transition:
                  'border-color var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              <div
                style={{
                  aspectRatio: '5 / 3',
                  background: 'var(--cream-2, #FBF7EE)',
                  overflow: 'hidden',
                }}
              >
                <PatternMiniature id={tile.id} />
              </div>
              <div
                style={{
                  padding: '6px 8px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--ink)',
                  textAlign: 'center',
                  borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                  background: active
                    ? 'color-mix(in oklab, var(--sage-deep, var(--pl-olive, #5C6B3F)) 8%, var(--cream, #FBF7EE))'
                    : 'var(--cream, #FBF7EE)',
                }}
              >
                {tile.label}
              </div>
              {active && tile.id !== 'none' && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'var(--sage-deep, var(--pl-olive, #5C6B3F))',
                    color: 'var(--cream, #FBF7EE)',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    fontSize: 10,
                    lineHeight: '16px',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}

function useContext(manifest: StoryManifest) {
  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const venue = manifest.logistics?.venue ?? '';
  const theme = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
  const paletteHex = theme
    ? ([theme.background, theme.accent, theme.accentLight, theme.foreground, theme.muted].filter(Boolean) as string[])
    : undefined;
  const siteId = (manifest as unknown as { subdomain?: string }).subdomain ?? 'preview';
  const vibe = (manifest as unknown as { vibeString?: string }).vibeString ?? '';
  return { siteId, occasion, venue, paletteHex, vibe };
}

/* ════════════════════════════════════════════════════════════════
   MonogramSection — direct port of the prototype's MonogramTab
   (ClaudeDesign/pages/decor-library.jsx §MonogramTab). 3 frames +
   plain, derived initials from manifest.names, live 190px preview.
   Writes manifest.monogram which the renderer mounts as a hero
   watermark.
   ════════════════════════════════════════════════════════════════ */
function MonogramSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const mono = (manifest as unknown as { monogram?: { initials?: string; frame?: MonogramFrame } }).monogram;
  const [n1, n2] = manifest.names ?? ['', ''];
  const fallbackSubject = (n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'A & B')).trim();
  const subject = (mono?.initials?.trim() || fallbackSubject);
  const frame: MonogramFrame = mono?.frame ?? 'laurel';

  // Joiner toggle — mirror prototype's amp boolean. The source
  // string carries the joiner: '&' present → ampersand, otherwise
  // space-joined. Editing the input directly is the source of truth.
  const useAmp = subject.includes('&');
  const { initA, initB } = deriveInitials(subject);

  function patch(next: Partial<{ initials: string; frame: MonogramFrame }>) {
    onChange({
      ...manifest,
      monogram: { ...(mono ?? {}), ...next },
    } as StoryManifest);
  }

  function clear() {
    const m = { ...manifest } as StoryManifest & { monogram?: unknown };
    delete (m as { monogram?: unknown }).monogram;
    onChange(m);
  }

  function setJoiner(amp: boolean) {
    // Reconstruct initials with the requested joiner.
    const a = initA || 'A';
    const b = initB || 'B';
    patch({ initials: amp ? `${a} & ${b}` : `${a} ${b}` });
  }

  const FRAMES: Array<{ id: MonogramFrame; label: string }> = [
    { id: 'none', label: 'Plain' },
    { id: 'ring', label: 'Ring' },
    { id: 'diamond', label: 'Diamond' },
    { id: 'laurel', label: 'Laurel' },
  ];

  return (
    <PanelSection
      label="Monogram"
      hint="A crest of your initials — set it on, pick a frame, and the renderer drops it as a watermark in the hero's top-right. Plain, Ring, Diamond, Laurel."
    >
      {/* Live preview */}
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          padding: '8px 0 14px',
          background: 'var(--cream-2, #FBF7EE)',
          borderRadius: 14,
          border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        }}
      >
        <Monogram
          initials={subject}
          frame={frame}
          size={190}
          withCard={false}
        />
      </div>

      {/* Initials input */}
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, var(--pl-ink-soft, #6F6557))',
          margin: '14px 2px 8px',
        }}
      >
        Initials or names
      </label>
      <input
        type="text"
        value={mono?.initials ?? ''}
        onChange={(e) => patch({ initials: e.target.value })}
        placeholder={fallbackSubject}
        style={{
          width: '100%',
          padding: '9px 11px',
          borderRadius: 9,
          border: '1px solid var(--line, rgba(14,13,11,0.12))',
          background: 'var(--cream-2, #FBF7EE)',
          fontSize: 12.5,
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />

      {/* Frame tiles */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, var(--pl-ink-soft, #6F6557))',
          margin: '14px 2px 8px',
        }}
      >
        Frame
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {FRAMES.map((f) => {
          const on = frame === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => patch({ frame: f.id })}
              style={{
                position: 'relative',
                padding: '0 0 6px',
                background: on ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'var(--cream-2, #FBF7EE)',
                color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
                border: on
                  ? '2px solid var(--ink, var(--pl-ink, #0E0D0B))'
                  : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
                borderRadius: 10,
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), background var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              title={f.label}
            >
              <div
                style={{
                  aspectRatio: '1/1',
                  background: on ? 'rgba(255,255,255,0.06)' : 'var(--paper, #FBF7EE)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Monogram
                  initials={subject}
                  frame={f.id}
                  size={68}
                  withCard={false}
                  ariaHidden
                />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '6px 4px 0' }}>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Joiner toggle */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, var(--pl-ink-soft, #6F6557))',
          margin: '14px 2px 8px',
        }}
      >
        Joiner
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 3,
          background: 'var(--cream-2, #FBF7EE)',
          borderRadius: 9,
          width: 'fit-content',
        }}
      >
        {[
          { v: true, label: 'A & B' },
          { v: false, label: 'A B' },
        ].map((o) => {
          const on = useAmp === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setJoiner(o.v)}
              style={{
                padding: '6px 16px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                background: on ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'transparent',
                color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Clear */}
      {mono && (
        <button
          type="button"
          onClick={clear}
          style={{
            marginTop: 12,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            color: 'var(--ink-soft, var(--pl-ink-soft, #6F6557))',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Remove monogram
        </button>
      )}

      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 12, lineHeight: 1.5 }}>
        Updates with your names &amp; theme. Renders as a watermark in the hero's top-right.
      </p>
    </PanelSection>
  );
}
