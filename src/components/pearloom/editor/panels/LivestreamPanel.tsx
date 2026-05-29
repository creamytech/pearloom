'use client';

// ─────────────────────────────────────────────────────────────
// LivestreamPanel — host control for the Livestream block.
//
// Phase 5.1 of AUDIT-2026-05-29. Before this shipped, hosts
// (especially on memorial sites where the wizard seeds the
// block) had no editor surface to paste their Zoom / YouTube /
// Vimeo URL. The block was reading config.url from manifest.
// blocks[], but no panel wrote it post-wizard. Editing required
// SQL.
//
// This panel:
//   • Finds the first livestream block in manifest.blocks
//   • If none exists, shows a single "+ Add livestream block"
//     button that creates one with sensible defaults so the
//     panel re-renders into the edit form
//   • Edits url, title, subtitle, startsAt, buttonLabel via
//     debounced onChange (writes back into manifest.blocks)
//   • URL validation: http/https only, light surface check
//
// Mounted as a section inside DetailsPanel so memorial hosts
// find it on the Details tab they already visit.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { StoryManifest, PageBlock } from '@/types';
import { Field, PanelSection, TextArea, TextInput } from '../atoms';

interface LivestreamConfig {
  url?: string;
  title?: string;
  subtitle?: string;
  startsAt?: string;
  buttonLabel?: string;
}

function findLivestream(blocks: PageBlock[] | undefined): PageBlock | undefined {
  return (blocks ?? []).find((b) => b.type === 'livestream');
}

function isProbablyValidUrl(value: string): boolean {
  if (!value.trim()) return true; // empty is allowed (host hasn't pasted yet)
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function LivestreamPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const block = useMemo(() => findLivestream(manifest.blocks), [manifest.blocks]);
  const cfg = (block?.config ?? {}) as LivestreamConfig;
  const urlInvalid = !!cfg.url && !isProbablyValidUrl(cfg.url);

  function setConfig(patch: Partial<LivestreamConfig>) {
    if (!block) return;
    const nextBlocks = (manifest.blocks ?? []).map((b) =>
      b.id === block.id
        ? { ...b, config: { ...(b.config ?? {}), ...patch } }
        : b,
    );
    onChange({ ...manifest, blocks: nextBlocks });
  }

  function addLivestreamBlock() {
    const existing = manifest.blocks ?? [];
    const id = `livestream-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const order =
      existing.length === 0 ? 50 : Math.max(...existing.map((b) => b.order ?? 0)) + 1;
    const newBlock: PageBlock = {
      id,
      type: 'livestream',
      order,
      visible: true,
      config: {
        title: 'Watch live',
        url: '',
        buttonLabel: 'Open the livestream',
      },
    };
    onChange({ ...manifest, blocks: [...existing, newBlock] });
  }

  // Empty state — block doesn't exist on this manifest yet.
  if (!block) {
    return (
      <PanelSection
        label="Livestream"
        hint="Add a 'Watch live' card for far-away guests. Works for memorials, destination weddings, graduations — anywhere people might tune in remotely."
      >
        <button
          type="button"
          onClick={addLivestreamBlock}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 'var(--pl-radius-full)',
            background: 'var(--pl-cream-card)',
            border: '1px dashed var(--pl-divider)',
            color: 'var(--pl-ink-soft)',
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui, inherit)',
          }}
        >
          <span aria-hidden>＋</span> Add a livestream block
        </button>
      </PanelSection>
    );
  }

  return (
    <PanelSection
      label="Livestream"
      hint="Paste your Zoom / YouTube / Vimeo / Twitch URL. Guests tap the button on the published site to open it in a new tab."
    >
      <Field
        label="Livestream URL"
        help={
          urlInvalid
            ? 'That doesn’t look like a valid URL. Must start with https://'
            : 'Zoom, YouTube live, Vimeo, Twitch, or any custom URL.'
        }
      >
        <TextInput
          value={cfg.url ?? ''}
          onChange={(e) => setConfig({ url: e.target.value })}
          placeholder="https://zoom.us/j/123456789"
          aria-invalid={urlInvalid}
        />
      </Field>

      <Field label="Card title" help='Defaults to "Watch live" when blank.'>
        <TextInput
          value={cfg.title ?? ''}
          onChange={(e) => setConfig({ title: e.target.value })}
          placeholder="Watch live"
        />
      </Field>

      <Field
        label="Subtitle (optional)"
        help="One short line — usually the time-zone hint or who's hosting."
      >
        <TextArea
          value={cfg.subtitle ?? ''}
          onChange={(e) => setConfig({ subtitle: e.target.value })}
          placeholder="For family who can't be with us in person."
          rows={2}
        />
      </Field>

      <Field
        label="Starts at (optional)"
        help="If set, the card shows the start time in each guest's local time zone."
      >
        <TextInput
          type="datetime-local"
          value={cfg.startsAt ?? ''}
          onChange={(e) => setConfig({ startsAt: e.target.value })}
        />
      </Field>

      <Field
        label="Button label"
        help='Defaults to "Open the livestream" when blank.'
      >
        <TextInput
          value={cfg.buttonLabel ?? ''}
          onChange={(e) => setConfig({ buttonLabel: e.target.value })}
          placeholder="Open the livestream"
        />
      </Field>
    </PanelSection>
  );
}
