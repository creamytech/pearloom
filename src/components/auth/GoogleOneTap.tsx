'use client';

/* ─────────────────────────────────────────────────────────────
   GoogleOneTap — the stay-on-page Google sign-in.

   Loads Google Identity Services and shows the One Tap prompt
   (the small corner card with the user's Google account). Picking
   an account hands us a signed ID token; we pass it to NextAuth's
   'google-onetap' credentials provider (lib/auth.ts), which
   verifies it server-side and mints a session — no redirect, no
   consent screen, the user never leaves Pearloom.

   Requirements:
     • NEXT_PUBLIC_GOOGLE_CLIENT_ID set (same OAuth client id as
       GOOGLE_CLIENT_ID — it's public by design).
     • The app origin listed under "Authorized JavaScript origins"
       on that OAuth client in Google Cloud Console.

   Renders nothing itself; gracefully no-ops when the env var is
   missing, the user dismissed One Tap recently (Google's own
   cooldown), or a session already exists.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface GsiCredentialResponse { credential?: string }
interface GsiId {
  initialize: (config: Record<string, unknown>) => void;
  prompt: () => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export function GoogleOneTap({ next = '/dashboard' }: { next?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    if (status !== 'unauthenticated') return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const start = () => {
      const id = window.google?.accounts?.id;
      if (!id || cancelled) return;
      id.initialize({
        client_id: clientId,
        callback: async (resp: GsiCredentialResponse) => {
          if (!resp.credential) return;
          const r = await signIn('google-onetap', {
            credential: resp.credential,
            redirect: false,
          });
          if (r && !r.error) {
            router.push(next);
            router.refresh();
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        use_fedcm_for_prompt: true,
      });
      id.prompt();
    };

    if (window.google?.accounts?.id) {
      start();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', start, { once: true });
      } else {
        const s = document.createElement('script');
        s.src = GSI_SRC;
        s.async = true;
        s.defer = true;
        s.addEventListener('load', start, { once: true });
        document.head.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      try { window.google?.accounts?.id?.cancel(); } catch { /* gsi not loaded */ }
    };
  }, [status, next, router]);

  return null;
}
