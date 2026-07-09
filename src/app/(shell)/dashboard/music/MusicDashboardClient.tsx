'use client';

// ─────────────────────────────────────────────────────────────
// MusicDashboardClient — host surface for the collaborative
// playlist, restyled to the zip's editorial "Music" screen.
//
// Two objects, one board:
//   • ON THE FLOOR (left) — the accepted set, the songs that
//     play. Editorial track rows: mono index, needle-drop album
//     art (real art_url, spins on a 30s preview), display-type
//     title, "basted in by {first name}", Open in Spotify, and a
//     quiet "Set aside". A curated-playlist footer surfaces the
//     Spotify URL the public Soundtrack section embeds.
//   • GUEST REQUESTS (right) — the queued lane. Each request
//     shows its art + attribution + note; Add waves it onto the
//     floor, Skip sets it aside. A read-only mode chip reflects
//     the host's approve-first / auto-add / closed setting
//     (manifest.music), so the "how requests arrive" state is
//     always legible here.
//   • SET ASIDE (below, only when non-empty) — hidden requests,
//     each with "Bring back" to re-queue. Keeps the full
//     queued→accepted→hidden state machine reversible.
//
// All wiring is intact: GET /api/song-requests (host queue,
// owner-checked), PATCH { id, state } with optimistic flips, the
// curated Spotify URL + music mode read from the manifest, and
// the album art / 30s previews from the 20260702 art/preview
// columns. The board is a pure prop-driven component (MusicBoard)
// so /dev/dash-music can sign it off with sample data, exactly
// like the cockpit pieces — the client just feeds it live data.
//
// Tokens: the .pl8 dashboard chrome aliases (--ink / --card /
// --line / --cream-* + sage / peach / lavender / gold accents),
// never the editor-only --pl-chrome-* family. No stock imagery:
// an art-less track gets a warm tinted tile with a music glyph.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { EmptyState } from '@/components/shell/EmptyState';
import { Icon } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { StateChip, type StateKind } from '@/components/shell';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

interface SongRow {
  id: string;
  guest_id: string | null;
  guest_name: string;
  song_title: string;
  artist: string | null;
  spotify_url: string | null;
  art_url?: string | null;
  preview_url?: string | null;
  note: string | null;
  state: 'queued' | 'accepted' | 'hidden';
  created_at: string;
}

type State = SongRow['state'];

/** How new guest requests arrive, read from manifest.music. */
type MusicMode = 'auto' | 'approve' | 'closed';

// Needle-drop: a preview rounds the art into a spinning disc with
// a centre spindle (CSS only; the spin honours reduced-motion). A
// scoped grid class collapses the two columns on narrow screens.
const MUSIC_CSS = `
@keyframes pl8mus-spin { to { transform: rotate(360deg); } }
.pl8mus-art { transition: border-radius 320ms ease; }
.pl8mus-art.pl8mus-playing { border-radius: 50% !important; }
@media (prefers-reduced-motion: no-preference) {
  .pl8mus-art.pl8mus-playing .pl8mus-face { animation: pl8mus-spin 3.4s linear infinite; }
}
@media (prefers-reduced-motion: reduce) { .pl8mus-art { transition: none; } }
.pl8mus-grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .pl8mus-grid { grid-template-columns: 1fr; } }
`;

// Warm tinted tiles for art-less tracks — cycled by index so a
// tracklist reads as a set, never a wall of identical squares.
const ART_TINTS: [bg: string, ink: string][] = [
  ['var(--sage-tint)', 'var(--sage-deep)'],
  ['var(--peach-bg)', 'var(--peach-ink)'],
  ['var(--lavender-bg)', 'var(--lavender-ink)'],
  ['var(--cream-3)', 'var(--pl-gold, #C19A4B)'],
];

function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'a guest';
}

// Relative label off a mount-set `now` (never Date.now() in render
// — React-Compiler safe, and no SSR/client hydration drift). Before
// mount `now` is null and the label is empty, so the server paint
// and first client paint always agree.
function relativeTime(iso: string, now: number | null): string {
  if (now === null) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = now - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Eyebrow + headline (the zip's <Eyebrow> + .pl-heading) ─────
function CardEyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #C19A4B)', flexShrink: 0 }} />
      <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: color ?? 'var(--ink-muted)' }}>
        {children}
      </span>
    </div>
  );
}

// ── Album art / needle-drop ────────────────────────────────────
function TrackArt({
  song,
  tintIdx,
  size,
  playing,
  onToggle,
}: {
  song: SongRow;
  tintIdx: number;
  size: number;
  playing: boolean;
  onToggle?: () => void;
}) {
  const [bg, ink] = ART_TINTS[tintIdx % ART_TINTS.length];
  const face = song.art_url ? (
    <img className="pl8mus-face" src={song.art_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  ) : (
    <span className="pl8mus-face" aria-hidden style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: bg, color: ink }}>
      <Icon name="music" size={Math.round(size * 0.42)} color={ink} />
    </span>
  );
  const frame: React.CSSProperties = {
    position: 'relative', width: size, height: size, flexShrink: 0, padding: 0,
    border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: bg,
  };
  if (song.preview_url && onToggle) {
    return (
      <button
        type="button"
        className={`pl8mus-art${playing ? ' pl8mus-playing' : ''}`}
        onClick={onToggle}
        aria-label={playing ? `Pause the preview of ${song.song_title}` : `Play a 30-second preview of ${song.song_title}`}
        style={{ ...frame, cursor: 'pointer' }}
      >
        {face}
        {playing ? (
          <span aria-hidden style={{ position: 'absolute', inset: 0, margin: 'auto', width: 9, height: 9, borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--gold, #C19A4B)' }} />
        ) : (
          <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: Math.round(size * 0.3), textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}>▶</span>
        )}
      </button>
    );
  }
  return <span className="pl8mus-art" aria-hidden style={frame}>{face}</span>;
}

// ── Pills (Add / Skip / ghost actions) ─────────────────────────
function pill(kind: 'primary' | 'accept' | 'hide' | 'ghost'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em',
    cursor: 'pointer', fontFamily: 'var(--font-ui, inherit)', border: '1px solid var(--line-soft)', background: 'transparent',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  };
  if (kind === 'primary') return { ...base, background: 'var(--ink)', color: 'var(--cream)', border: 'none' };
  if (kind === 'accept') return { ...base, color: 'var(--sage-deep, #5C6B3F)', borderColor: 'rgba(92,107,63,0.4)' };
  if (kind === 'hide') return { ...base, color: 'var(--pl-plum, #7A2D40)', borderColor: 'rgba(122,45,64,0.32)' };
  return { ...base, color: 'var(--ink-muted)' };
}

const spotifyLink: React.CSSProperties = {
  fontSize: 11.5, color: 'var(--ink-muted)', textDecoration: 'none',
  borderBottom: '1px solid var(--line)', paddingBottom: 1, whiteSpace: 'nowrap', flexShrink: 0,
};

// ── The board (prop-driven; /dev/dash-music renders it) ────────
// Mode renders through the shared shell <StateChip> (TASTE-PLAN T.1).
const MODE_CHIP: Record<MusicMode, { label: string; kind: StateKind }> = {
  auto: { label: 'Auto-add on', kind: 'good' },
  approve: { label: 'Approve first', kind: 'attention' },
  closed: { label: 'Suggestions closed', kind: 'quiet' },
};

export function MusicBoard({
  loading,
  siteReady,
  songs,
  busyId,
  error,
  spotifyUrl,
  musicMode,
  onSetState,
}: {
  loading: boolean;
  siteReady: boolean;
  songs: SongRow[] | null;
  busyId: string | null;
  error: string | null;
  spotifyUrl: string;
  musicMode: MusicMode;
  onSetState: (id: string, next: State) => void;
}) {
  // One shared <audio>; a single preview plays at a time.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  // Mount-set clock for relative times — keeps first paint (server +
  // client) identical, then fills the labels in after hydration.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // rAF (not a synchronous setState) — React-Compiler safe, matches
    // the DayOf `mounted` pattern.
    const id = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(id);
  }, []);
  const togglePreview = (key: string, url: string) => {
    const el = audioRef.current;
    if (!el) return;
    if (playingKey === key) { el.pause(); setPlayingKey(null); return; }
    el.src = url;
    el.currentTime = 0;
    void el.play().then(() => setPlayingKey(key), () => setPlayingKey(null));
  };

  const grouped = useMemo(() => {
    const out: Record<State, SongRow[]> = { queued: [], accepted: [], hidden: [] };
    for (const s of songs ?? []) out[s.state].push(s);
    return out;
  }, [songs]);

  const total = songs?.length ?? 0;
  const mode = MODE_CHIP[musicMode];

  return (
    <div style={{ padding: '20px var(--pl-dash-pad) 40px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <style dangerouslySetInnerHTML={{ __html: MUSIC_CSS }} />
      <audio ref={audioRef} preload="none" onEnded={() => setPlayingKey(null)} />

      <PageIntro
        eyebrow="Music"
        title={<>The guest <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>playlist.</span></>}
        style={{ marginBottom: 0 }}
      />

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-muted)', fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18 }}>Loading…</div>
      ) : !siteReady ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink-soft)', border: '1px dashed var(--line-soft)', borderRadius: 16, background: 'var(--cream-2)' }}>
          Pick a site from the sidebar first to weave its playlist.
        </div>
      ) : (
        <>
          {error && (
            <div role="alert" style={{ padding: '9px 13px', borderRadius: 10, background: 'var(--pl-plum-mist)', border: '1px solid rgba(122,45,64,0.24)', color: 'var(--pl-plum, #7A2D40)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {songs !== null && total === 0 ? (
            <section style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 16 }}>
              <EmptyState
                eyebrow="The guest playlist"
                title="Nothing yet. Begin a thread."
                description="When guests suggest songs on your site, they land here, wave the ones you love onto the floor, and set the rest aside."
              />
            </section>
          ) : (
            <div className="pl8mus-grid">
              {/* LEFT — ON THE FLOOR (accepted set) + curated footer. */}
              <section style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <CardEyebrow color="var(--sage-deep)">On the floor</CardEyebrow>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--ink-muted)' }}>
                    {grouped.accepted.length} {grouped.accepted.length === 1 ? 'track' : 'tracks'}
                  </span>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.16, color: 'var(--ink)', margin: '8px 0 14px' }}>
                  The songs that <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>play.</span>
                </div>

                {loading || songs === null ? (
                  <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-muted)' }}>Loading…</div>
                ) : grouped.accepted.length === 0 ? (
                  <div style={{ padding: '18px 14px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-muted)', fontStyle: 'italic', background: 'var(--cream-2)', borderRadius: 10, border: '1px dashed var(--line-soft)' }}>
                    Nothing on the floor yet, accept a request and it lands here.
                  </div>
                ) : (
                  <div>
                    {grouped.accepted.map((s, i) => {
                      const key = `acc-${s.id}`;
                      const playing = playingKey === key;
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none', opacity: busyId === s.id ? 0.55 : 1 }}>
                          <span aria-hidden style={{ fontFamily: MONO, fontSize: 11, color: 'var(--ink-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <TrackArt song={s} tintIdx={i} size={44} playing={playing} onToggle={s.preview_url ? () => togglePreview(key, s.preview_url as string) : undefined} />
                          {/* title-block + actions in one wrapping row: inline
                              on desktop, actions drop below the title on phones
                              so the title never crushes to a single letter. */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px' }}>
                            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                              <div style={{ fontFamily: DISPLAY, fontSize: 16.5, color: 'var(--ink)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.song_title}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.artist ? <>{s.artist} <span aria-hidden>·</span> </> : null}
                                <span style={{ fontStyle: 'italic' }}>basted in by {firstName(s.guest_name)}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                              {s.spotify_url && (
                                <a href={s.spotify_url} target="_blank" rel="noreferrer" style={spotifyLink}>Open in Spotify</a>
                              )}
                              <button type="button" onClick={() => onSetState(s.id, 'hidden')} disabled={busyId === s.id} style={pill('ghost')} aria-label={`Set aside ${s.song_title}`}>
                                Set aside
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Curated playlist footer — the Spotify URL the public
                    Soundtrack section embeds (edited in the editor). */}
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                  <CardEyebrow color="var(--peach-ink)">Curated playlist</CardEyebrow>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginTop: 8 }}>
                    {spotifyUrl ? (
                      <>
                        <a href={spotifyUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom', color: 'var(--ink)', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>
                          {spotifyUrl.length > 72 ? spotifyUrl.slice(0, 72) + '…' : spotifyUrl}
                        </a>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-muted)' }}>
                          Embedded in the public site&rsquo;s &ldquo;Soundtrack&rdquo; section.
                        </div>
                      </>
                    ) : (
                      <>No playlist link yet, add one in the editor&rsquo;s Music block to embed a Spotify playlist.</>
                    )}
                  </div>
                </div>
              </section>

              {/* RIGHT — GUEST REQUESTS (queued lane). */}
              <section style={{ background: 'var(--cream-2)', border: '1px solid var(--line-soft)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <CardEyebrow color="var(--peach-ink)">Guest requests</CardEyebrow>
                  <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--peach-ink)' }}>{grouped.queued.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, flex: 1, minWidth: 160 }}>
                    Guests add songs from your site. Wave them onto the floor, or let them pass.
                  </span>
                  <StateChip size="sm" kind={mode.kind}>{mode.label}</StateChip>
                </div>

                <div style={{ marginTop: 14 }}>
                  {loading || songs === null ? (
                    <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-muted)' }}>Loading…</div>
                  ) : grouped.queued.length === 0 ? (
                    <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, color: 'var(--sage-deep)', textAlign: 'center', padding: '22px 0' }}>
                      All cleared.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {grouped.queued.map((s, i) => {
                        const key = `q-${s.id}`;
                        const playing = playingKey === key;
                        return (
                          <div key={s.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12, opacity: busyId === s.id ? 0.55 : 1 }}>
                            <TrackArt song={s} tintIdx={i} size={40} playing={playing} onToggle={s.preview_url ? () => togglePreview(key, s.preview_url as string) : undefined} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', wordBreak: 'break-word' }}>{s.song_title}</span>
                                <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', flexShrink: 0 }}>{relativeTime(s.created_at, now)}</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                                {s.artist ? <>{s.artist} <span aria-hidden>·</span> </> : null}
                                <span style={{ color: 'var(--ink-muted)' }}>{s.guest_name}</span>
                              </div>
                              {s.note && (
                                <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', borderLeft: '2px solid var(--peach-ink)', paddingLeft: 8 }}>
                                  &ldquo;{s.note}&rdquo;
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                                <button type="button" onClick={() => onSetState(s.id, 'accepted')} disabled={busyId === s.id} style={pill('primary')}>Add</button>
                                <button type="button" onClick={() => onSetState(s.id, 'hidden')} disabled={busyId === s.id} style={pill('ghost')}>Skip</button>
                                {s.spotify_url && (
                                  <a href={s.spotify_url} target="_blank" rel="noreferrer" style={spotifyLink}>Open in Spotify</a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* SET ASIDE — hidden requests, reversible. */}
          {songs !== null && grouped.hidden.length > 0 && (
            <section style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 16, padding: 20 }}>
              <CardEyebrow>Set aside · {grouped.hidden.length}</CardEyebrow>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '8px 0 12px' }}>
                Passed over, kept for the record. Bring one back to the requests lane any time.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {grouped.hidden.map((s) => (
                  <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 12px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line-soft)', opacity: busyId === s.id ? 0.55 : 1 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.song_title}{s.artist ? ` · ${s.artist}` : ''}
                    </span>
                    <button type="button" onClick={() => onSetState(s.id, 'queued')} disabled={busyId === s.id} style={{ ...pill('ghost'), padding: '3px 10px', color: 'var(--peach-ink)' }}>
                      Bring back
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {total > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Songs on the floor flow into the printable{' '}
              <Link href="/dashboard/memory-book" style={{ color: 'var(--peach-ink, #C6703D)', textDecoration: 'underline' }}>memory book</Link>
              {' '}and your soundtrack on the public site.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── The data client — keeps every fetch/feature, feeds MusicBoard ──
export function MusicDashboardClient() {
  const { site, loading } = useSelectedSite();
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, State>>({});

  const refresh = useCallback(async () => {
    if (!site?.id) return;
    try {
      const r = await fetch(`/api/song-requests?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Failed to load (${r.status})`);
      }
      const data = (await r.json()) as { songs?: SongRow[] };
      setSongs(data.songs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the playlist.');
    }
  }, [site?.id]);

  useEffect(() => {
    if (!site?.id) return;
    void refresh();
  }, [site?.id, refresh]);

  const setState = useCallback(async (id: string, next: State) => {
    setBusyId(id);
    setError(null);
    setOptimistic((m) => ({ ...m, [id]: next }));
    try {
      const r = await fetch('/api/song-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, state: next }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Update failed (${r.status})`);
      }
      // Refresh — keeps the sort + counts honest.
      await refresh();
      setOptimistic((m) => { const c = { ...m }; delete c[id]; return c; });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
      // Roll back the optimistic flip.
      setOptimistic((m) => { const c = { ...m }; delete c[id]; return c; });
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  // Apply optimistic flips on top of the server list so the UI
  // stays snappy while the PATCH round-trips.
  const effectiveSongs = useMemo(() => {
    if (songs === null) return null;
    return songs.map((s) => ({ ...s, state: (optimistic[s.id] ?? s.state) as State }));
  }, [songs, optimistic]);

  // Curated playlist URL + how requests arrive — both read from the
  // manifest (music mode is context here; the toggle lives in the
  // editor's Music panel).
  const { spotifyUrl, musicMode } = useMemo(() => {
    const m = (site?.manifest as {
      spotifyUrl?: string;
      logistics?: { spotifyUrl?: string };
      music?: { suggestions?: boolean; autoAdd?: boolean };
    } | undefined) ?? undefined;
    const url = m?.spotifyUrl ?? m?.logistics?.spotifyUrl ?? '';
    const mode: MusicMode = m?.music?.suggestions === false ? 'closed' : m?.music?.autoAdd === true ? 'auto' : 'approve';
    return { spotifyUrl: url, musicMode: mode };
  }, [site?.manifest]);

  return (
    <DashLayout active="music" hideTopbar>
      <MusicBoard
        loading={loading}
        siteReady={Boolean(site?.id)}
        songs={effectiveSongs}
        busyId={busyId}
        error={error}
        spotifyUrl={spotifyUrl}
        musicMode={musicMode}
        onSetState={setState}
      />
    </DashLayout>
  );
}
