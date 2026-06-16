'use client';

// ─────────────────────────────────────────────────────────────
// useEditorCollab — realtime co-editing over Supabase Realtime.
//
// Two primitives on one channel:
//   • PRESENCE — who has this editor open right now. Surfaced as
//     colored initial dots in the topbar ("Maya is here").
//   • BROADCAST — debounced manifest sync. Local edits broadcast
//     the full (art-stripped) manifest; remote peers apply it
//     last-write-wins, deferring while the local host is actively
//     typing so a peer's save never clobbers a half-typed word.
//
// The channel name is SECRET — fetched from /api/sites/collab-token,
// which gates on owner/cohost role. Knowing the public slug is not
// enough to join. Keyless deploys (no Supabase env) and failed
// token fetches degrade to solo editing silently.
//
// Conflict model is deliberately last-write-wins on the whole
// manifest: edits already debounce through the autosave bridge,
// sections are usually divided between collaborators ("you do
// travel, I'll do the story"), and every apply lands in the undo
// stack. CRDT-grade merging is not worth its weight here.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
import { stripArtForStorage } from '@/lib/editor-state';

export interface CollabPeer {
  key: string;
  email: string;
  name: string;
  color: string;
  /** The peer's chosen orchard avatar id (PlAvatar), null = none. */
  avatar: string | null;
  /** Section id this peer currently has open in the editor (for
   *  the "Maya is editing Travel" per-section presence cue). */
  section: string | null;
}

const PEER_COLORS = ['#5C6B3F', '#C6703D', '#3F6E92', '#7A5A8C', '#B8935A', '#7A2D2D'];

function colorFor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i += 1) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return PEER_COLORS[h % PEER_COLORS.length];
}

/** How long after a local edit we hold off applying remote state,
 *  so a peer's broadcast never replaces text mid-keystroke. */
const LOCAL_TYPING_GRACE_MS = 1600;
/** Debounce for outgoing broadcasts — coalesces keystroke bursts. */
const BROADCAST_DEBOUNCE_MS = 700;
/** Supabase Realtime drops broadcast payloads over ~256KB silently.
 *  A rich manifest (gallery URLs, chapters, theme bag) can exceed
 *  that — which is exactly why "live edits" looked dead while the
 *  tiny presence payload worked. Above this size we send a content-
 *  free pulse instead and the receiver refetches the saved manifest. */
const MAX_BROADCAST_BYTES = 180_000;
/** After a pulse, wait for the sender's autosave (~2s debounce) to
 *  land before refetching, so we pull their latest, not stale, work. */
const PULSE_REFETCH_DELAY_MS = 2200;

export function useEditorCollab({
  siteSlug,
  email,
  name,
  avatar = null,
  manifest,
  enabled = true,
  activeSection = null,
  onRemoteManifest,
}: {
  siteSlug: string;
  email?: string;
  name?: string;
  /** The local user's orchard avatar id, shared via presence. */
  avatar?: string | null;
  manifest: StoryManifest;
  enabled?: boolean;
  /** The section the local host currently has open — broadcast via
   *  presence so peers can show "X is editing this section". */
  activeSection?: string | null;
  onRemoteManifest: (next: StoryManifest, fromName: string) => void;
}): { peers: CollabPeer[] } {
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeSectionRef = useRef(activeSection);
  const avatarRef = useRef(avatar);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Stable per-tab client id — lazy useState initializer keeps the
     impure randomUUID call out of the render body proper. */
  const [clientId] = useState(() =>
    typeof window !== 'undefined' ? (crypto.randomUUID?.() ?? String(Math.random())) : '',
  );
  const clientIdRef = useRef(clientId);

  /* Refs so the channel effect doesn't resubscribe per keystroke. */
  const manifestRef = useRef(manifest);
  const onRemoteRef = useRef(onRemoteManifest);
  const lastLocalEditAt = useRef(0);
  const pendingRemote = useRef<{ m: StoryManifest; from: string } | null>(null);
  const applyingRemote = useRef(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onRemoteRef.current = onRemoteManifest; }, [onRemoteManifest]);

  /* Re-broadcast presence when the local host moves to another
     section. Cheap (presence-only re-track); the channel effect
     below does the initial track on subscribe. */
  useEffect(() => {
    activeSectionRef.current = activeSection;
    avatarRef.current = avatar;
    const ch = channelRef.current;
    if (!ch || !email) return;
    try { void ch.track({ email, name: name || email, avatar: avatar ?? null, section: activeSection ?? null }); } catch { /* noop */ }
  }, [activeSection, avatar, email, name]);

  /* Outgoing — broadcast local manifest changes (debounced). Remote
     applies set applyingRemote so their own commit doesn't echo. */
  useEffect(() => {
    if (manifestRef.current === manifest) return;
    manifestRef.current = manifest;
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    lastLocalEditAt.current = Date.now();
    const ch = channelRef.current;
    if (!ch) return;
    if (sendTimer.current) clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => {
      try {
        const stripped = stripArtForStorage(manifestRef.current);
        let size = 0;
        try { size = JSON.stringify(stripped).length; } catch { size = Infinity; }
        const base = { from: clientIdRef.current, fromName: name || email || 'A co-host', at: Date.now() };
        if (size <= MAX_BROADCAST_BYTES) {
          // Small enough to ship inline — instant sync.
          void ch.send({ type: 'broadcast', event: 'manifest', payload: { ...base, manifest: stripped } });
        } else {
          // Too large for a reliable Realtime broadcast — pulse and
          // let the peer refetch the saved manifest instead.
          void ch.send({ type: 'broadcast', event: 'pulse', payload: base });
        }
      } catch { /* collab must never break editing */ }
    }, BROADCAST_DEBOUNCE_MS);
  }, [manifest, name, email]);

  /* Channel lifecycle — token fetch → subscribe → presence track. */
  useEffect(() => {
    if (!enabled || !email || typeof window === 'undefined') return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    let cancelled = false;
    let client: ReturnType<typeof createClient> | null = null;
    let drainTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const res = await fetch(`/api/sites/collab-token?subdomain=${encodeURIComponent(siteSlug)}`);
        if (!res.ok) return;
        const { channel: channelName } = await res.json() as { channel?: string | null };
        if (!channelName || cancelled) return;

        client = createClient(url, anon);
        const ch = client.channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: clientIdRef.current },
          },
        });

        ch.on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState<{ email: string; name: string; avatar?: string | null; section?: string | null }>();
          const next: CollabPeer[] = [];
          for (const [key, metas] of Object.entries(state)) {
            if (key === clientIdRef.current) continue;
            const meta = metas[0];
            if (!meta) continue;
            next.push({
              key,
              email: meta.email,
              name: meta.name || meta.email,
              color: colorFor(meta.email || key),
              avatar: meta.avatar ?? null,
              section: meta.section ?? null,
            });
          }
          setPeers(next);
        });

        ch.on('broadcast', { event: 'manifest' }, ({ payload }) => {
          const p = payload as { from?: string; fromName?: string; manifest?: StoryManifest };
          if (!p?.manifest || p.from === clientIdRef.current) return;
          pendingRemote.current = { m: p.manifest, from: p.fromName || 'A co-host' };
        });

        /* Pulse — a peer's edit was too large to ship inline. Refetch
           the saved manifest (after their autosave lands) and queue it
           through the same drain path so the typing-grace still holds. */
        ch.on('broadcast', { event: 'pulse' }, ({ payload }) => {
          const p = payload as { from?: string; fromName?: string };
          if (p.from === clientIdRef.current) return;
          if (pulseTimer.current) clearTimeout(pulseTimer.current);
          pulseTimer.current = setTimeout(() => {
            fetch(`/api/sites/${encodeURIComponent(siteSlug)}`, { cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : null))
              .then((d: { manifest?: StoryManifest } | null) => {
                if (d?.manifest) pendingRemote.current = { m: d.manifest, from: p.fromName || 'A co-host' };
              })
              .catch(() => { /* next pulse retries */ });
          }, PULSE_REFETCH_DELAY_MS);
        });

        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void ch.track({ email, name: name || email, avatar: avatarRef.current ?? null, section: activeSectionRef.current ?? null });
          }
        });
        channelRef.current = ch;

        /* Drain loop — apply the latest queued remote state once the
           local host has been idle past the typing grace window. */
        drainTimer = setInterval(() => {
          const queued = pendingRemote.current;
          if (!queued) return;
          if (Date.now() - lastLocalEditAt.current < LOCAL_TYPING_GRACE_MS) return;
          pendingRemote.current = null;
          applyingRemote.current = true;
          onRemoteRef.current(queued.m, queued.from);
        }, 400);
      } catch { /* solo editing fallback */ }
    })();

    return () => {
      cancelled = true;
      if (drainTimer) clearInterval(drainTimer);
      if (sendTimer.current) clearTimeout(sendTimer.current);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      try { channelRef.current?.unsubscribe(); } catch { /* noop */ }
      channelRef.current = null;
      try { void client?.removeAllChannels(); } catch { /* noop */ }
      setPeers([]);
    };
  }, [enabled, email, name, siteSlug]);

  return { peers };
}
