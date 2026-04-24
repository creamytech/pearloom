'use client';

import type { StoryManifest } from '@/types';
import { AddRowButton, Field, ListRow, PanelSection, PhotoSlot, TextArea, TextInput } from '../atoms';
import { AIHint, AISuggestButton, useAICall } from '../ai';

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
    const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
    const vibes = (manifest as unknown as { vibes?: string[] }).vibes ?? [];
    const venue = manifest.logistics?.venue ?? '';
    const res = await fetch('/api/rewrite-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Write a warm, 1-2 sentence hero tagline for a ${occasion} site for ${names.filter(Boolean).join(' & ') || 'the hosts'}${
          venue ? ` at ${venue}` : ''
        }${vibes.length ? `. Vibes: ${vibes.join(', ')}` : ''}. No exclamation marks. No cliches ("tying the knot", "magical day"). Specific over generic. Write like a friend, not a brand.`,
        tone: 'warm',
      }),
    });
    if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
    const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
    const text = (data.text ?? data.rewritten ?? data.result ?? '').trim();
    if (!text) throw new Error('Empty response from Pear');
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

  return (
    <div>
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
        <Field label="Hero tagline" htmlFor="pl8-hero-tagline">
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
          <TextInput
            id="pl8-hero-time"
            type="time"
            value={manifest.logistics?.time ?? ''}
            onChange={(e) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), time: e.target.value || undefined },
              })
            }
          />
        </Field>
        <Field label="Venue name" htmlFor="pl8-hero-venue">
          <TextInput
            id="pl8-hero-venue"
            value={manifest.logistics?.venue ?? ''}
            onChange={(e) =>
              onChange({
                ...manifest,
                logistics: { ...(manifest.logistics ?? {}), venue: e.target.value || undefined },
              })
            }
            placeholder="The Wildflower Barn"
          />
        </Field>
        <Field label="Venue address" htmlFor="pl8-hero-addr">
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
        <PhotoSlot
          src={manifest.coverPhoto}
          onChange={(url) => onChange({ ...manifest, coverPhoto: url })}
          aspect="4/5"
          label="Cover photo"
        />
      </PanelSection>

      <PanelSection
        label="Hero slideshow"
        hint="Up to 5 photos. The v8 hero renders these as a rotating polaroid strip."
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
    </div>
  );
}
