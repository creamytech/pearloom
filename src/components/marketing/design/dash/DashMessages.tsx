'use client';

// ─────────────────────────────────────────────────────────────
// DashMessages — the host side of event-scoped messaging.
//
// Left: the guest thread (the event-wide space guests post into
// from their passport pages) with post + hide (moderation).
// Right: direct messages — one private logistics line per guest.
//
// Data: GET/POST/DELETE /api/messages/host (session + site-owner
// gated). Poll-based on the BroadcastBar cadence.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro, HintChip, RailCard } from '@/components/pearloom/dash/QuietDash';
import { useSelectedSite } from './hooks';
import { useMessagePings } from '@/lib/messages-realtime';

const POLL_MS = 30_000;

interface HostMessage {
  id: string;
  guestId: string | null;
  sender: 'host' | 'guest';
  authorName: string;
  body: string;
  hidden: boolean;
  createdAt: string;
}

interface DmThread {
  guestId: string;
  guestName: string;
  messages: HostMessage[];
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function DashMessages() {
  const { site, loading } = useSelectedSite();
  const [party, setParty] = useState<HostMessage[] | null>(null);
  const [dms, setDms] = useState<DmThread[]>([]);
  const [openDm, setOpenDm] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dmDraft, setDmDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // Moderation failures surface inline — a silent DELETE failure
  // left the message visible with no explanation.
  const [hideError, setHideError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!site?.id) return;
    try {
      const r = await fetch(`/api/messages/host?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as { party?: HostMessage[]; dms?: DmThread[] };
      setParty(data.party ?? []);
      setDms(data.dms ?? []);
    } catch { /* next poll retries */ }
  }, [site?.id]);

  useEffect(() => {
    setParty(null);
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  /* Realtime — same content-free ping channel the guest cards
     subscribe to. Pings trigger an owner-gated refetch. */
  const ping = useMessagePings(site?.id ? `pl-msg-${site.id}` : null, () => void refresh());

  async function post(thread: 'party' | 'dm', body: string, guestId?: string) {
    if (!site?.id || !body.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/messages/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id, thread, guestId, body: body.trim() }),
      });
      if (r.ok) {
        if (thread === 'party') setDraft('');
        else setDmDraft('');
        await refresh();
        ping();
      }
    } finally {
      setBusy(false);
    }
  }

  async function hide(id: string) {
    if (!site?.id) return;
    setHideError(null);
    try {
      const r = await fetch(`/api/messages/host?id=${encodeURIComponent(id)}&siteId=${encodeURIComponent(site.id)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`Hide failed (${r.status})`);
      await refresh();
    } catch {
      setHideError('That message couldn’t be hidden just now — it’s still visible to guests. Try again.');
    }
  }

  const openThread = dms.find((d) => d.guestId === openDm) ?? null;

  return (
    <DashLayout active="guests" hideTopbar>
      {/* Quiet header (plan rule 1): one line; the two-paragraph
          explainer lives behind a HintChip. */}
      <div style={{ padding: '16px var(--pl-dash-pad) 0', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
        <PageIntro
          eyebrow="Messages"
          title="One thread, every guest."
          meta={
            <HintChip
              storageKey="pl-hint-messages"
              hint="The guest thread is shared; direct messages are private."
              detail="The guest thread is the space everyone with an invite link shares — you can post and moderate. Direct messages are each guest's private logistics line to you."
            />
          }
          style={{ marginBottom: 18 }}
        />
      </div>

      {!loading && !site ? (
        <div style={{ padding: '0 var(--pl-dash-pad) 60px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
          <EmptyShell message="Create a site first — its guest thread starts the moment invites go out." cta={{ label: 'Create a site →', href: '/wizard/new' }} />
        </div>
      ) : (
        <main
          className="pd-messages-main"
          style={{
            padding: '0 var(--pl-dash-pad) 40px',
            maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'start',
          }}
        >
          {/* ── The guest thread ── */}
          <Panel bg={PD.paperCard} style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 12 }}>THE GUEST THREAD</div>
            {hideError && (
              <div
                role="alert"
                style={{
                  fontSize: 12.5, color: PD.plum, lineHeight: 1.5,
                  padding: '10px 12px', borderRadius: 12, marginBottom: 10,
                  background: 'rgba(122,45,45,0.08)', border: '1px solid rgba(122,45,45,0.2)',
                }}
              >
                {hideError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0, maxHeight: 460, overflowY: 'auto', marginBottom: 14 }}>
              {party === null ? (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: PD.inkSoft }}>Threading…</div>
              ) : party.length === 0 ? (
                <div style={{ fontSize: 13.5, color: PD.inkSoft, padding: '18px 0' }}>
                  Nothing yet. Begin a thread — guests see your post the next time they open their link.
                </div>
              ) : (
                party.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '10px 12px', borderRadius: 12,
                      background: m.sender === 'host' ? 'rgba(92,107,63,0.08)' : PD.paper3,
                      border: '1px solid rgba(31,36,24,0.08)',
                      opacity: m.hidden ? 0.45 : 1,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: m.sender === 'host' ? PD.olive : PD.ink, marginBottom: 2 }}>
                        {m.authorName}{m.sender === 'host' ? ' · you' : ''}
                        <span style={{ fontWeight: 400, color: PD.inkSoft, marginLeft: 8, fontSize: 10.5 }}>{when(m.createdAt)}</span>
                        {m.hidden && <span style={{ fontWeight: 600, color: PD.plum, marginLeft: 8, fontSize: 10 }}>HIDDEN</span>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: PD.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                    </div>
                    {!m.hidden && (
                      <button
                        type="button"
                        onClick={() => void hide(m.id)}
                        title="Hide from guests"
                        style={{
                          fontSize: 10, padding: '4px 9px', borderRadius: 999,
                          background: 'transparent', border: '1px solid rgba(31,36,24,0.16)',
                          color: PD.inkSoft, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                        }}
                      >
                        Hide
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); void post('party', draft); }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Post to every guest…"
                maxLength={2000}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 999,
                  border: `1.5px solid ${PD.line}`, background: PD.paper,
                  fontSize: 13, fontFamily: 'inherit', color: PD.ink, outline: 'none',
                }}
              />
              <button type="submit" disabled={!draft.trim() || busy} className="pl8-btnfx" style={{ ...btnInk, opacity: draft.trim() && !busy ? 1 : 0.5 }}>
                {busy ? 'Sending…' : 'Post'}
              </button>
            </form>
          </Panel>

          {/* ── Direct messages — RailCard chrome so both columns
              read as one system (plan-2 §2 messages). ── */}
          <RailCard title="Direct messages">
            {dms.length === 0 ? (
              <div style={{ fontSize: 13, color: PD.inkSoft, lineHeight: 1.55 }}>
                When a guest writes to you privately from their passport page, the conversation lands here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dms.map((d) => {
                  const last = d.messages[d.messages.length - 1];
                  const open = openDm === d.guestId;
                  return (
                    <div key={d.guestId} style={{ background: PD.paperCard, borderRadius: 12, border: '1px solid rgba(31,36,24,0.08)' }}>
                      <button
                        type="button"
                        onClick={() => setOpenDm(open ? null : d.guestId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '11px 14px', background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ ...DISPLAY_STYLE, fontStyle: 'italic', fontSize: 15, fontWeight: 600, color: PD.ink }}>
                          {d.guestName}
                        </span>
                        <span style={{ flex: 1, fontSize: 11.5, color: PD.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {last ? `${last.sender === 'host' ? 'You: ' : ''}${last.body}` : ''}
                        </span>
                        <span style={{ fontSize: 12, color: PD.olive }}>{open ? '▾' : '▸'}</span>
                      </button>
                      {open && (
                        <div style={{ padding: '0 14px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', margin: '4px 0 10px' }}>
                            {d.messages.map((m) => (
                              <div key={m.id} style={{ alignSelf: m.sender === 'host' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                                <div
                                  style={{
                                    padding: '8px 12px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.5,
                                    background: m.sender === 'host' ? PD.ink : PD.paper3,
                                    color: m.sender === 'host' ? PD.paper : PD.ink,
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    opacity: m.hidden ? 0.45 : 1,
                                  }}
                                >
                                  {m.body}
                                </div>
                                <div style={{ fontSize: 10, color: PD.inkSoft, marginTop: 2, textAlign: m.sender === 'host' ? 'right' : 'left' }}>
                                  {when(m.createdAt)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <form
                            onSubmit={(e) => { e.preventDefault(); void post('dm', dmDraft, d.guestId); }}
                            style={{ display: 'flex', gap: 6 }}
                          >
                            <input
                              value={openDm === d.guestId ? dmDraft : ''}
                              onChange={(e) => setDmDraft(e.target.value)}
                              placeholder={`Reply to ${d.guestName.split(' ')[0]}…`}
                              maxLength={2000}
                              style={{
                                flex: 1, padding: '8px 12px', borderRadius: 999,
                                border: `1.5px solid ${PD.line}`, background: PD.paper,
                                fontSize: 12.5, fontFamily: 'inherit', color: PD.ink, outline: 'none',
                              }}
                            />
                            <button
                              type="submit"
                              disabled={!dmDraft.trim() || busy}
                              className="pl8-btnfx" style={{ ...btnInk, padding: '8px 14px', fontSize: 12, opacity: dmDraft.trim() && !busy ? 1 : 0.5 }}
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {openThread === null && dms.length > 0 && (
              <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: 12, opacity: 0.8 }}>
                Replies reach guests on their passport page — and a bell ping lands here when they write back.
              </div>
            )}
          </RailCard>
        </main>
      )}

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-messages-main) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}
