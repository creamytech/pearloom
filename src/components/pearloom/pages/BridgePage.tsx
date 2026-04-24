'use client';

// ─────────────────────────────────────────────────────────────
// The Guest Bridge — host-side command center for all the
// guest ⇄ couple bridge features that ship in this session:
//   • Memory Weave (AI-generate per-guest prompts, read responses)
//   • Live Whispers (slow-drip private notes feed)
//   • Anniversary Time-Capsule (sealed notes + reveal log)
//   • Seat-mate Intros (AI-generate, preview)
//   • Collaborative Playlist (song queue, accept/hide)
//   • Pear SMS drafts (copyable per-guest SMS bodies)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '../dash/DashShell';
import { Icon } from '../motifs';
import { AIHint, AISuggestButton, useAICall } from '../editor/ai';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

type Tab = 'memory' | 'whispers' | 'capsule' | 'seats' | 'songs' | 'sms';

export function BridgePage() {
  const { site } = useSelectedSite();
  const [tab, setTab] = useState<Tab>('memory');
  const siteId = site?.id ?? null;

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'memory',   label: 'Memory Weave',  icon: 'sparkles' },
    { id: 'whispers', label: 'Whispers',      icon: 'mail' },
    { id: 'capsule',  label: 'Time-capsule',  icon: 'clock' },
    { id: 'seats',    label: 'Seat-mates',    icon: 'users' },
    { id: 'songs',    label: 'Playlist',      icon: 'music' },
    { id: 'sms',      label: 'Pear SMS',      icon: 'send' },
  ];

  return (
    <DashLayout
      active="bridge"
      title="The bridge"
      subtitle="Every thread Pear is weaving between you and your guests — memories, whispers, songs, and time capsules."
    >
      <div style={{ padding: '0 32px 40px', maxWidth: 1160 }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            padding: 4,
            background: 'var(--cream-2)',
            borderRadius: 12,
            marginBottom: 22,
            width: 'fit-content',
          }}
        >
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink)',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Icon name={t.icon} size={12} /> {t.label}
              </button>
            );
          })}
        </div>

        {!siteId ? (
          <EmptyPicker />
        ) : (
          <>
            {tab === 'memory' && <MemoryWeavePanel siteId={siteId} />}
            {tab === 'whispers' && <WhispersPanel siteId={siteId} />}
            {tab === 'capsule' && <CapsulePanel siteId={siteId} />}
            {tab === 'seats' && <SeatIntrosPanel siteId={siteId} />}
            {tab === 'songs' && <SongsPanel siteId={siteId} />}
            {tab === 'sms' && <SmsPanel siteId={siteId} />}
          </>
        )}
      </div>
    </DashLayout>
  );
}

function EmptyPicker() {
  return (
    <div
      style={{
        padding: 40,
        textAlign: 'center',
        background: 'var(--card)',
        border: '1px dashed var(--line)',
        borderRadius: 18,
      }}
    >
      <div className="display" style={{ fontSize: 22 }}>
        Pick a site first.
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 8 }}>
        <Link href="/dashboard/event" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
          Open your sites
        </Link>{' '}
        and choose which celebration to manage here.
      </div>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 className="display" style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      {hint && (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, maxWidth: 680 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ── Memory Weave ──
function MemoryWeavePanel({ siteId }: { siteId: string }) {
  const [prompts, setPrompts] = useState<
    Array<{ id: string; guest_name: string; prompt: string; response?: string | null; responded_at?: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/memory-weave?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setPrompts(d.prompts ?? []);
    setLoading(false);
  }, [siteId]);
  useEffect(() => {
    void load();
  }, [load]);

  const { state, error, run } = useAICall(async () => {
    const r = await fetch('/api/memory-weave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId }),
    });
    if (!r.ok) {
      const d = (await r.json().catch(() => null)) as { error?: string } | null;
      throw new Error(d?.error ?? `Pear couldn’t weave (${r.status})`);
    }
    await load();
    return true;
  });

  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [emailMsg, setEmailMsg] = useState<string>('');
  async function emailPrompts() {
    setEmailState('sending');
    setEmailMsg('');
    try {
      const r = await fetch('/api/memory-weave/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? 'Failed');
      setEmailState('ok');
      setEmailMsg(
        d.sent > 0
          ? `Sent to ${d.sent}${d.skipped ? ` · ${d.skipped} missing email` : ''}`
          : 'Nothing sent — make sure guests have email on file',
      );
    } catch (e) {
      setEmailState('err');
      setEmailMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  const responded = prompts.filter((p) => p.response);
  const pending = prompts.filter((p) => !p.response);

  return (
    <div>
      <SectionHeader
        title="Memory Weave"
        hint="Pear reads your chapters + guest notes and writes a personal memory prompt for each guest. Responses feed the toast, the reel, and the keepsake book."
      />
      <AIHint>
        Each guest sees their prompt on their Guest Passport page. Responses flow back here — you can mark the best
        lines for the toast or the reel.
      </AIHint>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <AISuggestButton
          label={prompts.length > 0 ? 'Re-weave prompts' : 'Weave prompts for every guest'}
          runningLabel="Weaving…"
          state={state}
          onClick={() => void run()}
          error={error ?? undefined}
        />
        {pending.length > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void emailPrompts()}
            disabled={emailState === 'sending'}
          >
            <Icon name="mail" size={12} />
            {emailState === 'sending' ? 'Emailing…' : `Email ${pending.length} guest${pending.length === 1 ? '' : 's'}`}
          </button>
        )}
        {emailState !== 'idle' && emailMsg && (
          <span style={{ fontSize: 12, color: emailState === 'err' ? '#7A2D2D' : 'var(--sage-deep)' }}>
            {emailMsg}
          </span>
        )}
      </div>

      {loading ? null : prompts.length === 0 ? (
        <div style={{ marginTop: 22, fontSize: 13, color: 'var(--ink-soft)' }}>
          Nothing yet — click above to draft prompts for every guest on this site.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14, marginTop: 22 }}>
          {[...responded, ...pending].map((p) => (
            <div
              key={p.id}
              style={{
                background: p.response ? 'var(--sage-tint)' : 'var(--card)',
                border: `1px solid ${p.response ? 'var(--sage-deep)' : 'var(--card-ring)'}`,
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                {p.guest_name}
              </div>
              <div style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
                {p.prompt}
              </div>
              {p.response ? (
                <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' }}>{p.response}</div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>— no response yet —</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Whispers ──
function WhispersPanel({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<Array<{ id: string; guest_name: string; body: string; deliver_after: string; read_by_host: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/whispers?siteId=${encodeURIComponent(siteId)}&only=ready`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setItems(d.whispers ?? []);
    setLoading(false);
  }, [siteId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function markRead(id: string) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, read_by_host: true } : r)));
    try {
      await fetch('/api/whispers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, readByHost: true }),
      });
    } catch {}
  }

  return (
    <div>
      <SectionHeader
        title="Whispers"
        hint="Guests leave private notes from their Passport page. Pear delivers them over the next two weeks — a slow drip instead of a firehose."
      />
      {loading ? null : items.length === 0 ? (
        <div style={{ padding: 22, background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 14, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
          No whispers delivered yet. They'll appear here as Pear releases each one.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((w) => (
            <div
              key={w.id}
              style={{
                padding: 16,
                background: w.read_by_host ? 'var(--cream-2)' : 'var(--card)',
                border: `1px solid ${w.read_by_host ? 'var(--line-soft)' : 'var(--peach-2)'}`,
                borderRadius: 14,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 14,
                alignItems: 'start',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 4 }}>
                  {w.guest_name} · {new Date(w.deliver_after).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{w.body}</div>
              </div>
              {!w.read_by_host && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => void markRead(w.id)}>
                  <Icon name="check" size={12} /> Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Time Capsule ──
function CapsulePanel({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<Array<{ id: string; guest_name: string; body: string; reveal_years: number; reveal_on: string; revealed: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/passport-capsule?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { capsule: [] }))
      .then((d) => {
        if (!cancelled) {
          setItems(d.capsule ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const now = new Date().toISOString().slice(0, 10);
  const sealed = items.filter((i) => i.reveal_on > now);
  const revealed = items.filter((i) => i.reveal_on <= now);

  return (
    <div>
      <SectionHeader
        title="Anniversary time-capsule"
        hint="Sealed notes from guests, opened on the years they chose. Pear pings everyone on reveal day."
      />
      {loading ? null : (
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 10 }}>
              Opening today or earlier · {revealed.length}
            </div>
            {revealed.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Nothing ready to open yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                {revealed.map((c) => (
                  <div key={c.id} style={{ padding: 16, background: 'var(--peach-bg)', border: '1px solid var(--peach-2)', borderRadius: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                      {c.guest_name} · Year {c.reveal_years}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              Sealed for later · {sealed.length}
            </div>
            {sealed.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                No sealed notes yet. Guests can leave one on their Passport.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                {sealed.map((c) => (
                  <div key={c.id} style={{ padding: 14, background: 'var(--cream-2)', border: '1px dashed var(--line)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{c.guest_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Opens {new Date(c.reveal_on).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 8, fontStyle: 'italic' }}>
                      Sealed — Pear will reveal on the day.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Seat-mate Intros ──
function SeatIntrosPanel({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<Array<{ guest_id: string; table_label?: string | null; intro: string; seatmates: Array<{ name: string; blurb?: string }> }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/seatmate-intros?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setItems(d.intros ?? []);
    setLoading(false);
  }, [siteId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const { state, error, run } = useAICall(async () => {
    const r = await fetch('/api/seatmate-intros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId }),
    });
    if (!r.ok) {
      const d = (await r.json().catch(() => null)) as { error?: string } | null;
      throw new Error(d?.error ?? `Pear couldn't write them (${r.status})`);
    }
    await load();
    return true;
  });

  return (
    <div>
      <SectionHeader
        title="Seat-mate intros"
        hint="Pear writes each guest a 1-line intro of who they'll sit next to, drawn from relationships + notes."
      />
      <AIHint>Shown on each Guest Passport. Run this again whenever the seating chart changes.</AIHint>
      <AISuggestButton
        label={items.length > 0 ? 'Re-write intros' : 'Generate intros'}
        runningLabel="Writing…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />

      {loading ? null : items.length === 0 ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12, marginTop: 22 }}>
          {items.map((s) => (
            <div key={s.guest_id} style={{ padding: 16, background: 'var(--card)', border: '1px solid var(--card-ring)', borderRadius: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                {s.table_label ?? 'Table'}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>{s.intro}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Playlist queue ──
function SongsPanel({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<Array<{ id: string; guest_name: string; song_title: string; artist?: string | null; spotify_url?: string | null; note?: string | null; state: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/song-requests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setItems(d.songs ?? []);
    setLoading(false);
  }, [siteId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function patch(id: string, state: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, state } : x)));
    try {
      await fetch('/api/song-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, state }),
      });
    } catch {}
  }

  const queued = items.filter((i) => i.state === 'queued');
  const accepted = items.filter((i) => i.state === 'accepted');
  const [copied, setCopied] = useState(false);

  function exportList() {
    const lines = accepted.map((s) => `${s.song_title}${s.artist ? ` — ${s.artist}` : ''}`);
    const text = lines.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }).catch(() => {});
    }
  }

  return (
    <div>
      <SectionHeader
        title="Collaborative playlist"
        hint="Guests add songs from their Passport. Accept what fits; copy the final list into your Spotify."
      />
      {accepted.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={exportList}>
            <Icon name={copied ? 'check' : 'copy'} size={12} /> {copied ? `${accepted.length} songs copied` : `Copy ${accepted.length} songs for Spotify`}
          </button>
        </div>
      )}
      {loading ? null : (
        <div style={{ display: 'grid', gap: 22 }}>
          <SongColumn title={`Queued · ${queued.length}`} songs={queued} onAccept={(id) => patch(id, 'accepted')} onHide={(id) => patch(id, 'hidden')} empty="No requests yet — share your site and they'll start coming in." />
          <SongColumn title={`Accepted · ${accepted.length}`} songs={accepted} onAccept={(id) => patch(id, 'queued')} onHide={(id) => patch(id, 'hidden')} acceptLabel="Un-accept" empty="Nothing accepted yet." />
        </div>
      )}
    </div>
  );
}

function SongColumn({
  title,
  songs,
  onAccept,
  onHide,
  acceptLabel = 'Accept',
  empty,
}: {
  title: string;
  songs: Array<{ id: string; guest_name: string; song_title: string; artist?: string | null; spotify_url?: string | null; note?: string | null }>;
  onAccept: (id: string) => void;
  onHide: (id: string) => void;
  acceptLabel?: string;
  empty: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {songs.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{empty}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {songs.map((s) => (
            <div
              key={s.id}
              style={{
                padding: 12,
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 12,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.song_title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {s.artist ? `${s.artist} · ` : ''}from {s.guest_name}
                  {s.spotify_url && (
                    <>
                      {' · '}
                      <a href={s.spotify_url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>
                        Spotify ↗
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onAccept(s.id)}>
                  <Icon name="check" size={12} /> {acceptLabel}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onHide(s.id)}>
                  <Icon name="close" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pear SMS ──
function SmsPanel({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<Array<{ id: string; guest_name: string; body: string; phone?: string | null; sent_at?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/pear-sms?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setItems(d.drafts ?? []);
    setLoading(false);
  }, [siteId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const { state, error, run } = useAICall(async () => {
    const r = await fetch('/api/pear-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId }),
    });
    if (!r.ok) {
      const d = (await r.json().catch(() => null)) as { error?: string } | null;
      throw new Error(d?.error ?? `Pear couldn’t draft (${r.status})`);
    }
    await load();
    return true;
  });

  async function markSent(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, sent_at: new Date().toISOString() } : x)));
    try {
      await fetch('/api/pear-sms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {}
  }

  function copy(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  return (
    <div>
      <SectionHeader
        title="Pear SMS"
        hint="One personal text per guest, day before. Copy and send from your phone — or paste the list into your texting app of choice."
      />
      <AIHint>
        Pearloom doesn't send the text for you — you tap Copy, paste into Messages. (Keeps it feeling like it came from
        you, not a bulk service.)
      </AIHint>
      <AISuggestButton
        label={items.length > 0 ? 'Re-draft for every guest' : 'Draft one per guest'}
        runningLabel="Drafting…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />

      {loading ? null : items.length === 0 ? null : (() => {
        // Guests with a phone number on file come first; the rest
        // fall to the bottom with a "no phone" treatment so the
        // host can quickly see who needs a phone imported.
        const withPhone = items.filter((i) => i.phone && i.phone.trim().length > 0);
        const withoutPhone = items.filter((i) => !i.phone || i.phone.trim().length === 0);
        const ordered = [...withPhone, ...withoutPhone];
        return (
        <>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '14px 0 6px' }}>
            {withPhone.length} guest{withPhone.length === 1 ? '' : 's'} with a phone on file
            {withoutPhone.length > 0 && ` · ${withoutPhone.length} missing`}
          </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12, marginTop: 6 }}>
          {ordered.map((s) => {
            const missingPhone = !s.phone || s.phone.trim().length === 0;
            return (
            <div key={s.id} style={{ padding: 16, background: s.sent_at ? 'var(--sage-tint)' : missingPhone ? 'var(--cream-2)' : 'var(--card)', border: `1px solid ${s.sent_at ? 'var(--sage-deep)' : missingPhone ? 'var(--line)' : 'var(--card-ring)'}`, borderRadius: 14, opacity: missingPhone && !s.sent_at ? 0.9 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.guest_name}</div>
                {s.phone
                  ? <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.phone}</span>
                  : <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontStyle: 'italic' }}>no phone on file</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{s.body}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { copy(s.body); if (!s.sent_at) void markSent(s.id); }}>
                  <Icon name="copy" size={12} /> Copy
                </button>
                {s.phone && (
                  <a href={`sms:${s.phone}?body=${encodeURIComponent(s.body)}`} className="btn btn-outline btn-sm">
                    <Icon name="send" size={12} /> Open in SMS
                  </a>
                )}
                {s.sent_at && <span style={{ fontSize: 11, color: 'var(--sage-deep)', alignSelf: 'center' }}>Sent</span>}
              </div>
            </div>
            );
          })}
        </div>
        </>
        );
      })()}
    </div>
  );
}

