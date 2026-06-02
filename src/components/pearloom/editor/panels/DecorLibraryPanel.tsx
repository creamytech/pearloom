'use client';

/* ========================================================================
   DecorLibraryPanel — couple-side admin for the AI decor library.

   v9 upgrades over the original 1-shot black box:
   - Custom prompt composer per slot — user dictates exactly what
     gets drawn ("a single olive sprig" vs "trailing ivy"). The
     auto-context (palette, occasion, venue) still wraps the prompt.
   - × remove on every slot — clears just that piece.
   - Alternates strip per slot — every successful draft is saved
     (capped 5 per slot). Click a thumb to revert; "+ Show another"
     keeps the current piece active and adds a new alternate.
   - Per-slot error + isolated-warning surfacing, so the user knows
     when the white-flood post-process couldn't isolate the cutout
     and they should retry with a clearer prompt.
   ======================================================================== */

import { useCallback, useState } from 'react';
import type { StoryManifest, DecorDraft, SectionStampsDraft } from '@/types';
import { PanelSection } from '../atoms';
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

  return (
    <div data-pl-decor-library>
    <PatternPickerSection manifest={manifest} onChange={onChange} />
    <PanelSection
      label="Decor library (AI)"
      hint="Ask Pear to draft a full set of bespoke graphics that match your venue, palette, and occasion — divider, six section stamps, RSVP confetti, and a closing flourish. All pieces ship with transparent backgrounds."
    >
      {!ctx.venue && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: 'var(--cream-2)',
            border: '1px dashed var(--line-soft)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <Icon name="pin" size={13} />
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Set a venue first.</span> Pear pulls motif
            suggestions (Joshua trees, cypress, palm fronds…) from the Hero panel's venue field.
          </div>
        </div>
      )}
      {ctx.venue && !venueMotifs && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
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
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 12, lineHeight: 1.5 }}>
        Each full-library draft makes 4 generations. Per-slot regen + alternates count against your hourly budget of 3 full libraries.
      </p>

      {/* Audited 2026-04-30: dropped the divider-strength picker
          (subtle / standard / tall). Renderer defaults to 'standard'
          when the field is unset, which is what 99% of hosts want.
          The dividerStrength field stays in the schema for back-
          compat; only the UI is gone. */}
    </PanelSection>
    <MonogramSection manifest={manifest} onChange={onChange} />
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
