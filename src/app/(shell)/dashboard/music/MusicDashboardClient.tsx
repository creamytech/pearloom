'use client';

// ─────────────────────────────────────────────────────────────
// MusicDashboardClient — host moderation surface for the
// collaborative playlist. Lists every guest song request from
// /api/song-requests, lets the host triage queued → accepted →
// hidden, and surfaces the curated playlist URL the public
// SpotifySection embeds.
//
// Three columns:
//   1. Pending — newly submitted, awaiting decision.
//   2. Accepted — green-lit, will appear in the public site's
//      "Songs your guests added" strip + the memory book.
//   3. Hidden — declined. Stays in the audit trail but invisible
//      everywhere else.
//
// Below the columns: a small Spotify URL card so hosts can
// paste / update the curated playlist link without diving into
// the editor manifest.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

interface SongRow {
  id: string;
  guest_id: string | null;
  guest_name: string;
  song_title: string;
  artist: string | null;
  spotify_url: string | null;
  note: string | null;
  state: 'queued' | 'accepted' | 'hidden';
  created_at: string;
}

type State = SongRow['state'];

const STATE_LABELS: Record<State, string> = {
  queued: 'Pending',
  accepted: 'Accepted',
  hidden: 'Hidden',
};

const STATE_HINTS: Record<State, string> = {
  queued: 'New requests, awaiting your call.',
  accepted: 'Live on the site + in the memory book.',
  hidden: 'Hidden from the public site. Still here for the record.',
};

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

  async function setState(id: string, next: State) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
      // Roll back the optimistic flip.
      setOptimistic((m) => { const c = { ...m }; delete c[id]; return c; });
    } finally {
      setBusyId(null);
    }
  }

  // Apply optimistic flips on top of the server list so the UI
  // stays snappy while the PATCH round-trips.
  const grouped = useMemo(() => {
    const out: Record<State, SongRow[]> = { queued: [], accepted: [], hidden: [] };
    for (const s of songs ?? []) {
      const eff = (optimistic[s.id] ?? s.state) as State;
      out[eff].push({ ...s, state: eff });
    }
    return out;
  }, [songs, optimistic]);

  // Spotify URL from manifest — the curated playlist embed.
  // Surfaced read-only here as a context anchor; full editing
  // lives in the editor's Music block / Spotify panel.
  const spotifyUrl = (() => {
    const m = (site?.manifest as { spotifyUrl?: string; logistics?: { spotifyUrl?: string } } | undefined) ?? undefined;
    return m?.spotifyUrl ?? m?.logistics?.spotifyUrl ?? '';
  })();

  return (
    <DashLayout active="music" hideTopbar>
      <div style={{ padding: '20px clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Quiet header (DASHBOARD-LAYOUT-PLAN rule 1): one line —
            the column hints below already explain the triage. */}
        <PageIntro eyebrow="Music" title="The guest playlist" style={{ marginBottom: 0 }} />
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-muted)' }}>Threading…</div>
        ) : !site?.id ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--ink-soft)',
              border: '1px dashed var(--line-soft)',
              borderRadius: 16,
              background: 'var(--cream-2)',
            }}
          >
            Pick a site from the sidebar first to manage its playlist.
          </div>
        ) : (
          <>
            {/* Curated playlist link — hosts can confirm the public
                SpotifySection is pointing somewhere real. */}
            <section
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line-soft)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--peach-ink, #C6703D)',
                  marginBottom: 4,
                }}>
                  Curated playlist
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  {spotifyUrl ? (
                    <>
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(14,13,11,0.18)' }}
                      >
                        {spotifyUrl.length > 80 ? spotifyUrl.slice(0, 80) + '…' : spotifyUrl}
                      </a>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-muted)' }}>
                        Embedded in the public site&apos;s &ldquo;Soundtrack&rdquo; section.
                      </div>
                    </>
                  ) : (
                    <>
                      No Spotify URL set yet — add one in the editor&apos;s Music block to embed a playlist.
                    </>
                  )}
                </div>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(122,45,45,0.08)',
                  border: '1px solid rgba(122,45,45,0.2)',
                  color: '#7A2D2D',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Three columns: pending / accepted / hidden. Each
                has an empty state so the host can tell when there
                are no rows in that bucket vs. data still loading. */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {(['queued', 'accepted', 'hidden'] as State[]).map((s) => (
                <Column
                  key={s}
                  state={s}
                  rows={grouped[s]}
                  loading={songs === null}
                  busyId={busyId}
                  onSetState={setState}
                />
              ))}
            </div>

            {/* Pear pulls accepted songs from this surface into
                the memory book. Surface that connection so hosts
                see why "accepted" matters beyond the public site. */}
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Accepted songs flow into the printable{' '}
              <Link href="/dashboard/memory-book" style={{ color: 'var(--peach-ink, #C6703D)', textDecoration: 'underline' }}>memory book</Link>
              {' '}and appear under your soundtrack on the public site.
            </div>
          </>
        )}
      </div>
    </DashLayout>
  );
}

function Column({
  state,
  rows,
  loading,
  busyId,
  onSetState,
}: {
  state: State;
  rows: SongRow[];
  loading: boolean;
  busyId: string | null;
  onSetState: (id: string, next: State) => void;
}) {
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: state === 'accepted' ? 'var(--sage-deep)' : state === 'hidden' ? 'var(--ink-muted)' : 'var(--peach-ink, #C6703D)',
        }}>
          {STATE_LABELS[state]} · {rows.length}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: 4 }}>
        {STATE_HINTS[state]}
      </div>

      {loading ? (
        <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12, color: 'var(--ink-muted)' }}>Threading…</div>
      ) : rows.length === 0 ? (
        <div style={{
          padding: '20px 12px',
          textAlign: 'center',
          fontSize: 12.5,
          color: 'var(--ink-muted)',
          fontStyle: 'italic',
          background: 'var(--cream-2)',
          borderRadius: 10,
          border: '1px dashed var(--line-soft)',
        }}>
          {state === 'queued' ? 'Nothing pending. Guests will land here when they add a song.' : `No ${STATE_LABELS[state].toLowerCase()} songs yet.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((s) => (
            <Row key={s.id} song={s} busy={busyId === s.id} onSetState={onSetState} />
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ song, busy, onSetState }: { song: SongRow; busy: boolean; onSetState: (id: string, next: State) => void }) {
  const isQueued = song.state === 'queued';
  const isAccepted = song.state === 'accepted';
  const isHidden = song.state === 'hidden';
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', wordBreak: 'break-word' }}>
          {song.song_title}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', flexShrink: 0 }}>
          {relativeTime(song.created_at)}
        </span>
      </div>
      {song.artist && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {song.artist}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
        — {song.guest_name}
      </div>
      {song.note && (
        <div style={{
          fontSize: 12,
          color: 'var(--ink-soft)',
          fontStyle: 'italic',
          borderLeft: '2px solid var(--peach-ink, #C6703D)',
          paddingLeft: 8,
        }}>
          &ldquo;{song.note}&rdquo;
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {!isAccepted && (
          <button
            type="button"
            onClick={() => onSetState(song.id, 'accepted')}
            disabled={busy}
            style={pillBtn('accept')}
          >
            Accept
          </button>
        )}
        {!isHidden && (
          <button
            type="button"
            onClick={() => onSetState(song.id, 'hidden')}
            disabled={busy}
            style={pillBtn('hide')}
          >
            Hide
          </button>
        )}
        {!isQueued && (
          <button
            type="button"
            onClick={() => onSetState(song.id, 'queued')}
            disabled={busy}
            style={pillBtn('reset')}
          >
            Move to pending
          </button>
        )}
        {song.spotify_url && (
          <a
            href={song.spotify_url}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              color: 'var(--ink-soft)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              textDecoration: 'none',
            }}
          >
            Open in Spotify ↗
          </a>
        )}
      </div>
    </div>
  );
}

function pillBtn(kind: 'accept' | 'hide' | 'reset'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    border: '1px solid var(--line-soft)',
    background: 'transparent',
  };
  if (kind === 'accept') return { ...base, color: 'var(--sage-deep, #5C6B3F)', borderColor: 'rgba(92,107,63,0.4)' };
  if (kind === 'hide') return { ...base, color: '#7A2D2D', borderColor: 'rgba(122,45,45,0.32)' };
  return { ...base, color: 'var(--ink-muted)' };
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
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
