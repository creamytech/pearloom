'use client';

// ─────────────────────────────────────────────────────────────
// useMessagePings — instant delivery for event-scoped messaging.
//
// Supabase Realtime BROADCAST channel (the useEditorCollab
// pattern), carrying content-free "ping" events only: a ping
// means "something changed — refetch through your own
// authenticated API call". No message bodies, no identities ride
// the channel, so the anon key + a guessable channel name leak
// nothing. Polling stays as the fallback for keyless deploys.
//
// Returns a ping() sender for the caller to fire after its own
// successful POST.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

export function useMessagePings(
  channelName: string | null,
  onPing: () => void,
): () => void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onPingRef = useRef(onPing);
  useEffect(() => {
    onPingRef.current = onPing;
  }, [onPing]);

  useEffect(() => {
    if (!channelName) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return; // polling carries the day
    const client = createClient(url, anon);
    const ch = client
      .channel(channelName, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'ping' }, () => onPingRef.current())
      .subscribe();
    channelRef.current = ch;
    return () => {
      channelRef.current = null;
      void client.removeChannel(ch);
    };
  }, [channelName]);

  return useCallback(() => {
    void channelRef.current?.send({ type: 'broadcast', event: 'ping', payload: {} })
      .catch?.(() => { /* peers fall back to their poll */ });
  }, []);
}
