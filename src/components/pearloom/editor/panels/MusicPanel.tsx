'use client';

 
/* MusicPanel — Spotify / Apple Music playlist embed + guest song
   submissions. Writes manifest.music = { provider, url, title,
   description }. */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { FSelect } from './_form-atoms';

type MusicProvider = 'spotify' | 'apple' | 'youtube' | 'custom';

/* MusicPanel — Content tab fields only. The layout variant
   (card / minimal / fullbleed / sidebar / jukebox) is picked in
   the Layout tab via the LAYOUTS registry. */
interface MusicData {
  provider?: MusicProvider;
  url?: string;
  title?: string;
  description?: string;
  /** Guests can suggest songs from the site's guest playlist
   *  composer. Default ON when the section exists — the public
   *  POST treats anything but `false` as open. */
  suggestions?: boolean;
  /** Suggestions land on the tracklist immediately ('accepted')
   *  instead of waiting in the /dashboard/music queue. Default
   *  OFF — the host approves first. */
  autoAdd?: boolean;
}

export function MusicPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'music');
  const loose = manifest as unknown as { music?: MusicData };
  const data: MusicData = loose.music ?? {};
  const provider = data.provider ?? 'spotify';
  const url = data.url ?? '';
  const title = data.title ?? '';
  const description = data.description ?? '';
  /* Reads rsvpConfig.songRequests — the field the RSVP form and
     passport song composer actually honor (defaults ON, matching
     their behavior). music.acceptSubmissions was write-only. */
  const acceptSubmissions = ((manifest as unknown as { rsvpConfig?: { songRequests?: boolean } }).rsvpConfig?.songRequests) ?? true;
  const suggestions = data.suggestions ?? true;
  const autoAdd = data.autoAdd ?? false;
  const [eyebrow, setEyebrow] = useCopyOverride(manifest, onChange, 'musicEyebrow');

  const patch = (next: Partial<MusicData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    music: { ...data, ...next },
  } as unknown as StoryManifest);

  /* Auto-detect provider from a pasted URL — host pastes a Spotify
     URL into the field, we flip the provider dropdown to match. */
  function onUrlChange(v: string) {
    let detected: MusicProvider | null = null;
    if (/spotify\.com/i.test(v)) detected = 'spotify';
    else if (/music\.apple\.com|apple\.co/i.test(v)) detected = 'apple';
    else if (/youtu\.be|youtube\.com/i.test(v)) detected = 'youtube';
    patch({ url: v, ...(detected ? { provider: detected } : {}) });
  }

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Eyebrow" hint="Tiny label above the player.">
          <FInput value={eyebrow} onChange={setEyebrow} placeholder="The soundtrack" />
        </FGroup>

        <FGroup label="Title" hint="Headline above the player.">
          <FInput value={title} onChange={(v) => patch({ title: v })} placeholder="Songs for the dance floor" />
        </FGroup>

        <FGroup label="Provider">
          <FSelect
            value={provider}
            onChange={(v) => patch({ provider: v as MusicProvider })}
            options={[
              { value: 'spotify', label: 'Spotify',    hint: 'Public playlist URL' },
              { value: 'apple',   label: 'Apple Music',hint: 'music.apple.com playlist' },
              { value: 'youtube', label: 'YouTube',    hint: 'YouTube playlist URL' },
              { value: 'custom',  label: 'Custom URL', hint: 'Any embed link' },
            ]}
            icon="music"
          />
        </FGroup>

        <FGroup label="Playlist URL" hint="Paste the playlist link from your provider — we auto-detect which service.">
          <FInput
            value={url}
            onChange={onUrlChange}
            type="url"
            icon="link"
            placeholder="https://open.spotify.com/playlist/..."
          />
          {provider === 'spotify' && url && !/spotify\.com.*playlist/.test(url) && (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', fontSize: 11, color: '#7A2D2D' }}>
              That doesn't look like a Spotify playlist URL. Click Share → Copy link in Spotify.
            </div>
          )}
        </FGroup>

        <FGroup label="Description" hint="Optional — a sentence or two above the player.">
          <FInput
            value={description}
            onChange={(v) => patch({ description: v })}
            placeholder="What we listen to when we're together."
          />
        </FGroup>

        {/* Guest suggestions — the living playlist on the site
            itself. Accepted requests render as "The guest playlist"
            under the embed; the composer posts to /api/song-requests
            which reads these two fields for gating + initial state. */}
        <FGroup
          label="Guest suggestions"
          hint={suggestions
            ? (autoAdd
              ? 'Suggestions are woven straight into the guest playlist.'
              : 'Suggestions wait in your queue until you weave them in.')
            : 'Off — the guest playlist shows accepted songs only, with no composer.'}
          action={(
            <a
              href="/dashboard/music"
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-chrome-text-muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Manage requests →
            </a>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FToggleStandalone
              label="Let guests suggest songs on the site"
              sub="A suggest-a-song composer under the playlist embed."
              def={suggestions}
              onChange={(v) => patch({ suggestions: v })}
            />
            {suggestions && (
              <FSelect
                value={autoAdd ? 'auto' : 'approve'}
                onChange={(v) => patch({ autoAdd: v === 'auto' })}
                options={[
                  { value: 'approve', label: "I'll approve first",     hint: 'Requests wait in your queue' },
                  { value: 'auto',    label: 'Weave in automatically', hint: 'New songs appear right away' },
                ]}
                icon="music"
              />
            )}
          </div>
        </FGroup>

        {/* Wired to rsvpConfig.songRequests — the field the RSVP form
            and the guest passport's song composer ACTUALLY read. The
            old write (music.acceptSubmissions) went nowhere. */}
        <FToggleStandalone
          label="Accept song requests from guests"
          sub={acceptSubmissions
            ? 'The RSVP form asks for a song, and passport guests get a request composer.'
            : 'Off — the player is one-way listening only.'}
          def={acceptSubmissions}
          onChange={(v) => {
            const loose = manifest as unknown as { rsvpConfig?: Record<string, unknown> };
            onChange({
              ...(manifest as unknown as Record<string, unknown>),
              rsvpConfig: { ...(loose.rsvpConfig ?? {}), songRequests: v },
            } as unknown as StoryManifest);
          }}
        />

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Music" />
      </div>
    </SectionPanelShell>
  );
}

export default MusicPanel;
