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

export function useEditorCollab({
  siteSlug,
  email,
  name,
  manifest,
  enabled = true,
  onRemoteManifest,
}: {
  siteSlug: string;
  email?: string;
  name?: string;
  manifest: StoryManifest;
  enabled?: boolean;
  onRemoteManifest: (next: StoryManifest, fromName: string) => void;
}): { peers: CollabPeer[] } {
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
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
        void ch.send({
          type: 'broadcast',
          event: 'manifest',
          payload: {
            from: clientIdRef.current,
            fromName: name || email || 'A co-host',
            at: Date.now(),
            manifest: stripArtForStorage(manifestRef.current),
          },
        });
      } catch { /* collab must never break editing */ }
    }, BROADCAST_DEBOUNCE_MS);
  }, [manifest, name, email]);

  /* Channel lifecycle — token fetch → subscribe → presence track. */
  useEffect(() => {
    if (!enabled || !email || typeof window === 'undefined') return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
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
          const state = ch.presenceState<{ email: string; name: string }>();
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
            });
          }
          setPeers(next);
        });

        ch.on('broadcast', { event: 'manifest' }, ({ payload }) => {
          const p = payload as { from?: string; fromName?: string; manifest?: StoryManifest };
          if (!p?.manifest || p.from === clientIdRef.current) return;
          pendingRemote.current = { m: p.manifest, from: p.fromName || 'A co-host' };
        });

        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void ch.track({ email, name: name || email });
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
      try { channelRef.current?.unsubscribe(); } catch { /* noop */ }
      channelRef.current = null;
      try { void client?.removeAllChannels(); } catch { /* noop */ }
      setPeers([]);
    };
  }, [enabled, email, name, siteSlug]);

  return { peers };
}
