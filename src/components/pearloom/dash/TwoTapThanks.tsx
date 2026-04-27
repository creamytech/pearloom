'use client';

// Two-Tap Thank-Yous: scroll through your guest list ranked by
// contribution (whisper, memory response, gift, attendance), tap
// one, see what they did, tap Draft — Pear writes a personal note.
// Copy to clipboard; tap next. Designed for a plane ride.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { AIHint, useAICall } from '../editor/ai';
import { Icon } from '../motifs';

interface GuestContribution {
  guestId: string;
  guestName: string;
  status?: string | null;
  mealPreference?: string | null;
  gift?: string | null;
  whisperBody?: string | null;
  memoryResponse?: string | null;
  songTitle?: string | null;
  score: number;
}

const SENT_KEY_PREFIX = 'pl:thanks-sent:';

function loadSent(siteId: string | null): Set<string> {
  if (!siteId || typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SENT_KEY_PREFIX + siteId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSent(siteId: string | null, sent: Set<string>) {
  if (!siteId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SENT_KEY_PREFIX + siteId, JSON.stringify([...sent]));
  } catch {}
}

export function TwoTapThanks() {
  const { site } = useSelectedSite();
  const siteId = site?.id ?? null;
  const [guests, setGuests] = useState<GuestContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [hideSent, setHideSent] = useState(true);

  useEffect(() => {

    setSentIds(loadSent(siteId));
  }, [siteId]);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [guestsR, whispersR, memoryR, songsR] = await Promise.all([
        fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' }),
        fetch(`/api/whispers?siteId=${encodeURIComponent(siteId)}&only=all`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/memory-weave?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/song-requests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' }).catch(() => null),
      ]);
      const guestsJson = guestsR.ok ? await guestsR.json() : { guests: [] };
      const whispersJson = whispersR?.ok ? await whispersR.json() : { whispers: [] };
      const memoryJson = memoryR?.ok ? await memoryR.json() : { prompts: [] };
      const songsJson = songsR?.ok ? await songsR.json() : { songs: [] };

      const whispersByName = new Map<string, string>();
      for (const w of (whispersJson.whispers ?? []) as Array<{ guest_name: string; body: string }>) {
        whispersByName.set(w.guest_name.toLowerCase(), w.body);
      }
      const memoryByName = new Map<string, string>();
      for (const m of (memoryJson.prompts ?? []) as Array<{ guest_name: string; response: string | null }>) {
        if (m.response) memoryByName.set(m.guest_name.toLowerCase(), m.response);
      }
      const songByName = new Map<string, string>();
      for (const s of (songsJson.songs ?? []) as Array<{ guest_name: string; song_title: string }>) {
        songByName.set(s.guest_name.toLowerCase(), s.song_title);
      }

      const guestList = (guestsJson.guests ?? []) as Array<{
        id: string;
        name: string;
        status?: string;
        mealPreference?: string | null;
      }>;
      const contribs: GuestContribution[] = guestList.map((g) => {
        const key = g.name.toLowerCase();
        const w = whispersByName.get(key) ?? null;
        const m = memoryByName.get(key) ?? null;
        const song = songByName.get(key) ?? null;
        let score = 0;
        if (g.status === 'attending' || g.status === 'yes') score += 2;
        if (m) score += 3;
        if (w) score += 3;
        if (song) score += 1;
        return {
          guestId: g.id,
          guestName: g.name,
          status: g.status,
          mealPreference: g.mealPreference,
          whisperBody: w,
          memoryResponse: m,
          songTitle: song,
          gift: null,
          score,
        };
      });
      contribs.sort((a, b) => b.score - a.score);
      setGuests(contribs);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = guests.find((g) => g.guestId === picked) ?? null;

  const { state, error, run } = useAICall(async () => {
    if (!current) throw new Error('Pick a guest first');
    const giftParts: string[] = [];
    if (current.memoryResponse) giftParts.push(`shared the memory: "${current.memoryResponse.slice(0, 200)}"`);
    if (current.whisperBody) giftParts.push(`left a private whisper`);
    if (current.songTitle) giftParts.push(`added "${current.songTitle}" to the playlist`);
    if (current.status === 'attending' || current.status === 'yes') giftParts.push(`came to the day`);
    const giftLine = giftParts.length ? giftParts.join('; ') : 'came in spirit';
    const r = await fetch('/api/ai-thankyou', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: current.guestName,
        giftDescription: giftLine,
        coupleNames: Array.isArray(site?.names) ? site!.names.filter(Boolean).join(' & ') : 'us',
        occasion: site?.occasion ?? 'wedding',
      }),
    });
    if (!r.ok) throw new Error(`Pear couldn't write one (${r.status})`);
    const d = await r.json();
    const text = String(d.note ?? '').trim();
    if (!text) throw new Error('Empty response');
    setDraft(text);
    return text;
  });

  function copyNote() {
    if (!draft) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(draft).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
    // Mark as sent the moment they copy — that's when it leaves the
    // drafting loop. Host can untoggle in the UI if they want.
    if (picked) {
      const next = new Set(sentIds);
      next.add(picked);
      setSentIds(next);
      saveSent(siteId, next);
    }
  }

  function toggleSent(id: string) {
    const next = new Set(sentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSentIds(next);
    saveSent(siteId, next);
  }

  function nextGuest() {
    if (!picked) return;
    const idx = guests.findIndex((g) => g.guestId === picked);
    const next = guests[idx + 1];
    setDraft(null);
    setCopied(false);
    setPicked(next?.guestId ?? null);
  }

  const visibleGuests = useMemo(
    () => (hideSent ? guests.filter((g) => !sentIds.has(g.guestId)) : guests),
    [guests, hideSent, sentIds],
  );
  const top = useMemo(() => visibleGuests.slice(0, 24), [visibleGuests]);
  const sentCount = guests.filter((g) => sentIds.has(g.guestId)).length;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 18,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>
        Two-tap thanks
      </div>
      <h3 className="display" style={{ margin: 0, fontSize: 26 }}>
        Drafted from <span className="display-italic">what they did.</span>
      </h3>
      <AIHint>
        Tap a guest → see what they did (memory, whisper, song, attendance) → tap Draft → Pear writes a note grounded
        in their specific contribution. Copy and send. Next.
      </AIHint>
      {guests.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--ink-soft)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hideSent}
              onChange={(e) => setHideSent(e.target.checked)}
            />
            Hide sent
          </label>
          <span>
            {sentCount} of {guests.length} done
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Threading…</div>
      ) : guests.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          No guests yet. Import your list or add guests on the Guests page.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
              maxHeight: 220,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {top.map((g) => {
              const on = picked === g.guestId;
              const sent = sentIds.has(g.guestId);
              return (
                <button
                  key={g.guestId}
                  type="button"
                  onClick={() => {
                    setPicked(g.guestId);
                    setDraft(null);
                  }}
                  style={{
                    padding: '10px 12px',
                    background: on ? 'var(--ink)' : sent ? 'var(--sage-tint)' : 'var(--cream-2)',
                    color: on ? 'var(--cream)' : 'var(--ink)',
                    border: on ? 'none' : `1px solid ${sent ? 'var(--sage-deep)' : 'var(--line-soft)'}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    opacity: sent && !on ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    {sent && <Icon name="check" size={10} />} {g.guestName}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>
                    {sent ? 'thanked' : g.memoryResponse ? 'memory' : g.whisperBody ? 'whisper' : g.songTitle ? 'song' : g.status === 'attending' ? 'came' : '—'}
                  </div>
                </button>
              );
            })}
          </div>

          {current && (
            <div style={{ background: 'var(--cream-2)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {current.guestName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                {current.memoryResponse && <div>· Memory: "{current.memoryResponse.slice(0, 160)}{current.memoryResponse.length > 160 ? '…' : ''}"</div>}
                {current.whisperBody && <div>· Left a private whisper</div>}
                {current.songTitle && <div>· Added "{current.songTitle}" to the playlist</div>}
                {current.status && <div>· RSVP: {current.status}</div>}
                {!current.memoryResponse && !current.whisperBody && !current.songTitle && current.status !== 'attending' && (
                  <div>Nothing specific — Pear will write a warm generic thanks.</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void run()}
                  disabled={state === 'running'}
                >
                  <Icon name="sparkles" size={12} /> {state === 'running' ? 'Drafting…' : draft ? 'Try another' : 'Draft thanks'}
                </button>
                {draft && (
                  <>
                    <button type="button" className="btn btn-outline btn-sm" onClick={copyNote}>
                      <Icon name={copied ? 'check' : 'copy'} size={12} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                    {picked && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleSent(picked)}
                      >
                        {sentIds.has(picked) ? (
                          <>Un-mark sent</>
                        ) : (
                          <>
                            <Icon name="check" size={12} /> Mark sent
                          </>
                        )}
                      </button>
                    )}
                    <button type="button" className="btn btn-outline btn-sm" onClick={nextGuest}>
                      Next <Icon name="arrow-right" size={12} />
                    </button>
                  </>
                )}
                {error && <span style={{ fontSize: 12, color: '#7A2D2D', alignSelf: 'center' }}>{error}</span>}
              </div>

              {draft && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    background: 'var(--card)',
                    border: '1px solid var(--card-ring)',
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {draft}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
