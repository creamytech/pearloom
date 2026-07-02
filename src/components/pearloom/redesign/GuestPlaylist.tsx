'use client';

// ─────────────────────────────────────────────────────────────
// GuestPlaylist — the living half of the site's Music section.
// Renders below the playlist embed (every MusicBlock variant):
//   • "The guest playlist" — accepted rows from the public
//     /api/song-requests GET as an editorial tracklist (mono
//     index, display-type title, quiet artist, "basted in by
//     {first name}" attribution, album art, 30s preview, Open
//     in Spotify link).
//   • A suggest-a-song composer POSTing to /api/song-requests,
//     with search typeahead from /api/music/search (Spotify when
//     keyed, iTunes otherwise; degrades to free text on error).
// Published sites need siteSlug (mirrors GuestbookSection); the
// editor canvas shows a 3-track demo gated by `editable`. Themed
// entirely with --t-* vars so it wears the site's look. One
// shared <audio> per section; the needle-drop spin on the art is
// CSS-only and honours prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface Track {
  song_title: string;
  artist?: string | null;
  spotify_url?: string | null;
  art_url?: string | null;
  preview_url?: string | null;
  guest_name?: string | null;
  created_at?: string;
}

interface SearchResult {
  title: string;
  artist: string;
  artUrl: string | null;
  spotifyUrl: string | null;
  previewUrl: string | null;
}

interface Props {
  /** Subdomain — the public song-requests API resolves it to the
   *  site uuid. Undefined on the editor canvas. */
  siteSlug?: string;
  /** Editor canvas — show the demo tracklist + a non-posting
   *  composer preview. Never true on published sites. */
  editable?: boolean;
  /** manifest.music.suggestions !== false — hides the composer. */
  suggestionsOn: boolean;
  /** Composer subline, routed by occasion (occasionCopyFor —
   *  "The dance floor takes requests." is wedding-party voice and
   *  reads wrong on a memorial). */
  composerHint?: string;
}

/* Demo dressing for the editor canvas only (the honesty rule:
   `editable` is the ONLY gate — published guests never see it). */
const DEMO_TRACKS: Track[] = [
  { song_title: 'September', artist: 'Earth, Wind & Fire', guest_name: 'Maya' },
  { song_title: 'Dreams', artist: 'Fleetwood Mac', guest_name: 'Theo' },
  { song_title: 'La Vie en rose', artist: 'Édith Piaf', guest_name: 'June' },
];

function spotifySearchHref(title: string, artist?: string | null): string {
  return `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist ?? ''}`.trim())}`;
}

function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'a guest';
}

/* Needle-drop: while a preview plays, the art rounds into a disc,
   spins slowly, and grows a centre spindle. All CSS; the spin +
   morph are gated on prefers-reduced-motion. */
const PLGP_CSS = `
@keyframes plgp-spin { to { transform: rotate(360deg); } }
.plgp-art { transition: border-radius 320ms ease; }
.plgp-art.plgp-playing { border-radius: 50% !important; }
@media (prefers-reduced-motion: no-preference) {
  .plgp-art.plgp-playing .plgp-art-face { animation: plgp-spin 3.4s linear infinite; }
}
@media (prefers-reduced-motion: reduce) {
  .plgp-art { transition: none; }
}
`;

export function GuestPlaylist({ siteSlug, editable = false, suggestionsOn, composerHint }: Props) {
  const [tracks, setTracks] = useState<Track[]>(editable ? DEMO_TRACKS : []);
  const listboxId = useId();

  /* ── accepted tracks (published only) ── */
  const refresh = useCallback(async () => {
    if (!siteSlug) return;
    try {
      const r = await fetch(`/api/song-requests?subdomain=${encodeURIComponent(siteSlug)}&public=1`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as { songs?: Track[] };
      setTracks(d.songs ?? []);
    } catch { /* tracklist stays as-is */ }
  }, [siteSlug]);

  useEffect(() => {
    const t = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  /* ── one shared audio element; only one preview at a time ── */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const togglePreview = (key: string, url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingKey === key) {
      audio.pause();
      setPlayingKey(null);
      return;
    }
    audio.src = url;
    audio.currentTime = 0;
    void audio.play().then(
      () => setPlayingKey(key),
      () => setPlayingKey(null),
    );
  };

  /* ── composer state ── */
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sentCopy, setSentCopy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── typeahead ── */
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [searchBroken, setSearchBroken] = useState(false);
  const disabled = editable || !siteSlug;

  useEffect(() => {
    const q = title.trim();
    if (disabled || searchBroken || q.length < 2 || (picked && picked.title === title)) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        if (!r.ok) {
          if (r.status !== 429) setSearchBroken(true); // free text still works
          return;
        }
        const d = (await r.json()) as { ok?: boolean; results?: SearchResult[] };
        if (!d.ok) { setSearchBroken(true); return; }
        setResults(d.results ?? []);
        setOpen((d.results ?? []).length > 0);
        setActiveIdx(-1);
      } catch {
        setSearchBroken(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [title, picked, disabled, searchBroken]);

  const pick = (r: SearchResult) => {
    setPicked(r);
    setTitle(r.title);
    if (r.artist) setArtist(r.artist);
    setResults([]);
    setOpen(false);
    setActiveIdx(-1);
  };

  const onTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < results.length) {
        e.preventDefault();
        pick(results[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const submit = async () => {
    if (disabled || sendState === 'sending' || !title.trim() || !siteSlug) return;
    setSendState('sending');
    setError(null);
    try {
      const usedPick = picked && picked.title === title ? picked : null;
      const r = await fetch('/api/song-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: siteSlug,
          songTitle: title.trim(),
          artist: artist.trim() || undefined,
          guestName: name.trim() || undefined,
          spotifyUrl: usedPick?.spotifyUrl ?? undefined,
          artUrl: usedPick?.artUrl ?? undefined,
          previewUrl: usedPick?.previewUrl ?? undefined,
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; state?: string; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Could not save your suggestion.');
      setTitle('');
      setArtist('');
      setPicked(null);
      setSendState('sent');
      setSentCopy(d.state === 'accepted' ? 'On the list — basted in.' : 'Suggested — the host will weave it in.');
      if (d.state === 'accepted') await refresh();
      setTimeout(() => { setSendState('idle'); setSentCopy(null); }, 4200);
    } catch (e) {
      setSendState('idle');
      setError(e instanceof Error ? e.message : 'Could not save your suggestion.');
    }
  };

  const showList = tracks.length > 0;
  const showComposer = suggestionsOn && (editable || !!siteSlug);
  if (!showList && !showComposer) return null;

  return (
    <div style={{ background: 'var(--t-paper)', padding: '4px clamp(16px, 4vw, 32px) 52px' }}>
      <style dangerouslySetInnerHTML={{ __html: PLGP_CSS }} />
      <audio ref={audioRef} preload="none" onEnded={() => setPlayingKey(null)} />
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {showList && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 6px' }}>
              <span aria-hidden style={{ width: 26, height: 1, background: 'var(--t-gold, var(--t-accent))' }} />
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--t-ink-muted, var(--t-ink-soft))' }}>
                The guest playlist
              </span>
            </div>
            <div>
              {tracks.map((t, i) => {
                const key = `${t.created_at ?? ''}-${i}`;
                const playing = playingKey === key;
                const artFace = t.art_url ? (
                  <img className="plgp-art-face" src={t.art_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div className="plgp-art-face" aria-hidden style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--t-section)', color: 'var(--t-accent)', fontSize: 15 }}>
                    ♪
                  </div>
                );
                const art = t.preview_url ? (
                  <button
                    type="button"
                    className={`plgp-art${playing ? ' plgp-playing' : ''}`}
                    onClick={() => togglePreview(key, t.preview_url as string)}
                    aria-label={playing ? `Pause the preview of ${t.song_title}` : `Play a 30-second preview of ${t.song_title}`}
                    style={{ position: 'relative', width: 44, height: 44, padding: 0, border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius, 8px)', overflow: 'hidden', cursor: 'pointer', background: 'var(--t-section)', flexShrink: 0 }}
                  >
                    {artFace}
                    {/* spindle + play/pause glyph */}
                    {playing ? (
                      <span aria-hidden style={{ position: 'absolute', inset: 0, margin: 'auto', width: 9, height: 9, borderRadius: '50%', background: 'var(--t-paper)', border: '2px solid var(--t-gold, var(--t-accent))' }} />
                    ) : (
                      <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}>▶</span>
                    )}
                  </button>
                ) : (
                  <div className="plgp-art" aria-hidden style={{ width: 44, height: 44, border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius, 8px)', overflow: 'hidden', background: 'var(--t-section)', flexShrink: 0 }}>
                    {artFace}
                  </div>
                );
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < tracks.length - 1 ? '1px solid var(--t-line-soft, var(--t-line))' : 'none' }}>
                    <span aria-hidden style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: 'var(--t-ink-muted, var(--t-ink-soft))', width: 20, textAlign: 'right', flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {art}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--t-display, "Fraunces", Georgia, serif)', fontSize: 16.5, color: 'var(--t-ink)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.song_title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t-ink-muted, var(--t-ink-soft))', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.artist ? <>{t.artist} <span aria-hidden>·</span> </> : null}
                        <span style={{ fontStyle: 'italic' }}>basted in by {firstName(t.guest_name)}</span>
                      </div>
                    </div>
                    <a
                      href={t.spotify_url || spotifySearchHref(t.song_title, t.artist)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11.5, color: 'var(--t-ink-muted, var(--t-ink-soft))', textDecoration: 'underline', textUnderlineOffset: 3, flexShrink: 0 }}
                    >
                      Open in Spotify
                    </a>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {showComposer && (
          <div
            style={{
              marginTop: showList ? 26 : 22,
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 'var(--t-radius-lg, 16px)',
              padding: 18,
            }}
          >
            <div style={{ fontFamily: 'var(--t-display, "Fraunces", Georgia, serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--t-ink)' }}>
              Suggest a song
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-muted, var(--t-ink-soft))', marginTop: 2, marginBottom: 12 }}>
              {composerHint ?? 'The playlist takes requests.'}
            </div>

            {sendState === 'sent' && sentCopy ? (
              <div role="status" style={{ fontFamily: 'var(--t-display, "Fraunces", Georgia, serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--t-ink)', padding: '10px 0 4px' }}>
                {sentCopy}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); if (picked && e.target.value !== picked.title) setPicked(null); }}
                    onKeyDown={onTitleKeyDown}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onFocus={() => { if (results.length > 0) setOpen(true); }}
                    placeholder="Song title"
                    maxLength={120}
                    disabled={disabled}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
                    style={plInput}
                  />
                  {open && results.length > 0 && (
                    <div
                      id={listboxId}
                      role="listbox"
                      aria-label="Song matches"
                      style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 6,
                        background: 'var(--t-card)', border: '1px solid var(--t-line)',
                        borderRadius: 'var(--t-radius, 10px)', boxShadow: 'var(--t-shadow, 0 12px 32px rgba(0,0,0,0.12))',
                        overflow: 'hidden',
                      }}
                    >
                      {results.map((r, i) => (
                        <div
                          key={`${r.title}-${r.artist}-${i}`}
                          id={`${listboxId}-opt-${i}`}
                          role="option"
                          aria-selected={i === activeIdx}
                          onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                          onMouseEnter={() => setActiveIdx(i)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                            background: i === activeIdx ? 'var(--t-section)' : 'transparent',
                          }}
                        >
                          {r.artUrl ? (
                            <img src={r.artUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <span aria-hidden style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--t-section)', display: 'grid', placeItems: 'center', color: 'var(--t-accent)', fontSize: 12, flexShrink: 0 }}>♪</span>
                          )}
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--t-ink-muted, var(--t-ink-soft))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist (optional)"
                    maxLength={120}
                    disabled={disabled}
                    style={plInput}
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    maxLength={80}
                    disabled={disabled}
                    style={plInput}
                  />
                </div>
                {error && <div style={{ fontSize: 12.5, color: 'var(--t-accent)' }}>{error}</div>}
                <button
                  type="button"
                  onClick={submit}
                  disabled={disabled || sendState === 'sending' || !title.trim()}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '10px 20px',
                    borderRadius: 999,
                    background: 'var(--t-rsvp, var(--t-accent))',
                    color: 'var(--t-rsvp-ink, var(--t-paper))',
                    border: 'none',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: disabled || sendState === 'sending' ? 'default' : 'pointer',
                    opacity: disabled || sendState === 'sending' || !title.trim() ? 0.55 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {editable ? 'Live on your site' : sendState === 'sending' ? 'Threading…' : 'Suggest a song'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const plInput: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 'var(--t-radius, 10px)',
  border: '1px solid var(--t-line)',
  background: 'var(--t-paper)',
  color: 'var(--t-ink)',
  fontSize: 'max(16px, 0.95rem)',
  fontFamily: 'var(--t-body, inherit)',
  outline: 'none',
  boxSizing: 'border-box',
};

export default GuestPlaylist;
