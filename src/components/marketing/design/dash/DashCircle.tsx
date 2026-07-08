'use client';

// ─────────────────────────────────────────────────────────────
// DashCircle — the HOST-side friend circle (GRAND-PLAN Phase 4,
// redesigned per GRAND-PLAN-2 C.1). The account-holder home for
// the friend graph, laid out as a PLACE, not a settings panel:
//
//   1. Attention strip — incoming requests (accept/decline) and
//      waiting-on chips, one slim panel, only when non-empty.
//   2. THE CIRCLE — the hero: a grid of friend cards (paper disc
//      mark, Fraunces name, last-note preview from /api/threads).
//      Tapping a card opens the full-width detail panel below —
//      shared celebrations, dietary, the pair thread, and the
//      add-to-event chips.
//   3. Secondary row — invite someone new + discovery, quieter.
//
// Backed by /api/friends (session-authed; resolves the caller to
// their people-graph id), /api/threads (previews + the pair
// thread), and /api/guests/from-person (owner-gated weave-in).
// Privacy: opt-in (default off), mutual consent, first names only.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk, btnMini, btnMiniGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { EmptyState } from '@/components/shell/EmptyState';
import { siteDisplayName, useUserSites, type SiteSummary } from './hooks';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';

interface CircleState {
  available: boolean;
  optedIn: boolean;
  friends: Array<{ firstName: string; personId?: string }>;
  incoming: Array<{ firstName: string; otherId: string }>;
  outgoing: Array<{ firstName: string; otherId: string }>;
  candidates: Array<{ firstName: string; personId: string; siteId: string }>;
}

interface PersonCardData {
  firstName: string;
  sharedCelebrations: Array<{ label: string; occasion: string | null }>;
  dietary: string | null;
}

interface ThreadPreview {
  lastBody: string;
  theirs: boolean;
}

const monoLabel = { ...MONO_STYLE, fontSize: 9, color: PD.terra, marginBottom: 10 } as const;

/* The friend-disc grounds — PD's dark-mode-aware midtones, cycled
   by index so a populated circle reads warm, never uniform. Flat
   fills only (the de-glossing rule: no spheres, no gradients). */
const DISC_TINTS = [PD.sand, PD.wash, PD.mint, PD.blush] as const;

export function DashCircle() {
  const { sites } = useUserSites();
  const [state, setState] = useState<CircleState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null); // personId being added to an event
  const [note, setNote] = useState<string | null>(null);
  /* Invite someone new — pre-event, by email (SOCIAL-PLAN S1) or
     by text (GRAND-PLAN-2 C.2). */
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [invChannel, setInvChannel] = useState<'email' | 'text'>('email');
  const [invNote, setInvNote] = useState<string | null>(null);
  /* Last-note previews for the friend grid — one GET /api/threads
     on load; absent entries render the "no notes yet" line. */
  const [previews, setPreviews] = useState<Map<string, ThreadPreview>>(new Map());
  /* The person card — one open at a time, fetched on demand. */
  const [cardFor, setCardFor] = useState<string | null>(null);
  const [card, setCard] = useState<PersonCardData | null>(null);
  /* The thread (S2) — the pair's bounded conversation, loaded with
     the card and polled quietly while it's open (the BroadcastBar
     cadence; Realtime is the named upgrade). */
  const [msgs, setMsgs] = useState<Array<{ id: string; mine: boolean; body: string; createdAt: string }>>([]);
  const [draft, setDraft] = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);

  const loadPreviews = useCallback(async () => {
    try {
      const r = await fetch('/api/threads', { cache: 'no-store' });
      const d = (await r.json().catch(() => null)) as {
        ok?: boolean;
        threads?: Array<{ otherId: string; lastBody: string; theirs: boolean }>;
      } | null;
      if (r.ok && d?.ok && d.threads) {
        setPreviews(new Map(d.threads.map((t) => [t.otherId, { lastBody: t.lastBody, theirs: t.theirs }])));
      }
    } catch { /* previews are a nicety */ }
  }, []);

  const loadThread = useCallback(async (otherId: string) => {
    try {
      const r = await fetch(`/api/threads?with=${encodeURIComponent(otherId)}`, { cache: 'no-store' });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; messages?: typeof msgs } | null;
      if (r.ok && d?.ok) setMsgs(d.messages ?? []);
    } catch { /* keep prior */ }
  }, []);
  useEffect(() => {
    if (!cardFor) return;
    const t = window.setInterval(() => void loadThread(cardFor), 25_000);
    return () => window.clearInterval(t);
  }, [cardFor, loadThread]);

  async function sendNote() {
    const body = draft.trim();
    if (!body || !cardFor || busy === 'note') return;
    setBusy('note');
    setSendErr(null);
    try {
      const r = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherPersonId: cardFor, body }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (r.ok && d?.ok) {
        setDraft('');
        await loadThread(cardFor);
        // Keep the grid preview honest without a full refetch.
        setPreviews((prev) => new Map(prev).set(cardFor, { lastBody: body.slice(0, 120), theirs: false }));
      } else {
        setSendErr(d?.error ?? 'Could not send.');
      }
    } catch {
      setSendErr('Could not send — check your connection.');
    } finally {
      setBusy(null);
    }
  }

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch('/api/friends', { cache: 'no-store', signal });
      if (!r.ok) { setState({ available: false, optedIn: false, friends: [], incoming: [], outgoing: [], candidates: [] }); return; }
      const d = (await r.json()) as Partial<CircleState>;
      setState({
        available: Boolean(d.available),
        optedIn: Boolean(d.optedIn),
        friends: d.friends ?? [],
        incoming: d.incoming ?? [],
        outgoing: d.outgoing ?? [],
        candidates: d.candidates ?? [],
      });
    } catch { /* leave prior state */ }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    void loadPreviews();
    return () => ctrl.abort();
  }, [load, loadPreviews]);

  async function post(body: Record<string, unknown>, key: string) {
    if (busy) return;
    setBusy(key);
    setNote(null);
    try {
      const r = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  async function invite() {
    const byText = invChannel === 'text';
    if (busy || (byText ? !invPhone.trim() : !invEmail.trim())) return;
    setBusy('invite');
    setInvNote(null);
    try {
      const r = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          ...(byText ? { phone: invPhone.trim() } : { email: invEmail.trim() }),
          name: invName.trim() || undefined,
        }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; error?: string; status?: { status?: string } } | null;
      if (r.ok && d?.ok) {
        const first = invName.trim().split(/\s+/)[0];
        setInvNote(byText
          ? `The text is on its way${first ? ` to ${first}` : ''} — they join your circle when they accept.`
          : first
            ? `Woven in — ${first} will see your invitation when they first sign in.`
            : 'Woven in — they’ll see your invitation when they first sign in.');
        setInvName('');
        setInvEmail('');
        setInvPhone('');
        await load();
      } else {
        setInvNote(d?.error ?? 'Could not send the invitation.');
      }
    } catch {
      setInvNote('Could not send — check your connection.');
    } finally {
      setBusy(null);
    }
  }

  async function openCard(personId: string) {
    if (cardFor === personId) { setCardFor(null); setCard(null); setMsgs([]); return; }
    setCardFor(personId);
    setCard(null);
    setMsgs([]);
    setSendErr(null);
    setAddFor(null);
    void loadThread(personId);
    try {
      const r = await fetch(`/api/friends/person?personId=${encodeURIComponent(personId)}`, { cache: 'no-store' });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; card?: PersonCardData } | null;
      if (r.ok && d?.ok && d.card) setCard(d.card);
      else setCardFor(null);
    } catch {
      setCardFor(null);
    }
  }

  async function addToEvent(personId: string, site: SiteSummary) {
    setBusy(`add:${personId}:${site.id}`);
    setNote(null);
    try {
      /* S3 — weave in from your circle: the GUEST LIST is the
         universal add (was the split-only participant endpoint).
         The email never crosses the wire; the id is the anchor. */
      const r = await fetch('/api/guests/from-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id, personId }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; added?: boolean } | null;
      setNote(r.ok && d?.ok
        ? (d.added === false ? 'Already on that guest list.' : `Woven into ${siteDisplayName(site)} — their invite is on its way.`)
        : 'Could not add — check the event.');
    } catch {
      setNote('Could not add — check your connection.');
    } finally {
      setBusy(null);
      setAddFor(null);
    }
  }

  const chip = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 999,
    background: PD.paper2, border: `1px solid rgba(31,36,24,0.14)`,
    fontSize: '0.86rem', fontWeight: 600, color: PD.ink,
  } as const;

  const openFriend = cardFor ? (state?.friends ?? []).find((f) => f.personId === cardFor) : null;

  return (
    <DashLayout active="circle" hideTopbar>
      <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1100, margin: '0 auto' }}>
        <PageIntro
          eyebrow="Circle"
          title={<>The people you <span className="display-italic">celebrate with.</span></>}
          style={{ marginBottom: 18 }}
        />
        <div style={{ fontSize: 12.5, color: PD.inkSoft, marginBottom: 4, maxWidth: 560, lineHeight: 1.55 }}>
          First names only, and only when you both opt in — Pearloom&rsquo;s people graph, never a public feed.
        </div>

        {/* Opt-in gate */}
        {state && state.available && !state.optedIn && (
          <Panel style={{ padding: 26, marginTop: 18, textAlign: 'center' }}>
            <div style={{ ...DISPLAY_STYLE, fontSize: 22, fontStyle: 'italic', color: PD.olive, marginBottom: 8 }}>
              Keep your circle?
            </div>
            <div style={{ fontSize: 13.5, color: PD.inkSoft, maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Turn this on to keep a quiet, first-names-only connection with people you&rsquo;ve celebrated with — and add
              them to your next event in a tap. Off by default; only mutual opt-ins ever see each other.
            </div>
            <button type="button" style={btnInk} disabled={busy === 'opt'} onClick={() => post({ action: 'opt-in', optIn: true }, 'opt')}>
              Turn on my circle
            </button>
          </Panel>
        )}

        {state && state.available && state.optedIn && (
          <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
            {/* ── 1 · The attention strip — requests to answer +
                   invitations in flight, one slim panel. ───────── */}
            {(state.incoming.length > 0 || state.outgoing.length > 0) && (
              <Panel style={{ padding: '16px 22px', borderLeft: `2px solid ${PD.gold}` }}>
                {state.incoming.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ ...monoLabel, marginBottom: 2 }}>REQUESTS · {state.incoming.length}</div>
                    {state.incoming.map((r) => (
                      <div key={r.otherId} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={chip}>{r.firstName}</span>
                        <span style={{ fontSize: 12.5, color: PD.inkSoft, flex: 1 }}>wants to keep a connection</span>
                        <button type="button" style={btnMini} disabled={!!busy} onClick={() => post({ action: 'accept', otherPersonId: r.otherId }, `acc:${r.otherId}`)}>Accept</button>
                        <button type="button" style={btnMiniGhost} disabled={!!busy} onClick={() => post({ action: 'decline', otherPersonId: r.otherId }, `dec:${r.otherId}`)}>Not now</button>
                      </div>
                    ))}
                  </div>
                )}
                {state.outgoing.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: state.incoming.length > 0 ? 12 : 0 }}>
                    <span style={{ ...MONO_STYLE, fontSize: 9, color: PD.terra }}>WAITING ON</span>
                    {state.outgoing.map((o) => (
                      <span key={o.otherId} style={{ ...chip, opacity: 0.7, fontWeight: 500 }}>
                        {o.firstName}
                        <span style={{ fontSize: 11, color: PD.inkSoft, fontWeight: 500 }}>· invited</span>
                      </span>
                    ))}
                    <span style={{ fontSize: 11.5, color: PD.inkSoft }}>— they&rsquo;ll see it when they first sign in</span>
                  </div>
                )}
              </Panel>
            )}

            {/* ── 2 · THE CIRCLE — the friend grid, the hero. ──── */}
            <Panel style={{ padding: 22 }}>
              <div style={monoLabel}>YOUR CIRCLE{state.friends.length > 0 ? ` · ${state.friends.length}` : ''}</div>
              {state.friends.length === 0 ? (
                <EmptyState
                  size="compact"
                  title="Nothing yet. Begin a thread."
                  description="Accept a request, or weave someone in below — your circle keeps the people, not just the events."
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 12,
                  }}
                >
                  {state.friends.map((f, i) => {
                    const pid = f.personId ?? `f${i}`;
                    const open = cardFor != null && cardFor === f.personId;
                    const preview = f.personId ? previews.get(f.personId) : undefined;
                    return (
                      <button
                        key={pid}
                        type="button"
                        disabled={!f.personId}
                        onClick={() => f.personId && void openCard(f.personId)}
                        aria-expanded={open}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: 16,
                          textAlign: 'left',
                          background: PD.paperCard,
                          border: open ? `1.5px solid ${PD.gold}` : '1px solid rgba(31,36,24,0.12)',
                          borderRadius: 'var(--r-md, 20px)',
                          cursor: f.personId ? 'pointer' : 'default',
                          fontFamily: 'inherit',
                          transition: 'border-color 160ms ease, box-shadow 160ms ease',
                          boxShadow: open ? `0 0 0 3px color-mix(in srgb, ${PD.gold} 22%, transparent)` : 'none',
                        }}
                      >
                        {/* The disc — a flat paper mark, first initial
                            in display italic. Never a sphere. */}
                        <span
                          aria-hidden
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: DISC_TINTS[i % DISC_TINTS.length],
                            border: '1px solid rgba(31,36,24,0.10)',
                            ...DISPLAY_STYLE,
                            fontStyle: 'italic',
                            fontSize: 19,
                            color: PD.ink,
                          }}
                        >
                          {(f.firstName[0] ?? '·').toUpperCase()}
                        </span>
                        <span style={{ ...DISPLAY_STYLE, fontSize: 18, lineHeight: 1.15, color: PD.ink }}>
                          {f.firstName}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: PD.inkSoft,
                            lineHeight: 1.45,
                            fontStyle: preview ? 'normal' : 'italic',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 34,
                          }}
                        >
                          {preview
                            ? `${preview.theirs ? f.firstName.split(/\s+/)[0] : 'You'}: ${preview.lastBody}`
                            : 'No notes yet — begin a thread.'}
                        </span>
                        <span style={{ ...MONO_STYLE, fontSize: 8.5, letterSpacing: '0.14em', color: open ? PD.gold : PD.terra }}>
                          {open ? 'OPEN BELOW ↓' : 'OPEN THEIR CARD →'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {note && <div style={{ fontSize: 12.5, color: PD.olive, marginTop: 12 }}>{note}</div>}

              {/* ── The detail panel — full width below the grid:
                     shared history, dietary, the pair thread, and
                     the add-to-event chips. ─────────────────────── */}
              {cardFor && openFriend && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '18px 20px',
                    borderRadius: 'var(--r-md, 20px)',
                    background: PD.paper2,
                    border: '1px solid rgba(31,36,24,0.10)',
                  }}
                >
                  {!card ? (
                    <DashSkeleton kind="list" count={2} label="Threading…" />
                  ) : (
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)' }} className="pl8-circle-detail">
                      {/* LEFT — the thread */}
                      <div>
                        <div style={{ ...MONO_STYLE, fontSize: 8.5, color: PD.terra, marginBottom: 6 }}>YOUR THREAD</div>
                        {msgs.length === 0 ? (
                          <div style={{ fontSize: 12, color: PD.inkSoft, fontStyle: 'italic', marginBottom: 8 }}>
                            Nothing yet. Begin a thread.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 8 }}>
                            {msgs.map((m) => (
                              <div
                                key={m.id}
                                style={{
                                  alignSelf: m.mine ? 'flex-end' : 'flex-start',
                                  maxWidth: '85%',
                                  padding: '7px 11px',
                                  borderRadius: 12,
                                  borderBottomRightRadius: m.mine ? 3 : 12,
                                  borderBottomLeftRadius: m.mine ? 12 : 3,
                                  background: m.mine ? PD.olive : PD.paper,
                                  color: m.mine ? '#F5EFE2' : PD.ink,
                                  border: m.mine ? 'none' : '1px solid rgba(31,36,24,0.10)',
                                  fontSize: 12.5,
                                  lineHeight: 1.5,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {m.body}
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void sendNote(); }}
                            placeholder={`A note to ${card.firstName}…`}
                            maxLength={4000}
                            style={{
                              flex: 1, padding: '8px 11px', borderRadius: 999, fontSize: 12.5,
                              border: '1px solid rgba(31,36,24,0.16)', background: PD.paper,
                              color: PD.ink, outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                          <button
                            type="button"
                            style={{ ...btnMini, opacity: draft.trim() ? 1 : 0.5 }}
                            disabled={busy === 'note' || !draft.trim()}
                            onClick={() => void sendNote()}
                          >
                            {busy === 'note' ? 'Threading…' : 'Send'}
                          </button>
                        </div>
                        {sendErr && <div style={{ fontSize: 11.5, color: 'var(--pl-plum, #7A2D2D)', marginTop: 6 }}>{sendErr}</div>}
                      </div>

                      {/* RIGHT — who they are + the weave-in */}
                      <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                        <div style={{ ...DISPLAY_STYLE, fontStyle: 'italic', fontSize: 20, color: PD.ink }}>
                          {card.firstName}
                        </div>
                        {card.sharedCelebrations.length > 0 ? (
                          <div>
                            <div style={{ ...MONO_STYLE, fontSize: 8.5, color: PD.terra, marginBottom: 5 }}>CELEBRATED TOGETHER</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {card.sharedCelebrations.map((c) => (
                                <span key={c.label} style={{ fontSize: 12, color: PD.inkSoft, padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(31,36,24,0.12)' }}>
                                  {c.label}{c.occasion ? ` · ${c.occasion}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: PD.inkSoft, fontStyle: 'italic' }}>
                            No shared celebrations yet — the next one starts the story.
                          </div>
                        )}
                        {card.dietary && (
                          <div style={{ fontSize: 12, color: PD.inkSoft }}>
                            <span style={{ ...MONO_STYLE, fontSize: 8.5, color: PD.terra, marginRight: 6 }}>DIETARY</span>
                            {card.dietary}
                          </div>
                        )}
                        {(sites?.length ?? 0) > 0 && (
                          <div style={{ borderTop: '1px solid rgba(31,36,24,0.10)', paddingTop: 10 }}>
                            <div style={{ ...MONO_STYLE, fontSize: 8.5, color: PD.terra, marginBottom: 6 }}>WEAVE INTO AN EVENT</div>
                            {addFor === cardFor ? (
                              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {(sites ?? []).map((s) => (
                                  <button key={s.id} type="button" style={btnMiniGhost} disabled={!!busy}
                                    onClick={() => addToEvent(cardFor, s)}>
                                    {siteDisplayName(s)}
                                  </button>
                                ))}
                                <button type="button" style={btnMiniGhost} onClick={() => setAddFor(null)}>cancel</button>
                              </span>
                            ) : (
                              <button type="button" style={btnMini} disabled={!!busy} onClick={() => { setAddFor(cardFor); setNote(null); }}>
                                Add to an event
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* ── 3 · Secondary row — invite + discovery, quieter. ─ */}
            <div
              className="pl8-circle-secondary"
              style={{
                display: 'grid',
                gridTemplateColumns: state.candidates.length > 0 ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : '1fr',
                gap: 16,
                alignItems: 'start',
              }}
            >
              {/* Invite someone new — pre-event, by email. The circle
                  no longer waits for a shared celebration (S1). */}
              <Panel style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ ...monoLabel, marginBottom: 0 }}>INVITE SOMEONE NEW</div>
                  {/* Channel toggle — email or text (C.2). */}
                  <div role="tablist" aria-label="Invite channel" style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 999, background: PD.paper2, border: '1px solid rgba(31,36,24,0.10)' }}>
                    {(['email', 'text'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        role="tab"
                        aria-selected={invChannel === ch}
                        onClick={() => { setInvChannel(ch); setInvNote(null); }}
                        style={{
                          padding: '4px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                          fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                          background: invChannel === ch ? PD.olive : 'transparent',
                          color: invChannel === ch ? '#F5EFE2' : PD.inkSoft,
                        }}
                      >
                        {ch === 'email' ? 'By email' : 'By text'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: PD.inkSoft, margin: '10px 0 12px', maxWidth: 480, lineHeight: 1.55 }}>
                  {invChannel === 'email'
                    ? <>Someone you&rsquo;ll celebrate with — no event required yet. They join your circle when they accept.</>
                    : <>They get a text with your personal link — signing up through it offers them a one-tap &ldquo;add you back.&rdquo;</>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="First name (optional)"
                    style={{
                      padding: '9px 12px', borderRadius: 10, fontSize: 13, width: 160,
                      border: '1px solid rgba(31,36,24,0.16)', background: PD.paper2, color: PD.ink,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  {invChannel === 'email' ? (
                    <input
                      type="email"
                      value={invEmail}
                      onChange={(e) => setInvEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void invite(); }}
                      placeholder="their@email.com"
                      style={{
                        padding: '9px 12px', borderRadius: 10, fontSize: 13, width: 220,
                        border: '1px solid rgba(31,36,24,0.16)', background: PD.paper2, color: PD.ink,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <input
                      type="tel"
                      value={invPhone}
                      onChange={(e) => setInvPhone(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void invite(); }}
                      placeholder="(555) 123-4567"
                      style={{
                        padding: '9px 12px', borderRadius: 10, fontSize: 13, width: 220,
                        border: '1px solid rgba(31,36,24,0.16)', background: PD.paper2, color: PD.ink,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  )}
                  <button
                    type="button"
                    style={btnInk}
                    disabled={busy === 'invite' || (invChannel === 'email' ? !invEmail.trim() : !invPhone.trim())}
                    onClick={() => void invite()}
                  >
                    {busy === 'invite' ? 'Weaving…' : invChannel === 'email' ? 'Weave them in' : 'Send the text'}
                  </button>
                </div>
                {invNote && <div style={{ fontSize: 12.5, color: PD.olive, marginTop: 10 }}>{invNote}</div>}
              </Panel>

              {/* Discover */}
              {state.candidates.length > 0 && (
                <Panel style={{ padding: 22 }}>
                  <div style={monoLabel}>PEOPLE YOU&rsquo;VE CELEBRATED WITH</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {state.candidates.map((c) => (
                      <span key={c.personId} style={{ ...chip, gap: 10 }}>
                        {c.firstName}
                        <button type="button" style={btnMiniGhost} disabled={!!busy}
                          onClick={() => post({ action: 'request', otherPersonId: c.personId, siteId: c.siteId }, `req:${c.personId}`)}>
                          Add as a friend
                        </button>
                      </span>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        {state && !state.available && (
          <div style={{ marginTop: 18 }}>
            <EmptyShell message="Your circle grows as you attend celebrations. Once you're a guest somewhere, familiar faces show up here." />
          </div>
        )}
      </div>

      {/* The detail + secondary grids collapse to one column on
          phones — inline <style> keeps this file self-contained. */}
      <style>{`
        @media (max-width: 720px) {
          .pl8-circle-detail { grid-template-columns: 1fr !important; }
          .pl8-circle-secondary { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DashLayout>
  );
}
