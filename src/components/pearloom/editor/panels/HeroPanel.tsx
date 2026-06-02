'use client';

import type { StoryManifest } from '@/types';
import { AddRowButton, Field, ListRow, PanelGroup, PanelHeaderTag, PanelSection, PanelSmartActions, PanelTabs, PearChip, PhotoSlot, SelectInput, TextArea, TextInput, type PanelSmartAction } from '../atoms';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import { FocalPointPicker } from './FocalPointPicker';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { TimePicker, DatePicker } from '../v8-forms';
import { BlockStylePicker } from './BlockStylePicker';
// Side-effect import — registers all hero variants with the registry
// before BlockStylePicker reads them.
import '@/components/pearloom/site/hero-variants';

// Curated common-case zones rather than every IANA name. Hosts who
// need an obscure zone can paste a custom IANA string in via the
// Pear command palette later if requested. The empty value is
// "viewer's local zone" — the historical behaviour.
const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: "Viewer's local time" },
  { value: 'America/New_York',     label: 'Eastern (New York / Atlanta)' },
  { value: 'America/Chicago',      label: 'Central (Chicago / Dallas)' },
  { value: 'America/Denver',       label: 'Mountain (Denver / Phoenix)' },
  { value: 'America/Los_Angeles',  label: 'Pacific (LA / Seattle)' },
  { value: 'America/Anchorage',    label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu',     label: 'Hawaii (Honolulu)' },
  { value: 'America/Toronto',      label: 'Toronto / Eastern Canada' },
  { value: 'America/Mexico_City',  label: 'Mexico City' },
  { value: 'America/Sao_Paulo',    label: 'São Paulo / BRT' },
  { value: 'Europe/London',        label: 'London / GMT-BST' },
  { value: 'Europe/Paris',         label: 'Paris / CET' },
  { value: 'Europe/Berlin',        label: 'Berlin / CET' },
  { value: 'Europe/Madrid',        label: 'Madrid / CET' },
  { value: 'Europe/Rome',          label: 'Rome / CET' },
  { value: 'Europe/Athens',        label: 'Athens / EET' },
  { value: 'Europe/Istanbul',      label: 'Istanbul / TRT' },
  { value: 'Africa/Johannesburg',  label: 'Johannesburg / SAST' },
  { value: 'Africa/Cairo',         label: 'Cairo / EET' },
  { value: 'Asia/Dubai',           label: 'Dubai / Gulf Time' },
  { value: 'Asia/Kolkata',         label: 'India (Kolkata / Mumbai)' },
  { value: 'Asia/Bangkok',         label: 'Bangkok / ICT' },
  { value: 'Asia/Singapore',       label: 'Singapore / SGT' },
  { value: 'Asia/Hong_Kong',       label: 'Hong Kong / HKT' },
  { value: 'Asia/Shanghai',        label: 'Shanghai / CST' },
  { value: 'Asia/Tokyo',           label: 'Tokyo / JST' },
  { value: 'Asia/Seoul',           label: 'Seoul / KST' },
  { value: 'Australia/Sydney',     label: 'Sydney / AEST-AEDT' },
  { value: 'Australia/Perth',      label: 'Perth / AWST' },
  { value: 'Pacific/Auckland',     label: 'Auckland / NZST-NZDT' },
];

// Date format presets — names match the union in StoryManifest.dateFormat.
// Sample copy uses Sept 14, 2026 so the host sees what each preset
// will look like on the live site without leaving the panel.
const DATE_FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  // Empty value = "inherit theme default" (which renders 'long' today).
  // The first row used to also say "Long — September 14, 2026" which
  // looked like a dupe of the second row.
  { value: '',           label: 'Default — match the theme' },
  { value: 'long',       label: 'Long — September 14, 2026' },
  { value: 'short',      label: 'Short — Sep 14, 2026' },
  { value: 'numeric',    label: 'Numeric — 9/14/2026' },
  { value: 'iso',        label: 'ISO — 2026-09-14' },
  { value: 'month-year', label: 'Month + year — September 2026' },
];

function HeroTaglineAI({
  manifest,
  names,
  onResult,
}: {
  manifest: StoryManifest;
  names: [string, string];
  onResult: (text: string) => void;
}) {
  const { state, error, run } = useAICall(async () => {
    // Manifest field is `vibeString` (singular). The old `vibes`
    // read returned undefined and the prompt lost all vibe context.
    const occasion = manifest.occasion ?? 'wedding';
    const vibe = (manifest.vibeString ?? '').trim();
    const venue = manifest.logistics?.venue ?? '';
    const res = await fetch('/api/rewrite-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Write a warm, 1-2 sentence hero tagline for a ${occasion} site for ${names.filter(Boolean).join(' & ') || 'the hosts'}${
          venue ? ` at ${venue}` : ''
        }${vibe ? `. Vibe: ${vibe}` : ''}. No exclamation marks. No cliches ("tying the knot", "magical day"). Specific over generic. Write like a friend, not a brand.`,
        tone: 'warm',
      }),
    });
    if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
    const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
    const text = (data.text ?? data.rewritten ?? data.result ?? '').trim();
    if (!text) throw new Error('Pear came back empty');
    onResult(text);
    return text;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AIHint>
        Pear reads your occasion, vibes, and venue and proposes a tagline. Each run is a fresh take — try a few.
      </AIHint>
      <AISuggestButton
        label="Write with Pear"
        runningLabel="Writing your tagline…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />
    </div>
  );
}

export function HeroPanel({
  manifest,
  names,
  onNamesChange,
  onChange,
}: {
  manifest: StoryManifest;
  names: [string, string];
  onNamesChange: (n: [string, string]) => void;
  onChange: (m: StoryManifest) => void;
}) {
  // Read poetry.heroTagline safely — manifest.poetry may be missing,
  // malformed (older drafts), or carry the wrong type if a partial
  // save landed. Treat anything non-string as empty.
  const rawPoetry = (manifest as unknown as { poetry?: unknown }).poetry;
  const poetryObj: Record<string, unknown> =
    rawPoetry && typeof rawPoetry === 'object' ? (rawPoetry as Record<string, unknown>) : {};
  const heroTagline = typeof poetryObj.heroTagline === 'string' ? (poetryObj.heroTagline as string) : '';
  const slideshow = manifest.heroSlideshow ?? [];

  // Smart actions — surface the three things people most often want
  // to do on the hero panel as chips at the top so they don't have
  // to scan every collapsible section.
  const smartActions: PanelSmartAction[] = [
    {
      label: 'Pick a layout',
      icon: 'layout',
      onClick: () => {
        document
          .querySelector('[data-pl-block-style-picker="hero"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      primary: true,
    },
    {
      label: 'Edit names',
      icon: 'type',
      onClick: () => {
        const el = document.getElementById('pl8-hero-n1');
        if (el instanceof HTMLInputElement) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus(), 240);
        }
      },
    },
    {
      label: 'Set the date',
      icon: 'calendar-check',
      onClick: () => {
        const el = document.getElementById('pl8-hero-date');
        if (el instanceof HTMLInputElement) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus(), 240);
        }
      },
    },
  ];

  // Content tab — what the section says: lockup, tagline, when &
  // where, hero photo. Per-field Pear glyphs land on Tagline +
  // Cover photo where Pear has a real pass to run.
  const content = (
    <PanelGroup>
      <PanelSection label="The lockup" hint="The big names that anchor your hero.">
        <Field label="Name 1" htmlFor="pl8-hero-n1">
          <TextInput
            id="pl8-hero-n1"
            value={names[0]}
            onChange={(e) => onNamesChange([e.target.value, names[1]])}
            placeholder="Alex"
          />
        </Field>
        <Field label="Name 2" help="Leave empty for a solo event (birthday, memorial, retirement)." htmlFor="pl8-hero-n2">
          <TextInput
            id="pl8-hero-n2"
            value={names[1]}
            onChange={(e) => onNamesChange([names[0], e.target.value])}
            placeholder="Jamie"
          />
        </Field>
      </PanelSection>

      <PanelSection label="Tagline" hint="A short line underneath the names — sets the tone in one breath.">
        <Field
          label="Hero tagline"
          htmlFor="pl8-hero-tagline"
          pearAction={{ block: 'hero', pass: 'rewrite-tagline', label: 'Rewrite tagline with Pear' }}
          right={
            // Prototype-port: "3 styles" PearChip in the field action
            // slot — fires the same rewrite-tagline pass as the inline
            // glyph but reads as an inviting affordance, not a tool.
            <PearChip
              label="3 styles"
              title="Pear drafts three tagline candidates in different voices"
              onClick={() => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(
                  new CustomEvent('pearloom:open-pear-for', {
                    detail: { block: 'hero', pass: 'rewrite-tagline', intent: 'multi-variant' },
                  }),
                );
              }}
            />
          }
        >
          <TextArea
            id="pl8-hero-tagline"
            value={heroTagline}
            onChange={(e) =>
              onChange({
                ...manifest,
                poetry: { ...poetryObj, heroTagline: e.target.value },
              } as unknown as StoryManifest)
            }
            placeholder="After seven summers, one big move, and a very patient golden retriever, we're finally doing the thing."
            rows={3}
          />
        </Field>
        <HeroTaglineAI manifest={manifest} names={names} onResult={(text) => onChange({
          ...manifest,
          poetry: { ...poetryObj, heroTagline: text },
        } as unknown as StoryManifest)} />
      </PanelSection>

      <PanelSection label="When & where" hint="These drive the countdown, schedule, and travel sections.">
        <Field label="Event date" htmlFor="pl8-hero-date">
          <TextInput
            id="pl8-hero-date"
            type="date"
            value={(manifest.logistics?.date ?? '').slice(0, 10)}
            onChange={(e) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), date: e.target.value || undefined },
              })
            }
          />
        </Field>
        <Field label="Start time" htmlFor="pl8-hero-time">
          <TimePicker
            value={manifest.logistics?.time ?? ''}
            onChange={(v) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), time: v || undefined },
              })
            }
            ariaLabel="Event start time"
          />
        </Field>
        {/* Audited 2026-04-30: tucked Time zone + Date format into a
            disclosure. Both default fine for 95%+ of hosts; the
            countdown auto-uses the viewer's local zone, and the
            'long' date format is what most templates expect. */}
        <details>
          <summary
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--cream-2)',
              border: '1px dashed var(--line)',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--ink-soft)',
              userSelect: 'none',
              marginBottom: 10,
            }}
          >
            Time zone &amp; date format (optional)
          </summary>
          <div style={{ paddingTop: 4 }}>
            <Field
              label="Time zone"
              help="The countdown anchors here so a guest in Tokyo and a host in NYC see the same wall-clock time."
            >
              <SelectInput
                value={manifest.logistics?.timezone ?? ''}
                onChange={(v) =>
                  onChange({
                    ...manifest,
                    logistics: { ...(manifest.logistics ?? {}), timezone: v || undefined },
                  })
                }
                options={TIMEZONE_OPTIONS}
                placeholder="Use the viewer's local zone"
              />
            </Field>
            <Field
              label="Date format"
              help="How dates render in chapter headers and section meta. Defaults to 'September 14, 2026'."
            >
              <SelectInput
                value={(manifest as unknown as { dateFormat?: string }).dateFormat ?? ''}
                onChange={(v) =>
                  onChange({
                    ...manifest,
                    dateFormat: (v as 'long' | 'short' | 'numeric' | 'iso' | 'month-year' | '') || undefined,
                  } as unknown as StoryManifest)
                }
                options={DATE_FORMAT_OPTIONS}
                placeholder="Long — September 14, 2026"
              />
            </Field>
          </div>
        </details>
        <Field
          label="Venue"
          help="Type to search — picking from the list fills the address, lat/lng, and place ID in one shot."
          htmlFor="pl8-hero-venue"
        >
          <PlaceAutocomplete
            id="pl8-hero-venue"
            kind="venue"
            placeholder="Search for a venue (e.g. The Wildflower Barn)"
            value={manifest.logistics?.venue ?? ''}
            onChangeText={(v) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), venue: v || undefined },
              })
            }
            onSelect={(place) =>
              onChange({
                ...manifest,
                logistics: {
                  ...(manifest.logistics ?? {}),
                  venue: place.name || undefined,
                  venueAddress: place.address || undefined,
                  venuePlaceId: place.id || undefined,
                  venueLat: place.lat,
                  venueLng: place.lng,
                },
              })
            }
          />
        </Field>
        <Field label="Venue address" htmlFor="pl8-hero-addr" help="Auto-fills when you pick from the venue search.">
          <TextInput
            id="pl8-hero-addr"
            value={manifest.logistics?.venueAddress ?? ''}
            onChange={(e) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), venueAddress: e.target.value || undefined },
              })
            }
            placeholder="4721 Meadow Ln, Hillsboro, OR 97123"
          />
        </Field>
        <Field label="RSVP deadline" help="Guests see this on the RSVP section." htmlFor="pl8-hero-rsvp">
          <TextInput
            id="pl8-hero-rsvp"
            type="date"
            value={(manifest.logistics?.rsvpDeadline ?? '').slice(0, 10)}
            onChange={(e) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), rsvpDeadline: e.target.value || undefined },
              })
            }
          />
        </Field>
      </PanelSection>

      <PanelSection label="Hero photo" hint="Shown as the featured portrait on the cover polaroid.">
        <Field
          label="Cover photo"
          pearAction={{ block: 'hero', pass: 'suggest-cover', label: 'Suggest a cover photo from your gallery' }}
        >
          <PhotoSlot
            src={manifest.coverPhoto}
            onChange={(url) => onChange({ ...manifest, coverPhoto: url })}
            aspect="4/5"
            label=""
          />
        </Field>
        {manifest.coverPhoto && (
          <Field
            label="Focal point"
            help="Drag the dot to set the part of the photo that should stay visible on every device. Used by the photo-first hero variant."
          >
            <FocalPointPicker
              imageUrl={manifest.coverPhoto}
              value={(manifest as unknown as { coverFocalPoint?: { x: number; y: number } }).coverFocalPoint}
              onChange={(next) =>
                onChange({
                  ...manifest,
                  coverFocalPoint: next,
                } as unknown as StoryManifest)
              }
              onReset={() =>
                onChange({
                  ...manifest,
                  coverFocalPoint: undefined,
                } as unknown as StoryManifest)
              }
            />
          </Field>
        )}
      </PanelSection>
    </PanelGroup>
  );

  // Layout tab — variant + slideshow. The variant chooser changes
  // the hero's structural composition; slideshow only matters for
  // the slideshow-style variants. Section style (paper / palette
  // / spacing) is handled by the auto-mounted BlockStylePanel
  // beneath the tabs, so panels don't need a Style slot today.
  const layout = (
    <PanelGroup>
      <BlockStylePicker
        blockType="hero"
        manifest={manifest}
        onChange={onChange}
        defaultStyleId="postcard"
        label="Hero layout"
        hint="Pick how the hero composes your names + cover photo."
      />
      <PanelSection
        label="Hero slideshow"
        hint="Up to 5 photos. Slideshow-style hero variants render these as a rotating polaroid strip."
        action={
          slideshow.length < 5 ? (
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{5 - slideshow.length} slots left</span>
          ) : null
        }
      >
        {slideshow.length === 0 && (
          <AddRowButton
            label="Add first slideshow photo"
            onClick={() => onChange({ ...manifest, heroSlideshow: [''] })}
          />
        )}
        {slideshow.map((url, i) => (
          <ListRow
            key={i}
            onMoveUp={i > 0 ? () => {
              const next = [...slideshow];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              onChange({ ...manifest, heroSlideshow: next });
            } : undefined}
            onMoveDown={i < slideshow.length - 1 ? () => {
              const next = [...slideshow];
              [next[i + 1], next[i]] = [next[i], next[i + 1]];
              onChange({ ...manifest, heroSlideshow: next });
            } : undefined}
            onDelete={() => {
              const next = slideshow.filter((_, idx) => idx !== i);
              onChange({ ...manifest, heroSlideshow: next.length ? next : undefined });
            }}
          >
            <PhotoSlot
              src={url || undefined}
              aspect="1/1"
              label={`Slide ${i + 1}`}
              onChange={(nextUrl) => {
                const next = [...slideshow];
                next[i] = nextUrl ?? '';
                onChange({ ...manifest, heroSlideshow: next });
              }}
            />
          </ListRow>
        ))}
        {slideshow.length > 0 && slideshow.length < 5 && (
          <AddRowButton
            label="Add another slide"
            onClick={() => onChange({ ...manifest, heroSlideshow: [...slideshow, ''] })}
          />
        )}
      </PanelSection>
    </PanelGroup>
  );

  return (
    <>
      <PanelHeaderTag
        label="Hero"
        hint="The first thing guests see — names, tagline, date, and the photo that anchors the page."
      />
      <PanelSmartActions actions={smartActions} />
      <PanelTabs slots={{ content, layout }} />
    </>
  );
}
